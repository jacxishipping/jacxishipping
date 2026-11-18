'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Clock,
  Mail,
  MessageSquare,
  ShieldCheck,
  Package,
  Car,
  DollarSign,
  HelpCircle,
  Loader2,
  Calendar,
} from 'lucide-react';
import { DashboardGrid, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, StatusBadge, toast } from '@/components/design-system';
import type { AutomationSettingsValues } from '@/lib/settings/automation-settings';
import { DEFAULT_AUTOMATION_SETTINGS } from '@/lib/settings/automation-settings';

export function AutomationSettingsTab() {
  const [settings, setSettings] = useState<AutomationSettingsValues>(DEFAULT_AUTOMATION_SETTINGS);
  const [initialSettings, setInitialSettings] = useState<AutomationSettingsValues>(DEFAULT_AUTOMATION_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/settings/automation', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load automation settings');
      const data = await res.json();
      if (data.settings) {
        setSettings(data.settings);
        setInitialSettings(data.settings);
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Could not load automation settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = (key: keyof AutomationSettingsValues) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch('/api/settings/automation', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save settings');

      setSettings(data.settings);
      setInitialSettings(data.settings);
      toast.success('Automation and invoicing settings saved successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save automation settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_AUTOMATION_SETTINGS);
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(initialSettings);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        <p className="text-sm text-[var(--text-secondary)]">Loading automation settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master Automation Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Automated Lifecycle Invoicing
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                    settings.autoInvoicingEnabled
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}
                >
                  {settings.autoInvoicingEnabled ? 'Active / Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed">
                Control whether the system automatically generates, consolidates, and dispatches customer invoices based on real-time operational events (shipment creation, container release/closing) or scheduled background crons.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoInvoicingEnabled}
                onChange={() => handleToggle('autoInvoicingEnabled')}
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[var(--accent-gold)]"></div>
            </label>
          </div>
        </div>
      </div>

      <DashboardGrid className="grid-cols-1 lg:grid-cols-2">
        {/* Event-Driven Milestone Invoicing */}
        <DashboardPanel
          title="Event-Driven Milestone Triggers"
          description="Configure which workflow milestones automatically trigger invoice generation"
        >
          <div className="space-y-4 pt-2">
            {/* Shipment Intake Trigger */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Shipment Creation Intake Auto-Invoicing
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Automatically generates a draft per-shipment invoice with shipping fare, purchase price, and insurance fees immediately upon intake.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!settings.autoInvoicingEnabled}
                checked={settings.autoInvoiceOnShipmentCreation && settings.autoInvoicingEnabled}
                onChange={() => handleToggle('autoInvoiceOnShipmentCreation')}
                className="mt-1 h-4 w-4 rounded accent-[var(--accent-gold)] cursor-pointer disabled:opacity-40"
              />
            </div>

            {/* Container Release/Close Trigger */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Container Completion Consolidation
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  When an ocean freight container transitions to <code>RELEASED</code> or <code>CLOSED</code>, automatically groups vehicles by customer, applies shared expense allocations, and issues consolidated invoices.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!settings.autoInvoicingEnabled}
                checked={settings.autoInvoiceOnContainerCompletion && settings.autoInvoicingEnabled}
                onChange={() => handleToggle('autoInvoiceOnContainerCompletion')}
                className="mt-1 h-4 w-4 rounded accent-[var(--accent-gold)] cursor-pointer disabled:opacity-40"
              />
            </div>

            {/* Daily Cron Trigger */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Scheduled Midnight Batch Invoicing Cron
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Enables the automated midnight background worker to sweep all completed containers and generate missing invoices.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!settings.autoInvoicingEnabled}
                checked={settings.autoInvoiceCronBatchEnabled && settings.autoInvoicingEnabled}
                onChange={() => handleToggle('autoInvoiceCronBatchEnabled')}
                className="mt-1 h-4 w-4 rounded accent-[var(--accent-gold)] cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>
        </DashboardPanel>

        {/* Invoice Terms & Delivery Settings */}
        <DashboardPanel
          title="Payment Terms & Customer Delivery"
          description="Default payment windows and automated notification policies"
        >
          <div className="space-y-4 pt-2">
            {/* Payment Terms Days */}
            <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)] block">
                Default Net Payment Terms
              </label>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Determines the payment due date assigned to auto-generated customer invoices.
              </p>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { label: 'Due On Receipt', days: 0 },
                  { label: 'Net 15', days: 15 },
                  { label: 'Net 30', days: 30 },
                  { label: 'Net 60', days: 60 },
                ].map((term) => (
                  <button
                    key={term.days}
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        autoInvoicePaymentTermsDays: term.days,
                      }))
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      settings.autoInvoicePaymentTermsDays === term.days
                        ? 'bg-[var(--accent-gold)] text-white border-[var(--accent-gold)] font-bold'
                        : 'bg-[var(--card)] text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {term.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email Auto-Send */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    Auto-Send Branded Invoice PDFs via Email
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Automatically email customers an invoice notification with a direct PDF download link as soon as an invoice is auto-generated.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!settings.autoInvoicingEnabled}
                checked={settings.autoInvoiceSendEmail && settings.autoInvoicingEnabled}
                onChange={() => handleToggle('autoInvoiceSendEmail')}
                className="mt-1 h-4 w-4 rounded accent-[var(--accent-gold)] cursor-pointer disabled:opacity-40"
              />
            </div>
          </div>
        </DashboardPanel>
      </DashboardGrid>

      {/* Secondary Operational Automations */}
      <DashboardPanel
        title="Auxiliary Workflow & AI Automations"
        description="Milestone alerts, automated overdue collections, and AI inspection findings"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* WhatsApp Milestone Notifications */}
          <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-green-400" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  WhatsApp Milestones
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Auto-trigger customer WhatsApp updates on transit milestones.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.milestoneWhatsAppEnabled}
              onChange={() => handleToggle('milestoneWhatsAppEnabled')}
              className="mt-1 h-4 w-4 rounded accent-[var(--accent-gold)] cursor-pointer"
            />
          </div>

          {/* Overdue Marker */}
          <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  Overdue Invoices
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Auto-transition invoices past due date to OVERDUE status.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoMarkOverdueInvoices}
              onChange={() => handleToggle('autoMarkOverdueInvoices')}
              className="mt-1 h-4 w-4 rounded accent-[var(--accent-gold)] cursor-pointer"
            />
          </div>

          {/* AI Damage Auto-Apply */}
          <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--background)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  AI Damage Auto-Filing
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Auto-apply certified AI photo damage reports into vehicle inspections.
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.autoApplyAiDamageInspection}
              onChange={() => handleToggle('autoApplyAiDamageInspection')}
              className="mt-1 h-4 w-4 rounded accent-[var(--accent-gold)] cursor-pointer"
            />
          </div>
        </div>
      </DashboardPanel>

      {/* Save Toolbar */}
      <div className="flex items-center justify-between border-t border-[var(--border)] pt-4">
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card)] transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>

        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs font-semibold text-amber-400 animate-pulse">
              Unsaved changes detected
            </span>
          )}
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
            className="px-5 py-2"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                <span>Save Automation Settings</span>
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AutomationSettingsTab;

