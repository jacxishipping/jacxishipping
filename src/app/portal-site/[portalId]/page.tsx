import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Button } from '@/components/design-system';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPortalBrandIdentity } from '@/lib/partner-portal-branding';
import { isSystemHost, normalizeRequestHost } from '@/lib/partner-portal-domains';
import { ExternalLink as OpenInNewOutlinedIcon, KeyRound as VpnKeyOutlinedIcon, LogIn as LoginOutlinedIcon, Package as Inventory2OutlinedIcon, Wallet as AccountBalanceWalletOutlinedIcon, Shield as ShieldOutlinedIcon, ArrowRight as ArrowForwardOutlinedIcon } from 'lucide-react';

export default async function PortalPublicLandingPage(
  { params }: { params: Promise<{ portalId: string }> },
) {
  const { portalId } = await params;
  const portal = await prisma.partnerPortal.findUnique({
    where: { id: portalId },
    select: {
      id: true,
      name: true,
      code: true,
      companyLabel: true,
      accentColor: true,
      logoUrl: true,
      customDomain: true,
      customDomainVerifiedAt: true,
      isActive: true,
    },
  });

  if (!portal) {
    notFound();
  }

  const session = await auth();
  const requestHeaders = await headers();
  const requestHost = normalizeRequestHost(
    requestHeaders.get('x-forwarded-host')
      || requestHeaders.get('host')
      || '',
  );
  const usingCustomDomain = Boolean(
    requestHost
      && portal.customDomain
      && portal.customDomainVerifiedAt
      && !isSystemHost(requestHost)
      && requestHost === portal.customDomain,
  );

  const brand = getPortalBrandIdentity(portal);
  const workspaceHref = usingCustomDomain ? '/' : `/portal/${portal.id}`;
  const publicHref = usingCustomDomain ? '/' : `/portal-site/${portal.id}`;
  const customerLoginHref = `/auth/simple-login?portalId=${encodeURIComponent(portal.id)}&callbackUrl=${encodeURIComponent(workspaceHref)}`;
  const staffLoginHref = `/auth/signin?portalId=${encodeURIComponent(portal.id)}&callbackUrl=${encodeURIComponent(workspaceHref)}`;
  const activeFeatures = [
    {
      title: 'Shipment Visibility',
      description: 'Track assigned vehicles, milestones, and attached public documents in one branded workspace.',
      icon: <Inventory2OutlinedIcon size={22} />,
    },
    {
      title: 'Portal Finance',
      description: 'Review invoices, unbilled amounts, and portal-only customer balances without touching the main finance ledger.',
      icon: <AccountBalanceWalletOutlinedIcon size={22} />,
    },
    {
      title: 'Private Access',
      description: 'Customers and portal staff sign in with their own access path while data stays scoped to the right account.',
      icon: <ShieldOutlinedIcon size={22} />,
    },
  ];

  return (
    <div
      style={{ minHeight: '100vh', color: 'var(--text-primary)', background: `radial-gradient(circle at top left, rgba(${brand.accentRgb},0.28), transparent 28%), radial-gradient(circle at 85% 18%, rgba(${brand.accentRgb},0.16), transparent 24%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 48%, #ffffff 100%)` }}
    >
      <div className="px-4 py-6 sm:px-6 md:py-8 lg:px-10" style={{ maxWidth: 1240, marginLeft: 'auto', marginRight: 'auto' }}>
        <div className="mb-8 md:mb-12" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11.2 }}>
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={`${brand.companyLabel} logo`} style={{ width: 54, height: 54, borderRadius: 24, objectFit: 'cover', backgroundColor: 'rgba(255,255,255,0.96)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 14px 28px rgba(15,23,42,0.08)' }} />
            ) : (
              <div style={{ width: 54, height: 54, borderRadius: 24, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', background: brand.accentColor, boxShadow: `0 18px 30px rgba(${brand.accentRgb},0.28)` }}>
                {brand.companyLabel.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p style={{ fontSize: '0.76rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Portal Website
              </p>
              <p className="text-base md:text-[1.12rem]" style={{ fontWeight: 800 }}>
                {brand.companyLabel}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {session?.user ? (
              <Link href={workspaceHref} style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">
                  Open Portal
                  <ArrowForwardOutlinedIcon size={16} />
                </Button>
              </Link>
            ) : (
              <>
                <Link href={customerLoginHref} style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="sm">
                    Customer Login
                    <VpnKeyOutlinedIcon size={16} />
                  </Button>
                </Link>
                <Link href={staffLoginHref} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">
                    Staff Sign In
                    <LoginOutlinedIcon size={16} />
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr]" style={{ display: 'grid', gap: 28, alignItems: 'stretch' }}>
          <div
            style={{ position: 'relative', overflow: 'hidden', borderRadius: 48, border: '1px solid rgba(255,255,255,0.68)', background: 'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))', boxShadow: '0 28px 80px rgba(15,23,42,0.12)' }} className="p-6 md:p-10"
          >
            <div style={{ position: 'absolute', inset: 'auto -8% -30% auto', width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle, rgba(${brand.accentRgb},0.30), rgba(${brand.accentRgb},0.02) 65%, transparent 72%)` }} />
            <div style={{ position: 'relative', display: 'grid', gap: 18 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ paddingLeft: 11.2, paddingRight: 11.2, paddingTop: 5.6, paddingBottom: 5.6, borderRadius: 7992, backgroundColor: `rgba(${brand.accentRgb},0.12)`, color: brand.accentColor, fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Branded Customer Portal
                </div>
                <div style={{ paddingLeft: 11.2, paddingRight: 11.2, paddingTop: 5.6, paddingBottom: 5.6, borderRadius: 7992, backgroundColor: portal.isActive ? 'rgba(34,197,94,0.14)' : 'rgba(245,158,11,0.16)', color: portal.isActive ? '#166534' : '#92400e', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {portal.isActive ? 'Portal Active' : 'Portal Preview'}
                </div>
              </div>

              <p className="text-[2.4rem] md:text-[4.1rem]" style={{ lineHeight: 0.94, fontWeight: 900, letterSpacing: '-0.06em', maxWidth: 760 }}>
                {brand.companyLabel} customer access, shipment updates, and portal-only finance in one place.
              </p>

              <p className="text-base md:text-[1.12rem]" style={{ color: 'var(--text-secondary)', maxWidth: 720, lineHeight: 1.75 }}>
                This portal gives your downstream customers and internal portal staff a dedicated entry point with branded access, shipment visibility, invoice history, and customer-scoped finance records.
              </p>

              <div style={{ display: 'flex', gap: 9.6, flexWrap: 'wrap', paddingTop: 8 }}>
                {session?.user ? (
                  <Link href={workspaceHref} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" size="lg">
                      Continue To Portal
                      <ArrowForwardOutlinedIcon size={18} />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href={customerLoginHref} style={{ textDecoration: 'none' }}>
                      <Button variant="primary" size="lg">
                        Login With Code
                        <VpnKeyOutlinedIcon size={18} />
                      </Button>
                    </Link>
                    <Link href={staffLoginHref} style={{ textDecoration: 'none' }}>
                      <Button variant="outline" size="lg">
                        Portal Staff Sign In
                        <LoginOutlinedIcon size={18} />
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3" style={{ display: 'grid', gap: 9.6, paddingTop: 16 }}>
                {activeFeatures.map((feature) => (
                  <div key={feature.title} style={{ borderRadius: 28, border: '1px solid rgba(15,23,42,0.08)', backgroundColor: 'rgba(255,255,255,0.72)', padding: 16.8, display: 'grid', gap: 8 }}>
                    <div style={{ width: 42, height: 42, borderRadius: 20, display: 'grid', placeItems: 'center', backgroundColor: `rgba(${brand.accentRgb},0.12)`, color: brand.accentColor }}>
                      {feature.icon}
                    </div>
                    <p style={{ fontSize: '1rem', fontWeight: 800 }}>{feature.title}</p>
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            <div style={{ borderRadius: 40, background: '#0f172a', color: '#e2e8f0', boxShadow: '0 24px 60px rgba(15,23,42,0.24)', display: 'grid', gap: 16 }} className="p-6 md:p-8">
              <p style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(226,232,240,0.68)' }}>
                Access Flow
              </p>
              <p style={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.15 }}>
                A portal entry page that feels like a standalone site.
              </p>
              <div style={{ display: 'grid', gap: 9.2 }}>
                {[
                  'Customers sign in with an 8-character login code and land inside their own scoped workspace.',
                  'Portal staff can use their existing staff sign-in path with the same branded destination.',
                  'Custom domains open this public page first, then route into the private workspace after login.',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', gap: 8.8, alignItems: 'flex-start' }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', backgroundColor: brand.accentColor, marginTop: 6, flexShrink: 0 }} />
                    <p style={{ color: 'rgba(226,232,240,0.88)', lineHeight: 1.7 }}>{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderRadius: 40, border: '1px solid rgba(15,23,42,0.08)', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(14px)', display: 'grid', gap: 12 }} className="p-6 md:p-8">
              <p style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-secondary)' }}>
                Portal Address
              </p>
              <p style={{ fontSize: '1.18rem', fontWeight: 800 }}>
                {usingCustomDomain ? requestHost : portal.customDomain || publicHref}
              </p>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                {portal.customDomainVerifiedAt
                  ? 'This portal already has a verified public hostname and can be shared as a standalone partner website.'
                  : 'This preview path is available now, and a verified custom domain will point here automatically once DNS is live.'}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={publicHref} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">
                    Open Public Page
                    <OpenInNewOutlinedIcon size={16} />
                  </Button>
                </Link>
                {!session?.user ? (
                  <Link href={customerLoginHref} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" size="sm">Start Login</Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}