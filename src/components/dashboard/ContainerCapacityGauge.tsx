'use client';

import React from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { Box as BoxIcon, Car, Scale, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';

export interface ContainerCapacityGaugeProps {
  containerType?: string; // e.g., '40HC', '40FT', '20FT', '45HC'
  itemCount: number;
  totalCBM?: number;
  totalWeightKg?: number;
  className?: string;
}

const CONTAINER_SPECS: Record<string, { maxCars: number; maxCBM: number; maxWeightKg: number; label: string }> = {
  '20FT': { maxCars: 2, maxCBM: 33.2, maxWeightKg: 21700, label: "20' Standard Dry" },
  '40FT': { maxCars: 3, maxCBM: 67.7, maxWeightKg: 26500, label: "40' Standard Dry" },
  '40HC': { maxCars: 4, maxCBM: 76.3, maxWeightKg: 26500, label: "40' High Cube" },
  '45HC': { maxCars: 5, maxCBM: 86.0, maxWeightKg: 27700, label: "45' High Cube" },
};

export function ContainerCapacityGauge({
  containerType = '40HC',
  itemCount,
  totalCBM,
  totalWeightKg,
}: ContainerCapacityGaugeProps) {
  // Normalize type
  const normalizedType = containerType.toUpperCase().replace(/[^0-9A-Z]/g, '');
  const matchedKey = Object.keys(CONTAINER_SPECS).find((k) => normalizedType.includes(k)) || '40HC';
  const spec = CONTAINER_SPECS[matchedKey];

  // Default estimations if not explicitly given
  const estimatedCBM = totalCBM ?? itemCount * 14.5;
  const estimatedWeight = totalWeightKg ?? itemCount * 1750;

  const carPercent = Math.min(100, Math.round((itemCount / spec.maxCars) * 100));
  const cbmPercent = Math.min(100, Math.round((estimatedCBM / spec.maxCBM) * 100));
  const weightPercent = Math.min(100, Math.round((estimatedWeight / spec.maxWeightKg) * 100));

  const isFull = itemCount >= spec.maxCars;
  const isOptimal = itemCount === spec.maxCars || (itemCount === spec.maxCars - 1 && cbmPercent > 70);

  return (
    <JXBox
      surface="elevated"
      padding="none"
      className="p-5 !rounded-xl !border-[var(--border)] !bg-[var(--panel)] shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
      style={{ fontFamily: 'inherit' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <BoxIcon size={18} style={{ color: 'var(--accent-gold)' }} />
          <span className="font-bold text-[0.92rem] text-[var(--text-primary)]">
            Stowing &amp; Capacity Utilization
          </span>
        </div>
        <div
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.72rem] font-bold"
          style={{
            backgroundColor: isFull
              ? 'rgba(34, 197, 94, 0.12)'
              : isOptimal
              ? 'rgba(59, 130, 246, 0.12)'
              : 'rgba(234, 179, 8, 0.12)',
            color: isFull ? '#16a34a' : isOptimal ? '#2563eb' : '#b45309',
            border: `1px solid ${
              isFull
                ? 'rgba(34, 197, 94, 0.3)'
                : isOptimal
                ? 'rgba(59, 130, 246, 0.3)'
                : 'rgba(234, 179, 8, 0.3)'
            }`,
          }}
        >
          {isFull ? (
            <>
              <CheckCircle2 size={12} /> Stowed Full
            </>
          ) : isOptimal ? (
            <>
              <Sparkles size={12} /> Optimal Stowing
            </>
          ) : (
            <>
              <ShieldAlert size={12} /> {spec.maxCars - itemCount} Slots Available
            </>
          )}
        </div>
      </div>

      {/* Grid of Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Car Slots */}
        <JXBox surface="subtle" padding="none" className="p-3 !rounded-lg !bg-[var(--background)] !border-[var(--border)] shadow-none">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <Car size={15} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[0.75rem] font-semibold text-[var(--text-secondary)]">
                Vehicle Slots
              </span>
            </div>
            <span className="text-[0.82rem] font-extrabold text-[var(--text-primary)]">
              {itemCount} / {spec.maxCars}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(var(--text-primary-rgb),0.08)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${carPercent}%`,
                backgroundColor: carPercent === 100 ? '#16a34a' : 'var(--accent-gold)',
              }}
            />
          </div>
          <span className="block text-[0.68rem] text-[var(--text-secondary)] mt-1.5">
            {spec.label} standard limit
          </span>
        </JXBox>

        {/* CBM Volume */}
        <JXBox surface="subtle" padding="none" className="p-3 !rounded-lg !bg-[var(--background)] !border-[var(--border)] shadow-none">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <BoxIcon size={15} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[0.75rem] font-semibold text-[var(--text-secondary)]">
                Volume (CBM)
              </span>
            </div>
            <span className="text-[0.82rem] font-extrabold text-[var(--text-primary)]">
              {estimatedCBM.toFixed(1)} / {spec.maxCBM} m³
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(var(--text-primary-rgb),0.08)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${cbmPercent}%`,
                backgroundColor: cbmPercent > 90 ? '#ef4444' : '#2563eb',
              }}
            />
          </div>
          <span className="block text-[0.68rem] text-[var(--text-secondary)] mt-1.5">
            {cbmPercent}% volumetric occupancy
          </span>
        </JXBox>

        {/* Payload Weight */}
        <JXBox surface="subtle" padding="none" className="p-3 !rounded-lg !bg-[var(--background)] !border-[var(--border)] shadow-none">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1.5">
              <Scale size={15} style={{ color: 'var(--text-secondary)' }} />
              <span className="text-[0.75rem] font-semibold text-[var(--text-secondary)]">
                Payload Weight
              </span>
            </div>
            <span className="text-[0.82rem] font-extrabold text-[var(--text-primary)]">
              {(estimatedWeight / 1000).toFixed(1)} / {(spec.maxWeightKg / 1000).toFixed(1)} T
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(var(--text-primary-rgb),0.08)]">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${weightPercent}%`,
                backgroundColor: weightPercent > 90 ? '#ef4444' : '#0d9488',
              }}
            />
          </div>
          <span className="block text-[0.68rem] text-[var(--text-secondary)] mt-1.5">
            {weightPercent}% max permissible mass
          </span>
        </JXBox>
      </div>
    </JXBox>
  );
}
