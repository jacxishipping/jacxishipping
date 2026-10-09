'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Truck, 
  Anchor, 
  Ship, 
  FileCheck, 
  CheckCircle2, 
  Key, 
  FileText, 
  PanelRightOpen, 
  ArrowRight, 
  ArrowLeft, 
  Layers, 
  MapPin, 
  DollarSign, 
  Sparkles,
  GripVertical
} from 'lucide-react';
import { CopyButton, Tooltip, toast } from '@/components/design-system';
import type { Shipment } from '@/components/shipments/shipment-list-types';

export interface KanbanColumnDef {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  statuses: string[];
  colorTheme: {
    bg: string;
    text: string;
    border: string;
    badgeBg: string;
  };
  nextStatus?: string;
  prevStatus?: string;
}

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    id: 'on_hand',
    title: '1. On-Hand / Auction',
    icon: ShoppingBag,
    statuses: ['ON_HAND'],
    colorTheme: {
      bg: 'rgba(212, 175, 55, 0.06)',
      text: 'var(--accent-gold)',
      border: 'rgba(212, 175, 55, 0.25)',
      badgeBg: 'rgba(212, 175, 55, 0.15)',
    },
    nextStatus: 'DISPATCHING',
  },
  {
    id: 'dispatching',
    title: '2. Inland Dispatch',
    icon: Truck,
    statuses: ['DISPATCHING', 'DISPATCHED'],
    colorTheme: {
      bg: 'rgba(245, 158, 11, 0.06)',
      text: '#F59E0B',
      border: 'rgba(245, 158, 11, 0.25)',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
    },
    prevStatus: 'ON_HAND',
    nextStatus: 'ARRIVED_AT_PORT',
  },
  {
    id: 'port_yard',
    title: '3. Port Yard Intake',
    icon: Anchor,
    statuses: ['ARRIVED_AT_PORT'],
    colorTheme: {
      bg: 'rgba(20, 184, 166, 0.06)',
      text: '#14B8A6',
      border: 'rgba(20, 184, 166, 0.25)',
      badgeBg: 'rgba(20, 184, 166, 0.15)',
    },
    prevStatus: 'DISPATCHING',
    nextStatus: 'IN_TRANSIT',
  },
  {
    id: 'ocean_transit',
    title: '4. Ocean Transit',
    icon: Ship,
    statuses: ['LOADED_IN_CONTAINER', 'IN_TRANSIT'],
    colorTheme: {
      bg: 'rgba(59, 130, 246, 0.06)',
      text: '#3B82F6',
      border: 'rgba(59, 130, 246, 0.25)',
      badgeBg: 'rgba(59, 130, 246, 0.15)',
    },
    prevStatus: 'ARRIVED_AT_PORT',
    nextStatus: 'RELEASED',
  },
  {
    id: 'customs_released',
    title: '5. Customs / Released',
    icon: FileCheck,
    statuses: ['CUSTOMS_CLEARANCE', 'RELEASED'],
    colorTheme: {
      bg: 'rgba(139, 92, 246, 0.06)',
      text: '#8B5CF6',
      border: 'rgba(139, 92, 246, 0.25)',
      badgeBg: 'rgba(139, 92, 246, 0.15)',
    },
    prevStatus: 'IN_TRANSIT',
    nextStatus: 'DELIVERED',
  },
  {
    id: 'delivered',
    title: '6. Delivered',
    icon: CheckCircle2,
    statuses: ['IN_TRANSIT_TO_DESTINATION', 'DELIVERED'],
    colorTheme: {
      bg: 'rgba(16, 185, 129, 0.06)',
      text: '#10B981',
      border: 'rgba(16, 185, 129, 0.25)',
      badgeBg: 'rgba(16, 185, 129, 0.15)',
    },
    prevStatus: 'RELEASED',
  },
];

interface ShipmentKanbanBoardProps {
  shipments: Shipment[];
  onMoveShipment?: (shipmentId: string, newStatus: string) => Promise<void> | void;
  onQuickPeek?: (shipmentId: string) => void;
  canManageShipments?: boolean;
}

export function ShipmentKanbanBoard({
  shipments,
  onMoveShipment,
  onQuickPeek,
  canManageShipments = true,
}: ShipmentKanbanBoardProps) {
  const [draggedShipmentId, setDraggedShipmentId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<string | null>(null);
  const [movingShipmentId, setMovingShipmentId] = useState<string | null>(null);

  // Group shipments by column definition
  const columnsData = useMemo(() => {
    return KANBAN_COLUMNS.map((col) => {
      const items = shipments.filter((s) => {
        if (col.id === 'port_yard') {
          return s.status === 'ARRIVED_AT_PORT' || (s.yardReceived && s.status === 'DISPATCHED');
        }
        return col.statuses.includes(s.status);
      });
      return {
        ...col,
        items,
      };
    });
  }, [shipments]);

  // Handle Drag Start
  const handleDragStart = (e: React.DragEvent, shipmentId: string) => {
    e.dataTransfer.setData('text/plain', shipmentId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedShipmentId(shipmentId);
  };

  // Handle Drag Over
  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== colId) {
      setActiveDropColumn(colId);
    }
  };

  // Handle Drag Leave
  const handleDragLeave = (e: React.DragEvent, colId: string) => {
    if (activeDropColumn === colId) {
      setActiveDropColumn(null);
    }
  };

  // Handle Drop
  const handleDrop = async (e: React.DragEvent, targetCol: KanbanColumnDef) => {
    e.preventDefault();
    setActiveDropColumn(null);
    setDraggedShipmentId(null);

    const shipmentId = e.dataTransfer.getData('text/plain');
    if (!shipmentId || !targetCol.statuses[0] || !onMoveShipment) return;

    const shipment = shipments.find((s) => s.id === shipmentId);
    if (!shipment || targetCol.statuses.includes(shipment.status)) return;

    const newStatus = targetCol.statuses[0];
    try {
      setMovingShipmentId(shipmentId);
      await onMoveShipment(shipmentId, newStatus);
    } catch {
      toast.error('Failed to update stage');
    } finally {
      setMovingShipmentId(null);
    }
  };

  // 1-Click Move Button Handler
  const handleStepMove = async (shipment: Shipment, targetStatus?: string) => {
    if (!targetStatus || !onMoveShipment) return;
    try {
      setMovingShipmentId(shipment.id);
      await onMoveShipment(shipment.id, targetStatus);
    } catch {
      toast.error('Failed to update stage');
    } finally {
      setMovingShipmentId(null);
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4 pt-1">
      <div className="flex gap-3 min-w-[1300px] items-start">
        {columnsData.map((col) => {
          const IconComponent = col.icon;
          const isDropTarget = activeDropColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col)}
              className={`flex-1 min-w-[210px] rounded-2xl border transition-all duration-200 flex flex-col max-h-[calc(100vh-280px)] ${
                isDropTarget
                  ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/20 shadow-lg'
                  : 'border-[var(--border)] bg-[var(--panel)]'
              }`}
              style={{
                backgroundColor: isDropTarget ? 'var(--background)' : 'var(--panel)',
              }}
            >
              {/* Column Header */}
              <div 
                className="p-3 border-b flex items-center justify-between gap-2 shrink-0 rounded-t-2xl"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: col.colorTheme.bg,
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="p-1.5 rounded-lg shrink-0"
                    style={{
                      backgroundColor: col.colorTheme.badgeBg,
                      color: col.colorTheme.text,
                    }}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {col.title}
                  </span>
                </div>
                <span 
                  className="px-2 py-0.5 rounded-full text-xs font-extrabold tabular-nums border shrink-0"
                  style={{
                    backgroundColor: col.colorTheme.badgeBg,
                    color: col.colorTheme.text,
                    borderColor: col.colorTheme.border,
                  }}
                >
                  {col.items.length}
                </span>
              </div>

              {/* Column Cards List */}
              <div className="p-2 space-y-2 overflow-y-auto flex-1 custom-scrollbar">
                {col.items.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[var(--border)] rounded-xl my-2">
                    <p className="text-[11px] text-[var(--text-secondary)]">No vehicles in this stage</p>
                  </div>
                ) : (
                  col.items.map((shipment) => {
                    const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
                      .filter(Boolean)
                      .join(' ') || shipment.vehicleType || 'Vehicle';
                    const isMoving = movingShipmentId === shipment.id;

                    return (
                      <div
                        key={shipment.id}
                        draggable={canManageShipments}
                        onDragStart={(e) => handleDragStart(e, shipment.id)}
                        className={`group relative rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 shadow-xs transition-all hover:border-[var(--accent-gold)] hover:shadow-md cursor-grab active:cursor-grabbing ${
                          isMoving ? 'opacity-50 pointer-events-none' : ''
                        }`}
                      >
                        {/* Top: Drag handle & Title */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/dashboard/shipments/${shipment.id}`}
                              className="font-bold text-xs text-[var(--text-primary)] hover:text-[var(--accent-gold)] transition-colors truncate block"
                              title={vehicleLabel}
                            >
                              {vehicleLabel}
                            </Link>
                            {shipment.vehicleVIN && (
                              <div className="flex items-center gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                                <span className="font-mono text-[10px] text-[var(--text-secondary)] truncate">
                                  {shipment.vehicleVIN}
                                </span>
                                <CopyButton value={shipment.vehicleVIN} label="VIN" />
                              </div>
                            )}
                          </div>

                          {/* Quick Peek Drawer Trigger */}
                          {onQuickPeek && (
                            <button
                              type="button"
                              onClick={() => onQuickPeek(shipment.id)}
                              title="Quick peek manifest"
                              className="p-1 rounded-md text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:bg-[var(--panel)] transition-colors"
                            >
                              <PanelRightOpen className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Mid: Context Badges */}
                        <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
                          {shipment.lotNumber && (
                            <span className="px-1.5 py-0.5 rounded-md bg-[var(--panel)] border border-[var(--border)] text-[var(--text-secondary)] font-mono">
                              Lot: {shipment.lotNumber}
                            </span>
                          )}

                          {shipment.container?.containerNumber && (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-mono">
                              {shipment.container.containerNumber}
                            </span>
                          )}

                          {shipment.hasKey && (
                            <Tooltip title="Vehicle Key Accounted">
                              <span className="p-0.5 text-emerald-500">
                                <Key className="w-3 h-3" />
                              </span>
                            </Tooltip>
                          )}

                          {shipment.hasTitle && (
                            <Tooltip title="Title / Bill of Sale Verified">
                              <span className="p-0.5 text-blue-500">
                                <FileText className="w-3 h-3" />
                              </span>
                            </Tooltip>
                          )}

                          {shipment.paymentStatus && (
                            <span className={`px-1.5 py-0.5 rounded-md font-semibold ${
                              shipment.paymentStatus === 'PAID'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            }`}>
                              {shipment.paymentStatus}
                            </span>
                          )}
                        </div>

                        {/* Bottom: Fast Stage Shift Controls */}
                        {canManageShipments && (
                          <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex items-center justify-between text-[11px]">
                            {col.prevStatus ? (
                              <button
                                type="button"
                                onClick={() => handleStepMove(shipment, col.prevStatus)}
                                className="inline-flex items-center gap-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel)] px-1.5 py-0.5 rounded-md transition-colors"
                                title="Move back 1 stage"
                              >
                                <ArrowLeft className="w-3 h-3" />
                                <span className="text-[10px]">Back</span>
                              </button>
                            ) : <span />}

                            {col.nextStatus ? (
                              <button
                                type="button"
                                onClick={() => handleStepMove(shipment, col.nextStatus)}
                                className="inline-flex items-center gap-0.5 text-[var(--accent-gold)] font-semibold hover:bg-[rgba(var(--accent-gold-rgb),0.12)] px-2 py-0.5 rounded-md transition-colors ml-auto"
                                title="Advance to next stage"
                              >
                                <span className="text-[10px]">Advance</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 ml-auto">
                                <CheckCircle2 className="w-3 h-3" />
                                Completed
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
