'use client';

import { useState } from 'react';
import { CheckCircle2, CircleDashed, DollarSign, Pencil, ReceiptText, Ship, Trash2, Truck } from 'lucide-react';
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from '@mui/material';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, toast } from '@/components/design-system';
import { cn } from '@/lib/utils';
import { formatMoney as formatSnapshotMoney } from '@/lib/format';
import type {
  ClassifiedExpenseSource,
  ClassifiedShipmentExpenseData,
  ComparisonTransactionWithDrillDown,
  ExpenseSourceFilter,
  Shipment,
  ShipmentExpenseEntryWithCompanyLedger,
  StatusColors,
} from '@/components/shipments/shipment-detail-types';

type ShipmentFinancialsTabProps = {
  shipment: Shipment;
  canManageShipmentExpenses: boolean;
  canAddLedgerExpense: boolean;
  canAddShipmentExpense: boolean;
  canAddDispatchExpense: boolean;
  canAddTransitExpense: boolean;
  canViewLedgerComparison: boolean;
  expenseActionHelpText: string;
  expenseLedgerHelpText: string;
  companyChargedForComparison: number;
  companyLedgerDebitsTotal: number;
  companyLedgerCreditsTotal: number;
  customerChargedForComparison: number;
  userLedgerDebitsTotal: number;
  userLedgerCreditsTotal: number;
  netDifference: number;
  comparisonTransactions: ComparisonTransactionWithDrillDown[];
  classifiedShipmentExpenseData: ClassifiedShipmentExpenseData;
  filteredShipmentExpenseTotal: number;
  expenseSourceFilter: ExpenseSourceFilter;
  expenseEntriesWithCompanyLedger: ShipmentExpenseEntryWithCompanyLedger[];
  deletingExpenseId: string | null;
  totalEstimatedCost: number;
  expenseSourceLabels: Record<ClassifiedExpenseSource, string>;
  expenseSourceDescriptions: Record<ClassifiedExpenseSource, string>;
  expenseSourceStyles: Record<ClassifiedExpenseSource, StatusColors>;
  onOpenShipmentExpense: () => void;
  onOpenDispatchExpense: () => void;
  onOpenTransitExpense: () => void;
  onExpenseSourceFilterChange: (value: ExpenseSourceFilter) => void;
  onOpenCompanyLedgerEntry: (entry: NonNullable<Shipment['companyLedgerEntries']>[number]) => void;
  onDeleteExpense: (entryId: string) => void;
  onExpenseUpdated: () => void;
};

function formatPriceListLane(snapshot: Shipment['priceListPricingSnapshot']) {
  const lane = snapshot?.matchedLane;
  const parts = [lane?.stateCode, lane?.branch, lane?.city, lane?.loadingPoint].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : snapshot?.destinationLabel || 'No lane matched yet';
}

function formatSnapshotDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString();
}

export default function ShipmentFinancialsTab({
  shipment,
  canManageShipmentExpenses,
  canAddLedgerExpense,
  canAddShipmentExpense,
  canAddDispatchExpense,
  canAddTransitExpense,
  canViewLedgerComparison,
  expenseActionHelpText,
  expenseLedgerHelpText,
  companyChargedForComparison,
  companyLedgerDebitsTotal,
  companyLedgerCreditsTotal,
  customerChargedForComparison,
  userLedgerDebitsTotal,
  userLedgerCreditsTotal,
  netDifference,
  comparisonTransactions,
  classifiedShipmentExpenseData,
  filteredShipmentExpenseTotal,
  expenseSourceFilter,
  expenseEntriesWithCompanyLedger,
  deletingExpenseId,
  totalEstimatedCost,
  expenseSourceLabels,
  expenseSourceDescriptions,
  expenseSourceStyles,
  onOpenShipmentExpense,
  onOpenDispatchExpense,
  onOpenTransitExpense,
  onExpenseSourceFilterChange,
  onOpenCompanyLedgerEntry,
  onDeleteExpense,
  onExpenseUpdated,
}: ShipmentFinancialsTabProps) {
  const priceListSnapshot = shipment.priceListPricingSnapshot;
  const [editingExpense, setEditingExpense] = useState<ShipmentExpenseEntryWithCompanyLedger | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updatingExpense, setUpdatingExpense] = useState(false);

  const openEditExpense = (entry: ShipmentExpenseEntryWithCompanyLedger) => {
    setEditingExpense(entry);
    setEditDescription(entry.description);
    setEditNotes(entry.notes || '');
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;
    if (!editDescription.trim()) {
      toast.error('Description is required');
      return;
    }

    setUpdatingExpense(true);
    try {
      const response = await fetch(`/api/ledger/${editingExpense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editDescription.trim(),
          notes: editNotes.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update expense');
      }
      toast.success('Expense updated');
      setEditingExpense(null);
      onExpenseUpdated();
    } catch (error) {
      toast.error('Unable to update expense', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setUpdatingExpense(false);
    }
  };
  const priceListCurrency = priceListSnapshot?.currency || 'USD';
  const priceListDispatchPosted = Boolean(priceListSnapshot?.posted?.dispatch?.chargeId);
  const priceListShippingPosted = Boolean(priceListSnapshot?.posted?.shipping?.chargeId);
  const hasPriceListPricing = typeof priceListSnapshot?.totalPrice === 'number' && priceListSnapshot.totalPrice > 0;
  const hasPriceListCompany = Boolean(priceListSnapshot?.companyName || shipment.container?.shippingLine);
  const hasPriceListLaneInput = Boolean(
    shipment.purchaseLocation ||
      shipment.auctionName ||
      priceListSnapshot?.matchedLane?.stateCode ||
      priceListSnapshot?.matchedLane?.branch ||
      priceListSnapshot?.matchedLane?.city
  );
  const priceListCalculatedAt = formatSnapshotDate(priceListSnapshot?.calculatedAt);
  const priceListChecklist = [
    {
      label: 'Company selected',
      done: hasPriceListCompany,
      detail: priceListSnapshot?.companyName || shipment.container?.shippingLine || 'Choose a container or shipping company with an active price list.',
    },
    {
      label: 'Pickup lane available',
      done: hasPriceListLaneInput,
      detail: shipment.purchaseLocation || shipment.auctionName || formatPriceListLane(priceListSnapshot),
    },
    {
      label: 'Price matched',
      done: hasPriceListPricing,
      detail: hasPriceListPricing
        ? `${formatSnapshotMoney(priceListSnapshot?.totalPrice, priceListCurrency)} from ${priceListSnapshot?.priceListName || 'active price list'}`
        : 'Upload/activate a company price list that contains this lane.',
    },
    {
      label: 'Dispatch charge',
      done: priceListDispatchPosted,
      detail: priceListDispatchPosted ? 'Posted to billing.' : 'Posts at dispatch handoff when pricing is matched.',
    },
    {
      label: 'Shipping charge',
      done: priceListShippingPosted,
      detail: priceListShippingPosted ? 'Posted to billing.' : 'Posts when the shipment is assigned to a container.',
    },
  ];

  return (
    <>
      <DashboardPanel
      title="Shipment Financials"
      description="Costs and expenses associated with this shipment"
      actions={
        canAddLedgerExpense ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" icon={<DollarSign className="h-4 w-4" />} onClick={onOpenShipmentExpense} disabled={!canAddShipmentExpense}>
              Shipment Expense
            </Button>
            <Button variant="outline" size="sm" icon={<Truck className="h-4 w-4" />} onClick={onOpenDispatchExpense} disabled={!canAddDispatchExpense}>
              Dispatch Expense
            </Button>
            <Button variant="outline" size="sm" icon={<Ship className="h-4 w-4" />} onClick={onOpenTransitExpense} disabled={!canAddTransitExpense}>
              Transit Expense
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg border border-[rgba(var(--accent-gold-rgb),0.25)] bg-[rgba(var(--accent-gold-rgb),0.10)] p-2 text-[var(--accent-gold)]">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase text-[var(--text-secondary)]">Price List Automation</h3>
                {hasPriceListPricing ? (
                  <p className="mt-1 text-sm text-[var(--text-primary)]">
                    Using {priceListSnapshot?.companyName || 'the shipping company'} price list
                    {priceListSnapshot?.priceListName ? `: ${priceListSnapshot.priceListName}` : ''}.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[var(--text-primary)]">
                    No company price list has been matched yet.
                  </p>
                )}
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {hasPriceListPricing
                    ? `Matched lane: ${formatPriceListLane(priceListSnapshot)}. Dispatch and shipping are posted from this same company price list.`
                    : 'Assign the shipment to a container with a shipping company that has an active price list, or add the shipping company before dispatch.'}
                </p>
              </div>
            </div>

            {hasPriceListPricing ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
                  priceListDispatchPosted && priceListShippingPosted
                    ? 'border-[rgba(34,197,94,0.34)] bg-[rgba(34,197,94,0.12)] text-[rgb(21,128,61)]'
                    : 'border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] text-[rgb(180,83,9)]'
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {priceListDispatchPosted && priceListShippingPosted ? 'Fully Posted' : 'Partially Posted'}
              </span>
            ) : null}
          </div>

          {hasPriceListPricing && (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Full Price</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    {formatSnapshotMoney(priceListSnapshot?.totalPrice, priceListCurrency)}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    {priceListSnapshot?.sourceFileName || 'Active company price list'}
                    {priceListCalculatedAt ? ` · ${priceListCalculatedAt}` : ''}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Dispatch Portion</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    {formatSnapshotMoney(priceListSnapshot?.dispatchAmount, priceListCurrency)}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{priceListDispatchPosted ? 'Posted to billing' : 'Waiting for dispatch handoff'}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Shipping Portion</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    {formatSnapshotMoney(priceListSnapshot?.shippingAmount, priceListCurrency)}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{priceListShippingPosted ? 'Posted to billing' : 'Waiting for container assignment'}</p>
                </div>
              </div>
            </>
          )}

          <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Pricing Checklist</p>
            <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-5">
              {priceListChecklist.map((item) => (
                <div key={item.label} className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle2 className="h-4 w-4 text-[rgb(21,128,61)]" />
                    ) : (
                      <CircleDashed className="h-4 w-4 text-[var(--text-secondary)]" />
                    )}
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-primary)]">{item.label}</p>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase text-[var(--text-secondary)]">Expense Actions</h3>
          <p className="text-sm text-[var(--text-secondary)]">{expenseActionHelpText}</p>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <h3 className="mb-2 text-sm font-semibold uppercase text-[var(--text-secondary)]">Expense Posting Target</h3>
          <p className="text-sm text-[var(--text-secondary)]">{expenseLedgerHelpText}</p>
        </div>

        {canViewLedgerComparison && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase text-[var(--text-secondary)]">Ledger Comparison</h3>
            <p className="mb-4 text-xs text-[var(--text-secondary)]">
              Compare what the company charged on this shipment versus what was charged to the customer.
            </p>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Company Charged Me (Net)</p>
                <p className="mt-1 text-lg font-semibold text-[var(--error)]">${companyChargedForComparison.toFixed(2)}</p>
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                  Debits ${companyLedgerDebitsTotal.toFixed(2)} - Credits ${companyLedgerCreditsTotal.toFixed(2)}
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Charged To Customer (Net)</p>
                <p className="mt-1 text-lg font-semibold text-[var(--success)]">${customerChargedForComparison.toFixed(2)}</p>
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                  Debits ${userLedgerDebitsTotal.toFixed(2)} - Credits ${userLedgerCreditsTotal.toFixed(2)}
                </p>
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Difference (Customer - Company)</p>
                <p className={cn('mt-1 text-lg font-semibold', netDifference >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]')}>
                  ${netDifference.toFixed(2)}
                </p>
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Based on ledger transactions linked to this shipment.</p>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
              <div className="grid grid-cols-12 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                <div className="col-span-2">Source</div>
                <div className="col-span-2">Date</div>
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {comparisonTransactions.length > 0 ? (
                <div className="max-h-72 overflow-y-auto">
                  {comparisonTransactions.map((entry) => (
                    <div key={entry.id} className="grid grid-cols-12 items-center border-b border-[var(--border)] px-3 py-2 text-xs last:border-b-0">
                      <div className="col-span-2">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            entry.source === 'COMPANY'
                              ? 'border border-[var(--error)]/35 bg-[var(--error)]/10 text-[var(--error)]'
                              : 'border border-[var(--success)]/35 bg-[var(--success)]/10 text-[var(--success)]'
                          )}
                        >
                          {entry.source}
                        </span>
                      </div>
                      <div className="col-span-2 text-[var(--text-secondary)]">{new Date(entry.transactionDate).toLocaleDateString()}</div>
                      <div className="col-span-6 truncate text-[var(--text-primary)]" title={entry.description}>
                        <div className="flex items-center gap-2">
                          <span className="truncate">{entry.description}</span>
                          {entry.source === 'COMPANY' && (
                            <button
                              type="button"
                              onClick={() => onOpenCompanyLedgerEntry(entry.companyLedgerEntry)}
                              className="shrink-0 rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                            >
                              View Entry
                            </button>
                          )}
                          {entry.source === 'CUSTOMER' && entry.linkedCompanyLedgerEntry && (
                            <button
                              type="button"
                              onClick={() => onOpenCompanyLedgerEntry(entry.linkedCompanyLedgerEntry!)}
                              className="shrink-0 rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                            >
                              Company Entry
                            </button>
                          )}
                        </div>
                      </div>
                      <div className={cn('col-span-2 text-right font-semibold', entry.type === 'DEBIT' ? 'text-[var(--error)]' : 'text-[var(--success)]')}>
                        {entry.type === 'DEBIT' ? '+' : '-'}${entry.amount.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-3 py-4 text-sm text-[var(--text-secondary)]">No ledger transactions linked to this shipment yet.</div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-[var(--text-secondary)]">Base Costs</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-[var(--text-primary)]">Shipment Price</span>
              <span className="text-sm font-medium">{shipment.price ? `$${shipment.price.toFixed(2)}` : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--text-primary)]">Insurance</span>
              <span className="text-sm font-medium">{shipment.insuranceValue ? `$${shipment.insuranceValue.toFixed(2)}` : '-'}</span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-[var(--text-secondary)]">Additional Expenses</h3>
          {classifiedShipmentExpenseData.entries.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {(['DISPATCH', 'SHIPMENT', 'TRANSIT'] as ClassifiedExpenseSource[]).map((source) => (
                  <div key={source} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{expenseSourceLabels[source]}</p>
                        <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">${classifiedShipmentExpenseData.totals[source].toFixed(2)}</p>
                      </div>
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: expenseSourceStyles[source].bg,
                          color: expenseSourceStyles[source].text,
                          border: `1px solid ${expenseSourceStyles[source].border}`,
                        }}
                      >
                        {classifiedShipmentExpenseData.counts[source]} item{classifiedShipmentExpenseData.counts[source] === 1 ? '' : 's'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">{expenseSourceDescriptions[source]}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Expense Source Filter</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Showing ${filteredShipmentExpenseTotal.toFixed(2)} of ${classifiedShipmentExpenseData.total.toFixed(2)} total tracked expense.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: 'ALL', label: 'All Sources' },
                      { value: 'DISPATCH', label: 'Dispatch' },
                      { value: 'SHIPMENT', label: 'Shipping' },
                      { value: 'TRANSIT', label: 'Transit' },
                    ] as Array<{ value: ExpenseSourceFilter; label: string }>).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onExpenseSourceFilterChange(option.value)}
                        className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                        style={{
                          backgroundColor: expenseSourceFilter === option.value ? 'rgba(var(--accent-gold-rgb), 0.16)' : 'var(--panel)',
                          color: expenseSourceFilter === option.value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                          border:
                            expenseSourceFilter === option.value
                              ? '1px solid rgba(var(--accent-gold-rgb), 0.32)'
                              : '1px solid var(--border)',
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {expenseEntriesWithCompanyLedger.map((entry) => (
                  <div key={entry.id} className="flex justify-between gap-4 border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-[var(--text-primary)]">{entry.description}</p>
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: expenseSourceStyles[entry.source].bg,
                            color: expenseSourceStyles[entry.source].text,
                            border: `1px solid ${expenseSourceStyles[entry.source].border}`,
                          }}
                        >
                          {expenseSourceLabels[entry.source]}
                        </span>
                        {entry.linkedCompanyLedgerEntry && canViewLedgerComparison && (
                          <button
                            type="button"
                            onClick={() => onOpenCompanyLedgerEntry(entry.linkedCompanyLedgerEntry!)}
                            className="rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                          >
                            Company Ledger
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">{new Date(entry.transactionDate).toLocaleDateString()}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <span className="text-sm font-medium text-[var(--error)]">${entry.amount.toFixed(2)}</span>
                      {canManageShipmentExpenses && (
                        <>
                          <button
                            type="button"
                            onClick={() => openEditExpense(entry)}
                            className="flex items-center justify-center rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[rgba(var(--accent-gold-rgb),0.12)] hover:text-[var(--accent-gold)]"
                            title="Edit expense"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteExpense(entry.id)}
                            disabled={deletingExpenseId === entry.id}
                            className="flex items-center justify-center rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                            title="Delete expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="italic text-sm text-[var(--text-secondary)]">No additional expenses recorded.</p>
          )}
        </div>

        <div className="flex justify-between rounded-lg bg-[var(--accent-gold)]/10 p-4">
          <span className="font-bold text-[var(--accent-gold)]">Total Estimated Cost</span>
          <span className="font-bold text-[var(--accent-gold)]">${totalEstimatedCost.toFixed(2)}</span>
        </div>
      </div>
      </DashboardPanel>

      <Dialog open={Boolean(editingExpense)} onClose={() => !updatingExpense && setEditingExpense(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Expense</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
          <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
            Note: Type and amount cannot be edited to maintain ledger integrity. Only description and notes can be updated.
          </Alert>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Amount (Read-only)"
              value={editingExpense ? `$${editingExpense.amount.toFixed(2)}` : ''}
              disabled
            />
            <TextField
              label="Date (Read-only)"
              value={editingExpense ? new Date(editingExpense.transactionDate).toLocaleDateString() : ''}
              disabled
            />
          </Box>
          <TextField
            label="Description *"
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            required
          />
          <TextField
            label="Notes"
            rows={3}
            multiline
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outline" onClick={() => setEditingExpense(null)} disabled={updatingExpense}>Cancel</Button>
          <Button onClick={() => void handleUpdateExpense()} disabled={updatingExpense}>{updatingExpense ? 'Saving...' : 'Save Changes'}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
