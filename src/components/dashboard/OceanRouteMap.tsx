'use client';

import { useState, useMemo } from 'react';
import { 
  Ship, 
  Anchor, 
  Compass, 
  MapPin, 
  Navigation, 
  Clock, 
  Layers, 
  ShieldCheck, 
  AlertCircle,
  Maximize2,
  Calendar,
  Sparkles
} from 'lucide-react';

export interface RouteStop {
  portName: string;
  country: string;
  code: string;
  lat: number;
  lng: number;
  status: 'departed' | 'current' | 'next' | 'destination';
  date?: string;
}

interface OceanRouteMapProps {
  originPort?: string;
  destinationPort?: string;
  vesselName?: string;
  voyageNumber?: string;
  containerNumber?: string;
  currentProgressPct?: number; // 0 to 100
  etaDays?: number;
  status?: string;
}

export function OceanRouteMap({
  originPort = 'Port of Newark (USNWK)',
  destinationPort = 'Port of Jebel Ali (AEJEA)',
  vesselName = 'MAERSK MC-KINNEY MOLLER',
  voyageNumber = 'V-2409W',
  containerNumber = 'MSKU9048123',
  currentProgressPct = 68,
  etaDays = 9,
  status = 'In Transatlantic Transit',
}: OceanRouteMapProps) {
  const [selectedWaypoint, setSelectedWaypoint] = useState<number | null>(1);

  // SVG coordinate projection points for standard Transatlantic -> Mediterranean -> Suez -> Arabian Gulf corridor
  const waypoints = useMemo(() => [
    { name: originPort, code: 'ORIGIN', x: 80, y: 130, date: 'Dep: Sep 12', status: 'completed' },
    { name: 'Strait of Gibraltar (Transit)', code: 'GIBRALTAR', x: 280, y: 140, date: 'Passed: Sep 18', status: 'completed' },
    { name: 'Suez Canal Convoy', code: 'SUEZ', x: 440, y: 160, date: 'Est: Sep 25', status: 'active' },
    { name: 'Bab el-Mandeb Strait', code: 'RED_SEA', x: 520, y: 220, date: 'Est: Sep 28', status: 'upcoming' },
    { name: destinationPort, code: 'DEST', x: 640, y: 170, date: 'ETA: Oct 02', status: 'destination' },
  ], [originPort, destinationPort]);

  // Interpolated ship position along the path based on progress
  const shipPos = useMemo(() => {
    const totalSegments = waypoints.length - 1;
    const progress = Math.min(Math.max(currentProgressPct, 5), 95) / 100;
    const segmentIndex = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
    const subProgress = (progress * totalSegments) - segmentIndex;

    const p1 = waypoints[segmentIndex];
    const p2 = waypoints[segmentIndex + 1];

    const currentX = p1.x + (p2.x - p1.x) * subProgress;
    const currentY = p1.y + (p2.y - p1.y) * subProgress;

    return { x: currentX, y: currentY };
  }, [waypoints, currentProgressPct]);

  return (
    <div className="w-full rounded-2xl bg-[var(--panel)] border border-[var(--border)] overflow-hidden shadow-sm flex flex-col">
      {/* Header Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-[var(--border)] bg-[var(--background)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[var(--accent-gold)] text-white shadow-sm">
            <Ship className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {vesselName}
              </h3>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-[var(--panel)] border border-[var(--border)] text-[var(--text-secondary)]">
                {voyageNumber}
              </span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-1.5">
              <span>Container: <strong className="font-mono text-[var(--text-primary)]">{containerNumber}</strong></span>
              <span>•</span>
              <span className="text-emerald-500 font-semibold">{status}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
              Estimated Arrival
            </span>
            <span className="text-sm font-bold text-[var(--accent-gold)]">
              {etaDays} Days Remaining
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--panel)] text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
            <span>{currentProgressPct}% Completed</span>
          </div>
        </div>
      </div>

      {/* Interactive Oceanic Map Canvas */}
      <div className="relative w-full h-72 bg-gradient-to-b from-[#0e1e2d] to-[#0a1622] p-4 overflow-hidden select-none">
        {/* Subtle Map Grid Lines */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Global Continents Abstract Shapes */}
        <svg 
          viewBox="0 0 720 280" 
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradient for Maritime Route Line */}
            <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="60%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>

            {/* Glowing filter for active ship */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Abstract stylized land masses */}
          {/* North America East Coast */}
          <path d="M 40 40 Q 90 90 70 170 Q 50 220 30 250 L 10 250 L 10 40 Z" fill="#1b2f44" opacity="0.4" />
          {/* Europe & Mediterranean */}
          <path d="M 230 40 Q 340 50 380 120 Q 320 150 250 140 Z" fill="#1b2f44" opacity="0.4" />
          {/* Africa */}
          <path d="M 240 160 Q 380 160 410 210 Q 380 260 280 260 Z" fill="#1b2f44" opacity="0.4" />
          {/* Middle East & Arabian Peninsula */}
          <path d="M 420 110 Q 520 100 620 140 Q 590 220 490 200 Z" fill="#1b2f44" opacity="0.4" />

          {/* The Navigational Maritime Polyline Track */}
          <path
            d={`M ${waypoints.map((w) => `${w.x} ${w.y}`).join(' L ')}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="3"
            strokeDasharray="6 6"
          />

          {/* Active Completed Segment Path */}
          <path
            d={`M ${waypoints[0].x} ${waypoints[0].y} L ${shipPos.x} ${shipPos.y}`}
            fill="none"
            stroke="url(#routeGradient)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Waypoint Markers */}
          {waypoints.map((wp, idx) => {
            const isOrigin = idx === 0;
            const isDest = idx === waypoints.length - 1;
            const isSelected = selectedWaypoint === idx;

            return (
              <g 
                key={idx} 
                onClick={() => setSelectedWaypoint(idx)}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                {/* Outer Ring */}
                <circle
                  cx={wp.x}
                  cy={wp.y}
                  r={isOrigin || isDest ? 8 : 6}
                  fill={isOrigin ? '#10B981' : isDest ? '#3B82F6' : '#D4AF37'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity={wp.status === 'completed' ? 1 : 0.8}
                />

                {/* Waypoint Label */}
                <text
                  x={wp.x}
                  y={wp.y - 12}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontSize="9"
                  fontWeight="bold"
                  className="drop-shadow"
                >
                  {wp.code}
                </text>
              </g>
            );
          })}

          {/* Real-time Animated Vessel Pin */}
          <g transform={`translate(${shipPos.x}, ${shipPos.y})`} filter="url(#glow)">
            {/* Radar Pulse Animation */}
            <circle cx="0" cy="0" r="14" fill="none" stroke="#D4AF37" strokeWidth="1.5" className="animate-ping" opacity="0.6" />
            <circle cx="0" cy="0" r="10" fill="#D4AF37" stroke="#ffffff" strokeWidth="2" />
            <path
              d="M -4 -3 L 4 -3 L 0 5 Z"
              fill="#000000"
              transform="rotate(90)"
            />
          </g>
        </svg>

        {/* Floating Active Vessel Live Telemetry HUD */}
        <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md rounded-xl p-2.5 border border-white/10 text-white flex items-center gap-3 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <div>
            <p className="font-bold leading-none text-[11px]">{originPort.split('(')[0]} → {destinationPort.split('(')[0]}</p>
            <p className="text-[9px] text-neutral-400 mt-0.5">Speed: 19.4 Knots • Course: 088° E • Deep Ocean Passage</p>
          </div>
        </div>
      </div>

      {/* Bottom Waypoints Milestones Timeline */}
      <div className="grid grid-cols-2 sm:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border)] border-t border-[var(--border)] bg-[var(--panel)]">
        {waypoints.map((wp, idx) => (
          <div 
            key={idx} 
            className={`p-3 text-left transition-colors cursor-pointer ${
              selectedWaypoint === idx ? 'bg-[var(--accent-gold)]/10' : 'hover:bg-[var(--background)]'
            }`}
            onClick={() => setSelectedWaypoint(idx)}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className={`w-2 h-2 rounded-full ${
                wp.status === 'completed' ? 'bg-emerald-500' : wp.status === 'active' ? 'bg-[var(--accent-gold)] animate-pulse' : 'bg-[var(--border)]'
              }`} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] truncate">
                {wp.code}
              </span>
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] truncate">
              {wp.name}
            </p>
            <span className="text-[10px] text-[var(--text-secondary)] mt-0.5 block">
              {wp.date}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
