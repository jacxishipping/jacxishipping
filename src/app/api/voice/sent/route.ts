import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  getEffectiveGeminiApiKey,
  getEffectiveGeminiLiveApiKey,
  getEffectiveGeminiVoiceModel,
  getStoredCallAgentSettings,
} from '@/lib/call-agent-settings';
import { getStoredCommunicationSettings, normalizeWhatsAppPhone } from '@/lib/communication-settings';
import { isVoiceWebhookAuthorized } from '@/lib/voice/call-agent';
import { clipVoiceReply, normalizeVoiceDigits } from '@/lib/voice/speech';
import { gather, hangup, say, twimlResponse } from '@/lib/voice/twiml';
import { createSystemAuditLog } from '@/lib/system-audit';
import { decryptSecret } from '@/lib/secret-crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getDetectedBaseUrl(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !configured.includes('localhost')) {
    return configured.replace(/\/$/, '');
  }
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const requestUrl = new URL(request.url);
  const protocol = forwardedProto || requestUrl.protocol.replace(':', '');
  const host = forwardedHost || request.headers.get('host') || requestUrl.host;
  return `${protocol}://${host}`.replace(/\/$/, '');
}

async function resolveTwilioCredentials() {
  const [callAgent, comm] = await Promise.all([
    getStoredCallAgentSettings(),
    getStoredCommunicationSettings(),
  ]);

  const accountSid = callAgent.twilioAccountSid || comm.smsAccountSid || process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = callAgent.twilioAuthToken || comm.smsAuthToken || process.env.TWILIO_AUTH_TOKEN || '';
  const apiKey = callAgent.twilioApiKey || '';
  const apiSecret = callAgent.twilioApiSecret || '';
  const fromNumber =
    callAgent.twilioPhoneNumber ||
    comm.smsFromNumber ||
    process.env.TWILIO_PHONE_NUMBER ||
    '';
  const defaultCountryCode = comm.whatsappDefaultCountryCode || '+93';

  let authHeader: string | null = null;
  if (apiKey && apiSecret) {
    authHeader = `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`;
  } else if (accountSid && authToken) {
    authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
  }

  return {
    accountSid,
    fromNumber,
    authHeader,
    defaultCountryCode,
    callAgent,
  };
}

function cleanSpeechMessage(raw: string) {
  return raw
    .replace(/https?:\/\/\S+/g, 'our online tracking portal at jacxi shipping dot com')
    .replace(/[*_`~#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function generateOutboundFollowupReply(
  question: string,
  vin?: string,
  shipmentId?: string,
  customerName?: string,
) {
  let dbContext = '';
  if (shipmentId || (vin && vin !== 'N/A')) {
    const shipment = await prisma.shipment.findFirst({
      where: shipmentId
        ? { id: shipmentId }
        : { vehicleVIN: { contains: vin, mode: 'insensitive' } },
      include: { container: true, dispatch: true },
    });
    if (shipment) {
      const vehicle = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ');
      dbContext = `Shipment ${vehicle} (VIN ${shipment.vehicleVIN}): Status=${shipment.status}, Payment=${shipment.paymentStatus}, Price=$${shipment.price || 0}, Container=${shipment.container?.containerNumber || 'Pending'}, Location=${shipment.container?.currentLocation || shipment.dispatch?.origin || 'Warehouse'}, Destination=${shipment.container?.destinationPort || 'Destination Port'}, ETA=${shipment.container?.estimatedArrival ? new Date(shipment.container.estimatedArrival).toLocaleDateString() : 'On schedule'}.`;
    }
  }

  const prompt = [
    'You are JACXI Shipping & Logistics live voice assistant on an outbound call to a customer.',
    'Answer the customer question in 1 to 3 clear spoken sentences with no markdown or special characters.',
    `Customer Name: ${customerName || 'Valued Customer'}.`,
    dbContext,
    `Customer asked: "${question}"`,
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
      // Fallback
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
      // Fallback
    }
  }

  return dbContext
    ? clipVoiceReply(dbContext, 480)
    : 'Thank you. Our JACXI operations team has noted your question and is monitoring your shipment.';
}

async function handleTwimlExecution(request: NextRequest) {
  if (!isVoiceWebhookAuthorized(request)) {
    return twimlResponse(say('Unauthorized request.') + hangup(), { status: 401 });
  }

  const step = request.nextUrl.searchParams.get('step') || 'deliver';
  const msg = request.nextUrl.searchParams.get('msg') || '';
  const vin = request.nextUrl.searchParams.get('vin') || '';
  const shipmentId = request.nextUrl.searchParams.get('shipmentId') || '';
  const customerName = request.nextUrl.searchParams.get('customerName') || 'Valued Customer';
  const token = request.nextUrl.searchParams.get('token') || '';

  const buildReplyUrl = (nextStep: string) => {
    const params = new URLSearchParams({ mode: 'twiml', step: nextStep });
    if (msg) params.set('msg', msg);
    if (vin) params.set('vin', vin);
    if (shipmentId) params.set('shipmentId', shipmentId);
    if (customerName) params.set('customerName', customerName);
    if (token) params.set('token', token);
    return `/api/voice/sent?${params.toString()}`;
  };

  if (step === 'deliver') {
    const spokenAnnouncement = cleanSpeechMessage(
      msg ||
        `Hello ${customerName}, this is a live automated call from JACXI Shipping and Logistics with an update on your vehicle shipment.`,
    );

    const followUpPrompt = `${spokenAnnouncement}. If you have any questions about this shipment, please speak after the tone, press 1 to hear this message again, or press 9 to end the call.`;

    return twimlResponse(
      gather(
        {
          action: buildReplyUrl('reply'),
          input: 'speech dtmf',
          method: 'POST',
          timeout: 7,
          speechTimeout: 'auto',
        },
        say(followUpPrompt),
      ) +
        say('Thank you for shipping with JACXI Shipping and Logistics. Goodbye.') +
        hangup(),
    );
  }

  // Handle customer spoken question or DTMF digit on the outbound call (`step === 'reply'`)
  let digits = '';
  let speechResult = '';
  if (request.method === 'POST') {
    try {
      const formData = await request.formData();
      digits = String(formData.get('Digits') || '');
      speechResult = String(formData.get('SpeechResult') || '');
    } catch {
      // ignore
    }
  }

  const normDigits = normalizeVoiceDigits(digits);
  if (normDigits === '9') {
    return twimlResponse(say('Thank you for shipping with JACXI. Goodbye.') + hangup());
  }

  if (normDigits === '1' && !speechResult) {
    return handleTwimlExecution(
      new NextRequest(new URL(buildReplyUrl('deliver'), request.url), { method: 'GET' }),
    );
  }

  const question = speechResult.trim() || normDigits;
  if (!question) {
    return twimlResponse(say('Thank you for shipping with JACXI Shipping and Logistics. Goodbye.') + hangup());
  }

  const aiReply = await generateOutboundFollowupReply(question, vin, shipmentId, customerName);
  return twimlResponse(
    gather(
      {
        action: buildReplyUrl('reply'),
        input: 'speech dtmf',
        method: 'POST',
        timeout: 7,
        speechTimeout: 'auto',
      },
      say(`${aiReply} Do you have any other questions, or press 9 to end the call?`),
    ) +
      say('Thank you for shipping with JACXI. Goodbye.') +
      hangup(),
  );
}

export async function GET(request: NextRequest) {
  return handleTwimlExecution(request);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  const mode = request.nextUrl.searchParams.get('mode');

  // 1. If Twilio is calling this webhook (application/x-www-form-urlencoded or ?mode=twiml), return TwiML XML
  if (mode === 'twiml' || contentType.includes('application/x-www-form-urlencoded')) {
    return handleTwimlExecution(request);
  }

  // 2. Otherwise, this is an API request from the Dashboard to initiate an outbound Twilio call
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const rawTo = String(body.to || '').trim();
    if (!rawTo) {
      return NextResponse.json({ message: 'Recipient phone number (to) is required.' }, { status: 400 });
    }

    const { accountSid, fromNumber, authHeader, defaultCountryCode } = await resolveTwilioCredentials();
    if (!accountSid || !authHeader || !fromNumber) {
      return NextResponse.json(
        {
          message:
            'Twilio credentials (Account SID, Auth Token, and Phone Number) are not configured yet. Add them in Settings > Call Agent or Communications.',
        },
        { status: 400 },
      );
    }

    const normalizedTo = normalizeWhatsAppPhone(rawTo, defaultCountryCode) || rawTo;
    const baseUrl = getDetectedBaseUrl(request);
    const voiceWebhookToken = process.env.VOICE_WEBHOOK_TOKEN?.trim() || '';

    const twimlUrl = new URL('/api/voice/sent', baseUrl);
    twimlUrl.searchParams.set('mode', 'twiml');
    twimlUrl.searchParams.set('step', 'deliver');
    if (voiceWebhookToken) twimlUrl.searchParams.set('token', voiceWebhookToken);
    if (body.message) twimlUrl.searchParams.set('msg', String(body.message).slice(0, 700));
    if (body.vin) twimlUrl.searchParams.set('vin', String(body.vin));
    if (body.shipmentId) twimlUrl.searchParams.set('shipmentId', String(body.shipmentId));
    if (body.customerName) twimlUrl.searchParams.set('customerName', String(body.customerName));

    const statusCallbackUrl = new URL('/api/voice/status', baseUrl);
    if (voiceWebhookToken) statusCallbackUrl.searchParams.set('token', voiceWebhookToken);

    const formParams = new URLSearchParams({
      To: normalizedTo,
      From: fromNumber,
      Url: twimlUrl.toString(),
      Method: 'POST',
      StatusCallback: statusCallbackUrl.toString(),
      StatusCallbackMethod: 'POST',
    });
    formParams.append('StatusCallbackEvent', 'initiated');
    formParams.append('StatusCallbackEvent', 'ringing');
    formParams.append('StatusCallbackEvent', 'answered');
    formParams.append('StatusCallbackEvent', 'completed');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Calls.json`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formParams.toString(),
        cache: 'no-store',
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { message: data?.message || `Twilio Call dispatch failed with status ${response.status}` },
        { status: 400 },
      );
    }

    await createSystemAuditLog({
      action: 'TWILIO_CALL_SENT',
      entityType: 'TWILIO_CALL',
      entityId: String(data.sid || `outbound_${Date.now()}`),
      actorUserId: String(session.user.id || 'admin'),
      summary: `Outbound Twilio voice call dispatched to ${normalizedTo} (${body.customerName || 'Customer'})`,
      metadata: {
        direction: 'outbound-api',
        callSid: data.sid,
        from: fromNumber,
        to: normalizedTo,
        callStatus: data.status || 'queued',
        vin: body.vin || null,
        shipmentId: body.shipmentId || null,
      },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      callSid: data.sid,
      status: data.status || 'queued',
      to: normalizedTo,
      from: fromNumber,
      twimlWebhookUrl: twimlUrl.toString(),
      statusCallbackUrl: statusCallbackUrl.toString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to initiate outbound Twilio call' },
      { status: 500 },
    );
  }
}

