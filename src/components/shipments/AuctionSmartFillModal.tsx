'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ClipboardPaste,
  Car,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info,
  ExternalLink,
} from 'lucide-react';
import { Button, StatusBadge, toast } from '@/components/design-system';
import type { ParsedAuctionData } from '@/lib/auction-smart-parser';

type AuctionSmartFillModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: ParsedAuctionData) => void;
  initialLotNumber?: string;
  initialAuctionName?: string;
};

export default function AuctionSmartFillModal({
  isOpen,
  onClose,
  onApply,
  initialLotNumber = '',
  initialAuctionName = 'Copart',
}: AuctionSmartFillModalProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'vin'>('paste');
  const [inputText, setInputText] = useState('');
  const [inputVin, setInputVin] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedAuctionData | null>(null);

  if (!isOpen) return null;

  const handleParseTextOrUrl = async () => {
    if (!inputText.trim()) {
      toast.error('Please paste Copart/IAAI text or URL.');
      return;
    }

    setIsProcessing(true);
    setParsedResult(null);

    try {
      const res = await fetch('/api/auctions/smart-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse auction details');
      }

      setParsedResult(data.data);
      toast.success('Extracted vehicle details successfully!', {
        description: `${data.data.vehicleYear || ''} ${data.data.vehicleMake || ''} ${data.data.vehicleModel || ''}`.trim() || 'Details ready to apply',
      });
    } catch (err: any) {
      console.error('Smart parse error:', err);
      toast.error('Failed to parse text', {
        description: err.message || 'Please check the text or try entering the VIN',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDecodeVin = async () => {
    const trimmed = inputVin.trim().toUpperCase();
    if (!trimmed || trimmed.length !== 17) {
      toast.error('VIN must be exactly 17 characters.');
      return;
    }

    setIsProcessing(true);
    setParsedResult(null);

    try {
      const res = await fetch('/api/auctions/smart-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to decode VIN');
      }

      setParsedResult(data.data);
      toast.success('NHTSA VIN Decoded successfully!', {
        description: `${data.data.vehicleYear || ''} ${data.data.vehicleMake || ''} ${data.data.vehicleModel || ''}`.trim(),
      });
    } catch (err: any) {
      console.error('VIN decode error:', err);
      toast.error('Failed to decode VIN', {
        description: err.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!parsedResult) return;
    onApply(parsedResult);
    toast.success('Applied vehicle details to shipment form!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/20">
              <Zap className="w-5 h-5 fill-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Smart Vehicle Auto-Fill
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Zero Proxy / Free
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Auto-fill vehicle specs, yard location, keys, and damage without Oxylabs or paid proxies
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--card)] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-[var(--border)] bg-[var(--background)]/50">
          <button
            type="button"
            onClick={() => {
              setActiveTab('paste');
              setParsedResult(null);
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'paste'
                ? 'border-[var(--accent-gold)] text-[var(--accent-gold)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            Paste Copart / IAAI Text or Link
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('vin');
              setParsedResult(null);
            }}
            className={`flex items-center gap-2 pb-3 px-3 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'vin'
                ? 'border-[var(--accent-gold)] text-[var(--accent-gold)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Car className="w-4 h-4" />
            Free NHTSA VIN Lookup
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Tab 1: Smart Text / URL Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2.5">
                <Info className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-200">How to use:</span> Simply copy the text or URL from your open Copart or IAAI tab and paste it below. Our smart parser instantly extracts the Lot Number, VIN, Make, Model, Year, Color, Damage, Yard Location, Keys, and Title.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  Paste Copart / IAAI URL or Copied Listing Details:
                </label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  rows={5}
                  placeholder={`Example URL: https://www.copart.com/lot/82341234/2022-toyota-camry-tx-dallas\n\nOr paste copied text: \nLot # 82341234 • 2022 TOYOTA CAMRY SE\nVIN: 4T1B11HK5NU123456\nLocation: TX - DALLAS SOUTH\nPrimary Damage: FRONT END • Keys: YES • Title: CLEAN TITLE`}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-gold)] transition-colors font-mono"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Supports Copart, IAAI, Manheim, and insurance salvage formats
                </span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleParseTextOrUrl}
                  disabled={isProcessing || !inputText.trim()}
                  icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                >
                  {isProcessing ? 'Extracting Details...' : 'Parse & Extract'}
                </Button>
              </div>
            </div>
          )}

          {/* Tab 2: Free NHTSA VIN Decoder */}
          {activeTab === 'vin' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-200">Official US DOT / NHTSA Database:</span> Enter any 17-digit VIN. We query the official US Department of Transportation database directly for free — with 100% accuracy, zero proxies, and no external subscriptions.
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
                  17-Digit Vehicle Identification Number (VIN):
                </label>
                <input
                  type="text"
                  maxLength={17}
                  value={inputVin}
                  onChange={(e) => setInputVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, ''))}
                  placeholder="e.g. 1HGCR2F83HA123456"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-2.5 text-sm font-mono tracking-widest text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent-gold)] transition-colors"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-secondary)]">
                  {inputVin.length}/17 characters entered
                </span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleDecodeVin}
                  disabled={isProcessing || inputVin.length !== 17}
                  icon={isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4" />}
                >
                  {isProcessing ? 'Querying NHTSA...' : 'Decode VIN'}
                </Button>
              </div>
            </div>
          )}

          {/* Parsed Result Preview Card */}
          {parsedResult && (
            <div className="space-y-4 pt-4 border-t border-[var(--border)] animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Extracted Vehicle Data Preview
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/20 text-amber-400">
                  Ready to Fill
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Year Make Model</span>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                    {[parsedResult.vehicleYear, parsedResult.vehicleMake, parsedResult.vehicleModel].filter(Boolean).join(' ') || '—'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">VIN</span>
                  <p className="text-xs font-mono font-bold text-amber-400 mt-0.5">
                    {parsedResult.vehicleVIN || '—'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Lot / Stock #</span>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                    {parsedResult.lotNumber || '—'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Auction</span>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                    {parsedResult.auctionName || '—'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Yard / Location</span>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5 truncate">
                    {parsedResult.purchaseLocation || '—'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Vehicle Type</span>
                  <p className="text-xs font-bold text-[var(--text-primary)] capitalize mt-0.5">
                    {parsedResult.vehicleType || '—'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Primary Damage</span>
                  <p className="text-xs font-bold text-red-400 mt-0.5">
                    {parsedResult.primaryDamage || '—'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Keys & Title</span>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                    {parsedResult.hasKey !== undefined ? (parsedResult.hasKey ? 'Keys: Yes' : 'Keys: No') : 'Keys: ?'}{' • '}
                    {parsedResult.hasTitle !== undefined ? (parsedResult.hasTitle ? 'Title: Yes' : 'Title: No') : 'Title: ?'}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)]">Color / Odometer</span>
                  <p className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                    {parsedResult.vehicleColor || 'Color: —'} {parsedResult.odometer ? `(${parsedResult.odometer})` : ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] bg-[var(--background)]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            Cancel
          </button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleApply}
            disabled={!parsedResult}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Apply to Shipment Form
          </Button>
        </div>
      </div>
    </div>
  );
}
