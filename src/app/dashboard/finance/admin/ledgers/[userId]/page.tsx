"use client";
import { forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { formatMoney as formatCurrency } from "@/lib/format";
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { ArrowLeft as ArrowBack, Check, ChevronLeft, ChevronRight, DollarSign as AttachMoney, Download, ListFilter as FilterList, Pencil as Edit, Plus as Add, Printer as Print, Search, Trash2 as Delete, TrendingDown as TrendingDownIcon, TrendingUp as TrendingUpIcon, Truck as LocalShipping, X as Close } from 'lucide-react';

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { hasPermission } from "@/lib/rbac";
import {
  Breadcrumbs,
  Button,
  toast,
  EmptyState,
  SkeletonCard,
  SkeletonTable,
  Tooltip,
  StatusBadge,
  DashboardPageSkeleton,
  StatsCard,
} from "@/components/design-system";
import { DataTable, Column } from "@/components/ui/DataTable";
import {
  DashboardSurface,
  DashboardPanel,
  DashboardGrid,
} from "@/components/dashboard/DashboardSurface";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import { Alert, FormField, IconButton, Select, Modal } from '@/components/design-system';

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


interface LedgerEntry {
  id: string;
  transactionDate: string;
  description: string;
  type: "DEBIT" | "CREDIT";
  transactionInfoType?: TransactionInfoType;
  amount: number;
  balance: number;
  notes?: string;
  metadata?: Record<string, unknown>;
  shipment?: {
    id: string;
    vehicleMake?: string;
    vehicleModel?: string;
  };
}

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface LedgerSummary {
  totalDebit: number;
  totalCredit: number;
  totalShipmentPurchaseAmount: number;
  totalShipmentExpenses: number;
  currentBalance: number;
  transactionInfoBreakdown: Record<
    TransactionInfoType,
    {
      totalDebit: number;
      totalCredit: number;
      balance: number;
    }
  >;
}

type TransactionInfoType =
  | "CAR_PAYMENT"
  | "SHIPPING_PAYMENT"
  | "STORAGE_PAYMENT";

const transactionInfoTypeLabels: Record<TransactionInfoType, string> = {
  CAR_PAYMENT: "Car Payment",
  SHIPPING_PAYMENT: "Shipping Payment",
  STORAGE_PAYMENT: "Storage Payment",
};

export default function UserLedgerManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;

  const [user, setUser] = useState<User | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({
    totalDebit: 0,
    totalCredit: 0,
    totalShipmentPurchaseAmount: 0,
    totalShipmentExpenses: 0,
    currentBalance: 0,
    transactionInfoBreakdown: {
      CAR_PAYMENT: { totalDebit: 0, totalCredit: 0, balance: 0 },
      SHIPPING_PAYMENT: { totalDebit: 0, totalCredit: 0, balance: 0 },
      STORAGE_PAYMENT: { totalDebit: 0, totalCredit: 0, balance: 0 },
    },
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    search: "",
    type: "",
    transactionInfoType: "",
    startDate: "",
    endDate: "",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LedgerEntry | null>(null);

  const [formData, setFormData] = useState({
    description: "",
    type: "DEBIT" as "DEBIT" | "CREDIT",
    transactionInfoType: "SHIPPING_PAYMENT" as TransactionInfoType,
    amount: "",
    notes: "",
  });

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.replace("/auth/signin");
      return;
    }
    if (!hasPermission(session.user?.role, "finance:manage")) {
      router.replace("/dashboard/finance/ledger");
      return;
    }
    fetchUser();
    fetchLedgerEntries();
  }, [session, status, router, userId, page, filters]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  const fetchLedgerEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        userId,
        page: page.toString(),
        limit: "20",
        ...(filters.search && { search: filters.search }),
        ...(filters.type && { type: filters.type }),
        ...(filters.transactionInfoType && {
          transactionInfoType: filters.transactionInfoType,
        }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const response = await fetch(`/api/ledger?recalc=true&${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch ledger entries");
      }

      const data = await response.json();
      setEntries(data.entries);
      setSummary(data.summary);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error("Error fetching ledger:", error);
      toast.error("Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = parseFloat(formData.amount);
      const response = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          description: formData.description,
          type: formData.type,
          transactionInfoType: formData.transactionInfoType,
          amount,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        toast.success("Transaction added successfully");
        setShowAddModal(false);
        setFormData({
          description: "",
          type: "DEBIT",
          transactionInfoType: "SHIPPING_PAYMENT",
          amount: "",
          notes: "",
        });
        fetchLedgerEntries();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add transaction");
      }
    } catch (error) {
      console.error("Error adding entry:", error);
      toast.error("An error occurred");
    }
  };

  const handleEditEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    try {
      const response = await fetch(`/api/ledger/${selectedEntry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: formData.description,
          notes: formData.notes,
        }),
      });

      if (response.ok) {
        toast.success("Transaction updated successfully");
        setShowEditModal(false);
        setSelectedEntry(null);
        setFormData({
          description: "",
          type: "DEBIT",
          transactionInfoType: "SHIPPING_PAYMENT",
          amount: "",
          notes: "",
        });
        fetchLedgerEntries();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update transaction");
      }
    } catch (error) {
      console.error("Error updating entry:", error);
      toast.error("An error occurred");
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this transaction? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/ledger/${entryId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Transaction deleted successfully");
        fetchLedgerEntries();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("An error occurred");
    }
  };

  const openEditModal = (entry: LedgerEntry) => {
    setSelectedEntry(entry);
    setFormData({
      description: entry.description,
      type: entry.type,
      transactionInfoType: entry.transactionInfoType || "SHIPPING_PAYMENT",
      amount: entry.amount.toString(),
      notes: entry.notes || "",
    });
    setShowEditModal(true);
  };

  const handleExport = async (format: "pdf" | "excel") => {
    try {
      const params = new URLSearchParams({
        userId,
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });

      const endpoint =
        format === "pdf" ? "/api/ledger/export-pdf" : "/api/ledger/export";
      const response = await fetch(`${endpoint}?${params}`);

      if (!response.ok) throw new Error("Failed to export ledger");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ledger-${user?.name || "user"}-${Date.now()}.${format === "pdf" ? "html" : "csv"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Ledger exported successfully");
    } catch (error) {
      console.error("Error exporting ledger:", error);
      toast.error("Failed to export ledger");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return "var(--error)";
    if (balance < 0) return "var(--success)";
    return "var(--text-secondary)";
  };

  const columns = useMemo<Column<LedgerEntry>[]>(
    () => [
      {
        key: "transactionDate",
        header: "Date",
        sortable: true,
        width: "15%",
        render: (_, row) => (
          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
            {formatDate(row.transactionDate)}
          </span>
        ),
      },
      {
        key: "description",
        header: "Description",
        sortable: true,
        width: "35%",
        render: (_, row) => {
          const isPending = row.metadata?.pendingInvoice === true;
          const isInvoicePaid =
            !isPending &&
            (typeof row.metadata?.invoiceId === "string" ||
              typeof row.metadata?.invoiceNumber === "string");
          return (
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: "flex", alignItems: "center", gap: '8px', flexWrap: "wrap"}}>
                <p className="text-sm leading-relaxed" style={{fontSize: "0.85rem", color: "var(--text-primary)", fontWeight: 500}}>
                  {row.description}
                </p>
                {isPending && (
                  <JXBox padding="none" border={false} component="span" style={{display: "inline-flex", alignItems: "center", paddingLeft: '6px', paddingRight: '6px', paddingTop: '2px', paddingBottom: '2px', borderRadius: '8px', fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", backgroundColor: "rgba(var(--warning-rgb), 0.15)", color: "var(--warning-dark, #B45309)", border: "1px solid rgba(var(--warning-rgb), 0.3)", textTransform: "uppercase"}}>
                    Pending Invoice
                  </JXBox>
                )}
                {isInvoicePaid && (
                  <JXBox padding="none" border={false} component="span" style={{display: "inline-flex", alignItems: "center", paddingLeft: '6px', paddingRight: '6px', paddingTop: '2px', paddingBottom: '2px', borderRadius: '8px', fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.05em", backgroundColor: "rgba(var(--success-rgb), 0.15)", color: "var(--success-dark, #047857)", border: "1px solid rgba(var(--success-rgb), 0.3)", textTransform: "uppercase"}}>
                    Invoice Paid
                  </JXBox>
                )}
              </JXBox>
              <p className="text-sm leading-relaxed" style={{fontSize: "0.72rem", color: "var(--accent-gold)", marginTop: '4px', fontWeight: 600}}>
                {row.transactionInfoType
                  ? transactionInfoTypeLabels[row.transactionInfoType]
                  : "Not specified"}
              </p>
              {row.notes && (
                <p className="text-sm leading-relaxed" style={{fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: '4px'}}>
                  {row.notes}
                </p>
              )}
              {row.shipment && (
                <p className="text-sm leading-relaxed" style={{fontSize: "0.75rem", color: "var(--accent-gold)", marginTop: '4px'}}>
                  {row.shipment.vehicleMake} {row.shipment.vehicleModel}
                </p>
              )}
            </JXBox>
          );
        },
      },
      {
        key: "type",
        header: "Type",
        sortable: true,
        align: "center" as const,
        width: "10%",
        render: (_, row) => (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{backgroundColor: row.type === "DEBIT"
                  ? "rgba(var(--error-rgb), 0.1)"
                  : "rgba(var(--success-rgb), 0.1)", color: row.type === "DEBIT" ? "var(--error)" : "var(--success)", fontWeight: 600, fontSize: "0.75rem"}}>{row.type === "DEBIT" ? <TrendingUpIcon /> : <TrendingDownIcon />} {row.type}</span>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        sortable: true,
        align: "right" as const,
        width: "15%",
        render: (_, row) => (
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: row.type === "DEBIT" ? "var(--error)" : "var(--success)",
            }}
          >
            {row.type === "DEBIT" ? "+" : "-"}
            {formatCurrency(row.amount)}
          </span>
        ),
      },
      {
        key: "balance",
        header: "Balance",
        sortable: true,
        align: "right" as const,
        width: "15%",
        render: (_, row) => (
          <span
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: getBalanceColor(row.balance),
            }}
          >
            {formatCurrency(row.balance)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "center" as const,
        width: "10%",
        render: (_, row) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: "flex", gap: '4px', justifyContent: "center", flexWrap: "nowrap", whiteSpace: "nowrap"}} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Edit transaction">
              <IconButton icon={<Edit className="h-5 w-5" />} ariaLabel="Edit transaction" variant="ghost" size="sm" onClick={() => openEditModal(row)} style={{color: "var(--accent-gold)"}} />
            </Tooltip>
            <Tooltip title="Delete transaction">
              <IconButton icon={<Delete className="h-5 w-5" />} ariaLabel="Delete transaction" variant="ghost" size="sm" onClick={() => handleDeleteEntry(row.id)} style={{color: "#ef4444"}} />
            </Tooltip>
          </JXBox>
        ),
      },
    ],
    [],
  );

  if (status === "loading" || loading || !user) {
    return (
      <ProtectedRoute>
        <DashboardSurface>
          <DashboardPageSkeleton />
        </DashboardSurface>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        {/* Back Button & Title */}
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginBottom: '16px'}}>
          <Link
            href="/dashboard/finance/admin/ledgers"
            style={{ textDecoration: "none" }}
          >
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowBack />}
              style={{textTransform: "none", fontSize: "0.78rem", marginBottom: '16px'}}
            >
              Back to All Ledgers
            </Button>
          </Link>
          <h5 className="text-base font-semibold" style={{fontWeight: 600, color: "var(--text-primary)"}}>
            {user.name || user.email}'s Ledger
          </h5>
          <p className="text-sm leading-relaxed" style={{fontSize: "0.9rem", color: "var(--text-secondary)", marginTop: '4px'}}>
            Manage financial transactions for {user.email}
          </p>
        </JXBox>

        {/* Summary Cards */}
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
            subtitle="Total car purchase amount for this customer"
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
          title="Filters & Actions"
          description="Search and filter transactions"
          actions={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              icon={<Add />}
              style={{textTransform: "none", fontSize: "0.78rem", fontWeight: 600}}
            >
              Add Transaction
            </Button>
          }
        >
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: "flex", flexDirection: "column", gap: '16px'}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: "flex", gap: '16px', alignItems: "center"}}>
              <div className="min-w-0 flex-1"><BareInput placeholder="Search transactions..." value={filters.search} onChange={(e) =>
                  setFilters({ ...filters, search: e.target.value })
                } leftIcon={(
                    <Search className="mr-2 h-[20px] w-[20px]" style={{color: "var(--text-secondary)"}} />
                  )} size="small" /></div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                icon={<FilterList />}
                style={{textTransform: "none", fontSize: "0.75rem", minWidth: '120px'}}
              >
                {showFilters ? "Hide" : "Show"} Filters
              </Button>
            </JXBox>

            {showFilters && (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: "grid", gap: '16px'}} className="grid-cols-1 sm:grid-cols-3">
                <div className="min-w-0 flex-1"><Select label="Type" options={[{ value: "", label: 'All Types' }, { value: "DEBIT", label: 'Debit Only' }, { value: "CREDIT", label: 'Credit Only' }]} value={filters.type} size="small" onChange={(val) => setFilters({ ...filters, type: val as string })} /></div>
                <div className="min-w-0 flex-1"><FormField label="Start Date" type="date" value={filters.startDate} onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  } InputLabelProps={{ shrink: true }} size="small" /></div>
                <div className="min-w-0 flex-1"><FormField label="End Date" type="date" value={filters.endDate} onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  } InputLabelProps={{ shrink: true }} size="small" /></div>
              </JXBox>
            )}

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: "flex", gap: '8px'}}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                icon={<Print />}
                style={{textTransform: "none", fontSize: "0.75rem"}}
              >
                Print
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("pdf")}
                icon={<Download />}
                style={{textTransform: "none", fontSize: "0.75rem"}}
              >
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport("excel")}
                icon={<Download />}
                style={{textTransform: "none", fontSize: "0.75rem"}}
              >
                Excel
              </Button>
            </JXBox>
          </JXBox>
        </DashboardPanel>

        {/* Transactions Table */}
        <DashboardPanel
          title="Transaction History"
          description={`${entries.length} transaction${entries.length !== 1 ? "s" : ""}`}
          fullHeight
        >
          <DataTable data={entries} columns={columns} keyField="id" />

          {/* Pagination */}
          {totalPages > 1 && (
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: '24px'}}>
              <p className="text-sm leading-relaxed" style={{fontSize: "0.85rem", color: "var(--text-secondary)"}}>
                Page {page} of {totalPages}
              </p>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: "flex", gap: '8px'}}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  icon={<ChevronLeft />}
                  style={{textTransform: "none", fontSize: "0.75rem"}}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  icon={<ChevronRight />}
                  style={{textTransform: "none", fontSize: "0.75rem"}}
                >
                  Next
                </Button>
              </JXBox>
            </JXBox>
          )}
        </DashboardPanel>
      </DashboardSurface>

      {/* Add Transaction Modal */}
            <form onSubmit={handleAddEntry}>
<Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Transaction"
        size="sm"
        actions={<>

            <Button
              onClick={() => setShowAddModal(false)}
              style={{textTransform: "none"}}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Check />}
              style={{textTransform: "none"}}
            >
              Add Transaction
            </Button>
        </>}
      >

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: "flex", flexDirection: "column", gap: '16px'}}>
              {/* Account balance info */}
              {(() => {
                const enteredAmount = parseFloat(formData.amount) || 0;
                const projectedBalance =
                  formData.type === "DEBIT"
                    ? summary.currentBalance + enteredAmount
                    : summary.currentBalance - enteredAmount;
                const currentBalanceLabel =
                  summary.currentBalance > 0
                    ? `Customer owes ${formatCurrency(summary.currentBalance)}`
                    : summary.currentBalance < 0
                      ? `Customer has ${formatCurrency(Math.abs(summary.currentBalance))} credit`
                      : "Account is settled";
                const projectedBalanceLabel =
                  projectedBalance > 0
                    ? `customer will owe ${formatCurrency(projectedBalance)}`
                    : projectedBalance < 0
                      ? `customer will have ${formatCurrency(Math.abs(projectedBalance))} credit`
                      : "account will be settled";
                return (
                  <>
                    <Alert severity={formData.type === "DEBIT" ? "info" : "success"} variant="subtle" className="font-medium">
                      Current Balance: {currentBalanceLabel}.{" "}
                      {enteredAmount > 0
                        ? `After this transaction, ${projectedBalanceLabel}.`
                        : "Enter an amount to preview the new balance."}
                    </Alert>
                  </>
                );
              })()}

              <div className="min-w-0 flex-1"><Select label="Type" options={[{ value: "DEBIT", label: 'Debit / Charge Customer' }, { value: "CREDIT", label: 'Credit / Customer Payment' }]} value={formData.type} required onChange={(val) => setFormData({
                      ...formData,
                      type: val as "DEBIT" | "CREDIT",
                    })} /></div>

              <div className="min-w-0 flex-1"><Select label="Category" options={Object.entries(transactionInfoTypeLabels).map(([value, label]) => ({ value, label }))} value={formData.transactionInfoType} required onChange={(val) => setFormData({
                      ...formData,
                      transactionInfoType: val as TransactionInfoType,
                    })} /></div>

              <div className="min-w-0 flex-1"><FormField label="Description *" value={formData.description} onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                } placeholder="e.g. Shipping charge, Customer payment" required /></div>

              <div className="min-w-0 flex-1"><FormField label="Amount * (USD)" type="number" value={formData.amount} onChange={(e) =>
                  setFormData({ ...formData, amount: e.target.value })
                } placeholder="0.00" inputProps={{ step: "0.01", min: "0.01" }} required />
                {formData.amount ? (
                  <p className="mt-0.5 text-[0.75rem]" style={{ color: '#22c55e' }}>
                    {(() => {
                      const amt = parseFloat(formData.amount) || 0;
                      const projected =
                        formData.type === "DEBIT"
                          ? summary.currentBalance + amt
                          : summary.currentBalance - amt;
                      if (projected > 0)
                        return `New balance: customer owes ${formatCurrency(projected)}`;
                      if (projected < 0)
                        return `New balance: customer has ${formatCurrency(Math.abs(projected))} credit`;
                      return "New balance: account settled";
                    })()}
                  </p>
                ) : null}
              </div>

              <div className="min-w-0 flex-1"><FormField label="Notes (Optional)" value={formData.notes} onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                } placeholder="Add any additional notes" multiline rows={3} /></div>
            </JXBox>
      </Modal>
      </form>

      {/* Edit Transaction Modal */}
            <form onSubmit={handleEditEntry}>
<Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Transaction"
        size="sm"
        actions={<>

            <Button
              onClick={() => setShowEditModal(false)}
              style={{textTransform: "none"}}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Check />}
              style={{textTransform: "none"}}
            >
              Update Transaction
            </Button>
        </>}
      >

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: "flex", flexDirection: "column", gap: '16px'}}>
              <Alert severity="warning" variant="subtle">
                Note: Type and amount cannot be edited to maintain ledger
                integrity. Only description and notes can be updated.
              </Alert>

              <div className="min-w-0 flex-1"><FormField label="Type (Read-only)" value={formData.type} disabled /></div>

              <div className="min-w-0 flex-1"><FormField label="Amount (Read-only)" value={formatCurrency(parseFloat(formData.amount))} disabled /></div>

              <div className="min-w-0 flex-1"><FormField label="Description *" value={formData.description} onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                } required /></div>

              <div className="min-w-0 flex-1"><FormField label="Notes" value={formData.notes} onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                } multiline rows={3} /></div>
            </JXBox>
      </Modal>
      </form>

    </ProtectedRoute>
  );
}
