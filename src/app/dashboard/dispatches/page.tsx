'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material';
import { Eye, Pencil, Plus, Search, Trash2, Truck } from 'lucide-react';
import PermissionRoute from '@/components/auth/PermissionRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, EmptyState, SkeletonTable, StatsCard, toast } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { DISPATCH_STATUS_COLORS, DISPATCH_STATUS_OPTIONS, getDispatchStatusLabel } from '@/lib/dispatch-workflow';

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
    if (!confirm(`Delete dispatch ${dispatch.referenceNumber}? This will remove linked dispatch events and dispatch expenses.`)) {
      return;
    }

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
    active: dispatches.filter((item) => ['DISPATCHED', 'ARRIVED_AT_PORT'].includes(item.status)).length,
    completed: dispatches.filter((item) => item.status === 'COMPLETED').length,
    pending: dispatches.filter((item) => item.status === 'PENDING').length,
  }), [dispatches]);

  const columns = useMemo<Column<Dispatch>[]>(() => [
    {
      key: 'referenceNumber',
      header: 'Reference',
      sortable: true,
      render: (_, row) => (
        <Box>
          <Box sx={{ fontWeight: 600 }}>{row.referenceNumber}</Box>
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
      render: (_, row) => {
        const color = DISPATCH_STATUS_COLORS[row.status as keyof typeof DISPATCH_STATUS_COLORS] || DISPATCH_STATUS_COLORS.PENDING;
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 9999, fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', background: color.bg, color: color.text, border: `1px solid ${color.border}` }}>
            {getDispatchStatusLabel(row.status)}
          </span>
        );
      },
    },
    {
      key: 'dispatchDate',
      header: 'Dispatch Date & Time',
      render: (_, row) => formatDateTime(row.dispatchDate),
    },
    {
      key: '_count',
      header: 'Shipments',
      align: 'center',
      render: (_, row) => row._count.shipments,
    },
    {
      key: 'id',
      header: 'Actions',
      align: 'center',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
          <Button variant="ghost" size="sm" icon={<Eye className="w-4 h-4" />} onClick={() => router.push(`/dashboard/dispatches/${row.id}`)} />
          <Button variant="ghost" size="sm" icon={<Pencil className="w-4 h-4" />} onClick={() => handleOpenEdit(row)} />
          <Button variant="ghost" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={() => void handleDeleteDispatch(row)} disabled={deletingDispatchId === row.id} />
        </Box>
      ),
    },
  ], [deletingDispatchId, router]);

  return (
    <PermissionRoute permission="dispatches:manage">
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <DashboardPanel
          title="Dispatches"
          description="Manage the first leg from yard to port before container shipping"
          actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenCreate(true)}>New dispatch</Button>}
        >
          <DashboardGrid className="grid-cols-1 md:grid-cols-4 mb-4">
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Dispatches" value={stats.total} variant="default" />
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Active" value={stats.active} variant="warning" />
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Completed" value={stats.completed} variant="success" />
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Pending" value={stats.pending} variant="secondary" />
          </DashboardGrid>

          <Box sx={{ mb: 2, display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 220px' }, gap: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by reference, notes, or VIN"
              InputProps={{ startAdornment: <Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" /> }}
            />
            <TextField select size="small" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <MenuItem value="">All Statuses</MenuItem>
              {DISPATCH_STATUS_OPTIONS.map((status) => (
                <MenuItem key={status} value={status}>{getDispatchStatusLabel(status)}</MenuItem>
              ))}
            </TextField>
          </Box>

          {loading ? (
            <Box sx={{ py: 1 }}>
              <SkeletonTable rows={6} columns={5} />
            </Box>
          ) : dispatches.length === 0 ? (
            <EmptyState
              icon={<Truck className="w-8 h-8" />}
              title={search || statusFilter ? 'No dispatches match these filters' : 'No dispatches yet'}
              description={search || statusFilter ? 'Try clearing the current filters or searching for a different reference or VIN.' : 'Create the first dispatch to start tracking the yard-to-port leg.'}
              action={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenCreate(true)}>New dispatch</Button>}
            />
          ) : (
            <DataTable data={dispatches} columns={columns} keyField="id" onRowClick={(row) => router.push(`/dashboard/dispatches/${row.id}`)} />
          )}
        </DashboardPanel>

        <Dialog open={openCreate} onClose={() => !creating && setOpenCreate(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create Dispatch</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <TextField select label="Dispatch Company" value={formData.companyId} onChange={(event) => setFormData((prev) => ({ ...prev, companyId: event.target.value }))}>
              {companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>)}
            </TextField>
            <Box sx={{ mt: -1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              This dispatch is linked to the selected company ledger. Dispatch expenses will post to that ledger and allocate customer charges across the assigned shipments.
            </Box>
            <TextField label="Origin" value={formData.origin} onChange={(event) => setFormData((prev) => ({ ...prev, origin: event.target.value }))} />
            <TextField label="Destination" value={formData.destination} onChange={(event) => setFormData((prev) => ({ ...prev, destination: event.target.value }))} />
            <TextField label="Dispatch Date" type="date" InputLabelProps={{ shrink: true }} value={formData.dispatchDate} onChange={(event) => setFormData((prev) => ({ ...prev, dispatchDate: event.target.value }))} />
            <TextField label="Estimated Arrival" type="date" InputLabelProps={{ shrink: true }} value={formData.estimatedArrival} onChange={(event) => setFormData((prev) => ({ ...prev, estimatedArrival: event.target.value }))} />
            <TextField label="Cost" type="number" value={formData.cost} onChange={(event) => setFormData((prev) => ({ ...prev, cost: event.target.value }))} />
            <TextField label="Notes" multiline rows={3} value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openEdit} onClose={() => !editing && setOpenEdit(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Dispatch</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <TextField select label="Dispatch Company" value={editFormData.companyId} onChange={(event) => setEditFormData((prev) => ({ ...prev, companyId: event.target.value }))}>
              {companies.map((company) => <MenuItem key={company.id} value={company.id}>{company.name}</MenuItem>)}
            </TextField>
            <Box sx={{ mt: -1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Changing the company changes the ledger used for future dispatch expense recovery and allocation.
            </Box>
            <TextField label="Origin" value={editFormData.origin} onChange={(event) => setEditFormData((prev) => ({ ...prev, origin: event.target.value }))} />
            <TextField label="Destination" value={editFormData.destination} onChange={(event) => setEditFormData((prev) => ({ ...prev, destination: event.target.value }))} />
            <TextField select label="Status" value={editFormData.status} onChange={(event) => setEditFormData((prev) => ({ ...prev, status: event.target.value }))}>
              {DISPATCH_STATUS_OPTIONS.map((status) => <MenuItem key={status} value={status}>{getDispatchStatusLabel(status)}</MenuItem>)}
            </TextField>
            <TextField label="Dispatch Date" type="date" InputLabelProps={{ shrink: true }} value={editFormData.dispatchDate} onChange={(event) => setEditFormData((prev) => ({ ...prev, dispatchDate: event.target.value }))} />
            <TextField label="Estimated Arrival" type="date" InputLabelProps={{ shrink: true }} value={editFormData.estimatedArrival} onChange={(event) => setEditFormData((prev) => ({ ...prev, estimatedArrival: event.target.value }))} />
            <TextField label="Actual Arrival" type="date" InputLabelProps={{ shrink: true }} value={editFormData.actualArrival} onChange={(event) => setEditFormData((prev) => ({ ...prev, actualArrival: event.target.value }))} />
            <TextField label="Cost" type="number" value={editFormData.cost} onChange={(event) => setEditFormData((prev) => ({ ...prev, cost: event.target.value }))} />
            <TextField label="Notes" multiline rows={3} value={editFormData.notes} onChange={(event) => setEditFormData((prev) => ({ ...prev, notes: event.target.value }))} />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={editing}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateDispatch} disabled={editing}>{editing ? 'Saving...' : 'Save Changes'}</Button>
          </DialogActions>
        </Dialog>
      </DashboardSurface>
    </PermissionRoute>
  );
}