import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isVoiceWebhookAuthorized } from '@/lib/voice/call-agent';
import { createSystemAuditLog } from '@/lib/system-audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getPreferredBaseUrl(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  if (!isVoiceWebhookAuthorized(request)) {
    return NextResponse.json({ message: 'Unauthorized webhook' }, { status: 401 });
  }

  try {
    const formValues = new Map<string, string>();
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      for (const [k, v] of formData.entries()) {
        if (typeof v === 'string') formValues.set(k, v);
      }
    } else {
      const json = await request.json().catch(() => ({}));
      for (const [k, v] of Object.entries(json || {})) {
        if (v !== undefined && v !== null) formValues.set(k, String(v));
      }
    }

    const callSid = formValues.get('CallSid') || `call_${Date.now()}`;
    const callStatus = formValues.get('CallStatus') || 'unknown';
    const direction = formValues.get('Direction') || 'unknown';
    const from = formValues.get('From') || '';
    const to = formValues.get('To') || '';
    const duration = formValues.get('CallDuration') || formValues.get('Duration') || '0';

    await createSystemAuditLog({
      action: `TWILIO_CALL_${callStatus.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`,
      entityType: 'TWILIO_CALL',
      entityId: callSid,
      actorUserId: 'system_twilio_webhook',
      summary: `Twilio call ${callSid} (${direction}): ${from} -> ${to} [${callStatus}] (${duration}s)`,
      metadata: {
        callSid,
        callStatus,
        direction,
        from,
        to,
        durationSeconds: Number(duration) || 0,
        timestamp: new Date().toISOString(),
      },
    }).catch(() => null);

    return NextResponse.json({ ok: true, callSid, callStatus });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to process Twilio call status callback' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = getPreferredBaseUrl(request);
    const token = process.env.VOICE_WEBHOOK_TOKEN?.trim() || '';
    const tokenSuffix = token ? `?token=${encodeURIComponent(token)}` : '';

    const logs = await prisma.aiInteractionLog
      .findMany({
        where: { entityType: 'TWILIO_CALL' },
        orderBy: { createdAt: 'desc' },
        take: 25,
      })
      .catch(() => []);

    return NextResponse.json({
      ok: true,
      webhooks: {
        receiveWebhookUrl: `${baseUrl}/api/voice/receive${tokenSuffix}`,
        sentWebhookUrl: `${baseUrl}/api/voice/sent${tokenSuffix}`,
        statusWebhookUrl: `${baseUrl}/api/voice/status${tokenSuffix}`,
        classicIvrWebhookUrl: `${baseUrl}/api/voice${tokenSuffix}`,
      },
      recentCalls: logs.map((l) => ({
        id: l.id,
        callSid: l.entityId,
        action: (l.feature || '').replace(/^audit:/, ''),
        summary: l.prompt || l.response || '',
        metadata: l.requestPayload,
        createdAt: l.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to load Twilio call webhooks and status logs' },
      { status: 500 },
    );
  }
}
