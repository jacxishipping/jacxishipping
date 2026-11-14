'use client';

import { useEffect, useState, useMemo, useCallback, forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { useSession } from 'next-auth/react';
import { formatMoney } from '@/lib/format';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, IconButton, Modal, PageHeader, Select, StatsCard, TableSkeleton, Tooltip, toast } from '@/components/design-system';
import { ArrowUpRight, Building2, Calendar, CheckCircle2, ChevronDown, ChevronRight, Clock, CreditCard, DollarSign, Download, Edit2, ExternalLink, FileCheck, FileText, Filter, Layers, PieChart as PieIcon, Plus, Receipt, Repeat, Search, Sliders, Store, Tag, Trash2, TrendingUp, XCircle } from 'lucide-react';
import RecurringExpensesTab from './RecurringExpensesTab';
import BudgetsTab from './BudgetsTab';

/** Bare input with the Jacxi field look (no label) — search fields, table-cell editors. */
const BareInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, BareInputProps>(function BareInput(
  { leftIcon, rightIcon, rightElement, error = false, helperText, size = 'small', multiline = false, rows, minRows, inputProps, className, style, ...rest },
  ref,
) {
  const controlClass = [
    'w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)]',
    size === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
    leftIcon ? 'pl-9' : '',
    rightIcon || rightElement ? 'pr-9' : '',
    error
      ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
      : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
    rest.disabled ? 'opacity-50' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{leftIcon}</span>
        )}
        {multiline ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            {...(inputProps as unknown as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows ?? minRows ?? 3}
            aria-invalid={error || undefined}
            style={style}
            className={`${controlClass} min-h-[80px] resize-y leading-[1.5]`}
          />
        ) : (
          <input
            {...rest}
            {...inputProps}
            ref={ref as React.Ref<HTMLInputElement>}
            aria-invalid={error || undefined}
            style={style}
            className={controlClass}
          />
        )}
        {rightIcon && (
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{rightIcon}</span>
        )}
        {rightElement && (
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{rightElement}</span>
        )}
      </div>
      {helperText && (
        <p className="mt-0.5 text-[0.75rem]" style={{ color: error ? 'var(--error)' : 'var(--text-secondary)' }}>{helperText}</p>
      )}
    </div>
  );
});

type BareInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Interactive element on the right (e.g. password visibility toggle). */
  rightElement?: ReactNode;
  error?: boolean;
  helperText?: ReactNode;
  size?: 'small' | 'medium';
  multiline?: boolean;
  rows?: number;
  minRows?: number;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};


/** Bare select with the Jacxi field look (no label) — filter dropdowns. Keeps the native event onChange. */
function BareSelect({ options, placeholder, error = false, size = 'small', leftIcon, className, style, ...rest }: BareSelectProps) {
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{leftIcon}</span>
      )}
      <select
        {...rest}
        aria-invalid={error || undefined}
        style={style}
        className={[
          'w-full appearance-none rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors',
          size === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
          leftIcon ? 'pl-9' : '',
          'pr-9',
          error
            ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
            : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
          rest.disabled ? 'opacity-50' : '',
          className,
        ].filter(Boolean).join(' ')}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={String(option.value)} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden="true" />
    </div>
  );
}

type BareSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  options: { value: string | number; label: string; disabled?: boolean }[];
  placeholder?: string;
  error?: boolean;
  size?: 'small' | 'medium';
  leftIcon?: ReactNode;
};


export type OfficeExpenseCategory =
  | 'RENT'
  | 'UTILITIES'
  | 'SALARIES_PAYROLL'
  | 'OFFICE_SUPPLIES'
  | 'EQUIPMENT_HARDWARE'
  | 'SOFTWARE_SUBSCRIPTIONS'
  | 'MAINTENANCE_REPAIRS'
  | 'TRAVEL_TRANSPORT'
  | 'MARKETING_ADVERTISING'
  | 'LEGAL_PROFESSIONAL'
  | 'COMMUNICATION_INTERNET'
  | 'TAXES_GOVERNMENT_FEES'
  | 'BANK_FEES'
  | 'MEALS_ENTERTAINMENT'
  | 'OTHER';

export type ExpensePaymentStatus = 'PAID' | 'PENDING' | 'CANCELLED';

interface OfficeExpenseItem {
  id: string;
  title: string;
  category: OfficeExpenseCategory;
  amount: number;
  currency: string;
  expenseDate: string;
  paymentMethod: string;
  vendor: string | null;
  referenceNumber: string | null;
  receiptUrl: string | null;
  receiptName: string | null;
  notes: string | null;
  status: ExpensePaymentStatus;
  recordedById: string | null;
  recordedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseSummary {
  totalAmount: number;
  averageAmount: number;
  totalCount: number;
  thisMonthAmount: number;
  thisMonthCount: number;
  thisYearAmount: number;
  thisYearCount: number;
  categoryBreakdown: Array<{
    category: OfficeExpenseCategory;
    amount: number;
    count: number;
  }>;
}

interface ExpenseStats {
  year: number;
  summary: {
    totalYearAmount: number;
    totalYearCount: number;
    averageMonthly: number;
  };
  monthlyTrend: Array<{
    month: string;
    monthIndex: number;
    total: number;
    count: number;
  }>;
  categoryDistribution: Array<{
    category: OfficeExpenseCategory;
    amount: number;
    count: number;
    percentage: number;
  }>;
  topVendors: Array<{
    vendor: string;
    amount: number;
    count: number;
  }>;
}

const CATEGORY_METADATA: Record<OfficeExpenseCategory, { label: string; color: string; bg: string; icon: string }> = {
  RENT: { label: 'Office Rent', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)', icon: '🏢' },
  UTILITIES: { label: 'Utilities (Power/Water)', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: '⚡' },
  SALARIES_PAYROLL: { label: 'Salaries & Payroll', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: '👥' },
  OFFICE_SUPPLIES: { label: 'Office Supplies', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', icon: '📎' },
  EQUIPMENT_HARDWARE: { label: 'Equipment & Computers', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', icon: '💻' },
  SOFTWARE_SUBSCRIPTIONS: { label: 'Software & Cloud', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: '☁️' },
  MAINTENANCE_REPAIRS: { label: 'Maintenance & Repairs', color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)', icon: '🔧' },
  TRAVEL_TRANSPORT: { label: 'Travel & Transport', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)', icon: '✈️' },
  MARKETING_ADVERTISING: { label: 'Marketing & Ads', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', icon: '📢' },
  LEGAL_PROFESSIONAL: { label: 'Legal & Accounting', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)', icon: '⚖️' },
  COMMUNICATION_INTERNET: { label: 'Internet & Telecom', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.15)', icon: '📶' },
  TAXES_GOVERNMENT_FEES: { label: 'Taxes & Gov Fees', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.15)', icon: '🏛️' },
  BANK_FEES: { label: 'Bank & Wire Fees', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)', icon: '💳' },
  MEALS_ENTERTAINMENT: { label: 'Meals & Hospitality', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', icon: '☕' },
  OTHER: { label: 'Other Operating Expenses', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', icon: '📦' },
};

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Wire / ACH' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'DEBIT_CARD', label: 'Debit Card' },
  { value: 'CHECK', label: 'Check' },
  { value: 'ZELLE', label: 'Zelle / Online' },
  { value: 'OTHER', label: 'Other' },
];

export default function OfficeExpensesPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<OfficeExpenseItem[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics' | 'recurring' | 'budgets'>('list');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OfficeExpenseItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<{ url: string; name: string } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    category: 'RENT' as OfficeExpenseCategory,
    amount: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'BANK_TRANSFER',
    vendor: '',
    referenceNumber: '',
    receiptUrl: '',
    receiptName: '',
    notes: '',
    status: 'PAID' as ExpensePaymentStatus,
  });

  const calculateDateRange = useCallback(() => {
    const now = new Date();
    if (dateRangePreset === 'THIS_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      return { startDate: start, endDate: '' };
    }
    if (dateRangePreset === 'LAST_MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
      return { startDate: start, endDate: end };
    }
    if (dateRangePreset === 'THIS_YEAR') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
      return { startDate: start, endDate: '' };
    }
    return { startDate: '', endDate: '' };
  }, [dateRangePreset]);

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = calculateDateRange();
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      });

      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (paymentMethodFilter !== 'ALL') params.set('paymentMethod', paymentMethodFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/finance/office-expenses?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch expenses');

      const data = await res.json();
      if (data.success) {
        setExpenses(data.expenses || []);
        setSummary(data.summary || null);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load office expenses');
    } finally {
      setLoading(false);
    }
  }, [calculateDateRange, categoryFilter, page, paymentMethodFilter, searchQuery, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/finance/office-expenses/stats');
      if (res.ok) {
        const data = await res.json();
        if (data.success) setStats(data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleOpenModal = (expense?: OfficeExpenseItem) => {
    if (expense) {
      setEditingExpense(expense);
      let dateStr = new Date().toISOString().slice(0, 10);
      try {
        const d = new Date(expense.expenseDate);
        if (!isNaN(d.getTime())) {
          dateStr = d.toISOString().slice(0, 10);
        }
      } catch {
        // fallback
      }
      setFormData({
        title: expense.title,
        category: expense.category,
        amount: String(expense.amount),
        expenseDate: dateStr,
        paymentMethod: expense.paymentMethod || 'CASH',
        vendor: expense.vendor || '',
        referenceNumber: expense.referenceNumber || '',
        receiptUrl: expense.receiptUrl || '',
        receiptName: expense.receiptName || '',
        notes: expense.notes || '',
        status: expense.status,
      });
    } else {
      setEditingExpense(null);
      setFormData({
        title: '',
        category: 'RENT',
        amount: '',
        expenseDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'BANK_TRANSFER',
        vendor: '',
        referenceNumber: '',
        receiptUrl: '',
        receiptName: '',
        notes: '',
        status: 'PAID',
      });
    }
    setModalOpen(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Please enter an expense title');
      return;
    }
    const cleanAmt = String(formData.amount || '').replace(/[^\d.-]/g, '');
    const amt = parseFloat(cleanAmt);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSaving(true);
      const url = editingExpense
        ? `/api/finance/office-expenses/${editingExpense.id}`
        : '/api/finance/office-expenses';
      const method = editingExpense ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: amt,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save expense');
      }

      toast.success(editingExpense ? 'Expense updated successfully' : 'Expense recorded successfully');
      setModalOpen(false);
      fetchExpenses();
      fetchStats();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'An error occurred';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteExpense = async () => {
    if (!deleteConfirmId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/finance/office-expenses/${deleteConfirmId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete');

      toast.success('Expense deleted successfully');
      setDeleteConfirmId(null);
      fetchExpenses();
      fetchStats();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete expense';
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = () => {
    const { startDate, endDate } = calculateDateRange();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
    if (statusFilter !== 'ALL') params.set('status', statusFilter);
    if (paymentMethodFilter !== 'ALL') params.set('paymentMethod', paymentMethodFilter);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);

    window.open(`/api/finance/office-expenses/export?${params.toString()}`, '_blank');
  };

  const topCategory = useMemo(() => {
    if (!summary?.categoryBreakdown?.length) return null;
    return summary.categoryBreakdown[0];
  }, [summary]);

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Office & Operating Expenses"
          description="Manage operational overhead, facilities, staff compensation, vendor bills, and office running costs."
          actions={
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                disabled={loading || expenses.length === 0}
              >
                <Download className="w-4 h-4 mr-1.5" />
                Export CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenModal()}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add Expense
              </Button>
            </JXBox>
          }
        />

        {/* Top KPI Metric Cards */}
        <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatsCard
            title="This Month Expenses"
            value={formatMoney(summary?.thisMonthAmount || 0)}
            icon={<Calendar className="w-5 h-5 text-indigo-400" />}
            subtitle={`${summary?.thisMonthCount || 0} bills recorded this month`}
            variant="default"
          />
          <StatsCard
            title="This Year Expenses"
            value={formatMoney(summary?.thisYearAmount || 0)}
            icon={<TrendingUp className="w-5 h-5 text-emerald-400" />}
            subtitle={`${summary?.thisYearCount || 0} entries in ${new Date().getFullYear()}`}
            variant="default"
          />
          <StatsCard
            title="Top Spending Category"
            value={topCategory ? formatMoney(topCategory.amount) : '$0.00'}
            icon={<PieIcon className="w-5 h-5 text-amber-400" />}
            subtitle={topCategory ? CATEGORY_METADATA[topCategory.category]?.label || topCategory.category : 'No data'}
            variant="default"
          />
          <StatsCard
            title="Total Recorded"
            value={formatMoney(summary?.totalAmount || 0)}
            icon={<DollarSign className="w-5 h-5 text-cyan-400" />}
            subtitle={`Avg ${formatMoney(summary?.averageAmount || 0)} per entry`}
            variant="default"
          />
        </DashboardGrid>

        {/* View Tabs */}
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, borderBottom: 1, borderColor: 'var(--border)', marginBottom: '24px'}}>
          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
            <button
              key={"list"}
              type="button"
              role="tab"
              aria-selected={activeTab === "list"}
              onClick={() => { const val = "list"; setActiveTab(val); }}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "list" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Layers className="w-4 h-4" />
                  <span>Expense Ledger ({summary?.totalCount || expenses.length})</span>
                </JXBox>}
            </button>
            <button
              key={"analytics"}
              type="button"
              role="tab"
              aria-selected={activeTab === "analytics"}
              onClick={() => { const val = "analytics"; setActiveTab(val); }}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "analytics" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <PieIcon className="w-4 h-4" />
                  <span>Category Breakdown & Trends</span>
                </JXBox>}
            </button>
            <button
              key={"recurring"}
              type="button"
              role="tab"
              aria-selected={activeTab === "recurring"}
              onClick={() => { const val = "recurring"; setActiveTab(val); }}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "recurring" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Repeat className="w-4 h-4" />
                  <span>Recurring Schedules</span>
                </JXBox>}
            </button>
            <button
              key={"budgets"}
              type="button"
              role="tab"
              aria-selected={activeTab === "budgets"}
              onClick={() => { const val = "budgets"; setActiveTab(val); }}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "budgets" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Sliders className="w-4 h-4" />
                  <span>Budgets & Caps</span>
                </JXBox>}
            </button>
          
          </div>
        </JXBox>

        {activeTab === 'list' && (
          <DashboardPanel>
            {/* Filter Toolbar */}
            <JXBox padding="none" border={false} style={{display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(var(--panel-rgb), 0.5)', border: '1px solid rgba(var(--panel-rgb), 0.8)'}}>
              {/* Search Bar */}
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: '1 1 260px', minWidth: '220px'}}>
                <div className="min-w-0 flex-1"><BareInput placeholder="Search title, vendor, check #, notes..." value={searchQuery} onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }} leftIcon={<Search className="w-4 h-4 text-[var(--text-secondary)]" />} size="small" /></div>
              </JXBox>

              {/* Category Filter */}
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, minWidth: '160px'}}>
                <div className="min-w-0 flex-1"><Select label="Category" options={[{ value: "ALL", label: 'All Categories' }, ...Object.entries(CATEGORY_METADATA).map(([catKey, meta]) => ({ value: catKey, label: meta.label }))]} value={categoryFilter} size="small" onChange={(val) => {
                      setCategoryFilter(val as string);
                      setPage(1);
                    }} /></div>
              </JXBox>

              {/* Payment Method Filter */}
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, minWidth: '150px'}}>
                <div className="min-w-0 flex-1"><Select label="Payment" options={[{ value: "ALL", label: 'All Methods' }, ...PAYMENT_METHODS.map((pm) => ({ value: pm.value, label: pm.label }))]} value={paymentMethodFilter} size="small" onChange={(val) => {
                      setPaymentMethodFilter(val as string);
                      setPage(1);
                    }} /></div>
              </JXBox>

              {/* Date Preset Filter */}
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, minWidth: '140px'}}>
                <div className="min-w-0 flex-1"><Select label="Period" options={[{ value: "ALL", label: 'All Time' }, { value: "THIS_MONTH", label: 'This Month' }, { value: "LAST_MONTH", label: 'Last Month' }, { value: "THIS_YEAR", label: 'This Year' }]} value={dateRangePreset} size="small" onChange={(val) => {
                      setDateRangePreset(val as string);
                      setPage(1);
                    }} /></div>
              </JXBox>

              {/* Status Filter */}
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, minWidth: '130px'}}>
                <div className="min-w-0 flex-1"><Select label="Status" options={[{ value: "ALL", label: 'All Status' }, { value: "PAID", label: 'Paid' }, { value: "PENDING", label: 'Pending' }, { value: "CANCELLED", label: 'Cancelled' }]} value={statusFilter} size="small" onChange={(val) => {
                      setStatusFilter(val as string);
                      setPage(1);
                    }} /></div>
              </JXBox>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                  setPaymentMethodFilter('ALL');
                  setDateRangePreset('ALL');
                  setPage(1);
                }}
              >
                Reset
              </Button>
            </JXBox>

            {/* Expenses Table */}
            {loading ? (
              <TableSkeleton rows={8} />
            ) : expenses.length === 0 ? (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingTop: '80px', paddingBottom: '80px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                <Building2 className="w-12 h-12 text-[var(--text-secondary)] mb-3 opacity-60" />
                <h6 className="text-sm font-semibold font-semibold text-[var(--text-primary)]">
                  No office expenses found
                </h6>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)] mt-1 max-w-sm">
                  {searchQuery || categoryFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? 'Try adjusting your search query or filters.'
                    : 'Start tracking your office overhead, payroll, utilities, and running expenses by adding your first expense.'}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  onClick={() => handleOpenModal()}
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add First Expense
                </Button>
              </JXBox>
            ) : (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, overflowX: 'auto'}}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                      <th className="py-3 px-4">Expense / Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Vendor / Payee</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Payment</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] text-sm">
                    {expenses.map((expense) => {
                      const meta = CATEGORY_METADATA[expense.category] || CATEGORY_METADATA.OTHER;
                      return (
                        <tr
                          key={expense.id}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Title & Details */}
                          <td className="py-3.5 px-4 font-medium text-[var(--text-primary)]">
                            <div className="flex items-center gap-2">
                              <span>{expense.title}</span>
                              {expense.receiptUrl && (
                                <Tooltip title="Receipt Attached" arrow={false}>
                                  <button
                                    onClick={() =>
                                      setReceiptPreviewUrl({
                                        url: expense.receiptUrl!,
                                        name: expense.receiptName || 'Receipt Attachment',
                                      })
                                    }
                                    className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                                  >
                                    <Receipt className="w-3.5 h-3.5" />
                                  </button>
                                </Tooltip>
                              )}
                            </div>
                            {expense.referenceNumber && (
                              <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                                Ref: <span className="font-mono">{expense.referenceNumber}</span>
                              </div>
                            )}
                            {expense.notes && (
                              <div className="text-xs text-[var(--text-secondary)] italic mt-0.5 line-clamp-1">
                                {expense.notes}
                              </div>
                            )}
                          </td>

                          {/* Category Badge */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.color}33`, fontWeight: 600, fontSize: '0.75rem'}}>{<span className="flex items-center gap-1">
                                  <span>{meta.icon}</span>
                                  <span>{meta.label}</span>
                                </span>}</span>
                          </td>

                          {/* Vendor */}
                          <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                            {expense.vendor ? (
                              <div className="flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-[var(--text-secondary)] flex-shrink-0" />
                                <span>{expense.vendor}</span>
                              </div>
                            ) : (
                              <span className="text-[var(--text-secondary)] italic">—</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                            {new Date(expense.expenseDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </td>

                          {/* Payment Method */}
                          <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                            <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                              <CreditCard className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                              <span>{expense.paymentMethod.replace(/_/g, ' ')}</span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3.5 px-4 text-right font-semibold text-[var(--text-primary)] whitespace-nowrap">
                            {formatMoney(expense.amount)}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4 text-center">
                            {expense.status === 'PAID' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                Paid
                              </span>
                            ) : expense.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Clock className="w-3 h-3" />
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                <XCircle className="w-3 h-3" />
                                Cancelled
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'inline-flex', gap: '4px'}}>
                              <Tooltip title="Edit Expense" arrow={false}>
                                <IconButton icon={<Edit2 className="w-4 h-4" />} ariaLabel="Edit expense" variant="ghost" size="sm" onClick={() => handleOpenModal(expense)} style={{color: 'var(--text-secondary)'}} />
                              </Tooltip>
                              <Tooltip title="Delete Expense" arrow={false}>
                                <IconButton icon={<Trash2 className="w-4 h-4" />} ariaLabel="Delete expense" variant="ghost" size="sm" onClick={() => setDeleteConfirmId(expense.id)} style={{color: 'var(--text-secondary)'}} />
                              </Tooltip>
                            </JXBox>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)'}}>
                    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                      Page {page} of {totalPages}
                    </p>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px'}}>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        Next
                      </Button>
                    </JXBox>
                  </JXBox>
                )}
              </JXBox>
            )}
          </DashboardPanel>
        )}

        {/* Analytics & Breakdown Tab */}
        {activeTab === 'analytics' && (
          <DashboardGrid className="grid-cols-1 lg:grid-cols-2">
            {/* Category Breakdown Card */}
            <DashboardPanel title="Spending by Category" description={`Distribution across ${stats?.year || new Date().getFullYear()}`}>
              {stats?.categoryDistribution?.length ? (
                <div className="space-y-4 pt-2">
                  {stats.categoryDistribution.map((item) => {
                    const meta = CATEGORY_METADATA[item.category] || CATEGORY_METADATA.OTHER;
                    return (
                      <div key={item.category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 font-medium text-[var(--text-primary)]">
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                            <span className="text-xs text-[var(--text-secondary)]">({item.count} bills)</span>
                          </div>
                          <div className="font-semibold text-[var(--text-primary)]">
                            {formatMoney(item.amount)}{' '}
                            <span className="text-xs text-[var(--text-secondary)] font-normal">
                              ({item.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(3, item.percentage)}%`,
                              backgroundColor: meta.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-[var(--text-secondary)] text-sm">
                  No category spending recorded yet.
                </div>
              )}
            </DashboardPanel>

            {/* Monthly Trend & Top Vendors */}
            <div className="space-y-6">
              {/* Monthly Trend */}
              <DashboardPanel title="Monthly Expense Trend" description="Month-by-month spending summary">
                {stats?.monthlyTrend ? (
                  <div className="grid grid-cols-6 gap-2 pt-2">
                    {stats.monthlyTrend.map((m) => (
                      <div
                        key={m.month}
                        className="p-2.5 rounded-xl bg-[var(--background)] border border-[var(--border)] text-center flex flex-col justify-between"
                      >
                        <div className="text-xs font-semibold text-[var(--text-secondary)]">{m.month}</div>
                        <div className="my-1.5 font-bold text-[var(--text-primary)] text-sm">
                          {m.total > 0 ? formatMoney(m.total) : '$0'}
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)]">{m.count} bills</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[var(--text-secondary)] text-sm">Loading trend data...</div>
                )}
              </DashboardPanel>

              {/* Top Vendors */}
              <DashboardPanel title="Top Payees & Vendors" description="Highest spending recipients">
                {stats?.topVendors?.length ? (
                  <div className="divide-y divide-[var(--border)]">
                    {stats.topVendors.map((v, i) => (
                      <div key={v.vendor} className="py-2.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                          <span className="w-5 h-5 rounded-full bg-[var(--border)] text-[var(--text-secondary)] text-xs flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <span>{v.vendor}</span>
                          <span className="text-xs text-[var(--text-secondary)]">({v.count} payments)</span>
                        </div>
                        <div className="font-semibold text-[var(--text-primary)]">{formatMoney(v.amount)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-[var(--text-secondary)] text-sm">No vendor data available.</div>
                )}
              </DashboardPanel>
            </div>
          </DashboardGrid>
        )}

        {activeTab === 'recurring' && (
          <RecurringExpensesTab
            onExpenseGenerated={() => {
              fetchExpenses();
              fetchStats();
            }}
            categoryLabels={Object.fromEntries(
              Object.entries(CATEGORY_METADATA).map(([k, v]) => [k, v.label])
            ) as Record<OfficeExpenseCategory, string>}
          />
        )}

        {activeTab === 'budgets' && (
          <BudgetsTab
            categoryLabels={Object.fromEntries(
              Object.entries(CATEGORY_METADATA).map(([k, v]) => [k, v.label])
            ) as Record<OfficeExpenseCategory, string>}
          />
        )}

        {/* Add / Edit Expense Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingExpense ? 'Edit Office Expense' : 'Record New Office Expense'}
          description="Enter the overhead details, category, payee, and payment confirmation."
        >
          <form onSubmit={handleSaveExpense} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Expense Title *
              </label>
              <div className="min-w-0 flex-1"><BareInput required placeholder="e.g. Office Rent (September), High-Speed Internet Bill" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} size="small" /></div>
            </div>

            {/* Category & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Category *
                </label>
                <div className="min-w-0 flex-1"><BareSelect options={Object.entries(CATEGORY_METADATA).map(([catKey, meta]) => ({ value: catKey, label: meta.label }))} value={formData.category} size="small" onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as OfficeExpenseCategory })
                    } style={{backgroundColor: 'var(--background)', borderRadius: '16px'}} /></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Amount (USD) *
                </label>
                <div className="min-w-0 flex-1"><BareInput type="number" required placeholder="0.00" inputProps={{ step: '0.01', min: '0.01' }} value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} leftIcon="$" size="small" /></div>
              </div>
            </div>

            {/* Date & Payment Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Expense Date *
                </label>
                <div className="min-w-0 flex-1"><BareInput type="date" required value={formData.expenseDate} onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })} size="small" /></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Payment Method
                </label>
                <div className="min-w-0 flex-1"><BareSelect options={PAYMENT_METHODS.map((pm) => ({ value: pm.value, label: pm.label }))} value={formData.paymentMethod} size="small" onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })} style={{backgroundColor: 'var(--background)', borderRadius: '16px'}} /></div>
              </div>
            </div>

            {/* Vendor / Payee & Reference # */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Vendor / Payee
                </label>
                <div className="min-w-0 flex-1"><BareInput placeholder="e.g. Landlord Name, Verizon, Staples" value={formData.vendor} onChange={(e) => setFormData({ ...formData, vendor: e.target.value })} size="small" /></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Reference # (Invoice / Check)
                </label>
                <div className="min-w-0 flex-1"><BareInput placeholder="e.g. INV-9042, Check #1042" value={formData.referenceNumber} onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })} size="small" /></div>
              </div>
            </div>

            {/* Receipt URL / Attachment Link */}
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                Receipt / Document Link
              </label>
              <div className="min-w-0 flex-1"><BareInput placeholder="https://... (Receipt image or PDF link)" value={formData.receiptUrl} onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })} leftIcon={<Receipt className="w-4 h-4 text-[var(--text-secondary)]" />} size="small" /></div>
            </div>

            {/* Notes & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Internal Notes
                </label>
                <div className="min-w-0 flex-1"><BareInput placeholder="Additional context or notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} size="small" /></div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <div className="min-w-0 flex-1"><BareSelect options={[{ value: "PAID", label: 'Paid' }, { value: "PENDING", label: 'Pending' }, { value: "CANCELLED", label: 'Cancelled' }]} value={formData.status} size="small" onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as ExpensePaymentStatus })
                    } style={{backgroundColor: 'var(--background)', borderRadius: '16px'}} /></div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          open={!!deleteConfirmId}
          onClose={() => setDeleteConfirmId(null)}
          title="Delete Office Expense"
          description="Are you sure you want to delete this expense record? This action cannot be undone."
        >
          <div className="space-y-4">
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-300 flex items-center gap-2">
              <Trash2 className="w-5 h-5 flex-shrink-0" />
              <span>This will permanently remove this expense from all financial summaries.</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteExpense}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Receipt Attachment Preview Modal */}
        <Modal
          open={!!receiptPreviewUrl}
          onClose={() => setReceiptPreviewUrl(null)}
          title={receiptPreviewUrl?.name || 'Receipt Document'}
          description="Attached receipt preview"
        >
          {receiptPreviewUrl && (
            <div className="space-y-4 text-center">
              <div className="max-h-[60vh] overflow-auto rounded-xl border border-[var(--border)] p-2 bg-[var(--background)]">
                {receiptPreviewUrl.url.endsWith('.pdf') ? (
                  <iframe
                    src={receiptPreviewUrl.url}
                    className="w-full h-96 rounded-lg"
                    title="PDF Preview"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={receiptPreviewUrl.url}
                    alt="Receipt"
                    className="max-h-[55vh] mx-auto rounded-lg object-contain"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(receiptPreviewUrl.url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Open in New Tab
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReceiptPreviewUrl(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </DashboardSurface>
    </ProtectedRoute>
  );
}
