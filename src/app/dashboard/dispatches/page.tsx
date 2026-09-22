'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import { Eye, Pencil, Plus, Search, Trash2, Truck } from 'lucide-react';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, StatsCard, toast, CopyButton, StatusFilterPills, StatusBadge, Modal, FormField, Select } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';
import { DISPATCH_STATUS_OPTIONS, DISPATCH_STATUS_LABELS } from '@/lib/dispatch-workflow';

interface Company {
  id: string;
  name: string;
  code: string | null;
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
  _count: {
    shipments: number;
    events: number;
    expenses: number;
  };
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

export default function DispatchesPage() {
  const router = useRouter();
  const confirmAction = useConfirmAction();
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingDispatchId, setEditingDispatchId] = useState<string | null>(null);
  const [deletingDispatchId, setDeletingDispatchId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    companyId: '',
    origin: 'USA Yard',
    destination: 'Port of Loading',
    dispatchDate: '',
    estimatedArrival: '',
    cost: '',
    notes: '',
  });
  const [editFormData, setEditFormData] = useState({
    companyId: '',
    origin: '',
    destination: '',
    status: 'PENDING',
    dispatchDate: '',
    estimatedArrival: '',
    actualArrival: '',
    cost: '',
    notes: '',
  });

  const fetchDispatches = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const response = await fetch(`/api/dispatches?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch dispatches');
      setDispatches(data.dispatches || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dispatches');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/finance/companies?active=true&companyType=DISPATCH');
      const data = await response.json();
      if (response.ok) setCompanies(data.companies || []);
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  useEffect(() => {
    void fetchDispatches();
  }, [search, statusFilter]);

  useEffect(() => {
    void fetchCompanies();
  }, []);

  const handleCreate = async () => {
    if (!formData.companyId) {
      toast.error('Dispatch company is required');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch('/api/dispatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: formData.companyId,
          origin: formData.origin,
          destination: formData.destination,
          dispatchDate: formData.dispatchDate || undefined,
          estimatedArrival: formData.estimatedArrival || undefined,
          cost: formData.cost ? parseFloat(formData.cost) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create dispatch');

      toast.success(`Dispatch ${data.dispatch.referenceNumber} created`);
      setOpenCreate(false);
      setFormData({ companyId: '', origin: 'USA Yard', destination: 'Port of Loading', dispatchDate: '', estimatedArrival: '', cost: '', notes: '' });
      await fetchDispatches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create dispatch');
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (dispatch: Dispatch) => {
    setEditingDispatchId(dispatch.id);
    setEditFormData({
      companyId: dispatch.company.id,
      origin: dispatch.origin,
      destination: dispatch.destination,
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
    if (!editingDispatchId || !editFormData.companyId) {
      toast.error('Dispatch company is required');
      return;
    }

    try {
      setEditing(true);
      const response = await fetch(`/api/dispatches/${editingDispatchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: editFormData.companyId,
          origin: editFormData.origin,
          destination: editFormData.destination,
          status: editFormData.status,
          dispatchDate: editFormData.dispatchDate || null,
          estimatedArrival: editFormData.estimatedArrival || null,
          actualArrival: editFormData.actualArrival || null,
          cost: editFormData.cost ? parseFloat(editFormData.cost) : null,
          notes: editFormData.notes || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update dispatch');

      toast.success('Dispatch updated successfully');
      setOpenEdit(false);
      setEditingDispatchId(null);
      await fetchDispatches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update dispatch');
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteDispatch = async (dispatch: Dispatch) => {
    const confirmed = await confirmAction({
      title: 'Delete Dispatch',
      message: `Delete dispatch ${dispatch.referenceNumber}? This action cannot be undone.`,
      confirmText: 'Delete dispatch',
      severity: 'error',
    });
    if (!confirmed) return;

    try {
      setDeletingDispatchId(dispatch.id);
      const response = await fetch(`/api/dispatches/${dispatch.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete dispatch');

      toast.success(`Dispatch ${dispatch.referenceNumber} deleted`);
      await fetchDispatches();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete dispatch');
    } finally {
      setDeletingDispatchId(null);
    }
  };

  const stats = useMemo(() => ({
    total: dispatches.length,
    active: dispatches.filter(d => ['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT'].includes(d.status)).length,
    completed: dispatches.filter(d => d.status === 'COMPLETED').length,
    shipments: dispatches.reduce((acc, d) => acc + d._count.shipments, 0),
  }), [dispatches]);

  const companyOptions = useMemo(() => {
    return companies.map(c => ({
      value: c.id,
      label: `${c.name}${c.code ? ` (${c.code})` : ''}`,
    }));
  }, [companies]);

  const dispatchStatusSelectOptions = useMemo(() => {
    return DISPATCH_STATUS_OPTIONS.map(opt => ({
      value: opt,
      label: DISPATCH_STATUS_LABELS[opt] || opt,
    }));
  }, []);

  const columns = useMemo<Column<Dispatch>[]>(() => [
    {
      key: 'referenceNumber',
      header: 'Reference',
      sortable: true,
      render: (_, row) => (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{row.referenceNumber}</span>
            <CopyButton value={row.referenceNumber} label="Dispatch #" />
          </Box>
          <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.company.name}</Box>
        </Box>
      ),
    },
    {
      key: 'origin',
      header: 'Route',
      render: (_, row) => (
        <Box sx={{ fontSize: '0.8rem' }}>
          <Box>{row.origin}</Box>
          <Box sx={{ color: 'var(--text-secondary)' }}>→ {row.destination}</Box>
        </Box>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (_, row) => (
        <StatusBadge status={row.status} size="sm" />
      ),
    },
    {
      key: 'estimatedArrival',
      header: 'Est. Arrival',
      render: (_, row) => formatDateTime(row.estimatedArrival),
    },
    {
      key: '_count',
      header: 'Shipments',
      align: 'center',
      render: (_, row) => row._count.shipments,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.75 }}>
          <Button
            variant="outline"
            size="sm"
            icon={<Eye className="w-3.5 h-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              router.push(`/dashboard/dispatches/${row.id}`);
            }}
          >
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Pencil className="w-3.5 h-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              handleOpenEdit(row);
            }}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              void handleDeleteDispatch(row);
            }}
            disabled={deletingDispatchId === row.id}
            sx={{
              color: 'var(--error)',
              borderColor: 'var(--error)',
              '&:hover': {
                bgcolor: 'rgba(var(--error-rgb), 0.1)',
              },
            }}
          >
            {deletingDispatchId === row.id ? 'Deleting...' : 'Delete'}
          </Button>
        </Box>
      ),
    },
  ], [deletingDispatchId, router]);

  return (
    <PermissionRoute permission="dispatches:manage">
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Dispatches"
          description="Manage haulage and transport dispatches to port"
          actions={
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenCreate(true)}>
              New Dispatch
            </Button>
          }
        />

        {/* Stats */}
        <DashboardGrid className="grid-cols-2 md:grid-cols-4">
          <StatsCard icon={<Truck className="w-5 h-5" />} title="Total Dispatches" value={stats.total} variant="default" />
          <StatsCard icon={<Truck className="w-5 h-5" />} title="Active Dispatches" value={stats.active} variant="info" />
          <StatsCard icon={<Truck className="w-5 h-5" />} title="Completed" value={stats.completed} variant="success" />
          <StatsCard icon={<Truck className="w-5 h-5" />} title="Assigned Units" value={stats.shipments} variant="warning" />
        </DashboardGrid>

        {/* Search */}
        <DashboardPanel title="Search & Filter" description="Find dispatches quickly">
          <FormField
            label=""
            placeholder="Search by reference #, company, route..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-4 h-4 text-[var(--text-secondary)]" />}
          />
        </DashboardPanel>

        {/* Status Filter Carousel */}
        <div className="pt-1 pb-1">
          <StatusFilterPills
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'PENDING', label: 'Pending', color: '#9CA3AF' },
              { value: 'DISPATCHED', label: 'Dispatched', color: '#F59E0B' },
              { value: 'ARRIVED_AT_PORT', label: 'Port Arrival', color: '#6366F1' },
              { value: 'COMPLETED', label: 'Completed', color: '#10B981' },
              { value: 'CANCELLED', label: 'Cancelled', color: '#EF4444' },
            ]}
            selectedValue={statusFilter}
            onSelect={(val) => setStatusFilter(val)}
          />
        </div>

        {/* Data Table Panel */}
        <DashboardPanel title={`Dispatches List (${dispatches.length})`} fullHeight>
          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading dispatches...</Box>
          ) : (
            <DataTable
              data={dispatches}
              columns={columns}
              keyField="id"
              onRowClick={(row) => router.push(`/dashboard/dispatches/${row.id}`)}
            />
          )}
        </DashboardPanel>

        {/* Create Modal */}
        <Modal
          open={openCreate}
          onClose={() => !creating && setOpenCreate(false)}
          title="Create New Dispatch"
          description="Create a dispatch reference to coordinate vehicle movement to port."
          size="md"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Dispatch'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              label="Dispatch Company"
              value={formData.companyId}
              onChange={(val) => setFormData(prev => ({ ...prev, companyId: String(val) }))}
              options={[{ value: '', label: 'Select Company' }, ...companyOptions]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Origin"
                value={formData.origin}
                onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
              />
              <FormField
                label="Destination"
                value={formData.destination}
                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Dispatch Date"
                type="date"
                value={formData.dispatchDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dispatchDate: e.target.value }))}
              />
              <FormField
                label="Est. Arrival"
                type="date"
                value={formData.estimatedArrival}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedArrival: e.target.value }))}
              />
            </div>
            <FormField
              label="Agreed Cost (USD)"
              type="number"
              value={formData.cost}
              onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
              placeholder="0.00"
            />
            <FormField
              label="Notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Optional notes..."
            />
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          open={openEdit}
          onClose={() => !editing && setOpenEdit(false)}
          title="Edit Dispatch"
          description="Update dispatch details and progress."
          size="md"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={editing}>Cancel</Button>
              <Button variant="primary" onClick={handleUpdateDispatch} disabled={editing}>
                {editing ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Select
              label="Dispatch Company"
              value={editFormData.companyId}
              onChange={(val) => setEditFormData(prev => ({ ...prev, companyId: String(val) }))}
              options={[{ value: '', label: 'Select Company' }, ...companyOptions]}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Origin"
                value={editFormData.origin}
                onChange={(e) => setEditFormData(prev => ({ ...prev, origin: e.target.value }))}
              />
              <FormField
                label="Destination"
                value={editFormData.destination}
                onChange={(e) => setEditFormData(prev => ({ ...prev, destination: e.target.value }))}
              />
            </div>
            <Select
              label="Status"
              value={editFormData.status}
              onChange={(val) => setEditFormData(prev => ({ ...prev, status: String(val) }))}
              options={dispatchStatusSelectOptions}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Dispatch Date"
                type="date"
                value={editFormData.dispatchDate}
                onChange={(e) => setEditFormData(prev => ({ ...prev, dispatchDate: e.target.value }))}
              />
              <FormField
                label="Est. Arrival"
                type="date"
                value={editFormData.estimatedArrival}
                onChange={(e) => setEditFormData(prev => ({ ...prev, estimatedArrival: e.target.value }))}
              />
            </div>
            <FormField
              label="Agreed Cost (USD)"
              type="number"
              value={editFormData.cost}
              onChange={(e) => setEditFormData(prev => ({ ...prev, cost: e.target.value }))}
            />
            <FormField
              label="Notes"
              value={editFormData.notes}
              onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        </Modal>
      </DashboardSurface>
    </PermissionRoute>
  );
}