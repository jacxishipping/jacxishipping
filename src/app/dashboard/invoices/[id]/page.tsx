'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';
import { 
	Box, 
	Table, 
	TableBody, 
	TableCell, 
	TableContainer, 
	TableHead, 
	TableRow,
	Divider,
	Chip,
	MenuItem,
	Select,
	FormControl,
	InputLabel,
	TextField,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
} from '@mui/material';
import {
	ArrowLeft,
	FileText,
	Package,
	User,
	Download,
	Check,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { 
	PageHeader,
	Button, 
	Breadcrumbs, 
	toast, 
	EmptyState, 
	DetailPageSkeleton,
} from '@/components/design-system';
import { AdminRoute } from '@/components/auth/AdminRoute';

interface LineItem {
	id: string;
	description: string;
	type: string;
	quantity: number;
	unitPrice: number;
	amount: number;
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
	shipment?: {
		id: string;
		vehicleType: string;
		vehicleMake: string | null;
		vehicleModel: string | null;
		vehicleYear: number | null;
		vehicleVIN: string | null;
		vehicleColor: string | null;
	};
}

interface Invoice {
	id: string;
	invoiceNumber: string;
	userId: string;
	containerId: string | null;
	shipmentId: string | null;
	status: string;
	issueDate: string;
	dueDate: string | null;
	paidDate: string | null;
	subtotal: number;
	tax: number;
	discount: number;
	total: number;
	paymentMethod: string | null;
	paymentReference: string | null;
	notes: string | null;
	internalNotes: string | null;
	user: {
		id: string;
		name: string | null;
		email: string;
		phone: string | null;
		address: string | null;
		city: string | null;
		country: string | null;
	};
	container: {
		id: string;
		containerNumber: string;
		trackingNumber: string | null;
		status: string;
		vesselName: string | null;
		loadingPort: string | null;
		destinationPort: string | null;
		estimatedArrival: string | null;
	} | null;
	shipment: {
		id: string;
		vehicleType: string;
		vehicleMake: string | null;
		vehicleModel: string | null;
		vehicleYear: number | null;
		vehicleVIN: string | null;
		vehicleColor: string | null;
		status: string;
		paymentStatus: string | null;
	} | null;
	lineItems: LineItem[];
	auditLogs?: Array<{
		id: string;
		action: string;
		description: string;
		performedBy: string;
		oldValue?: string | null;
		newValue?: string | null;
		timestamp: string;
		metadata?: Record<string, unknown> | null;
	}>;
}

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
	DRAFT: { label: 'Draft', color: 'default' },
	PENDING: { label: 'Pending', color: 'warning' },
	SENT: { label: 'Sent', color: 'info' },
	PAID: { label: 'Paid', color: 'success' },
	OVERDUE: { label: 'Overdue', color: 'error' },
	CANCELLED: { label: 'Cancelled', color: 'default' },
};

export default function InvoiceDetailPage() {
	const params = useParams();
	const router = useRouter();
	const { data: session } = useSession();
	const [invoice, setInvoice] = useState<Invoice | null>(null);
	const [loading, setLoading] = useState(true);
	const [updating, setUpdating] = useState(false);
	const [disputedLineIds, setDisputedLineIds] = useState<Set<string>>(() => new Set());
	const [isEditOpen, setIsEditOpen] = useState(false);
	const [editForm, setEditForm] = useState({
		dueDate: '',
		discount: '0',
		tax: '0',
		paymentMethod: '',
		paymentReference: '',
		notes: '',
		internalNotes: '',
	});
	const [manualLineItem, setManualLineItem] = useState({
		description: '',
		type: 'OTHER_FEE',
		quantity: '1',
		amount: '0',
		companyAmount: '0',
	});
	const [lineItemEdits, setLineItemEdits] = useState<Record<string, {
		description: string;
		type: string;
		quantity: string;
		amount: string;
		companyAmount: string;
	}>>({});

	const isAdmin = hasPermission(session?.user?.role, 'invoices:manage');

	useEffect(() => {
		fetchInvoice();
	}, [params.id]);

	useEffect(() => {
		if (!invoice) return;
		setLineItemEdits(
			Object.fromEntries(
				invoice.lineItems.map((item) => [
					item.id,
					{
						description: item.description,
						type: item.type,
						quantity: String(item.quantity ?? 1),
						amount: String(item.amount ?? 0),
						companyAmount: String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
					},
				])
			)
		);
	}, [invoice]);

	const fetchInvoice = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/invoices/${params.id}`);
			const data = await response.json();

			if (response.ok) {
				setInvoice(data);
			} else {
				toast.error('Failed to load invoice');
			}
		} catch (error) {
			console.error('Error fetching invoice:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handleDisputeLine = async (line: { id: string; description: string; amount: number }, shipmentId: string | null) => {
		if (!invoice) return;
		const reason = window.prompt(
			`Why are you disputing "${line.description}"?\n\nPlease describe the issue briefly so our team can review it.`,
		);
		if (!reason) return;
		const trimmedReason = reason.trim();
		if (trimmedReason.length < 5) {
			toast.error('Please describe the reason in a few words');
			return;
		}

		try {
			const response = await fetch(`/api/invoices/${invoice.id}/dispute`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shipmentId,
					description: line.description,
					amount: line.amount,
					reason: trimmedReason,
				}),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || 'Failed to submit dispute');
			toast.success('Dispute submitted', { description: 'Our team will review it and reply shortly.' });
			setDisputedLineIds((current) => {
				const next = new Set(current);
				next.add(line.id);
				return next;
			});
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to submit dispute');
		}
	};

	const openInvoiceEditor = () => {
		if (!invoice) return;
		setEditForm({
			dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().slice(0, 10) : '',
			discount: String(invoice.discount ?? 0),
			tax: String(invoice.tax ?? 0),
			paymentMethod: invoice.paymentMethod ?? '',
			paymentReference: invoice.paymentReference ?? '',
			notes: invoice.notes ?? '',
			internalNotes: invoice.internalNotes ?? '',
		});
		setManualLineItem({ description: '', type: 'OTHER_FEE', quantity: '1', amount: '0', companyAmount: '0' });
		setIsEditOpen(true);
	};

	const handleAddManualLineItem = async () => {
		if (!invoice) return;

		const description = manualLineItem.description.trim();
		const quantity = Number(manualLineItem.quantity || 1);
		const amount = Number(manualLineItem.amount || 0);
		const companyAmount = Number(manualLineItem.companyAmount || 0);

		if (!description) {
			toast.error('Expense description is required');
			return;
		}
		if (!Number.isFinite(quantity) || quantity <= 0) {
			toast.error('Quantity must be greater than zero');
			return;
		}
		if (!Number.isFinite(amount) || amount < 0) {
			toast.error('Expense amount must be a valid non-negative number');
			return;
		}
		if (!Number.isFinite(companyAmount) || companyAmount < 0) {
			toast.error('Company amount must be a valid non-negative number');
			return;
		}
		if (companyAmount > amount) {
			toast.error('Company amount cannot exceed the expense amount');
			return;
		}

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${invoice.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lineItems: [{
						action: 'add',
						description,
						type: manualLineItem.type,
						quantity,
						amount,
						companyAmount,
					}],
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.error || 'Failed to add expense line');

			toast.success('Expense line added');
			setManualLineItem({ description: '', type: 'OTHER_FEE', quantity: '1', amount: '0', companyAmount: '0' });
			await fetchInvoice();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add expense line');
		} finally {
			setUpdating(false);
		}
	};

	const handleRemoveLineItem = async (lineItemId: string) => {
		if (!invoice) return;

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${invoice.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lineItems: [{ action: 'remove', id: lineItemId }],
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.error || 'Failed to remove expense line');

			toast.success('Expense line removed');
			await fetchInvoice();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to remove expense line');
		} finally {
			setUpdating(false);
		}
	};

	const resetLineItemEdit = (lineItemId: string) => {
		if (!invoice) return;
		const item = invoice.lineItems.find((entry) => entry.id === lineItemId);
		if (!item) return;

		setLineItemEdits((current) => ({
			...current,
			[lineItemId]: {
				description: item.description,
				type: item.type,
				quantity: String(item.quantity ?? 1),
				amount: String(item.amount ?? 0),
				companyAmount: String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
			},
		}));
	};

	const resetAllLineItemEdits = () => {
		if (!invoice) return;
		setLineItemEdits(
			Object.fromEntries(
				invoice.lineItems.map((item) => [
					item.id,
					{
						description: item.description,
						type: item.type,
						quantity: String(item.quantity ?? 1),
						amount: String(item.amount ?? 0),
						companyAmount: String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
					},
				])
			)
		);
	};

	const handleUpdateLineItem = async (lineItemId: string) => {
		if (!invoice) return;
		const edit = lineItemEdits[lineItemId];
		if (!edit) return;

		const description = edit.description.trim();
		const quantity = Number(edit.quantity || 1);
		const amount = Number(edit.amount || 0);
		const companyAmount = Number(edit.companyAmount || 0);

		if (!description) {
			toast.error('Expense description is required');
			return;
		}
		if (!Number.isFinite(quantity) || quantity < 0) {
			toast.error('Quantity must be a valid non-negative number');
			return;
		}
		if (!Number.isFinite(amount) || amount < 0) {
			toast.error('Amount must be a valid non-negative number');
			return;
		}
		if (!Number.isFinite(companyAmount) || companyAmount < 0) {
			toast.error('Company amount must be a valid non-negative number');
			return;
		}
		if (companyAmount > amount) {
			toast.error('Company amount cannot exceed the expense amount');
			return;
		}

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${invoice.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					lineItems: [{
						action: 'update',
						id: lineItemId,
						description,
						type: edit.type,
						quantity,
						amount,
						companyAmount,
					}],
				}),
			});

			const payload = await response.json().catch(() => ({}));
			if (!response.ok) throw new Error(payload.error || 'Failed to update expense line');

			toast.success('Expense line updated');
			await fetchInvoice();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update expense line');
		} finally {
			setUpdating(false);
		}
	};

	const handleInvoiceEdit = async () => {
		if (!invoice) return;

		const discount = Number(editForm.discount);
		const tax = Number(editForm.tax);
		if (!Number.isFinite(discount) || !Number.isFinite(tax) || discount < 0 || tax < 0) {
			toast.error('Discount and tax must be valid non-negative numbers');
			return;
		}

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					dueDate: editForm.dueDate || null,
					discount,
					tax,
					paymentMethod: editForm.paymentMethod || null,
					paymentReference: editForm.paymentReference || null,
					notes: editForm.notes || null,
					internalNotes: editForm.internalNotes || null,
				}),
			});

			if (response.ok) {
				toast.success('Invoice updated successfully');
				setIsEditOpen(false);
				await fetchInvoice();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to update invoice');
			}
		} catch (error) {
			console.error('Error updating invoice:', error);
			toast.error('An error occurred while saving the invoice');
		} finally {
			setUpdating(false);
		}
	};

	const handleStatusUpdate = async (newStatus: string) => {
		if (!invoice) return;

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});

			if (response.ok) {
				toast.success('Status updated successfully');
				fetchInvoice();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to update status');
			}
		} catch (error) {
			console.error('Error updating status:', error);
			toast.error('An error occurred');
		} finally {
			setUpdating(false);
		}
	};

	const handleMarkAsPaid = async () => {
		if (!invoice) return;

		try {
			setUpdating(true);
			const response = await fetch(`/api/invoices/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ 
					status: 'PAID',
					paidDate: new Date().toISOString(),
				}),
			});

			if (response.ok) {
				toast.success('Invoice marked as paid');
				fetchInvoice();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to update invoice');
			}
		} catch (error) {
			console.error('Error marking as paid:', error);
			toast.error('An error occurred');
		} finally {
			setUpdating(false);
		}
	};

	const handleDownloadPDF = async () => {
		if (!invoice) return;
		try {
			const { downloadInvoicePDF } = await import('@/lib/utils/generateInvoicePDF');
			await downloadInvoicePDF(invoice);
		} catch (error) {
			console.error('PDF generation error:', error);
			toast.error('Failed to generate PDF');
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

	const getLineItemTypeLabel = (item: LineItem) => {
		if (item.type === 'DISCOUNT' && /damage/i.test(item.description)) {
			return 'DAMAGE CREDIT';
		}
		return item.type.replace(/_/g, ' ');
	};

	const getExpenseShortLabel = (item: LineItem): string => {
		const typeMap: Record<string, string> = {
			PURCHASE_PRICE: 'Vehicle Purchase',
			VEHICLE_PRICE: 'Vehicle Purchase',
			SHIPPING_FEE: 'Shipping',
			INSURANCE: 'Insurance',
			CUSTOMS_FEE: 'Customs',
			STORAGE_FEE: 'Storage',
			HANDLING_FEE: 'Handling / Towing',
			OTHER_FEE: 'Other',
			DISCOUNT: 'Discount',
		};
		return typeMap[item.type] ?? item.type.replace(/_/g, ' ');
	};

	const openCompanyLedgerEntry = (entry: NonNullable<LineItem['linkedCompanyLedgerEntry']>) => {
		router.push(`/dashboard/finance/companies/${entry.companyId}?entryId=${entry.id}`);
	};

	// Group line items by shipment
	const groupedLineItems = invoice?.lineItems.reduce((acc, item) => {
		const key = item.shipment?.id || 'other';
		if (!acc[key]) {
			acc[key] = {
				shipment: item.shipment,
				items: [],
			};
		}
		acc[key].items.push(item);
		return acc;
	}, {} as Record<string, { shipment?: LineItem['shipment']; items: LineItem[] }>);

	if (loading) {
		return <DetailPageSkeleton />;
	}

	if (!invoice) {
		return (
			<EmptyState
				icon={<FileText className="w-16 h-16" />}
				title="Invoice Not Found"
				description="The invoice you're looking for doesn't exist or you don't have permission to view it"
			/>
		);
	}

	const statusInfo = statusConfig[invoice.status] || { label: invoice.status, color: 'default' };
	const groupedEntries = Object.entries(groupedLineItems || {});
	const hasMultipleShipmentGroups = groupedEntries.length > 1;
	const purchasePaid = invoice.shipment?.paymentStatus === 'COMPLETED'
		? invoice.lineItems
			.filter((i) => i.type === 'PURCHASE_PRICE' || i.type === 'VEHICLE_PRICE')
			.reduce((sum, i) => sum + i.amount, 0)
		: 0;
	const balanceDue = invoice.total - purchasePaid;

	const viewerIsOwner = Boolean(session?.user?.id && invoice.userId === session.user.id);
	const canViewInvoice = isAdmin || viewerIsOwner;
	const canDisputeLines =
		canViewInvoice && invoice.status !== 'DRAFT' && invoice.status !== 'CANCELLED' && invoice.status !== 'PENDING';

	if (!canViewInvoice) {
		return (
			<Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 3 } }}>
				<EmptyState
					icon={<FileText className="w-16 h-16" />}
					title="Invoice Not Found"
					description="The invoice you're looking for doesn't exist or you don't have permission to view it"
				/>
			</Box>
		);
	}

	return (
		<>
			<Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Edit Invoice</DialogTitle>
				<DialogContent>
					<Box sx={{ display: 'grid', gap: 2, mt: 1 }}>
						<TextField
							label="Due Date"
							type="date"
							value={editForm.dueDate}
							onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))}
							InputLabelProps={{ shrink: true }}
							fullWidth
						/>
						<TextField
							label="Discount"
							type="number"
							value={editForm.discount}
							onChange={(event) => setEditForm((current) => ({ ...current, discount: event.target.value }))}
							inputProps={{ min: 0, step: '0.01' }}
							fullWidth
						/>
						<TextField
							label="Tax"
							type="number"
							value={editForm.tax}
							onChange={(event) => setEditForm((current) => ({ ...current, tax: event.target.value }))}
							inputProps={{ min: 0, step: '0.01' }}
							fullWidth
						/>
						<TextField
							label="Payment Method"
							value={editForm.paymentMethod}
							onChange={(event) => setEditForm((current) => ({ ...current, paymentMethod: event.target.value }))}
							fullWidth
						/>
						<TextField
							label="Payment Reference"
							value={editForm.paymentReference}
							onChange={(event) => setEditForm((current) => ({ ...current, paymentReference: event.target.value }))}
							fullWidth
						/>
						<TextField
							label="Customer Notes"
							value={editForm.notes}
							onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))}
							multiline
							rows={3}
							fullWidth
						/>
						<TextField
							label="Internal Notes"
							value={editForm.internalNotes}
							onChange={(event) => setEditForm((current) => ({ ...current, internalNotes: event.target.value }))}
							multiline
							rows={3}
							fullWidth
						/>
						<Box sx={{ border: '1px solid var(--border)', borderRadius: 1, p: 2, display: 'grid', gap: 2 }}>
							<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
																													<Box sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Existing Expense Lines</Box>
																													<Button variant="outline" size="sm" onClick={resetAllLineItemEdits} disabled={updating || invoice.lineItems.length === 0}>Reset all</Button>
																												</Box>
							{invoice.lineItems.length === 0 ? (
								<Box sx={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No expense lines yet.</Box>
							) : (
								<Box sx={{ display: 'grid', gap: 2 }}>
									{invoice.lineItems.map((item) => (
										<Box key={item.id} sx={{ border: '1px solid var(--border)', borderRadius: 1, p: 1.5, display: 'grid', gap: 1.5 }}>
											<TextField
												label="Description"
												value={lineItemEdits[item.id]?.description ?? item.description}
												onChange={(event) => setLineItemEdits((current) => ({
													...current,
													[item.id]: {
														type: current[item.id]?.type ?? item.type,
														quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
														amount: current[item.id]?.amount ?? String(item.amount ?? 0),
														companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
														description: event.target.value,
													},
												}))}
												fullWidth
											/>
											<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 2 }}>
												<FormControl fullWidth size="small">
													<InputLabel>Type</InputLabel>
													<Select
														value={lineItemEdits[item.id]?.type ?? item.type}
														onChange={(event) => setLineItemEdits((current) => ({
														...current,
														[item.id]: {
															description: current[item.id]?.description ?? item.description,
															type: event.target.value,
															quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
															amount: current[item.id]?.amount ?? String(item.amount ?? 0),
															companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
														},
													}))}
													>
														<MenuItem value="OTHER_FEE">Other Fee</MenuItem>
														<MenuItem value="SHIPPING_FEE">Shipping</MenuItem>
														<MenuItem value="INSURANCE">Insurance</MenuItem>
														<MenuItem value="CUSTOMS_FEE">Customs</MenuItem>
														<MenuItem value="STORAGE_FEE">Storage</MenuItem>
														<MenuItem value="HANDLING_FEE">Handling</MenuItem>
													</Select>
												</FormControl>
												<TextField
													label="Qty"
													type="number"
													value={lineItemEdits[item.id]?.quantity ?? String(item.quantity ?? 1)}
													onChange={(event) => setLineItemEdits((current) => ({
													...current,
													[item.id]: {
														description: current[item.id]?.description ?? item.description,
														type: current[item.id]?.type ?? item.type,
														quantity: event.target.value,
														amount: current[item.id]?.amount ?? String(item.amount ?? 0),
														companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
													},
												}))}
													inputProps={{ min: 0, step: '1' }}
												/>
											</Box>
											<TextField
												label="Amount"
												type="number"
												value={lineItemEdits[item.id]?.amount ?? String(item.amount ?? 0)}
												onChange={(event) => setLineItemEdits((current) => ({
												...current,
												[item.id]: {
													description: current[item.id]?.description ?? item.description,
													type: current[item.id]?.type ?? item.type,
													quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
													amount: event.target.value,
													companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
												},
											}))}
												inputProps={{ min: 0, step: '0.01' }}
												fullWidth
											/>
											<TextField
												label="Company Amount"
												type="number"
												value={lineItemEdits[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0)}
												onChange={(event) => setLineItemEdits((current) => ({
													...current,
													[item.id]: {
														description: current[item.id]?.description ?? item.description,
														type: current[item.id]?.type ?? item.type,
														quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
														amount: current[item.id]?.amount ?? String(item.amount ?? 0),
														companyAmount: event.target.value,
													},
												}))}
												inputProps={{ min: 0, step: '0.01' }}
												fullWidth
												/>
											<Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
												<Button variant="outline" size="sm" onClick={() => resetLineItemEdit(item.id)} disabled={updating}>Reset</Button>
																																																																<Button variant="outline" size="sm" onClick={() => void handleUpdateLineItem(item.id)} disabled={updating}>Save</Button>
												<Button variant="outline" size="sm" color="error" onClick={() => void handleRemoveLineItem(item.id)} disabled={updating}>Remove</Button>
											</Box>
										</Box>
									))}
								</Box>
							)}
							<Box sx={{ borderTop: '1px solid var(--border)', pt: 2, display: 'grid', gap: 2 }}>
								<Box sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Add Expense Line</Box>
								<TextField
									label="Description"
									value={manualLineItem.description}
									onChange={(event) => setManualLineItem((current) => ({ ...current, description: event.target.value }))}
									fullWidth
								/>
								<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 2 }}>
									<FormControl fullWidth size="small">
										<InputLabel>Type</InputLabel>
										<Select
											value={manualLineItem.type}
											onChange={(event) => setManualLineItem((current) => ({ ...current, type: event.target.value }))}
										>
											<MenuItem value="OTHER_FEE">Other Fee</MenuItem>
											<MenuItem value="SHIPPING_FEE">Shipping</MenuItem>
											<MenuItem value="INSURANCE">Insurance</MenuItem>
											<MenuItem value="CUSTOMS_FEE">Customs</MenuItem>
											<MenuItem value="STORAGE_FEE">Storage</MenuItem>
											<MenuItem value="HANDLING_FEE">Handling</MenuItem>
										</Select>
									</FormControl>
									<TextField
										label="Qty"
										type="number"
										value={manualLineItem.quantity}
										onChange={(event) => setManualLineItem((current) => ({ ...current, quantity: event.target.value }))}
										inputProps={{ min: 1, step: '1' }}
									/>
								</Box>
								<TextField
									label="Amount"
									type="number"
									value={manualLineItem.amount}
									onChange={(event) => setManualLineItem((current) => ({ ...current, amount: event.target.value }))}
									inputProps={{ min: 0, step: '0.01' }}
									fullWidth
								/>
										<TextField
											label="Company Amount"
											type="number"
											value={manualLineItem.companyAmount}
											onChange={(event) => setManualLineItem((current) => ({ ...current, companyAmount: event.target.value }))}
											inputProps={{ min: 0, step: '0.01' }}
											fullWidth
										/>
								<Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
									<Button variant="outline" onClick={() => void handleAddManualLineItem()} disabled={updating}>Add Line</Button>
								</Box>
							</Box>
						</Box>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={updating}>Cancel</Button>
					<Button variant="primary" onClick={handleInvoiceEdit} disabled={updating}>{updating ? 'Saving...' : 'Save Changes'}</Button>
				</DialogActions>
			</Dialog>

			<Box sx={{ maxWidth: '1400px', mx: 'auto', p: { xs: 2, md: 3 } }}>
				{/* Breadcrumbs */}
				<Breadcrumbs
					items={[
						{ label: 'Dashboard', href: '/dashboard' },
						{ label: 'Invoices', href: '/dashboard/invoices' },
						...(invoice.container
							? [{ label: invoice.container.containerNumber, href: `/dashboard/containers/${invoice.containerId}` }]
							: invoice.shipment
							? [{ label: [invoice.shipment.vehicleYear, invoice.shipment.vehicleMake, invoice.shipment.vehicleModel].filter(Boolean).join(' ') || 'Shipment', href: `/dashboard/shipments/${invoice.shipmentId}` }]
							: []),
						{ label: invoice.invoiceNumber, href: '#' },
					]}
				/>

				{/* Page Header */}
				<PageHeader
					title={invoice.invoiceNumber}
					description={`Invoice for ${invoice.user.name || invoice.user.email}`}
					actions={
						<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
							<Chip 
								label={statusInfo.label} 
								color={statusInfo.color}
								sx={{ fontWeight: 600 }}
							/>
							{isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
								<Button
									variant="outline"
									size="sm"
									icon={<Check className="w-4 h-4" />}
									onClick={handleMarkAsPaid}
									disabled={updating}
								>
									Mark as Paid
								</Button>
							)}
							{isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
								<Button
									variant="outline"
									size="sm"
									onClick={openInvoiceEditor}
									disabled={updating}
								>
									Edit Invoice
								</Button>
							)}
							<Button
								variant="primary"
								size="sm"
								icon={<Download className="w-4 h-4" />}
								onClick={handleDownloadPDF}
								sx={{
									bgcolor: 'var(--accent-gold)',
									color: 'white',
									'&:hover': {
										bgcolor: 'var(--accent-gold)',
										opacity: 0.9,
									}
								}}
							>
								Download PDF
							</Button>
							<Button
								variant="outline"
								size="sm"
								icon={<ArrowLeft className="w-4 h-4" />}
								onClick={() => router.push(
									invoice.containerId
										? `/dashboard/containers/${invoice.containerId}`
										: invoice.shipmentId
										? `/dashboard/shipments/${invoice.shipmentId}`
										: '/dashboard/invoices'
								)}
							>
								{invoice.containerId ? 'Back to Container' : invoice.shipmentId ? 'Back to Shipment' : 'Back to Invoices'}
							</Button>
						</Box>
					}
				/>

				{/* Main Content */}
				<DashboardSurface>
					<Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
						{/* Invoice Information */}
						<DashboardPanel 
							title="Invoice Details"
							description="Basic invoice information"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Invoice Number</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
										{invoice.invoiceNumber}
									</Box>
								</Box>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Issue Date</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{formatDate(invoice.issueDate)}
									</Box>
								</Box>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Due Date</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{formatDate(invoice.dueDate)}
									</Box>
								</Box>
								{invoice.paidDate && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Paid Date</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)' }}>
											{formatDate(invoice.paidDate)}
										</Box>
									</Box>
								)}
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</Box>
									<Chip 
										label={statusInfo.label} 
										size="small"
										color={statusInfo.color}
										sx={{ fontSize: '0.75rem' }}
									/>
								</Box>
								{isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
									<FormControl fullWidth size="small">
										<InputLabel>Update Status</InputLabel>
										<Select
											value={invoice.status}
											onChange={(e) => handleStatusUpdate(e.target.value)}
											disabled={updating}
										>
											<MenuItem value="DRAFT">Draft</MenuItem>
											<MenuItem value="PENDING">Pending</MenuItem>
											<MenuItem value="SENT">Sent</MenuItem>
											<MenuItem value="PAID">Paid</MenuItem>
											<MenuItem value="CANCELLED">Cancelled</MenuItem>
										</Select>
									</FormControl>
								)}
							</Box>
						</DashboardPanel>

						{/* Customer Information */}
						<DashboardPanel 
							title="Customer"
							description="Customer details"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Name</Box>
									<Box sx={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{invoice.user.name || 'N/A'}
									</Box>
								</Box>
								<Box>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Email</Box>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
										{invoice.user.email}
									</Box>
								</Box>
								{invoice.user.phone && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Phone</Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
											{invoice.user.phone}
										</Box>
									</Box>
								)}
								{invoice.user.address && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)', mb: 0.5 }}>Address</Box>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
											{invoice.user.address}
											{invoice.user.city && `, ${invoice.user.city}`}
											{invoice.user.country && `, ${invoice.user.country}`}
										</Box>
									</Box>
								)}
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Button
									variant="outline"
									size="sm"
									icon={<User className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/customers?search=${invoice.user.email}`)}
								>
									View Customer
								</Button>
							</Box>
						</DashboardPanel>

						{/* Container or Shipment Information */}
						{invoice.container ? (
						<DashboardPanel 
							title="Container"
							description="Shipping container"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Container #</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
										{invoice.container.containerNumber}
									</Box>
								</Box>
								{invoice.container.trackingNumber && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Tracking #</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
											{invoice.container.trackingNumber}
										</Box>
									</Box>
								)}
								{invoice.container.vesselName && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Vessel</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.container.vesselName}
										</Box>
									</Box>
								)}
								{invoice.container.loadingPort && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>From</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.container.loadingPort}
										</Box>
									</Box>
								)}
								{invoice.container.destinationPort && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>To</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.container.destinationPort}
										</Box>
									</Box>
								)}
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Button
									variant="outline"
									size="sm"
									icon={<Package className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/containers/${invoice.containerId}`)}
								>
									View Container
								</Button>
							</Box>
						</DashboardPanel>
						) : invoice.shipment ? (
						<DashboardPanel
							title="Vehicle"
							description="Shipment details"
						>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Vehicle</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{[invoice.shipment.vehicleYear, invoice.shipment.vehicleMake, invoice.shipment.vehicleModel].filter(Boolean).join(' ') || invoice.shipment.vehicleType}
									</Box>
								</Box>
								{invoice.shipment.vehicleVIN && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>VIN</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
											{invoice.shipment.vehicleVIN}
										</Box>
									</Box>
								)}
								{invoice.shipment.vehicleColor && (
									<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
										<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Color</Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
											{invoice.shipment.vehicleColor}
										</Box>
									</Box>
								)}
								<Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
									<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Status</Box>
									<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
										{invoice.shipment.status.replace(/_/g, ' ')}
									</Box>
								</Box>
								<Divider sx={{ borderColor: 'var(--border)' }} />
								<Button
									variant="outline"
									size="sm"
									icon={<Package className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/shipments/${invoice.shipmentId}`)}
								>
									View Shipment
								</Button>
							</Box>
						</DashboardPanel>
						) : null}
					</Box>

					{/* Line Items */}
					<Box sx={{ mt: 3 }}>
						<DashboardPanel 
							title="Line Items"
							description="Detailed breakdown of charges"
						>
						<TableContainer sx={{ border: '1px solid var(--border)', borderRadius: 2 }}>
							<Table
								size="small"
								sx={{
									'& .MuiTableCell-head': {
										bgcolor: 'var(--background)',
										color: 'var(--text-secondary)',
									},
								}}
							>
								<TableHead>
									<TableRow>
										<TableCell sx={{ fontWeight: 600 }} align="left">Description</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="left">Type</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="center">Qty</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="center">Unit Price</TableCell>
										<TableCell sx={{ fontWeight: 600 }} align="center">Amount</TableCell>
									</TableRow>
								</TableHead>
								<TableBody>
									{groupedEntries.map(([key, group]) => (
										<React.Fragment key={key}>
											{group.shipment && hasMultipleShipmentGroups && (
												<TableRow key={`header-${key}`}>
													<TableCell colSpan={5} align="left" sx={{ 
														bgcolor: 'var(--background)', 
														fontWeight: 600,
														fontSize: '0.875rem',
														py: 1,
													}}>
														{group.shipment.vehicleYear} {group.shipment.vehicleMake} {group.shipment.vehicleModel}
														{group.shipment.vehicleVIN && ` (VIN: ${group.shipment.vehicleVIN})`}
													</TableCell>
												</TableRow>
											)}
											{group.items.map((item) => (
													<TableRow key={item.id} hover>
													<TableCell align="left" sx={{ pl: 2, pr: 2 }}>
														<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 1, flexWrap: 'wrap', textAlign: 'left' }}>
															<span>{getExpenseShortLabel(item)}</span>
								{canDisputeLines && !disputedLineIds.has(item.id) && (
									<Button
										variant="outline"
										size="sm"
										onClick={() =>
											void handleDisputeLine(
												{ id: item.id, description: item.description, amount: item.amount },
												group.shipment?.id ?? null,
											)}
										sx={{ minWidth: 'auto', px: 1 }}
									>
										Dispute
									</Button>
								)}
															{(item.type === 'PURCHASE_PRICE' || item.type === 'VEHICLE_PRICE') &&
																invoice.shipment?.paymentStatus === 'COMPLETED' && (
																<Chip
																	label="Purchase Paid"
																	size="small"
																	color="success"
																	sx={{ fontSize: '0.65rem' }}
																/>
															)}
															{isAdmin && item.linkedCompanyLedgerEntry && (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => openCompanyLedgerEntry(item.linkedCompanyLedgerEntry!)}
																	sx={{ minWidth: 'auto', px: 1 }}
																>
																	Company Ledger
																</Button>
															)}
														</Box>
													</TableCell>
													<TableCell align="left">
														<Chip 
															label={getLineItemTypeLabel(item)} 
															size="small"
															sx={{ fontSize: '0.7rem' }}
														/>
													</TableCell>
													<TableCell align="center">{item.quantity}</TableCell>
													<TableCell align="center">{formatCurrency(item.unitPrice)}</TableCell>
													<TableCell align="center" sx={{ fontWeight: 600 }}>
														{formatCurrency(item.amount)}
													</TableCell>
												</TableRow>
											))}
										</React.Fragment>
									))}
									<TableRow>
										<TableCell colSpan={4} align="right" sx={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
											Subtotal
										</TableCell>
										<TableCell align="right" sx={{ fontWeight: 600, borderTop: '2px solid var(--border)' }}>
											{formatCurrency(invoice.subtotal)}
										</TableCell>
									</TableRow>
									{invoice.discount > 0 && (
										<TableRow>
											<TableCell colSpan={4} align="right" sx={{ fontWeight: 600, color: 'var(--success)' }}>
												Discount
											</TableCell>
											<TableCell align="right" sx={{ fontWeight: 600, color: 'var(--success)' }}>
												-{formatCurrency(invoice.discount)}
											</TableCell>
										</TableRow>
									)}
									{invoice.tax > 0 && (
										<TableRow>
											<TableCell colSpan={4} align="right" sx={{ fontWeight: 600 }}>
												Tax
											</TableCell>
											<TableCell align="right" sx={{ fontWeight: 600 }}>
												{formatCurrency(invoice.tax)}
											</TableCell>
										</TableRow>
									)}
									<TableRow>
										<TableCell colSpan={4} align="right" sx={{ 
											fontWeight: 700, 
											fontSize: '1.1rem',
											borderTop: '2px solid var(--border)',
										}}>
											TOTAL
										</TableCell>
										<TableCell align="right" sx={{ 
											fontWeight: 700, 
											fontSize: '1.1rem',
											color: 'var(--accent-gold)',
											borderTop: '2px solid var(--border)',
										}}>
											{formatCurrency(invoice.total)}
										</TableCell>
									</TableRow>
									{purchasePaid > 0 && (
										<>
											<TableRow>
												<TableCell colSpan={4} align="right" sx={{ color: 'var(--success)', fontWeight: 600 }}>
													Purchase Price Already Paid
												</TableCell>
												<TableCell align="right" sx={{ color: 'var(--success)', fontWeight: 600 }}>
													-{formatCurrency(purchasePaid)}
												</TableCell>
											</TableRow>
											<TableRow>
												<TableCell colSpan={4} align="right" sx={{ 
													fontWeight: 700,
													fontSize: '1.1rem',
													borderTop: '2px solid var(--border)',
												}}>
													BALANCE DUE
												</TableCell>
												<TableCell align="right" sx={{ 
													fontWeight: 700,
													fontSize: '1.1rem',
													color: balanceDue > 0 ? 'var(--error, #d32f2f)' : 'var(--success)',
													borderTop: '2px solid var(--border)',
												}}>
													{formatCurrency(balanceDue)}
												</TableCell>
											</TableRow>
										</>
									)}
								</TableBody>
							</Table>
						</TableContainer>
						</DashboardPanel>
					</Box>

					{/* Notes */}
					{(invoice.notes || invoice.internalNotes) && (
						<Box sx={{ mt: 3 }}>
							<DashboardPanel 
								title="Notes"
								description="Additional information"
							>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								{invoice.notes && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 1 }}>
											Customer Notes
										</Box>
										<Box sx={{ 
											p: 2, 
											bgcolor: 'var(--background)', 
											borderRadius: 1,
											fontSize: '0.875rem',
											color: 'var(--text-primary)',
										}}>
											{invoice.notes}
										</Box>
									</Box>
								)}
								{isAdmin && invoice.internalNotes && (
									<Box>
										<Box sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', mb: 1 }}>
											Internal Notes
										</Box>
										<Box sx={{ 
											p: 2, 
											bgcolor: 'rgba(var(--warning-rgb), 0.1)', 
											border: '1px solid rgba(var(--warning-rgb), 0.3)',
											borderRadius: 1,
											fontSize: '0.875rem',
											color: 'var(--text-primary)',
										}}>
											{invoice.internalNotes}
										</Box>
									</Box>
								)}
							</Box>
							</DashboardPanel>
						</Box>
					)}
					<Box sx={{ mt: 3 }}>
						<DashboardPanel
							title="Activity History"
							description="Audit log of invoice creation, updates, and status changes"
						>
							{isAdmin && (
								<ActivityLog logs={invoice.auditLogs || []} />
							)}
						</DashboardPanel>
					</Box>
				</DashboardSurface>
			</Box>
		</>
	);
}