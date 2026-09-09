'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

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
import { Eye, Package, Pencil, Plus, Search, Trash2, Truck } from 'lucide-react';
import AdminRoute from '@/components/auth/AdminRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, StatsCard, toast } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';

interface Company {
  id: string;
  name: string;
  code: string | null;
}

interface TransitEventSummary {
  id: string;
  companyId: string;
  origin: string;
  destination: string;
  status: string;
  company: Company;
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
  cost: number | null;
  notes: string | null;
  createdAt: string;
  currentEvent: TransitEventSummary | null;
  currentCompany: Company | null;
  _count: {
    shipments: number;
    events: number;
    expenses: number;
  };
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'rgba(156, 163, 175, 0.15)', text: 'rgb(156, 163, 175)', border: 'rgba(156, 163, 175, 0.3)' },
  DISPATCHED: { bg: 'rgba(251, 191, 36, 0.15)', text: 'rgb(251, 191, 36)', border: 'rgba(251, 191, 36, 0.3)' },
  IN_TRANSIT: { bg: 'rgba(99, 102, 241, 0.15)', text: 'rgb(99, 102, 241)', border: 'rgba(99, 102, 241, 0.3)' },
  ARRIVED: { bg: 'rgba(34, 197, 94, 0.15)', text: 'rgb(34, 197, 94)', border: 'rgba(34, 197, 94, 0.3)' },
  DELIVERED: { bg: 'rgba(20, 184, 166, 0.15)', text: 'rgb(20, 184, 166)', border: 'rgba(20, 184, 166, 0.3)' },
  CANCELLED: { bg: 'rgba(239, 68, 68, 0.15)', text: 'rgb(239, 68, 68)', border: 'rgba(239, 68, 68, 0.3)' },
};

const statusLabels: Record<string, string> = {
  PENDING: 'Pending',
  DISPATCHED: 'Dispatched',
  IN_TRANSIT: 'In Transit',
  ARRIVED: 'Arrived',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const editableStatusOptions = ['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'CANCELLED'];

export default function TransitsPage() {
  const router = useRouter();
  const [transits, setTransits] = useState<Transit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingTransitId, setEditingTransitId] = useState<string | null>(null);
  const [deletingTransitId, setDeletingTransitId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    origin: 'Dubai, UAE',
    destination: 'Kabul, Afghanistan',
    dispatchDate: '',
    estimatedDelivery: '',
    cost: '',
    notes: '',
  });
  const [editFormData, setEditFormData] = useState({
    origin: '',
    destination: '',
    status: 'PENDING',
    dispatchDate: '',
    estimatedDelivery: '',
    actualDelivery: '',
    cost: '',
    notes: '',
  });

  const fetchTransits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      const response = await fetch(`/api/transits?${params}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch');
      setTransits(data.transits || []);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load transits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTransits();
  }, [search, statusFilter]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setIsShiftPressed(true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleCreate = async () => {
    try {
      setCreating(true);
      const response = await fetch('/api/transits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: formData.origin,
          destination: formData.destination,
          dispatchDate: formData.dispatchDate || undefined,
          estimatedDelivery: formData.estimatedDelivery || undefined,
          cost: formData.cost ? parseFloat(formData.cost) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create transit');

      toast.success(`Transit ${data.transit.referenceNumber} created`);
      setOpenCreate(false);
      setFormData({ origin: 'Dubai, UAE', destination: 'Kabul, Afghanistan', dispatchDate: '', estimatedDelivery: '', cost: '', notes: '' });
      await fetchTransits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create transit');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTransit = async (transit: Transit) => {
    const shouldDelete = confirm(
      `Delete transit ${transit.referenceNumber}? This will remove linked transit events and transit expenses.`
    );
    if (!shouldDelete) return;

    try {
      setDeletingTransitId(transit.id);
      const response = await fetch(`/api/transits/${transit.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete transit');
      }

      toast.success(`Transit ${transit.referenceNumber} deleted`);
      await fetchTransits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete transit');
    } finally {
      setDeletingTransitId(null);
    }
  };

  const handleOpenEdit = (transit: Transit) => {
    if (transit.status === 'DELIVERED') {
      toast.error('Use the transit detail page to review delivery confirmation records for delivered transits');
      router.push(`/dashboard/transits/${transit.id}`);
      return;
    }
    setEditingTransitId(transit.id);
    setEditFormData({
      origin: transit.origin,
      destination: transit.destination,
      status: transit.status,
      dispatchDate: transit.dispatchDate ? transit.dispatchDate.slice(0, 10) : '',
      estimatedDelivery: transit.estimatedDelivery ? transit.estimatedDelivery.slice(0, 10) : '',
      actualDelivery: transit.actualDelivery ? transit.actualDelivery.slice(0, 10) : '',
      cost: transit.cost != null ? String(transit.cost) : '',
      notes: transit.notes || '',
    });
    setOpenEdit(true);
  };

  const handleUpdateTransit = async () => {
    if (!editingTransitId) return;

    try {
      setEditing(true);
      const response = await fetch(`/api/transits/${editingTransitId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: editFormData.origin,
          destination: editFormData.destination,
          status: editFormData.status,
          dispatchDate: editFormData.dispatchDate || null,
          estimatedDelivery: editFormData.estimatedDelivery || null,
          cost: editFormData.cost ? parseFloat(editFormData.cost) : null,
          notes: editFormData.notes || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update transit');
      }

      toast.success('Transit updated successfully');
      setOpenEdit(false);
      setEditingTransitId(null);
      await fetchTransits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update transit');
    } finally {
      setEditing(false);
    }
  };

  const stats = useMemo(() => ({
    total: transits.length,
    active: transits.filter(t => ['DISPATCHED', 'IN_TRANSIT', 'ARRIVED'].includes(t.status)).length,
    delivered: transits.filter(t => t.status === 'DELIVERED').length,
    pending: transits.filter(t => t.status === 'PENDING').length,
  }), [transits]);

  const columns = useMemo<Column<Transit>[]>(() => [
    {
      key: 'referenceNumber',
      header: 'Reference',
      sortable: true,
      render: (_, row) => (
        <Box>
          <Box sx={{ fontWeight: 600 }}>{row.referenceNumber}</Box>
          <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{row.currentCompany?.name || 'No current event company'}</Box>
        </Box>
      ),
    },
    {
      key: 'origin',
      header: 'Route',
      render: (_, row) => (
        <Box sx={{ fontSize: '0.8rem' }}>
          <Box>{row.currentEvent?.origin || row.origin}</Box>
          <Box sx={{ color: 'var(--text-secondary)' }}>→ {row.currentEvent?.destination || row.destination}</Box>
        </Box>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (_, row) => {
        const color = statusColors[row.status] || statusColors.PENDING;
        return (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 10px',
              borderRadius: 9999,
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: color.bg,
              color: color.text,
              border: `1px solid ${color.border}`,
            }}
          >
            {statusLabels[row.status] || row.status}
          </span>
        );
      },
    },
    {
      key: 'estimatedDelivery',
      header: 'Est. Delivery',
      render: (_, row) =>
        row.estimatedDelivery ? new Date(row.estimatedDelivery).toLocaleDateString() : '-',
    },
    {
      key: 'cost',
      header: 'Cost',
      align: 'right',
      render: (_, row) => (row.cost != null ? formatCurrency(row.cost) : '-'),
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
              router.push(`/dashboard/transits/${row.id}`);
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
            disabled={row.status === 'DELIVERED'}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={(event) => {
              event.stopPropagation();
              void handleDeleteTransit(row);
            }}
            disabled={deletingTransitId === row.id}
            sx={{
              color: 'var(--error)',
              borderColor: 'var(--error)',
              '&:hover': {
                bgcolor: 'rgba(var(--error-rgb), 0.1)',
              },
            }}
          >
            {deletingTransitId === row.id ? 'Deleting...' : 'Delete'}
          </Button>
        </Box>
      ),
    },
  ], [deletingTransitId, router]);

  return (
    <AdminRoute>
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>

        <DashboardPanel
          title="Transit Management"
          description="Manage land transits from UAE to Afghanistan"
          actions={
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenCreate(true)}>
              New Transit
            </Button>
          }
        >
          <DashboardGrid className="grid-cols-2 md:grid-cols-4 mb-4">
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Total" value={stats.total} variant="default" />
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Active" value={stats.active} variant="info" />
            <StatsCard icon={<Truck className="w-5 h-5" />} title="Delivered" value={stats.delivered} variant="success" />
            <StatsCard icon={<Package className="w-5 h-5" />} title="Pending" value={stats.pending} variant="default" />
          </DashboardGrid>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 180px' }, gap: 1.5, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by reference or notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" /> }}
            />
            <TextField
              select
              size="small"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <MenuItem value="">All Statuses</MenuItem>
              {Object.entries(statusLabels).map(([value, label]) => (
                <MenuItem key={value} value={value}>{label}</MenuItem>
              ))}
            </TextField>
          </Box>

          {loading ? (
            <Box sx={{ py: 3, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading transits...</Box>
          ) : (
            <DataTable
              data={transits}
              columns={columns}
              keyField="id"
              onRowClick={(row) => {
                if (isShiftPressed) {
                  handleOpenEdit(row);
                  return;
                }
                router.push(`/dashboard/transits/${row.id}`);
              }}
            />
          )}
        </DashboardPanel>

        <Dialog open={openCreate} onClose={() => !creating && setOpenCreate(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Create New Transit</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', p: 1.5, borderRadius: 1.5, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              Transit companies are now assigned per event. Create the transit first, then add one or more route events with their own company and from/to leg.
            </Box>
            <TextField
              label="Origin"
              value={formData.origin}
              onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
            />
            <TextField
              label="Destination"
              value={formData.destination}
              onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
            />
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Dispatch Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.dispatchDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dispatchDate: e.target.value }))}
              />
              <TextField
                label="Est. Delivery"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formData.estimatedDelivery}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
              />
            </Box>
            <TextField
              label="Agreed Cost (USD)"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              value={formData.cost}
              onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
            />
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>
              {creating ? 'Creating...' : 'Create Transit'}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={openEdit} onClose={() => !editing && setOpenEdit(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Edit Transit</DialogTitle>
          <DialogContent sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', p: 1.5, borderRadius: 1.5, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              Company assignment is managed on transit events. Update the current leg from the transit detail page by adding a new event.
            </Box>
            <TextField
              label="Origin"
              value={editFormData.origin}
              onChange={(e) => setEditFormData(prev => ({ ...prev, origin: e.target.value }))}
            />
            <TextField
              label="Destination"
              value={editFormData.destination}
              onChange={(e) => setEditFormData(prev => ({ ...prev, destination: e.target.value }))}
            />
            <TextField
              select
              label="Status"
              value={editFormData.status}
              onChange={(e) => setEditFormData(prev => ({ ...prev, status: e.target.value }))}
            >
              {editableStatusOptions.map((value) => (
                <MenuItem key={value} value={value}>{statusLabels[value] || value}</MenuItem>
              ))}
            </TextField>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <TextField
                label="Dispatch Date"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={editFormData.dispatchDate}
                onChange={(e) => setEditFormData(prev => ({ ...prev, dispatchDate: e.target.value }))}
              />
              <TextField
                label="Est. Delivery"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={editFormData.estimatedDelivery}
                onChange={(e) => setEditFormData(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
              />
            </Box>
            <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', p: 1.5, borderRadius: 1.5, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              Final delivery must be confirmed from the transit detail page so receiver name, delivered date, and proof of delivery are all captured together.
            </Box>
            <TextField
              label="Agreed Cost (USD)"
              type="number"
              inputProps={{ min: 0, step: 0.01 }}
              value={editFormData.cost}
              onChange={(e) => setEditFormData(prev => ({ ...prev, cost: e.target.value }))}
            />
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={editFormData.notes}
              onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </DialogContent>
          <DialogActions>
            <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={editing}>Cancel</Button>
            <Button variant="primary" onClick={handleUpdateTransit} disabled={editing}>
              {editing ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogActions>
        </Dialog>
      </DashboardSurface>
    </AdminRoute>
  );
}