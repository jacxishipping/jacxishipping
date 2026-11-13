'use client';


import { Suspense, useState, useEffect, forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { JXBox, JXChip } from '@jacxishippingorg/jx-ui-react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Activity, AlertTriangle, ArrowLeft, Calendar, ChevronDown, Compass, Copy, DollarSign, Download, Eye, FileDown, FileText, Layers, MapPin, Package, Pencil, Plus, Printer, QrCode, RefreshCw, Search, ShieldCheck, Ship, Trash2, TrendingUp } from 'lucide-react';
import QRCode from 'react-qr-code';
import { formatMoney as formatCurrency } from '@/lib/format';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, Breadcrumbs, toast, LoadingState, EmptyState, StatsCard, DashboardPageSkeleton, DetailPageSkeleton, FormPageSkeleton, CopyButton, MilestoneStepper, StatusBadge, type MilestoneStep, Modal } from '@/components/design-system';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AddExpenseModal from '@/components/containers/AddExpenseModal';
import AddDamageModal from '@/components/containers/AddDamageModal';
import AddInvoiceModal from '@/components/containers/AddInvoiceModal';
import AddTrackingEventModal from '@/components/containers/AddTrackingEventModal';
import { TrackingSourceBadge } from '@/components/tracking/TrackingSourceBadge';
import AddShipmentExpenseModal from '@/components/shipments/AddShipmentExpenseModal';
import { DocumentManager } from '@/components/dashboard/DocumentManager';
import { ActivityLog } from '@/components/dashboard/ActivityLog';
import { ContainerCapacityGauge } from '@/components/dashboard/ContainerCapacityGauge';
import { ContainerProfitabilityCard } from '@/components/dashboard/ContainerProfitabilityCard';
import { TrackingMap } from '@/components/dashboard/TrackingMap';
import { OceanRouteMap } from '@/components/dashboard/OceanRouteMap';
import { OceanCarrierSyncCard } from '@/components/containers/OceanCarrierSyncCard';
import { CustomsDocumentPacketModal } from '@/components/containers/CustomsDocumentPacketModal';
import { ContainerLoadPlanner } from '@/components/dashboard/ContainerLoadPlanner';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';
import { openUniversalShipmentExport } from '@/components/shipments/UniversalShipmentExportModal';

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


interface Shipment {
	id: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleVIN: string | null;
	status: string;
	user?: {
		id: string;
		name: string | null;
		email: string;
	};
}

interface Expense {
	id: string;
	type: string;
	amount: number;
	currency: string;
	date: string;
	vendor: string | null;
	invoiceNumber?: string | null;
	notes?: string | null;
	source?: 'CONTAINER' | 'SHIPMENT';
	shipmentId?: string | null;
	description?: string;
}

interface Damage {
	id: string;
	shipmentId: string;
	damageType: 'WE_PAY' | 'COMPANY_PAYS';
	amount: number;
	description: string;
	createdAt: string;
	shipment?: {
		id: string;
		vehicleMake: string | null;
		vehicleModel: string | null;
		vehicleVIN: string | null;
		user?: { id: string; name: string | null; email: string };
	};
}

interface Invoice {
	id: string;
	invoiceNumber: string;
	amount: number;
	currency: string;
	status: string;
	date: string;
}

interface Document {
	id: string;
	name: string;
	type: string;
	fileUrl: string;
	fileType: string;
	uploadedAt: string;
    category: string;
    fileSize: number;
    uploadedBy: string;
}

interface TrackingEvent {
	id: string;
	status: string;
	location: string | null;
	description: string | null;
	eventDate: string;
    latitude?: number | null;
    longitude?: number | null;
}

interface UserInvoice {
	id: string;
	invoiceNumber: string;
	userId: string;
	status: string;
	issueDate: string;
	dueDate: string | null;
	total: number;
	user: {
		name: string | null;
		email: string;
	};
	_count: {
		lineItems: number;
	};
}

interface AuditLogEntry {
    id: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE';
    description: string;
    performedBy: string;
    timestamp: string;
    metadata?: any;
}

interface Container {
	id: string;
	containerNumber: string;
	companyId: string | null;
	company?: {
		id: string;
		name: string;
		code?: string | null;
	} | null;
	trackingNumber: string | null;
	vesselName: string | null;
	voyageNumber: string | null;
	shippingLine: string | null;
	bookingNumber: string | null;
	loadingPort: string | null;
	destinationPort: string | null;
	transshipmentPorts: string[];
	loadingDate: string | null;
	departureDate: string | null;
	estimatedArrival: string | null;
	actualArrival: string | null;
	status: string;
	currentLocation: string | null;
	progress: number;
	maxCapacity: number;
	currentCount: number;
	notes: string | null;
	autoTrackingEnabled: boolean;
	expenseAllocationMethod: string | null;
	createdAt: string;
	shipments: Shipment[];
	expenses: Expense[];
	damages: Damage[];
	invoices: Invoice[];
	userInvoices?: UserInvoice[];
	documents: Document[];
	trackingEvents: TrackingEvent[];
    auditLogs: AuditLogEntry[];
	totals: {
		expenses: number;
		invoices: number;
	};
}

interface CompanyOption {
	id: string;
	name: string;
	code?: string | null;
}

const statusConfig: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
	CREATED: { label: 'Created', color: 'default' },
	WAITING_FOR_LOADING: { label: 'Waiting for Loading', color: 'warning' },
	LOADED: { label: 'Loaded', color: 'info' },
	IN_TRANSIT: { label: 'In Transit', color: 'info' },
	ARRIVED_PORT: { label: 'Arrived at Port', color: 'success' },
	CUSTOMS_CLEARANCE: { label: 'Customs Clearance', color: 'warning' },
	RELEASED: { label: 'Released', color: 'success' },
	CLOSED: { label: 'Closed', color: 'default' },
};

const containerTabSlugs = [
	'overview',
	'shipments',
	'expenses',
	'damages',
	'invoices',
	'user-invoices',
	'documents',
	'tracking',
	'activity',
];

function ContainerDetailPageContent() {
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
    const { data: session } = useSession();
	const userRole = session?.user?.role;
	const isAdmin = userRole === 'admin';
	const canManageWorkflow = hasPermission(userRole, 'workflow:move') && hasPermission(userRole, 'containers:manage');
	const canOverrideClosedStages = hasPermission(userRole, 'workflow:override_closed');
	const canManageExpenses = hasPermission(userRole, 'expenses:post');
	const canViewExpenses = hasAnyPermission(userRole, ['finance:view', 'finance:manage', 'containers:read_all', 'containers:manage']);
	const canManageInvoices = hasAnyPermission(userRole, ['invoices:manage', 'finance:manage']);
	const canViewInvoices = hasAnyPermission(userRole, ['invoices:view', 'invoices:manage', 'finance:view', 'finance:manage']);
	const [container, setContainer] = useState<Container | null>(null);
	const [loading, setLoading] = useState(true);
	const [activeTab, setActiveTab] = useState('overview');
	const [updating, setUpdating] = useState(false);
	const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
	const [expenseModalOpen, setExpenseModalOpen] = useState(false);
	const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
	const [expenseView, setExpenseView] = useState<'CONTAINER' | 'SHIPMENT'>('CONTAINER');
	const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
	const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
	const [deletingInvoiceId, setDeletingInvoiceId] = useState<string | null>(null);
	const [trackingModalOpen, setTrackingModalOpen] = useState(false);
	const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
	const [duplicating, setDuplicating] = useState(false);
	const [newContainerNumber, setNewContainerNumber] = useState('');
	const [generatingInvoices, setGeneratingInvoices] = useState(false);
    const [refreshingTracking, setRefreshingTracking] = useState(false);
	const [invoiceGenerationModalOpen, setInvoiceGenerationModalOpen] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
	const [loadPlannerOpen, setLoadPlannerOpen] = useState(false);
	const [shipmentExpenseModalOpen, setShipmentExpenseModalOpen] = useState(false);
	const [selectedShipmentForExpense, setSelectedShipmentForExpense] = useState<string | undefined>(undefined);
	const [damageModalOpen, setDamageModalOpen] = useState(false);
	const [customsPacketModalOpen, setCustomsPacketModalOpen] = useState(false);
	const [showMaritimeMap, setShowMaritimeMap] = useState(false);
	const [deletingDamageId, setDeletingDamageId] = useState<string | null>(null);
	const [companies, setCompanies] = useState<CompanyOption[]>([]);
	const [selectedCompanyId, setSelectedCompanyId] = useState('');
	const [assignShipmentModalOpen, setAssignShipmentModalOpen] = useState(false);
	const [availableShipments, setAvailableShipments] = useState<any[]>([]);
	const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
	const [loadingAvailableShipments, setLoadingAvailableShipments] = useState(false);

	useEffect(() => {
		const tab = searchParams.get('tab');
		if (tab && containerTabSlugs.includes(tab) && tab !== activeTab) setActiveTab(tab);
	}, [activeTab, searchParams]);
	const [assigningShipments, setAssigningShipments] = useState(false);
	const [shipmentSearchQuery, setShipmentSearchQuery] = useState('');

	useEffect(() => {
		if (params.id) {
			fetchContainer();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [params.id]);

	useEffect(() => {
		const fetchCompanies = async () => {
			if (!isAdmin) return;
			try {
				const response = await fetch('/api/finance/companies?active=true&companyType=SHIPPING');
				const data = await response.json();
				if (response.ok) {
					setCompanies(data.companies || []);
				}
			} catch (error) {
				console.error('Failed to load companies:', error);
			}
		};

		void fetchCompanies();
	}, [isAdmin]);

	const fetchAvailableShipments = async (searchTerm = '') => {
		setLoadingAvailableShipments(true);
		try {
			const query = new URLSearchParams({
				status: 'ON_HAND',
				unassigned: 'true',
				limit: '100',
				page: '1',
			});
			if (searchTerm.trim()) {
				query.set('search', searchTerm.trim());
			}
			const response = await fetch(`/api/shipments?${query.toString()}`);
			const data = await response.json();
			if (response.ok) {
				setAvailableShipments(data.shipments || []);
			} else {
				toast.error('Failed to load available shipments');
			}
		} catch {
			toast.error('Failed to load available shipments');
		} finally {
			setLoadingAvailableShipments(false);
		}
	};

	useEffect(() => {
		if (!assignShipmentModalOpen) return;

		const timer = setTimeout(() => {
			void fetchAvailableShipments(shipmentSearchQuery);
		}, 250);

		return () => clearTimeout(timer);
	}, [assignShipmentModalOpen, shipmentSearchQuery]);

	const handleAssignShipments = async () => {
		if (selectedShipmentIds.length === 0) return;
		setAssigningShipments(true);
		try {
			const response = await fetch(`/api/containers/${params.id}/shipments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ shipmentIds: selectedShipmentIds }),
			});
			const data = await response.json();
			if (response.ok) {
				toast.success(`${selectedShipmentIds.length} shipment(s) assigned successfully`);
				setAssignShipmentModalOpen(false);
				setSelectedShipmentIds([]);
				setShipmentSearchQuery('');
				fetchContainer();
			} else {
				toast.error(data.error || 'Failed to assign shipments');
			}
		} catch {
			toast.error('Failed to assign shipments');
		} finally {
			setAssigningShipments(false);
		}
	};

	const openAssignShipmentModal = () => {
		setSelectedShipmentIds([]);
		setShipmentSearchQuery('');
		setAssignShipmentModalOpen(true);
	};

	const filteredAvailableShipments = availableShipments.filter((s) => {
		if (!shipmentSearchQuery) return true;
		const q = shipmentSearchQuery.toLowerCase().trim();
		return (
			(s.vehicleMake && s.vehicleMake.toLowerCase().includes(q)) ||
			(s.vehicleModel && s.vehicleModel.toLowerCase().includes(q)) ||
			(s.vehicleVIN && s.vehicleVIN.toLowerCase().includes(q)) ||
			(s.lotNumber && s.lotNumber.toLowerCase().includes(q)) ||
			(s.user?.name && s.user.name.toLowerCase().includes(q)) ||
			(s.user?.email && s.user.email.toLowerCase().includes(q))
		);
	});

	const fetchContainer = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/containers/${params.id}`, { cache: 'no-store' });
			const data = await response.json();

			if (response.ok) {
				const containerData = data.container;
				// Ensure trackingEvents is an array
				if (!containerData.trackingEvents) {
					containerData.trackingEvents = [];
				}
                if (!containerData.auditLogs) {
                    containerData.auditLogs = [];
                }
				if (!containerData.damages) {
					containerData.damages = [];
				}
				// Ensure progress is a number
				if (typeof containerData.progress !== 'number') {
					containerData.progress = 0;
				}
				setSelectedCompanyId(containerData.companyId || '');
				setContainer(containerData);
			} else {
				toast.error('Container not found');
				router.push('/dashboard/containers');
			}
		} catch (error) {
			console.error('Error fetching container:', error);
			toast.error('Failed to load container');
		} finally {
			setLoading(false);
		}
	};

	const refreshContainerPage = async () => {
		await fetchContainer();
		router.refresh();
	};

    const handleRefreshTracking = async () => {
        if (!container) return;
        
        setRefreshingTracking(true);
        try {
            const response = await fetch('/api/containers/sync-tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ containerId: container.id }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const newEvents = data.newEvents || 0;
                if (newEvents > 0) {
                    toast.success(data.message || `Tracking updated: ${newEvents} new event(s)`);
                } else if (data.updatedEta) {
                    toast.success('Estimated arrival date updated');
                } else {
                    toast.info('Tracking is up to date');
                }
                fetchContainer();
            } else {
                toast.error(data.error || data.message || 'Failed to refresh tracking');
            }
        } catch (error) {
            console.error('Error refreshing tracking:', error);
            toast.error('An error occurred while refreshing tracking');
        } finally {
            setRefreshingTracking(false);
        }
    };

	const handleStatusUpdate = async (newStatus: string) => {
		if (!container) return;
		if (newStatus === container.status) return;
		
		try {
			setUpdating(true);
			setStatusUpdateError(null);
			const response = await fetch(`/api/containers/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			});
			const data = await response.json().catch(() => ({}));

			if (response.ok) {
				setContainer((current) => current ? {
					...current,
					status: data.container?.status || newStatus,
					progress: typeof data.container?.progress === 'number' ? data.container.progress : current.progress,
				} : current);
				toast.success('Status updated successfully');
				await fetchContainer();
			} else {
				const message = data.error || 'Failed to update status';
				setStatusUpdateError(message);
				toast.error(message);
			}
		} catch (error) {
			console.error('Error updating status:', error);
			setStatusUpdateError(error instanceof Error ? error.message : 'An error occurred while updating status');
			toast.error('An error occurred');
		} finally {
			setUpdating(false);
		}
	};

	const handleCompanyUpdate = async () => {
		if (!container || !selectedCompanyId) {
			toast.error('Please select a company');
			return;
		}

		try {
			setUpdating(true);
			const response = await fetch(`/api/containers/${params.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ companyId: selectedCompanyId }),
			});

			const data = await response.json();
			if (!response.ok) {
				throw new Error(data.error || 'Failed to update company');
			}

			toast.success('Container company updated successfully');
			await fetchContainer();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update company');
		} finally {
			setUpdating(false);
		}
	};

	const handleDeleteExpense = async (expenseId: string) => {
		const isShipmentExpense = expenseId.startsWith('shipment-');
		if (!confirm('Are you sure you want to delete this expense? Linked company and user ledger transactions will also be removed.')) return;

		setDeletingExpenseId(expenseId);
		try {
			const query = isShipmentExpense
				? `shipmentExpenseEntryId=${expenseId.replace('shipment-', '')}`
				: `expenseId=${expenseId}`;

			const response = await fetch(`/api/containers/${params.id}/expenses?${query}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				toast.success('Expense deleted successfully');
				fetchContainer();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to delete expense');
			}
		} catch (error) {
			console.error('Error deleting expense:', error);
			toast.error('An error occurred');
		} finally {
			setDeletingExpenseId(null);
		}
	};

	const handleDeleteDamage = async (damageId: string) => {
		if (!confirm('Are you sure you want to delete this damage record? Associated ledger entries will also be removed.')) return;

		setDeletingDamageId(damageId);
		try {
			const response = await fetch(`/api/containers/${params.id}/damages?damageId=${damageId}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				toast.success('Damage record deleted successfully');
				fetchContainer();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to delete damage record');
			}
		} catch (error) {
			console.error('Error deleting damage record:', error);
			toast.error('An error occurred');
		} finally {
			setDeletingDamageId(null);
		}
	};

	const handleDeleteInvoice = async (invoiceId: string) => {
		if (!confirm('Are you sure you want to delete this invoice?')) return;

		setDeletingInvoiceId(invoiceId);
		try {
			const response = await fetch(`/api/containers/${params.id}/invoices?invoiceId=${invoiceId}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				toast.success('Invoice deleted successfully');
				fetchContainer();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to delete invoice');
			}
		} catch (error) {
			console.error('Error deleting invoice:', error);
			toast.error('An error occurred');
		} finally {
			setDeletingInvoiceId(null);
		}
	};

	const handleDeleteTrackingEvent = async (eventId: string) => {
		if (!confirm('Are you sure you want to delete this tracking event?')) return;

		setDeletingEventId(eventId);
		try {
			const response = await fetch(`/api/containers/${params.id}/tracking?eventId=${eventId}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				toast.success('Tracking event deleted successfully');
				fetchContainer();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to delete tracking event');
			}
		} catch (error) {
			console.error('Error deleting tracking event:', error);
			toast.error('An error occurred');
		} finally {
			setDeletingEventId(null);
		}
	};

	const handleDeleteContainer = async () => {
		if (!container) return;

		setDeleting(true);
		try {
			const response = await fetch(`/api/containers/${params.id}`, {
				method: 'DELETE',
			});

			const data = await response.json();

			if (response.ok) {
				toast.success('Container deleted successfully', {
					description: 'Redirecting to containers list...'
				});
				setTimeout(() => {
					router.push('/dashboard/containers');
				}, 1000);
			} else {
				toast.error('Failed to delete container', {
					description: data.error || 'Please try again'
				});
			}
		} catch (error) {
			console.error('Error deleting container:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		} finally {
			setDeleting(false);
			setDeleteModalOpen(false);
		}
	};

	const handleDuplicateContainer = async () => {
		if (!container || !newContainerNumber.trim()) {
			toast.error('Please enter a container number');
			return;
		}

		if (!container.companyId) {
			toast.error('Assign a company before duplicating this container');
			return;
		}

		setDuplicating(true);
		try {
			// Create new container with same details but new number
			const payload = {
				containerNumber: newContainerNumber.trim(),
				companyId: container.companyId,
				trackingNumber: container.trackingNumber,
				vesselName: container.vesselName,
				voyageNumber: container.voyageNumber,
				shippingLine: container.shippingLine,
				bookingNumber: '', // Don't copy booking number
				loadingPort: container.loadingPort,
				destinationPort: container.destinationPort,
				transshipmentPorts: container.transshipmentPorts,
				loadingDate: container.loadingDate,
				departureDate: container.departureDate,
				estimatedArrival: container.estimatedArrival,
				maxCapacity: container.maxCapacity,
				notes: container.notes,
				autoTrackingEnabled: container.autoTrackingEnabled,
			};

			const response = await fetch('/api/containers', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success('Container duplicated successfully!', {
					description: 'Redirecting to new container...'
				});
				setTimeout(() => {
					router.push(`/dashboard/containers/${data.container.id}`);
				}, 1000);
			} else {
				toast.error('Failed to duplicate container', {
					description: data.error || 'Please try again'
				});
			}
		} catch (error) {
			console.error('Error duplicating container:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		} finally {
			setDuplicating(false);
			setDuplicateModalOpen(false);
		}
	};

	const handlePrint = () => {
		window.print();
	};

	const handleDownloadPDF = async () => {
		if (!container) return;

		try {
			toast.success('Generating PDF...', {
				description: 'Please wait a moment'
			});

			// Dynamically import the PDF generator to avoid SSR issues
			const { downloadContainerPDF } = await import('@/lib/utils/generateContainerPDF');
			
			// Generate and download the PDF
			downloadContainerPDF(container as any);

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

	const handleGenerateInvoices = async () => {
		if (!container) return;

		setGeneratingInvoices(true);
		try {
			const response = await fetch('/api/invoices/generate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					containerId: container.id,
					sendEmail: false,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				const detailParts = [
					data.summary.newInvoices ? `Created ${data.summary.newInvoices} new invoice(s)` : null,
					data.summary.updatedInvoices ? `updated ${data.summary.updatedInvoices} draft invoice(s)` : null,
					data.summary.supplementalInvoices ? `issued ${data.summary.supplementalInvoices} supplemental invoice(s)` : null,
					data.summary.creditNotes ? `issued ${data.summary.creditNotes} credit note(s)` : null,
				].filter(Boolean);

				toast.success('Invoices generated successfully!', {
					description: detailParts.join(', ') || 'No invoice changes were required.'
				});
				await refreshContainerPage();
				setInvoiceGenerationModalOpen(false);
			} else {
				toast.error('Failed to generate invoices', {
					description: data.error || 'Please try again'
				});
			}
		} catch (error) {
			console.error('Error generating invoices:', error);
			toast.error('An error occurred', {
				description: 'Please try again later'
			});
		} finally {
			setGeneratingInvoices(false);
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

	if (loading) {
		return (
			<ProtectedRoute>
				<DetailPageSkeleton />
			</ProtectedRoute>
		);
	}

	if (!container) {
		return (
			<ProtectedRoute>
				<DashboardSurface>
					<EmptyState
						icon={<Package className="w-12 h-12" />}
						title="Container Not Found"
						description="The container you're looking for doesn't exist"
						action={
							<Button 
								variant="primary" 
								onClick={() => router.push('/dashboard/containers')}
							>
								Back to Containers
							</Button>
						}
					/>
				</DashboardSurface>
			</ProtectedRoute>
		);
	}

	const capacityPercentage = (container.currentCount / container.maxCapacity) * 100;
	const netProfit = container.totals.expenses > 0 ? container.totals.invoices - container.totals.expenses : 0;
	const isShipmentExpense = (expense: Expense) => {
		const source = expense.source?.toUpperCase();
		return source === 'SHIPMENT' || expense.id.startsWith('shipment-') || Boolean(expense.shipmentId);
	};
	const containerOnlyExpenses = container.expenses.filter((expense) => !isShipmentExpense(expense));
	const shipmentOnlyExpenses = container.expenses.filter(isShipmentExpense);
	const displayedExpenses = expenseView === 'CONTAINER' ? containerOnlyExpenses : shipmentOnlyExpenses;
	const displayedExpenseTotal = displayedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
	const isContainerWorkflowLocked = container.status === 'CLOSED' && !canOverrideClosedStages;

	return (
		<ProtectedRoute>
			<DashboardSurface>
				{/* Breadcrumbs */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
					<Breadcrumbs />
				</JXBox>

				{/* Page Header */}
				<PageHeader
					title={container.containerNumber}
					description={container.trackingNumber ? `Tracking: ${container.trackingNumber}` : 'Container details and management'}
					actions={
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
							<StatusBadge 
								status={container.status}
								className="no-print"
							/>
							<CopyButton value={container.containerNumber} label="Container #" />
							{container.trackingNumber && (
								<CopyButton value={container.trackingNumber} label="Tracking #" />
							)}
							<Button 
								variant="outline" 
								size="sm" 
								icon={<Layers className="w-4 h-4 text-[var(--accent-gold)]" />}
								onClick={() => setLoadPlannerOpen(true)}
								className="no-print"
							>
								2D Load Planner
							</Button>
                            {isAdmin && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    icon={<QrCode className="w-4 h-4" />}
                                    onClick={() => setQrModalOpen(true)}
                                    className="no-print"
                                >
                                    QR Code
                                </Button>
                            )}
                            {isAdmin && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    icon={<Copy className="w-4 h-4" />}
                                    onClick={() => {
                                        setNewContainerNumber('');
                                        setDuplicateModalOpen(true);
                                    }}
                                    className="no-print"
                                >
                                    Duplicate
                                </Button>
                            )}
							<Button 
								variant="outline" 
								size="sm" 
								icon={<Download className="w-4 h-4 text-emerald-500" />}
								onClick={() => openUniversalShipmentExport({
									filters: { containerId: container.id },
									title: `Export Container ${container.containerNumber} Shipments`,
									subtitle: 'Download loaded vehicles manifest',
								})}
								className="no-print"
							>
								Export Shipments
							</Button>
							<Button 
								variant="outline" 
								size="sm" 
								icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
								onClick={() => setCustomsPacketModalOpen(true)}
								className="no-print"
							>
								Customs Packet
							</Button>
							<Button 
								variant="primary" 
								size="sm" 
								icon={<FileDown className="w-4 h-4" />}
								onClick={handleDownloadPDF}
								className="no-print"
								style={{backgroundColor: 'var(--accent-gold)', color: 'white'}}
							>
								Download PDF
							</Button>
							<Button 
								variant="outline" 
								size="sm" 
								icon={<Printer className="w-4 h-4" />}
								onClick={handlePrint}
								className="no-print"
							>
								Print
							</Button>
                            {isAdmin && (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    icon={<Trash2 className="w-4 h-4" />}
                                    onClick={() => setDeleteModalOpen(true)}
                                    style={{borderColor: 'var(--error)', color: 'var(--error)'}}
                                    className="no-print"
                                >
                                    Delete
                                </Button>
                            )}
							<Button href="/dashboard/containers" variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />} className="no-print">
								Back
							</Button>
						</JXBox>
					}
				/>

				{/* Container Milestone Progression Stepper */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', marginBottom: '24px'}}>
					<JXBox padding="none" border={false} style={{padding: '20px', borderRadius: '16px', backgroundColor: 'var(--panel)', border: '1px solid var(--border)', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)'}}>
						<span className="text-xs text-[var(--text-secondary)]" style={{fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
							Container Lifecycle Progression
						</span>
						<MilestoneStepper
							steps={[
								{ id: 'CREATED', label: 'Created' },
								{ id: 'WAITING_FOR_LOADING', label: 'Waiting' },
								{ id: 'LOADED', label: 'Loaded' },
								{ id: 'IN_TRANSIT', label: 'In Transit' },
								{ id: 'ARRIVED_PORT', label: 'Arrived Port' },
								{ id: 'CUSTOMS_CLEARANCE', label: 'Customs' },
								{ id: 'RELEASED', label: 'Released' },
							]}
							currentStepId={container.status}
							orientation="horizontal"
						/>
					</JXBox>
				</JXBox>

				{/* Stats Overview */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', marginBottom: '24px'}}>
					<DashboardGrid className="grid-cols-1 md:grid-cols-4">
						<StatsCard
							icon={<Package style={{ fontSize: 18 }} />}
							title="Capacity"
							value={`${container.currentCount}/${container.maxCapacity}`}
							variant="info"
							size="md"
						/>
                        {isAdmin && (
                            <StatsCard
                                icon={<DollarSign style={{ fontSize: 18 }} />}
                                title="Net Profit"
                                value={formatCurrency(netProfit)}
                                variant={netProfit >= 0 ? 'success' : 'error'}
                                size="md"
                            />
                        )}
						<StatsCard
							icon={<TrendingUp style={{ fontSize: 18 }} />}
							title="Progress"
							value={`${container.progress}%`}
							variant="default"
							size="md"
						/>
						<StatsCard
							icon={<Ship style={{ fontSize: 18 }} />}
							title="Status"
							value={statusConfig[container.status]?.label || container.status}
							variant={statusConfig[container.status]?.color || 'default'}
							size="md"
						/>
					</DashboardGrid>
				</JXBox>

				{/* Progress Bar */}
				{container.progress > 0 && (
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', marginBottom: '24px'}}>
						<DashboardPanel noHeaderBorder>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
									Shipping Progress
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 700, color: 'var(--accent-gold)'}}>
									{container.progress}%
								</JXBox>
							</JXBox>
							<div role="progressbar" aria-valuenow={container.progress} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]" style={{height: '8px', borderRadius: '8px', backgroundColor: 'rgba(201, 155, 47, 0.1)'}}><div className="h-full rounded-full transition-all duration-300" style={{ width: `${container.progress}%`, backgroundColor: 'var(--accent-gold)' }} /></div>
						</DashboardPanel>
					</JXBox>
				)}

				{/* Tabs */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', marginBottom: '16px'}}>
					<div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
						<button
						  key={"overview"}
						  type="button"
						  role="tab"
						  aria-selected={activeTab === "overview"}
						  onClick={() => { const newValue = "overview"; setActiveTab(newValue);
							const nextParams = new URLSearchParams(searchParams.toString());
							nextParams.set('tab', newValue);
							router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
						  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "overview" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
						>
						  {"Overview"}
						</button>
						<button
						  key={"shipments"}
						  type="button"
						  role="tab"
						  aria-selected={activeTab === "shipments"}
						  onClick={() => { const newValue = "shipments"; setActiveTab(newValue);
							const nextParams = new URLSearchParams(searchParams.toString());
							nextParams.set('tab', newValue);
							router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
						  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "shipments" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
						>
						  {`Shipments (${container.shipments.length})`}
						</button>
						{canViewExpenses && (
						<button
						  key={"expenses"}
						  type="button"
						  role="tab"
						  aria-selected={activeTab === "expenses"}
						  onClick={() => { const newValue = "expenses"; setActiveTab(newValue);
							const nextParams = new URLSearchParams(searchParams.toString());
							nextParams.set('tab', newValue);
							router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
						  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "expenses" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
						>
						  {`Expenses (${container.expenses.length})`}
						</button>
						)}
						{isAdmin && (
						<button
						  key={"damages"}
						  type="button"
						  role="tab"
						  aria-selected={activeTab === "damages"}
						  onClick={() => { const newValue = "damages"; setActiveTab(newValue);
							const nextParams = new URLSearchParams(searchParams.toString());
							nextParams.set('tab', newValue);
							router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
						  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "damages" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
						>
						  {`Shipment Damages (${container.damages?.length || 0})`}
						</button>
						)}
						{canViewInvoices && (
						<button
						  key={"invoices"}
						  type="button"
						  role="tab"
						  aria-selected={activeTab === "invoices"}
						  onClick={() => { const newValue = "invoices"; setActiveTab(newValue);
							const nextParams = new URLSearchParams(searchParams.toString());
							nextParams.set('tab', newValue);
							router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
						  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "invoices" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
						>
						  {`Invoices (${container.invoices.length})`}
						</button>
						)}
						{canViewInvoices && (
						<button
						  key={"user-invoices"}
						  type="button"
						  role="tab"
						  aria-selected={activeTab === "user-invoices"}
						  onClick={() => { const newValue = "user-invoices"; setActiveTab(newValue);
							const nextParams = new URLSearchParams(searchParams.toString());
							nextParams.set('tab', newValue);
							router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
						  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "user-invoices" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
						>
						  {`User Invoices (${container.userInvoices?.length || 0})`}
						</button>
						)}
						<button
						  key={"documents"}
						  type="button"
						  role="tab"
						  aria-selected={activeTab === "documents"}
						  onClick={() => { const newValue = "documents"; setActiveTab(newValue);
							const nextParams = new URLSearchParams(searchParams.toString());
							nextParams.set('tab', newValue);
							router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
						  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "documents" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
						>
						  {`Documents (${container.documents.length})`}
						</button>
						<button
						  key={"tracking"}
						  type="button"
						  role="tab"
						  aria-selected={activeTab === "tracking"}
						  onClick={() => { const newValue = "tracking"; setActiveTab(newValue);
							const nextParams = new URLSearchParams(searchParams.toString());
							nextParams.set('tab', newValue);
							router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
						  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "tracking" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
						>
						  {`Tracking (${container.trackingEvents?.length || 0})`}
						</button>
                        {isAdmin && (
                        <button
                          key={"activity"}
                          type="button"
                          role="tab"
                          aria-selected={activeTab === "activity"}
                          onClick={() => { const newValue = "activity"; setActiveTab(newValue);
							const nextParams = new URLSearchParams(searchParams.toString());
							nextParams.set('tab', newValue);
							router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
                          className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "activity" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                          {<Activity className="w-4 h-4" />} {"Activity"}
                        </button>
                        )}
					</div>
				</JXBox>

				{/* Tab Content */}
				<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingBottom: '32px'}}>
					{/* Overview Tab */}
					{activeTab === 'overview' && (
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
							{/* Stowing Capacity Meter */}
							<ContainerCapacityGauge
								containerType="40HC"
								itemCount={container.shipments.length || container.currentCount}
							/>

							{/* Container Profitability & Unit Economics */}
							{isAdmin && (
								<ContainerProfitabilityCard
									oceanFreightCost={
										container.expenses
											.filter((e) => e.type?.toLowerCase().includes('ocean') || e.description?.toLowerCase().includes('ocean') || e.type?.toLowerCase().includes('freight'))
											.reduce((s, e) => s + e.amount, 0)
									}
									drayageCost={
										container.expenses
											.filter((e) => e.type?.toLowerCase().includes('drayage') || e.description?.toLowerCase().includes('truck') || e.description?.toLowerCase().includes('towing'))
											.reduce((s, e) => s + e.amount, 0)
									}
									terminalHandlingCost={
										container.expenses
											.filter((e) => e.type?.toLowerCase().includes('terminal') || e.type?.toLowerCase().includes('handling') || e.description?.toLowerCase().includes('handling'))
											.reduce((s, e) => s + e.amount, 0)
									}
									customsCost={
										container.expenses
											.filter((e) => e.type?.toLowerCase().includes('custom') || e.description?.toLowerCase().includes('custom'))
											.reduce((s, e) => s + e.amount, 0)
									}
									otherExpenses={
										container.expenses
											.filter((e) => 
												!e.type?.toLowerCase().includes('ocean') && !e.description?.toLowerCase().includes('ocean') && !e.type?.toLowerCase().includes('freight') &&
												!e.type?.toLowerCase().includes('drayage') && !e.description?.toLowerCase().includes('truck') && !e.description?.toLowerCase().includes('towing') &&
												!e.type?.toLowerCase().includes('terminal') && !e.type?.toLowerCase().includes('handling') && !e.description?.toLowerCase().includes('handling') &&
												!e.type?.toLowerCase().includes('custom') && !e.description?.toLowerCase().includes('custom')
											)
											.reduce((s, e) => s + e.amount, 0)
									}
									itemRevenues={container.shipments.map((s) => {
										const totalInvoiceAmt = (container.userInvoices && container.userInvoices.length > 0)
											? container.userInvoices.reduce((sum, inv) => sum + inv.total, 0)
											: (container.totals?.invoices || 0);
										const perShipmentRevenue = container.shipments.length > 0
											? Math.round(totalInvoiceAmt / container.shipments.length)
											: 0;
										return {
											id: s.id,
											description: [s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || 'Vehicle Cargo',
											amount: perShipmentRevenue,
											vin: s.vehicleVIN,
										};
									})}
								/>
							)}

							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '24px'}} className="grid-cols-1 grid md:grid-cols-[1fr_1fr]">
								{/* Container Information */}
								<DashboardPanel 
									title="Container Information"
									description="Basic container details"
								>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Container Number</JXBox>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
												{container.containerNumber}
											</JXBox>
										</JXBox>
										{isAdmin && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '8px'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Assigned Company</JXBox>
												<BareSelect options={[{ value: "", label: 'Select a company...' }, ...companies.map((company) => ({ value: company.id, label: `${company.name}${company.code ? ` (${company.code})` : ''}` }))]} value={selectedCompanyId} disabled={updating} size="small" onChange={(e) => setSelectedCompanyId(e.target.value)} />
												<Button
													variant="outline"
													size="sm"
													onClick={handleCompanyUpdate}
													disabled={updating || !selectedCompanyId || selectedCompanyId === (container.companyId || '')}
												>
													{updating ? 'Saving...' : 'Save Company'}
												</Button>
											</JXBox>
										)}
										{container.trackingNumber && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Tracking Number</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{container.trackingNumber}
												</JXBox>
											</JXBox>
										)}
										{container.bookingNumber && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Booking Number</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{container.bookingNumber}
												</JXBox>
											</JXBox>
										)}
										<div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{borderColor: 'var(--border)'}} />
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Capacity</JXBox>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
												{container.currentCount} / {container.maxCapacity} vehicles ({capacityPercentage.toFixed(0)}%)
											</JXBox>
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Created</JXBox>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
												{formatDate(container.createdAt)}
											</JXBox>
										</JXBox>
									</JXBox>
								</DashboardPanel>

								{/* Shipping Details */}
								<DashboardPanel 
									title="Shipping Details"
									description="Vessel and shipping information"
								>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
										{container.vesselName && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Vessel Name</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{container.vesselName}
												</JXBox>
											</JXBox>
										)}
										{container.voyageNumber && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Voyage Number</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{container.voyageNumber}
												</JXBox>
											</JXBox>
										)}
										{container.shippingLine && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Shipping Line</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{container.shippingLine}
												</JXBox>
											</JXBox>
										)}
										<div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{borderColor: 'var(--border)'}} />
										{container.loadingPort && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Loading Port</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{container.loadingPort}
												</JXBox>
											</JXBox>
										)}
										{container.destinationPort && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Destination Port</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{container.destinationPort}
												</JXBox>
											</JXBox>
										)}
										{container.currentLocation && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Current Location</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{container.currentLocation}
												</JXBox>
											</JXBox>
										)}
									</JXBox>
								</DashboardPanel>

								{/* Important Dates */}
								<DashboardPanel 
									title="Important Dates"
									description="Shipping timeline"
								>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
										{container.loadingDate && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Loading Date</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{formatDate(container.loadingDate)}
												</JXBox>
											</JXBox>
										)}
										{container.departureDate && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Departure Date</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{formatDate(container.departureDate)}
												</JXBox>
											</JXBox>
										)}
										{container.estimatedArrival && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Estimated Arrival</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{formatDate(container.estimatedArrival)}
												</JXBox>
											</JXBox>
										)}
										{container.actualArrival && (
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Actual Arrival</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
													{formatDate(container.actualArrival)}
												</JXBox>
											</JXBox>
										)}
									</JXBox>
								</DashboardPanel>

								{/* Financial Summary */}
								<DashboardPanel 
									title="Financial Summary"
									description="Revenue and expenses"
								>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Total Expenses</JXBox>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--error)'}}>
												{formatCurrency(container.totals.expenses)}
											</JXBox>
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>Total Revenue</JXBox>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)'}}>
												{formatCurrency(container.totals.invoices)}
											</JXBox>
										</JXBox>
										<div aria-hidden="true" className="my-4 border-t border-[var(--border)]" style={{borderColor: 'var(--border)'}} />
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)'}}>Net Profit</JXBox>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1rem', fontWeight: 700, color: netProfit >= 0 ? 'var(--success)' : 'var(--error)'}}>
												{formatCurrency(netProfit)}
											</JXBox>
										</JXBox>
									</JXBox>
								</DashboardPanel>
							</JXBox>

							{/* Notes */}
							{container.notes && (
								<DashboardPanel title="Notes" description="Additional information">
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap'}}>
										{container.notes}
									</JXBox>
								</DashboardPanel>
							)}

							{/* Status Management */}
							{canManageWorkflow && (
								<DashboardPanel 
									title="Update Container Status"
									description="Change the container's current status"
								>
									{isContainerWorkflowLocked && (
										<JXBox padding="none" border={false} style={{marginBottom: '12px', padding: '10px', borderRadius: '12px', border: '1px solid rgba(234, 179, 8, 0.35)', background: 'rgba(234, 179, 8, 0.08)', display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
											<AlertTriangle className="w-4 h-4" style={{ color: 'rgb(180, 83, 9)', marginTop: 2 }} />
											<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'rgb(146, 64, 14)'}}>
												This container is closed. Status changes require workflow override permission.
											</p>
										</JXBox>
									)}
									{statusUpdateError && (
										<JXBox padding="none" border={false} style={{marginBottom: '12px', padding: '10px', borderRadius: '12px', border: '1px solid rgba(220, 38, 38, 0.25)', background: 'rgba(220, 38, 38, 0.06)', display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
											<AlertTriangle className="w-4 h-4" style={{ color: 'rgb(185, 28, 28)', marginTop: 2 }} />
											<p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'rgb(153, 27, 27)'}}>
												{statusUpdateError}
											</p>
										</JXBox>
									)}
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexWrap: 'wrap', gap: '12px'}}>
										{Object.entries(statusConfig).map(([status, config]) => (
											<Button
												key={status}
												variant={container.status === status ? 'primary' : 'outline'}
												size="sm"
												onClick={() => handleStatusUpdate(status)}
												disabled={updating || container.status === status || isContainerWorkflowLocked}
											>
												{config.label}
											</Button>
										))}
									</JXBox>
								</DashboardPanel>
							)}
						</JXBox>
					)}

					{/* Shipments Tab */}
					{activeTab === 'shipments' && (
						<DashboardPanel
							title={`Assigned Vehicles (${container.currentCount}/${container.maxCapacity})`}
							description="Vehicles currently loaded in this container"
							actions={
								canManageWorkflow && !isContainerWorkflowLocked && container.currentCount < container.maxCapacity ? (
									<Button
										variant="primary"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={openAssignShipmentModal}
									>
										Assign Shipment
									</Button>
								) : undefined
							}
						>
							{container.shipments.length === 0 ? (
								<EmptyState
									icon={<Package className="w-12 h-12" />}
									title="No Vehicles Assigned"
									description="This container doesn't have any vehicles assigned yet"
								/>
							) : (
								<div className="w-full overflow-x-auto">
									<table className="w-full border-collapse text-sm [&_td]:py-1.5 [&_th]:py-1.5">
										<thead>
											<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Vehicle</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">VIN</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Payment</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Price</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Insurance</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Status</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Actions</th>
											</tr>
										</thead>
										<tbody>
											{container.shipments.map((shipment) => (
												<tr key={shipment.id} style={{cursor: 'pointer'}} onClick={() => router.push(`/dashboard/shipments/${shipment.id}`)} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														{shipment.vehicleMake} {shipment.vehicleModel}
													</th>
													<th style={{fontFamily: 'monospace', fontSize: '0.75rem'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														{shipment.vehicleVIN || 'N/A'}
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '4px'}}>
															{(shipment as any).paymentMode && (
																<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontSize: '0.7rem', width: 'fit-content', backgroundColor: (shipment as any).paymentMode === 'CASH' ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--warning-rgb), 0.1)', color: (shipment as any).paymentMode === 'CASH' ? 'var(--success)' : 'var(--warning)'}}>{(shipment as any).paymentMode}</span>
															)}
															<span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontSize: '0.7rem', width: 'fit-content', backgroundColor: (shipment as any).paymentStatus === 'COMPLETED' ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--text-secondary-rgb), 0.1)', color: (shipment as any).paymentStatus === 'COMPLETED' ? 'var(--success)' : 'var(--text-secondary)'}}>{(shipment as any).paymentStatus || 'PENDING'}</span>
														</JXBox>
													</th>
													<th style={{fontWeight: 600, color: 'var(--text-primary)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														{(shipment as any).price ? formatCurrency((shipment as any).price) : 'N/A'}
													</th>
													<th style={{fontWeight: 600, color: 'var(--accent-gold)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														{(shipment as any).insuranceValue ? formatCurrency((shipment as any).insuranceValue) : 'N/A'}
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														<StatusBadge 
															status={shipment.status} 
															size="sm"
														/>
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '4px', justifyContent: 'flex-end'}}>
															{canManageExpenses && (
																<Button
																	variant="outline"
																	size="sm"
																	icon={<DollarSign className="w-3 h-3" />}
																	onClick={(e) => {
																		e.stopPropagation();
																		setSelectedShipmentForExpense(shipment.id);
																		setShipmentExpenseModalOpen(true);
																	}}
																	disabled={isContainerWorkflowLocked}
																	style={{color: 'var(--accent-gold)', borderColor: 'var(--accent-gold)'}}
																>
																	Expense
																</Button>
															)}
															<Button
																variant="outline"
																size="sm"
																icon={<Eye className="w-3 h-3" />}
																onClick={(e) => {
																	e.stopPropagation();
																	router.push(`/dashboard/shipments/${shipment.id}`);
																}}
															>
																View
															</Button>
														</JXBox>
													</th>
												</tr>
											))}
											{/* Totals Row */}
											<tr style={{backgroundColor: 'var(--surface)'}} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th colSpan={3} style={{fontWeight: 700, borderTop: '2px solid var(--border)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
													Total Revenue from Shipments
												</th>
												<th style={{fontWeight: 700, borderTop: '2px solid var(--border)', color: 'var(--success)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
													{formatCurrency(container.shipments.reduce((sum, s) => sum + ((s as any).price || 0), 0))}
												</th>
												<th style={{fontWeight: 700, borderTop: '2px solid var(--border)', color: 'var(--accent-gold)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
													{formatCurrency(container.shipments.reduce((sum, s) => sum + ((s as any).insuranceValue || 0), 0))}
												</th>
												<th colSpan={2} style={{borderTop: '2px solid var(--border)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]"></th>
											</tr>
										</tbody>
									</table>
								</div>
							)}
						</DashboardPanel>
					)}

					{/* Expenses Tab */}
					{activeTab === 'expenses' && (
						<DashboardPanel
							title="Container Expenses"
							description="All costs and expenses for this container"
						>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', gap: '8px', marginBottom: '16px'}}>
								{canManageExpenses && (
									<Button
										variant="outline"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => {
											setSelectedShipmentForExpense(undefined);
											setShipmentExpenseModalOpen(true);
										}}
														disabled={isContainerWorkflowLocked}
									>
										Add Shipment Expenses
									</Button>
								)}
								{canManageExpenses && (
									<Button
										variant="primary"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
														onClick={() => {
															setSelectedExpense(null);
															setExpenseModalOpen(true);
														}}
														disabled={isContainerWorkflowLocked}
									>
										Add Container Expense
									</Button>
								)}
							</JXBox>

							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, borderBottom: '1px solid var(--border)', marginBottom: '16px'}}>
								<div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
									<button
									  key={"CONTAINER"}
									  type="button"
									  role="tab"
									  aria-selected={expenseView === "CONTAINER"}
									  onClick={() => { const value = "CONTAINER"; setExpenseView(value); }}
									  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${expenseView === "CONTAINER" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
									>
									  {`Container Expenses (${containerOnlyExpenses.length})`}
									</button>
									<button
									  key={"SHIPMENT"}
									  type="button"
									  role="tab"
									  aria-selected={expenseView === "SHIPMENT"}
									  onClick={() => { const value = "SHIPMENT"; setExpenseView(value); }}
									  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${expenseView === "SHIPMENT" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
									>
									  {`Shipment Expenses (${shipmentOnlyExpenses.length})`}
									</button>
								
								</div>
							</JXBox>

							{displayedExpenses.length === 0 ? (
								<EmptyState
									icon={<DollarSign className="w-12 h-12" />}
									title={expenseView === 'CONTAINER' ? 'No Container Expenses' : 'No Shipment Expenses'}
									description={expenseView === 'CONTAINER'
										? 'No direct container expenses have been added yet'
										: 'No shipment-level expenses found for this container'}
								/>
							) : (
								<div className="w-full overflow-x-auto">
									<table className="w-full border-collapse text-sm [&_td]:py-1.5 [&_th]:py-1.5">
										<thead>
											<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Type</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Vendor</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Date</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Amount</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Actions</th>
											</tr>
										</thead>
										<tbody>
											{displayedExpenses.map((expense) => (
												<tr key={expense.id} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{expense.type}</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{expense.vendor || 'N/A'}</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{formatDate(expense.date)}</th>
													<th style={{fontWeight: 600, color: 'var(--error)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														{formatCurrency(expense.amount, expense.currency)}
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														{isShipmentExpense(expense) ? (
															<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
																<Button
																	variant="outline"
																	size="sm"
																	onClick={() => {
																		if (expense.shipmentId) {
																			router.push(`/dashboard/shipments/${expense.shipmentId}`);
																		}
																	}}
																>
																	View
																</Button>
																{canManageExpenses && (
																	<Button
																		variant="outline"
																		size="sm"
																		icon={<Trash2 className="w-3 h-3" />}
																		onClick={() => handleDeleteExpense(expense.id)}
																		disabled={deletingExpenseId === expense.id || isContainerWorkflowLocked}
																		style={{color: 'var(--error)', borderColor: 'var(--error)'}}
																	>
																		{deletingExpenseId === expense.id ? 'Deleting...' : 'Delete'}
																	</Button>
																)}
															</JXBox>
														) : (
															canManageExpenses ? (
																<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
																	<Button
																		variant="outline"
																		size="sm"
																		icon={<Pencil className="w-3 h-3" />}
																		onClick={() => {
																			setSelectedExpense(expense);
																			setExpenseModalOpen(true);
																		}}
																		disabled={deletingExpenseId === expense.id || isContainerWorkflowLocked}
																	>
																		Edit
																	</Button>
																	<Button
																		variant="outline"
																		size="sm"
																		icon={<Trash2 className="w-3 h-3" />}
																		onClick={() => handleDeleteExpense(expense.id)}
																		disabled={deletingExpenseId === expense.id || isContainerWorkflowLocked}
																		style={{color: 'var(--error)', borderColor: 'var(--error)'}}
																	>
																		{deletingExpenseId === expense.id ? 'Deleting...' : 'Delete'}
																	</Button>
																</JXBox>
															) : null
														)}
													</th>
												</tr>
											))}
											<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th colSpan={4} style={{fontWeight: 700}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
													{expenseView === 'CONTAINER' ? 'Total Container Expenses' : 'Total Shipment Expenses'}
												</th>
												<th style={{fontWeight: 700, color: 'var(--error)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
													{formatCurrency(displayedExpenseTotal)}
												</th>
											</tr>
											<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th colSpan={4} style={{fontWeight: 700}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Grand Total (All Expenses)</th>
												<th style={{fontWeight: 700, color: 'var(--error)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
													{formatCurrency(container.totals.expenses)}
												</th>
											</tr>
										</tbody>
									</table>
								</div>
							)}
						</DashboardPanel>
					)}

					{/* Shipment Damages Tab */}
					{activeTab === 'damages' && (
						<DashboardPanel
							title="Shipment Damages"
							description="Damage records for shipments in this container"
						>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}>
								{isAdmin && (
									<Button
										variant="primary"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => {
											if (!container.companyId) {
												toast.error('This container must be assigned to a shipping company before adding expenses or damages.');
												return;
											}
											setDamageModalOpen(true);
										}}
									>
										Add Damage
									</Button>
								)}
							</JXBox>

							{!container.companyId && (
								<JXBox padding="none" border={false} style={{padding: '16px', marginBottom: '16px', backgroundColor: 'rgba(var(--warning-rgb), 0.1)', border: '1px solid rgba(var(--warning-rgb), 0.3)', borderRadius: '8px'}}>
									<p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', color: 'var(--warning)'}}>
										⚠ This container must be assigned to a shipping company before adding expenses or damages.
									</p>
								</JXBox>
							)}

							{!container.damages || container.damages.length === 0 ? (
								<EmptyState
									icon={<AlertTriangle className="w-12 h-12" />}
									title="No Damage Records"
									description="No damage records have been added to this container yet"
								/>
							) : (
								<div className="w-full overflow-x-auto">
									<table className="w-full border-collapse text-sm [&_td]:py-1.5 [&_th]:py-1.5">
										<thead>
											<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Shipment</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Damage Type</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Description</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Amount</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Date</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Actions</th>
											</tr>
										</thead>
										<tbody>
											{container.damages.map((damage) => (
												<tr key={damage.id} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.8rem'}}>
															{damage.shipment
																? [damage.shipment.vehicleMake, damage.shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'
																: damage.shipmentId}
															{damage.shipment?.vehicleVIN && (
																<JXBox padding="none" border={false} component="span" style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)', marginLeft: '4px'}}>
																	({damage.shipment.vehicleVIN})
																</JXBox>
															)}
														</JXBox>
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														<JXChip label={damage.damageType === 'WE_PAY' ? 'We Pay' : 'Company Pays'} tone="neutral" />
													</th>
													<th style={{maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														{damage.description}
													</th>
													<th style={{fontWeight: 600, color: 'var(--error)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														{formatCurrency(damage.amount)}
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{formatDate(damage.createdAt)}</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														<Button
															variant="outline"
															size="sm"
															icon={<Trash2 className="w-3 h-3" />}
															onClick={() => handleDeleteDamage(damage.id)}
															disabled={deletingDamageId === damage.id}
															style={{color: 'var(--error)', borderColor: 'var(--error)'}}
														>
															{deletingDamageId === damage.id ? 'Deleting...' : 'Delete'}
														</Button>
													</th>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</DashboardPanel>
					)}

					{/* Invoices Tab */}
					{activeTab === 'invoices' && (
						<DashboardPanel
							title="Container Invoices"
							description="Billing and revenue for this container"
						>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}>
								{canManageInvoices && (
									<Button
										variant="primary"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => setInvoiceModalOpen(true)}
									>
										Create Invoice
									</Button>
								)}
							</JXBox>

							{container.invoices.length === 0 ? (
								<EmptyState
									icon={<FileText className="w-12 h-12" />}
									title="No Invoices"
									description="No invoices have been created for this container yet"
								/>
							) : (
								<div className="w-full overflow-x-auto">
									<table className="w-full border-collapse text-sm [&_td]:py-1.5 [&_th]:py-1.5">
										<thead>
											<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Invoice #</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Date</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Status</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Amount</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Actions</th>
											</tr>
										</thead>
										<tbody>
											{container.invoices.map((invoice) => (
												<tr key={invoice.id} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
													<th style={{fontFamily: 'monospace'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{invoice.invoiceNumber}</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{formatDate(invoice.date)}</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														<StatusBadge 
															status={invoice.status} 
															size="sm"
														/>
													</th>
													<th style={{fontWeight: 600, color: 'var(--success)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														{formatCurrency(invoice.amount, invoice.currency)}
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														{canManageInvoices && (
															<Button
																variant="outline"
																size="sm"
																icon={<Trash2 className="w-3 h-3" />}
																onClick={() => handleDeleteInvoice(invoice.id)}
																disabled={deletingInvoiceId === invoice.id}
																style={{color: 'var(--error)', borderColor: 'var(--error)'}}
															>
																{deletingInvoiceId === invoice.id ? 'Deleting...' : 'Delete'}
															</Button>
														)}
													</th>
												</tr>
											))}
											<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th colSpan={4} style={{fontWeight: 700}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Total Revenue</th>
												<th style={{fontWeight: 700, color: 'var(--success)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
													{formatCurrency(container.totals.invoices)}
												</th>
											</tr>
										</tbody>
									</table>
								</div>
							)}
						</DashboardPanel>
					)}

					{/* User Invoices Tab */}
					{activeTab === 'user-invoices' && (
						<DashboardPanel
							title="User Invoices"
							description="Customer invoices for shipments in this container"
						>
							{/* Info box explaining invoice generation */}
							{isAdmin && (!container.userInvoices || container.userInvoices.length === 0) && container.shipments.length > 0 && (
								<JXBox padding="none" border={false} style={{marginBottom: '24px', padding: '16px', backgroundColor: 'rgba(var(--info-rgb), 0.1)', border: '1px solid rgba(var(--info-rgb), 0.3)', borderRadius: '16px', display: 'flex', gap: '16px', alignItems: 'flex-start'}}>
									<FileText className="w-5 h-5" style={{ color: 'var(--info)', marginTop: '2px', flexShrink: 0 }} />
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, flex: 1}}>
										<p className="text-sm leading-relaxed" style={{fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', marginBottom: '4px'}}>
											Batch Invoice Shortcut
										</p>
										<p className="text-sm leading-relaxed" style={{fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5}}>
											The primary workflow is now shipment-first billing from each shipment&apos;s Billing tab. 
											Use the batch action here only when you want to process all approved shipment charges across this container in one run.
											{container.expenses && container.expenses.length > 0 && (
												<> Container expenses will be allocated using the <strong>{container.expenseAllocationMethod || 'EQUAL'}</strong> method.</>
											)}
										</p>
										<p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic'}}>
											Shipment-level invoice generation remains the recommended path when reviewing one shipment at a time.
										</p>
									</JXBox>
								</JXBox>
							)}

							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
									{container.shipments.length > 0 
										? `${new Set(container.shipments.map(s => s.user?.id)).size} unique customer(s) with shipments`
										: 'No shipments in container'
									}
								</JXBox>
								{isAdmin && (
									<Button
										variant="outline"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => setInvoiceGenerationModalOpen(true)}
										disabled={container.shipments.length === 0}
									>
										Batch Generate Invoices
									</Button>
								)}
							</JXBox>

							{!container.userInvoices || container.userInvoices.length === 0 ? (
								<EmptyState
									icon={<FileText className="w-12 h-12" />}
									title="No User Invoices"
									description={
										container.shipments.length > 0
											? 'Generate from each shipment Billing tab, or use the batch shortcut here for the whole container'
											: 'Add shipments to this container before generating invoices'
									}
								/>
							) : (
								<div className="w-full overflow-x-auto">
									<table className="w-full border-collapse text-sm [&_td]:py-1.5 [&_th]:py-1.5">
										<thead>
											<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Invoice #</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Customer</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Issue Date</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Status</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Total</th>
												<th style={{fontWeight: 600}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">Actions</th>
											</tr>
										</thead>
										<tbody>
											{container.userInvoices.map((invoice) => (
												<tr key={invoice.id} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
													<th style={{fontFamily: 'monospace'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{invoice.invoiceNumber}</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
															<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{invoice.user.name || 'N/A'}</JXBox>
															<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
																{invoice.user.email}
															</JXBox>
														</JXBox>
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{formatDate(invoice.issueDate)}</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
														<StatusBadge 
															status={invoice.status} 
															size="sm"
														/>
													</th>
													<th style={{fontWeight: 600, color: 'var(--success)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														{formatCurrency(invoice.total)}
													</th>
													<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] text-right">
														<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', justifyContent: 'flex-end'}}>
															<Button
																variant="outline"
																size="sm"
																icon={<Eye className="w-3 h-3" />}
																onClick={() => router.push(`/dashboard/invoices/${invoice.id}`)}
															>
																View
															</Button>
														</JXBox>
													</th>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</DashboardPanel>
					)}

					{/* Documents Tab */}
					{activeTab === 'documents' && (
						<DashboardPanel
							title="Container Documents"
							description="Files and documents related to this container"
						>
                            <DocumentManager 
                                documents={container.documents.map(d => ({
                                    id: d.id,
                                    name: d.name,
                                    type: d.type,
                                    fileUrl: d.fileUrl,
                                    url: d.fileUrl,
                                    fileType: d.fileType,
                                    fileSize: d.fileSize,
                                    size: d.fileSize,
                                    category: d.type,
                                    uploadedBy: d.uploadedBy,
                                    createdAt: d.uploadedAt.toString()
                                }))}
                                entityId={container.id}
                                entityType="container"
								onDocumentsChange={() => {
									void refreshContainerPage();
								}}
                            />
						</DashboardPanel>
					)}

					{/* Tracking Tab */}
					{activeTab === 'tracking' && (
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
							<OceanCarrierSyncCard
								containerId={container.id}
								containerNumber={container.containerNumber}
								shippingLine={container.shippingLine}
								vesselName={container.vesselName}
								voyageNumber={container.voyageNumber}
								loadingPort={container.loadingPort}
								destinationPort={container.destinationPort}
								estimatedArrival={container.estimatedArrival}
								departureDate={container.departureDate}
								status={container.status}
								onSyncComplete={() => {
									fetchContainer();
								}}
							/>

							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-start', marginBottom: '8px'}}>
								<Button
									variant={showMaritimeMap ? 'primary' : 'outline'}
									size="sm"
									icon={<Compass className="w-4 h-4" />}
									onClick={() => setShowMaritimeMap((prev) => !prev)}
								>
									{showMaritimeMap ? 'Hide Maritime Map' : 'View Live Vessel Map'}
								</Button>
							</JXBox>

							{showMaritimeMap && (
								<OceanRouteMap 
									originPort={container.shippingLine || container.loadingPort || 'Port of Newark (USNWK)'}
									destinationPort={container.destinationPort || 'Port of Jebel Ali (AEJEA)'}
									vesselName={container.vesselName || 'MAERSK VOYAGER'}
									voyageNumber={container.voyageNumber || container.trackingNumber || 'V-2409W'}
									containerNumber={container.containerNumber}
									currentProgressPct={container.status === 'ARRIVED_PORT' || container.status === 'CUSTOMS_CLEARANCE' || container.status === 'RELEASED' || container.status === 'CLOSED' ? 100 : (container.progress ?? 68)}
									departureDate={container.departureDate}
									estimatedArrival={container.estimatedArrival}
									etaDays={container.estimatedArrival 
										? Math.max(1, Math.ceil((new Date(container.estimatedArrival).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
										: 9}
									status={statusConfig[container.status]?.label || container.status || 'In Transit'}
								/>
							)}

							<DashboardPanel
								title="Tracking History"
								description="Location updates and status changes"
							>

							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '16px'}}>
								{canManageWorkflow && (container.trackingNumber || container.containerNumber) && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={<RefreshCw className={`w-4 h-4 ${refreshingTracking ? 'animate-spin' : ''}`} />}
                                        onClick={handleRefreshTracking}
                                        disabled={refreshingTracking || isContainerWorkflowLocked}
                                    >
                                        {refreshingTracking ? 'Syncing...' : 'Refresh Tracking'}
                                    </Button>
                                )}
								{canManageWorkflow && (
									<Button
										variant="primary"
										size="sm"
										icon={<Plus className="w-4 h-4" />}
										onClick={() => setTrackingModalOpen(true)}
										disabled={isContainerWorkflowLocked}
									>
										Add Tracking Event
									</Button>
								)}
							</JXBox>

							{(!container.trackingEvents || container.trackingEvents.length === 0) ? (
								<EmptyState
									icon={<MapPin className="w-12 h-12" />}
									title="No Tracking Events"
									description="No tracking updates have been recorded yet"
								/>
							) : (
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
									{container.trackingEvents.map((event, index) => (
										<JXBox padding="none" border={false} key={event.id} style={{backgroundColor: 'transparent', borderRadius: 0, position: 'relative', paddingLeft: '32px', borderLeft: index < container.trackingEvents.length - 1 ? '2px solid var(--border)' : 'none', paddingBottom: index < container.trackingEvents.length - 1 ? 3 : 0}}>
											<JXBox padding="none" border={false} style={{position: 'absolute', left: '-9px', top: '0px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: (event as any).completed ? 'var(--success)' : 'var(--accent-gold)', border: '2px solid var(--background)'}} />
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'start'}}>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
													<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)'}}>
														{event.status}
													</JXBox>
													{(event as any).vesselName && (
														<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
															🚢 {(event as any).vesselName}
														</JXBox>
													)}
												</JXBox>
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center'}}>
													<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
														{new Date(event.eventDate).toLocaleString()}
													</JXBox>
													<Button
														variant="outline"
														size="sm"
														icon={<Trash2 className="w-3 h-3" />}
														onClick={() => handleDeleteTrackingEvent(event.id)}
														disabled={deletingEventId === event.id || !canManageWorkflow || isContainerWorkflowLocked}
														style={{color: 'var(--error)', borderColor: 'var(--error)', minWidth: 'auto', paddingLeft: '8px', paddingRight: '8px'}}
													/>
												</JXBox>
											</JXBox>
											{event.location && (
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>
													📍 {event.location}
												</JXBox>
											)}
											{event.description && (
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>
													{event.description}
												</JXBox>
											)}
											{(event as any).source && (
												<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '8px'}}>
													<TrackingSourceBadge source={(event as any).source} size="sm" />
												</JXBox>
											)}
										</JXBox>
									))}
								</JXBox>
							)}
						</DashboardPanel>
						</JXBox>
					)}

                    {/* Activity Log Tab */}
                    {activeTab === 'activity' && (
                        <DashboardPanel
                            title="Activity History"
                            description="Audit log of all actions performed on this container"
                        >
                            <ActivityLog logs={container.auditLogs} />
                        </DashboardPanel>
                    )}
				</JXBox>

				{/* Add / Edit Container Expense Modal */}
				<AddExpenseModal
					open={expenseModalOpen}
					onClose={() => {
						setExpenseModalOpen(false);
						setSelectedExpense(null);
					}}
					containerId={container.id}
					initialExpense={selectedExpense}
					onSuccess={() => {
						void refreshContainerPage();
					}}
				/>

				{/* Add Damage Modal */}
				<AddDamageModal
					open={damageModalOpen}
					onClose={() => setDamageModalOpen(false)}
					containerId={container.id}
					shipments={container.shipments}
					onSuccess={() => {
						void refreshContainerPage();
					}}
				/>

				{/* Add Shipment Expense Modal */}
				<AddShipmentExpenseModal
					open={shipmentExpenseModalOpen}
					onClose={() => {
						setShipmentExpenseModalOpen(false);
						setSelectedShipmentForExpense(undefined);
					}}
					shipmentId={selectedShipmentForExpense}
					shipments={selectedShipmentForExpense ? undefined : container.shipments.map((s) => ({
						id: s.id,
						vehicleMake: s.vehicleMake,
						vehicleModel: s.vehicleModel,
						vehicleVIN: s.vehicleVIN,
						user: s.user,
					}))}
					contextType="CONTAINER"
					contextId={String(params.id)}
					onSuccess={() => {
						void refreshContainerPage();
					}}
				/>

				{/* Add Invoice Modal */}
				<AddInvoiceModal
					open={invoiceModalOpen}
					onClose={() => setInvoiceModalOpen(false)}
					containerId={container.id}
					onSuccess={fetchContainer}
				/>

				{/* Add Tracking Event Modal */}
				<AddTrackingEventModal
					open={trackingModalOpen}
					onClose={() => setTrackingModalOpen(false)}
					containerId={container.id}
					onSuccess={fetchContainer}
				/>

				{/* QR Code Modal */}
				<Modal
				  open={qrModalOpen}
				  onClose={() => setQrModalOpen(false)}
				  size="sm"
				>
					<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '16px', paddingBottom: '16px'}}>
						<h6 className="text-sm font-semibold" style={{fontWeight: 700, color: 'black'}}>
							Container QR Code
						</h6>
						<JXBox padding="none" border={false} style={{padding: '16px', backgroundColor: 'white', borderRadius: '16px', border: '1px solid #eee'}}>
							<QRCode
								value={`${window.location.origin}/tracking?container=${container.containerNumber}`}
								size={200}
								style={{ height: "auto", maxWidth: "100%", width: "100%" }}
								viewBox={`0 0 256 256`}
							/>
						</JXBox>
						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, textAlign: 'center'}}>
							<p className="text-sm leading-relaxed" style={{fontWeight: 700, fontSize: '1.1rem', color: 'black'}}>
								{container.containerNumber}
							</p>
							{container.trackingNumber && (
								<p className="text-sm leading-relaxed" style={{color: 'gray', fontSize: '0.9rem'}}>
									Tracking: {container.trackingNumber}
								</p>
							)}
						</JXBox>
						<p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'gray', textAlign: 'center', maxWidth: '80%'}}>
							Scan to view container status and tracking details on mobile.
						</p>
						<Button
							variant="outline"
							onClick={() => setQrModalOpen(false)}
							style={{marginTop: '8px', minWidth: '100px'}}
						>
							Close
						</Button>
					</JXBox>
				</Modal>

				{/* Duplicate Container Modal */}
				<Modal
				  open={duplicateModalOpen}
				  onClose={() => !duplicating && setDuplicateModalOpen(false)}
				  title={<div style={{color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '12px'}}><JXBox padding="none" border={false} style={{width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							<Copy className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
						</JXBox>
						Duplicate Container</div>}
				  size="sm"
				  contentSx={{paddingTop: '24px', paddingBottom: '24px'}}
				  actionsSx={{paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px', borderTop: '1px solid var(--border)', gap: '8px'}}
				  actions={<>

						<Button
							variant="outline"
							onClick={() => setDuplicateModalOpen(false)}
							disabled={duplicating}
							style={{color: 'var(--text-secondary)', borderColor: 'var(--border)'}}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleDuplicateContainer}
							disabled={duplicating || !newContainerNumber.trim()}
							style={{backgroundColor: 'var(--accent-gold)', color: 'white'}}
						>
							{duplicating ? (
								<>
									<JXBox padding="none" border={false} component="span" className="animate-spin" style={{backgroundColor: 'transparent', display: 'inline-block', width: '16px', height: '16px', marginRight: '8px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%'}} />
									Duplicating...
								</>
							) : (
								<>
									<Copy className="w-4 h-4 mr-2" />
									Duplicate Container
								</>
							)}
						</Button>
				  </>}
				>

						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6}}>
								Create a copy of container <strong>{container.containerNumber}</strong> with all settings.
							</JXBox>
							
							<JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.3)'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
									<strong style={{ color: 'var(--text-primary)' }}>What will be copied:</strong>
								</JXBox>
								<JXBox padding="none" border={false} component="ul" style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '8px', paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
									<li>Vessel and voyage information</li>
									<li>Shipping line and ports</li>
									<li>Dates and capacity settings</li>
									<li>Notes and preferences</li>
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '12px', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
									<strong style={{ color: 'var(--text-primary)' }}>What won&apos;t be copied:</strong>
								</JXBox>
								<JXBox padding="none" border={false} component="ul" style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px', paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
									<li>Assigned shipments</li>
									<li>Expenses and invoices</li>
									<li>Documents and tracking events</li>
									<li>Booking number</li>
								</JXBox>
							</JXBox>

							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
								<JXBox padding="none" border={false} component="label" style={{backgroundColor: 'transparent', borderRadius: 0, display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px'}}>
									New Container Number <span style={{ color: 'var(--error)' }}>*</span>
								</JXBox>
								<input
									type="text"
									value={newContainerNumber}
									onChange={(e) => setNewContainerNumber(e.target.value)}
									placeholder="e.g., ABCU9876543"
									disabled={duplicating}
									style={{
										width: '100%',
										padding: '10px 12px',
										borderRadius: '8px',
										border: '1px solid var(--border)',
										backgroundColor: 'var(--background)',
										color: 'var(--text-primary)',
										fontSize: '0.95rem',
									}}
									autoFocus
								/>
							</JXBox>
						</JXBox>
				</Modal>

				{/* Generate Invoices Modal */}
				<Modal
				  open={invoiceGenerationModalOpen}
				  onClose={() => !generatingInvoices && setInvoiceGenerationModalOpen(false)}
				  title="Batch Generate User Invoices"
				  size="md"
				  contentSx={{paddingTop: '24px', paddingBottom: '24px'}}
				  actionsSx={{padding: '24px', borderTop: '1px solid var(--border)'}}
				  actions={<>

						<Button
							variant="outline"
							onClick={() => setInvoiceGenerationModalOpen(false)}
							disabled={generatingInvoices}
						>
							Cancel
						</Button>
						<Button
							variant="outline"
							onClick={handleGenerateInvoices}
							disabled={generatingInvoices}
							icon={<FileText className="w-4 h-4" />}
						>
							{generatingInvoices ? 'Generating...' : 'Run Batch Generation'}
						</Button>
				  </>}
				>

						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '24px'}}>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6}}>
								This is a container-wide batch shortcut for container <strong>{container.containerNumber}</strong>. Shipment Billing tabs remain the primary place to review and generate invoices one shipment at a time.
							</JXBox>

							{/* Summary */}
							<JXBox padding="none" border={false} style={{padding: '16px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, marginBottom: '12px', color: 'var(--text-primary)'}}>
									Invoice Summary
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '8px'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
											Total Shipments:
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem'}}>
											{container.shipments.length}
										</JXBox>
									</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
											Unique Customers:
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem'}}>
											{new Set(container.shipments.map(s => s.user?.id)).size}
										</JXBox>
									</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
											Container Expenses:
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem'}}>
											{formatCurrency(container.totals.expenses)}
										</JXBox>
									</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
											Expense per Vehicle:
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem'}}>
											{formatCurrency(
												container.shipments.length > 0
													? container.totals.expenses / container.shipments.length
													: 0
											)}
										</JXBox>
									</JXBox>
								</JXBox>
							</JXBox>

							{/* Info */}
							<JXBox padding="none" border={false} style={{padding: '16px', backgroundColor: 'rgba(var(--info-rgb), 0.1)', border: '1px solid rgba(var(--info-rgb), 0.3)', borderRadius: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6}}>
								<strong>What this batch action does:</strong>
								<ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
									<li>Processes approved uninvoiced shipment charges across this container</li>
									<li>Refreshes only draft or pending invoices</li>
									<li>Creates supplemental invoices or credit notes when prior invoices are already issued</li>
									<li>Still respects shipment-level charge approval and dispute states</li>
								</ul>
							</JXBox>
						</JXBox>
				</Modal>

				{/* Delete Confirmation Modal */}
				<Modal
				  open={deleteModalOpen}
				  onClose={() => !deleting && setDeleteModalOpen(false)}
				  title={<div style={{color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '12px'}}><JXBox padding="none" border={false} style={{width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(var(--error-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							<AlertTriangle className="w-5 h-5" style={{ color: 'var(--error)' }} />
						</JXBox>
						Delete Container</div>}
				  size="sm"
				  contentSx={{paddingTop: '24px', paddingBottom: '24px'}}
				  actionsSx={{paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px', borderTop: '1px solid var(--border)', gap: '8px'}}
				  actions={<>

						<Button
							variant="outline"
							onClick={() => setDeleteModalOpen(false)}
							disabled={deleting}
							style={{color: 'var(--text-secondary)', borderColor: 'var(--border)'}}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleDeleteContainer}
							disabled={deleting || container.shipments.length > 0}
							style={{backgroundColor: 'var(--error)', color: 'white'}}
						>
							{deleting ? (
								<>
									<JXBox padding="none" border={false} component="span" className="animate-spin" style={{backgroundColor: 'transparent', display: 'inline-block', width: '16px', height: '16px', marginRight: '8px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%'}} />
									Deleting...
								</>
							) : (
								<>
									<Trash2 className="w-4 h-4 mr-2" />
									Delete Container
								</>
							)}
						</Button>
				  </>}
				>

						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6}}>
								Are you sure you want to delete container <strong>{container.containerNumber}</strong>?
							</JXBox>
							
							{container.shipments.length > 0 && (
								<JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(var(--error-rgb), 0.1)', border: '1px solid rgba(var(--error-rgb), 0.3)'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'start', gap: '12px'}}>
										<AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--error)' }} />
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, color: 'var(--error)', fontSize: '0.875rem', marginBottom: '4px'}}>
												Warning: Container has {container.shipments.length} assigned shipment{container.shipments.length !== 1 ? 's' : ''}
											</JXBox>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
												You must remove all shipments from this container before deleting it.
											</JXBox>
										</JXBox>
									</JXBox>
								</JXBox>
							)}

							{container.shipments.length === 0 && (
								<JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '8px', backgroundColor: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
										<strong style={{ color: 'var(--text-primary)' }}>This action cannot be undone.</strong> This will permanently delete:
									</JXBox>
									<JXBox padding="none" border={false} component="ul" style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '8px', paddingLeft: '20px', fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
										<li>Container details and tracking information</li>
										<li>All tracking events ({container.trackingEvents?.length || 0} events)</li>
										<li>All expenses ({container.expenses.length} expenses)</li>
										<li>All invoices ({container.invoices.length} invoices)</li>
										<li>All documents ({container.documents.length} documents)</li>
										<li>All audit logs</li>
									</JXBox>
								</JXBox>
							)}
						</JXBox>
				</Modal>

				{/* Assign Shipment Modal */}
				<Modal
				  open={assignShipmentModalOpen}
				  onClose={() => !assigningShipments && setAssignShipmentModalOpen(false)}
				  title={<div style={{color: 'var(--text-primary)', fontWeight: 700, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '12px'}}><JXBox padding="none" border={false} style={{width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							<Package className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
						</JXBox>
						Assign Shipments to Container</div>}
				  size="md"
				  contentSx={{paddingTop: '24px', paddingBottom: '24px'}}
				  actionsSx={{paddingLeft: '24px', paddingRight: '24px', paddingTop: '16px', paddingBottom: '16px', borderTop: '1px solid var(--border)', gap: '8px'}}
				  actions={<>

						<Button
							variant="outline"
							onClick={() => setAssignShipmentModalOpen(false)}
							disabled={assigningShipments}
							style={{color: 'var(--text-secondary)', borderColor: 'var(--border)'}}
						>
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleAssignShipments}
							disabled={selectedShipmentIds.length === 0 || assigningShipments}
							style={{backgroundColor: 'var(--accent-gold)', color: 'white'}}
						>
							{assigningShipments ? (
								<>
									<JXBox padding="none" border={false} component="span" className="animate-spin" style={{backgroundColor: 'transparent', display: 'inline-block', width: '16px', height: '16px', marginRight: '8px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%'}} />
									Assigning...
								</>
							) : (
								<>
									<Package className="w-4 h-4 mr-2" />
									Assign{selectedShipmentIds.length > 0 ? ` (${selectedShipmentIds.length})` : ''}
								</>
							)}
						</Button>
				  </>}
				>

						<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6}}>
								Select shipments to assign to container <strong>{container.containerNumber}</strong>.
							</JXBox>

							{/* Capacity Info */}
							<JXBox padding="none" border={false} style={{padding: '16px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px'}}>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '8px'}}>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
											Current Vehicles:
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem'}}>
											{container.currentCount} / {container.maxCapacity}
										</JXBox>
									</JXBox>
									<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
											Remaining Capacity:
										</JXBox>
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, color: 'var(--success)', fontSize: '0.875rem'}}>
											{container.maxCapacity - container.currentCount}
										</JXBox>
									</JXBox>
									{selectedShipmentIds.length > 0 && (
										<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between'}}>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
												Selected:
											</JXBox>
											<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, color: 'var(--accent-gold)', fontSize: '0.875rem'}}>
												{selectedShipmentIds.length} shipment{selectedShipmentIds.length !== 1 ? 's' : ''}
											</JXBox>
										</JXBox>
									)}
								</JXBox>
							</JXBox>

							{/* Search */}
							<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
								<JXBox padding="none" border={false} component="label" style={{backgroundColor: 'transparent', borderRadius: 0, display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px'}}>
									Search Shipments
								</JXBox>
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, position: 'relative'}}>
									<Search className="w-4 h-4" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
									<input
										type="text"
										value={shipmentSearchQuery}
										onChange={(e) => setShipmentSearchQuery(e.target.value)}
										placeholder="Search by vehicle, VIN, or customer..."
										style={{
											width: '100%',
											padding: '10px 12px 10px 36px',
											borderRadius: '8px',
											border: '1px solid var(--border)',
											backgroundColor: 'var(--background)',
											color: 'var(--text-primary)',
											fontSize: '0.875rem',
										}}
									/>
								</JXBox>
							</JXBox>

							{/* Shipments List */}
							{loadingAvailableShipments ? (
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'center', paddingTop: '32px', paddingBottom: '32px'}}>
									<JXBox padding="none" border={false} component="span" className="animate-spin" style={{backgroundColor: 'transparent', display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--accent-gold)', borderRadius: '50%'}} />
								</JXBox>
							) : filteredAvailableShipments.length === 0 ? (
								<JXBox padding="none" border={false} style={{padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', backgroundColor: 'var(--background)', borderRadius: '8px', border: '1px solid var(--border)'}}>
									{shipmentSearchQuery ? 'No shipments match your search' : 'No available shipments found'}
								</JXBox>
							) : (
								<JXBox padding="none" border={false} style={{backgroundColor: 'transparent', maxHeight: '40vh', overflow: 'auto', borderRadius: '8px', border: '1px solid var(--border)'}}>
									<div className="w-full overflow-x-auto">
										<table className="w-full border-collapse text-sm [&_td]:py-1.5 [&_th]:py-1.5">
											<thead>
												<tr className="hover:bg-[rgba(var(--border-rgb),0.25)]">
													<th style={{backgroundColor: 'var(--background)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] w-10 px-2">
														<input type="checkbox" ref={(el) => { if (el) el.indeterminate = selectedShipmentIds.length > 0 && selectedShipmentIds.length < filteredAvailableShipments.length; }} onChange={(e) => {
																if (e.target.checked) {
																	const remaining = container.maxCapacity - container.currentCount;
																	setSelectedShipmentIds(filteredAvailableShipments.slice(0, remaining).map((s: any) => s.id));
																} else {
																	setSelectedShipmentIds([]);
																}
															}} checked={filteredAvailableShipments.length > 0 && selectedShipmentIds.length === filteredAvailableShipments.length} style={{color: 'var(--text-secondary)'}} className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" />
													</th>
													<th style={{fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'var(--background)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Vehicle</th>
													<th style={{fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'var(--background)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">VIN</th>
													<th style={{fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'var(--background)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Customer</th>
													<th style={{fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-secondary)', backgroundColor: 'var(--background)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Status</th>
												</tr>
											</thead>
											<tbody>
												{filteredAvailableShipments.map((shipment: any) => {
													const isSelected = selectedShipmentIds.includes(shipment.id);
													const remaining = container.maxCapacity - container.currentCount;
													const isDisabled = !isSelected && selectedShipmentIds.length >= remaining;
													return (
														<tr key={shipment.id} style={{cursor: isDisabled ? 'not-allowed' : 'pointer', opacity: isDisabled ? 0.5 : 1}} onClick={() => {
																if (isDisabled) return;
																setSelectedShipmentIds((prev) =>
																	isSelected ? prev.filter((id) => id !== shipment.id) : [...prev, shipment.id]
																);
															}} className="hover:bg-[rgba(var(--border-rgb),0.25)]">
															<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)] w-10 px-2">
																<input type="checkbox" checked={isSelected} disabled={isDisabled} style={{color: 'var(--text-secondary)'}} className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" />
															</th>
															<th style={{fontSize: '0.875rem', color: 'var(--text-primary)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
																{shipment.vehicleMake} {shipment.vehicleModel}
															</th>
															<th style={{fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-secondary)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
																{shipment.vehicleVIN || 'N/A'}
															</th>
															<th style={{fontSize: '0.875rem', color: 'var(--text-primary)'}} className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
																{shipment.user?.name || shipment.user?.email || 'N/A'}
															</th>
															<th className="border-b border-[var(--border)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
																<StatusBadge
																	status={shipment.status}
																	size="sm"
																/>
															</th>
														</tr>
													);
												})}
											</tbody>
										</table>
									</div>
								</JXBox>
							)}
						</JXBox>
				</Modal>
				{/* 2D Visual Container Load Planner Modal */}
				{loadPlannerOpen && (
					<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
						<div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--panel)] shadow-2xl border border-[var(--border)]">
							<ContainerLoadPlanner
								containerNumber={container.containerNumber}
								containerType="40ft_hc"
								containersList={[{
									id: container.id,
									containerNumber: container.containerNumber,
									capacity: `${container.currentCount}/${container.maxCapacity}`,
								}]}
								selectedContainerId={container.id}
								onClose={() => setLoadPlannerOpen(false)}
								onSave={() => setLoadPlannerOpen(false)}
							/>
						</div>
					</div>
				)}
				{/* Destination Customs Document Packet Modal */}
				{customsPacketModalOpen && (
					<CustomsDocumentPacketModal
						open={customsPacketModalOpen}
						onClose={() => setCustomsPacketModalOpen(false)}
						container={{
							id: container.id,
							containerNumber: container.containerNumber,
							trackingNumber: container.trackingNumber,
							vesselName: container.vesselName,
							voyageNumber: container.voyageNumber,
							shippingLine: container.shippingLine,
							bookingNumber: container.bookingNumber,
							loadingPort: container.loadingPort,
							destinationPort: container.destinationPort,
							departureDate: container.departureDate,
							estimatedArrival: container.estimatedArrival,
							status: container.status,
							shipments: container.shipments,
						}}
					/>
				)}
			</DashboardSurface>
		</ProtectedRoute>
	);
}

// useSearchParams() must sit under a Suspense boundary or static
// prerendering fails (missing-suspense-with-csr-bailout).
export default function ContainerDetailPage() {
  return (
    <Suspense fallback={<div aria-busy="true" style={{ minHeight: '50vh' }} />}>
      <ContainerDetailPageContent />
    </Suspense>
  );
}
