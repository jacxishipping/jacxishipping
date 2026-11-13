'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Calendar, CheckCircle2, ChevronDown, DollarSign, ExternalLink, FileText, Filter, GitCompareArrows, Layers, MapPin, Navigation, Printer, ReceiptText, Search, ShieldCheck, Ship, Sparkles, Truck } from 'lucide-react';
import { Drawer, Button, StatsCard } from '@/components/design-system';
import { formatMoney as formatCurrency } from '@/lib/format';
import { printCompanyPriceList, printTransitPriceList } from '@/lib/price-list-print';
import {
  normalizeShippingRateConfig,
  US_STATES,
  type AuctionRateEntry,
  type ShippingRateCalculatorConfig,
} from '@/lib/shipping-rate-calculator';
import {
  detectPriceListCorridor,
  isTransitPriceList,
  CORRIDOR_DEFINITIONS,
  type CorridorRouteCode,
} from '@/lib/price-list-corridors';

export interface CompanyPriceListSummary {
  id: string;
  name: string;
  destinationLabel: string;
  sourceFileName: string;
  importMode: string;
  importedStateRateCount: number;
  importedAuctionRateCount: number;
  config?: unknown;
  warnings?: string[] | null;
  isActive: boolean;
  effectiveFrom?: string | null;
  createdAt: string;
}

export interface CompanyPriceListDrawerProps {
  open: boolean;
  onClose: () => void;
  companyId?: string;
  companyName?: string;
  companyType?: string;
  priceListConfig?: ShippingRateCalculatorConfig | null;
  priceLists?: CompanyPriceListSummary[] | null;
  activePriceList?: CompanyPriceListSummary | null;
  highlightLane?: {
    stateCode?: string | null;
    branch?: string | null;
    city?: string | null;
    totalPrice?: number | null;
  } | null;
  onSwitchToManageTab?: () => void;
}

export default function CompanyPriceListDrawer({
  open,
  onClose,
  companyId,
  companyName = 'Company',
  companyType,
  priceListConfig: initialConfig,
  priceLists: initialPriceLists,
  activePriceList: initialActivePriceList,
  highlightLane,
  onSwitchToManageTab,
}: CompanyPriceListDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [fetchedConfig, setFetchedConfig] = useState<ShippingRateCalculatorConfig | null>(null);
  const [fetchedPriceLists, setFetchedPriceLists] = useState<CompanyPriceListSummary[] | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [activeTab, setActiveTab] = useState<'auction' | 'transit' | 'states'>('auction');

  // Fetch company data if config is not preloaded
  useEffect(() => {
    if (!open || !companyId || initialConfig) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/finance/companies/${companyId}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.company) {
          setFetchedConfig(data.company.priceListConfig ? normalizeShippingRateConfig(data.company.priceListConfig) : null);
          setFetchedPriceLists(data.company.priceLists || []);
        }
      })
      .catch((err) => {
        console.error('Failed to load company price list for drawer:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, companyId, initialConfig]);

  // Consolidate effective config and lists
  const priceLists = initialPriceLists || fetchedPriceLists || [];

  // Dual-leg recognition: Ocean (Leg 1) vs Overland Transit (Leg 2)
  const activeOceanList = useMemo(() => {
    return priceLists.find((l) => l.isActive && !isTransitPriceList(l)) || null;
  }, [priceLists]);

  const activeTransitList = useMemo(() => {
    return priceLists.find((l) => l.isActive && isTransitPriceList(l)) || null;
  }, [priceLists]);

  const activeListFromProps = initialActivePriceList || activeOceanList || activeTransitList || priceLists.find((l) => l.isActive) || null;

  // Selected version calculation
  const currentVersion = useMemo(() => {
    if (selectedVersionId === 'active') {
      return activeListFromProps;
    }
    return priceLists.find((l) => l.id === selectedVersionId) || activeListFromProps;
  }, [selectedVersionId, priceLists, activeListFromProps]);

  const isCurrentVersionTransit = useMemo(() => {
    if (!currentVersion) return false;
    return isTransitPriceList(currentVersion);
  }, [currentVersion]);

  // Auto-switch tab if user explicitly picked a transit version
  useEffect(() => {
    if (isCurrentVersionTransit) {
      setActiveTab('transit');
    } else if (activeTab === 'transit' && !activeTransitList && !isCurrentVersionTransit) {
      setActiveTab('auction');
    }
  }, [isCurrentVersionTransit, activeTransitList]);

  const effectiveConfig = useMemo(() => {
    if (currentVersion?.config) {
      return normalizeShippingRateConfig(currentVersion.config);
    }
    if (initialConfig) return normalizeShippingRateConfig(initialConfig);
    if (fetchedConfig) return normalizeShippingRateConfig(fetchedConfig);
    return null;
  }, [currentVersion, initialConfig, fetchedConfig]);

  // Extract structured transit details (Mersin/UAE -> Islam Qala)
  const transitData = useMemo(() => {
    if (currentVersion && isTransitPriceList(currentVersion)) {
      const cfg = currentVersion.config as any;
      return {
        name: currentVersion.name,
        origin: cfg?.origin || (currentVersion.name.toLowerCase().includes('uae') ? 'Dubai / Jebel Ali, UAE' : 'Mersin, Turkey'),
        destination: cfg?.destination || currentVersion.destinationLabel || 'Islam Qala, Herat',
        rates: cfg?.rates || cfg?.transitRates || { sedan: 2300, suv: 2400 },
        terms: cfg?.terms || (cfg?.transitRates?.terms) || [
          'Rates include customs clearance and transportation.',
          'Applicable based on departure port shipping date.',
          'Unforeseen port congestion or force majeure passed to client.',
        ],
        effectiveFrom: currentVersion.effectiveFrom || cfg?.effectiveFrom,
        effectiveTo: cfg?.effectiveTo,
      };
    }

    const rawCompanyTransit = (initialConfig as any)?.transit || (fetchedConfig as any)?.transit;
    if (rawCompanyTransit) return rawCompanyTransit;

    if (activeTransitList) {
      const cfg = activeTransitList.config as any;
      return {
        name: activeTransitList.name,
        origin: cfg?.origin || (activeTransitList.name.toLowerCase().includes('uae') ? 'Dubai / Jebel Ali, UAE' : 'Mersin, Turkey'),
        destination: cfg?.destination || activeTransitList.destinationLabel || 'Islam Qala, Herat',
        rates: cfg?.rates || cfg?.transitRates || { sedan: 2300, suv: 2400 },
        terms: cfg?.terms || (cfg?.transitRates?.terms) || [
          'Rates include customs clearance and transportation.',
          'Applicable based on departure port shipping date.',
          'Unforeseen port congestion or force majeure passed to client.',
        ],
        effectiveFrom: activeTransitList.effectiveFrom || cfg?.effectiveFrom,
        effectiveTo: cfg?.effectiveTo,
      };
    }

    return null;
  }, [currentVersion, initialConfig, fetchedConfig, activeTransitList]);

  const auctionRates = effectiveConfig?.auctionRates || [];
  const stateRates = effectiveConfig?.stateRates || {};
  const destinationLabel = currentVersion?.destinationLabel || effectiveConfig?.destinationLabel || 'Standard Destination';

  // Filter auction rates based on search and state filter
  const filteredAuctionRates = useMemo(() => {
    let rows = auctionRates;

    if (selectedState) {
      rows = rows.filter((r) => r.stateCode.toUpperCase() === selectedState.toUpperCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      rows = rows.filter((r) =>
        [r.stateCode, r.branch, r.city, r.loadingPoint || '', String(r.total)]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    return rows;
  }, [auctionRates, searchQuery, selectedState]);

  // Filter state rates based on search query
  const filteredStateRates = useMemo(() => {
    const entries = Object.entries(stateRates);
    if (!searchQuery.trim() && !selectedState) return entries;

    const q = searchQuery.trim().toLowerCase();
    return entries.filter(([code]) => {
      if (selectedState && code.toUpperCase() !== selectedState.toUpperCase()) return false;
      if (!q) return true;
      const stateObj = US_STATES.find((s) => s.code.toUpperCase() === code.toUpperCase());
      const stateName = stateObj?.name.toLowerCase() || '';
      return code.toLowerCase().includes(q) || stateName.includes(q);
    });
  }, [stateRates, searchQuery, selectedState]);

  // Find exact location match in auction rates for highlightLane
  const exactMatchedLane = useMemo(() => {
    if (!highlightLane) return null;
    const { stateCode, branch, city } = highlightLane;
    return auctionRates.find((row) => {
      if (stateCode && row.stateCode.toUpperCase() !== stateCode.toUpperCase()) return false;
      const matchBranch = branch && (row.branch.toLowerCase().includes(branch.toLowerCase()) || branch.toLowerCase().includes(row.branch.toLowerCase()));
      const matchCity = city && (row.city.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(row.city.toLowerCase()));
      return Boolean(matchBranch || matchCity);
    });
  }, [auctionRates, highlightLane]);

  // Check if lane matches highlightLane
  const isLaneHighlighted = (row: AuctionRateEntry) => {
    if (!highlightLane) return false;
    const { stateCode, branch, city } = highlightLane;
    if (stateCode && row.stateCode.toUpperCase() !== stateCode.toUpperCase()) return false;
    const matchBranch = branch && (row.branch.toLowerCase().includes(branch.toLowerCase()) || branch.toLowerCase().includes(row.branch.toLowerCase()));
    const matchCity = city && (row.city.toLowerCase().includes(city.toLowerCase()) || city.toLowerCase().includes(row.city.toLowerCase()));
    if (matchBranch || matchCity) return true;
    return Boolean(stateCode && row.stateCode.toUpperCase() === stateCode.toUpperCase() && !branch && !city);
  };

  const handlePrintTransit = () => {
    const activeTransitObj = transitData;
    if (!activeTransitObj) return;
    printTransitPriceList({
      companyName,
      companyType,
      priceListName: activeTransitList?.name || 'Overland Transit Tariff',
      origin: activeTransitObj.origin,
      destination: activeTransitObj.destination,
      destinationLabel: activeTransitObj.destinationLabel || destinationLabel,
      sourceFileName: activeTransitList?.sourceFileName || effectiveConfig?.updatedFromPdfName,
      effectiveFrom: activeTransitObj.effectiveFrom,
      effectiveTo: activeTransitObj.effectiveTo,
      rates: activeTransitObj.rates,
      terms: activeTransitObj.terms,
      carrierInfo: activeTransitObj.company,
    });
  };

  const handlePrint = (printAll = false) => {
    if (!effectiveConfig) return;
    const isTransit = currentVersion && detectPriceListCorridor({
      fileName: currentVersion.sourceFileName,
      destinationLabel: currentVersion.destinationLabel,
      name: currentVersion.name,
      config: currentVersion.config,
      auctionRateCount: currentVersion.importedAuctionRateCount,
    }).leg === 'TRANSIT';

    if (isTransit || activeTab === 'transit') {
      handlePrintTransit();
      return;
    }

    const isFiltered = !printAll && (Boolean(selectedState) || Boolean(searchQuery.trim()));
    printCompanyPriceList({
      companyName,
      companyType,
      priceListName: currentVersion?.name || 'Active Version',
      destinationLabel,
      sourceFileName: currentVersion?.sourceFileName || effectiveConfig.updatedFromPdfName,
      auctionRates: isFiltered ? filteredAuctionRates : auctionRates,
      stateRates: isFiltered ? Object.fromEntries(filteredStateRates) : stateRates,
      filterInfo: isFiltered
        ? {
            selectedState: selectedState || undefined,
            searchQuery: searchQuery.trim() || undefined,
          }
        : undefined,
    });
  };

  const hasPriceList = Boolean(effectiveConfig && (auctionRates.length > 0 || Object.keys(stateRates).length > 0));

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
          <div style={{width: 36, height: 36, borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--accent-gold-rgb), 0.14)', color: 'var(--accent-gold)'}}>
            <ReceiptText className="w-5 h-5" />
          </div>
          <div>
            <div style={{fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)'}}>
              Company Price List
            </div>
            <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
              {companyName} {companyType ? `• ${companyType}` : ''}
            </div>
          </div>
        </div>
      }
      description={`View shipping rates, auction lanes, and rate schedules for ${companyName}`}
      badge={
        hasPriceList ? (
          <span style={{fontWeight: 700, fontSize: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.3)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}{currentVersion?.isActive ? 'Active Version' : currentVersion?.name || 'Rate Sheet'}</span>
        ) : (
          <span style={{fontWeight: 700, fontSize: '0.75rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)', border: '1px solid rgba(234, 179, 8, 0.3)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}"No Active Price List"</span>
        )
      }
      actions={
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px', flexWrap: 'wrap'}}>
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            {activeTab === 'transit' && transitData ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Printer className="w-4 h-4" />}
                onClick={handlePrintTransit}
              >
                Print Transit Tariff
              </Button>
            ) : (
              <>
                {hasPriceList && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Printer className="w-4 h-4" />}
                    onClick={() => handlePrint(false)}
                  >
                    {filteredAuctionRates.length !== auctionRates.length
                      ? `Print (${filteredAuctionRates.length} filtered)`
                      : 'Print Ocean Rate Sheet'}
                  </Button>
                )}
                {transitData && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Printer className="w-4 h-4" />}
                    onClick={handlePrintTransit}
                  >
                    Print Transit Tariff
                  </Button>
                )}
              </>
            )}
            <Link href="/dashboard/finance/price-comparison" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" icon={<GitCompareArrows className="w-4 h-4" />}>
                Compare Rates
              </Button>
            </Link>
            {onSwitchToManageTab && (
              <Button
                variant="outline"
                size="sm"
                icon={<ExternalLink className="w-4 h-4" />}
                onClick={() => {
                  onClose();
                  onSwitchToManageTab();
                }}
              >
                Manage Price Lists
              </Button>
            )}
            {!onSwitchToManageTab && companyId && (
              <Link href={`/dashboard/finance/companies/${companyId}?tab=price-list`} style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
                  Full Price List Tab
                </Button>
              </Link>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div style={{display: 'grid', gap: '20px'}}>
        {/* Loading State */}
        {loading && (
          <div style={{paddingTop: '48px', paddingBottom: '48px', textAlign: 'center', color: 'var(--text-secondary)'}}>
            <ReceiptText className="w-8 h-8 mx-auto mb-2 animate-pulse text-[var(--accent-gold)]" />
            <div style={{fontWeight: 600}}>Loading company price list...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !hasPriceList && (
          <div style={{padding: '24px', borderRadius: '16px', border: '1px dashed var(--border)', background: 'var(--panel)', textAlign: 'center', display: 'grid', gap: '12px', justifyItems: 'center'}}>
            <div style={{width: 48, height: 48, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--accent-gold-rgb), 0.12)', color: 'var(--accent-gold)'}}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div style={{fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)'}}>
                No Price List Uploaded
              </div>
              <div style={{marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 420}}>
                This company does not currently have an active rate sheet imported. Uploading a PDF, CSV, or Excel rate sheet enables automated pricing and quick rate lookup inside the ledger.
              </div>
            </div>
            {onSwitchToManageTab ? (
              <Button
                variant="primary"
                size="sm"
                icon={<ArrowRight className="w-4 h-4" />}
                onClick={() => {
                  onClose();
                  onSwitchToManageTab();
                }}
              >
                Go to Upload & Import
              </Button>
            ) : companyId ? (
              <Link href={`/dashboard/finance/companies/${companyId}?tab=price-list`} style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />}>
                  Upload Price List
                </Button>
              </Link>
            ) : null}
          </div>
        )}

        {/* Main Price List Content */}
        {!loading && hasPriceList && (
          <>
            {/* Version Selector (if multiple exist) */}
            {priceLists.length > 1 && (
              <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <Layers className="w-4 h-4 text-[var(--accent-gold)]" />
                  <div style={{fontSize: '0.85rem', fontWeight: 650}}>Version:</div>
                </div>
                <div style={{minWidth: 280}}><div className="relative"><select value={selectedVersionId} onChange={(val) => setSelectedVersionId(String(val))} className="ds-select-control w-full appearance-none rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors px-2.5 py-1.5 text-[0.8125rem] pr-9 border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]">
                  <option value="active">
                    Active Version {activeListFromProps?.name ? `(${activeListFromProps.name})` : ''}
                  </option>
                  {priceLists.map((list) => {
                    const corridor = detectPriceListCorridor({
                      fileName: list.sourceFileName,
                      destinationLabel: list.destinationLabel,
                      name: list.name,
                      config: list.config,
                      auctionRateCount: list.importedAuctionRateCount,
                    });
                    const legPrefix = corridor.leg === 'TRANSIT' ? '🚚 [Transit]' : '🌊 [Ocean]';
                    return (
                      <option key={list.id} value={list.id}>
                        {legPrefix} {corridor.shortLabel} — {list.name} {list.isActive ? '• Active' : ''} ({new Date(list.createdAt).toLocaleDateString()})
                      </option>
                    );
                  })}
                </select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden="true" /></div></div>
              </div>
            )}

            {/* Dual-Leg Corridors Status Bar */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
              {/* Leg 1: Ocean Freight */}
              <div style={{padding: '12px', borderRadius: '16px', border: activeOceanList ? '1px solid rgba(59, 130, 246, 0.4)' : '1px dashed var(--border)', background: activeOceanList ? 'rgba(59, 130, 246, 0.06)' : 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <div style={{width: 32, height: 32, borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: activeOceanList ? 'rgba(59, 130, 246, 0.18)' : 'var(--background)', color: activeOceanList ? '#2563eb' : 'var(--text-secondary)'}}>
                    <Ship className="w-4 h-4" />
                  </div>
                  <div>
                    <div style={{fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)'}}>
                      Leg 1: Ocean Shipping
                    </div>
                    <div style={{fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)'}}>
                      USA Auction Yards ➔ {activeOceanList ? activeOceanList.destinationLabel : 'Mersin / Jebel Ali'}
                    </div>
                    <div style={{fontSize: '0.76rem', color: 'var(--text-secondary)'}}>
                      {activeOceanList ? `${auctionRates.length} auction lanes active` : 'No active ocean sheet'}
                    </div>
                  </div>
                </div>
                {activeOceanList && (
                  <span style={{fontWeight: 800, height: 20, fontSize: '0.7rem', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#1d4ed8'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"Active"</span>
                )}
              </div>

              {/* Leg 2: Overland Transit */}
              <div style={{padding: '12px', borderRadius: '16px', border: (activeTransitList || transitData) ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed var(--border)', background: (activeTransitList || transitData) ? 'rgba(16, 185, 129, 0.06)' : 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                  <div style={{width: 32, height: 32, borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: (activeTransitList || transitData) ? 'rgba(16, 185, 129, 0.18)' : 'var(--background)', color: (activeTransitList || transitData) ? '#059669' : 'var(--text-secondary)'}}>
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div style={{fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)'}}>
                      Leg 2: Overland Transit
                    </div>
                    <div style={{fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)'}}>
                      {transitData ? `${transitData.origin} ➔ ${transitData.destination}` : 'Mersin/UAE ➔ Islam Qala'}
                    </div>
                    <div style={{fontSize: '0.76rem', color: 'var(--text-secondary)'}}>
                      {transitData ? `Sedan: ${formatCurrency(transitData.rates.sedan)} • SUV: ${formatCurrency(transitData.rates.suv)} (Clearance incl.)` : 'No active transit sheet'}
                    </div>
                  </div>
                </div>
                {(activeTransitList || transitData) && (
                  <span style={{fontWeight: 800, height: 20, fontSize: '0.7rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#047857'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"Active"</span>
                )}
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
              <div style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--background)'}}>
                <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>
                  Destination
                </div>
                <div style={{marginTop: '4px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  {destinationLabel}
                </div>
              </div>

              <div style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--background)'}}>
                <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>
                  Auction Lanes
                </div>
                <div style={{marginTop: '4px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)'}}>
                  {auctionRates.length} rows
                </div>
              </div>

              <div style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--background)'}}>
                <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>
                  State Rates
                </div>
                <div style={{marginTop: '4px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)'}}>
                  {Object.keys(stateRates).length} states
                </div>
              </div>

              <div style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--background)'}}>
                <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>
                  Source File
                </div>
                <div style={{marginTop: '4px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>
                  {currentVersion?.sourceFileName || effectiveConfig?.updatedFromPdfName || 'Imported'}
                </div>
              </div>
            </div>

            {/* Shipment Lane Match Highlight (if provided) */}
            {highlightLane && (
              <div style={{padding: '14px', borderRadius: '16px', border: '1px solid rgba(var(--accent-gold-rgb), 0.35)', background: 'rgba(var(--accent-gold-rgb), 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'}}>
                <div style={{display: 'flex', alignItems: 'flex-start', gap: '10px'}}>
                  <div style={{marginTop: '2px', width: 28, height: 28, borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(var(--accent-gold-rgb), 0.2)', color: 'var(--accent-gold)'}}>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div style={{fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: 'var(--text-secondary)'}}>
                      Shipment Lane Context
                    </div>
                    <div style={{marginTop: '2px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem'}}>
                      {[highlightLane.stateCode, highlightLane.city, highlightLane.branch].filter(Boolean).join(' • ') || 'Shipment origin'}
                    </div>
                    {(exactMatchedLane || highlightLane.totalPrice) ? (
                      <div style={{marginTop: '2px', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                        Exact Location Rate: <strong style={{ color: 'var(--accent-gold)' }}>{formatCurrency(exactMatchedLane?.total || highlightLane.totalPrice || 0)}</strong>
                        {exactMatchedLane && (
                          <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            ({[exactMatchedLane.branch, exactMatchedLane.city].filter(Boolean).join(' - ')})
                          </span>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
                {highlightLane.stateCode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedState(highlightLane.stateCode || '');
                      setSearchQuery('');
                    }}
                  >
                    Filter to {highlightLane.stateCode}
                  </Button>
                )}
              </div>
            )}

            {/* Search and Filter Row */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 180px', gap: '12px'}}>
              <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]"><Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" /></span><input placeholder="Search state, branch, city, loading point, or price..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ds-form-field-control w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)] px-2.5 py-1.5 text-[0.8125rem] pl-9 border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]" /></div>
              <div className="relative"><select value={selectedState} onChange={(val) => setSelectedState(String(val))} className="ds-select-control w-full appearance-none rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors px-2.5 py-1.5 text-[0.8125rem] pr-9 border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]">
                <option value="">All States ({Object.keys(stateRates).length})</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name} {stateRates[s.code] ? `(${formatCurrency(stateRates[s.code])})` : ''}
                  </option>
                ))}
              </select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden="true" /></div>
            </div>

            {/* View Mode Tabs: Auction Lanes vs State Flat Rates */}
            <div style={{borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div role="tablist" aria-label="Price list views" style={{minHeight: 40, display: 'flex', gap: '4px', overflowX: 'auto'}}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'auction'}
                  onClick={() => setActiveTab('auction')}
                  className="shrink-0 cursor-pointer border-x-0 border-t-0 border-b-2 bg-transparent px-3 py-2 text-[0.8125rem] font-medium transition-colors"
                  style={{ borderBottomColor: activeTab === 'auction' ? 'var(--accent-gold)' : 'transparent', color: activeTab === 'auction' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}
                >
                  {`🌊 Ocean Auction Lanes (${filteredAuctionRates.length}${filteredAuctionRates.length !== auctionRates.length ? ` of ${auctionRates.length}` : ''})`}
                </button>
                {transitData && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'transit'}
                    onClick={() => setActiveTab('transit')}
                    className="shrink-0 cursor-pointer border-x-0 border-t-0 border-b-2 bg-transparent px-3 py-2 text-[0.8125rem] font-medium transition-colors"
                    style={{ borderBottomColor: activeTab === 'transit' ? 'var(--accent-gold)' : 'transparent', color: activeTab === 'transit' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}
                  >
                    🚚 Overland Transit Tariffs (Islam Qala)
                  </button>
                )}
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'states'}
                  onClick={() => setActiveTab('states')}
                  className="shrink-0 cursor-pointer border-x-0 border-t-0 border-b-2 bg-transparent px-3 py-2 text-[0.8125rem] font-medium transition-colors"
                  style={{ borderBottomColor: activeTab === 'states' ? 'var(--accent-gold)' : 'transparent', color: activeTab === 'states' ? 'var(--accent-gold)' : 'var(--text-secondary)' }}
                >
                  {`🏛️ State Flat Rates (${filteredStateRates.length})`}
                </button>
              </div>
              {activeTab === 'auction' && (searchQuery || selectedState) && (
                <div style={{display: 'flex', gap: '4px', alignItems: 'center'}}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Printer className="w-3.5 h-3.5" />}
                    onClick={() => handlePrint(false)}
                  >
                    Print ({filteredAuctionRates.length})
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedState('');
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>

            {/* Overland Transit Tariff Panel */}
            {activeTab === 'transit' && transitData && (
              <div style={{display: 'grid', gap: '16px'}}>
                {/* Route Header */}
                <div style={{padding: '16px', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.3)', background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                    <div style={{width: 40, height: 40, borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(16, 185, 129, 0.18)', color: '#059669'}}>
                      <Navigation className="w-5 h-5" />
                    </div>
                    <div>
                      <div style={{fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)'}}>
                        Overland Route Tariff
                      </div>
                      <div style={{fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)'}}>
                        {transitData.origin} ➔ {transitData.destination}
                      </div>
                      <div style={{fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px'}}>
                        Second leg: Port transit handling + overland container/car carrier transit to Afghanistan border
                      </div>
                    </div>
                  </div>
                  <div style={{display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <span style={{fontWeight: 800, fontSize: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.3)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-xs px-2.5 py-1 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">{<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}"Customs Clearance Included"</span>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Printer className="w-3.5 h-3.5" />}
                      onClick={handlePrintTransit}
                    >
                      Print Transit Tariff
                    </Button>
                  </div>
                </div>

                {/* Rate Cards for Vehicle Types */}
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  {/* Sedan Rate Card */}
                  <div style={{padding: '20px', borderRadius: '20px', border: '1px solid var(--border)', background: 'var(--panel)', display: 'grid', gap: '8px', position: 'relative', overflow: 'hidden'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <div>
                        <div style={{fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em'}}>
                          Standard Vehicle
                        </div>
                        <div style={{fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)'}}>
                          SEDAN / SALOON
                        </div>
                      </div>
                      <span style={{fontWeight: 700, height: 22, fontSize: '0.7rem'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"Standard"</span>
                    </div>
                    <div style={{marginTop: '4px', marginBottom: '4px'}}>
                      <div style={{fontSize: '2rem', fontWeight: 850, color: 'var(--text-primary)', lineHeight: 1}}>
                        {formatCurrency(transitData.rates.sedan)}
                      </div>
                      <div style={{fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                        USD per vehicle • Mersin/UAE to Islam Qala
                      </div>
                    </div>
                    <div style={{paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700}}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Includes port customs clearance & transit
                    </div>
                  </div>

                  {/* SUV Rate Card */}
                  <div style={{padding: '20px', borderRadius: '20px', border: '1px solid rgba(var(--accent-gold-rgb), 0.4)', background: 'linear-gradient(145deg, rgba(var(--accent-gold-rgb), 0.06), var(--panel))', display: 'grid', gap: '8px', position: 'relative', overflow: 'hidden'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                      <div>
                        <div style={{fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '0.05em'}}>
                          Large Vehicle
                        </div>
                        <div style={{fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)'}}>
                          SUV / 4X4 / TRUCK
                        </div>
                      </div>
                      <span style={{fontWeight: 700, height: 22, fontSize: '0.7rem', backgroundColor: 'rgba(var(--accent-gold-rgb), 0.15)', color: 'var(--accent-gold)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"Heavy / Large"</span>
                    </div>
                    <div style={{marginTop: '4px', marginBottom: '4px'}}>
                      <div style={{fontSize: '2rem', fontWeight: 850, color: 'var(--accent-gold)', lineHeight: 1}}>
                        {formatCurrency(transitData.rates.suv)}
                      </div>
                      <div style={{fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                        USD per vehicle • Mersin/UAE to Islam Qala
                      </div>
                    </div>
                    <div style={{paddingTop: '8px', borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700}}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Includes port customs clearance & transit
                    </div>
                  </div>
                </div>

                {/* Terms and Conditions */}
                {transitData.terms && transitData.terms.length > 0 && (
                  <div style={{padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                    <div style={{fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <FileText className="w-4 h-4 text-[var(--accent-gold)]" />
                      Tariff Terms & Conditions
                    </div>
                    <div style={{display: 'grid', gap: '6px'}}>
                      {transitData.terms.map((term: string, idx: number) => (
                        <div key={idx} style={{display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                          <div style={{width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--accent-gold)', marginTop: '6px', flexShrink: 0}} />
                          <div>{term}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validity and Source Note */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-secondary)', paddingLeft: '4px', paddingRight: '4px'}}>
                  <div>
                    Active version: <strong>{transitData.name || currentVersion?.name || 'Overland Tariff'}</strong>
                  </div>
                  {transitData.effectiveFrom && (
                    <div>
                      Effective: {new Date(transitData.effectiveFrom).toLocaleDateString()}
                      {transitData.effectiveTo ? ` – ${new Date(transitData.effectiveTo).toLocaleDateString()}` : ''}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Auction Lanes Table */}
            {activeTab === 'auction' && (
              <div style={{border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden'}}>
                <div style={{maxHeight: 420, overflow: 'auto'}}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 70 }}>State</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 150 }}>Branch / Auction</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 130 }}>City</th>
                        <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 120 }}>Loading Point</th>
                        <th style={{ textAlign: 'right', padding: '10px 12px', minWidth: 110 }}>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAuctionRates.length > 0 ? (
                        filteredAuctionRates.slice(0, 250).map((row, idx) => {
                          const isHighlighted = isLaneHighlighted(row);
                          return (
                            <tr
                              key={`${row.stateCode}-${row.branch}-${row.city}-${idx}`}
                              style={{
                                borderBottom: '1px solid var(--border)',
                                background: isHighlighted ? 'rgba(var(--accent-gold-rgb), 0.08)' : undefined,
                              }}
                            >
                              <td style={{ padding: '8px 12px', fontWeight: 800 }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: 'var(--panel)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-primary)',
                                }}>
                                  {row.stateCode}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: isHighlighted ? 700 : 500 }}>
                                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                  <span>{row.branch || '-'}</span>
                                  {isHighlighted && (
                                    <span style={{height: 18, fontSize: '0.65rem', fontWeight: 800, backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.3)'}} className="inline-flex items-center gap-1 rounded-full font-medium text-[0.7rem] px-2 py-0.5 border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)]">"Exact Match"</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                                {row.city || '-'}
                              </td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>
                                {row.loadingPoint || '-'}
                              </td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)' }}>
                                {formatCurrency(row.total)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No auction rates matching &quot;{searchQuery || selectedState}&quot;.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {filteredAuctionRates.length > 250 && (
                  <div style={{padding: '8px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--panel)'}}>
                    Showing first 250 of {filteredAuctionRates.length} matching rows. Use search to refine.
                  </div>
                )}
              </div>
            )}

            {/* State Flat Rates Grid */}
            {activeTab === 'states' && (
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', maxHeight: 420, overflow: 'auto', padding: '4px'}}>
                {filteredStateRates.length > 0 ? (
                  filteredStateRates.map(([code, rate]) => {
                    const stateObj = US_STATES.find((s) => s.code.toUpperCase() === code.toUpperCase());
                    const isStateMatch = highlightLane?.stateCode && highlightLane.stateCode.toUpperCase() === code.toUpperCase();

                    return (
                      <div key={code} style={{padding: '10px', borderRadius: '12px', border: isStateMatch ? '1px solid var(--accent-gold)' : '1px solid var(--border)', background: isStateMatch ? 'rgba(var(--accent-gold-rgb), 0.1)' : 'var(--panel)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px'}}>
                        <div>
                          <div style={{fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)'}}>
                            {code}
                          </div>
                          <div style={{fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100}}>
                            {stateObj?.name || code}
                          </div>
                        </div>
                        <div style={{fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)'}}>
                          {formatCurrency(rate)}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div style={{gridColumn: '1 / -1', paddingTop: '32px', paddingBottom: '32px', textAlign: 'center', color: 'var(--text-secondary)'}}>
                    No state rates found matching filter.
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}
