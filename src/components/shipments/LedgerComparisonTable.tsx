'use client';

import { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Link2,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  X,
} from 'lucide-react';
import { Button, Tooltip, toast } from '@/components/design-system';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/format';
import type {
  ComparisonTransactionWithDrillDown,
  LinkedCompanyLedgerEntry,
} from '@/components/shipments/shipment-detail-types';

export type LedgerComparisonTableProps = {
  transactions: ComparisonTransactionWithDrillDown[];
  companyChargedNet: number;
  companyDebitsTotal: number;
  companyCreditsTotal: number;
  customerChargedNet: number;
  customerDebitsTotal: number;
  customerCreditsTotal: number;
  netDifference: number;
  shipmentNumber?: string;
  onOpenCompanyLedgerEntry: (entry: LinkedCompanyLedgerEntry) => void;
};

type SourceFilter = 'ALL' | 'COMPANY' | 'CUSTOMER';
type TypeFilter = 'ALL' | 'DEBIT' | 'CREDIT';
type SortOption = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC';
type ViewMode = 'unified' | 'split';

export function LedgerComparisonTable({
  transactions,
  companyChargedNet,
  companyDebitsTotal,
  companyCreditsTotal,
  customerChargedNet,
  customerDebitsTotal,
  customerCreditsTotal,
  netDifference,
  shipmentNumber,
  onOpenCompanyLedgerEntry,
}: LedgerComparisonTableProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('DATE_DESC');
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10);

  // Profit Margin & Counts
  const marginPercentage = useMemo(() => {
    if (customerChargedNet === 0) return 0;
    return (netDifference / customerChargedNet) * 100;
  }, [customerChargedNet, netDifference]);

  const stats = useMemo(() => {
    let companyCount = 0;
    let customerCount = 0;
    let linkedCount = 0;

    for (const t of transactions) {
      if (t.source === 'COMPANY') {
        companyCount++;
      } else {
        customerCount++;
        if (t.linkedCompanyLedgerEntry) linkedCount++;
      }
    }

    return {
      total: transactions.length,
      companyCount,
      customerCount,
      linkedCount,
    };
  }, [transactions]);

  // Toggle Row Expansion
  const toggleRowExpanded = (id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllExpanded = () => {
    if (expandedRowIds.size === filteredTransactions.length) {
      setExpandedRowIds(new Set());
    } else {
      setExpandedRowIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return transactions
      .filter((entry) => {
        // Source filter
        if (sourceFilter !== 'ALL' && entry.source !== sourceFilter) return false;

        // Type filter
        if (typeFilter !== 'ALL' && entry.type !== typeFilter) return false;

        // Search query
        if (q) {
          const descMatch = entry.description?.toLowerCase().includes(q);
          const refMatch = entry.reference?.toLowerCase().includes(q);
          const notesMatch = entry.notes?.toLowerCase().includes(q);
          const idMatch = entry.id.toLowerCase().includes(q);
          const companyNameMatch =
            entry.source === 'COMPANY' &&
            entry.companyLedgerEntry?.company?.name?.toLowerCase().includes(q);

          if (!descMatch && !refMatch && !notesMatch && !idMatch && !companyNameMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'DATE_DESC') {
          return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
        }
        if (sortOption === 'DATE_ASC') {
          return new Date(a.transactionDate).getTime() - new Date(b.transactionDate).getTime();
        }
        if (sortOption === 'AMOUNT_DESC') {
          return b.amount - a.amount;
        }
        if (sortOption === 'AMOUNT_ASC') {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [transactions, sourceFilter, typeFilter, searchQuery, sortOption]);

  // Pagination
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(filteredTransactions.length / pageSize);
  const pagedTransactions = useMemo(() => {
    if (pageSize === 'ALL') return filteredTransactions;
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = ['Source', 'Date', 'Type', 'Amount', 'Description', 'Reference', 'Company/Carrier', 'Notes'];
    const rows = filteredTransactions.map((t) => {
      const companyName = t.source === 'COMPANY' ? t.companyLedgerEntry.company?.name || '' : '';
      return [
        `"${t.source}"`,
        `"${new Date(t.transactionDate).toISOString().split('T')[0]}"`,
        `"${t.type}"`,
        t.type === 'DEBIT' ? `-${t.amount.toFixed(2)}` : `+${t.amount.toFixed(2)}`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.reference || '').replace(/"/g, '""')}"`,
        `"${companyName.replace(/"/g, '""')}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ledger-comparison-${shipmentNumber || 'shipment'}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${filteredTransactions.length} transactions to CSV`);
  };

  // Copy Summary
  const handleCopySummary = async () => {
    const summaryText = [
      `LEDGER COMPARISON SUMMARY ${shipmentNumber ? `(${shipmentNumber})` : ''}`,
      `Generated: ${new Date().toLocaleString()}`,
      `----------------------------------------`,
      `• Company Charged (Net Cost): $${companyChargedNet.toFixed(2)} [Debits: $${companyDebitsTotal.toFixed(2)} | Credits: $${companyCreditsTotal.toFixed(2)}]`,
      `• Charged to Customer (Net Revenue): $${customerChargedNet.toFixed(2)} [Debits: $${customerDebitsTotal.toFixed(2)} | Credits: $${customerCreditsTotal.toFixed(2)}]`,
      `• Net Difference (Customer - Company): ${netDifference >= 0 ? '+' : ''}$${netDifference.toFixed(2)} (${marginPercentage.toFixed(1)}% margin)`,
      `• Total Transactions: ${transactions.length} (${stats.companyCount} Company, ${stats.customerCount} Customer)`,
      `----------------------------------------`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summaryText);
      toast.success('Summary copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSourceFilter('ALL');
    setTypeFilter('ALL');
    setSortOption('DATE_DESC');
    setPage(1);
  };

  // Separate lists for Split/Side-by-Side View
  const splitCompanyTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.source === 'COMPANY'),
    [filteredTransactions]
  );
  const splitCustomerTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.source === 'CUSTOMER'),
    [filteredTransactions]
  );

  return (
    <div className="space-y-4">
      {/* KPI Comparison Summary Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* Company Charged */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm transition-all hover:border-[var(--error)]/30 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--error)]/25 bg-[var(--error)]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--error)]">
              <Building2 className="h-3 w-3" />
              Company Cost (Net)
            </span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Payable</span>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl font-bold tracking-tight text-[var(--error)] tabular-nums">
              {formatMoney(companyChargedNet)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-0.5 font-medium">
                <span className="text-[var(--error)]">Debits:</span> {formatMoney(companyDebitsTotal)}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-0.5 font-medium">
                <span className="text-[var(--success)]">Credits:</span> {formatMoney(companyCreditsTotal)}
              </span>
            </div>
          </div>
          <div className="mt-3 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--text-secondary)]">
            Carrier &amp; vendor ledger outlays
          </div>
        </div>

        {/* Customer Charged */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm transition-all hover:border-[var(--success)]/30 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--success)]">
              <UserCheck className="h-3 w-3" />
              Customer Billed (Net)
            </span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Receivable</span>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl font-bold tracking-tight text-[var(--success)] tabular-nums">
              {formatMoney(customerChargedNet)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-0.5 font-medium">
                <span className="text-[var(--error)]">Debits:</span> {formatMoney(customerDebitsTotal)}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-0.5 font-medium">
                <span className="text-[var(--success)]">Credits:</span> {formatMoney(customerCreditsTotal)}
              </span>
            </div>
          </div>
          <div className="mt-3 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--text-secondary)]">
            Client billings &amp; settled payments
          </div>
        </div>

        {/* Net Margin / Difference */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm transition-all hover:border-[var(--accent-gold)]/40 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
              {netDifference >= 0 ? (
                <TrendingUp className="h-3 w-3 text-[var(--success)]" />
              ) : (
                <TrendingDown className="h-3 w-3 text-[var(--error)]" />
              )}
              Net Margin (Diff)
            </span>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                netDifference >= 0
                  ? 'border border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                  : 'border border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]'
              )}
            >
              {netDifference >= 0 ? '+' : ''}
              {marginPercentage.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3">
            <p
              className={cn(
                'font-mono text-2xl font-bold tracking-tight tabular-nums',
                netDifference >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
              )}
            >
              {netDifference >= 0 ? '+' : '−'}
              {formatMoney(Math.abs(netDifference))}
            </p>
            <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
              Customer Net − Company Net
            </p>
          </div>
          <div className="mt-3 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--text-secondary)]">
            {netDifference >= 0 ? 'Profitable shipment margin' : 'Deficit / cost overrun alert'}
          </div>
        </div>

        {/* Audit & Reconciliation Stats */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-blue-500">
              <Layers className="h-3 w-3" />
              Audit Integrity
            </span>
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">
              {stats.linkedCount} linked
            </span>
          </div>
          <div className="mt-3">
            <p className="font-mono text-2xl font-bold tracking-tight text-[var(--text-primary)] tabular-nums">
              {stats.total}{' '}
              <span className="text-sm font-normal text-[var(--text-secondary)]">entries</span>
            </p>
            <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <span className="font-medium text-[var(--text-primary)]">{stats.companyCount}</span> Company
              <span>•</span>
              <span className="font-medium text-[var(--text-primary)]">{stats.customerCount}</span> Customer
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[11px]">
            <span className="text-[var(--text-secondary)]">Drilldown active</span>
            <span className="font-semibold text-[var(--accent-gold-text)]">Double-entry ready</span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] shadow-sm">
        {/* Header & Controls Toolbar */}
        <div className="border-b border-[var(--border)] bg-[var(--background)]/60 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                  Ledger Comparison &amp; Audit
                </h3>
                <span className="rounded-full border border-[var(--border)] bg-[var(--panel)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--text-secondary)]">
                  {filteredTransactions.length} of {transactions.length}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Examine individual debit and credit transactions across Company payables and Customer receivables.
              </p>
            </div>

            {/* Quick Actions (Export, Copy, View Mode) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* View Mode Toggle */}
              <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('unified')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                    viewMode === 'unified'
                      ? 'bg-[var(--accent-gold)] text-black shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                  aria-label="Unified Feed View"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Unified</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                    viewMode === 'split'
                      ? 'bg-[var(--accent-gold)] text-black shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                  aria-label="Side-by-side View"
                >
                  <Columns2 className="h-3.5 w-3.5" />
                  <span>Side-by-Side</span>
                </button>
              </div>

              {/* Copy Summary Button */}
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
                title="Copy comparison summary to clipboard"
                aria-label="Copy comparison summary"
              >
                <Copy className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <span className="hidden sm:inline">Copy</span>
              </button>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-gold)]"
                title="Export transactions to CSV"
                aria-label="Export transactions to CSV"
              >
                <Download className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
            {/* Search Input */}
            <div className="relative sm:col-span-2 lg:col-span-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search description, reference, carrier, notes..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1.5 pl-8 pr-8 text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] transition-colors focus:border-[var(--accent-gold)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Source Filter Tabs */}
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1 sm:col-span-2 lg:col-span-4">
              {(
                [
                  { value: 'ALL', label: 'All', count: stats.total },
                  { value: 'COMPANY', label: 'Company', count: stats.companyCount },
                  { value: 'CUSTOMER', label: 'Customer', count: stats.customerCount },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => {
                    setSourceFilter(tab.value);
                    setPage(1);
                  }}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                    sourceFilter === tab.value
                      ? 'bg-[var(--background)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[10px] font-mono',
                      sourceFilter === tab.value
                        ? 'bg-[var(--panel)] text-[var(--text-primary)]'
                        : 'bg-[var(--background)] text-[var(--text-secondary)]'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Type Filter */}
            <div className="lg:col-span-3 flex items-center gap-2">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TypeFilter);
                  setPage(1);
                }}
                className="w-1/2 rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1.5 px-2 text-xs text-[var(--text-primary)] transition-colors focus:border-[var(--accent-gold)] focus:outline-none"
                aria-label="Filter by transaction type"
              >
                <option value="ALL">All Types</option>
                <option value="DEBIT">Debits (− Outflow)</option>
                <option value="CREDIT">Credits (+ Inflow)</option>
              </select>

              {/* Sort Selector */}
              <select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value as SortOption);
                  setPage(1);
                }}
                className="w-1/2 rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1.5 px-2 text-xs text-[var(--text-primary)] transition-colors focus:border-[var(--accent-gold)] focus:outline-none"
                aria-label="Sort transactions"
              >
                <option value="DATE_DESC">Date (Newest)</option>
                <option value="DATE_ASC">Date (Oldest)</option>
                <option value="AMOUNT_DESC">Amount (High to Low)</option>
                <option value="AMOUNT_ASC">Amount (Low to High)</option>
              </select>
            </div>
          </div>
        </div>

        {/* VIEW 1: UNIFIED FEED TABLE */}
        {viewMode === 'unified' && (
          <div>
            {filteredTransactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="rounded-full border border-[var(--border)] bg-[var(--background)] p-3 text-[var(--text-secondary)]">
                  <Filter className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">
                  No matching ledger transactions found
                </p>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {transactions.length === 0
                    ? 'No company or customer ledger records are currently attached to this shipment.'
                    : 'Try loosening your search query or reset your filters.'}
                </p>
                {transactions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                    className="mt-4 gap-1.5 text-xs"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Reset All Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--background)]/90 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      <th className="w-10 px-3 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={toggleAllExpanded}
                          className="rounded p-1 text-[var(--text-secondary)] hover:bg-[var(--panel)] hover:text-[var(--text-primary)]"
                          title={expandedRowIds.size === filteredTransactions.length ? 'Collapse All' : 'Expand All'}
                          aria-label="Toggle all rows"
                        >
                          {expandedRowIds.size === filteredTransactions.length ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </th>
                      <th className="px-3 py-2.5">Source &amp; Entity</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Description &amp; Context</th>
                      <th className="px-3 py-2.5">Flow Type</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-3 py-2.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-xs">
                    {pagedTransactions.map((entry) => {
                      const isExpanded = expandedRowIds.has(entry.id);
                      const isDebit = entry.type === 'DEBIT';
                      const isCompany = entry.source === 'COMPANY';
                      const companyName = isCompany
                        ? entry.companyLedgerEntry?.company?.name || 'Carrier / Partner'
                        : null;

                      return (
                        <tr
                          key={entry.id}
                          className={cn(
                            'group transition-colors hover:bg-[var(--background)]/70',
                            isExpanded && 'bg-[var(--background)]/40'
                          )}
                        >
                          <td colSpan={7} className="p-0">
                            {/* Main Row */}
                            <div className="grid grid-cols-12 items-center px-3 py-2.5">
                              {/* Expand Chevron */}
                              <div className="col-span-1 flex items-center justify-center">
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpanded(entry.id)}
                                  className="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--panel)] hover:text-[var(--text-primary)]"
                                  aria-label={isExpanded ? 'Collapse row details' : 'Expand row details'}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </button>
                              </div>

                              {/* Source Badge */}
                              <div className="col-span-2">
                                <div className="flex flex-col items-start gap-1">
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                                      isCompany
                                        ? 'border border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]'
                                        : 'border border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                                    )}
                                  >
                                    {isCompany ? (
                                      <Building2 className="h-3 w-3" />
                                    ) : (
                                      <UserCheck className="h-3 w-3" />
                                    )}
                                    {entry.source}
                                  </span>
                                  {companyName && (
                                    <span
                                      className="truncate text-[10px] font-medium text-[var(--text-secondary)] max-w-[130px]"
                                      title={companyName}
                                    >
                                      {companyName}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Date */}
                              <div className="col-span-2 text-[var(--text-secondary)]">
                                <div className="flex items-center gap-1.5 font-medium">
                                  <Calendar className="h-3 w-3 text-[var(--text-secondary)]/70" />
                                  <span>{new Date(entry.transactionDate).toLocaleDateString()}</span>
                                </div>
                              </div>

                              {/* Description & Reference */}
                              <div className="col-span-4 pr-2">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className="truncate font-semibold text-[var(--text-primary)]"
                                      title={entry.description}
                                    >
                                      {entry.description}
                                    </span>
                                    {entry.reference && (
                                      <span
                                        className="shrink-0 rounded border border-[var(--border)] bg-[var(--panel)] px-1.5 py-0.2 font-mono text-[10px] text-[var(--text-secondary)]"
                                        title={`Reference: ${entry.reference}`}
                                      >
                                        #{entry.reference}
                                      </span>
                                    )}
                                  </div>
                                  {/* Matched Pill */}
                                  {!isCompany && entry.linkedCompanyLedgerEntry && (
                                    <div className="flex items-center gap-1 text-[10px] text-[var(--accent-gold-text)] font-medium">
                                      <Link2 className="h-2.5 w-2.5" />
                                      <span>Matched to Carrier Entry</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Type Badge */}
                              <div className="col-span-1">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                    isDebit
                                      ? 'border border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]'
                                      : 'border border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                                  )}
                                >
                                  {isDebit ? <Minus className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
                                  {entry.type}
                                </span>
                              </div>

                              {/* Amount */}
                              <div
                                className={cn(
                                  'col-span-1 text-right font-mono text-xs font-bold tabular-nums',
                                  isDebit ? 'text-[var(--error)]' : 'text-[var(--success)]'
                                )}
                              >
                                {isDebit ? '−' : '+'}
                                {formatMoney(entry.amount)}
                              </div>

                              {/* Action */}
                              <div className="col-span-1 flex justify-end">
                                {isCompany && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenCompanyLedgerEntry(entry.companyLedgerEntry)}
                                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-gold-text)] transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10"
                                    title="Inspect in Company Ledger"
                                  >
                                    <span>Inspect</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </button>
                                )}
                                {!isCompany && entry.linkedCompanyLedgerEntry && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenCompanyLedgerEntry(entry.linkedCompanyLedgerEntry!)}
                                    className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-gold-text)] transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10"
                                    title="Open matched Company Ledger entry"
                                  >
                                    <span>Carrier</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Accordion Expanded Detail Drawer */}
                            {isExpanded && (
                              <div className="border-t border-[var(--border)] bg-[var(--panel)] px-6 py-3.5">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                  {/* Info Column 1: Record Identifiers */}
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                      Record Details
                                    </p>
                                    <div className="flex flex-col gap-1 text-[11px]">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[var(--text-secondary)]">Transaction ID:</span>
                                        <span className="font-mono font-medium text-[var(--text-primary)]">
                                          {entry.id}
                                        </span>
                                      </div>
                                      {entry.reference && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-[var(--text-secondary)]">Reference / Ref #:</span>
                                          <span className="font-mono font-semibold text-[var(--accent-gold-text)]">
                                            {entry.reference}
                                          </span>
                                        </div>
                                      )}
                                      {entry.balance !== undefined && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-[var(--text-secondary)]">Running Balance:</span>
                                          <span className="font-mono font-semibold text-[var(--text-primary)]">
                                            {formatMoney(entry.balance)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Info Column 2: Partner / Context */}
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                      Entity Context
                                    </p>
                                    <div className="flex flex-col gap-1 text-[11px]">
                                      {isCompany ? (
                                        <>
                                          <div className="flex items-center justify-between">
                                            <span className="text-[var(--text-secondary)]">Company:</span>
                                            <span className="font-semibold text-[var(--text-primary)]">
                                              {entry.companyLedgerEntry.company?.name || '—'}
                                            </span>
                                          </div>
                                          {entry.companyLedgerEntry.company?.code && (
                                            <div className="flex items-center justify-between">
                                              <span className="text-[var(--text-secondary)]">Carrier Code:</span>
                                              <span className="font-mono text-[var(--text-primary)]">
                                                {entry.companyLedgerEntry.company.code}
                                              </span>
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <div className="flex items-center justify-between">
                                          <span className="text-[var(--text-secondary)]">Account:</span>
                                          <span className="font-semibold text-[var(--text-primary)]">
                                            Customer Billing Account
                                          </span>
                                        </div>
                                      )}
                                      <div className="flex items-center justify-between">
                                        <span className="text-[var(--text-secondary)]">Direction:</span>
                                        <span
                                          className={cn(
                                            'font-semibold',
                                            isDebit ? 'text-[var(--error)]' : 'text-[var(--success)]'
                                          )}
                                        >
                                          {isDebit ? 'Debit (− Outflow / Charge)' : 'Credit (+ Inflow / Payment)'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Info Column 3: Linked Transaction Card or Notes */}
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                      Notes &amp; Reconciliation Link
                                    </p>
                                    {entry.notes ? (
                                      <p className="rounded-md border border-[var(--border)] bg-[var(--background)] p-2 text-[11px] italic text-[var(--text-secondary)]">
                                        &ldquo;{entry.notes}&rdquo;
                                      </p>
                                    ) : (
                                      <p className="text-[11px] text-[var(--text-secondary)]">No memo recorded.</p>
                                    )}

                                    {!isCompany && entry.linkedCompanyLedgerEntry && (
                                      <div className="mt-2 rounded-lg border border-[var(--accent-gold)]/40 bg-[var(--accent-gold)]/5 p-2 text-[11px]">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-[var(--accent-gold-text)]">
                                            Carrier Counterpart:
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => onOpenCompanyLedgerEntry(entry.linkedCompanyLedgerEntry!)}
                                            className="text-[10px] font-bold text-[var(--accent-gold-text)] hover:underline"
                                          >
                                            View in Company Ledger &rarr;
                                          </button>
                                        </div>
                                        <div className="mt-1 flex items-center justify-between font-mono text-[10px]">
                                          <span>{entry.linkedCompanyLedgerEntry.company?.name || 'Carrier'}</span>
                                          <span className="font-bold text-[var(--error)]">
                                            −{formatMoney(entry.linkedCompanyLedgerEntry.amount)}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination & Row Count Footer */}
            {filteredTransactions.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-[var(--background)]/40 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <span>
                    Showing{' '}
                    <span className="font-semibold text-[var(--text-primary)]">
                      {pageSize === 'ALL'
                        ? filteredTransactions.length
                        : Math.min((page - 1) * pageSize + 1, filteredTransactions.length)}
                    </span>{' '}
                    to{' '}
                    <span className="font-semibold text-[var(--text-primary)]">
                      {pageSize === 'ALL'
                        ? filteredTransactions.length
                        : Math.min(page * pageSize, filteredTransactions.length)}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-[var(--text-primary)]">
                      {filteredTransactions.length}
                    </span>{' '}
                    transactions
                  </span>

                  <div className="flex items-center gap-1 pl-3 border-l border-[var(--border)]">
                    <span className="text-[11px]">Rows:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const val = e.target.value === 'ALL' ? 'ALL' : Number(e.target.value);
                        setPageSize(val);
                        setPage(1);
                      }}
                      className="rounded border border-[var(--border)] bg-[var(--panel)] py-0.5 px-1.5 text-xs text-[var(--text-primary)] focus:outline-none"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value="ALL">All</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--background)] disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Prev
                    </button>
                    <span className="px-2 font-mono text-[11px] font-semibold text-[var(--text-primary)]">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="rounded border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--background)] disabled:opacity-40 disabled:pointer-events-none"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SIDE-BY-SIDE SPLIT RECONCILIATION */}
        {viewMode === 'split' && (
          <div className="p-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {/* Left Column: Company Ledger Payables */}
              <div className="flex flex-col rounded-xl border border-[var(--error)]/30 bg-[var(--background)]">
                <div className="border-b border-[var(--border)] bg-[var(--panel)] px-4 py-3 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--error)]/25 bg-[var(--error)]/10 text-[var(--error)]">
                        <Building2 className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                          Company / Carrier Payables
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)]">Vendor costs and freight expenses</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-[var(--error)] tabular-nums">
                      {formatMoney(companyChargedNet)}
                    </span>
                  </div>
                </div>

                <div className="max-h-[460px] flex-1 divide-y divide-[var(--border)] overflow-y-auto p-2">
                  {splitCompanyTransactions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                      No company ledger entries matching filters.
                    </div>
                  ) : (
                    splitCompanyTransactions.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg p-2.5 transition-colors hover:bg-[var(--panel)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-xs text-[var(--text-primary)]">{item.description}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                              <span>{new Date(item.transactionDate).toLocaleDateString()}</span>
                              {item.companyLedgerEntry?.company?.name && (
                                <>
                                  <span>•</span>
                                  <span className="font-medium text-[var(--text-primary)]">
                                    {item.companyLedgerEntry.company.name}
                                  </span>
                                </>
                              )}
                              {item.reference && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">#{item.reference}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={cn(
                                'font-mono text-xs font-bold tabular-nums',
                                item.type === 'DEBIT' ? 'text-[var(--error)]' : 'text-[var(--success)]'
                              )}
                            >
                              {item.type === 'DEBIT' ? '−' : '+'}
                              {formatMoney(item.amount)}
                            </span>
                            <div className="mt-1">
                              <button
                                type="button"
                                onClick={() => onOpenCompanyLedgerEntry(item.companyLedgerEntry)}
                                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--accent-gold-text)] hover:underline"
                              >
                                View Entry &rarr;
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotal Bar */}
                <div className="border-t border-[var(--border)] bg-[var(--panel)] px-4 py-2.5 rounded-b-xl text-xs">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                    <span>
                      {splitCompanyTransactions.length} entries (Debits {formatMoney(companyDebitsTotal)} · Credits {formatMoney(companyCreditsTotal)})
                    </span>
                    <span className="font-mono font-bold text-[var(--error)] tabular-nums">
                      Net: {formatMoney(companyChargedNet)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Customer Ledger Receivables */}
              <div className="flex flex-col rounded-xl border border-[var(--success)]/30 bg-[var(--background)]">
                <div className="border-b border-[var(--border)] bg-[var(--panel)] px-4 py-3 rounded-t-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--success)]/25 bg-[var(--success)]/10 text-[var(--success)]">
                        <UserCheck className="h-4 w-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                          Customer Receivables
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)]">Shipment billings &amp; user ledger</p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-bold text-[var(--success)] tabular-nums">
                      {formatMoney(customerChargedNet)}
                    </span>
                  </div>
                </div>

                <div className="max-h-[460px] flex-1 divide-y divide-[var(--border)] overflow-y-auto p-2">
                  {splitCustomerTransactions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[var(--text-secondary)]">
                      No customer ledger entries matching filters.
                    </div>
                  ) : (
                    splitCustomerTransactions.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg p-2.5 transition-colors hover:bg-[var(--panel)]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-xs text-[var(--text-primary)]">{item.description}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                              <span>{new Date(item.transactionDate).toLocaleDateString()}</span>
                              {item.reference && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono">#{item.reference}</span>
                                </>
                              )}
                              {item.linkedCompanyLedgerEntry && (
                                <>
                                  <span>•</span>
                                  <span className="font-semibold text-[var(--accent-gold-text)]">🔗 Linked</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={cn(
                                'font-mono text-xs font-bold tabular-nums',
                                item.type === 'DEBIT' ? 'text-[var(--error)]' : 'text-[var(--success)]'
                              )}
                            >
                              {item.type === 'DEBIT' ? '−' : '+'}
                              {formatMoney(item.amount)}
                            </span>
                            {item.linkedCompanyLedgerEntry && (
                              <div className="mt-1">
                                <button
                                  type="button"
                                  onClick={() => onOpenCompanyLedgerEntry(item.linkedCompanyLedgerEntry!)}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--accent-gold-text)] hover:underline"
                                >
                                  Carrier Link &rarr;
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Subtotal Bar */}
                <div className="border-t border-[var(--border)] bg-[var(--panel)] px-4 py-2.5 rounded-b-xl text-xs">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                    <span>
                      {splitCustomerTransactions.length} entries (Debits {formatMoney(customerDebitsTotal)} · Credits {formatMoney(customerCreditsTotal)})
                    </span>
                    <span className="font-mono font-bold text-[var(--success)] tabular-nums">
                      Net: {formatMoney(customerChargedNet)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reconciliation Banner */}
            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    netDifference >= 0 ? 'bg-[var(--success)]/10 text-[var(--success)]' : 'bg-[var(--error)]/10 text-[var(--error)]'
                  )}
                >
                  {netDifference >= 0 ? <CheckCircle2 className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Reconciliation Balance (Customer − Company)
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {netDifference >= 0
                      ? `Yields a positive net profit margin of ${marginPercentage.toFixed(1)}%.`
                      : `Deficit balance: company costs exceed customer billing by ${formatMoney(Math.abs(netDifference))}.`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    'font-mono text-lg font-bold tabular-nums',
                    netDifference >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                  )}
                >
                  {netDifference >= 0 ? '+' : '−'}
                  {formatMoney(Math.abs(netDifference))}
                </span>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider',
                    netDifference >= 0
                      ? 'border border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                      : 'border border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]'
                  )}
                >
                  {netDifference >= 0 ? 'Profitable' : 'Deficit'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
export default LedgerComparisonTable;

