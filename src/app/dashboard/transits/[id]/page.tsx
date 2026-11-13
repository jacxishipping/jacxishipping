'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  ArrowLeft,
  DollarSign,
  History,
  Package,
  Pencil,
  Plus,
  Trash2,
  Truck,
  Upload,
  User,
  Download,
} from 'lucide-react';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, CopyButton, FormField, IconButton, MilestoneStepper, Modal, PageHeader, Select, StatsCard, TableSkeleton, Tooltip, toast } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import AddShipmentExpenseModal from '@/components/shipments/AddShipmentExpenseModal';
import AddTransitExpenseModal from '@/components/transits/AddTransitExpenseModal';
import { hasPermission } from '@/lib/rbac';
import { formatMoney as formatCurrency } from '@/lib/format';
import { openUniversalShipmentExport } from '@/components/shipments/UniversalShipmentExportModal';

interface Company {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  email: string | null;
}

interface Shipment {
  id: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  status: string;
  user: { id: string; name: string | null; email: string; phone: string | null };
}

interface AssignableShipment {
  id: string;
  status: string;
  transitId: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  user: { id: string; name: string | null; email: string };
  container?: { status: string | null } | null;
}

interface TransitEvent {
  id: string;
  companyId: string;
  origin: string;
  destination: string;
  status: string;
  location: string | null;
  description: string | null;
  eventDate: string;
  createdAt: string;
  company: Company;
}

interface TransitExpense {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  invoiceNumber: string | null;
  category: string | null;
  notes: string | null;
  shipment: { id: string; vehicleMake: string | null; vehicleModel: string | null; vehicleVIN: string | null } | null;
  transitEvent?: {
    id: string;
    origin: string;
    destination: string;
    company: { id: string; name: string; code: string | null };
  } | null;
  source: 'TRANSIT_EXPENSE' | 'SHIPMENT_EXPENSE';
}

interface Transit {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  dispatchDate: string | null;
  estimatedDelivery: string | null;
  actualDelivery: string | null;
  deliveryReceiverName: string | null;
  deliveryProofUrl: string | null;
  deliveryProofName: string | null;
  deliveryProofType: string | null;
  deliveryNotes: string | null;
  cost: number | null;
  notes: string | null;
  createdAt: string;
  currentEvent: TransitEvent | null;
  currentCompany: Company | null;
  shipments: Shipment[];
  events: TransitEvent[];
  expenses: TransitExpense[];
  _count: { shipments: number; events: number; expenses: number };
}

const STATUS_OPTIONS = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'CANCELLED'];
const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'rgba(156, 163, 175, 0.15)', text: 'rgb(156, 163, 175)', border: 'rgba(156, 163, 175, 0.3)' },
  DISPATCHED: { bg: 'rgba(251, 191, 36, 0.15)', text: 'rgb(251, 191, 36)', border: 'rgba(251, 191, 36, 0.3)' },
  IN_TRANSIT: { bg: 'rgba(99, 102, 241, 0.15)', text: 'rgb(99, 102, 241)', border: 'rgba(99, 102, 241, 0.3)' },
  ARRIVED: { bg: 'rgba(34, 197, 94, 0.15)', text: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.3)' },
  DELIVERED: { bg: 'rgba(20, 184, 166, 0.15)', text: 'rgb(20, 184, 166)', border: 'rgba(20, 184, 166, 0.3)' },
  CANCELLED: { bg: 'rgba(239, 68, 68, 0.15)', text: 'rgb(239, 68, 68)', border: 'rgba(239, 68, 68, 0.3)' },
};
const statusLabels: Record<string, string> = { PENDING: 'Pending', DISPATCHED: 'Dispatched', IN_TRANSIT: 'In Transit', ARRIVED: 'Arrived', DELIVERED: 'Delivered', CANCELLED: 'Cancelled' };

const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => (
  <div hidden={value !== index}>{value === index && <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingTop: '16px'}}>{children}</JXBox>}</div>
);

export default function TransitDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const transitId = String(params.id || '');
  const userRole = session?.user?.role;
  const canManageWorkflow = hasPermission(userRole, 'workflow:move') && hasPermission(userRole, 'transits:manage');
  const canManageExpenses = hasPermission(userRole, 'expenses:post');
  const canOverrideClosedStages = hasPermission(userRole, 'workflow:override_closed');
  const [transit, setTransit] = useState<Transit | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [transitCompanies, setTransitCompanies] = useState<Company[]>([]);

  // Edit transit state
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', dispatchDate: '', estimatedDelivery: '', actualDelivery: '', cost: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [openConfirmDelivery, setOpenConfirmDelivery] = useState(false);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({ deliveredDate: new Date().toISOString().slice(0, 16), receiverName: '', proofUrl: '', proofName: '', proofType: '', notes: '' });
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  // Add event state
  const [openEvent, setOpenEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ companyId: '', origin: '', destination: '', status: '', location: '', description: '', eventDate: new Date().toISOString().slice(0, 16) });
  const [postingEvent, setPostingEvent] = useState(false);

  // Add expense state
  const [shipmentExpenseModalOpen, setShipmentExpenseModalOpen] = useState(false);
  const [selectedShipmentForExpense, setSelectedShipmentForExpense] = useState<string | undefined>(undefined);
  const [transitExpenseModalOpen, setTransitExpenseModalOpen] = useState(false);
  const [selectedTransitExpense, setSelectedTransitExpense] = useState<TransitExpense | null>(null);

  // Add shipments to transit (bulk multi-select)
  const [openAddShipment, setOpenAddShipment] = useState(false);
  const [addingShipment, setAddingShipment] = useState(false);
  const [availableShipments, setAvailableShipments] = useState<AssignableShipment[]>([]);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [loadingAvailableShipments, setLoadingAvailableShipments] = useState(false);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const isClosedTransitState = transit ? transit.status === 'DELIVERED' || transit.status === 'CANCELLED' : false;
  const isTransitWorkflowLocked = isClosedTransitState && !canOverrideClosedStages;

  const transitMilestones = useMemo(() => [
    { id: 'PENDING', label: 'Transit Booked', description: 'Assigned to forwarder' },
    { id: 'DISPATCHED', label: 'Dispatched', description: 'Carrier in motion' },
    { id: 'IN_TRANSIT', label: 'In Transit', description: `${transit?.origin || 'Origin'} → ${transit?.destination || 'Destination'}` },
    { id: 'ARRIVED', label: 'Arrived', description: 'Border / Port inspection' },
    { id: 'DELIVERED', label: 'Delivered', description: 'Destination handover' },
  ], [transit?.origin, transit?.destination]);

  const fetchAvailableShipments = async (searchTerm = '') => {
    try {
      setLoadingAvailableShipments(true);
      // Fetch a broad set and filter client-side using the same rule as the server
      // (released = shipment released OR its container released) so that shipments
      // released at container level are not hidden from the picker.
      const query = new URLSearchParams({
        limit: '100',
        page: '1',
      });

      if (searchTerm.trim()) {
        query.set('search', searchTerm.trim());
      }

      const response = await fetch(`/api/shipments?${query.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to load shipments');
      }

      const eligible = (data.shipments || []).filter((shipment: AssignableShipment) => {
        const released = shipment.status === 'RELEASED' || shipment.container?.status === 'RELEASED';
        return released && !shipment.transitId;
      });
      setAvailableShipments(eligible as AssignableShipment[]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load released shipments');
      setAvailableShipments([]);
    } finally {
      setLoadingAvailableShipments(false);
    }
  };

  const fetchTransit = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transits/${transitId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      setTransit(data.transit);
      setTotalExpenses(data.totalExpenses || 0);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load transit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transitId) void fetchTransit();
  }, [transitId]);

  useEffect(() => {
    const fetchTransitCompanies = async () => {
      try {
        const response = await fetch('/api/finance/companies?active=true&companyType=TRANSIT');
        const data = await response.json();
        if (response.ok) {
          setTransitCompanies(data.companies || []);
        }
      } catch (error) {
        console.error('Failed to load transit companies:', error);
      }
    };

    void fetchTransitCompanies();
  }, []);

  useEffect(() => {
    if (!openAddShipment) return;

    const timer = setTimeout(() => {
      void fetchAvailableShipments(shipmentSearch);
    }, 250);

    return () => clearTimeout(timer);
  }, [openAddShipment, shipmentSearch]);

  const openEditDialog = () => {
    if (!transit) return;
    if (transit.status === 'DELIVERED') {
      toast.error('Delivered transits should be updated through the delivery confirmation record instead of the generic edit form');
      return;
    }
    setEditForm({
      status: transit.status,
      dispatchDate: transit.dispatchDate ? transit.dispatchDate.slice(0, 10) : '',
      estimatedDelivery: transit.estimatedDelivery ? transit.estimatedDelivery.slice(0, 10) : '',
      actualDelivery: transit.actualDelivery ? transit.actualDelivery.slice(0, 10) : '',
      cost: transit.cost != null ? String(transit.cost) : '',
      notes: transit.notes || '',
    });
    setOpenEdit(true);
  };

  const handleEdit = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/transits/${transitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          dispatchDate: editForm.dispatchDate || null,
          estimatedDelivery: editForm.estimatedDelivery || null,
          cost: editForm.cost ? parseFloat(editForm.cost) : null,
          notes: editForm.notes || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update');
      toast.success('Transit updated');
      setOpenEdit(false);
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleProofUpload = async (file: File) => {
    try {
      setUploadingProof(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload proof of delivery');
      }

      setDeliveryForm((prev) => ({
        ...prev,
        proofUrl: data.url,
        proofName: file.name,
        proofType: file.type,
      }));
      toast.success('Proof of delivery uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload proof of delivery');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!deliveryForm.deliveredDate) {
      toast.error('Delivered date is required');
      return;
    }
    if (!deliveryForm.receiverName.trim()) {
      toast.error('Receiver name is required');
      return;
    }
    if (!deliveryForm.proofUrl) {
      toast.error('Proof of delivery file is required');
      return;
    }

    try {
      setConfirmingDelivery(true);
      const response = await fetch(`/api/transits/${transitId}/confirm-delivery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveredDate: new Date(deliveryForm.deliveredDate).toISOString(),
          receiverName: deliveryForm.receiverName.trim(),
          proofUrl: deliveryForm.proofUrl,
          proofName: deliveryForm.proofName || undefined,
          proofType: deliveryForm.proofType || undefined,
          notes: deliveryForm.notes.trim() || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to confirm delivery');

      toast.success('Transit delivery confirmed');
      setOpenConfirmDelivery(false);
      setDeliveryForm({ deliveredDate: new Date().toISOString().slice(0, 16), receiverName: '', proofUrl: '', proofName: '', proofType: '', notes: '' });
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to confirm delivery');
    } finally {
      setConfirmingDelivery(false);
    }
  };

  const handleAddEvent = async () => {
    if (!eventForm.status.trim()) { toast.error('Status is required'); return; }
    if (!eventForm.companyId) { toast.error('Transit company is required'); return; }
    if (!eventForm.origin.trim() || !eventForm.destination.trim()) { toast.error('Transit leg origin and destination are required'); return; }
    try {
      setPostingEvent(true);
      const response = await fetch(`/api/transits/${transitId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: eventForm.companyId,
          origin: eventForm.origin,
          destination: eventForm.destination,
          status: eventForm.status,
          location: eventForm.location || undefined,
          description: eventForm.description || undefined,
          eventDate: eventForm.eventDate || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add event');
      toast.success('Event added');
      setOpenEvent(false);
      setEventForm({ companyId: '', origin: '', destination: '', status: '', location: '', description: '', eventDate: new Date().toISOString().slice(0, 16) });
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add event');
    } finally {
      setPostingEvent(false);
    }
  };

  const toggleShipmentSelection = (shipmentId: string) => {
    setSelectedShipmentIds((current) =>
      current.includes(shipmentId) ? current.filter((id) => id !== shipmentId) : [...current, shipmentId],
    );
  };

  const handleAddShipment = async () => {
    if (selectedShipmentIds.length === 0) {
      toast.error('Select at least one released shipment');
      return;
    }
    try {
      setAddingShipment(true);
      const response = await fetch(`/api/transits/${transitId}/shipments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentIds: selectedShipmentIds }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add shipments');

      const assigned = Number(data.assigned || 0);
      const errors = Array.isArray(data.errors) ? data.errors : [];
      if (assigned > 0) {
        toast.success(assigned === 1 ? 'Shipment added to transit' : `${assigned} shipments added to transit`);
      }
      if (errors.length > 0) {
        toast.error(`${errors.length} shipment(s) skipped`, {
          description: errors.map((entry: { shipmentId: string; error: string }) => entry.error).join(' | '),
        });
      }

      // Keep the dialog open so another batch can be picked; clear the selection
      // and refresh the eligible list so added shipments drop off.
      setSelectedShipmentIds([]);
      await fetchTransit();
      void fetchAvailableShipments(shipmentSearch);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add shipments');
    } finally {
      setAddingShipment(false);
    }
  };

  const handleCloseAddShipment = () => {
    if (addingShipment) return;
    setOpenAddShipment(false);
    setShipmentSearch('');
    setAvailableShipments([]);
    setSelectedShipmentIds([]);
  };

  const handleRemoveShipment = async (shipmentId: string) => {
    if (!confirm('Remove this shipment from the transit?')) return;
    try {
      const response = await fetch(`/api/transits/${transitId}/shipments?shipmentId=${shipmentId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove');
      toast.success('Shipment removed from transit');
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove shipment');
    }
  };

  const handleDeleteExpense = async (expense: TransitExpense) => {
    if (!confirm('Delete this expense? This will also reverse the ledger entries.')) return;
    try {
      let response;
      if (expense.source === 'SHIPMENT_EXPENSE') {
        // Delete shipment expense via ledger API
        response = await fetch(`/api/ledger/${expense.id}`, { method: 'DELETE' });
      } else {
        // Delete transit expense via transit API
        response = await fetch(`/api/transits/${transitId}/expenses?expenseId=${expense.id}`, { method: 'DELETE' });
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete expense');
      toast.success('Expense deleted');
      await fetchTransit();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    }
  };

  const shipmentColumns: Column<Shipment>[] = [
    {
      key: 'vehicleMake',
      header: 'Vehicle',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{`${row.vehicleYear || ''} ${row.vehicleMake || ''} ${row.vehicleModel || ''}`.trim() || 'Unknown'}</JXBox>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
            <span style={{ fontFamily: 'monospace' }}>{row.vehicleVIN || '-'}</span>
            {row.vehicleVIN && <CopyButton value={row.vehicleVIN} label="VIN" />}
          </JXBox>
        </JXBox>
      ),
    },
    {
      key: 'user',
      header: 'Customer',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 500}}>{row.user.name || row.user.email}</JXBox>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{row.user.phone || row.user.email}</JXBox>
        </JXBox>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => {
        const color = row.status === 'IN_TRANSIT_TO_DESTINATION'
          ? { bg: 'rgba(99, 102, 241, 0.15)', text: 'rgb(99, 102, 241)', border: 'rgba(99, 102, 241, 0.3)' }
          : { bg: 'rgba(20, 184, 166, 0.15)', text: 'rgb(20, 184, 166)', border: 'rgba(20, 184, 166, 0.3)' };
        return (
          <span style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
            {row.status === 'IN_TRANSIT_TO_DESTINATION' ? 'In Transit' : row.status.replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
          {canManageExpenses ? (
            <Tooltip title="Add expense" arrow={false}>
              <IconButton icon={<DollarSign className="w-4 h-4" />} ariaLabel="Add expense" variant="ghost" size="sm" onClick={() => {
                  setSelectedShipmentForExpense(row.id);
                  setShipmentExpenseModalOpen(true);
                }} disabled={isTransitWorkflowLocked} style={{color: 'var(--accent-gold)'}} />
            </Tooltip>
          ) : null}
          <Tooltip title="View shipment" arrow={false}>
            <IconButton icon={<Package className="w-4 h-4" />} ariaLabel="View shipment" variant="ghost" size="sm" />
          </Tooltip>
          {canManageWorkflow ? (
            <Tooltip title="Remove from transit" arrow={false}>
              <IconButton icon={<Trash2 className="w-4 h-4" />} ariaLabel="Remove from transit" variant="ghost" size="sm" color="error" onClick={() => void handleRemoveShipment(row.id)} disabled={isTransitWorkflowLocked} />
            </Tooltip>
          ) : null}
        </JXBox>
      ),
    },
  ];

  const eventColumns: Column<TransitEvent>[] = [
    { key: 'eventDate', header: 'Date', render: (_, row) => new Date(row.eventDate).toLocaleString() },
    {
      key: 'origin',
      header: 'Leg',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{row.origin}</JXBox>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>→ {row.destination}</JXBox>
        </JXBox>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (_, row) => row.company.name,
    },
    { key: 'status', header: 'Status', render: (_, row) => <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{row.status}</JXBox> },
    { key: 'location', header: 'Location', render: (_, row) => row.location || '-' },
    { key: 'description', header: 'Description', render: (_, row) => row.description || '-' },
  ];

  const expenseColumns: Column<TransitExpense>[] = [
    { key: 'date', header: 'Date', render: (_, row) => new Date(row.date).toLocaleDateString() },
    {
      key: 'type',
      header: 'Type',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 500}}>{row.type.replace(/_/g, ' ')}</JXBox>
          {row.vendor && <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{row.vendor}</JXBox>}
        </JXBox>
      ),
    },
    {
      key: 'transitEvent',
      header: 'Transit Leg',
      render: (_, row) => row.transitEvent ? (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 500, fontSize: '0.875rem'}}>{row.transitEvent.origin} → {row.transitEvent.destination}</JXBox>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{row.transitEvent.company.name}</JXBox>
        </JXBox>
      ) : (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>No linked event</JXBox>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (_, row) => <span style={{ fontWeight: 600, color: 'var(--error)' }}>{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'shipment',
      header: 'Shipment',
      render: (_, row) => row.shipment ? (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 500, fontSize: '0.875rem'}}>
            {[row.shipment.vehicleMake, row.shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'}
          </JXBox>
          {row.shipment.vehicleVIN && (
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{row.shipment.vehicleVIN}</JXBox>
          )}
        </JXBox>
      ) : (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic'}}>General transit expense</JXBox>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (_, row) => (
        canManageExpenses ? (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
            {row.source === 'TRANSIT_EXPENSE' && (
              <Tooltip title="Edit expense" arrow={false}>
                <IconButton icon={<Pencil className="w-4 h-4" />} ariaLabel="Edit expense" variant="ghost" size="sm" onClick={() => {
                    setSelectedTransitExpense(row);
                    setTransitExpenseModalOpen(true);
                  }} disabled={isTransitWorkflowLocked} style={{color: 'var(--accent-gold)'}} />
              </Tooltip>
            )}
            <Tooltip title="Delete expense" arrow={false}>
              <IconButton icon={<Trash2 className="w-4 h-4" />} ariaLabel="Delete expense" variant="ghost" size="sm" color="error" onClick={() => void handleDeleteExpense(row)} disabled={isTransitWorkflowLocked} />
            </Tooltip>
          </JXBox>
        ) : null
      ),
    },
  ];

  if (loading) {
    return (
      <PermissionRoute anyOf={['transits:manage', 'finance:manage']}>
        <DashboardSurface><TableSkeleton rows={8} /></DashboardSurface>
      </PermissionRoute>
    );
  }

  if (!transit) {
    return (
      <PermissionRoute anyOf={['transits:manage', 'finance:manage']}>
        <DashboardSurface>
          <DashboardPanel title="Transit not found">
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)'}}>The requested transit could not be found.</JXBox>
            <Link href="/dashboard/transits"><Button variant="outline">Back to Transits</Button></Link>
          </DashboardPanel>
        </DashboardSurface>
      </PermissionRoute>
    );
  }

  const statusColor = statusColors[transit.status] || statusColors.PENDING;
  const canConfirmDelivery = canManageWorkflow && transit.status !== 'DELIVERED' && transit.status !== 'CANCELLED' && transit.shipments.length > 0;
  const currentLegLabel = transit.currentEvent
    ? `${transit.currentEvent.origin} → ${transit.currentEvent.destination}`
    : `${transit.origin} → ${transit.destination}`;
  const currentCompanyLabel = transit.currentCompany?.name || 'No current event company';

  return (
    <PermissionRoute anyOf={['transits:manage', 'finance:manage']}>
      <DashboardSurface>
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
          <Breadcrumbs />
        </JXBox>

        <PageHeader
          title={transit.referenceNumber}
          description={`${currentLegLabel} • ${currentCompanyLabel}`}
          actions={
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
              <CopyButton value={transit.referenceNumber} label="Transit #" />
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-4 h-4 text-emerald-500" />}
                onClick={() => openUniversalShipmentExport({
                  filters: { transitId: transit.id },
                  title: `Export Transit ${transit.referenceNumber} Shipments`,
                  subtitle: `Export ${transit.shipments.length} shipment(s) in this transit`,
                })}
              >
                Export Shipments
              </Button>
              <Link href="/dashboard/transits" style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
              </Link>
              {canConfirmDelivery && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Truck className="w-4 h-4" />}
                  onClick={() => setOpenConfirmDelivery(true)}
                >
                  Confirm Delivery
                </Button>
              )}
              {canManageWorkflow && (!isClosedTransitState || canOverrideClosedStages) ? <Button variant="outline" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={openEditDialog} disabled={isTransitWorkflowLocked}>Edit</Button> : null}
            </JXBox>
          }
        />

        {/* Milestone Progression Stepper */}
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', marginBottom: '24px'}}>
          <JXBox padding="none" border={false} style={{padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)'}}>
            <MilestoneStepper
              steps={transitMilestones}
              currentStepId={transit.status}
              status={transit.status === 'DELIVERED' || transit.status === 'ARRIVED' ? 'completed' : transit.status === 'CANCELLED' ? 'cancelled' : 'default'}
            />
          </JXBox>
        </JXBox>

        <DashboardPanel>
          <DashboardGrid className="grid-cols-2 md:grid-cols-4 mb-4">
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Status" value={statusLabels[transit.status] || transit.status} variant="default" />
            <StatsCard icon={<Package className="w-5 h-5" />} title="Shipments" value={transit._count.shipments} variant="info" />
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Total Expenses" value={formatCurrency(totalExpenses)} variant="error" />
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Agreed Cost" value={transit.cost != null ? formatCurrency(transit.cost) : 'N/A'} variant="success" />
          </DashboardGrid>

          {isClosedTransitState && (
            <JXBox padding="none" border={false} style={{marginBottom: '16px', padding: '16px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)'}}>
              {canOverrideClosedStages
                ? 'This transit is closed. Admin override is enabled for workflow corrections and protected expense changes.'
                : 'This transit is closed. Workflow changes are locked and expense updates are limited to admin overrides.'}
            </JXBox>
          )}

          {/* Status Badge + Info */}
          <JXBox padding="none" border={false} style={{display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '16px', padding: '16px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)'}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>STATUS</JXBox>
              <span style={{ display: 'inline-flex', padding: '3px 12px', borderRadius: 9999, fontSize: '0.8rem', fontWeight: 600, background: statusColor.bg, color: statusColor.text, border: `1px solid ${statusColor.border}` }}>
                {statusLabels[transit.status] || transit.status}
              </span>
            </JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>CURRENT LEG</JXBox>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{currentLegLabel}</JXBox>
            </JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>CURRENT COMPANY</JXBox>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{currentCompanyLabel}</JXBox>
            </JXBox>
            {transit.dispatchDate && (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>DISPATCHED</JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{new Date(transit.dispatchDate).toLocaleDateString()}</JXBox>
              </JXBox>
            )}
            {transit.estimatedDelivery && (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>EST. DELIVERY</JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{new Date(transit.estimatedDelivery).toLocaleDateString()}</JXBox>
              </JXBox>
            )}
            {transit.actualDelivery && (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>DELIVERED</JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, color: 'var(--success)'}}>{new Date(transit.actualDelivery).toLocaleDateString()}</JXBox>
              </JXBox>
            )}
            {transit.deliveryReceiverName && (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>RECEIVED BY</JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{transit.deliveryReceiverName}</JXBox>
              </JXBox>
            )}
            {transit.deliveryProofUrl && (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>PROOF OF DELIVERY</JXBox>
                <a href={transit.deliveryProofUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-gold)', fontWeight: 600, textDecoration: 'none' }}>
                  {transit.deliveryProofName || 'Open proof file'}
                </a>
              </JXBox>
            )}
          </JXBox>

          {transit.status === 'DELIVERED' && (transit.deliveryNotes || transit.deliveryProofType) && (
            <JXBox padding="none" border={false} style={{marginBottom: '16px', padding: '16px', borderRadius: '16px', background: 'var(--surface)', border: '1px solid var(--border)'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '8px'}}>DELIVERY CONFIRMATION</JXBox>
              {transit.deliveryProofType && (
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>
                  Proof type: {transit.deliveryProofType}
                </JXBox>
              )}
              {transit.deliveryNotes && <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, whiteSpace: 'pre-wrap'}}>{transit.deliveryNotes}</JXBox>}
            </JXBox>
          )}

          {/* Tabs */}
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, borderBottom: 1, borderColor: 'var(--border)', marginBottom: '16px'}}>
            <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
              <button
                key={0}
                type="button"
                role="tab"
                aria-selected={activeTab === 0}
                onClick={() => { const v = 0; setActiveTab(v); }}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 0 ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {<Package className="h-4 w-4" />} {`Shipments (${transit._count.shipments})`}
              </button>
              <button
                key={1}
                type="button"
                role="tab"
                aria-selected={activeTab === 1}
                onClick={() => { const v = 1; setActiveTab(v); }}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 1 ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {<History className="h-4 w-4" />} {`Events (${transit._count.events})`}
              </button>
              <button
                key={2}
                type="button"
                role="tab"
                aria-selected={activeTab === 2}
                onClick={() => { const v = 2; setActiveTab(v); }}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 2 ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {<DollarSign className="h-4 w-4" />} {`Expenses (${transit._count.expenses})`}
              </button>
              <button
                key={3}
                type="button"
                role="tab"
                aria-selected={activeTab === 3}
                onClick={() => { const v = 3; setActiveTab(v); }}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 3 ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {<User className="h-4 w-4" />} {"Company Info"}
              </button>
            
            </div>
          </JXBox>

          <TabPanel value={activeTab} index={0}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: '12px'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px'}}>
                {canManageExpenses ? (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => {
                      setSelectedShipmentForExpense(undefined);
                      setShipmentExpenseModalOpen(true);
                    }}
                    disabled={isTransitWorkflowLocked}
                  >
                    Add Shipment Expense
                  </Button>
                ) : null}
                {canManageWorkflow ? <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenAddShipment(true)} disabled={isTransitWorkflowLocked}>
                  Add Shipment
                </Button> : null}
              </JXBox>
            </JXBox>
            <DataTable data={transit.shipments} columns={shipmentColumns} keyField="id" />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: '12px'}}>
              {canManageWorkflow ? <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenEvent(true)} disabled={isTransitWorkflowLocked}>
                Add Event
              </Button> : null}
            </JXBox>
            <DataTable data={transit.events} columns={eventColumns} keyField="id" />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <JXBox padding="none" border={false} style={{padding: '16px', background: 'var(--surface-secondary)', borderRadius: '16px', border: '1px solid var(--border)'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
                Transit expenses and shipment transit expenses post against the latest transit event. Add a new event whenever the route or company changes.
              </JXBox>
            </JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '16px'}}>
              <DataTable data={transit.expenses} columns={expenseColumns} keyField="id" />
            </JXBox>
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            {transit.currentCompany ? (
              <JXBox padding="none" border={false} style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '16px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>COMPANY NAME</JXBox><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, marginTop: '4px'}}>{transit.currentCompany.name}</JXBox></JXBox>
                {transit.currentCompany.code && <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>CODE</JXBox><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, marginTop: '4px'}}>{transit.currentCompany.code}</JXBox></JXBox>}
                {transit.currentCompany.phone && <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>PHONE</JXBox><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, marginTop: '4px'}}>{transit.currentCompany.phone}</JXBox></JXBox>}
                {transit.currentCompany.email && <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>EMAIL</JXBox><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, marginTop: '4px'}}>{transit.currentCompany.email}</JXBox></JXBox>}
              </JXBox>
            ) : (
              <JXBox padding="none" border={false} style={{padding: '16px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)', color: 'var(--text-secondary)'}}>
                No transit company is assigned yet. Add a transit event to set the active leg company.
              </JXBox>
            )}
            {transit.notes && (
              <JXBox padding="none" border={false} style={{marginTop: '16px', padding: '16px', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px'}}>NOTES</JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, whiteSpace: 'pre-wrap'}}>{transit.notes}</JXBox>
              </JXBox>
            )}
          </TabPanel>
        </DashboardPanel>

        {/* Edit Transit Dialog */}
        <Modal
          open={openEdit}
          onClose={() => !saving && setOpenEdit(false)}
          title="Edit Transit"
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={saving}>Cancel</Button>
              <Button variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
            </>
          }
        >
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px', paddingTop: '12px'}}>
            <Select label="Status" options={STATUS_OPTIONS.map((s) => ({ value: s, label: statusLabels[s] || s }))} value={editForm.status} onChange={(val) => setEditForm(prev => ({ ...prev, status: val as string }))} />
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <FormField label="Dispatch Date" type="date" InputLabelProps={{ shrink: true }} value={editForm.dispatchDate} onChange={(e) => setEditForm(prev => ({ ...prev, dispatchDate: e.target.value }))} />
              <FormField label="Est. Delivery" type="date" InputLabelProps={{ shrink: true }} value={editForm.estimatedDelivery} onChange={(e) => setEditForm(prev => ({ ...prev, estimatedDelivery: e.target.value }))} />
            </JXBox>
            <FormField label="Agreed Cost (USD)" type="number" inputProps={{ min: 0, step: 0.01 }} value={editForm.cost} onChange={(e) => setEditForm(prev => ({ ...prev, cost: e.target.value }))} />
            <FormField label="Notes" multiline rows={3} value={editForm.notes} onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))} />
          </JXBox>
        </Modal>

        {/* Add Event Dialog */}
        <Modal
          open={openEvent}
          onClose={() => !postingEvent && setOpenEvent(false)}
          title="Add Transit Event"
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenEvent(false)} disabled={postingEvent}>Cancel</Button>
              <Button variant="primary" onClick={handleAddEvent} disabled={postingEvent}>{postingEvent ? 'Adding...' : 'Add Event'}</Button>
            </>
          }
        >
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px', paddingTop: '12px'}}>
            <Select label="Transit Company" options={[{ value: "", label: 'Select a company...' }, ...transitCompanies.map((company) => ({ value: company.id, label: `${company.name}${company.code ? ` (${company.code})` : ''}` }))]} value={eventForm.companyId} onChange={(val) => setEventForm(prev => ({ ...prev, companyId: val as string }))} />
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <FormField label="From" value={eventForm.origin} onChange={(e) => setEventForm(prev => ({ ...prev, origin: e.target.value }))} required placeholder="e.g. Herat" />
              <FormField label="To" value={eventForm.destination} onChange={(e) => setEventForm(prev => ({ ...prev, destination: e.target.value }))} required placeholder="e.g. Kabul" />
            </JXBox>
            <FormField label="Status / Event" value={eventForm.status} onChange={(e) => setEventForm(prev => ({ ...prev, status: e.target.value }))} required placeholder="e.g. Loaded, Border Crossed, Arrived Kabul" />
            <FormField label="Location" value={eventForm.location} onChange={(e) => setEventForm(prev => ({ ...prev, location: e.target.value }))} placeholder="e.g. Islam Qala Border" />
            <FormField label="Description" multiline rows={2} value={eventForm.description} onChange={(e) => setEventForm(prev => ({ ...prev, description: e.target.value }))} />
            <FormField label="Event Date" type="datetime-local" InputLabelProps={{ shrink: true }} value={eventForm.eventDate} onChange={(e) => setEventForm(prev => ({ ...prev, eventDate: e.target.value }))} />
          </JXBox>
        </Modal>

        {/* Add Shipment Expense Modal */}
        <AddShipmentExpenseModal
          open={shipmentExpenseModalOpen}
          onClose={() => {
            setShipmentExpenseModalOpen(false);
            setSelectedShipmentForExpense(undefined);
          }}
          shipmentId={selectedShipmentForExpense}
          shipments={selectedShipmentForExpense ? undefined : transit.shipments.map((s) => ({
            id: s.id,
            vehicleMake: s.vehicleMake,
            vehicleModel: s.vehicleModel,
            vehicleVIN: s.vehicleVIN,
            user: s.user,
          }))}
          contextType="TRANSIT"
          contextId={transitId}
          onSuccess={() => void fetchTransit()}
        />

        {/* Add / Edit Transit Expense Modal */}
        <AddTransitExpenseModal
          open={transitExpenseModalOpen}
          onClose={() => {
            setTransitExpenseModalOpen(false);
            setSelectedTransitExpense(null);
          }}
          transitId={transitId}
          initialExpense={selectedTransitExpense}
          onSuccess={() => void fetchTransit()}
        />

        {/* Add Shipment Modal */}
        <Modal
          open={openAddShipment}
          onClose={handleCloseAddShipment}
          title="Add Shipments to Transit"
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={handleCloseAddShipment} disabled={addingShipment}>Cancel</Button>
              <Button variant="primary" onClick={handleAddShipment} disabled={addingShipment || selectedShipmentIds.length === 0}>
                {addingShipment ? 'Adding...' : `Add${selectedShipmentIds.length ? ` (${selectedShipmentIds.length})` : ' Shipments'}`}
              </Button>
            </>
          }
        >
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingTop: '12px'}}>
            <div className="min-w-0 flex-1"><FormField label="Search shipments" value={shipmentSearch} onChange={(e) => setShipmentSearch(e.target.value)} helperText={loadingAvailableShipments ? 'Loading released shipments...' : 'Search by vehicle, VIN, or customer - released shipments only'} rightIcon={loadingAvailableShipments ? <span role="status" aria-label="Loading" className="inline-block shrink-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-current h-[16px] w-[16px]" /> : undefined} size="small" style={{marginBottom: '12px'}} /></div>
            {loadingAvailableShipments ? (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'center', paddingTop: '32px', paddingBottom: '32px'}}>
                <span role="status" aria-label="Loading" className="inline-block shrink-0 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--accent-gold)] h-[24px] w-[24px]" />
              </JXBox>
            ) : availableShipments.length === 0 ? (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingTop: '32px', paddingBottom: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                No released shipments found.
              </JXBox>
            ) : (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '8px'}}>
                {availableShipments.map((shipment) => {
                  const vehicle = `${shipment.vehicleYear || ''} ${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'Vehicle';
                  const checked = selectedShipmentIds.includes(shipment.id);
                  return (
                    <JXBox padding="none" border={false} key={shipment.id} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '8px', paddingRight: '8px', paddingTop: '6px', paddingBottom: '6px', borderBottom: '1px solid var(--border)', cursor: 'pointer'}} onClick={() => toggleShipmentSelection(shipment.id)}>
                      <input type="checkbox" onChange={() => toggleShipmentSelection(shipment.id)} checked={checked} className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" />
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, minWidth: '0px'}}>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, fontSize: '0.875rem'}}>{vehicle}</JXBox>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                          {shipment.vehicleVIN ? `VIN ${shipment.vehicleVIN}` : shipment.id} - {shipment.user.name || shipment.user.email}
                        </JXBox>
                      </JXBox>
                    </JXBox>
                  );
                })}
              </JXBox>
            )}
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
              {selectedShipmentIds.length > 0
                ? `${selectedShipmentIds.length} shipment(s) selected - release tokens are verified automatically.`
                : 'Select one or more released shipments to add. You can add another batch right after.'}
            </JXBox>
          </JXBox>
        </Modal>

        {/* Confirm Final Delivery Modal */}
        <Modal
          open={openConfirmDelivery}
          onClose={() => !confirmingDelivery && !uploadingProof && setOpenConfirmDelivery(false)}
          title="Confirm Final Delivery"
          size="sm"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenConfirmDelivery(false)} disabled={confirmingDelivery || uploadingProof}>Cancel</Button>
              <Button variant="primary" onClick={handleConfirmDelivery} disabled={confirmingDelivery || uploadingProof}>
                {confirmingDelivery ? 'Confirming...' : 'Confirm Delivery'}
              </Button>
            </>
          }
        >
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px', paddingTop: '12px'}}>
            <FormField label="Delivered Date" type="datetime-local" InputLabelProps={{ shrink: true }} value={deliveryForm.deliveredDate} onChange={(e) => setDeliveryForm((prev) => ({ ...prev, deliveredDate: e.target.value }))} />
            <FormField label="Receiver Name" value={deliveryForm.receiverName} onChange={(e) => setDeliveryForm((prev) => ({ ...prev, receiverName: e.target.value }))} helperText="Person who accepted the vehicle(s)" />
            <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px dashed var(--border)', background: 'var(--surface)'}}>
              <input
                ref={proofInputRef}
                type="file"
                hidden
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleProofUpload(file);
                  }
                  e.currentTarget.value = '';
                }}
              />
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>Proof of Delivery</JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                    Upload a delivery photo, signed PDF, or receiver document.
                  </JXBox>
                  {deliveryForm.proofName && (
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '8px', fontSize: '0.875rem', color: 'var(--success)'}}>{deliveryForm.proofName}</JXBox>
                  )}
                </JXBox>
                <Button
                  variant="outline"
                  icon={<Upload className="w-4 h-4" />}
                  onClick={() => proofInputRef.current?.click()}
                  disabled={uploadingProof}
                >
                  {uploadingProof ? 'Uploading...' : deliveryForm.proofUrl ? 'Replace File' : 'Upload File'}
                </Button>
              </JXBox>
            </JXBox>
            <FormField label="Delivery Notes" multiline rows={3} value={deliveryForm.notes} onChange={(e) => setDeliveryForm((prev) => ({ ...prev, notes: e.target.value }))} helperText="Optional notes for support, disputes, or handover context" />
          </JXBox>
        </Modal>


      </DashboardSurface>
    </PermissionRoute>
  );
}