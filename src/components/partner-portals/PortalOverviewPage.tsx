'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardGrid, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, Skeleton, SkeletonParagraph, toast } from '@/components/design-system';
import { formatRelativeTime } from '@/lib/relative-time';
import { LayoutDashboard as DashboardOutlinedIcon, Package as Inventory2OutlinedIcon, ClipboardCheck as AssignmentTurnedInOutlinedIcon, Users as GroupOutlinedIcon, History as HistoryOutlinedIcon, UserPlus as PersonAddAltOutlinedIcon, Eye as VisibilityOutlinedIcon } from 'lucide-react';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
};

type ShipmentAssignment = {
  id: string;
  assignedAt?: string;
  notes: string | null;
  partnerCustomer: { id: string; name: string } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    status: string;
    serviceType: string;
  };
};

type PortalCustomer = {
  id: string;
  name: string;
  email?: string | null;
  _count?: {
    shipmentAssignments?: number;
  };
};

type PortalMembership = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
};

type PortalActivity = {
  id: string;
  action: string;
  performedAt: string;
  summary: string;
  actor?: { name: string | null; email: string | null };
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data as T;
}

function formatVehicleLabel(shipment: ShipmentAssignment['shipment']) {
  return [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType;
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  tone = 'brand',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper: string;
  tone?: 'brand' | 'accent' | 'neutral' | 'warm';
}) {
  const backgrounds = {
    brand: 'linear-gradient(135deg, rgba(var(--brand-primary-rgb),0.16), rgba(var(--brand-primary-rgb),0.06))',
    accent: 'linear-gradient(135deg, rgba(var(--accent-rgb),0.16), rgba(var(--accent-rgb),0.06))',
    neutral: 'linear-gradient(135deg, rgba(15,23,42,0.08), rgba(15,23,42,0.03))',
    warm: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))',
  } as const;

  return (
    <div
      style={{ border: '1px solid var(--border)', borderRadius: 24, padding: 14, background: backgrounds[tone], display: 'grid', gap: 6.8, alignContent: 'start' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          {label}
        </p>
        <div style={{ color: 'var(--text-secondary)', display: 'inline-flex', flexShrink: 0 }}>{icon}</div>
      </div>
      <p style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{value}</p>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>{helper}</p>
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <div
      style={{ border: '1px solid var(--border)', borderRadius: 24, padding: 14, backgroundColor: 'var(--panel)', display: 'grid', gap: 6.8, alignContent: 'start' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Skeleton variant="text" width="55%" height={16} />
        <Skeleton variant="rounded" width={22} height={22} />
      </div>
      <Skeleton variant="text" width="35%" height={34} />
      <Skeleton variant="text" width="85%" height={14} />
    </div>
  );
}

export default function PortalOverviewPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [assignments, setAssignments] = useState<ShipmentAssignment[]>([]);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [activities, setActivities] = useState<PortalActivity[]>([]);
  const [canViewActivity, setCanViewActivity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partialLoadWarning, setPartialLoadWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      try {
        setLoading(true);

        const [shipmentsResult, customersResult, membershipsResult, activityResult] = await Promise.allSettled([
          readJson<{ portal: PortalInfo; assignments: ShipmentAssignment[] }>(`/api/partner-portals/${portalId}/shipments`),
          readJson<{ portal: PortalInfo; customers: PortalCustomer[] }>(`/api/partner-portals/${portalId}/customers`),
          readJson<{ portal: PortalInfo; memberships: PortalMembership[] }>(`/api/partner-portals/${portalId}/memberships`),
          readJson<{ portal: PortalInfo; activities: PortalActivity[] }>(`/api/partner-portals/${portalId}/activity?limit=5`),
        ]);

        if (shipmentsResult.status === 'rejected') {
          throw shipmentsResult.reason;
        }

        if (customersResult.status === 'rejected') {
          throw customersResult.reason;
        }

        if (membershipsResult.status === 'rejected') {
          throw membershipsResult.reason;
        }

        if (cancelled) {
          return;
        }

        setPortal(shipmentsResult.value.portal || customersResult.value.portal || membershipsResult.value.portal);
        setAssignments(shipmentsResult.value.assignments || []);
        setCustomers(customersResult.value.customers || []);
        setMemberships(membershipsResult.value.memberships || []);

        if (activityResult.status === 'fulfilled') {
          setActivities(activityResult.value.activities || []);
          setCanViewActivity(true);
        } else {
          setActivities([]);
          // Distinguish "no permission" from a real failure so admins are not
          // shown the admin-only copy when the activity API actually failed.
          const activityError = activityResult.reason as Error & { status?: number };
          if (activityError?.status === 403) {
            setCanViewActivity(false);
            setPartialLoadWarning(null);
          } else {
            setCanViewActivity(true);
            setPartialLoadWarning('Recent activity could not be loaded. It may be temporarily unavailable.');
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load portal overview');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };    if (portalId) {
      void loadOverview();
    }

    return () => {
      cancelled = true;
    };
  }, [portalId]);

  const linkedShipments = assignments.filter((assignment) => assignment.partnerCustomer).length;
  const adminCount = memberships.filter((membership) => membership.role === 'ADMIN').length;
  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();

    assignments.forEach((assignment) => {
      counts.set(assignment.shipment.status, (counts.get(assignment.shipment.status) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [assignments]);

  const customerCoverage = useMemo(() => {
    const counts = new Map<string, number>();

    assignments.forEach((assignment) => {
      if (!assignment.partnerCustomer?.name) {
        return;
      }

      counts.set(assignment.partnerCustomer.name, (counts.get(assignment.partnerCustomer.name) || 0) + 1);
    });

    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]).slice(0, 5);
  }, [assignments]);

  const recentAssignments = assignments.slice(0, 5);

  return (
    <DashboardSurface>
      <div
        className="flex flex-col items-start md:flex-row md:items-center" style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
      >
        <div style={{ display: 'grid', gap: 2.8 }}>
          <p style={{ fontSize: '0.75rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Overview
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            {loading
              ? 'Loading portal workspace data.'
              : `${portal?.name || 'Portal'} workspace: ${assignments.length} shipments, ${customers.length} customers, ${memberships.length} members, ${adminCount} admin${adminCount === 1 ? '' : 's'}.`}
          </p>
        </div>
      </div>

      {loading ? (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </DashboardGrid>
          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
            <DashboardPanel title="Operational Snapshot" description="See what is moving through this partner workspace right now.">
              <div style={{ display: 'grid', gap: 14 }}>
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} style={{ display: 'grid', gap: 5.2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Skeleton variant="text" width="40%" height={18} />
                      <Skeleton variant="text" width="8%" height={16} />
                    </div>
                    <Skeleton variant="rounded" height={10} />
                  </div>
                ))}
              </div>
            </DashboardPanel>
            <DashboardPanel title="Customer Coverage" description="Track how much of the portal workload is already linked to end customers.">
              <div style={{ display: 'grid', gap: 12 }}>
                <Skeleton variant="rounded" height={92} />
                <SkeletonParagraph lines={3} />
              </div>
            </DashboardPanel>
          </DashboardGrid>
          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <DashboardPanel title="Recent Shipment Activity" description="The latest vehicles currently visible in this partner workspace.">
              <div style={{ display: 'grid', gap: 12 }}>
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} variant="rounded" height={96} />
                ))}
              </div>
            </DashboardPanel>
            <DashboardPanel title="Team And Activity" description="Who has access to this workspace and what has changed recently.">
              <div style={{ display: 'grid', gap: 12 }}>
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1, display: 'grid', gap: 4 }}>
                      <Skeleton variant="text" width="55%" height={16} />
                      <Skeleton variant="text" width="75%" height={13} />
                    </div>
                    <Skeleton variant="rounded" width={64} height={24} />
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </DashboardGrid>
        </>
      ) : assignments.length === 0 && customers.length === 0 && memberships.length === 0 ? (
        <DashboardPanel>
          <div style={{ display: 'grid', gap: 20 }}>
            <EmptyState
              icon={<DashboardOutlinedIcon />}
              title="Portal workspace is still empty"
              description="This portal is active, but it does not have shipments, customers, or members loaded yet."
            />
            <div
              style={{ border: '1px solid var(--border)', borderRadius: 20, padding: 16, backgroundColor: 'var(--panel)', display: 'grid', gap: 10 }}
            >
              <p style={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Getting started
              </p>
              {[
                { step: 1, label: 'Invite your team members', href: `/portal/${portalId}/members`, done: memberships.length > 0, description: 'Give teammates their own portal login.' },
                { step: 2, label: 'Add your portal customers', href: `/portal/${portalId}/customers`, done: customers.length > 0, description: 'Create the downstream customer records shipments roll up under.' },
                { step: 3, label: 'Link assigned shipments', href: `/portal/${portalId}/shipments`, done: assignments.length > 0, description: 'Map the shipments shared from the main system to your customers.' },
              ].map((item) => (
                <div
                  key={item.step}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, border: '1px solid var(--border)', backgroundColor: item.done ? 'rgba(34,197,94,0.06)' : 'transparent' }}
                >
                  <div
                    aria-hidden
                    style={{ width: 28, height: 28, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, backgroundColor: item.done ? 'var(--success)' : 'rgba(var(--text-primary-rgb),0.08)', color: item.done ? '#fff' : 'var(--text-secondary)', fontWeight: 800, fontSize: '0.8rem' }}
                  >
                    {item.done ? '✓' : item.step}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>{item.label}</p>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.description}</p>
                  </div>
                  <Link href={item.href} style={{ textDecoration: 'none' }}>
                    <Button variant={item.done ? 'outline' : 'primary'} size="sm">
                      {item.done ? 'Review' : 'Start'}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </DashboardPanel>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Inventory2OutlinedIcon size={20} />}
              label="Assigned Shipments"
              value={assignments.length}
              helper="Visible to this partner from the main system"
              tone="brand"
            />
            <MetricCard
              icon={<AssignmentTurnedInOutlinedIcon size={20} />}
              label="Linked To Customers"
              value={linkedShipments}
              helper={`${assignments.length - linkedShipments} shipment${assignments.length - linkedShipments === 1 ? '' : 's'} still unlinked`}
              tone="accent"
            />
            <MetricCard
              icon={<GroupOutlinedIcon size={20} />}
              label="Workspace Members"
              value={memberships.length}
              helper="Shared access inside this portal workspace"
              tone="neutral"
            />
            <MetricCard
              icon={<PersonAddAltOutlinedIcon size={20} />}
              label="Portal Customers"
              value={customers.length}
              helper="Partner-managed downstream customer records"
              tone="warm"
            />
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
            <DashboardPanel
              title="Operational Snapshot"
              description="See what is moving through this partner workspace right now."
              actions={
                <Link href={`/portal/${portalId}/shipments`} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">View all shipments</Button>
                </Link>
              }
            >
              {statusBreakdown.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>No shipment movement has been assigned to this portal yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {statusBreakdown.map(([status, count]) => {
                    const ratio = assignments.length > 0 ? Math.max(8, Math.round((count / assignments.length) * 100)) : 0;
                    return (
                      <div key={status} style={{ display: 'grid', gap: 5.2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatStatusLabel(status)}</p>
                          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{count}</p>
                        </div>
                        <div style={{ width: '100%', height: 10, borderRadius: 7992, backgroundColor: 'rgba(var(--text-primary-rgb),0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${ratio}%`, height: '100%', backgroundColor: 'var(--brand-primary)', borderRadius: 7992 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Customer Coverage"
              description="Track how much of the portal workload is already linked to end customers."
              actions={
                <Link href={`/portal/${portalId}/customers`} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">Open customers</Button>
                </Link>
              }
            >
              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ padding: 12, borderRadius: 20, backgroundColor: 'rgba(var(--brand-primary-rgb),0.07)' }}>
                  <p style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Assignment coverage
                  </p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 800 }}>{assignments.length === 0 ? '0%' : `${Math.round((linkedShipments / assignments.length) * 100)}%`}</p>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {linkedShipments} of {assignments.length} shipments are already tied to a portal customer.
                  </p>
                </div>

                {customerCoverage.length === 0 ? (
                  <div style={{ color: 'var(--text-secondary)' }}>No portal customer links have been made yet.</div>
                ) : (
                  customerCoverage.map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{name}</p>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{count} shipment{count === 1 ? '' : 's'}</p>
                    </div>
                  ))
                )}
              </div>
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <DashboardPanel
              title="Recent Shipment Activity"
              description="The latest vehicles currently visible in this partner workspace."
            >
              {recentAssignments.length === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>No shipments are available to show yet.</div>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {recentAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      style={{ border: '1px solid var(--border)', borderRadius: 20, padding: 12, display: 'grid', gap: 4, backgroundColor: 'var(--panel)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>{formatVehicleLabel(assignment.shipment)}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatStatusLabel(assignment.shipment.status)}</p>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {assignment.partnerCustomer?.name ? `Linked to ${assignment.partnerCustomer.name}` : 'Not linked to a portal customer yet'}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{assignment.shipment.serviceType.replaceAll('_', ' ')}</p>
                        <Link href={`/portal/${portalId}/shipments/${assignment.shipment.id}`} style={{ textDecoration: 'none' }}>
                          <Button variant="outline" size="sm">
                            <VisibilityOutlinedIcon size={16} />
                            View details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Team And Activity"
              description="Who has access to this workspace and what has changed recently."
              actions={
                <Link href={`/portal/${portalId}/members`} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">Manage members</Button>
                </Link>
              }
            >
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  {memberships.slice(0, 4).map((membership) => (
                    <div key={membership.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
                      <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>{membership.user.name || membership.user.email || 'Portal member'}</p>
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{membership.user.email || 'No email'}</p>
                      </div>
                      <div style={{ paddingLeft: 9.6, paddingRight: 9.6, paddingTop: 3.6, paddingBottom: 3.6, borderRadius: 7992, backgroundColor: membership.role === 'ADMIN' ? 'rgba(var(--brand-primary-rgb),0.12)' : 'rgba(var(--text-primary-rgb),0.06)', color: membership.role === 'ADMIN' ? 'var(--brand-primary)' : 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {membership.role}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'grid', gap: 10 }}>
                  <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
                    Recent activity
                  </p>
                  {!canViewActivity ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Activity is available to portal admins so member changes and login access events stay controlled.
                    </div>
                  ) : partialLoadWarning ? (
                    <div
                      style={{ border: '1px solid rgba(var(--accent-gold-rgb),0.35)', borderRadius: 16, padding: 10, backgroundColor: 'rgba(var(--accent-gold-rgb),0.08)', fontSize: '0.85rem', color: 'var(--text-primary)' }}
                    >
                      {partialLoadWarning}
                    </div>
                  ) : activities.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No recent membership activity was recorded for this portal.</div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} style={{ display: 'grid', gap: 2 }}>
                        <p style={{ fontSize: '0.88rem', fontWeight: 600 }}>{activity.summary}</p>
                        <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {formatRelativeTime(activity.performedAt)}
                        </p>
                      </div>
                    ))
                  )}

                  {canViewActivity ? (
                    <Link href={`/portal/${portalId}/activity`} style={{ textDecoration: 'none' }}>
                      <Button variant="outline" size="sm">
                        <HistoryOutlinedIcon size={16} />
                        View all activity
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>
        </>
      )}
    </DashboardSurface>
  );
}
