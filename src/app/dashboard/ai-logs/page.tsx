'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { JXBox } from '@jacxishippingorg/jx-ui-react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertTriangle, Bot, Clock, Filter, RefreshCcw, Search as SearchIcon, ShieldCheck, XCircle } from 'lucide-react';
import { Button, DashboardPageSkeleton, EmptyState, FormField, Modal, PageHeader, Select, StatsCard, StatusBadge, toast } from '@/components/design-system';
import { DashboardGrid, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { DataTable, Column } from '@/components/ui/DataTable';
import { hasPermission } from '@/lib/rbac';

type AiLog = {
  id: string;
  feature: string;
  entityType: string | null;
  entityId: string | null;
  actorUserId: string | null;
  provider: string;
  model: string | null;
  prompt: string;
  response: string | null;
  requestPayload: unknown;
  responsePayload: unknown;
  status: string;
  createdAt: string;
};

const truncateText = (value: string | null | undefined, length: number) => {
  if (!value) return 'N/A';
  return value.length > length ? `${value.slice(0, length)}...` : value;
};

const quickFilters = [
  { id: 'all', label: 'All activity' },
  { id: 'attention', label: 'Needs attention' },
  { id: 'fallbacks', label: 'Fallbacks' },
  { id: 'tokenrouter', label: 'TokenRouter' },
] as const;

type QuickFilter = (typeof quickFilters)[number]['id'];

function getPayloadValue(payload: unknown, key: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const value = (payload as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getLogFailureReason(log: AiLog) {
  const payloadReason =
    getPayloadValue(log.responsePayload, 'error') ||
    getPayloadValue(log.responsePayload, 'failureReason') ||
    getPayloadValue(log.responsePayload, 'message');

  if (payloadReason) return payloadReason;
  if (log.status !== 'SUCCESS' && log.response) return log.response;
  if (log.provider === 'rules') return 'Rules fallback was used instead of the live AI provider.';
  return null;
}

function formatFeatureLabel(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function AiLogsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feature, setFeature] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [selectedLog, setSelectedLog] = useState<AiLog | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');

  const canViewAiLogs = hasPermission(session?.user?.role, 'shipments:read_all');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (feature.trim()) params.set('feature', feature.trim());
      if (entityType.trim()) params.set('entityType', entityType.trim());
      if (entityId.trim()) params.set('entityId', entityId.trim());
      params.set('limit', '100');

      const response = await fetch(`/api/ai/logs?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to load AI logs');
      }
      setLogs(payload.logs || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load AI logs');
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, feature]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canViewAiLogs) {
      router.replace('/dashboard');
      return;
    }
    void fetchLogs();
  }, [canViewAiLogs, fetchLogs, router, session, status]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchLogs();
    } finally {
      setRefreshing(false);
    }
  };

  const stats = useMemo(() => {
    const tokenRouterCount = logs.filter((log) => log.provider === 'tokenrouter-ai').length;
    const fallbackCount = logs.filter((log) => log.provider === 'rules').length;
    const failedCount = logs.filter((log) => log.status !== 'SUCCESS').length;
    const latestFailure = logs.find((log) => log.status !== 'SUCCESS' || log.provider === 'rules') || null;
    const featureCount = new Set(logs.map((log) => log.feature)).size;

    return {
      total: logs.length,
      tokenRouterCount,
      fallbackCount,
      failedCount,
      featureCount,
      latestFailure,
    };
  }, [logs]);

  const featureOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.feature))).sort((a, b) => a.localeCompare(b)),
    [logs],
  );

  const visibleLogs = useMemo(() => {
    switch (quickFilter) {
      case 'attention':
        return logs.filter((log) => log.status !== 'SUCCESS' || log.provider === 'rules');
      case 'fallbacks':
        return logs.filter((log) => log.provider === 'rules');
      case 'tokenrouter':
        return logs.filter((log) => log.provider === 'tokenrouter-ai');
      default:
        return logs;
    }
  }, [logs, quickFilter]);

  const aiLogColumns = useMemo<Column<AiLog>[]>(
    () => [
      {
        key: 'feature',
        header: 'Feature',
        sortable: true,
        render: (_, log) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', fontWeight: 600}}>{formatFeatureLabel(log.feature)}</p>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{log.model || 'N/A'}</p>
          </JXBox>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        render: (_, log) => (
          // Round 3 C-1: badges inside tables are sm everywhere (dense
          // context); md is reserved for headers/panels.
          <StatusBadge
            size="sm"
            status={log.status === 'SUCCESS' ? 'success' : log.status === 'FALLBACK' ? 'warning' : 'error'}
          />
        ),
      },
      {
        key: 'provider',
        header: 'Provider',
        sortable: true,
        render: (_, log) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', fontWeight: 600}}>{log.provider}</p>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.72rem', color: 'var(--text-secondary)'}}>
              {log.provider === 'rules' ? 'Fallback' : 'Live provider'}
            </p>
          </JXBox>
        ),
      },
      {
        key: 'entityType',
        header: 'Entity',
        render: (_, log) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem'}}>{log.entityType || 'N/A'}</p>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{truncateText(log.entityId, 18)}</p>
          </JXBox>
        ),
      },
      {
        key: 'createdAt',
        header: 'Created',
        sortable: true,
        render: (_, log) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem'}}>{new Date(log.createdAt).toLocaleDateString()}</p>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.72rem', color: 'var(--text-secondary)'}}>{new Date(log.createdAt).toLocaleTimeString()}</p>
          </JXBox>
        ),
      },
      {
        key: 'reason' as unknown as keyof AiLog,
        header: 'Reason',
        render: (_, log) => {
          const reason = getLogFailureReason(log);
          return reason ? (
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '6px', alignItems: 'flex-start', maxWidth: '260px'}}>
              {log.provider === 'rules' ? <Clock className="w-4 h-4 text-[var(--warning)]" /> : <AlertTriangle className="w-4 h-4 text-[var(--error)]" />}
              <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', color: log.provider === 'rules' ? 'var(--warning)' : 'var(--error)'}}>
                {truncateText(reason, 120)}
              </p>
            </JXBox>
          ) : (
            <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', color: 'var(--text-secondary)'}}>No issue reported</p>
          );
        },
      },
      {
        key: 'prompt',
        header: 'Prompt',
        render: (_, log) => (
          <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{truncateText(log.prompt, 90)}</p>
        ),
      },
      {
        key: 'actions' as unknown as keyof AiLog,
        header: 'Action',
        align: 'right',
        render: (_, log) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'flex-end'}} onClick={(e) => e.stopPropagation()}>
            <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
              View
            </Button>
          </JXBox>
        ),
      },
    ],
    [],
  );

  const clearFilters = () => {
    setFeature('');
    setEntityType('');
    setEntityId('');
    setQuickFilter('all');
  };

  if (status === 'loading' || loading) {
    return <DashboardPageSkeleton />;
  }

  return (
    <DashboardSurface>
      <PageHeader
        showBreadcrumbs
        title="AI Interaction Logs"
        description="Browse prompt and response traces for dashboard briefs, shipment drafts, and extraction workflows."
        actions={
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            <Button variant="outline" size="sm" onClick={clearFilters} icon={<XCircle className="w-4 h-4" />}>
              Clear Filters
            </Button>
            <Button variant="secondary" size="sm" onClick={handleRefresh} icon={<RefreshCcw className="w-4 h-4" />} loading={refreshing}>
              Refresh Logs
            </Button>
          </JXBox>
        }
      />

      <DashboardPanel
        title="Filter AI Activity"
        description="Filter by feature domain, entity type, or review reason"
      >
        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px'}}>
          {quickFilters.map((filter) => (
            <Button
              key={filter.id}
              variant={quickFilter === filter.id ? 'primary' : 'outline'}
              size="sm"
              icon={<Filter className="w-4 h-4" />}
              onClick={() => setQuickFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </JXBox>

        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px', marginBottom: '24px'}} className="grid-cols-1 md:grid-cols-3">
          <Select label="Feature" options={[{ value: "", label: 'All' }, ...featureOptions.map((option) => ({ value: option, label: formatFeatureLabel(option) }))]} value={feature} size="small" onChange={(val) => setFeature(val as string)} />
          <Select label="Entity Type" options={[{ value: "", label: 'All' }, { value: "SHIPMENT", label: 'Shipment' }, { value: "CONTAINER", label: 'Container' }, { value: "DOCUMENT", label: 'Document' }]} value={entityType} size="small" onChange={(val) => setEntityType(val as string)} />
          <FormField label="Entity ID" value={entityId} onChange={(event) => setEntityId(event.target.value)} placeholder="Filter by exact entity id" leftIcon={<SearchIcon className="mr-2 h-4 w-4 text-[var(--text-secondary)]" />} size="small" />
        </JXBox>

        <DashboardGrid className="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Total Logs" value={stats.total} icon={<Bot className="w-5 h-5" />} variant="default" />
          <StatsCard title="TokenRouter AI" value={stats.tokenRouterCount} icon={<ShieldCheck className="w-5 h-5" />} variant="success" />
          <StatsCard title="Fallback Runs" value={stats.fallbackCount} icon={<Bot className="w-5 h-5" />} variant="warning" />
          <StatsCard title="Non-Success Status" value={stats.failedCount} icon={<AlertTriangle className="w-5 h-5" />} variant="error" />
        </DashboardGrid>

        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '24px', display: 'grid', gap: '16px'}} className="grid-cols-1 grid lg:grid-cols-[1.25fr_0.75fr]">
          <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', backgroundColor: 'var(--background)'}}>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px'}}>
              Current View
            </p>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)'}}>
              Showing {visibleLogs.length} of {logs.length} logs
            </p>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
              {stats.featureCount} feature areas in the latest activity. Use quick filters for live provider runs, fallbacks, or logs needing review.
            </p>
          </JXBox>

          <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: stats.latestFailure ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border)', backgroundColor: stats.latestFailure ? 'rgba(245, 158, 11, 0.08)' : 'var(--background)'}}>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '6px'}}>
              Latest Attention Item
            </p>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)'}}>
              {stats.latestFailure ? formatFeatureLabel(stats.latestFailure.feature) : 'No issues in the latest logs'}
            </p>
            <p className="text-sm leading-relaxed" style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
              {stats.latestFailure ? truncateText(getLogFailureReason(stats.latestFailure), 150) : 'TokenRouter and fallback activity will appear here when review is needed.'}
            </p>
          </JXBox>
        </JXBox>
      </DashboardPanel>

      <DashboardPanel title="Recent AI Activity" description="Latest persisted interactions matching your filters">
        <DataTable
          data={visibleLogs}
          columns={aiLogColumns}
          keyField="id"
          onRowClick={(log) => setSelectedLog(log)}
        />
      </DashboardPanel>

      {/* Modal Inspector */}
      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        size="lg"
        title="AI Interaction Log Trace"
        description={selectedLog ? `${formatFeatureLabel(selectedLog.feature)} • ${selectedLog.provider}` : undefined}
        actions={
          <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
            Close
          </Button>
        }
      >
        {selectedLog && (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px'}} className="grid-cols-1 md:grid-cols-3">
              <JXBox padding="none" border={false} style={{padding: '12px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>Status</p>
                <StatusBadge status={selectedLog.status === 'SUCCESS' ? 'success' : selectedLog.status === 'FALLBACK' ? 'warning' : 'error'} />
              </JXBox>
              <JXBox padding="none" border={false} style={{padding: '12px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>Provider</p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.88rem', fontWeight: 700}}>{selectedLog.provider}</p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{selectedLog.model || 'No model recorded'}</p>
              </JXBox>
              <JXBox padding="none" border={false} style={{padding: '12px', border: '1px solid var(--border)', borderRadius: '16px', backgroundColor: 'var(--background)'}}>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>Created</p>
                <p className="text-sm leading-relaxed" style={{fontSize: '0.88rem', fontWeight: 700}}>{new Date(selectedLog.createdAt).toLocaleString()}</p>
              </JXBox>
            </JXBox>
            {getLogFailureReason(selectedLog) && (
              <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '16px', border: '1px solid rgba(245, 158, 11, 0.35)', backgroundColor: 'rgba(245, 158, 11, 0.08)', display: 'flex', gap: '8px', alignItems: 'flex-start'}}>
                <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(180, 83, 9)', marginTop: 2 }} />
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'rgb(146, 64, 14)', marginBottom: '4px'}}>
                    Review reason
                  </p>
                  <p className="text-sm leading-relaxed" style={{fontSize: '0.85rem', color: 'rgb(146, 64, 14)'}}>
                    {getLogFailureReason(selectedLog)}
                  </p>
                </JXBox>
              </JXBox>
            )}
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>Prompt</p>
              <JXBox padding="none" border={false} component="pre" style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', padding: '16px', backgroundColor: 'var(--background)', borderRadius: '16px', border: '1px solid var(--border)', maxHeight: '200px', overflowY: 'auto'}}>
                {selectedLog.prompt}
              </JXBox>
            </JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>Response</p>
              <JXBox padding="none" border={false} component="pre" style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', padding: '16px', backgroundColor: 'var(--background)', borderRadius: '16px', border: '1px solid var(--border)', maxHeight: '200px', overflowY: 'auto'}}>
                {selectedLog.response || 'N/A'}
              </JXBox>
            </JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>Request Payload</p>
              <JXBox padding="none" border={false} component="pre" style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', padding: '16px', backgroundColor: 'var(--background)', borderRadius: '16px', border: '1px solid var(--border)', maxHeight: '160px', overflowY: 'auto'}}>
                {JSON.stringify(selectedLog.requestPayload, null, 2)}
              </JXBox>
            </JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <p className="text-sm leading-relaxed" style={{fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '4px'}}>Response Payload</p>
              <JXBox padding="none" border={false} component="pre" style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.8rem', padding: '16px', backgroundColor: 'var(--background)', borderRadius: '16px', border: '1px solid var(--border)', maxHeight: '160px', overflowY: 'auto'}}>
                {JSON.stringify(selectedLog.responsePayload, null, 2)}
              </JXBox>
            </JXBox>
          </JXBox>
        )}
      </Modal>
    </DashboardSurface>
  );
}
