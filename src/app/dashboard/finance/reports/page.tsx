'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { hasPermission } from '@/lib/rbac';
import { 
  ArrowLeft, 
  Download, 
  Calendar,
  Filter,
  FileText,
  Users,
  Package,
  Truck,
  HandCoins,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Section from '@/components/layout/Section';
import AdminRoute from '@/components/auth/AdminRoute';
import { Button, Breadcrumbs, toast, DashboardPageSkeleton, TableSkeleton, SkeletonCard } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { ResponsiveDataView, CardField } from '@/components/ui/MobileCardView';
import { Box } from '@mui/material';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { getDispatchStatusLabel } from '@/lib/dispatch-workflow';

type UserBalance = {
  userId: string;
  userName: string;
  currentBalance: number;
};

type UserReport = {
  userId: string;
  userName: string;
  email: string;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  shipmentStats: {
    total: number;
    paid: number;
    due: number;
  };
};

type ShipmentReport = {
  shipmentId: string;
  trackingNumber: string | null;
  vehicle: string;
  price: number | null;
  paymentStatus: string;
  totalCharged: number;
  totalPaid: number;
  amountDue: number;
  totalExpenses: number;
  revenue: number;
  profit: number;
  profitMargin: number;
  user: {
    id: string;
    name: string;
  };
  createdAt?: string;
  expenses?: Array<{
    id: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    linkedCompanyLedgerEntry?: {
      id: string;
      companyId: string;
      description: string;
      reference: string | null;
      notes: string | null;
      company: {
        id: string;
        name: string;
        code: string | null;
      };
    } | null;
  }>;
};

type ReportData = {
  reportType: string;
  period?: {
    startDate: string;
    endDate: string;
  };
  ledgerSummary?: {
    totalDebit: number;
    totalCredit: number;
    netBalance: number;
    debitCount: number;
    creditCount: number;
  };
  shipmentSummary?: Array<{
    status: string;
    totalAmount: number;
    count: number;
  }>;
  userBalances?: UserBalance[];
  users?: UserReport[];
  summary?: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    avgProfitMargin: number;
    shipmentCount: number;
  };
  dispatchSummary?: {
    activeCount: number;
    totalCount: number;
    totalExpenseAmount: number;
    expenseCount: number;
    statuses: Array<{
      status: string;
      count: number;
    }>;
  };
  shipments?: ShipmentReport[];
};

export default function FinancialReportsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reportType, setReportType] = useState<'summary' | 'user-wise' | 'shipment-wise'>('summary');
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    userId: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !hasPermission(session.user?.role, 'finance:manage')) {
      router.replace('/dashboard');
      return;
    }
    fetchReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status, router, reportType]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        type: reportType,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId }),
      });

      const response = await fetch(`/api/reports/financial?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        type: reportType,
        format,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
        ...(filters.userId && { userId: filters.userId }),
      });

      const response = await fetch(`/api/reports/financial?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to export report');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-report-${reportType}-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const formatDate = (dateString: string) => {
    if (dateString === 'All time' || dateString === 'Now') return dateString;
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const userBalanceColumns = useMemo<Column<UserBalance>[]>(() => [
    {
      key: 'userName',
      header: 'User',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-[var(--text-primary)]">{row.userName}</span>
      ),
    },
    {
      key: 'currentBalance',
      header: 'Balance',
      sortable: true,
      render: (_, row) => (
        <span className={`font-semibold ${row.currentBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}`}>
          {formatCurrency(Math.abs(row.currentBalance))}
        </span>
      ),
    },
  ], []);

  const shipmentColumns = useMemo<Column<ShipmentReport>[]>(() => [
    {
      key: 'trackingNumber',
      header: 'Tracking',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-[var(--text-primary)]">
          {row.trackingNumber || '—'}
        </span>
      ),
    },
    {
      key: 'vehicle',
      header: 'Vehicle',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-[var(--text-primary)]">{row.vehicle}</span>
      ),
    },
    {
      key: 'totalCharged',
      header: 'Charged',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-right text-[var(--error)]">
          {formatCurrency(row.totalCharged)}
        </span>
      ),
    },
    {
      key: 'totalPaid',
      header: 'Paid',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-right text-[var(--success)]">
          {formatCurrency(row.totalPaid)}
        </span>
      ),
    },
    {
      key: 'amountDue',
      header: 'Due',
      sortable: true,
      render: (_, row) => (
        <span className="text-sm text-right text-[var(--warning)]">
          {formatCurrency(row.amountDue)}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Status',
      sortable: true,
      render: (_, row) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          row.paymentStatus === 'COMPLETED'
            ? 'bg-[rgba(var(--success-rgb),0.08)] text-[var(--success)]'
            : 'bg-[rgba(var(--warning-rgb),0.08)] text-[var(--warning)]'
        }`}>
          {row.paymentStatus === 'COMPLETED' ? 'Paid' : 'Due'}
        </span>
      ),
    },
    {
      key: 'expenses',
      header: 'Recoveries',
      render: (_, row) => {
        const linkedRecoveries = (row.expenses || []).filter((expense) => expense.linkedCompanyLedgerEntry);

        if (linkedRecoveries.length === 0) {
          return <span className="text-sm text-[var(--text-secondary)]">None</span>;
        }

        if (linkedRecoveries.length === 1 && linkedRecoveries[0].linkedCompanyLedgerEntry) {
          return (
            <button
              type="button"
              onClick={() => router.push(`/dashboard/finance/companies/${linkedRecoveries[0].linkedCompanyLedgerEntry!.companyId}?entryId=${linkedRecoveries[0].linkedCompanyLedgerEntry!.id}`)}
              className="rounded border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
            >
              View Entry
            </button>
          );
        }

        return <span className="text-sm text-[var(--text-primary)]">{linkedRecoveries.length} entries below</span>;
      },
    },
  ], [router]);

  if (status === 'loading' || loading) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
          <div className="text-center space-y-4 text-[var(--text-secondary)]">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--border)] border-t-[var(--accent-gold)] mx-auto" />
            <p>Loading report...</p>
          </div>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-[var(--background)]">
        {/* Breadcrumbs */}
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>
        
        <Section className="pt-6 pb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <Link href="/dashboard/finance">
                <Button variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-semibold text-[var(--text-primary)]">Financial Reports</h1>
                <p className="text-sm text-[var(--text-secondary)]">
                  Generate and export detailed financial reports
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportReport('json')}
                className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]"
              >
                <Download className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </div>
          </div>
        </Section>

        {/* Report Type Selection */}
        <Section className="pb-6">
          <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
            <CardHeader className="p-4 border-b border-[var(--border)]">
              <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Report Type</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setReportType('summary')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    reportType === 'summary'
                      ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                      : 'border-[var(--border)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'
                  }`}
                >
                  <FileText className="w-6 h-6 text-[var(--info)] mb-2" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Summary Report</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Overall financial overview</p>
                </button>

                <button
                  onClick={() => setReportType('user-wise')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    reportType === 'user-wise'
                      ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                      : 'border-[var(--border)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'
                  }`}
                >
                  <Users className="w-6 h-6 text-[var(--info)] mb-2" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">User-wise Report</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Detailed by user accounts</p>
                </button>

                <button
                  onClick={() => setReportType('shipment-wise')}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    reportType === 'shipment-wise'
                      ? 'border-[var(--accent-gold)] bg-[rgba(var(--accent-gold-rgb),0.08)]'
                      : 'border-[var(--border)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'
                  }`}
                >
                  <Package className="w-6 h-6 text-[var(--info)] mb-2" />
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Shipment-wise Report</p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">Payment status by shipment</p>
                </button>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* Filters */}
        {showFilters && (
          <Section className="pb-6">
            <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
              <CardHeader className="p-4 border-b border-[var(--border)]">
                <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Filters</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[var(--text-secondary)] mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)]"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      onClick={fetchReport}
                      className="w-full bg-[var(--accent-gold)] hover:bg-[var(--accent-gold)]"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Section>
        )}

        {/* Report Content */}
        {reportData && (
          <>
            {/* Period Info */}
            <Section className="pb-6">
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Calendar className="w-4 h-4" />
                <span>
                  Report Period: {reportData.period ? `${formatDate(reportData.period.startDate)} - ${formatDate(reportData.period.endDate)}` : 'N/A'}
                </span>
              </div>
            </Section>

            {/* Summary Report */}
            {reportType === 'summary' && (
              <>
                <Section className="pb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                    <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardContent className="p-6">
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Total Debit</p>
                        <p className="text-2xl font-bold text-[var(--error)] mt-2">
                          {formatCurrency(reportData.ledgerSummary?.totalDebit || 0)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {reportData.ledgerSummary?.debitCount} transactions
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardContent className="p-6">
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Total Credit</p>
                        <p className="text-2xl font-bold text-[var(--success)] mt-2">
                          {formatCurrency(reportData.ledgerSummary?.totalCredit || 0)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {reportData.ledgerSummary?.creditCount} transactions
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardContent className="p-6">
                        <p className="text-xs text-[var(--text-secondary)] uppercase tracking-wide">Net Balance</p>
                        <p className={`text-2xl font-bold mt-2 ${
                          (reportData.ledgerSummary?.netBalance || 0) >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                        }`}>
                          {formatCurrency(Math.abs(reportData.ledgerSummary?.netBalance || 0))}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {(reportData.ledgerSummary?.netBalance || 0) >= 0 ? 'Receivable' : 'Payable'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-[var(--warning)]">
                          <Truck className="w-4 h-4" />
                          <p className="text-xs uppercase tracking-wide">Active Dispatches</p>
                        </div>
                        <p className="text-2xl font-bold text-[var(--warning)] mt-2">
                          {reportData.dispatchSummary?.activeCount || 0}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {reportData.dispatchSummary?.totalCount || 0} total dispatch records
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-2 text-[var(--error)]">
                          <HandCoins className="w-4 h-4" />
                          <p className="text-xs uppercase tracking-wide">Dispatch Expenses</p>
                        </div>
                        <p className="text-2xl font-bold text-[var(--error)] mt-2">
                          {formatCurrency(reportData.dispatchSummary?.totalExpenseAmount || 0)}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                          {reportData.dispatchSummary?.expenseCount || 0} expense records
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </Section>

                <Section className="pb-6">
                  <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                    <CardHeader className="p-4 border-b border-[var(--border)]">
                      <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Dispatch Status Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                        {(reportData.dispatchSummary?.statuses || []).map((status) => (
                          <div key={status.status} className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
                            <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                              {getDispatchStatusLabel(status.status)}
                            </p>
                            <p className="text-2xl font-bold text-[var(--text-primary)] mt-2">{status.count}</p>
                          </div>
                        ))}
                        {(reportData.dispatchSummary?.statuses || []).length === 0 && (
                          <p className="text-sm text-[var(--text-secondary)]">No dispatch records matched the selected period.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Section>

                <Section className="pb-6">
                  <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                    <CardHeader className="p-4 border-b border-[var(--border)]">
                      <CardTitle className="text-lg font-bold text-[var(--text-primary)]">User Balances</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ResponsiveDataView
                        data={reportData.userBalances ?? []}
                        TableComponent={DataTable}
                        tableProps={{
                          data: reportData.userBalances ?? [],
                          columns: userBalanceColumns,
                          keyField: 'userId',
                        }}
                        keyField="userId"
                        renderMobileCard={(user: UserBalance): CardField[] => [
                          { label: 'User', value: user.userName, primary: true },
                          {
                            label: 'Balance',
                            value: (
                              <span className={`font-semibold ${user.currentBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}`}>
                                {formatCurrency(Math.abs(user.currentBalance))}
                              </span>
                            ),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>
                </Section>
              </>
            )}

            {/* User-wise Report */}
            {reportType === 'user-wise' && (
              <Section className="pb-16">
                <div className="space-y-6">
                  {reportData.users?.map((user) => (
                    <Card key={user.userId} className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardHeader className="p-4 border-b border-[var(--border)]">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-lg font-bold text-[var(--text-primary)]">{user.userName}</CardTitle>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">{user.email}</p>
                          </div>
                          <div className={`text-xl font-bold ${user.currentBalance >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}`}>
                            {formatCurrency(Math.abs(user.currentBalance))}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-[var(--text-secondary)]">Total Debit</p>
                            <p className="text-lg font-semibold text-[var(--error)]">{formatCurrency(user.totalDebit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-secondary)]">Total Credit</p>
                            <p className="text-lg font-semibold text-[var(--success)]">{formatCurrency(user.totalCredit)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-secondary)]">Paid Shipments</p>
                            <p className="text-lg font-semibold text-[var(--text-primary)]">{user.shipmentStats.paid}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[var(--text-secondary)]">Due Shipments</p>
                            <p className="text-lg font-semibold text-[var(--warning)]">{user.shipmentStats.due}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </Section>
            )}

            {/* Shipment-wise Report */}
            {reportType === 'shipment-wise' && (
              <Section className="pb-16">
                <div className="space-y-6">
                  <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                    <CardHeader className="p-4 border-b border-[var(--border)]">
                      <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Shipment Payment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ResponsiveDataView
                        data={reportData.shipments ?? []}
                        TableComponent={DataTable}
                        tableProps={{
                          data: reportData.shipments ?? [],
                          columns: shipmentColumns,
                          keyField: 'shipmentId',
                        }}
                        keyField="shipmentId"
                        renderMobileCard={(shipment: ShipmentReport): CardField[] => [
                          { label: 'Tracking', value: shipment.trackingNumber || '—', primary: true },
                          { label: 'Vehicle', value: shipment.vehicle },
                          {
                            label: 'Charged',
                            value: <span className="text-[var(--error)]">{formatCurrency(shipment.totalCharged)}</span>,
                          },
                          {
                            label: 'Paid',
                            value: <span className="text-[var(--success)]">{formatCurrency(shipment.totalPaid)}</span>,
                          },
                          {
                            label: 'Due',
                            value: <span className="text-[var(--warning)]">{formatCurrency(shipment.amountDue)}</span>,
                          },
                          {
                            label: 'Status',
                            value: (
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                shipment.paymentStatus === 'COMPLETED'
                                  ? 'bg-[rgba(var(--success-rgb),0.08)] text-[var(--success)]'
                                  : 'bg-[rgba(var(--warning-rgb),0.08)] text-[var(--warning)]'
                              }`}>
                                {shipment.paymentStatus === 'COMPLETED' ? 'Paid' : 'Due'}
                              </span>
                            ),
                          },
                        ]}
                      />
                    </CardContent>
                  </Card>

                  {(reportData.shipments ?? []).some((shipment) => (shipment.expenses || []).some((expense) => expense.linkedCompanyLedgerEntry)) && (
                    <Card className="border-0 bg-[var(--panel)] backdrop-blur-md shadow-lg">
                      <CardHeader className="p-4 border-b border-[var(--border)]">
                        <CardTitle className="text-lg font-bold text-[var(--text-primary)]">Expense Recovery Drill-Through</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {(reportData.shipments ?? []).map((shipment) => {
                            const linkedExpenses = (shipment.expenses || []).filter((expense) => expense.linkedCompanyLedgerEntry);

                            if (linkedExpenses.length === 0) {
                              return null;
                            }

                            return (
                              <div key={shipment.shipmentId} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div>
                                    <p className="text-sm font-semibold text-[var(--text-primary)]">{shipment.vehicle}</p>
                                    <p className="text-xs text-[var(--text-secondary)]">{linkedExpenses.length} linked recovery entr{linkedExpenses.length === 1 ? 'y' : 'ies'}</p>
                                  </div>
                                  <span className="text-sm font-semibold text-[var(--accent-gold)]">{formatCurrency(linkedExpenses.reduce((sum, expense) => sum + expense.amount, 0))}</span>
                                </div>

                                <div className="mt-3 space-y-2">
                                  {linkedExpenses.map((expense) => (
                                    <div key={expense.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2">
                                      <div>
                                        <p className="text-sm text-[var(--text-primary)]">{expense.description}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">{new Date(expense.date).toLocaleDateString()} • {expense.type}</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold text-[var(--error)]">{formatCurrency(expense.amount)}</span>
                                        <button
                                          type="button"
                                          onClick={() => router.push(`/dashboard/finance/companies/${expense.linkedCompanyLedgerEntry!.companyId}?entryId=${expense.linkedCompanyLedgerEntry!.id}`)}
                                          className="rounded border border-[var(--border)] px-2 py-1 text-xs font-semibold text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                                        >
                                          Company Entry
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </Section>
            )}
          </>
        )}
      </div>
    </AdminRoute>
  );
}