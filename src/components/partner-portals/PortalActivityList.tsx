'use client';

import { EmptyState } from '@/components/design-system';
import { formatRelativeTime } from '@/lib/relative-time';
import { Users as PeopleOutlineIcon } from 'lucide-react';

export type PortalActivityItem = {
  id: string;
  action: string;
  performedAt: string;
  actor: { id: string; name: string | null; email: string | null };
  target: { id: string | null; name: string | null; email: string | null };
  summary: string;
  changes?: Record<string, unknown>;
};

type PortalActivityListProps = {
  activities: PortalActivityItem[];
  emptyTitle: string;
  emptyDescription: string;
};

export function PortalActivityList({ activities, emptyTitle, emptyDescription }: PortalActivityListProps) {
  if (activities.length === 0) {
    return <EmptyState icon={<PeopleOutlineIcon />} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {activities.map((activity) => (
        <div key={activity.id} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'grid', gap: 4 }}>
          <p style={{ fontWeight: 600 }}>{activity.summary}</p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {formatRelativeTime(activity.performedAt)} • {new Date(activity.performedAt).toLocaleString()} • {activity.actor.name || activity.actor.email || 'Unknown actor'}
          </p>
        </div>
      ))}
    </div>
  );
}