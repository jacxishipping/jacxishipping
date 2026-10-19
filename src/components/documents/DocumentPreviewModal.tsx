'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Download, 
  Printer, 
  ExternalLink, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  FileText, 
  Image as ImageIcon, 
  ChevronLeft, 
  ChevronRight,
  Info,
  Calendar,
  User,
  HardDrive,
  FileCheck
} from 'lucide-react';
import Modal from '@/components/design-system/Modal';

export interface DocumentPreviewItem {
  id: string;
  name: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  category: string;
  uploadedBy?: string;
  createdAt?: string | Date;
  description?: string | null;
  extractedTextPreview?: string | null;
}

export interface DocumentPreviewModalProps {
  document: DocumentPreviewItem | null;
  open: boolean;
  onClose: () => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateValue?: string | Date): string {
  if (!dateValue) return 'N/A';
  const d = new Date(dateValue);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DocumentPreviewModal({
  document,
  open,
  onClose,
  onNavigateNext,
  onNavigatePrev,
  hasNext = false,
  hasPrev = false,
}: DocumentPreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showMetadata, setShowMetadata] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Reset zoom & rotation whenever active document changes
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setIframeLoaded(false);
  }, [document?.id]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && hasNext && onNavigateNext) {
        onNavigateNext();
      } else if (e.key === 'ArrowLeft' && hasPrev && onNavigatePrev) {
        onNavigatePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, hasNext, hasPrev, onNavigateNext, onNavigatePrev]);

  if (!document) return null;

  const mime = (document.fileType || '').toLowerCase();
  const lowerUrl = (document.fileUrl || '').toLowerCase();
  const isPdf = mime.includes('pdf') || lowerUrl.endsWith('.pdf');
  const isImage = mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(lowerUrl);

  const handlePrint = () => {
    if (isPdf && iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch {
        // Fallback to window open print
      }
    }
    const printWindow = window.open(document.fileUrl, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleDownload = () => {
    const link = window.document.createElement('a');
    link.href = document.fileUrl;
    link.download = document.name;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

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
        {/* Left: Document Info & Badges */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[rgba(var(--accent-gold-rgb),0.12)] border border-[rgba(var(--accent-gold-rgb),0.3)] flex items-center justify-center text-[var(--accent-gold)] shrink-0">
            {isPdf ? (
              <FileText className="w-5 h-5 text-red-500" />
            ) : isImage ? (
              <ImageIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            ) : (
              <FileCheck className="w-5 h-5 text-[var(--accent-gold)]" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate text-[var(--text-primary)] max-w-xs sm:max-w-md lg:max-w-lg" title={document.name}>
              {document.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5 flex-wrap">
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--surface-subtle)] border border-[var(--border)] text-[var(--text-secondary)]">
                {document.category.replace(/_/g, ' ')}
              </span>
              <span>•</span>
              <span className="font-mono text-[11px]">{formatFileSize(document.fileSize)}</span>
              {document.uploadedBy && (
                <>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">by {document.uploadedBy}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Center / Right: Interactive Toolbar */}
        <div className="flex items-center gap-1.5 ml-auto flex-wrap">
          {/* Navigation previous / next */}
          {(hasPrev || hasNext) && (
            <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5 mr-2">
              <button
                type="button"
                onClick={onNavigatePrev}
                disabled={!hasPrev}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:text-[var(--text-secondary)] transition-colors"
                title="Previous Document (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onNavigateNext}
                disabled={!hasNext}
                className="p-1 rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 disabled:hover:text-[var(--text-secondary)] transition-colors"
                title="Next Document (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Zoom controls for image / view */}
          {isImage && (
            <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-0.5 mr-1">
              <button
                type="button"
                onClick={() => setScale(s => Math.max(0.4, s - 0.2))}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-1 text-[11px] font-mono text-[var(--text-secondary)] font-bold min-w-[42px] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setScale(s => Math.min(3, s + 0.2))}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation(r => (r + 90) % 360)}
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border-l border-[var(--border)]"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Details toggle */}
          <button
            type="button"
            onClick={() => setShowMetadata(m => !m)}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showMetadata
                ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)]'
                : 'border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            title="Toggle Document Details"
          >
            <Info className="w-4 h-4" />
            <span className="hidden md:inline">Details</span>
          </button>

          {/* Print button */}
          <button
            type="button"
            onClick={handlePrint}
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Print Document"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden md:inline">Print</span>
          </button>

          {/* Download button */}
          <button
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Download Document"
          >
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">Download</span>
          </button>

          {/* Open in new tab */}
          <a
            href={document.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Open in New Tab"
          >
            <ExternalLink className="w-4 h-4" />
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

      {/* ── MAIN CONTENT PREVIEW CANVAS & DETAILS DRAWER ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Document Viewing Area */}
        <div 
          className="flex-1 overflow-auto flex items-center justify-center p-2 sm:p-4 transition-all relative"
          style={{
            backgroundColor: 'var(--surface-subtle)',
          }}
        >
          {isPdf ? (
            <div className="w-full h-full rounded-xl overflow-hidden border shadow-sm bg-white relative flex flex-col" style={{ borderColor: 'var(--border)' }}>
              {!iframeLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[var(--surface)] text-[var(--text-secondary)] gap-3 z-10">
                  <div className="w-8 h-8 rounded-full border-2 border-[var(--accent-gold)] border-t-transparent animate-spin" />
                  <p className="text-xs font-medium">Loading document PDF preview...</p>
                </div>
              )}
              <iframe
                ref={iframeRef}
                src={`${document.fileUrl}#toolbar=1&navpanes=0`}
                title={document.name}
                className="w-full h-full border-0 flex-1"
                onLoad={() => setIframeLoaded(true)}
              />
            </div>
          ) : isImage ? (
            <div className="flex items-center justify-center w-full h-full overflow-auto p-4">
              <img
                src={document.fileUrl}
                alt={document.name}
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                  maxWidth: scale <= 1 ? '100%' : 'none',
                  maxHeight: scale <= 1 ? '100%' : 'none',
                  objectFit: 'contain',
                }}
                className="rounded-lg shadow-xl border border-[var(--border)] select-none"
              />
            </div>
          ) : (
            /* Generic File Preview Card */
            <div 
              className="max-w-md w-full p-8 rounded-2xl border shadow-lg text-center flex flex-col items-center gap-4"
              style={{
                backgroundColor: 'var(--panel)',
                borderColor: 'var(--border)',
              }}
            >
              <div className="w-16 h-16 rounded-2xl bg-[rgba(var(--accent-gold-rgb),0.12)] border border-[rgba(var(--accent-gold-rgb),0.3)] flex items-center justify-center text-[var(--accent-gold)]">
                <FileText className="w-8 h-8 text-[var(--accent-gold)]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-[var(--text-primary)] break-all">{document.name}</h4>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {document.fileType || 'Binary file'} • {formatFileSize(document.fileSize)}
                </p>
              </div>

              <div className="flex items-center gap-3 mt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--accent-gold)] text-white shadow-md hover:opacity-95 transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download File</span>
                </button>
                <a
                  href={document.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)] transition-colors flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open in Browser</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Optional Collapsible Metadata Panel */}
        {showMetadata && (
          <div 
            className="w-80 border-l p-5 overflow-y-auto shrink-0 flex flex-col gap-4 text-xs transition-all shadow-lg animate-in slide-in-from-right-4 duration-200"
            style={{
              backgroundColor: 'var(--panel)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h4 className="font-bold text-sm text-[var(--text-primary)] flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[var(--accent-gold)]" />
                <span>Document Details</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowMetadata(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Properties List */}
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">Filename</span>
                <p className="font-medium text-[var(--text-primary)] break-all mt-0.5">{document.name}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">Category</span>
                <div className="mt-1">
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)] border border-[rgba(var(--accent-gold-rgb),0.25)]">
                    {document.category.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">File Size</span>
                <p className="font-mono text-[var(--text-primary)] mt-0.5">{formatFileSize(document.fileSize)}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">MIME Type</span>
                <p className="font-mono text-[var(--text-secondary)] mt-0.5 break-all">{document.fileType || 'application/octet-stream'}</p>
              </div>

              {document.uploadedBy && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">Uploaded By</span>
                  <p className="text-[var(--text-primary)] mt-0.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>{document.uploadedBy}</span>
                  </p>
                </div>
              )}

              {document.createdAt && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">Date Created</span>
                  <p className="text-[var(--text-primary)] mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    <span>{formatDate(document.createdAt)}</span>
                  </p>
                </div>
              )}

              {document.description && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">Description</span>
                  <p className="text-[var(--text-secondary)] mt-1 leading-relaxed">{document.description}</p>
                </div>
              )}

              {document.extractedTextPreview && (
                <div className="pt-2 border-t border-[var(--border)]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">AI Extracted Content</span>
                  <div className="mt-1 p-2.5 rounded-lg bg-[var(--surface-subtle)] border border-[var(--border)] text-[11px] text-[var(--text-secondary)] font-mono max-h-40 overflow-y-auto leading-relaxed">
                    {document.extractedTextPreview}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
