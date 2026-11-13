'use client';

import { useMemo, useState } from 'react';
import { ArrowRight, BadgeDollarSign, MapPin, Search, ShipWheel, Truck, Warehouse, CheckCircle2, Clock, AlertCircle, Package, Anchor, FileText, DollarSign, User } from 'lucide-react';
import type { UnifiedShipmentTimelineItem } from '@/lib/shipment-timeline';

type TimelineFilter = 'ALL' | UnifiedShipmentTimelineItem['category'];

type UnifiedShipmentTimelineProps = {
  items: UnifiedShipmentTimelineItem[];
  onOpenCompanyLedgerEntry?: (companyId: string, entryId: string) => void;
};

const filterLabels: Record<TimelineFilter, string> = {
  ALL: 'All',
  STATUS_CHANGE: 'Status',
  WORKFLOW_EVENT: 'Workflow',
  TRACKING_EVENT: 'Tracking',
  EXPENSE: 'Expenses',
  FINANCIAL: 'Financial',
  DAMAGE: 'Damage',
};

const sourceStyles: Record<UnifiedShipmentTimelineItem['source'], { bg: string; color: string; border: string; dotColor: string }> = {
  SHIPMENT: { bg: 'rgba(59, 130, 246, 0.12)', color: 'rgb(29, 78, 216)', border: 'rgba(59, 130, 246, 0.24)', dotColor: '#3b82f6' },
  DISPATCH: { bg: 'rgba(234, 179, 8, 0.14)', color: 'rgb(161, 98, 7)', border: 'rgba(234, 179, 8, 0.28)', dotColor: '#eab308' },
  CONTAINER: { bg: 'rgba(99, 102, 241, 0.14)', color: 'rgb(67, 56, 202)', border: 'rgba(99, 102, 241, 0.26)', dotColor: '#6366f1' },
  TRANSIT: { bg: 'rgba(20, 184, 166, 0.14)', color: 'rgb(13, 148, 136)', border: 'rgba(20, 184, 166, 0.28)', dotColor: '#14b8a6' },
  CUSTOMER_LEDGER: { bg: 'rgba(239, 68, 68, 0.12)', color: 'rgb(185, 28, 28)', border: 'rgba(239, 68, 68, 0.24)', dotColor: '#ef4444' },
  COMPANY_LEDGER: { bg: 'rgba(34, 197, 94, 0.12)', color: 'rgb(21, 128, 61)', border: 'rgba(34, 197, 94, 0.24)', dotColor: '#22c55e' },
};

const categoryDotColors: Record<string, string> = {
  STATUS_CHANGE: '#3b82f6',
  WORKFLOW_EVENT: '#eab308',
  TRACKING_EVENT: '#6366f1',
  EXPENSE: '#ef4444',
  FINANCIAL: '#22c55e',
  DAMAGE: '#f97316',
};

function getItemIcon(item: UnifiedShipmentTimelineItem) {
  if (item.source === 'DISPATCH' || item.source === 'TRANSIT') {
    return <Truck className="h-4 w-4" />;
  }

  if (item.source === 'CONTAINER') {
    return item.category === 'TRACKING_EVENT' ? <ShipWheel className="h-4 w-4" /> : <Warehouse className="h-4 w-4" />;
  }

  if (item.category === 'EXPENSE' || item.category === 'FINANCIAL') {
    return <BadgeDollarSign className="h-4 w-4" />;
  }

  if (item.category === 'STATUS_CHANGE') {
    return <CheckCircle2 className="h-4 w-4" />;
  }

  if (item.category === 'DAMAGE') {
    return <AlertCircle className="h-4 w-4" />;
  }

  return <ArrowRight className="h-4 w-4" />;
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'STATUS_CHANGE': return <CheckCircle2 className="h-3 w-3" />;
    case 'WORKFLOW_EVENT': return <Clock className="h-3 w-3" />;
    case 'TRACKING_EVENT': return <MapPin className="h-3 w-3" />;
    case 'EXPENSE': return <DollarSign className="h-3 w-3" />;
    case 'FINANCIAL': return <FileText className="h-3 w-3" />;
    case 'DAMAGE': return <AlertCircle className="h-3 w-3" />;
    default: return <Package className="h-3 w-3" />;
  }
}

export default function UnifiedShipmentTimeline({ items, onOpenCompanyLedgerEntry }: UnifiedShipmentTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>('ALL');
  const [query, setQuery] = useState('');

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      if (filter !== 'ALL' && item.category !== filter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        item.title,
        item.description,
        item.actorLabel || '',
        item.location || '',
        item.referenceLabel || '',
        item.status || '',
        item.oldValue || '',
        item.newValue || '',
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [filter, items, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
        <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]"><Search className="mr-2 h-4 w-4 text-[var(--text-secondary)]" /></span><input placeholder="Search timeline by stage, note, location, or ledger description" value={query} onChange={(event) => setQuery(event.target.value)} className="ds-form-field-control w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] px-2.5 py-1.5 text-[0.8125rem] pl-9 border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]" /></div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(filterLabels) as TimelineFilter[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                backgroundColor: filter === value ? 'rgba(var(--accent-gold-rgb), 0.16)' : 'var(--panel)',
                color: filter === value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                border: filter === value ? '1px solid rgba(var(--accent-gold-rgb), 0.32)' : '1px solid var(--border)',
              }}
            >
              {filterLabels[value]}
            </button>
          ))}
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-4 py-10 text-center text-sm text-[var(--text-secondary)]">
          No timeline entries match the current filter.
        </div>
      ) : (
        <div className="relative pl-8">
          {/* Vertical timeline line */}
          <span className="absolute left-3 top-0 h-full w-0.5 bg-gradient-to-b from-[var(--accent-gold)] via-[var(--border)] to-transparent" />
          <div className="space-y-3">
            {filteredItems.map((item, idx) => {
              const sourceStyle = sourceStyles[item.source];
              const dotColor = categoryDotColors[item.category] || sourceStyle.dotColor;
              const isLatest = idx === 0;

              return (
                <div key={item.id} className="relative group">
                  {/* Timeline dot with pulse on latest */}
                  <div className="absolute -left-8 top-4 flex items-center justify-center">
                    <span
                      className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 bg-[var(--panel)] transition-transform group-hover:scale-110"
                      style={{
                        borderColor: dotColor,
                        color: dotColor,
                      }}
                    >
                      {getItemIcon(item)}
                    </span>
                    {isLatest && (
                      <span
                        className="absolute inset-0 rounded-full animate-ping opacity-30"
                        style={{ backgroundColor: dotColor }}
                      />
                    )}
                  </div>

                  <div
                    className="rounded-xl border bg-[var(--panel)] p-4 transition-all group-hover:shadow-md"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Category badge with icon */}
                          <span
                            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            style={{
                              backgroundColor: sourceStyle.bg,
                              color: sourceStyle.color,
                            }}
                          >
                            {getCategoryIcon(item.category)}
                            {filterLabels[item.category]}
                          </span>
                          {/* Source badge */}
                          <span style={{height: 22, fontSize: '0.68rem', fontWeight: 700, backgroundColor: sourceStyle.bg, color: sourceStyle.color, border: `1px solid ${sourceStyle.border}`}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{item.source.replace(/_/g, ' ')}</span>
                          {/* Latest indicator */}
                          {isLatest && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Latest
                            </span>
                          )}
                        </div>
                        <p style={{marginTop: '12px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem'}}>
                          {item.title}
                        </p>
                        <p style={{marginTop: '4px', color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5}}>
                          {item.description}
                        </p>
                      </div>
                      <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontFamily: 'monospace'}}>
                        {new Date(item.occurredAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                      {item.referenceLabel && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-0.5">
                          <FileText className="h-3 w-3" />
                          <strong className="text-[var(--text-primary)]">{item.referenceLabel}</strong>
                        </span>
                      )}
                      {item.actorLabel && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <strong className="text-[var(--text-primary)]">{item.actorLabel}</strong>
                        </span>
                      )}
                      {item.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" />
                          <strong className="text-[var(--text-primary)]">{item.location}</strong>
                        </span>
                      )}
                      {typeof item.amount === 'number' && (
                        <span className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-0.5">
                          <DollarSign className="h-3 w-3" />
                          <strong className={item.amount >= 0 ? 'text-[var(--error)]' : 'text-[var(--success)]'}>
                            ${Math.abs(item.amount).toFixed(2)}
                          </strong>
                        </span>
                      )}
                    </div>

                    {(item.oldValue || item.newValue) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Change</span>
                        {item.oldValue && (
                          <span className="rounded-full border border-[var(--error)]/25 bg-[var(--error)]/10 px-2.5 py-0.5 text-[var(--error)] font-medium">
                            {item.oldValue}
                          </span>
                        )}
                        <ArrowRight className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                        {item.newValue && (
                          <span className="rounded-full border border-[var(--success)]/25 bg-[var(--success)]/10 px-2.5 py-0.5 text-[var(--success)] font-medium">
                            {item.newValue}
                          </span>
                        )}
                      </div>
                    )}

                    {item.companyId && item.companyLedgerEntryId && onOpenCompanyLedgerEntry && (
                      <div className="mt-3">
                        <button
                          type="button"
                          onClick={() => onOpenCompanyLedgerEntry(item.companyId!, item.companyLedgerEntryId!)}
                          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)] hover:bg-[rgba(var(--accent-gold-rgb),0.06)] transition-all"
                        >
                          Open Company Ledger Entry
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
