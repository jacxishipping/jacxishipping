'use client';

import { useEffect, useMemo, useState, forwardRef, type CSSProperties, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { ChevronDown, Package as Inventory2OutlinedIcon, User as PersonOutlineIcon, Users as PeopleOutlineIcon } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Autocomplete, Breadcrumbs, Button, ConfirmDialog, EmptyState, FormField, Select, toast, Modal } from '@/components/design-system';
import { PortalActivityList } from '@/components/partner-portals/PortalActivityList';
import PortalBrandingSettingsPanel from '@/components/partner-portals/PortalBrandingSettingsPanel';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';


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


type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  customDomain?: string | null;
  customDomainVerifiedAt?: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  notes: string | null;
};

type PortalMembership = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};

type PortalActivity = {
  id: string;
  action: string;
  performedAt: string;
  actor: { id: string; name: string | null; email: string | null };
  target: { id: string | null; name: string | null; email: string | null };
  summary: string;
  changes?: Record<string, unknown>;
};

type PortalCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  _count?: { shipmentAssignments: number };
};

type ShipmentAssignment = {
  id: string;
  assignedAt: string;
  partnerCustomer: { id: string; name: string } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehicleVIN: string | null;
    status: string;
  };
};

type UserOption = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type ShipmentOption = {
  id: string;
  vehicleType: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  status: string;
  user?: { name: string | null; email: string };
};

type PortalManageTab = 'shipments' | 'members' | 'activity' | 'branding' | 'customers' | 'danger';

const initialInviteForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  country: '',
  membershipRole: 'STAFF',
};

export default function PartnerPortalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [assignments, setAssignments] = useState<ShipmentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [memberRole, setMemberRole] = useState('STAFF');
  const [savingMember, setSavingMember] = useState(false);
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, string>>({});
  const [savingMembershipRoleId, setSavingMembershipRoleId] = useState<string | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<string | null>(null);
  const [regeneratingLoginCodeMembershipId, setRegeneratingLoginCodeMembershipId] = useState<string | null>(null);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentResults, setShipmentResults] = useState<ShipmentOption[]>([]);
  const [savingShipmentId, setSavingShipmentId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState(initialInviteForm);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [loginCodeResult, setLoginCodeResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [activities, setActivities] = useState<PortalActivity[]>([]);
  const [activeTab, setActiveTab] = useState<PortalManageTab>('shipments');
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [openCreatePortalUserDialog, setOpenCreatePortalUserDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deletingPortal, setDeletingPortal] = useState(false);
  const [pendingRemoveMembership, setPendingRemoveMembership] = useState<PortalMembership | null>(null);
  const [pendingUnassignShipment, setPendingUnassignShipment] = useState<ShipmentAssignment | null>(null);

  const publicSiteHref = useMemo(() => {
    if (portal?.customDomainVerifiedAt && portal?.customDomain) {
      return `https://${portal.customDomain}`;
    }

    return `/portal-site/${portalId}`;
  }, [portal?.customDomain, portal?.customDomainVerifiedAt, portalId]);

  const renderAccessResult = (
    result: { loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null },
    title: string,
  ) => (
    <JXBox padding="none" border={false} style={{border: '1px solid rgba(var(--accent-gold-rgb), 0.28)', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)', borderRadius: '16px', padding: '16px', display: 'grid', gap: '6px'}}>
      <p className="text-sm leading-relaxed" style={{fontWeight: 700}}>{title}</p>
      <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>
        Share the sign-in page and code with this user. The workspace route is where they land after sign-in.
      </p>
      <p className="text-sm leading-relaxed"><strong>Name:</strong> {result.name || result.email}</p>
      <p className="text-sm leading-relaxed"><strong>Email:</strong> {result.email}</p>
      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
        <p className="text-sm leading-relaxed"><strong>Login Code:</strong> {result.loginCode}</p>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.loginCode, 'Login code')}>Copy</Button>
      </JXBox>
      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
        <p className="text-sm leading-relaxed"><strong>Sign-In Page:</strong> {result.simpleLoginUrl}</p>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.simpleLoginUrl, 'Sign-in page')}>Copy</Button>
      </JXBox>
      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
        <p className="text-sm leading-relaxed"><strong>Workspace Route:</strong> {result.portalUrl}</p>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.portalUrl, 'Workspace route')}>Copy</Button>
      </JXBox>
    </JXBox>
  );

  const handleCopyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const canAccess = hasPermission(session?.user?.role, 'customers:manage') || hasPermission(session?.user?.role, 'users:manage');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canAccess) {
      router.replace('/dashboard');
    }
  }, [canAccess, router, session, status]);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const [membershipsResponse, customersResponse, assignmentsResponse] = await Promise.all([
        fetch(`/api/partner-portals/${portalId}/memberships`, { cache: 'no-store' }),
        fetch(`/api/partner-portals/${portalId}/customers`, { cache: 'no-store' }),
        fetch(`/api/partner-portals/${portalId}/shipments`, { cache: 'no-store' }),
      ]);

      const membershipsData = await membershipsResponse.json();
      const customersData = await customersResponse.json();
      const assignmentsData = await assignmentsResponse.json();

      if (!membershipsResponse.ok) throw new Error(membershipsData.error || 'Failed to load memberships');
      if (!customersResponse.ok) throw new Error(customersData.error || 'Failed to load customers');
      if (!assignmentsResponse.ok) throw new Error(assignmentsData.error || 'Failed to load assignments');

      setPortal(membershipsData.portal);
      setMemberships(membershipsData.memberships || []);
      setMemberRoleDrafts(
        Object.fromEntries(
          (membershipsData.memberships || []).map((membership: PortalMembership) => [membership.id, membership.role])
        )
      );
      setCustomers(customersData.customers || []);
      setAssignments(assignmentsData.assignments || []);

      const activityResponse = await fetch(`/api/partner-portals/${portalId}/activity?limit=10`, { cache: 'no-store' });
      const activityData = await activityResponse.json();
      if (activityResponse.ok) {
        setActivities(activityData.activities || []);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load portal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && canAccess) {
      void fetchPortalData();
    }
  }, [portalId, status, canAccess]);

  useEffect(() => {
    if (!canAccess || !openAddMemberDialog) {
      setUsers([]);
      return;
    }

    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        const query = new URLSearchParams({ page: '1', pageSize: '20' });
        if (memberSearch.trim()) query.set('query', memberSearch.trim());
        const response = await fetch(`/api/users?${query.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (response.ok) {
          setUsers(data.users || []);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error(error);
        }
      }
    };

    void fetchUsers();
    return () => controller.abort();
  }, [memberSearch, canAccess, openAddMemberDialog]);

  useEffect(() => {
    if (!canAccess || shipmentSearch.trim().length < 2) {
      setShipmentResults([]);
      return;
    }

    const controller = new AbortController();
    const fetchShipments = async () => {
      try {
        const query = new URLSearchParams({ page: '1', limit: '20', search: shipmentSearch.trim() });
        const response = await fetch(`/api/shipments?${query.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (response.ok) {
          const assignedIds = new Set(assignments.map((assignment) => assignment.shipment.id));
          setShipmentResults((data.shipments || []).filter((shipment: ShipmentOption) => !assignedIds.has(shipment.id)));
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error(error);
        }
      }
    };

    void fetchShipments();
    return () => controller.abort();
  }, [shipmentSearch, canAccess, assignments]);

  const membershipColumns = useMemo<Column<PortalMembership>[]>(() => [
    {
      key: 'user',
      header: 'Member',
      render: (_, row) => row.user.name || row.user.email,
    },
    {
      key: 'email',
      header: 'Email',
      render: (_, row) => row.user.email,
    },
    {
      key: 'role',
      header: 'Portal Role',
      render: (_, row) => (
        <div style={{minWidth: '140px'}}><BareSelect options={[{ value: "ADMIN", label: 'ADMIN' }, { value: "STAFF", label: 'STAFF' }]} value={memberRoleDrafts[row.id] || row.role} size="small" onChange={(event) => setMemberRoleDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))} /></div>
      ),
    },
    {
      key: 'appRole',
      header: 'App Role',
      render: (_, row) => row.user.role,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleUpdateMembershipRole(row)}
            disabled={savingMembershipRoleId === row.id || (memberRoleDrafts[row.id] || row.role) === row.role}
          >
            {savingMembershipRoleId === row.id ? 'Saving...' : 'Save Role'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRegenerateLoginCode(row)}
            disabled={regeneratingLoginCodeMembershipId === row.id || (row.user.role !== 'user' && row.role !== 'ADMIN')}
          >
            {regeneratingLoginCodeMembershipId === row.id ? 'Generating...' : 'Generate Code'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPendingRemoveMembership(row)} disabled={removingMembershipId === row.id}>
            {removingMembershipId === row.id ? 'Removing...' : 'Remove'}
          </Button>
        </JXBox>
      ),
    },
  ], [memberRoleDrafts, regeneratingLoginCodeMembershipId, removingMembershipId, savingMembershipRoleId]);

  const assignmentColumns = useMemo<Column<ShipmentAssignment>[]>(() => [
    {
      key: 'vehicle',
      header: 'Shipment',
      render: (_, row) => [row.shipment.vehicleYear, row.shipment.vehicleMake, row.shipment.vehicleModel].filter(Boolean).join(' ') || row.shipment.vehicleType,
    },
    {
      key: 'vin',
      header: 'VIN',
      render: (_, row) => row.shipment.vehicleVIN || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => row.shipment.status,
    },
    {
      key: 'customer',
      header: 'Portal Customer',
      render: (_, row) => row.partnerCustomer?.name || 'Unassigned',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.shipment.id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setPendingUnassignShipment(row)} disabled={savingShipmentId === row.shipment.id}>
            {savingShipmentId === row.shipment.id ? 'Removing...' : 'Unassign'}
          </Button>
        </JXBox>
      ),
    },
  ], [portalId, savingShipmentId]);

  const customerColumns = useMemo<Column<PortalCustomer>[]>(() => [
    { key: 'name', header: 'Customer', sortable: true },
    {
      key: 'email',
      header: 'Email',
      render: (_, row) => row.email || '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (_, row) => row.phone || '—',
    },
    {
      key: 'count',
      header: 'Assigned Shipments',
      render: (_, row) => row._count?.shipmentAssignments || 0,
    },
  ], []);

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error('Select a user first');
      return;
    }

    try {
      setSavingMember(true);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, role: memberRole }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save portal member');
      }

      toast.success('Portal member saved');
      setSelectedUser(null);
      setMemberSearch('');
      setOpenAddMemberDialog(false);
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save portal member');
    } finally {
      setSavingMember(false);
    }
  };

  const handleUpdateMembershipRole = async (membership: PortalMembership) => {
    const nextRole = memberRoleDrafts[membership.id] || membership.role;

    if (nextRole === membership.role) {
      return;
    }

    try {
      setSavingMembershipRoleId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: membership.user.id,
          role: nextRole,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update portal role');
      }

      toast.success('Portal role updated');
      await fetchPortalData();
    } catch (error) {
      setMemberRoleDrafts((prev) => ({ ...prev, [membership.id]: membership.role }));
      toast.error(error instanceof Error ? error.message : 'Failed to update portal role');
    } finally {
      setSavingMembershipRoleId(null);
    }
  };

  const handleRemoveMembership = async (membershipId: string) => {
    try {
      setRemovingMembershipId(membershipId);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membershipId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove portal member');
      }

      toast.success('Portal member removed');
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove portal member');
    } finally {
      setRemovingMembershipId(null);
    }
  };

  const handleRegenerateLoginCode = async (membership: PortalMembership) => {
    try {
      setRegeneratingLoginCodeMembershipId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membership.id}/login-code`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate login code');
      }

      setLoginCodeResult({
        loginCode: data.loginCode,
        simpleLoginUrl: data.simpleLoginUrl,
        portalUrl: data.portalUrl,
        email: data.user.email,
        name: data.user.name,
      });
      toast.success('Login code regenerated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate login code');
    } finally {
      setRegeneratingLoginCodeMembershipId(null);
    }
  };

  const handleAssignShipment = async (shipmentId: string) => {
    try {
      setSavingShipmentId(shipmentId);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign shipment');
      }

      toast.success('Shipment assigned to portal');
      setShipmentSearch('');
      setShipmentResults([]);
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign shipment');
    } finally {
      setSavingShipmentId(null);
    }
  };

  const handleUnassignShipment = async (shipmentId: string) => {
    try {
      setSavingShipmentId(shipmentId);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments/${shipmentId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unassign shipment');
      }

      toast.success('Shipment removed from portal');
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unassign shipment');
    } finally {
      setSavingShipmentId(null);
    }
  };

  const handleDeletePortal = async () => {
    if (deleteConfirmText !== portal?.name) {
      toast.error('Type the portal name exactly to confirm deletion');
      return;
    }

    try {
      setDeletingPortal(true);
      const response = await fetch(`/api/partner-portals/${portalId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete portal');
      }

      const counts = data.deletedCounts || {};
      const removedParts = [
        counts.memberships ? `${counts.memberships} member${counts.memberships === 1 ? '' : 's'}` : null,
        counts.customers ? `${counts.customers} customer${counts.customers === 1 ? '' : 's'}` : null,
        counts.shipmentAssignments ? `${counts.shipmentAssignments} shipment link${counts.shipmentAssignments === 1 ? '' : 's'}` : null,
      ].filter(Boolean);

      toast.success(`Portal deleted${removedParts.length ? ` along with ${removedParts.join(', ')}` : ''}`);
      router.push('/dashboard/partner-portals');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete portal');
      setDeletingPortal(false);
    }
  };

  const handleInvitePortalUser = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    try {
      setInviting(true);
      const response = await fetch(`/api/partner-portals/${portalId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite portal user');
      }

      setInviteResult({
        loginCode: data.loginCode,
        simpleLoginUrl: data.simpleLoginUrl,
        portalUrl: data.portalUrl,
        email: data.user.email,
        name: data.user.name,
      });
      setInviteForm(initialInviteForm);
      setOpenCreatePortalUserDialog(false);
      toast.success('Portal user ready');
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite portal user');
    } finally {
      setInviting(false);
    }
  };

  if (status === 'loading' || !session || !canAccess) {
    return null;
  }

  return (
    <DashboardSurface>
      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px'}}>
        <Breadcrumbs />
      </JXBox>

      <DashboardPanel
        title={portal ? portal.name : 'Portal'}
        description={portal?.code ? `Portal code: ${portal.code}` : 'Partner portal detail'}
        actions={
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            <a
              href={publicSiteHref}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Button variant="outline" size="sm">Open Portal Website</Button>
            </a>
            <Link href="/dashboard/partner-portals" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Back to Portals</Button>
            </Link>
          </JXBox>
        }
      >
        {loading ? (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)'}}>Loading portal details...</JXBox>
        ) : (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '24px'}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, borderBottom: 1, borderColor: 'var(--border)'}}>
              <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
                <button
                  key={"shipments"}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "shipments"}
                  onClick={() => { const value = "shipments"; setActiveTab(value); }}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "shipments" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {`Shipments (${assignments.length})`}
                </button>
                <button
                  key={"members"}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "members"}
                  onClick={() => { const value = "members"; setActiveTab(value); }}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "members" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {`Members (${memberships.length})`}
                </button>
                <button
                  key={"activity"}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "activity"}
                  onClick={() => { const value = "activity"; setActiveTab(value); }}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "activity" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {`Activity (${activities.length})`}
                </button>
                <button
                  key={"branding"}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "branding"}
                  onClick={() => { const value = "branding"; setActiveTab(value); }}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "branding" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {"Branding"}
                </button>
                <button
                  key={"customers"}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "customers"}
                  onClick={() => { const value = "customers"; setActiveTab(value); }}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "customers" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {`Customers (${customers.length})`}
                </button>
                <button
                  key={"danger"}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "danger"}
                  onClick={() => { const value = "danger"; setActiveTab(value); }}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === "danger" ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  {"Danger Zone"}
                </button>
              
              </div>
            </JXBox>

            {activeTab === 'shipments' ? (
              <DashboardPanel title="Assigned Shipments" description="Shipments visible to this partner workspace">
                {assignments.length === 0 ? (
                  <EmptyState icon={<Inventory2OutlinedIcon />} title="No assigned shipments" description="Search below and assign the first shipment into this portal." />
                ) : (
                  <DataTable data={assignments} columns={assignmentColumns} keyField="id" />
                )}

                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px', display: 'grid', gap: '16px'}}>
                  <p className="text-sm leading-relaxed" style={{fontWeight: 700}}>Assign Shipment</p>
                  <FormField label="Search shipments by vehicle or VIN" value={shipmentSearch} onChange={(event) => setShipmentSearch(event.target.value)} />
                  {shipmentResults.length > 0 ? (
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '8px'}}>
                      {shipmentResults.map((shipment) => (
                        <JXBox padding="none" border={false} key={shipment.id} style={{backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '16px', paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'}}>
                          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                            <p className="text-sm leading-relaxed" style={{fontWeight: 600}}>
                              {[shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType}
                            </p>
                            <p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                              {shipment.vehicleVIN || 'No VIN'} • {shipment.status} • {shipment.user?.name || shipment.user?.email || 'No owner'}
                            </p>
                          </JXBox>
                          <Button variant="outline" size="sm" onClick={() => void handleAssignShipment(shipment.id)} disabled={savingShipmentId === shipment.id}>
                            {savingShipmentId === shipment.id ? 'Assigning...' : 'Assign'}
                          </Button>
                        </JXBox>
                      ))}
                    </JXBox>
                  ) : shipmentSearch.trim().length >= 2 ? (
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)'}}>No unassigned search results found.</JXBox>
                  ) : null}
                </JXBox>
              </DashboardPanel>
            ) : null}

            {activeTab === 'members' ? (
              <DashboardPanel
                title="Portal Members"
                description="Users who can enter this workspace"
                actions={
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(null);
                        setMemberSearch('');
                        setOpenAddMemberDialog(true);
                      }}
                    >
                      Add Existing User
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setInviteForm(initialInviteForm);
                        setOpenCreatePortalUserDialog(true);
                      }}
                    >
                      Create Portal User
                    </Button>
                  </JXBox>
                }
              >
                {memberships.length === 0 ? (
                  <EmptyState icon={<PeopleOutlineIcon />} title="No members" description="Use the member actions to add the first portal user." />
                ) : (
                  <DataTable data={memberships} columns={membershipColumns} keyField="id" />
                )}

                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px', display: 'grid', gap: '16px'}} className="grid-cols-1 lg:grid-cols-2">
                  <JXBox padding="none" border={false} style={{border: '1px solid var(--border)', borderRadius: '20px', padding: '18px', display: 'grid', gap: '10px', backgroundColor: 'rgba(255,255,255,0.7)'}}>
                    <p className="text-sm leading-relaxed" style={{fontSize: '1rem', fontWeight: 700}}>Add Existing User</p>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.88rem', color: 'var(--text-secondary)'}}>
                      Link an existing account to this portal and assign the correct workspace role.
                    </p>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-start'}}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(null);
                          setMemberSearch('');
                          setOpenAddMemberDialog(true);
                        }}
                      >
                        Add Member
                      </Button>
                    </JXBox>
                  </JXBox>

                  <JXBox padding="none" border={false} style={{border: '1px solid rgba(var(--accent-gold-rgb), 0.24)', borderRadius: '20px', padding: '18px', display: 'grid', gap: '10px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)'}}>
                    <p className="text-sm leading-relaxed" style={{fontSize: '1rem', fontWeight: 700}}>Create New Portal User</p>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.88rem', color: 'var(--text-secondary)'}}>
                      Create a new portal-ready user, then issue an access code and sign-in link immediately.
                    </p>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-start'}}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setInviteForm(initialInviteForm);
                          setOpenCreatePortalUserDialog(true);
                        }}
                      >
                        Create User
                      </Button>
                    </JXBox>
                  </JXBox>
                </JXBox>

                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px', display: 'grid', gap: '16px'}}>
                  {inviteResult ? renderAccessResult(inviteResult, 'Portal user created') : null}
                  {loginCodeResult ? renderAccessResult(loginCodeResult, 'Portal login code refreshed') : null}
                </JXBox>
              </DashboardPanel>
            ) : null}

            {activeTab === 'activity' ? (
              <DashboardPanel title="Portal Activity" description="Recent membership and access-code changes for this portal">
                <PortalActivityList
                  activities={activities}
                  emptyTitle="No portal activity yet"
                  emptyDescription="Role changes, member invites, removals, and login-code refreshes will appear here."
                />
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end', marginTop: '16px'}}>
                  <Link href={`/dashboard/partner-portals/${portalId}/activity`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">View All Activity</Button>
                  </Link>
                </JXBox>
              </DashboardPanel>
            ) : null}

            {activeTab === 'branding' ? (
              <PortalBrandingSettingsPanel
                portalId={portalId}
                portal={portal}
                canEdit={true}
                onSaved={(nextPortal) => setPortal((prev) => prev ? ({ ...prev, ...nextPortal }) : ({
                  id: nextPortal.id,
                  name: nextPortal.name,
                  code: nextPortal.code,
                  companyLabel: nextPortal.companyLabel || null,
                  accentColor: nextPortal.accentColor || null,
                  logoUrl: nextPortal.logoUrl || null,
                  isActive: nextPortal.isActive ?? true,
                  notes: nextPortal.notes || null,
                }))}
              />
            ) : null}

            {activeTab === 'customers' ? (
              <DashboardPanel title="Portal Customers" description="Customers created inside this partner workspace">
                {customers.length === 0 ? (
                  <EmptyState icon={<PersonOutlineIcon />} title="No portal customers" description="The partner can create their own customers from the portal workspace." />
                ) : (
                  <DataTable data={customers} columns={customerColumns} keyField="id" />
                )}
              </DashboardPanel>
            ) : null}

            {activeTab === 'danger' ? (
              <DashboardPanel title="Danger Zone" description="Irreversible actions for this partner portal">
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}}>
                  <JXBox padding="none" border={false} style={{border: '1px solid rgba(var(--error-rgb, 239, 68, 68), 0.35)', borderRadius: '20px', padding: '16px', display: 'grid', gap: '10px', backgroundColor: 'rgba(239, 68, 68, 0.05)'}}>
                    <p className="text-sm leading-relaxed" style={{fontWeight: 700, color: 'var(--error, #ef4444)'}}>
                      Delete this portal permanently
                    </p>
                    <p className="text-sm leading-relaxed" style={{fontSize: '0.88rem', color: 'var(--text-secondary)'}}>
                      Deleting <strong>{portal?.name || 'this portal'}</strong> permanently removes the workspace along with
                      {' '}{memberships.length} member{memberships.length === 1 ? '' : 's'},
                      {' '}{customers.length} customer{customers.length === 1 ? '' : 's'}, and
                      {' '}{assignments.length} shipment link{assignments.length === 1 ? '' : 's'}.
                      The shipments themselves stay in the main system — only the portal assignments, portal customers, member access, and portal finance records are deleted. This cannot be undone.
                    </p>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'}}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDeleteConfirmText('');
                          setOpenDeleteDialog(true);
                        }}
                      >
                        Delete Portal
                      </Button>
                    </JXBox>
                  </JXBox>
                </JXBox>
              </DashboardPanel>
            ) : null}

            <Modal
              open={openAddMemberDialog}
              onClose={() => {
                if (!savingMember) {
                  setOpenAddMemberDialog(false);
                  setSelectedUser(null);
                  setMemberSearch('');
                }
              }}
              title="Add Existing User To Portal"
              size="sm"
              contentSx={{paddingTop: '12px', display: 'grid', gap: '16px'}}
              actionsSx={{paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px'}}
              actions={<>

                <Button
                  variant="outline"
                  onClick={() => {
                    setOpenAddMemberDialog(false);
                    setSelectedUser(null);
                    setMemberSearch('');
                  }}
                  disabled={savingMember}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void handleAddMember()} disabled={savingMember}>
                  {savingMember ? 'Saving...' : 'Add Member'}
                </Button>
              </>}
            >

                <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                  Search for an existing application user, then assign their portal role before saving access.
                </p>
                                <Autocomplete
                  options={users.map((u) => ({ id: u.id, label: u.name ? `${u.name} (${u.email})` : u.email, searchText: `${u.name || ''} ${u.email}` }))}
                  value={selectedUser?.id || null}
                  onChange={(id) => setSelectedUser(users.find((u) => u.id === id) || null)}
                  onInputChange={(v) => setMemberSearch(v)}
                  label="Search users"
                  placeholder="Search users by name or email"
                />
                <Select label="Portal Role" options={[{ value: "ADMIN", label: 'ADMIN' }, { value: "STAFF", label: 'STAFF' }]} value={memberRole} onChange={(val) => setMemberRole(val as string)} />
            </Modal>

            <Modal
              open={openCreatePortalUserDialog}
              onClose={() => {
                if (!inviting) {
                  setOpenCreatePortalUserDialog(false);
                  setInviteForm(initialInviteForm);
                }
              }}
              title="Create Portal User"
              size="md"
              contentSx={{paddingTop: '12px', display: 'grid', gap: '16px'}}
              actionsSx={{paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px'}}
              actions={<>

                <Button
                  variant="outline"
                  onClick={() => {
                    setOpenCreatePortalUserDialog(false);
                    setInviteForm(initialInviteForm);
                  }}
                  disabled={inviting}
                >
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void handleInvitePortalUser()} disabled={inviting}>
                  {inviting ? 'Preparing...' : 'Create User And Access Code'}
                </Button>
              </>}
            >

                <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                  Create a portal-ready user profile and generate the initial access code in one step.
                </p>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 md:grid-cols-2">
                  <FormField label="Name" value={inviteForm.name} onChange={(event) => setInviteForm((prev) => ({ ...prev, name: event.target.value }))} />
                  <FormField label="Email" value={inviteForm.email} onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))} />
                  <FormField label="Phone" value={inviteForm.phone} onChange={(event) => setInviteForm((prev) => ({ ...prev, phone: event.target.value }))} />
                  <FormField label="City" value={inviteForm.city} onChange={(event) => setInviteForm((prev) => ({ ...prev, city: event.target.value }))} />
                  <FormField label="Country" value={inviteForm.country} onChange={(event) => setInviteForm((prev) => ({ ...prev, country: event.target.value }))} />
                  <Select label="Portal Role" options={[{ value: "ADMIN", label: 'ADMIN' }, { value: "STAFF", label: 'STAFF' }]} value={inviteForm.membershipRole} onChange={(val) => setInviteForm((prev) => ({ ...prev, membershipRole: val as string }))} />
                </JXBox>
            </Modal>

            <Modal
              open={openDeleteDialog}
              onClose={() => {
                if (!deletingPortal) {
                  setOpenDeleteDialog(false);
                  setDeleteConfirmText('');
                }
              }}
              title="Delete Portal Permanently"
              size="sm"
              contentSx={{paddingTop: '12px', display: 'grid', gap: '16px'}}
              actionsSx={{paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px'}}
              actions={<>

                <Button
                  variant="outline"
                  onClick={() => {
                    setOpenDeleteDialog(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={deletingPortal}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void handleDeletePortal()}
                  disabled={deletingPortal || deleteConfirmText !== portal?.name}
                >
                  {deletingPortal ? 'Deleting...' : 'Delete Portal Forever'}
                </Button>
              </>}
            >

                <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                  This will permanently delete <strong>{portal?.name}</strong> and all of its members, customers, shipment links, and finance records. The shipments themselves remain in the main system. This action cannot be undone.
                </p>
                <div className="min-w-0 flex-1"><FormField label={`Type "${portal?.name || ''}" to confirm`} value={deleteConfirmText} onChange={(event) => setDeleteConfirmText(event.target.value)} disabled={deletingPortal} /></div>
            </Modal>

            <ConfirmDialog
              open={pendingRemoveMembership !== null}
              onClose={() => setPendingRemoveMembership(null)}
              onConfirm={() => {
                if (pendingRemoveMembership) {
                  void handleRemoveMembership(pendingRemoveMembership.id);
                }
                setPendingRemoveMembership(null);
              }}
              title="Remove portal member"
              message={`Remove ${pendingRemoveMembership?.user.name || pendingRemoveMembership?.user.email || 'this member'} from the portal? They will immediately lose access to this workspace.`}
              confirmText="Remove member"
              severity="warning"
              loading={removingMembershipId !== null}
            />

            <ConfirmDialog
              open={pendingUnassignShipment !== null}
              onClose={() => setPendingUnassignShipment(null)}
              onConfirm={() => {
                if (pendingUnassignShipment) {
                  void handleUnassignShipment(pendingUnassignShipment.shipment.id);
                }
                setPendingUnassignShipment(null);
              }}
              title="Unassign shipment"
              message={`Remove ${[pendingUnassignShipment?.shipment.vehicleYear, pendingUnassignShipment?.shipment.vehicleMake, pendingUnassignShipment?.shipment.vehicleModel].filter(Boolean).join(' ') || 'this shipment'} from the portal? The partner will no longer see it, but the shipment stays in the main system.`}
              confirmText="Unassign"
              severity="warning"
              loading={savingShipmentId !== null}
            />
          </JXBox>
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}