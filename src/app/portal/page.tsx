'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { DashboardSurface, DashboardPanel, DashboardGrid, DashboardHeader } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, toast } from '@/components/design-system';
import { Network as AccountTreeOutlinedIcon, ArrowRight as ArrowForwardOutlinedIcon, Package as Inventory2OutlinedIcon, Users as PeopleAltOutlinedIcon, Users as GroupOutlinedIcon } from 'lucide-react';

type PortalSummary = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  memberships?: Array<{ role: string }>;
  _count?: {
    customers?: number;
    shipmentAssignments?: number;
  };
};

export default function PortalHomePage() {
  const [portals, setPortals] = useState<PortalSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortals = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/partner-portals', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load portals');
        }

        setPortals(data.portals || []);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load your portals');
      } finally {
        setLoading(false);
      }
    };

    void fetchPortals();
  }, []);

  const totals = useMemo(() => {
    return portals.reduce(
      (accumulator, portal) => {
        accumulator.customers += portal._count?.customers || 0;
        accumulator.shipments += portal._count?.shipmentAssignments || 0;
        accumulator.active += portal.isActive ? 1 : 0;
        return accumulator;
      },
      { customers: 0, shipments: 0, active: 0 },
    );
  }, [portals]);

  return (
    <DashboardSurface>
      <DashboardHeader
        title="Partner Workspaces"
        description="A partner-facing slice of the main system where each workspace carries its own shipments, customers, member access, and activity trail."
        meta={[
          { label: 'Workspaces', value: portals.length, helper: 'Portal environments assigned to you' },
          { label: 'Shipments', value: totals.shipments, helper: 'Visible across all partner workspaces' },
          { label: 'Customers', value: totals.customers, helper: 'Portal-managed downstream accounts' },
        ]}
      />

      <DashboardPanel title="My Portals" description="Open a workspace to manage partner shipments, downstream customers, and member access in one place.">
        {loading ? (
          <div style={{ color: 'var(--text-secondary)' }}>Loading portals...</div>
        ) : portals.length === 0 ? (
          <EmptyState icon={<AccountTreeOutlinedIcon />} title="No portal access" description="You are signed in, but no partner portal workspace has been assigned to your account yet." />
        ) : (
          <DashboardGrid className="grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {portals.map((portal) => (
              <div
                key={portal.id}
                style={{ border: '1px solid var(--border)', background: 'linear-gradient(180deg, rgba(255,255,255,0.92), rgba(var(--brand-primary-rgb),0.05))', borderRadius: 24, padding: 24, display: 'grid', gap: 16, boxShadow: '0 16px 40px rgba(var(--text-primary-rgb),0.08)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start' }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: '1.08rem', letterSpacing: '-0.02em' }}>{portal.name}</p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {portal.code || 'No workspace code'}
                    </p>
                  </div>
                  <div style={{ paddingLeft: 9.6, paddingRight: 9.6, paddingTop: 3.6, paddingBottom: 3.6, borderRadius: 7992, backgroundColor: portal.isActive ? 'rgba(var(--brand-primary-rgb),0.12)' : 'rgba(15,23,42,0.06)', color: portal.isActive ? 'var(--brand-primary)' : 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700 }}>
                    {portal.isActive ? 'Active' : 'Inactive'}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                  <div style={{ padding: 11.2, borderRadius: 20, backgroundColor: 'rgba(var(--brand-primary-rgb),0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Shipments</p>
                      <Inventory2OutlinedIcon size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800 }}>{portal._count?.shipmentAssignments || 0}</p>
                  </div>
                  <div style={{ padding: 11.2, borderRadius: 20, backgroundColor: 'rgba(var(--accent-rgb),0.10)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Customers</p>
                      <PeopleAltOutlinedIcon size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <p style={{ fontSize: '1.25rem', fontWeight: 800 }}>{portal._count?.customers || 0}</p>
                  </div>
                  <div style={{ padding: 11.2, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Role</p>
                      <GroupOutlinedIcon size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <p style={{ fontSize: '1rem', fontWeight: 800 }}>{portal.memberships?.[0]?.role || 'Member'}</p>
                  </div>
                </div>

                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Use this workspace as the partner-facing operating layer for assigned vehicles, customer handoffs, and shared member access.
                </p>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={`/portal/${portal.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" size="sm">
                      Open Workspace
                      <ArrowForwardOutlinedIcon size={16} />
                    </Button>
                  </Link>
                  <Link href={`/portal/${portal.id}/shipments`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">Shipments</Button>
                  </Link>
                  <Link href={`/portal/${portal.id}/customers`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">Customers</Button>
                  </Link>
                </div>

                <div style={{ display: 'flex', gap: 16, color: 'var(--text-secondary)', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                  <span>{portal.isActive ? 'Workspace is live for partner operations' : 'Workspace is currently inactive'}</span>
                  <span>{portal.memberships?.[0]?.role === 'ADMIN' ? 'You can manage members and activity' : 'You have member-level access'}</span>
                </div>
              </div>
            ))}
          </DashboardGrid>
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}