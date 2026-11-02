import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import {
  getStoredCommunicationSettings,
  isEmailConfigured,
  isSmsConfigured,
  isWhatsAppApiConfigured,
  maskCommunicationSecret,
  saveStoredCommunicationSettings,
  sendConfiguredEmail,
  sendConfiguredSms,
  sendConfiguredWhatsApp,
  type CommunicationProviderSettingsValues,
} from '@/lib/communication-settings';

export const dynamic = 'force-dynamic';

const communicationSettingsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  emailProvider: z.string().trim().min(1).max(80).optional(),
  emailApiKey: z.string().optional(),
  emailFromAddress: z.string().trim().email().optional(),
  emailReplyToAddress: z.string().trim().email().optional().or(z.literal('')),
  smsEnabled: z.boolean().optional(),
  smsProvider: z.string().trim().min(1).max(80).optional(),
  smsAccountSid: z.string().trim().optional(),
  smsAuthToken: z.string().optional(),
  smsFromNumber: z.string().trim().optional(),
  smsMessagingServiceSid: z.string().trim().optional(),
  // WhatsApp Business settings
  whatsappEnabled: z.boolean().optional(),
  whatsappProvider: z.enum(['meta_cloud', 'twilio', 'wa_me']).optional(),
  whatsappPhoneNumberId: z.string().trim().optional(),
  whatsappBusinessAccountId: z.string().trim().optional(),
  whatsappAccessToken: z.string().optional(),
  whatsappFromNumber: z.string().trim().optional(),
  whatsappDefaultCountryCode: z.string().trim().optional(),
  whatsappBusinessName: z.string().trim().optional(),
  whatsappTemplateName: z.string().trim().optional(),
  whatsappVerifiedBadge: z.boolean().optional(),
});

const testSchema = z.object({
  channel: z.enum(['email', 'sms', 'whatsapp']),
  to: z.string().trim().min(1),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') return null;
  return session;
}

function toClientSettings(settings: CommunicationProviderSettingsValues) {
  return {
    ...settings,
    emailApiKey: '',
    smsAuthToken: '',
    whatsappAccessToken: '',
    emailApiKeyConfigured: Boolean(settings.emailApiKey),
    smsAuthTokenConfigured: Boolean(settings.smsAuthToken),
    whatsappAccessTokenConfigured: Boolean(settings.whatsappAccessToken),
    emailApiKeyMasked: maskCommunicationSecret(settings.emailApiKey),
    smsAuthTokenMasked: maskCommunicationSecret(settings.smsAuthToken),
    whatsappAccessTokenMasked: maskCommunicationSecret(settings.whatsappAccessToken),
    emailConfigured: isEmailConfigured(settings),
    smsConfigured: isSmsConfigured(settings),
    whatsappConfigured: isWhatsAppApiConfigured(settings),
  };
}

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ settings: toClientSettings(await getStoredCommunicationSettings()) });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load communication settings.' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const payload = communicationSettingsSchema.parse(await request.json());
    const partial = { ...payload } satisfies Partial<CommunicationProviderSettingsValues>;
    if (payload.emailApiKey === '') delete partial.emailApiKey;
    if (payload.smsAuthToken === '') delete partial.smsAuthToken;
    if (payload.whatsappAccessToken === '') delete partial.whatsappAccessToken;

    const settings = await saveStoredCommunicationSettings(partial);
    await createAuditLog(
      'SETTINGS',
      'communications',
      'UPDATE',
      session.user.id as string,
      {
        summary: `Updated communication settings fields: ${Object.keys(payload).join(', ')}`,
        updatedFields: Object.keys(payload).filter(
          (key) => !['emailApiKey', 'smsAuthToken', 'whatsappAccessToken'].includes(key),
        ),
        emailSecretUpdated: Object.prototype.hasOwnProperty.call(payload, 'emailApiKey') && Boolean(payload.emailApiKey),
        smsSecretUpdated: Object.prototype.hasOwnProperty.call(payload, 'smsAuthToken') && Boolean(payload.smsAuthToken),
        whatsappSecretUpdated:
          Object.prototype.hasOwnProperty.call(payload, 'whatsappAccessToken') && Boolean(payload.whatsappAccessToken),
      },
      request,
    );

    return NextResponse.json({ settings: toClientSettings(settings) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid communication settings.', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to save communication settings.' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const payload = testSchema.parse(await request.json());
    const startedAt = Date.now();

    if (payload.channel === 'whatsapp') {
      const waResult = await sendConfiguredWhatsApp({
        to: payload.to,
        body: '✅ *JACXI Shipping & Logistics*\n\nYour WhatsApp Business communication channel is active and verified.\n\n🌐 https://www.jacxishipping.com/tracking',
      });

      if (!waResult.success) {
        return NextResponse.json(
          {
            message: String(waResult.error || 'WhatsApp test failed.'),
            waMeUrl: waResult.waMeUrl,
            deliveryMode: waResult.deliveryMode,
          },
          { status: 400 },
        );
      }

      return NextResponse.json({
        ok: true,
        channel: 'whatsapp',
        provider: waResult.provider,
        deliveryMode: waResult.deliveryMode,
        messageId: waResult.messageId,
        waMeUrl: waResult.waMeUrl,
        normalizedPhone: waResult.normalizedPhone,
        latencyMs: Date.now() - startedAt,
      });
    }

    const result = payload.channel === 'email'
      ? await sendConfiguredEmail({
          to: payload.to,
          subject: 'Jacxi communication test',
          html: '<p>Your Jacxi email provider settings are working.</p>',
          text: 'Your Jacxi email provider settings are working.',
        })
      : await sendConfiguredSms({
          to: payload.to,
          body: 'Jacxi SMS provider settings are working.',
        });

    if (!result.success) {
      return NextResponse.json({ message: String(result.error || 'Communication test failed.') }, { status: 400 });
    }

    return NextResponse.json({ ok: true, channel: payload.channel, latencyMs: Date.now() - startedAt });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid communication test request.', details: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Communication test failed.' },
      { status: 500 },
    );
  }
}
