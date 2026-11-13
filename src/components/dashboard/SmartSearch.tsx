'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SHIPMENT_WORKFLOW_STAGE_OPTIONS,
  type ShipmentWorkflowStage,
} from '@/lib/shipment-workflow-stage';
import { Calendar, Camera, ChevronDown, ChevronUp, DollarSign, Funnel, History, Package, Search, Truck, User, X } from 'lucide-react';
import { BarcodeScannerModal } from '@/components/ui/BarcodeScannerModal';
import { triggerHaptic } from '@/lib/haptics';
import { Button, FormField, Select } from '@/components/design-system';

interface SmartSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onScan?: (scanned: string) => void;
  placeholder?: string;
  showTypeFilter?: boolean;
  showStatusFilter?: boolean;
  showWorkflowStageFilter?: boolean;
  showYardFilter?: boolean;
  showDateFilter?: boolean;
  showPriceFilter?: boolean;
  showUserFilter?: boolean;
  showDeliveryFilter?: boolean;
  defaultType?: 'all' | 'shipments' | 'items' | 'users';
  showScanner?: boolean;
}

export interface SearchFilters {
  query: string;
  type: 'all' | 'shipments' | 'items' | 'users';
  status?: string;
  workflowStage?: ShipmentWorkflowStage;
  yardReceived?: string;
  dateFrom?: string;
  dateTo?: string;
  minPrice?: string;
  maxPrice?: string;
  userId?: string;
  delivery?: 'delivered' | 'undelivered';
}

const SHIPMENT_STATUSES = [
  { value: 'ON_HAND', label: 'On Hand' },
  { value: 'DISPATCHING', label: 'Dispatching' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'RELEASED', label: 'Released' },
  { value: 'IN_TRANSIT_TO_DESTINATION', label: 'In Transit To Destination' },
  { value: 'DELIVERED', label: 'Delivered' },
];

const ITEM_STATUSES = [
  { value: 'ON_HAND', label: 'On Hand' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
];

export default function SmartSearch({
  onSearch,
  onScan,
  placeholder = 'Search shipments, tracking numbers, VIN...',
  showTypeFilter = true,
  showStatusFilter = true,
  showWorkflowStageFilter = false,
  showYardFilter = false,
  showDateFilter = true,
  showPriceFilter = true,
  showUserFilter = false,
  showDeliveryFilter = false,
  defaultType = 'all',
  showScanner = true,
}: SmartSearchProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    type: defaultType,
  });
  const [isSearching, setIsSearching] = useState(false);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('jacxi_recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveRecentSearch = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    try {
      const updated = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('jacxi_recent_searches', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('jacxi_recent_searches');
    } catch {
      // ignore
    }
  };

  // Count active filters (derived state, no need for useEffect)
  const activeFiltersCount = (() => {
    let count = 0;
    if (filters.status) count++;
    if (filters.workflowStage) count++;
    if (filters.yardReceived) count++;
    if (filters.delivery) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.minPrice || filters.maxPrice) count++;
    if (filters.userId) count++;
    return count;
  })();

  const handleSearch = useCallback((newFilters: SearchFilters) => {
    setIsSearching(true);
    setFilters(newFilters);
    if (newFilters.query) {
      saveRecentSearch(newFilters.query);
    }
    onSearch(newFilters);
    setTimeout(() => setIsSearching(false), 300);
  }, [onSearch, recentSearches]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query !== filters.query) {
        handleSearch({ ...filters, query });
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [query, filters, handleSearch]);

  const updateFilter = (key: keyof SearchFilters, value: string | undefined) => {
    triggerHaptic('light');
    const newFilters = { ...filters, [key]: value || undefined };
    handleSearch(newFilters);
  };

  const clearFilters = () => {
    triggerHaptic('light');
    setQuery('');
    const clearedFilters: SearchFilters = {
      query: '',
      type: defaultType,
    };
    setFilters(clearedFilters);
    handleSearch(clearedFilters);
  };

  const hasActiveFilters = Boolean(query) || activeFiltersCount > 0;

  return (
    <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
      {/* Search Bar */}
      <div style={{position: 'relative'}}>
        <div style={{display: 'flex', alignItems: 'center', position: 'relative'}}>
          <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{isSearching ? (
                      <span role="status" aria-label="Loading" style={{width: 20, height: 20, borderTopColor: 'var(--accent-gold)', color: 'var(--accent-gold)'}} className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--border)]" />
                    ) : (
                      <Search className="h-5 w-5" style={{ color: 'rgba(var(--text-secondary-rgb), 0.5)' }}/>
                    )}</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="ds-form-field-control w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] px-3 py-2 text-[0.875rem] pl-9 border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]" /></div>
          <div style={{position: 'absolute', right: 8, display: 'flex', alignItems: 'center', gap: '8px'}}>
            {showScanner && (
              <Button onClick={() => setScannerOpen(true)} title="Scan QR Code or VIN Barcode" aria-label="Scan QR Code or VIN Barcode" style={{minWidth: 32, paddingLeft: '10px', paddingRight: '10px', paddingTop: '4px', paddingBottom: '4px', fontSize: '0.8125rem', fontWeight: 600, borderColor: 'rgba(var(--accent-gold-rgb), 0.35)', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)', color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '4px'}} variant="outline" size="sm">
                <Camera className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Scan</span>
              </Button>
            )}
            {hasActiveFilters && (
              <Button onClick={clearFilters} style={{color: 'var(--text-secondary)'}} variant="primary" size="sm" icon={<X className="h-4 w-4"/>} iconPosition="start">
                Clear
              </Button>
            )}
            <Button onClick={() => setShowFilters(!showFilters)} style={{borderColor: showFilters ? 'rgba(var(--accent-gold-rgb), 0.4)' : 'var(--border)', backgroundColor: showFilters ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'transparent', color: 'var(--text-primary)'}} variant={showFilters ? 'primary' : 'outline'} size="sm" icon={<Funnel className="h-4 w-4"/>} iconPosition="start">
              Filters
              {activeFiltersCount > 0 && (
                <span style={{marginLeft: '8px', height: 20, fontSize: '0.75rem', backgroundColor: 'var(--accent-gold)', color: 'var(--background)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{activeFiltersCount}</span>
              )}
            </Button>
          </div>
        </div>

        {/* Recent Searches Suggestions */}
        {recentSearches.length > 0 && !query && (
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px', overflowX: 'auto', paddingBottom: '4px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0}}>
              <History style={{fontSize: 14, color: 'var(--text-secondary)'}} />
              <p style={{fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)'}}>
                Recent:
              </p>
            </div>
            {recentSearches.map((term) => (
              <button type="button" key={term} onClick={() => {
                  triggerHaptic('light');
                  setQuery(term);
                  handleSearch({ ...filters, query: term });
                }} style={{fontSize: '0.75rem', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)', color: 'var(--text-primary)', border: '1px solid rgba(var(--accent-gold-rgb), 0.2)', cursor: 'pointer'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{term}</button>
            ))}
            <button
              type="button"
              onClick={clearRecentSearches}
              className="text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline flex-shrink-0 ml-1 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}

        {/* Quick Type Filter */}
        {showTypeFilter && (
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px'}}>
            <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}} className="text-[0.875rem]">
              Search in:
            </p>
            {[
              { value: 'all', label: 'All', icon: Search },
              { value: 'shipments', label: 'Shipments', icon: Truck },
              { value: 'items', label: 'Items', icon: Package },
              ...(showUserFilter ? [{ value: 'users', label: 'Users', icon: User }] : []),
            ].map(({ value, label, icon: Icon }) => (
              <Button key={value} onClick={() => updateFilter('type', value as 'all' | 'shipments' | 'items' | 'users')} style={{fontSize: '0.875rem', fontWeight: 500, borderColor: filters.type === value ? 'rgba(var(--accent-gold-rgb), 0.4)' : 'var(--border)', backgroundColor: filters.type === value ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'rgba(var(--panel-rgb), 0.5)', color: filters.type === value ? 'var(--accent-gold)' : 'var(--text-secondary)'}} variant={filters.type === value ? 'primary' : 'outline'} size="sm" icon={<Icon className="h-4 w-4"/>} iconPosition="start">
                {label}
              </Button>
            ))}
          </div>
        )}

        {showWorkflowStageFilter && filters.type === 'shipments' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '12px'}}>
              <p style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}} className="text-[0.875rem]">
                Workflow stage:
              </p>
              <Button onClick={() => updateFilter('workflowStage', undefined)} style={{fontSize: '0.875rem', fontWeight: 500, borderColor: filters.workflowStage ? 'var(--border)' : 'rgba(var(--accent-gold-rgb), 0.4)', backgroundColor: filters.workflowStage ? 'rgba(var(--panel-rgb), 0.5)' : 'rgba(var(--accent-gold-rgb), 0.15)', color: filters.workflowStage ? 'var(--text-secondary)' : 'var(--accent-gold)'}} variant={filters.workflowStage ? 'outline' : 'primary'} size="sm">
                All stages
              </Button>
              {SHIPMENT_WORKFLOW_STAGE_OPTIONS.map((stageOption) => (
                <Button key={stageOption.value} onClick={() => updateFilter('workflowStage', stageOption.value)} style={{fontSize: '0.875rem', fontWeight: 500, borderColor: filters.workflowStage === stageOption.value
                        ? 'rgba(var(--accent-gold-rgb), 0.4)'
                        : 'var(--border)', backgroundColor: filters.workflowStage === stageOption.value
                        ? 'rgba(var(--accent-gold-rgb), 0.15)'
                        : 'rgba(var(--panel-rgb), 0.5)', color: filters.workflowStage === stageOption.value
                        ? 'var(--accent-gold)'
                        : 'var(--text-secondary)'}} variant={filters.workflowStage === stageOption.value ? 'primary' : 'outline'} size="sm">
                  {stageOption.label}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Advanced Filters */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: 'hidden' }}>
        <div style={{padding: '24px', backgroundColor: 'var(--panel)', border: '1px solid var(--border)', borderRadius: '24px'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px'}}>
            <h6 style={{fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px'}} className="text-[0.95rem] font-semibold leading-tight">
              <Funnel className="h-5 w-5" style={{ color: 'var(--accent-gold)' }}/>
              Advanced Filters
            </h6>
            {activeFiltersCount > 0 && (
              <Button onClick={clearFilters} style={{fontSize: '0.875rem', color: 'var(--accent-gold)'}} variant="primary" size="sm">
                Clear all filters
              </Button>
            )}
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px'}}>
            {/* Status Filter */}
            {showStatusFilter && (
              <div style={{backgroundColor: 'var(--panel)', color: 'var(--text-primary)'}}><Select label="Status" value={filters.status || ''} onChange={(val) => updateFilter('status', String(val))} options={[{ value: "", label: 'All Statuses' }, ...(filters.type === 'items' ? ITEM_STATUSES : SHIPMENT_STATUSES).map((statusOption) => ({ value: statusOption.value, label: statusOption.label }))]} /></div>
            )}

            {showDeliveryFilter && filters.type === 'shipments' && (
              <div style={{backgroundColor: 'var(--panel)', color: 'var(--text-primary)'}}><Select label="Delivery Status" value={filters.delivery || ''} onChange={(val) => updateFilter('delivery', String(val))} options={[{ value: "", label: 'All Shipments' }, { value: "delivered", label: 'Delivered' }, { value: "undelivered", label: 'Not Delivered' }]} /></div>
            )}

            {showYardFilter && filters.type === 'shipments' && (
              <div style={{backgroundColor: 'var(--panel)', color: 'var(--text-primary)'}}><Select label="Yard Intake" value={filters.yardReceived || ''} onChange={(val) => updateFilter('yardReceived', String(val))} options={[{ value: "", label: 'All Shipments' }, { value: "true", label: 'Yard Received Only' }]} /></div>
            )}

            {/* Date From */}
            {showDateFilter && (
              <FormField label="Date From" type="date" value={filters.dateFrom || ''} onChange={(e) => updateFilter('dateFrom', e.target.value)} InputLabelProps={{
                  shrink: true,
                }} leftIcon={<Calendar className="h-4 w-4" style={{ color: 'var(--accent-gold)' }}/>} />
            )}

            {/* Date To */}
            {showDateFilter && (
              <FormField label="Date To" type="date" value={filters.dateTo || ''} onChange={(e) => updateFilter('dateTo', e.target.value)} InputLabelProps={{
                  shrink: true,
                }} leftIcon={<Calendar className="h-4 w-4" style={{ color: 'var(--accent-gold)' }}/>} />
            )}

            {/* Min Price */}
            {showPriceFilter && filters.type !== 'users' && (
              <FormField label="Min Price" type="number" value={filters.minPrice || ''} onChange={(e) => updateFilter('minPrice', e.target.value)} placeholder="0" InputLabelProps={{
                }} inputProps={{min: 0}} leftIcon={<DollarSign className="h-4 w-4" style={{ color: 'var(--accent-gold)' }}/>} />
            )}

            {/* Max Price */}
            {showPriceFilter && filters.type !== 'users' && (
              <FormField label="Max Price" type="number" value={filters.maxPrice || ''} onChange={(e) => updateFilter('maxPrice', e.target.value)} placeholder="10000" InputLabelProps={{
                }} inputProps={{min: 0}} leftIcon={<DollarSign className="h-4 w-4" style={{ color: 'var(--accent-gold)' }}/>} />
            )}
          </div>

          {/* Filter Summary */}
          <motion.div initial={false} animate={{ opacity: hasActiveFilters ? 1 : 0, visibility: hasActiveFilters ? 'visible' : 'hidden' }} transition={{ duration: 0.3 }}>
              <div style={{marginTop: '16px', padding: '12px', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.1)', border: '1px solid rgba(var(--accent-gold-rgb), 0.3)', borderRadius: '16px'}}>
                <div style={{display: 'flex', alignItems: 'start', gap: '8px'}}>
                  <Funnel className="h-4 w-4" style={{ color: 'var(--accent-gold)' }}/>
                  <div style={{flex: 1}}>
                    <p style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--accent-gold)', marginBottom: '8px'}} className="text-[0.875rem]">
                      Active Filters:
                    </p>
                    <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                      {query && (
                        <span style={{backgroundColor: 'rgba(var(--accent-gold-rgb), 0.2)', color: 'var(--accent-gold)', fontSize: '0.75rem'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`Query: "${query}"`}</span>
                      )}
                      {filters.status && (
                        <span style={{backgroundColor: 'rgba(var(--accent-gold-rgb), 0.2)', color: 'var(--accent-gold)', fontSize: '0.75rem'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{`Status: ${filters.status}`}</span>
                      )}
                      {filters.delivery && (
                        <span style={{backgroundColor: 'rgba(var(--accent-gold-rgb), 0.2)', color: 'var(--accent-gold)', fontSize: '0.75rem'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{filters.delivery === 'delivered' ? 'Delivered' : 'Not Delivered'}</span>
                      )}
                      {(filters.dateFrom || filters.dateTo) && (
                        <span style={{backgroundColor: 'rgba(var(--accent-gold-rgb), 0.2)', color: 'var(--accent-gold)', fontSize: '0.75rem'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"Date Range"</span>
                      )}
                      {(filters.minPrice || filters.maxPrice) && (
                        <span style={{backgroundColor: 'rgba(var(--accent-gold-rgb), 0.2)', color: 'var(--accent-gold)', fontSize: '0.75rem'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"Price Range"</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
          </motion.div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>

      {showScanner && (
        <BarcodeScannerModal
          open={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScan={(scanned) => {
            setScannerOpen(false);
            setQuery(scanned);
            const updated = { ...filters, query: scanned };
            setFilters(updated);
            if (onScan) {
              onScan(scanned);
            } else {
              handleSearch(updated);
            }
          }}
          title="Scan VIN or Yard QR Code"
          description="Align the vehicle VIN barcode, tracking QR code, or gate pass within the camera frame"
        />
      )}
    </div>
  );
}
