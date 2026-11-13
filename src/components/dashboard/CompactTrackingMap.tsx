'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';

// Dynamically import Leaflet map to avoid SSR issues
const CompactMapInner = dynamic(
  () => import('./CompactMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent-gold)] border-t-transparent" />
          <p className="text-[10px] text-[var(--text-secondary)]">Loading map...</p>
        </div>
      </div>
    ),
  }
);

interface CompactTrackingMapProps {
  shipments: Array<{
    id: string;
    vehicleMake?: string;
    vehicleModel?: string;
    vehicleVIN?: string;
    status: string;
  }>;
}

export default function CompactTrackingMap({ shipments }: CompactTrackingMapProps) {
  return <CompactMapInner shipments={shipments} />;
}
