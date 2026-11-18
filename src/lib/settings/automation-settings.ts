import fs from 'fs';
import path from 'path';

export interface AutomationSettingsValues {
  // Automated Lifecycle Invoicing
  autoInvoicingEnabled: boolean; // Master toggle
  autoInvoiceOnShipmentCreation: boolean; // Event: shipment intake
  autoInvoiceOnContainerCompletion: boolean; // Event: container RELEASED / CLOSED
  autoInvoiceCronBatchEnabled: boolean; // Daily cron job
  autoInvoicePaymentTermsDays: number; // e.g. 30 days
  autoInvoiceSendEmail: boolean; // Auto-send PDF email upon generation

  // Automated Milestone Notifications
  milestoneNotificationsEnabled: boolean;
  milestoneWhatsAppEnabled: boolean;
  milestoneEmailEnabled: boolean;

  // Automated Collections
  autoMarkOverdueInvoices: boolean; // Daily cron to transition PENDING -> OVERDUE
  autoPaymentRemindersEnabled: boolean; // Daily cron to send payment reminders

  // AI Damage & Insurance
  autoApplyAiDamageInspection: boolean; // Automatically apply AI surveyor findings
}

const CONFIG_FILE_PATH = path.join(process.cwd(), '.automation-config.json');

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettingsValues = {
  autoInvoicingEnabled: true,
  autoInvoiceOnShipmentCreation: true,
  autoInvoiceOnContainerCompletion: true,
  autoInvoiceCronBatchEnabled: true,
  autoInvoicePaymentTermsDays: 30,
  autoInvoiceSendEmail: true,

  milestoneNotificationsEnabled: true,
  milestoneWhatsAppEnabled: true,
  milestoneEmailEnabled: true,

  autoMarkOverdueInvoices: true,
  autoPaymentRemindersEnabled: true,

  autoApplyAiDamageInspection: true,
};

export function getStoredAutomationSettings(): AutomationSettingsValues {
  let overrides: Partial<AutomationSettingsValues> = {};

  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (typeof parsed === 'object' && parsed !== null) {
        overrides = parsed;
      }
    }
  } catch {
    // If reading fails, ignore and use defaults
  }

  return {
    ...DEFAULT_AUTOMATION_SETTINGS,
    ...overrides,
  };
}

export function saveStoredAutomationSettings(
  updates: Partial<AutomationSettingsValues>
): AutomationSettingsValues {
  const current = getStoredAutomationSettings();
  const next: AutomationSettingsValues = {
    ...current,
    ...updates,
  };

  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(next, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save automation settings to disk:', error);
  }

  return next;
}

