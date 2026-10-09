'use client';

import React, { useId, useMemo, useState } from 'react';
import {
  Printer,
  Download,
  FileText,
  RotateCcw,
  Sparkles,
  Copy,
  ChevronDown,
  ChevronUp,
  Languages,
  Check,
  Eye,
  Info,
} from 'lucide-react';
import {
  Modal,
  Button,
  FormField,
  toast,
} from '@/components/design-system';
import {
  AnnouncementDocumentOptions,
  generateAnnouncementPrintHtml,
  printAnnouncementDocument,
  downloadAnnouncementHtml,
  SAMPLE_PASHTO_ANNOUNCEMENT,
  SAMPLE_ENGLISH_ANNOUNCEMENT,
  isRTLText,
} from '@/lib/announcement-pdf-print';

interface AnnouncementGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: Partial<AnnouncementDocumentOptions>;
}

export function AnnouncementGeneratorModal({
  open,
  onClose,
  initialData,
}: AnnouncementGeneratorModalProps) {
  const dateInputId = useId();
  const titleInputId = useId();
  const bodyTextareaId = useId();
  const badgeInputId = useId();
  const salutationInputId = useId();
  const closingInputId = useId();
  const phoneInputId = useId();
  const emailInputId = useId();
  const websiteInputId = useId();

  // Form states
  const [date, setDate] = useState<string>(
    initialData?.date ||
      new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
  );
  const [badgeText, setBadgeText] = useState<string>(
    initialData?.badgeText || 'اړینه خبرتیا'
  );
  const [title, setTitle] = useState<string>(
    initialData?.title || 'د موټر ملکیت سند (Title) پروسس کولو د کړنلارو په اړه نوي تازه معلومات'
  );
  const [salutation, setSalutation] = useState<string>(
    initialData?.salutation || 'ګرانه پیرودونکیه،'
  );
  const [bodyText, setBodyText] = useState<string>(
    initialData?.bodyText || SAMPLE_PASHTO_ANNOUNCEMENT.bodyText
  );
  const [closingNote, setClosingNote] = useState<string>(
    initialData?.closingNote || 'ستاسو له دوامدارې همکارۍ او ملګرتیا څخه مننه'
  );
  const [phone, setPhone] = useState<string>(
    initialData?.phone || '+1 (925) 20089 27'
  );
  const [email, setEmail] = useState<string>(
    initialData?.email || 'info@jacxi.com'
  );
  const [website, setWebsite] = useState<string>(
    initialData?.website || 'www.jacxishipping.com'
  );
  const [direction, setDirection] = useState<'auto' | 'rtl' | 'ltr'>('auto');

  // UI accordion for secondary details
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [previewScale, setPreviewScale] = useState<number>(0.85);

  // Auto-detect direction
  const effectiveDirection = useMemo<'rtl' | 'ltr'>(() => {
    if (direction === 'rtl' || direction === 'ltr') return direction;
    return isRTLText(`${title} ${badgeText} ${bodyText}`) ? 'rtl' : 'ltr';
  }, [direction, title, badgeText, bodyText]);

  // Construct current options
  const currentOptions = useMemo<AnnouncementDocumentOptions>(() => {
    return {
      date: date.trim(),
      badgeText: badgeText.trim(),
      title: title.trim(),
      salutation: salutation.trim(),
      bodyText: bodyText.trim(),
      closingNote: closingNote.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      direction: effectiveDirection,
    };
  }, [date, badgeText, title, salutation, bodyText, closingNote, phone, email, website, effectiveDirection]);

  // Generate preview HTML
  const previewHtml = useMemo(() => {
    return generateAnnouncementPrintHtml(currentOptions);
  }, [currentOptions]);

  // Handler: Load Pashto preset
  const handleLoadPashtoPreset = () => {
    setDate(SAMPLE_PASHTO_ANNOUNCEMENT.date || '09/18/2026');
    setBadgeText(SAMPLE_PASHTO_ANNOUNCEMENT.badgeText || 'اړینه خبرتیا');
    setTitle(SAMPLE_PASHTO_ANNOUNCEMENT.title);
    setSalutation(SAMPLE_PASHTO_ANNOUNCEMENT.salutation || 'ګرانه پیرودونکیه،');
    setBodyText(SAMPLE_PASHTO_ANNOUNCEMENT.bodyText);
    setClosingNote(SAMPLE_PASHTO_ANNOUNCEMENT.closingNote || 'ستاسو له دوامدارې همکارۍ او ملګرتیا څخه مننه');
    setPhone(SAMPLE_PASHTO_ANNOUNCEMENT.phone || '+1 (925) 20089 27');
    setEmail(SAMPLE_PASHTO_ANNOUNCEMENT.email || 'info@jacxi.com');
    setWebsite(SAMPLE_PASHTO_ANNOUNCEMENT.website || 'www.jacxishipping.com');
    setDirection('rtl');
    toast.success('Loaded Pashto sample announcement (Jacxi Shipping.pdf)');
  };

  // Handler: Load English preset
  const handleLoadEnglishPreset = () => {
    setDate(SAMPLE_ENGLISH_ANNOUNCEMENT.date || '10/09/2026');
    setBadgeText(SAMPLE_ENGLISH_ANNOUNCEMENT.badgeText || 'IMPORTANT NOTICE');
    setTitle(SAMPLE_ENGLISH_ANNOUNCEMENT.title);
    setSalutation(SAMPLE_ENGLISH_ANNOUNCEMENT.salutation || 'Dear Valued Customer,');
    setBodyText(SAMPLE_ENGLISH_ANNOUNCEMENT.bodyText);
    setClosingNote(SAMPLE_ENGLISH_ANNOUNCEMENT.closingNote || 'Thank you for your continued cooperation and partnership.');
    setPhone(SAMPLE_ENGLISH_ANNOUNCEMENT.phone || '+1 (925) 20089 27');
    setEmail(SAMPLE_ENGLISH_ANNOUNCEMENT.email || 'info@jacxi.com');
    setWebsite(SAMPLE_ENGLISH_ANNOUNCEMENT.website || 'www.jacxishipping.com');
    setDirection('ltr');
    toast.success('Loaded English sample circular');
  };

  // Handler: Clear form to blank
  const handleClearBlank = () => {
    setDate(
      new Date().toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
      })
    );
    setBadgeText('اړینه خبرتیا');
    setTitle('');
    setSalutation('ګرانه پیرودونکیه،');
    setBodyText('');
    setClosingNote('ستاسو له دوامدارې همکارۍ او ملګرتیا څخه مننه');
    toast.info('Form cleared for new entry');
  };

  // Handler: Print
  const handlePrint = () => {
    if (!title.trim()) {
      toast.error('Please enter a title for the document');
      return;
    }
    if (!bodyText.trim()) {
      toast.error('Please enter body text for the document');
      return;
    }

    try {
      printAnnouncementDocument(currentOptions);
      toast.success('Opening print dialog — select "Save as PDF" to export.');
    } catch (err: any) {
      console.error('Print failed:', err);
      toast.error('Failed to trigger print dialog', {
        description: err?.message || 'Check browser permissions.',
      });
    }
  };

  // Handler: Download HTML
  const handleDownloadHtml = () => {
    try {
      const safeTitle = title.trim()
        ? title.trim().slice(0, 30).replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_')
        : 'Jacxi_Shipping_Announcement';
      downloadAnnouncementHtml(currentOptions, `${safeTitle}.html`);
      toast.success('Downloaded standalone document HTML');
    } catch (err: any) {
      toast.error('Failed to download document HTML');
    }
  };

  // Handler: Copy HTML
  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(previewHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Document HTML copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)] flex items-center justify-center border border-[rgba(var(--accent-gold-rgb),0.25)]">
            <FileText className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
              Official Announcement & Circular PDF Generator
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Input Date, Title, and Body text to produce an identical document matching Jacxi Shipping.pdf
            </p>
          </div>
        </div>
      }
      actions={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Info className="w-4 h-4 text-amber-500" />
            <span>Click <strong>Print / Export PDF</strong> and choose <em>"Save as PDF"</em> destination.</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleDownloadHtml}
            >
              Download HTML
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={handlePrint}
            >
              Print / Export PDF
            </Button>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[720px]">
        {/* Left Column: Form Inputs (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto max-h-[78vh] pr-2">
          {/* Quick Preset Toolbar */}
          <div className="bg-[var(--surface-subtle)] border border-[var(--border-subtle)] rounded-xl p-3">
            <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Templates
              </span>
              <button
                type="button"
                onClick={handleClearBlank}
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Clear
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleLoadPashtoPreset}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-right flex flex-col transition-all hover:border-[var(--accent-gold)]"
                dir="rtl"
              >
                <span className="font-bold text-[var(--text-primary)]">پښتو خبرتیا (DMV)</span>
                <span className="text-[10px] text-[var(--text-secondary)]">Jacxi Shipping.pdf Template</span>
              </button>
              <button
                type="button"
                onClick={handleLoadEnglishPreset}
                className="px-3 py-2 text-xs font-medium rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-left flex flex-col transition-all hover:border-[var(--accent-gold)]"
              >
                <span className="font-bold text-[var(--text-primary)]">English Circular</span>
                <span className="text-[10px] text-[var(--text-secondary)]">Operational Notice</span>
              </button>
            </div>
          </div>

          {/* Primary Input 1: Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor={dateInputId} className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Document Date <span className="text-red-500">*</span>
              </label>
              <input
                id={dateInputId}
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. 09/18/2026"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              />
            </div>
            <div>
              <label htmlFor={badgeInputId} className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                Header Badge (Red Text)
              </label>
              <input
                id={badgeInputId}
                type="text"
                value={badgeText}
                onChange={(e) => setBadgeText(e.target.value)}
                placeholder="e.g. اړینه خبرتیا or IMPORTANT NOTICE"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                dir={effectiveDirection}
              />
            </div>
          </div>

          {/* Primary Input 2: Title */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={titleInputId} className="block text-xs font-semibold text-[var(--text-primary)]">
                Document Title (Dark Banner Pill) <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--text-tertiary)]">Rendered in the dark rounded pill</span>
            </div>
            <textarea
              id={titleInputId}
              rows={2}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter document title..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] font-medium"
              dir={effectiveDirection}
            />
          </div>

          {/* Salutation Greeting */}
          <div>
            <label htmlFor={salutationInputId} className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Greeting / Salutation
            </label>
            <input
              id={salutationInputId}
              type="text"
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
              placeholder="e.g. ګرانه پیرودونکیه، or Dear Valued Customer,"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
              dir={effectiveDirection}
            />
          </div>

          {/* Primary Input 3: Body Text */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor={bodyTextareaId} className="block text-xs font-semibold text-[var(--text-primary)]">
                Body Text <span className="text-red-500">*</span>
              </label>
              <span className="text-[10px] text-[var(--text-tertiary)]">Separate paragraphs with blank lines. Use **bold** for highlights.</span>
            </div>
            <textarea
              id={bodyTextareaId}
              rows={12}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder="Type or paste the announcement text here..."
              className="w-full flex-1 px-3 py-2 text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] font-normal leading-relaxed resize-y"
              dir={effectiveDirection}
            />
          </div>

          {/* Closing Note */}
          <div>
            <label htmlFor={closingInputId} className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
              Closing Note (Bold bottom note)
            </label>
            <input
              id={closingInputId}
              type="text"
              value={closingNote}
              onChange={(e) => setClosingNote(e.target.value)}
              placeholder="e.g. ستاسو له دوامدارې همکارۍ او ملګرتیا څخه مننه"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] font-semibold"
              dir={effectiveDirection}
            />
          </div>

          {/* Advanced Details Toggle */}
          <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--surface-subtle)]">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)] flex items-center justify-between hover:bg-[var(--surface-hover)] transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-amber-500" />
                Direction & Contact Information
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="p-3 border-t border-[var(--border-subtle)] flex flex-col gap-3 bg-[var(--surface)]">
                <div>
                  <span className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Text Direction
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('auto')}
                      className={`px-2 py-1 text-xs rounded border ${
                        direction === 'auto'
                          ? 'bg-[var(--accent-gold)] text-slate-900 font-bold border-[var(--accent-gold)]'
                          : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      Auto-Detect
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('rtl')}
                      className={`px-2 py-1 text-xs rounded border ${
                        direction === 'rtl'
                          ? 'bg-[var(--accent-gold)] text-slate-900 font-bold border-[var(--accent-gold)]'
                          : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      RTL (پښتو / دری)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('ltr')}
                      className={`px-2 py-1 text-xs rounded border ${
                        direction === 'ltr'
                          ? 'bg-[var(--accent-gold)] text-slate-900 font-bold border-[var(--accent-gold)]'
                          : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'
                      }`}
                    >
                      LTR (English)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label htmlFor={phoneInputId} className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Phone Number
                    </label>
                    <input
                      id={phoneInputId}
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label htmlFor={emailInputId} className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Email Address
                    </label>
                    <input
                      id={emailInputId}
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)]"
                    />
                  </div>
                  <div>
                    <label htmlFor={websiteInputId} className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
                      Website URL
                    </label>
                    <input
                      id={websiteInputId}
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--text-primary)]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Real-time Live Document Preview (7 cols on lg) */}
        <div className="lg:col-span-7 flex flex-col bg-slate-900/90 rounded-2xl border border-slate-800 p-3 shadow-inner">
          {/* Preview Toolbar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-slate-100">Live Letterhead Preview</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 border border-slate-700">
                A4 Portrait
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                <span className="text-[10px] text-slate-400">Zoom:</span>
                <button
                  type="button"
                  onClick={() => setPreviewScale((s) => Math.max(0.5, s - 0.1))}
                  className="px-1.5 text-slate-300 hover:text-white font-bold"
                >
                  -
                </button>
                <span className="text-[11px] font-mono text-amber-300 w-10 text-center">
                  {Math.round(previewScale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewScale((s) => Math.min(1.2, s + 0.1))}
                  className="px-1.5 text-slate-300 hover:text-white font-bold"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleCopyHtml}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-1"
                title="Copy Standalone HTML"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Preview Canvas Area */}
          <div className="flex-1 overflow-auto flex justify-center items-start p-4 bg-slate-950/60 rounded-xl mt-3 min-h-[640px]">
            <div
              style={{
                transform: `scale(${previewScale})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out',
                width: '210mm',
                minHeight: '297mm',
              }}
              className="shadow-2xl rounded-sm overflow-hidden bg-white"
            >
              <iframe
                title="Announcement Document Live Preview"
                srcDoc={previewHtml}
                className="w-full border-0 pointer-events-auto"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  height: '1160px',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
