'use client';

import React from 'react';
import { JXBox, JXTypography } from '@jacxishippingorg/jx-ui-react';
import { DollarSign, TrendingUp, TrendingDown, Layers, Receipt, ShieldCheck, AlertTriangle } from 'lucide-react';
import { formatMoney as formatCurrency } from '@/lib/format';

export interface ContainerProfitabilityProps {
  oceanFreightCost?: number;
  drayageCost?: number;
  terminalHandlingCost?: number;
  customsCost?: number;
  otherExpenses?: number;
  itemRevenues?: Array<{
    id: string;
    description: string;
    amount: number;
    vin?: string | null;
  }>;
}

export function ContainerProfitabilityCard({
  oceanFreightCost = 0,
  drayageCost = 0,
  terminalHandlingCost = 0,
  customsCost = 0,
  otherExpenses = 0,
  itemRevenues = [],
}: ContainerProfitabilityProps) {
  // Total Revenue
  const totalRevenue = itemRevenues.reduce((sum, item) => sum + (item.amount || 0), 0);

  // Total Expenses
  const totalExpenses =
    oceanFreightCost + drayageCost + terminalHandlingCost + customsCost + otherExpenses;

  // Net Profit & Margin
  const netProfit = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const isProfitable = netProfit > 0;
  const isHealthyMargin = marginPercent >= 20;

  return (
    <JXBox
      surface="elevated"
      padding="none"
      className="p-5 !rounded-xl !border-[var(--border)] !bg-[var(--panel)] shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
      style={{ fontFamily: 'inherit' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-5">
        <div className="flex items-center gap-2">
          <DollarSign size={18} style={{ color: 'var(--accent-gold)' }} />
          <JXTypography variant="body" className="!font-bold !text-[0.95rem] !text-[var(--text-primary)]">
            Container Unit Economics &amp; Profitability
          </JXTypography>
        </div>
        <div
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.75rem] font-bold"
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
      </div>

      {/* KPI Headline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <JXBox surface="subtle" padding="none" className="p-3.5 !rounded-lg !bg-[var(--background)] !border-[var(--border)] shadow-none">
          <div className="flex items-center gap-1.5 mb-1">
            <Receipt size={15} style={{ color: 'var(--text-secondary)' }} />
            <JXTypography variant="caption" className="!text-[0.75rem] !font-semibold !text-[var(--text-secondary)]">
              Total Cargo Revenue
            </JXTypography>
          </div>
          <JXTypography variant="h2" className="!text-[1.25rem] !font-extrabold !text-[#16a34a]">
            {formatCurrency(totalRevenue)}
          </JXTypography>
          <JXTypography variant="caption" className="!block !text-[0.7rem] !text-[var(--text-secondary)] !mt-0.5">
            {itemRevenues.length > 0 ? `${itemRevenues.length} freight invoices` : 'Estimated manifest total'}
          </JXTypography>
        </JXBox>

        <JXBox surface="subtle" padding="none" className="p-3.5 !rounded-lg !bg-[var(--background)] !border-[var(--border)] shadow-none">
          <div className="flex items-center gap-1.5 mb-1">
            <Layers size={15} style={{ color: 'var(--text-secondary)' }} />
            <JXTypography variant="caption" className="!text-[0.75rem] !font-semibold !text-[var(--text-secondary)]">
              Total Container Costs
            </JXTypography>
          </div>
          <JXTypography variant="h2" className="!text-[1.25rem] !font-extrabold !text-[var(--error)]">
            {formatCurrency(totalExpenses)}
          </JXTypography>
          <JXTypography variant="caption" className="!block !text-[0.7rem] !text-[var(--text-secondary)] !mt-0.5">
            Ocean + Drayage + Port fees
          </JXTypography>
        </JXBox>

        <JXBox
          surface="subtle"
          padding="none"
          className="p-3.5 !rounded-lg shadow-none"
          style={{
            backgroundColor: isProfitable ? 'rgba(34, 197, 94, 0.04)' : 'rgba(239, 68, 68, 0.04)',
            border: `1px solid ${isProfitable ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            {isProfitable ? (
              <TrendingUp size={15} style={{ color: '#16a34a' }} />
            ) : (
              <TrendingDown size={15} style={{ color: '#ef4444' }} />
            )}
            <JXTypography variant="caption" className="!text-[0.75rem] !font-semibold !text-[var(--text-secondary)]">
              Net Operating Margin
            </JXTypography>
          </div>
          <JXTypography
            variant="h2"
            className={[
              '!text-[1.25rem] !font-extrabold',
              isProfitable ? '!text-[#16a34a]' : '!text-[var(--error)]',
            ].join(' ')}
          >
            {formatCurrency(netProfit)}
          </JXTypography>
          <JXTypography
            variant="caption"
            className={[
              '!block !text-[0.7rem] !font-bold !mt-0.5',
              isProfitable ? '!text-[#16a34a]' : '!text-[var(--error)]',
            ].join(' ')}
          >
            {marginPercent.toFixed(1)}% gross margin
          </JXTypography>
        </JXBox>
      </div>

      {/* Cost Breakdown Accordion / Grid */}
      <JXBox surface="subtle" padding="none" className="p-3 !rounded-lg !bg-[var(--background)] !border-[var(--border)] shadow-none">
        <JXTypography variant="caption" className="!block !text-[0.75rem] !font-bold !uppercase !text-[var(--text-secondary)] !mb-2">
          Direct Cost Breakdown
        </JXTypography>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <JXTypography variant="caption" className="!block !text-[0.72rem] !text-[var(--text-secondary)]">Ocean Freight</JXTypography>
            <JXTypography variant="body" className="!text-[0.85rem] !font-bold">{formatCurrency(oceanFreightCost)}</JXTypography>
          </div>
          <div>
            <JXTypography variant="caption" className="!block !text-[0.72rem] !text-[var(--text-secondary)]">Drayage / Hauling</JXTypography>
            <JXTypography variant="body" className="!text-[0.85rem] !font-bold">{formatCurrency(drayageCost)}</JXTypography>
          </div>
          <div>
            <JXTypography variant="caption" className="!block !text-[0.72rem] !text-[var(--text-secondary)]">Terminal Handling</JXTypography>
            <JXTypography variant="body" className="!text-[0.85rem] !font-bold">{formatCurrency(terminalHandlingCost)}</JXTypography>
          </div>
          <div>
            <JXTypography variant="caption" className="!block !text-[0.72rem] !text-[var(--text-secondary)]">Customs &amp; Port Fees</JXTypography>
            <JXTypography variant="body" className="!text-[0.85rem] !font-bold">{formatCurrency(customsCost)}</JXTypography>
          </div>
        </div>
      </JXBox>
    </JXBox>
  );
}
