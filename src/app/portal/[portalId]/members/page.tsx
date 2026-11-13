'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashboardSurface, DashboardPanel, DashboardGrid, DashboardHeader } from '@/components/dashboard/DashboardSurface';
import { Button, ConfirmDialog, EmptyState, FormField, Modal, Select, Skeleton, SkeletonTable, toast } from '@/components/design-system';
import { PortalActivityList } from '@/components/partner-portals/PortalActivityList';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Package as Inventory2OutlinedIcon, Users as PeopleOutlineIcon, Droplet as BrandingWatermarkOutlinedIcon, IdCard as BadgeOutlinedIcon, ShieldCheck as AdminPanelSettingsOutlinedIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
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

const initialInviteForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  country: '',
  membershipRole: 'STAFF',
};

export default function PortalMembersPage() {
  const params = useParams();
  const { data: session } = useSession();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, string>>({});
  const [savingMembershipRoleId, setSavingMembershipRoleId] = useState<string | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<string | null>(null);
  const [pendingRemoveMembership, setPendingRemoveMembership] = useState<PortalMembership | null>(null);
  const [regeneratingLoginCodeMembershipId, setRegeneratingLoginCodeMembershipId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState(initialInviteForm);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [loginCodeResult, setLoginCodeResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [activities, setActivities] = useState<PortalActivity[]>([]);
  const [openCreatePortalUserDialog, setOpenCreatePortalUserDialog] = useState(false);

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.user.id === session?.user?.id) || null,
    [memberships, session?.user?.id],
  );
  const canManageMembers = currentMembership?.role === 'ADMIN';
  const adminCount = memberships.filter((membership) => membership.role === 'ADMIN').length;
  const customerAppUsers = memberships.filter((membership) => membership.user.role === 'user').length;

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load portal members');
      }

      setPortal(data.portal);
      setMemberships(data.memberships || []);
      setMemberRoleDrafts(
        Object.fromEntries((data.memberships || []).map((membership: PortalMembership) => [membership.id, membership.role]))
      );

      const activityResponse = await fetch(`/api/partner-portals/${portalId}/activity?limit=10`, { cache: 'no-store' });
      const activityData = await activityResponse.json();
      if (activityResponse.ok) {
        setActivities(activityData.activities || []);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load portal members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMemberships();
  }, [portalId]);

  const handleCopyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const renderAccessResult = (
    result: { loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null },
    title: string,
  ) => (
    <div style={{ border: '1px solid rgba(var(--accent-gold-rgb), 0.28)', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)', borderRadius: 16, padding: 16, display: 'grid', gap: 6 }}>
      <p style={{ fontWeight: 700 }}>{title}</p>
      <p style={{ color: 'var(--text-secondary)' }}>
        Share the sign-in page and code with this user. The workspace route is where they land after sign-in.
      </p>
      <p><strong>Name:</strong> {result.name || result.email}</p>
      <p><strong>Email:</strong> {result.email}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <p><strong>Login Code:</strong> {result.loginCode}</p>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.loginCode, 'Login code')}>Copy</Button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <p><strong>Sign-In Page:</strong> {result.simpleLoginUrl}</p>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.simpleLoginUrl, 'Sign-in page')}>Copy</Button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <p><strong>Workspace Route:</strong> {result.portalUrl}</p>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.portalUrl, 'Workspace route')}>Copy</Button>
      </div>
    </div>
  );

  const handleUpdateMembershipRole = async (membership: PortalMembership) => {
    const nextRole = memberRoleDrafts[membership.id] || membership.role;

    if (!canManageMembers || nextRole === membership.role) {
      return;
    }

    try {
      setSavingMembershipRoleId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: membership.user.id, role: nextRole }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update portal role');
      }

      toast.success('Portal role updated');
      await fetchMemberships();
    } catch (error) {
      setMemberRoleDrafts((prev) => ({ ...prev, [membership.id]: membership.role }));
      toast.error(error instanceof Error ? error.message : 'Failed to update portal role');
    } finally {
      setSavingMembershipRoleId(null);
    }
  };

  const handleRemoveMembership = async (membershipId: string) => {
    if (!canManageMembers) {
      return;
    }

    try {
      setRemovingMembershipId(membershipId);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membershipId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove portal member');
      }

      toast.success('Portal member removed');
      await fetchMemberships();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove portal member');
    } finally {
      setRemovingMembershipId(null);
    }
  };

  const handleRegenerateLoginCode = async (membership: PortalMembership) => {
    if (!canManageMembers) {
      return;
    }

    try {
      setRegeneratingLoginCodeMembershipId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membership.id}/login-code`, { method: 'POST' });
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

  const handleInvitePortalUser = async () => {
    if (!canManageMembers) {
      return;
    }

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
      await fetchMemberships();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite portal user');
    } finally {
      setInviting(false);
    }
  };

  const columns = useMemo<Column<PortalMembership>[]>(() => [
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
      render: (_, row) => canManageMembers ? (
        <div style={{ minWidth: 140 }} className="relative">
          <select
            value={memberRoleDrafts[row.id] || row.role}
            onChange={(event) => setMemberRoleDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))}
            aria-label="Portal role"
            className="ds-select-control w-full appearance-none rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors px-2.5 py-1.5 text-[0.8125rem] pr-9 border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]"
          >
            <option value="ADMIN">ADMIN</option>
            <option value="STAFF">STAFF</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden="true" />
        </div>
      ) : row.role,
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
      render: (_, row) => canManageMembers ? (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
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
        </div>
      ) : 'Read only',
    },
  ], [canManageMembers, memberRoleDrafts, regeneratingLoginCodeMembershipId, removingMembershipId, savingMembershipRoleId]);

  return (
    <DashboardSurface>
      <DashboardHeader
        title={portal ? `${portal.companyLabel || portal.name} Members` : 'Portal Members'}
        description={canManageMembers ? 'Manage partner access, portal roles, branding, and invitation workflows from one workspace.' : 'View the member roster for this portal workspace.'}
        meta={[
          { label: 'Members', value: memberships.length, helper: 'Users assigned to this portal' },
          { label: 'Admins', value: adminCount, helper: 'Members who can manage access' },
          { label: 'Portal Users', value: customerAppUsers, helper: 'Customer-style accounts using login codes' },
        ]}
        actions={canManageMembers ? (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
            <Link href={`/portal/${portalId}/settings`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Open Settings</Button>
            </Link>
          </div>
        ) : undefined}
      />

      {loading ? (
        <DashboardPanel title="Portal Members" description="People who can access this partner workspace.">
          <SkeletonTable rows={5} columns={4} />
        </DashboardPanel>
      ) : memberships.length === 0 ? (
        <DashboardPanel>
          <EmptyState icon={<PeopleOutlineIcon />} title="No members" description="This portal does not have any members yet." />
        </DashboardPanel>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {!canManageMembers ? (
            <DashboardPanel>
              <EmptyState icon={<Inventory2OutlinedIcon />} title="Portal admin access required" description="Only portal admins can invite members, change roles, remove members, regenerate access codes, or update branding." />
            </DashboardPanel>
          ) : null}

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.9fr]">
            <DashboardPanel title="Member Directory" description="Control who can enter the workspace and what role boundary they hold inside the portal.">
              <DataTable data={memberships} columns={columns} keyField="id" />
            </DashboardPanel>

            <DashboardPanel title="Access Snapshot" description="Keep an operational view of account ownership and recent portal changes.">
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 20, backgroundColor: 'rgba(var(--brand-primary-rgb),0.07)' }}>
                  <p style={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Admin Coverage</p>
                  <p style={{ fontSize: '1.45rem', fontWeight: 800 }}>{adminCount}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>At least one portal admin is always preserved for access continuity.</p>
                </div>
                <div style={{ display: 'grid', gap: 9.6 }}>
                  {memberships.slice(0, 4).map((membership) => (
                    <div key={membership.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: 9.6, borderRadius: 16, backgroundColor: 'rgba(var(--text-primary-rgb),0.04)' }}>
                      <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{membership.user.name || membership.user.email}</p>
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{membership.user.email}</p>
                      </div>
                      <div style={{ paddingLeft: 8.8, paddingRight: 8.8, paddingTop: 3.6, paddingBottom: 3.6, borderRadius: 7992, backgroundColor: membership.role === 'ADMIN' ? 'rgba(var(--brand-primary-rgb),0.12)' : 'rgba(var(--text-primary-rgb),0.06)', color: membership.role === 'ADMIN' ? 'var(--brand-primary)' : 'var(--text-secondary)', fontSize: '0.74rem', fontWeight: 700 }}>
                        {membership.role}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>

          {canManageMembers ? (
            <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1fr]">
              <DashboardPanel title="Member Actions" description="Launch the member creation flow from a dedicated action instead of editing fields inline.">
                <div style={{ display: 'grid', gap: 16 }}>
                  <div style={{ border: '1px solid rgba(var(--accent-gold-rgb), 0.24)', borderRadius: 20, padding: 18, display: 'grid', gap: 10, backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)' }}>
                    <p style={{ fontSize: '1rem', fontWeight: 700 }}>Create New Portal User</p>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      Create a portal-ready user profile, assign the workspace role, and issue the initial access code from a single modal.
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setInviteForm(initialInviteForm);
                          setOpenCreatePortalUserDialog(true);
                        }}
                      >
                        Add New Portal User
                      </Button>
                    </div>
                  </div>

                  {inviteResult ? renderAccessResult(inviteResult, 'Portal user created') : null}
                  {loginCodeResult ? renderAccessResult(loginCodeResult, 'Portal login code refreshed') : null}
                </div>
              </DashboardPanel>

            </DashboardGrid>
          ) : null}

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1fr_0.95fr]">
            {canManageMembers ? (
              <DashboardPanel title="Portal Activity" description="Recent membership and access-code changes for this portal">
                <PortalActivityList
                  activities={activities}
                  emptyTitle="No portal activity yet"
                  emptyDescription="Role changes, member invites, removals, and login-code refreshes will appear here."
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                  <Link href={`/portal/${portalId}/activity`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">View All Activity</Button>
                  </Link>
                </div>
              </DashboardPanel>
            ) : null}

            <DashboardPanel title="Access Guidance" description="What this page controls inside the partner workspace.">
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <BadgeOutlinedIcon style={{ color: 'var(--text-secondary)', marginTop: 2.4 }} />
                  <div>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Roles stay local to the portal</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Portal ADMIN and STAFF only affect this workspace, not the broader app.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AdminPanelSettingsOutlinedIcon style={{ color: 'var(--text-secondary)', marginTop: 2.4 }} />
                  <div>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Access codes are customer-friendly</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Portal admins can regenerate login codes for customer-style accounts without changing your main auth model.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <BrandingWatermarkOutlinedIcon style={{ color: 'var(--text-secondary)', marginTop: 2.4 }} />
                  <div>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Branding moved into settings</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Logo upload, accent color, and company label now live on the dedicated Settings page so member management stays focused.</p>
                  </div>
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>

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
            actions={
              <>
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
              </>
            }
          >
            <div style={{ paddingTop: 12, display: 'grid', gap: 16 }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Create a portal-ready user profile and generate the initial access code in one step.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2" style={{ display: 'grid', gap: 16 }}>
                <FormField label="Name" value={inviteForm.name} onChange={(event) => setInviteForm((prev) => ({ ...prev, name: event.target.value }))} />
                <FormField label="Email" value={inviteForm.email} onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))} />
                <FormField label="Phone" value={inviteForm.phone} onChange={(event) => setInviteForm((prev) => ({ ...prev, phone: event.target.value }))} />
                <FormField label="City" value={inviteForm.city} onChange={(event) => setInviteForm((prev) => ({ ...prev, city: event.target.value }))} />
                <FormField label="Country" value={inviteForm.country} onChange={(event) => setInviteForm((prev) => ({ ...prev, country: event.target.value }))} />
                <Select label="Portal Role" value={inviteForm.membershipRole} onChange={(val) => setInviteForm((prev) => ({ ...prev, membershipRole: val as string }))} options={[{ value: 'ADMIN', label: 'ADMIN' }, { value: 'STAFF', label: 'STAFF' }]} />
              </div>
            </div>
          </Modal>
        </div>
      )}

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
    </DashboardSurface>
  );
}