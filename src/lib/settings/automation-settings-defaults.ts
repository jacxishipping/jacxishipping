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
