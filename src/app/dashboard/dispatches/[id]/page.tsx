'use client';

import { useEffect, useMemo, useState } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, DollarSign, History, Package, Pencil, Plus, Trash2, Truck, User, Download } from 'lucide-react';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Autocomplete, Breadcrumbs, Button, CopyButton, EmptyState, FormField, MilestoneStepper, PageHeader, Select, StatsCard, StatusBadge, TableSkeleton, toast, Modal } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { DISPATCH_STATUS_COLORS, DISPATCH_STATUS_OPTIONS, getDispatchStatusLabel, isDispatchClosed } from '@/lib/dispatch-workflow';
import DispatchExpenseModal, { type EditableDispatchExpense } from '@/components/dispatches/DispatchExpenseModal';
import { getDispatchExpenseCategoryLabel, getDispatchExpenseTypeLabel } from '@/lib/dispatch-expenses';
import { hasPermission } from '@/lib/rbac';
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
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  user: { id: string; name: string | null; email: string };
}

interface DispatchEvent {
  id: string;
  status: string;
  location: string | null;
  description: string | null;
  eventDate: string;
  createdBy: string;
  createdByLabel?: string;
  createdAt: string;
}

interface HandoffContainerOption {
  id: string;
  containerNumber: string;
  status: string;
  maxCapacity: number;
  currentCount: number;
  company: { id: string; name: string; code: string | null } | null;
}

interface DispatchExpense {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  invoiceNumber: string | null;
  category: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  notes: string | null;
  auditLogs?: Array<{
    id: string;
    action: string;
    performedBy: string;
    performedAt: string;
    performedByLabel?: string;
    changes?: unknown;
  }>;
  shipment: { id: string; vehicleMake: string | null; vehicleModel: string | null; vehicleVIN: string | null } | null;
}

interface Dispatch {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  dispatchDate: string | null;
  estimatedArrival: string | null;
  actualArrival: string | null;
  cost: number | null;
  notes: string | null;
  createdAt: string;
  company: Company;
  shipments: Shipment[];
  events: DispatchEvent[];
  expenses: DispatchExpense[];
  _count: { shipments: number; events: number; expenses: number };
}

import { formatMoney as formatCurrency } from '@/lib/format';


const TabPanel = ({ children, value, index }: { children: React.ReactNode; value: number; index: number }) => <div hidden={value !== index}>{value === index && <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingTop: '16px'}}>{children}</JXBox>}</div>;

function getDispatchEventStatusLabel(status: string) {
  if (status === 'HANDOFF_TO_CONTAINER') {
    return 'Handoff To Container';
  }

  if (status === 'RECEIVED_TO_YARD') {
    return 'Received To Yard';
  }

  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseHandoffEventDescription(description: string | null) {
  if (!description || !description.startsWith('Container ')) {
    return null;
  }

  const [containerPart, shipmentPart, pendingPart] = description.split(' | ');
  if (!containerPart || !shipmentPart) {
    return null;
  }

  return {
    containerLabel: containerPart.replace(/^Container\s+/, ''),
    shipmentSummary: shipmentPart.replace(/^Shipments:\s+/, ''),
    pendingSummary: pendingPart || null,
  };
}

function parseYardReceiptEventDescription(description: string | null) {
  if (!description || !description.startsWith('Yard intake | ')) {
    return null;
  }

  const [, shipmentPart] = description.split(' | ');
  if (!shipmentPart) {
    return null;
  }

  return {
    shipmentSummary: shipmentPart.replace(/^Shipments:\s+/, ''),
  };
}

export default function DispatchDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const dispatchId = String(params.id || '');
  const userRole = session?.user?.role;
  const canManageWorkflow = hasPermission(userRole, 'workflow:move') && hasPermission(userRole, 'dispatches:manage');
  const canManageExpenses = hasPermission(userRole, 'expenses:post');
  const canOverrideClosedStages = hasPermission(userRole, 'workflow:override_closed');
  const [dispatch, setDispatch] = useState<Dispatch | null>(null);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({ status: '', dispatchDate: '', estimatedArrival: '', actualArrival: '', cost: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [openEvent, setOpenEvent] = useState(false);
  const [eventForm, setEventForm] = useState({ status: '', location: '', description: '', eventDate: new Date().toISOString().slice(0, 10) });
  const [postingEvent, setPostingEvent] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<DispatchExpense | null>(null);
  const [expenseHistoryExpense, setExpenseHistoryExpense] = useState<DispatchExpense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);
  const [openAddShipment, setOpenAddShipment] = useState(false);
  const [shipmentIdToAdd, setShipmentIdToAdd] = useState('');
  const [addingShipment, setAddingShipment] = useState(false);
  const [availableShipments, setAvailableShipments] = useState<AssignableShipment[]>([]);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [loadingAvailableShipments, setLoadingAvailableShipments] = useState(false);
  const [openHandoff, setOpenHandoff] = useState(false);
  const [containerIdToHandoff, setContainerIdToHandoff] = useState('');
  const [availableContainers, setAvailableContainers] = useState<HandoffContainerOption[]>([]);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [handingOff, setHandingOff] = useState(false);
  const [shipmentIdsToHandoff, setShipmentIdsToHandoff] = useState<string[]>([]);
  const [receivingToYard, setReceivingToYard] = useState(false);
  const isClosedDispatchState = dispatch ? isDispatchClosed(dispatch.status) : false;
  const isDispatchWorkflowLocked = isClosedDispatchState && !canOverrideClosedStages;
  const canHandoffToContainer = Boolean(dispatch && canManageWorkflow && !isDispatchWorkflowLocked && dispatch.shipments.length > 0);
  const canReceiveToYard = Boolean(dispatch && canManageWorkflow && !isDispatchWorkflowLocked && dispatch.shipments.length > 0);

  const fetchAvailableShipments = async (searchTerm = '') => {
    try {
      setLoadingAvailableShipments(true);
      const query = new URLSearchParams({ status: 'ON_HAND', limit: '50', page: '1' });
      if (searchTerm.trim()) query.set('search', searchTerm.trim());
      const response = await fetch(`/api/shipments?${query.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to load shipments');
      setAvailableShipments((data.shipments || []).filter((shipment: any) => !shipment.dispatchId && !shipment.containerId && !shipment.transitId));
    } catch (error) {
      console.error(error);
      toast.error('Failed to load ON_HAND shipments');
      setAvailableShipments([]);
    } finally {
      setLoadingAvailableShipments(false);
    }
  };

  const fetchDispatch = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dispatches/${dispatchId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch dispatch');
      setDispatch(data.dispatch);
      setTotalExpenses(data.totalExpenses || 0);
      setLoadError(null);
    } catch (error) {
      console.error(error);
      setDispatch(null);
      setLoadError(error instanceof Error ? error.message : 'Failed to load dispatch');
      toast.error(error instanceof Error ? error.message : 'Failed to load dispatch');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dispatchId) void fetchDispatch();
  }, [dispatchId]);

  useEffect(() => {
    if (!openAddShipment) return;
    const timer = setTimeout(() => { void fetchAvailableShipments(shipmentSearch); }, 250);
    return () => clearTimeout(timer);
  }, [openAddShipment, shipmentSearch]);

  useEffect(() => {
    if (!openHandoff) return;

    const fetchContainers = async () => {
      try {
        setLoadingContainers(true);
        const query = new URLSearchParams({ status: 'active', limit: '50', page: '1' });
        const response = await fetch(`/api/containers?${query.toString()}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to load containers');
        setAvailableContainers((data.containers || []).filter((container: HandoffContainerOption) => Boolean(container.company)));
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Failed to load containers');
        setAvailableContainers([]);
      } finally {
        setLoadingContainers(false);
      }
    };

    void fetchContainers();
  }, [openHandoff]);

  const openEditDialog = () => {
    if (!dispatch) return;
    setEditForm({
      status: dispatch.status,
      dispatchDate: dispatch.dispatchDate ? dispatch.dispatchDate.slice(0, 10) : '',
      estimatedArrival: dispatch.estimatedArrival ? dispatch.estimatedArrival.slice(0, 10) : '',
      actualArrival: dispatch.actualArrival ? dispatch.actualArrival.slice(0, 10) : '',
      cost: dispatch.cost != null ? String(dispatch.cost) : '',
      notes: dispatch.notes || '',
    });
    setOpenEdit(true);
  };

  const handleUpdateDispatch = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/dispatches/${dispatchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editForm.status,
          dispatchDate: editForm.dispatchDate || null,
          estimatedArrival: editForm.estimatedArrival || null,
          actualArrival: editForm.actualArrival || null,
          cost: editForm.cost ? parseFloat(editForm.cost) : null,
          notes: editForm.notes || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update dispatch');
      toast.success('Dispatch updated successfully');
      setOpenEdit(false);
      await fetchDispatch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update dispatch');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEvent = async () => {
    try {
      setPostingEvent(true);
      const response = await fetch(`/api/dispatches/${dispatchId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create event');
      toast.success('Dispatch event added');
      setOpenEvent(false);
      setEventForm({ status: '', location: '', description: '', eventDate: new Date().toISOString().slice(0, 10) });
      await fetchDispatch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add event');
    } finally {
      setPostingEvent(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Delete this dispatch expense? Linked company and customer ledger entries will also be removed.')) {
      return;
    }

    try {
      setDeletingExpenseId(expenseId);
      const response = await fetch(`/api/dispatches/${dispatchId}/expenses?expenseId=${expenseId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete expense');
      }
      toast.success('Dispatch expense deleted');
      if (expenseHistoryExpense?.id === expenseId) {
        setExpenseHistoryExpense(null);
      }
      await fetchDispatch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete expense');
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const handleAddShipment = async () => {
    if (!shipmentIdToAdd) {
      toast.error('Select a shipment to assign');
      return;
    }
    try {
      setAddingShipment(true);
      const response = await fetch(`/api/dispatches/${dispatchId}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: shipmentIdToAdd }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add shipment');
      toast.success('Shipment assigned to dispatch');
      setOpenAddShipment(false);
      setShipmentIdToAdd('');
      setShipmentSearch('');
      await fetchDispatch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add shipment');
    } finally {
      setAddingShipment(false);
    }
  };

  const handleRemoveShipment = async (shipmentId: string) => {
    if (!confirm('Remove this shipment from dispatch?')) return;
    try {
      const response = await fetch(`/api/dispatches/${dispatchId}/shipments?shipmentId=${shipmentId}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove shipment');
      toast.success('Shipment removed from dispatch');
      await fetchDispatch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove shipment');
    }
  };

  const handleHandoffToContainer = async () => {
    if (shipmentIdsToHandoff.length === 0) {
      toast.error('Select at least one shipment to hand off');
      return;
    }

    if (!containerIdToHandoff) {
      toast.error('Select a container for handoff');
      return;
    }

    try {
      setHandingOff(true);
      const response = await fetch(`/api/dispatches/${dispatchId}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ containerId: containerIdToHandoff, shipmentIds: shipmentIdsToHandoff }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to hand off dispatch to container');
      toast.success(`Handed off ${data.handoff?.shipmentCount || shipmentIdsToHandoff.length} shipment${(data.handoff?.shipmentCount || shipmentIdsToHandoff.length) === 1 ? '' : 's'} to ${data.handoff?.containerNumber || 'container'}`);
      setOpenHandoff(false);
      setContainerIdToHandoff('');
      setShipmentIdsToHandoff([]);
      await fetchDispatch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to hand off dispatch to container');
    } finally {
      setHandingOff(false);
    }
  };

  const handleReceiveToYard = async () => {
    if (!dispatch) return;

    try {
      setReceivingToYard(true);
      const response = await fetch(`/api/dispatches/${dispatchId}/receive`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to receive dispatch to yard');
      toast.success(`Received ${data.receipt?.shipmentCount || dispatch.shipments.length} shipment${(data.receipt?.shipmentCount || dispatch.shipments.length) === 1 ? '' : 's'} to yard`);
      await fetchDispatch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to receive dispatch to yard');
    } finally {
      setReceivingToYard(false);
    }
  };

  const shipmentColumns = useMemo<Column<Shipment>[]>(() => [
    {
      key: 'vehicleVIN',
      header: 'Vehicle',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>{[row.vehicleYear, row.vehicleMake, row.vehicleModel].filter(Boolean).join(' ') || 'Shipment'}</JXBox>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
            <span style={{ fontFamily: 'monospace' }}>{row.vehicleVIN || 'No VIN'}</span>
            {row.vehicleVIN && <CopyButton value={row.vehicleVIN} label="VIN" />}
          </JXBox>
        </JXBox>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => (
        <StatusBadge status={row.status} size="sm" />
      ),
    },
    {
      key: 'user',
      header: 'Customer',
      render: (_, row) => row.user.name || row.user.email,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (_, row) => canManageWorkflow ? (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => void handleRemoveShipment(row.id)} disabled={isDispatchWorkflowLocked} />
        </JXBox>
      ) : null,
    },
  ], [canManageWorkflow, isDispatchWorkflowLocked]);

  const eventColumns = useMemo<Column<DispatchEvent>[]>(() => [
    {
      key: 'status',
      header: 'Status',
      render: (value, row) => {
        if (row.status === 'HANDOFF_TO_CONTAINER') {
          const handoffSummary = parseHandoffEventDescription(row.description);
          return (
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
              <StatusBadge status="WARNING" label="Handoff" size="sm" />
              {handoffSummary?.containerLabel && <StatusBadge status="DEFAULT" variant="outline" label={handoffSummary.containerLabel} size="sm" />}
            </JXBox>
          );
        }

        if (row.status === 'RECEIVED_TO_YARD') {
          return <StatusBadge status="SUCCESS" label="Yard Receipt" size="sm" />;
        }

        return getDispatchEventStatusLabel(String(value));
      },
    },
    { key: 'location', header: 'Location', render: (value) => value || '-' },
    {
      key: 'description',
      header: 'Description',
      render: (value, row) => {
        const handoffSummary = row.status === 'HANDOFF_TO_CONTAINER' ? parseHandoffEventDescription(String(value || '')) : null;
        const yardReceiptSummary = row.status === 'RECEIVED_TO_YARD' ? parseYardReceiptEventDescription(String(value || '')) : null;
        if (!handoffSummary) {
          if (!yardReceiptSummary) {
            return value || '-';
          }

          return (
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '4px'}}>
              <p className="text-sm leading-relaxed" style={{fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem'}}>
                {yardReceiptSummary.shipmentSummary}
              </p>
            </JXBox>
          );
        }

        return (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '4px'}}>
            <p className="text-sm leading-relaxed" style={{fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem'}}>
              {handoffSummary.shipmentSummary}
            </p>
            {handoffSummary.pendingSummary && (
              <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)', fontSize: '0.75rem'}}>
                {handoffSummary.pendingSummary}
              </p>
            )}
          </JXBox>
        );
      },
    },
    { key: 'eventDate', header: 'Event Date', render: (value) => new Date(String(value)).toLocaleString() },
    { key: 'createdByLabel', header: 'Recorded By', render: (value, row) => value || row.createdBy },
    { key: 'createdAt', header: 'Logged At', render: (value) => new Date(String(value)).toLocaleString() },
  ], []);

  const dispatchMilestones = useMemo(() => [
    { id: 'PENDING', label: 'Dispatch Planned', description: 'Assigned to carrier' },
    { id: 'DISPATCHED', label: 'Inland Transit', description: dispatch?.origin || 'En route' },
    { id: 'ARRIVED_AT_PORT', label: 'Port / Terminal', description: dispatch?.destination || 'At destination' },
    { id: 'COMPLETED', label: 'Handoff & Closed', description: 'Stowed to container' },
  ], [dispatch?.origin, dispatch?.destination]);

  const expenseColumns = useMemo<Column<DispatchExpense>[]>(() => [
    {
      key: 'type',
      header: 'Expense',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '2.8px'}}>
          <p className="text-sm leading-relaxed" style={{fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem'}}>
            {row.category ? getDispatchExpenseCategoryLabel(row.category) : 'Uncategorized'}
          </p>
          <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)', fontSize: '0.75rem'}}>
            {row.category ? getDispatchExpenseTypeLabel(row.category as never, row.type) : row.type}
          </p>
        </JXBox>
      ),
    },
    {
      key: 'description',
      header: 'Details',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '2.8px'}}>
          <p className="text-sm leading-relaxed" style={{fontSize: '0.875rem', color: 'var(--text-primary)'}}>{row.description}</p>
          <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
            {row.vendor || 'No vendor'}{row.invoiceNumber ? ` • Invoice ${row.invoiceNumber}` : ''}
          </p>
          {row.attachmentUrl ? (
            <Link href={row.attachmentUrl} target="_blank" style={{ textDecoration: 'none' }}>
              <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 600}}>
                {row.attachmentName || 'Open attachment'}
              </p>
            </Link>
          ) : null}
        </JXBox>
      ),
    },
    { key: 'amount', header: 'Amount', align: 'right', render: (value) => formatCurrency(Number(value)) },
    { key: 'shipment', header: 'Shipment', render: (_, row) => row.shipment ? [row.shipment.vehicleMake, row.shipment.vehicleModel].filter(Boolean).join(' ') || row.shipment.vehicleVIN || row.shipment.id : 'All shipments' },
    { key: 'date', header: 'Date', render: (value) => new Date(String(value)).toLocaleDateString() },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" icon={<History className="w-4 h-4" />} onClick={() => setExpenseHistoryExpense(row)} />
          {canManageExpenses ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                icon={<Pencil className="w-4 h-4" />}
                onClick={() => {
                  setSelectedExpense(row);
                  setExpenseModalOpen(true);
                }}
                disabled={isDispatchWorkflowLocked}
              />
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                onClick={() => void handleDeleteExpense(row.id)}
                disabled={isDispatchWorkflowLocked || deletingExpenseId === row.id}
              />
            </>
          ) : null}
        </JXBox>
      ),
    },
  ], [canManageExpenses, deletingExpenseId, isDispatchWorkflowLocked]);

  if (loading) {
    return <PermissionRoute permission="dispatches:manage"><DashboardSurface><TableSkeleton rows={6} columns={5} /></DashboardSurface></PermissionRoute>;
  }

  if (!dispatch) {
    return (
      <PermissionRoute permission="dispatches:manage">
        <DashboardSurface>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
            <Breadcrumbs />
          </JXBox>
          <DashboardPanel
            title="Dispatch unavailable"
            description={loadError || 'The dispatch could not be loaded.'}
            actions={
              <Link href="/dashboard/dispatches" style={{ textDecoration: 'none' }}>
                <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
              </Link>
            }
          >
            <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>
              Refresh the page or return to the dispatch list and try again.
            </p>
          </DashboardPanel>
        </DashboardSurface>
      </PermissionRoute>
    );
  }

  return (
    <PermissionRoute permission="dispatches:manage">
      <DashboardSurface>
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Dispatches', href: '/dashboard/dispatches' },
              { label: dispatch.referenceNumber },
            ]}
          />
        </JXBox>

        <PageHeader
          title={dispatch.referenceNumber}
          description={`${dispatch.origin} → ${dispatch.destination} • Carrier: ${dispatch.company.name}`}
          actions={
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
              <CopyButton value={dispatch.referenceNumber} label="Dispatch #" />
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-4 h-4 text-emerald-500" />}
                onClick={() => openUniversalShipmentExport({
                  filters: { dispatchId: dispatch.id },
                  title: `Export Dispatch ${dispatch.referenceNumber} Shipments`,
                  subtitle: `Export ${dispatch.shipments.length} shipment(s) in this dispatch`,
                })}
              >
                Export Shipments
              </Button>
              <Button variant="outline" size="sm" icon={<Truck className="w-4 h-4" />} onClick={() => void handleReceiveToYard()} disabled={!canReceiveToYard || receivingToYard}>{receivingToYard ? 'Receiving...' : 'Receive to Yard'}</Button>
              {canManageWorkflow ? (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Package className="w-4 h-4" />}
                  onClick={() => {
                    setShipmentIdsToHandoff(dispatch.shipments.map((shipment) => shipment.id));
                    setContainerIdToHandoff('');
                    setOpenHandoff(true);
                  }}
                  disabled={!canHandoffToContainer}
                >
                  Handoff to Container
                </Button>
              ) : null}
              <Link href={`/dashboard/finance/companies/${dispatch.company.id}`} style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm" icon={<DollarSign className="w-4 h-4" />}>Company Ledger</Button>
              </Link>
              <Link href="/dashboard/dispatches" style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
              </Link>
              {canManageWorkflow ? <Button variant="primary" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={openEditDialog} disabled={isDispatchWorkflowLocked}>Edit</Button> : null}
            </JXBox>
          }
        />

        {/* Milestone Progression Stepper */}
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', marginBottom: '24px'}}>
          <JXBox padding="none" border={false} style={{padding: '20px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)', boxShadow: '0 4px 20px rgba(0,0,0,0.04)'}}>
            <MilestoneStepper
              steps={dispatchMilestones}
              currentStepId={dispatch.status}
              status={dispatch.status === 'COMPLETED' ? 'completed' : dispatch.status === 'CANCELLED' ? 'cancelled' : 'default'}
            />
          </JXBox>
        </JXBox>

        <DashboardPanel>
          <DashboardGrid className="grid-cols-1 md:grid-cols-4 mb-4">
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Status" value={getDispatchStatusLabel(dispatch.status)} variant="warning" />
            <StatsCard icon={<Package className="w-5 h-5" />} title="Shipments" value={dispatch._count.shipments} variant="default" />
            <StatsCard icon={<History className="w-5 h-5" />} title="Events" value={dispatch._count.events} variant="info" />
            <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Expenses" value={formatCurrency(totalExpenses)} variant="success" />
          </DashboardGrid>

          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginBottom: '16px'}}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 12px',
                borderRadius: 9999,
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background: DISPATCH_STATUS_COLORS[dispatch.status as keyof typeof DISPATCH_STATUS_COLORS]?.bg || DISPATCH_STATUS_COLORS.PENDING.bg,
                color: DISPATCH_STATUS_COLORS[dispatch.status as keyof typeof DISPATCH_STATUS_COLORS]?.text || DISPATCH_STATUS_COLORS.PENDING.text,
                border: `1px solid ${DISPATCH_STATUS_COLORS[dispatch.status as keyof typeof DISPATCH_STATUS_COLORS]?.border || DISPATCH_STATUS_COLORS.PENDING.border}`,
              }}
            >
              {getDispatchStatusLabel(dispatch.status)}
            </span>
          </JXBox>

          {isClosedDispatchState && (
            <JXBox padding="none" border={false} style={{marginBottom: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', color: 'var(--text-secondary)'}}>
              {canOverrideClosedStages
                ? 'This dispatch is closed. Admin override is enabled for workflow and expense corrections.'
                : 'This dispatch is closed. Shipment assignment, shipment removal, event logging, and expense posting are locked.'}
            </JXBox>
          )}

          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px', color: 'var(--text-secondary)'}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><strong>Company:</strong> {dispatch.company.name}</JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><strong>Dispatch date:</strong> {dispatch.dispatchDate ? new Date(dispatch.dispatchDate).toLocaleDateString() : '-'}</JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><strong>Estimated arrival:</strong> {dispatch.estimatedArrival ? new Date(dispatch.estimatedArrival).toLocaleDateString() : '-'}</JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><strong>Actual arrival:</strong> {dispatch.actualArrival ? new Date(dispatch.actualArrival).toLocaleDateString() : '-'}</JXBox>
          </JXBox>

          <JXBox padding="none" border={false} style={{marginBottom: '24px', borderRadius: '16px', border: '1px solid var(--border)', background: 'rgba(var(--accent-gold-rgb), 0.08)', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', color: 'var(--text-secondary)'}}>
            This dispatch uses the <strong>{dispatch.company.name}</strong> company ledger for dispatch expense recovery. Any expense added here is posted to that company ledger and allocated across the assigned shipments.
          </JXBox>

          <JXBox padding="none" border={false} style={{marginBottom: '24px', borderRadius: '16px', border: '1px solid rgba(var(--accent-gold-rgb), 0.35)', background: 'rgba(var(--accent-gold-rgb), 0.06)', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', color: 'var(--text-secondary)'}}>
            Use <strong>Receive to Yard</strong> when this dispatch ends at your yard and the cars should wait there as ON_HAND. Use <strong>Handoff to Container</strong> only when the dispatch moves directly into a container.
          </JXBox>

          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
            <button
              key={0}
              type="button"
              role="tab"
              aria-selected={activeTab === 0}
              onClick={() => { const value = 0; setActiveTab(value); }}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 0 ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {`Shipments (${dispatch.shipments.length})`}
            </button>
            <button
              key={1}
              type="button"
              role="tab"
              aria-selected={activeTab === 1}
              onClick={() => { const value = 1; setActiveTab(value); }}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 1 ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {`Events (${dispatch.events.length})`}
            </button>
            <button
              key={2}
              type="button"
              role="tab"
              aria-selected={activeTab === 2}
              onClick={() => { const value = 2; setActiveTab(value); }}
              className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 2 ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
            >
              {`Expenses (${dispatch.expenses.length})`}
            </button>
          
          </div>

          <TabPanel value={activeTab} index={0}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}>
              {canManageWorkflow ? <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenAddShipment(true)} disabled={isDispatchWorkflowLocked}>Add shipment</Button> : null}
            </JXBox>
            {dispatch.shipments.length === 0 ? (
              <EmptyState
                icon={<Package className="w-8 h-8" />}
                title="No shipments assigned"
                description={isClosedDispatchState ? 'This dispatch closed without active shipments.' : 'Add ON_HAND shipments to start the dispatch leg.'}
              />
            ) : (
              <DataTable data={dispatch.shipments} columns={shipmentColumns} keyField="id" />
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}>
              {canManageWorkflow ? <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenEvent(true)} disabled={isDispatchWorkflowLocked}>Add event</Button> : null}
            </JXBox>
            {dispatch.events.length === 0 ? (
              <EmptyState
                icon={<History className="w-8 h-8" />}
                title="No dispatch events yet"
                description={isClosedDispatchState ? 'This dispatch closed without manual event updates.' : 'Log milestones like departure, yard exit, or port arrival.'}
              />
            ) : (
              <DataTable data={dispatch.events} columns={eventColumns} keyField="id" />
            )}
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', marginBottom: '16px'}}>
              {canManageExpenses ? (
                <Button
                  variant="primary"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setSelectedExpense(null);
                    setExpenseModalOpen(true);
                  }}
                  disabled={isDispatchWorkflowLocked}
                >
                  Add expense
                </Button>
              ) : null}
            </JXBox>
            {dispatch.expenses.length === 0 ? (
              <EmptyState
                icon={<DollarSign className="w-8 h-8" />}
                title="No dispatch expenses yet"
                description={isClosedDispatchState ? 'No dispatch expenses were recorded before closure.' : 'Add shared dispatch costs to allocate them across the assigned shipments.'}
              />
            ) : (
              <DataTable data={dispatch.expenses} columns={expenseColumns} keyField="id" />
            )}
          </TabPanel>
        </DashboardPanel>

        <Modal
          open={openEdit}
          onClose={() => !saving && setOpenEdit(false)}
          title="Edit Dispatch"
          size="sm"
          contentSx={{display: 'grid', gap: '16px', paddingTop: '12px'}}
          actions={<>

            <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateDispatch} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button>
          </>}
        >

            <Select label="Status" options={DISPATCH_STATUS_OPTIONS.map((status) => ({ value: status, label: getDispatchStatusLabel(status) }))} value={editForm.status} onChange={(val) => setEditForm((prev) => ({ ...prev, status: val as string }))} />
            <FormField label="Dispatch Date" type="date" InputLabelProps={{ shrink: true }} value={editForm.dispatchDate} onChange={(event) => setEditForm((prev) => ({ ...prev, dispatchDate: event.target.value }))} />
            <FormField label="Estimated Arrival" type="date" InputLabelProps={{ shrink: true }} value={editForm.estimatedArrival} onChange={(event) => setEditForm((prev) => ({ ...prev, estimatedArrival: event.target.value }))} />
            <FormField label="Actual Arrival" type="date" InputLabelProps={{ shrink: true }} value={editForm.actualArrival} onChange={(event) => setEditForm((prev) => ({ ...prev, actualArrival: event.target.value }))} />
            <FormField label="Cost" type="number" value={editForm.cost} onChange={(event) => setEditForm((prev) => ({ ...prev, cost: event.target.value }))} />
            <FormField label="Notes" multiline rows={3} value={editForm.notes} onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </Modal>

        <Modal
          open={openEvent}
          onClose={() => !postingEvent && setOpenEvent(false)}
          title="Add Dispatch Event"
          size="sm"
          contentSx={{display: 'grid', gap: '16px', paddingTop: '12px'}}
          actions={<>

            <Button variant="outline" onClick={() => setOpenEvent(false)} disabled={postingEvent}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateEvent} disabled={postingEvent || isDispatchWorkflowLocked}>{postingEvent ? 'Saving...' : 'Add Event'}</Button>
          </>}
        >

            <FormField label="Status" value={eventForm.status} onChange={(event) => setEventForm((prev) => ({ ...prev, status: event.target.value }))} />
            <FormField label="Location" value={eventForm.location} onChange={(event) => setEventForm((prev) => ({ ...prev, location: event.target.value }))} />
            <FormField label="Event Date" type="date" InputLabelProps={{ shrink: true }} value={eventForm.eventDate} onChange={(event) => setEventForm((prev) => ({ ...prev, eventDate: event.target.value }))} />
            <FormField label="Description" multiline rows={3} value={eventForm.description} onChange={(event) => setEventForm((prev) => ({ ...prev, description: event.target.value }))} />
        </Modal>

        <DispatchExpenseModal
          open={expenseModalOpen}
          onClose={() => {
            setExpenseModalOpen(false);
            setSelectedExpense(null);
          }}
          dispatchId={dispatchId}
          initialExpense={selectedExpense as EditableDispatchExpense | null}
          onSuccess={() => void fetchDispatch()}
        />

        <Modal
          open={Boolean(expenseHistoryExpense)}
          onClose={() => setExpenseHistoryExpense(null)}
          title="Dispatch Expense History"
          size="sm"
          contentSx={{display: 'grid', gap: '12px', paddingTop: '12px'}}
          actions={<>

            <Button variant="outline" onClick={() => setExpenseHistoryExpense(null)}>Close</Button>
          </>}
        >

            {!expenseHistoryExpense?.auditLogs?.length ? (
              <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>No audit entries recorded for this expense yet.</p>
            ) : (
              expenseHistoryExpense.auditLogs.map((entry) => (
                <JXBox padding="none" border={false} key={entry.id} style={{backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '16px', padding: '12px', display: 'grid', gap: '4px'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap'}}>
                    <p className="text-sm leading-relaxed" style={{fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem'}}>{entry.action}</p>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                      {new Date(entry.performedAt).toLocaleString()}
                    </p>
                  </JXBox>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                    By {entry.performedByLabel || entry.performedBy}
                  </p>
                  {entry.changes ? (
                    <JXBox padding="none" border={false} component="pre" style={{margin: '0px', padding: '8px', borderRadius: '12px', backgroundColor: 'var(--background)', color: 'var(--text-secondary)', fontSize: '0.7rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>
                      {JSON.stringify(entry.changes, null, 2)}
                    </JXBox>
                  ) : null}
                </JXBox>
              ))
            )}
        </Modal>

        <Modal
          open={openAddShipment}
          onClose={() => !addingShipment && setOpenAddShipment(false)}
          title="Add Shipment to Dispatch"
          size="sm"
          contentSx={{display: 'grid', gap: '16px', paddingTop: '12px'}}
          actions={<>

            <Button variant="outline" onClick={() => setOpenAddShipment(false)} disabled={addingShipment}>Cancel</Button>
            <Button variant="primary" onClick={handleAddShipment} disabled={addingShipment || isDispatchWorkflowLocked}>{addingShipment ? 'Adding...' : 'Add Shipment'}</Button>
          </>}
        >

                        <Autocomplete
              options={availableShipments.map((shipment) => ({ id: shipment.id, label: `${[shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Shipment'}${shipment.vehicleVIN ? ` - ${shipment.vehicleVIN}` : ''}`, searchText: shipment.vehicleVIN || '' }))}
              loading={loadingAvailableShipments}
              value={shipmentIdToAdd || null}
              onChange={(id) => setShipmentIdToAdd((id as string | null) || '')}
              onInputChange={(v) => setShipmentSearch(v)}
              label="Shipment"
            />
        </Modal>

        <Modal
          open={openHandoff}
          onClose={() => !handingOff && setOpenHandoff(false)}
          title="Handoff Dispatch to Container"
          size="sm"
          contentSx={{display: 'grid', gap: '16px', paddingTop: '12px'}}
          actions={<>

            <Button variant="outline" onClick={() => setOpenHandoff(false)} disabled={handingOff}>Cancel</Button>
            <Button variant="primary" onClick={handleHandoffToContainer} disabled={handingOff || !canHandoffToContainer || !containerIdToHandoff || shipmentIdsToHandoff.length === 0}>{handingOff ? 'Handing Off...' : 'Confirm Handoff'}</Button>
          </>}
        >

            <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)', fontSize: '0.95rem'}}>
              Select the shipment batch for this handoff. Each handoff is logged separately on the dispatch, the destination container, and the affected shipments.
            </p>
                        <Autocomplete
              multiple
              options={dispatch.shipments.map((shipment) => ({ id: shipment.id, label: `${[shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Shipment'}${shipment.vehicleVIN ? ` - ${shipment.vehicleVIN}` : ''}`, searchText: shipment.vehicleVIN || '' }))}
              value={shipmentIdsToHandoff}
              onChange={(v) => setShipmentIdsToHandoff((v as string[]) || [])}
              label="Shipments"
              helperText="Choose the dispatch shipments to move into the selected container"
            />
            <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
              {shipmentIdsToHandoff.length} of {dispatch.shipments.length} shipment{dispatch.shipments.length === 1 ? '' : 's'} selected for this handoff.
            </p>
                        <Autocomplete
              options={availableContainers.map((container) => ({ id: container.id, label: `${container.containerNumber} - ${container.company?.name || 'No company'} (${container.currentCount}/${container.maxCapacity})` }))}
              loading={loadingContainers}
              value={containerIdToHandoff || null}
              onChange={(id) => setContainerIdToHandoff((id as string | null) || '')}
              label="Container"
              helperText="Select the destination container for these shipments"
            />
            {!loadingContainers && availableContainers.length === 0 && (
              <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                No active containers with available capacity are currently available.
              </p>
            )}
        </Modal>
      </DashboardSurface>
    </PermissionRoute>
  );
}