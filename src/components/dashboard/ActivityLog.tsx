'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { 
  ArrowRight,
  BadgeDollarSign,
  FileText, 
  CheckCircle, 
  Container,
  RefreshCw,
  Search,
  User, 
  Edit, 
  Plus, 
  Trash 
} from 'lucide-react';

interface LogEntry {
  id: string;
  action: string;
  description: string;
  performedBy: string;
  timestamp: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: unknown;
}

interface ActivityLogProps {
  logs: LogEntry[];
}

type ActivityCategory = 'all' | 'status' | 'assignment' | 'payment' | 'invoice' | 'other';
type ActivityDateRange = 'all' | 'today' | '7d' | '30d';

export function ActivityLog({ logs }: ActivityLogProps) {
  const pathname = usePathname();
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('all');
  const [selectedDateRange, setSelectedDateRange] = useState<ActivityDateRange>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const storageKey = `activity-log:${pathname}`;

  const normalizeAction = (action: string) => action.trim().replace(/[\s-]+/g, '_').toUpperCase();
  const getMetadataRecord = (metadata: unknown): Record<string, unknown> | null => {
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
      return null;
    }

    return metadata as Record<string, unknown>;
  };

  const getActionCategory = (action: string): ActivityCategory => {
    switch (normalizeAction(action)) {
      case 'STATUS_CHANGE':
        return 'status';
      case 'CONTAINER_ASSIGNED':
      case 'CONTAINER_REMOVED':
      case 'USER_REASSIGNED':
      case 'SHIPMENT_ADDED':
      case 'SHIPMENT_REMOVED':
        return 'assignment';
      case 'PAYMENT_STATUS_UPDATED':
        return 'payment';
      case 'INVOICE_CREATED':
      case 'INVOICE_REFRESHED':
      case 'SUPPLEMENTAL_INVOICE_CREATED':
      case 'CREDIT_NOTE_CREATED':
      case 'INVOICE_UPDATED':
        return 'invoice';
      default:
        return 'other';
    }
  };

  const getActionMeta = (action: string) => {
    switch (normalizeAction(action)) {
      case 'CONTAINER_ASSIGNED':
        return {
          label: 'Container Assigned',
          color: 'rgba(34, 197, 94, 0.12)',
          textColor: 'rgb(34, 197, 94)',
        };
      case 'CONTAINER_REMOVED':
        return {
          label: 'Container Removed',
          color: 'rgba(239, 68, 68, 0.12)',
          textColor: 'rgb(239, 68, 68)',
        };
      case 'PAYMENT_STATUS_UPDATED':
        return {
          label: 'Payment Status',
          color: 'rgba(59, 130, 246, 0.12)',
          textColor: 'rgb(59, 130, 246)',
        };
      case 'INVOICE_REFRESHED':
        return {
          label: 'Invoice Refreshed',
          color: 'rgba(14, 165, 233, 0.12)',
          textColor: 'rgb(14, 165, 233)',
        };
      case 'INVOICE_CREATED':
        return {
          label: 'Invoice Created',
          color: 'rgba(34, 197, 94, 0.12)',
          textColor: 'rgb(34, 197, 94)',
        };
      case 'SUPPLEMENTAL_INVOICE_CREATED':
        return {
          label: 'Supplemental Invoice',
          color: 'rgba(59, 130, 246, 0.12)',
          textColor: 'rgb(29, 78, 216)',
        };
      case 'CREDIT_NOTE_CREATED':
        return {
          label: 'Credit Note',
          color: 'rgba(245, 158, 11, 0.12)',
          textColor: 'rgb(180, 83, 9)',
        };
      case 'INVOICE_UPDATED':
        return {
          label: 'Invoice Updated',
          color: 'rgba(59, 130, 246, 0.12)',
          textColor: 'rgb(59, 130, 246)',
        };
      case 'STATUS_CHANGE':
        return {
          label: 'Status Changed',
          color: 'rgba(var(--accent-gold-rgb), 0.14)',
          textColor: 'var(--accent-gold)',
        };
      case 'USER_REASSIGNED':
        return {
          label: 'Owner Reassigned',
          color: 'rgba(16, 185, 129, 0.12)',
          textColor: 'rgb(16, 185, 129)',
        };
      case 'SHIPMENT_ADDED':
        return {
          label: 'Shipment Added',
          color: 'rgba(34, 197, 94, 0.12)',
          textColor: 'rgb(34, 197, 94)',
        };
      case 'SHIPMENT_REMOVED':
        return {
          label: 'Shipment Removed',
          color: 'rgba(239, 68, 68, 0.12)',
          textColor: 'rgb(239, 68, 68)',
        };
      case 'ETA_UPDATED':
        return {
          label: 'ETA Updated',
          color: 'rgba(14, 165, 233, 0.12)',
          textColor: 'rgb(14, 165, 233)',
        };
      case 'EXPENSE_ADDED':
        return {
          label: 'Expense Added',
          color: 'rgba(59, 130, 246, 0.12)',
          textColor: 'rgb(59, 130, 246)',
        };
      default:
        return {
          label: action.replace(/[_-]/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()),
          color: 'rgba(148, 163, 184, 0.12)',
          textColor: 'rgb(148, 163, 184)',
        };
    }
  };

  const getIcon = (action: string) => {
    switch (normalizeAction(action)) {
      case 'CONTAINER_ASSIGNED':
      case 'SHIPMENT_ADDED':
      case 'SHIPMENTS_ASSIGNED':
        return <Container className="w-4 h-4 text-green-500" />;
      case 'CREATE':
      case 'INVOICE_CREATED':
      case 'SUPPLEMENTAL_INVOICE_CREATED':
      case 'CREDIT_NOTE_CREATED':
      case 'USER_REASSIGNED':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'INVOICE_UPDATED':
      case 'INVOICE_REFRESHED':
        return <RefreshCw className="w-4 h-4 text-sky-500" />;
      case 'UPDATE':
      case 'PAYMENT_STATUS_UPDATED':
      case 'ETA_UPDATED':
      case 'EXPENSE_ADDED':
        return <BadgeDollarSign className="w-4 h-4 text-blue-500" />;
      case 'STATUS_CHANGE':
        return <CheckCircle className="w-4 h-4 text-[var(--accent-gold)]" />;
      case 'DELETE':
      case 'CONTAINER_REMOVED':
      case 'SHIPMENT_REMOVED':
        return <Trash className="w-4 h-4 text-red-500" />;
      default:
        return <Edit className="w-4 h-4 text-blue-500" />;
    }
  };

  const getDateRangeLabel = (range: ActivityDateRange) => {
    switch (range) {
      case 'today':
        return 'Today';
      case '7d':
        return '7 Days';
      case '30d':
        return '30 Days';
      default:
        return 'All Time';
    }
  };

  const isLogInDateRange = (timestamp: string, range: ActivityDateRange) => {
    if (range === 'all') {
      return true;
    }

    const logDate = new Date(timestamp);
    const now = new Date();

    if (range === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return logDate >= startOfToday;
    }

    const dayCount = range === '7d' ? 7 : 30;
    const threshold = new Date(now);
    threshold.setDate(now.getDate() - dayCount);
    return logDate >= threshold;
  };

  const getMetadataSubtitles = (log: LogEntry) => {
    const metadata = getMetadataRecord(log.metadata);
    if (!metadata) {
      return [] as string[];
    }

    const subtitles: string[] = [];
    const newContainerId = typeof metadata.newContainerId === 'string' ? metadata.newContainerId : null;
    const oldContainerId = typeof metadata.oldContainerId === 'string' ? metadata.oldContainerId : null;
    const containerNumber = typeof metadata.containerNumber === 'string' ? metadata.containerNumber : null;
    const newContainerNumber = typeof metadata.newContainerNumber === 'string' ? metadata.newContainerNumber : null;
    const oldContainerNumber = typeof metadata.oldContainerNumber === 'string' ? metadata.oldContainerNumber : null;
    const oldUserLabel = typeof metadata.oldUserLabel === 'string' ? metadata.oldUserLabel : null;
    const newUserLabel = typeof metadata.newUserLabel === 'string' ? metadata.newUserLabel : null;
    const paymentSource = typeof metadata.paymentSource === 'string'
      ? metadata.paymentSource
      : typeof metadata.expenseSource === 'string'
      ? metadata.expenseSource
      : typeof metadata.source === 'string'
      ? metadata.source
      : null;
    const updatedFields = Array.isArray(metadata.updatedFields)
      ? metadata.updatedFields.filter((value): value is string => typeof value === 'string')
      : [];
    const shipmentIds = Array.isArray(metadata.shipmentIds)
      ? metadata.shipmentIds.filter((value): value is string => typeof value === 'string')
      : [];

    if (oldContainerNumber || newContainerNumber) {
      subtitles.push(`Container change: ${oldContainerNumber || oldContainerId || 'Unassigned'} -> ${newContainerNumber || newContainerId || 'Unassigned'}`);
    } else if (containerNumber) {
      subtitles.push(`Container: ${containerNumber}`);
    } else if (newContainerId || oldContainerId) {
      subtitles.push(`Container target: ${newContainerId || oldContainerId}`);
    }

    if (oldUserLabel || newUserLabel) {
      subtitles.push(`Customer change: ${oldUserLabel || 'Unassigned'} -> ${newUserLabel || 'Unassigned'}`);
    }

    if (paymentSource) {
      subtitles.push(`Source: ${paymentSource.replace(/_/g, ' ')}`);
    }

    if (updatedFields.length > 0) {
      subtitles.push(`Fields: ${updatedFields.join(', ')}`);
    }

    if (shipmentIds.length > 0) {
      subtitles.push(`Shipments affected: ${shipmentIds.length}`);
    }

    return subtitles;
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const categoryLabels: Record<ActivityCategory, string> = {
    all: 'All',
    status: 'Status',
    assignment: 'Assignment',
    payment: 'Payment',
    invoice: 'Invoice',
    other: 'Other',
  };

  const availableCategories = useMemo(() => {
    const categories = new Set<ActivityCategory>(['all']);
    for (const log of logs) {
      categories.add(getActionCategory(log.action));
    }

    return Array.from(categories);
  }, [logs]);

  useEffect(() => {
    if (!availableCategories.includes(selectedCategory)) {
      setSelectedCategory('all');
    }
  }, [availableCategories, selectedCategory]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedValue = window.localStorage.getItem(storageKey);
    if (!savedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(savedValue) as {
        selectedCategory?: ActivityCategory;
        selectedDateRange?: ActivityDateRange;
        searchTerm?: string;
      };

      if (parsed.selectedCategory) {
        setSelectedCategory(parsed.selectedCategory);
      }

      if (parsed.selectedDateRange) {
        setSelectedDateRange(parsed.selectedDateRange);
      }

      if (typeof parsed.searchTerm === 'string') {
        setSearchTerm(parsed.searchTerm);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        selectedCategory,
        selectedDateRange,
        searchTerm,
      })
    );
  }, [searchTerm, selectedCategory, selectedDateRange, storageKey]);

  const filteredLogs = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      const categoryMatches = selectedCategory === 'all' || getActionCategory(log.action) === selectedCategory;
      const dateMatches = isLogInDateRange(log.timestamp, selectedDateRange);
      if (!categoryMatches || !dateMatches) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const actionLabel = getActionMeta(log.action).label;
      const subtitles = getMetadataSubtitles(log);
      const searchableText = [
        actionLabel,
        log.description,
        log.performedBy,
        log.oldValue || '',
        log.newValue || '',
        ...subtitles,
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [logs, searchTerm, selectedCategory, selectedDateRange]);

  const renderValuePill = (value: string | null | undefined, variant: 'old' | 'new') => {
    if (!value) {
      return null;
    }

    return (
      <span style={{height: 24, fontSize: '0.72rem', fontWeight: 600, backgroundColor: variant === 'old' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 197, 94, 0.08)', color: variant === 'old' ? 'rgb(248, 113, 113)' : 'rgb(74, 222, 128)', border: variant === 'old' ? '1px solid rgba(248, 113, 113, 0.18)' : '1px solid rgba(74, 222, 128, 0.18)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{value}</span>
    );
  };

  return (
    <div>
      <h6 style={{fontWeight: 600, marginBottom: '16px'}} className="text-[0.95rem] font-semibold leading-tight">
        Activity Log
      </h6>

      {availableCategories.length > 1 && (
        <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px'}}>
          {availableCategories.map((category) => (
            <button type="button" key={category} onClick={() => setSelectedCategory(category)} style={{fontWeight: 600, backgroundColor: selectedCategory === category ? 'rgba(var(--accent-gold-rgb), 0.14)' : 'transparent', color: selectedCategory === category ? 'var(--accent-gold)' : 'var(--text-secondary)', borderColor: selectedCategory === category ? 'rgba(var(--accent-gold-rgb), 0.28)' : 'var(--border)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-xs px-2.5 py-1 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`${categoryLabels[category]}${category === 'all' ? ` (${logs.length})` : ` (${logs.filter((log) => getActionCategory(log.action) === category).length})`}`}</button>
          ))}
        </div>
      )}

      <div style={{marginBottom: '16px'}}><div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]"><Search className="mr-2 h-4 w-4 text-[var(--text-secondary)]" /></span><input placeholder="Search actor, status, invoice fields, or container reference" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} className="ds-form-field-control w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] px-2.5 py-1.5 text-[0.8125rem] pl-9 border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]" /></div></div>

      <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px'}}>
        {(['all', 'today', '7d', '30d'] as ActivityDateRange[]).map((range) => (
          <button type="button" key={range} onClick={() => setSelectedDateRange(range)} style={{fontWeight: 600, backgroundColor: selectedDateRange === range ? 'rgba(59, 130, 246, 0.14)' : 'transparent', color: selectedDateRange === range ? 'rgb(96, 165, 250)' : 'var(--text-secondary)', borderColor: selectedDateRange === range ? 'rgba(96, 165, 250, 0.28)' : 'var(--border)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-xs px-2.5 py-1 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{getDateRangeLabel(range)}</button>
        ))}
      </div>
      
      {filteredLogs.length === 0 ? (
        <p style={{color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.875rem'}}>
          {logs.length === 0 ? 'No activity recorded yet.' : 'No activity matches the selected filter.'}
        </p>
      ) : (
        <ul style={{backgroundColor: 'var(--panel)', borderRadius: '16px', border: '1px solid var(--border)', paddingTop: '0px', paddingBottom: '0px'}} className="list-none">
          {filteredLogs.map((log, index) => (
            (() => {
              const actionMeta = getActionMeta(log.action);
              const subtitles = getMetadataSubtitles(log);
              return (
            <li key={log.id} style={{borderBottom: index < filteredLogs.length - 1 ? '1px solid var(--border)' : 'none', paddingTop: '12px', paddingBottom: '12px'}}>
              <span style={{minWidth: 36}} className="flex shrink-0 items-center justify-center text-[var(--text-secondary)]">
                {getIcon(log.action)}
              </span>
              <div><span className="block text-[0.875rem] font-medium text-[var(--text-primary)]">{
                  <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                      <span style={{height: 22, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em', backgroundColor: actionMeta.color, color: actionMeta.textColor, border: '1px solid rgba(255,255,255,0.06)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{actionMeta.label}</span>
                    </div>
                    <p style={{color: 'var(--text-primary)', fontWeight: 500}} className="text-[0.875rem]">
                      {log.description}
                    </p>
                    {subtitles.length > 0 && (
                      <div style={{display: 'flex', flexDirection: 'column', gap: '3.2px'}}>
                        {subtitles.map((subtitle) => (
                          <span key={subtitle} style={{color: 'var(--text-secondary)'}} className="text-[0.75rem]">
                            {subtitle}
                          </span>
                        ))}
                      </div>
                    )}
                    {(log.oldValue || log.newValue) && (
                      <div style={{display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap'}}>
                        <span style={{color: 'var(--text-secondary)', fontWeight: 700}} className="text-[0.75rem]">
                          Change
                        </span>
                        {renderValuePill(log.oldValue, 'old')}
                        <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />
                        {renderValuePill(log.newValue, 'new')}
                      </div>
                    )}
                  </div>
                }</span><span className="block text-[0.75rem] text-[var(--text-secondary)]">{
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px'}}>
                    <User className="w-3 h-3 text-[var(--text-secondary)]" />
                    <span className="text-[0.75rem]" style={{color: 'var(--text-secondary)'}}>
                      {log.performedBy}
                    </span>
                    <span className="text-[0.75rem]" style={{color: 'var(--text-secondary)'}}>
                      • {formatTime(log.timestamp)}
                    </span>
                  </div>
                }</span></div>
            </li>
              );
            })()
          ))}
        </ul>
      )}
    </div>
  );
}

