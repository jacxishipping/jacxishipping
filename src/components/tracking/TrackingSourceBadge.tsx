'use client';

import React from 'react';
import { Tooltip } from '@/components/design-system';
import { 
  Zap, 
  Ship, 
  Globe, 
  Anchor, 
  User, 
  Radio, 
  Plug,
  HelpCircle
} from 'lucide-react';

export interface TrackingSourceBadgeProps {
  source?: string | null;
  size?: 'xs' | 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function parseTrackingSource(source?: string | null): {
  key: string;
  label: string;
  fullLabel: string;
  icon: React.ReactNode;
  bg: string;
  color: string;
  border: string;
  description: string;
} {
  const s = (source || '').trim().toLowerCase();

  if (s.includes('supabase')) {
    return {
      key: 'supabase',
      label: 'Supabase API',
      fullLabel: 'Supabase ContainerTracking API',
      icon: <Zap className="w-3 h-3 text-emerald-500 shrink-0" />,
      bg: 'rgba(16, 185, 129, 0.1)',
      color: '#10B981',
      border: 'rgba(16, 185, 129, 0.25)',
      description: 'Tracked live by Supabase ContainerTracking Engine',
    };
  }

  if (s.includes('turkon')) {
    return {
      key: 'turkon',
      label: 'Turkon API',
      fullLabel: 'Turkon Line Online API',
      icon: <Ship className="w-3 h-3 text-sky-500 shrink-0" />,
      bg: 'rgba(14, 165, 233, 0.1)',
      color: '#0EA5E9',
      border: 'rgba(14, 165, 233, 0.25)',
      description: 'Tracked live by Turkon Online Direct REST Service',
    };
  }

  if (s.includes('pgl')) {
    return {
      key: 'pgl',
      label: 'PGL System',
      fullLabel: 'PGL Legacy Tracking System',
      icon: <Globe className="w-3 h-3 text-purple-500 shrink-0" />,
      bg: 'rgba(168, 85, 247, 0.1)',
      color: '#A855F7',
      border: 'rgba(168, 85, 247, 0.25)',
      description: 'Tracked via PGL Public Tracking System',
    };
  }

  if (s.includes('dcsa_sync') || s.includes('fallback')) {
    return {
      key: 'fallback',
      label: 'AIS Simulation',
      fullLabel: 'Simulated AIS Corridor Telemetry',
      icon: <Radio className="w-3 h-3 text-rose-500 shrink-0" />,
      bg: 'rgba(244, 63, 94, 0.1)',
      color: '#F43F5E',
      border: 'rgba(244, 63, 94, 0.25)',
      description: 'Estimated position based on AIS corridor telemetry',
    };
  }

  if (s.includes('carrier') || s.includes('maersk') || s.includes('msc') || s.includes('cma')) {
    const carrierName = source?.replace(/^(carrier\s*api\s*\(?|\)?)/gi, '') || 'Ocean Carrier';
    return {
      key: 'carrier',
      label: `Carrier API (${carrierName})`,
      fullLabel: `Direct Shipping Line API: ${carrierName}`,
      icon: <Anchor className="w-3 h-3 text-amber-500 shrink-0" />,
      bg: 'rgba(245, 158, 11, 0.1)',
      color: '#F59E0B',
      border: 'rgba(245, 158, 11, 0.25)',
      description: `Tracked by Direct Ocean Shipping Line (${carrierName})`,
    };
  }

  if (s.includes('webhook')) {
    return {
      key: 'webhook',
      label: 'Webhook',
      fullLabel: 'Real-time Carrier Webhook',
      icon: <Plug className="w-3 h-3 text-indigo-500 shrink-0" />,
      bg: 'rgba(99, 102, 241, 0.1)',
      color: '#6366F1',
      border: 'rgba(99, 102, 241, 0.25)',
      description: 'Pushed via Automated Carrier Webhook',
    };
  }

  if (s.includes('manual') || s.includes('dispatcher')) {
    return {
      key: 'manual',
      label: 'Manual Entry',
      fullLabel: 'Dispatcher / Manual Entry',
      icon: <User className="w-3 h-3 text-gray-400 shrink-0" />,
      bg: 'rgba(156, 163, 175, 0.1)',
      color: 'var(--text-secondary, #9CA3AF)',
      border: 'rgba(156, 163, 175, 0.25)',
      description: 'Recorded manually by dispatcher',
    };
  }

  if (s.includes('api')) {
    return {
      key: 'api',
      label: 'Tracking API',
      fullLabel: 'Carrier Tracking API',
      icon: <Radio className="w-3 h-3 text-cyan-500 shrink-0" />,
      bg: 'rgba(6, 182, 212, 0.1)',
      color: '#06B6D4',
      border: 'rgba(6, 182, 212, 0.25)',
      description: 'Tracked by Integrated Tracking API',
    };
  }

  return {
    key: 'unknown',
    label: source || 'System',
    fullLabel: source || 'System Recorded',
    icon: <HelpCircle className="w-3 h-3 text-gray-400 shrink-0" />,
    bg: 'rgba(255, 255, 255, 0.05)',
    color: 'var(--text-secondary, #9CA3AF)',
    border: 'var(--border, rgba(255, 255, 255, 0.1))',
    description: source ? `Source: ${source}` : 'System tracked event',
  };
}

export function TrackingSourceBadge({
  source,
  size = 'sm',
  className = '',
}: TrackingSourceBadgeProps) {
  const info = parseTrackingSource(source);

  const paddingY = size === 'xs' ? '2px' : size === 'sm' ? '3px' : '5px';
  const paddingX = size === 'xs' ? '6px' : size === 'sm' ? '8px' : '10px';
  const fontSize = size === 'xs' ? '0.7rem' : size === 'sm' ? '0.75rem' : '0.825rem';

  return (
    <Tooltip title={info.description} arrow placement="top">
      <span className={className} style={{display: 'inline-flex', alignItems: 'center', gap: '6px', paddingTop: paddingY, paddingBottom: paddingY, paddingLeft: paddingX, paddingRight: paddingX, borderRadius: '9999px', backgroundColor: info.bg, color: info.color, border: `1px solid ${info.border}`, fontWeight: 600, lineHeight: 1.2, userSelect: 'none', cursor: 'default', transition: 'all 0.15s ease-in-out'}}>
        {info.icon}
        <span>{info.label}</span>
      </span>
    </Tooltip>
  );
}
