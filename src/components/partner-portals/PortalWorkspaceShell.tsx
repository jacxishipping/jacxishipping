'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Button } from '@/components/design-system';
import { getPortalBrandIdentity } from '@/lib/partner-portal-branding';
import { normalizeRequestHost } from '@/lib/partner-portal-domains';
import { LayoutDashboard as SpaceDashboardOutlinedIcon, Package as Inventory2OutlinedIcon, Users as PeopleAltOutlinedIcon, Users as GroupOutlinedIcon, History as HistoryOutlinedIcon, SlidersHorizontal as TuneOutlinedIcon, Layers as LayersOutlinedIcon, Wallet as AccountBalanceWalletOutlinedIcon, ArrowLeft as ArrowBackOutlinedIcon } from 'lucide-react';

type PortalSummary = {
  id: string;
  name: string;
  code: string | null;
  customDomain?: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  memberships?: Array<{
    role: string;
    partnerCustomerId?: string | null;
    partnerCustomer?: {
      id: string;
      name: string;
    } | null;
  }>;
  _count?: {
    customers?: number;
    shipmentAssignments?: number;
  };
};

type PortalWorkspaceShellProps = {
  children: React.ReactNode;
};

const workspaceNav = [
  { label: 'Overview', icon: <SpaceDashboardOutlinedIcon size={20} />, suffix: '' },
  { label: 'Shipments', icon: <Inventory2OutlinedIcon size={20} />, suffix: '/shipments' },
  { label: 'Customers', icon: <PeopleAltOutlinedIcon size={20} />, suffix: '/customers' },
  { label: 'Finance', icon: <AccountBalanceWalletOutlinedIcon size={20} />, suffix: '/finance' },
  { label: 'Members', icon: <GroupOutlinedIcon size={20} />, suffix: '/members' },
  { label: 'Activity', icon: <HistoryOutlinedIcon size={20} />, suffix: '/activity' },
  { label: 'Settings', icon: <TuneOutlinedIcon size={20} />, suffix: '/settings' },
];

function isWorkspaceRouteActive(pathname: string, href: string) {
  if (href.endsWith('/activity')) {
    return pathname === href;
  }

  if (href.endsWith('/settings')) {
    return pathname === href;
  }

  if (href.endsWith('/members')) {
    return pathname === href;
  }

  if (href.endsWith('/customers')) {
    return pathname === href;
  }

  if (href.endsWith('/finance')) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (href.endsWith('/shipments')) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return pathname === href;
}

export default function PortalWorkspaceShell({ children }: PortalWorkspaceShellProps) {
  const params = useParams();
  const pathname = usePathname();
  const portalId = typeof params.portalId === 'string' ? params.portalId : null;
  const [portal, setPortal] = useState<PortalSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPortal = async () => {
      if (!portalId) {
        setPortal(null);
        return;
      }

      try {
        // Fetch only this portal so branding renders in one round trip
        // instead of loading the full portal list and filtering client-side.
        const response = await fetch(`/api/partner-portals/${portalId}`, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load portal workspace');
        }

        if (!cancelled) {
          setPortal(data.portal || null);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setPortal(null);
        }
      }
    };

    void fetchPortal();

    return () => {
      cancelled = true;
    };
  }, [portalId]);

  const usingCustomDomain = useMemo(() => {
    if (!portal?.customDomain || typeof window === 'undefined') {
      return false;
    }

    return normalizeRequestHost(window.location.host) === portal.customDomain;
  }, [portal?.customDomain]);

  const portalBaseHref = useMemo(() => {
    if (!portalId) {
      return '/portal';
    }

    return usingCustomDomain ? '' : `/portal/${portalId}`;
  }, [portalId, usingCustomDomain]);

  const navItems = useMemo(() => {
    if (!portalId) {
      return [];
    }

    const currentMembership = portal?.memberships?.[0];
    const customerScoped = Boolean(currentMembership?.partnerCustomerId);
    const financeSuffix = customerScoped && currentMembership?.partnerCustomerId
      ? `/finance/${currentMembership.partnerCustomerId}`
      : '/finance';
    const allowedSuffixes = customerScoped
      ? new Set(['/shipments', financeSuffix])
      : null;

    return workspaceNav
      .map((item) => {
        const suffix = item.suffix === '/finance' ? financeSuffix : item.suffix;
        return {
          ...item,
          suffix,
          href: `${portalBaseHref}${suffix || ''}` || '/',
        };
      })
      .filter((item) => !allowedSuffixes || allowedSuffixes.has(item.suffix));
  }, [portal?.memberships, portalBaseHref, portalId]);

  const brand = useMemo(() => getPortalBrandIdentity(portal), [portal]);
  const hasPortalWorkspace = Boolean(portalId);
  const portalAccessLabel = portal?.memberships?.[0]?.partnerCustomer?.name
    ? `${portal.memberships[0].partnerCustomer.name} Customer`
    : portal?.memberships?.[0]?.role || 'Member';

  // Keep the active nav pill visible on mobile by scrolling it into view
  // whenever the route changes.
  const mobileNavRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasPortalWorkspace) {
      return;
    }

    const container = mobileNavRef.current;
    if (!container) {
      return;
    }

    const activePill = container.querySelector<HTMLElement>('[data-nav-active="true"]');
    activePill?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [pathname, hasPortalWorkspace]);

  return (
    <div
      style={{ minHeight: '100vh', backgroundColor: 'var(--background)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', borderTop: `4px solid ${brand.accentColor}` }}
    >
      <div
        className={hasPortalWorkspace ? 'px-4 py-2.5 md:px-6 md:py-3 xl:px-8' : 'px-4 py-4 md:px-6 md:py-5 xl:px-8'}
        style={{ borderBottom: '1px solid var(--border)', background: hasPortalWorkspace
            ? `linear-gradient(135deg, rgba(${brand.accentRgb}, 0.15), rgba(${brand.accentRgb}, 0.06) 46%, rgba(255,255,255,0.94) 100%)`
            : `linear-gradient(135deg, rgba(${brand.accentRgb}, 0.22), rgba(${brand.accentRgb}, 0.10) 46%, rgba(255,255,255,0.9) 100%)`, backdropFilter: 'blur(18px)', position: 'sticky', top: 0, zIndex: 30 }}
      >
        <div
          className="flex flex-col items-start md:flex-row md:items-center" style={{ display: 'flex', justifyContent: 'space-between', gap: hasPortalWorkspace ? 12 : 16 }}
        >
          <div style={{ display: 'grid', gap: hasPortalWorkspace ? 2.8 : 4 }}>
            <p style={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              {portalId ? 'Partner Workspace' : 'Partner Portal'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {portalId ? (
                brand.logoUrl ? (
                  <img src={brand.logoUrl} alt={`${brand.companyLabel} logo`} style={{ width: hasPortalWorkspace ? 36 : 44, height: hasPortalWorkspace ? 36 : 44, borderRadius: 16, objectFit: 'cover', backgroundColor: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.5)' }} />
                ) : (
                  <div style={{ width: hasPortalWorkspace ? 36 : 44, height: hasPortalWorkspace ? 36 : 44, borderRadius: 16, display: 'grid', placeItems: 'center', backgroundColor: brand.accentColor, color: '#fff', fontWeight: 800, fontSize: hasPortalWorkspace ? '0.9rem' : '1rem' }}>
                    {brand.companyLabel.slice(0, 1).toUpperCase()}
                  </div>
                )
              ) : null}
              <div>
                <p className={hasPortalWorkspace ? 'text-base md:text-[1.2rem]' : 'text-[1.15rem] md:text-2xl'} style={{ fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {portalId ? brand.companyLabel : 'Shared Customer Portal'}
                </p>
                {portalId ? (
                  <p style={{ fontSize: hasPortalWorkspace ? '0.78rem' : '0.82rem', color: 'var(--text-secondary)' }}>
                    {portal?.name || 'Portal Workspace'}
                  </p>
                ) : null}
              </div>
            </div>
            {hasPortalWorkspace ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: 780 }}>
                Access: {portalAccessLabel}
              </p>
            ) : (
              <p style={{ color: 'var(--text-secondary)', maxWidth: 780 }}>
                Open a portal workspace to manage assigned shipments, customer handoffs, team members, and partner activity.
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/portal" style={{ textDecoration: 'none' }}>
              <Button variant={pathname === '/portal' ? 'primary' : 'outline'} size="sm">
                <ArrowBackOutlinedIcon size={16} />
                My Portals
              </Button>
            </Link>
            {portalId ? (
              <Link href={`${portalBaseHref}/shipments` || '/'} style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm">Open Shipments</Button>
              </Link>
            ) : null}
          </div>
        </div>

        {portalId ? (
          <div
            ref={mobileNavRef}
            className="flex lg:hidden [&::-webkit-scrollbar]:hidden" style={{ marginTop: 10, overflowX: 'auto', gap: 8, paddingBottom: 2, paddingRight: 4, scrollbarWidth: 'none' /* JXUI: webkit scrollbar hidden via className above; dropped sx: '&::-webkit-scrollbar': {
                display: 'none',
              } */ }}
          >
            {navItems.map((item) => {
              const active = isWorkspaceRouteActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} aria-current={active ? 'page' : undefined}>
                  <div
                    data-nav-active={active ? 'true' : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 10.8, paddingRight: 10.8, paddingTop: 7.6, paddingBottom: 7.6, borderRadius: 7992, whiteSpace: 'nowrap', flexShrink: 0, border: '1px solid', borderColor: active ? brand.accentColor : 'var(--border)', backgroundColor: active ? `rgba(${brand.accentRgb}, 0.10)` : 'var(--panel)', color: active ? brand.accentColor : 'var(--text-primary)' }}
                  >
                    {item.icon}
                    <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.label}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {portalId ? (
          <aside
           
            style={{ width: 280, borderRight: '1px solid var(--border)', paddingLeft: 16, paddingRight: 16, paddingTop: 16, paddingBottom: 16, backgroundColor: 'var(--panel)', backdropFilter: 'blur(16px)' }} className="hidden lg:block"
          >
            <div
              style={{ border: '1px solid var(--border)', borderRadius: 24, padding: 16, backgroundColor: 'var(--panel)', boxShadow: '0 18px 40px rgba(var(--text-primary-rgb),0.08)', display: 'grid', gap: 12 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ fontSize: '0.82rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Workspace
                </p>
              </div>
              <div>
                <p style={{ fontSize: '1.1rem', fontWeight: 800 }}>{brand.companyLabel}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {portal?.name || 'Partner-facing view of your shared operations'}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                <div style={{ padding: 10, borderRadius: 16, backgroundColor: `rgba(${brand.accentRgb}, 0.08)` }}>
                  <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Shipments
                  </p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{portal?._count?.shipmentAssignments || 0}</p>
                </div>
                <div style={{ padding: 10, borderRadius: 16, backgroundColor: 'rgba(var(--accent-rgb),0.10)' }}>
                  <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Customers
                  </p>
                  <p style={{ fontSize: '1.1rem', fontWeight: 700 }}>{portal?._count?.customers || 0}</p>
                </div>
                <div style={{ padding: 10, borderRadius: 16, backgroundColor: `rgba(${brand.accentRgb}, 0.08)` }}>
                  <p style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Access
                  </p>
                  <p style={{ fontSize: '0.85rem', fontWeight: 700, overflowWrap: 'anywhere' }}>{portalAccessLabel}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderRadius: 16, backgroundColor: 'rgba(var(--text-primary-rgb),0.04)' }}>
                <LayersOutlinedIcon size={18} style={{ color: 'var(--text-secondary)' }} />
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Finance access: <strong style={{ color: 'var(--text-primary)' }}>Read-only</strong>
                </p>
              </div>
            </div>

            <nav aria-label="Portal workspace" style={{ display: 'grid', gap: 8, marginTop: 16 }}>
              {navItems.map((item) => {
                const active = isWorkspaceRouteActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} aria-current={active ? 'page' : undefined}>
                    <div
                      className="hover:border-[var(--portal-accent)] hover:bg-[rgba(var(--portal-accent-rgb),0.08)]"
                      style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 12, paddingRight: 12, paddingTop: 10.8, paddingBottom: 10.8, borderRadius: 20, border: '1px solid', borderColor: active ? brand.accentColor : 'var(--border)', backgroundColor: active ? `rgba(${brand.accentRgb}, 0.10)` : 'transparent', color: active ? brand.accentColor : 'var(--text-primary)', transition: 'all 0.18s ease', '--portal-accent': brand.accentColor, '--portal-accent-rgb': brand.accentRgb } as React.CSSProperties}
                    >
                      {item.icon}
                      <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>{item.label}</p>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}

        <main className="pb-8 lg:pb-10" style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
