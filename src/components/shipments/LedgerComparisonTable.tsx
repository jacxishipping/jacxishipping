'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpDown,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Link2,
  Minus,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Unlink,
  UserCheck,
  X,
} from 'lucide-react';
import { Button, ConfirmDialog, Modal, toast } from '@/components/design-system';
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
  canDelete?: boolean;
  canEdit?: boolean;
  deletingTransactionId?: string | null;
  onOpenCompanyLedgerEntry: (entry: LinkedCompanyLedgerEntry) => void;
  onDeleteTransaction?: (transaction: ComparisonTransactionWithDrillDown) => Promise<void> | void;
  onUpdateTransaction?: (
    transaction: ComparisonTransactionWithDrillDown,
    updates: { description?: string; reference?: string | null; notes?: string | null; invoiceNumber?: string | null }
  ) => Promise<void> | void;
  onLinkTransactions?: (companyEntryId: string, customerEntryId: string) => Promise<void> | void;
  onUnlinkTransactions?: (companyEntryId: string, customerEntryId: string) => Promise<void> | void;
  onBatchDeleteTransactions?: (transactions: ComparisonTransactionWithDrillDown[]) => Promise<void> | void;
  onOpenShipmentExpense?: () => void;
  onOpenDispatchExpense?: () => void;
  onOpenTransitExpense?: () => void;
};

type SourceFilter = 'ALL' | 'COMPANY' | 'CUSTOMER';
type TypeFilter = 'ALL' | 'DEBIT' | 'CREDIT';
type DiscrepancyFilter = 'ALL' | 'DEFICIT_ONLY' | 'LINKED_ONLY' | 'UNLINKED_ONLY';
type DatePreset = 'ALL' | '7_DAYS' | '30_DAYS' | 'THIS_MONTH';
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
  canDelete = true,
  canEdit = true,
  deletingTransactionId,
  onOpenCompanyLedgerEntry,
  onDeleteTransaction,
  onUpdateTransaction,
  onLinkTransactions,
  onUnlinkTransactions,
  onBatchDeleteTransactions,
  onOpenShipmentExpense,
  onOpenDispatchExpense,
  onOpenTransitExpense,
}: LedgerComparisonTableProps) {
  // State: Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [discrepancyFilter, setDiscrepancyFilter] = useState<DiscrepancyFilter>('ALL');
  const [datePreset, setDatePreset] = useState<DatePreset>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('DATE_DESC');
  const [viewMode, setViewMode] = useState<ViewMode>('unified');

  // State: Pagination & Expand
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(10);

  // State: Selection for Batch Actions
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // State: Modals
  const [transactionToDelete, setTransactionToDelete] = useState<ComparisonTransactionWithDrillDown | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  // State: Inline Edit Modal
  const [editingTransaction, setEditingTransaction] = useState<ComparisonTransactionWithDrillDown | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editReference, setEditReference] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editInvoiceNumber, setEditInvoiceNumber] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // State: Match / Pairing Modal
  const [linkingTransaction, setLinkingTransaction] = useState<ComparisonTransactionWithDrillDown | null>(null);
  const [selectedCounterpartId, setSelectedCounterpartId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  // State: Add Transaction Dropdown
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Profit Margin & Counts
  const marginPercentage = useMemo(() => {
    if (customerChargedNet === 0) return 0;
    return (netDifference / customerChargedNet) * 100;
  }, [customerChargedNet, netDifference]);

  // Overall Statistics & Discrepancies
  const stats = useMemo(() => {
    let companyCount = 0;
    let customerCount = 0;
    let linkedCount = 0;
    let deficitCount = 0;

    for (const t of transactions) {
      if (t.source === 'COMPANY') {
        companyCount++;
        if (t.linkedCustomerEntry) {
          linkedCount++;
          // Deficit check: Carrier cost > Customer revenue
          if (t.amount > t.linkedCustomerEntry.amount) {
            deficitCount++;
          }
        }
      } else {
        customerCount++;
        if (t.linkedCompanyLedgerEntry) {
          // Deficit check: Carrier cost > Customer billed
          if (t.linkedCompanyLedgerEntry.amount > t.amount) {
            deficitCount++;
          }
        }
      }
    }

    return {
      total: transactions.length,
      companyCount,
      customerCount,
      linkedCount,
      deficitCount,
    };
  }, [transactions]);

  // Row Expand Helpers
  const toggleRowExpanded = (id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  // Selection Helpers
  const toggleRowSelected = (id: string) => {
    setSelectedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedRowIds.size === pagedTransactions.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(pagedTransactions.map((t) => t.id)));
    }
  };

  // Helper: Determine if an entry is in deficit / negative margin
  const getEntryDiscrepancy = (entry: ComparisonTransactionWithDrillDown) => {
    if (entry.source === 'CUSTOMER') {
      if (!entry.linkedCompanyLedgerEntry) {
        return { isLinked: false, isDeficit: false, marginDiff: entry.amount, carrierCost: 0 };
      }
      const carrierCost = entry.linkedCompanyLedgerEntry.amount;
      const marginDiff = entry.amount - carrierCost;
      const isDeficit = carrierCost > entry.amount;
      return { isLinked: true, isDeficit, marginDiff, carrierCost };
    } else {
      if (!entry.linkedCustomerEntry) {
        return { isLinked: false, isDeficit: entry.type === 'DEBIT', marginDiff: -entry.amount, customerRevenue: 0 };
      }
      const customerRevenue = entry.linkedCustomerEntry.amount;
      const marginDiff = customerRevenue - entry.amount;
      const isDeficit = entry.amount > customerRevenue;
      return { isLinked: true, isDeficit, marginDiff, customerRevenue };
    }
  };

  // Filtered & Sorted Transactions
  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();

    return transactions
      .filter((entry) => {
        // Source filter
        if (sourceFilter !== 'ALL' && entry.source !== sourceFilter) return false;

        // Type filter
        if (typeFilter !== 'ALL' && entry.type !== typeFilter) return false;

        // Discrepancy filter
        const disc = getEntryDiscrepancy(entry);
        if (discrepancyFilter === 'DEFICIT_ONLY' && !disc.isDeficit) return false;
        if (discrepancyFilter === 'LINKED_ONLY' && !disc.isLinked) return false;
        if (discrepancyFilter === 'UNLINKED_ONLY' && disc.isLinked) return false;

        // Date Preset Filter
        if (datePreset !== 'ALL') {
          const entryDate = new Date(entry.transactionDate);
          if (datePreset === '7_DAYS') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (entryDate < sevenDaysAgo) return false;
          } else if (datePreset === '30_DAYS') {
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            if (entryDate < thirtyDaysAgo) return false;
          } else if (datePreset === 'THIS_MONTH') {
            if (
              entryDate.getMonth() !== now.getMonth() ||
              entryDate.getFullYear() !== now.getFullYear()
            ) {
              return false;
            }
          }
        }

        // Search query
        if (q) {
          const descMatch = entry.description?.toLowerCase().includes(q);
          const refMatch = entry.reference?.toLowerCase().includes(q);
          const notesMatch = entry.notes?.toLowerCase().includes(q);
          const idMatch = entry.id.toLowerCase().includes(q);
          const invoiceMatch = entry.invoiceNumber?.toLowerCase().includes(q);
          const companyNameMatch =
            entry.source === 'COMPANY' &&
            entry.companyLedgerEntry?.company?.name?.toLowerCase().includes(q);

          if (!descMatch && !refMatch && !notesMatch && !idMatch && !companyNameMatch && !invoiceMatch) {
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
  }, [transactions, sourceFilter, typeFilter, discrepancyFilter, datePreset, searchQuery, sortOption]);

  // Pagination
  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(filteredTransactions.length / pageSize);
  const pagedTransactions = useMemo(() => {
    if (pageSize === 'ALL') return filteredTransactions;
    const start = (page - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, page, pageSize]);

  // Selected Transactions for Bulk Actions
  const selectedTransactions = useMemo(
    () => transactions.filter((t) => selectedRowIds.has(t.id)),
    [transactions, selectedRowIds]
  );

  // Export CSV (Full or Selected)
  const handleExportCSV = (itemsToExport = filteredTransactions) => {
    if (itemsToExport.length === 0) {
      toast.error('No transactions to export');
      return;
    }

    const headers = [
      'Source',
      'Date',
      'Type',
      'Amount',
      'Description',
      'Reference',
      'Invoice',
      'Company/Carrier',
      'Status',
      'Margin Status',
      'Notes',
    ];
    const rows = itemsToExport.map((t) => {
      const companyName = t.source === 'COMPANY' ? t.companyLedgerEntry.company?.name || '' : '';
      const disc = getEntryDiscrepancy(t);
      const marginStatus = disc.isDeficit
        ? `DEFICIT (${disc.marginDiff.toFixed(2)})`
        : disc.isLinked
        ? `PROFIT (+${disc.marginDiff.toFixed(2)})`
        : 'UNLINKED';

      return [
        `"${t.source}"`,
        `"${new Date(t.transactionDate).toISOString().split('T')[0]}"`,
        `"${t.type}"`,
        t.type === 'DEBIT' ? `-${t.amount.toFixed(2)}` : `+${t.amount.toFixed(2)}`,
        `"${(t.description || '').replace(/"/g, '""')}"`,
        `"${(t.reference || '').replace(/"/g, '""')}"`,
        `"${(t.invoiceNumber || '').replace(/"/g, '""')}"`,
        `"${companyName.replace(/"/g, '""')}"`,
        `"${t.invoiceStatus || 'RECORDED'}"`,
        `"${marginStatus}"`,
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

    toast.success(`Exported ${itemsToExport.length} transactions to CSV`);
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
      `• Reconciliation Health: ${stats.linkedCount} linked pairs, ${stats.deficitCount} deficit warnings`,
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
    setDiscrepancyFilter('ALL');
    setDatePreset('ALL');
    setSortOption('DATE_DESC');
    setPage(1);
  };

  // Handle Confirmed Deletion of a Single Transaction
  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      setIsDeleting(true);
      if (onDeleteTransaction) {
        await onDeleteTransaction(transactionToDelete);
      }
      setTransactionToDelete(null);
    } catch (error) {
      // toast is handled in parent
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Confirmed Batch Deletion
  const handleConfirmBatchDelete = async () => {
    if (!selectedTransactions.length) return;
    try {
      setIsBatchDeleting(true);
      if (onBatchDeleteTransactions) {
        await onBatchDeleteTransactions(selectedTransactions);
      }
      setSelectedRowIds(new Set());
      setBatchDeleteConfirmOpen(false);
    } catch (error) {
      // toast is handled in parent
    } finally {
      setIsBatchDeleting(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (entry: ComparisonTransactionWithDrillDown) => {
    setEditingTransaction(entry);
    setEditDescription(entry.description || '');
    setEditReference(entry.reference || '');
    setEditNotes(entry.notes || '');
    setEditInvoiceNumber(entry.invoiceNumber || '');
  };

  // Submit Edit
  const handleSubmitEdit = async () => {
    if (!editingTransaction) return;
    if (!editDescription.trim()) {
      toast.error('Description is required');
      return;
    }
    try {
      setIsSavingEdit(true);
      if (onUpdateTransaction) {
        await onUpdateTransaction(editingTransaction, {
          description: editDescription.trim(),
          reference: editReference.trim() || null,
          notes: editNotes.trim() || null,
          invoiceNumber: editInvoiceNumber.trim() || null,
        });
      }
      setEditingTransaction(null);
    } catch (error) {
      // Handled in parent
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Candidate counterpart entries for manual pairing
  const availableCounterparts = useMemo(() => {
    if (!linkingTransaction) return [];
    if (linkingTransaction.source === 'CUSTOMER') {
      // Looking for Company entries to pair with this customer entry
      return transactions.filter((t) => t.source === 'COMPANY');
    } else {
      // Looking for Customer entries to pair with this company entry
      return transactions.filter((t) => t.source === 'CUSTOMER');
    }
  }, [linkingTransaction, transactions]);

  // Open Linking Modal
  const openLinkingModal = (entry: ComparisonTransactionWithDrillDown) => {
    setLinkingTransaction(entry);
    setSelectedCounterpartId('');
  };

  // Submit Linking
  const handleSubmitLink = async () => {
    if (!linkingTransaction || !selectedCounterpartId) {
      toast.error('Please select a counterpart transaction to match');
      return;
    }
    try {
      setIsLinking(true);
      const companyEntryId =
        linkingTransaction.source === 'COMPANY'
          ? linkingTransaction.companyLedgerEntry.id
          : selectedCounterpartId.replace('company-', '');
      const customerEntryId =
        linkingTransaction.source === 'CUSTOMER'
          ? linkingTransaction.userLedgerEntryId
          : selectedCounterpartId.replace('customer-', '');

      if (onLinkTransactions) {
        await onLinkTransactions(companyEntryId, customerEntryId);
      }
      setLinkingTransaction(null);
    } catch (error) {
      // Handled in parent
    } finally {
      setIsLinking(false);
    }
  };

  // Handle Unlinking
  const handleUnlink = async (entry: ComparisonTransactionWithDrillDown) => {
    if (!confirm('Unlink this cost and revenue pair?')) return;
    try {
      const companyEntryId =
        entry.source === 'COMPANY'
          ? entry.companyLedgerEntry.id
          : entry.linkedCompanyLedgerEntry?.id;
      const customerEntryId =
        entry.source === 'CUSTOMER'
          ? entry.userLedgerEntryId
          : entry.linkedCustomerEntry?.id;

      if (companyEntryId && customerEntryId && onUnlinkTransactions) {
        await onUnlinkTransactions(companyEntryId, customerEntryId);
      }
    } catch (error) {
      // Handled in parent
    }
  };

  // Separate lists for Split / Side-by-Side View
  const splitCompanyTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.source === 'COMPANY'),
    [filteredTransactions]
  );
  const splitCustomerTransactions = useMemo(
    () => filteredTransactions.filter((t) => t.source === 'CUSTOMER'),
    [filteredTransactions]
  );

  // Grouped Paired Legs for Side-by-Side Visual Alignment
  const pairedLegs = useMemo(() => {
    const pairs: Array<{
      id: string;
      customerEntry: ComparisonTransactionWithDrillDown;
      companyEntry: LinkedCompanyLedgerEntry;
      marginDiff: number;
      isDeficit: boolean;
      marginPct: number;
    }> = [];

    for (const entry of transactions) {
      if (entry.source === 'CUSTOMER' && entry.linkedCompanyLedgerEntry) {
        const carrierCost = entry.linkedCompanyLedgerEntry.amount;
        const marginDiff = entry.amount - carrierCost;
        const isDeficit = carrierCost > entry.amount;
        const marginPct = entry.amount > 0 ? (marginDiff / entry.amount) * 100 : 0;

        pairs.push({
          id: `pair-${entry.id}-${entry.linkedCompanyLedgerEntry.id}`,
          customerEntry: entry,
          companyEntry: entry.linkedCompanyLedgerEntry,
          marginDiff,
          isDeficit,
          marginPct,
        });
      }
    }
    return pairs;
  }, [transactions]);

  return (
    <div className="space-y-4">
      {/* 1. KPI Comparison Summary Cards */}
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

        {/* Audit & Discrepancy Health */}
        <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-blue-500">
              <Layers className="h-3 w-3" />
              Reconciliation
            </span>
            {stats.deficitCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--error)]/30 bg-[var(--error)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--error)]">
                <AlertTriangle className="h-3 w-3" />
                {stats.deficitCount} Deficit{stats.deficitCount === 1 ? '' : 's'}
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                {stats.linkedCount} linked
              </span>
            )}
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
            <span className="text-[var(--text-secondary)]">Deficit detection active</span>
            <span className="font-semibold text-[var(--accent-gold-text)]">Double-entry ready</span>
          </div>
        </div>
      </div>

      {/* 2. Main Ledger Container */}
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
                {stats.deficitCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--error)]/40 bg-[var(--error)]/10 px-2 py-0.5 text-[10px] font-bold text-[var(--error)]">
                    <AlertTriangle className="h-3 w-3" />
                    {stats.deficitCount} Negative Margin Warning{stats.deficitCount === 1 ? '' : 's'}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Examine debit and credit flows, detect carrier deficits, link cost-vs-revenue legs, and audit real transactions.
              </p>
            </div>

            {/* Quick Actions (Add, Export, Copy, View Mode) */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Quick + Add Transaction Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddMenu(!showAddMenu)}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[var(--accent-gold)]/40 bg-[rgba(var(--accent-gold-rgb),0.12)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-gold-text)] shadow-xs transition-colors hover:bg-[rgba(var(--accent-gold-rgb),0.2)]"
                  title="Add new expense or transaction"
                  aria-expanded={showAddMenu}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Record</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showAddMenu && (
                  <div
                    className="absolute right-0 z-30 mt-1 w-52 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1.5 shadow-lg"
                    onMouseLeave={() => setShowAddMenu(false)}
                  >
                    <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                      Create Transaction
                    </p>
                    {onOpenShipmentExpense && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddMenu(false);
                          onOpenShipmentExpense();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--background)]"
                      >
                        <DollarSign className="h-3.5 w-3.5 text-[var(--accent-gold-text)]" />
                        <span>Shipment Expense</span>
                      </button>
                    )}
                    {onOpenDispatchExpense && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddMenu(false);
                          onOpenDispatchExpense();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--background)]"
                      >
                        <DollarSign className="h-3.5 w-3.5 text-[var(--accent-gold-text)]" />
                        <span>Dispatch Expense</span>
                      </button>
                    )}
                    {onOpenTransitExpense && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddMenu(false);
                          onOpenTransitExpense();
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--background)]"
                      >
                        <DollarSign className="h-3.5 w-3.5 text-[var(--accent-gold-text)]" />
                        <span>Transit Expense</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('unified')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-all',
                    viewMode === 'unified'
                      ? 'bg-[var(--accent-gold)] text-white shadow-xs'
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
                      ? 'bg-[var(--accent-gold)] text-white shadow-xs'
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
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--background)]"
                title="Copy comparison summary to clipboard"
                aria-label="Copy comparison summary"
              >
                <Copy className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <span className="hidden sm:inline">Copy</span>
              </button>

              {/* Export CSV Button */}
              <button
                type="button"
                onClick={() => handleExportCSV()}
                className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] shadow-xs transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--background)]"
                title="Export transactions to CSV"
                aria-label="Export transactions to CSV"
              >
                <Download className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filter Bar Row 1: Search, Source, Type, Discrepancy */}
          <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-12">
            {/* Search Input */}
            <div className="relative sm:col-span-2 lg:col-span-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search description, reference, carrier, invoice..."
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
            <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-1 sm:col-span-2 lg:col-span-3">
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

            {/* Discrepancy & Health Filter */}
            <div className="lg:col-span-3">
              <select
                value={discrepancyFilter}
                onChange={(e) => {
                  setDiscrepancyFilter(e.target.value as DiscrepancyFilter);
                  setPage(1);
                }}
                className={cn(
                  'w-full rounded-lg border py-1.5 px-2 text-xs transition-colors focus:border-[var(--accent-gold)] focus:outline-none',
                  discrepancyFilter === 'DEFICIT_ONLY'
                    ? 'border-[var(--error)]/50 bg-[var(--error)]/10 font-bold text-[var(--error)]'
                    : 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)]'
                )}
                aria-label="Filter by reconciliation health"
              >
                <option value="ALL">All Financial Records</option>
                <option value="DEFICIT_ONLY">⚠️ Deficits Only (Carrier &gt; Customer)</option>
                <option value="LINKED_ONLY">🔗 Paired &amp; Reconciled Only</option>
                <option value="UNLINKED_ONLY">Unlinked Standalone Items Only</option>
              </select>
            </div>

            {/* Type & Sort Selector */}
            <div className="lg:col-span-2 flex items-center gap-1.5">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TypeFilter);
                  setPage(1);
                }}
                className="w-1/2 rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1.5 px-1.5 text-xs text-[var(--text-primary)] transition-colors focus:border-[var(--accent-gold)] focus:outline-none"
                aria-label="Filter by transaction type"
              >
                <option value="ALL">All Flows</option>
                <option value="DEBIT">Debits (−)</option>
                <option value="CREDIT">Credits (+)</option>
              </select>

              <select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value as SortOption);
                  setPage(1);
                }}
                className="w-1/2 rounded-lg border border-[var(--border)] bg-[var(--panel)] py-1.5 px-1.5 text-xs text-[var(--text-primary)] transition-colors focus:border-[var(--accent-gold)] focus:outline-none"
                aria-label="Sort transactions"
              >
                <option value="DATE_DESC">Date ↓</option>
                <option value="DATE_ASC">Date ↑</option>
                <option value="AMOUNT_DESC">Amount ↓</option>
                <option value="AMOUNT_ASC">Amount ↑</option>
              </select>
            </div>
          </div>

          {/* Filter Bar Row 2: Date Range Presets */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)]/60 pt-2.5">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">Date Range:</span>
              {(
                [
                  { value: 'ALL', label: 'All Time' },
                  { value: '7_DAYS', label: 'Last 7 Days' },
                  { value: '30_DAYS', label: 'Last 30 Days' },
                  { value: 'THIS_MONTH', label: 'This Month' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setDatePreset(preset.value);
                    setPage(1);
                  }}
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors',
                    datePreset === preset.value
                      ? 'bg-[var(--text-primary)] text-white shadow-xs'
                      : 'border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Active filter reset shortcut */}
            {(searchQuery ||
              sourceFilter !== 'ALL' ||
              typeFilter !== 'ALL' ||
              discrepancyFilter !== 'ALL' ||
              datePreset !== 'ALL') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-gold-text)] hover:underline"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>
        </div>

        {/* 3. Batch Action Sticky Toolbar */}
        {selectedRowIds.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--accent-gold)]/30 bg-[rgba(var(--accent-gold-rgb),0.08)] px-4 py-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent-gold)] text-[10px] font-bold text-white">
                {selectedRowIds.size}
              </span>
              <span className="font-semibold text-[var(--text-primary)]">
                transactions selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCSV(selectedTransactions)}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
              >
                <Download className="h-3 w-3" />
                <span>Export Selected</span>
              </button>

              {canDelete && (
                <button
                  type="button"
                  onClick={() => setBatchDeleteConfirmOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--error)]/40 bg-[var(--error)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--error)] hover:bg-[var(--error)] hover:text-white"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete Selected ({selectedRowIds.size})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedRowIds(new Set())}
                className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}

        {/* 4. VIEW 1: UNIFIED AUDIT TABLE */}
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
                      {/* Batch checkbox */}
                      <th className="w-8 px-2 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={
                            pagedTransactions.length > 0 &&
                            selectedRowIds.size === pagedTransactions.length
                          }
                          onChange={toggleSelectAll}
                          className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                          aria-label="Select all transactions on page"
                        />
                      </th>
                      {/* Accordion Expand All */}
                      <th className="w-8 px-1 py-2.5 text-center">
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
                      <th className="px-3 py-2.5">Source &amp; Carrier</th>
                      <th className="px-3 py-2.5">Date</th>
                      <th className="px-3 py-2.5">Description &amp; Reference</th>
                      <th className="px-3 py-2.5">Reconciliation &amp; Invoice</th>
                      <th className="px-3 py-2.5">Flow</th>
                      <th className="px-3 py-2.5 text-right">Amount</th>
                      <th className="px-3 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-xs">
                    {pagedTransactions.map((entry) => {
                      const isExpanded = expandedRowIds.has(entry.id);
                      const isSelected = selectedRowIds.has(entry.id);
                      const isDebit = entry.type === 'DEBIT';
                      const isCompany = entry.source === 'COMPANY';
                      const isRowDeleting =
                        deletingTransactionId === entry.id ||
                        (isDeleting && transactionToDelete?.id === entry.id);
                      const companyName = isCompany
                        ? entry.companyLedgerEntry?.company?.name || 'Carrier / Partner'
                        : null;

                      // Discrepancy details
                      const disc = getEntryDiscrepancy(entry);

                      return (
                        <tr
                          key={entry.id}
                          className={cn(
                            'group transition-colors hover:bg-[var(--background)]/70',
                            isExpanded && 'bg-[var(--background)]/40',
                            isSelected && 'bg-[rgba(var(--accent-gold-rgb),0.05)]',
                            disc.isDeficit && 'border-l-4 border-l-[var(--error)]',
                            isRowDeleting && 'opacity-50 pointer-events-none'
                          )}
                        >
                          <td colSpan={9} className="p-0">
                            {/* Main Row Grid */}
                            <div className="grid grid-cols-12 items-center px-3 py-2.5">
                              {/* Batch Checkbox & Expand Chevron */}
                              <div className="col-span-1 flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleRowSelected(entry.id)}
                                  className="h-3.5 w-3.5 rounded border-[var(--border)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                                  aria-label={`Select transaction ${entry.description}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => toggleRowExpanded(entry.id)}
                                  className="rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[var(--panel)] hover:text-[var(--text-primary)]"
                                  aria-label={isExpanded ? 'Collapse row details' : 'Expand row details'}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>

                              {/* Source Badge */}
                              <div className="col-span-2">
                                <div className="flex flex-col items-start gap-0.5">
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
                              <div className="col-span-1 text-[var(--text-secondary)]">
                                <div className="flex items-center gap-1 font-medium text-[11px]">
                                  <Calendar className="h-3 w-3 text-[var(--text-secondary)]/70 shrink-0" />
                                  <span>{new Date(entry.transactionDate).toLocaleDateString()}</span>
                                </div>
                              </div>

                              {/* Description & Reference */}
                              <div className="col-span-3 pr-2">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
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

                                  {/* Deficit / Discrepancy Margin Alert */}
                                  {disc.isDeficit && (
                                    <div className="flex items-center gap-1 font-semibold text-[10px] text-[var(--error)]">
                                      <AlertTriangle className="h-3 w-3 shrink-0" />
                                      <span>
                                        {isCompany
                                          ? `Overhead unrecovered (${formatMoney(Math.abs(disc.marginDiff))})`
                                          : `Margin Deficit: Cost exceeds revenue by ${formatMoney(Math.abs(disc.marginDiff))}`}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Reconciliation & Invoice Badges */}
                              <div className="col-span-2">
                                <div className="flex flex-col gap-1 items-start">
                                  {/* Matched Pair Status */}
                                  {disc.isLinked ? (
                                    <div className="flex items-center gap-1">
                                      <span
                                        className={cn(
                                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                          disc.isDeficit
                                            ? 'border border-[var(--error)]/30 bg-[var(--error)]/10 text-[var(--error)]'
                                            : 'border border-[var(--success)]/30 bg-[var(--success)]/10 text-[var(--success)]'
                                        )}
                                      >
                                        <Link2 className="h-2.5 w-2.5" />
                                        <span>
                                          {disc.isDeficit
                                            ? `Deficit ${formatMoney(disc.marginDiff)}`
                                            : `+${formatMoney(disc.marginDiff)}`}
                                        </span>
                                      </span>
                                      {canEdit && onUnlinkTransactions && (
                                        <button
                                          type="button"
                                          onClick={() => handleUnlink(entry)}
                                          className="text-[var(--text-secondary)] hover:text-[var(--error)] p-0.5"
                                          title="Unlink transactions"
                                          aria-label="Unlink transactions"
                                        >
                                          <Unlink className="h-3 w-3" />
                                        </button>
                                      )}
                                    </div>
                                  ) : (
                                    canEdit && onLinkTransactions && (
                                      <button
                                        type="button"
                                        onClick={() => openLinkingModal(entry)}
                                        className="inline-flex items-center gap-1 rounded border border-dashed border-[var(--border)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-gold-text)] hover:border-[var(--accent-gold)] hover:bg-[var(--background)]"
                                      >
                                        <Link2 className="h-2.5 w-2.5" />
                                        <span>+ Pair Leg</span>
                                      </button>
                                    )
                                  )}

                                  {/* Clickable Invoice Badge */}
                                  {entry.invoiceNumber && (
                                    <Link
                                      href={
                                        entry.invoiceId
                                          ? `/dashboard/invoices/${entry.invoiceId}`
                                          : `/dashboard/invoices?search=${encodeURIComponent(entry.invoiceNumber)}`
                                      }
                                      className={cn(
                                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[10px] font-semibold transition-colors hover:underline',
                                        entry.invoiceStatus === 'PAID'
                                          ? 'border-[var(--success)]/35 bg-[var(--success)]/10 text-[var(--success)]'
                                          : entry.invoiceStatus === 'PENDING'
                                          ? 'border-amber-500/35 bg-amber-500/10 text-amber-500'
                                          : 'border-blue-500/35 bg-blue-500/10 text-blue-500'
                                      )}
                                      title="View invoice details"
                                    >
                                      <FileText className="h-2.5 w-2.5" />
                                      <span>
                                        {entry.invoiceNumber}
                                        {entry.invoiceStatus ? ` (${entry.invoiceStatus})` : ''}
                                      </span>
                                    </Link>
                                  )}
                                </div>
                              </div>

                              {/* Flow Type */}
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

                              {/* Actions */}
                              <div className="col-span-1 flex items-center justify-end gap-1">
                                {isCompany && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenCompanyLedgerEntry(entry.companyLedgerEntry)}
                                    className="inline-flex items-center gap-0.5 rounded border border-[var(--border)] bg-[var(--panel)] px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-gold-text)] transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10"
                                    title="Inspect in Company Ledger"
                                  >
                                    <span>Open</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </button>
                                )}

                                {!isCompany && entry.linkedCompanyLedgerEntry && (
                                  <button
                                    type="button"
                                    onClick={() => onOpenCompanyLedgerEntry(entry.linkedCompanyLedgerEntry!)}
                                    className="inline-flex items-center gap-0.5 rounded border border-[var(--border)] bg-[var(--panel)] px-1.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-gold-text)] transition-colors hover:border-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10"
                                    title="Open matched Company Ledger entry"
                                  >
                                    <span>Carrier</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </button>
                                )}

                                {/* Inline Edit Button */}
                                {canEdit && onUpdateTransaction && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openEditModal(entry);
                                    }}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold-text)]"
                                    title="Edit description, reference, or notes"
                                    aria-label={`Edit ${entry.description}`}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                )}

                                {/* Real Transaction Delete Button */}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTransactionToDelete(entry);
                                    }}
                                    disabled={isRowDeleting}
                                    className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)] transition-colors hover:border-[var(--error)]/40 hover:bg-[var(--error)]/10 hover:text-[var(--error)] disabled:opacity-40"
                                    title={`Delete ${entry.source.toLowerCase()} transaction record`}
                                    aria-label={`Delete ${entry.source.toLowerCase()} transaction ${entry.description}`}
                                  >
                                    {isRowDeleting ? (
                                      <RefreshCw className="h-3 w-3 animate-spin text-[var(--error)]" />
                                    ) : (
                                      <Trash2 className="h-3 w-3" />
                                    )}
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
                                      {entry.invoiceNumber && (
                                        <div className="flex items-center justify-between">
                                          <span className="text-[var(--text-secondary)]">Invoice #:</span>
                                          <span className="font-mono font-semibold text-blue-500">
                                            {entry.invoiceNumber}
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
                                      Entity Context &amp; Margins
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
                                        <span className="text-[var(--text-secondary)]">Leg Margin:</span>
                                        <span
                                          className={cn(
                                            'font-mono font-bold',
                                            disc.isDeficit ? 'text-[var(--error)]' : 'text-[var(--success)]'
                                          )}
                                        >
                                          {disc.marginDiff >= 0 ? '+' : ''}
                                          {formatMoney(disc.marginDiff)}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Info Column 3: Linked Transaction Card or Notes */}
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                      Notes &amp; Counterpart Link
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

                                {/* Expanded Footer: Actions */}
                                <div className="mt-3 flex flex-wrap items-center justify-between border-t border-[var(--border)] pt-2.5">
                                  <span className="text-[11px] text-[var(--text-secondary)]">
                                    Real transaction key:{' '}
                                    <span className="font-mono font-medium text-[var(--text-primary)]">
                                      {isCompany ? entry.companyLedgerEntry.id : entry.userLedgerEntryId}
                                    </span>
                                  </span>

                                  <div className="flex items-center gap-2">
                                    {canEdit && onUpdateTransaction && (
                                      <button
                                        type="button"
                                        onClick={() => openEditModal(entry)}
                                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-2.5 py-1 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
                                      >
                                        <Pencil className="h-3 w-3" />
                                        <span>Edit Memo &amp; Reference</span>
                                      </button>
                                    )}

                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => setTransactionToDelete(entry)}
                                        disabled={isRowDeleting}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--error)] transition-colors hover:bg-[var(--error)] hover:text-white disabled:opacity-40"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>Delete Transaction</span>
                                      </button>
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

        {/* 5. VIEW 2: SIDE-BY-SIDE SPLIT RECONCILIATION WITH PAIRED ALIGNMENT */}
        {viewMode === 'split' && (
          <div className="p-4 space-y-6">
            {/* Visual Paired Leg Reconciliation Section */}
            {pairedLegs.length > 0 && (
              <div className="rounded-xl border border-[var(--accent-gold)]/40 bg-[var(--background)] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[var(--accent-gold-text)]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                      Paired Cost-to-Revenue Legs ({pairedLegs.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Direct vendor-to-client matched transactions
                  </span>
                </div>

                <div className="space-y-2.5">
                  {pairedLegs.map((pair) => (
                    <div
                      key={pair.id}
                      className={cn(
                        'flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-lg border p-3 transition-colors',
                        pair.isDeficit
                          ? 'border-[var(--error)]/40 bg-[var(--error)]/5'
                          : 'border-[var(--border)] bg-[var(--panel)]'
                      )}
                    >
                      {/* Left: Carrier Cost */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded bg-[var(--error)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--error)]">
                            <Building2 className="h-3 w-3" />
                            Carrier Cost
                          </span>
                          <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                            {pair.companyEntry.description}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-[var(--text-secondary)]">
                          <span>{pair.companyEntry.company?.name || 'Carrier'}</span>
                          <span>•</span>
                          <span className="font-mono font-bold text-[var(--error)]">
                            −{formatMoney(pair.companyEntry.amount)}
                          </span>
                        </div>
                      </div>

                      {/* Center: Margin Bridge */}
                      <div className="flex items-center justify-center gap-2 px-3 py-1 bg-[var(--background)] rounded-md border border-[var(--border)] shrink-0">
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                        <div className="text-center font-mono text-xs">
                          <span
                            className={cn(
                              'font-bold',
                              pair.isDeficit ? 'text-[var(--error)]' : 'text-[var(--success)]'
                            )}
                          >
                            {pair.marginDiff >= 0 ? '+' : ''}
                            {formatMoney(pair.marginDiff)}
                          </span>
                          <div className="text-[9px] uppercase tracking-wider font-semibold">
                            {pair.isDeficit ? 'Deficit' : `+${pair.marginPct.toFixed(1)}%`}
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                      </div>

                      {/* Right: Customer Charge */}
                      <div className="flex-1 min-w-0 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="truncate text-xs font-semibold text-[var(--text-primary)]">
                            {pair.customerEntry.description}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded bg-[var(--success)]/10 px-1.5 py-0.5 text-[10px] font-bold text-[var(--success)]">
                            <UserCheck className="h-3 w-3" />
                            Client Revenue
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-end gap-2 text-[10px] text-[var(--text-secondary)]">
                          <span className="font-mono font-bold text-[var(--success)]">
                            +{formatMoney(pair.customerEntry.amount)}
                          </span>
                          {canEdit && onUnlinkTransactions && (
                            <button
                              type="button"
                              onClick={() => handleUnlink(pair.customerEntry)}
                              className="text-[10px] text-[var(--error)] hover:underline ml-2"
                            >
                              Unlink
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Split Columns Grid */}
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
                    splitCompanyTransactions.map((item) => {
                      const disc = getEntryDiscrepancy(item);
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'rounded-lg p-2.5 transition-colors hover:bg-[var(--panel)]',
                            disc.isDeficit && 'bg-[var(--error)]/5'
                          )}
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
                              <div className="mt-1 flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => onOpenCompanyLedgerEntry(item.companyLedgerEntry)}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--accent-gold-text)] hover:underline"
                                >
                                  Inspect &rarr;
                                </button>
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTransactionToDelete(item);
                                    }}
                                    disabled={deletingTransactionId === item.id || isDeleting}
                                    className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-secondary)] transition-colors hover:bg-[var(--error)]/10 hover:text-[var(--error)] disabled:opacity-40"
                                    title="Delete company transaction"
                                    aria-label={`Delete company transaction ${item.description}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
                    splitCustomerTransactions.map((item) => {
                      const disc = getEntryDiscrepancy(item);
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            'rounded-lg p-2.5 transition-colors hover:bg-[var(--panel)]',
                            disc.isDeficit && 'bg-[var(--error)]/5'
                          )}
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
                                {item.invoiceNumber && (
                                  <>
                                    <span>•</span>
                                    <span className="font-semibold text-blue-500">
                                      {item.invoiceNumber}
                                    </span>
                                  </>
                                )}
                                {disc.isLinked && (
                                  <>
                                    <span>•</span>
                                    <span
                                      className={cn(
                                        'font-bold',
                                        disc.isDeficit ? 'text-[var(--error)]' : 'text-[var(--success)]'
                                      )}
                                    >
                                      {disc.isDeficit ? '⚠️ Deficit' : '🔗 Paired'}
                                    </span>
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
                              <div className="mt-1 flex items-center justify-end gap-2">
                                {disc.isLinked ? (
                                  <button
                                    type="button"
                                    onClick={() => onOpenCompanyLedgerEntry(item.linkedCompanyLedgerEntry!)}
                                    className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[var(--accent-gold-text)] hover:underline"
                                  >
                                    Carrier Link &rarr;
                                  </button>
                                ) : (
                                  canEdit && onLinkTransactions && (
                                    <button
                                      type="button"
                                      onClick={() => openLinkingModal(item)}
                                      className="text-[10px] font-bold text-[var(--accent-gold-text)] hover:underline"
                                    >
                                      + Pair Leg
                                    </button>
                                  )
                                )}
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setTransactionToDelete(item);
                                    }}
                                    disabled={deletingTransactionId === item.id || isDeleting}
                                    className="inline-flex h-5 w-5 items-center justify-center rounded text-[var(--text-secondary)] transition-colors hover:bg-[var(--error)]/10 hover:text-[var(--error)] disabled:opacity-40"
                                    title="Delete customer transaction"
                                    aria-label={`Delete customer transaction ${item.description}`}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
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
            <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 sm:flex-row sm:items-center sm:justify-between shadow-xs">
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
                    Overall Reconciliation Balance (Customer − Company)
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {netDifference >= 0
                      ? `Yields a positive shipment profit margin of ${marginPercentage.toFixed(1)}%.`
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
                  {netDifference >= 0 ? 'Profitable' : 'Deficit Alert'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. MODAL: Manual Pair / Match Tool (Reconciliation Engine) */}
      <Modal
        open={Boolean(linkingTransaction)}
        onClose={() => {
          if (!isLinking) setLinkingTransaction(null);
        }}
        title="Pair Transactions for Leg Reconciliation"
        size="md"
        actions={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isLinking}
              onClick={() => setLinkingTransaction(null)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--background)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLinking || !selectedCounterpartId}
              onClick={handleSubmitLink}
              className="rounded-lg bg-[var(--accent-gold)] px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isLinking ? 'Linking...' : 'Confirm Reconciliation Link'}
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-[var(--text-secondary)]">
            Pairing an expense cost with its billing charge enables real-time leg profitability and deficit alerts.
          </p>

          {/* Target Transaction Card */}
          {linkingTransaction && (
            <div className="rounded-lg border border-[var(--accent-gold)]/40 bg-[rgba(var(--accent-gold-rgb),0.06)] p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold-text)]">
                Selected {linkingTransaction.source === 'CUSTOMER' ? 'Client Charge' : 'Carrier Payable'}
              </span>
              <div className="mt-1 flex items-center justify-between">
                <span className="font-semibold text-[var(--text-primary)] text-sm">
                  {linkingTransaction.description}
                </span>
                <span className="font-mono font-bold text-sm">
                  {formatMoney(linkingTransaction.amount)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                Date: {new Date(linkingTransaction.transactionDate).toLocaleDateString()}
                {linkingTransaction.reference ? ` • Ref: #${linkingTransaction.reference}` : ''}
              </p>
            </div>
          )}

          {/* Select Counterpart */}
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1.5">
              Choose Matching{' '}
              {linkingTransaction?.source === 'CUSTOMER' ? 'Carrier Expense Entry' : 'Client Revenue Entry'}:
            </label>

            {availableCounterparts.length === 0 ? (
              <p className="p-4 text-center text-[var(--text-secondary)] border rounded-lg">
                No available counterpart entries found to link.
              </p>
            ) : (
              <div className="max-h-56 divide-y divide-[var(--border)] overflow-y-auto rounded-lg border border-[var(--border)]">
                {availableCounterparts.map((cand) => {
                  const isCandSelected = selectedCounterpartId === cand.id;
                  const candAmount = cand.amount;
                  const targetAmount = linkingTransaction?.amount || 0;
                  const projectedMargin =
                    linkingTransaction?.source === 'CUSTOMER'
                      ? targetAmount - candAmount
                      : candAmount - targetAmount;
                  const isProjectedDeficit = projectedMargin < 0;

                  return (
                    <label
                      key={cand.id}
                      className={cn(
                        'flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-[var(--background)]',
                        isCandSelected && 'bg-[rgba(var(--accent-gold-rgb),0.08)]'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="radio"
                          name="counterpartOption"
                          value={cand.id}
                          checked={isCandSelected}
                          onChange={() => setSelectedCounterpartId(cand.id)}
                          className="h-4 w-4 border-[var(--border)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                        />
                        <div>
                          <p className="font-semibold text-[var(--text-primary)]">{cand.description}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">
                            {new Date(cand.transactionDate).toLocaleDateString()}
                            {cand.source === 'COMPANY' && cand.companyLedgerEntry?.company?.name
                              ? ` • ${cand.companyLedgerEntry.company.name}`
                              : ''}
                            {cand.reference ? ` • Ref: #${cand.reference}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold">{formatMoney(cand.amount)}</span>
                        <div
                          className={cn(
                            'text-[10px] font-bold',
                            isProjectedDeficit ? 'text-[var(--error)]' : 'text-[var(--success)]'
                          )}
                        >
                          {isProjectedDeficit
                            ? `Deficit ${formatMoney(projectedMargin)}`
                            : `+${formatMoney(projectedMargin)} profit`}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 7. MODAL: Inline Edit (Description, Reference, Invoice, Notes) */}
      <Modal
        open={Boolean(editingTransaction)}
        onClose={() => {
          if (!isSavingEdit) setEditingTransaction(null);
        }}
        title={`Edit ${editingTransaction?.source === 'COMPANY' ? 'Company' : 'Customer'} Ledger Entry`}
        size="md"
        actions={
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSavingEdit}
              onClick={() => setEditingTransaction(null)}
              className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--background)]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSavingEdit}
              onClick={handleSubmitEdit}
              className="rounded-lg bg-[var(--accent-gold)] px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isSavingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Description <span className="text-[var(--error)]">*</span>
            </label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
              placeholder="e.g. Ocean Freight Booking"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Reference Number (#)
              </label>
              <input
                type="text"
                value={editReference}
                onChange={(e) => setEditReference(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
                placeholder="e.g. PO-8921 or BOL-441"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                Invoice Number (INV-#)
              </label>
              <input
                type="text"
                value={editInvoiceNumber}
                onChange={(e) => setEditInvoiceNumber(e.target.value)}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
                placeholder="e.g. INV-2026-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
              Internal Memo &amp; Accounting Notes
            </label>
            <textarea
              rows={3}
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--accent-gold)] focus:outline-none"
              placeholder="Add accounting notes, reconciliation context, or payment instructions..."
            />
          </div>
        </div>
      </Modal>

      {/* 8. CONFIRM DIALOG: Single Transaction Deletion */}
      <ConfirmDialog
        open={Boolean(transactionToDelete)}
        onClose={() => {
          if (!isDeleting) setTransactionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title={`Delete ${transactionToDelete?.source === 'COMPANY' ? 'Company' : 'Customer'} Transaction`}
        message={
          <div className="space-y-2.5 text-xs">
            <p className="text-[var(--text-secondary)]">
              Are you sure you want to permanently delete this real transaction from the{' '}
              <strong className="text-[var(--text-primary)]">
                {transactionToDelete?.source === 'COMPANY' ? 'Company / Carrier' : 'Customer'} Ledger
              </strong>
              ?
            </p>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
              <div className="font-semibold text-[var(--text-primary)]">
                {transactionToDelete?.description}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  Date: {transactionToDelete && new Date(transactionToDelete.transactionDate).toLocaleDateString()}
                </span>
                <span
                  className={cn(
                    'font-bold',
                    transactionToDelete?.type === 'DEBIT' ? 'text-[var(--error)]' : 'text-[var(--success)]'
                  )}
                >
                  {transactionToDelete?.type === 'DEBIT' ? '−' : '+'}
                  {transactionToDelete && formatMoney(transactionToDelete.amount)}
                </span>
              </div>
              {transactionToDelete?.reference && (
                <div className="mt-1 text-[10px] text-[var(--text-secondary)] font-mono">
                  Reference: #{transactionToDelete.reference}
                </div>
              )}
            </div>
            <p className="text-[11px] text-[var(--text-secondary)]">
              {transactionToDelete?.source === 'COMPANY'
                ? 'This action will reverse the company ledger entry, recalculate carrier balances, and unlink any associated shipment records.'
                : 'This action will reverse the customer ledger record, recalculate subsequent running balances, and update unbilled invoice line items.'}
            </p>
          </div>
        }
        confirmText="Delete Transaction"
        cancelText="Cancel"
        severity="error"
        loading={isDeleting || deletingTransactionId === transactionToDelete?.id}
      />

      {/* 9. CONFIRM DIALOG: Batch Deletion */}
      <ConfirmDialog
        open={batchDeleteConfirmOpen}
        onClose={() => {
          if (!isBatchDeleting) setBatchDeleteConfirmOpen(false);
        }}
        onConfirm={handleConfirmBatchDelete}
        title={`Delete ${selectedTransactions.length} Selected Transactions`}
        message={
          <div className="space-y-2.5 text-xs">
            <p className="text-[var(--text-secondary)]">
              You are about to delete <strong className="text-[var(--error)]">{selectedTransactions.length}</strong> real
              ledger transactions.
            </p>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-2 divide-y divide-[var(--border)]">
              {selectedTransactions.map((t) => (
                <div key={t.id} className="py-1 flex items-center justify-between text-[11px]">
                  <span className="truncate max-w-[200px]">{t.description}</span>
                  <span className="font-mono font-bold">
                    {t.type === 'DEBIT' ? '−' : '+'}
                    {formatMoney(t.amount)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-[var(--error)] font-medium">
              This action cannot be undone. All corresponding customer and company balances will be reversed and recalculated.
            </p>
          </div>
        }
        confirmText={`Delete ${selectedTransactions.length} Records`}
        cancelText="Cancel"
        severity="error"
        loading={isBatchDeleting}
      />
    </div>
  );
}
export default LedgerComparisonTable;
