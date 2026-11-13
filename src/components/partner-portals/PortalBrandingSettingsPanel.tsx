'use client';

import { useRef } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, FormField, toast } from '@/components/design-system';
import { getPortalBrandIdentity } from '@/lib/partner-portal-branding';
import {
  getPortalCustomDomainVerificationHost,
  getPortalCustomDomainVerificationValue,
  normalizeRequestHost,
} from '@/lib/partner-portal-domains';

type PortalBrandingInfo = {
  id: string;
  name: string;
  code: string | null;
  customDomain?: string | null;
  customDomainVerificationToken?: string | null;
  customDomainVerifiedAt?: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type PortalBrandingSettingsPanelProps = {
  portalId: string;
  portal: PortalBrandingInfo | null;
  canEdit: boolean;
  onSaved?: (portal: PortalBrandingInfo) => void;
  compact?: boolean;
};

export default function PortalBrandingSettingsPanel({
  portalId,
  portal,
  canEdit,
  onSaved,
  compact = false,
}: PortalBrandingSettingsPanelProps) {
  const [form, setForm] = useState({ companyLabel: '', accentColor: '', logoUrl: '', customDomain: '' });
  const [saving, setSaving] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [disconnectingDomain, setDisconnectingDomain] = useState(false);
  const [domainCheckError, setDomainCheckError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoPreviewUrl, setPendingLogoPreviewUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const appHost = useMemo(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!configuredUrl) {
      if (typeof window !== 'undefined') {
        return normalizeRequestHost(window.location.host) || '';
      }

      return '';
    }

    try {
      return new URL(configuredUrl).host;
    } catch {
      if (typeof window !== 'undefined') {
        return normalizeRequestHost(window.location.host) || '';
      }

      return '';
    }
  }, []);

  useEffect(() => {
    setForm({
      companyLabel: portal?.companyLabel || '',
      accentColor: portal?.accentColor || '',
      logoUrl: portal?.logoUrl || '',
      customDomain: portal?.customDomain || '',
    });
  }, [portal?.accentColor, portal?.companyLabel, portal?.customDomain, portal?.logoUrl]);

  useEffect(() => () => {
    if (pendingLogoPreviewUrl) {
      URL.revokeObjectURL(pendingLogoPreviewUrl);
    }
  }, [pendingLogoPreviewUrl]);

  const brand = useMemo(
    () => getPortalBrandIdentity({
      name: portal?.name,
      companyLabel: form.companyLabel,
      accentColor: form.accentColor,
      logoUrl: form.logoUrl,
    }),
    [form.accentColor, form.companyLabel, form.logoUrl, portal?.name],
  );

  const publicEntryPreview = useMemo(() => {
    if (form.customDomain) {
      return `https://${form.customDomain}`;
    }

    return appHost ? `https://${appHost}/portal-site/${portalId}` : `/portal-site/${portalId}`;
  }, [appHost, form.customDomain, portalId]);

  const workspacePreview = useMemo(() => {
    if (form.customDomain) {
      return `https://${form.customDomain}`;
    }

    return appHost ? `https://${appHost}/portal/${portalId}` : `/portal/${portalId}`;
  }, [appHost, form.customDomain, portalId]);

  const savedCustomDomain = portal?.customDomain || '';
  const hasUnsavedDomainChange = form.customDomain !== savedCustomDomain;
  const verificationHost = portal?.customDomain ? getPortalCustomDomainVerificationHost(portal.customDomain) : null;
  const verificationValue = portal?.customDomainVerificationToken
    ? getPortalCustomDomainVerificationValue(portal.customDomainVerificationToken)
    : null;

  const handleVerifyDomain = async () => {
    if (!canEdit || !portal?.customDomain) {
      return;
    }

    try {
      setVerifyingDomain(true);
      const response = await fetch(`/api/partner-portals/${portalId}/verify-domain`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify custom domain');
      }

      toast.success('Custom domain verified');
      onSaved?.(data.portal);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify custom domain');
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleCheckDomain = async () => {
    if (!canEdit || !form.customDomain) {
      return;
    }

    try {
      setCheckingDomain(true);
      setDomainCheckError(null);
      const response = await fetch(`/api/partner-portals/${portalId}/check-domain?domain=${encodeURIComponent(form.customDomain)}`, {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok || !data.valid) {
        setDomainCheckError(data.error || 'Domain is not available');
      } else {
        setDomainCheckError(null);
        toast.success('Domain is available for this portal');
      }
    } catch (error) {
      setDomainCheckError('Failed to check domain availability');
    } finally {
      setCheckingDomain(false);
    }
  };

  const handleDisconnectDomain = async () => {
    if (!canEdit || !portal?.customDomain) {
      return;
    }

    if (!confirm(`Remove the custom domain ${portal.customDomain} from this portal?`)) {
      return;
    }

    try {
      setDisconnectingDomain(true);
      const response = await fetch(`/api/partner-portals/${portalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customDomain: '',
          customDomainVerificationToken: null,
          customDomainVerifiedAt: null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect domain');
      }

      setForm((prev) => ({ ...prev, customDomain: '' }));
      toast.success('Custom domain disconnected');
      onSaved?.(data.portal);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect domain');
    } finally {
      setDisconnectingDomain(false);
    }
  };

  const normalizeLogoFile = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error('Failed to read the selected logo image'));
        nextImage.src = imageUrl;
      });

      const targetSize = 512;
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is not available in this browser');
      }

      const cropSize = Math.min(image.width, image.height);
      const sourceX = Math.max(0, (image.width - cropSize) / 2);
      const sourceY = Math.max(0, (image.height - cropSize) / 2);

      context.clearRect(0, 0, targetSize, targetSize);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, targetSize, targetSize);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (!nextBlob) {
            reject(new Error('Failed to normalize the logo image'));
            return;
          }

          resolve(nextBlob);
        }, 'image/png', 0.92);
      });

      const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'portal-logo';
      return new File([blob], `${normalizedName}-normalized.png`, { type: 'image/png' });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const handleSave = async (nextForm?: Partial<typeof form>) => {
    if (!canEdit) {
      return;
    }

    try {
      setSaving(true);
      const payload = { ...form, ...nextForm };
      const response = await fetch(`/api/partner-portals/${portalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save branding settings');
      }

      setForm(payload);
      toast.success('Portal branding updated');
      onSaved?.(data.portal);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !canEdit) {
      return;
    }

    try {
      const normalizedFile = await normalizeLogoFile(file);
      const nextPreviewUrl = URL.createObjectURL(normalizedFile);

      setPendingLogoFile(normalizedFile);
      setPendingLogoPreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return nextPreviewUrl;
      });
      toast.success('Logo preview prepared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to prepare portal logo');
    }
  };

  const handleUploadPreparedLogo = async () => {
    if (!pendingLogoFile || !canEdit) {
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', pendingLogoFile);

      const uploadResponse = await fetch(`/api/partner-portals/${portalId}/logo`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload portal logo');
      }

      const nextLogoUrl = uploadData.url as string;
      setForm((prev) => ({ ...prev, logoUrl: nextLogoUrl }));
      await handleSave({ logoUrl: nextLogoUrl });
      if (pendingLogoPreviewUrl) {
        URL.revokeObjectURL(pendingLogoPreviewUrl);
      }
      setPendingLogoFile(null);
      setPendingLogoPreviewUrl(null);
      toast.success('Portal logo uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload portal logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDiscardPreparedLogo = () => {
    if (pendingLogoPreviewUrl) {
      URL.revokeObjectURL(pendingLogoPreviewUrl);
    }

    setPendingLogoFile(null);
    setPendingLogoPreviewUrl(null);
  };

  const handleClearLogo = async () => {
    setForm((prev) => ({ ...prev, logoUrl: '' }));
    await handleSave({ logoUrl: '' });
  };

  return (
    <DashboardPanel
      title="Partner Branding"
      description="Let this portal present a partner identity while still running inside your system."
      footer={canEdit ? 'These settings update the portal shell, workspace headings, preview surfaces, and optional custom-domain routing for this partner.' : 'Portal branding is controlled by portal admins or internal managers.'}
    >
      <div className={compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]'} style={{ display: 'grid', gap: 20 }}>
        <div style={{ display: 'grid', gap: 16 }}>
          <FormField label="Company Label" placeholder="Partner company name shown in the portal" value={form.companyLabel} onChange={(event) => setForm((prev) => ({ ...prev, companyLabel: event.target.value }))} disabled={!canEdit || saving} />
          <FormField label="Accent Color" placeholder="#0f766e" value={form.accentColor} onChange={(event) => setForm((prev) => ({ ...prev, accentColor: event.target.value }))} disabled={!canEdit || saving} helperText="Use a 6-digit hex color. Example: #0f766e" />
          <div style={{ border: '1px solid var(--border)', borderRadius: 20, padding: 12, backgroundColor: 'rgba(var(--brand-primary-rgb),0.05)', display: 'grid', gap: 8.8 }}>
            <p style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Portal Logo
            </p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Upload a logo directly here for the portal. A public URL is optional and only needed if you prefer linking an existing image.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {(pendingLogoPreviewUrl || form.logoUrl) ? (
                <img
                 
                  src={pendingLogoPreviewUrl || form.logoUrl}
                  alt="Portal logo preview"
                  style={{ width: 56, height: 56, borderRadius: 16, objectFit: 'cover', border: '1px solid var(--border)', backgroundColor: '#fff' }}
                />
              ) : (
                <div style={{ width: 56, height: 56, borderRadius: 16, display: 'grid', placeItems: 'center', backgroundColor: brand.accentColor, color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                  {brand.companyLabel.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div style={{ display: 'grid', gap: 2.8 }}>
                <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                  {pendingLogoFile ? 'Logo ready to upload' : form.logoUrl ? 'Logo configured' : 'No logo uploaded yet'}
                </p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {pendingLogoFile ? 'Review the crop preview below, then upload it.' : 'Square logos work best in the portal header and cards.'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {canEdit ? (
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={saving || uploadingLogo}>
                  {pendingLogoFile ? 'Choose Different Logo' : form.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                </Button>
              ) : null}
              {canEdit && form.logoUrl ? (
                <Button variant="outline" size="sm" onClick={() => void handleClearLogo()} disabled={saving || uploadingLogo}>
                  Remove Logo
                </Button>
              ) : null}
            </div>
          </div>
          <FormField label="Logo URL (Optional)" placeholder="https://..." value={form.logoUrl} onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))} disabled={!canEdit || saving || uploadingLogo} helperText="Optional fallback if you want to link an existing public image instead of uploading a file." />
          <FormField label="Custom Domain" placeholder="portal.partner.com" value={form.customDomain} onChange={(event) => setForm((prev) => ({ ...prev, customDomain: event.target.value.trim().toLowerCase() }))} disabled={!canEdit || saving} error={Boolean(domainCheckError)} helperText="Hostname only. No http://, https://, ports, or paths. After saving, point this DNS record to the main app host." />
          {canEdit && form.customDomain && !hasUnsavedDomainChange && (
            <p style={{ color: 'var(--error)', fontSize: '0.8rem' }}>
              {domainCheckError || 'Domain is available'}
            </p>
          )}
          {canEdit && form.customDomain && !hasUnsavedDomainChange && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Button variant="outline" size="sm" onClick={() => void handleCheckDomain()} disabled={checkingDomain || saving}>
                {checkingDomain ? 'Checking...' : 'Check Availability'}
              </Button>
              {domainCheckError ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--error)' }}>{domainCheckError}</p>
              ) : null}
            </div>
          )}

          <div style={{ border: '1px solid var(--border)', borderRadius: 20, padding: 12, backgroundColor: 'rgba(var(--brand-primary-rgb),0.05)', display: 'grid', gap: 5.2 }}>
            <p style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              Public Entry Preview
            </p>
            <p style={{ fontSize: '0.92rem', fontWeight: 700 }}>{publicEntryPreview}</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {form.customDomain
                ? `After DNS points ${form.customDomain} to ${appHost || 'this app'}, visitors land on the branded portal site at /. They can sign in there and continue into the workspace.`
                : `Without a custom domain, share /portal-site/${portalId} as the branded entry page. Signed-in members still work inside /portal/${portalId}.`}
            </p>
            <FormField label="Workspace Route" value={workspacePreview} helperText="Use this route when you want to open the actual workspace after sign-in." inputProps={{ readOnly: true }} />
          </div>

          {savedCustomDomain ? (
            <div style={{ border: '1px solid var(--border)', borderRadius: 20, padding: 12, backgroundColor: 'rgba(15,23,42,0.03)', display: 'grid', gap: 6.8 }}>
              <p style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Domain Verification
              </p>
              <p style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                {portal?.customDomainVerifiedAt
                  ? `Verified on ${new Date(portal.customDomainVerifiedAt).toLocaleString()}`
                  : 'Verification pending'}
              </p>
              {hasUnsavedDomainChange ? (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Save the custom domain first to generate the correct DNS verification record.
                </p>
              ) : (
                <>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 10, backgroundColor: 'rgba(var(--brand-primary-rgb),0.04)', display: 'grid', gap: 6.8 }}>
                    <p style={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      DNS Routing Setup
                    </p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      For a subdomain such as {portal?.customDomain}, create a CNAME that points the hostname to {appHost || 'your main app host'}.
                    </p>
                    <FormField label="Recommended Record Type" value="CNAME" inputProps={{ readOnly: true }} />
                    <FormField label="CNAME Target" value={appHost || ''} helperText="Some DNS providers want only the label (for example, portal). Others accept the full hostname." inputProps={{ readOnly: true }} />
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      If you want to use the root domain instead of a subdomain, use ALIAS, ANAME, or CNAME flattening to {appHost || 'your main app host'} when your DNS provider supports it. If your provider only supports A records at the root, use the hosting platform's documented A-record target for this app.
                    </p>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Add this TXT record to prove that you control the domain before it starts routing traffic to the portal.
                  </p>
                  <FormField label="TXT Host" value={verificationHost || ''} inputProps={{ readOnly: true }} />
                  <FormField label="TXT Value" value={verificationValue || ''} inputProps={{ readOnly: true }} />
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Keep the DNS target pointed at {appHost || 'the main app host'} separately. Verification only proves control of the hostname.
                  </p>
                  {canEdit && !portal?.customDomainVerifiedAt ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="outline" size="sm" onClick={() => void handleVerifyDomain()} disabled={verifyingDomain || saving}>
                        {verifyingDomain ? 'Verifying...' : 'Verify Domain'}
                      </Button>
                    </div>
                  ) : null}
                  {canEdit && portal?.customDomainVerifiedAt ? (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button variant="outline" size="sm" color="error" onClick={() => void handleDisconnectDomain()} disabled={disconnectingDomain || saving}>
                        {disconnectingDomain ? 'Disconnecting...' : 'Disconnect Domain'}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            hidden
            onChange={(event) => void handleLogoSelected(event)}
          />

          {pendingLogoPreviewUrl ? (
            <div style={{ border: '1px solid var(--border)', borderRadius: 24, padding: 16, display: 'grid', gap: 10, backgroundColor: 'rgba(15,23,42,0.03)' }}>
              <p style={{ fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Crop Preview
              </p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                This is the exact square crop and normalized size that will be uploaded for the portal shell.
              </p>
              <div style={{ width: 160, height: 160, borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border)', backgroundColor: '#fff' }}>
                <img src={pendingLogoPreviewUrl} alt="Prepared portal logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button variant="primary" size="sm" onClick={() => void handleUploadPreparedLogo()} disabled={saving || uploadingLogo}>
                  {uploadingLogo ? 'Uploading...' : 'Upload Prepared Logo'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDiscardPreparedLogo} disabled={uploadingLogo}>
                  Discard
                </Button>
              </div>
            </div>
          ) : null}

          {canEdit ? (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="primary" onClick={() => void handleSave()} disabled={saving || uploadingLogo || Boolean(pendingLogoFile)}>
                {saving ? 'Saving...' : 'Save Branding'}
              </Button>
            </div>
          ) : null}
        </div>

        <div
          style={{ border: '1px solid var(--border)', borderRadius: 24, overflow: 'hidden', background: `linear-gradient(145deg, rgba(${brand.accentRgb}, 0.22), rgba(${brand.accentRgb}, 0.08) 42%, rgba(255,255,255,0.94) 100%)`, boxShadow: '0 20px 40px rgba(var(--text-primary-rgb),0.08)' }}
        >
          <div style={{ padding: 20, display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {brand.logoUrl ? (
                <img
                 
                  src={pendingLogoPreviewUrl || brand.logoUrl}
                  alt={`${brand.companyLabel} logo`}
                  style={{ width: 52, height: 52, borderRadius: 16, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.5)', backgroundColor: 'rgba(255,255,255,0.88)' }}
                />
              ) : (
                <div style={{ width: 52, height: 52, borderRadius: 16, display: 'grid', placeItems: 'center', backgroundColor: brand.accentColor, color: '#fff', fontSize: '1.1rem', fontWeight: 800 }}>
                  {brand.companyLabel.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p style={{ fontSize: '0.76rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Branding Preview
                </p>
                <p style={{ fontSize: '1.15rem', fontWeight: 800 }}>{brand.companyLabel}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{portal?.name || 'Portal Workspace'}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.72)' }}>
                <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
                  Partner Label
                </p>
                <p style={{ fontSize: '0.96rem', fontWeight: 700 }}>{brand.companyLabel}</p>
              </div>
              <div style={{ padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.72)' }}>
                <p style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
                  Accent
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 7992, backgroundColor: brand.accentColor, border: '1px solid rgba(15,23,42,0.12)' }} />
                  <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>{brand.accentColor}</p>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
              The portal keeps your main system structure, but adds partner-specific identity in the header, navigation, and workspace cards.
            </p>
          </div>
        </div>
      </div>
    </DashboardPanel>
  );
}
