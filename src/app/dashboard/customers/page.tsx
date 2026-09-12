'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { User, UserPlus, Eye, EyeOff, Copy, Check, Download } from 'lucide-react';
import { Box, Typography, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { Breadcrumbs, toast, SkeletonCard, Button, CompactSkeleton } from '@/components/design-system';
import { exportToCSVWithHeaders } from '@/lib/export';
import { DataTable, Column } from '@/components/ui/DataTable';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SmartSearch, { SearchFilters } from '@/components/dashboard/SmartSearch';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import UserCard from '@/components/dashboard/UserCard';
import { hasPermission } from '@/lib/rbac';

interface UserData {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt?: string;
  _count?: {
    shipments: number;
  };
}

export default function CustomersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [customers, setCustomers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    type: 'users',
  });
  const [showEmailsFor, setShowEmailsFor] = useState<Set<string>>(new Set());
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;

    const role = session?.user?.role;
    if (!session || !hasPermission(role, 'customers:view')) {
      router.replace('/dashboard');
    }
  }, [session, status, router]);

  const PAGE_SIZE = 9;

  const fetchCustomers = useCallback(async (page: number = 1, query: string = searchFilters.query) => {
    try {
      setLoading(true);
      const url = `/api/users?page=${page}&pageSize=${PAGE_SIZE}&roleType=customers${query ? `&query=${encodeURIComponent(query)}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data.users || []);
        setTotalCustomers(data.total ?? 0);
        setCurrentPage(data.page ?? page);
      } else {
        toast.error('Failed to fetch customers');
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Error fetching customers');
    } finally {
      setLoading(false);
    }
  }, [searchFilters.query]);

  useEffect(() => {
    if (status === 'loading') return;
    const role = session?.user?.role;
    if (!session || !hasPermission(role, 'customers:view')) return;
    fetchCustomers(currentPage);
  }, [session, status, currentPage, fetchCustomers]);

  const handleSearch = (filters: SearchFilters) => {
    setSearchFilters(filters);
    setCurrentPage(1);
    fetchCustomers(1, filters.query);
  };

  const formatRole = (role: string) => role.charAt(0).toUpperCase() + role.slice(1);

  const toggleEmailVisibility = (userId: string) => {
    setShowEmailsFor((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const copyToClipboard = async (text: string, userId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmail(userId);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const maskEmail = (email: string) => {
    const [username, domain] = email.split('@');
    if (username.length <= 3) return `${username[0]}***@${domain}`;
    return `${username.substring(0, 3)}***@${domain}`;
  };

  const customerColumns = useMemo<Column<UserData>[]>(() => [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      render: (_, row) => (
        <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }} noWrap>
            {row.name || 'Unnamed Customer'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {formatRole(row.role)}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (_, row) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', fontSize: '0.8rem' }} noWrap>
            {showEmailsFor.has(row.id) ? row.email : maskEmail(row.email)}
          </Typography>
          <IconButton size="small" onClick={() => toggleEmailVisibility(row.id)} title="Toggle email visibility">
            {showEmailsFor.has(row.id) ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
          </IconButton>
          {showEmailsFor.has(row.id) && (
            <IconButton size="small" onClick={() => copyToClipboard(row.email, row.id)} title="Copy email">
              {copiedEmail === row.id ? <Check style={{ color: 'green', width: 16, height: 16 }} /> : <Copy style={{ color: 'var(--accent-gold)', width: 16, height: 16 }} />}
            </IconButton>
          )}
        </Box>
      ),
    },
    {
      key: 'shipments',
      header: 'Shipments',
      sortable: true,
      render: (_, row) => (
        <Typography sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
          {row._count?.shipments ?? 0}
        </Typography>
      ),
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      render: (_, row) => (
        <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
        </Typography>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Link href={`/dashboard/users/${row.id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm" icon={<VisibilityIcon />} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>
              View
            </Button>
          </Link>
          <Link href={`/dashboard/users/${row.id}/edit`} style={{ textDecoration: 'none' }}>
            <Button variant="ghost" size="sm" icon={<EditIcon />} sx={{ textTransform: 'none', fontSize: '0.7rem' }}>
              Edit
            </Button>
          </Link>
          <Button variant="ghost" size="sm" icon={<DeleteIcon />} onClick={() => handleDeleteClick(row.id)} sx={{ color: 'var(--error)' }}>
            Delete
          </Button>
        </Box>
      ),
    },
  ], [showEmailsFor, copiedEmail]);

  const totalPages = Math.max(1, Math.ceil(totalCustomers / PAGE_SIZE));

  const handleDeleteClick = (id: string) => {
    setDeletingUserId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingUserId) return;
    try {
      setLoading(true);
      const resp = await fetch(`/api/users/${deletingUserId}`, { method: 'DELETE' });
      if (resp.ok) {
        toast.success('Customer deleted successfully');
        setConfirmOpen(false);
        setDeletingUserId(null);
        const nextPage = currentPage > 1 && customers.length === 1 ? currentPage - 1 : currentPage;
        setCurrentPage(nextPage);
        await fetchCustomers(nextPage, searchFilters.query);
      } else {
        toast.error('Failed to delete customer');
      }
    } catch (err) {
      console.error('Error deleting customer:', err);
      toast.error('Error deleting customer');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmOpen(false);
    setDeletingUserId(null);
  };

  const handleExportCustomerVinCsv = useCallback(async () => {
    try {
      const firstPageResponse = await fetch('/api/users?page=1&pageSize=200&roleType=customers');
      if (!firstPageResponse.ok) {
        throw new Error('Failed to load customers for export');
      }

      const firstPageData = await firstPageResponse.json();
      const totalCustomersForExport = Number(firstPageData.total ?? 0);
      const pageSize = 200;
      const pageCount = Math.max(1, Math.ceil(totalCustomersForExport / pageSize));

      const customerPageResponses = await Promise.all(
        Array.from({ length: pageCount }, (_, index) =>
          fetch(`/api/users?page=${index + 1}&pageSize=${pageSize}&roleType=customers`),
        ),
      );

      const customerPages = await Promise.all(
        customerPageResponses.map(async (response) => {
          if (!response.ok) {
            throw new Error('Failed to fetch customer export data');
          }
          return response.json();
        }),
      );

      const customerList = customerPages.flatMap((page) => page.users ?? []);

      const rows = await Promise.all(
        customerList.map(async (customer: UserData) => {
          try {
            const detailResponse = await fetch(`/api/users/${customer.id}`);
            if (!detailResponse.ok) {
              return {
                customerName: customer.name || 'Unnamed Customer',
                shipmentVins: 'N/A',
              };
            }

            const detail = await detailResponse.json();
            const shipmentVins = (detail.user?.shipments ?? [])
              .map((shipment: { vehicleVIN?: string | null }) => shipment.vehicleVIN)
              .filter((vin: string | null | undefined): vin is string => Boolean(vin && vin.trim()))
              .join(' | ');

            return {
              customerName: detail.user?.name || customer.name || 'Unnamed Customer',
              shipmentVins: shipmentVins || 'N/A',
            };
          } catch (error) {
            console.error(`Error exporting customer ${customer.id}:`, error);
            return {
              customerName: customer.name || 'Unnamed Customer',
              shipmentVins: 'N/A',
            };
          }
        }),
      );

      exportToCSVWithHeaders(
        rows,
        [
          { key: 'customerName', label: 'Customer Name' },
          { key: 'shipmentVins', label: 'Shipment VINs' },
        ],
        'customers-shipment-vins',
      );

      toast.success(`Exported ${rows.length} customers with VINs`);
    } catch (error) {
      console.error('Export customer VINs failed:', error);
      toast.error('Failed to export customer VIN data');
    }
  }, []);

  if (status === 'loading') {
    return (
      <DashboardSurface>
        <Box sx={{ px: 2, pt: 2 }}>
          <Breadcrumbs />
        </Box>
        <DashboardPanel>
          <CompactSkeleton />
        </DashboardPanel>
      </DashboardSurface>
    );
  }

  const role = session?.user?.role;
  if (!session || !hasPermission(role, 'customers:view')) {
    return null;
  }

  return (
    <DashboardSurface>
      <Box sx={{ px: 2, pt: 2 }}>
        <Breadcrumbs />
      </Box>

      <DashboardPanel
        title="Customers"
        description="All customer accounts"
        noBodyPadding
        actions={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <Button variant="outline" size="sm" onClick={() => void handleExportCustomerVinCsv()} sx={{ textTransform: 'none', fontWeight: 600 }}>
              <Download style={{ width: 16, height: 16, marginRight: 8 }} />
              Export VINs
            </Button>
            <Link href="/dashboard/customers/new" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm" sx={{ textTransform: 'none', fontWeight: 600 }}>
                <UserPlus style={{ width: 16, height: 16, marginRight: 8 }} />
                Create Customer
              </Button>
            </Link>
          </Box>
        }
      >
        <Box sx={{ px: 1.5, py: 1.5 }}>
          <SmartSearch
            onSearch={handleSearch}
            placeholder="Search customers by name or email..."
            showTypeFilter={false}
            showStatusFilter={false}
            showDateFilter
            showPriceFilter={false}
            showUserFilter={false}
            defaultType="users"
          />
        </Box>
      </DashboardPanel>

      <DashboardPanel title={`All Customers (${totalCustomers})`} fullHeight>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, mb: 2 }}>
          <Box sx={{ p: 2, bgcolor: 'var(--text-primary)/0.04', borderRadius: 1, border: '1px solid rgba(6,182,212,0.12)' }}>
            <Typography variant="caption" color="text.secondary">Total Customers</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalCustomers}</Typography>
          </Box>
          <Box sx={{ p: 2, bgcolor: 'var(--text-primary)/0.04', borderRadius: 1, border: '1px solid rgba(16,185,129,0.08)' }}>
            <Typography variant="caption" color="text.secondary">Filtered Results</Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>{totalCustomers}</Typography>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </Box>
        ) : customers.length === 0 ? (
          <Box sx={{ minHeight: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <User style={{ width: 48, height: 48, color: 'rgba(255,255,255,0.25)' }} />
            <Typography sx={{ color: 'var(--text-secondary)' }}>No customers found</Typography>
            <Link href="/dashboard/customers/new" style={{ textDecoration: 'none' }}>
              <Button variant="primary" size="sm" sx={{ mt: 1, textTransform: 'none' }}>
                <UserPlus style={{ width: 16, height: 16, marginRight: 8 }} /> Create Customer
              </Button>
            </Link>
          </Box>
        ) : (
          <>
            <div className="hidden lg:block">
              <DataTable data={customers} columns={customerColumns} keyField="id" />
            </div>
            <Box sx={{ display: { xs: 'grid', lg: 'none' }, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 2 }}>
              {customers.map((user, index) => (
                <UserCard
                  key={user.id}
                  user={user}
                  index={index}
                  highlighted={false}
                  showEmail={showEmailsFor.has(user.id)}
                  copiedEmail={copiedEmail}
                  onToggleEmail={toggleEmailVisibility}
                  onCopyEmail={copyToClipboard}
                  onDelete={handleDeleteClick}
                />
              ))}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
              <Button variant="outline" size="sm" onClick={() => { setCurrentPage((p) => Math.max(1, p - 1)); fetchCustomers(currentPage - 1, searchFilters.query); }} disabled={currentPage === 1} sx={{ textTransform: 'none' }}>
                Previous
              </Button>
              <Typography sx={{ color: 'var(--text-secondary)' }}>Page {currentPage} of {totalPages}</Typography>
              <Button variant="outline" size="sm" onClick={() => { setCurrentPage((p) => Math.min(totalPages, p + 1)); fetchCustomers(currentPage + 1, searchFilters.query); }} disabled={currentPage === totalPages} sx={{ textTransform: 'none' }}>
                Next
              </Button>
            </Box>
          </>
        )}
      </DashboardPanel>

      <Dialog open={confirmOpen} onClose={handleCancelDelete} aria-labelledby="confirm-delete-title">
        <DialogTitle id="confirm-delete-title">Confirm delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this customer? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDelete} variant="ghost">Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="primary" color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </DashboardSurface>
  );
}
