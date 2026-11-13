'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { 
  UploadCloud, 
  RotateCcw, 
  Check, 
  Sparkles, 
  Globe, 
  FileText, 
  Building2, 
  Layout, 
  ShieldCheck, 
  AlertCircle,
  Eye,
  Link as LinkIcon,
  Image as ImageIcon
} from 'lucide-react';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, toast } from '@/components/design-system';
import { useSiteBranding } from '@/hooks/useSiteBranding';

interface BrandingSettingsCardProps {
  canEdit?: boolean;
}

export function BrandingSettingsCard({ canEdit = true }: BrandingSettingsCardProps) {
  const { branding, updateBranding, resetBranding, uploadLogo, isLoading } = useSiteBranding();

  const [form, setForm] = useState({
    companyName: branding.companyName || 'JACXI SHIPPING',
    companyTagline: branding.companyTagline || 'Vehicle Logistics',
    logoUrl: branding.logoUrl || '/main-logo.png',
  });

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setForm({
      companyName: branding.companyName || 'JACXI SHIPPING',
      companyTagline: branding.companyTagline || 'Vehicle Logistics',
      logoUrl: branding.logoUrl || '/main-logo.png',
    });
  }, [branding.companyName, branding.companyTagline, branding.logoUrl]);

  useEffect(() => {
    return () => {
      if (localPreviewUrl && localPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  }, [localPreviewUrl]);

  const activeDisplayLogo = localPreviewUrl || form.logoUrl || '/main-logo.png';
  const isCustomLogo = form.logoUrl !== '/main-logo.png' || Boolean(pendingFile);

  const handleFileSelect = (file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg|webp|svg\+xml)$/)) {
      toast.error('Please upload a valid image file (PNG, JPG, WebP, or SVG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo file size must be less than 5MB');
      return;
    }

    setPendingFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    toast.info('Logo selected. Click "Save & Apply Changes" to update across the application.');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEdit) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEdit) return;

    try {
      setSaving(true);
      let finalLogoUrl = form.logoUrl.trim();

      // If a local file is pending, upload it first
      if (pendingFile) {
        setUploading(true);
        finalLogoUrl = await uploadLogo(pendingFile);
        setUploading(false);
      }

      await updateBranding({
        companyName: form.companyName.trim() || 'JACXI SHIPPING',
        companyTagline: form.companyTagline.trim(),
        logoUrl: finalLogoUrl,
        headerLogoUrl: finalLogoUrl,
      });

      setPendingFile(null);
      setLocalPreviewUrl(null);
      toast.success('Company logo & branding successfully updated all across dashboard, sign in, invoices, and receipts!');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update branding settings');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleReset = async () => {
    if (!canEdit) return;
    if (!window.confirm('Reset company logo and branding back to default JACXI assets?')) {
      return;
    }

    try {
      setSaving(true);
      await resetBranding();
      setPendingFile(null);
      setLocalPreviewUrl(null);
      toast.success('Branding reset to default Jacxi logo');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reset branding');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardPanel
      title="Company Branding & Global Logo"
      description="Update your brand logo, name, and tagline. Changes are instantly reflected across the dashboard navigation, sign in portal, invoices, receipts, and system communications."
    >
      <div className="space-y-6">
        {/* Real-time Multi-Surface Preview Studio */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Real-Time Cross-System Previews
            </label>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live System Synchronization
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Preview 1: Dashboard Header & Navigation (Dark Mockup) */}
            <div className="rounded-xl border border-[var(--border)] bg-[#0d1624] p-4 text-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-slate-400 font-medium">
                  <span className="flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    Dashboard Header & Sidebar View
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/10 text-slate-300">
                    Header Dark Surface
                  </span>
                </div>

                <div className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="max-h-12 max-w-[170px] flex items-center">
                      <img
                        src={activeDisplayLogo}
                        alt="Dashboard Header Logo Preview"
                        className="max-h-10 max-w-[150px] w-auto h-auto object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="hidden sm:inline-block px-2 py-1 rounded-md bg-white/5 border border-white/10 text-slate-300 font-mono text-[11px]">
                      /dashboard
                    </span>
                    <div className="w-7 h-7 rounded-full bg-[var(--accent-gold)]/20 border border-[var(--accent-gold)] flex items-center justify-center text-[var(--accent-gold)] text-xs font-bold">
                      {(form.companyName || 'J').charAt(0)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Top bar & collapsed drawer</span>
                <span className="text-[var(--accent-gold)] font-medium">Active Display</span>
              </div>
            </div>

            {/* Preview 2: Sign-In Page & Invoice Document (Light Mockup) */}
            <div className="rounded-xl border border-[var(--border)] bg-white p-4 text-slate-900 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                    Invoices, Receipts & Sign In Portal
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-semibold">
                    Document Surface
                  </span>
                </div>

                <div className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="max-h-12 max-w-[160px] flex items-center">
                      <img
                        src={activeDisplayLogo}
                        alt="Invoice Document Logo Preview"
                        className="max-h-11 max-w-[140px] w-auto h-auto object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 tracking-tight">
                        {form.companyName || 'JACXI SHIPPING'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {form.companyTagline || 'Vehicle Logistics'}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                      INVOICE / RECEIPT
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono">
                      #INV-2026-0891
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>PDF exports, receipts & auth screen</span>
                <span className="text-emerald-600 font-semibold">Verified Fit</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upload & Form Controls */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* File Drag and Drop Zone */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Upload New Logo File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              disabled={!canEdit || saving || uploading}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (canEdit) setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => {
                if (canEdit && !saving && !uploading) {
                  fileInputRef.current?.click();
                }
              }}
              className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
                dragOver
                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 scale-[1.005]'
                  : 'border-[var(--border)] bg-[var(--panel)] hover:border-[var(--accent-gold)]/60 hover:bg-[var(--background)]'
              } ${!canEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex flex-col items-center justify-center gap-2.5">
                <div className="p-3 rounded-xl bg-[rgba(var(--accent-gold-rgb),0.1)] text-[var(--accent-gold)]">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {pendingFile ? `Selected: ${pendingFile.name}` : 'Click to select or drag & drop brand logo'}
                  </span>
                  <span className="block text-xs text-[var(--text-secondary)] mt-1">
                    Supports high-resolution PNG (transparent recommended), JPG, WebP, or SVG (Up to 5MB)
                  </span>
                </div>

                {pendingFile && (
                  <div className="mt-1 flex items-center gap-2 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <Check className="w-3.5 h-3.5" />
                    New logo ready to upload and save
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields: Logo URL, Company Name, Tagline */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Company Display Name
              </label>
              <input value={form.companyName} onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))} placeholder="e.g. JACXI SHIPPING" disabled={!canEdit || saving} className="ds-form-field-control w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] px-2.5 py-1.5 text-[0.8125rem] border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]" />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Tagline / Caption
              </label>
              <input value={form.companyTagline} onChange={(e) => setForm((prev) => ({ ...prev, companyTagline: e.target.value }))} placeholder="e.g. Vehicle Logistics" disabled={!canEdit || saving} className="ds-form-field-control w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] px-2.5 py-1.5 text-[0.8125rem] border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]" />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                Logo Public Path / URL
              </label>
              <input value={form.logoUrl} onChange={(e) => {
                  setPendingFile(null);
                  setLocalPreviewUrl(null);
                  setForm((prev) => ({ ...prev, logoUrl: e.target.value }));
                }} placeholder="/main-logo.png or https://..." disabled={!canEdit || saving} className="ds-form-field-control w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] px-2.5 py-1.5 text-[0.8125rem] border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]" />
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
            <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Saving automatically distributes this logo across all dashboard views, sign in pages, and PDFs.</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {isCustomLogo && canEdit && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={saving || uploading}
                  className="w-full sm:w-auto"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" />
                  Reset to Jacxi Default
                </Button>
              )}

              {canEdit && (
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving || uploading}
                  className="w-full sm:w-auto"
                >
                  {saving || uploading ? (
                    <>
                      <span role="status" aria-label="Loading" className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)]" style={{width: 16, height: 16, borderTopColor: 'currentColor'}} />
                      Saving & Propagating...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1.5" />
                      Save & Apply Logo
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardPanel>
  );
}
