'use client';
import { formatMoney as formatCurrency } from '@/lib/format';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { CreditCard as Payment, DollarSign as AttachMoney, Eye as Visibility, ListFilter as FilterList, Search, TrendingDown as TrendingDownIcon, TrendingUp as TrendingUpIcon, Users as People } from 'lucide-react';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import Link from 'next/link';
import { Breadcrumbs, Button, DashboardPageSkeleton, EmptyState, Select, SkeletonCard, SkeletonTable, StatsCard, StatusBadge, Tooltip, toast } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { hasPermission } from '@/lib/rbac';

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


interface UserLedgerSummary {
  userId: string;
  userName: string;
  email: string;
  currentBalance: number;
  totalDebit: number;
  totalCredit: number;
  transactionCount: number;
  lastTransaction?: string;
}

export default function AdminLedgersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserLedgerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBalance, setFilterBalance] = useState<'all' | 'positive' | 'zero' | 'negative'>('all');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.replace('/auth/signin');
      return;
    }
    if (!hasPermission(session.user?.role, 'finance:manage')) {
      router.replace('/dashboard/finance/ledger');
      return;
    }
    fetchAllUserLedgers();
  }, [session, status, router]);

  const fetchAllUserLedgers = async () => {
    try {
      setLoading(true);
      // Fetch all users by paginating through all pages
      let allUsers: { id: string; name: string | null; email: string }[] = [];
      let page = 1;
      let hasMore = true;
      const pageSize = 100; // Fetch 100 at a time for better performance
      
      while (hasMore) {
        const usersResponse = await fetch(`/api/users?page=${page}&pageSize=${pageSize}`);
        if (!usersResponse.ok) throw new Error('Failed to fetch users');
        
        const usersData = await usersResponse.json();
        allUsers = [...allUsers, ...usersData.users];
        
        // Check if we've fetched all users
        hasMore = allUsers.length < usersData.total;
        page++;
      }
      
      // Fetch ledger summaries in bulk to avoid N+1 API calls
      let summaryMap: Record<string, any> = {};
      try {
        const summaryResponse = await fetch('/api/ledger/summary');
        if (summaryResponse.ok) {
          const data = await summaryResponse.json();
          summaryMap = data.summaries || {};
        } else {
          console.error('Failed to fetch ledger summaries:', await summaryResponse.text());
        }
      } catch (error) {
        console.error('Error fetching ledger summaries:', error);
      }

      const userSummaries = allUsers.map((user: { id: string; name: string | null; email: string }) => {
        const summary = summaryMap[user.id];

        return {
          userId: user.id,
          userName: user.name || user.email,
          email: user.email,
          currentBalance: summary?.currentBalance || 0,
          totalDebit: summary?.totalDebit || 0,
          totalCredit: summary?.totalCredit || 0,
          transactionCount: summary?.transactionCount || 0,
          lastTransaction: summary?.lastTransaction || undefined,
        };
      });

      setUsers(userSummaries);
    } catch (error) {
      console.error('Error fetching user ledgers:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No transactions';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBalanceChip = (balance: number) => {
    if (balance > 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{backgroundColor: 'rgba(var(--error-rgb), 0.1)', color: 'var(--error)', fontWeight: 600, fontSize: '0.8rem'}}>{<TrendingUpIcon />} {formatCurrency(balance)}</span>
      );
    }
    if (balance < 0) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{backgroundColor: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)', fontWeight: 600, fontSize: '0.8rem'}}>{<TrendingDownIcon />} {formatCurrency(Math.abs(balance))}</span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{backgroundColor: 'rgba(var(--text-secondary-rgb), 0.1)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8rem'}}>{formatCurrency(0)}</span>
    );
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesBalance = 
      filterBalance === 'all' ||
      (filterBalance === 'positive' && user.currentBalance > 0) ||
      (filterBalance === 'zero' && user.currentBalance === 0) ||
      (filterBalance === 'negative' && user.currentBalance < 0);

    return matchesSearch && matchesBalance;
  });

  // ⚡ Bolt: Consolidated multiple array iterations into a single O(N) loop
  let totalBalance = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  let usersWithBalance = 0;

  for (const user of users) {
    totalBalance += user.currentBalance;
    totalDebit += user.totalDebit;
    totalCredit += user.totalCredit;
    if (user.currentBalance > 0) {
      usersWithBalance++;
    }
  }

  const columns = useMemo<Column<UserLedgerSummary>[]>(() => [
    {
      key: 'userName',
      header: 'User',
      sortable: true,
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
          <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500}}>
            {row.userName}
          </p>
          <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
            {row.email}
          </p>
        </JXBox>
      )
    },
    {
      key: 'currentBalance',
      header: 'Balance',
      sortable: true,
      align: 'center' as const,
      render: (_, row) => getBalanceChip(row.currentBalance)
    },
    {
      key: 'totalDebit',
      header: 'Total Debit',
      sortable: true,
      align: 'right' as const,
      render: (_, row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          {formatCurrency(row.totalDebit)}
        </span>
      )
    },
    {
      key: 'totalCredit',
      header: 'Total Credit',
      sortable: true,
      align: 'right' as const,
      render: (_, row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--success)' }}>
          {formatCurrency(row.totalCredit)}
        </span>
      )
    },
    {
      key: 'transactionCount',
      header: 'Transactions',
      sortable: true,
      align: 'center' as const,
      render: (_, row) => (
        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          {row.transactionCount}
        </span>
      )
    },
    {
      key: 'lastTransaction',
      header: 'Last Activity',
      sortable: true,
      render: (_, row) => (
        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {formatDate(row.lastTransaction)}
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right' as const,
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
          <Link href={`/dashboard/finance/admin/ledgers/${row.userId}`} style={{ textDecoration: 'none' }}>
            <Button
              variant="outline"
              size="sm"
              icon={<Visibility />}
              style={{textTransform: 'none', fontSize: '0.75rem'}}
            >
              View Ledger
            </Button>
          </Link>
        </JXBox>
      )
    }
  ], []);

  if (status === 'loading' || loading) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
				{/* Breadcrumbs */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
					<Breadcrumbs />
				</JXBox>
          <DashboardPageSkeleton />
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
				{/* Breadcrumbs */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
					<Breadcrumbs />
				</JXBox>
        {/* Summary Cards */}
        <DashboardGrid className="grid-cols-1 md:grid-cols-4">
          <StatsCard
            icon={<TrendingUpIcon />}
            title="Total Outstanding"
            value={formatCurrency(totalBalance)}
            subtitle={`${usersWithBalance} users with balance`}
            variant="error"
          />
          <StatsCard
            icon={<AttachMoney />}
            title="Total Debits"
            value={formatCurrency(totalDebit)}
            subtitle="All charges"
            variant="warning"
          />
          <StatsCard
            icon={<TrendingDownIcon />}
            title="Total Credits"
            value={formatCurrency(totalCredit)}
            subtitle="All payments"
            variant="success"
          />
          <StatsCard
            icon={<People />}
            title="Users With Balance"
            value={`${usersWithBalance} / ${users.length}`}
            subtitle="Active accounts"
            variant="info"
          />
        </DashboardGrid>

        {/* Search and Filter */}
        <DashboardPanel
          title="Search & Filter"
          description="Find users quickly"
        >
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 grid md:grid-cols-[1fr_auto]">
            <div className="min-w-0 flex-1"><BareInput placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} leftIcon={<Search className="mr-2 h-[20px] w-[20px]" style={{color: 'var(--text-secondary)'}} />} size="small" /></div>
            <div style={{minWidth: '200px'}}><Select label="Balance Filter" options={[{ value: "all", label: 'All Balances' }, { value: "positive", label: 'Owes Money' }, { value: "zero", label: 'Zero Balance' }, { value: "negative", label: 'Credit Balance' }]} value={filterBalance} size="small" onChange={(val) => setFilterBalance(val as typeof filterBalance)} /></div>
          </JXBox>
        </DashboardPanel>

        {/* Users Table */}
        <DashboardPanel
          title="All User Ledgers"
          description={`${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''} found`}
          fullHeight
          actions={
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px'}}>
              <Link href="/dashboard/finance/record-payment" style={{ textDecoration: 'none' }}>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Payment />}
                  style={{textTransform: 'none', fontSize: '0.78rem', fontWeight: 600}}
                >
                  Record Payment
                </Button>
              </Link>
            </JXBox>
          }
        >
          <DataTable
            data={filteredUsers}
            columns={columns}
            keyField="userId"
          />
        </DashboardPanel>
      </DashboardSurface>
    </ProtectedRoute>
  );
}