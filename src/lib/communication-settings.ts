import { Resend } from 'resend';
import { prisma } from '@/lib/db';
import { decryptSecret, encryptSecret } from '@/lib/secret-crypto';

const COMMUNICATION_SETTINGS_SCOPE = 'default';
const WHATSAPP_SETTINGS_SCOPE = 'whatsapp_business';

export type WhatsAppProviderType = 'meta_cloud' | 'twilio' | 'wa_me';

export type CommunicationProviderSettingsValues = {
  emailEnabled: boolean;
  emailProvider: string;
  emailApiKey: string;
  emailFromAddress: string;
  emailReplyToAddress: string;
  smsEnabled: boolean;
  smsProvider: string;
  smsAccountSid: string;
  smsAuthToken: string;
  smsFromNumber: string;
  smsMessagingServiceSid: string;
  // WhatsApp Business Configuration
  whatsappEnabled: boolean;
  whatsappProvider: WhatsAppProviderType;
  whatsappPhoneNumberId: string;
  whatsappBusinessAccountId: string;
  whatsappAccessToken: string;
  whatsappFromNumber: string;
  whatsappDefaultCountryCode: string;
  whatsappBusinessName: string;
  whatsappTemplateName: string;
  whatsappVerifiedBadge: boolean;
};

export const EMPTY_COMMUNICATION_SETTINGS: CommunicationProviderSettingsValues = {
  emailEnabled: false,
  emailProvider: 'resend',
  emailApiKey: '',
  emailFromAddress: 'notifications@jacxishipping.com',
  emailReplyToAddress: 'support@jacxishipping.com',
  smsEnabled: false,
  smsProvider: 'twilio',
  smsAccountSid: '',
  smsAuthToken: '',
  smsFromNumber: '',
  smsMessagingServiceSid: '',
  whatsappEnabled: true,
  whatsappProvider: 'wa_me',
  whatsappPhoneNumberId: '',
  whatsappBusinessAccountId: '',
  whatsappAccessToken: '',
  whatsappFromNumber: '+93704117413',
  whatsappDefaultCountryCode: '+93',
  whatsappBusinessName: 'JACXI Shipping & Logistics',
  whatsappTemplateName: '',
  whatsappVerifiedBadge: true,
};

function normalizeValue(value: string | null | undefined, fallback = '') {
  return value?.trim() || fallback;
}

export function normalizeWhatsAppPhone(rawPhone: string, defaultCountryCode = '+93'): string {
  const cleaned = (rawPhone || '').replace(/[^\d+]/g, '').trim();
  if (!cleaned) return '';

  const ccDigits = (defaultCountryCode || '+93').replace(/[^\d]/g, '') || '93';

  if (cleaned.startsWith('+')) {
    return `+${cleaned.slice(1).replace(/[^\d]/g, '')}`;
  }
  if (cleaned.startsWith('00')) {
    return `+${cleaned.slice(2)}`;
  }
  // Local number starting with 0 (e.g. 0704117413 in AF or 0501234567 in UAE)
  if (cleaned.startsWith('0') && cleaned.length >= 9 && cleaned.length <= 11) {
    return `+${ccDigits}${cleaned.slice(1)}`;
  }
  // 10-digit US/Canada number without country code
  if (ccDigits === '1' && cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  // 9-digit AF/UAE local number without leading 0
  if (cleaned.length === 9 && (ccDigits === '93' || ccDigits === '971')) {
    return `+${ccDigits}${cleaned}`;
  }
  return `+${cleaned}`;
}

export function buildWhatsAppDirectUrl(phone: string, text: string, defaultCountryCode = '+93'): string {
  const normalized = normalizeWhatsAppPhone(phone, defaultCountryCode);
  const digitsOnly = normalized.replace(/[^\d]/g, '');
  const encodedText = encodeURIComponent(text || '');
  return digitsOnly
    ? `https://wa.me/${digitsOnly}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;
}

export function mapCommunicationSettings(
  record?: Partial<Record<string, unknown>> | null,
  whatsappRecord?: Partial<Record<string, unknown>> | null,
): CommunicationProviderSettingsValues {
  const emailApiKey = decryptSecret(record?.emailApiKey as string | null | undefined) || process.env.RESEND_API_KEY?.trim() || '';
  const smsAuthToken = decryptSecret(record?.smsAuthToken as string | null | undefined) || process.env.TWILIO_AUTH_TOKEN?.trim() || '';
  const whatsappAccessToken =
    decryptSecret(whatsappRecord?.smsAuthToken as string | null | undefined) ||
    process.env.WHATSAPP_ACCESS_TOKEN?.trim() ||
    '';

  const envWaProvider: WhatsAppProviderType = process.env.WHATSAPP_PHONE_NUMBER_ID
    ? 'meta_cloud'
    : process.env.TWILIO_ACCOUNT_SID
      ? 'twilio'
      : 'wa_me';

  const rawProvider = normalizeValue(whatsappRecord?.smsProvider as string | null | undefined, envWaProvider);
  const whatsappProvider: WhatsAppProviderType =
    rawProvider === 'meta_cloud' || rawProvider === 'twilio' || rawProvider === 'wa_me'
      ? rawProvider
      : envWaProvider;

  return {
    emailEnabled: Boolean(record?.emailEnabled ?? Boolean(emailApiKey)),
    emailProvider: normalizeValue(record?.emailProvider as string | null | undefined, 'resend'),
    emailApiKey,
    emailFromAddress: normalizeValue(
      record?.emailFromAddress as string | null | undefined,
      process.env.EMAIL_FROM || EMPTY_COMMUNICATION_SETTINGS.emailFromAddress,
    ),
    emailReplyToAddress: normalizeValue(
      record?.emailReplyToAddress as string | null | undefined,
      process.env.EMAIL_REPLY_TO || EMPTY_COMMUNICATION_SETTINGS.emailReplyToAddress,
    ),
    smsEnabled: Boolean(record?.smsEnabled ?? Boolean(process.env.TWILIO_ACCOUNT_SID && smsAuthToken)),
    smsProvider: normalizeValue(record?.smsProvider as string | null | undefined, 'twilio'),
    smsAccountSid: normalizeValue(record?.smsAccountSid as string | null | undefined, process.env.TWILIO_ACCOUNT_SID || ''),
    smsAuthToken,
    smsFromNumber: normalizeValue(record?.smsFromNumber as string | null | undefined, process.env.TWILIO_PHONE_NUMBER || ''),
    smsMessagingServiceSid: normalizeValue(
      record?.smsMessagingServiceSid as string | null | undefined,
      process.env.TWILIO_MESSAGING_SERVICE_SID || '',
    ),
    whatsappEnabled: Boolean(whatsappRecord?.smsEnabled ?? true),
    whatsappProvider,
    whatsappPhoneNumberId: normalizeValue(
      whatsappRecord?.smsAccountSid as string | null | undefined,
      process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    ),
    whatsappBusinessAccountId: normalizeValue(
      whatsappRecord?.smsMessagingServiceSid as string | null | undefined,
      process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    ),
    whatsappAccessToken,
    whatsappFromNumber: normalizeValue(
      whatsappRecord?.smsFromNumber as string | null | undefined,
      process.env.WHATSAPP_PHONE_NUMBER || EMPTY_COMMUNICATION_SETTINGS.whatsappFromNumber,
    ),
    whatsappDefaultCountryCode: normalizeValue(
      whatsappRecord?.emailProvider as string | null | undefined,
      process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || EMPTY_COMMUNICATION_SETTINGS.whatsappDefaultCountryCode,
    ),
    whatsappBusinessName: normalizeValue(
      whatsappRecord?.emailFromAddress as string | null | undefined,
      process.env.WHATSAPP_BUSINESS_NAME || EMPTY_COMMUNICATION_SETTINGS.whatsappBusinessName,
    ),
    whatsappTemplateName: normalizeValue(
      whatsappRecord?.emailReplyToAddress as string | null | undefined,
      process.env.WHATSAPP_TEMPLATE_NAME || '',
    ),
    whatsappVerifiedBadge: Boolean(whatsappRecord?.emailEnabled ?? true),
  };
}

export function toPersistedCommunicationSettingsData(settings: CommunicationProviderSettingsValues) {
  return {
    emailEnabled: settings.emailEnabled,
    emailProvider: settings.emailProvider || 'resend',
    emailApiKey: encryptSecret(settings.emailApiKey),
    emailFromAddress: settings.emailFromAddress || null,
    emailReplyToAddress: settings.emailReplyToAddress || null,
    smsEnabled: settings.smsEnabled,
    smsProvider: settings.smsProvider || 'twilio',
    smsAccountSid: settings.smsAccountSid || null,
    smsAuthToken: encryptSecret(settings.smsAuthToken),
    smsFromNumber: settings.smsFromNumber || null,
    smsMessagingServiceSid: settings.smsMessagingServiceSid || null,
  };
}

export function toPersistedWhatsAppSettingsData(settings: CommunicationProviderSettingsValues) {
  return {
    emailEnabled: settings.whatsappVerifiedBadge,
    emailProvider: settings.whatsappDefaultCountryCode || '+93',
    emailApiKey: null,
    emailFromAddress: settings.whatsappBusinessName || 'JACXI Shipping & Logistics',
    emailReplyToAddress: settings.whatsappTemplateName || null,
    smsEnabled: settings.whatsappEnabled,
    smsProvider: settings.whatsappProvider || 'wa_me',
    smsAccountSid: settings.whatsappPhoneNumberId || null,
    smsAuthToken: encryptSecret(settings.whatsappAccessToken),
    smsFromNumber: settings.whatsappFromNumber || '+93704117413',
    smsMessagingServiceSid: settings.whatsappBusinessAccountId || null,
  };
}

export async function getStoredCommunicationSettings() {
  const [settings, whatsappSettings] = await Promise.all([
    prisma.communicationProviderSettings.findUnique({
      where: { scope: COMMUNICATION_SETTINGS_SCOPE },
    }),
    prisma.communicationProviderSettings.findUnique({
      where: { scope: WHATSAPP_SETTINGS_SCOPE },
    }),
  ]);

  return mapCommunicationSettings(settings, whatsappSettings);
}

export async function saveStoredCommunicationSettings(partial: Partial<CommunicationProviderSettingsValues>) {
  const current = await getStoredCommunicationSettings();
  const next = { ...current, ...partial } satisfies CommunicationProviderSettingsValues;

  await Promise.all([
    prisma.communicationProviderSettings.upsert({
      where: { scope: COMMUNICATION_SETTINGS_SCOPE },
      create: {
        scope: COMMUNICATION_SETTINGS_SCOPE,
        ...toPersistedCommunicationSettingsData(next),
      },
      update: toPersistedCommunicationSettingsData(next),
    }),
    prisma.communicationProviderSettings.upsert({
      where: { scope: WHATSAPP_SETTINGS_SCOPE },
      create: {
        scope: WHATSAPP_SETTINGS_SCOPE,
        ...toPersistedWhatsAppSettingsData(next),
      },
      update: toPersistedWhatsAppSettingsData(next),
    }),
  ]);

  return next;
}

export function maskCommunicationSecret(value: string) {
  if (!value) return '';
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

export function isEmailConfigured(settings: CommunicationProviderSettingsValues) {
  return Boolean(settings.emailEnabled && settings.emailProvider === 'resend' && settings.emailApiKey && settings.emailFromAddress);
}

export function isSmsConfigured(settings: CommunicationProviderSettingsValues) {
  return Boolean(
    settings.smsEnabled &&
      settings.smsProvider === 'twilio' &&
      settings.smsAccountSid &&
      settings.smsAuthToken &&
      (settings.smsFromNumber || settings.smsMessagingServiceSid),
  );
}

export function isWhatsAppApiConfigured(settings: CommunicationProviderSettingsValues) {
  if (!settings.whatsappEnabled) return false;
  if (settings.whatsappProvider === 'meta_cloud') {
    return Boolean(settings.whatsappPhoneNumberId && settings.whatsappAccessToken);
  }
  if (settings.whatsappProvider === 'twilio') {
    return Boolean(
      settings.smsAccountSid &&
        settings.smsAuthToken &&
        (settings.whatsappFromNumber || settings.smsFromNumber),
    );
  }
  return Boolean(settings.whatsappFromNumber);
}

export async function sendConfiguredEmail(input: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}) {
  const settings = await getStoredCommunicationSettings();
  if (!isEmailConfigured(settings)) {
    return { success: false, error: 'Email provider is not configured.' };
  }

  const resend = new Resend(settings.emailApiKey);
  await resend.emails.send({
    from: input.from || settings.emailFromAddress,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo || settings.emailReplyToAddress || undefined,
  });

  return { success: true };
}

export async function sendConfiguredSms(input: { to: string; body: string }) {
  const settings = await getStoredCommunicationSettings();
  if (!isSmsConfigured(settings)) {
    return { success: false, error: 'SMS provider is not configured.' };
  }

  const normalizedTo = normalizeWhatsAppPhone(input.to, settings.whatsappDefaultCountryCode);
  const body = new URLSearchParams({
    To: normalizedTo || input.to,
    Body: input.body,
  });
  if (settings.smsMessagingServiceSid) {
    body.set('MessagingServiceSid', settings.smsMessagingServiceSid);
  } else {
    body.set('From', settings.smsFromNumber);
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${settings.smsAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${settings.smsAccountSid}:${settings.smsAuthToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { success: false, error: payload?.message || `Twilio returned status ${response.status}` };
  }

  return { success: true, sid: payload?.sid as string | undefined };
}

export async function sendConfiguredWhatsApp(input: {
  to: string;
  body: string;
  previewUrl?: boolean;
  templateName?: string;
  languageCode?: string;
}): Promise<{
  success: boolean;
  provider: WhatsAppProviderType;
  deliveryMode: 'meta_cloud_api' | 'twilio_whatsapp_api' | 'wa_me_deep_link';
  messageId?: string;
  normalizedPhone: string;
  waMeUrl: string;
  error?: string;
}> {
  const settings = await getStoredCommunicationSettings();
  const normalizedPhone = normalizeWhatsAppPhone(input.to, settings.whatsappDefaultCountryCode);
  const waMeUrl = buildWhatsAppDirectUrl(input.to, input.body, settings.whatsappDefaultCountryCode);

  if (!settings.whatsappEnabled) {
    return {
      success: false,
      provider: settings.whatsappProvider,
      deliveryMode: 'wa_me_deep_link',
      normalizedPhone,
      waMeUrl,
      error: 'WhatsApp Business notifications are currently disabled in Communications settings.',
    };
  }

  // 1. Meta Official WhatsApp Cloud API (Graph API v21.0)
  if (settings.whatsappProvider === 'meta_cloud') {
    if (!settings.whatsappPhoneNumberId || !settings.whatsappAccessToken) {
      return {
        success: false,
        provider: 'meta_cloud',
        deliveryMode: 'wa_me_deep_link',
        normalizedPhone,
        waMeUrl,
        error: 'Meta WhatsApp Cloud API Phone Number ID or Access Token is not configured.',
      };
    }

    const toDigits = normalizedPhone.replace(/[^\d]/g, '');
    if (!toDigits) {
      return {
        success: false,
        provider: 'meta_cloud',
        deliveryMode: 'meta_cloud_api',
        normalizedPhone,
        waMeUrl,
        error: 'Invalid recipient WhatsApp phone number.',
      };
    }

    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${encodeURIComponent(settings.whatsappPhoneNumberId)}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${settings.whatsappAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: toDigits,
            type: 'text',
            text: {
              preview_url: input.previewUrl ?? true,
              body: input.body,
            },
          }),
          cache: 'no-store',
        },
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const metaError = data?.error?.message || `Meta Cloud API returned status ${response.status}`;
        return {
          success: false,
          provider: 'meta_cloud',
          deliveryMode: 'meta_cloud_api',
          normalizedPhone,
          waMeUrl,
          error: metaError,
        };
      }

      const messageId = data?.messages?.[0]?.id as string | undefined;
      return {
        success: true,
        provider: 'meta_cloud',
        deliveryMode: 'meta_cloud_api',
        messageId,
        normalizedPhone,
        waMeUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'meta_cloud',
        deliveryMode: 'meta_cloud_api',
        normalizedPhone,
        waMeUrl,
        error: err?.message || 'Meta WhatsApp Cloud API network error',
      };
    }
  }

  // 2. Twilio WhatsApp Business API
  if (settings.whatsappProvider === 'twilio') {
    const senderRaw = settings.whatsappFromNumber || settings.smsFromNumber;
    if (!settings.smsAccountSid || !settings.smsAuthToken || !senderRaw) {
      return {
        success: false,
        provider: 'twilio',
        deliveryMode: 'wa_me_deep_link',
        normalizedPhone,
        waMeUrl,
        error: 'Twilio Account SID, Auth Token, or WhatsApp From Number is not configured.',
      };
    }

    const formattedTo = normalizedPhone.startsWith('whatsapp:')
      ? normalizedPhone
      : `whatsapp:${normalizedPhone}`;
    const cleanSender = normalizeWhatsAppPhone(senderRaw, settings.whatsappDefaultCountryCode);
    const formattedFrom = senderRaw.startsWith('whatsapp:')
      ? senderRaw
      : `whatsapp:${cleanSender}`;

    try {
      const body = new URLSearchParams({
        To: formattedTo,
        From: formattedFrom,
        Body: input.body,
      });

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${settings.smsAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${settings.smsAccountSid}:${settings.smsAuthToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body,
          cache: 'no-store',
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          provider: 'twilio',
          deliveryMode: 'twilio_whatsapp_api',
          normalizedPhone,
          waMeUrl,
          error: payload?.message || `Twilio WhatsApp returned status ${response.status}`,
        };
      }

      return {
        success: true,
        provider: 'twilio',
        deliveryMode: 'twilio_whatsapp_api',
        messageId: payload?.sid as string | undefined,
        normalizedPhone,
        waMeUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: 'twilio',
        deliveryMode: 'twilio_whatsapp_api',
        normalizedPhone,
        waMeUrl,
        error: err?.message || 'Twilio WhatsApp network error',
      };
    }
  }

  // 3. Direct WhatsApp Web / Business App Deep-Link (wa.me)
  return {
    success: true,
    provider: 'wa_me',
    deliveryMode: 'wa_me_deep_link',
    normalizedPhone,
    waMeUrl,
  };
}
