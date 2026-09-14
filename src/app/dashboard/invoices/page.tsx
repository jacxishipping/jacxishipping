'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';
import Link from 'next/link';
import { 
	Box, 
	Table, 
	TableBody, 
	TableCell, 
	TableContainer, 
	TableHead, 
	TableRow,
	Chip,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
	TextField,
	InputAdornment,
} from '@mui/material';
import {
	FileText,
	Search,
	Download,
	Eye,
	Calendar,
	DollarSign,
	User,
	Package,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
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
} from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { exportToCSVWithHeaders } from '@/lib/export';

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

export default function InvoicesPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: session } = useSession();
	const [invoices, setInvoices] = useState<Invoice[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [showBulkTable, setShowBulkTable] = useState(false);
	const [backfillingCharges, setBackfillingCharges] = useState(false);
	const [itemsPerPage, setItemsPerPage] = useState(25);
	const [currentPage, setCurrentPage] = useState(1);
	const [pagination, setPagination] = useState({ total: 0, totalAll: 0, limit: 25, offset: 0, hasMore: false });

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

	const invoiceColumns: Column<InvoiceTableRow>[] = [
		{ key: 'invoiceNumber', header: 'Invoice #', sortable: true },
		...(isAdmin ? [{ key: 'customer', header: 'Customer', sortable: true }] : []),
		{
			key: 'reference',
			header: 'Shipment / Container',
			render: (value, row) => {
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
			},
		},
		{
			key: 'issueDate',
			header: 'Issue Date',
			sortable: true,
			render: (value) => formatDate(String(value)),
		},
		{
			key: 'dueDate',
			header: 'Due Date',
			render: (value) => formatDate(value ? String(value) : null),
		},
		{
			key: 'status',
			header: 'Status',
			render: (value) => <StatusBadge status={String(value)} size="sm" />,
		},
		{
			key: 'reversedAt',
			header: 'Reversed',
			render: (value, row) => {
				if (!row.reversedAt) {
					return <span className="text-[var(--text-secondary)]">-</span>;
				}
				return (
					<span style={{ fontSize: '0.8rem' }}>
						{formatDate(String(row.reversedAt))}
						{row.reversedByLabel ? (
							<Box component="span" sx={{ display: 'block', color: 'var(--text-secondary)' }}>
								by {row.reversedByLabel}
							</Box>
						) : null}
					</span>
				);
			},
		},
		{
			key: 'total',
			header: 'Total',
			render: (value) => formatCurrency(Number(value)),
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
		<Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 3 } }}>
			{/* Breadcrumbs */}
			<Breadcrumbs
				items={[
					{ label: 'Dashboard', href: '/dashboard' },
					{ label: isAdmin ? 'All Invoices' : 'My Invoices', href: '#' },
				]}
			/>

			{/* Page Header */}
			<PageHeader
				title={isAdmin ? 'All Invoices' : 'My Invoices'}
				description={isAdmin ? 'Manage customer invoices' : 'View and download your invoices'}
				actions={
					isAdmin ? (
						<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
							<Button variant="outline" onClick={handleBackfillShipmentCharges} disabled={backfillingCharges}>
								{backfillingCharges ? 'Backfilling...' : 'Backfill Shipment Charges'}
							</Button>
							<Button variant="outline" onClick={() => setShowBulkTable((prev) => !prev)}>
								{showBulkTable ? 'Table view' : 'Bulk mode'}
							</Button>
						</Box>
					) : null
				}
			/>

			{/* Stats Cards */}
			<Box sx={{ 
				display: 'grid', 
				gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, 
				gap: 3, 
				mb: 3 
			}}>
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
			</Box>

			<DashboardPanel title="Invoice Health" description="Jump straight to the invoice queue that needs attention.">
				<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.25fr 1fr' }, gap: 2 }}>
					<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
						{quickStatusFilters.map((filter) => {
							const active = statusFilter === filter.value;
							return (
								<Button
									key={filter.value}
									variant={active ? 'primary' : 'outline'}
									size="sm"
									onClick={() => setStatusFilter(filter.value)}
								>
									{filter.label} ({filter.count})
								</Button>
							);
						})}
					</Box>
					<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 1 }}>
						{[
							{ label: 'Open Amount', value: formatCurrency(Math.max(stats.totalAmount - stats.paidAmount, 0)) },
							{ label: 'Paid Amount', value: formatCurrency(stats.paidAmount) },
							{ label: 'Visible Total', value: formatCurrency(stats.totalAmount) },
						].map((item) => (
							<Box key={item.label} sx={{ p: 1.25, borderRadius: 1.5, border: '1px solid var(--border)', background: 'var(--background)' }}>
								<Box sx={{ fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800 }}>{item.label}</Box>
								<Box sx={{ mt: 0.25, fontWeight: 800, color: 'var(--text-primary)' }}>{item.value}</Box>
							</Box>
						))}
					</Box>
				</Box>
			</DashboardPanel>

			{/* Main Content */}
			<DashboardSurface>
				<DashboardPanel 
					title="Invoices"
					description={customerFilterUserId ? `${pagination.total} invoice(s) for ${customerFilterLabel}` : `${pagination.total} invoice(s)`}
				>
					{customerFilterUserId ? (
						<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', mb: 3, p: 2, border: '1px solid var(--border)', borderRadius: 2, background: 'var(--panel)' }}>
							<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
								<User className="w-4 h-4" />
								<Box>
									<Box sx={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Customer Filter</Box>
									<Box sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{customerFilterLabel}</Box>
								</Box>
							</Box>
							<Button variant="outline" size="sm" onClick={() => router.push('/dashboard/invoices')}>
								Clear Filter
							</Button>
						</Box>
					) : null}

					{/* Filters */}
					<Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
						<TextField
							placeholder="Search by invoice #, customer, VIN, vehicle, or container..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							size="small"
							sx={{ flex: 1, minWidth: '250px' }}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<Search className="w-4 h-4" />
									</InputAdornment>
								),
							}}
						/>
						<FormControl size="small" sx={{ minWidth: 150 }}>
							<InputLabel>Status</InputLabel>
							<Select
								value={statusFilter}
								label="Status"
								onChange={(e) => setStatusFilter(e.target.value)}
							>
								<MenuItem value="all">All Status</MenuItem>
								<MenuItem value="draft">Draft</MenuItem>
								<MenuItem value="pending">Pending</MenuItem>
								<MenuItem value="sent">Sent</MenuItem>
								<MenuItem value="paid">Paid</MenuItem>
								<MenuItem value="overdue">Overdue</MenuItem>
								<MenuItem value="cancelled">Cancelled / Reversed</MenuItem>
							</Select>
						</FormControl>
					</Box>

					{/* Invoices Table */}
					{filteredInvoices.length === 0 ? (
						<EmptyState
							icon={<FileText className="w-12 h-12" />}
							title="No Invoices"
							description={searchTerm ? 'No invoices match your search' : 'No invoices have been created yet'}
						/>
					) : showBulkTable ? (
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
					) : (
						<TableContainer>
							<Table size="small">
								<TableHead>
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }}>Invoice #</TableCell>
										{isAdmin && <TableCell sx={{ fontWeight: 600 }}>Customer</TableCell>}
										<TableCell sx={{ fontWeight: 600 }}>Shipment / Container</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Issue Date</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Due Date</TableCell>
										<TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="right">Total</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{filteredInvoices.map((invoice) => {
										const statusInfo = statusConfig[invoice.status] || { label: invoice.status, color: 'default' };
										return (
											<TableRow key={invoice.id} hover>
												<TableCell sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
													{invoice.invoiceNumber}
												</TableCell>
												{isAdmin && (
													<TableCell>
														<Box>
															<Box sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
																{invoice.user.name || 'N/A'}
															</Box>
															<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
																{invoice.user.email}
															</Box>
														</Box>
													</TableCell>
												)}
												<TableCell>
													{invoice.container ? (
														<Link 
															href={`/dashboard/containers/${invoice.containerId}`}
															style={{ 
																color: 'var(--accent-gold)', 
																textDecoration: 'none',
																fontFamily: 'monospace',
																fontWeight: 600,
															}}
														>
															{invoice.container.containerNumber}
														</Link>
													) : invoice.shipment ? (
														<Link
															href={`/dashboard/shipments/${invoice.shipment.id}`}
															style={{ color: 'var(--accent-gold)', textDecoration: 'none', fontWeight: 600 }}
														>
															{[invoice.shipment.vehicleYear, invoice.shipment.vehicleMake, invoice.shipment.vehicleModel].filter(Boolean).join(' ') || invoice.shipment.vehicleType}
														</Link>
													) : 'N/A'}
												</TableCell>
												<TableCell>{formatDate(invoice.issueDate)}</TableCell>
												<TableCell>{formatDate(invoice.dueDate)}</TableCell>
												<TableCell>
													<Chip 
														label={statusInfo.label} 
														size="small"
														color={statusInfo.color}
														sx={{ fontSize: '0.75rem' }}
													/>
												</TableCell>
												<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
													{formatCurrency(invoice.total)}
												</TableCell>
												<TableCell align="right">
													<Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
														<Button
															variant="outline"
															size="sm"
															icon={<Eye className="w-3 h-3" />}
															onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
														>
															View
														</Button>
														<Button
															variant="outline"
															size="sm"
															icon={<Download className="w-3 h-3" />}
															onClick={() => handleDownloadPDF(invoice)}
														>
															PDF
														</Button>
													</Box>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</TableContainer>
					)}
				</DashboardPanel>

				{/* Pagination Controls */}
				<Box sx={{ mt: 4, pt: 3, borderTop: '1px solid var(--border-color)' }}>
					<Box sx={{ 
						display: 'flex', 
						justifyContent: 'space-between', 
						alignItems: 'center',
						flexWrap: 'wrap',
						gap: 2,
						mb: 3
					}}>
						{/* Items per page selector */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
							<span style={{ fontSize: '0.875rem' }}>Items per page:</span>
							<FormControl size="small" sx={{ minWidth: 80 }}>
								<Select
									value={itemsPerPage}
									onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
								>
									<MenuItem value={10}>10</MenuItem>
									<MenuItem value={25}>25</MenuItem>
									<MenuItem value={50}>50</MenuItem>
									<MenuItem value={100}>100</MenuItem>
								</Select>
							</FormControl>
						</Box>

						{/* Pagination info and controls */}
						<Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
							<span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
								{pagination.total === 0
									? 'Showing 0 of 0 invoices'
									: `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, pagination.total)} of ${pagination.total} invoices`}
							</span>
						</Box>

						{/* Page Navigation */}
						<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
							<Button
								variant="outline"
								size="sm"
								disabled={currentPage === 1 || loading}
								onClick={() => handlePageChange(currentPage - 1)}
							>
								← Previous
							</Button>

							{/* Page Numbers */}
							<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
											sx={{ minWidth: '32px' }}
										>
											{pageNum}
										</Button>
									);
								})}
							</Box>

							<Button
								variant="outline"
								size="sm"
								disabled={currentPage >= Math.ceil(pagination.total / itemsPerPage) || loading}
								onClick={() => handlePageChange(currentPage + 1)}
							>
								Next →
							</Button>
						</Box>
					</Box>
				</Box>
			</DashboardSurface>
		</Box>
	);
}