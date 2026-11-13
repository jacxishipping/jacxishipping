'use client';

import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { DollarSign, TrendingUp, ShieldCheck, AlertTriangle } from 'lucide-react';
import { formatMoney as formatCurrency } from '@/lib/format';

export interface ShipmentProfitabilityProps {
  billedRevenue?: number;
  dispatchCost?: number;
  oceanFreightCost?: number;
  terminalStorageCost?: number;
  otherExpensesCost?: number;
  compact?: boolean;
}

export function ShipmentProfitabilityCard({
  billedRevenue = 0,
  dispatchCost = 0,
  oceanFreightCost = 0,
  terminalStorageCost = 0,
  otherExpensesCost = 0,
  compact = false,
}: ShipmentProfitabilityProps) {
  const totalExpenses = dispatchCost + oceanFreightCost + terminalStorageCost + otherExpensesCost;
  const netProfit = billedRevenue - totalExpenses;
  const marginPercent = billedRevenue > 0 ? (netProfit / billedRevenue) * 100 : 0;

  const isProfitable = netProfit > 0;
  const isHealthyMargin = marginPercent >= 20;
  const isWarningMargin = isProfitable && marginPercent < 10;

  // Percentage shares of revenue for stacked breakdown
  const dispatchShare = billedRevenue > 0 ? Math.min(100, Math.max(0, (dispatchCost / billedRevenue) * 100)) : 0;
  const oceanShare = billedRevenue > 0 ? Math.min(100, Math.max(0, (oceanFreightCost / billedRevenue) * 100)) : 0;
  const otherShare = billedRevenue > 0 ? Math.min(100, Math.max(0, ((terminalStorageCost + otherExpensesCost) / billedRevenue) * 100)) : 0;
  const profitShare = billedRevenue > 0 && isProfitable ? Math.min(100, Math.max(0, (netProfit / billedRevenue) * 100)) : 0;

  return (
    <JXBox
      surface="elevated"
      padding="none"
      className={[
        '!rounded-xl !border-[var(--border)] !bg-[var(--panel)] jx-elevation-1 jx-spring',
        compact ? 'p-4' : 'p-5',
      ].join(' ')}
      style={{ fontFamily: 'inherit' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-md"
            style={{
              backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)',
              color: 'var(--accent-gold)',
            }}
          >
            <DollarSign size={16} />
          </div>
          <span
            className={[
              'font-bold text-[var(--text-primary)]',
              compact ? 'text-[0.875rem]' : 'text-[0.95rem]',
            ].join(' ')}
          >
            Shipment Unit Economics &amp; Profitability
          </span>
        </div>

        {billedRevenue > 0 && (
          <div
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[0.75rem] font-bold"
            style={{
              backgroundColor: isHealthyMargin
                ? 'rgba(34, 197, 94, 0.12)'
                : isProfitable
                ? 'rgba(234, 179, 8, 0.12)'
                : 'rgba(239, 68, 68, 0.12)',
              color: isHealthyMargin ? '#16a34a' : isProfitable ? '#b45309' : '#dc2626',
              border: `1px solid ${
                isHealthyMargin
                  ? 'rgba(34, 197, 94, 0.3)'
                  : isProfitable
                  ? 'rgba(234, 179, 8, 0.3)'
                  : 'rgba(239, 68, 68, 0.3)'
              }`,
            }}
          >
            {isHealthyMargin ? (
              <>
                <ShieldCheck size={14} /> High Margin ({marginPercent.toFixed(1)}%)
              </>
            ) : isProfitable ? (
              <>
                <TrendingUp size={14} /> Moderate Margin ({marginPercent.toFixed(1)}%)
              </>
            ) : (
              <>
                <AlertTriangle size={14} /> Negative Spread ({marginPercent.toFixed(1)}%)
              </>
            )}
          </div>
        )}
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        {/* Customer Invoiced Revenue */}
        <JXBox surface="subtle" padding="none" className="p-3 !rounded-lg !bg-[var(--background)] !border-[var(--border)] shadow-none">
          <span className="block text-[0.725rem] font-semibold text-[var(--text-secondary)] uppercase mb-0.5">
            Customer Revenue
          </span>
          <div className="text-[1.15rem] font-extrabold text-[var(--text-primary)]">
            {formatCurrency(billedRevenue)}
          </div>
          <span className="block text-[0.7rem] text-[var(--text-secondary)]">
            Total invoiced &amp; billed charges
          </span>
        </JXBox>

        {/* Total Cost / Expenses */}
        <JXBox surface="subtle" padding="none" className="p-3 !rounded-lg !bg-[var(--background)] !border-[var(--border)] shadow-none">
          <span className="block text-[0.725rem] font-semibold text-[var(--text-secondary)] uppercase mb-0.5">
            Direct Expenses
          </span>
          <div className="text-[1.15rem] font-extrabold text-[#dc2626]">
            {formatCurrency(totalExpenses)}
          </div>
          <span className="block text-[0.7rem] text-[var(--text-secondary)]">
            Towing, freight &amp; port fees
          </span>
        </JXBox>

        {/* Net Profit & Margin */}
        <JXBox
          surface="subtle"
          padding="none"
          className="p-3 !rounded-lg shadow-none"
          style={{
            backgroundColor: isProfitable ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
            border: `1px solid ${isProfitable ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
          }}
        >
          <span
            className={[
              'block text-[0.725rem] font-semibold uppercase mb-0.5',
              isProfitable ? 'text-[#16a34a]' : 'text-[#dc2626]',
            ].join(' ')}
          >
            Net Margin
          </span>
          <div className="flex items-baseline gap-2">
            <div
              className={[
                'text-[1.15rem] font-extrabold',
                isProfitable ? 'text-[#16a34a]' : 'text-[#dc2626]',
              ].join(' ')}
            >
              {isProfitable ? '+' : ''}{formatCurrency(netProfit)}
            </div>
            <span
              className={[
                'text-[0.85rem] font-bold',
                isProfitable ? 'text-[#16a34a]' : 'text-[#dc2626]',
              ].join(' ')}
            >
              ({marginPercent.toFixed(1)}%)
            </span>
          </div>
          <span className="block text-[0.7rem] text-[var(--text-secondary)]">
            {isProfitable ? 'Net profit captured' : 'Operating at an expense loss'}
          </span>
        </JXBox>
      </div>

      {/* Visual Cost & Revenue Distribution Bar */}
      {billedRevenue > 0 && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-[0.75rem] font-semibold text-[var(--text-secondary)]">
              Cost Distribution Share
            </span>
            <span className="text-[0.75rem] text-[var(--text-secondary)]">
              100% of Revenue
            </span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[var(--border)] gap-[1px]">
            {dispatchShare > 0 && (
              <Tooltip title={`Dispatch / Towing: ${formatCurrency(dispatchCost)} (${dispatchShare.toFixed(1)}%)`}>
                <Box sx={{ width: `${dispatchShare}%`, bgcolor: '#3b82f6', transition: 'width 0.3s ease' }} />
              </Tooltip>
            )}
            {oceanShare > 0 && (
              <Tooltip title={`Ocean Freight Share: ${formatCurrency(oceanFreightCost)} (${oceanShare.toFixed(1)}%)`}>
                <Box sx={{ width: `${oceanShare}%`, bgcolor: '#8b5cf6', transition: 'width 0.3s ease' }} />
              </Tooltip>
            )}
            {otherShare > 0 && (
              <Tooltip title={`Port/Storage/Other: ${formatCurrency(terminalStorageCost + otherExpensesCost)} (${otherShare.toFixed(1)}%)`}>
                <Box sx={{ width: `${otherShare}%`, bgcolor: '#f59e0b', transition: 'width 0.3s ease' }} />
              </Tooltip>
            )}
            {profitShare > 0 && (
              <Tooltip title={`Net Profit: ${formatCurrency(netProfit)} (${profitShare.toFixed(1)}%)`}>
                <Box sx={{ width: `${profitShare}%`, bgcolor: '#22c55e', transition: 'width 0.3s ease' }} />
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Cost Breakdown Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" />
          <div className="min-w-0">
            <span className="block truncate text-[0.7rem] text-[var(--text-secondary)]">
              Towing / Dispatch
            </span>
            <div className="text-[0.8125rem] font-bold text-[var(--text-primary)]">
              {formatCurrency(dispatchCost)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#8b5cf6] shrink-0" />
          <div className="min-w-0">
            <span className="block truncate text-[0.7rem] text-[var(--text-secondary)]">
              Ocean Freight
            </span>
            <div className="text-[0.8125rem] font-bold text-[var(--text-primary)]">
              {formatCurrency(oceanFreightCost)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b] shrink-0" />
          <div className="min-w-0">
            <span className="block truncate text-[0.7rem] text-[var(--text-secondary)]">
              Storage &amp; Customs
            </span>
            <div className="text-[0.8125rem] font-bold text-[var(--text-primary)]">
              {formatCurrency(terminalStorageCost)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--text-secondary)] shrink-0" />
          <div className="min-w-0">
            <span className="block truncate text-[0.7rem] text-[var(--text-secondary)]">
              Other Expenses
            </span>
            <div className="text-[0.8125rem] font-bold text-[var(--text-primary)]">
              {formatCurrency(otherExpensesCost)}
            </div>
          </div>
        </div>
      </div>
    </JXBox>
  );
}
