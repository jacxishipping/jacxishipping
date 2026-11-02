import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import {
  getEffectiveGeminiApiKey,
  getEffectiveGeminiLiveApiKey,
  getEffectiveGeminiVoiceModel,
  getStoredCallAgentSettings,
} from '@/lib/call-agent-settings';
import {
  buildVoiceLiveStreamUrl,
  getRecentVoiceShipments,
  getVoiceFinanceSummary,
  isGeminiLiveConfigured,
  isVoiceWebhookAuthorized,
} from '@/lib/voice/call-agent';
import { clipVoiceReply, normalizeVoiceDigits } from '@/lib/voice/speech';
import { connectStream, gather, hangup, redirect, say, twimlResponse } from '@/lib/voice/twiml';
import { createSystemAuditLog } from '@/lib/system-audit';
import { decryptSecret } from '@/lib/secret-crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type InboundTwilioPayload = {
  callSid: string;
  from: string;
  to: string;
  callStatus: string;
  digits: string;
  speechResult: string;
};

async function readTwilioPayload(request: NextRequest): Promise<InboundTwilioPayload> {
  const formValues = new Map<string, string>();

  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      for (const [key, value] of formData.entries()) {
        if (typeof value === 'string') {
          formValues.set(key, value);
        }
      }
    } catch {
      // Ignore non-form body
    }
  }

  return {
    callSid: formValues.get('CallSid') || request.nextUrl.searchParams.get('CallSid') || '',
    from: formValues.get('From') || request.nextUrl.searchParams.get('From') || '',
    to: formValues.get('To') || request.nextUrl.searchParams.get('To') || '',
    callStatus: formValues.get('CallStatus') || request.nextUrl.searchParams.get('CallStatus') || 'ringing',
    digits: formValues.get('Digits') || request.nextUrl.searchParams.get('Digits') || '',
    speechResult: formValues.get('SpeechResult') || request.nextUrl.searchParams.get('SpeechResult') || '',
  };
}

function buildReceiveStepUrl(
  request: NextRequest,
  step: string,
  params: Record<string, string | undefined> = {},
) {
  const urlParams = new URLSearchParams();
  const token = request.nextUrl.searchParams.get('token') || request.headers.get('x-voice-webhook-token');
  if (token) {
    urlParams.set('token', token);
  }
  urlParams.set('step', step);
  for (const [k, v] of Object.entries(params)) {
    if (v) urlParams.set(k, v);
  }
  return `/api/voice/receive?${urlParams.toString()}`;
}

async function findCallerByPhone(rawFrom: string) {
  const digits = (rawFrom || '').replace(/[^\d]/g, '');
  if (digits.length < 7) return null;
  const tail9 = digits.slice(-9);

  return prisma.user.findFirst({
    where: {
      phone: {
        contains: tail9,
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
    },
  });
}

async function generateInboundAiSpeech(question: string, callerId?: string | null, callerPhone?: string) {
  const vinMatch = question.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i)?.[0];
  const containerMatch = question.match(/\b[A-Z]{4}\d{7}\b/i)?.[0];
  const digitsMatch = normalizeVoiceDigits(question);

  let dbContext = '';

  if (vinMatch) {
    const shipment = await prisma.shipment.findFirst({
      where: { vehicleVIN: { contains: vinMatch, mode: 'insensitive' } },
      include: { container: true, dispatch: true },
    });
    if (shipment) {
      const vehicle = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ');
      dbContext += `Found Shipment for VIN ${shipment.vehicleVIN}: ${vehicle}, Status=${shipment.status}, Container=${shipment.container?.containerNumber || 'Pending'}, Location=${shipment.container?.currentLocation || shipment.dispatch?.origin || 'Export Warehouse'}, ETA=${shipment.container?.estimatedArrival ? new Date(shipment.container.estimatedArrival).toLocaleDateString() : 'On schedule'}. `;
    }
  }

  if (containerMatch) {
    const container = await prisma.container.findFirst({
      where: { containerNumber: { contains: containerMatch, mode: 'insensitive' } },
    });
    if (container) {
      dbContext += `Found Container ${container.containerNumber}: Status=${container.status}, Vessel=${container.vesselName || 'Ocean Carrier'}, Location=${container.currentLocation || 'In Transit'}, Destination=${container.destinationPort || 'Destination Port'}, ETA=${container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString() : 'On schedule'}. `;
    }
  }

  if (callerId) {
    const [finance, recent] = await Promise.all([
      getVoiceFinanceSummary(callerId),
      getRecentVoiceShipments(callerId),
    ]);
    dbContext += `Caller Finance: ${finance.speech} Caller Shipments: ${recent.speech} `;
  } else if (digitsMatch.length >= 6 && !dbContext) {
    const shipment = await prisma.shipment.findFirst({
      where: {
        OR: [
          { vehicleVIN: { contains: digitsMatch.slice(-6), mode: 'insensitive' } },
          { lotNumber: { contains: digitsMatch, mode: 'insensitive' } },
        ],
      },
      include: { container: true },
    });
    if (shipment) {
      const vehicle = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ');
      dbContext += `Matched Shipment ${vehicle} (VIN ending ${shipment.vehicleVIN?.slice(-6)}): Status=${shipment.status}, Container=${shipment.container?.containerNumber || 'Pending'}, Location=${shipment.container?.currentLocation || 'Warehouse'}. `;
    }
  }

  const prompt = [
    'You are JACXI Shipping & Logistics live inbound phone assistant.',
    'Answer in 1 to 3 short, natural spoken sentences suitable for a phone call.',
    'Do not use markdown, asterisks, or bullet points.',
    `Caller phone: ${callerPhone || 'Unknown'}.`,
    dbContext || 'You can help with vehicle VIN tracking, ocean container ETA, and customer account balances.',
    `Caller said: "${question}"`,
  ].join(' ');

  const settings = await getStoredCallAgentSettings();
  const geminiKey = getEffectiveGeminiApiKey(settings) || getEffectiveGeminiLiveApiKey(settings);
  const geminiModel = getEffectiveGeminiVoiceModel(settings);

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationConfig: { temperature: 0.25, maxOutputTokens: 200 },
            contents: [{ parts: [{ text: prompt }] }],
          }),
          cache: 'no-store',
        },
      );
      if (res.ok) {
        const data = await res.json();
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p?.text || '')
            .join(' ')
            .replace(/[*_#`~]/g, '')
            .trim() || '';
        if (text) return clipVoiceReply(text, 500);
      }
    } catch {
      // Fall through to TokenRouter or deterministic response
    }
  }

  const aiRecord = await prisma.aiProviderSettings.findUnique({ where: { scope: 'default' } }).catch(() => null);
  const aiKey = decryptSecret(aiRecord?.apiKey) || process.env.TOKENROUTER_API_KEY || '';
  const aiUrl = aiRecord?.chatCompletionsUrl || 'https://api.tokenrouter.com/v1/chat/completions';

  if (aiKey) {
    try {
      const res = await fetch(aiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${aiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: aiRecord?.model || 'MiniMax-M3',
          max_tokens: 200,
          temperature: 0.25,
          messages: [
            { role: 'system', content: prompt },
            { role: 'user', content: question },
          ],
        }),
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        const text = (data?.choices?.[0]?.message?.content || '').replace(/[*_#`~]/g, '').trim();
        if (text) return clipVoiceReply(text, 500);
      }
    } catch {
      // Fall through
    }
  }

  if (dbContext) {
    return clipVoiceReply(dbContext, 480);
  }

  return 'Thank you for calling JACXI Shipping. Please say the last 6 digits of your VIN, your container number, or press 1 for shipment tracking, 2 for finance status, or 3 for your recent vehicles.';
}

function renderInteractiveGather(
  request: NextRequest,
  promptText: string,
  userId?: string | null,
  fromPhone?: string,
) {
  const actionUrl = buildReceiveStepUrl(request, 'turn', {
    userId: userId || undefined,
    from: fromPhone || undefined,
  });

  return twimlResponse(
    gather(
      {
        action: actionUrl,
        input: 'speech dtmf',
        method: 'POST',
        timeout: 8,
        speechTimeout: 'auto',
      },
      say(promptText),
    ) +
      say('We did not hear a response. Thank you for calling JACXI Shipping. Goodbye.') +
      hangup(),
  );
}

async function handleReceiveRequest(request: NextRequest) {
  if (!isVoiceWebhookAuthorized(request)) {
    return twimlResponse(say('Unauthorized webhook request.') + hangup(), { status: 401 });
  }

  const payload = await readTwilioPayload(request);
  const step = request.nextUrl.searchParams.get('step') || 'welcome';
  const queryUserId = request.nextUrl.searchParams.get('userId') || '';
  const fromPhone = payload.from || request.nextUrl.searchParams.get('from') || '';

  const caller = queryUserId
    ? await prisma.user.findUnique({
        where: { id: queryUserId },
        select: { id: true, name: true, email: true, phone: true },
      })
    : await findCallerByPhone(fromPhone);

  if (step === 'welcome') {
    await createSystemAuditLog({
      action: 'TWILIO_CALL_RECEIVED',
      entityType: 'TWILIO_CALL',
      entityId: payload.callSid || `inbound_${Date.now()}`,
      actorUserId: caller?.id || 'system_twilio_inbound',
      summary: `Inbound Twilio call received from ${fromPhone || 'Unknown'} to ${payload.to || 'JACXI Line'}`,
      metadata: {
        direction: 'inbound',
        callSid: payload.callSid,
        from: fromPhone,
        to: payload.to,
        callStatus: payload.callStatus,
        matchedCustomer: caller?.name || caller?.email || null,
      },
    }).catch(() => null);

    const personalGreeting = caller?.name ? `Hello ${caller.name}! ` : '';
    const welcomeText = `${personalGreeting}Welcome to JACXI Shipping and Logistics. You can speak your question, VIN, or container number right now, or press 1 to track a shipment, press 2 for your account balance, press 3 for recent vehicles, or press 0 to enter an 8 digit access code.`;

    return renderInteractiveGather(request, welcomeText, caller?.id, fromPhone);
  }

  // Handle spoken or keypad input (`step === 'turn'`)
  const digits = normalizeVoiceDigits(payload.digits);
  const speech = payload.speechResult.trim();

  if (digits === '9') {
    return twimlResponse(say('Thank you for calling JACXI Shipping and Logistics. Goodbye.') + hangup());
  }

  if (digits === '0') {
    const token = request.nextUrl.searchParams.get('token') || '';
    const verifyIntroUrl = `/api/voice?step=intro${token ? `&token=${encodeURIComponent(token)}` : ''}`;
    return twimlResponse(redirect(verifyIntroUrl, 'POST'));
  }

  if (digits === '4' && caller?.id && (await isGeminiLiveConfigured())) {
    const streamUrl = buildVoiceLiveStreamUrl(request);
    return twimlResponse(
      say('Connecting you to the JACXI Gemini Live audio stream now. Speak naturally after the tone.') +
        connectStream(streamUrl, [{ name: 'userId', value: caller.id }]) +
        say('The live audio stream has ended. Goodbye.') +
        hangup(),
    );
  }

  if (digits === '2' && caller?.id) {
    const finance = await getVoiceFinanceSummary(caller.id);
    return renderInteractiveGather(
      request,
      `${finance.speech} You can ask another question, or press 9 to end the call.`,
      caller.id,
      fromPhone,
    );
  }

  if (digits === '3' && caller?.id) {
    const recent = await getRecentVoiceShipments(caller.id);
    return renderInteractiveGather(
      request,
      `${recent.speech} You can ask another question, or press 9 to end the call.`,
      caller.id,
      fromPhone,
    );
  }

  if (digits === '1' && !speech) {
    return renderInteractiveGather(
      request,
      'Please say or enter your container number or the last 6 digits of your VIN now.',
      caller?.id,
      fromPhone,
    );
  }

  const questionInput = speech || digits;
  if (!questionInput) {
    return renderInteractiveGather(
      request,
      'Please speak your question, say your container or VIN number, or press 9 to end the call.',
      caller?.id,
      fromPhone,
    );
  }

  const aiReply = await generateInboundAiSpeech(questionInput, caller?.id, fromPhone);
  return renderInteractiveGather(
    request,
    `${aiReply} Is there anything else I can help you with?`,
    caller?.id,
    fromPhone,
  );
}

export async function GET(request: NextRequest) {
  return handleReceiveRequest(request);
}

export async function POST(request: NextRequest) {
  return handleReceiveRequest(request);
}

