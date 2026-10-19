'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, PageHeader } from '@/components/design-system';
import { TrackingApisTab } from '@/components/dashboard/settings/TrackingApisTab';

export default function TrackingApisSettingsPage() {
  return (
    <DashboardSurface>
      <PageHeader
        showBreadcrumbs
        title="Tracking APIs & Diagnostics"
        description="Verify upstream tracking providers, test token renewal, and test container tracking pipelines."
        actions={
          <Link href="/dashboard/settings?tab=tracking-apis" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to Settings
            </Button>
          </Link>
        }
      />
      <TrackingApisTab />
    </DashboardSurface>
  );
}
