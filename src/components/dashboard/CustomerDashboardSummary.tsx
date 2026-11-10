'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Receipt, Wallet, Search, TrendingDown, TrendingUp, ArrowRight, Ship, Truck, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { hasPermission } from '@/lib/rbac';

type CustomerDashboardSummaryProps = {
  role?: string;
};

type LedgerSummary = {
  totalDebits: number;
  totalCredits: number;
  balance: number;
};

type ShipmentSummary = {
  id: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string;
  status: string;
  createdAt: string;
};

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  amountPaid: number;
  dueDate?: string;
};

export default function CustomerDashboardSummary({ role }: CustomerDashboardSummaryProps) {
  const [ledger, setLedger] = useState<LedgerSummary | null>(null);
  const [shipments, setShipments] = useState<ShipmentSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [ledgerRes, shipmentsRes, invoicesRes] = await Promise.all([
          fetch('/api/ledger?recalc=true&limit=1'),
          fetch('/api/search?type=shipments&limit=5'),
          fetch('/api/invoices?limit=5'),
        ]);

        const [ledgerData, shipmentsData, invoicesData] = await Promise.all([
          ledgerRes.json(),
          shipmentsRes.json(),
          invoicesRes.json(),
        ]);

        // Calculate ledger summary
        const entries = ledgerData.entries || [];
        const totalDebits = entries.reduce((sum: number, e: any) => sum + (e.type === 'DEBIT' ? Number(e.amount) : 0), 0);
        const totalCredits = entries.reduce((sum: number, e: any) => sum + (e.type === 'CREDIT' ? Number(e.amount) : 0), 0);
        const balance = (ledgerData.summary?.balance ?? totalDebits - totalCredits);

        setLedger({
          totalDebits,
          totalCredits,
          balance,
        });

        setShipments((shipmentsData.results || shipmentsData.shipments || []).slice(0, 5));
        setInvoices((invoicesData.invoices || invoicesData.results || []).slice(0, 5));
      } catch (err) {
        setError('Could not load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const statusColor = (status: string) => {
    const s = status?.toLowerCase();
    if (['delivered', 'completed', 'paid'].includes(s)) return 'text-[var(--success)]';
    if (['in_transit', 'dispatched', 'sent'].includes(s)) return 'text-[var(--info)]';
    if (['pending', 'on_hand', 'draft'].includes(s)) return 'text-[var(--warning)]';
    if (['overdue', 'cancelled'].includes(s)) return 'text-[var(--error)]';
    return 'text-[var(--text-secondary)]';
  };

  const statusIcon = (status: string) => {
    const s = status?.toLowerCase();
    if (['delivered', 'completed', 'paid'].includes(s)) return <CheckCircle2 className="h-3.5 w-3.5" />;
    if (['in_transit', 'dispatched'].includes(s)) return <Truck className="h-3.5 w-3.5" />;
    if (['pending', 'on_hand'].includes(s)) return <Clock className="h-3.5 w-3.5" />;
    if (['overdue'].includes(s)) return <AlertCircle className="h-3.5 w-3.5" />;
    return <Package className="h-3.5 w-3.5" />;
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-[var(--panel)] border border-[var(--border)]" />
          ))}
        </div>
        <div className="h-48 rounded-lg bg-[var(--panel)] border border-[var(--border)]" />
      </div>
    );
  }

  const balance = ledger?.balance ?? 0;
  const isPositive = balance <= 0;
  const displayBalance = Math.abs(balance);

  return (
    <div className="space-y-5">
      {/* Welcome Header */}
      <div className="rounded-xl border border-[var(--border)] bg-gradient-to-br from-[var(--panel)] to-[var(--background)] p-5">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">My Account Overview</h2>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Your shipments, invoices and balance at a glance</p>
      </div>

      {/* Balance Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/dashboard/finance/ledger"
          className="group rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent-gold)]/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="h-4 w-4 text-[var(--accent-gold)]" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">My Balance</span>
          </div>
          <div className={`text-2xl font-bold ${isPositive ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            {isPositive ? '' : '-'}{formatCurrency(displayBalance)}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-[var(--text-secondary)]">
            {isPositive ? (
              <><CheckCircle2 className="h-3 w-3 text-[var(--success)]" /> No outstanding balance</>
            ) : (
              <><AlertCircle className="h-3 w-3 text-[var(--warning)]" /> Outstanding balance</>
            )}
          </div>
        </Link>

        <Link
          href="/dashboard/shipments"
          className="group rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent-gold)]/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-4 w-4 text-[var(--info)]" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">My Shipments</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{shipments.length}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {shipments.filter(s => !['DELIVERED', 'CANCELLED'].includes(s.status)).length} active
          </div>
        </Link>

        <Link
          href="/dashboard/invoices"
          className="group rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4 hover:border-[var(--accent-gold)]/40 transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="h-4 w-4 text-[var(--warning)]" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">My Invoices</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{invoices.length}</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {invoices.filter(i => i.status === 'OVERDUE').length} overdue
          </div>
        </Link>
      </div>

      {/* Recent Shipments */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Ship className="h-4 w-4 text-[var(--accent-gold)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Recent Shipments</span>
          </div>
          <Link
            href="/dashboard/shipments"
            className="text-xs text-[var(--accent-gold)] hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {shipments.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-[var(--text-secondary)]">
            No shipments yet
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {shipments.map((s) => (
              <Link
                key={s.id}
                href={`/dashboard/shipments/${s.id}`}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--background)] transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={statusColor(s.status)}>{statusIcon(s.status)}</span>
                  <div className="min-w-0">
                    <div className="text-sm text-[var(--text-primary)] truncate">
                      {s.vehicleVIN || `${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || s.id.slice(0, 8)}
                    </div>
                    <div className="text-[10px] text-[var(--text-secondary)]">
                      {s.status?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--text-secondary)] shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Invoices */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-[var(--accent-gold)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Recent Invoices</span>
          </div>
          <Link
            href="/dashboard/invoices"
            className="text-xs text-[var(--accent-gold)] hover:underline flex items-center gap-1"
          >
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {invoices.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-[var(--text-secondary)]">
            No invoices yet
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {invoices.map((inv) => {
              const isPaid = inv.status === 'PAID';
              const isOverdue = inv.status === 'OVERDUE';
              const remaining = Math.max(0, inv.total - (inv.amountPaid || 0));
              return (
                <Link
                  key={inv.id}
                  href={`/dashboard/invoices/${inv.id}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-[var(--background)] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={statusColor(inv.status)}>{statusIcon(inv.status)}</span>
                    <div className="min-w-0">
                      <div className="text-sm text-[var(--text-primary)] truncate">
                        {inv.invoiceNumber || `Invoice ${inv.id.slice(0, 8)}`}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)]">
                        {isPaid ? `Paid ${formatCurrency(inv.amountPaid || inv.total)}` : `${formatCurrency(remaining)} due`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-medium ${isOverdue ? 'text-[var(--error)]' : isPaid ? 'text-[var(--success)]' : 'text-[var(--text-primary)]'}`}>
                      {formatCurrency(inv.total)}
                    </div>
                    <div className={`text-[10px] ${isOverdue ? 'text-[var(--error)]' : 'text-[var(--text-secondary)]'}`}>
                      {inv.status?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Quick Actions
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Link
            href="/dashboard/tracking"
            className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/40 transition-all text-center"
          >
            <Search className="h-5 w-5 text-[var(--info)]" />
            <span className="text-xs text-[var(--text-primary)]">Track Shipment</span>
          </Link>
          <Link
            href="/dashboard/finance/ledger"
            className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/40 transition-all text-center"
          >
            <Wallet className="h-5 w-5 text-[var(--accent-gold)]" />
            <span className="text-xs text-[var(--text-primary)]">My Ledger</span>
          </Link>
          <Link
            href="/dashboard/invoices"
            className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/40 transition-all text-center"
          >
            <Receipt className="h-5 w-5 text-[var(--warning)]" />
            <span className="text-xs text-[var(--text-primary)]">Invoices</span>
          </Link>
          <Link
            href="/dashboard/shipments"
            className="flex flex-col items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/40 transition-all text-center"
          >
            <Package className="h-5 w-5 text-[var(--success)]" />
            <span className="text-xs text-[var(--text-primary)]">My Shipments</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
