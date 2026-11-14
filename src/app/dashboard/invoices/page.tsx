'use client';

import { formatMoney as formatCurrency } from '@/lib/format';
import { JXBox } from '@jacxishippingorg/jx-ui-react';

import { Suspense, useState, useEffect, forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';
import Link from 'next/link';
import { Calendar, ChevronDown, DollarSign, Download, ExternalLink, Eye, FileText, MoreHorizontal, Package, PanelRightOpen, Search, User } from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import InvoiceQuickPeek from '@/components/dashboard/InvoiceQuickPeek';
import InvoicePreviewModal from '@/components/invoices/InvoicePreviewModal';
import { 
	PageHeader, 
	Button, 
	Breadcrumbs, 
	toast, 
	LoadingState, 
	EmptyState, 
	StatsCard,
	DashboardPageSkeleton,
	StatusBadge,
	CopyButton,
	StatusFilterPills,
} from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { exportToCSVWithHeaders } from '@/lib/export';
import { SavedFilterPresets } from '@/components/dashboard/SavedFilterPresets';

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


interface Invoice {
	id: string;
	invoiceNumber: string;
	userId: string;
	containerId: string | null;
	shipmentId: string | null;
	status: string;
	reversedAt?: string | null;
	reversedBy?: { name: string | null; email: string } | null;
	issueDate: string;
	dueDate: string | null;
	total: number;
	user: {
		name: string | null;
		email: string;
	};
	container: {
		containerNumber: string;
	} | null;
	shipment: {
		id: string;
		vehicleYear: number | null;
		vehicleMake: string | null;
		vehicleModel: string | null;
		vehicleVIN: string | null;
		vehicleType: string;
	} | null;
	_count: {
		lineItems: number;
	};
}

interface InvoiceTableRow {
	id: string;
	invoiceNumber: string;
	customer: string;
	reference: string;
	referenceId: string | null;
	referenceType: 'container' | 'shipment' | 'none';
	issueDate: string;
	dueDate: string | null;
	status: string;
	total: number;
	reversedAt?: string | null;
	reversedByLabel?: string | null;
}

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
	DRAFT: { label: 'Draft', color: 'default' },
	PENDING: { label: 'Pending', color: 'warning' },
	SENT: { label: 'Sent', color: 'info' },
	PAID: { label: 'Paid', color: 'success' },
	OVERDUE: { label: 'Overdue', color: 'error' },
	CANCELLED: { label: 'Cancelled', color: 'default' },
};

function InvoicesPageContent() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: session } = useSession();
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [backfillingCharges, setBackfillingCharges] = useState(false);
	const [itemsPerPage, setItemsPerPage] = useState(25);
	const [currentPage, setCurrentPage] = useState(1);
	const [pagination, setPagination] = useState({ total: 0, totalAll: 0, limit: 25, offset: 0, hasMore: false });
	const [quickPeekInvoiceId, setQuickPeekInvoiceId] = useState<string | null>(null);
	const [previewInvoice, setPreviewInvoice] = useState<{
		id: string;
		invoiceNumber: string;
		customerName?: string;
		totalAmount?: number;
		status?: string;
	} | null>(null);
	// Row actions menu (Round 3 F5): the four per-row buttons made the table
	// ~380 px wider than the viewport. One menu trigger per row instead.
	// Rendered fixed-position (not inside the scrolling table) so the menu
	// is never clipped by the table's horizontal scroller.
	const [actionMenu, setActionMenu] = useState<{ rowId: string; top: number; left: number } | null>(null);

	const openActionMenu = (event: React.MouseEvent<HTMLElement>, rowId: string) => {
		event.stopPropagation();
		const rect = event.currentTarget.getBoundingClientRect();
		const menuWidth = 200;
		const menuHeight = 184;
		const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
		const top = rect.bottom + 6 + menuHeight > window.innerHeight
			? Math.max(8, rect.top - menuHeight - 6)
			: rect.bottom + 6;
		setActionMenu({ rowId, top, left });
	};

	useEffect(() => {
		if (!actionMenu) return;
		const handleKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setActionMenu(null);
		};
		window.addEventListener('keydown', handleKey);
		return () => window.removeEventListener('keydown', handleKey);
	}, [actionMenu]);

	const isAdmin = hasPermission(session?.user?.role, 'invoices:manage');
	const customerFilterUserId = searchParams.get('userId');
	const customerFilterLabel = searchParams.get('customer') || 'Selected Customer';

	useEffect(() => {
		setCurrentPage(1);
		const timeout = setTimeout(() => {
			fetchInvoices(0, itemsPerPage);
		}, 250);

		return () => clearTimeout(timeout);
	}, [statusFilter, itemsPerPage, searchTerm, customerFilterUserId]);

	const fetchInvoices = async (offset = 0, limit = itemsPerPage) => {
		try {
			setLoading(true);
			const params = new URLSearchParams();
			if (statusFilter !== 'all') {
				params.append('status', statusFilter.toUpperCase());
			}
			if (searchTerm.trim()) {
				params.append('search', searchTerm.trim());
			}
			if (customerFilterUserId) {
				params.append('userId', customerFilterUserId);
			}
			params.append('limit', limit.toString());
			params.append('offset', offset.toString());
			
			const response = await fetch(`/api/invoices?${params}`, { cache: 'no-store' });
			const data = await response.json();

			if (response.ok) {
				setInvoices(data.invoices || []);
				setPagination(data.pagination || { total: 0, totalAll: 0, limit, offset, hasMore: false });
			} else {
				toast.error('Failed to load invoices');
			}
		} catch (error) {
			console.error('Error fetching invoices:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handlePageChange = (newPage: number) => {
		const offset = (newPage - 1) * itemsPerPage;
		setCurrentPage(newPage);
		fetchInvoices(offset, itemsPerPage);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleItemsPerPageChange = (newLimit: number) => {
		setItemsPerPage(newLimit);
		setCurrentPage(1);
	};

	const handleDownloadPDF = async (invoice: Invoice) => {
		try {
			toast.success('Generating PDF...', {
				description: 'Please wait a moment'
			});

			// Fetch full invoice details
			const response = await fetch(`/api/invoices/${invoice.id}`, { cache: 'no-store' });
			const fullInvoice = await response.json();

			// Dynamically import the PDF generator
			const { downloadInvoicePDF } = await import('@/lib/utils/generateInvoicePDF');
			
			// Generate and download the PDF
			await downloadInvoicePDF(fullInvoice);

			toast.success('PDF downloaded successfully!', {
				description: 'Check your downloads folder'
			});
		} catch (error) {
			console.error('Error generating PDF:', error);
			toast.error('Failed to generate PDF', {
				description: 'Please try again'
			});
		}
	};

	const handleBackfillShipmentCharges = async () => {
		try {
			setBackfillingCharges(true);
			const response = await fetch('/api/admin/billing/backfill-shipment-charges', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({}),
			});
			const payload = (await response.json().catch(() => ({}))) as {
				error?: string;
				processedEntries?: number;
				shipmentsTouched?: number;
				totalLedgerEntries?: number;
			};

			if (!response.ok) {
				throw new Error(payload.error || 'Failed to backfill shipment charges');
			}

			toast.success('Shipment charge backfill completed', {
				description: `${payload.processedEntries || 0} ledger-backed charges synced across ${payload.shipmentsTouched || 0} shipment${payload.shipmentsTouched === 1 ? '' : 's'}.`,
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to backfill shipment charges');
		} finally {
			setBackfillingCharges(false);
		}
	};

	const formatDate = (date: string | null) => {
		if (!date) return 'N/A';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	// Search and orphan filtering are handled by the API.
	const filteredInvoices = invoices;

	const invoiceRows: InvoiceTableRow[] = filteredInvoices.map((invoice) => {
		// Determine reference: per-shipment invoices show vehicle info, container-based show container number
		let reference = 'N/A';
		let referenceId: string | null = null;
		let referenceType: 'container' | 'shipment' | 'none' = 'none';

		if (invoice.shipment) {
			const s = invoice.shipment;
			reference = [s.vehicleYear, s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || s.vehicleType;
			if (s.vehicleVIN) reference += ` (${s.vehicleVIN})`;
			referenceId = s.id;
			referenceType = 'shipment';
		} else if (invoice.container) {
			reference = invoice.container.containerNumber;
			referenceId = invoice.containerId;
			referenceType = 'container';
		}

		return {
			id: invoice.id,
			invoiceNumber: invoice.invoiceNumber,
			customer: invoice.user.name || invoice.user.email,
			reference,
			referenceId,
			referenceType,
			issueDate: invoice.issueDate,
			dueDate: invoice.dueDate,
			status: invoice.status,
			total: invoice.total,
			reversedAt: (invoice as { reversedAt?: string | null }).reversedAt ?? null,
			reversedByLabel: (invoice as { reversedBy?: { name: string | null; email: string } | null }).reversedBy
				? ((invoice as { reversedBy: { name: string | null; email: string } }).reversedBy.name ||
					(invoice as { reversedBy: { name: string | null; email: string } }).reversedBy.email)
				: null,
		};
	});

	// The Reversed column is mostly "-" — only show it when at least one
	// visible invoice is actually reversed (Round 3 F5: table width).
	const hasReversed = invoices.some((invoice) => Boolean((invoice as { reversedAt?: string | null }).reversedAt));

	const invoiceColumns: Column<InvoiceTableRow>[] = [
		{
			key: 'invoiceNumber',
			header: 'Invoice #',
			sortable: true,
			className: 'whitespace-nowrap',
			render: (value) => (
				<span className="inline-flex items-center gap-1.5 font-mono font-semibold">
					<span>{String(value)}</span>
					<CopyButton value={String(value)} label="Invoice #" />
				</span>
			),
		},
		...(isAdmin ? [{ key: 'customer', header: 'Customer', sortable: true, render: (value: unknown) => (
			<span className="block max-w-[170px] truncate" title={String(value ?? '')}>{String(value ?? '')}</span>
		) }] : []),
		{
			key: 'reference',
			header: 'Shipment / Container',
			render: (value, row) => {
				const inner = (() => {
					if (row.referenceType === 'shipment' && row.referenceId) {
						return (
							<Link
								href={`/dashboard/shipments/${row.referenceId}`}
								style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}
							>
								{String(value)}
							</Link>
						);
					}
					if (row.referenceType === 'container' && row.referenceId) {
						return (
							<Link
								href={`/dashboard/containers/${row.referenceId}`}
								style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontFamily: 'monospace', fontWeight: 600 }}
							>
								{String(value)}
							</Link>
						);
					}
					return <span>{String(value)}</span>;
				})();
				// Truncate long vehicle/VIN references so the table fits the
				// viewport (Round 3 F5); full text stays in the title tooltip.
				return <span className="block max-w-[210px] truncate" title={String(value)}>{inner}</span>;
			},
		},
		{
			key: 'issueDate',
			header: 'Issue Date',
			sortable: true,
			className: 'whitespace-nowrap',
			render: (value) => formatDate(String(value)),
		},
		{
			key: 'dueDate',
			header: 'Due Date',
			className: 'whitespace-nowrap',
			render: (value) => formatDate(value ? String(value) : null),
		},
		{
			key: 'status',
			header: 'Status',
			render: (value) => <StatusBadge status={String(value)} size="sm" />,
		},
		...(hasReversed ? [{
			key: 'reversedAt',
			header: 'Reversed',
			className: 'whitespace-nowrap',
			render: (value: unknown, row: InvoiceTableRow) => {
				if (!row.reversedAt) {
					return <span className="text-[var(--text-secondary)]">-</span>;
				}
				return (
					<span style={{ fontSize: '0.8rem' }}>
						{formatDate(String(row.reversedAt))}
						{row.reversedByLabel ? (
							<JXBox padding="none" border={false} component="span" style={{backgroundColor: 'transparent', borderRadius: 0, display: 'block', color: 'var(--text-secondary)'}}>
								by {row.reversedByLabel}
							</JXBox>
						) : null}
					</span>
				);
			},
		}] : []),
		{
			key: 'total',
			header: 'Total',
			render: (value) => formatCurrency(Number(value)),
		},
		{
			key: 'actions',
			header: 'Actions',
			align: 'right',
			render: (_, row) => (
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
					<Button
						variant="outline"
						size="sm"
						icon={<MoreHorizontal className="w-4 h-4" />}
						onClick={(e) => openActionMenu(e, row.id)}
						aria-haspopup="menu"
						aria-expanded={actionMenu?.rowId === row.id}
						title="Invoice actions"
					>
						Actions
					</Button>
				</JXBox>
			),
		},
	];

	const invoiceStatusOptions = Object.entries(statusConfig).map(([value, config]) => ({
		value,
		label: config.label,
	}));

	const handleBulkStatusUpdate = async (invoiceIds: string[], status: string) => {
		if (!isAdmin) return;

		try {
			const response = await fetch('/api/bulk/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'updateStatus', invoiceIds, data: { status } }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || 'Bulk status update failed');
			}

			toast.success('Invoices updated', {
				description: `${data.count || 0} invoice(s) updated`,
			});
			fetchInvoices();
		} catch (error) {
			console.error('Error updating invoices:', error);
			toast.error('Failed to update invoices');
		}
	};

const confirmAction = useConfirmAction();

        const handleBulkDelete = async (invoiceIds: string[]) => {
                if (!isAdmin) return;

                if (!(await confirmAction({
                        message: `Delete ${invoiceIds.length} invoice(s)? This cannot be undone.`,
                        confirmText: 'Delete invoices',
                        severity: 'error',
                }))) {
			return;
		}

		try {
			const response = await fetch('/api/bulk/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', invoiceIds }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data?.message || 'Bulk delete failed');
			}

			toast.success('Invoices deleted', {
				description: `${data.count || 0} invoice(s) removed`,
			});
			fetchInvoices();
		} catch (error) {
			console.error('Error deleting invoices:', error);
			toast.error('Failed to delete invoices');
		}
	};

	const handleBulkExport = (rows: InvoiceTableRow[]) => {
		try {
			exportToCSVWithHeaders(
				rows.map((row) => ({
					invoiceNumber: row.invoiceNumber,
					customer: row.customer,
					reference: row.reference,
					issueDate: formatDate(row.issueDate),
					dueDate: formatDate(row.dueDate),
					status: row.status,
					total: formatCurrency(row.total),
				})),
				[
					{ key: 'invoiceNumber', label: 'Invoice #' },
					{ key: 'customer', label: 'Customer' },
					{ key: 'reference', label: 'Shipment / Container' },
					{ key: 'issueDate', label: 'Issue Date' },
					{ key: 'dueDate', label: 'Due Date' },
					{ key: 'status', label: 'Status' },
					{ key: 'total', label: 'Total' },
				],
				'invoices'
			);
			toast.success('Export ready');
		} catch (error) {
			console.error('Error exporting invoices:', error);
			toast.error('Failed to export invoices');
		}
	};

	// Calculate stats
	// ⚡ Bolt: Consolidated multiple filter and reduce operations into a single O(N) loop
	const stats = {
		total: pagination.totalAll,
		paid: 0,
		pending: 0,
		overdue: 0,
		totalAmount: 0,
		paidAmount: 0,
	};

	for (const i of invoices) {
		stats.totalAmount += i.total;
		if (i.status === 'PAID') {
			stats.paid++;
			stats.paidAmount += i.total;
		} else if (i.status === 'PENDING' || i.status === 'SENT') {
			stats.pending++;
		} else if (i.status === 'OVERDUE') {
			stats.overdue++;
		}
	}
	const quickStatusFilters = [
		{ value: 'all', label: 'All', count: pagination.totalAll },
		{ value: 'overdue', label: 'Overdue', count: stats.overdue },
		{ value: 'pending', label: 'Pending', count: stats.pending },
		{ value: 'paid', label: 'Paid', count: stats.paid },
		{ value: 'draft', label: 'Draft', count: invoices.filter((invoice) => invoice.status === 'DRAFT').length },
		{ value: 'cancelled', label: 'Reversed', count: invoices.filter((invoice) => invoice.status === 'CANCELLED').length },
	];

	if (loading) {
		return <DashboardPageSkeleton />;
	}

	return (
		<DashboardSurface>
			{/* Page Header */}
			<PageHeader
				showBreadcrumbs
				title={isAdmin ? 'All Invoices' : 'My Invoices'}
				description={isAdmin ? 'Manage customer invoices' : 'View and download your invoices'}
				actions={
					isAdmin ? (
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
							<Button variant="outline" onClick={handleBackfillShipmentCharges} disabled={backfillingCharges}>
								{backfillingCharges ? 'Backfilling...' : 'Backfill Shipment Charges'}
							</Button>
						</JXBox>
					) : null
				}
			/>

			{/* Stats Cards */}
			<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '24px', marginBottom: '24px'}} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
				<StatsCard
					title="Total Invoices"
					value={stats.total}
					icon={<FileText className="w-5 h-5" />}
					trend={{ value: 0, isPositive: true }}
				/>
				<StatsCard
					title="Paid"
					value={stats.paid}
					subtitle={formatCurrency(stats.paidAmount)}
					icon={<DollarSign className="w-5 h-5" />}
					trend={{ value: 0, isPositive: true }}
					variant="success"
				/>
				<StatsCard
					title="Pending"
					value={stats.pending}
					icon={<Calendar className="w-5 h-5" />}
					trend={{ value: 0, isPositive: true }}
					variant="warning"
				/>
				<StatsCard
					title="Overdue"
					value={stats.overdue}
					icon={<FileText className="w-5 h-5" />}
					trend={{ value: 0, isPositive: false }}
					variant="error"
				/>
			</JXBox>

			<DashboardPanel title="Invoice Health" description="Jump straight to the invoice queue that needs attention.">
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 grid lg:grid-cols-[1.25fr_1fr]">
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '0px', overflow: 'hidden'}}>
						<StatusFilterPills
							options={[
								{ value: 'all', label: `All (${pagination.totalAll})` },
								{ value: 'overdue', label: `Overdue (${stats.overdue})`, color: '#EF4444' },
								{ value: 'pending', label: `Pending (${stats.pending})`, color: '#F59E0B' },
								{ value: 'paid', label: `Paid (${stats.paid})`, color: '#10B981' },
								{ value: 'draft', label: `Draft (${invoices.filter((i) => i.status === 'DRAFT').length})`, color: '#6B7280' },
								{ value: 'cancelled', label: `Reversed (${invoices.filter((i) => i.status === 'CANCELLED').length})`, color: '#9CA3AF' },
							]}
							selectedValue={statusFilter}
							onSelect={(val) => setStatusFilter(val)}
						/>
					</JXBox>
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '8px'}} className="grid-cols-1 sm:grid-cols-3">
						{[
							{ label: 'Open Amount', value: formatCurrency(Math.max(stats.totalAmount - stats.paidAmount, 0)) },
							{ label: 'Paid Amount', value: formatCurrency(stats.paidAmount) },
							{ label: 'Visible Total', value: formatCurrency(stats.totalAmount) },
						].map((item) => (
							<JXBox padding="none" border={false} key={item.label} style={{padding: '10px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--background)'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800}}>{item.label}</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '2px', fontWeight: 800, color: 'var(--text-primary)'}}>{item.value}</JXBox>
							</JXBox>
						))}
					</JXBox>
				</JXBox>
			</DashboardPanel>

			{/* Main Invoices Panel */}
			<DashboardPanel 
				title="Invoices"
				description={customerFilterUserId ? `${pagination.total} invoice(s) for ${customerFilterLabel}` : `${pagination.total} invoice(s)`}
			>
				{customerFilterUserId ? (
					<JXBox padding="none" border={false} style={{display: 'flex', gap: '16px', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '24px', padding: '16px', border: '1px solid var(--border)', borderRadius: '16px', background: 'var(--panel)'}}>
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px'}}>
							<User className="w-4 h-4" />
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)'}}>Customer Filter</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)'}}>{customerFilterLabel}</JXBox>
							</JXBox>
						</JXBox>
						<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/invoices')}>
							Clear Filter
						</Button>
					</JXBox>
				) : null}

				{/* Filters */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px'}}>
					<div className="min-w-0 flex-1"><BareInput placeholder="Search by invoice #, customer, VIN, vehicle, or container..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} leftIcon={<Search className="w-4 h-4" />} size="small" /></div>
					<SavedFilterPresets
						storageKey="invoices"
						currentFilters={{ status: statusFilter, search: searchTerm }}
						onApplyPreset={(filters) => {
							if (filters.status) setStatusFilter(filters.status);
							if (typeof filters.search === 'string') setSearchTerm(filters.search);
						}}
					/>
				</JXBox>

				{/* Invoices Table */}
				{filteredInvoices.length === 0 ? (
					<EmptyState
						icon={<FileText className="w-12 h-12" />}
						title="No Invoices"
						description={searchTerm || statusFilter !== 'all' ? 'No invoices match your search or filter criteria' : 'No invoices have been created yet'}
						action={
							searchTerm || statusFilter !== 'all' ? (
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										setSearchTerm('');
										setStatusFilter('all');
									}}
								>
									Clear Filters
								</Button>
							) : undefined
						}
					/>
				) : (
					<DataTable
						data={invoiceRows}
						columns={invoiceColumns}
						keyField="id"
						selectable={isAdmin}
						onRowClick={(row) => router.push(`/dashboard/invoices/${row.id}`)}
						onDelete={isAdmin ? handleBulkDelete : undefined}
						onExport={isAdmin ? handleBulkExport : undefined}
						bulkStatusOptions={invoiceStatusOptions}
						onBulkStatusChange={isAdmin ? handleBulkStatusUpdate : undefined}
					/>
				)}
			</DashboardPanel>

				{/* Pagination Controls */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-color)'}}>
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px'}}>
						{/* Items per page selector */}
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '16px'}}>
							<span style={{ fontSize: '0.875rem' }}>Items per page:</span>
							<div style={{minWidth: '80px'}}><BareSelect options={[{ value: 10, label: '10' }, { value: 25, label: '25' }, { value: 50, label: '50' }, { value: 100, label: '100' }]} value={itemsPerPage} size="small" onChange={(e) => handleItemsPerPageChange(Number(e.target.value))} /></div>
						</JXBox>

						{/* Pagination info and controls */}
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '16px'}}>
							<span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
								{pagination.total === 0
									? 'Showing 0 of 0 invoices'
									: `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, pagination.total)} of ${pagination.total} invoices`}
							</span>
						</JXBox>

						{/* Page Navigation */}
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center'}}>
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage === 1 || loading}
								onClick={() => handlePageChange(currentPage - 1)}
							>
								← Previous
							</Button>

							{/* Page Numbers */}
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center'}}>
								{Array.from({ length: Math.min(5, Math.ceil(pagination.total / itemsPerPage)) }).map((_, index) => {
									const totalPages = Math.ceil(pagination.total / itemsPerPage);
									let pageNum = index + 1;

									// Show pages around current page
									if (currentPage > 3 && index === 0) {
										pageNum = 1;
									} else if (currentPage > 3) {
										pageNum = currentPage - 2 + index;
									}

									if (pageNum > totalPages) return null;

									return (
										<Button
											key={pageNum}
											variant={pageNum === currentPage ? 'primary' : 'outline'}
											size="sm"
											disabled={loading}
											onClick={() => handlePageChange(pageNum)}
											style={{minWidth: '32px'}}
										>
											{pageNum}
										</Button>
									);
								})}
							</JXBox>

							<Button
								variant="outline"
								size="sm"
								disabled={currentPage >= Math.ceil(pagination.total / itemsPerPage) || loading}
								onClick={() => handlePageChange(currentPage + 1)}
							>
								Next →
							</Button>
						</JXBox>
					</JXBox>
				</JXBox>

				{/* Slide-over Quick Peek Drawer */}
				<InvoiceQuickPeek
					invoiceId={quickPeekInvoiceId}
					open={Boolean(quickPeekInvoiceId)}
					onClose={() => setQuickPeekInvoiceId(null)}
				/>

				{/* Interactive Invoice PDF Preview Modal */}
				<InvoicePreviewModal
					open={Boolean(previewInvoice)}
					invoiceId={previewInvoice?.id || null}
					invoiceNumber={previewInvoice?.invoiceNumber}
					customerName={previewInvoice?.customerName}
					totalAmount={previewInvoice?.totalAmount}
					status={previewInvoice?.status}
					onClose={() => setPreviewInvoice(null)}
				/>

				{/* Row actions menu (Round 3 F5) — fixed-position so it is never
				    clipped by the table scroller; closes on backdrop click,
				    Escape, or after picking an action. */}
				{actionMenu && (() => {
					const menuRow = invoiceRows.find((r) => r.id === actionMenu.rowId);
					if (!menuRow) return null;
					const menuItems = [
						{
							label: 'Preview',
							icon: <Eye className="w-4 h-4 text-[var(--accent-gold)]" />,
							onSelect: () => setPreviewInvoice({
								id: menuRow.id,
								invoiceNumber: menuRow.invoiceNumber,
								customerName: menuRow.customer,
								totalAmount: menuRow.total,
								status: menuRow.status,
							}),
						},
						{
							label: 'Peek',
							icon: <PanelRightOpen className="w-4 h-4" />,
							onSelect: () => setQuickPeekInvoiceId(menuRow.id),
						},
						{
							label: 'View',
							icon: <ExternalLink className="w-4 h-4" />,
							onSelect: () => router.push(`/dashboard/invoices/${menuRow.id}`),
						},
						{
							label: 'PDF',
							icon: <Download className="w-4 h-4" />,
							onSelect: () => {
								const inv = invoices.find((i) => i.id === menuRow.id);
								if (inv) handleDownloadPDF(inv);
							},
						},
					];
					return (
						<>
							<div
								className="fixed inset-0 z-[1050]"
								aria-hidden="true"
								onClick={() => setActionMenu(null)}
							/>
							<div
								role="menu"
								aria-label={`Actions for ${menuRow.invoiceNumber}`}
								className="fixed z-[1051] w-[200px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--panel)] p-1 shadow-[0_16px_40px_rgba(0,0,0,0.16)]"
								style={{ top: actionMenu.top, left: actionMenu.left }}
							>
								{menuItems.map((item) => (
									<button
										key={item.label}
										type="button"
										role="menuitem"
										className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--background)]"
										onClick={() => {
											setActionMenu(null);
											item.onSelect();
										}}
									>
										{item.icon}
										{item.label}
									</button>
								))}
							</div>
						</>
					);
				})()}
		</DashboardSurface>
	);
}

// useSearchParams() must sit under a Suspense boundary or static
// prerendering fails (missing-suspense-with-csr-bailout).
export default function InvoicesPage() {
  return (
    <Suspense fallback={<div aria-busy="true" style={{ minHeight: '50vh' }} />}>
      <InvoicesPageContent />
    </Suspense>
  );
}
