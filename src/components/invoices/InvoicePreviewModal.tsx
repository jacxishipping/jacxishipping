'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ExternalLink, 
  FileText, 
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Maximize2
} from 'lucide-react';
import Modal from '@/components/design-system/Modal';

export interface InvoicePreviewModalProps {
  invoiceId: string | null;
  invoiceNumber?: string | null;
  customerName?: string | null;
  totalAmount?: number | null;
  status?: string | null;
  open: boolean;
  onClose: () => void;
}

function formatCurrency(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export default function InvoicePreviewModal({
  invoiceId,
  invoiceNumber,
  customerName,
  totalAmount,
  status,
  open,
  onClose,
}: InvoicePreviewModalProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (open) {
      setIframeLoaded(false);
      setLoadError(false);
    }
  }, [open, invoiceId]);

  if (!open || !invoiceId) return null;

  const pdfUrl = `/api/invoices/${invoiceId}/pdf`;
  const downloadUrl = `/api/invoices/${invoiceId}/pdf?download=1`;

  const handlePrint = () => {
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch {
        // Fallback
      }
    }
    const win = window.open(pdfUrl, '_blank');
    if (win) {
      win.addEventListener('load', () => win.print());
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `Invoice-${invoiceNumber || invoiceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const statusUpper = (status || '').toUpperCase();
  const isPaid = statusUpper === 'PAID';
  const isOverdue = statusUpper === 'OVERDUE';
  const isDraft = statusUpper === 'DRAFT';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      showCloseButton={false}
      className="p-0 overflow-hidden"
      contentSx={{
        p: 0,
        m: 0,
        height: '92vh',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'var(--panel)',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}
    >
      {/* ── TOP PREVIEW HEADER & TOOLBAR ── */}
      <div 
        className="flex items-center justify-between px-4 py-3 border-b shrink-0 flex-wrap gap-2"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Left: Invoice Identity & Badges */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[rgba(var(--accent-gold-rgb),0.12)] border border-[rgba(var(--accent-gold-rgb),0.3)] flex items-center justify-center text-[var(--accent-gold)] shrink-0">
            <Receipt className="w-5 h-5 text-[var(--accent-gold)]" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold tracking-tight text-[var(--text-primary)] font-mono">
                {invoiceNumber || `INV-${invoiceId.slice(-6).toUpperCase()}`}
              </h3>
              {status && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  isPaid 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                    : isOverdue 
                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' 
                    : isDraft 
                    ? 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20' 
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                }`}>
                  {isPaid ? <CheckCircle2 className="w-3 h-3" /> : isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                  <span>{status}</span>
                </span>
              )}
            </div>

            <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-2 flex-wrap">
              {customerName && <span>Billed to: <strong className="text-[var(--text-primary)]">{customerName}</strong></span>}
              {totalAmount !== undefined && totalAmount !== null && (
                <>
                  <span>•</span>
                  <span className="font-semibold text-[var(--accent-gold)]">
                    Total: <strong className="font-mono text-sm">{formatCurrency(totalAmount)}</strong>
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {/* Print button */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Print Official Invoice"
          >
            <Printer className="w-4 h-4 text-[var(--accent-gold)]" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Download PDF Invoice"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download PDF</span>
          </button>

          {/* Open full invoice details page */}
          <a
            href={`/dashboard/invoices/${invoiceId}`}
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Open Full Invoice View"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden md:inline">Full Details</span>
          </a>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 text-[var(--text-secondary)] transition-colors ml-1"
            title="Close Preview (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* ── MAIN INVOICE PDF EMBED CANVAS ── */}
      <div 
        className="flex-1 overflow-hidden p-2 sm:p-4 relative flex flex-col"
        style={{
          backgroundColor: 'var(--surface-subtle)',
        }}
      >
        <div 
          className="w-full h-full rounded-xl overflow-hidden border shadow-sm bg-white relative flex flex-col"
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Loading state skeleton */}
          {!iframeLoaded && !loadError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--surface)] text-[var(--text-secondary)] gap-3 z-10">
              <div className="w-9 h-9 rounded-full border-2 border-[var(--accent-gold)] border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--text-primary)]">Rendering Official Jacxi Invoice</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">Generating high-resolution letterhead document...</p>
              </div>
            </div>
          )}

          {/* Fallback if error */}
          {loadError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4 bg-[var(--panel)]">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <div>
                <h4 className="text-base font-bold text-[var(--text-primary)]">Invoice Preview Unavailable</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                  We could not render the live inline PDF preview. You can still download the invoice directly or open it in a new window.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent-gold)] text-white shadow hover:opacity-95"
                >
                  Download PDF
                </button>
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                >
                  Open in New Window
                </a>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={`${pdfUrl}#toolbar=1&navpanes=0`}
              title={`Invoice ${invoiceNumber || invoiceId}`}
              className="w-full h-full border-0 flex-1"
              onLoad={() => setIframeLoaded(true)}
              onError={() => setLoadError(true)}
            />
          )}
        </div>
      </div>
    </Modal>
  );
}
