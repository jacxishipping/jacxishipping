'use client';

import { useMemo, type ReactNode } from 'react';
import { Check, Search, X } from 'lucide-react';
import { Button, FormField, Select, Tooltip } from '@/components/design-system';
import {
  DEFAULT_SHIPPING_RATE_CONFIG,
  US_STATES,
  type VehicleRateMultiplier,
} from '@/lib/shipping-rate-calculator';
import type { ComparisonSortKey } from '@/lib/company-price-comparison';
import type { ComparisonDisplayMode } from '@/lib/company-price-comparison-presets';
import { Skeleton, SkeletonGroup } from '@/components/design-system';

type CompanyOption = {
  id: string;
  name: string;
  hasPriceList: boolean;
  destinationLabel: string;
  activePriceList?: {
    name?: string;
    createdAt?: string;
  } | null;
};

export type ComparisonFiltersState = {
  typeFilter: 'ALL' | 'SHIPPING' | 'DISPATCH' | 'TRANSIT';
  search: string;
  stateFilter: string;
  destinationFilter: string;
  vehicleTypeId: string;
  referenceCompanyId: string;
  displayMode: ComparisonDisplayMode;
  sortBy: ComparisonSortKey;
  minSpread: string;
  differencesOnly: boolean;
  onlyWithPriceLists: boolean;
  completeCoverageOnly: boolean;
};

export type ComparisonFilterPanel = 'filters' | 'companies' | 'all';

type CompanyPriceComparisonFiltersProps = {
  companies: CompanyOption[];
  selectedCompanyIds: string[];
  visibleCompanyCount: number;
  loading: boolean;
  destinationOptions: string[];
  visibleCompanies: { id: string; name: string }[];
  filters: ComparisonFiltersState;
  panel?: ComparisonFilterPanel;
  showActiveChips?: boolean;
  onFilterChange: <K extends keyof ComparisonFiltersState>(key: K, value: ComparisonFiltersState[K]) => void;
  onToggleCompany: (companyId: string) => void;
  onSelectAllCompanies: () => void;
  onClearCompanySelection: () => void;
};

export function countActiveFilters(filters: ComparisonFiltersState) {
  let count = 0;
  if (filters.typeFilter !== 'ALL') count += 1;
  if (filters.search.trim()) count += 1;
  if (filters.stateFilter) count += 1;
  if (filters.destinationFilter) count += 1;
  if (filters.referenceCompanyId) count += 1;
  if (filters.displayMode !== 'absolute' && filters.referenceCompanyId) count += 1;
  if (filters.sortBy !== 'spread-desc') count += 1;
  if (filters.minSpread.trim()) count += 1;
  if (filters.differencesOnly) count += 1;
  if (!filters.onlyWithPriceLists) count += 1;
  if (filters.completeCoverageOnly) count += 1;
  return count;
}

const vehicleTypes = DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes;

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{display: 'grid', gap: '10px'}}>
      <div style={{fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)'}}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function CompanyPriceComparisonFilters({
  companies,
  selectedCompanyIds,
  visibleCompanyCount,
  loading,
  destinationOptions,
  visibleCompanies,
  filters,
  panel = 'all',
  showActiveChips = true,
  onFilterChange,
  onToggleCompany,
  onSelectAllCompanies,
  onClearCompanySelection,
}: CompanyPriceComparisonFiltersProps) {
  const showFilterFields = panel === 'filters' || panel === 'all';
  const showCompanySelection = panel === 'companies' || panel === 'all';

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onDelete: () => void }[] = [];

    if (filters.typeFilter !== 'ALL') {
      chips.push({
        key: 'type',
        label: `Type: ${filters.typeFilter}`,
        onDelete: () => onFilterChange('typeFilter', 'ALL'),
      });
    }
    if (filters.search.trim()) {
      chips.push({
        key: 'search',
        label: `Search: "${filters.search.trim()}"`,
        onDelete: () => onFilterChange('search', ''),
      });
    }
    if (filters.stateFilter) {
      chips.push({
        key: 'state',
        label: `State: ${filters.stateFilter}`,
        onDelete: () => onFilterChange('stateFilter', ''),
      });
    }
    if (filters.destinationFilter) {
      chips.push({
        key: 'destination',
        label: `Destination: ${filters.destinationFilter}`,
        onDelete: () => onFilterChange('destinationFilter', ''),
      });
    }
    if (filters.referenceCompanyId) {
      const company = visibleCompanies.find((item) => item.id === filters.referenceCompanyId);
      chips.push({
        key: 'reference',
        label: `Reference: ${company?.name || 'Selected'}`,
        onDelete: () => {
          onFilterChange('referenceCompanyId', '');
          onFilterChange('displayMode', 'absolute');
        },
      });
    }
    if (filters.displayMode === 'delta' && filters.referenceCompanyId) {
      chips.push({
        key: 'display',
        label: 'Delta view',
        onDelete: () => onFilterChange('displayMode', 'absolute'),
      });
    }
    if (filters.sortBy !== 'spread-desc') {
      const sortLabels: Record<ComparisonSortKey, string> = {
        'spread-desc': 'Largest spread',
        'spread-asc': 'Smallest spread',
        'label-asc': 'Name A → Z',
        'label-desc': 'Name Z → A',
        'coverage-desc': 'Best coverage',
        'coverage-asc': 'Lowest coverage',
      };
      chips.push({
        key: 'sort',
        label: `Sort: ${sortLabels[filters.sortBy]}`,
        onDelete: () => onFilterChange('sortBy', 'spread-desc'),
      });
    }
    if (filters.minSpread.trim()) {
      chips.push({
        key: 'minSpread',
        label: `Min spread: $${filters.minSpread}`,
        onDelete: () => onFilterChange('minSpread', ''),
      });
    }
    if (filters.differencesOnly) {
      chips.push({
        key: 'differences',
        label: 'Differences only',
        onDelete: () => onFilterChange('differencesOnly', false),
      });
    }
    if (!filters.onlyWithPriceLists) {
      chips.push({
        key: 'priceLists',
        label: 'Including companies without lists',
        onDelete: () => onFilterChange('onlyWithPriceLists', true),
      });
    }
    if (filters.completeCoverageOnly) {
      chips.push({
        key: 'coverage',
        label: 'Full coverage only',
        onDelete: () => onFilterChange('completeCoverageOnly', false),
      });
    }

    return chips;
  }, [filters, onFilterChange, visibleCompanies]);

  return (
    <div style={{display: 'grid', gap: '12px'}}>
      <div style={{borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)', overflow: 'hidden'}}>
        <div style={{padding: '12px', display: 'grid', gap: '16px'}}>
          {showFilterFields && (
            <>
            <FilterSection title="Search & Scope">
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
                <Select label="Company Type" value={filters.typeFilter} onChange={(val) => onFilterChange('typeFilter', String(val) as ComparisonFiltersState['typeFilter'])} size="small" options={[{ value: "ALL", label: 'All Types' }, { value: "SHIPPING", label: 'Shipping' }, { value: "DISPATCH", label: 'Dispatch' }, { value: "TRANSIT", label: 'Transit' }]} />
                <FormField label="Search" value={filters.search} onChange={(event) => onFilterChange('search', event.target.value)} placeholder="State, lane, branch, or city" size="small" leftIcon={<Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />} />
                <Select label="State Filter" value={filters.stateFilter} onChange={(val) => onFilterChange('stateFilter', String(val))} size="small" options={[{ value: "", label: 'All States' }, ...US_STATES.map((state) => ({ value: state.code, label: `${state.code} — ${state.name}` }))]} />
                <Select label="Destination" value={filters.destinationFilter} onChange={(val) => onFilterChange('destinationFilter', String(val))} size="small" options={[{ value: "", label: 'All Destinations' }, ...destinationOptions.map((destination) => ({ value: destination, label: destination }))]} />
              </div>
            </FilterSection>

            <FilterSection title="Analysis">
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
                <Select label="Vehicle Type" value={filters.vehicleTypeId} onChange={(val) => onFilterChange('vehicleTypeId', String(val))} size="small" options={vehicleTypes.map((type: VehicleRateMultiplier) => ({ value: type.id, label: `${type.label} (${type.multiplier}x)` }))} />
                <Select label="Reference Company" value={filters.referenceCompanyId} onChange={(val) => onFilterChange('referenceCompanyId', String(val))} size="small" options={[{ value: "", label: 'No reference' }, ...visibleCompanies.map((company) => ({ value: company.id, label: company.name }))]} />
                <Select label="Display" value={filters.displayMode} onChange={(val) => onFilterChange('displayMode', String(val) as ComparisonDisplayMode)} disabled={!filters.referenceCompanyId} size="small" options={[{ value: "absolute", label: 'Absolute prices' }, { value: "delta", label: 'Delta vs reference' }]} />
                <Select label="Sort By" value={filters.sortBy} onChange={(val) => onFilterChange('sortBy', String(val) as ComparisonSortKey)} size="small" options={[{ value: "spread-desc", label: 'Largest spread first' }, { value: "spread-asc", label: 'Smallest spread first' }, { value: "label-asc", label: 'Name A → Z' }, { value: "label-desc", label: 'Name Z → A' }, { value: "coverage-desc", label: 'Best coverage first' }, { value: "coverage-asc", label: 'Lowest coverage first' }]} />
              </div>
            </FilterSection>

            <FilterSection title="Thresholds">
              <div style={{display: 'grid', gridTemplateColumns: '180px 1fr', gap: '12px', alignItems: 'center'}}>
                <FormField label="Min Spread ($)" type="number" value={filters.minSpread} onChange={(event) => onFilterChange('minSpread', event.target.value)} inputProps={{ min: 0, step: 50 }} size="small" />
                <div style={{display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center'}}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" checked={filters.differencesOnly} onChange={(event) => onFilterChange('differencesOnly', event.target.checked)} className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>Only rows with price differences</span></label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" checked={filters.onlyWithPriceLists} onChange={(event) => onFilterChange('onlyWithPriceLists', event.target.checked)} className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>Only companies with uploaded price lists</span></label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--text-primary)]"><input type="checkbox" checked={filters.completeCoverageOnly} onChange={(event) => onFilterChange('completeCoverageOnly', event.target.checked)} className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--accent-gold)] disabled:cursor-not-allowed disabled:opacity-50" /><span>Only rows priced by every selected company</span></label>
                </div>
              </div>
            </FilterSection>
            </>
          )}

          {showCompanySelection && (
            <FilterSection title={`Companies to Compare (${selectedCompanyIds.length} selected, ${visibleCompanyCount} visible)`}>
              {loading ? (
                <SkeletonGroup>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} variant="rounded" width={120} height={32} />
                    ))}
                  </div>
                </SkeletonGroup>
              ) : companies.length === 0 ? (
                <div style={{color: 'var(--text-secondary)', fontSize: '0.85rem'}}>
                  No companies found for this filter.
                </div>
              ) : (
                <>
                  <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px'}}>
                    <Button variant="outline" size="sm" onClick={onSelectAllCompanies}>Select All</Button>
                    <Button variant="outline" size="sm" onClick={onClearCompanySelection}>Clear Selection</Button>
                  </div>
                  <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                    {companies.map((company) => {
                      const selected = selectedCompanyIds.includes(company.id);
                      const disabled = filters.onlyWithPriceLists && !company.hasPriceList;

                      return (
                        <Tooltip key={company.id} title={company.hasPriceList
                            ? `${company.destinationLabel}${company.activePriceList?.name ? ` • ${company.activePriceList.name}` : ''}${company.activePriceList?.createdAt ? ` • ${new Date(company.activePriceList.createdAt).toLocaleDateString()}` : ''}`
                            : 'No uploaded price list yet'}>
                          <button type="button" disabled={disabled} onClick={() => onToggleCompany(company.id)} style={{display: 'inline-flex', alignItems: 'center', gap: '4px', border: selected ? '1px solid rgba(var(--accent-gold-rgb), 0.55)' : '1px solid var(--border)', background: selected ? 'rgba(var(--accent-gold-rgb), 0.12)' : 'var(--background)', color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)', borderRadius: '79992px', paddingLeft: '10px', paddingRight: '10px', paddingTop: '4.8px', paddingBottom: '4.8px', fontSize: '0.8rem', fontWeight: selected ? 700 : 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, transition: 'all 0.15s ease'}}>
                            {selected && <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent-gold)' }} />}
                            {company.name}
                            {!company.hasPriceList ? ' (no list)' : ''}
                          </button>
                        </Tooltip>
                      );
                    })}
                  </div>
                </>
              )}
            </FilterSection>
          )}
        </div>
      </div>

      {showActiveChips && activeChips.length > 0 && (
        <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center'}}>
          <div style={{fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '2px'}}>Active:</div>
          {activeChips.map((chip) => (
            <span key={chip.key} style={{height: 26, fontSize: '0.72rem', backgroundColor: 'var(--background)', border: '1px solid var(--border)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{chip.label}<button type="button" aria-label="Remove" onClick={(e) => { e.stopPropagation(); (chip.onDelete)(); }} className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-black/10"><X className="h-3 w-3" /></button></span>
          ))}
        </div>
      )}
    </div>
  );
}