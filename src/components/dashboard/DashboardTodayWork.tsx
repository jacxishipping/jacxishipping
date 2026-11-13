'use client';

import { JacxiButton } from '@/components/design-system/JacxiButton';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { 
  AlertTriangle, 
  Bot, 
  FileUp, 
  PackagePlus, 
  Receipt, 
  Ship, 
  Truck, 
  PanelRightOpen, 
  MessageSquare, 
  Route, 
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { Button, CopyButton, Tooltip } from '@/components/design-system';

import { hasPermission } from '@/lib/rbac';
import ShipmentQuickPeek from '@/components/dashboard/ShipmentQuickPeek';
import ContainerQuickPeek from '@/components/dashboard/ContainerQuickPeek';
import { 
  CustomerNotificationModal, 
  type CustomerNotificationPayload 
} from '@/components/dashboard/CustomerNotificationModal';
import { 
  RolePerspectiveSwitcher, 
  type DashboardPerspective, 
  DASHBOARD_PERSPECTIVES 
} from '@/components/dashboard/RolePerspectiveSwitcher';

export type TodayWorkItem = {
  id: string;
  shipmentId?: string;
  containerId?: string;
  transitId?: string;
  dispatchId?: string;
  vin?: string;
  type?: 'dispatch' | 'container' | 'released' | 'transit';
  title: string;
  subtitle: string;
  detail: string;
  href: string;
  severityLabel: string;
  ageDays: number;
};

type RecentActivityItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  timestamp: string;
};

type DashboardTodayWorkProps = {
  role?: string;
  workItems: TodayWorkItem[];
  overdueInvoicesCount: number;
  pendingInvoicesCount: number;
  failedAiJobsCount: number;
  recentActivity: RecentActivityItem[];
};

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleString();
}

export default function DashboardTodayWork({
  role,
  workItems,
  overdueInvoicesCount,
  pendingInvoicesCount,
  failedAiJobsCount,
  recentActivity,
}: DashboardTodayWorkProps) {
  const [peekShipmentId, setPeekShipmentId] = useState<string | null>(null);
  const [peekContainerId, setPeekContainerId] = useState<string | null>(null);
  const [notificationPayload, setNotificationPayload] = useState<CustomerNotificationPayload | null>(null);
  const [perspective, setPerspective] = useState<DashboardPerspective>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jacxi.dashboard_perspective') as DashboardPerspective | null;
      if (saved && ['all', 'dispatcher', 'port_yard', 'finance'].includes(saved)) return saved;
    }
    return 'all';
  });

  const handlePerspectiveChange = (newP: DashboardPerspective) => {
    setPerspective(newP);
    if (typeof window !== 'undefined') {
      localStorage.setItem('jacxi.dashboard_perspective', newP);
    }
  };

  const displayedWorkItems = useMemo(() => {
    if (perspective === 'all') return workItems;

    return [...workItems].sort((a, b) => {
      const aText = `${a.title} ${a.subtitle} ${a.detail} ${a.severityLabel}`.toLowerCase();
      const bText = `${b.title} ${b.subtitle} ${b.detail} ${b.severityLabel}`.toLowerCase();

      let aMatch = false;
      let bMatch = false;

      if (perspective === 'dispatcher') {
        aMatch = aText.includes('dispatch') || aText.includes('pickup') || aText.includes('tow') || aText.includes('inland') || a.type === 'dispatch';
        bMatch = bText.includes('dispatch') || bText.includes('pickup') || bText.includes('tow') || bText.includes('inland') || b.type === 'dispatch';
      } else if (perspective === 'port_yard') {
        aMatch = aText.includes('container') || aText.includes('port') || aText.includes('yard') || aText.includes('dock') || aText.includes('demurrage') || a.type === 'container';
        bMatch = bText.includes('container') || bText.includes('port') || bText.includes('yard') || bText.includes('dock') || bText.includes('demurrage') || b.type === 'container';
      } else if (perspective === 'finance') {
        aMatch = aText.includes('invoice') || aText.includes('paid') || aText.includes('price') || aText.includes('revenue') || aText.includes('balance');
        bMatch = bText.includes('invoice') || bText.includes('paid') || bText.includes('price') || bText.includes('revenue') || bText.includes('balance');
      }

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });
  }, [workItems, perspective]);

  const visibleQuickActions = [
    hasPermission(role, 'shipments:manage')
      ? {
          label: 'Create Shipment',
          href: '/dashboard/shipments/new',
          icon: <PackagePlus className="h-4 w-4" />,
        }
      : null,
    hasPermission(role, 'containers:manage')
      ? {
          label: 'Add Container',
          href: '/dashboard/containers/new',
          icon: <Ship className="h-4 w-4" />,
        }
      : null,
    hasPermission(role, 'dispatches:manage')
      ? {
          label: 'Open Dispatches',
          href: '/dashboard/dispatches',
          icon: <Truck className="h-4 w-4" />,
        }
      : null,
    hasPermission(role, 'invoices:manage')
      ? {
          label: 'Create Invoice',
          href: '/dashboard/invoices/new',
          icon: <Receipt className="h-4 w-4" />,
        }
      : null,
    hasPermission(role, 'finance:manage')
      ? {
          label: 'Upload Price List',
          href: '/dashboard/finance/companies',
          icon: <FileUp className="h-4 w-4" />,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: ReactNode }>;

  const baseFocusCards = [
    {
      label: 'Urgent Work',
      value: displayedWorkItems.length,
      detail: displayedWorkItems.length > 0 ? 'Open exceptions in view' : 'No operational exceptions',
      tone: displayedWorkItems.length > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]',
      href: '#top-exceptions-list',
    },
    {
      label: 'Overdue Invoices',
      value: overdueInvoicesCount,
      detail: overdueInvoicesCount > 0 ? 'Payment follow-up needed' : 'No overdue invoices',
      tone: overdueInvoicesCount > 0 ? 'text-[var(--error)]' : 'text-[var(--success)]',
      href: '/dashboard/invoices?status=OVERDUE',
    },
    {
      label: 'Pending Invoices',
      value: pendingInvoicesCount,
      detail: pendingInvoicesCount > 0 ? 'Awaiting payment or review' : 'No pending invoices',
      tone: pendingInvoicesCount > 0 ? 'text-[var(--warning)]' : 'text-[var(--success)]',
      href: '/dashboard/invoices?status=PENDING',
    },
    {
      label: 'AI Failures',
      value: failedAiJobsCount,
      detail: failedAiJobsCount > 0 ? 'Check AI logs/settings' : 'AI jobs healthy',
      tone: failedAiJobsCount > 0 ? 'text-[var(--error)]' : 'text-[var(--success)]',
      href: '/dashboard/ai-logs',
    },
  ];

  const focusCards = useMemo(() => {
    if (perspective === 'finance') {
      return [baseFocusCards[1], baseFocusCards[2], baseFocusCards[0], baseFocusCards[3]];
    }
    return baseFocusCards;
  }, [baseFocusCards, perspective]);

  const handleOpenNotification = (e: React.MouseEvent, item: TodayWorkItem) => {
    e.preventDefault();
    e.stopPropagation();
    setNotificationPayload({
      vehicleDetails: item.title,
      vin: item.vin,
      trackingLink: typeof window !== 'undefined' ? `${window.location.origin}${item.href}` : item.href,
    });
  };

  const handleQuickPeek = (e: React.MouseEvent, item: TodayWorkItem) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.type === 'container' && item.containerId) {
      setPeekContainerId(item.containerId);
    } else if (item.shipmentId) {
      setPeekShipmentId(item.shipmentId);
    }
  };

  const activePerspectiveMeta = DASHBOARD_PERSPECTIVES.find((p) => p.id === perspective) || DASHBOARD_PERSPECTIVES[0];

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--text-primary)]">Priority Work</div>
          <div className="text-xs text-[var(--text-secondary)]">Urgent items, 1-click resolvers and role-adaptive workflows</div>
        </div>
        <Button href="/dashboard/shipments" variant="ghost" size="sm">
          Workbench
        </Button>
      </div>

      {/* Role Perspective Switcher Bar */}
      <RolePerspectiveSwitcher
        activePerspective={perspective}
        onChange={handlePerspectiveChange}
        className="mb-3"
      />

      {/* Interactive focus metrics */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {focusCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="group rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 transition-all hover:border-[var(--accent-gold)] hover:bg-[var(--panel)]"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
                {card.label}
              </span>
              <span className={`text-lg font-semibold tabular-nums ${card.tone}`}>{card.value}</span>
            </div>
            <div className="mt-0.5 text-[10px] text-[var(--text-secondary)] truncate">{card.detail}</div>
          </Link>
        ))}
      </div>

      {/* Urgent items list with 1-click inline resolvers */}
      <div className="mb-4" id="top-exceptions-list">
        <div className="mb-1.5 flex items-center justify-between flex-wrap gap-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)] flex items-center gap-1.5">
            <span>Exceptions ({displayedWorkItems.length})</span>
            {perspective !== 'all' && (
              <span 
                className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-normal uppercase"
                style={{ backgroundColor: activePerspectiveMeta.badgeBg, color: activePerspectiveMeta.color }}
              >
                {activePerspectiveMeta.shortLabel} Spotlight
              </span>
            )}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">1-Click quick actions available</span>
        </div>
        {displayedWorkItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-4 text-xs text-[var(--text-secondary)] text-center">
            No urgent operational exceptions for this view. All systems running smoothly.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] bg-[var(--panel)] text-sm shadow-sm overflow-hidden">
            {displayedWorkItems.slice(0, 4).map((item) => {
              const isHigh = item.severityLabel.toLowerCase().includes('high') || item.severityLabel.toLowerCase().includes('critical') || item.ageDays > 7;
              const hasShipmentOrContainer = Boolean(item.shipmentId || item.containerId);

              return (
                <div
                  key={item.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--background)] transition-all"
                >
                  {/* Left: Info */}
                  <Link
                    href={item.href}
                    className="flex min-w-0 items-center gap-3 flex-1"
                  >
                    <div className={`rounded-lg p-2 shrink-0 ${isHigh ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="truncate font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors">
                          {item.title}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          isHigh ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                        }`}>
                          {item.severityLabel}
                        </span>
                        {item.vin && (
                          <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                            <CopyButton value={item.vin} label="VIN" />
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-[var(--text-secondary)] mt-0.5">
                        {item.subtitle} • {item.detail}
                      </div>
                    </div>
                  </Link>

                  {/* Right: Inline 1-Click Action Resolvers */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--border)]">
                    <div className="text-right text-xs hidden lg:block mr-1">
                      <div className="font-semibold text-[var(--text-primary)]">{item.ageDays}d old</div>
                      <div className="text-[10px] text-[var(--text-secondary)]">Pending review</div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* 1. Quick Peek Drawer Trigger */}
                      {hasShipmentOrContainer && (
                        <JacxiButton
                          type="button"
                          variant="outline"
                          onClick={(e) => handleQuickPeek(e, item)}
                          title="Quick peek details in side drawer"
                          aria-label="Quick peek details in side drawer"
                          style={{ fontFamily: 'inherit' }}
                          className="!inline-flex !items-center !gap-1 !px-2 !py-1 !text-xs !rounded-lg !border !border-[var(--border)] !bg-transparent !text-[var(--text-secondary)] hover:!text-[var(--text-primary)] hover:!border-[var(--accent-gold)] hover:!bg-[var(--panel)] shadow-none transition-all cursor-pointer"
                        >
                          <PanelRightOpen className="h-3.5 w-3.5 text-[var(--accent-gold-text)]" />
                          <span className="hidden md:inline">Peek</span>
                        </JacxiButton>
                      )}

                      {/* 2. Contextual Action: Create transit, reassign dispatch, or track route */}
                      {item.type === 'released' && item.shipmentId && (
                        <Link
                          href={`/dashboard/transits/new?shipmentId=${item.shipmentId}`}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-[var(--accent-gold)] text-black font-semibold hover:opacity-90 transition-all shadow-xs"
                          title="Assign to final transit leg"
                        >
                          <Route className="h-3.5 w-3.5" />
                          <span>Transit Leg</span>
                        </Link>
                      )}

                      {item.type === 'dispatch' && (
                        <Link
                          href="/dashboard/dispatches"
                          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-500/20 transition-all"
                          title="Open Dispatch operations"
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>Dispatch Hub</span>
                        </Link>
                      )}

                      {item.type === 'container' && (
                        <Link
                          href={item.href}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-500/20 transition-all"
                          title="Track Ocean Route"
                        >
                          <Ship className="h-3.5 w-3.5" />
                          <span>Ocean Route</span>
                        </Link>
                      )}

                      {/* 3. Customer Notification / Nudge Modal */}
                      <JacxiButton
                        type="button"
                        variant="outline"
                        onClick={(e) => handleOpenNotification(e, item)}
                        title="Send SMS/WhatsApp notification or nudge"
                        aria-label="Send notification"
                        style={{ fontFamily: 'inherit' }}
                        className="!p-1.5 !text-xs !rounded-lg !border !border-[var(--border)] !bg-transparent !text-[var(--text-secondary)] hover:!text-[var(--text-primary)] hover:!border-[var(--border-hover)] hover:!bg-[var(--background)] shadow-none transition-all cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </JacxiButton>

                      {/* 4. Full Page Navigation */}
                      <Link
                        href={item.href}
                        className="flex items-center justify-center p-1 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent-gold)] hover:border-[var(--accent-gold)] transition-all"
                        title="Open full page"
                        aria-label="Open full page"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick actions - horizontal compact row */}
      <div>
        <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
          Quick actions
        </div>
        <div className="flex flex-wrap gap-2">
          {visibleQuickActions.map((action) => (
            <Button
              key={action.href}
              href={action.href}
              variant="outline"
              size="sm"
              icon={action.icon}
              className="text-xs"
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Recent activity - very compact */}
      {recentActivity.length > 0 && (
        <div className="mt-4 border-t border-[var(--border)] pt-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-secondary)]">
            Recent activity
          </div>
          <div className="space-y-1 text-xs">
            {recentActivity.slice(0, 3).map((activity) => (
              <Link
                key={activity.id}
                href={activity.href}
                className="flex min-h-[32px] items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors py-1.5"
              >
                <Bot className="h-3 w-3 text-[var(--accent-gold)] shrink-0" />
                <span className="truncate">{activity.label}: {activity.description}</span>
                <span className="ml-auto shrink-0 text-[10px] opacity-60">{formatActivityTime(activity.timestamp)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Drawers & Modals for 1-Click Operations */}
      <ShipmentQuickPeek
        shipmentId={peekShipmentId}
        open={Boolean(peekShipmentId)}
        onClose={() => setPeekShipmentId(null)}
      />

      <ContainerQuickPeek
        containerId={peekContainerId}
        open={Boolean(peekContainerId)}
        onClose={() => setPeekContainerId(null)}
      />

      {notificationPayload && (
        <CustomerNotificationModal
          open={Boolean(notificationPayload)}
          onClose={() => setNotificationPayload(null)}
          payload={notificationPayload}
        />
      )}
    </div>
  );
}
