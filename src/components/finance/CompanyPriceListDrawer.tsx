'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Box,
  Tab,
  Tabs,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ReceiptText,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  GitCompareArrows,
  MapPin,
  DollarSign,
  FileText,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Printer,
  Ship,
  Truck,
  ShieldCheck,
  Navigation,
} from 'lucide-react';
import { Drawer, Button, StatsCard } from '@/components/design-system';
import { formatMoney as formatCurrency } from '@/lib/format';
import { printCompanyPriceList } from '@/lib/price-list-print';
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

  const handlePrint = (printAll = false) => {
    if (!effectiveConfig) return;
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(var(--accent-gold-rgb), 0.14)',
              color: 'var(--accent-gold)',
            }}
          >
            <ReceiptText className="w-5 h-5" />
          </Box>
          <Box>
            <Box sx={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
              Company Price List
            </Box>
            <Box sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              {companyName} {companyType ? `• ${companyType}` : ''}
            </Box>
          </Box>
        </Box>
      }
      description={`View shipping rates, auction lanes, and rate schedules for ${companyName}`}
      badge={
        hasPriceList ? (
          <Chip
            size="small"
            icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            label={currentVersion?.isActive ? 'Active Version' : currentVersion?.name || 'Rate Sheet'}
            sx={{
              fontWeight: 700,
              fontSize: '0.75rem',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              color: '#15803d',
              border: '1px solid rgba(34, 197, 94, 0.3)',
            }}
          />
        ) : (
          <Chip
            size="small"
            icon={<AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
            label="No Active Price List"
            sx={{
              fontWeight: 700,
              fontSize: '0.75rem',
              backgroundColor: 'rgba(234, 179, 8, 0.1)',
              color: 'var(--warning)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
            }}
          />
        )
      }
      actions={
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 1, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {hasPriceList && (
              <Button
                variant="primary"
                size="sm"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => handlePrint(false)}
              >
                {filteredAuctionRates.length !== auctionRates.length
                  ? `Print (${filteredAuctionRates.length} filtered)`
                  : 'Print Price List'}
              </Button>
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
          </Box>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </Box>
      }
    >
      <Box sx={{ display: 'grid', gap: 2.5 }}>
        {/* Loading State */}
        {loading && (
          <Box sx={{ py: 6, textAlign: 'center', color: 'var(--text-secondary)' }}>
            <ReceiptText className="w-8 h-8 mx-auto mb-2 animate-pulse text-[var(--accent-gold)]" />
            <Box sx={{ fontWeight: 600 }}>Loading company price list...</Box>
          </Box>
        )}

        {/* Empty State */}
        {!loading && !hasPriceList && (
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              border: '1px dashed var(--border)',
              background: 'var(--panel)',
              textAlign: 'center',
              display: 'grid',
              gap: 1.5,
              justifyItems: 'center',
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(var(--accent-gold-rgb), 0.12)',
                color: 'var(--accent-gold)',
              }}
            >
              <AlertTriangle className="w-6 h-6" />
            </Box>
            <Box>
              <Box sx={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                No Price List Uploaded
              </Box>
              <Box sx={{ mt: 0.5, fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 420 }}>
                This company does not currently have an active rate sheet imported. Uploading a PDF, CSV, or Excel rate sheet enables automated pricing and quick rate lookup inside the ledger.
              </Box>
            </Box>
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
          </Box>
        )}

        {/* Main Price List Content */}
        {!loading && hasPriceList && (
          <>
            {/* Version Selector (if multiple exist) */}
            {priceLists.length > 1 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  p: 1.25,
                  borderRadius: 2,
                  border: '1px solid var(--border)',
                  background: 'var(--panel)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Layers className="w-4 h-4 text-[var(--accent-gold)]" />
                  <Box sx={{ fontSize: '0.85rem', fontWeight: 650 }}>Version:</Box>
                </Box>
                <TextField
                  select
                  size="small"
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  sx={{ minWidth: 280 }}
                >
                  <MenuItem value="active">
                    Active Version {activeListFromProps?.name ? `(${activeListFromProps.name})` : ''}
                  </MenuItem>
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
                      <MenuItem key={list.id} value={list.id}>
                        {legPrefix} {corridor.shortLabel} — {list.name} {list.isActive ? '• Active' : ''} ({new Date(list.createdAt).toLocaleDateString()})
                      </MenuItem>
                    );
                  })}
                </TextField>
              </Box>
            )}

            {/* Dual-Leg Corridors Status Bar */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
              {/* Leg 1: Ocean Freight */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: activeOceanList ? '1px solid rgba(59, 130, 246, 0.4)' : '1px dashed var(--border)',
                  background: activeOceanList ? 'rgba(59, 130, 246, 0.06)' : 'var(--panel)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: activeOceanList ? 'rgba(59, 130, 246, 0.18)' : 'var(--background)',
                      color: activeOceanList ? '#2563eb' : 'var(--text-secondary)',
                    }}
                  >
                    <Ship className="w-4 h-4" />
                  </Box>
                  <Box>
                    <Box sx={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)' }}>
                      Leg 1: Ocean Shipping
                    </Box>
                    <Box sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      USA Auction Yards ➔ {activeOceanList ? activeOceanList.destinationLabel : 'Mersin / Jebel Ali'}
                    </Box>
                    <Box sx={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {activeOceanList ? `${auctionRates.length} auction lanes active` : 'No active ocean sheet'}
                    </Box>
                  </Box>
                </Box>
                {activeOceanList && (
                  <Chip
                    size="small"
                    label="Active"
                    sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#1d4ed8' }}
                  />
                )}
              </Box>

              {/* Leg 2: Overland Transit */}
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: (activeTransitList || transitData) ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed var(--border)',
                  background: (activeTransitList || transitData) ? 'rgba(16, 185, 129, 0.06)' : 'var(--panel)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: 1.5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: (activeTransitList || transitData) ? 'rgba(16, 185, 129, 0.18)' : 'var(--background)',
                      color: (activeTransitList || transitData) ? '#059669' : 'var(--text-secondary)',
                    }}
                  >
                    <Truck className="w-4 h-4" />
                  </Box>
                  <Box>
                    <Box sx={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)' }}>
                      Leg 2: Overland Transit
                    </Box>
                    <Box sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {transitData ? `${transitData.origin} ➔ ${transitData.destination}` : 'Mersin/UAE ➔ Islam Qala'}
                    </Box>
                    <Box sx={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                      {transitData ? `Sedan: ${formatCurrency(transitData.rates.sedan)} • SUV: ${formatCurrency(transitData.rates.suv)} (Clearance incl.)` : 'No active transit sheet'}
                    </Box>
                  </Box>
                </Box>
                {(activeTransitList || transitData) && (
                  <Chip
                    size="small"
                    label="Active"
                    sx={{ fontWeight: 800, height: 20, fontSize: '0.7rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#047857' }}
                  />
                )}
              </Box>
            </Box>

            {/* Quick Metrics Bar */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' },
                gap: 1.5,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                }}
              >
                <Box sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Destination
                </Box>
                <Box sx={{ mt: 0.5, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {destinationLabel}
                </Box>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                }}
              >
                <Box sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Auction Lanes
                </Box>
                <Box sx={{ mt: 0.5, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {auctionRates.length} rows
                </Box>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                }}
              >
                <Box sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                  State Rates
                </Box>
                <Box sx={{ mt: 0.5, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {Object.keys(stateRates).length} states
                </Box>
              </Box>

              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                }}
              >
                <Box sx={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>
                  Source File
                </Box>
                <Box sx={{ mt: 0.5, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentVersion?.sourceFileName || effectiveConfig?.updatedFromPdfName || 'Imported'}
                </Box>
              </Box>
            </Box>

            {/* Shipment Lane Match Highlight (if provided) */}
            {highlightLane && (
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: 2,
                  border: '1px solid rgba(var(--accent-gold-rgb), 0.35)',
                  background: 'rgba(var(--accent-gold-rgb), 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  flexWrap: 'wrap',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                  <Box
                    sx={{
                      mt: 0.25,
                      width: 28,
                      height: 28,
                      borderRadius: 1.5,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'rgba(var(--accent-gold-rgb), 0.2)',
                      color: 'var(--accent-gold)',
                    }}
                  >
                    <Sparkles className="w-4 h-4" />
                  </Box>
                  <Box>
                    <Box sx={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: 'var(--text-secondary)' }}>
                      Shipment Lane Context
                    </Box>
                    <Box sx={{ mt: 0.25, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                      {[highlightLane.stateCode, highlightLane.city, highlightLane.branch].filter(Boolean).join(' • ') || 'Shipment origin'}
                    </Box>
                    {(exactMatchedLane || highlightLane.totalPrice) ? (
                      <Box sx={{ mt: 0.25, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Exact Location Rate: <strong style={{ color: 'var(--accent-gold)' }}>{formatCurrency(exactMatchedLane?.total || highlightLane.totalPrice || 0)}</strong>
                        {exactMatchedLane && (
                          <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            ({[exactMatchedLane.branch, exactMatchedLane.city].filter(Boolean).join(' - ')})
                          </span>
                        )}
                      </Box>
                    ) : null}
                  </Box>
                </Box>
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
              </Box>
            )}

            {/* Search and Filter Row */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 180px' }, gap: 1.5 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search state, branch, city, loading point, or price..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />,
                }}
              />
              <TextField
                select
                size="small"
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                InputProps={{
                  startAdornment: <Filter className="w-4 h-4 mr-1 text-[var(--text-secondary)]" />,
                }}
              >
                <MenuItem value="">All States ({Object.keys(stateRates).length})</MenuItem>
                {US_STATES.map((s) => (
                  <MenuItem key={s.code} value={s.code}>
                    {s.code} - {s.name} {stateRates[s.code] ? `(${formatCurrency(stateRates[s.code])})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* View Mode Tabs: Auction Lanes vs State Flat Rates */}
            <Box
              sx={{
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{
                  minHeight: 40,
                  '& .MuiTab-root': {
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    minHeight: 40,
                    px: 1.5,
                    color: 'var(--text-secondary)',
                    '&.Mui-selected': {
                      color: 'var(--accent-gold)',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: 'var(--accent-gold)',
                  },
                }}
              >
                <Tab
                  value="auction"
                  label={`🌊 Ocean Auction Lanes (${filteredAuctionRates.length}${filteredAuctionRates.length !== auctionRates.length ? ` of ${auctionRates.length}` : ''})`}
                />
                {transitData && (
                  <Tab
                    value="transit"
                    label="🚚 Overland Transit Tariffs (Islam Qala)"
                  />
                )}
                <Tab
                  value="states"
                  label={`🏛️ State Flat Rates (${filteredStateRates.length})`}
                />
              </Tabs>
              {activeTab === 'auction' && (searchQuery || selectedState) && (
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
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
                </Box>
              )}
            </Box>

            {/* Overland Transit Tariff Panel */}
            {activeTab === 'transit' && transitData && (
              <Box sx={{ display: 'grid', gap: 2 }}>
                {/* Route Header */}
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.5,
                    flexWrap: 'wrap',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(16, 185, 129, 0.18)',
                        color: '#059669',
                      }}
                    >
                      <Navigation className="w-5 h-5" />
                    </Box>
                    <Box>
                      <Box sx={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                        Overland Route Tariff
                      </Box>
                      <Box sx={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {transitData.origin} ➔ {transitData.destination}
                      </Box>
                      <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mt: 0.25 }}>
                        Second leg: Port transit handling + overland container/car carrier transit to Afghanistan border
                      </Box>
                    </Box>
                  </Box>
                  <Chip
                    icon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                    label="Customs Clearance Included"
                    sx={{
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#047857',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  />
                </Box>

                {/* Rate Cards for Vehicle Types */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
                  {/* Sedan Rate Card */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      border: '1px solid var(--border)',
                      background: 'var(--panel)',
                      display: 'grid',
                      gap: 1,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Box sx={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                          Standard Vehicle
                        </Box>
                        <Box sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                          SEDAN / SALOON
                        </Box>
                      </Box>
                      <Chip
                        size="small"
                        label="Standard"
                        sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem' }}
                      />
                    </Box>
                    <Box sx={{ my: 0.5 }}>
                      <Box sx={{ fontSize: '2rem', fontWeight: 850, color: 'var(--text-primary)', lineHeight: 1 }}>
                        {formatCurrency(transitData.rates.sedan)}
                      </Box>
                      <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                        USD per vehicle • Mersin/UAE to Islam Qala
                      </Box>
                    </Box>
                    <Box sx={{ pt: 1, borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 700 }}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Includes port customs clearance & transit
                    </Box>
                  </Box>

                  {/* SUV Rate Card */}
                  <Box
                    sx={{
                      p: 2.5,
                      borderRadius: 2.5,
                      border: '1px solid rgba(var(--accent-gold-rgb), 0.4)',
                      background: 'linear-gradient(145deg, rgba(var(--accent-gold-rgb), 0.06), var(--panel))',
                      display: 'grid',
                      gap: 1,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Box sx={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent-gold)', letterSpacing: '0.05em' }}>
                          Large Vehicle
                        </Box>
                        <Box sx={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
                          SUV / 4X4 / TRUCK
                        </Box>
                      </Box>
                      <Chip
                        size="small"
                        label="Heavy / Large"
                        sx={{ fontWeight: 700, height: 22, fontSize: '0.7rem', bgcolor: 'rgba(var(--accent-gold-rgb), 0.15)', color: 'var(--accent-gold)' }}
                      />
                    </Box>
                    <Box sx={{ my: 0.5 }}>
                      <Box sx={{ fontSize: '2rem', fontWeight: 850, color: 'var(--accent-gold)', lineHeight: 1 }}>
                        {formatCurrency(transitData.rates.suv)}
                      </Box>
                      <Box sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)', mt: 0.5 }}>
                        USD per vehicle • Mersin/UAE to Islam Qala
                      </Box>
                    </Box>
                    <Box sx={{ pt: 1, borderTop: '1px solid var(--border)', fontSize: '0.78rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: 0.75, fontWeight: 700 }}>
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      Includes port customs clearance & transit
                    </Box>
                  </Box>
                </Box>

                {/* Terms and Conditions */}
                {transitData.terms && transitData.terms.length > 0 && (
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid var(--border)',
                      background: 'var(--panel)',
                    }}
                  >
                    <Box sx={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-primary)', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FileText className="w-4 h-4 text-[var(--accent-gold)]" />
                      Tariff Terms & Conditions
                    </Box>
                    <Box sx={{ display: 'grid', gap: 0.75 }}>
                      {transitData.terms.map((term: string, idx: number) => (
                        <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'var(--accent-gold)', mt: 0.75, shrink: 0 }} />
                          <Box>{term}</Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* Validity and Source Note */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem', color: 'var(--text-secondary)', px: 0.5 }}>
                  <Box>
                    Active version: <strong>{transitData.name || currentVersion?.name || 'Overland Tariff'}</strong>
                  </Box>
                  {transitData.effectiveFrom && (
                    <Box>
                      Effective: {new Date(transitData.effectiveFrom).toLocaleDateString()}
                      {transitData.effectiveTo ? ` – ${new Date(transitData.effectiveTo).toLocaleDateString()}` : ''}
                    </Box>
                  )}
                </Box>
              </Box>
            )}

            {/* Auction Lanes Table */}
            {activeTab === 'auction' && (
              <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
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
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <span>{row.branch || '-'}</span>
                                  {isHighlighted && (
                                    <Chip
                                      size="small"
                                      label="Exact Match"
                                      sx={{
                                        height: 18,
                                        fontSize: '0.65rem',
                                        fontWeight: 800,
                                        backgroundColor: 'rgba(34, 197, 94, 0.15)',
                                        color: '#15803d',
                                        border: '1px solid rgba(34, 197, 94, 0.3)',
                                      }}
                                    />
                                  )}
                                </Box>
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
                </Box>
                {filteredAuctionRates.length > 250 && (
                  <Box sx={{ p: 1, textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', background: 'var(--panel)' }}>
                    Showing first 250 of {filteredAuctionRates.length} matching rows. Use search to refine.
                  </Box>
                )}
              </Box>
            )}

            {/* State Flat Rates Grid */}
            {activeTab === 'states' && (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 1.25,
                  maxHeight: 420,
                  overflow: 'auto',
                  p: 0.5,
                }}
              >
                {filteredStateRates.length > 0 ? (
                  filteredStateRates.map(([code, rate]) => {
                    const stateObj = US_STATES.find((s) => s.code.toUpperCase() === code.toUpperCase());
                    const isStateMatch = highlightLane?.stateCode && highlightLane.stateCode.toUpperCase() === code.toUpperCase();

                    return (
                      <Box
                        key={code}
                        sx={{
                          p: 1.25,
                          borderRadius: 1.5,
                          border: isStateMatch ? '1px solid var(--accent-gold)' : '1px solid var(--border)',
                          background: isStateMatch ? 'rgba(var(--accent-gold-rgb), 0.1)' : 'var(--panel)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Box sx={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                            {code}
                          </Box>
                          <Box sx={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                            {stateObj?.name || code}
                          </Box>
                        </Box>
                        <Box sx={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {formatCurrency(rate)}
                        </Box>
                      </Box>
                    );
                  })
                ) : (
                  <Box sx={{ gridColumn: '1 / -1', py: 4, textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No state rates found matching filter.
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
}
