'use client';

import React, { useMemo, useState } from 'react';
import {
  Compass,
  MapPin,
  Navigation,
  Radio,
  Ship,
  Truck,
  Anchor,
  Clock,
  Waves,
  Wind,
  Layers,
  Maximize2,
  CalendarCheck,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Eye,
  Info,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { StatusBadge } from '@/components/design-system';
import type { Shipment } from '@/components/shipments/shipment-detail-types';

function formatShortDate(value: Date | string | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

// Dynamically import LiveSeaRouteMap to avoid SSR issues with Leaflet
const LiveSeaRouteMap = dynamic(
  () => import('@/components/dashboard/LiveSeaRouteMap').then((mod) => mod.LiveSeaRouteMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[450px] w-full items-center justify-center rounded-2xl border border-[var(--border)] bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent-gold)] border-t-transparent" />
          <p className="text-sm font-medium">Initializing live satellite navigation system...</p>
        </div>
      </div>
    ),
  }
);

interface ShipmentLiveMapPanelProps {
  shipment: Shipment;
  className?: string;
  isExpandedView?: boolean;
}

export default function ShipmentLiveMapPanel({
  shipment,
  className = '',
  isExpandedView = false,
}: ShipmentLiveMapPanelProps) {
  const [viewMode, setViewMode] = useState<'ais-radar' | 'multimodal'>('ais-radar');

  // Determine origin, destination, and movement stage
  const originPort = useMemo(() => {
    return (
      shipment.container?.loadingPort ||
      shipment.dispatch?.origin ||
      shipment.purchaseLocation ||
      'Port of Newark (USNWK)'
    );
  }, [shipment.container?.loadingPort, shipment.dispatch?.origin, shipment.purchaseLocation]);

  const destinationPort = useMemo(() => {
    return (
      shipment.container?.destinationPort ||
      shipment.transit?.destination ||
      'Port of Jebel Ali (AEJEA)'
    );
  }, [shipment.container?.destinationPort, shipment.transit?.destination]);

  const vesselName = useMemo(() => {
    return shipment.container?.vesselName || (shipment.containerId ? 'MAERSK VOYAGER' : 'Carrier Transport');
  }, [shipment.container?.vesselName, shipment.containerId]);

  const voyageNumber = useMemo(() => {
    return shipment.container?.voyageNumber || 'V-2409W';
  }, [shipment.container?.voyageNumber]);

  const containerNumber = useMemo(() => {
    return (
      shipment.container?.containerNumber ||
      shipment.dispatch?.referenceNumber ||
      shipment.transit?.referenceNumber ||
      `SHP-${shipment.id.slice(-6).toUpperCase()}`
    );
  }, [
    shipment.container?.containerNumber,
    shipment.dispatch?.referenceNumber,
    shipment.transit?.referenceNumber,
    shipment.id,
  ]);

  // Compute calculated progress
  const progressPercent = useMemo(() => {
    if (typeof shipment.container?.progress === 'number' && shipment.container.progress > 0) {
      return Math.min(Math.max(shipment.container.progress, 0), 100);
    }
    if (shipment.status === 'DELIVERED') return 100;
    if (shipment.status === 'RELEASED') return 90;
    if (shipment.status === 'IN_TRANSIT') return 65;
    if (shipment.status === 'DISPATCHING') return 25;
    if (shipment.status === 'ON_HAND') return 10;
    return 15;
  }, [shipment.container?.progress, shipment.status]);

  const departureDate = useMemo(() => {
    return (
      shipment.container?.departureDate ||
      shipment.container?.loadingDate ||
      shipment.createdAt
    );
  }, [shipment.container?.departureDate, shipment.container?.loadingDate, shipment.createdAt]);

  const estimatedArrival = useMemo(() => {
    return (
      shipment.container?.estimatedArrival ||
      shipment.transit?.estimatedDelivery ||
      null
    );
  }, [shipment.container?.estimatedArrival, shipment.transit?.estimatedDelivery]);

  const currentLocationLabel = useMemo(() => {
    if (shipment.container?.currentLocation) {
      return shipment.container.currentLocation;
    }
    if (shipment.status === 'DELIVERED') return 'Delivered at destination';
    if (shipment.status === 'RELEASED') return 'Port of Arrival / Customs Clearance';
    if (shipment.status === 'IN_TRANSIT') return 'En Route - International Waters';
    if (shipment.status === 'DISPATCHING') return 'Inland Transit to Port';
    return 'Origin Yard / Loading';
  }, [shipment.container?.currentLocation, shipment.status]);

  const activeStage = useMemo<'dispatch' | 'sea' | 'transit' | 'delivered'>(() => {
    if (shipment.status === 'DELIVERED') return 'delivered';
    if (shipment.transitId || shipment.status === 'RELEASED') return 'transit';
    if (shipment.containerId || shipment.status === 'IN_TRANSIT') return 'sea';
    return 'dispatch';
  }, [shipment.status, shipment.transitId, shipment.containerId]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header Info Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-4 text-white shadow-xl sm:p-5">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-[var(--accent-gold)]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/70 text-cyan-400 shadow-inner">
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-500" />
              </span>
              <Radio className="h-5 w-5 animate-pulse" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  Live Shipment Location Map
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  AIS Telemetry Live
                </span>
                <StatusBadge status={shipment.status} size="sm" />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Current: </span>
                  <strong className="text-white">{currentLocationLabel}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Ship className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                  <span>Vessel: </span>
                  <strong className="text-white">{vesselName}</strong>
                </span>
                {shipment.container?.containerNumber && (
                  <span className="font-mono text-slate-400">
                    Container: <strong className="text-slate-200">{shipment.container.containerNumber}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* View mode toggle button */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('ais-radar')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                  viewMode === 'ais-radar'
                    ? 'bg-cyan-500 font-bold text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Radio className="h-3.5 w-3.5" />
                <span>Live AIS Map</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('multimodal')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                  viewMode === 'multimodal'
                    ? 'bg-[var(--accent-gold)] font-bold text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Compass className="h-3.5 w-3.5" />
                <span>Corridor Route</span>
              </button>
            </div>
          </div>
        </div>

        {/* Route Corridor Quick Summary Strip */}
        <div className="relative z-10 mt-4 grid grid-cols-1 gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 sm:grid-cols-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-emerald-400">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Origin Port / Yard</p>
              <p className="truncate text-xs font-semibold text-white">{originPort}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-cyan-400">
              <Navigation className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Transit Progress</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-[var(--accent-gold)] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-cyan-300">{progressPercent}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-[var(--accent-gold)]">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Destination & ETA</p>
              <p className="truncate text-xs font-semibold text-white">
                {destinationPort} {estimatedArrival ? `• ${formatShortDate(estimatedArrival)}` : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Map Component */}
      {viewMode === 'ais-radar' ? (
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-slate-950 shadow-lg">
          <LiveSeaRouteMap
            containerNumber={containerNumber}
            originPort={originPort}
            destinationPort={destinationPort}
            vesselName={vesselName}
            voyageNumber={voyageNumber}
            currentProgressPct={progressPercent}
            departureDate={departureDate}
            estimatedArrival={estimatedArrival}
            status={shipment.status}
          />
        </div>
      ) : (
        /* Multimodal Corridor Overview */
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-slate-950 p-6 text-white shadow-lg">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-white">Multimodal Global Corridor</h4>
                <p className="text-xs text-slate-400">
                  End-to-end transportation journey from USA Yard to Destination Hub
                </p>
              </div>
              <span className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-300">
                {activeStage === 'sea'
                  ? 'Stage 2/3: Ocean Transit'
                  : activeStage === 'transit'
                  ? 'Stage 3/3: Destination Delivery'
                  : activeStage === 'delivered'
                  ? 'Completed'
                  : 'Stage 1/3: Inland Dispatch'}
              </span>
            </div>

            {/* Stages Step Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Leg 1: Inland Dispatch */}
              <div
                className={`relative rounded-xl border p-4 transition-all ${
                  activeStage === 'dispatch'
                    ? 'border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
                    : progressPercent > 30
                    ? 'border-emerald-500/30 bg-slate-900/40'
                    : 'border-slate-800 bg-slate-900/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      progressPercent > 30
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : activeStage === 'dispatch'
                        ? 'bg-cyan-900/50 text-cyan-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leg 1</span>
                    <h5 className="text-sm font-semibold text-white">Inland Dispatch</h5>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  <p>
                    <strong>Origin:</strong> {shipment.dispatch?.origin || shipment.purchaseLocation || 'USA Auction Yard'}
                  </p>
                  <p>
                    <strong>Port:</strong> {shipment.dispatch?.destination || originPort}
                  </p>
                  {shipment.dispatch?.referenceNumber && (
                    <p className="font-mono text-slate-400">Ref: {shipment.dispatch.referenceNumber}</p>
                  )}
                </div>
              </div>

              {/* Leg 2: Ocean Sea Transit */}
              <div
                className={`relative rounded-xl border p-4 transition-all ${
                  activeStage === 'sea'
                    ? 'border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
                    : progressPercent > 75
                    ? 'border-emerald-500/30 bg-slate-900/40'
                    : 'border-slate-800 bg-slate-900/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      progressPercent > 75
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : activeStage === 'sea'
                        ? 'bg-cyan-900/50 text-cyan-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Ship className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leg 2</span>
                    <h5 className="text-sm font-semibold text-white">Ocean Sea Transit</h5>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  <p>
                    <strong>Port:</strong> {originPort} → {destinationPort}
                  </p>
                  <p>
                    <strong>Vessel:</strong> {vesselName} ({voyageNumber})
                  </p>
                  <p className="font-mono text-slate-400">Container: {containerNumber}</p>
                </div>
              </div>

              {/* Leg 3: Destination Land Transit */}
              <div
                className={`relative rounded-xl border p-4 transition-all ${
                  activeStage === 'transit'
                    ? 'border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-500/10'
                    : activeStage === 'delivered'
                    ? 'border-emerald-500/30 bg-slate-900/40'
                    : 'border-slate-800 bg-slate-900/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      activeStage === 'delivered'
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : activeStage === 'transit'
                        ? 'bg-cyan-900/50 text-cyan-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    <Anchor className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Leg 3</span>
                    <h5 className="text-sm font-semibold text-white">Destination Transit</h5>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-slate-300">
                  <p>
                    <strong>Route:</strong> {shipment.transit?.origin || 'UAE / Port Hub'} → {shipment.transit?.destination || 'Islam Qala / Afghanistan'}
                  </p>
                  <p>
                    <strong>Status:</strong> {shipment.transit?.status || 'Awaiting Release'}
                  </p>
                  {shipment.transit?.referenceNumber && (
                    <p className="font-mono text-slate-400">Ref: {shipment.transit.referenceNumber}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
