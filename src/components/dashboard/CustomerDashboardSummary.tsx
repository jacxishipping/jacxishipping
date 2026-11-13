'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Receipt, Wallet, Search, TrendingDown, TrendingUp, ArrowRight, Ship, Truck, Clock, CheckCircle2, AlertCircle, MapPin, Anchor, Container, ScanLine, Bell } from 'lucide-react';
import { hasPermission } from '@/lib/rbac';
import CompactTrackingMap from '@/components/dashboard/CompactTrackingMap';

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
  container?: { containerNumber?: string; status?: string } | null;
  dispatch?: { referenceNumber?: string } | null;
  transit?: { referenceNumber?: string } | null;
};

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number;
  amountPaid: number;
  dueDate?: string;
};

type MilestoneAlert = {
  id: string;
  type: 'shipment' | 'invoice' | 'payment';
  message: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
  link: string;
  timestamp: string;
};

export default function CustomerDashboardSummary({ role }: CustomerDashboardSummaryProps) {
  const [ledger, setLedger] = useState<LedgerSummary | null>(null);
  const [shipments, setShipments] = useState<ShipmentSummary[]>([]);
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [milestoneAlerts, setMilestoneAlerts] = useState<MilestoneAlert[]>([]);

  // Pipeline stage definitions for shipment progress
  const pipelineStages = [
    { key: 'ON_HAND', label: 'On Hand', icon: Package, color: 'var(--info)' },
    { key: 'DISPATCHING', label: 'Dispatching', icon: Truck, color: 'var(--warning)' },
    { key: 'IN_TRANSIT', label: 'In Transit', icon: Ship, color: 'var(--accent-gold)' },
    { key: 'IN_TRANSIT_TO_DESTINATION', label: 'To Destination', icon: MapPin, color: 'var(--info)' },
    { key: 'RELEASED', label: 'Released', icon: CheckCircle2, color: 'var(--success)' },
    { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle2, color: 'var(--success)' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

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

        // Compute milestone alerts
        const alerts: MilestoneAlert[] = [];
        const allShipments: ShipmentSummary[] = (shipmentsData.results || shipmentsData.shipments || []).slice(0, 5);
        const allInvoices: InvoiceSummary[] = (invoicesData.invoices || invoicesData.results || []).slice(0, 5);

        allShipments.forEach((s) => {
          const status = s.status?.toUpperCase();
          if (status === 'IN_TRANSIT' || status === 'IN_TRANSIT_TO_DESTINATION') {
            alerts.push({
              id: `ship-${s.id}`,
              type: 'shipment',
              message: `Shipment ${s.vehicleVIN || s.id.slice(0, 8)} is ${status.replace(/_/g, ' ').toLowerCase()}`,
              severity: 'info',
              link: `/dashboard/shipments/${s.id}`,
              timestamp: new Date().toISOString(),
            });
          }
          if (status === 'RELEASED') {
            alerts.push({
              id: `rel-${s.id}`,
              type: 'shipment',
              message: `Shipment ${s.vehicleVIN || s.id.slice(0, 8)} has been released`,
              severity: 'success',
              link: `/dashboard/shipments/${s.id}`,
              timestamp: new Date().toISOString(),
            });
          }
        });

        allInvoices.forEach((inv) => {
          if (inv.status === 'OVERDUE') {
            alerts.push({
              id: `inv-${inv.id}`,
              type: 'invoice',
              message: `Invoice ${inv.invoiceNumber || inv.id.slice(0, 8)} is overdue — ${formatCurrency(Math.max(0, inv.total - (inv.amountPaid || 0)))} remaining`,
              severity: 'danger',
              link: `/dashboard/invoices/${inv.id}`,
              timestamp: new Date().toISOString(),
            });
          }
          if (inv.status === 'SENT' || inv.status === 'PENDING') {
            alerts.push({
              id: `pay-${inv.id}`,
              type: 'payment',
              message: `Invoice ${inv.invoiceNumber || inv.id.slice(0, 8)} — ${formatCurrency(Math.max(0, inv.total - (inv.amountPaid || 0)))} payment pending`,
              severity: 'warning',
              link: `/dashboard/invoices/${inv.id}`,
              timestamp: new Date().toISOString(),
            });
          }
        });

        setMilestoneAlerts(alerts);
      } catch (err) {
        setError('Could not load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

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

      {/* #10: Milestone Alerts Widget */}
      {milestoneAlerts.length > 0 && (
        <div id="customer-milestone-alerts" className="rounded-xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
            <Bell className="h-4 w-4 text-[var(--accent-gold)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Milestone Alerts</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] font-medium">
              {milestoneAlerts.length}
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {milestoneAlerts.map((alert) => {
              const severityColors: Record<string, string> = {
                info: 'bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20',
                warning: 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20',
                success: 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20',
                danger: 'bg-[var(--error)]/10 text-[var(--error)] border-[var(--error)]/20',
              };
              const severityDots: Record<string, string> = {
                info: 'bg-[var(--info)]',
                warning: 'bg-[var(--warning)]',
                success: 'bg-[var(--success)]',
                danger: 'bg-[var(--error)]',
              };
              return (
                <Link
                  key={alert.id}
                  href={alert.link}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--background)] transition-colors"
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${severityDots[alert.severity]}`} />
                  <span className="text-xs text-[var(--text-primary)] flex-1">{alert.message}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${severityColors[alert.severity]}`}>
                    {alert.type === 'shipment' ? 'Shipment' : alert.type === 'invoice' ? 'Invoice' : 'Payment'}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* #2: Shipment Progress Pipeline */}
      {shipments.filter((s) => !['DELIVERED', 'CANCELLED'].includes(s.status)).length > 0 && (
        <div id="customer-shipment-pipeline" className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Container className="h-4 w-4 text-[var(--accent-gold)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Shipment Progress</span>
          </div>
          <div className="space-y-3">
            {shipments
              .filter((s) => !['DELIVERED', 'CANCELLED'].includes(s.status))
              .slice(0, 3)
              .map((s) => {
                const currentStageIdx = pipelineStages.findIndex((ps) => ps.key === s.status);
                const label = s.vehicleVIN || `${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || s.id.slice(0, 8);
                return (
                  <Link
                    key={s.id}
                    href={`/dashboard/shipments/${s.id}`}
                    className="block rounded-lg border border-[var(--border)] bg-[var(--background)] p-3 hover:border-[var(--accent-gold)]/40 transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-[var(--text-primary)] truncate">{label}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] shrink-0 ml-2">
                        {currentStageIdx >= 0 ? `Stage ${currentStageIdx + 1}/${pipelineStages.length}` : s.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {pipelineStages.map((stage, idx) => {
                        const StageIcon = stage.icon;
                        const isActive = idx === currentStageIdx;
                        const isCompleted = idx < currentStageIdx;
                        const isUpcoming = idx > currentStageIdx;
                        return (
                          <div key={stage.key} className="flex items-center flex-1">
                            <div
                              className={`flex items-center justify-center w-6 h-6 rounded-full transition-all ${
                                isCompleted
                                  ? 'bg-[var(--success)]/15 text-[var(--success)]'
                                  : isActive
                                  ? 'bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/30'
                                  : 'bg-[var(--border)]/30 text-[var(--text-secondary)]/40'
                              }`}
                            >
                              <StageIcon className="h-3 w-3" />
                            </div>
                            {idx < pipelineStages.length - 1 && (
                              <div
                                className={`flex-1 h-0.5 mx-1 rounded-full ${
                                  isCompleted ? 'bg-[var(--success)]/40' : 'bg-[var(--border)]/30'
                                }`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {s.status?.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                      </span>
                      <span className="text-[10px] text-[var(--text-secondary)]">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
          {shipments.filter((s) => !['DELIVERED', 'CANCELLED'].includes(s.status)).length > 3 && (
            <Link
              href="/dashboard/shipments"
              className="block text-center text-xs text-[var(--accent-gold)] hover:underline mt-2"
            >
              View all {shipments.filter((s) => !['DELIVERED', 'CANCELLED'].includes(s.status)).length} active shipments
            </Link>
          )}
        </div>
      )}

      {/* #3: Live Map Widget — shows in-transit shipments on a compact map */}
      {shipments.filter((s) => ['IN_TRANSIT', 'IN_TRANSIT_TO_DESTINATION'].includes(s.status)).length > 0 && (
        <div id="customer-live-map" className="rounded-xl border border-[var(--border)] bg-[var(--panel)] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
            <MapPin className="h-4 w-4 text-[var(--accent-gold)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Live Tracking</span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          <div className="p-3">
            <div className="h-[200px] rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--background)] relative">
              <CompactTrackingMap
                shipments={shipments.filter((s) => ['IN_TRANSIT', 'IN_TRANSIT_TO_DESTINATION'].includes(s.status))}
              />
            </div>
            <div className="mt-2 space-y-1.5">
              {shipments
                .filter((s) => ['IN_TRANSIT', 'IN_TRANSIT_TO_DESTINATION'].includes(s.status))
                .slice(0, 2)
                .map((s) => (
                  <Link
                    key={s.id}
                    href={`/dashboard/shipments/${s.id}`}
                    className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--background)] transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="text-xs text-[var(--text-primary)] truncate">
                        {s.vehicleVIN || `${s.vehicleMake || ''} ${s.vehicleModel || ''}`.trim() || s.id.slice(0, 8)}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] shrink-0 ml-2">
                      {s.status === 'IN_TRANSIT' ? 'At Sea' : 'To Destination'}
                    </span>
                  </Link>
                ))}
            </div>
            <Link
              href="/dashboard/tracking"
              className="block text-center text-xs text-[var(--accent-gold)] hover:underline mt-2"
            >
              Track all shipments
            </Link>
          </div>
        </div>
      )}

      {/* Balance Card */}
      <div id="customer-financial-summary" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* Quick Navigation Links */}
      <div id="customer-quick-links" className="space-y-4">

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
    </div>
  );
}
