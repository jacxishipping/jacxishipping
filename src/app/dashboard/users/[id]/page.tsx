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

  const isCustomer = user.role === 'user';
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
      <Box sx={{ px: 2, pt: 2 }}>
        <Breadcrumbs />
      </Box>

      <PageHeader
        title={user.name || 'User Profile'}
        description={`Member since ${new Date(user.createdAt).toLocaleDateString()}`}
        actions={
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Link href={backHref} style={{ textDecoration: 'none' }}>
              <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
                Back
              </Button>
            </Link>
            {session?.user?.role === 'admin' && (
              <Link href={`/dashboard/users/${id}/edit`} style={{ textDecoration: 'none' }}>
                <Button variant="primary" icon={<Edit className="w-4 h-4" />}>
                  Edit Profile
                </Button>
              </Link>
            )}
          </Box>
        }
      />

      <DashboardGrid className="grid-cols-1 lg:grid-cols-3">
        <DashboardPanel title="Profile Details" className="lg:col-span-1">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pb: 2, borderBottom: '1px solid var(--border)' }}>
              <div className="w-16 h-16 rounded-full bg-[var(--panel)] border border-[var(--border)] flex items-center justify-center">
                <User className="w-8 h-8 text-[var(--accent-gold)]" />
              </div>
              <Box>
                <Typography variant="h6" fontWeight="bold">
                  {user.name || 'No Name'}
                </Typography>
                <Chip
                  label={user.role.toUpperCase()}
                  size="small"
                  sx={{
                    mt: 0.5,
                    bgcolor: user.role === 'admin' ? 'rgba(var(--accent-gold-rgb), 0.1)' : 'var(--panel)',
                    color: user.role === 'admin' ? 'var(--accent-gold)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.7rem'
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Mail className="w-5 h-5 text-[var(--text-secondary)]" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body2">{user.email}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Phone className="w-5 h-5 text-[var(--text-secondary)]" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Phone</Typography>
                  <Typography variant="body2">{user.phone || 'Not provided'}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Calendar className="w-5 h-5 text-[var(--text-secondary)]" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Joined</Typography>
                  <Typography variant="body2">{new Date(user.createdAt).toLocaleDateString()}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Clock className="w-5 h-5 text-[var(--text-secondary)]" />
                <Box>
                  <Typography variant="caption" color="text.secondary">Last Updated</Typography>
                  <Typography variant="body2">{new Date(user.updatedAt).toLocaleDateString()}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </DashboardPanel>

        <Box className="lg:col-span-2">
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {canNotifyCustomer && (
              <DashboardPanel
                title="Direct Notification"
                description="Send an in-app message directly to this customer"
              >
                <NotificationComposer
                  mode="internal-to-customer"
                  recipientUserId={user.id}
                  recipientName={user.name || user.email}
                />
              </DashboardPanel>
            )}

            {isCustomer && statement ? (
              <DashboardPanel
                title="Customer Statement"
                description="Open receivables, aging snapshot, and invoice history for this customer"
                actions={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link href={`/dashboard/invoices?userId=${user.id}&customer=${encodeURIComponent(user.name || user.email)}`}>
                      <Button variant="outline" size="sm" icon={<FileText className="h-4 w-4" />}>
                        View Invoices
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExportStatementCsv}>
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm" icon={<Download className="h-4 w-4" />} onClick={handleExportStatementPdf}>
                      Export PDF
                    </Button>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    {[
                      {
                        label: 'Outstanding AR',
                        value: formatMoney(statement.summary.outstandingAmount),
                        detail: `${statement.summary.openInvoiceCount} open invoice${statement.summary.openInvoiceCount === 1 ? '' : 's'}`,
                        tone: 'text-[rgb(29,78,216)]',
                      },
                      {
                        label: 'Overdue',
                        value: formatMoney(statement.summary.overdueAmount),
                        detail: `${statement.summary.overdueInvoiceCount} overdue invoice${statement.summary.overdueInvoiceCount === 1 ? '' : 's'}`,
                        tone: 'text-[rgb(185,28,28)]',
                      },
                      {
                        label: 'Paid',
                        value: formatMoney(statement.summary.paidAmount),
                        detail: `${statement.summary.paidInvoiceCount} paid invoice${statement.summary.paidInvoiceCount === 1 ? '' : 's'}`,
                        tone: 'text-[rgb(21,128,61)]',
                      },
                      {
                        label: 'Available Credit',
                        value: formatMoney(statement.summary.availableCredit),
                        detail: `Ledger balance ${formatMoney(statement.summary.accountBalance)}`,
                        tone: 'text-[var(--accent-gold)]',
                      },
                    ].map((card) => (
                      <div key={card.label} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{card.label}</p>
                        <p className={`mt-2 text-lg font-semibold ${card.tone}`}>{card.value}</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{card.detail}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                    {agingCards.map((bucket) => (
                      <div key={bucket.label} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{bucket.label}</p>
                        <p className="mt-2 text-base font-semibold text-[var(--text-primary)]">{formatMoney(bucket.value.amount)}</p>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">{bucket.value.count} invoice{bucket.value.count === 1 ? '' : 's'}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Collections Workflow</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Track promise-to-pay commitments and the next follow-up for receivables collection.
                        </p>
                      </div>
                      {canManageCollections ? (
                        <Button size="sm" icon={<Save className="h-4 w-4" />} onClick={handleSaveCollections} disabled={savingCollections}>
                          {savingCollections ? 'Saving...' : 'Save Collections'}
                        </Button>
                      ) : null}
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                      <label className="block text-sm text-[var(--text-primary)]">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Collection Status</span>
                        <select
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text-primary)]"
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
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Promise To Pay</span>
                        <input
                          type="date"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          value={collectionForm.promiseToPayDate}
                          disabled={!canManageCollections || savingCollections}
                          onChange={(event) => setCollectionForm((current) => ({ ...current, promiseToPayDate: event.target.value }))}
                        />
                      </label>

                      <label className="block text-sm text-[var(--text-primary)]">
                        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Follow-Up Date</span>
                        <input
                          type="date"
                          className="w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text-primary)]"
                          value={collectionForm.followUpDate}
                          disabled={!canManageCollections || savingCollections}
                          onChange={(event) => setCollectionForm((current) => ({ ...current, followUpDate: event.target.value }))}
                        />
                      </label>
                    </div>

                    <label className="mt-3 block text-sm text-[var(--text-primary)]">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Collections Notes</span>
                      <textarea
                        className="min-h-[96px] w-full rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm text-[var(--text-primary)]"
                        value={collectionForm.notes}
                        disabled={!canManageCollections || savingCollections}
                        onChange={(event) => setCollectionForm((current) => ({ ...current, notes: event.target.value }))}
                        placeholder="Promise-to-pay details, callback outcomes, dispute context, or collection instructions."
                      />
                    </label>

                    {!canManageCollections ? (
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">Finance or customer managers can update collections workflow fields.</p>
                    ) : null}
                  </div>

                  <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Invoice Timeline</p>
                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          Includes invoices, supplemental invoices, and credit notes. Aging is based on unpaid invoices only.
                        </p>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Updated {new Date(statement.generatedAt).toLocaleString()}
                      </p>
                    </div>

                    {statement.timeline.length > 0 ? (
                      <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
                        <div className="grid grid-cols-12 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                          <div className="col-span-4">Invoice</div>
                          <div className="col-span-2">Status</div>
                          <div className="col-span-3">Dates</div>
                          <div className="col-span-2">Reference</div>
                          <div className="col-span-1 text-right">Amount</div>
                        </div>
                        <div className="max-h-[28rem] overflow-y-auto divide-y divide-[var(--border)]">
                          {statement.timeline.map((invoice) => (
                            <div key={invoice.id} className="grid grid-cols-12 items-start gap-3 px-3 py-3 text-sm">
                              <div className="col-span-4 min-w-0">
                                <Link href={`/dashboard/invoices/${invoice.id}`} className="inline-flex items-center gap-2 font-semibold text-[var(--accent-gold)] hover:underline">
                                  <FileText className="h-4 w-4" />
                                  {invoice.invoiceNumber}
                                </Link>
                                <p className="mt-1 text-xs text-[var(--text-secondary)]">{formatLabel(invoice.kind)}</p>
                                {invoice.paymentReference ? (
                                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Payment ref: {invoice.paymentReference}</p>
                                ) : null}
                              </div>
                              <div className="col-span-2">
                                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${invoiceStatusStyles[invoice.status] || invoiceStatusStyles.DRAFT}`}>
                                  {formatLabel(invoice.status)}
                                </span>
                                {invoice.daysOverdue && invoice.daysOverdue > 0 ? (
                                  <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[rgb(185,28,28)]">
                                    <AlertTriangle className="h-3 w-3" />
                                    {invoice.daysOverdue} day{invoice.daysOverdue === 1 ? '' : 's'} overdue
                                  </p>
                                ) : null}
                              </div>
                              <div className="col-span-3 text-xs text-[var(--text-secondary)]">
                                <p>Issued {new Date(invoice.issueDate).toLocaleDateString()}</p>
                                <p>{invoice.dueDate ? `Due ${new Date(invoice.dueDate).toLocaleDateString()}` : 'No due date'}</p>
                                {invoice.paidDate ? <p>Paid {new Date(invoice.paidDate).toLocaleDateString()}</p> : null}
                              </div>
                              <div className="col-span-2 min-w-0 text-xs text-[var(--text-secondary)]">
                                <p className="truncate" title={invoice.reference || undefined}>{invoice.reference || 'General billing'}</p>
                                {invoice.paymentMethod ? <p className="mt-1">Method: {invoice.paymentMethod}</p> : null}
                              </div>
                              <div className={`col-span-1 text-right font-semibold ${invoice.total < 0 ? 'text-[rgb(185,28,28)]' : 'text-[var(--text-primary)]'}`}>
                                {formatMoney(invoice.total)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--border)] bg-[var(--background)] px-6 py-10 text-center">
                        <Wallet className="h-8 w-8 text-[var(--text-secondary)]" />
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-primary)]">No invoice activity yet</p>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            This customer statement will populate once invoice generation starts for their shipments.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </DashboardPanel>
            ) : null}

            <DashboardPanel
              title={`Shipments (${user.shipments.length})`}
              description="History of all vehicle shipments"
              fullHeight
            >
              {user.shipments.length > 0 ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                  {user.shipments.map((shipment) => (
                    <ShipmentCard key={shipment.id} {...shipment} />
                  ))}
                </Box>
              ) : (
                <EmptyState
                  icon={<Package className="w-10 h-10" />}
                  title="No Shipments"
                  description="This user hasn't created any shipments yet."
                />
              )}
            </DashboardPanel>
          </Box>
        </Box>
      </DashboardGrid>
    </DashboardSurface>
  );
}