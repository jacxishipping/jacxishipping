'use client';

import React, { useState, useEffect } from 'react';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import type { Shipment } from '@/components/shipments/shipment-detail-types';
import {
  VehicleInspectionData,
  SEVERITY_CONFIG,
  DAMAGE_TYPE_LABELS,
  GRADE_CONFIG,
  DamageMarker,
} from '@/types/vehicle-inspection';
import VehicleDamageBlueprint from '@/components/inspections/VehicleDamageBlueprint';
import VehicleDamageInspectionModal from '@/components/inspections/VehicleDamageInspectionModal';
import InspectionConditionReportModal from '@/components/inspections/InspectionConditionReportModal';
import ShipmentAiDamageModal from '@/components/shipments/ShipmentAiDamageModal';
import {
  Sparkles,
  Camera,
  Printer,
  ShieldCheck,
  ShieldAlert,
  Car,
  AlertTriangle,
  Plus,
  RefreshCw,
  ExternalLink,
  Wrench,
  Bot,
} from 'lucide-react';
import { Button, StatusBadge, toast } from '@/components/design-system';

type ShipmentDamagesTabProps = {
  damages: Shipment['containerDamages'];
  shipment?: Shipment;
  onInspectionUpdated?: (inspection: VehicleInspectionData) => void;
};

export default function ShipmentDamagesTab({ damages, shipment, onInspectionUpdated }: ShipmentDamagesTabProps) {
  const [inspection, setInspection] = useState<VehicleInspectionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<DamageMarker | null>(null);

  const shipmentId = shipment?.id;

  const loadInspection = () => {
    if (!shipmentId) return;
    setIsLoading(true);
    fetch(`/api/shipments/${shipmentId}/inspection`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.inspection) {
          setInspection(data.inspection);
          onInspectionUpdated?.(data.inspection);
        }
      })
      .catch((err) => {
        console.error('Failed to load inspection in damages tab:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadInspection();
  }, [shipmentId]);

  const markers = inspection?.markers || [];
  const totalCost = markers.reduce((sum, m) => sum + (m.estimatedCost || 0), 0);
  const gradeInfo = inspection?.overallGrade
    ? GRADE_CONFIG[inspection.overallGrade]
    : GRADE_CONFIG.GRADE_B;

  const totalPhotosCount = (shipment?.vehiclePhotos?.length || 0) + (shipment?.arrivalPhotos?.length || 0);
  const insuranceReport = inspection?.insuranceReport;
  const hasYardAndDeliveryPhotos =
    (shipment?.vehiclePhotos?.length || 0) > 0 && (shipment?.arrivalPhotos?.length || 0) > 0;

  const handlePrintInsuranceReport = () => {
    if (!insuranceReport?.htmlReport) return;
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(insuranceReport.htmlReport);
      printWin.document.close();
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Insurance Claim & Differential Card (When Report Generated) */}
      {insuranceReport && (
        <div className="relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 via-background to-amber-500/5 p-5 shadow-lg shadow-red-500/5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
            <div className="flex items-start gap-3.5">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-amber-600 text-white shadow-md shadow-red-500/20 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-bold text-[var(--text-primary)]">
                    Carrier Transit Damage & Insurance Claim
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-red-500/20 text-red-400 border border-red-500/40">
                    {insuranceReport.claimReference || insuranceReport.reportNumber}
                  </span>
                  {insuranceReport.liability.claimEligibility === 'APPROVED_FOR_SUBROGATION' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/40">
                      Carrier Liable (Subrogation)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-300 border border-green-500/40">
                      Clean Handover / No Transit Damage
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Differential audit comparing {insuranceReport.photosAudit.yardReceiptPhotosCount} Yard photo(s) vs.{' '}
                  {insuranceReport.photosAudit.deliveryPhotosCount} Final Delivery photo(s).
                  {insuranceReport.journey.carrierName && (
                    <> Carrier: <strong className="text-[var(--text-primary)]">{insuranceReport.journey.carrierName}</strong></>
                  )}
                  {insuranceReport.journey.transitReference && (
                    <> · Transit: <strong className="text-[var(--text-primary)]">{insuranceReport.journey.transitReference}</strong></>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrintInsuranceReport}
                className="border-red-500/40 text-red-400 hover:border-red-400 font-bold"
              >
                <Printer className="w-4 h-4 mr-1.5" />
                Print Insurance Report
              </Button>
              <button
                type="button"
                onClick={() => setIsAiModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--card)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--background)] transition-all shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Re-Audit Photos</span>
              </button>
            </div>
          </div>

          {/* Financial Breakdown & Summary */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">
                Claimable Transit Loss (USD)
              </span>
              <p className="text-lg font-extrabold text-red-400 mt-0.5">
                ${insuranceReport.financials.totalClaimAmountUSD.toFixed(2)}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                New damages incurred during carrier custody
              </p>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Pre-Existing Yard Wear
              </span>
              <p className="text-lg font-extrabold text-amber-400 mt-0.5">
                ${insuranceReport.financials.preExistingDamageCostUSD.toFixed(2)}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Exempt from carrier subrogation claim
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Total Appraised Damage
              </span>
              <p className="text-lg font-extrabold text-[var(--text-primary)] mt-0.5">
                ${insuranceReport.financials.totalDamageAppraisedUSD.toFixed(2)}
              </p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                Full vehicle condition appraised value
              </p>
            </div>
          </div>

          {insuranceReport.liability.executiveSummary && (
            <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--background)]/60 p-3 text-xs text-[var(--text-secondary)]">
              <p>
                <strong className="text-[var(--text-primary)] font-semibold">Executive Assessment: </strong>
                {insuranceReport.liability.executiveSummary}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Differential Scan Banner (When both Yard and Delivery photos exist and no report yet) */}
      {!insuranceReport && hasYardAndDeliveryPhotos && (
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 via-background to-blue-500/5 p-5 shadow-lg shadow-cyan-500/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-md shadow-cyan-500/20 shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Transit Damage Differential Available
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Dual Photo Set
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Both Yard Intake photos ({shipment?.vehiclePhotos?.length || 0}) and Final Delivery photos ({shipment?.arrivalPhotos?.length || 0}) are uploaded. Run AI comparison to audit new transit damages and generate insurance subrogation files.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:brightness-110 transition-all shadow-md shadow-cyan-500/20 shrink-0"
            >
              <Bot className="w-4 h-4" />
              <span>Compare Yard vs. Delivery Photos</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Quick-Scan Banner (Shown when no inspection or empty markers and single photo set) */}
      {!insuranceReport && !hasYardAndDeliveryPhotos && markers.length === 0 && totalPhotosCount > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-background to-amber-500/5 p-5 shadow-lg shadow-amber-500/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-md shadow-amber-500/20 shrink-0">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">
                    Auto-Detect Damages from Photos with AI
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Vision AI
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Scan {totalPhotosCount} uploaded shipment photo(s) with AI to automatically detect scratches, dents, and defects, place 2D blueprint pins, and estimate repair claims.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsAiModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-400 to-amber-600 text-white hover:brightness-110 transition-all shadow-md shadow-amber-500/20 shrink-0"
            >
              <Bot className="w-4 h-4" />
              <span>Launch AI Vision Scan</span>
            </button>
          </div>
        </div>
      )}

      {/* 2D Interactive Blueprint & Yard Condition Card */}
      <DashboardPanel
        title="2D Vehicle Blueprint & Condition Inspection"
        description="Interactive visual damage mapping, pre-existing defect logs, and export marine insurance certificates"
      >
        <div className="space-y-5">
          {/* Header Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="px-2.5 py-1 rounded-md text-xs font-bold"
                style={{
                  backgroundColor: `${gradeInfo.color}20`,
                  color: gradeInfo.color,
                  border: `1px solid ${gradeInfo.color}50`,
                }}
              >
                {gradeInfo.label}
              </span>

              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--background)] text-[var(--text-secondary)] border border-[var(--border)]">
                {markers.length} Hotspot{markers.length === 1 ? '' : 's'} Logged
              </span>

              {totalCost > 0 && (
                <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30">
                  Est. Claim Impact: ${totalCost.toFixed(2)}
                </span>
              )}

              {inspection?.inspectorName && (
                <span className="text-xs text-[var(--text-secondary)]">
                  Verified by <strong className="text-[var(--text-primary)]">{inspection.inspectorName}</strong>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* AI Auto-Detect Button */}
              {totalPhotosCount > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAiModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-amber-400/20 to-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>AI Damage Scan</span>
                </button>
              )}

              {inspection && (
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--card)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--background)] transition-all shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Condition Receipt</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsInspectionModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[var(--accent-gold)] text-white hover:brightness-110 transition-all shadow-sm"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>{inspection ? 'Edit / Add Pins' : 'Launch Yard Inspection'}</span>
              </button>
            </div>
          </div>

          {/* Interactive Blueprint */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
            <VehicleDamageBlueprint
              markers={markers}
              onPinClick={(marker) => {
                setSelectedMarker(marker);
                setIsInspectionModalOpen(true);
              }}
              onAddPin={() => {
                setIsInspectionModalOpen(true);
              }}
              readOnly={false}
              selectedMarkerId={selectedMarker?.id}
            />
          </div>

          {/* Itemized Damage Hotspots Table */}
          {markers.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Logged Hotspots Manifest
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {markers.map((marker) => {
                  const sev = SEVERITY_CONFIG[marker.severity] || SEVERITY_CONFIG.MEDIUM;
                  return (
                    <div
                      key={marker.id}
                      onClick={() => {
                        setSelectedMarker(marker);
                        setIsInspectionModalOpen(true);
                      }}
                      className="group p-3 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)]/60 cursor-pointer transition-all space-y-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold"
                            style={{ backgroundColor: sev.color }}
                          >
                            {marker.pinNumber}
                          </span>
                          <span className="text-xs font-bold text-[var(--text-primary)]">
                            {marker.zone}
                          </span>
                        </div>
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: sev.bg,
                            color: sev.color,
                            border: `1px solid ${sev.border}`,
                          }}
                        >
                          {DAMAGE_TYPE_LABELS[marker.damageType]}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                        {marker.description || 'Verified during yard intake inspection'}
                      </p>

                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-[var(--border)]">
                        {marker.photos.length > 0 ? (
                          <span className="flex items-center gap-1 text-cyan-400 font-semibold">
                            <Camera className="w-3 h-3" /> {marker.photos.length} Photo{marker.photos.length > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[var(--text-secondary)]">No photos</span>
                        )}

                        {marker.estimatedCost ? (
                          <span className="font-bold text-[var(--accent-gold)]">
                            ${marker.estimatedCost.toFixed(2)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DashboardPanel>

      {/* Container Operations Damage Ledger (Preserved) */}
      <DashboardPanel
        title="Container Operations Ledger"
        description="Damage charges and credits applied to this shipment from ocean container operations"
      >
        {damages && damages.length > 0 ? (
          <div className="space-y-3">
            {damages.map((damage) => (
              <div
                key={damage.id}
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {damage.description}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Added on {new Date(damage.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                      style={{
                        background:
                          damage.damageType === 'WE_PAY'
                            ? 'rgba(34,197,94,0.15)'
                            : 'rgba(249,115,22,0.15)',
                        color: damage.damageType === 'WE_PAY' ? 'rgb(34,197,94)' : 'rgb(249,115,22)',
                        border:
                          damage.damageType === 'WE_PAY'
                            ? '1px solid rgba(34,197,94,0.35)'
                            : '1px solid rgba(249,115,22,0.35)',
                      }}
                    >
                      {damage.damageType === 'WE_PAY' ? 'We Pay (Customer Credit)' : 'Company Pays'}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                      ${damage.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-[var(--border)] bg-[var(--background)] py-6 text-center text-xs text-[var(--text-secondary)]">
            No container operational damage debits or credits recorded.
          </p>
        )}
      </DashboardPanel>

      {/* Modals */}
      {isAiModalOpen && shipment && (
        <ShipmentAiDamageModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          shipment={shipment}
          onInspectionApplied={(saved) => {
            setInspection(saved);
            onInspectionUpdated?.(saved);
          }}
          onOpenFullInspectionWithAi={(prefilled) => {
            setInspection(prefilled);
            setIsInspectionModalOpen(true);
          }}
        />
      )}

      {isInspectionModalOpen && shipment && (
        <VehicleDamageInspectionModal
          isOpen={isInspectionModalOpen}
          onClose={() => setIsInspectionModalOpen(false)}
          shipment={shipment}
          onInspectionSaved={(saved) => {
            setInspection(saved);
            onInspectionUpdated?.(saved);
            setIsInspectionModalOpen(false);
          }}
        />
      )}

      {isReceiptModalOpen && inspection && shipment && (
        <InspectionConditionReportModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          inspection={inspection}
          shipment={shipment}
        />
      )}
    </div>
  );
}