'use client';

import Link from 'next/link';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { ArrowLeft as ArrowBackIcon, Check as CheckIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Autocomplete, Breadcrumbs, Button, FormField, PageHeader, toast, MilestoneStepper } from '@/components/design-system';
import { hasPermission } from '@/lib/rbac';


type UserOption = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type PortalForm = {
  name: string;
  code: string;
  companyLabel: string;
  customDomain: string;
  accentColor: string;
  logoUrl: string;
  notes: string;
};

const steps = ['Portal Details', 'Branding', 'Owner', 'Review'];

const initialForm: PortalForm = {
  name: '',
  code: '',
  companyLabel: '',
  customDomain: '',
  accentColor: '#D4AF37',
  logoUrl: '',
  notes: '',
};

function trimOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export default function NewPartnerPortalPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<PortalForm>(initialForm);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<UserOption | null>(null);
  const [saving, setSaving] = useState(false);

  const canAccess = hasPermission(session?.user?.role, 'customers:manage') || hasPermission(session?.user?.role, 'users:manage');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canAccess) {
      router.replace('/dashboard');
    }
  }, [canAccess, router, session, status]);

  useEffect(() => {
    if (!canAccess) return;

    const controller = new AbortController();
    const fetchUsers = async () => {
      try {
        const query = new URLSearchParams({ page: '1', pageSize: '20' });
        if (userSearch.trim()) query.set('query', userSearch.trim());
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
  }, [canAccess, userSearch]);

  const selectedOwnerLabel = useMemo(() => {
    if (!selectedOwner) return 'Not selected';
    return selectedOwner.name ? `${selectedOwner.name} (${selectedOwner.email})` : selectedOwner.email;
  }, [selectedOwner]);

  const updateForm = (field: keyof PortalForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!form.name.trim()) {
        toast.error('Portal name is required');
        return false;
      }
      if (form.code.trim() && form.code.trim().length < 2) {
        toast.error('Portal code must be at least 2 characters');
        return false;
      }
    }

    if (step === 1) {
      if (form.accentColor && !/^#([0-9a-fA-F]{6})$/.test(form.accentColor)) {
        toast.error('Accent color must be a 6-digit hex color');
        return false;
      }
    }

    if (step === 2 && !selectedOwner) {
      toast.error('Portal owner is required');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2) || !selectedOwner) return;

    try {
      setSaving(true);
      const response = await fetch('/api/partner-portals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          code: trimOrUndefined(form.code),
          companyLabel: trimOrUndefined(form.companyLabel),
          customDomain: trimOrUndefined(form.customDomain),
          accentColor: trimOrUndefined(form.accentColor),
          logoUrl: trimOrUndefined(form.logoUrl),
          notes: trimOrUndefined(form.notes),
          ownerUserId: selectedOwner.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal');
      }

      toast.success('Partner portal created');
      router.push(`/dashboard/partner-portals/${data.portal.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create portal');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    if (activeStep === 0) {
      return (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 md:grid-cols-2">
          <div className="min-w-0 flex-1"><FormField label="Portal Name *" value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="e.g. Gulf Partner Workspace" required /></div>
          <div className="min-w-0 flex-1"><FormField label="Portal Code" value={form.code} onChange={(event) => updateForm('code', event.target.value)} placeholder="e.g. gulf-partner" helperText="Optional unique short code for internal reference" /></div>
          <div className="min-w-0 flex-1"><FormField label="Company Label" value={form.companyLabel} onChange={(event) => updateForm('companyLabel', event.target.value)} placeholder="Name shown in the partner workspace" /></div>
          <div className="min-w-0 flex-1"><FormField label="Notes" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} multiline minRows={3} /></div>
        </JXBox>
      );
    }

    if (activeStep === 1) {
      return (
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 md:grid-cols-2">
          <div className="min-w-0 flex-1"><FormField label="Custom Domain" value={form.customDomain} onChange={(event) => updateForm('customDomain', event.target.value)} placeholder="portal.partner.com" helperText="Optional hostname without http:// or paths" /></div>
          <div className="min-w-0 flex-1"><FormField label="Logo URL" value={form.logoUrl} onChange={(event) => updateForm('logoUrl', event.target.value)} placeholder="https://example.com/logo.png" /></div>
          <div className="min-w-0 flex-1"><FormField label="Accent Color" type="color" value={form.accentColor} onChange={(event) => updateForm('accentColor', event.target.value)} helperText="Used for the partner workspace theme" /></div>
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '16px', padding: '16px', display: 'grid', gap: '8px'}}>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Preview</p>
            <JXBox padding="none" border={false} style={{height: '48px', borderRadius: '8px', backgroundColor: form.accentColor || '#D4AF37'}} />
            <p className="text-sm leading-relaxed" style={{fontWeight: 700}}>{form.companyLabel || form.name || 'Partner Portal'}</p>
          </JXBox>
        </JXBox>
      );
    }

    if (activeStep === 2) {
      return (
                <Autocomplete
          options={users.map((u) => ({ id: u.id, label: u.name ? `${u.name} (${u.email})` : u.email, searchText: `${u.name || ''} ${u.email}` }))}
          value={selectedOwner?.id || null}
          onChange={(id) => setSelectedOwner(users.find((u) => u.id === id) || null)}
          onInputChange={(v) => setUserSearch(v)}
          label="Portal Owner *"
          placeholder="Search users by name or email"
        />
      );
    }

    return (
      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}}>
        {[
          ['Portal Name', form.name || 'Not provided'],
          ['Portal Code', form.code || 'Not provided'],
          ['Company Label', form.companyLabel || form.name || 'Not provided'],
          ['Custom Domain', form.customDomain || 'Not provided'],
          ['Logo URL', form.logoUrl || 'Not provided'],
          ['Accent Color', form.accentColor || 'Not provided'],
          ['Owner', selectedOwnerLabel],
          ['Notes', form.notes || 'Not provided'],
        ].map(([label, value]) => (
          <JXBox padding="none" border={false} key={label} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '4px', borderBottom: '1px solid var(--border)', paddingBottom: '8px'}}>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase'}}>{label}</p>
            <p className="text-sm leading-relaxed" style={{fontWeight: 600, overflowWrap: 'anywhere'}}>{value}</p>
          </JXBox>
        ))}
      </JXBox>
    );
  };

  if (status === 'loading' || !session || !canAccess) {
    return null;
  }

  return (
    <DashboardSurface>
      <PageHeader
        title="Create Partner Portal"
        description="Set up the workspace details, branding, owner, and review before creation"
        showBreadcrumbs
        actions={
          <Link href="/dashboard/partner-portals" style={{ textDecoration: 'none' }}>
            <Button variant="outline" icon={<ArrowBackIcon />}>Back</Button>
          </Link>
        }
      />

      <DashboardPanel>
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '32px'}}>
          <MilestoneStepper steps={steps.map((label, index) => ({ id: String(index), label: label }))} currentStepId={String(activeStep)} />

          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>{renderStep()}</JXBox>

          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap'}}>
            <Button variant="outline" onClick={handleBack} disabled={activeStep === 0 || saving} icon={<ChevronLeftIcon />}>
              Back
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button variant="primary" onClick={() => void handleSubmit()} disabled={saving} icon={<CheckIcon />}>
                {saving ? 'Creating...' : 'Create Portal'}
              </Button>
            ) : (
              <Button variant="primary" onClick={handleNext} disabled={saving} icon={<ChevronRightIcon />}>
                Continue
              </Button>
            )}
          </JXBox>
        </JXBox>
      </DashboardPanel>
    </DashboardSurface>
  );
}
