'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  DollarSign,
  Receipt,
  Printer,
  CheckCircle2,
  ArrowRightLeft,
  Calendar,
  CreditCard,
  Building2,
  FileText,
} from 'lucide-react';
import { Button, FormField, Modal, Select, toast } from '@/components/design-system';
import { formatMoney as formatCurrency } from '@/lib/format';
import { printCarrierSOA, type StatementItem } from '@/lib/carrier-soa-print';

interface UnsettledEntry {
  id: string;
  transactionDate: string;
  description: string;
  category?: string | null;
  reference?: string | null;
  amount: number;
  metadata?: {
    originalAmount?: number;
    originalCurrency?: string;
    fxRate?: number;
    transitRef?: string;
    [key: string]: unknown;
  } | null;
}

interface SettlementHistoryItem {
  id: string;
  transactionDate: string;
  description: string;
  amount: number;
  reference?: string | null;
  metadata?: {
    paymentMethod?: string;
    payoutCurrency?: string;
    payoutAmount?: number;
    fxRate?: number;
    settledEntryCount?: number;
    [key: string]: unknown;
  } | null;
}

interface CarrierSettlementModalProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
  companyCode?: string | null;
  onSuccess: () => void;
}

const PAYMENT_METHODS = [
  { value: 'Wire Transfer', label: 'Bank Wire Transfer' },
  { value: 'Cash Voucher', label: 'Cash / Petty Cash Voucher' },
  { value: 'Hawala / Sarafi', label: 'Hawala / Money Exchange (Dubai - Kabul)' },
  { value: 'Company Check', label: 'Company Bank Check' },
  { value: 'Credit Card', label: 'Corporate Card / Online' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar ($)' },
  { value: 'AED', label: 'AED - UAE Dirham (د.إ)' },
  { value: 'AFN', label: 'AFN - Afghan Afghani (؋)' },
];

export default function CarrierSettlementModal({
  open,
  onClose,
  companyId,
  companyName,
  companyCode,
  onSuccess,
}: CarrierSettlementModalProps) {
  const [activeTab, setActiveTab] = useState<'settle' | 'history'>('settle');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [unsettledEntries, setUnsettledEntries] = useState<UnsettledEntry[]>([]);
  const [settlementHistory, setSettlementHistory] = useState<SettlementHistoryItem[]>([]);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({ USD: 1.0, AED: 3.6725, AFN: 67.50 });
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());

  // Form states
  const [payoutCurrency, setPayoutCurrency] = useState<'USD' | 'AED' | 'AFN'>('USD');
  const [fxRate, setFxRate] = useState<string>('1.0');
  const [paymentMethod, setPaymentMethod] = useState<string>('Wire Transfer');
  const [reference, setReference] = useState<string>(`SETTLE-${Date.now().toString().slice(-6)}`);
  const [settlementDate, setSettlementDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  // Fetch unsettled items & history
  const loadData = useCallback(async () => {
    if (!open || !companyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/companies/${companyId}/settlements`);
      if (res.ok) {
        const data = await res.json();
        setUnsettledEntries(data.unsettledEntries || []);
        setSettlementHistory(data.settlementHistory || []);
        setCompanyDetails(data.company || null);
        if (data.exchangeRates) {
          setExchangeRates(data.exchangeRates);
          if (payoutCurrency !== 'USD') {
            setFxRate(String(data.exchangeRates[payoutCurrency] || 1.0));
          }
        }
        // Auto-select all by default
        const allIds = new Set<string>((data.unsettledEntries || []).map((e: UnsettledEntry) => e.id));
        setSelectedEntryIds(allIds);
      } else {
        toast.error('Failed to load carrier payables');
      }
    } catch (err) {
      console.error('Error loading settlements:', err);
      toast.error('Network error loading payables');
    } finally {
      setLoading(false);
    }
  }, [open, companyId, payoutCurrency]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  // Handle currency change
  const handleCurrencyChange = (curr: string) => {
    const nextCurr = curr as 'USD' | 'AED' | 'AFN';
    setPayoutCurrency(nextCurr);
    const defaultRate = exchangeRates[nextCurr] || (nextCurr === 'AED' ? 3.6725 : nextCurr === 'AFN' ? 67.50 : 1.0);
    setFxRate(String(defaultRate));
  };

  // Toggle single item selection
  const toggleSelectEntry = (id: string) => {
    setSelectedEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle all
  const toggleSelectAll = () => {
    if (selectedEntryIds.size === unsettledEntries.length) {
      setSelectedEntryIds(new Set());
    } else {
      setSelectedEntryIds(new Set(unsettledEntries.map((e) => e.id)));
    }
  };

  // Compute selected total USD
  const selectedTotalUSD = useMemo(() => {
    return unsettledEntries
      .filter((e) => selectedEntryIds.has(e.id))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [unsettledEntries, selectedEntryIds]);

  // Compute converted payout amount
  const calculatedPayout = useMemo(() => {
    const rate = parseFloat(fxRate);
    if (isNaN(rate) || rate <= 0) return selectedTotalUSD;
    return Number((selectedTotalUSD * rate).toFixed(2));
  }, [selectedTotalUSD, fxRate]);

  // Handle Settlement Submission
  const handleSubmitSettlement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedEntryIds.size === 0) {
      toast.error('Please select at least one payable item to settle.');
      return;
    }

    if (!reference.trim()) {
      toast.error('Please enter a settlement transaction reference number.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        settlementDate,
        entryIds: Array.from(selectedEntryIds),
        amountUSD: Number(selectedTotalUSD.toFixed(2)),
        payoutCurrency,
        fxRate: parseFloat(fxRate) || 1.0,
        payoutAmount: calculatedPayout,
        paymentMethod,
        reference: reference.trim(),
        notes: notes.trim() || undefined,
      };

      const res = await fetch(`/api/finance/companies/${companyId}/settlements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(`Settlement ${reference} successfully recorded!`);
        onSuccess();
        // Prompt Statement of Account print
        handlePrintStatement(Array.from(selectedEntryIds), reference, calculatedPayout);
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to submit settlement');
      }
    } catch (err) {
      console.error('Error submitting settlement:', err);
      toast.error('An error occurred during settlement.');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate / Print Statement of Account
  const handlePrintStatement = (targetIds?: string[], customRef?: string, customPayoutAmount?: number) => {
    const filterIds = targetIds || Array.from(selectedEntryIds);
    const chosenItems = unsettledEntries.filter((e) => filterIds.length === 0 || filterIds.includes(e.id));

    const statementItems: StatementItem[] = chosenItems.map((e) => ({
      id: e.id,
      transactionDate: e.transactionDate,
      description: e.description,
      category: e.category,
      reference: e.reference,
      type: 'CREDIT',
      amount: e.amount,
      originalAmount: e.metadata?.originalAmount,
      originalCurrency: e.metadata?.originalCurrency,
      fxRate: e.metadata?.fxRate,
    }));

    // If custom payout provided, add DEBIT line
    const totalCredit = statementItems.reduce((sum, item) => sum + item.amount, 0);
    const totalDebit = customPayoutAmount !== undefined ? selectedTotalUSD : 0;

    if (totalDebit > 0) {
      statementItems.push({
        id: `payout-${Date.now()}`,
        transactionDate: settlementDate,
        description: `Settlement Payout [${paymentMethod}] • Ref #${customRef || reference}`,
        category: 'Carrier Settlement',
        reference: customRef || reference,
        type: 'DEBIT',
        amount: totalDebit,
      });
    }

    printCarrierSOA({
      company: {
        id: companyId,
        name: companyName,
        code: companyCode,
        phone: companyDetails?.phone,
        address: companyDetails?.address,
        country: companyDetails?.country,
      },
      statementNumber: customRef || reference || `SOA-${Date.now().toString().slice(-6)}`,
      statementDate: settlementDate,
      items: statementItems,
      totalCreditUSD: totalCredit,
      totalDebitUSD: totalDebit,
      closingBalanceUSD: Math.max(0, totalCredit - totalDebit),
      payoutCurrency,
      payoutAmount: customPayoutAmount ?? calculatedPayout,
      fxRate: parseFloat(fxRate) || 1.0,
      paymentMethod,
      reference: customRef || reference,
      notes: notes || undefined,
    });
  };

  const formId = 'carrier-settlement-form';

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Receipt style={{ fontSize: 24, color: 'var(--accent-gold)' }} />
          <span>Carrier Settlement & Statement of Account (SOA)</span>
        </div>
      }
      description={`Audit and settle payables for ${companyName}${companyCode ? ` (${companyCode})` : ''} in USD, AED, or AFN.`}
      actions={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {activeTab === 'settle' ? (
            <>
              <Button
                variant="outline"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => handlePrintStatement()}
                disabled={submitting || selectedEntryIds.size === 0}
              >
                Print Preview (SOA)
              </Button>
              <Button
                type="submit"
                form={formId}
                variant="primary"
                icon={<CheckCircle2 className="w-4 h-4" />}
                disabled={submitting || selectedEntryIds.size === 0 || loading}
              >
                {submitting ? 'Processing Payout...' : `Confirm Settlement (${formatCurrency(selectedTotalUSD)})`}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => setActiveTab('settle')}>
              Go to Settlement Engine
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('settle')}
            style={{
              padding: '8px 12px',
              borderBottom: activeTab === 'settle' ? '2px solid var(--accent-gold)' : 'none',
              fontWeight: activeTab === 'settle' ? 600 : 400,
              color: activeTab === 'settle' ? 'var(--accent-gold)' : 'var(--text-secondary)',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Settle Payables ({unsettledEntries.length} Pending)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '8px 12px',
              borderBottom: activeTab === 'history' ? '2px solid var(--accent-gold)' : 'none',
              fontWeight: activeTab === 'history' ? 600 : 400,
              color: activeTab === 'history' ? 'var(--accent-gold)' : 'var(--text-secondary)',
              background: 'none',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Settlement History & Prior SOAs ({settlementHistory.length})
          </button>
        </div>

        {activeTab === 'settle' ? (
          <form id={formId} onSubmit={handleSubmitSettlement} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Payables Selection Checklist */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  background: 'var(--surface-muted, #1a2234)',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="select-all-entries"
                    checked={unsettledEntries.length > 0 && selectedEntryIds.size === unsettledEntries.length}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="select-all-entries" style={{ fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                    Select All Incurred Legs & Charges ({unsettledEntries.length})
                  </label>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Selected: <strong style={{ color: 'var(--accent-gold)' }}>{selectedEntryIds.size}</strong> items ·{' '}
                  <strong style={{ color: 'var(--accent-gold)' }}>{formatCurrency(selectedTotalUSD)}</strong> USD
                </div>
              </div>

              <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading outstanding carrier entries...
                  </div>
                ) : unsettledEntries.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No unsettled credit payables found. Carrier balance is current!
                  </div>
                ) : (
                  unsettledEntries.map((entry) => {
                    const isChecked = selectedEntryIds.has(entry.id);
                    const fxMeta = entry.metadata;
                    return (
                      <div
                        key={entry.id}
                        onClick={() => toggleSelectEntry(entry.id)}
                        style={{
                          padding: '10px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid rgba(var(--border-rgb, 255, 255, 255), 0.08)',
                          cursor: 'pointer',
                          background: isChecked ? 'rgba(var(--accent-gold-rgb, 212, 175, 55), 0.06)' : 'transparent',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Controlled by container onClick
                            style={{ cursor: 'pointer' }}
                          />
                          <div>
                            <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {entry.description}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              <span>{new Date(entry.transactionDate).toLocaleDateString()}</span>
                              {entry.reference && <span>• Ref: {entry.reference}</span>}
                              {fxMeta?.originalCurrency && fxMeta.originalCurrency !== 'USD' && fxMeta.originalAmount && (
                                <span style={{ color: 'var(--accent-gold)' }}>
                                  ({fxMeta.originalAmount.toLocaleString()} {fxMeta.originalCurrency} @ {fxMeta.fxRate || 1})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success, #10b981)' }}>
                            {formatCurrency(entry.amount)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Multi-Currency Payout Configuration */}
            <div
              style={{
                background: 'rgba(var(--accent-gold-rgb, 212, 175, 55), 0.06)',
                border: '1px solid rgba(var(--accent-gold-rgb, 212, 175, 55), 0.25)',
                borderRadius: '8px',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '0.875rem' }}>
                  <ArrowRightLeft className="w-4 h-4 text-[var(--accent-gold)]" />
                  <span>Settlement Currency & Exchange Rate</span>
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Total Selected: <strong>{formatCurrency(selectedTotalUSD)} USD</strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1.4fr', gap: '12px', alignItems: 'center' }}>
                <Select
                  label="Payout Currency"
                  value={payoutCurrency}
                  onChange={(val) => handleCurrencyChange(String(val))}
                  options={CURRENCIES}
                />
                <FormField
                  id="settlement-fx-rate"
                  name="fxRate"
                  label={`Exchange Rate (${payoutCurrency} / $1 USD)`}
                  type="number"
                  value={fxRate}
                  onChange={(e) => setFxRate(e.target.value)}
                  disabled={payoutCurrency === 'USD'}
                  inputProps={{ min: 0.0001, step: 0.0001 }}
                  size="small"
                />
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Carrier Payout Amount</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
                    {calculatedPayout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                    {payoutCurrency}
                  </span>
                </div>
              </div>
            </div>

            {/* Settlement Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <Select
                label="Payment Method"
                value={paymentMethod}
                onChange={(val) => setPaymentMethod(String(val))}
                options={PAYMENT_METHODS}
              />
              <FormField
                id="settlement-reference"
                name="reference"
                label="Settlement / Voucher Reference #"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                required
                size="small"
                placeholder="e.g. WIRE-2026-092 or Cash Voucher #"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <FormField
                id="settlement-date"
                name="settlementDate"
                label="Settlement Date"
                type="date"
                value={settlementDate}
                onChange={(e) => setSettlementDate(e.target.value)}
                required
                InputLabelProps={{ shrink: true }}
                size="small"
              />
              <FormField
                id="settlement-notes"
                name="notes"
                label="Internal Audit Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Bank swift reference, hawala broker name, remarks..."
                size="small"
              />
            </div>
          </form>
        ) : (
          /* Settlement History & Past Statements */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              Completed carrier payouts and historical settlement vouchers:
            </div>
            {settlementHistory.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border)', borderRadius: '8px' }}>
                No past carrier settlements recorded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' }}>
                {settlementHistory.map((item) => {
                  const meta = item.metadata;
                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 14px',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--surface-muted, #1a2234)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {item.description}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <span>{new Date(item.transactionDate).toLocaleDateString()}</span>
                          {meta?.paymentMethod && <span>• Method: {meta.paymentMethod}</span>}
                          {meta?.payoutCurrency && meta.payoutCurrency !== 'USD' && meta.payoutAmount && (
                            <span style={{ color: 'var(--accent-gold)' }}>
                              • Disbursed: {meta.payoutAmount.toLocaleString()} {meta.payoutCurrency} (@ {meta.fxRate || 1})
                            </span>
                          )}
                          {meta?.settledEntryCount && (
                            <span>• Covered: {meta.settledEntryCount} entries</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--error, #ef4444)' }}>
                          {formatCurrency(item.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Printer className="w-4 h-4" />}
                          onClick={() => {
                            // Print SOA for this historical settlement
                            printCarrierSOA({
                              company: {
                                id: companyId,
                                name: companyName,
                                code: companyCode,
                                phone: companyDetails?.phone,
                                address: companyDetails?.address,
                                country: companyDetails?.country,
                              },
                              statementNumber: item.reference || `SOA-${item.id.slice(-6)}`,
                              statementDate: item.transactionDate,
                              items: [
                                {
                                  id: item.id,
                                  transactionDate: item.transactionDate,
                                  description: item.description,
                                  reference: item.reference,
                                  type: 'DEBIT',
                                  amount: item.amount,
                                },
                              ],
                              totalCreditUSD: 0,
                              totalDebitUSD: item.amount,
                              closingBalanceUSD: 0,
                              payoutCurrency: (meta?.payoutCurrency as string) || 'USD',
                              payoutAmount: (meta?.payoutAmount as number) || item.amount,
                              fxRate: (meta?.fxRate as number) || 1.0,
                              paymentMethod: (meta?.paymentMethod as string) || 'Bank Wire',
                              reference: item.reference || undefined,
                            });
                          }}
                        >
                          SOA
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

