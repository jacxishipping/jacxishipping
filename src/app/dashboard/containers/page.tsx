'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Box, Typography, Menu, MenuItem, IconButton, Divider } from '@mui/material';
import { Package, Ship, MapPin, TrendingUp, Calendar, FileText, DollarSign, Receipt, MoreVertical, Eye, Copy, Trash2, Download } from 'lucide-react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { PageHeader, StatsCard, Button, EmptyState, FormField, Select, toast, SkeletonCard, DashboardPageSkeleton, CompactSkeleton, StatusBadge } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { exportToCSVWithHeaders } from '@/lib/export';
import { useConfirmAction } from '@/components/ui/ConfirmActionProvider';

interface Container {
  id: string;
  containerNumber: string;
  trackingNumber: string | null;
  vesselName: string | null;
  shippingLine: string | null;
  destinationPort: string | null;
  estimatedArrival: string | null;
  status: string;
  progress: number;
  currentCount: number;
  maxCapacity: number;
  createdAt: string;
  _count: {
    shipments: number;
    expenses: number;
    invoices: number;
    documents: number;
  };
}

const statusLabels: Record<string, string> = {
  CREATED: 'Created',
  WAITING_FOR_LOADING: 'Waiting',
  LOADED: 'Loaded',
  IN_TRANSIT: 'In Transit',
  ARRIVED_PORT: 'Arrived',
  CUSTOMS_CLEARANCE: 'Customs',
  RELEASED: 'Released',
  CLOSED: 'Closed',
};

export default function ContainersPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showBulkTable, setShowBulkTable] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    fetchContainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, searchQuery]);

  const fetchContainers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/containers?${params}`, { cache: 'no-store' });
      const data = await response.json();

      if (response.ok) {
        setContainers(data.containers);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error fetching containers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContainers();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/containers/export-excel?${params}`);
      
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `containers-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Export started successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export containers');
    }
  };

  const confirmAction = useConfirmAction();

  const handleBulkDelete = async (containerIds: string[]) => {
    if (!isAdmin) return;

    if (!(await confirmAction({
      message: `Delete ${containerIds.length} container(s)? This cannot be undone.`,
      confirmText: 'Delete containers',
      severity: 'error',
    }))) {
      return;
    }

    try {
      const response = await fetch('/api/bulk/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', containerIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Bulk delete failed');
      }

      toast.success('Containers deleted', {
        description: `${data.deletedCount || 0} container(s) removed`,
      });

      if (data.skipped?.length) {
        toast.error('Some containers were not deleted', {
          description: data.skipped.map((item: { containerNumber: string }) => item.containerNumber).join(', '),
        });
      }

      fetchContainers();
    } catch (error) {
      console.error('Error deleting containers:', error);
      toast.error('Failed to delete containers');
    }
  };

  const handleBulkExport = (rows: Container[]) => {
    try {
      exportToCSVWithHeaders(
        rows.map((row) => ({
          containerNumber: row.containerNumber,
          status: row.status,
          trackingNumber: row.trackingNumber ?? '-',
          vesselName: row.vesselName ?? '-',
          destinationPort: row.destinationPort ?? '-',
          estimatedArrival: row.estimatedArrival ? new Date(row.estimatedArrival).toLocaleDateString() : '-',
          capacity: `${row.currentCount}/${row.maxCapacity}`,
        })),
        [
          { key: 'containerNumber', label: 'Container' },
          { key: 'status', label: 'Status' },
          { key: 'trackingNumber', label: 'Tracking' },
          { key: 'vesselName', label: 'Vessel' },
          { key: 'destinationPort', label: 'Destination' },
          { key: 'estimatedArrival', label: 'ETA' },
          { key: 'capacity', label: 'Capacity' },
        ],
        'containers'
      );
      toast.success('Export ready');
    } catch (error) {
      console.error('Error exporting containers:', error);
      toast.error('Failed to export containers');
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, container: Container) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedContainer(container);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedContainer(null);
  };

  const handleViewContainer = () => {
    if (selectedContainer) {
      router.push(`/dashboard/containers/${selectedContainer.id}`);
    }
    handleMenuClose();
  };

  const handleDuplicateContainer = () => {
    if (selectedContainer) {
      router.push(`/dashboard/containers/${selectedContainer.id}?action=duplicate`);
    }
    handleMenuClose();
  };

  const handleDeleteContainer = async () => {
    if (!selectedContainer) return;
    
    if (selectedContainer.currentCount > 0) {
      toast.error('Cannot delete container', {
        description: 'Remove all shipments first'
      });
      handleMenuClose();
      return;
    }

    if (!(await confirmAction({
      message: `Delete container ${selectedContainer.containerNumber}? This cannot be undone.`,
      confirmText: 'Delete container',
      severity: 'error',
    }))) {
      handleMenuClose();
      return;
    }

    try {
      const response = await fetch(`/api/containers/${selectedContainer.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Container deleted successfully');
        fetchContainers();
      } else {
        const data = await response.json();
        toast.error('Failed to delete container', {
          description: data.error
        });
      }
    } catch (error) {
      console.error('Error deleting container:', error);
      toast.error('An error occurred');
    }
    
    handleMenuClose();
  };

  const stats = {
    total: containers.length,
    inTransit: containers.filter(c => c.status === 'IN_TRANSIT').length,
    arrived: containers.filter(c => c.status === 'ARRIVED_PORT' || c.status === 'RELEASED').length,
    avgCapacity: containers.length > 0 
      ? Math.round((containers.reduce((sum, c) => sum + (c.currentCount / c.maxCapacity * 100), 0) / containers.length))
      : 0,
  };

  const containerStatusOptions = Object.entries(statusLabels).map(([value, label]) => ({
    value,
    label,
  }));
  const statusFilterOptions = [
    { value: 'all', label: 'All Status' },
    ...containerStatusOptions,
  ];

  const containerColumns: Column<Container>[] = [
    { key: 'containerNumber', header: 'Container', sortable: true },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <StatusBadge status={String(value)} size="sm" />,
    },
    { key: 'trackingNumber', header: 'Tracking', sortable: true },
    { key: 'vesselName', header: 'Vessel', sortable: true },
    { key: 'destinationPort', header: 'Destination', sortable: true },
    {
      key: 'estimatedArrival',
      header: 'ETA',
      sortable: true,
      render: (value) => (value ? new Date(String(value)).toLocaleDateString() : '-'),
    },
    {
      key: 'currentCount',
      header: 'Capacity',
      render: (_value, row) => `${row.currentCount}/${row.maxCapacity}`,
    },
  ];

  const handleBulkStatusUpdate = async (containerIds: string[], status: string) => {
    if (!isAdmin) return;

    try {
      const response = await fetch('/api/bulk/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'updateStatus', containerIds, data: { status } }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || 'Bulk status update failed');
      }

      toast.success('Containers updated', {
        description: `${data.count || 0} container(s) updated`,
      });

      fetchContainers();
    } catch (error) {
      console.error('Error updating containers:', error);
      toast.error('Failed to update containers');
    }
  };

  if (loading && containers.length === 0) {
    return (
      <ProtectedRoute>
        <DashboardPageSkeleton />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title="Containers"
          description="Manage shipping containers and tracking"
          actions={
            <Box sx={{ display: 'flex', gap: 1 }}>
              {isAdmin && (
                <Button 
                  variant="outline"
                  onClick={() => setShowBulkTable((prev) => !prev)}
                >
                  {showBulkTable ? 'Card view' : 'Bulk mode'}
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={handleExport}
                icon={<Download className="w-4 h-4" />}
              >
                Export CSV
              </Button>
              {isAdmin && (
                <Link href="/dashboard/containers/new" style={{ textDecoration: 'none' }}>
                  <Button variant="primary" icon={<Package className="w-4 h-4" />}>
                    New Container
                  </Button>
                </Link>
              )}
            </Box>
          }
        />

        {/* Stats */}
        <DashboardGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            icon={<Package style={{ fontSize: 18 }} />}
            title="Total Containers"
            value={stats.total}
            variant="default"
            size="md"
          />
          <StatsCard
            icon={<Ship style={{ fontSize: 18 }} />}
            title="In Transit"
            value={stats.inTransit}
            variant="info"
            size="md"
          />
          <StatsCard
            icon={<MapPin style={{ fontSize: 18 }} />}
            title="Arrived"
            value={stats.arrived}
            variant="success"
            size="md"
          />
          <StatsCard
            icon={<TrendingUp style={{ fontSize: 18 }} />}
            title="Avg Capacity"
            value={`${stats.avgCapacity}%`}
            variant="warning"
            size="md"
          />
        </DashboardGrid>

        {/* Filters */}
        <DashboardPanel title="Search & Filter" description="Find containers quickly">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <form onSubmit={handleSearch}>
                <FormField
                  label=""
                  placeholder="Search by container #, tracking #, vessel..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Package style={{ fontSize: 20, color: 'var(--text-secondary)' }} />}
                />
                <button type="submit" className="sr-only">
                  Search containers
                </button>
              </form>
            </Box>
            <Box sx={{ minWidth: { xs: '100%', md: 200 } }}>
              <Select
                label="Status Filter"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(String(value));
                  setPage(1);
                }}
                options={statusFilterOptions}
              />
            </Box>
          </Box>
        </DashboardPanel>

        {/* Container Grid */}
        <DashboardPanel title={`All Containers (${containers.length})`} fullHeight>
          {loading ? (
            <CompactSkeleton />
          ) : containers.length === 0 ? (
            <EmptyState
              icon={<Package />}
              title="No containers found"
              description={isAdmin ? "Create your first container to get started" : "You have no containers with your shipments yet"}
              action={
                isAdmin ? (
                  <Link href="/dashboard/containers/new" style={{ textDecoration: 'none' }}>
                    <Button variant="primary">Create First Container</Button>
                  </Link>
                ) : undefined
              }
            />
          ) : showBulkTable ? (
            <DataTable
              data={containers}
              columns={containerColumns}
              keyField="id"
              selectable={isAdmin}
              onRowClick={(row) => router.push(`/dashboard/containers/${row.id}`)}
              onDelete={isAdmin ? handleBulkDelete : undefined}
              onExport={isAdmin ? handleBulkExport : undefined}
              bulkStatusOptions={containerStatusOptions}
              onBulkStatusChange={isAdmin ? handleBulkStatusUpdate : undefined}
              currentPage={page}
              totalPages={totalPages}
            />
          ) : (
            <>
              <DashboardGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {containers.map((container, index) => (
                  <Box
                    key={container.id}
                    onClick={() => router.push(`/dashboard/containers/${container.id}`)}
                    sx={{
                      borderRadius: 2,
                      border: '1px solid var(--border)',
                      background: 'var(--panel)',
                      boxShadow: '0 12px 30px rgba(var(--text-primary-rgb), 0.08)',
                      p: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 20px 40px rgba(var(--text-primary-rgb), 0.12)',
                      },
                    }}
                  >
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {container.containerNumber}
                        </Typography>
                        {container.trackingNumber && (
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                            {container.trackingNumber}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StatusBadge status={container.status} size="sm" />
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, container)}
                          sx={{
                            color: 'var(--text-secondary)',
                            '&:hover': {
                              bgcolor: 'rgba(var(--text-primary-rgb), 0.05)',
                            },
                          }}
                        >
                          <MoreVertical style={{ fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Progress */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Progress
                        </Typography>
                        <Typography sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {container.progress}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: '100%',
                          height: 6,
                          borderRadius: 1,
                          bgcolor: 'var(--background)',
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${container.progress}%`,
                            height: '100%',
                            bgcolor: 'var(--accent-gold)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Details */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                      {container.vesselName && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Ship style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {container.vesselName}
                          </Typography>
                        </Box>
                      )}
                      {container.destinationPort && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MapPin style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {container.destinationPort}
                          </Typography>
                        </Box>
                      )}
                      {container.estimatedArrival && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Calendar style={{ fontSize: 14, color: 'var(--text-secondary)' }} />
                          <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            ETA: {new Date(container.estimatedArrival).toLocaleDateString()}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Stats */}
                    <Box
                      sx={{
                        pt: 2,
                        borderTop: '1px solid var(--border)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Package style={{ fontSize: 14, color: 'var(--accent-gold)' }} />
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {container._count.shipments}/{container.maxCapacity}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 2, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <FileText style={{ fontSize: 12 }} />
                          <span>{container._count.documents}</span>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DollarSign style={{ fontSize: 12 }} />
                          <span>{container._count.expenses}</span>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Receipt style={{ fontSize: 12 }} />
                          <span>{container._count.invoices}</span>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </DashboardGrid>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mt: 3 }}>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    size="sm"
                  >
                    Previous
                  </Button>
                  <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Page {page} of {totalPages}
                  </Typography>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    size="sm"
                  >
                    Next
                  </Button>
                </Box>
              )}
            </>
          )}
        </DashboardPanel>

        {/* Quick Actions Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              bgcolor: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 2,
              minWidth: 180,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem
            onClick={handleViewContainer}
            sx={{
              fontSize: '0.875rem',
              py: 1.5,
              px: 2,
              color: 'var(--text-primary)',
              '&:hover': {
                bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
              },
            }}
          >
            <Eye style={{ fontSize: 16, marginRight: 12 }} />
            View Details
          </MenuItem>
          {session?.user?.role === 'admin' && (
            <MenuItem
              onClick={handleDuplicateContainer}
              sx={{
                fontSize: '0.875rem',
                py: 1.5,
                px: 2,
                color: 'var(--text-primary)',
                '&:hover': {
                  bgcolor: 'rgba(var(--accent-gold-rgb), 0.1)',
                },
              }}
            >
              <Copy style={{ fontSize: 16, marginRight: 12 }} />
              Duplicate
            </MenuItem>
          )}
          {session?.user?.role === 'admin' && <Divider sx={{ my: 0.5, borderColor: 'var(--border)' }} />}
          {session?.user?.role === 'admin' && (
            <MenuItem
              onClick={handleDeleteContainer}
              sx={{
                fontSize: '0.875rem',
                py: 1.5,
                px: 2,
                color: 'var(--error)',
                '&:hover': {
                  bgcolor: 'rgba(var(--error-rgb), 0.1)',
                },
              }}
            >
              <Trash2 style={{ fontSize: 16, marginRight: 12 }} />
              Delete
            </MenuItem>
          )}
        </Menu>
      </DashboardSurface>
    </ProtectedRoute>
  );
}
