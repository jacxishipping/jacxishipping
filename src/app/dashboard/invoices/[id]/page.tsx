'use client';
import { formatMoney as formatCurrency } from '@/lib/format';
import { JXBox } from '@jacxishippingorg/jx-ui-react';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';
import {
	ArrowLeft,
	FileText,
	Package,
	User,
	Download,
	Check,
	Pencil,
	Plus,
	Trash2,
	RotateCcw,
	DollarSign,
	Calendar,
	CreditCard,
	Tag,
	AlertCircle,
	X,
	Eye,
	Columns2,
	Printer,
	ExternalLink,
	Maximize2,
	Shield,
	Building2,
	Wallet,
} from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import InvoicePreviewModal from '@/components/invoices/InvoicePreviewModal';
import { Breadcrumbs, Button, CopyButton, DetailPageSkeleton, EmptyState, FormField, IconButton, PageHeader, Select, StatusBadge, toast, Modal } from '@/components/design-system';
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
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [isSplitView, setIsSplitView] = useState(() => {
		if (typeof window !== 'undefined') {
			return localStorage.getItem('jacxi.invoice_split_preview') === 'true';
		}
		return false;
	});
	const [pdfRefreshKey, setPdfRefreshKey] = useState(0);
	const [paymentModalOpen, setPaymentModalOpen] = useState(false);
	const [paymentMethod, setPaymentMethod] = useState<'card' | 'bank' | 'wallet'>('card');
	const [paymentProcessing, setPaymentProcessing] = useState(false);

	const toggleSplitView = () => {
		setIsSplitView((prev) => {
			const next = !prev;
			if (typeof window !== 'undefined') {
				localStorage.setItem('jacxi.invoice_split_preview', String(next));
			}
			return next;
		});
	};
	const [editModalTab, setEditModalTab] = useState<'details' | 'items'>('details');
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
				setPdfRefreshKey((k) => k + 1);
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

	const isLineItemDirty = (item: LineItem) => {
		const edit = lineItemEdits[item.id];
		if (!edit) return false;
		const origCompanyAmount = String((item as any).linkedCompanyLedgerEntry?.amount ?? 0);
		return (
			edit.description !== item.description ||
			edit.type !== item.type ||
			edit.quantity !== String(item.quantity ?? 1) ||
			edit.amount !== String(item.amount ?? 0) ||
			edit.companyAmount !== origCompanyAmount
		);
	};

	const hasAnyDirtyLineItems = useMemo(() => {
		if (!invoice?.lineItems) return false;
		return invoice.lineItems.some((item) => isLineItemDirty(item));
	}, [invoice?.lineItems, lineItemEdits]);

	const liveLineItemsSubtotal = useMemo(() => {
		if (!invoice?.lineItems) return 0;
		return invoice.lineItems.reduce((sum, item) => {
			const itemEdit = lineItemEdits[item.id];
			const amount = itemEdit ? parseFloat(itemEdit.amount) || 0 : item.amount;
			const qty = itemEdit ? parseFloat(itemEdit.quantity) || 1 : item.quantity;
			return sum + amount * qty;
		}, 0);
	}, [invoice?.lineItems, lineItemEdits]);

	const liveDiscount = Math.max(0, parseFloat(editForm.discount) || 0);
	const liveTax = Math.max(0, parseFloat(editForm.tax) || 0);
	const liveGrandTotal = Math.max(0, liveLineItemsSubtotal - liveDiscount + liveTax);

	const openInvoiceEditor = (initialTab: 'details' | 'items' = 'details') => {
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
		resetAllLineItemEdits();
		setEditModalTab(initialTab);
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
			<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, maxWidth: '1400px', marginLeft: 'auto', marginRight: 'auto'}} className="p-4 md:p-6">
				<EmptyState
					icon={<FileText className="w-16 h-16" />}
					title="Invoice Not Found"
					description="The invoice you're looking for doesn't exist or you don't have permission to view it"
				/>
			</JXBox>
		);
	}

	return (
		<>
			<Modal
			  open={isEditOpen}
			  onClose={() => setIsEditOpen(false)}
			  title={<><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'}}>
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px'}}>
							<JXBox padding="none" border={false} style={{padding: '8px', borderRadius: '16px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
								<Pencil className="w-5 h-5" />
							</JXBox>
							<div>
								<p className="text-sm leading-relaxed" style={{fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)', lineHeight: 1.2}}>
									Edit Invoice & Charges
								</p>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
									Invoice #{invoice.invoiceNumber} &bull; {invoice.user.name || invoice.user.email}
								</p>
							</div>
						</JXBox>
					</JXBox>

					{/* Navigation Tabs */}
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '16px'}}>
						<div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
							<button
							  key={"details"}
							  type="button"
							  role="tab"
							  aria-selected={editModalTab === "details"}
							  onClick={() => { const val = "details"; setEditModalTab(val); }}
							  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${editModalTab === "details" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
							>
							  {<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
										<FileText className="w-4 h-4" />
										<span>Terms & Payment Details</span>
									</JXBox>}
							</button>
							<button
							  key={"items"}
							  type="button"
							  role="tab"
							  aria-selected={editModalTab === "items"}
							  onClick={() => { const val = "items"; setEditModalTab(val); }}
							  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${editModalTab === "items" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
							>
							  {<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
										<DollarSign className="w-4 h-4" />
										<span>Line Items & Charges ({invoice.lineItems.length})</span>
										{hasAnyDirtyLineItems && (
											<span className="w-2 h-2 rounded-full bg-[var(--accent-gold)] animate-pulse" />
										)}
									</JXBox>}
							</button>
						
						</div>
					</JXBox></>}
			  size="md"
			  contentSx={{backgroundColor: 'var(--panel)', maxHeight: 'calc(80vh - 180px)', overflowY: 'auto'}}
			  actionsSx={{padding: '20px', backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px'}}
			  actions={<>

					{/* Live Totals Bar */}
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap'}}>
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem'}}>
							<span className="text-[var(--text-secondary)]">Subtotal:</span>
							<span className="font-semibold text-[var(--text-primary)]">{formatCurrency(liveLineItemsSubtotal)}</span>
						</JXBox>
						{liveDiscount > 0 && (
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem'}}>
								<span className="text-[var(--text-secondary)]">Discount:</span>
								<span className="font-semibold text-emerald-500">-{formatCurrency(liveDiscount)}</span>
							</JXBox>
						)}
						{liveTax > 0 && (
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem'}}>
								<span className="text-[var(--text-secondary)]">Tax:</span>
								<span className="font-semibold text-[var(--text-primary)]">+{formatCurrency(liveTax)}</span>
							</JXBox>
						)}
						<JXBox padding="none" border={false} style={{display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)', border: '1px solid rgba(var(--accent-gold-rgb), 0.3)', borderRadius: '12px', paddingLeft: '14px', paddingRight: '14px', paddingTop: '4px', paddingBottom: '4px'}}>
							<span className="text-[0.7rem] font-bold uppercase tracking-wider text-[var(--accent-gold)]">Grand Total:</span>
							<span className="text-[0.95rem] font-bold text-[var(--accent-gold)]">{formatCurrency(liveGrandTotal)}</span>
						</JXBox>
					</JXBox>

					{/* Action Buttons */}
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px'}}>
						<Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={updating}>
							Cancel
						</Button>
						<Button 
							variant="primary" 
							onClick={handleInvoiceEdit} 
							disabled={updating}
							style={{backgroundColor: 'var(--accent-gold)', color: 'white'}}
						>
							{updating ? 'Saving...' : 'Save Invoice Details'}
						</Button>
					</JXBox>
			  </>}
			>

					{editModalTab === 'details' ? (
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '8px'}}>
							{/* Section 1: Schedule & Payment */}
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
									<Calendar className="w-4 h-4 text-[var(--accent-gold)]" />
									<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										Schedule & Payment Terms
									</p>
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 grid sm:grid-cols-[1fr_1fr_1fr]">
									<div className="min-w-0 flex-1"><FormField label="Due Date" type="date" value={editForm.dueDate} onChange={(event) => setEditForm((current) => ({ ...current, dueDate: event.target.value }))} InputLabelProps={{ shrink: true }} size="small" /></div>
									<div className="min-w-0 flex-1"><FormField label="Payment Method" placeholder="e.g. Bank Wire, Card, Cash" value={editForm.paymentMethod} onChange={(event) => setEditForm((current) => ({ ...current, paymentMethod: event.target.value }))} size="small" /></div>
									<div className="min-w-0 flex-1"><FormField label="Payment Reference" placeholder="e.g. Wire ID / Cheque #" value={editForm.paymentReference} onChange={(event) => setEditForm((current) => ({ ...current, paymentReference: event.target.value }))} size="small" /></div>
								</JXBox>
							</JXBox>

							<div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{borderColor: 'var(--border)'}} />

							{/* Section 2: Adjustments */}
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
									<DollarSign className="w-4 h-4 text-[var(--accent-gold)]" />
									<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										Discounts & Taxes
									</p>
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 grid sm:grid-cols-[1fr_1fr]">
									<div className="min-w-0 flex-1"><FormField label="Overall Discount" type="number" value={editForm.discount} onChange={(event) => setEditForm((current) => ({ ...current, discount: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} helperText="Deducted directly from line items subtotal" leftIcon="$" size="small" /></div>
									<div className="min-w-0 flex-1"><FormField label="Tax Amount" type="number" value={editForm.tax} onChange={(event) => setEditForm((current) => ({ ...current, tax: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} helperText="Sales tax or VAT applied to total" leftIcon="$" size="small" /></div>
								</JXBox>
							</JXBox>

							<div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{borderColor: 'var(--border)'}} />

							{/* Section 3: Notes & Disclosures */}
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
									<FileText className="w-4 h-4 text-[var(--accent-gold)]" />
									<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										Notes & Disclosures
									</p>
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 grid md:grid-cols-[1fr_1fr]">
									<div className="min-w-0 flex-1"><FormField label="Customer Notes" placeholder="Public notes visible on printed PDF and customer portal" value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} multiline rows={3} helperText="Visible to customer" /></div>
									<div className="min-w-0 flex-1"><FormField label="Internal Notes" placeholder="Private administrative notes (accounting, exceptions, audit log)" value={editForm.internalNotes} onChange={(event) => setEditForm((current) => ({ ...current, internalNotes: event.target.value }))} multiline rows={3} helperText="Visible to staff only" /></div>
								</JXBox>
							</JXBox>
						</JXBox>
					) : (
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '8px'}}>
							{/* Line Items Top Bar */}
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										Active Charge Lines ({invoice.lineItems.length})
									</p>
									<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
										Click 'Save' on any modified row to immediately update that line item.
									</p>
								</JXBox>
								<Button 
									variant="outline" 
									size="sm" 
									icon={<RotateCcw className="w-3.5 h-3.5" />}
									onClick={resetAllLineItemEdits} 
									disabled={updating || invoice.lineItems.length === 0}
								>
									Reset all
								</Button>
							</JXBox>

							{/* Line Items List */}
							{invoice.lineItems.length === 0 ? (
								<JXBox padding="none" border={false} style={{padding: '32px', textAlign: 'center', borderRadius: '16px', border: '1px dashed var(--border)', backgroundColor: 'var(--background)'}}>
									<p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
										No expense lines on this invoice yet. Use the form below to add one.
									</p>
								</JXBox>
							) : (
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
									{invoice.lineItems.map((item) => {
										const isDirty = isLineItemDirty(item);
										const edit = lineItemEdits[item.id];
										const qty = edit ? parseFloat(edit.quantity) || 1 : item.quantity;
										const unitPrice = edit ? parseFloat(edit.amount) || 0 : item.amount;
										const lineTotal = qty * unitPrice;

										return (
											<JXBox padding="none" border={false} key={item.id} style={{border: isDirty ? '1px solid rgba(var(--accent-gold-rgb), 0.6)' : '1px solid var(--border)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: isDirty ? 'rgba(var(--accent-gold-rgb), 0.03)' : 'var(--background)', boxShadow: isDirty ? '0 0 14px rgba(var(--accent-gold-rgb), 0.08)' : 'none', transition: 'all 0.2s ease'}}>
												{/* Item Header */}
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px'}}>
													<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px'}}>
														<JXBox padding="none" border={false} style={{padding: '6px', borderRadius: '12px', backgroundColor: 'var(--panel)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
															<Tag className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
														</JXBox>
														<p className="text-sm leading-relaxed" style={{fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)'}}>
															{item.description || 'Expense Line'}
														</p>
														{isDirty && (
															<StatusBadge 
																status="WARNING"
																label="Unsaved Changes" 
																size="sm" 
															/>
														)}
													</JXBox>
													<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px'}}>
														<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, textAlign: 'right', marginRight: '4px'}}>
															<p className="text-sm leading-relaxed" style={{fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
																Line Total
															</p>
															<p className="text-sm leading-relaxed" style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)'}}>
																{formatCurrency(lineTotal)}
															</p>
														</JXBox>
														{isDirty && (
															<Button 
																variant="outline" 
																size="sm" 
																icon={<RotateCcw className="w-3.5 h-3.5" />}
																onClick={() => resetLineItemEdit(item.id)} 
																disabled={updating}
															>
																Reset
															</Button>
														)}
														<Button 
															variant={isDirty ? 'primary' : 'outline'} 
															size="sm" 
															icon={<Check className="w-3.5 h-3.5" />}
															onClick={() => void handleUpdateLineItem(item.id)} 
															disabled={updating || !isDirty}
															sx={isDirty ? { bgcolor: 'var(--accent-gold)', color: 'white' } : {}}
														>
															Save
														</Button>
														<Button 
															variant="outline" 
															size="sm" 
															color="error" 
															icon={<Trash2 className="w-3.5 h-3.5 text-[var(--error)]" />}
															onClick={() => void handleRemoveLineItem(item.id)} 
															disabled={updating}
															title="Remove Line"
														/>
													</JXBox>
												</JXBox>

												{/* Row 1: Description & Type */}
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px'}} className="grid-cols-1 grid md:grid-cols-[2fr_1.2fr]">
													<div className="min-w-0 flex-1"><FormField label="Description" value={lineItemEdits[item.id]?.description ?? item.description} onChange={(event) => setLineItemEdits((current) => ({
															...current,
															[item.id]: {
																type: current[item.id]?.type ?? item.type,
																quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
																amount: current[item.id]?.amount ?? String(item.amount ?? 0),
																companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
																description: event.target.value,
															},
														}))} size="small" /></div>
													<div className="min-w-0 flex-1"><Select label="Category / Type" options={[{ value: "OTHER_FEE", label: 'Other Fee' }, { value: "SHIPPING_FEE", label: 'Shipping Fee' }, { value: "INSURANCE", label: 'Insurance' }, { value: "CUSTOMS_FEE", label: 'Customs Fee' }, { value: "STORAGE_FEE", label: 'Storage Fee' }, { value: "HANDLING_FEE", label: 'Handling Fee' }]} value={lineItemEdits[item.id]?.type ?? item.type} size="small" onChange={(val) => setLineItemEdits((current) => ({
																...current,
																[item.id]: {
																	description: current[item.id]?.description ?? item.description,
																	type: val as string,
																	quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
																	amount: current[item.id]?.amount ?? String(item.amount ?? 0),
																	companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
																},
															}))} /></div>
												</JXBox>

												{/* Row 2: Quantity, Amount, Company Cost */}
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px'}} className="grid grid-cols-[1fr_1fr]">
													<FormField label="Quantity" type="number" value={lineItemEdits[item.id]?.quantity ?? String(item.quantity ?? 1)} onChange={(event) => setLineItemEdits((current) => ({
															...current,
															[item.id]: {
																description: current[item.id]?.description ?? item.description,
																type: current[item.id]?.type ?? item.type,
																quantity: event.target.value,
																amount: current[item.id]?.amount ?? String(item.amount ?? 0),
																companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
															},
														}))} inputProps={{ min: 0, step: '1' }} size="small" />
													<div className="min-w-0 flex-1"><FormField label="Unit Price" type="number" value={lineItemEdits[item.id]?.amount ?? String(item.amount ?? 0)} onChange={(event) => setLineItemEdits((current) => ({
															...current,
															[item.id]: {
																description: current[item.id]?.description ?? item.description,
																type: current[item.id]?.type ?? item.type,
																quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
																amount: event.target.value,
																companyAmount: current[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0),
															},
														}))} inputProps={{ min: 0, step: '0.01' }} leftIcon="$" size="small" /></div>
													{isAdmin && (
														<div className="min-w-0 flex-1"><FormField label="Company Cost" type="number" value={lineItemEdits[item.id]?.companyAmount ?? String((item as any).linkedCompanyLedgerEntry?.amount ?? 0)} onChange={(event) => setLineItemEdits((current) => ({
																...current,
																[item.id]: {
																	description: current[item.id]?.description ?? item.description,
																	type: current[item.id]?.type ?? item.type,
																	quantity: current[item.id]?.quantity ?? String(item.quantity ?? 1),
																	amount: current[item.id]?.amount ?? String(item.amount ?? 0),
																	companyAmount: event.target.value,
																},
															}))} inputProps={{ min: 0, step: '0.01' }} helperText="Internal ledger cost" leftIcon="$" size="small" /></div>
													)}
												</JXBox>
											</JXBox>
										);
									})}
								</JXBox>
							)}

							{/* Add Expense Line Form */}
							<JXBox padding="none" border={false} style={{border: '1px dashed rgba(var(--accent-gold-rgb), 0.6)', borderRadius: '16px', padding: '20px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.03)', display: 'flex', flexDirection: 'column', gap: '16px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px'}}>
									<JXBox padding="none" border={false} style={{padding: '6px', borderRadius: '12px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.15)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
										<Plus className="w-4 h-4" />
									</JXBox>
									<div>
										<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
											Add Expense Line
										</p>
										<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
											Insert additional freight charges, customs duties, storage, or miscellaneous fees
										</p>
									</div>
								</JXBox>

								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px'}} className="grid-cols-1 grid md:grid-cols-[2fr_1.2fr]">
									<div className="min-w-0 flex-1"><FormField label="Description" placeholder="e.g. Additional warehouse storage fee" value={manualLineItem.description} onChange={(event) => setManualLineItem((current) => ({ ...current, description: event.target.value }))} size="small" /></div>
									<div className="min-w-0 flex-1"><Select label="Type" options={[{ value: "OTHER_FEE", label: 'Other Fee' }, { value: "SHIPPING_FEE", label: 'Shipping' }, { value: "INSURANCE", label: 'Insurance' }, { value: "CUSTOMS_FEE", label: 'Customs' }, { value: "STORAGE_FEE", label: 'Storage' }, { value: "HANDLING_FEE", label: 'Handling' }]} value={manualLineItem.type} size="small" onChange={(val) => setManualLineItem((current) => ({ ...current, type: val as string }))} /></div>
								</JXBox>

								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px'}} className="grid grid-cols-[1fr_1fr]">
									<FormField label="Quantity" type="number" value={manualLineItem.quantity} onChange={(event) => setManualLineItem((current) => ({ ...current, quantity: event.target.value }))} inputProps={{ min: 1, step: '1' }} size="small" />
									<div className="min-w-0 flex-1"><FormField label="Amount" type="number" value={manualLineItem.amount} onChange={(event) => setManualLineItem((current) => ({ ...current, amount: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} leftIcon="$" size="small" /></div>
									{isAdmin && (
										<div className="min-w-0 flex-1"><FormField label="Company Amount" type="number" value={manualLineItem.companyAmount} onChange={(event) => setManualLineItem((current) => ({ ...current, companyAmount: event.target.value }))} inputProps={{ min: 0, step: '0.01' }} helperText="Internal ledger cost" leftIcon="$" size="small" /></div>
									)}
								</JXBox>

								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', paddingTop: '4px'}}>
									<Button 
										variant="primary" 
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => void handleAddManualLineItem()} 
										disabled={updating || !manualLineItem.description.trim()}
										style={{backgroundColor: 'var(--accent-gold)', color: 'white'}}
									>
										Add Line Item
									</Button>
								</JXBox>
							</JXBox>
						</JXBox>
					)}
			</Modal>

			<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, maxWidth: isSplitView ? '1920px' : '1400px', marginLeft: 'auto', marginRight: 'auto', transition: 'max-width 0.2s ease'}} className="p-4 md:p-6">
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
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
							<StatusBadge status={invoice.status} />
							<CopyButton value={invoice.invoiceNumber} label="Invoice #" />
							{/* #4: Pay Now button — visible to invoice owner when payment is due */}
							{viewerIsOwner && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && invoice.status !== 'DRAFT' && (
								<Button
									variant="primary"
									size="sm"
									icon={<CreditCard className="w-4 h-4" />}
									onClick={() => setPaymentModalOpen(true)}
									style={{backgroundColor: 'var(--success)', color: 'white'}}
								>
									Pay Now
								</Button>
							)}
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
									icon={<Pencil className="w-4 h-4" />}
									onClick={() => openInvoiceEditor('details')}
									disabled={updating}
								>
									Edit Invoice
								</Button>
							)}
							<Button
								variant={isSplitView ? 'primary' : 'outline'}
								size="sm"
								icon={<Columns2 className="w-4 h-4" />}
								onClick={toggleSplitView}
								sx={isSplitView ? { bgcolor: 'var(--accent-gold)', color: 'white' } : {}}
								title="Toggle Split-Screen Live PDF"
							>
								{isSplitView ? 'Close Split' : 'Split-Screen PDF'}
							</Button>
							<Button
								variant="outline"
								size="sm"
								icon={<Eye className="w-4 h-4 text-[var(--accent-gold)]" />}
								onClick={() => setIsPreviewOpen(true)}
							>
								Preview PDF
							</Button>
							<Button
								variant="primary"
								size="sm"
								icon={<Download className="w-4 h-4" />}
								onClick={handleDownloadPDF}
								style={{backgroundColor: 'var(--accent-gold)', color: 'white'}}
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
						</JXBox>
					}
				/>

				{/* Main Content & Live PDF Split Layout */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '24px', alignItems: 'start'}} className={isSplitView ? 'grid-cols-1 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_540px]' : 'grid-cols-1'}>
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, minWidth: '0px', width: '100%'}}>
						<DashboardSurface>
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '24px'}} className="grid-cols-1 md:grid-cols-3">
						{/* Invoice Information */}
						<DashboardPanel 
							title="Invoice Details"
							description="Basic invoice information"
						>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Invoice Number</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
										<span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
											{invoice.invoiceNumber}
										</span>
										<CopyButton value={invoice.invoiceNumber} label="Invoice #" />
									</JXBox>
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Issue Date</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										{formatDate(invoice.issueDate)}
									</JXBox>
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Due Date</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										{formatDate(invoice.dueDate)}
									</JXBox>
								</JXBox>
								{invoice.paidDate && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Paid Date</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)'}}>
											{formatDate(invoice.paidDate)}
										</JXBox>
									</JXBox>
								)}
								<div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{borderColor: 'var(--border)'}} />
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Status</JXBox>
									<StatusBadge status={invoice.status} size="sm" />
								</JXBox>
								{isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
									<div className="min-w-0 flex-1"><Select label="Update Status" options={[{ value: "DRAFT", label: 'Draft' }, { value: "PENDING", label: 'Pending' }, { value: "SENT", label: 'Sent' }, { value: "PAID", label: 'Paid' }, { value: "CANCELLED", label: 'Cancelled' }]} value={invoice.status} size="small" disabled onChange={(val) => handleStatusUpdate(val as string)} /></div>
								)}
							</JXBox>
						</DashboardPanel>

						{/* Customer Information */}
						<DashboardPanel 
							title="Customer"
							description="Customer details"
						>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>Name</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										{invoice.user.name || 'N/A'}
									</JXBox>
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>Email</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
										<span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{invoice.user.email}</span>
										<CopyButton value={invoice.user.email} label="Email" />
									</JXBox>
								</JXBox>
								{invoice.user.phone && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>Phone</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
											<span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{invoice.user.phone}</span>
											<CopyButton value={invoice.user.phone} label="Phone" />
										</JXBox>
									</JXBox>
								)}
								{invoice.user.address && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>Address</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-primary)'}}>
											{invoice.user.address}
											{invoice.user.city && `, ${invoice.user.city}`}
											{invoice.user.country && `, ${invoice.user.country}`}
										</JXBox>
									</JXBox>
								)}
								<div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{borderColor: 'var(--border)'}} />
								<Button
									variant="outline"
									size="sm"
									icon={<User className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/customers?search=${invoice.user.email}`)}
								>
									View Customer
								</Button>
							</JXBox>
						</DashboardPanel>

						{/* Container or Shipment Information */}
						{invoice.container ? (
						<DashboardPanel 
							title="Container"
							description="Shipping container"
						>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Container #</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace'}}>
										{invoice.container.containerNumber}
									</JXBox>
								</JXBox>
								{invoice.container.trackingNumber && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Tracking #</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace'}}>
											{invoice.container.trackingNumber}
										</JXBox>
									</JXBox>
								)}
								{invoice.container.vesselName && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Vessel</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
											{invoice.container.vesselName}
										</JXBox>
									</JXBox>
								)}
								{invoice.container.loadingPort && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>From</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
											{invoice.container.loadingPort}
										</JXBox>
									</JXBox>
								)}
								{invoice.container.destinationPort && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>To</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
											{invoice.container.destinationPort}
										</JXBox>
									</JXBox>
								)}
								<div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{borderColor: 'var(--border)'}} />
								<Button
									variant="outline"
									size="sm"
									icon={<Package className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/containers/${invoice.containerId}`)}
								>
									View Container
								</Button>
							</JXBox>
						</DashboardPanel>
						) : invoice.shipment ? (
						<DashboardPanel
							title="Vehicle"
							description="Shipment details"
						>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Vehicle</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										{[invoice.shipment.vehicleYear, invoice.shipment.vehicleMake, invoice.shipment.vehicleModel].filter(Boolean).join(' ') || invoice.shipment.vehicleType}
									</JXBox>
								</JXBox>
								{invoice.shipment.vehicleVIN && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>VIN</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace'}}>
											{invoice.shipment.vehicleVIN}
										</JXBox>
									</JXBox>
								)}
								{invoice.shipment.vehicleColor && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Color</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
											{invoice.shipment.vehicleColor}
										</JXBox>
									</JXBox>
								)}
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Status</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										{invoice.shipment.status.replace(/_/g, ' ')}
									</JXBox>
								</JXBox>
								<div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{borderColor: 'var(--border)'}} />
								<Button
									variant="outline"
									size="sm"
									icon={<Package className="w-3 h-3" />}
									onClick={() => router.push(`/dashboard/shipments/${invoice.shipmentId}`)}
								>
									View Shipment
								</Button>
							</JXBox>
						</DashboardPanel>
						) : null}
					</JXBox>

					{/* Line Items */}
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px'}}>
						<DashboardPanel 
							title="Line Items"
							description="Detailed breakdown of charges"
							actions={
								isAdmin && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' ? (
									<Button
										variant="outline"
										size="sm"
										icon={<Pencil className="w-3.5 h-3.5" />}
										onClick={() => openInvoiceEditor('items')}
										disabled={updating}
									>
										Edit Charges
									</Button>
								) : undefined
							}
						>
						<div style={{border: '1px solid var(--border)', borderRadius: '16px'}} className="w-full overflow-x-auto">
							<table style={{}} className="w-full border-collapse text-sm [&_td]:py-1.5 [&_th]:py-1.5">
								<thead>
									<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
										<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Description</th>
										<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Type</th>
										<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-center">Qty</th>
										<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-center">Unit Price</th>
										<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-center">Amount</th>
									</tr>
								</thead>
								<tbody>
									{groupedEntries.map(([key, group]) => (
										<React.Fragment key={key}>
											{group.shipment && hasMultipleShipmentGroups && (
												<tr key={`header-${key}`} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
													<th colSpan={5} style={{backgroundColor: 'var(--background)', fontWeight: 600, fontSize: '0.875rem', paddingTop: '8px', paddingBottom: '8px'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														{group.shipment.vehicleYear} {group.shipment.vehicleMake} {group.shipment.vehicleModel}
														{group.shipment.vehicleVIN && ` (VIN: ${group.shipment.vehicleVIN})`}
													</th>
												</tr>
											)}
											{group.items.map((item) => (
													<tr key={item.id} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
													<th style={{paddingLeft: '16px', paddingRight: '16px'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', flexWrap: 'wrap', textAlign: 'left'}}>
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
										style={{minWidth: 'auto', paddingLeft: '8px', paddingRight: '8px'}}
									>
										Dispute
									</Button>
								)}
															{(item.type === 'PURCHASE_PRICE' || item.type === 'VEHICLE_PRICE') &&
																invoice.shipment?.paymentStatus === 'COMPLETED' && (
																<StatusBadge
																	status="PAID"
																	label="Purchase Paid"
																	size="sm"
																/>
															)}
															{isAdmin && item.linkedCompanyLedgerEntry && (
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => openCompanyLedgerEntry(item.linkedCompanyLedgerEntry!)}
																	style={{minWidth: 'auto', paddingLeft: '8px', paddingRight: '8px'}}
																>
																	Company Ledger
																</Button>
															)}
														</JXBox>
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														<StatusBadge 
															status="DEFAULT"
															label={getLineItemTypeLabel(item)} 
															size="sm"
														/>
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-center">{item.quantity}</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-center">{formatCurrency(item.unitPrice)}</th>
													<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-center">
														{formatCurrency(item.amount)}
													</th>
												</tr>
											))}
										</React.Fragment>
									))}
									<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
										<th colSpan={4} style={{fontWeight: 600, borderTop: '2px solid var(--border)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
											Subtotal
										</th>
										<th style={{fontWeight: 600, borderTop: '2px solid var(--border)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
											{formatCurrency(invoice.subtotal)}
										</th>
									</tr>
									{invoice.discount > 0 && (
										<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
											<th colSpan={4} style={{fontWeight: 600, color: 'var(--success)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
												Discount
											</th>
											<th style={{fontWeight: 600, color: 'var(--success)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
												-{formatCurrency(invoice.discount)}
											</th>
										</tr>
									)}
									{invoice.tax > 0 && (
										<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
											<th colSpan={4} style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
												Tax
											</th>
											<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
												{formatCurrency(invoice.tax)}
											</th>
										</tr>
									)}
									<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
										<th colSpan={4} style={{fontWeight: 700, fontSize: '1.1rem', borderTop: '2px solid var(--border)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
											TOTAL
										</th>
										<th style={{fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent-gold)', borderTop: '2px solid var(--border)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
											{formatCurrency(invoice.total)}
										</th>
									</tr>
									{purchasePaid > 0 && (
										<>
											<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th colSpan={4} style={{color: 'var(--success)', fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
													Purchase Price Already Paid
												</th>
												<th style={{color: 'var(--success)', fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
													-{formatCurrency(purchasePaid)}
												</th>
											</tr>
											<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th colSpan={4} style={{fontWeight: 700, fontSize: '1.1rem', borderTop: '2px solid var(--border)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
													BALANCE DUE
												</th>
												<th style={{fontWeight: 700, fontSize: '1.1rem', color: balanceDue > 0 ? 'var(--error, #d32f2f)' : 'var(--success)', borderTop: '2px solid var(--border)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
													{formatCurrency(balanceDue)}
												</th>
											</tr>
										</>
									)}
								</tbody>
							</table>
						</div>
						</DashboardPanel>
					</JXBox>

					{/* Notes */}
					{(invoice.notes || invoice.internalNotes) && (
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px'}}>
							<DashboardPanel 
								title="Notes"
								description="Additional information"
							>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
								{invoice.notes && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px'}}>
											Customer Notes
										</JXBox>
										<JXBox padding="none" border={false} style={{padding: '16px', backgroundColor: 'var(--background)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-primary)'}}>
											{invoice.notes}
										</JXBox>
									</JXBox>
								)}
								{isAdmin && invoice.internalNotes && (
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px'}}>
											Internal Notes
										</JXBox>
										<JXBox padding="none" border={false} style={{padding: '16px', backgroundColor: 'rgba(var(--warning-rgb), 0.1)', border: '1px solid rgba(var(--warning-rgb), 0.3)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-primary)'}}>
											{invoice.internalNotes}
										</JXBox>
									</JXBox>
								)}
							</JXBox>
							</DashboardPanel>
						</JXBox>
					)}
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px'}}>
						<DashboardPanel
							title="Activity History"
							description="Audit log of invoice creation, updates, and status changes"
						>
							{isAdmin && (
								<ActivityLog logs={invoice.auditLogs || []} />
							)}
						</DashboardPanel>
					</JXBox>
				</DashboardSurface>
					</JXBox>

					{/* Right Column: Sticky Live PDF Document Preview */}
					{isSplitView && (
						<JXBox padding="none" border={false} style={{flexDirection: 'column', position: 'sticky', top: '80px', height: 'calc(100vh - 105px)', minHeight: '680px', backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', zIndex: 10}} className="hidden lg:flex">
							{/* Top Bar */}
							<JXBox padding="none" border={false} style={{borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(var(--text-primary-rgb), 0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
									<JXBox padding="none" border={false} style={{padding: '6.8px', borderRadius: '16px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
										<FileText className="w-4 h-4" />
									</JXBox>
									<div>
										<p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2}}>
											Live PDF Preview
										</p>
										<p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', color: 'var(--text-secondary)'}}>
											{invoice.invoiceNumber} &bull; Auto-syncs on edit
										</p>
									</div>
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
									<button
										type="button"
										onClick={() => setPdfRefreshKey((k) => k + 1)}
										className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[rgba(var(--text-primary-rgb),0.06)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
										title="Refresh PDF"
									>
										<RotateCcw className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => {
											const iframe = document.getElementById('live-pdf-iframe') as HTMLIFrameElement;
											if (iframe?.contentWindow) {
												try {
													iframe.contentWindow.focus();
													iframe.contentWindow.print();
													return;
												} catch {}
											}
											window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
										}}
										className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[rgba(var(--text-primary-rgb),0.06)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
										title="Print PDF"
									>
										<Printer className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
										className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[rgba(var(--text-primary-rgb),0.06)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
										title="Open in new tab"
									>
										<ExternalLink className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={() => setIsPreviewOpen(true)}
										className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-[rgba(var(--text-primary-rgb),0.06)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
										title="Full screen preview"
									>
										<Maximize2 className="w-3.5 h-3.5" />
									</button>
									<button
										type="button"
										onClick={toggleSplitView}
										className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-red-500/10 text-[var(--text-secondary)] hover:text-red-500 transition-all"
										title="Close Split View"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								</JXBox>
							</JXBox>

							{/* Live Iframe Viewer */}
							<JXBox padding="none" border={false} style={{borderRadius: 0, flex: 1, position: 'relative', backgroundColor: '#0f172a'}}>
								<iframe
									id="live-pdf-iframe"
									key={`live-pdf-${pdfRefreshKey}`}
									src={`/api/invoices/${invoice.id}/pdf`}
									title={`Invoice PDF ${invoice.invoiceNumber}`}
									className="w-full h-full border-0"
								/>
							</JXBox>
						</JXBox>
					)}
				</JXBox>
			</JXBox>

			{/* #4: Online Payment Modal */}
			<Modal
			  open={paymentModalOpen}
			  onClose={() => !paymentProcessing && setPaymentModalOpen(false)}
			  title={<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'}}>
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '12px'}}>
							<JXBox padding="none" border={false} style={{padding: '8px', borderRadius: '16px', backgroundColor: 'rgba(var(--success-rgb), 0.12)', color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
								<CreditCard className="w-5 h-5" />
							</JXBox>
							<div>
								<p className="text-sm leading-relaxed" style={{fontWeight: 700, fontSize: '1.15rem', color: 'var(--text-primary)', lineHeight: 1.2}}>
									Pay Invoice
								</p>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
									{invoice.invoiceNumber} &bull; {formatCurrency(balanceDue > 0 ? balanceDue : invoice.total)} due
								</p>
							</div>
						</JXBox>
					</JXBox>}
			  size="sm"
			  contentSx={{backgroundColor: 'var(--panel)'}}
			  actionsSx={{padding: '20px', backgroundColor: 'var(--panel)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px'}}
			  actions={<>

					<Button variant="outline" onClick={() => setPaymentModalOpen(false)} disabled={paymentProcessing}>
						Cancel
					</Button>
					<Button
						variant="primary"
						onClick={async () => {
							setPaymentProcessing(true);
							try {
								const response = await fetch(`/api/invoices/${params.id}`, {
									method: 'PATCH',
									headers: { 'Content-Type': 'application/json' },
									body: JSON.stringify({
										status: 'PAID',
										paidDate: new Date().toISOString(),
										paymentMethod: paymentMethod === 'card' ? 'Credit Card' : paymentMethod === 'bank' ? 'Bank Transfer' : 'Wallet',
										paymentReference: `ONLINE-${Date.now()}`,
									}),
								});
								if (response.ok) {
									toast.success('Payment successful!');
									setPaymentModalOpen(false);
									fetchInvoice();
								} else {
									const data = await response.json();
									toast.error(data.error || 'Payment failed');
								}
							} catch {
								toast.error('Payment processing error');
							} finally {
								setPaymentProcessing(false);
							}
						}}
						disabled={paymentProcessing}
						style={{backgroundColor: 'var(--success)', color: 'white'}}
					>
						{paymentProcessing ? (
							<><span className="w-4 h-4 mr-1.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Processing...</>
						) : (
							<><CreditCard className="w-4 h-4 mr-1.5" /> Pay {formatCurrency(balanceDue > 0 ? balanceDue : invoice.total)}</>
						)}
					</Button>
			  </>}
			>

					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px', paddingTop: '8px'}}>
						{/* Payment Summary */}
						<JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', backgroundColor: 'var(--background)', border: '1px solid var(--border)'}}>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Invoice Total</p>
								<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>{formatCurrency(invoice.total)}</p>
							</JXBox>
							{purchasePaid > 0 && (
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
									<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Already Paid</p>
									<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)'}}>-{formatCurrency(purchasePaid)}</p>
								</JXBox>
							)}
							<div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{borderColor: 'var(--border)', marginTop: '8px', marginBottom: '8px'}} />
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
								<p className="text-sm leading-relaxed" style={{fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)'}}>Amount Due</p>
								<p className="text-sm leading-relaxed" style={{fontSize: '1rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
									{formatCurrency(balanceDue > 0 ? balanceDue : invoice.total)}
								</p>
							</JXBox>
						</JXBox>

						{/* Payment Method Selection */}
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
							<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px'}}>
								Payment Method
							</p>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '12px'}}>
								<JXBox padding="none" border={false} onClick={() => setPaymentMethod('card')} style={{flex: 1, padding: '16px', borderRadius: '16px', border: paymentMethod === 'card' ? '2px solid var(--accent-gold)' : '1px solid var(--border)', backgroundColor: paymentMethod === 'card' ? 'rgba(var(--accent-gold-rgb), 0.05)' : 'var(--background)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'}}>
									<CreditCard className={`h-6 w-6 mx-auto mb-1 ${paymentMethod === 'card' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'}`} />
									<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', fontWeight: 600, color: paymentMethod === 'card' ? 'var(--accent-gold)' : 'var(--text-primary)'}}>
										Credit Card
									</p>
								</JXBox>
								<JXBox padding="none" border={false} onClick={() => setPaymentMethod('bank')} style={{flex: 1, padding: '16px', borderRadius: '16px', border: paymentMethod === 'bank' ? '2px solid var(--accent-gold)' : '1px solid var(--border)', backgroundColor: paymentMethod === 'bank' ? 'rgba(var(--accent-gold-rgb), 0.05)' : 'var(--background)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'}}>
									<Building2 className={`h-6 w-6 mx-auto mb-1 ${paymentMethod === 'bank' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'}`} />
									<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', fontWeight: 600, color: paymentMethod === 'bank' ? 'var(--accent-gold)' : 'var(--text-primary)'}}>
										Bank Transfer
									</p>
								</JXBox>
								<JXBox padding="none" border={false} onClick={() => setPaymentMethod('wallet')} style={{flex: 1, padding: '16px', borderRadius: '16px', border: paymentMethod === 'wallet' ? '2px solid var(--accent-gold)' : '1px solid var(--border)', backgroundColor: paymentMethod === 'wallet' ? 'rgba(var(--accent-gold-rgb), 0.05)' : 'var(--background)', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s'}}>
									<Wallet className={`h-6 w-6 mx-auto mb-1 ${paymentMethod === 'wallet' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'}`} />
									<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', fontWeight: 600, color: paymentMethod === 'wallet' ? 'var(--accent-gold)' : 'var(--text-primary)'}}>
										Wallet Balance
									</p>
								</JXBox>
							</JXBox>
						</JXBox>

						{/* Payment Info */}
						<JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', backgroundColor: 'rgba(var(--info-rgb), 0.08)', border: '1px solid rgba(var(--info-rgb), 0.2)'}}>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'flex-start', gap: '12px'}}>
								<Shield className="h-4 w-4 text-[var(--info)] shrink-0 mt-0.5" />
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
									<p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)'}}>
										Secure Payment
									</p>
									<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px'}}>
										{paymentMethod === 'card'
											? 'Pay securely with your credit card. Your payment information is encrypted.'
											: paymentMethod === 'bank'
											? 'Bank transfer details will be provided after confirmation. Please use your invoice number as reference.'
											: 'Pay using your account wallet balance. Ensure you have sufficient funds.'}
									</p>
								</JXBox>
							</JXBox>
						</JXBox>
					</JXBox>
			</Modal>

			{/* In-app Invoice PDF Preview Modal */}
			<InvoicePreviewModal
				open={isPreviewOpen}
				invoiceId={invoice.id}
				invoiceNumber={invoice.invoiceNumber}
				customerName={invoice.user?.name || invoice.user?.email}
				totalAmount={invoice.total}
				status={invoice.status}
				onClose={() => setIsPreviewOpen(false)}
			/>
		</>
	);
}