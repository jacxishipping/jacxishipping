'use client';

import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapPin, Ship, Truck } from 'lucide-react';

const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });
const Polyline = dynamic(() => import('react-leaflet').then((m) => m.Polyline), { ssr: false });

interface CompactMapInnerProps {
  shipments: Array<{
    id: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleVIN?: string;
    status: string;
  }>;
}

// Approximate route coordinates for common shipping lanes
const ROUTE_COORDS: Record<string, [number, number][]> = {
  'US East Coast - Middle East': [
    [40.7128, -74.006],   // Newark
    [36.0, -75.0],        // Off coast
    [30.0, -70.0],        // Atlantic
    [25.0, -60.0],        // Mid-Atlantic
    [35.0, -30.0],        // Near Gibraltar
    [36.5, -5.0],         // Gibraltar
    [35.0, 20.0],         // Mediterranean
    [33.0, 35.0],         // Eastern Med
    [30.0, 45.0],         // Near Suez
    [25.0, 55.0],         // Arabian Gulf
    [25.2, 55.3],         // Jebel Ali
  ],
  'US Gulf - Middle East': [
    [29.95, -90.07],      // New Orleans
    [25.0, -85.0],        // Gulf of Mexico
    [22.0, -80.0],        // Florida Straits
    [25.0, -70.0],        // Atlantic
    [35.0, -30.0],        // Near Gibraltar
    [36.5, -5.0],         // Gibraltar
    [35.0, 20.0],         // Mediterranean
    [33.0, 35.0],         // Eastern Med
    [30.0, 45.0],         // Near Suez
    [25.0, 55.0],         // Arabian Gulf
    [25.2, 55.3],         // Jebel Ali
  ],
  'US West Coast - Middle East': [
    [33.94, -118.41],     // Long Beach
    [30.0, -115.0],       // Pacific
    [20.0, -110.0],       // Mexican coast
    [15.0, -100.0],       // Central America
    [10.0, -85.0],        // Costa Rica
    [8.0, -80.0],         // Panama
    [5.0, -75.0],         // Colombia
    [10.0, -60.0],        // Caribbean
    [20.0, -50.0],        // Atlantic
    [35.0, -30.0],        // Near Gibraltar
    [36.5, -5.0],         // Gibraltar
    [35.0, 20.0],         // Mediterranean
    [33.0, 35.0],         // Eastern Med
    [30.0, 45.0],         // Near Suez
    [25.0, 55.0],         // Arabian Gulf
    [25.2, 55.3],         // Jebel Ali
  ],
};

// Default route for unknown origins
const DEFAULT_ROUTE: [number, number][] = [
  [38.0, -75.0],  // Generic US East
  [35.0, -30.0],  // Atlantic
  [36.5, -5.0],   // Gibraltar
  [33.0, 35.0],   // Eastern Med
  [25.2, 55.3],   // Jebel Ali
];

function getRouteForStatus(status: string): [number, number][] {
  // Pick a route based on status for visual variety
  const routes = Object.values(ROUTE_COORDS);
  const idx = status === 'IN_TRANSIT' ? 0 : 1;
  return routes[idx % routes.length] || DEFAULT_ROUTE;
}

function getProgressPosition(route: [number, number][], progressPercent: number): [number, number] {
  if (route.length < 2) return route[0] || [0, 0];
  const clampedProgress = Math.max(0, Math.min(100, progressPercent));
  const totalSegments = route.length - 1;
  const progressAlong = (clampedProgress / 100) * totalSegments;
  const segIndex = Math.min(Math.floor(progressAlong), totalSegments - 1);
  const segFraction = progressAlong - segIndex;
  const from = route[segIndex];
  const to = route[segIndex + 1];
  return [
    from[0] + (to[0] - from[0]) * segFraction,
    from[1] + (to[1] - from[1]) * segFraction,
  ];
}

function createMarkerIcon(color: string, pulse = false) {
  const svg = renderToStaticMarkup(
    <svg width="28" height="40" viewBox="0 0 28 40" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {pulse && (
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        )}
      </defs>
      <path
        d="M14 0C6.27 0 0 6.27 0 14c0 10.5 14 26 14 26s14-15.5 14-26C28 6.27 21.73 0 14 0z"
        fill={color}
        opacity="0.9"
        filter={pulse ? 'url(#glow)' : undefined}
      />
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9" />
    </svg>
  );
  return {
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [28, 40] as [number, number],
    iconAnchor: [14, 40] as [number, number],
    popupAnchor: [0, -40] as [number, number],
  };
}

export default function CompactMapInner({ shipments }: CompactMapInnerProps) {
  const mapData = useMemo(() => {
    if (!shipments.length) return null;

    const route = getRouteForStatus(shipments[0]?.status || 'IN_TRANSIT');
    const positions: [number, number][] = [];
    const markers: Array<{
      id: string;
      position: [number, number];
      label: string;
      status: string;
    }> = [];

    shipments.forEach((s, idx) => {
      const progress = idx * 25 + 30; // Spread markers along route
      const pos = getProgressPosition(route, Math.min(progress, 90));
      positions.push(pos);
      markers.push({
        id: s.id,
        position: pos,
        label: s.vehicleVIN || `${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || s.id.slice(0, 8),
        status: s.status,
      });
    });

    // Calculate center
    const center: [number, number] = positions.length > 0
      ? [
          positions.reduce((sum, p) => sum + p[0], 0) / positions.length,
          positions.reduce((sum, p) => sum + p[1], 0) / positions.length,
        ]
      : [30, 10];

    return { route, positions, markers, center };
  }, [shipments]);

  if (!mapData) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--background)]">
        <p className="text-xs text-[var(--text-secondary)]">No in-transit shipments to display</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={mapData.center}
      zoom={3}
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      scrollWheelZoom={false}
      style={{ height: '100%', width: '100%', borderRadius: '8px' }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <Polyline
        positions={mapData.route}
        pathOptions={{
          color: 'rgba(var(--accent-gold-rgb), 0.4)',
          weight: 2,
          dashArray: '6, 4',
        }}
      />
      {mapData.markers.map((m) => (
        <Marker
          key={m.id}
          position={m.position}
          icon={new (require('leaflet').Icon)(createMarkerIcon(
            m.status === 'IN_TRANSIT' ? '#10b981' : '#f59e0b',
            m.status === 'IN_TRANSIT'
          ))}
        >
          <Popup>
            <div style={{ fontSize: '12px', fontFamily: 'system-ui, sans-serif' }}>
              <strong>{m.label}</strong>
              <br />
              <span style={{ color: m.status === 'IN_TRANSIT' ? '#10b981' : '#f59e0b' }}>
                {m.status === 'IN_TRANSIT' ? 'At Sea' : 'To Destination'}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
