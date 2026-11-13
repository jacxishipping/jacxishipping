'use client';

import { useState, useRef } from 'react';
import { Upload, Sparkles, FileText, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button, toast } from '@/components/design-system';

export interface ExtractedShipmentData {
  vin?: string;
  year?: number | null;
  make?: string;
  model?: string;
  lotNumber?: string;
  auctionName?: 'Copart' | 'IAAI' | 'Impact' | 'Manheim' | 'Other';
  purchasePrice?: number | null;
  buyerName?: string;
  buyerNumber?: string;
  titleStatus?: string;
  hasTitle?: boolean;
  hasKeys?: boolean;
  odometer?: number | null;
  primaryDamage?: string;
  color?: string;
  confidenceNotes?: string;
}

interface AiDocumentAutoFillDropzoneProps {
  onExtracted: (data: ExtractedShipmentData) => void;
  disabled?: boolean;
}

export function AiDocumentAutoFillDropzone({ onExtracted, disabled = false }: AiDocumentAutoFillDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedShipmentData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg', '.webp'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      toast.error('Unsupported file format. Please upload a PDF, PNG, or JPG of your Bill of Sale or Title.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('File size exceeds the 15MB limit.');
      return;
    }

    setFileName(file.name);
    setIsProcessing(true);
    setExtractedData(null);

    try {
      // 1. Upload file to server storage
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'shipments');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload document for processing.');
      }

      const uploadData = await uploadRes.json();
      const fileUrl = uploadData.url;

      // 2. Call AI extraction endpoint with shipment-intake mode
      const extractRes = await fetch('/api/ai/document-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'shipment-intake',
          fileUrl,
          fileName: file.name,
          fileType: file.type || 'application/pdf',
        }),
      });

      if (!extractRes.ok) {
        const errorJson = await extractRes.json().catch(() => ({}));
        throw new Error(errorJson.error || 'AI document extraction failed.');
      }

      const extractionResult: ExtractedShipmentData = await extractRes.json();
      setExtractedData(extractionResult);

      // Auto-apply immediately to streamline intake
      onExtracted(extractionResult);
      toast.success('Document analyzed! Vehicle fields auto-populated.');
    } catch (err: any) {
      console.error('AI Document Intake error:', err);
      toast.error(err.message || 'Could not analyze document.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isProcessing) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const reset = () => {
    setFileName(null);
    setExtractedData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div style={{marginBottom: '20px', padding: '16px', borderRadius: '20px', border: '1px dashed', borderColor: isDragging
          ? 'var(--accent-gold)'
          : extractedData
          ? 'rgba(34, 197, 94, 0.4)'
          : 'rgba(var(--border-rgb), 0.8)', backgroundColor: isDragging
          ? 'rgba(var(--accent-gold-rgb), 0.04)'
          : extractedData
          ? 'rgba(34, 197, 94, 0.03)'
          : 'var(--panel)', transition: 'all 0.2s ease'}} onDragOver={(e) => {
        e.preventDefault();
        if (!disabled && !isProcessing) setIsDragging(true);
      }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
      />

      {/* Header & Description */}
      <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '12px'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '12px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)', color: 'var(--accent-gold)'}}>
            <Sparkles size={16} />
          </div>
          <div>
            <p style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2}}>
              Smart Document Auto-Fill
            </p>
            <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
              Drop a Copart / IAAI Bill of Sale, Title, or Dock Receipt to auto-populate vehicle & auction info
            </p>
          </div>
        </div>

        {!isProcessing && !extractedData && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="text-xs shrink-0"
          >
            <Upload className="w-3.5 h-3.5 mr-1" />
            Upload File
          </Button>
        )}

        {extractedData && (
          <Button
            size="sm"
            variant="ghost"
            onClick={reset}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Upload Another
          </Button>
        )}
      </div>

      {/* Processing State */}
      {isProcessing && (
        <div style={{paddingTop: '16px', paddingBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px'}}>
          <Loader2 className="w-5 h-5 text-[var(--accent-gold)] animate-spin" />
          <p style={{fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500}}>
            Analyzing document with AI... Extracting VIN, Lot #, and vehicle details
          </p>
        </div>
      )}

      {/* Extracted Data Preview Pills */}
      {extractedData && (
        <div style={{marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(var(--border-rgb), 0.5)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'}}>
            <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
            <p style={{fontSize: '0.75rem', fontWeight: 600, color: '#16a34a'}}>
              Extracted from {fileName}:
            </p>
          </div>

          <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
            {extractedData.vin && (
              <span style={{fontFamily: 'monospace', fontWeight: 700, fontSize: '0.75rem', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)', color: 'var(--text-primary)', border: '1px solid rgba(var(--accent-gold-rgb), 0.3)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`VIN: ${extractedData.vin}`}</span>
            )}
            {(extractedData.year || extractedData.make || extractedData.model) && (
              <span style={{fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--background)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{[extractedData.year, extractedData.make, extractedData.model].filter(Boolean).join(' ')}</span>
            )}
            {extractedData.lotNumber && (
              <span style={{fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--background)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`Lot #${extractedData.lotNumber}${extractedData.auctionName ? ` (${extractedData.auctionName})` : ''}`}</span>
            )}
            {extractedData.hasKeys !== undefined && (
              <span style={{fontSize: '0.75rem', fontWeight: 600, backgroundColor: extractedData.hasKeys ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: extractedData.hasKeys ? '#16a34a' : '#ef4444'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`Keys: ${extractedData.hasKeys ? 'Yes' : 'No'}`}</span>
            )}
            {extractedData.titleStatus && (
              <span style={{fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'var(--background)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`Title: ${extractedData.titleStatus}`}</span>
            )}
            {typeof extractedData.purchasePrice === 'number' && extractedData.purchasePrice > 0 && (
              <span style={{fontSize: '0.75rem', fontWeight: 600, backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#2563eb'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`Price: $${extractedData.purchasePrice.toLocaleString()}`}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
