'use client';
import { formatMoney as formatCurrency } from '@/lib/format';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box } from '@mui/material';
import { Eye, Package, Pencil, Plus, Search, Trash2, Truck } from 'lucide-react';
import AdminRoute from '@/components/auth/AdminRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, StatsCard, toast, CopyButton, StatusFilterPills, StatusBadge, Modal, FormField, Select } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';

interface Company {
  id: string;
  name: string;
  code: string | null;
  phone?: string | null;
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
  companyId?: string | null;
  company?: Company | null;
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

const ROUTE_PRESETS = [
  { value: 'mersin-islamqala', label: '🇹🇷 Mersin, Turkey ➔ 🇦🇫 Islam Qala, Herat (AFG Corridor)' },
  { value: 'dubai-kabul', label: '🇦🇪 Dubai, UAE ➔ 🇦🇫 Kabul, Afghanistan' },
  { value: 'dubai-islamqala', label: '🇦🇪 Dubai, UAE ➔ 🇦🇫 Islam Qala, Herat' },
  { value: 'islamqala-herat', label: '🇦🇫 Islam Qala ➔ 🇦🇫 Herat' },
  { value: 'custom', label: '🌐 Custom Origin & Destination' },
];

const editableStatusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'ARRIVED', label: 'Arrived' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

export default function TransitsPage() {
  const router = useRouter();
  const confirmAction = useConfirmAction();
  const [transits, setTransits] = useState<Transit[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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
    companyId: '',
    routePreset: 'mersin-islamqala',
    vehicleType: 'sedan',
    origin: 'Mersin, Turkey',
    destination: 'Islam Qala, Herat',
    dispatchDate: '',
    estimatedDelivery: '',
    cost: '2300',
    notes: 'Includes customs clearance and transportation. Port congestion and unforeseen circumstances passed to client. (AFG Oct 1-15, 2026 Tariff)',
  });
  const [editFormData, setEditFormData] = useState({
    companyId: '',
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
    fetch('/api/finance/companies?active=true&companyType=TRANSIT')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.companies) {
          setCompanies(data.companies);
          const afg = data.companies.find((c: Company) => c.code === '0101' || c.name.toLowerCase().includes('afg'));
          if (afg) {
            setFormData((prev) => ({
              ...prev,
              companyId: prev.companyId || afg.id,
            }));
          }
        }
      })
      .catch((err) => console.error('Failed to load transit companies:', err));
  }, []);

  const handleRoutePresetChange = (preset: string) => {
    const afg = companies.find((c) => c.code === '0101' || c.name.toLowerCase().includes('afg'));
    if (preset === 'mersin-islamqala') {
      const isSuv = formData.vehicleType === 'suv';
      setFormData((prev) => ({
        ...prev,
        routePreset: preset,
        origin: 'Mersin, Turkey',
        destination: 'Islam Qala, Herat',
        companyId: afg ? afg.id : prev.companyId,
        cost: isSuv ? '2400' : '2300',
        notes: 'Includes customs clearance and transportation. Port congestion and unforeseen circumstances passed to client. (AFG Oct 1-15, 2026 Tariff)',
      }));
    } else if (preset === 'dubai-kabul') {
      setFormData((prev) => ({
        ...prev,
        routePreset: preset,
        origin: 'Dubai, UAE',
        destination: 'Kabul, Afghanistan',
        notes: '',
      }));
    } else if (preset === 'dubai-islamqala') {
      setFormData((prev) => ({
        ...prev,
        routePreset: preset,
        origin: 'Dubai, UAE',
        destination: 'Islam Qala, Herat',
        notes: '',
      }));
    } else if (preset === 'islamqala-herat') {
      setFormData((prev) => ({
        ...prev,
        routePreset: preset,
        origin: 'Islam Qala',
        destination: 'Herat',
        notes: '',
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        routePreset: preset,
      }));
    }
  };

  const handleVehicleTypeChange = (type: string) => {
    setFormData((prev) => {
      const isMersinRoute = prev.routePreset === 'mersin-islamqala' || (prev.origin.toLowerCase().includes('mersin') && prev.destination.toLowerCase().includes('islam qala'));
      return {
        ...prev,
        vehicleType: type,
        cost: isMersinRoute ? (type === 'suv' ? '2400' : '2300') : prev.cost,
      };
    });
  };

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
          companyId: formData.companyId || undefined,
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
      setFormData({
        companyId: companies.find((c) => c.code === '0101')?.id || '',
        routePreset: 'mersin-islamqala',
        vehicleType: 'sedan',
        origin: 'Mersin, Turkey',
        destination: 'Islam Qala, Herat',
        dispatchDate: '',
        estimatedDelivery: '',
        cost: '2300',
        notes: 'Includes customs clearance and transportation. Port congestion and unforeseen circumstances passed to client. (AFG Oct 1-15, 2026 Tariff)',
      });
      await fetchTransits();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create transit');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTransit = async (transit: Transit) => {
    const confirmed = await confirmAction({
      title: 'Delete Transit',
      message: `Delete transit ${transit.referenceNumber}? This action cannot be undone.`,
      confirmText: 'Delete transit',
      severity: 'error',
    });
    if (!confirmed) return;

    try {
      setDeletingTransitId(transit.id);
      const response = await fetch(`/api/transits/${transit.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete transit');

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
      companyId: transit.companyId || transit.currentCompany?.id || '',
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
          companyId: editFormData.companyId || null,
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{row.referenceNumber}</span>
            <CopyButton value={row.referenceNumber} label="Transit #" />
          </Box>
          <Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {row.currentCompany?.name ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
                🚚 {row.currentCompany.name} {row.currentCompany.code ? `(${row.currentCompany.code})` : ''}
              </span>
            ) : (
              'Unassigned Carrier'
            )}
          </Box>
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
      render: (_, row) => (
        <StatusBadge status={row.status} size="sm" />
      ),
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
      align: 'right',
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.75, flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
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
        <PageHeader
          showBreadcrumbs
          title="Transits"
          description="Manage overland vehicle transits from Turkey (Mersin) and UAE to Afghanistan"
          actions={
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpenCreate(true)}>
              New Transit
            </Button>
          }
        />

        {/* Stats */}
        <DashboardGrid className="grid-cols-2 md:grid-cols-4">
          <StatsCard icon={<Truck className="w-5 h-5" />} title="Total Transits" value={stats.total} variant="default" />
          <StatsCard icon={<Truck className="w-5 h-5" />} title="Active Transits" value={stats.active} variant="info" />
          <StatsCard icon={<Truck className="w-5 h-5" />} title="Delivered" value={stats.delivered} variant="success" />
          <StatsCard icon={<Package className="w-5 h-5" />} title="Pending" value={stats.pending} variant="warning" />
        </DashboardGrid>

        {/* Search & Filter */}
        <DashboardPanel title="Search & Filter" description="Find transits quickly">
          <FormField
            label=""
            placeholder="Search by reference #, destination, notes..."
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
              { value: 'IN_TRANSIT', label: 'In Transit', color: '#6366F1' },
              { value: 'ARRIVED', label: 'Arrived', color: '#8B5CF6' },
              { value: 'DELIVERED', label: 'Delivered', color: '#10B981' },
              { value: 'CANCELLED', label: 'Cancelled', color: '#EF4444' },
            ]}
            selectedValue={statusFilter}
            onSelect={(val) => setStatusFilter(val)}
          />
        </div>

        {/* Data Table Panel */}
        <DashboardPanel title={`Transits List (${transits.length})`} fullHeight>
          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading transits...</Box>
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

        {/* Create Modal */}
        <Modal
          open={openCreate}
          onClose={() => !creating && setOpenCreate(false)}
          title="Create Overland Transit"
          description="Initialize an overland vehicle transit corridor (e.g. Mersin, Turkey or Dubai, UAE to Afghanistan)."
          size="lg"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenCreate(false)} disabled={creating}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate} disabled={creating}>
                {creating ? 'Creating...' : 'Create Transit'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Route Preset"
                value={formData.routePreset}
                onChange={(val) => handleRoutePresetChange(String(val))}
                options={ROUTE_PRESETS}
              />
              <Select
                label="Transit Carrier / Company"
                value={formData.companyId}
                onChange={(val) => setFormData(prev => ({ ...prev, companyId: String(val) }))}
                options={[
                  { value: '', label: 'Select Carrier (Optional)' },
                  ...companies.map(c => ({
                    value: c.id,
                    label: `${c.name} ${c.code ? `(${c.code})` : ''}`,
                  })),
                ]}
              />
            </div>

            {/* Quick Vehicle Type switcher for Mersin -> Islam Qala */}
            {(formData.routePreset === 'mersin-islamqala' ||
              (formData.origin.toLowerCase().includes('mersin') && formData.destination.toLowerCase().includes('islam qala'))) && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3 dark:bg-emerald-950/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🚢</span>
                    <div>
                      <div className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">
                        AFG (The American Freight Group) — Mersin to Islam Qala Corridor
                      </div>
                      <div className="text-xs text-emerald-700 dark:text-emerald-300">
                        Official Tariff (Effective Oct 1st–15th, 2026) • Customs clearance & transportation included
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-background p-1 border border-border">
                    <button
                      type="button"
                      onClick={() => handleVehicleTypeChange('sedan')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        formData.vehicleType === 'sedan'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Sedan ($2,300)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVehicleTypeChange('suv')}
                      className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                        formData.vehicleType === 'suv'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      SUV ($2,400)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground border-t border-emerald-500/20 pt-2">
                  <div>
                    <span className="font-medium text-foreground">Terms:</span> Port congestion, force majeure & unforeseen costs passed to client.
                  </div>
                  <div className="text-right md:text-right">
                    <span className="font-medium text-foreground">Carrier:</span> +1 862 237 7066 • afgshipping.com
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Origin"
                value={formData.origin}
                onChange={(e) => setFormData(prev => ({ ...prev, origin: e.target.value }))}
                placeholder="Mersin, Turkey"
              />
              <FormField
                label="Destination"
                value={formData.destination}
                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                placeholder="Islam Qala, Herat"
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
                label="Est. Delivery Date"
                type="date"
                value={formData.estimatedDelivery}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
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
              placeholder="Optional notes or contractual terms..."
            />
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal
          open={openEdit}
          onClose={() => !editing && setOpenEdit(false)}
          title="Edit Transit"
          description="Update transit parameters, carrier, and status."
          size="lg"
          actions={
            <>
              <Button variant="outline" onClick={() => setOpenEdit(false)} disabled={editing}>Cancel</Button>
              <Button variant="primary" onClick={handleUpdateTransit} disabled={editing}>
                {editing ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Transit Carrier / Company"
                value={editFormData.companyId}
                onChange={(val) => setEditFormData(prev => ({ ...prev, companyId: String(val) }))}
                options={[
                  { value: '', label: 'Unassigned Carrier' },
                  ...companies.map(c => ({
                    value: c.id,
                    label: `${c.name} ${c.code ? `(${c.code})` : ''}`,
                  })),
                ]}
              />
              <Select
                label="Status"
                value={editFormData.status}
                onChange={(val) => setEditFormData(prev => ({ ...prev, status: String(val) }))}
                options={editableStatusOptions}
              />
            </div>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Dispatch Date"
                type="date"
                value={editFormData.dispatchDate}
                onChange={(e) => setEditFormData(prev => ({ ...prev, dispatchDate: e.target.value }))}
              />
              <FormField
                label="Est. Delivery Date"
                type="date"
                value={editFormData.estimatedDelivery}
                onChange={(e) => setEditFormData(prev => ({ ...prev, estimatedDelivery: e.target.value }))}
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
    </AdminRoute>
  );
}