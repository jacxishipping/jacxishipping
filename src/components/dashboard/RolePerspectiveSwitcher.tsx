'use client';

import React from 'react';
import { JXBox, SpringButton } from '@jacxishippingorg/jx-ui-react';
import { 
  LayoutGrid, 
  Truck, 
  Anchor, 
  DollarSign, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export type DashboardPerspective = 'all' | 'dispatcher' | 'port_yard' | 'finance';

interface PerspectiveConfig {
  id: DashboardPerspective;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
  badgeBg: string;
}

export const DASHBOARD_PERSPECTIVES: PerspectiveConfig[] = [
  {
    id: 'all',
    label: 'All Operations',
    shortLabel: 'Overview',
    icon: LayoutGrid,
    description: 'Executive cross-functional operational visibility across all pipelines',
    color: 'var(--accent-gold)',
    badgeBg: 'rgba(var(--accent-gold-rgb), 0.12)',
  },
  {
    id: 'dispatcher',
    label: 'Dispatch Priority',
    shortLabel: 'Dispatch',
    icon: Truck,
    description: 'Spotlights inland tow carriers, yard pickups, and dispatch route aging',
    color: '#F59E0B',
    badgeBg: 'rgba(245, 158, 11, 0.12)',
  },
  {
    id: 'port_yard',
    label: 'Port & Yard Master',
    shortLabel: 'Port & Yard',
    icon: Anchor,
    description: 'Spotlights container stuffing, port intake, gate passes & demurrage risk',
    color: '#06B6D4',
    badgeBg: 'rgba(6, 182, 212, 0.12)',
  },
  {
    id: 'finance',
    label: 'Finance & Controller',
    shortLabel: 'Finance',
    icon: DollarSign,
    description: 'Spotlights unpaid purchase prices, overdue invoices & ledger balancing',
    color: '#10B981',
    badgeBg: 'rgba(16, 185, 129, 0.12)',
  },
];

interface RolePerspectiveSwitcherProps {
  activePerspective: DashboardPerspective;
  onChange: (perspective: DashboardPerspective) => void;
  className?: string;
}

export function RolePerspectiveSwitcher({
  activePerspective,
  onChange,
  className = '',
}: RolePerspectiveSwitcherProps) {
  const activeConfig = DASHBOARD_PERSPECTIVES.find((p) => p.id === activePerspective) || DASHBOARD_PERSPECTIVES[0];

  return (
    <JXBox
      surface="elevated"
      padding="none"
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2 !rounded-2xl !bg-[var(--panel)] !border-[var(--border)] shadow-sm ${className}`}
      style={{ fontFamily: 'inherit' }}
    >
      {/* Label and Active Descriptor */}
      <div className="flex items-center gap-2 px-1">
        <div 
          className="flex items-center justify-center w-6 h-6 rounded-lg transition-colors"
          style={{ backgroundColor: activeConfig.badgeBg, color: activeConfig.color }}
        >
          <activeConfig.icon className="w-3.5 h-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--text-primary)] leading-tight flex items-center gap-1.5">
            <span>{activeConfig.label}</span>
            <span className="hidden md:inline-block text-[10px] font-normal text-[var(--text-secondary)]">
              &bull; {activeConfig.description}
            </span>
          </p>
        </div>
      </div>

      {/* Segmented Perspective Switcher Pills */}
      <div className="inline-flex items-center p-1 rounded-xl bg-[rgba(var(--text-primary-rgb),0.04)] border border-[var(--border)] gap-1 self-start sm:self-auto overflow-x-auto max-w-full">
        {DASHBOARD_PERSPECTIVES.map((p) => {
          const Icon = p.icon;
          const isActive = activePerspective === p.id;

          return (
            <SpringButton
              key={p.id}
              type="button"
              variant={isActive ? 'solid' : 'outline'}
              tone="primary"
              onClick={() => onChange(p.id)}
              style={{ fontFamily: 'inherit' }}
              className={`flex items-center gap-1.5 !h-auto !min-h-0 !px-3 !py-1.5 !rounded-lg !text-xs !font-semibold whitespace-nowrap ${
                isActive
                  ? '!border-transparent !bg-[var(--accent-gold)] !text-white shadow-sm'
                  : '!border-transparent !bg-transparent !text-[var(--text-secondary)] hover:!text-[var(--text-primary)] hover:!bg-[rgba(var(--text-primary-rgb),0.05)] !shadow-none'
              }`}
              title={p.description}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{p.shortLabel}</span>
            </SpringButton>
          );
        })}
      </div>
    </JXBox>
  );
}
