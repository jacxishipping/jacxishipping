import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  getEffectiveGeminiApiKey,
  getEffectiveGeminiLiveApiKey,
  getEffectiveGeminiLiveModel,
  getEffectiveGeminiVoiceModel,
  getStoredCallAgentSettings,
} from '@/lib/call-agent-settings';
import { decryptSecret } from '@/lib/secret-crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getStoredCallAgentSettings();
    const geminiLiveKey = getEffectiveGeminiLiveApiKey(settings);
    const geminiStandardKey = getEffectiveGeminiApiKey(settings);
    const liveModel = getEffectiveGeminiLiveModel(settings);
    const voiceModel = getEffectiveGeminiVoiceModel(settings);

    const vin = request.nextUrl.searchParams.get('vin')?.trim() || '';
    const shipmentId = request.nextUrl.searchParams.get('shipmentId')?.trim() || '';

    let shipmentContext: Record<string, unknown> | null = null;
    if (shipmentId || (vin && vin !== 'N/A')) {
      const shipment = await prisma.shipment.findFirst({
        where: shipmentId
          ? { id: shipmentId }
          : { vehicleVIN: { equals: vin, mode: 'insensitive' } },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          container: {
            select: {
              containerNumber: true,
              status: true,
              currentLocation: true,
              destinationPort: true,
              estimatedArrival: true,
              vesselName: true,
            },
          },
          dispatch: {
            select: {
              referenceNumber: true,
              origin: true,
              destination: true,
              status: true,
            },
          },
        },
      });

      if (shipment) {
        shipmentContext = {
          id: shipment.id,
          vehicle: [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType,
          vin: shipment.vehicleVIN,
          status: shipment.status,
          paymentStatus: shipment.paymentStatus,
          price: shipment.price,
          customerName: shipment.user?.name || shipment.user?.email,
          customerPhone: shipment.user?.phone,
          containerNumber: shipment.container?.containerNumber,
          vesselName: shipment.container?.vesselName,
          currentLocation: shipment.container?.currentLocation || shipment.dispatch?.origin || 'Export Warehouse',
          destinationPort: shipment.container?.destinationPort || shipment.dispatch?.destination || 'Destination Port',
          eta: shipment.container?.estimatedArrival,
        };
      }
    }

    return NextResponse.json({
      ok: true,
      geminiLiveReady: Boolean(geminiLiveKey),
      geminiStandardReady: Boolean(geminiStandardKey),
      liveModel,
      voiceModel,
      // Provide WebSocket URL for direct browser Gemini Live Bidi stream when key is configured
      geminiLiveWsUrl: geminiLiveKey
        ? `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(geminiLiveKey)}`
        : null,
      googleVoiceNumber: settings.twilioPhoneNumber || process.env.GOOGLE_VOICE_NUMBER || '+93704117413',
      shipmentContext,
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to initialize live voice session' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const transcript = String(body.transcript || '').trim();
    const language = String(body.language || 'en').trim();
    const payloadContext = body.context || {};

    if (!transcript) {
      return NextResponse.json({ message: 'Voice transcript is required' }, { status: 400 });
    }

    // 1. Check if transcript mentions a VIN or Container or if we have active context
    const vinMatch = transcript.match(/\b[A-HJ-NPR-Z0-9]{17}\b/i)?.[0] || payloadContext.vin;
    const containerMatch = transcript.match(/\b[A-Z]{4}\d{7}\b/i)?.[0] || payloadContext.containerNumber;

    let dbSummary = '';
    if (vinMatch && vinMatch !== 'N/A') {
      const shipment = await prisma.shipment.findFirst({
        where: { vehicleVIN: { contains: vinMatch, mode: 'insensitive' } },
        include: {
          user: { select: { name: true, email: true, phone: true } },
          container: true,
          dispatch: true,
        },
      });
      if (shipment) {
        const vehicle = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ');
        dbSummary += `Live Database Record for VIN ${shipment.vehicleVIN}: Vehicle=${vehicle}, Status=${shipment.status}, Payment=${shipment.paymentStatus}, Price=$${shipment.price || 0}, Customer=${shipment.user?.name || 'N/A'}, Container=${shipment.container?.containerNumber || 'Pending'}, Location=${shipment.container?.currentLocation || shipment.dispatch?.origin || 'Warehouse'}, Destination=${shipment.container?.destinationPort || 'Port'}, ETA=${shipment.container?.estimatedArrival ? new Date(shipment.container.estimatedArrival).toLocaleDateString() : 'TBD'}. `;
      }
    }

    if (containerMatch && containerMatch !== 'PENDING') {
      const container = await prisma.container.findFirst({
        where: { containerNumber: { contains: containerMatch, mode: 'insensitive' } },
        include: { shipments: { select: { vehicleYear: true, vehicleMake: true, vehicleModel: true, vehicleVIN: true } } },
      });
      if (container) {
        dbSummary += `Live Container ${container.containerNumber}: Status=${container.status}, Vessel=${container.vesselName || 'N/A'}, Location=${container.currentLocation || 'At Sea'}, Destination=${container.destinationPort || 'N/A'}, ETA=${container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString() : 'TBD'}, Vehicles Count=${container.shipments.length}. `;
      }
    }

    if (!dbSummary) {
      const [totalShipments, inTransitCount, activeContainers] = await Promise.all([
        prisma.shipment.count(),
        prisma.shipment.count({ where: { status: 'IN_TRANSIT' } }),
        prisma.container.count({ where: { status: { in: ['IN_TRANSIT', 'LOADED', 'CREATED'] } } }),
      ]);
      dbSummary = `Live Fleet Overview: Total Shipments=${totalShipments}, In Transit=${inTransitCount}, Active Ocean Containers=${activeContainers}. `;
    }

    const langInstruction =
      language === 'ps'
        ? 'Respond in fluent, natural Pashto (پښتو).'
        : language === 'fa'
          ? 'Respond in fluent, natural Dari / Persian (دری).'
          : language === 'ar'
            ? 'Respond in fluent, natural Arabic (العربية).'
            : 'Respond in clear, natural English.';

    const systemPrompt = [
      'You are the JACXI Shipping & Logistics Live Voice Call Assistant (Google Voice & Gemini Live).',
      'Speak naturally, concisely, and warmly as a live human-like voice agent on a phone call.',
      'Keep your answer to 1 to 3 clear spoken sentences with no markdown symbols, asterisks, or bullet points.',
      langInstruction,
      `Active Context: Customer=${payloadContext.customerName || 'Caller'}, Vehicle=${payloadContext.vehicleDetails || 'N/A'}, VIN=${payloadContext.vin || 'N/A'}, Container=${payloadContext.containerNumber || 'N/A'}, Origin=${payloadContext.portOfOrigin || 'US Yard'}, Destination=${payloadContext.destinationPort || 'Destination Port'}, ETA=${payloadContext.eta || 'On Schedule'}, Balance=${payloadContext.balanceDue ?? 'N/A'}.`,
      dbSummary,
    ].join(' ');

    const callSettings = await getStoredCallAgentSettings();
    const geminiKey = getEffectiveGeminiApiKey(callSettings) || getEffectiveGeminiLiveApiKey(callSettings);
    const geminiModel = getEffectiveGeminiVoiceModel(callSettings);

    let spokenReply = '';
    let providerUsed = 'gemini-voice';

    if (geminiKey) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            generationConfig: { temperature: 0.25, maxOutputTokens: 220 },
            contents: [{ parts: [{ text: `${systemPrompt}\n\nCaller said: "${transcript}"` }] }],
          }),
          cache: 'no-store',
        },
      );

      if (res.ok) {
        const data = await res.json();
        spokenReply =
          data?.candidates?.[0]?.content?.parts
            ?.map((p: any) => p?.text || '')
            .join(' ')
            .replace(/[*_#`~]/g, '')
            .trim() || '';
      }
    }

    // Fallback to configured AI provider (TokenRouter / MiniMax) if Gemini key is not yet set
    if (!spokenReply) {
      const aiRecord = await prisma.aiProviderSettings.findUnique({ where: { scope: 'default' } });
      const aiKey = decryptSecret(aiRecord?.apiKey) || process.env.TOKENROUTER_API_KEY || '';
      const aiUrl = aiRecord?.chatCompletionsUrl || 'https://api.tokenrouter.com/v1/chat/completions';
      if ((aiRecord?.enabled ?? true) && aiKey) {
        providerUsed = aiRecord?.provider || 'tokenrouter';
        const res = await fetch(aiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${aiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: aiRecord?.model || 'MiniMax-M3',
            max_tokens: 220,
            temperature: 0.25,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: transcript },
            ],
          }),
          cache: 'no-store',
        });
        if (res.ok) {
          const data = await res.json();
          spokenReply = (data?.choices?.[0]?.message?.content || '').replace(/[*_#`~]/g, '').trim();
        }
      }
    }

    // Intelligent deterministic voice response if neither AI key is configured
    if (!spokenReply) {
      providerUsed = 'jacxi-voice-engine';
      const vehicle = payloadContext.vehicleDetails || 'your vehicle';
      const vin = payloadContext.vin && payloadContext.vin !== 'N/A' ? ` with VIN ${payloadContext.vin}` : '';
      const container =
        payloadContext.containerNumber && payloadContext.containerNumber !== 'PENDING'
          ? ` inside container ${payloadContext.containerNumber}`
          : '';
      const dest = payloadContext.destinationPort || 'the destination port';
      const eta = payloadContext.eta || 'on schedule';
      spokenReply = `Hello ${payloadContext.customerName || 'there'}, this is JACXI Shipping Live Voice. ${vehicle}${vin} is currently moving${container} toward ${dest}, with an estimated arrival of ${eta}. How else can I assist you on this call?`;
    }

    return NextResponse.json({
      ok: true,
      reply: spokenReply,
      provider: providerUsed,
      dbContext: dbSummary,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to process live voice turn' },
      { status: 500 },
    );
  }
}

