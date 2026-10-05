'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Sparkles,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Car,
  Wrench,
  DollarSign,
  X,
  Loader2,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import { Button, StatusBadge, toast } from '@/components/design-system';
import type { Shipment } from '@/components/shipments/shipment-detail-types';
import {
  AiDamageDetectionResult,
  AiDetectedDamage,
  convertAiResultToInspectionData,
} from '@/lib/ai/damage-detection';
import {
  SEVERITY_CONFIG,
  DAMAGE_TYPE_LABELS,
  GRADE_CONFIG,
  VehicleInspectionData,
} from '@/types/vehicle-inspection';
import VehicleDamageBlueprint from '@/components/inspections/VehicleDamageBlueprint';

type ShipmentAiDamageModalProps = {
  isOpen: boolean;
  onClose: () => void;
  shipment: Shipment;
  onInspectionApplied?: (inspection: VehicleInspectionData) => void;
  onOpenFullInspectionWithAi?: (inspection: VehicleInspectionData) => void;
};

export default function ShipmentAiDamageModal({
  isOpen,
  onClose,
  shipment,
  onInspectionApplied,
  onOpenFullInspectionWithAi,
}: ShipmentAiDamageModalProps) {
  const allPhotos = Array.from(
    new Set([...(shipment.vehiclePhotos || []), ...(shipment.arrivalPhotos || [])].filter(Boolean))
  );

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>(allPhotos);
  const [scanMode, setScanMode] = useState<'INSPECTION' | 'TRANSIT_COMPARISON'>(
    shipment.vehiclePhotos?.length && shipment.arrivalPhotos?.length ? 'TRANSIT_COMPARISON' : 'INSPECTION'
  );
  const [isScanning, setIsScanning] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [scanResult, setScanResult] = useState<AiDamageDetectionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'blueprint' | 'manifest' | 'transit' | 'custody'>('blueprint');
  const [selectedDamage, setSelectedDamage] = useState<AiDetectedDamage | null>(null);

  if (!isOpen) return null;

  const vehicleLabel = `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Vehicle';

  const togglePhoto = (url: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(url) ? prev.filter((p) => p !== url) : [...prev, url]
    );
  };

  const handleSelectAll = () => setSelectedPhotos(allPhotos);
  const handleSelectNone = () => setSelectedPhotos([]);
  const handleSelectVehicleOnly = () => setSelectedPhotos(shipment.vehiclePhotos || []);
  const handleSelectArrivalOnly = () => setSelectedPhotos(shipment.arrivalPhotos || []);

  const runAiScan = async () => {
    if (selectedPhotos.length === 0) {
      toast.error('Please select at least one photo to analyze.');
      return;
    }

    setIsScanning(true);
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/ai-damages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrls: selectedPhotos,
          mode: scanMode,
          autoApply: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'AI damage scan failed');
      }

      setScanResult(data.result);
      if (data.result.transitComparison) {
        setActiveTab('transit');
      } else {
        setActiveTab('blueprint');
      }
      if (data.result.damages?.length > 0) {
        setSelectedDamage(data.result.damages[0]);
      }
      toast.success('AI damage analysis complete!', {
        description: `Found ${data.result.damagesCount} hotspot(s). Grade: ${data.result.overallGrade}`,
      });
    } catch (err: any) {
      console.error('AI Scan Error:', err);
      toast.error('Failed to run AI damage scan', {
        description: err.message,
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyToInspection = async () => {
    if (!scanResult) return;
    setIsApplying(true);

    try {
      const inspectionData = convertAiResultToInspectionData(
        scanResult,
        'AI Vision Inspector',
        'Yard Intake AI'
      );

      const res = await fetch(`/api/shipments/${shipment.id}/inspection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspectionData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save inspection');
      }

      toast.success('Inspection report updated with AI damages!');
      onInspectionApplied?.(inspectionData);
      onClose();
    } catch (err: any) {
      console.error('Failed to apply AI inspection:', err);
      toast.error('Failed to apply AI inspection', {
        description: err.message,
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleOpenFullEditor = () => {
    if (!scanResult) return;
    const inspectionData = convertAiResultToInspectionData(
      scanResult,
      'AI Vision Inspector',
      'Yard Intake AI'
    );
    onOpenFullInspectionWithAi?.(inspectionData);
    onClose();
  };

  const gradeInfo = scanResult?.overallGrade
    ? GRADE_CONFIG[scanResult.overallGrade]
    : GRADE_CONFIG.GRADE_B;

  const markers = scanResult
    ? scanResult.damages.map((d) => ({
        id: d.id,
        pinNumber: d.pinNumber,
        view: d.view,
        x: d.x,
        y: d.y,
        zone: d.zone,
        damageType: d.damageType,
        severity: d.severity,
        description: d.description,
        estimatedCost: d.estimatedCost,
        photos: d.sourcePhotoUrl ? [d.sourcePhotoUrl] : [],
        createdAt: scanResult.analyzedAt,
      }))
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  AI Damage Vision Inspection
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Multimodal Vision
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                {vehicleLabel} {shipment.vehicleVIN ? `• VIN: ${shipment.vehicleVIN}` : ''}
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

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Phase 1: Photo Selection (Shown when not scanned yet or when re-selecting) */}
          {!scanResult && !isScanning && (
            <div className="space-y-5">
              {/* Scan Mode Toggle */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-[var(--text-primary)]">Analysis Mode:</span>
                </div>
                <div className="flex items-center gap-1.5 bg-[var(--card)] p-1 rounded-lg border border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setScanMode('INSPECTION')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      scanMode === 'INSPECTION'
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Standard Intake Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanMode('TRANSIT_COMPARISON')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                      scanMode === 'TRANSIT_COMPARISON'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Transit Damage Comparison (Before vs After)
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-background to-transparent border border-amber-500/20">
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Select Shipment Photos to Analyze ({selectedPhotos.length}/{allPhotos.length})
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {scanMode === 'TRANSIT_COMPARISON'
                      ? 'AI will compare baseline auction intake photos against destination port arrival photos to isolate carrier liability.'
                      : 'Our AI vision model inspects panels, lights, glass, tires, and frame for scratches, dents, and defects.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="px-2.5 py-1 rounded-md bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--card)] text-[var(--text-primary)]"
                  >
                    All ({allPhotos.length})
                  </button>
                  {shipment.vehiclePhotos && shipment.vehiclePhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectVehicleOnly}
                      className="px-2.5 py-1 rounded-md bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--card)] text-[var(--text-primary)]"
                    >
                      Vehicle ({shipment.vehiclePhotos.length})
                    </button>
                  )}
                  {shipment.arrivalPhotos && shipment.arrivalPhotos.length > 0 && (
                    <button
                      type="button"
                      onClick={handleSelectArrivalOnly}
                      className="px-2.5 py-1 rounded-md bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--card)] text-[var(--text-primary)]"
                    >
                      Arrival ({shipment.arrivalPhotos.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSelectNone}
                    className="px-2.5 py-1 rounded-md bg-[var(--background)] border border-[var(--border)] hover:bg-[var(--card)] text-[var(--text-secondary)]"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Photo Thumbnails Grid */}
              {allPhotos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {allPhotos.map((url, idx) => {
                    const isSelected = selectedPhotos.includes(url);
                    return (
                      <div
                        key={url}
                        onClick={() => togglePhoto(url)}
                        className={`relative group aspect-[4/3] rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                            : 'border-[var(--border)] opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all bg-black/60 backdrop-blur-md">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-amber-400 text-black flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-white/60" />
                          )}
                        </div>
                        <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white bg-black/60 px-1.5 py-0.5 rounded">
                          #{idx + 1}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)]">
                  <Camera className="w-10 h-10 mx-auto text-[var(--text-secondary)] opacity-50" />
                  <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                    No shipment photos found
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    Upload arrival or vehicle photos first to run AI damage detection.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Phase 2: Scanning Progress Animation */}
          {isScanning && (
            <div className="py-16 text-center space-y-6">
              <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr from-amber-500/20 via-amber-400/30 to-amber-500/10 border border-amber-400/40 shadow-2xl">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin" />
                <div className="absolute inset-0 rounded-3xl border-2 border-amber-400/40 animate-ping opacity-25" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-bold text-[var(--text-primary)]">
                  Vision AI Analyzing Vehicle Condition...
                </h4>
                <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
                  Scanning {selectedPhotos.length} high-resolution photographs, detecting body panel deformations, scratches, broken trim, and calculating estimated repair claims.
                </p>
              </div>
            </div>
          )}

          {/* Phase 3: Scan Results & Interactive Blueprint */}
          {scanResult && !isScanning && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Executive Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] shadow-sm">
                {/* Condition Grade */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-base shadow-sm"
                    style={{
                      backgroundColor: `${gradeInfo.color}20`,
                      color: gradeInfo.color,
                      border: `1px solid ${gradeInfo.color}50`,
                    }}
                  >
                    {scanResult.overallGrade.replace('GRADE_', '')}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Condition Grade
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {gradeInfo.label}
                    </p>
                  </div>
                </div>

                {/* Hotspots Count */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-base">
                    {scanResult.damagesCount}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Hotspots Logged
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {scanResult.damagesCount} Defect{scanResult.damagesCount === 1 ? '' : 's'} Detected
                    </p>
                  </div>
                </div>

                {/* Claim Impact */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center font-bold text-base">
                    ${scanResult.totalEstimatedCost.toFixed(0)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Est. Repair Impact
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      ${scanResult.totalEstimatedCost.toFixed(2)} USD
                    </p>
                  </div>
                </div>

                {/* AI Provider Tag */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Vision Engine
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[130px]">
                      {scanResult.provider}
                    </p>
                  </div>
                </div>
              </div>

              {/* View Selector Tabs */}
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {scanResult.transitComparison && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('transit')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'transit'
                          ? 'bg-cyan-500 text-white shadow-sm'
                          : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Transit Differential (Before vs After)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('blueprint')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'blueprint'
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    2D Blueprint Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manifest')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'manifest'
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Hotspot Manifest ({scanResult.damages.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('custody')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      activeTab === 'custody'
                        ? 'bg-amber-400 text-black shadow-sm'
                        : 'bg-[var(--background)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    Custody & Systems
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setScanResult(null)}
                  className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all font-semibold"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-select Photos</span>
                </button>
              </div>

              {/* Tab 0: Transit Comparison Differential (Before vs After) */}
              {activeTab === 'transit' && scanResult.transitComparison && (
                <div className="space-y-5 animate-in fade-in">
                  {/* Differential Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                          Pre-Existing (Auction Intake)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                          {scanResult.transitComparison.preExistingCount} Items
                        </span>
                      </div>
                      <p className="text-xl font-black text-[var(--text-primary)]">
                        ${scanResult.transitComparison.preExistingCost.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Present prior to container loading at departure origin.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                          Carrier Transit Induced
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 animate-pulse">
                          {scanResult.transitComparison.transitInducedCount} New
                        </span>
                      </div>
                      <p className="text-xl font-black text-red-400">
                        ${scanResult.transitComparison.transitClaimLiabilityCost.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Damages occurred during ocean voyage / lashing / handling.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                          Total Vessel Cargo Claim
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                          Marine Subrogation
                        </span>
                      </div>
                      <p className="text-xl font-black text-amber-400">
                        ${scanResult.transitComparison.totalDamageCost.toFixed(2)}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        Combined repair valuation across all photo milestones.
                      </p>
                    </div>
                  </div>

                  {/* Surveyor Statement & Liability Recommendation */}
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-2.5">
                    <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Marine Cargo Surveyor Recommendation</span>
                    </div>
                    <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed">
                      {scanResult.transitComparison.executiveSummary}
                    </p>
                    <div className="p-3 rounded-lg bg-[var(--card)] border border-[var(--border)] text-xs text-amber-400/90 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{scanResult.transitComparison.carrierLiabilityRecommendation}</span>
                    </div>
                  </div>

                  {/* Differential Damage List */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Categorized Damage Hotspots
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {scanResult.transitComparison.damages.map((dmg) => {
                        const isTransit = dmg.origin === 'TRANSIT_INDUCED';
                        const sev = SEVERITY_CONFIG[dmg.severity] || SEVERITY_CONFIG.MEDIUM;
                        return (
                          <div
                            key={dmg.id}
                            className={`p-4 rounded-xl border transition-all space-y-2.5 ${
                              isTransit
                                ? 'border-red-500/40 bg-red-500/5'
                                : 'border-[var(--border)] bg-[var(--background)]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                                  style={{ backgroundColor: sev.color }}
                                >
                                  {dmg.pinNumber}
                                </span>
                                <div>
                                  <h6 className="text-xs font-bold text-[var(--text-primary)]">
                                    {dmg.zone}
                                  </h6>
                                  <span className="text-[10px] text-[var(--text-secondary)]">
                                    {dmg.view.toUpperCase()} View
                                  </span>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isTransit
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                }`}
                              >
                                {isTransit ? '⚠️ TRANSIT INDUCED' : '📋 PRE-EXISTING'}
                              </span>
                            </div>

                            <p className="text-xs text-[var(--text-secondary)]">{dmg.description}</p>
                            {dmg.claimNotes && (
                              <p className="text-[11px] text-amber-400/80 italic bg-[var(--card)] p-2 rounded border border-[var(--border)]">
                                Claim Note: {dmg.claimNotes}
                              </p>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-bold"
                                style={{
                                  backgroundColor: sev.bg,
                                  color: sev.color,
                                  border: `1px solid ${sev.border}`,
                                }}
                              >
                                {DAMAGE_TYPE_LABELS[dmg.damageType]}
                              </span>
                              <span className="font-bold text-amber-400">
                                ${dmg.estimatedCost.toFixed(2)} USD
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 1: Interactive Blueprint with AI Markers */}
              {activeTab === 'blueprint' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                    <VehicleDamageBlueprint
                      markers={markers}
                      onPinClick={(marker) => {
                        const dmg = scanResult.damages.find((d) => d.id === marker.id);
                        if (dmg) setSelectedDamage(dmg);
                      }}
                      readOnly={false}
                      selectedMarkerId={selectedDamage?.id}
                    />
                  </div>

                  {/* Selected Damage Detail Card */}
                  {selectedDamage && (
                    <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/5 space-y-3 animate-in fade-in">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                            style={{
                              backgroundColor:
                                SEVERITY_CONFIG[selectedDamage.severity]?.color || '#f97316',
                            }}
                          >
                            {selectedDamage.pinNumber}
                          </span>
                          <span className="text-sm font-bold text-[var(--text-primary)]">
                            {selectedDamage.zone}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: SEVERITY_CONFIG[selectedDamage.severity]?.bg,
                              color: SEVERITY_CONFIG[selectedDamage.severity]?.color,
                              border: `1px solid ${SEVERITY_CONFIG[selectedDamage.severity]?.border}`,
                            }}
                          >
                            {DAMAGE_TYPE_LABELS[selectedDamage.damageType]}
                          </span>
                        </div>

                        <div className="text-right font-bold text-sm text-[var(--accent-gold)]">
                          Est. Repair: ${selectedDamage.estimatedCost.toFixed(2)}
                        </div>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)]">
                        {selectedDamage.description}
                      </p>

                      {selectedDamage.sourcePhotoUrl && (
                        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]">
                          <img
                            src={selectedDamage.sourcePhotoUrl}
                            alt="Damage Evidence"
                            className="w-16 h-12 rounded-lg object-cover border border-[var(--border)]"
                          />
                          <span className="text-xs text-cyan-400 font-medium">
                            Detected in Photo #{((selectedDamage.sourcePhotoIndex ?? 0) + 1)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Itemized Damage Manifest */}
              {activeTab === 'manifest' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scanResult.damages.map((dmg) => {
                    const sev = SEVERITY_CONFIG[dmg.severity] || SEVERITY_CONFIG.MEDIUM;
                    return (
                      <div
                        key={dmg.id}
                        className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-amber-400/50 transition-all space-y-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="flex items-center justify-center w-6 h-6 rounded-full text-white text-xs font-bold"
                              style={{ backgroundColor: sev.color }}
                            >
                              {dmg.pinNumber}
                            </span>
                            <div>
                              <h5 className="text-xs font-bold text-[var(--text-primary)]">
                                {dmg.zone}
                              </h5>
                              <span className="text-[10px] text-[var(--text-secondary)]">
                                Blueprint View: {dmg.view.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <span
                            className="px-2 py-0.5 rounded text-[10px] font-bold"
                            style={{
                              backgroundColor: sev.bg,
                              color: sev.color,
                              border: `1px solid ${sev.border}`,
                            }}
                          >
                            {DAMAGE_TYPE_LABELS[dmg.damageType]}
                          </span>
                        </div>

                        <p className="text-xs text-[var(--text-secondary)]">{dmg.description}</p>

                        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-xs">
                          {dmg.sourcePhotoUrl ? (
                            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold text-[11px]">
                              <Camera className="w-3.5 h-3.5" /> Evidence Photo
                            </span>
                          ) : (
                            <span className="text-[var(--text-secondary)]">No photo</span>
                          )}

                          <span className="font-bold text-amber-400">
                            ${dmg.estimatedCost.toFixed(2)} USD
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 3: Custody & Mechanical Systems */}
              {activeTab === 'custody' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Windshield Condition
                    </span>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {scanResult.custodySummary.windshieldCondition}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Airbag Deployment
                    </span>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {scanResult.custodySummary.airbagStatus === 'DEPLOYED'
                        ? '⚠️ DEPLOYED (Collision)'
                        : '✅ INTACT'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Tire Status
                    </span>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {scanResult.custodySummary.tireCondition}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Drivability Assessment
                    </span>
                    <p className="text-sm font-bold text-[var(--text-primary)]">
                      {scanResult.custodySummary.drivableStatus}
                    </p>
                  </div>

                  <div className="sm:col-span-2 p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Surveyor AI Notes
                    </span>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {scanResult.generalNotes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border)] bg-[var(--background)]">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isScanning || isApplying}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {!scanResult ? (
              <button
                type="button"
                onClick={runAiScan}
                disabled={isScanning || selectedPhotos.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-600 text-black hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run AI Damage Scan ({selectedPhotos.length} Photos)</span>
              </button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenFullEditor}
                  disabled={isApplying}
                >
                  <Wrench className="w-3.5 h-3.5 mr-1.5" />
                  Review in Full Editor
                </Button>

                <button
                  type="button"
                  onClick={handleApplyToInspection}
                  disabled={isApplying}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:brightness-110 disabled:opacity-50 transition-all shadow-lg shadow-emerald-500/20"
                >
                  {isApplying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Apply to Inspection & Blueprint</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
