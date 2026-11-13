'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback, Fragment } from 'react';
import dynamic from 'next/dynamic';
import { 
  Ship, 
  Anchor, 
  Compass, 
  MapPin, 
  Navigation, 
  Clock, 
  Layers, 
  Maximize2, 
  Minimize2,
  Calendar, 
  Radio, 
  Wind, 
  Waves, 
  Play, 
  Pause, 
  RotateCcw, 
  Eye, 
  ChevronRight,
  ShieldCheck,
  Crosshair,
  Gauge
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { 
  buildMaritimeRoute, 
  generateVesselAISTelemetry, 
  type SeaRouteAnalysis, 
  type VesselAISTelemetry,
  type MaritimeWaypoint
} from '@/lib/maritime/sea-routes';
import { aisProviderService, type UnifiedAISPosition } from '@/lib/services/ais-provider';
import { weatherRoutingService, type WeatherRouteOverlay, type OceanWeatherPoint, type StormWarning } from '@/lib/services/weather-routing';

// Dynamic Leaflet imports to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then((mod) => mod.Tooltip),
  { ssr: false }
);

// Map controller for pan / zoom animations
function MapControllerComponent({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const { useMap } = require('react-leaflet');
  const map = useMap();
  
  useEffect(() => {
    if (center && map) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.2 });
    }
  }, [center, zoom, map]);

  return null;
}

const DynamicMapController = dynamic(
  () => Promise.resolve(MapControllerComponent),
  { ssr: false }
);

export interface ContainerTrackSummary {
  id: string;
  containerNumber: string;
  progress: number;
  vesselName?: string | null;
  destinationPort?: string | null;
  status?: string;
}

export interface LiveSeaRouteMapProps {
  containerId?: string;
  containerNumber?: string;
  originPort?: string;
  destinationPort?: string;
  vesselName?: string;
  voyageNumber?: string;
  currentProgressPct?: number; // 0 to 100
  departureDate?: string | Date | null;
  estimatedArrival?: string | Date | null;
  status?: string;
  containersList?: ContainerTrackSummary[];
  selectedContainerId?: string;
  onSelectContainer?: (id: string) => void;
  className?: string;
  defaultTheme?: MapTileTheme;
  containerEvents?: Array<{
    type: string;
    location?: string;
    date?: string | Date;
    description?: string;
  }>;
}

type MapTileTheme = 'nautical-dark' | 'satellite' | 'ocean-light';

export function LiveSeaRouteMap({
  containerNumber = 'MSKU9048123',
  originPort = 'Port of Newark (USNWK)',
  destinationPort = 'Port of Jebel Ali (AEJEA)',
  vesselName = 'MAERSK VOYAGER',
  voyageNumber = 'V-2409W',
  currentProgressPct = 68,
  departureDate,
  estimatedArrival,
  status = 'In Transit',
  containersList = [],
  selectedContainerId,
  onSelectContainer,
  className = '',
  defaultTheme = 'ocean-light',
  containerEvents = [],
}: LiveSeaRouteMapProps) {
  // Scrubber & Playback state
  const [isLiveAIS, setIsLiveAIS] = useState(true);
  const [scrubberProgress, setScrubberProgress] = useState(currentProgressPct);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapTheme, setMapTheme] = useState<MapTileTheme>(defaultTheme);
  const [centerTarget, setCenterTarget] = useState<[number, number] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync scrubber if live progress updates from parent
  useEffect(() => {
    if (isLiveAIS) {
      setScrubberProgress(currentProgressPct);
    }
  }, [currentProgressPct, isLiveAIS]);

  // Compute Maritime Route & Waypoints based on scrubber progress
  const routeAnalysis = useMemo<SeaRouteAnalysis>(() => {
    return buildMaritimeRoute(
      originPort,
      destinationPort,
      scrubberProgress,
      departureDate ? new Date(departureDate) : null,
      estimatedArrival ? new Date(estimatedArrival) : null
    );
  }, [originPort, destinationPort, scrubberProgress, departureDate, estimatedArrival]);

  // Generate AIS Telematics for current position
  const telemetry = useMemo<VesselAISTelemetry>(() => {
    return generateVesselAISTelemetry(vesselName, voyageNumber, routeAnalysis);
  }, [vesselName, voyageNumber, routeAnalysis]);

  // ── AIS Provider Integration State ──
  type AISProviderType = 'marinetraffic' | 'vesselfinder' | 'aishub' | 'simulated';
  const [selectedAISProvider, setSelectedAISProvider] = useState<AISProviderType>('simulated');
  const [realAISPosition, setRealAISPosition] = useState<UnifiedAISPosition | null>(null);
  const [aisProviderStatus, setAisProviderStatus] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');

  // Fetch real AIS data when provider is not simulated
  useEffect(() => {
    if (selectedAISProvider === 'simulated') {
      setRealAISPosition(null);
      setAisProviderStatus('idle');
      return;
    }

    let mounted = true;
    const imo = telemetry.imoNumber ? parseInt(telemetry.imoNumber.replace(/\D/g, ''), 10) : 0;

    const fetchAIS = async () => {
      if (!imo) return;
      setAisProviderStatus('loading');
      try {
        // Configure provider API keys based on selection
        aisProviderService.updateConfig({
          marineTrafficApiKey: process.env.NEXT_PUBLIC_MARINETRAFFIC_API_KEY || '',
          vesselFinderApiKey: process.env.NEXT_PUBLIC_VESSELFINDER_API_KEY || '',
          aisHubApiKey: process.env.NEXT_PUBLIC_AISHUB_API_KEY || '',
        });
        const pos = await aisProviderService.getVesselPosition(imo);
        if (!mounted) return;
        if (pos) {
          setRealAISPosition(pos);
          setAisProviderStatus('active');
        } else {
          setAisProviderStatus('error');
        }
      } catch {
        if (mounted) setAisProviderStatus('error');
      }
    };

    fetchAIS();
    const interval = setInterval(fetchAIS, 120_000); // Poll every 2 minutes
    return () => { mounted = false; clearInterval(interval); };
  }, [selectedAISProvider, telemetry.imoNumber]);

  // ── Weather Routing Integration State ──
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(false);
  const [weatherOverlay, setWeatherOverlay] = useState<WeatherRouteOverlay | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Fetch weather data when overlay is enabled
  useEffect(() => {
    if (!showWeatherOverlay) return;

    let mounted = true;
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        const waypoints = routeAnalysis.waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng }));
        const overlay = await weatherRoutingService.getRouteWeather(
          waypoints,
          routeAnalysis.vesselCurrentPos.lat,
          routeAnalysis.vesselCurrentPos.lng
        );
        if (!mounted) return;
        if (overlay) setWeatherOverlay(overlay);
      } catch {
        // Silently fail
      } finally {
        if (mounted) setWeatherLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 600_000); // Refresh every 10 minutes
    return () => { mounted = false; clearInterval(interval); };
  }, [showWeatherOverlay, routeAnalysis.waypoints, routeAnalysis.vesselCurrentPos.lat, routeAnalysis.vesselCurrentPos.lng]);

  // ── Historical Track Playback State ──
  const [isHistoricalPlayback, setIsHistoricalPlayback] = useState(false);
  const [historicalPositions, setHistoricalPositions] = useState<Array<{ lat: number; lng: number; timestamp: Date; speedKnots: number }>>([]);
  const [historicalPlaybackIndex, setHistoricalPlaybackIndex] = useState(0);
  const [historicalPlaybackDate, setHistoricalPlaybackDate] = useState<Date>(new Date());
  const historicalPlaybackRef = useRef<number | null>(null);

  // Generate historical track positions from the route when entering playback mode
  const startHistoricalPlayback = useCallback(() => {
    const coords = routeAnalysis.denseRouteCoordinates;
    if (coords.length < 2) return;

    // Generate historical positions along the route with timestamps
    const now = new Date();
    const totalDurationMs = 30 * 24 * 60 * 60 * 1000; // 30 days of historical data
    const positions = coords.map((coord, i) => {
      const frac = i / Math.max(1, coords.length - 1);
      return {
        lat: coord[0],
        lng: coord[1],
        timestamp: new Date(now.getTime() - totalDurationMs * (1 - frac)),
        speedKnots: telemetry.speedKnots * (0.7 + Math.random() * 0.6),
      };
    });

    setHistoricalPositions(positions);
    setHistoricalPlaybackIndex(0);
    setHistoricalPlaybackDate(positions[0]?.timestamp || new Date());
    setIsHistoricalPlayback(true);
    setIsLiveAIS(false);
    setIsPlaying(false);
  }, [routeAnalysis.denseRouteCoordinates, telemetry.speedKnots]);

  // Historical playback animation loop
  useEffect(() => {
    if (!isHistoricalPlayback || historicalPositions.length === 0) return;

    const animate = () => {
      setHistoricalPlaybackIndex(prev => {
        const next = prev + playbackSpeed;
        if (next >= historicalPositions.length - 1) {
          setIsHistoricalPlayback(false);
          return historicalPositions.length - 1;
        }
        setHistoricalPlaybackDate(historicalPositions[Math.min(next, historicalPositions.length - 1)]?.timestamp || new Date());
        return next;
      });
    };

    const interval = window.setInterval(animate, 200);
    return () => window.clearInterval(interval);
  }, [isHistoricalPlayback, historicalPositions.length, playbackSpeed]);

  // Sync scrubber with historical playback position
  useEffect(() => {
    if (isHistoricalPlayback && historicalPositions.length > 1) {
      const progress = (historicalPlaybackIndex / (historicalPositions.length - 1)) * 100;
      setScrubberProgress(progress);
    }
  }, [isHistoricalPlayback, historicalPlaybackIndex, historicalPositions.length]);

  // Stop historical playback
  const stopHistoricalPlayback = useCallback(() => {
    setIsHistoricalPlayback(false);
    setHistoricalPositions([]);
    setHistoricalPlaybackIndex(0);
    setIsLiveAIS(true);
    setScrubberProgress(currentProgressPct);
  }, [currentProgressPct]);

  // Live ETA countdown timer ticking every second
  const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const updateCountdown = () => {
      const targetTime = routeAnalysis.etaDate.getTime();
      const diff = Math.max(0, targetTime - Date.now());

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);

      setTimeRemaining({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [routeAnalysis.etaDate]);

  // Voyage animation playback loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setScrubberProgress((prev) => {
        if (prev >= 100) {
          setIsPlaying(false);
          return 100;
        }
        return Math.min(100, prev + 0.3 * playbackSpeed);
      });
      setIsLiveAIS(false);
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  // Split dense route coordinates into Traveled vs Remaining
  const { traveledCoords, remainingCoords } = useMemo(() => {
    const all = routeAnalysis.denseRouteCoordinates;
    if (all.length === 0) return { traveledCoords: [], remainingCoords: [] };

    const splitIndex = Math.min(
      all.length - 1,
      Math.max(0, Math.floor((scrubberProgress / 100) * all.length))
    );

    return {
      traveledCoords: all.slice(0, splitIndex + 1),
      remainingCoords: all.slice(splitIndex),
    };
  }, [routeAnalysis.denseRouteCoordinates, scrubberProgress]);

  // Recenter map on vessel
  const handleCenterOnVessel = useCallback(() => {
    setCenterTarget([routeAnalysis.vesselCurrentPos.lat, routeAnalysis.vesselCurrentPos.lng]);
  }, [routeAnalysis.vesselCurrentPos]);

  // Reset to Live AIS
  const handleResetToLive = () => {
    setIsPlaying(false);
    setIsLiveAIS(true);
    setScrubberProgress(currentProgressPct);
    handleCenterOnVessel();
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Status-based color configuration
  const statusColor = useMemo(() => {
    const s = (status || '').toLowerCase();
    if (s.includes('arrived') || s.includes('released') || s.includes('customs') || s.includes('closed')) return { ring: '#10b981', bg: '#065f46', border: '#10b981', glow: 'rgba(16,185,129,0.8)', text: '#10b981' };
    if (s.includes('transit') || s.includes('loaded') || s.includes('depart')) return { ring: '#06b6d4', bg: '#164e63', border: '#06b6d4', glow: 'rgba(6,182,212,0.8)', text: '#06b6d4' };
    if (s.includes('delay') || s.includes('hold') || s.includes('issue')) return { ring: '#ef4444', bg: '#7f1d1d', border: '#ef4444', glow: 'rgba(239,68,68,0.8)', text: '#ef4444' };
    if (s.includes('wait') || s.includes('created') || s.includes('pick')) return { ring: '#f59e0b', bg: '#78350f', border: '#f59e0b', glow: 'rgba(245,158,11,0.8)', text: '#f59e0b' };
    return { ring: '#06b6d4', bg: '#164e63', border: '#06b6d4', glow: 'rgba(6,182,212,0.8)', text: '#06b6d4' };
  }, [status]);

  // Custom Leaflet Icons
  const vesselIcon = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');

    const svgHtml = renderToStaticMarkup(
      <div className="relative flex items-center justify-center">
        {/* Pulsing Sonar Rings */}
        <div className="absolute w-12 h-12 rounded-full animate-ping" style={{ backgroundColor: `${statusColor.ring}40` }} />
        <div className="absolute w-8 h-8 rounded-full animate-pulse" style={{ backgroundColor: `${statusColor.ring}50` }} />
        
        {/* Vessel Body with Directional Heading Arrow */}
        <div 
          className="relative w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform duration-300"
          style={{ 
            backgroundColor: statusColor.bg, 
            borderColor: statusColor.border,
            boxShadow: `0 0 15px ${statusColor.glow}`,
            transform: `rotate(${telemetry.headingDegrees}deg)`
          }}
        >
          <Navigation className="w-4 h-4 fill-current" style={{ color: statusColor.text }} />
        </div>
      </div>
    );

    return L.divIcon({
      html: svgHtml,
      className: 'vessel-marker-icon',
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
    });
  }, [telemetry.headingDegrees, statusColor]);

  const originIcon = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');

    const svgHtml = renderToStaticMarkup(
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white border-2 border-white shadow-lg">
        <Anchor className="w-3.5 h-3.5" />
      </div>
    );

    return L.divIcon({
      html: svgHtml,
      className: 'origin-marker-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  }, []);

  const destinationIcon = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');

    const svgHtml = renderToStaticMarkup(
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-950 font-bold border-2 border-white shadow-lg">
        <MapPin className="w-4 h-4 fill-current" />
      </div>
    );

    return L.divIcon({
      html: svgHtml,
      className: 'dest-marker-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
  }, []);

  const waypointIcon = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const L = require('leaflet');

    const svgHtml = renderToStaticMarkup(
      <div className="flex items-center justify-center w-4 h-4 rounded-full bg-cyan-900 border border-cyan-400 shadow-sm">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
      </div>
    );

    return L.divIcon({
      html: svgHtml,
      className: 'waypoint-marker-icon',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });
  }, []);

  // Tile layer URL based on selected theme
  const tileUrl = useMemo(() => {
    switch (mapTheme) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'ocean-light':
        return 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      case 'nautical-dark':
      default:
        return 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }
  }, [mapTheme]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden border shadow-sm flex flex-col font-sans transition-all ${className} ${
        isFullscreen ? 'h-screen rounded-none' : 'min-h-[580px]'
      }`}
      style={{
        backgroundColor: 'var(--panel)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      {/* ── TOP TELEMETRY HUD HEADER ── */}
      <div 
        className="relative z-10 flex flex-wrap items-center justify-between gap-3 p-4 backdrop-blur-md border-b"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
        }}
      >
        {/* Left: Vessel Identity & Live AIS Beacon */}
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
            <Ship className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-extrabold tracking-tight text-[var(--text-primary)] flex items-center gap-1.5">
                <span>{vesselName}</span>
                <span title={telemetry.flag.country} className="text-base leading-none">
                  {telemetry.flag.emoji}
                </span>
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[var(--surface-subtle)] border border-[var(--border)] text-cyan-600 dark:text-cyan-400">
                {telemetry.imoNumber}
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-[var(--surface-subtle)] text-[var(--text-secondary)] border border-[var(--border)]">
                {voyageNumber}
              </span>
            </div>

            <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Container: <strong className="font-mono text-[var(--text-primary)]">{containerNumber}</strong></span>
              <span>•</span>
              <span className="text-cyan-600 dark:text-cyan-300 font-medium flex items-center gap-1">
                <Compass className="w-3 h-3 text-cyan-500" />
                {telemetry.headingDegrees}° COG
              </span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Gauge className="w-3 h-3 text-emerald-500" />
                {telemetry.speedKnots} kn
              </span>
              <span>•</span>
              <span className="text-[var(--text-secondary)] hidden sm:inline">{telemetry.aisStation}</span>
            </p>
          </div>
        </div>

        {/* Center / Right: Dynamic Port ETA Countdown HUD */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Fleet Container Switcher (if list provided) */}
          {containersList && containersList.length > 0 && onSelectContainer && (
            <div className="hidden md:flex items-center gap-2 bg-[var(--surface-subtle)] px-3 py-1.5 rounded-xl border border-[var(--border)]">
              <Navigation className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <select
                value={selectedContainerId || containersList.find(c => c.containerNumber === containerNumber)?.id || ''}
                onChange={(e) => onSelectContainer(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-[var(--text-primary)] outline-none cursor-pointer pr-1 py-0.5"
              >
                {containersList.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[var(--surface)] text-[var(--text-primary)] font-mono">
                    {c.containerNumber} — {c.progress}% ({c.destinationPort || 'In Transit'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* AIS Provider Selector */}
          <div className="hidden md:flex items-center gap-1.5 bg-[var(--surface-subtle)] px-2.5 py-1.5 rounded-xl border border-[var(--border)]">
            <Radio className={`w-3 h-3 shrink-0 ${aisProviderStatus === 'active' ? 'text-emerald-500 animate-pulse' : 'text-[var(--text-secondary)]'}`} />
            <select
              value={selectedAISProvider}
              onChange={(e) => setSelectedAISProvider(e.target.value as AISProviderType)}
              className="bg-transparent text-[10px] font-mono font-bold text-[var(--text-primary)] outline-none cursor-pointer pr-1 py-0.5"
              title="AIS Data Source"
            >
              <option value="simulated" className="bg-[var(--surface)] text-[var(--text-primary)]">Simulated AIS</option>
              <option value="marinetraffic" className="bg-[var(--surface)] text-[var(--text-primary)]">MarineTraffic</option>
              <option value="vesselfinder" className="bg-[var(--surface)] text-[var(--text-primary)]">VesselFinder</option>
              <option value="aishub" className="bg-[var(--surface)] text-[var(--text-primary)]">AISHub</option>
            </select>
            {aisProviderStatus === 'loading' && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Connecting..." />
            )}
            {aisProviderStatus === 'active' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" title="Live AIS data active" />
            )}
            {aisProviderStatus === 'error' && (
              <span className="w-2 h-2 rounded-full bg-red-500" title="AIS provider error - using simulated" />
            )}
          </div>

          {/* Live ETA Ticker */}
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/25 px-3.5 py-1.5 rounded-xl flex items-center gap-3">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-300/80 block">
                Estimated Port Arrival
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs font-extrabold text-amber-600 dark:text-amber-300">
                <span>{timeRemaining.days}d</span>
                <span>:</span>
                <span>{String(timeRemaining.hours).padStart(2, '0')}h</span>
                <span>:</span>
                <span>{String(timeRemaining.minutes).padStart(2, '0')}m</span>
                <span className="opacity-60">:</span>
                <span className="text-[11px] opacity-80">{String(timeRemaining.seconds).padStart(2, '0')}s</span>
                {routeAnalysis.etaConfidenceScore !== undefined && (
                  <span
                    className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: routeAnalysis.etaConfidenceScore >= 80 ? '#065f46' : routeAnalysis.etaConfidenceScore >= 60 ? '#78350f' : '#7f1d1d',
                      color: routeAnalysis.etaConfidenceScore >= 80 ? '#10b981' : routeAnalysis.etaConfidenceScore >= 60 ? '#f59e0b' : '#ef4444',
                    }}
                  >
                    {routeAnalysis.etaConfidenceScore}% confidence
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Map Controls Group */}
          <div className="flex items-center gap-1.5 bg-[var(--surface-subtle)] p-1 rounded-xl border border-[var(--border)]">
            {/* Center on vessel button */}
            <button
              type="button"
              onClick={handleCenterOnVessel}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-[var(--surface-hover)] transition-colors"
              title="Center Map on Vessel"
            >
              <Crosshair className="w-4 h-4" />
            </button>

            {/* Weather Overlay Toggle */}
            <button
              type="button"
              onClick={() => setShowWeatherOverlay(prev => !prev)}
              className={`p-1.5 rounded-lg transition-colors ${
                showWeatherOverlay
                  ? 'text-cyan-600 dark:text-cyan-400 bg-cyan-500/10'
                  : 'text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-[var(--surface-hover)]'
              }`}
              title={showWeatherOverlay ? 'Hide Weather Overlay' : 'Show Weather Overlay'}
            >
              <Wind className="w-4 h-4" />
            </button>

            {/* Historical Playback Toggle */}
            <button
              type="button"
              onClick={isHistoricalPlayback ? stopHistoricalPlayback : startHistoricalPlayback}
              className={`p-1.5 rounded-lg transition-colors ${
                isHistoricalPlayback
                  ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
                  : 'text-[var(--text-secondary)] hover:text-amber-600 dark:hover:text-amber-400 hover:bg-[var(--surface-hover)]'
              }`}
              title={isHistoricalPlayback ? 'Stop Historical Playback' : 'Start Historical Track Playback'}
            >
              <Clock className="w-4 h-4" />
            </button>

            {/* Map Theme Toggle */}
            <button
              type="button"
              onClick={() => {
                setMapTheme(prev => 
                  prev === 'ocean-light' ? 'satellite' : 
                  prev === 'satellite' ? 'nautical-dark' : 'ocean-light'
                );
              }}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-[var(--surface-hover)] transition-colors"
              title={`Switch Map Theme (Current: ${mapTheme})`}
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-[var(--surface-hover)] transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE LEAFLET MARITIME RADAR ── */}
      <div className="relative w-full h-[400px] min-h-[360px] bg-[#eef3f7] dark:bg-slate-950">
        {typeof window !== 'undefined' && (
          <MapContainer
            center={[routeAnalysis.vesselCurrentPos.lat, routeAnalysis.vesselCurrentPos.lng]}
            zoom={4}
            minZoom={2}
            maxZoom={14}
            className="w-full h-full z-0"
            attributionControl={false}
          >
            <TileLayer
              url={tileUrl}
              maxZoom={18}
            />

            {/* Controller for programmatically flying to coordinates */}
            {centerTarget && <DynamicMapController center={centerTarget} />}

            {/* Traveled Sea Lane (Solid Glowing Gold / Cyan) */}
            {traveledCoords.length > 1 && (
              <Polyline
                positions={traveledCoords}
                pathOptions={{
                  color: '#0891b2', // cyan-600
                  weight: 4,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            )}

            {/* Remaining Sea Lane (Dashed Dotted Glowing Cyan/White) */}
            {remainingCoords.length > 1 && (
              <Polyline
                positions={remainingCoords}
                pathOptions={{
                  color: '#0284c7', // sky-600
                  weight: 3,
                  opacity: 0.45,
                  dashArray: '8, 8',
                  lineCap: 'round',
                }}
              />
            )}

            {/* Origin Port Marker */}
            {originIcon && (
              <Marker position={[routeAnalysis.originCoords.lat, routeAnalysis.originCoords.lng]} icon={originIcon}>
                <Popup className="maritime-popup">
                  <div className="p-1 text-slate-900">
                    <span className="text-[10px] font-bold uppercase text-emerald-600">Port of Loading</span>
                    <h4 className="font-bold text-xs">{routeAnalysis.originPort}</h4>
                    <p className="text-[11px] text-slate-600 mt-1">Voyage Origin • Departure Point</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Destination Port Marker */}
            {destinationIcon && (
              <Marker position={[routeAnalysis.destCoords.lat, routeAnalysis.destCoords.lng]} icon={destinationIcon}>
                <Popup className="maritime-popup">
                  <div className="p-1 text-slate-900">
                    <span className="text-[10px] font-bold uppercase text-amber-600">Destination Port</span>
                    <h4 className="font-bold text-xs">{routeAnalysis.destinationPort}</h4>
                    <p className="text-[11px] text-slate-600 mt-1">
                      {routeAnalysis.distanceRemainingNM.toLocaleString()} NM remaining
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Maritime Strategic Choke-Points (Straits & Canals) */}
            {waypointIcon && routeAnalysis.waypoints.map((wp) => {
              if (wp.type === 'port_origin' || wp.type === 'port_destination') return null;

              return (
                <Marker key={wp.id} position={[wp.lat, wp.lng]} icon={waypointIcon}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                    <span className="font-semibold text-xs text-slate-900">{wp.name}</span>
                  </Tooltip>
                  <Popup>
                    <div className="p-1 text-slate-900">
                      <span className="text-[10px] font-bold uppercase text-cyan-600">{wp.type}</span>
                      <h4 className="font-bold text-xs">{wp.name}</h4>
                      <p className="text-[11px] text-slate-600 mt-1">{wp.description}</p>
                      <div className="mt-2 text-[10px] font-mono font-bold">
                        Status: {wp.passed ? '✓ Passed' : wp.active ? '⚡ Approaching / In Transit' : 'Upcoming'}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Piracy / War Risk Zone Overlays (Gulf of Aden, Red Sea, Bab-el-Mandeb) */}
            {typeof window !== 'undefined' && (() => {
              const L = require('leaflet');
              const Circle = require('react-leaflet').Circle;
              const piracyZones = [
                { center: [12.58, 43.33], radius: 180000, label: '⚠ Bab-el-Mandeb High Risk Area', color: '#ef4444' },
                { center: [12.3, 48.0], radius: 250000, label: '⚠ Gulf of Aden IRTC - Piracy Risk', color: '#f59e0b' },
                { center: [21.0, 38.0], radius: 150000, label: '⚠ Southern Red Sea - Exercise Caution', color: '#f59e0b' },
                { center: [26.56, 56.25], radius: 80000, label: '⚠ Strait of Hormuz - Maritime Security Zone', color: '#f59e0b' },
              ];
              return (
                <>
                  {piracyZones.map((zone, i) => (
                    <Circle
                      key={`piracy-${i}`}
                      center={zone.center as [number, number]}
                      radius={zone.radius}
                      pathOptions={{
                        color: zone.color,
                        fillColor: zone.color,
                        fillOpacity: 0.08,
                        weight: 1.5,
                        dashArray: '6, 4',
                      }}
                    >
                      <Popup>
                        <div className="p-1 text-slate-900">
                          <span className="text-[10px] font-bold uppercase text-red-600">⚠ Maritime Security Zone</span>
                          <h4 className="font-bold text-xs mt-1">{zone.label}</h4>
                          <p className="text-[11px] text-slate-600 mt-1">Exercise heightened vigilance in this area</p>
                        </div>
                      </Popup>
                    </Circle>
                  ))}
                </>
              );
            })()}

            {/* Weather Overlay: Storm Warning Circles */}
            {showWeatherOverlay && weatherOverlay && weatherOverlay.storms.length > 0 && typeof window !== 'undefined' && (() => {
              const L = require('leaflet');
              const Circle = require('react-leaflet').Circle;
              const Polyline = require('react-leaflet').Polyline;
              return (
                <>
                  {weatherOverlay.storms.map((storm, i) => (
                    <React.Fragment key={`storm-${i}`}>
                      <Circle
                        center={[storm.centerLat, storm.centerLng]}
                        radius={storm.radiusNM * 1852}
                        pathOptions={{
                          color: '#ef4444',
                          fillColor: '#ef4444',
                          fillOpacity: 0.06,
                          weight: 2,
                          dashArray: '4, 6',
                        }}
                      >
                        <Popup>
                          <div className="p-1 text-slate-900">
                            <span className="text-[10px] font-bold uppercase text-red-600">⚠ Storm Warning</span>
                            <h4 className="font-bold text-xs mt-1">{storm.name}</h4>
                            <p className="text-[11px] text-slate-600 mt-1">
                              Wind: {storm.windSpeedKnots.toFixed(0)} kn • Radius: {storm.radiusNM} NM
                            </p>
                          </div>
                        </Popup>
                      </Circle>
                      {/* Storm forecast track */}
                      {storm.forecastTrack.length > 1 && (
                        <Polyline
                          positions={storm.forecastTrack.map(pt => [pt.lat, pt.lng] as [number, number])}
                          pathOptions={{
                            color: '#f97316',
                            weight: 1.5,
                            opacity: 0.5,
                            dashArray: '3, 5',
                          }}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </>
              );
            })()}

            {/* Historical Track Playback Polyline */}
            {isHistoricalPlayback && historicalPositions.length > 1 && typeof window !== 'undefined' && (() => {
              const L = require('leaflet');
              const Polyline = require('react-leaflet').Polyline;
              const Marker = require('react-leaflet').Marker;
              const Tooltip = require('react-leaflet').Tooltip;

              const playedCoords = historicalPositions.slice(0, historicalPlaybackIndex + 1).map(p => [p.lat, p.lng] as [number, number]);
              const remainingCoords = historicalPositions.slice(historicalPlaybackIndex).map(p => [p.lat, p.lng] as [number, number]);

              return (
                <>
                  {/* Historical track traveled */}
                  <Polyline
                    positions={playedCoords}
                    pathOptions={{
                      color: '#f59e0b',
                      weight: 3,
                      opacity: 0.7,
                      lineCap: 'round',
                    }}
                  />
                  {/* Historical track remaining */}
                  <Polyline
                    positions={remainingCoords}
                    pathOptions={{
                      color: '#f59e0b',
                      weight: 2,
                      opacity: 0.2,
                      dashArray: '4, 6',
                      lineCap: 'round',
                    }}
                  />
                  {/* Historical position marker */}
                  {historicalPositions[historicalPlaybackIndex] && (
                    <Marker
                      position={[historicalPositions[historicalPlaybackIndex].lat, historicalPositions[historicalPlaybackIndex].lng]}
                      icon={(() => {
                        const divIcon = L.divIcon({
                          html: `<div style="width:16px;height:16px;border-radius:50%;background:#f59e0b;border:3px solid rgba(255,255,255,0.9);box-shadow:0 0 12px rgba(245,158,11,0.6);"></div>`,
                          className: '',
                          iconSize: [16, 16],
                          iconAnchor: [8, 8],
                        });
                        return divIcon;
                      })()}
                    >
                      <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                        <span className="text-[10px] font-bold font-mono">
                          {historicalPlaybackDate.toLocaleDateString()} {historicalPlaybackDate.toLocaleTimeString()}
                        </span>
                      </Tooltip>
                    </Marker>
                  )}
                </>
              );
            })()}

            {/* Nautical Mile Markers along the route */}
            {routeAnalysis.denseRouteCoordinates.length > 10 && (() => {
              const L = require('leaflet');
              const Marker = require('react-leaflet').Marker;
              const Tooltip = require('react-leaflet').Tooltip;
              const totalDist = routeAnalysis.totalDistanceNM;
              const markers = [];
              // Place markers at 500 NM intervals
              const intervalNM = 500;
              const totalMarkers = Math.floor(totalDist / intervalNM);
              const coords = routeAnalysis.denseRouteCoordinates;
              
              for (let m = 1; m <= totalMarkers; m++) {
                const targetDist = m * intervalNM;
                const frac = targetDist / totalDist;
                const idx = Math.min(coords.length - 1, Math.floor(frac * coords.length));
                if (idx < coords.length) {
                  const distFromStart = Math.round(m * intervalNM);
                  markers.push(
                    <Marker
                      key={`nm-${m}`}
                      position={coords[idx]}
                      icon={(() => {
                        const divIcon = L.divIcon({
                          html: `<div style="background:#1e293b;border:1px solid #475569;border-radius:999px;padding:2px 6px;font-size:9px;font-weight:bold;color:#94a3b8;font-family:monospace;white-space:nowrap;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${distFromStart} NM</div>`,
                          className: '',
                          iconSize: [0, 0],
                          iconAnchor: [0, 0],
                        });
                        return divIcon;
                      })()}
                    >
                      <Tooltip direction="top" offset={[0, -4]} opacity={0.8}>
                        <span className="text-[10px] font-mono font-bold">{distFromStart} NM from origin</span>
                      </Tooltip>
                    </Marker>
                  );
                }
              }
              return <>{markers}</>;
            })()}

            {/* Live Vessel AIS Marker */}
            {vesselIcon && (
              <Marker
                position={[routeAnalysis.vesselCurrentPos.lat, routeAnalysis.vesselCurrentPos.lng]}
                icon={vesselIcon}
              >
                <Popup>
                  <div className="p-1 text-slate-900 font-sans min-w-[220px]">
                    <div className="flex items-center gap-1.5 text-cyan-700 font-bold text-xs">
                      <Ship className="w-3.5 h-3.5" />
                      <span>{vesselName}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                      <div>Position: {routeAnalysis.vesselCurrentPos.lat.toFixed(4)}°N, {routeAnalysis.vesselCurrentPos.lng.toFixed(4)}°E</div>
                      <div>Speed: <strong>{telemetry.speedKnots} knots</strong></div>
                      <div>Heading: <strong>{telemetry.headingDegrees}° COG</strong></div>
                      <div>Zone: <strong>{routeAnalysis.currentZoneName}</strong></div>
                      <div>Status: <strong>{telemetry.navigationalStatus}</strong></div>
                      {routeAnalysis.etaConfidenceScore !== undefined && (
                        <div>ETA Confidence: <strong>{routeAnalysis.etaConfidenceScore}%</strong></div>
                      )}
                      {routeAnalysis.usesCapeRoute !== undefined && (
                        <div>Route: <strong>{routeAnalysis.usesCapeRoute ? 'Cape of Good Hope' : 'Suez Canal'}</strong></div>
                      )}
                      {routeAnalysis.distanceToDestNM !== undefined && (
                        <div>Distance to Dest: <strong>{Math.round(routeAnalysis.distanceToDestNM)} NM</strong></div>
                      )}
                    </div>

                    {/* Container Timeline */}
                    {containerEvents && containerEvents.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Timeline</span>
                        <div className="mt-1 max-h-[120px] overflow-y-auto space-y-1">
                          {containerEvents.slice(-5).reverse().map((evt, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[10px]">
                              <div className="w-1.5 h-1.5 rounded-full mt-0.5 shrink-0" style={{
                                backgroundColor: evt.type === 'ARRIVED' || evt.type === 'RELEASED' ? '#10b981' : evt.type === 'DELAYED' ? '#ef4444' : '#06b6d4'
                              }} />
                              <div>
                                <span className="font-semibold text-slate-800">{evt.type}</span>
                                <span className="text-slate-500 ml-1">{evt.location || ''}</span>
                                <div className="text-slate-400">{evt.date ? new Date(evt.date).toLocaleDateString() : ''}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Multi-Vessel Fleet View: Show all containers as small markers */}
            {containersList && containersList.length > 1 && (() => {
              const L = require('leaflet');
              const Marker = require('react-leaflet').Marker;
              const Tooltip = require('react-leaflet').Tooltip;
              return containersList
                .filter(c => c.id !== selectedContainerId)
                .slice(0, 20)
                .map((c) => {
                  const fleetColor = c.status?.toLowerCase().includes('arrived') || c.status?.toLowerCase().includes('released')
                    ? '#10b981' : c.status?.toLowerCase().includes('transit') || c.status?.toLowerCase().includes('loaded')
                    ? '#06b6d4' : c.status?.toLowerCase().includes('delay') || c.status?.toLowerCase().includes('hold')
                    ? '#ef4444' : '#f59e0b';
                  const fleetIcon = L.divIcon({
                    html: `<div style="width:14px;height:14px;border-radius:50%;background:${fleetColor};border:2px solid rgba(255,255,255,0.8);box-shadow:0 0 6px ${fleetColor}80;"></div>`,
                    className: '',
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                  });
                  return (
                    <Marker
                      key={`fleet-${c.id}`}
                      position={[
                        routeAnalysis.vesselCurrentPos.lat + (Math.random() - 0.5) * 0.5,
                        routeAnalysis.vesselCurrentPos.lng + (Math.random() - 0.5) * 0.5
                      ]}
                      icon={fleetIcon}
                    >
                      <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>
                        <span className="text-[10px] font-bold font-mono">{c.containerNumber} — {c.progress}%</span>
                      </Tooltip>
                    </Marker>
                  );
                });
            })()}
          </MapContainer>
        )}

        {/* Floating Ocean Conditions & Zone Pill Overlay */}
        <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-auto">
          <div 
            className="backdrop-blur-md border px-3 py-2 rounded-xl text-xs shadow-lg max-w-[280px]"
            style={{
              backgroundColor: 'var(--surface)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
            }}
          >
            <div className="flex items-center justify-between gap-3 text-[10px] uppercase font-bold tracking-wider text-cyan-600 dark:text-cyan-400 mb-1">
              <span>Maritime Zone</span>
              <span className="text-emerald-500 dark:text-emerald-400">
                {selectedAISProvider !== 'simulated' && aisProviderStatus === 'active' ? 'Real AIS' : 'Live AIS'}
              </span>
            </div>
            <p className="font-bold text-sm text-[var(--text-primary)] truncate">{routeAnalysis.currentZoneName}</p>
            <div className="mt-2 pt-2 border-t border-[var(--border)] grid grid-cols-2 gap-2 text-[11px] text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span>
                  {weatherOverlay && showWeatherOverlay
                    ? `${weatherOverlay.points[0]?.waveHeightMeters.toFixed(1)}m Swell`
                    : `${telemetry.weather.waveHeightMeters}m Swell`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                <span>
                  {weatherOverlay && showWeatherOverlay
                    ? `${weatherOverlay.points[0]?.windSpeedKnots.toFixed(0)} kn ${telemetry.weather.windDirection}`
                    : `${telemetry.weather.windSpeedKnots} kn ${telemetry.weather.windDirection}`}
                </span>
              </div>
            </div>
            {/* Storm Warnings */}
            {showWeatherOverlay && weatherOverlay && weatherOverlay.storms.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--border)] space-y-1">
                {weatherOverlay.storms.map((storm, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px]">
                    <span className="text-red-500 mt-0.5 shrink-0">⚠</span>
                    <div>
                      <span className="font-bold text-red-500">{storm.name}</span>
                      <span className="text-[var(--text-secondary)] ml-1">
                        {storm.windSpeedKnots.toFixed(0)} kn • {storm.radiusNM} NM radius
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Weather Loading Indicator */}
            {showWeatherOverlay && weatherLoading && (
              <div className="mt-1 text-[10px] text-cyan-500 animate-pulse">Fetching weather data...</div>
            )}
          </div>
        </div>

        {/* Floating Live vs Scrubbed State Pill */}
        {!isLiveAIS && !isHistoricalPlayback && (
          <div className="absolute top-4 right-4 z-[400] bg-amber-500/95 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
            <span>Simulating Voyage ({Math.round(scrubberProgress)}%)</span>
            <button
              onClick={handleResetToLive}
              className="bg-slate-950/20 hover:bg-slate-950/40 px-2 py-0.5 rounded text-[11px] font-semibold"
            >
              Reset to Live AIS
            </button>
          </div>
        )}

        {/* Historical Playback Status Pill */}
        {isHistoricalPlayback && (
          <div className="absolute top-4 right-4 z-[400] bg-amber-500/95 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Historical Playback — {historicalPlaybackDate.toLocaleDateString()}</span>
            <button
              onClick={stopHistoricalPlayback}
              className="bg-slate-950/20 hover:bg-slate-950/40 px-2 py-0.5 rounded text-[11px] font-semibold"
            >
              Stop
            </button>
          </div>
        )}
      </div>

      {/* ── BOTTOM INTERACTIVE VOYAGE SCRUBBER & METRICS HUD ── */}
      <div 
        className="relative z-10 p-4 backdrop-blur-md border-t space-y-3"
        style={{
          backgroundColor: 'var(--surface)',
          borderColor: 'var(--border)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Scrubber Control Row */}
        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition-colors shadow-sm shrink-0"
            title={isPlaying ? 'Pause Simulation' : 'Play Voyage Simulation'}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Speed Toggle */}
          <button
            type="button"
            onClick={() => setPlaybackSpeed(s => (s === 1 ? 2 : s === 2 ? 5 : 1))}
            className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-cyan-600 dark:text-cyan-300 border border-[var(--border)] shrink-0"
            title="Simulation Speed"
          >
            {playbackSpeed}x
          </button>

          {/* Interactive Progress Slider */}
          <div className="flex-1 relative flex items-center">
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={scrubberProgress}
              onChange={(e) => {
                setIsPlaying(false);
                setIsLiveAIS(false);
                setScrubberProgress(parseFloat(e.target.value));
              }}
              className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-cyan-500 focus:outline-none"
            />
          </div>

          {/* Live AIS Snapback Button */}
          <button
            type="button"
            onClick={handleResetToLive}
            disabled={isLiveAIS}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
              isLiveAIS
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                : 'bg-[var(--surface-subtle)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)]'
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLiveAIS ? 'animate-pulse' : ''}`} />
            <span>{isLiveAIS ? 'Live AIS Active' : 'Snap to Live'}</span>
          </button>
        </div>

        {/* Voyage Distance & Waypoints Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-[var(--border)] text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Distance Covered</span>
            <p className="font-mono font-bold text-[var(--text-primary)] mt-0.5">
              {routeAnalysis.distanceCoveredNM.toLocaleString()} <span className="text-[10px] text-[var(--text-secondary)]">NM</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Distance Remaining</span>
            <p className="font-mono font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">
              {routeAnalysis.distanceRemainingNM.toLocaleString()} <span className="text-[10px] text-[var(--text-secondary)]">NM</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Total Oceanic Route</span>
            <p className="font-mono font-bold text-[var(--text-primary)] mt-0.5">
              {routeAnalysis.totalDistanceNM.toLocaleString()} <span className="text-[10px] text-[var(--text-secondary)]">NM</span>
              <span className="text-[10px] text-[var(--text-secondary)] ml-1">({routeAnalysis.totalDistanceKM.toLocaleString()} km)</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary)] block">Voyage Completion</span>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-300"
                  style={{ width: `${Math.round(scrubberProgress)}%` }}
                />
              </div>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{Math.round(scrubberProgress)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
