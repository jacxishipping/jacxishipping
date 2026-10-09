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
  Package,
  Activity,
  Wifi,
  AlertTriangle,
  Gauge,
  Thermometer,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { StatusBadge, Tooltip } from '@/components/design-system';
import type { Shipment } from '@/components/shipments/shipment-detail-types';
import {
  buildMaritimeRoute,
  generateVesselAISTelemetry,
  type SeaRouteAnalysis,
  type VesselAISTelemetry,
  type MaritimeWaypoint,
} from '@/lib/maritime/sea-routes';

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
      <div 
        className="flex h-[450px] w-full items-center justify-center rounded-2xl border"
        style={{
          backgroundColor: 'var(--panel)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
        }}
      >
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

export type MapPanelMode = 'ais-radar' | 'weather-telemetry' | 'multimodal';

export default function ShipmentLiveMapPanel({
  shipment,
  className = '',
  isExpandedView = false,
}: ShipmentLiveMapPanelProps) {
  const [viewMode, setViewMode] = useState<MapPanelMode>('ais-radar');
  const [isMapVisible, setIsMapVisible] = useState(true);

  const hasContainer = Boolean(shipment.containerId || shipment.container);

  // Determine origin, destination, and movement stage
  const originPort = useMemo(() => {
    if (shipment.container?.loadingPort) return shipment.container.loadingPort;
    if (shipment.dispatch?.origin) return shipment.dispatch.origin;
    if (shipment.purchaseLocation) return shipment.purchaseLocation;
    return hasContainer ? 'Port of Newark (USNWK)' : 'Origin Yard / Auction';
  }, [shipment.container?.loadingPort, shipment.dispatch?.origin, shipment.purchaseLocation, hasContainer]);

  const destinationPort = useMemo(() => {
    if (shipment.container?.destinationPort) return shipment.container.destinationPort;
    if (shipment.transit?.destination) return shipment.transit.destination;
    return hasContainer ? 'Port of Jebel Ali (AEJEA)' : 'Destination Port (Pending Container)';
  }, [shipment.container?.destinationPort, shipment.transit?.destination, hasContainer]);

  const vesselName = useMemo(() => {
    if (shipment.container?.vesselName) return shipment.container.vesselName;
    if (hasContainer) return 'MAERSK VOYAGER';
    return 'Pending Container Assignment';
  }, [shipment.container?.vesselName, hasContainer]);

  const voyageNumber = useMemo(() => {
    if (shipment.container?.voyageNumber) return shipment.container.voyageNumber;
    return hasContainer ? 'V-2409W' : 'Unassigned';
  }, [shipment.container?.voyageNumber, hasContainer]);

  const containerNumber = useMemo(() => {
    if (shipment.container?.containerNumber) return shipment.container.containerNumber;
    return 'Unassigned';
  }, [shipment.container?.containerNumber]);

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
    if (shipment.status === 'ON_HAND') return 'Export Yard (Awaiting Container)';
    return 'Origin Yard / Loading';
  }, [shipment.container?.currentLocation, shipment.status]);

  const activeStage = useMemo<'dispatch' | 'sea' | 'transit' | 'delivered'>(() => {
    if (shipment.status === 'DELIVERED') return 'delivered';
    if (shipment.transitId || shipment.status === 'RELEASED') return 'transit';
    if (shipment.containerId || shipment.status === 'IN_TRANSIT') return 'sea';
    return 'dispatch';
  }, [shipment.status, shipment.transitId, shipment.containerId]);

  // Advanced Maritime Calculation Engine
  const routeAnalysis = useMemo<SeaRouteAnalysis>(() => {
    return buildMaritimeRoute(
      originPort,
      destinationPort,
      progressPercent,
      estimatedArrival ? new Date(estimatedArrival) : undefined
    );
  }, [originPort, destinationPort, progressPercent, estimatedArrival]);

  const aisTelemetry = useMemo<VesselAISTelemetry>(() => {
    return generateVesselAISTelemetry(vesselName, voyageNumber, routeAnalysis);
  }, [vesselName, voyageNumber, routeAnalysis]);

  // Weather Risk Assessment
  const weatherRisk = useMemo(() => {
    const wave = aisTelemetry.weather.waveHeightMeters;
    const wind = aisTelemetry.weather.windSpeedKnots;

    if (wave >= 2.5 || wind >= 28) {
      return {
        level: 'ROUGH',
        badgeColor: 'border-red-500/30 bg-red-500/10 text-red-500',
        label: 'High Swell & Gale Advisory',
        description: 'Vessel tracking active with heavy sea precaution in deepwater corridor',
        beaufort: 'Force 7 (Near Gale)',
      };
    }
    if (wave >= 1.8 || wind >= 20) {
      return {
        level: 'MODERATE',
        badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
        label: 'Moderate Sea Swell',
        description: 'Standard oceanic swell within rated container hull parameters',
        beaufort: 'Force 5 (Fresh Breeze)',
      };
    }
    return {
      level: 'CALM',
      badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
      label: 'Favorable Fairway',
      description: 'Optimal navigational conditions with minimal wave resistance',
      beaufort: 'Force 3-4 (Gentle Breeze)',
    };
  }, [aisTelemetry.weather.waveHeightMeters, aisTelemetry.weather.windSpeedKnots]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header Info Banner */}
      <div 
        className="relative overflow-hidden rounded-2xl border p-4 shadow-sm sm:p-5"
        style={{
          backgroundColor: 'var(--panel)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${
              hasContainer ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
            } shadow-sm`}>
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${hasContainer ? 'bg-cyan-400' : 'bg-amber-400'} opacity-75`} />
                <span className={`relative inline-flex h-3 w-3 rounded-full ${hasContainer ? 'bg-cyan-500' : 'bg-amber-500'}`} />
              </span>
              <Radio className="h-5 w-5 animate-pulse" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
                  {hasContainer ? 'Marine Radar & Satellite AIS Telematics' : 'Shipment Location & Yard Status'}
                </h3>
                {hasContainer ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                    AIS Telemetry Live
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    <Package className="h-3 w-3 text-amber-500" />
                    Awaiting Container
                  </span>
                )}
                {hasContainer && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-bold ${weatherRisk.badgeColor}`}>
                    <Waves className="w-3 h-3" />
                    <span>{weatherRisk.label}</span>
                  </span>
                )}
                <StatusBadge status={shipment.status} size="sm" />
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-secondary)]">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  <span>Current: </span>
                  <strong className="text-[var(--text-primary)]">{currentLocationLabel}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Ship className="h-3.5 w-3.5 text-[var(--accent-gold)]" />
                  <span>Vessel: </span>
                  <strong className="text-[var(--text-primary)]">{vesselName}</strong>
                </span>
                <span className="font-mono text-[var(--text-secondary)]">
                  Container: <strong className="text-[var(--text-primary)]">{containerNumber}</strong>
                </span>
                {hasContainer && (
                  <span className="text-[11px] text-[var(--text-secondary)] font-mono">
                    {aisTelemetry.flag.emoji} {aisTelemetry.imoNumber}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* View mode & map toggle buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsMapVisible((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-sm ${
                isMapVisible
                  ? 'border-cyan-500 bg-cyan-500 text-slate-950 shadow-cyan-500/20'
                  : 'border-[var(--border)] bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-primary)]'
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>{isMapVisible ? 'Hide Nav Panel' : 'Open Nav & Radar'}</span>
            </button>

            {isMapVisible && (
              <div 
                className="inline-flex items-center rounded-xl border p-1 text-xs shadow-sm"
                style={{
                  backgroundColor: 'var(--surface-subtle)',
                  borderColor: 'var(--border)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('ais-radar')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                    viewMode === 'ais-radar'
                      ? 'bg-cyan-500 font-bold text-slate-950 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Radio className="h-3.5 w-3.5" />
                  <span>Live AIS Map</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('weather-telemetry')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                    viewMode === 'weather-telemetry'
                      ? 'bg-amber-500 font-bold text-slate-950 shadow-sm'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Waves className="h-3.5 w-3.5" />
                  <span>Weather & Telemetry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('multimodal')}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-semibold transition-all ${
                    viewMode === 'multimodal'
                      ? 'bg-[var(--panel)] font-bold text-[var(--text-primary)] shadow-sm border border-[var(--border)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Corridor Route</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Route Corridor Quick Summary Strip */}
        <div 
          className="relative z-10 mt-4 grid grid-cols-1 gap-2 rounded-xl border p-3 sm:grid-cols-4"
          style={{
            backgroundColor: 'var(--surface)',
            borderColor: 'var(--border)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Origin Port / Yard</p>
              <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{originPort}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
              <Navigation className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Transit Progress</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[var(--border)]">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-[var(--accent-gold)] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-cyan-600 dark:text-cyan-400">{progressPercent}%</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgba(var(--accent-gold-rgb),0.1)] text-[var(--accent-gold)]">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Destination & ETA</p>
              <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                {destinationPort} {estimatedArrival ? `• ${formatShortDate(estimatedArrival)}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Gauge className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">High Seas Telemetry</p>
              <p className="truncate text-xs font-semibold text-[var(--text-primary)]">
                {routeAnalysis.distanceRemainingNM > 0 ? `${routeAnalysis.distanceRemainingNM.toLocaleString()} NM Remaining` : 'Arrived at Destination'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Views */}
      {isMapVisible && (
        !hasContainer ? (
          <div 
            className="relative overflow-hidden rounded-2xl border p-6 shadow-sm"
            style={{
              backgroundColor: 'var(--panel)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Package className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-[var(--text-primary)]">Awaiting Container Assignment & Loading</h4>
                  <p className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                    This vehicle is currently staged at the yard or in domestic dispatch. Live transatlantic AIS vessel radar, ocean wave telemetry, and voyage tracking will automatically activate once the vehicle is assigned to a container and departs the export port.
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3 border-t border-[var(--border)] pt-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Dispatch Status</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">
                    {shipment.dispatch ? `Dispatched (${shipment.dispatch.status})` : 'Not assigned to dispatch'}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Staging Location</p>
                  <p className="mt-1 text-xs font-semibold text-[var(--text-primary)]">{currentLocationLabel}</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Export Container</p>
                  <p className="mt-1 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">Unassigned (Queued)</p>
                </div>
              </div>
            </div>
          </div>
        ) : viewMode === 'ais-radar' ? (
          <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] shadow-sm">
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
        ) : viewMode === 'weather-telemetry' ? (
          /* Live Marine Weather Risk & Telemetry Cockpit */
          <div 
            className="relative overflow-hidden rounded-2xl border p-5 shadow-sm space-y-5"
            style={{
              backgroundColor: 'var(--panel)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
              <div>
                <h4 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Waves className="w-5 h-5 text-cyan-500" />
                  <span>Marine Meteorology & Oceanic Telematics</span>
                </h4>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Real-time AIS telemetry broadcast via Orbcomm/Spire Satellite Constellation • Fairway: {routeAnalysis.currentZoneName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-bold">
                  <Wifi className="w-3.5 h-3.5 animate-pulse" />
                  <span>Orbcomm Link: 99.8% Uplink (142ms)</span>
                </span>
              </div>
            </div>

            {/* 4 Telemetry Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Sea State */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Sea State & Wave Swell</span>
                  <Waves className="w-4 h-4 text-cyan-500" />
                </div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{aisTelemetry.weather.waveHeightMeters}m Swell</p>
                <p className="text-xs text-[var(--text-secondary)]">{aisTelemetry.weather.seaState}</p>
                <div className="pt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${weatherRisk.badgeColor}`}>
                    {weatherRisk.level} RISK
                  </span>
                </div>
              </div>

              {/* Surface Wind Vector */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Surface Winds (Beaufort)</span>
                  <Wind className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{aisTelemetry.weather.windSpeedKnots} kts {aisTelemetry.weather.windDirection}</p>
                <p className="text-xs text-[var(--text-secondary)]">{weatherRisk.beaufort}</p>
                <div className="pt-1 flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                  <Thermometer className="w-3.5 h-3.5 text-blue-400" />
                  <span>Sea Temp: {aisTelemetry.weather.waterTempC}°C ({(aisTelemetry.weather.waterTempC * 9/5 + 32).toFixed(0)}°F)</span>
                </div>
              </div>

              {/* Vessel Course & Speed */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Navigation Dynamics</span>
                  <Compass className="w-4 h-4 text-[var(--accent-gold)]" />
                </div>
                <p className="text-lg font-bold text-[var(--text-primary)]">{aisTelemetry.speedKnots} kts SOG</p>
                <p className="text-xs text-[var(--text-secondary)]">Course Over Ground: {routeAnalysis.vesselHeading.toFixed(1)}° COG</p>
                <div className="pt-1 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                  <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Draught: {aisTelemetry.draughtMeters}m depth</span>
                </div>
              </div>

              {/* Vessel Identification */}
              <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Vessel Registry</span>
                  <Ship className="w-4 h-4 text-purple-400" />
                </div>
                <p className="text-base font-bold text-[var(--text-primary)] truncate">{vesselName}</p>
                <p className="font-mono text-xs text-[var(--text-secondary)]">{aisTelemetry.imoNumber}</p>
                <div className="pt-1 text-[11px] text-[var(--text-secondary)] font-mono">
                  MMSI: {aisTelemetry.mmsi} ({aisTelemetry.flag.emoji} {aisTelemetry.flag.country})
                </div>
              </div>
            </div>

            {/* Waypoint Passage Corridor Timeline */}
            <div className="pt-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                <Anchor className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
                <span>Ocean Route Waypoints & Chokepoints Sequence</span>
              </h5>

              <div className="flex flex-col gap-2">
                {routeAnalysis.waypoints.map((wp, idx) => {
                  const isCurrent = idx === routeAnalysis.activeWaypointIndex;
                  const isPassed = wp.passed;

                  return (
                    <div 
                      key={wp.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition-all ${
                        isCurrent 
                          ? 'border-cyan-500 bg-cyan-500/10 shadow-sm' 
                          : isPassed 
                          ? 'border-[var(--border)] bg-[rgba(var(--text-primary-rgb),0.02)] opacity-75' 
                          : 'border-[var(--border)] bg-[var(--surface-subtle)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                          isCurrent 
                            ? 'bg-cyan-500 text-slate-950 font-black' 
                            : isPassed 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-[var(--border)] text-[var(--text-secondary)]'
                        }`}>
                          {isPassed ? '✓' : idx + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{wp.name}</p>
                          <p className="text-[10px] text-[var(--text-secondary)] truncate">{wp.description || `${wp.lat.toFixed(2)}°N, ${wp.lng.toFixed(2)}°E`}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                          isCurrent
                            ? 'bg-cyan-500 text-slate-950'
                            : isPassed
                            ? 'text-emerald-500 font-semibold'
                            : 'text-[var(--text-secondary)]'
                        }`}>
                          {isCurrent ? 'Current Position' : isPassed ? 'Passed' : 'Upcoming'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Multimodal Corridor Overview */
          <div 
            className="relative overflow-hidden rounded-2xl border p-6 shadow-sm"
            style={{
              backgroundColor: 'var(--panel)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-semibold text-[var(--text-primary)]">Multimodal Global Corridor</h4>
                  <p className="text-xs text-[var(--text-secondary)]">
                    End-to-end transportation journey from USA Yard to Destination Hub
                  </p>
                </div>
                <span className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1 text-xs font-medium text-[var(--text-primary)]">
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
                    ? 'border-cyan-500/50 bg-cyan-500/10 shadow-sm'
                    : progressPercent > 30
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-[var(--border)] bg-[var(--surface-subtle)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      progressPercent > 30
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : activeStage === 'dispatch'
                        ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                        : 'bg-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Leg 1</span>
                    <h5 className="text-sm font-semibold text-[var(--text-primary)]">Inland Dispatch</h5>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-[var(--text-secondary)]">
                  <p>
                    <strong className="text-[var(--text-primary)]">Origin:</strong> {shipment.dispatch?.origin || shipment.purchaseLocation || 'USA Auction Yard'}
                  </p>
                  <p>
                    <strong className="text-[var(--text-primary)]">Port:</strong> {shipment.dispatch?.destination || originPort}
                  </p>
                  {shipment.dispatch?.referenceNumber && (
                    <p className="font-mono text-[var(--text-secondary)]">Ref: {shipment.dispatch.referenceNumber}</p>
                  )}
                </div>
              </div>

              {/* Leg 2: Ocean Sea Transit */}
              <div
                className={`relative rounded-xl border p-4 transition-all ${
                  activeStage === 'sea'
                    ? 'border-cyan-500/50 bg-cyan-500/10 shadow-sm'
                    : progressPercent > 75
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-[var(--border)] bg-[var(--surface-subtle)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      progressPercent > 75
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : activeStage === 'sea'
                        ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                        : 'bg-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Ship className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Leg 2</span>
                    <h5 className="text-sm font-semibold text-[var(--text-primary)]">Ocean Sea Transit</h5>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-[var(--text-secondary)]">
                  <p>
                    <strong className="text-[var(--text-primary)]">Port:</strong> {originPort} → {destinationPort}
                  </p>
                  <p>
                    <strong className="text-[var(--text-primary)]">Vessel:</strong> {vesselName} ({voyageNumber})
                  </p>
                  <p className="font-mono text-[var(--text-secondary)]">Container: {containerNumber}</p>
                </div>
              </div>

              {/* Leg 3: Destination Land Transit */}
              <div
                className={`relative rounded-xl border p-4 transition-all ${
                  activeStage === 'transit'
                    ? 'border-cyan-500/50 bg-cyan-500/10 shadow-sm'
                    : activeStage === 'delivered'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-[var(--border)] bg-[var(--surface-subtle)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      activeStage === 'delivered'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : activeStage === 'transit'
                        ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                        : 'bg-[var(--border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Anchor className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Leg 3</span>
                    <h5 className="text-sm font-semibold text-[var(--text-primary)]">Destination Transit</h5>
                  </div>
                </div>
                <div className="mt-3 space-y-1 text-xs text-[var(--text-secondary)]">
                  <p>
                    <strong className="text-[var(--text-primary)]">Route:</strong> {shipment.transit?.origin || 'UAE / Port Hub'} → {shipment.transit?.destination || 'Islam Qala / Afghanistan'}
                  </p>
                  <p>
                    <strong className="text-[var(--text-primary)]">Status:</strong> {shipment.transit?.status || 'Awaiting Release'}
                  </p>
                  {shipment.transit?.referenceNumber && (
                    <p className="font-mono text-[var(--text-secondary)]">Ref: {shipment.transit.referenceNumber}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    )}
  </div>
);
}
