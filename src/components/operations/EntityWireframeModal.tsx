'use client';

import React, { useState, useMemo } from 'react';
import {
  Package,
  Truck,
  Ship,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  FileX,
  Key,
  Car,
  Eye,
  X,
  ExternalLink,
  Layers,
  Sparkles,
  Printer,
  Copy,
  Share2,
  Anchor,
  Compass,
  Check,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import { Button, Modal } from '@/components/design-system';
import { FlowShipment, FlowDispatch, FlowContainer } from './OperationsFlowCanvas';

export interface EntityWireframeModalProps {
  open: boolean;
  onClose: () => void;
  entityType: 'shipment' | 'container' | 'dispatch' | 'transit';
  entityId: string;
  shipments: FlowShipment[];
  dispatches: FlowDispatch[];
  containers: FlowContainer[];
  onSelectEntity?: (type: 'shipment' | 'container' | 'dispatch' | 'transit', id: string) => void;
  onInspectDamage?: (shipment: FlowShipment) => void;
}

export default function EntityWireframeModal({
  open,
  onClose,
  entityType: initialType,
  entityId: initialId,
  shipments,
  dispatches,
  containers,
  onSelectEntity,
  onInspectDamage,
}: EntityWireframeModalProps) {
  const [currentType, setCurrentType] = useState<'shipment' | 'container' | 'dispatch' | 'transit'>(
    initialType
  );
  const [currentId, setCurrentId] = useState<string>(initialId);
  const [activeTab, setActiveTab] = useState<'diagram' | 'transit' | 'cargo' | 'specs'>('diagram');
  const [copiedVin, setCopiedVin] = useState(false);

  // Synchronize when initial props change
  React.useEffect(() => {
    setCurrentType(initialType);
    setCurrentId(initialId);
  }, [initialType, initialId]);

  // Lookup target entities based on active selection
  const activeShipment = useMemo(() => {
    if (currentType === 'shipment') {
      return shipments.find((s) => s.id === currentId) || null;
    }
    return null;
  }, [currentType, currentId, shipments]);

  const activeDispatch = useMemo(() => {
    if (currentType === 'dispatch') {
      return dispatches.find((d) => d.id === currentId) || null;
    }
    if (activeShipment?.dispatchId) {
      return dispatches.find((d) => d.id === activeShipment.dispatchId) || null;
    }
    return null;
  }, [currentType, currentId, dispatches, activeShipment]);

  const activeContainer = useMemo(() => {
    if (currentType === 'container') {
      return containers.find((c) => c.id === currentId) || null;
    }
    if (activeShipment?.containerId) {
      return containers.find((c) => c.id === activeShipment.containerId) || null;
    }
    return null;
  }, [currentType, currentId, containers, activeShipment]);

  // Connected shipments for containers or dispatches
  const connectedShipments = useMemo(() => {
    if (currentType === 'container') {
      return shipments.filter((s) => s.containerId === currentId);
    }
    if (currentType === 'dispatch') {
      return shipments.filter((s) => s.dispatchId === currentId);
    }
    if (currentType === 'shipment' && activeShipment) {
      return [activeShipment];
    }
    return [];
  }, [currentType, currentId, shipments, activeShipment]);

  // Navigate to another entity within the wireframe
  const handleJumpTo = (type: 'shipment' | 'container' | 'dispatch' | 'transit', id: string) => {
    setCurrentType(type);
    setCurrentId(id);
    if (onSelectEntity) {
      onSelectEntity(type, id);
    }
  };

  // Helper copy VIN
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedVin(true);
    setTimeout(() => setCopiedVin(false), 2000);
  };

  // Build title
  const modalTitle = useMemo(() => {
    if (currentType === 'shipment' && activeShipment) {
      return `Shipment Wireframe • ${activeShipment.vehicleYear || ''} ${activeShipment.vehicleMake || ''} ${activeShipment.vehicleModel || ''} (${activeShipment.vehicleVIN?.slice(-6) || 'VIN'})`;
    }
    if (currentType === 'container' && activeContainer) {
      return `Container Wireframe • ${activeContainer.containerNumber} (${activeContainer.destinationPort || 'Port'})`;
    }
    if (currentType === 'dispatch' && activeDispatch) {
      return `Dispatch Wireframe • ${activeDispatch.referenceNumber} (${activeDispatch.company?.name || 'Carrier'})`;
    }
    return 'Logistics & Transit Wireframe Blueprint';
  }, [currentType, activeShipment, activeContainer, activeDispatch]);

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={modalTitle}>
      <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
        {/* Top Breadcrumb & Switcher Bar */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] text-xs flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mr-1">
              Active Wireframe:
            </span>
            <button
              type="button"
              onClick={() => setActiveTab('diagram')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'diagram'
                  ? 'bg-[var(--accent-gold)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              🗺️ Node Flow Diagram
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transit')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'transit'
                  ? 'bg-[var(--accent-gold)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              📍 Transit Checkpoints
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('cargo')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                activeTab === 'cargo'
                  ? 'bg-[var(--accent-gold)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              📦 Vehicles & Cargo ({connectedShipments.length})
            </button>
          </div>

          <div className="flex items-center gap-1">
            {activeShipment?.vehicleVIN && (
              <button
                type="button"
                onClick={() => handleCopy(activeShipment.vehicleVIN!)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--panel)] border text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {copiedVin ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>VIN</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel)]"
              title="Print Blueprint"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* =========================================================
            TAB 1: INTERACTIVE NODE FLOW DIAGRAM (VISUAL WIREFRAME)
            ========================================================= */}
        {activeTab === 'diagram' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] overflow-x-auto">
              <div className="min-w-[700px] flex items-center justify-between gap-4 relative py-4">
                {/* Visual SVG Connecting Wire across all stages */}
                <div className="absolute top-1/2 left-12 right-12 -translate-y-1/2 h-1 bg-gradient-to-r from-amber-500 via-blue-500 to-emerald-500 rounded-full opacity-30 pointer-events-none z-0" />

                {/* Node 1: Vehicle / Cargo Intake */}
                <div
                  onClick={() =>
                    activeShipment && handleJumpTo('shipment', activeShipment.id)
                  }
                  className={`relative z-10 w-48 p-3 rounded-2xl border transition-all cursor-pointer shadow-md ${
                    currentType === 'shipment'
                      ? 'border-[var(--accent-gold)] ring-4 ring-[var(--accent-gold)]/20 bg-[var(--panel)]'
                      : 'border-[var(--border)] bg-[var(--panel)] opacity-80 hover:opacity-100 hover:border-[var(--accent-gold)]/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-[var(--accent-gold)]" />
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                        1. Cargo Intake
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold">
                      {activeShipment?.status || (connectedShipments.length > 0 ? `${connectedShipments.length} Units` : 'Yard Ready')}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {activeShipment
                      ? `${activeShipment.vehicleYear || ''} ${activeShipment.vehicleMake || ''} ${activeShipment.vehicleModel || ''}`
                      : `${connectedShipments.length} Vehicle(s) Loaded`}
                  </p>

                  <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5 truncate">
                    {activeShipment?.vehicleVIN ? `VIN: ${activeShipment.vehicleVIN.slice(-8)}` : 'Lot Inventory'}
                  </p>

                  <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[9px]">
                    <span className={activeShipment?.hasTitle ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                      {activeShipment?.hasTitle ? '✓ Title Ready' : '⚠️ Title Pending'}
                    </span>
                    {onInspectDamage && activeShipment && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onInspectDamage(activeShipment);
                        }}
                        className="text-[var(--accent-gold)] font-bold hover:underline"
                      >
                        Inspect 2D
                      </button>
                    )}
                  </div>
                </div>

                {/* Arrow Connector 1 */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-7 h-7 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center text-blue-500 shadow-sm">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] mt-1">Inland</span>
                </div>

                {/* Node 2: Inland Carrier Dispatch */}
                <div
                  onClick={() =>
                    activeDispatch && handleJumpTo('dispatch', activeDispatch.id)
                  }
                  className={`relative z-10 w-48 p-3 rounded-2xl border transition-all cursor-pointer shadow-md ${
                    currentType === 'dispatch'
                      ? 'border-blue-500 ring-4 ring-blue-500/20 bg-[var(--panel)]'
                      : 'border-[var(--border)] bg-[var(--panel)] opacity-80 hover:opacity-100 hover:border-blue-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-blue-500" />
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                        2. Carrier Lane
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">
                      {activeDispatch?.status || 'No Carrier'}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-[var(--text-primary)] font-mono truncate">
                    {activeDispatch?.referenceNumber || 'Unassigned Dispatch'}
                  </p>

                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
                    Carrier: <strong>{activeDispatch?.company?.name || 'Inland Towing'}</strong>
                  </p>

                  <div className="mt-2 pt-2 border-t border-[var(--border)] text-[9px] text-[var(--text-secondary)] flex items-center justify-between">
                    <span className="truncate">{activeDispatch?.origin ? activeDispatch.origin.split(' ')[0] : 'Yard'}</span>
                    <span>→</span>
                    <span className="truncate font-semibold text-[var(--text-primary)]">
                      {activeDispatch?.destination ? activeDispatch.destination.split(' ')[0] : 'Port'}
                    </span>
                  </div>
                </div>

                {/* Arrow Connector 2 */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-7 h-7 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center text-indigo-500 shadow-sm">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] mt-1">Stow</span>
                </div>

                {/* Node 3: Ocean Container Stowing */}
                <div
                  onClick={() =>
                    activeContainer && handleJumpTo('container', activeContainer.id)
                  }
                  className={`relative z-10 w-48 p-3 rounded-2xl border transition-all cursor-pointer shadow-md ${
                    currentType === 'container'
                      ? 'border-indigo-500 ring-4 ring-indigo-500/20 bg-[var(--panel)]'
                      : 'border-[var(--border)] bg-[var(--panel)] opacity-80 hover:opacity-100 hover:border-indigo-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <Ship className="w-4 h-4 text-indigo-500" />
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                        3. Container Bay
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-bold">
                      {activeContainer?.status || 'Awaiting'}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-[var(--text-primary)] font-mono truncate">
                    {activeContainer?.containerNumber || 'No Container'}
                  </p>

                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
                    Vessel: <strong>{activeContainer?.vesselName || 'Ocean Line'}</strong>
                  </p>

                  <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[9px]">
                    <span className="text-[var(--text-secondary)]">Capacity:</span>
                    <span className="font-bold text-indigo-400">
                      {activeContainer ? `${activeContainer.shipments?.length || 0} / ${activeContainer.maxCapacity} Units` : 'Open'}
                    </span>
                  </div>
                </div>

                {/* Arrow Connector 3 */}
                <div className="flex flex-col items-center z-10">
                  <div className="w-7 h-7 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center text-emerald-500 shadow-sm">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] mt-1">Voyage</span>
                </div>

                {/* Node 4: Destination Port & Customs */}
                <div className="relative z-10 w-48 p-3 rounded-2xl border border-emerald-500/40 bg-[var(--panel)] shadow-md">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-500" />
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                        4. Destination
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                      Terminal
                    </span>
                  </div>

                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {activeContainer?.destinationPort || activeShipment?.destinationPort || 'Port of Jebel Ali (AEJEA)'}
                  </p>

                  <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
                    Discharge & Customs Gateway
                  </p>

                  <div className="mt-2 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[9px] text-emerald-500 font-bold">
                    <span>Final Handover</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Container 4-Slot Blueprint (If inspecting a container or connected container) */}
            {(currentType === 'container' || activeContainer) && (
              <div className="p-4 rounded-2xl bg-[var(--panel)] border border-[var(--border)]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                    <Ship className="w-4 h-4 text-indigo-500" />
                    Container 40ft HC Stowing Bay Blueprint ({activeContainer?.containerNumber || currentId})
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-400">
                    {activeContainer?.shipments?.length || connectedShipments.length} / {activeContainer?.maxCapacity || 4} Stowed
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {Array.from({ length: activeContainer?.maxCapacity || 4 }).map((_, slotIdx) => {
                    const vehicleInSlot = (activeContainer?.shipments || connectedShipments)[slotIdx];
                    return (
                      <div
                        key={slotIdx}
                        onClick={() => vehicleInSlot && handleJumpTo('shipment', vehicleInSlot.id)}
                        className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between min-h-[100px] ${
                          vehicleInSlot
                            ? 'bg-[var(--background)] border-[var(--accent-gold)]/50 shadow-sm cursor-pointer hover:border-[var(--accent-gold)]'
                            : 'border-dashed border-[var(--border)] bg-[var(--background)]/40 text-center opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--panel)] border">
                            Slot #{slotIdx + 1}
                          </span>
                          {vehicleInSlot && (
                            <span className="text-[9px] font-bold text-emerald-500">Stowed</span>
                          )}
                        </div>

                        {vehicleInSlot ? (
                          <div className="mt-2">
                            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {vehicleInSlot.vehicleYear || ''} {vehicleInSlot.vehicleMake || ''} {vehicleInSlot.vehicleModel || ''}
                            </p>
                            <p className="text-[10px] font-mono text-[var(--text-secondary)] truncate">
                              {vehicleInSlot.vehicleVIN ? `VIN: ${vehicleInSlot.vehicleVIN.slice(-6)}` : 'Car'}
                            </p>
                          </div>
                        ) : (
                          <div className="my-auto text-xs text-[var(--text-secondary)]">
                            Empty Stowing Bay Slot
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            TAB 2: TRANSIT CHECKPOINTS & MULTI-MODAL MILESTONES
            ========================================================= */}
        {activeTab === 'transit' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[var(--panel)] border border-[var(--border)]">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-4">
                End-to-End Multi-Modal Transit Milestones
              </span>

              <div className="space-y-4 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border)]">
                {/* Milestone 1: Yard Intake */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500 text-emerald-500 flex items-center justify-center shrink-0 z-10 bg-[var(--panel)]">
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">1. Yard Receipt & Intake Inspection</h4>
                      <span className="text-[10px] font-mono text-emerald-500 font-bold">COMPLETED</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      Vehicle checked into USA East Coast Yard. Title status verified and 2D damage inspection blueprint logged.
                    </p>
                  </div>
                </div>

                {/* Milestone 2: Inland Dispatch */}
                <div className="flex items-start gap-4 relative">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 bg-[var(--panel)] ${
                    activeDispatch ? 'bg-blue-500/10 border-blue-500 text-blue-500' : 'bg-neutral-500/10 border-neutral-500 text-neutral-400'
                  }`}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">2. Inland Carrier Dispatch & Port Transfer</h4>
                      <span className={`text-[10px] font-mono font-bold ${activeDispatch ? 'text-blue-500' : 'text-neutral-400'}`}>
                        {activeDispatch?.status || 'PENDING ASSIGNMENT'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      Carrier: <strong>{activeDispatch?.company?.name || 'Awaiting Carrier'}</strong> • Route: {activeDispatch?.origin || 'Yard'} → {activeDispatch?.destination || 'Port'}
                    </p>
                  </div>
                </div>

                {/* Milestone 3: Ocean Stowing & Port Gate-In */}
                <div className="flex items-start gap-4 relative">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 z-10 bg-[var(--panel)] ${
                    activeContainer ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500' : 'bg-neutral-500/10 border-neutral-500 text-neutral-400'
                  }`}>
                    <Ship className="w-4 h-4" />
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">3. Ocean Container Stowing & Vessel Loading</h4>
                      <span className={`text-[10px] font-mono font-bold ${activeContainer ? 'text-indigo-400' : 'text-neutral-400'}`}>
                        {activeContainer?.status || 'NOT STOWED'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      Container: <strong>{activeContainer?.containerNumber || 'TBD'}</strong> • Vessel: {activeContainer?.vesselName || 'Ocean Carrier'}
                    </p>
                  </div>
                </div>

                {/* Milestone 4: Customs & Destination Release */}
                <div className="flex items-start gap-4 relative">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center shrink-0 z-10 bg-[var(--panel)]">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="flex-1 p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">4. Port Discharge & Customs Clearance</h4>
                      <span className="text-[10px] font-mono text-emerald-500 font-bold">TERMINAL FINAL</span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                      Destination Terminal: <strong>{activeContainer?.destinationPort || activeShipment?.destinationPort || 'Port of Jebel Ali (AEJEA)'}</strong>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 3: CONNECTED CARGO & VEHICLE SPECIFICATIONS
            ========================================================= */}
        {activeTab === 'cargo' && (
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
              Vehicles Assigned to this Lineage ({connectedShipments.length})
            </span>

            <div className="space-y-2">
              {connectedShipments.length === 0 ? (
                <div className="p-6 text-center text-xs text-[var(--text-secondary)] border border-dashed rounded-xl">
                  No vehicles assigned to this entity yet.
                </div>
              ) : (
                connectedShipments.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-[var(--text-primary)]">
                        {s.vehicleYear || ''} {s.vehicleMake || ''} {s.vehicleModel || ''}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">
                        <span>VIN: {s.vehicleVIN || 'N/A'}</span>
                        {s.lotNumber && <span>• Lot #{s.lotNumber}</span>}
                      </div>
                      <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        {s.hasKey ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                            Keys OK
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-neutral-500/10 text-neutral-400">
                            No Keys
                          </span>
                        )}
                        {s.hasTitle ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                            Title OK
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500">
                            Title Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {onInspectDamage && (
                        <button
                          type="button"
                          onClick={() => onInspectDamage(s)}
                          className="px-2 py-1 rounded-lg text-xs font-bold bg-[var(--panel)] border text-[var(--accent-gold)] hover:brightness-110 flex items-center gap-1"
                        >
                          <Car className="w-3 h-3" />
                          <span>Blueprint</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleJumpTo('shipment', s.id)}
                        className="px-2 py-1 rounded-lg text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Wireframe</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          <span className="text-[11px] text-[var(--text-secondary)] font-mono">
            Interactive Node ID: {currentId}
          </span>
          <Button variant="outline" onClick={onClose}>
            Close Wireframe
          </Button>
        </div>
      </div>
    </Modal>
  );
}
