/**
 * Automated Milestone Alerts Engine
 * Sends automated multi-channel notifications (WhatsApp Business Cloud API / Twilio, Telegram, Twilio SMS, Webhooks)
 * when shipments and containers transition through key shipping milestones.
 */

import { prisma } from '@/lib/db';
import {
  getStoredCommunicationSettings,
  sendConfiguredSms,
  sendConfiguredWhatsApp,
  type CommunicationProviderSettingsValues,
} from '@/lib/communication-settings';

export type MilestoneType =
  | 'VEHICLE_PICKED_UP'
  | 'CONTAINER_LOADED'
  | 'VESSEL_DEPARTED'
  | 'ARRIVED_AT_PORT'
  | 'CUSTOMS_CLEARED';

export interface MilestoneEventData {
  milestone: MilestoneType;
  milestoneLabel: string;
  shipmentId?: string;
  containerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  vehicleInfo?: string;
  vin?: string;
  lotNumber?: string;
  containerNumber?: string;
  vesselName?: string;
  originPort?: string;
  destinationPort?: string;
  etaDate?: string;
  trackingUrl?: string;
}

export interface MilestoneTemplate {
  milestone: MilestoneType;
  label: string;
  defaultTemplate: string;
  description: string;
}

export const DEFAULT_MILESTONE_TEMPLATES: Record<MilestoneType, MilestoneTemplate> = {
  VEHICLE_PICKED_UP: {
    milestone: 'VEHICLE_PICKED_UP',
    label: 'Vehicle Picked Up',
    description: 'Triggered when carrier picks up vehicle from auction (Copart/IAAI/Manheim) or dealer.',
    defaultTemplate:
      '🚗 *JACXI Shipping*: Hello {customerName}, your *{vehicle}* (VIN: `{vin}`, Lot #{lotNumber}) has been safely picked up from {originPort} and is en route to our warehouse.\n\n🌐 Track live: {trackingUrl}',
  },
  CONTAINER_LOADED: {
    milestone: 'CONTAINER_LOADED',
    label: 'Container Loaded',
    description: 'Triggered when vehicle is loaded and secured into shipping container.',
    defaultTemplate:
      '📦 *JACXI Shipping*: Your *{vehicle}* (VIN: `{vin}`) has been loaded into Container *{containerNumber}* and secured for ocean export.\n\n🌐 Track status: {trackingUrl}',
  },
  VESSEL_DEPARTED: {
    milestone: 'VESSEL_DEPARTED',
    label: 'Vessel Departed (Ocean Transit)',
    description: 'Triggered when cargo vessel leaves port of loading.',
    defaultTemplate:
      '🚢 *JACXI Shipping*: Vessel *{vesselName}* carrying container *{containerNumber}* has departed {originPort}. Estimated arrival at {destinationPort}: *{etaDate}*.\n\n🌐 Track live AIS position: {trackingUrl}',
  },
  ARRIVED_AT_PORT: {
    milestone: 'ARRIVED_AT_PORT',
    label: 'Arrived at Destination Port',
    description: 'Triggered when vessel docks at destination container terminal.',
    defaultTemplate:
      '⚓ *JACXI Shipping*: Container *{containerNumber}* carrying your *{vehicle}* has arrived safely at {destinationPort}. Port offloading underway.\n\n🌐 View details: {trackingUrl}',
  },
  CUSTOMS_CLEARED: {
    milestone: 'CUSTOMS_CLEARED',
    label: 'Customs Cleared & Ready for Release',
    description: 'Triggered when container and vehicles clear customs inspection.',
    defaultTemplate:
      '✅ *JACXI Shipping*: Customs clearance complete for your *{vehicle}* (VIN: `{vin}`) at {destinationPort}. Your shipment is ready for handover / gatepass pickup!\n\n🌐 View documents: {trackingUrl}',
  },
};

export interface MilestoneAlertConfig {
  enabled: boolean;
  enableWhatsApp: boolean;
  enableTelegram: boolean;
  enableSms: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  whatsAppPhoneNumber?: string;
  webhookUrl?: string;
  customTemplates: Partial<Record<MilestoneType, string>>;
}

const MILESTONE_SETTINGS_SCOPE = 'milestone_alerts';

/**
 * Get configured milestone templates and settings.
 */
export async function getMilestoneAlertConfig(): Promise<MilestoneAlertConfig> {
  const fallbackConfig: MilestoneAlertConfig = {
    enabled: true,
    enableWhatsApp: true,
    enableTelegram: false,
    enableSms: true,
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',
    whatsAppPhoneNumber: process.env.WHATSAPP_PHONE_NUMBER || '+93704117413',
    webhookUrl: process.env.MILESTONE_WEBHOOK_URL || '',
    customTemplates: {},
  };

  try {
    const record = await prisma.communicationProviderSettings.findUnique({
      where: { scope: MILESTONE_SETTINGS_SCOPE },
    });

    if (record?.emailApiKey) {
      const parsed = JSON.parse(record.emailApiKey);
      if (parsed && typeof parsed === 'object') {
        return { ...fallbackConfig, ...parsed };
      }
    }
  } catch {
    // ignore db error fallback
  }

  return fallbackConfig;
}

/**
 * Save updated milestone templates and settings.
 */
export async function saveMilestoneAlertConfig(newConfig: Partial<MilestoneAlertConfig>): Promise<MilestoneAlertConfig> {
  const current = await getMilestoneAlertConfig();
  const merged = { ...current, ...newConfig };

  try {
    const serialized = JSON.stringify(merged);
    await prisma.communicationProviderSettings.upsert({
      where: { scope: MILESTONE_SETTINGS_SCOPE },
      create: {
        scope: MILESTONE_SETTINGS_SCOPE,
        emailEnabled: merged.enabled,
        emailProvider: 'milestone_alerts',
        emailApiKey: serialized,
        smsEnabled: merged.enableWhatsApp,
        smsProvider: 'whatsapp',
      },
      update: {
        emailEnabled: merged.enabled,
        emailApiKey: serialized,
        smsEnabled: merged.enableWhatsApp,
      },
    });
  } catch (error) {
    console.error('Failed to save milestone alert config:', error);
  }

  return merged;
}

/**
 * Format milestone template string with token replacements.
 */
export function formatMilestoneMessage(template: string, data: MilestoneEventData): string {
  return template
    .replace(/\{customerName\}/g, data.customerName || 'Valued Client')
    .replace(/\{vehicle\}/g, data.vehicleInfo || 'Vehicle')
    .replace(/\{vin\}/g, data.vin || 'N/A')
    .replace(/\{lotNumber\}/g, data.lotNumber || 'N/A')
    .replace(/\{containerNumber\}/g, data.containerNumber || 'N/A')
    .replace(/\{vesselName\}/g, data.vesselName || 'Ocean Carrier')
    .replace(/\{originPort\}/g, data.originPort || 'Port of Origin')
    .replace(/\{destinationPort\}/g, data.destinationPort || 'Destination Port')
    .replace(/\{etaDate\}/g, data.etaDate || 'Pending Schedule')
    .replace(/\{trackingUrl\}/g, data.trackingUrl || 'https://www.jacxishipping.com/tracking');
}

/**
 * Send Telegram Message via Bot API
 */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, error: data.description || 'Telegram API error' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Telegram network failed' };
  }
}

/**
 * Send WhatsApp Message via configured WhatsApp Business Provider (Meta Cloud API / Twilio / wa.me)
 */
export async function sendWhatsAppMessage(
  _commSettings: CommunicationProviderSettingsValues,
  recipientPhone: string,
  message: string,
): Promise<{ success: boolean; error?: string; waMeUrl?: string; deliveryMode?: string }> {
  const res = await sendConfiguredWhatsApp({
    to: recipientPhone,
    body: message,
  });
  return {
    success: res.success,
    error: res.error,
    waMeUrl: res.waMeUrl,
    deliveryMode: res.deliveryMode,
  };
}

/**
 * Dispatch milestone alert to all configured channels (SMS, WhatsApp, Telegram, Webhook).
 */
export async function dispatchMilestoneAlert(
  data: MilestoneEventData,
): Promise<{
  success: boolean;
  dispatches: { channel: string; success: boolean; error?: string; waMeUrl?: string; deliveryMode?: string }[];
}> {
  const config = await getMilestoneAlertConfig();
  if (!config.enabled) {
    return {
      success: false,
      dispatches: [{ channel: 'engine', success: false, error: 'Milestone alerts are disabled.' }],
    };
  }

  const rawTemplate =
    config.customTemplates[data.milestone] || DEFAULT_MILESTONE_TEMPLATES[data.milestone]?.defaultTemplate;
  if (!rawTemplate) {
    return {
      success: false,
      dispatches: [{ channel: 'template', success: false, error: `No template for milestone ${data.milestone}` }],
    };
  }

  const message = formatMilestoneMessage(rawTemplate, data);
  const commSettings = await getStoredCommunicationSettings();
  const dispatches: { channel: string; success: boolean; error?: string; waMeUrl?: string; deliveryMode?: string }[] = [];

  // 1. WhatsApp Business Dispatch
  if (config.enableWhatsApp && data.customerPhone && commSettings.whatsappEnabled) {
    const waRes = await sendWhatsAppMessage(commSettings, data.customerPhone, message);
    dispatches.push({
      channel: 'whatsapp',
      success: waRes.success,
      error: waRes.error,
      waMeUrl: waRes.waMeUrl,
      deliveryMode: waRes.deliveryMode,
    });
  }

  // 2. Twilio SMS Dispatch
  if (config.enableSms && data.customerPhone && commSettings.smsEnabled) {
    const smsRes = await sendConfiguredSms({
      to: data.customerPhone,
      body: message,
    });
    dispatches.push({ channel: 'sms', success: smsRes.success, error: smsRes.error });
  }

  // 3. Telegram Bot Dispatch
  if (config.enableTelegram && config.telegramBotToken && config.telegramChatId) {
    const tgRes = await sendTelegramMessage(config.telegramBotToken, config.telegramChatId, message);
    dispatches.push({ channel: 'telegram', success: tgRes.success, error: tgRes.error });
  }

  // 4. Custom Webhook Dispatch
  if (config.webhookUrl) {
    try {
      const webhookRes = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'shipment.milestone',
          milestone: data.milestone,
          message,
          data,
          timestamp: new Date().toISOString(),
        }),
      });
      dispatches.push({
        channel: 'webhook',
        success: webhookRes.ok,
        error: webhookRes.ok ? undefined : `Status ${webhookRes.status}`,
      });
    } catch (err: any) {
      dispatches.push({ channel: 'webhook', success: false, error: err.message });
    }
  }

  const overallSuccess = dispatches.some((d) => d.success);
  return { success: overallSuccess, dispatches };
}
