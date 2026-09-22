'use client';
import { formatMoney } from '@/lib/format';

import { useCallback, useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Edit,
  Package,
  Clock,
  AlertTriangle,
  Wallet,
  FileText,
  Download,
  Save,
  CreditCard,
  Send,
  Building2,
  Receipt,
  FileDown
} from 'lucide-react';
import { Box, Typography, Chip } from '@mui/material';
import {
  DashboardSurface,
  DashboardPanel,
  DashboardGrid,
} from '@/components/dashboard/DashboardSurface';
import {
  PageHeader,
  Button,
  Breadcrumbs,
  LoadingState,
  EmptyState,
  StatsCard,
  StatusBadge,
  toast,
} from '@/components/design-system';
import ShipmentCard from '@/components/dashboard/ShipmentCard';
import NotificationComposer from '@/components/notifications/NotificationComposer';
import { exportToCSVWithHeaders } from '@/lib/export';
import { hasPermission } from '@/lib/rbac';
import { downloadCustomerStatementPDF } from '@/lib/utils/generateCustomerStatementPDF';

interface UserDetail {
  id: string;
  name: string | null;
  email: string;
  role: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  shipments: any[];
  statement?: {
    summary: {
      outstandingAmount: number;
      overdueAmount: number;
      paidAmount: number;
      creditAmount: number;
      openInvoiceCount: number;
      overdueInvoiceCount: number;
      paidInvoiceCount: number;
      availableCredit: number;
      accountBalance: number;
    };
    collections: {
      status: string;
      promiseToPayDate: string | null;
      followUpDate: string | null;
      notes: string | null;
    };
    aging: {
      current: { count: number; amount: number };
      days1to30: { count: number; amount: number };
      days31to60: { count: number; amount: number };
      days61to90: { count: number; amount: number };
      days90plus: { count: number; amount: number };
    };
    timeline: Array<{
      id: string;
      invoiceNumber: string;
      kind: 'INVOICE' | 'SUPPLEMENTAL' | 'CREDIT_NOTE';
      status: string;
      issueDate: string;
      dueDate: string | null;
      paidDate: string | null;
      total: number;
      reference: string | null;
      daysOverdue: number | null;
      paymentMethod: string | null;
      paymentReference: string | null;
    }>;
    generatedAt: string;
  } | null;
}

const invoiceStatusStyles: Record<string, string> = {
  DRAFT: 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]',
  PENDING: 'border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] text-[rgb(180,83,9)]',
  SENT: 'border-[rgba(59,130,246,0.32)] bg-[rgba(59,130,246,0.12)] text-[rgb(29,78,216)]',
  PAID: 'border-[rgba(34,197,94,0.34)] bg-[rgba(34,197,94,0.12)] text-[rgb(21,128,61)]',
  OVERDUE: 'border-[rgba(239,68,68,0.34)] bg-[rgba(239,68,68,0.12)] text-[rgb(185,28,28)]',
};

function formatLabel(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function toDateInputValue(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : '';
}

export default function UserViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCollections, setSavingCollections] = useState(false);
  const [collectionForm, setCollectionForm] = useState({
    status: 'CURRENT',
    promiseToPayDate: '',
    followUpDate: '',
    notes: '',
  });

  const fetchUser = useCallback(async () => {
    try {
      const response = await fetch(`/api/users/${id}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        console.error('Failed to fetch user');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (status === 'loading') return;
    const canViewCustomers = hasPermission(session?.user?.role, 'customers:view');

    if (!session || (!canViewCustomers && session.user.id !== id)) {
      router.replace('/dashboard');
      return;
    }

    void fetchUser();
  }, [id, session, status, router, fetchUser]);

  useEffect(() => {
    if (!user?.statement?.collections) {
      return;
    }

    setCollectionForm({
      status: user.statement.collections.status,
      promiseToPayDate: toDateInputValue(user.statement.collections.promiseToPayDate),
      followUpDate: toDateInputValue(user.statement.collections.followUpDate),
      notes: user.statement.collections.notes || '',
    });
  }, [user?.statement?.collections]);

  if (loading || status === 'loading') {
    return <LoadingState />;
  }

  if (!user) {
    return (
      <DashboardSurface>
        <EmptyState
          title="User Not Found"
          description="The user you are looking for does not exist or has been removed."
          icon={<User className="w-12 h-12" />}
          action={
            <Link href="/dashboard/users">
              <Button variant="primary">Back to Users</Button>
            </Link>
          }
        />
      </DashboardSurface>
    );
  }

  const isCustomer = user.role === 'user' || user.role === 'customer';
  const backHref = isCustomer ? '/dashboard/customers' : '/dashboard/users';
  const canNotifyCustomer = isCustomer && hasPermission(session?.user?.role, 'customers:view');
  const canManageCollections = isCustomer && (hasPermission(session?.user?.role, 'customers:manage') || hasPermission(session?.user?.role, 'finance:manage'));
  const statement = user.statement;
  const agingCards = statement
    ? [
        { label: 'Current', value: statement.aging.current },
        { label: '1-30 Days', value: statement.aging.days1to30 },
        { label: '31-60 Days', value: statement.aging.days31to60 },
        { label: '61-90 Days', value: statement.aging.days61to90 },
        { label: '90+ Days', value: statement.aging.days90plus },
      ]
    : [];

  const handleExportStatementCsv = () => {
    if (!statement) {
      return;
    }

    try {
      const rows = statement.timeline.length > 0
        ? statement.timeline.map((invoice) => ({
            invoiceNumber: invoice.invoiceNumber,
            kind: formatLabel(invoice.kind),
            status: formatLabel(invoice.status),
            issueDate: new Date(invoice.issueDate).toLocaleDateString(),
            dueDate: invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '',
            paidDate: invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString() : '',
            amount: formatMoney(invoice.total),
            reference: invoice.reference || 'General billing',
            daysOverdue: invoice.daysOverdue ?? 0,
            paymentMethod: invoice.paymentMethod || '',
          }))
        : [{
            invoiceNumber: 'STATEMENT',
            kind: 'Summary',
            status: formatLabel(statement.collections.status),
            issueDate: new Date(statement.generatedAt).toLocaleDateString(),
            dueDate: '',
            paidDate: '',
            amount: formatMoney(statement.summary.outstandingAmount),
            reference: 'No invoice timeline entries yet',
            daysOverdue: 0,
            paymentMethod: '',
          }];

      exportToCSVWithHeaders(
        rows,
        [
          { key: 'invoiceNumber', label: 'Invoice #' },
          { key: 'kind', label: 'Kind' },
          { key: 'status', label: 'Status' },
          { key: 'issueDate', label: 'Issue Date' },
          { key: 'dueDate', label: 'Due Date' },
          { key: 'paidDate', label: 'Paid Date' },
          { key: 'amount', label: 'Amount' },
          { key: 'reference', label: 'Reference' },
          { key: 'daysOverdue', label: 'Days Overdue' },
          { key: 'paymentMethod', label: 'Payment Method' },
        ],
        `${(user.name || user.email).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-statement`
      );
      toast.success('Statement CSV exported');
    } catch (error) {
      console.error('Error exporting statement CSV:', error);
      toast.error('Failed to export statement CSV');
    }
  };

  const handleExportStatementPdf = () => {
    if (!statement) {
      return;
    }

    try {
      downloadCustomerStatementPDF({
        customer: {
          name: user.name,
          email: user.email,
          phone: user.phone,
        },
        summary: statement.summary,
        collections: statement.collections,
        aging: statement.aging,
        timeline: statement.timeline,
        generatedAt: statement.generatedAt,
      });
      toast.success('Statement PDF exported');
    } catch (error) {
      console.error('Error exporting statement PDF:', error);
      toast.error('Failed to export statement PDF');
    }
  };

  const handleSaveCollections = async () => {
    try {
      setSavingCollections(true);
      const response = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionStatus: collectionForm.status,
          promiseToPayDate: collectionForm.promiseToPayDate || null,
          followUpDate: collectionForm.followUpDate || null,
          collectionNotes: collectionForm.notes.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.message || 'Failed to save collections workflow');
      }

      await fetchUser();
      toast.success('Collections workflow updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save collections workflow');
    } finally {
      setSavingCollections(false);
    }
  };

  return (
    <DashboardSurface>
      {/* Standardized Header */}
      <PageHeader
        showBreadcrumbs
        title={user.name || 'User Profile'}
        description={`Account: ${user.email} • Member since ${new Date(user.createdAt).toLocaleDateString()}`}
        actions={
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href={backHref} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </Link>
            {isCustomer && statement && (
              <>
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={<Download className="w-4 h-4" />} 
                  onClick={handleExportStatementCsv}
                >
                  Export CSV
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={<FileDown className="w-4 h-4" />} 
                  onClick={handleExportStatementPdf}
                >
                  Download Statement
                </Button>
              </>
            )}
            {session?.user?.role === 'admin' && (
              <Link href={`/dashboard/users/${id}/edit`} style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm" icon={<Edit className="w-4 h-4" />}>
                  Edit Profile
                </Button>
              </Link>
            )}
          </Box>
        }
      />

      {/* KPI Financial Overview for Customers */}
      {isCustomer && statement && (
        <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<Wallet className="w-5 h-5 text-blue-600" />}
            title="Outstanding AR"
            value={formatMoney(statement.summary.outstandingAmount)}
            subtitle={`${statement.summary.openInvoiceCount} open invoices`}
            variant="default"
            size="md"
          />
          <StatsCard
            icon={<AlertTriangle className="w-5 h-5 text-rose-600" />}
            title="Overdue Balance"
            value={formatMoney(statement.summary.overdueAmount)}
            subtitle={`${statement.summary.overdueInvoiceCount} overdue invoices`}
            variant="warning"
            size="md"
          />
          <StatsCard
            icon={<Receipt className="w-5 h-5 text-emerald-600" />}
            title="Paid Total"
            value={formatMoney(statement.summary.paidAmount)}
            subtitle={`${statement.summary.paidInvoiceCount} settled invoices`}
            variant="success"
            size="md"
          />
          <StatsCard
            icon={<CreditCard className="w-5 h-5 text-amber-600" />}
            title="Available Credit"
            value={formatMoney(statement.summary.availableCredit)}
            subtitle={`Ledger ${formatMoney(statement.summary.accountBalance)}`}
            variant="info"
            size="md"
          />
        </DashboardGrid>
      )}

      {/* Main Profile Layout Grid */}
      <DashboardGrid className="grid-cols-1 lg:grid-cols-3">
        {/* Left Column: User Profile Card */}
        <DashboardPanel title="Profile Details" className="lg:col-span-1">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 2, borderBottom: '1px solid var(--border)' }}>
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-[var(--accent-gold)]/30 flex items-center justify-center font-bold text-lg text-[var(--accent-gold)]">
                {(user.name || user.email).slice(0, 2).toUpperCase()}
              </div>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight="bold" noWrap>
                  {user.name || 'No Name'}
                </Typography>
                <Chip
                  label={user.role.toUpperCase()}
                  size="small"
                  sx={{
                    mt: 0.5,
                    bgcolor: user.role === 'admin' ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'var(--background)',
                    color: user.role === 'admin' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    border: '1px solid var(--border)',
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Mail className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">Email Address</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>{user.email}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Phone className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.phone || 'Not provided'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Calendar className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">Registration Date</Typography>
                  <Typography variant="body2">{new Date(user.createdAt).toLocaleDateString()}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Clock className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">Last Profile Update</Typography>
                  <Typography variant="body2">{new Date(user.updatedAt).toLocaleDateString()}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DashboardPanel>

        {/* Right Column: Statement, Direct Messaging & Shipments */}
        <Box className="lg:col-span-2">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {canNotifyCustomer && (
              <DashboardPanel
                title="Direct Client Notification"
                description="Send instant in-app alerts and notifications directly to this customer"
              >
                <NotificationComposer
                  mode="internal-to-customer"
                  recipientUserId={user.id}
                  recipientName={user.name || user.email}
                />
              </DashboardPanel>
            )}

            {isCustomer && statement && (
              <DashboardPanel
                title="Customer Financial Statement & Aging"
                description="Receivables aging schedule and invoice history breakdown"
                actions={
                  <Link href={`/dashboard/invoices?userId=${user.id}&customer=${encodeURIComponent(user.name || user.email)}`}>
                    <Button variant="outline" size="sm" icon={<FileText className="h-4 w-4" />}>
                      View All Invoices
                    </Button>
                  </Link>
                }
              >
                <div className="space-y-4">
                  {/* Aging Schedule */}
                  <div>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--text-secondary)', mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Receivables Aging Schedule
                    </Typography>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                      {agingCards.map((bucket) => (
                        <div key={bucket.label} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{bucket.label}</p>
                          <p className="mt-1.5 text-base font-bold text-[var(--text-primary)]">{formatMoney(bucket.value.amount)}</p>
                          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{bucket.value.count} invoice{bucket.value.count === 1 ? '' : 's'}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Collections Workflow Controls */}
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Collections Workflow</p>
                        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                          Track promise-to-pay commitments and next follow-up dates for overdue receivables.
                        </p>
                      </div>
                      {canManageCollections && (
                        <Button size="sm" icon={<Save className="h-4 w-4" />} onClick={handleSaveCollections} disabled={savingCollections}>
                          {savingCollections ? 'Saving...' : 'Save Collections'}
                        </Button>
                      )}
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <label className="block text-sm text-[var(--text-primary)]">
                        <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Collection Status</span>
                        <select
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                          value={collectionForm.status}
                          disabled={!canManageCollections || savingCollections}
                          onChange={(event) => setCollectionForm((current) => ({ ...current, status: event.target.value }))}
                        >
                          {['CURRENT', 'FOLLOW_UP', 'PROMISED_TO_PAY', 'IN_COLLECTIONS', 'ESCALATED', 'ON_HOLD'].map((value) => (
                            <option key={value} value={value}>{formatLabel(value)}</option>
                          ))}
                        </select>
                      </label>

                      <label className="block text-sm text-[var(--text-primary)]">
                        <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Promise To Pay Date</span>
                        <input
                          type="date"
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                          value={collectionForm.promiseToPayDate}
                          disabled={!canManageCollections || savingCollections}
                          onChange={(event) => setCollectionForm((current) => ({ ...current, promiseToPayDate: event.target.value }))}
                        />
                      </label>

                      <label className="block text-sm text-[var(--text-primary)]">
                        <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Next Follow-Up Date</span>
                        <input
                          type="date"
                          className="w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                          value={collectionForm.followUpDate}
                          disabled={!canManageCollections || savingCollections}
                          onChange={(event) => setCollectionForm((current) => ({ ...current, followUpDate: event.target.value }))}
                        />
                      </label>
                    </div>

                    <label className="mt-3 block text-sm text-[var(--text-primary)]">
                      <span className="mb-1 block text-xs font-semibold text-[var(--text-secondary)]">Collections Notes</span>
                      <textarea
                        className="min-h-[80px] w-full rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
                        value={collectionForm.notes}
                        disabled={!canManageCollections || savingCollections}
                        onChange={(event) => setCollectionForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Promise-to-pay details, callback outcomes, or collection instructions..."
                      />
                    </label>
                  </div>

                  {/* Invoice Timeline Table */}
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-[var(--text-secondary)]">Statement Timeline</p>
                        <p className="text-xs text-[var(--text-secondary)]">Invoices, supplementals, and credit notes history</p>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Updated {new Date(statement.generatedAt).toLocaleString()}
                      </p>
                    </div>

                    {statement.timeline.length > 0 ? (
                      <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-white">
                        <div className="grid grid-cols-12 border-b border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                          <div className="col-span-4">Invoice</div>
                          <div className="col-span-2">Status</div>
                          <div className="col-span-3">Dates</div>
                          <div className="col-span-2">Reference</div>
                          <div className="col-span-1 text-right">Amount</div>
                        </div>
                        <div className="max-h-[24rem] overflow-y-auto divide-y divide-[var(--border)]">
                          {statement.timeline.map((invoice) => (
                            <div key={invoice.id} className="grid grid-cols-12 items-center gap-2 px-3 py-2.5 text-sm hover:bg-[var(--background)] transition-colors">
                              <div className="col-span-4 min-w-0">
                                <Link href={`/dashboard/invoices/${invoice.id}`} className="inline-flex items-center gap-1.5 font-bold font-mono text-[var(--accent-gold)] hover:underline">
                                  <FileText className="h-3.5 w-3.5" />
                                  {invoice.invoiceNumber}
                                </Link>
                                <p className="text-xs text-[var(--text-secondary)]">{formatLabel(invoice.kind)}</p>
                              </div>
                              <div className="col-span-2">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${invoiceStatusStyles[invoice.status] || invoiceStatusStyles.DRAFT}`}>
                                  {formatLabel(invoice.status)}
                                </span>
                              </div>
                              <div className="col-span-3 text-xs text-[var(--text-secondary)]">
                                <p>Issued {new Date(invoice.issueDate).toLocaleDateString()}</p>
                                {invoice.dueDate && <p className="text-gray-500">Due {new Date(invoice.dueDate).toLocaleDateString()}</p>}
                              </div>
                              <div className="col-span-2 min-w-0 text-xs text-[var(--text-secondary)] truncate">
                                {invoice.reference || 'General'}
                              </div>
                              <div className={`col-span-1 text-right font-bold text-sm ${invoice.total < 0 ? 'text-rose-600' : 'text-[var(--text-primary)]'}`}>
                                {formatMoney(invoice.total)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-white px-6 py-8 text-center">
                        <Wallet className="h-7 w-7 text-[var(--text-secondary)]" />
                        <p className="text-sm font-semibold text-[var(--text-primary)]">No invoice history recorded</p>
                      </div>
                    )}
                  </div>
                </div>
              </DashboardPanel>
            )}

            {/* Shipment Portfolios */}
            <DashboardPanel
              title={`Shipments Portfolio (${user.shipments.length})`}
              description="History of all vehicle consignments and active bookings"
              fullHeight
            >
              {user.shipments.length > 0 ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
                  {user.shipments.map((shipment) => (
                    <ShipmentCard key={shipment.id} {...shipment} />
                  ))}
                </Box>
              ) : (
                <EmptyState
                  icon={<Package className="w-10 h-10" />}
                  title="No Shipments"
                  description="This customer does not have any active or past shipments."
                />
              )}
            </DashboardPanel>
          </Box>
        </Box>
      </DashboardGrid>
    </DashboardSurface>
  );
}