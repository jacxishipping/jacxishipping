'use client';

import { DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { PageHeader } from '@/components/design-system';
import { TrackingDiagnosticsPanel } from '@/components/dashboard/TrackingDiagnosticsPanel';

export default function TrackingDiagnosticsPage() {
  return (
    <DashboardSurface>
      <PageHeader
        showBreadcrumbs
        title="Tracking Diagnostics"
        description="Real-time health monitoring, test console, and diagnostics for all container tracking providers"
      />
      <TrackingDiagnosticsPanel />
    </DashboardSurface>
  );
}
