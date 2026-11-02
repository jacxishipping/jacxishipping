import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  buildWhatsAppDirectUrl,
  getStoredCommunicationSettings,
  normalizeWhatsAppPhone,
  sendConfiguredEmail,
  sendConfiguredSms,
  sendConfiguredWhatsApp,
} from '@/lib/communication-settings';
import { createSignedDownloadToken } from '../../../../../mcps/jacxishipping/src/oauth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = body.action || 'dispatch';
    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.jacxishipping.com').replace(/\/$/, '');

    // Generate signed branded document links for 1-click WhatsApp attachment
    if (action === 'signed_links') {
      const targetId = String(body.shipmentId || body.vin || body.containerId || '').trim();
      if (!targetId) {
        return NextResponse.json({ message: 'shipmentId or vin is required' }, { status: 400 });
      }

      const receiptToken = createSignedDownloadToken(
        'shipment_receipt',
        targetId,
        7 * 24 * 3600,
      );
      const gatePassToken = createSignedDownloadToken(
        'gate_pass',
        targetId,
        7 * 24 * 3600,
      );

      const receiptUrl = `${baseUrl}/api/documents/branded?type=shipment_receipt&id=${encodeURIComponent(targetId)}&token=${encodeURIComponent(receiptToken)}`;
      const gatePassUrl = `${baseUrl}/api/documents/branded?type=gate_pass&id=${encodeURIComponent(targetId)}&token=${encodeURIComponent(gatePassToken)}`;
      const trackingUrl = `${baseUrl}/tracking?vin=${encodeURIComponent(body.vin || targetId)}`;

      return NextResponse.json({
        ok: true,
        receiptUrl,
        gatePassUrl,
        trackingUrl,
      });
    }

    const channel = (body.channel || 'whatsapp') as 'whatsapp' | 'sms' | 'email';
    const to = String(body.to || '').trim();
    const message = String(body.message || '').trim();
    const subject = String(body.subject || 'JACXI Shipping Update').trim();

    if (!message) {
      return NextResponse.json({ message: 'Message content cannot be empty.' }, { status: 400 });
    }

    const settings = await getStoredCommunicationSettings();

    if (channel === 'whatsapp') {
      const normalizedPhone = normalizeWhatsAppPhone(to, settings.whatsappDefaultCountryCode);
      const waMeUrl = buildWhatsAppDirectUrl(to, message, settings.whatsappDefaultCountryCode);

      if (!to) {
        return NextResponse.json({
          ok: true,
          channel: 'whatsapp',
          provider: 'wa_me',
          deliveryMode: 'wa_me_deep_link',
          normalizedPhone: '',
          waMeUrl,
        });
      }

      const waRes = await sendConfiguredWhatsApp({
        to,
        body: message,
        previewUrl: true,
      });

      return NextResponse.json({
        ok: waRes.success,
        channel: 'whatsapp',
        provider: waRes.provider,
        deliveryMode: waRes.deliveryMode,
        messageId: waRes.messageId,
        normalizedPhone: waRes.normalizedPhone,
        waMeUrl: waRes.waMeUrl,
        error: waRes.error,
        timestamp: new Date().toISOString(),
      });
    }

    if (channel === 'sms') {
      if (!to) {
        return NextResponse.json({ message: 'Recipient phone number is required for SMS.' }, { status: 400 });
      }
      const smsRes = await sendConfiguredSms({ to, body: message });
      if (!smsRes.success) {
        return NextResponse.json({ message: smsRes.error || 'SMS dispatch failed.' }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        channel: 'sms',
        sid: smsRes.sid,
        timestamp: new Date().toISOString(),
      });
    }

    if (channel === 'email') {
      if (!to) {
        return NextResponse.json({ message: 'Recipient email address is required.' }, { status: 400 });
      }
      const htmlBody = `
        <div style="font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: #080c14; color: #ffffff; padding: 20px 24px; border-bottom: 3px solid #DDA853;">
            <div style="font-size: 18px; font-weight: 800; letter-spacing: 0.04em;">JACXI SHIPPING & LOGISTICS</div>
            <div style="font-size: 12px; color: #DDA853; margin-top: 4px;">Global Auto Export & Container Freight</div>
          </div>
          <div style="padding: 24px; color: #1e293b; font-size: 14px; line-height: 1.65; white-space: pre-wrap;">${message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')}</div>
          <div style="background: #f8fafc; padding: 14px 24px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            Herat Customs Dept, Heart, Afghanistan • Tel/WhatsApp: +93 70 411 7413 • www.jacxishipping.com
          </div>
        </div>
      `;
      const emailRes = await sendConfiguredEmail({
        to,
        subject,
        html: htmlBody,
        text: message,
      });
      if (!emailRes.success) {
        return NextResponse.json({ message: emailRes.error || 'Email dispatch failed.' }, { status: 400 });
      }
      return NextResponse.json({
        ok: true,
        channel: 'email',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ message: 'Unsupported channel' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to dispatch customer communication.' },
      { status: 500 },
    );
  }
}
