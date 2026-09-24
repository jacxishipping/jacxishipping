'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Truck,
  Package,
  Ship,
  Layers,
  Search,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Calendar,
  Eye,
  Trash2,
  X,
  GripVertical,
  CheckSquare,
  Square,
  ArrowUpRight,
  Filter,
  Sparkles,
  Info,
  Clock,
  Compass,
  ArrowLeftRight
} from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, StatsCard, Button, toast, CopyButton, Modal, FormField, Select, CompactSkeleton } from '@/components/design-system';
import { DISPATCH_STATUS_LABELS } from '@/lib/dispatch-workflow';

interface ShipmentItem {
  id: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  lotNumber: string | null;
  status: string;
  destinationPort?: string | null;
  user?: { id: string; name: string | null; email: string };
  dispatch?: { id: string; referenceNumber: string; status: string } | null;
  container?: { id: string; containerNumber: string; status: string } | null;
  dispatchId?: string | null;
  containerId?: string | null;
}

interface DispatchItem {
  id: string;
  referenceNumber: string;
  origin: string;
  destination: string;
  status: string;
  estimatedArrival: string | null;
  company: { id: string; name: string; code: string | null };
  shipments: {
    id: string;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
    status: string;
  }[];
  _count: { shipments: number; events: number; expenses: number };
}

interface ContainerItem {
  id: string;
  containerNumber: string;
  status: string;
  vesselName: string | null;
  destinationPort: string | null;
  maxCapacity: number;
  currentCount: number;
  shipments: {
    id: string;
    vehicleYear: number | null;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleVIN: string | null;
    status: string;
  }[];
}

interface CompanyItem {
  id: string;
  name: string;
  code: string | null;
}

type BoardMode = 'dispatch' | 'container' | 'pipeline';

const PIPELINE_COLUMNS = [
  { key: 'ON_HAND', label: 'Yard / Warehouse', color: '#F59E0B', desc: 'Vehicles received and ready for dispatch' },
  { key: 'DISPATCHING', label: 'Inland Dispatch', color: '#3B82F6', desc: 'Assigned to carrier or in transit to port' },
  { key: 'IN_TRANSIT', label: 'Ocean Container', color: '#6366F1', desc: 'Loaded into vessel container' },
  { key: 'ARRIVED_PORT', label: 'Port & Customs', color: '#10B981', desc: 'Discharged at destination port' },
  { key: 'DELIVERED', label: 'Delivered / Handover', color: '#14B8A6', desc: 'Final release and gatepass issued' },
];

export default function OperationsBoardPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [mode, setMode] = useState<BoardMode>('dispatch');
  const [shipments, setShipments] = useState<ShipmentItem[]>([]);
  const [dispatches, setDispatches] = useState<DispatchItem[]>([]);
  const [containers, setContainers] = useState<ContainerItem[]>([]);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  
  // Dragging State
  const [draggedShipmentIds, setDraggedShipmentIds] = useState<string[]>([]);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);

  // Quick Dispatch Modal State
  const [showCreateDispatchModal, setShowCreateDispatchModal] = useState(false);
  const [creatingDispatch, setCreatingDispatch] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    companyId: '',
    origin: 'USA East Coast Yard',
    destination: 'Port of Newark (USNWK)',
    estimatedArrival: '',
    notes: '',
  });

  const fetchBoardData = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/operations');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load operations data');

      setShipments(data.shipments || []);
      setDispatches(data.dispatches || []);
      setContainers(data.containers || []);
      setCompanies(data.companies || []);
      if (data.companies?.length > 0 && !dispatchForm.companyId) {
        setDispatchForm((prev) => ({ ...prev, companyId: data.companies[0].id }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load board data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatchForm.companyId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Filtered pool of unassigned / ready shipments for Drag & Drop
  const readyShipmentsPool = useMemo(() => {
    return shipments.filter((s) => {
      // In dispatch mode: show shipments that have no dispatch or are ON_HAND
      if (mode === 'dispatch') {
        const matchesDispatchState = !s.dispatchId;
        const matchesSearch = !searchQuery || 
          `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''} ${s.vehicleVIN || ''} ${s.lotNumber || ''} ${s.user?.name || ''}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        return matchesDispatchState && matchesSearch;
      }

      // In container mode: show shipments that are ON_HAND or DISPATCHING and have no container
      if (mode === 'container') {
        const matchesContainerState = !s.containerId;
        const matchesSearch = !searchQuery || 
          `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''} ${s.vehicleVIN || ''} ${s.lotNumber || ''} ${s.user?.name || ''}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        return matchesContainerState && matchesSearch;
      }

      // In pipeline mode: all shipments
      return !searchQuery || 
        `${s.vehicleYear || ''} ${s.vehicleMake || ''} ${s.vehicleModel || ''} ${s.vehicleVIN || ''} ${s.lotNumber || ''} ${s.user?.name || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
    });
  }, [shipments, mode, searchQuery]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, shipmentId: string) => {
    let idsToDrag = [shipmentId];
    if (selectedShipmentIds.includes(shipmentId) && selectedShipmentIds.length > 1) {
      idsToDrag = selectedShipmentIds;
    } else {
      setSelectedShipmentIds([shipmentId]);
    }

    setDraggedShipmentIds(idsToDrag);
    e.dataTransfer.setData('text/plain', JSON.stringify(idsToDrag));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropTarget !== targetId) {
      setActiveDropTarget(targetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (activeDropTarget === targetId) {
      setActiveDropTarget(null);
    }
  };

  // Drop into a Dispatch Lane
  const handleDropToDispatch = async (dispatchId: string) => {
    setActiveDropTarget(null);
    if (!draggedShipmentIds || draggedShipmentIds.length === 0) return;

    const targetDispatch = dispatches.find((d) => d.id === dispatchId);
    const count = draggedShipmentIds.length;

    // Optimistic UI Update
    setShipments((prev) =>
      prev.map((s) => (draggedShipmentIds.includes(s.id) ? { ...s, dispatchId, status: 'DISPATCHING' } : s))
    );

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_to_dispatch',
          targetId: dispatchId,
          shipmentIds: draggedShipmentIds,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to assign to dispatch');

      toast.success(
        `Assigned ${count} vehicle(s) to ${targetDispatch?.referenceNumber || 'Dispatch'}`
      );
      setSelectedShipmentIds([]);
      setDraggedShipmentIds([]);
      fetchBoardData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to assign shipment to dispatch');
      fetchBoardData();
    }
  };

  // Drop into a Container Stowing Slot
  const handleDropToContainer = async (containerId: string) => {
    setActiveDropTarget(null);
    if (!draggedShipmentIds || draggedShipmentIds.length === 0) return;

    const targetContainer = containers.find((c) => c.id === containerId);
    const count = draggedShipmentIds.length;

    if (targetContainer && targetContainer.shipments.length + count > targetContainer.maxCapacity) {
      toast.error(`Cannot add ${count} vehicle(s): Exceeds container capacity of ${targetContainer.maxCapacity}`);
      return;
    }

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_to_container',
          targetId: containerId,
          shipmentIds: draggedShipmentIds,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to assign to container');

      toast.success(
        `Stowed ${count} vehicle(s) into container ${targetContainer?.containerNumber || ''}`
      );
      setSelectedShipmentIds([]);
      setDraggedShipmentIds([]);
      fetchBoardData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to assign shipment to container');
      fetchBoardData();
    }
  };

  // Drop into a Pipeline Stage Column
  const handleDropToPipelineStage = async (newStatus: string) => {
    setActiveDropTarget(null);
    if (!draggedShipmentIds || draggedShipmentIds.length === 0) return;

    const count = draggedShipmentIds.length;

    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move_shipment_status',
          status: newStatus,
          shipmentIds: draggedShipmentIds,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update shipment status');

      toast.success(`Moved ${count} vehicle(s) to ${newStatus.replace('_', ' ')}`);
      setSelectedShipmentIds([]);
      setDraggedShipmentIds([]);
      fetchBoardData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to update status');
      fetchBoardData();
    }
  };

  // Unassign from Dispatch
  const handleUnassignFromDispatch = async (shipmentId: string) => {
    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unassign_from_dispatch',
          shipmentIds: [shipmentId],
        }),
      });
      if (!res.ok) throw new Error('Failed to unassign');
      toast.info('Vehicle returned to ready pool');
      fetchBoardData();
    } catch (err) {
      toast.error('Failed to unassign vehicle');
    }
  };

  // Unassign from Container
  const handleUnassignFromContainer = async (shipmentId: string) => {
    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unassign_from_container',
          shipmentIds: [shipmentId],
        }),
      });
      if (!res.ok) throw new Error('Failed to unassign from container');
      toast.info('Vehicle removed from container');
      fetchBoardData();
    } catch (err) {
      toast.error('Failed to unassign vehicle');
    }
  };

  // Update Dispatch status directly from board
  const handleUpdateDispatchStatus = async (dispatchId: string, nextStatus: string) => {
    try {
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_dispatch_status',
          targetId: dispatchId,
          status: nextStatus,
        }),
      });
      if (!res.ok) throw new Error('Failed to update dispatch status');
      toast.success(`Dispatch marked as ${nextStatus}`);
      fetchBoardData();
    } catch (err) {
      toast.error('Failed to update dispatch status');
    }
  };

  // Create Dispatch form submit
  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchForm.companyId) {
      toast.error('Please select a logistics company / carrier');
      return;
    }

    try {
      setCreatingDispatch(true);
      const res = await fetch('/api/operations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_dispatch',
          data: dispatchForm,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to create dispatch');

      toast.success(`Created dispatch ${result.dispatch?.referenceNumber || ''}`);
      setShowCreateDispatchModal(false);
      fetchBoardData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create dispatch');
    } finally {
      setCreatingDispatch(false);
    }
  };

  // Toggle selection for batch drag
  const toggleSelectShipment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedShipmentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllPool = () => {
    if (selectedShipmentIds.length === readyShipmentsPool.length) {
      setSelectedShipmentIds([]);
    } else {
      setSelectedShipmentIds(readyShipmentsPool.map((s) => s.id));
    }
  };

  return (
    <ProtectedRoute>
      <DashboardSurface>
        {/* Page Header */}
        <PageHeader
          title="Logistics Operations & Dispatch Board"
          description="Interactive drag-and-drop command center for inland dispatches, ocean container stowing, and fleet pipeline"
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />}
                onClick={fetchBoardData}
                disabled={refreshing}
              >
                Sync Board
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus className="w-4 h-4" />}
                onClick={() => setShowCreateDispatchModal(true)}
              >
                New Dispatch
              </Button>
              <Link href="/dashboard/containers/new" style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm" icon={<Ship className="w-4 h-4" />}>
                  New Container
                </Button>
              </Link>
            </div>
          }
        />

        {/* Top Key Metrics */}
        <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<Package className="w-5 h-5 text-[var(--accent-gold)]" />}
            title="Ready Vehicles (Pool)"
            value={readyShipmentsPool.length}
            variant="warning"
            size="sm"
          />
          <StatsCard
            icon={<Truck className="w-5 h-5 text-blue-500" />}
            title="Active Dispatches"
            value={dispatches.filter((d) => d.status !== 'COMPLETED' && d.status !== 'CANCELLED').length}
            variant="info"
            size="sm"
          />
          <StatsCard
            icon={<Ship className="w-5 h-5 text-indigo-500" />}
            title="Ocean Containers"
            value={containers.length}
            variant="default"
            size="sm"
          />
          <StatsCard
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-500" />}
            title="Delivered / Completed"
            value={shipments.filter((s) => s.status === 'DELIVERED' || s.status === 'RELEASED').length}
            variant="success"
            size="sm"
          />
        </DashboardGrid>

        {/* Mode Selector & Search Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[var(--panel)] border border-[var(--border)] shadow-sm">
          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <button
              type="button"
              onClick={() => setMode('dispatch')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'dispatch'
                  ? 'bg-[var(--accent-gold)] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Inland Dispatch Lanes</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('container')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'container'
                  ? 'bg-[var(--accent-gold)] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Ship className="w-4 h-4" />
              <span>Container Stowing</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('pipeline')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                mode === 'pipeline'
                  ? 'bg-[var(--accent-gold)] text-white shadow-md'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Pipeline Kanban</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex items-center gap-2 flex-1 max-w-md min-w-[240px]">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search VIN, make/model, lot #, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--background)] text-xs text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-gold)] transition-colors font-mono"
              />
            </div>
            {selectedShipmentIds.length > 0 && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 whitespace-nowrap">
                {selectedShipmentIds.length} selected
              </span>
            )}
          </div>
        </div>

        {/* MAIN INTERACTIVE DRAG-AND-DROP WORKSPACE */}
        {loading ? (
          <CompactSkeleton />
        ) : mode === 'dispatch' ? (
          /* ============================================================
             MODE 1: INLAND DISPATCH ALLOCATION (READY POOL -> DISPATCH LANES)
             ============================================================ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Ready Vehicles Queue (Pool) */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-[var(--accent-gold)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Ready Vehicles Pool ({readyShipmentsPool.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={selectAllPool}
                  className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-gold)]"
                >
                  {selectedShipmentIds.length === readyShipmentsPool.length && readyShipmentsPool.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              {/* Vehicle Cards List */}
              <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {readyShipmentsPool.length === 0 ? (
                  <div className="p-8 rounded-2xl border-2 border-dashed border-[var(--border)] text-center text-[var(--text-secondary)]">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-50 text-[var(--accent-gold)]" />
                    <p className="text-xs font-bold">No available vehicles in queue</p>
                    <p className="text-[11px] mt-1 opacity-70">All vehicles are currently assigned to active routes.</p>
                  </div>
                ) : (
                  readyShipmentsPool.map((s) => {
                    const isSelected = selectedShipmentIds.includes(s.id);
                    return (
                      <div
                        key={s.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, s.id)}
                        className={`group relative p-3 rounded-xl border bg-[var(--panel)] transition-all cursor-grab active:cursor-grabbing hover:shadow-md select-none ${
                          isSelected
                            ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5'
                            : 'border-[var(--border)] hover:border-[var(--accent-gold)]/60'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Selection Checkbox */}
                          <button
                            type="button"
                            onClick={(e) => toggleSelectShipment(s.id, e)}
                            className="mt-0.5 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[var(--accent-gold)]" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                                {s.vehicleYear || ''} {s.vehicleMake || 'Vehicle'} {s.vehicleModel || ''}
                              </h4>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                                {s.status}
                              </span>
                            </div>

                            <div className="mt-1 flex items-center gap-2 text-[11px] font-mono text-[var(--text-secondary)]">
                              <span>VIN: {s.vehicleVIN ? `${s.vehicleVIN.slice(0, 8)}...${s.vehicleVIN.slice(-4)}` : 'N/A'}</span>
                              {s.lotNumber && <span>• Lot #{s.lotNumber}</span>}
                            </div>

                            {s.user?.name && (
                              <p className="mt-0.5 text-[10px] text-[var(--text-secondary)] truncate">
                                Client: <strong className="text-[var(--text-primary)]">{s.user.name}</strong>
                              </p>
                            )}
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center self-center text-[var(--text-secondary)]">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Dispatch Lanes / Carrier Targets */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  Active Dispatch Lanes ({dispatches.length}) • Drag vehicles onto a lane to assign
                </span>
                <span className="text-xs text-[var(--accent-gold)] font-bold flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Live Dropzones Active
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dispatches.map((dispatch) => {
                  const isDropActive = activeDropTarget === dispatch.id;
                  return (
                    <div
                      key={dispatch.id}
                      onDragOver={(e) => handleDragOver(e, dispatch.id)}
                      onDragLeave={(e) => handleDragLeave(e, dispatch.id)}
                      onDrop={() => handleDropToDispatch(dispatch.id)}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[260px] ${
                        isDropActive
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 ring-4 ring-[var(--accent-gold)]/30 scale-[1.01] shadow-xl'
                          : 'border-[var(--border)] bg-[var(--panel)] shadow-sm'
                      }`}
                    >
                      {/* Dispatch Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                                {dispatch.referenceNumber}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                {DISPATCH_STATUS_LABELS[dispatch.status as keyof typeof DISPATCH_STATUS_LABELS] || dispatch.status}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                              Carrier: <strong className="text-[var(--text-primary)]">{dispatch.company?.name || 'General Carrier'}</strong>
                            </p>
                          </div>

                          <Link href={`/dashboard/dispatches/${dispatch.id}`} style={{ textDecoration: 'none' }}>
                            <button
                              type="button"
                              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
                              title="View Dispatch Details"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </Link>
                        </div>

                        {/* Route Info */}
                        <div className="mt-3 p-2 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 text-[var(--text-secondary)] truncate">
                            <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{dispatch.origin}</span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)] shrink-0 mx-1" />
                          <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-semibold truncate">
                            <span className="truncate">{dispatch.destination}</span>
                          </div>
                        </div>
                      </div>

                      {/* Assigned Shipments Dropzone Container */}
                      <div className="mt-3 flex-1">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                            Assigned Vehicles ({dispatch.shipments?.length || 0})
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {dispatch.shipments && dispatch.shipments.length > 0 ? (
                            dispatch.shipments.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                  <span className="font-bold text-[var(--text-primary)] truncate">
                                    {item.vehicleYear || ''} {item.vehicleMake || ''} {item.vehicleModel || ''}
                                  </span>
                                  {item.vehicleVIN && (
                                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                                      ({item.vehicleVIN.slice(-4)})
                                    </span>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnassignFromDispatch(item.id)}
                                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors"
                                  title="Unassign vehicle from dispatch"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div
                              className={`p-4 rounded-xl border-2 border-dashed text-center transition-colors ${
                                isDropActive
                                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] font-bold'
                                  : 'border-[var(--border)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <span className="text-xs">
                                {isDropActive ? '⚡ Drop vehicle(s) here to assign' : 'Drag & drop vehicles here'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Status Advance Toolbar */}
                      <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
                        <span className="text-[10px] text-[var(--text-secondary)] font-mono">
                          ETA: {dispatch.estimatedArrival ? new Date(dispatch.estimatedArrival).toLocaleDateString() : 'TBD'}
                        </span>
                        <div className="flex items-center gap-1">
                          {dispatch.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDispatchStatus(dispatch.id, 'DISPATCHED')}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                            >
                              Dispatch Now
                            </button>
                          )}
                          {dispatch.status === 'DISPATCHED' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDispatchStatus(dispatch.id, 'IN_TRANSIT')}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                            >
                              Mark In Transit
                            </button>
                          )}
                          {dispatch.status === 'IN_TRANSIT' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateDispatchStatus(dispatch.id, 'COMPLETED')}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                            >
                              Mark Arrived
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : mode === 'container' ? (
          /* ============================================================
             MODE 2: CONTAINER STOWING (READY POOL -> OCEAN CONTAINERS)
             ============================================================ */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Column: Ready Vehicles Queue (Pool) */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--panel)] border border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <Ship className="w-4 h-4 text-[var(--accent-gold)]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
                    Ready to Stow ({readyShipmentsPool.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={selectAllPool}
                  className="text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--accent-gold)]"
                >
                  {selectedShipmentIds.length === readyShipmentsPool.length && readyShipmentsPool.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {readyShipmentsPool.map((s) => {
                  const isSelected = selectedShipmentIds.includes(s.id);
                  return (
                    <div
                      key={s.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, s.id)}
                      className={`group relative p-3 rounded-xl border bg-[var(--panel)] transition-all cursor-grab active:cursor-grabbing hover:shadow-md select-none ${
                        isSelected
                          ? 'border-[var(--accent-gold)] ring-2 ring-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/5'
                          : 'border-[var(--border)] hover:border-[var(--accent-gold)]/60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={(e) => toggleSelectShipment(s.id, e)}
                          className="mt-0.5 text-[var(--text-secondary)] hover:text-[var(--accent-gold)] shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[var(--accent-gold)]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                            {s.vehicleYear || ''} {s.vehicleMake || 'Vehicle'} {s.vehicleModel || ''}
                          </h4>
                          <p className="mt-0.5 text-[11px] font-mono text-[var(--text-secondary)]">
                            VIN: {s.vehicleVIN || 'N/A'}
                          </p>
                          {s.destinationPort && (
                            <p className="text-[10px] text-[var(--accent-gold)] font-semibold mt-0.5">
                              Port: {s.destinationPort}
                            </p>
                          )}
                        </div>
                        <GripVertical className="w-4 h-4 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity self-center" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Ocean Containers Columns */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                Active Ocean Containers ({containers.length}) • Drag vehicles into a container to stow
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {containers.map((c) => {
                  const isDropActive = activeDropTarget === c.id;
                  const capacityPct = Math.round(((c.shipments?.length || 0) / c.maxCapacity) * 100);
                  const isFull = (c.shipments?.length || 0) >= c.maxCapacity;

                  return (
                    <div
                      key={c.id}
                      onDragOver={(e) => handleDragOver(e, c.id)}
                      onDragLeave={(e) => handleDragLeave(e, c.id)}
                      onDrop={() => handleDropToContainer(c.id)}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between min-h-[260px] ${
                        isDropActive
                          ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 ring-4 ring-[var(--accent-gold)]/30 scale-[1.01] shadow-xl'
                          : 'border-[var(--border)] bg-[var(--panel)] shadow-sm'
                      }`}
                    >
                      {/* Container Header */}
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[var(--text-primary)] font-mono">
                                {c.containerNumber}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                {c.status}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                              {c.vesselName || 'Vessel Assigned'} • {c.destinationPort || 'Destination Port'}
                            </p>
                          </div>

                          <Link href={`/dashboard/containers/${c.id}`} style={{ textDecoration: 'none' }}>
                            <button
                              type="button"
                              className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)] transition-colors"
                              title="View Container Details"
                            >
                              <ArrowUpRight className="w-4 h-4" />
                            </button>
                          </Link>
                        </div>

                        {/* Capacity Progress Bar */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-[var(--text-secondary)]">Stowing Capacity</span>
                            <span className={`font-bold ${isFull ? 'text-[var(--error)]' : 'text-[var(--accent-gold)]'}`}>
                              {c.shipments?.length || 0} / {c.maxCapacity} Vehicles ({capacityPct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-[var(--background)] overflow-hidden border border-[var(--border)]">
                            <div
                              className={`h-full transition-all duration-300 ${
                                isFull ? 'bg-[var(--error)]' : 'bg-[var(--accent-gold)]'
                              }`}
                              style={{ width: `${Math.min(capacityPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Stowed Vehicles List */}
                      <div className="mt-3 flex-1">
                        <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                          {c.shipments && c.shipments.length > 0 ? (
                            c.shipments.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <Package className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />
                                  <span className="font-bold text-[var(--text-primary)] truncate">
                                    {item.vehicleYear || ''} {item.vehicleMake || ''} {item.vehicleModel || ''}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUnassignFromContainer(item.id)}
                                  className="p-1 text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors"
                                  title="Remove from container"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div
                              className={`p-4 rounded-xl border-2 border-dashed text-center transition-colors ${
                                isDropActive
                                  ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/20 text-[var(--accent-gold)] font-bold'
                                  : 'border-[var(--border)] text-[var(--text-secondary)]'
                              }`}
                            >
                              <span className="text-xs">
                                {isDropActive ? '⚡ Drop vehicle(s) here to stow' : 'Container empty — drag vehicles here'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================
             MODE 3: END-TO-END PIPELINE KANBAN (DRAG ACROSS WORKFLOW STAGES)
             ============================================================ */
          <div className="flex items-start gap-4 overflow-x-auto pb-4 no-scrollbar">
            {PIPELINE_COLUMNS.map((col) => {
              const colShipments = shipments.filter((s) => {
                if (col.key === 'ON_HAND') return s.status === 'ON_HAND' || (!s.dispatchId && !s.containerId);
                if (col.key === 'DISPATCHING') return s.status === 'DISPATCHING' || s.dispatchId;
                if (col.key === 'IN_TRANSIT') return s.status === 'IN_TRANSIT' || s.containerId;
                if (col.key === 'ARRIVED_PORT') return s.status === 'ARRIVED_PORT' || s.status === 'CUSTOMS_CLEARANCE';
                if (col.key === 'DELIVERED') return s.status === 'DELIVERED' || s.status === 'RELEASED';
                return s.status === col.key;
              });

              const isDropActive = activeDropTarget === col.key;

              return (
                <div
                  key={col.key}
                  onDragOver={(e) => handleDragOver(e, col.key)}
                  onDragLeave={(e) => handleDragLeave(e, col.key)}
                  onDrop={() => handleDropToPipelineStage(col.key)}
                  className={`w-72 shrink-0 rounded-2xl border bg-[var(--panel)] p-3 transition-all flex flex-col min-h-[500px] ${
                    isDropActive
                      ? 'border-[var(--accent-gold)] bg-[var(--accent-gold)]/10 ring-4 ring-[var(--accent-gold)]/30'
                      : 'border-[var(--border)] shadow-sm'
                  }`}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                      <h3 className="text-xs font-bold text-[var(--text-primary)]">
                        {col.label}
                      </h3>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-bold font-mono rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--text-secondary)]">
                      {colShipments.length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                    {colShipments.length === 0 ? (
                      <div className="p-6 text-center text-[var(--text-secondary)] text-xs border-2 border-dashed border-[var(--border)] rounded-xl">
                        Drop vehicles here
                      </div>
                    ) : (
                      colShipments.map((s) => (
                        <div
                          key={s.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, s.id)}
                          className="group p-3 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:border-[var(--accent-gold)] transition-all cursor-grab active:cursor-grabbing hover:shadow-md select-none"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                              {s.vehicleYear || ''} {s.vehicleMake || 'Vehicle'} {s.vehicleModel || ''}
                            </h4>
                            <Link href={`/dashboard/shipments/${s.id}`} style={{ textDecoration: 'none' }}>
                              <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          </div>
                          <p className="mt-1 text-[11px] font-mono text-[var(--text-secondary)]">
                            VIN: {s.vehicleVIN ? `${s.vehicleVIN.slice(0, 8)}...` : 'N/A'}
                          </p>
                          {s.user?.name && (
                            <p className="mt-1 text-[10px] text-[var(--text-secondary)] truncate">
                              Client: {s.user.name}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Create Dispatch Modal */}
        <Modal
          open={showCreateDispatchModal}
          onClose={() => setShowCreateDispatchModal(false)}
          title="Create New Inland Dispatch"
        >
          <form onSubmit={handleCreateDispatch} className="space-y-4">
            <Select
              label="Logistics Carrier / Company"
              value={dispatchForm.companyId}
              onChange={(val) => setDispatchForm({ ...dispatchForm, companyId: String(val) })}
              options={companies.map((c) => ({ value: c.id, label: c.name }))}
            />

            <FormField
              label="Origin (Yard / Pickup Location)"
              value={dispatchForm.origin}
              onChange={(e) => setDispatchForm({ ...dispatchForm, origin: e.target.value })}
              placeholder="e.g., USA East Coast Yard"
            />

            <FormField
              label="Destination (Port / Delivery Location)"
              value={dispatchForm.destination}
              onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
              placeholder="e.g., Port of Newark (USNWK)"
            />

            <FormField
              label="Estimated Arrival (ETA)"
              type="date"
              value={dispatchForm.estimatedArrival}
              onChange={(e) => setDispatchForm({ ...dispatchForm, estimatedArrival: e.target.value })}
            />

            <FormField
              label="Notes / Instructions"
              value={dispatchForm.notes}
              onChange={(e) => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
              placeholder="Optional notes for truck driver or carrier"
            />

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowCreateDispatchModal(false)}
                disabled={creatingDispatch}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" disabled={creatingDispatch}>
                {creatingDispatch ? 'Creating...' : 'Create Dispatch Lane'}
              </Button>
            </div>
          </form>
        </Modal>
      </DashboardSurface>
    </ProtectedRoute>
  );
}
