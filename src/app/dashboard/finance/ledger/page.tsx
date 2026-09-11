'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import {
  Add,
  Check,
  Close,
  Download,
  Print,
  FilterList,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney,
  LocalShipping,
  Delete,
  Edit,
} from '@mui/icons-material';
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import { Breadcrumbs, Button, toast, EmptyState, SkeletonCard, SkeletonTable, Tooltip, StatusBadge, TableSkeleton, StatsCard } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { hasPermission } from '@/lib/rbac';
import { formatMoney as formatCurrency } from '@/lib/format';

interface LedgerEntry {
  id: string;
  user?: { id: string; name: string | null; email: string } | null;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  transactionInfoType?: TransactionInfoType;
  amount: number;
  balance: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  shipment?: {
    id: string;
    vehicleVIN?: string | null;
    vehicleMake?: string;
    vehicleModel?: string;
  };
}

type LedgerSourceFilter = '' | 'BANK_IMPORT' | 'MANUAL';

interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  totalShipmentPurchaseAmount: number;
  totalShipmentExpenses: number;
  currentBalance: number;
  transactionInfoBreakdown?: Partial<Record<TransactionInfoType, {
    totalDebit: number;
    totalCredit: number;
    balance: number;
  }>>;
}

type TransactionInfoType = 'CAR_PAYMENT' | 'SHIPPING_PAYMENT' | 'STORAGE_PAYMENT';

const transactionInfoTypeLabels: Record<TransactionInfoType, string> = {
  CAR_PAYMENT: 'Car Payment',
  SHIPPING_PAYMENT: 'Shipping Payment',
  STORAGE_PAYMENT: 'Storage Payment',
};

export default function LedgerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const isAdmin = session?.user?.role === 'admin';
  const canManageLedger = hasPermission(session?.user?.role, 'finance:manage');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [ledgerScope, setLedgerScope] = useState<'own' | 'single' | 'all'>('single');
  const [summary, setSummary] = useState<LedgerSummary>({
    totalDebit: 0,
    totalCredit: 0,
    totalShipmentPurchaseAmount: 0,
    totalShipmentExpenses: 0,
    currentBalance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    source: '' as LedgerSourceFilter,
    transactionInfoType: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);
  const [editForm, setEditForm] = useState({ description: '', notes: '' });
  const [formData, setFormData] = useState({
    description: '',
    type: 'DEBIT' as 'DEBIT' | 'CREDIT',
    transactionInfoType: 'SHIPPING_PAYMENT' as TransactionInfoType,
    amount: '',
    notes: '',
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/signin');
      return;
    }
    fetchLedgerEntries();
  }, [session, status, page, filters, router]);

  const fetchLedgerEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.source && { source: filters.source }),
        ...(filters.transactionInfoType && { transactionInfoType: filters.transactionInfoType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/ledger?recalc=true&${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch ledger entries');
      }

      const data = await response.json();
      setEntries(data.entries);
      setLedgerScope(data.scope === 'all' ? 'all' : data.scope === 'own' ? 'own' : 'single');
      setSummary(data.summary);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const params = new URLSearchParams({
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.source && { source: filters.source }),
        ...(filters.transactionInfoType && { transactionInfoType: filters.transactionInfoType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      let endpoint = '/api/ledger/export';
      if (format === 'pdf') {
        endpoint = '/api/ledger/export-pdf';
      } else if (format === 'excel') {
        endpoint = '/api/ledger/export-excel';
      }

      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export ledger');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      if (format === 'pdf') {
        a.download = `ledger-${Date.now()}.html`;
      } else if (format === 'excel') {
        a.download = `ledger-${Date.now()}.csv`;
      } else {
        a.download = `ledger-${Date.now()}.csv`;
      }
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      if (format === 'pdf') {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Error exporting ledger:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('Delete this transaction? This cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/ledger/${entryId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      toast.success('Transaction deleted successfully');
      await fetchLedgerEntries();
    } catch (error) {
      toast.error('Unable to delete transaction', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const openEditEntry = (entry: LedgerEntry) => {
    setEditEntry(entry);
    setEditForm({
      description: entry.description,
      notes: entry.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry) return;

    try {
      const response = await fetch(`/api/ledger/${editEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          notes: editForm.notes,
        }),
      });
      const data = await response.json();

      if (response.ok) {
        toast.success('Transaction updated successfully');
        setShowEditModal(false);
        setEditEntry(null);
        setEditForm({ description: '', notes: '' });
        await fetchLedgerEntries();
      } else {
        toast.error(data.error || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Error updating entry:', error);
      toast.error('Unable to update transaction', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    try {
      const amount = parseFloat(formData.amount);
      const response = await fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          description: formData.description,
          type: formData.type,
          transactionInfoType: formData.transactionInfoType,
          amount,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        toast.success('Transaction added successfully');
        setShowAddModal(false);
        setFormData({ description: '', type: 'DEBIT', transactionInfoType: 'SHIPPING_PAYMENT', amount: '', notes: '' });
        fetchLedgerEntries();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to add transaction');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      toast.error('An error occurred');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'var(--error)';
    if (balance < 0) return '#22c55e';
    return 'var(--text-secondary)';
  };

  const isBankImportEntry = (entry: LedgerEntry) => entry.metadata?.importSource === 'BANK_OF_AMERICA_CSV';

  const normalizeShipmentReference = (entry: LedgerEntry) => {
    if (!entry.shipment?.id || !entry.shipment?.vehicleVIN) {
      return entry.description;
    }

    const shipmentId = entry.shipment.id;
    const vinLabel = `VIN ${entry.shipment.vehicleVIN}`;

    return entry.description
      .replace(new RegExp(`\\(Shipment\\s+${shipmentId}\\)`, 'gi'), `(${vinLabel})`)
      .replace(new RegExp(`Shipment\\s+${shipmentId}`, 'gi'), vinLabel)
      .replace(new RegExp(`shipment\\s+${shipmentId}`, 'g'), vinLabel);
  };

  const columns = useMemo<Column<LedgerEntry>[]>(() => [
    ...(ledgerScope === 'all' && canManageLedger
      ? [
          {
            key: 'userEmail' as const,
            header: 'Customer',
            width: '18%',
            render: (_: unknown, row: LedgerEntry) => (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {row.user?.name || row.user?.email || '—'}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'transactionDate',
      header: 'Date',
      sortable: true,
      width: '15%',
      render: (_, row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {formatDate(row.transactionDate)}
        </span>
      )
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
      width: '40%',
      render: (_, row) => {
        const isPending = row.metadata?.pendingInvoice === true;
        const isInvoicePaid = !isPending && (typeof row.metadata?.invoiceId === 'string' || typeof row.metadata?.invoiceNumber === 'string');
        const isBankImport = isBankImportEntry(row);

        return (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                {normalizeShipmentReference(row)}
              </Typography>
              {isBankImport && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    color: '#2563eb',
                    border: '1px solid rgba(59, 130, 246, 0.22)',
                    textTransform: 'uppercase',
                  }}
                >
                  Bank Import
                </Box>
              )}
              {isPending && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    backgroundColor: 'rgba(234, 179, 8, 0.15)',
                    color: '#ca8a04',
                    border: '1px solid rgba(234, 179, 8, 0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  Pending Invoice
                </Box>
              )}
              {isInvoicePaid && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 1,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    backgroundColor: 'rgba(34, 197, 94, 0.15)',
                    color: '#16a34a',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    textTransform: 'uppercase',
                  }}
                >
                  Invoice Paid
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: '0.72rem', color: 'var(--accent-gold)', mt: 0.5, fontWeight: 600 }}>
              {row.transactionInfoType ? transactionInfoTypeLabels[row.transactionInfoType] : 'Not specified'}
            </Typography>
            {row.notes && (
              <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                {row.notes}
              </Typography>
            )}
            {row.shipment && (
              <Typography sx={{ fontSize: '0.75rem', color: 'var(--accent-gold)', mt: 0.5 }}>
                {row.shipment.vehicleVIN
                  ? `VIN: ${row.shipment.vehicleVIN}`
                  : `${row.shipment.vehicleMake || ''} ${row.shipment.vehicleModel || ''}`.trim() || row.shipment.id}
              </Typography>
            )}
          </Box>
        );
      }
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      align: 'center' as const,
      width: '15%',
      render: (_, row) => (
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: row.type === 'DEBIT' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: row.type === 'DEBIT' ? '#ef4444' : '#22c55e',
          }}
        >
          {row.type === 'DEBIT' ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
          {row.type}
        </Box>
      )
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      align: 'right' as const,
      width: '15%',
      render: (_, row) => (
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: row.type === 'DEBIT' ? '#ef4444' : '#22c55e' }}>
          {row.type === 'DEBIT' ? '+' : '-'}{formatCurrency(row.amount)}
        </span>
      )
    },
    {
      key: 'balance',
      header: 'Balance',
      sortable: true,
      align: 'right' as const,
      width: '15%',
      render: (_, row) => (
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: getBalanceColor(row.balance) }}>
          {formatCurrency(row.balance)}
        </span>
      )
    },
    ...(canManageLedger ? [{
      key: 'id' as const,
      header: 'Actions',
      align: 'center' as const,
      width: '12%',
      render: (_: unknown, row: LedgerEntry) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Tooltip title="Edit transaction">
            <IconButton
              size="small"
              aria-label={`Edit ${row.description}`}
              onClick={() => openEditEntry(row)}
              sx={{ color: 'var(--accent-gold)' }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete transaction">
            <IconButton
              size="small"
              color="error"
              aria-label={`Delete ${row.description}`}
              onClick={() => void handleDeleteEntry(row.id)}
            >
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    }] : [])
  ], [canManageLedger]);

  if (status === 'loading' || loading) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
				{/* Breadcrumbs */}
				<Box sx={{ px: 2, pt: 2 }}>
					<Breadcrumbs />
				</Box>
          <Box sx={{ px: 2 }}>
            <TableSkeleton rows={5} />
          </Box>
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
				{/* Breadcrumbs */}
				<Box sx={{ px: 2, pt: 2 }}>
					<Breadcrumbs />
				</Box>
        {/* Stats Cards */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            icon={<TrendingDownIcon />}
            title="Total Credits"
            value={formatCurrency(summary.totalCredit)}
            subtitle="Amount paid"
            variant="success"
          />
          <StatsCard
            icon={<TrendingUpIcon />}
            title="Total Debits"
            value={formatCurrency(summary.totalDebit)}
            subtitle="Amount charged"
            variant="warning"
          />
          <StatsCard
            icon={<LocalShipping />}
            title="Total Shipment Purchase Amount"
            value={formatCurrency(summary.totalShipmentPurchaseAmount)}
            subtitle="Total car purchase amount in your account"
            variant="default"
          />
          <StatsCard
            icon={<AttachMoney />}
            title="Total Shipment Expenses"
            value={formatCurrency(summary.totalShipmentExpenses)}
            subtitle="All shipment expense debits"
            variant="info"
          />
        </DashboardGrid>

        {/* Filters Panel */}
        <DashboardPanel
          title="Filters"
          description="Filter and search transactions"
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              icon={<FilterList />}
              sx={{ textTransform: 'none', fontSize: '0.78rem' }}
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          }
        >
          {showFilters && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                placeholder="Search transactions..."
                size="small"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: <Search sx={{ mr: 1, color: 'var(--text-secondary)', fontSize: 20 }} />,
                }}
                fullWidth
              />
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Type</InputLabel>
                  <Select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    label="Type"
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="DEBIT">Debit</MenuItem>
                    <MenuItem value="CREDIT">Credit</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Source</InputLabel>
                  <Select
                    value={filters.source}
                    onChange={(e) => setFilters({ ...filters, source: e.target.value as LedgerSourceFilter })}
                    label="Source"
                  >
                    <MenuItem value="">All Sources</MenuItem>
                    <MenuItem value="BANK_IMPORT">Bank Imports</MenuItem>
                    <MenuItem value="MANUAL">Manual Entries</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Transaction Info</InputLabel>
                  <Select
                    value={filters.transactionInfoType}
                    onChange={(e) => setFilters({ ...filters, transactionInfoType: e.target.value })}
                    label="Transaction Info"
                  >
                    <MenuItem value="">All Transaction Types</MenuItem>
                    {(Object.entries(transactionInfoTypeLabels) as Array<[TransactionInfoType, string]>).map(([value, label]) => (
                      <MenuItem key={value} value={value}>{label}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Start Date"
                  type="date"
                  size="small"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                <TextField
                  label="End Date"
                  type="date"
                  size="small"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
            </Box>
          )}
        </DashboardPanel>

        {/* Transactions Table */}
        <DashboardPanel
          title="Transaction History"
          description={`Showing ${entries.length} transaction${entries.length !== 1 ? 's' : ''}${filters.source === 'BANK_IMPORT' ? ' from bank imports' : filters.source === 'MANUAL' ? ' from manual entries' : ''}`}
          fullHeight
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isAdmin && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                  icon={<Add />}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Add Transaction
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                icon={<Print />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('pdf')}
                icon={<Download />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                icon={<Download />}
                sx={{ textTransform: 'none', fontSize: '0.75rem' }}
              >
                Excel
              </Button>
            </Box>
          }
        >
          <DataTable 
            data={entries}
            columns={columns}
            keyField="id"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
              <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Page {page} of {totalPages}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  icon={<ChevronLeft />}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  icon={<ChevronRight />}
                  sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                >
                  Next
                </Button>
              </Box>
            </Box>
          )}
        </DashboardPanel>
      </DashboardSurface>

      <Dialog open={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Add Transaction</Typography>
            <IconButton onClick={() => setShowAddModal(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleAddEntry}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {(() => {
                const enteredAmount = parseFloat(formData.amount) || 0;
                const projectedBalance = formData.type === 'DEBIT'
                  ? summary.currentBalance + enteredAmount
                  : summary.currentBalance - enteredAmount;
                const currentBalanceLabel = summary.currentBalance > 0
                  ? `You owe ${formatCurrency(summary.currentBalance)}`
                  : summary.currentBalance < 0
                    ? `You have ${formatCurrency(Math.abs(summary.currentBalance))} credit`
                    : 'Account is settled';
                const projectedBalanceLabel = projectedBalance > 0
                  ? `you will owe ${formatCurrency(projectedBalance)}`
                  : projectedBalance < 0
                    ? `you will have ${formatCurrency(Math.abs(projectedBalance))} credit`
                    : 'account will be settled';
                return (
                  <Alert severity={formData.type === 'DEBIT' ? 'info' : 'success'} sx={{ fontSize: '0.9rem', fontWeight: 500 }}>
                    Current Balance: {currentBalanceLabel}. {enteredAmount > 0 ? `After this transaction, ${projectedBalanceLabel}.` : 'Enter an amount to preview the new balance.'}
                  </Alert>
                );
              })()}

              <FormControl fullWidth>
                <InputLabel>Type *</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as 'DEBIT' | 'CREDIT' })}
                  label="Type *"
                  required
                >
                  <MenuItem value="DEBIT">Debit / Charge</MenuItem>
                  <MenuItem value="CREDIT">Credit / Payment</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Category *</InputLabel>
                <Select
                  value={formData.transactionInfoType}
                  onChange={(e) => setFormData({ ...formData, transactionInfoType: e.target.value as TransactionInfoType })}
                  label="Category *"
                  required
                >
                  {Object.entries(transactionInfoTypeLabels).map(([value, label]) => (
                    <MenuItem key={value} value={value}>{label}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Description *"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Shipping charge, Payment"
                required
                fullWidth
              />

              <TextField
                label="Amount * (USD)"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                inputProps={{ step: '0.01', min: '0.01' }}
                required
                fullWidth
              />

              <TextField
                label="Notes (Optional)"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any additional notes"
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowAddModal(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Check />} sx={{ textTransform: 'none' }}>
              Add Transaction
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit Transaction Modal */}
      <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Edit Transaction</Typography>
            <IconButton onClick={() => setShowEditModal(false)} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <form onSubmit={handleEditEntry}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Alert severity="warning" sx={{ fontSize: '0.85rem' }}>
                Note: Type and amount cannot be edited to maintain ledger integrity. Only description and notes can be updated.
              </Alert>

              <TextField
                label="Type (Read-only)"
                value={editEntry?.type || ''}
                disabled
                fullWidth
              />

              <TextField
                label="Amount (Read-only)"
                value={editEntry ? formatCurrency(editEntry.amount) : ''}
                disabled
                fullWidth
              />

              <TextField
                label="Description *"
                value={editForm.description}
                onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                required
                fullWidth
              />

              <TextField
                label="Notes"
                value={editForm.notes}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                multiline
                rows={3}
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEditModal(false)} sx={{ textTransform: 'none' }}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={<Check />} sx={{ textTransform: 'none' }}>
              Update Transaction
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </ProtectedRoute>
  );
}
