'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  History, 
  ChevronUp, 
  ChevronDown, 
  X, 
  Car, 
  Package, 
  FileText, 
  Users, 
  Clock, 
  ExternalLink,
  Download
} from 'lucide-react';
import { JXBox } from "@jacxishippingorg/jx-ui-react";
import { JacxiButton } from '@/components/design-system/JacxiButton';
import { openUniversalShipmentExport } from '@/components/shipments/UniversalShipmentExportModal';

export interface WorkspaceItem {
  id: string;
  type: 'shipment' | 'container' | 'invoice' | 'customer';
  title: string;
  subtitle?: string;
  url: string;
  timestamp: number;
}

const STORAGE_KEY = 'jacxi_workspace_recent_items';
const MAX_ITEMS = 8;
// Dismissed state persists across reloads. A brand-new recent item
// re-opens the tray (collapsed) so the feature stays discoverable.
const TRAY_DISMISSED_KEY = 'jacxi_workspace_tray_dismissed';
const TRAY_EXPANDED_KEY = 'jacxi_workspace_tray_expanded';

export function addWorkspaceItem(item: Omit<WorkspaceItem, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  try {
    const existing: WorkspaceItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filtered = existing.filter((i) => i.id !== item.id || i.type !== item.type);
    const updated: WorkspaceItem[] = [{ ...item, timestamp: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('workspace-items-updated'));
  } catch {}
}

export function WorkspaceTray() {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  // Collapsed by default: the tray must never open covering page controls.
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const newestKeyRef = useRef<string | null>(null);

  const loadItems = useCallback(() => {
    try {
      const stored: WorkspaceItem[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      setItems(stored);
      // A brand-new recent item re-opens a dismissed tray (collapsed),
      // so dismissing never silently loses the feature.
      const newestKey = stored.length > 0 ? `${stored[0].type}-${stored[0].id}-${stored[0].timestamp}` : null;
      if (newestKey && newestKeyRef.current !== null && newestKey !== newestKeyRef.current) {
        setDismissed(false);
        try {
          localStorage.removeItem(TRAY_DISMISSED_KEY);
        } catch {}
      }
      newestKeyRef.current = newestKey;
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    // Read persisted UI state on mount (not in initialisers, to avoid
    // a server/client hydration mismatch).
    try {
      setDismissed(localStorage.getItem(TRAY_DISMISSED_KEY) === '1');
      setExpanded(localStorage.getItem(TRAY_EXPANDED_KEY) === '1');
    } catch {}
    loadItems();
    window.addEventListener('workspace-items-updated', loadItems);
    window.addEventListener('storage', loadItems);
    return () => {
      window.removeEventListener('workspace-items-updated', loadItems);
      window.removeEventListener('storage', loadItems);
    };
  }, [loadItems]);

  const collapse = useCallback(() => {
    setExpanded(false);
    try {
      localStorage.setItem(TRAY_EXPANDED_KEY, '0');
    } catch {}
  }, []);

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(TRAY_EXPANDED_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  const dismissTray = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    setExpanded(false);
    try {
      localStorage.setItem(TRAY_DISMISSED_KEY, '1');
      localStorage.setItem(TRAY_EXPANDED_KEY, '0');
    } catch {}
  };

  // Expanded panel is a popover: close on outside click or Escape.
  useEffect(() => {
    if (!expanded) return;
    const handleDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        collapse();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') collapse();
    };
    document.addEventListener('mousedown', handleDown);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleDown);
      window.removeEventListener('keydown', handleKey);
    };
  }, [expanded, collapse]);

  const removeItem = (e: React.MouseEvent, id: string, type: string) => {
    e.stopPropagation();
    const updated = items.filter((i) => !(i.id === id && i.type === type));
    setItems(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  if (items.length === 0 || dismissed) return null;

  const getItemIcon = (type: WorkspaceItem['type']) => {
    switch (type) {
      case 'shipment':
        return Car;
      case 'container':
        return Package;
      case 'invoice':
        return FileText;
      case 'customer':
        return Users;
      default:
        return History;
    }
  };

  // Collapsed: one small chip (~110px wide, 36px tall) in the bottom
  // corner — no wide chip-preview row, so it never covers page buttons
  // or toggles. Expanded: a popover anchored to that pill, growing
  // upward from the bottom edge; it closes on outside click / Escape
  // (see effect above) and on navigating to an item. The wrapper keeps
  // the mobile bottom nav clear below `lg` (tray is hidden below `sm`).
  return (
    <div
      ref={panelRef}
      className="hidden sm:block fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] lg:bottom-4 right-3 sm:right-4 z-40"
    >
      {!expanded ? (
        <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] shadow-sm">
          <button
            type="button"
            onClick={toggleExpanded}
            aria-label={`Expand recent workspace, ${items.length} item${items.length === 1 ? '' : 's'}`}
            aria-expanded={false}
            title="Show recent workspace"
            className="flex h-9 items-center gap-1.5 rounded-lg pl-3 pr-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:bg-[rgba(var(--border-rgb),0.4)]"
          >
            <History className="w-4 h-4 text-[var(--text-secondary)]" />
            <span>Recent ({items.length})</span>
            <ChevronUp className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          </button>
          <span aria-hidden="true" className="h-4 w-px bg-[var(--border)]" />
          <button
            type="button"
            onClick={dismissTray}
            aria-label="Dismiss recent workspace tray"
            title="Hide recent workspace (it reappears when you open something new)"
            className="flex h-9 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[rgba(var(--border-rgb),0.4)] hover:text-[var(--text-primary)]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
      <JXBox
        surface="elevated"
        padding="none"
        className="w-[calc(100vw-24px)] max-w-sm sm:w-[360px] !rounded-xl !bg-[var(--panel)] !border-[var(--border)] shadow-[0_12px_32px_rgba(var(--text-primary-rgb),0.12)] overflow-hidden"
        style={{ fontFamily: 'inherit' }}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-[var(--background)]">
          <button
            type="button"
            onClick={toggleExpanded}
            aria-label="Collapse workspace tray"
            aria-expanded={true}
            className="flex min-w-0 items-center gap-2 rounded-md py-0.5 pr-1 text-left"
          >
            <History className="w-4 h-4 shrink-0 text-[var(--text-secondary)]" />
            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
              Recent Workspace ({items.length})
            </span>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-[var(--text-secondary)]" />
          </button>

          <div className="flex shrink-0 items-center gap-1">
            <JacxiButton
              type="button"
              onClick={clearAll}
              className="text-[10px] font-semibold text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors px-1.5 py-0.5 rounded"
            >
              Clear
            </JacxiButton>
            <button
              type="button"
              onClick={dismissTray}
              aria-label="Dismiss recent workspace tray"
              title="Hide recent workspace (it reappears when you open something new)"
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Expanded Tray List */}
        <div className="p-2 space-y-1.5 max-h-64 overflow-y-auto">
            {items.map((item) => {
              const Icon = getItemIcon(item.type);
              const isActive = pathname === item.url;
              return (
                <div
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    router.push(item.url);
                    collapse();
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                    isActive
                      ? 'bg-[var(--accent-gold)]/10 border-[var(--accent-gold)] text-[var(--text-primary)]'
                      : 'bg-[var(--background)] border-[var(--border)] hover:border-[var(--accent-gold)]/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-[var(--panel)] text-[var(--accent-gold)] border border-[var(--border)]">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p className="text-[10px] text-[var(--text-secondary)] truncate">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => removeItem(e, item.id, item.type)}
                      aria-label={`Remove ${item.title} from recent workspace`}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--error)] rounded-md transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        <div className="p-2 border-t border-[var(--border)] bg-[var(--background)] flex items-center justify-between gap-2">
            <JacxiButton
              type="button"
              variant="solid"
              tone="primary"
              onClick={() => {
                const shipmentIds = items.filter(i => i.type === 'shipment').map(i => i.id);
                openUniversalShipmentExport(shipmentIds.length > 0 ? { shipmentIds, title: 'Export Recent Shipments' } : {});
              }}
              style={{ fontFamily: 'inherit' }}
              className="flex items-center gap-1.5 !h-auto !min-h-0 !px-3 !py-1.5 !text-xs !font-semibold !rounded-lg !border-0 !bg-[var(--accent-gold)] !text-white hover:brightness-105 w-full justify-center shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Shipments (Excel / CSV)</span>
            </JacxiButton>
          </div>
      </JXBox>
      )}
    </div>
  );
}
