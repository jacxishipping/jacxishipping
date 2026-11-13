'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashboardGrid, DashboardHeader, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, FormField, toast } from '@/components/design-system';
import PortalBrandingSettingsPanel from '@/components/partner-portals/PortalBrandingSettingsPanel';
import { SlidersHorizontal as TuneOutlinedIcon, Palette as PaletteOutlinedIcon, Image as ImageOutlinedIcon, ShieldCheck as VerifiedUserOutlinedIcon, BellRing as NotificationsActiveOutlinedIcon, Route as AltRouteOutlinedIcon, StickyNote as StickyNote2OutlinedIcon, CircleCheck as CheckCircleOutlineOutlinedIcon } from 'lucide-react';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  customDomain?: string | null;
  customDomainVerifiedAt?: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  notifyOnShipmentAssigned?: boolean;
  autoAssignToSingleCustomer?: boolean;
  defaultShipmentNotes?: string | null;
  requireCustomerLinkForReady?: boolean;
  isActive?: boolean;
  notes?: string | null;
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

/**
 * PortalSwitch — native gold toggle (button role="switch").
 * JXSwitch was not used: its checked state paints JXUI indigo on an inner
 * element the wrapper className cannot reach (same reason DataTable uses a
 * native gold checkbox). Keeps the exact on/off behaviour and labels.
 */
function PortalSwitch({ checked, disabled, onChange, label }: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5"
      style={{ cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 40, height: 24, borderRadius: 999, flexShrink: 0,
          backgroundColor: checked ? 'var(--accent-gold)' : 'var(--border)',
          position: 'relative', transition: 'background-color 0.2s ease', display: 'inline-block',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: 3, left: checked ? 19 : 3, width: 18, height: 18,
            borderRadius: '50%', backgroundColor: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.2s ease',
          }}
        />
      </span>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{label}</span>
    </button>
  );
}

export default function PortalSettingsPageContent() {
  const params = useParams();
  const { data: session } = useSession();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOperationalSettings, setSavingOperationalSettings] = useState(false);
  const [defaultShipmentNotesDraft, setDefaultShipmentNotesDraft] = useState('');

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.user.id === session?.user?.id) || null,
    [memberships, session?.user?.id],
  );
  const canManageSettings = currentMembership?.role === 'ADMIN';

  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [portalResponse, membershipsResponse] = await Promise.all([
          fetch(`/api/partner-portals/${portalId}`, { cache: 'no-store' }),
          fetch(`/api/partner-portals/${portalId}/memberships`, { cache: 'no-store' }),
        ]);

        const portalData = await portalResponse.json();
        const membershipsData = await membershipsResponse.json();

        if (!portalResponse.ok) {
          throw new Error(portalData.error || 'Failed to load portal settings');
        }

        if (!membershipsResponse.ok) {
          throw new Error(membershipsData.error || 'Failed to load portal members');
        }

        if (!cancelled) {
          setPortal(portalData.portal || null);
          setDefaultShipmentNotesDraft(portalData.portal?.defaultShipmentNotes || '');
          setMemberships(membershipsData.memberships || []);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load portal settings');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (portalId) {
      void fetchSettings();
    }

    return () => {
      cancelled = true;
    };
  }, [portalId]);

  const handleSaveOperationalSettings = async (updates: Partial<PortalInfo>) => {
    try {
      setSavingOperationalSettings(true);
      const response = await fetch(`/api/partner-portals/${portalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save portal settings');
      }

      setPortal(data.portal || null);
      setDefaultShipmentNotesDraft(data.portal?.defaultShipmentNotes || '');
      toast.success('Portal settings updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save portal settings');
    } finally {
      setSavingOperationalSettings(false);
    }
  };

  return (
    <DashboardSurface>
      <DashboardHeader
        title={portal ? `${portal.companyLabel || portal.name} Settings` : 'Portal Settings'}
        description="Control the branded identity of this partner workspace without mixing it into member management."
        meta={[
          { label: 'Brand Label', value: portal?.companyLabel || portal?.name || 'Portal', helper: 'Shown in the portal shell' },
          { label: 'Custom Domain', value: portal?.customDomain || 'Standard path', helper: portal?.customDomain ? (portal?.customDomainVerifiedAt ? 'Verified and ready to route portal traffic' : 'Saved, but still waiting for DNS verification') : 'Uses the default /portal route' },
          { label: 'Public Site', value: portal?.customDomainVerifiedAt && portal?.customDomain ? portal.customDomain : `/portal-site/${portalId}`, helper: 'Branded landing page shown before login' },
          { label: 'Logo', value: portal?.logoUrl ? 'Configured' : 'Not set', helper: 'Upload or replace the partner mark' },
          { label: 'Notifications', value: portal?.notifyOnShipmentAssigned ? 'On' : 'Off', helper: 'Shipment assignment alerts' },
        ]}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={portal?.customDomainVerifiedAt && portal?.customDomain ? `https://${portal.customDomain}` : `/portal-site/${portalId}`}
              target={portal?.customDomainVerifiedAt && portal?.customDomain ? '_blank' : undefined}
              rel={portal?.customDomainVerifiedAt && portal?.customDomain ? 'noreferrer' : undefined}
              style={{ textDecoration: 'none' }}
            >
              <Button variant="outline" size="sm">Open Public Site</Button>
            </a>
            <Link href={`/portal/${portalId}/members`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Back To Members</Button>
            </Link>
          </div>
        }
      />

      {loading ? (
        <DashboardPanel title="Loading settings" description="Fetching portal branding and access details.">
          <div style={{ color: 'var(--text-secondary)' }}>Loading portal settings...</div>
        </DashboardPanel>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <PortalBrandingSettingsPanel
              portalId={portalId}
              portal={portal}
              canEdit={canManageSettings}
              onSaved={(nextPortal) => setPortal(nextPortal)}
            />

            <DashboardPanel title="Operational Defaults" description="Use portal-level defaults to shape partner notifications and customer assignment behavior.">
              <div style={{ display: 'grid', gap: 16 }}>
                <div style={{ padding: 14, borderRadius: 20, backgroundColor: 'rgba(var(--brand-primary-rgb),0.07)', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <NotificationsActiveOutlinedIcon style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Shipment Assignment Alerts</p>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Notify portal members when a new shipment is assigned into this workspace.
                  </p>
                  <PortalSwitch
                    checked={Boolean(portal?.notifyOnShipmentAssigned)}
                    disabled={!canManageSettings || savingOperationalSettings}
                    onChange={(checked) => void handleSaveOperationalSettings({ notifyOnShipmentAssigned: checked })}
                    label={portal?.notifyOnShipmentAssigned ? 'Enabled' : 'Disabled'}
                  />
                </div>

                <div style={{ padding: 14, borderRadius: 20, backgroundColor: 'rgba(var(--accent-rgb),0.08)', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AltRouteOutlinedIcon style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Single-Customer Auto Link</p>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    When this portal has exactly one customer, automatically link newly assigned shipments to that customer.
                  </p>
                  <PortalSwitch
                    checked={Boolean(portal?.autoAssignToSingleCustomer)}
                    disabled={!canManageSettings || savingOperationalSettings}
                    onChange={(checked) => void handleSaveOperationalSettings({ autoAssignToSingleCustomer: checked })}
                    label={portal?.autoAssignToSingleCustomer ? 'Enabled' : 'Disabled'}
                  />
                </div>

                <div style={{ padding: 14, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.05)', display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <StickyNote2OutlinedIcon style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Default Shipment Notes</p>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Pre-fill notes when a shipment is newly assigned into this portal and no specific note is provided.
                  </p>
                  <FormField placeholder="Example: Confirm customer handoff within 24 hours and keep delivery milestones updated." value={defaultShipmentNotesDraft} onChange={(event) => setDefaultShipmentNotesDraft(event.target.value)} disabled={!canManageSettings || savingOperationalSettings} minRows={3} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="outline" size="sm" onClick={() => void handleSaveOperationalSettings({ defaultShipmentNotes: defaultShipmentNotesDraft })} disabled={!canManageSettings || savingOperationalSettings}>
                      Save Default Notes
                    </Button>
                  </div>
                </div>

                <div style={{ padding: 14, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.08)', display: 'grid', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircleOutlineOutlinedIcon style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Ready-State Rule</p>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Control whether a shipment must be linked to a portal customer before portal staff can treat it as ready.
                  </p>
                  <PortalSwitch
                    checked={Boolean(portal?.requireCustomerLinkForReady)}
                    disabled={!canManageSettings || savingOperationalSettings}
                    onChange={(checked) => void handleSaveOperationalSettings({ requireCustomerLinkForReady: checked })}
                    label={portal?.requireCustomerLinkForReady ? 'Customer link required for ready state' : 'Ready state can exist without a customer link'}
                  />
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <DashboardPanel title="Workspace Guidance" description="What belongs on this page as the portal grows.">
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <PaletteOutlinedIcon style={{ color: 'var(--text-secondary)', marginTop: 2.4 }} />
                  <div>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Brand identity stays separate</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Logo, label, color, and custom-domain changes now live in settings, not inside the member administration surface.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <ImageOutlinedIcon style={{ color: 'var(--text-secondary)', marginTop: 2.4 }} />
                  <div>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Logo uploads stay portal-scoped</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Portal admins can upload a logo directly without relying on external links.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <VerifiedUserOutlinedIcon style={{ color: 'var(--text-secondary)', marginTop: 2.4 }} />
                  <div>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Settings are admin-controlled</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Portal staff can view the current setup, but only admins can change it.</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <TuneOutlinedIcon style={{ color: 'var(--text-secondary)', marginTop: 2.4 }} />
                  <div>
                    <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>Future settings have a home now</p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>As the portal grows, this page can keep absorbing partner-visible defaults without overloading members or shipment screens.</p>
                  </div>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Behavior Summary" description="How these settings affect the live partner workflow.">
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <p style={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Notification policy</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>{portal?.notifyOnShipmentAssigned ? 'Portal members are notified when shipments are assigned.' : 'Shipment assignment notifications are muted for this portal.'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Customer assignment default</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>{portal?.autoAssignToSingleCustomer ? 'New shipments auto-link when exactly one portal customer exists.' : 'New shipments arrive unlinked and require manual customer selection.'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Default notes</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>{portal?.defaultShipmentNotes?.trim() ? portal.defaultShipmentNotes : 'No default assignment note is configured.'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Ready-state rule</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 700 }}>{portal?.requireCustomerLinkForReady ? 'Shipments stay waiting until a portal customer is linked.' : 'Shipments can be treated as ready even before a portal customer is linked.'}</p>
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>

          {!canManageSettings ? (
            <DashboardPanel>
              <EmptyState
                icon={<VerifiedUserOutlinedIcon />}
                title="Portal admin access required"
                description="Only portal admins can save branding and settings changes for this workspace."
              />
            </DashboardPanel>
          ) : null}
        </>
      )}
    </DashboardSurface>
  );
}