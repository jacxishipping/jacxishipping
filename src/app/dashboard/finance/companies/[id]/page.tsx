'use client';

import { formatMoney as formatCurrency } from '@/lib/format';
import { JXBox } from '@jacxishippingorg/jx-ui-react';

import { Suspense, ChangeEvent, ReactNode, useEffect, useMemo, useState, forwardRef, type CSSProperties, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Building2, Car, CheckCircle2, ChevronDown, DollarSign, Download, Eye, GitCompareArrows, Landmark, Navigation, Package, Pencil, Plus, Printer, ReceiptText, Search, ShieldCheck, Ship, Trash2, Truck, Upload } from 'lucide-react';
import PermissionRoute from "@/components/auth/PermissionRoute";
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Breadcrumbs, Button, FormField, IconButton, PageHeader, Select, StatsCard, TableSkeleton, Tooltip, toast, Modal } from '@/components/design-system';
import { DataTable, Column } from '@/components/ui/DataTable';
import { normalizeShippingRateConfig, type AuctionRateEntry, type ShippingRateCalculatorConfig } from '@/lib/shipping-rate-calculator';
import CompanyPriceListDrawer from '@/components/finance/CompanyPriceListDrawer';
import { printCompanyPriceList, printTransitPriceList } from '@/lib/price-list-print';
import { openUniversalShipmentExport } from '@/components/shipments/UniversalShipmentExportModal';
import { detectPriceListCorridor, isTransitPriceList, CORRIDOR_DEFINITIONS } from '@/lib/price-list-corridors';

/** Bare input with the Jacxi field look (no label) — search fields, table-cell editors. */
const BareInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, BareInputProps>(function BareInput(
  { leftIcon, rightIcon, rightElement, error = false, helperText, size = 'small', multiline = false, rows, minRows, inputProps, className, style, ...rest },
  ref,
) {
  const controlClass = [
    'w-full rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-secondary)]',
    size === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
    leftIcon ? 'pl-9' : '',
    rightIcon || rightElement ? 'pr-9' : '',
    error
      ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
      : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
    rest.disabled ? 'opacity-50' : '',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{leftIcon}</span>
        )}
        {multiline ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            {...(inputProps as unknown as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={ref as React.Ref<HTMLTextAreaElement>}
            rows={rows ?? minRows ?? 3}
            aria-invalid={error || undefined}
            style={style}
            className={`${controlClass} min-h-[80px] resize-y leading-[1.5]`}
          />
        ) : (
          <input
            {...rest}
            {...inputProps}
            ref={ref as React.Ref<HTMLInputElement>}
            aria-invalid={error || undefined}
            style={style}
            className={controlClass}
          />
        )}
        {rightIcon && (
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{rightIcon}</span>
        )}
        {rightElement && (
          <span className="absolute right-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{rightElement}</span>
        )}
      </div>
      {helperText && (
        <p className="mt-0.5 text-[0.75rem]" style={{ color: error ? 'var(--error)' : 'var(--text-secondary)' }}>{helperText}</p>
      )}
    </div>
  );
});

type BareInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Interactive element on the right (e.g. password visibility toggle). */
  rightElement?: ReactNode;
  error?: boolean;
  helperText?: ReactNode;
  size?: 'small' | 'medium';
  multiline?: boolean;
  rows?: number;
  minRows?: number;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
};


/** Bare select with the Jacxi field look (no label) — filter dropdowns. Keeps the native event onChange. */
function BareSelect({ options, placeholder, error = false, size = 'small', leftIcon, className, style, ...rest }: BareSelectProps) {
  return (
    <div className="relative">
      {leftIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-[var(--text-secondary)]">{leftIcon}</span>
      )}
      <select
        {...rest}
        aria-invalid={error || undefined}
        style={style}
        className={[
          'w-full appearance-none rounded-lg border bg-[var(--background)] text-[var(--text-primary)] outline-none transition-colors',
          size === 'small' ? 'px-2.5 py-1.5 text-[0.8125rem]' : 'px-3 py-2 text-[0.875rem]',
          leftIcon ? 'pl-9' : '',
          'pr-9',
          error
            ? 'border-[var(--error)] focus:border-[var(--error)] focus:ring-2 focus:ring-[rgba(var(--error-rgb),0.2)]'
            : 'border-[rgba(var(--border-rgb),0.9)] hover:border-[var(--border)] focus:border-[var(--accent-gold)] focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.2)]',
          rest.disabled ? 'opacity-50' : '',
          className,
        ].filter(Boolean).join(' ')}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={String(option.value)} disabled={option.disabled}>{option.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" aria-hidden="true" />
    </div>
  );
}

type BareSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  options: { value: string | number; label: string; disabled?: boolean }[];
  placeholder?: string;
  error?: boolean;
  size?: 'small' | 'medium';
  leftIcon?: ReactNode;
};


type PriceListImportMode = 'replace' | 'merge' | 'add_new';

const companyTabSlugs = ['ledger', 'shipments', 'operations', 'price-list', 'reports'];

function TabPanel({ children, value, index }: { children: ReactNode; value: number; index: number }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`company-tabpanel-${index}`} aria-labelledby={`company-tab-${index}`}>
      {value === index && <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, paddingTop: '16px'}}>{children}</JXBox>}
    </div>
  );
}

interface Company {
  id: string;
  name: string;
  code: string | null;
  companyType: 'SHIPPING' | 'DISPATCH' | 'TRANSIT';
  isShipping?: boolean;
  isDispatch?: boolean;
  isTransit?: boolean;
  email: string | null;
  phone: string | null;
  address: string | null;
  country: string | null;
  notes: string | null;
  isActive: boolean;
  priceListConfig?: ShippingRateCalculatorConfig | null;
  priceLists?: CompanyPriceListSummary[];
  _count?: {
    ledgerEntries: number;
    dispatches: number;
    containers: number;
    shipments: number;
    dispatchedShipments?: number;
    shippedShipments?: number;
    transitedShipments?: number;
    transits: number;
  };
  dispatches?: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    origin: string;
    destination: string;
    createdAt: string;
    _count: {
      shipments: number;
    };
  }>;
  containers?: Array<{
    id: string;
    containerNumber: string;
    status: string;
    currentCount: number;
    maxCapacity: number;
    createdAt: string;
  }>;
  shipments?: CompanyShipment[];
  transits?: Array<{
    id: string;
    referenceNumber: string;
    status: string;
    origin: string;
    destination: string;
    createdAt: string;
    _count: {
      shipments: number;
    };
  }>;
}

export interface CompanyShipment {
  id: string;
  vehicleVIN: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear?: number | null;
  vehicleColor?: string | null;
  lotNumber?: string | null;
  status: string;
  serviceType?: string;
  price?: number | null;
  companyShippingFare?: number | null;
  damageCost?: number | null;
  damageCredit?: number | null;
  createdAt: string;
  dispatchId?: string | null;
  containerId?: string | null;
  transitId?: string | null;
  shippingCompanyId?: string | null;
  isDispatched?: boolean;
  isShipped?: boolean;
  isTransited?: boolean;
  roles?: Array<'DISPATCH' | 'SHIPPING' | 'TRANSIT'>;
  dispatch?: {
    id: string;
    referenceNumber: string;
    status: string;
    origin?: string;
    destination?: string;
    dispatchDate?: string | null;
  } | null;
  container?: {
    id: string;
    containerNumber: string;
    status: string;
    trackingNumber?: string | null;
  } | null;
  transit?: {
    id: string;
    referenceNumber: string;
    status: string;
    origin?: string;
    destination?: string;
  } | null;
  customer?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

interface CompanySummary {
  totalDebit: number;
  totalCredit: number;
  totalExpenseCharges: number;
  currentBalance: number;
}

interface LedgerEntry {
  id: string;
  companyId?: string;
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  balance: number;
  category?: string | null;
  reference?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  company?: {
    id: string;
    name: string;
    code: string | null;
  };
}

interface CompanyPriceListSummary {
  id: string;
  name: string;
  destinationLabel: string;
  sourceFileName: string;
  importMode: string;
  importedStateRateCount: number;
  importedAuctionRateCount: number;
  config?: unknown;
  warnings: string[] | null;
  isActive: boolean;
  effectiveFrom: string | null;
  createdAt: string;
}

interface PriceListPreview {
  fileName: string;
  mode: PriceListImportMode;
  listName: string;
  destinationLabel: string;
  importedCount: number;
  importedAuctionRateCount: number;
  totalStateRateCount: number;
  totalAuctionRateCount: number;
  warnings: string[];
  parserStats?: {
    columnRows: number;
    flexibleRows: number;
    directRows: number;
    guessedRows: number;
    aiRows: number;
    totalRows: number;
    confidence: 'high' | 'medium' | 'low';
    notes: string[];
  };
  rowSourceSummary?: Record<string, number>;
  rows: AuctionRateEntry[];
  stateRates: Record<string, number>;
  extractedTextPreview: string;
}

interface ImportPreviewRow {
  transactionDate: string;
  description: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  reference: string | null;
  notes: string | null;
  isDuplicate: boolean;
  duplicateReason: 'ALREADY_IMPORTED' | 'DUPLICATE_IN_FILE' | null;
}

interface ImportPreview {
  totalCount: number;
  duplicateCount: number;
  importableCount: number;
  importableNetChange: number;
  currentBalance: number;
  projectedEndingBalance: number;
  statementEndingBalance: number | null;
  reconciliationDifference: number | null;
  reconciliationStatus: 'NOT_PROVIDED' | 'MATCH' | 'VARIANCE';
  rows: ImportPreviewRow[];
}

interface CompanyReport {
  summary: {
    transactionCount: number;
    totalDebit: number;
    totalCredit: number;
    netMovement: number;
    currentBalance: number;
  };
  monthlyBreakdown?: Array<{
    month: string;
    debit: number;
    credit: number;
    net: number;
  }>;
}

function summarizePreviewRowSources(rows: AuctionRateEntry[]) {
  return rows.reduce<Record<string, number>>((summary, row) => {
    const source = row.source || 'unknown';
    summary[source] = (summary[source] || 0) + 1;
    return summary;
  }, {});
}

function priceListLaneKey(rate: AuctionRateEntry) {
  return [
    rate.stateCode,
    rate.branch.trim().toLowerCase(),
    rate.city.trim().toLowerCase(),
    rate.loadingPoint?.trim().toLowerCase() || '',
  ].join('|');
}

function buildPriceListVersionComparison(currentConfig: ShippingRateCalculatorConfig, targetConfig: ShippingRateCalculatorConfig) {
  const stateCodes = Array.from(new Set([
    ...Object.keys(currentConfig.stateRates || {}),
    ...Object.keys(targetConfig.stateRates || {}),
  ])).sort();
  const changedStates = stateCodes
    .map((stateCode) => ({
      stateCode,
      current: currentConfig.stateRates[stateCode] ?? null,
      target: targetConfig.stateRates[stateCode] ?? null,
    }))
    .filter((row) => row.current !== row.target);

  const currentLanes = new Map((currentConfig.auctionRates || []).map((rate) => [priceListLaneKey(rate), rate]));
  const targetLanes = new Map((targetConfig.auctionRates || []).map((rate) => [priceListLaneKey(rate), rate]));
  const laneKeys = Array.from(new Set([...currentLanes.keys(), ...targetLanes.keys()]));
  const addedLanes = laneKeys.filter((key) => !currentLanes.has(key)).map((key) => targetLanes.get(key)).filter(Boolean) as AuctionRateEntry[];
  const removedLanes = laneKeys.filter((key) => !targetLanes.has(key)).map((key) => currentLanes.get(key)).filter(Boolean) as AuctionRateEntry[];
  const changedLanes = laneKeys
    .filter((key) => currentLanes.has(key) && targetLanes.has(key) && currentLanes.get(key)?.total !== targetLanes.get(key)?.total)
    .map((key) => ({
      current: currentLanes.get(key) as AuctionRateEntry,
      target: targetLanes.get(key) as AuctionRateEntry,
    }));

  return {
    changedStates,
    addedLanes,
    removedLanes,
    changedLanes,
  };
}

function CompanyLedgerDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const companyId = String(params.id || '');
  const focusedEntryId = searchParams.get('entryId') || '';

  const [company, setCompany] = useState<Company | null>(null);
  const [summary, setSummary] = useState<CompanySummary>({ totalDebit: 0, totalCredit: 0, totalExpenseCharges: 0, currentBalance: 0 });
  const [report, setReport] = useState<CompanyReport | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [openEntry, setOpenEntry] = useState(false);
  const [isPaymentMode, setIsPaymentMode] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [previewingImport, setPreviewingImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [priceListFile, setPriceListFile] = useState<File | null>(null);
  const [previewingPriceList, setPreviewingPriceList] = useState(false);
  const [importingPriceList, setImportingPriceList] = useState(false);
  const [priceListPreview, setPriceListPreview] = useState<PriceListPreview | null>(null);
  const [priceListSearch, setPriceListSearch] = useState('');
  const [activatingPriceListId, setActivatingPriceListId] = useState<string | null>(null);
  const [priceListVersionReview, setPriceListVersionReview] = useState<CompanyPriceListSummary | null>(null);
  const [priceListForm, setPriceListForm] = useState({
    name: '',
    destinationLabel: '',
    effectiveFrom: '',
    mode: 'merge' as PriceListImportMode,
  });
  const [filters, setFilters] = useState({ search: '', type: '', source: '', shipmentId: '' });
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentRoleFilter, setShipmentRoleFilter] = useState<'ALL' | 'DISPATCH' | 'SHIPPING' | 'TRANSIT'>('ALL');
  const [shipmentStatusFilter, setShipmentStatusFilter] = useState('ALL');

  const filteredCompanyShipments = useMemo(() => {
    const list = company?.shipments || [];
    return list.filter((s) => {
      if (shipmentRoleFilter === 'DISPATCH' && !s.isDispatched) return false;
      if (shipmentRoleFilter === 'SHIPPING' && !s.isShipped) return false;
      if (shipmentRoleFilter === 'TRANSIT' && !s.isTransited) return false;
      if (shipmentStatusFilter !== 'ALL' && s.status !== shipmentStatusFilter) return false;

      if (shipmentSearch.trim()) {
        const query = shipmentSearch.trim().toLowerCase();
        const matchesVin = s.vehicleVIN?.toLowerCase().includes(query);
        const matchesMake = s.vehicleMake?.toLowerCase().includes(query);
        const matchesModel = s.vehicleModel?.toLowerCase().includes(query);
        const matchesLot = s.lotNumber?.toLowerCase().includes(query);
        const matchesCustomer =
          s.customer?.name?.toLowerCase().includes(query) ||
          s.customer?.email?.toLowerCase().includes(query);
        const matchesDispatch = s.dispatch?.referenceNumber?.toLowerCase().includes(query);
        const matchesContainer = s.container?.containerNumber?.toLowerCase().includes(query);
        const matchesTransit = s.transit?.referenceNumber?.toLowerCase().includes(query);
        return Boolean(
          matchesVin ||
          matchesMake ||
          matchesModel ||
          matchesLot ||
          matchesCustomer ||
          matchesDispatch ||
          matchesContainer ||
          matchesTransit
        );
      }

      return true;
    });
  }, [company?.shipments, shipmentSearch, shipmentRoleFilter, shipmentStatusFilter]);
  const [importForm, setImportForm] = useState({
    category: 'Bank Statement',
    statementEndingBalance: '',
  });
  const [formData, setFormData] = useState({
    description: '',
    type: 'CREDIT',
    amount: '',
    transactionDate: new Date().toISOString().slice(0, 10),
    category: '',
    reference: '',
    notes: '',
  });

  // Edit entry state
  const [openEditEntry, setOpenEditEntry] = useState(false);
  const [editEntry, setEditEntry] = useState<LedgerEntry | null>(null);
  const [editForm, setEditForm] = useState({
    description: '',
    type: 'CREDIT',
    amount: '',
    transactionDate: new Date().toISOString().slice(0, 10),
    category: '',
    reference: '',
    notes: '',
  });
  const [updating, setUpdating] = useState(false);
  const [focusedEntry, setFocusedEntry] = useState<LedgerEntry | null>(null);
  const [focusedEntryLoading, setFocusedEntryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [openPriceListDrawer, setOpenPriceListDrawer] = useState(false);
  const [inlineRateSearch, setInlineRateSearch] = useState('');
  const [showInlineRateLookup, setShowInlineRateLookup] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const index = tab ? companyTabSlugs.indexOf(tab) : -1;
    if (index >= 0 && index !== activeTab) setActiveTab(index);
  }, [activeTab, searchParams]);

  const companyTypeLabel =
    company?.companyType === 'SHIPPING'
      ? 'Shipping'
      : company?.companyType === 'DISPATCH'
      ? 'Dispatch'
      : 'Transit';

  const activePriceListRows = useMemo(() => {
    const rows = company?.priceListConfig?.auctionRates || [];
    const query = priceListSearch.trim().toLowerCase();
    if (!query) return rows.slice(0, 200);

    return rows
      .filter((row) => [
        row.stateCode,
        row.branch,
        row.city,
        row.loadingPoint || '',
        String(row.total),
      ].join(' ').toLowerCase().includes(query))
      .slice(0, 200);
  }, [company?.priceListConfig?.auctionRates, priceListSearch]);

  const [rateLookupLeg, setRateLookupLeg] = useState<'ocean' | 'transit'>('ocean');

  const activePriceListWarnings = useMemo(() => {
    const activeList = company?.priceLists?.find((list) => list.isActive);
    return Array.isArray(activeList?.warnings) ? activeList.warnings : [];
  }, [company?.priceLists]);

  // Dual-leg recognition: Ocean (Leg 1) vs Overland Transit (Leg 2)
  const activeOceanPriceList = useMemo(() => {
    return company?.priceLists?.find((l) => l.isActive && !isTransitPriceList(l)) || null;
  }, [company?.priceLists]);

  const activeTransitPriceList = useMemo(() => {
    return company?.priceLists?.find((l) => l.isActive && isTransitPriceList(l)) || null;
  }, [company?.priceLists]);

  // Active Price List fallback
  const activePriceList = activeOceanPriceList || activeTransitPriceList;

  // Overland transit data structured
  const activeTransitData = useMemo(() => {
    const cfgTransit = (company?.priceListConfig as any)?.transit;
    if (cfgTransit) return cfgTransit;
    if (activeTransitPriceList) {
      const cfg = activeTransitPriceList.config as any;
      return {
        name: activeTransitPriceList.name,
        origin: cfg?.origin || (activeTransitPriceList.name.toLowerCase().includes('uae') ? 'Dubai / Jebel Ali, UAE' : 'Mersin, Turkey'),
        destination: cfg?.destination || activeTransitPriceList.destinationLabel || 'Islam Qala, Herat',
        rates: cfg?.rates || cfg?.transitRates || { sedan: 2300, suv: 2400 },
        terms: cfg?.terms || (cfg?.transitRates?.terms) || [
          'Rates include customs clearance and transportation.',
          'Applicable based on departure port shipping date.',
        ],
        effectiveFrom: activeTransitPriceList.effectiveFrom || cfg?.effectiveFrom,
      };
    }
    return null;
  }, [company?.priceListConfig, activeTransitPriceList]);

  const activePriceListStateCount = useMemo(() => Object.keys(company?.priceListConfig?.stateRates || {}).length, [company?.priceListConfig?.stateRates]);
  const activePriceListLaneCount = company?.priceListConfig?.auctionRates?.length || 0;
  const priceListHistoryCount = company?.priceLists?.length || 0;
  const scrollToPriceListSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const priceListVersionComparison = useMemo(() => {
    if (!company || !priceListVersionReview) return null;
    return buildPriceListVersionComparison(
      normalizeShippingRateConfig(company.priceListConfig),
      normalizeShippingRateConfig(priceListVersionReview.config),
    );
  }, [company, priceListVersionReview]);

  const { inlineMatchedRates, totalInlineMatches } = useMemo(() => {
    const activeConfig = normalizeShippingRateConfig(activePriceList?.config || company?.priceListConfig);
    const rates = activeConfig.auctionRates || [];
    const q = inlineRateSearch.trim().toLowerCase();
    if (!q) {
      return { inlineMatchedRates: rates.slice(0, 6), totalInlineMatches: rates.length };
    }
    const matched = rates.filter((r) =>
      [r.stateCode, r.branch, r.city, r.loadingPoint || '', String(r.total)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    ).sort((a, b) => {
      const aExact = a.city?.toLowerCase() === q || a.branch?.toLowerCase() === q || a.stateCode?.toLowerCase() === q;
      const bExact = b.city?.toLowerCase() === q || b.branch?.toLowerCase() === q || b.stateCode?.toLowerCase() === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return 0;
    });
    return { inlineMatchedRates: matched.slice(0, 6), totalInlineMatches: matched.length };
  }, [activePriceList?.config, company?.priceListConfig, inlineRateSearch]);

  const handlePrintActivePriceList = () => {
    if (!company) return;
    const config = normalizeShippingRateConfig(activeOceanPriceList?.config || company.priceListConfig);
    printCompanyPriceList({
      companyName: company.name,
      companyType: companyTypeLabel,
      priceListName: activeOceanPriceList?.name || 'Active Ocean Price List',
      destinationLabel: config.destinationLabel || 'Standard Destination',
      sourceFileName: activeOceanPriceList?.sourceFileName || config.updatedFromPdfName,
      effectiveDate: activeOceanPriceList?.effectiveFrom || config.updatedAt,
      auctionRates: config.auctionRates,
      stateRates: config.stateRates,
    });
  };

  const handlePrintTransitTariff = () => {
    if (!company) return;
    const transitConfig = activeTransitData;
    if (!transitConfig) return;
    printTransitPriceList({
      companyName: company.name,
      companyType: companyTypeLabel,
      priceListName: activeTransitPriceList?.name || 'Overland Transit Tariff',
      origin: transitConfig.origin,
      destination: transitConfig.destination,
      destinationLabel: transitConfig.destinationLabel || 'Islam Qala, Herat',
      sourceFileName: activeTransitPriceList?.sourceFileName,
      effectiveFrom: transitConfig.effectiveFrom,
      effectiveTo: transitConfig.effectiveTo,
      rates: transitConfig.rates,
      terms: transitConfig.terms,
      carrierInfo: transitConfig.company,
    });
  };

  const handlePrintPriceListVersion = (list: CompanyPriceListSummary) => {
    if (!company) return;
    const corridor = detectPriceListCorridor({
      fileName: list.sourceFileName,
      destinationLabel: list.destinationLabel,
      name: list.name,
      config: list.config,
      auctionRateCount: list.importedAuctionRateCount,
    });

    if (corridor.leg === 'TRANSIT') {
      const cfg = list.config as any;
      const transitObj = cfg?.transit || cfg;
      const rates = transitObj?.rates || { sedan: 2300, suv: 2400 };
      printTransitPriceList({
        companyName: company.name,
        companyType: companyTypeLabel,
        priceListName: list.name,
        origin: transitObj?.origin || corridor.origin,
        destination: transitObj?.destination || corridor.destination,
        destinationLabel: list.destinationLabel || corridor.destination,
        sourceFileName: list.sourceFileName,
        effectiveFrom: list.effectiveFrom ? new Date(list.effectiveFrom).toLocaleDateString() : undefined,
        rates,
        terms: transitObj?.terms || [
          'Rates include port customs clearance, transit declarations, and overland transportation from port to Islam Qala border terminal.',
          'Rate Validity: Rates are applicable based on the date the vehicle departs from origin port.',
          'Standard Terms: All shipments are subject to carrier terms and conditions.',
        ],
        carrierInfo: transitObj?.company,
      });
      return;
    }

    const config = normalizeShippingRateConfig(list.config || company.priceListConfig);
    printCompanyPriceList({
      companyName: company.name,
      companyType: companyTypeLabel,
      priceListName: list.name,
      destinationLabel: list.destinationLabel || config.destinationLabel || 'Standard Destination',
      sourceFileName: list.sourceFileName || config.updatedFromPdfName,
      effectiveDate: list.effectiveFrom || config.updatedAt,
      auctionRates: config.auctionRates,
      stateRates: config.stateRates,
    });
  };

  const companyTabs = useMemo(() => [
    { label: 'Ledger', icon: <ReceiptText className="h-4 w-4" /> },
    {
      label: `Shipments${company?.shipments?.length ? ` (${company.shipments.length})` : ''}`,
      icon: <Package className="h-4 w-4" />,
    },
    {
      label: 'Operations',
      icon: <Truck className="h-4 w-4" />,
    },
    { label: 'Price List', icon: <Upload className="h-4 w-4" /> },
    { label: 'Reports', icon: <DollarSign className="h-4 w-4" /> },
  ], [company?.shipments?.length]);

  const isExpenseRecoveryEntry = (row: LedgerEntry) => {
    const category = (row.category || '').toLowerCase();
    if (category.includes('expense recovery') || category.includes('shipping fare') || category.includes('damage cost')) return true;

    const metadata = (row.metadata || {}) as Record<string, unknown>;
    return (
      metadata.isExpenseRecovery === true ||
      metadata.isDispatchExpense === true ||
      metadata.isTransitExpense === true ||
      metadata.isContainerExpense === true ||
      metadata.isShipmentShippingFare === true ||
      metadata.isShipmentDamage === true ||
      typeof row.reference === 'string' &&
        (row.reference.startsWith('shipment-expense:') ||
          row.reference.startsWith('dispatch-expense:') ||
          row.reference.startsWith('transit-expense:') ||
          row.reference.startsWith('container-expense:') ||
          row.reference.startsWith('shipment-shipping-fare:') ||
          row.reference.startsWith('shipment-damage:'))
    );
  };

  const getDisplayType = (row: LedgerEntry) => (isExpenseRecoveryEntry(row) ? 'CREDIT' : row.type);

  const isBankImportedEntry = (row: LedgerEntry) => {
    const metadata = (row.metadata || {}) as Record<string, unknown>;
    return metadata.importSource === 'BANK_OF_AMERICA_CSV';
  };

  const resetImportForm = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportForm({ category: 'Bank Statement', statementEndingBalance: '' });
  };

  const fetchCompany = async () => {
    const response = await fetch(`/api/finance/companies/${companyId}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch company');
    }

    setCompany(data.company);
    setSummary(data.summary);
  };

  const fetchLedger = async () => {
    const params = new URLSearchParams();
    if (filters.search) params.append('search', filters.search);
    if (filters.type) params.append('type', filters.type);
    if (filters.source) params.append('source', filters.source);
    if (filters.shipmentId) params.append('shipmentId', filters.shipmentId);

    const response = await fetch(`/api/finance/companies/${companyId}/ledger?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch ledger entries');
    }

    setEntries(data.entries || []);
    setSummary(data.summary || { totalDebit: 0, totalCredit: 0, totalExpenseCharges: 0, currentBalance: 0 });
  };

  const canEditEntry = (row: LedgerEntry) => getDisplayType(row) === 'CREDIT' && !isExpenseRecoveryEntry(row);

  const fetchReport = async () => {
    const response = await fetch(`/api/finance/companies/${companyId}/reports`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch report');
    }

    setReport(data);
  };

  const fetchAll = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchCompany(), fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load company ledger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      void fetchAll();
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    void fetchLedger();
  }, [filters.search, filters.type, filters.source, filters.shipmentId]);

  useEffect(() => {
    if (!focusedEntryId) {
      setFocusedEntry(null);
      return;
    }

    const fetchFocusedEntry = async () => {
      try {
        setFocusedEntryLoading(true);
        const response = await fetch(`/api/finance/companies/ledger/${focusedEntryId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load focused ledger entry');
        }

        if (data.entry?.company?.id !== companyId) {
          throw new Error('The selected ledger entry does not belong to this company');
        }

        setFocusedEntry(data.entry);
      } catch (error) {
        console.error(error);
        setFocusedEntry(null);
        toast.error(error instanceof Error ? error.message : 'Failed to load focused ledger entry');
      } finally {
        setFocusedEntryLoading(false);
      }
    };

    void fetchFocusedEntry();
  }, [companyId, focusedEntryId]);

  const clearFocusedEntry = () => {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete('entryId');
    const queryString = nextParams.toString();
    router.replace(queryString ? `/dashboard/finance/companies/${companyId}?${queryString}` : `/dashboard/finance/companies/${companyId}`);
  };

  const handleCreateEntry = async () => {
    if (!formData.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      setPosting(true);
      const response = await fetch(`/api/finance/companies/${companyId}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: formData.description,
          type: formData.type,
          amount,
          transactionDate: formData.transactionDate,
          category: formData.category || undefined,
          reference: formData.reference || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create transaction');
      }

      toast.success('Transaction created');
      setOpenEntry(false);
      setIsPaymentMode(false);
      setFormData({
        description: '',
        type: 'CREDIT',
        amount: '',
        transactionDate: new Date().toISOString().slice(0, 10),
        category: '',
        reference: '',
        notes: '',
      });
      // Reset type filter so the new entry is always visible
      setFilters((prev) => ({ ...prev, type: '' }));

      await Promise.all([fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to create transaction');
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Delete this transaction?')) return;

    try {
      const response = await fetch(`/api/finance/companies/ledger/${entryId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      toast.success('Transaction deleted');
      await Promise.all([fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete transaction');
    }
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImportFile(event.target.files?.[0] || null);
    setImportPreview(null);
  };

  const handlePriceListFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPriceListFile(event.target.files?.[0] || null);
    setPriceListPreview(null);
  };

  const handleUpdatePreviewRow = (index: number, field: keyof AuctionRateEntry, value: string) => {
    setPriceListPreview((preview) => {
      if (!preview) return preview;

      const rows = preview.rows.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        return {
          ...row,
          [field]: field === 'total' ? Number(value) || 0 : value,
          source: 'manual' as const,
          confidence: 'high' as const,
          sourceNote: 'Reviewed or edited in the import preview.',
        };
      });

      return {
        ...preview,
        rows,
        importedAuctionRateCount: rows.length,
        rowSourceSummary: summarizePreviewRowSources(rows),
      };
    });
  };

  const handleDeletePreviewRow = (index: number) => {
    setPriceListPreview((preview) => {
      if (!preview) return preview;
      const rows = preview.rows.filter((_, rowIndex) => rowIndex !== index);

      return {
        ...preview,
        rows,
        importedAuctionRateCount: rows.length,
        rowSourceSummary: summarizePreviewRowSources(rows),
      };
    });
  };

  const downloadPriceListImportReport = () => {
    if (!priceListPreview) return;

    const rows = [
      ['File', priceListPreview.fileName],
      ['List Name', priceListPreview.listName],
      ['Destination', priceListPreview.destinationLabel],
      ['Mode', priceListPreview.mode],
      ['State Rates Found', String(priceListPreview.importedCount)],
      ['Auction Rows Found', String(priceListPreview.rows.length)],
      ['Parser Confidence', priceListPreview.parserStats?.confidence || 'unknown'],
      ['Column Rows', String(priceListPreview.parserStats?.columnRows ?? 0)],
      ['Flexible Rows', String(priceListPreview.parserStats?.flexibleRows ?? 0)],
      ['Guessed Rows', String(priceListPreview.parserStats?.guessedRows ?? 0)],
      ['AI Rows', String(priceListPreview.parserStats?.aiRows ?? 0)],
      ['Manual Rows', String(priceListPreview.rowSourceSummary?.manual ?? 0)],
      [],
      ['Warnings'],
      ...(priceListPreview.warnings.length ? priceListPreview.warnings.map((warning) => [warning]) : [['No warnings']]),
      [],
      ['Parser Notes'],
      ...(priceListPreview.parserStats?.notes.length ? priceListPreview.parserStats.notes.map((note) => [note]) : [['No parser notes']]),
      [],
      ['State', 'Branch', 'City', 'Loading Point', 'Total', 'Source', 'Confidence', 'Note'],
      ...priceListPreview.rows.map((row) => [
        row.stateCode,
        row.branch,
        row.city,
        row.loadingPoint || '',
        String(row.total),
        row.source || '',
        row.confidence || '',
        row.sourceNote || '',
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${priceListPreview.listName || 'price-list'}-import-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const appendPriceListForm = (body: FormData, action: 'preview' | 'import') => {
    body.append('action', action);
    body.append('mode', priceListForm.mode);
    body.append('name', priceListForm.name.trim());
    body.append('destinationLabel', priceListForm.destinationLabel.trim());
    body.append('effectiveFrom', priceListForm.effectiveFrom);
  };

  const handlePreviewPriceListPdf = async () => {
    if (!priceListFile) {
      toast.error('Select a price list PDF first');
      return;
    }

    try {
      setPreviewingPriceList(true);
      const body = new FormData();
      body.append('file', priceListFile);
      appendPriceListForm(body, 'preview');

      const response = await fetch(`/api/finance/companies/${companyId}/price-list/import-pdf`, {
        method: 'POST',
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import company price list');
      }

      setPriceListPreview(data.preview as PriceListPreview);
      toast.success('Price list preview ready');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to preview company price list');
    } finally {
      setPreviewingPriceList(false);
    }
  };

  const handleImportPriceListPdf = async () => {
    if (!priceListFile) {
      toast.error('Select a price list PDF first');
      return;
    }

    if (!priceListPreview) {
      toast.error('Preview the price list before importing');
      return;
    }

    try {
      setImportingPriceList(true);
      const body = new FormData();
      body.append('file', priceListFile);
      body.append('rowsJson', JSON.stringify(priceListPreview.rows));
      appendPriceListForm(body, 'import');

      const response = await fetch(`/api/finance/companies/${companyId}/price-list/import-pdf`, {
        method: 'POST',
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import company price list');
      }

      setPriceListFile(null);
      setPriceListPreview(null);
      await fetchCompany();
      toast.success(`Imported ${data.importedAuctionRateCount || data.importedCount} rates for ${company?.name || 'company'}`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to import company price list');
    } finally {
      setImportingPriceList(false);
    }
  };

  const handleActivatePriceList = async (priceListId: string) => {
    try {
      setActivatingPriceListId(priceListId);
      const response = await fetch(`/api/finance/companies/${companyId}/price-list/${priceListId}/activate`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate price list');
      }

      await fetchCompany();
      setPriceListVersionReview(null);
      toast.success('Price list activated');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to activate price list');
    } finally {
      setActivatingPriceListId(null);
    }
  };

  const handlePreviewBankCsv = async () => {
    if (!importFile) {
      toast.error('Select a CSV file to preview');
      return;
    }

    try {
      setPreviewingImport(true);
      const body = new FormData();
      body.append('action', 'preview');
      body.append('file', importFile);
      body.append('category', importForm.category.trim() || 'Bank Statement');
      body.append('sourceLabel', 'Bank of America CSV');
      body.append('statementEndingBalance', importForm.statementEndingBalance.trim());

      const response = await fetch(`/api/finance/companies/${companyId}/ledger/import-bank-csv`, {
        method: 'POST',
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to preview Bank of America CSV');
      }

      setImportPreview(data.preview as ImportPreview);
      toast.success('Bank CSV preview ready');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to preview Bank of America CSV');
    } finally {
      setPreviewingImport(false);
    }
  };

  const handleImportBankCsv = async () => {
    if (!importFile) {
      toast.error('Select a CSV file to import');
      return;
    }

    if (!importPreview) {
      toast.error('Preview the CSV before importing');
      return;
    }

    try {
      setImporting(true);
      const body = new FormData();
      body.append('action', 'import');
      body.append('file', importFile);
      body.append('category', importForm.category.trim() || 'Bank Statement');
      body.append('sourceLabel', 'Bank of America CSV');
      body.append('statementEndingBalance', importForm.statementEndingBalance.trim());

      const response = await fetch(`/api/finance/companies/${companyId}/ledger/import-bank-csv`, {
        method: 'POST',
        body,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import Bank of America CSV');
      }

      if (data.importedCount > 0) {
        toast.success(
          `${data.importedCount} bank transaction${data.importedCount === 1 ? '' : 's'} imported`,
          data.skippedCount > 0
            ? { description: `${data.skippedCount} duplicate row${data.skippedCount === 1 ? '' : 's'} skipped` }
            : undefined
        );
      } else {
        toast.info(
          'No new bank transactions were imported',
          data.skippedCount > 0
            ? { description: 'All rows were already imported previously' }
            : undefined
        );
      }

      setFilters({ search: '', type: '', source: 'BANK_IMPORT', shipmentId: '' });
      setOpenImportDialog(false);
      resetImportForm();
      await Promise.all([fetchCompany(), fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to import Bank of America CSV');
    } finally {
      setImporting(false);
    }
  };

  const openEditEntryDialog = (entry: LedgerEntry, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditEntry(entry);
    setEditForm({
      description: entry.description,
      type: entry.type,
      amount: String(entry.amount),
      transactionDate: new Date(entry.transactionDate).toISOString().slice(0, 10),
      category: entry.category || '',
      reference: entry.reference || '',
      notes: entry.notes || '',
    });
    setOpenEditEntry(true);
  };

  const handleEditEntry = async () => {
    if (!editEntry) return;

    if (!editForm.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = parseFloat(editForm.amount);
    if (!amount || amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`/api/finance/companies/ledger/${editEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description,
          type: editForm.type,
          amount,
          transactionDate: editForm.transactionDate,
          category: editForm.category || null,
          reference: editForm.reference || null,
          notes: editForm.notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      toast.success('Transaction updated');
      setOpenEditEntry(false);
      setEditEntry(null);
      await Promise.all([fetchLedger(), fetchReport()]);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to update transaction');
    } finally {
      setUpdating(false);
    }
  };

  const columns = useMemo<Column<LedgerEntry>[]>(
    () => [
      {
        key: 'transactionDate',
        header: 'Date',
        sortable: true,
        render: (_, row) => new Date(row.transactionDate).toLocaleDateString(),
      },
      {
        key: 'description',
        header: 'Description',
        sortable: true,
        render: (_, row) => {
          const metadata = (row.metadata || {}) as Record<string, unknown>;
          const priceListName = (metadata.priceListName as string) || (typeof row.reference === 'string' && row.reference.startsWith('price-list') ? 'Price List' : null);

          return (
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 500}}>{row.description}</JXBox>
                {isBankImportedEntry(row) && (
                  <JXBox padding="none" border={false} component="span" style={{display: 'inline-flex', alignItems: 'center', paddingLeft: '6px', paddingRight: '6px', paddingTop: '2px', paddingBottom: '2px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em', backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', border: '1px solid rgba(59, 130, 246, 0.22)', textTransform: 'uppercase'}}>
                    Bank Import
                  </JXBox>
                )}
                {priceListName && (
                  <button type="button" onClick={(e) => {
                      e.stopPropagation();
                      setOpenPriceListDrawer(true);
                    }} style={{display: 'inline-flex', alignItems: 'center', gap: '4px', paddingLeft: '6px', paddingRight: '6px', paddingTop: '1.6px', paddingBottom: '1.6px', borderRadius: '8px', fontSize: '0.68rem', fontWeight: 700, backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)', color: 'var(--accent-gold)', border: '1px solid rgba(var(--accent-gold-rgb), 0.28)', cursor: 'pointer'}}>
                    <ReceiptText className="w-3 h-3" />
                    {priceListName}
                  </button>
                )}
              </JXBox>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>
                {row.category || 'General'}{row.reference ? ` • Ref: ${row.reference}` : ''}
              </JXBox>
            {(() => {
              const metadata = (row.metadata || {}) as Record<string, unknown>;
              const metaShipmentId = typeof metadata.shipmentId === 'string' ? metadata.shipmentId : null;
              const linked = metaShipmentId
                ? (company?.shipments || []).find((s) => s.id === metaShipmentId)
                : (company?.shipments || []).find(
                    (s) =>
                      Boolean(row.reference && s.id && row.reference.includes(s.id)) ||
                      Boolean(s.vehicleVIN && row.description && row.description.toLowerCase().includes(s.vehicleVIN.toLowerCase()))
                  );

              if (!linked && !metaShipmentId) return null;

              const label = linked
                ? `${linked.vehicleVIN ? `${linked.vehicleVIN.slice(-8)} • ` : ''}${[linked.vehicleYear, linked.vehicleMake, linked.vehicleModel].filter(Boolean).join(' ') || 'Shipment'}`
                : `Shipment #${metaShipmentId?.slice(-6)}`;

              return (
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px'}}>
                  <Link
                    href={`/dashboard/shipments/${linked?.id || metaShipmentId}`}
                    style={{ textDecoration: 'none' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <JXBox padding="none" border={false} component="span" style={{display: 'inline-flex', alignItems: 'center', gap: '4px', paddingLeft: '8px', paddingRight: '8px', paddingTop: '2px', paddingBottom: '2px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'rgba(var(--accent-gold-rgb), 0.12)', color: 'var(--accent-gold)', border: '1px solid rgba(var(--accent-gold-rgb), 0.28)', transition: 'all 0.15s ease'}}>
                      <Car className="w-3 h-3" />
                      <span>{label}</span>
                    </JXBox>
                  </Link>
                </JXBox>
              );
            })()}
          </JXBox>
        );
      },
    },
    {
      key: 'type',
        header: 'Type',
        align: 'center',
        render: (_, row) => {
          const normalizedType = getDisplayType(row);
          return normalizedType;
        },
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        render: (_, row) => {
          const normalizedType = getDisplayType(row);
          return (
          <span style={{ color: normalizedType === 'DEBIT' ? 'var(--error)' : '#22c55e', fontWeight: 600 }}>
            {/* Money direction (Round 3 F4): DEBIT is money out (−, red),
                CREDIT is money in (+, green). */}
            {normalizedType === 'DEBIT' ? '−' : '+'}{formatCurrency(row.amount)}
          </span>
          );
        },
      },
      {
        key: 'balance',
        header: 'Balance',
        align: 'right',
        render: (_, row) => <span style={{ fontWeight: 600 }}>{formatCurrency(row.balance)}</span>,
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'center',
        render: (_, row) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
            {canEditEntry(row) && (
              <Tooltip title="Edit transaction" arrow={false}>
                <IconButton icon={<Pencil className="w-4 h-4" />} ariaLabel="Edit entry" variant="ghost" size="sm" onClick={(event) => openEditEntryDialog(row, event)} />
              </Tooltip>
            )}
            <Tooltip title="Delete transaction" arrow={false}>
              <IconButton icon={<Trash2 className="w-4 h-4" />} ariaLabel="Delete entry" variant="ghost" size="sm" color="error" onClick={(event) => {
                  event.stopPropagation();
                  void handleDeleteEntry(row.id);
                }} />
            </Tooltip>
          </JXBox>
        ),
      },
    ],
    [company?.shipments]
  );

  const shipmentColumns = useMemo<Column<CompanyShipment>[]>(
    () => [
      {
        key: 'vehicleVIN',
        header: 'Vehicle / VIN',
        sortable: true,
        render: (_, row) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
              <span className="font-mono font-semibold tracking-wide text-xs text-[var(--text-primary)]">
                {row.vehicleVIN || 'No VIN'}
              </span>
              {row.lotNumber && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Lot: {row.lotNumber}
                </span>
              )}
            </JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px'}}>
              {[row.vehicleYear, row.vehicleMake, row.vehicleModel].filter(Boolean).join(' ') || 'Unknown Vehicle'}
            </JXBox>
          </JXBox>
        ),
      },
      {
        key: 'roles',
        header: 'Company Role',
        align: 'center',
        render: (_, row) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center'}}>
            {row.isDispatched && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                <Truck className="w-3 h-3" />
                Dispatched
              </span>
            )}
            {row.isShipped && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                <Building2 className="w-3 h-3" />
                Shipped
              </span>
            )}
            {row.isTransited && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <GitCompareArrows className="w-3 h-3" />
                Transited
              </span>
            )}
            {!row.isDispatched && !row.isShipped && !row.isTransited && (
              <span className="text-xs text-[var(--text-secondary)]">Associated</span>
            )}
          </JXBox>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        sortable: true,
        align: 'center',
        render: (_, row) => (
          <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider bg-[rgba(var(--text-primary-rgb),0.06)] text-[var(--text-primary)] border border-[var(--border)]">
            {row.status.replace(/_/g, ' ')}
          </span>
        ),
      },
      {
        key: 'operations',
        header: 'Operations Link',
        render: (_, row) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.75rem'}}>
            {row.dispatch && (
              <Link
                href={`/dashboard/dispatches/${row.dispatch.id}`}
                className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Truck className="w-3 h-3 inline" />
                Dispatch: #{row.dispatch.referenceNumber}
              </Link>
            )}
            {row.container && (
              <Link
                href={`/dashboard/containers/${row.container.id}`}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <Building2 className="w-3 h-3 inline" />
                Container: {row.container.containerNumber}
              </Link>
            )}
            {row.transit && (
              <Link
                href={`/dashboard/transits/${row.transit.id}`}
                className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <GitCompareArrows className="w-3 h-3 inline" />
                Transit: #{row.transit.referenceNumber}
              </Link>
            )}
            {!row.dispatch && !row.container && !row.transit && (
              <span className="text-[var(--text-secondary)]">-</span>
            )}
          </JXBox>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        render: (_, row) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.8rem'}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 500}}>{row.customer?.name || 'N/A'}</JXBox>
            {row.customer?.email && (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', color: 'var(--text-secondary)'}}>{row.customer.email}</JXBox>
            )}
          </JXBox>
        ),
      },
      {
        key: 'createdAt',
        header: 'Date Added',
        sortable: true,
        render: (_, row) => (
          <span className="text-xs text-[var(--text-secondary)]">
            {new Date(row.createdAt).toLocaleDateString()}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'center',
        render: (_, row) => (
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5 text-emerald-500" />}
              onClick={() =>
                openUniversalShipmentExport({
                  shipmentIds: [row.id],
                  title: `Export Shipment ${row.vehicleVIN || row.id}`,
                  subtitle: `${row.vehicleMake || ''} ${row.vehicleModel || ''}`.trim(),
                })
              }
            >
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => router.push(`/dashboard/shipments/${row.id}`)}
            >
              Shipment
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={<ReceiptText className="w-3.5 h-3.5" />}
              onClick={() => {
                setFilters((prev) => ({ ...prev, shipmentId: row.id }));
                setActiveTab(0);
                const nextParams = new URLSearchParams(searchParams.toString());
                nextParams.set('tab', 'ledger');
                router.replace(`?${nextParams.toString()}`, { scroll: false });
              }}
            >
              Ledger
            </Button>
          </JXBox>
        ),
      },
    ],
    [router, searchParams]
  );

  if (loading) {
    return (
      <PermissionRoute permission="finance:manage">
        <DashboardSurface>
          <TableSkeleton rows={8} />
        </DashboardSurface>
      </PermissionRoute>
    );
  }

  if (!company) {
    return (
      <PermissionRoute permission="finance:manage">
        <DashboardSurface>
          <DashboardPanel title="Company not found">
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)'}}>The requested company could not be loaded.</JXBox>
          </DashboardPanel>
        </DashboardSurface>
      </PermissionRoute>
    );
  }

  return (
    <PermissionRoute permission="finance:manage">
      <DashboardSurface>
        <PageHeader
          showBreadcrumbs
          title={company.name}
          description={`${companyTypeLabel} Company Ledger${company.code ? ` • ${company.code}` : ''}`}
          actions={
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              <Link href="/dashboard/finance/companies" style={{ textDecoration: 'none' }}>
                <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
              </Link>
              <Link href="/dashboard/finance/banking" style={{ textDecoration: 'none' }}>
                <Button variant="outline" icon={<Landmark className="w-4 h-4" />}>
                  Banking
                </Button>
              </Link>
              <Button
                variant="outline"
                icon={<Download className="w-4 h-4 text-emerald-500" />}
                onClick={() => {
                  const sIds = (company.shipments || []).map((s) => s.id);
                  openUniversalShipmentExport({
                    shipmentIds: sIds.length > 0 ? sIds : undefined,
                    filters: { companyId: company.id },
                    title: `Export ${company.name} Shipments`,
                    subtitle: `${company.name} Ledger • ${company.shipments?.length || 0} associated shipments`,
                  });
                }}
              >
                Export Shipments
              </Button>
              <Button
                variant="outline"
                icon={<ReceiptText className="w-4 h-4 text-[var(--accent-gold)]" />}
                onClick={() => setOpenPriceListDrawer(true)}
              >
                Price List {activePriceList ? `(${activePriceListLaneCount})` : ''}
              </Button>
              <Button variant="outline" icon={<DollarSign className="w-4 h-4" />} onClick={() => {
                setIsPaymentMode(true);
                setFormData((prev) => ({ ...prev, type: 'DEBIT', category: 'Payment', description: `Payment to ${company?.name || 'Company'}` }));
                setOpenEntry(true);
              }}>
                Record Payment
              </Button>
              <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => {
                setIsPaymentMode(false);
                setFormData((prev) => ({ ...prev, type: 'CREDIT', category: '', description: '' }));
                setOpenEntry(true);
              }}>
                Add Transaction
              </Button>
            </JXBox>
          }
        />

        <DashboardGrid className="grid-cols-1 sm:grid-cols-2 md:grid-cols-5 mb-4">
          <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Total Expenses" value={formatCurrency(summary.totalExpenseCharges)} variant="error" />
          <StatsCard icon={<DollarSign className="w-5 h-5" />} title="Total Paid" value={formatCurrency(summary.totalDebit)} variant="success" />
          <StatsCard icon={<Building2 className="w-5 h-5" />} title="Total Owed" value={formatCurrency(Math.abs(summary.currentBalance))} variant="info" />
          <StatsCard icon={<ReceiptText className="w-5 h-5" />} title="Total Transactions" value={report?.summary.transactionCount || entries.length} variant="default" />
          <StatsCard
            icon={<Package className="w-5 h-5" />}
            title="Total Shipments"
            value={company._count?.shipments ?? (company.shipments || []).length}
            variant="default"
          />
        </DashboardGrid>

        <JXBox padding="none" border={false} style={{position: 'sticky', top: '0px', zIndex: 15, border: '1px solid var(--border)', borderRadius: '12px', backgroundColor: 'var(--panel)', boxShadow: '0 12px 28px rgba(var(--text-primary-rgb),0.08)', overflow: 'hidden'}}>
          <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[var(--border)]">
            {companyTabs.map((tab, index) => (
              <button
                key={tab.label}
                type="button"
                role="tab"
                id={`company-tab-${index}`}
                aria-selected={activeTab === index}
                aria-controls={`company-tabpanel-${index}`}
                onClick={() => { const newValue = index; setActiveTab(newValue);
              const nextParams = new URLSearchParams(searchParams.toString());
              nextParams.set('tab', companyTabSlugs[newValue] || companyTabSlugs[0]);
              router.replace(`?${nextParams.toString()}`, { scroll: false }); }}
                className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === index ? 'border-[var(--accent-gold)] text-[var(--accent-gold-text)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          
          </div>
        </JXBox>

        <TabPanel value={activeTab} index={0}>
        <DashboardPanel
          title="Company Ledger"
          description="Search, filter, and manage transactions for this company"
          actions={
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              <Button
                variant="outline"
                size="sm"
                icon={<Download className="w-4 h-4 text-emerald-500" />}
                onClick={() => {
                  const sIds = (company.shipments || []).map((s) => s.id);
                  openUniversalShipmentExport({
                    shipmentIds: sIds.length > 0 ? sIds : undefined,
                    filters: { companyId: company.id },
                    title: `Export ${company.name} Shipments`,
                    subtitle: `${company.name} Ledger • ${company.shipments?.length || 0} associated shipments`,
                  });
                }}
              >
                Export Shipments ({company.shipments?.length || 0})
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<ReceiptText className="w-4 h-4 text-[var(--accent-gold)]" />}
                onClick={() => setOpenPriceListDrawer(true)}
              >
                {activePriceList ? `View Price List (${activePriceListLaneCount} rates)` : 'View Price List'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Upload className="w-4 h-4" />}
                onClick={() => {
                  setActiveTab(3);
                  const nextParams = new URLSearchParams(searchParams.toString());
                  nextParams.set('tab', 'price-list');
                  router.replace(`?${nextParams.toString()}`, { scroll: false });
                }}
              >
                Price List Tab
              </Button>
            </JXBox>
          }
        >

          {/* Active Price List Quick Glance & Rate Lookup */}
          <JXBox padding="none" border={false} style={{marginBottom: '20px', padding: '16px', borderRadius: '16px', border: activePriceList
                ? '1px solid rgba(var(--accent-gold-rgb), 0.35)'
                : '1px solid var(--border)', background: activePriceList
                ? 'linear-gradient(to right, rgba(var(--accent-gold-rgb), 0.05), var(--panel))'
                : 'var(--panel)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)'}}>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'}} className="items-start sm:items-center">
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '10px'}}>
                <JXBox padding="none" border={false} style={{width: '36px', height: '36px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: activePriceList ? 'rgba(var(--accent-gold-rgb), 0.15)' : 'var(--background)', color: activePriceList ? 'var(--accent-gold)' : 'var(--text-secondary)', border: '1px solid var(--border)'}}>
                  <ReceiptText className="w-5 h-5" />
                </JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)'}}>
                      Company Price Lists
                    </JXBox>
                    {activeOceanPriceList && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontWeight: 750, fontSize: '0.72rem', backgroundColor: 'rgba(59, 130, 246, 0.12)', color: '#1d4ed8', border: '1px solid rgba(59, 130, 246, 0.3)'}}>{<Ship className="w-3 h-3 text-blue-600" />} {`Ocean: USA ➔ ${activeOceanPriceList.destinationLabel || 'Port'} (${activePriceListLaneCount} rates)`}</span>
                    )}
                    {(activeTransitPriceList || activeTransitData) && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontWeight: 750, fontSize: '0.72rem', backgroundColor: 'rgba(34, 197, 94, 0.12)', color: '#15803d', border: '1px solid rgba(34, 197, 94, 0.3)'}}>{<Truck className="w-3 h-3 text-emerald-600" />} {`Transit: ${activeTransitData ? `${activeTransitData.origin.split(',')[0]} ➔ Islam Qala ($${activeTransitData.rates?.sedan}/$${activeTransitData.rates?.suv})` : 'Overland Transit Active'}`}</span>
                    )}
                    {!activeOceanPriceList && !activeTransitPriceList && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontWeight: 750, fontSize: '0.72rem', backgroundColor: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)', border: '1px solid rgba(234, 179, 8, 0.3)'}}>{<AlertTriangle className="w-3 h-3 text-amber-500" />} {"No Active Price Lists"}</span>
                    )}
                  </JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px'}}>
                    {activeOceanPriceList || activeTransitPriceList
                      ? [
                          activeOceanPriceList ? `🌊 Leg 1 Ocean: USA to ${activeOceanPriceList.destinationLabel} (${activePriceListLaneCount} lanes)` : null,
                          activeTransitData ? `🚚 Leg 2 Transit: ${activeTransitData.origin} to ${activeTransitData.destination} (Sedan ${formatCurrency(activeTransitData.rates?.sedan || 2300)}, SUV ${formatCurrency(activeTransitData.rates?.suv || 2400)} incl. clearance)` : null,
                        ].filter(Boolean).join(' • ')
                      : 'No rate sheets uploaded yet for automated shipping pricing and rate lookup.'}
                  </JXBox>
                </JXBox>
              </JXBox>

              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                {activePriceList && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<ReceiptText className="w-4 h-4 text-[var(--accent-gold)]" />}
                      onClick={() => setOpenPriceListDrawer(true)}
                    >
                      View Full Rate Sheet ({activePriceListLaneCount})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Printer className="w-4 h-4" />}
                      onClick={handlePrintActivePriceList}
                    >
                      Print Price List
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowInlineRateLookup(!showInlineRateLookup)}
                    >
                      {showInlineRateLookup ? 'Hide Rate Search' : 'Quick Rate Search'}
                    </Button>
                  </>
                )}
                {!activePriceList && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Upload className="w-4 h-4" />}
                    onClick={() => {
                      setActiveTab(1);
                      const nextParams = new URLSearchParams(searchParams.toString());
                      nextParams.set('tab', 'price-list');
                      router.replace(`?${nextParams.toString()}`, { scroll: false });
                    }}
                  >
                    Upload Price List
                  </Button>
                )}
              </JXBox>
            </JXBox>

            {/* Inline Quick Rate Search when expanded */}
            {activePriceList && showInlineRateLookup && (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'grid', gap: '12px'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <div className="min-w-0 flex-1"><BareInput placeholder="Look up rate by state, branch, or city (e.g. TX, Dallas, Atlanta, Copart)..." value={inlineRateSearch} onChange={(e) => setInlineRateSearch(e.target.value)} leftIcon={<Search className="w-4 h-4 mr-2 text-[var(--text-secondary)]" />} size="small" /></div>
                  {inlineRateSearch && (
                    <Button variant="ghost" size="sm" onClick={() => setInlineRateSearch('')}>
                      Clear
                    </Button>
                  )}
                </JXBox>

                {/* Instant matching preview */}
                {inlineMatchedRates.length > 0 ? (
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden'}}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '6px 10px', minWidth: 60 }}>State</th>
                          <th style={{ textAlign: 'left', padding: '6px 10px' }}>Branch</th>
                          <th style={{ textAlign: 'left', padding: '6px 10px' }}>City</th>
                          <th style={{ textAlign: 'left', padding: '6px 10px' }}>Loading Point</th>
                          <th style={{ textAlign: 'right', padding: '6px 10px' }}>Exact Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inlineMatchedRates.map((row, idx) => (
                          <tr key={`${row.stateCode}-${row.branch}-${row.city}-${idx}`} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '6px 10px', fontWeight: 750 }}>{row.stateCode}</td>
                            <td style={{ padding: '6px 10px' }}>{row.branch || '-'}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{row.city || '-'}</td>
                            <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{row.loadingPoint || '-'}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 750, color: 'var(--text-primary)' }}>
                              {formatCurrency(row.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {totalInlineMatches > 6 && (
                      <JXBox padding="none" border={false} style={{borderRadius: 0, padding: '8px', textAlign: 'center', background: 'var(--panel)', fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'}}>
                        <span>Showing 6 of {totalInlineMatches} matching rates.</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setOpenPriceListDrawer(true)}
                        >
                          View all in Drawer →
                        </Button>
                      </JXBox>
                    )}
                  </JXBox>
                ) : inlineRateSearch ? (
                  <JXBox padding="none" border={false} style={{padding: '12px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-secondary)', borderRadius: '12px', background: 'var(--panel)'}}>
                    No rates matching &quot;{inlineRateSearch}&quot; in this company&apos;s active price list.
                  </JXBox>
                ) : null}
              </JXBox>
            )}
          </JXBox>

          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px', marginBottom: '16px'}} className="grid-cols-1 grid md:grid-cols-[minmax(0,_1fr)_160px_160px_220px]">
            <BareInput placeholder="Search description / category / notes" value={filters.search} onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))} size="small" />
            <BareSelect options={[{ value: "", label: 'All Types' }, { value: "DEBIT", label: 'DEBIT' }, { value: "CREDIT", label: 'CREDIT' }]} value={filters.type} size="small" onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))} />
            <BareSelect options={[{ value: "", label: 'All Sources' }, { value: "BANK_IMPORT", label: 'Bank Imports' }, { value: "MANUAL", label: 'Manual Entries' }]} value={filters.source} size="small" onChange={(event) => setFilters((prev) => ({ ...prev, source: event.target.value }))} />
            <BareSelect options={[{ value: "", label: `All Shipments (${company.shipments?.length || 0})` }, ...(company.shipments || []).map((s) => ({ value: s.id, label: `${s.vehicleVIN ? `${s.vehicleVIN.slice(-8)} • ` : ''}${[s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || 'Shipment'}` }))]} value={filters.shipmentId} size="small" onChange={(event) => setFilters((prev) => ({ ...prev, shipmentId: event.target.value }))} />
          </JXBox>

          {filters.shipmentId && (
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
              <span className="text-xs text-[var(--text-secondary)] font-medium">Filtered by shipment:</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)] border border-[rgba(var(--accent-gold-rgb),0.25)]">
                <Car className="w-3.5 h-3.5" />
                {(() => {
                  const s = (company.shipments || []).find((c) => c.id === filters.shipmentId);
                  return s ? `${s.vehicleVIN || 'Shipment'} • ${[s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ')}` : `Shipment #${filters.shipmentId.slice(-6)}`;
                })()}
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, shipmentId: '' }))}
                  className="ml-1 hover:opacity-75 font-bold cursor-pointer bg-transparent border-0 text-inherit p-0"
                >
                  ×
                </button>
              </span>
            </JXBox>
          )}

          {(focusedEntryId || focusedEntryLoading || focusedEntry) && (
            <JXBox padding="none" border={false} style={{marginBottom: '16px', border: '1px solid rgba(var(--accent-gold-rgb), 0.32)', background: 'rgba(var(--accent-gold-rgb), 0.08)', borderRadius: '16px', padding: '16px'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px', flexWrap: 'wrap'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)', fontWeight: 700}}>
                    Focused Ledger Entry
                  </JXBox>
                  {focusedEntryLoading ? (
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '8px', color: 'var(--text-secondary)'}}>Loading selected entry...</JXBox>
                  ) : focusedEntry ? (
                    <>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '8px', fontWeight: 700, color: 'var(--text-primary)'}}>{focusedEntry.description}</JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                        {new Date(focusedEntry.transactionDate).toLocaleString()} • {getDisplayType(focusedEntry)} • {formatCurrency(focusedEntry.amount)}
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                        {focusedEntry.category || 'General'}{focusedEntry.reference ? ` • Ref: ${focusedEntry.reference}` : ''}
                      </JXBox>
                      {focusedEntry.notes && (
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>{focusedEntry.notes}</JXBox>
                      )}
                    </>
                  ) : (
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '8px', color: 'var(--text-secondary)'}}>The selected entry could not be loaded.</JXBox>
                  )}
                </JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                  {activePriceList && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<ReceiptText className="w-3.5 h-3.5 text-[var(--accent-gold)]" />}
                      onClick={() => setOpenPriceListDrawer(true)}
                    >
                      Check Price List
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={clearFocusedEntry}>Clear Focus</Button>
                </JXBox>
              </JXBox>
            </JXBox>
          )}

          <DataTable
            data={entries}
            columns={columns}
            keyField="id"
            getRowClassName={(row) =>
              row.id === focusedEntryId
                ? 'bg-[rgba(var(--accent-gold-rgb),0.12)] ring-1 ring-inset ring-[rgba(var(--accent-gold-rgb),0.35)]'
                : undefined
            }
          />
        </DashboardPanel>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <DashboardPanel
            title="Company Shipments"
            description="All shipments handled by this company across dispatch, shipping, and transit operations"
            actions={
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center'}}>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-4 h-4 text-emerald-500" />}
                  onClick={() => {
                    const sIds = filteredCompanyShipments.map((s) => s.id);
                    openUniversalShipmentExport({
                      shipmentIds: sIds.length > 0 ? sIds : undefined,
                      filters: { companyId: company.id },
                      title: `Export ${company.name} Shipments`,
                      subtitle: `${filteredCompanyShipments.length} filtered shipment record(s)`,
                    });
                  }}
                >
                  Export Shipments ({filteredCompanyShipments.length})
                </Button>
              </JXBox>
            }
          >
            <DashboardGrid className="grid-cols-1 sm:grid-cols-2 md:grid-cols-4 mb-4">
              <StatsCard
                icon={<Package className="w-5 h-5" />}
                title="Total Shipments"
                value={company._count?.shipments ?? (company.shipments || []).length}
                variant="default"
              />
              <StatsCard
                icon={<Truck className="w-5 h-5" />}
                title="Dispatched"
                value={company._count?.dispatchedShipments ?? (company.shipments || []).filter((s) => s.isDispatched).length}
                variant="info"
              />
              <StatsCard
                icon={<Building2 className="w-5 h-5" />}
                title="Shipped"
                value={company._count?.shippedShipments ?? (company.shipments || []).filter((s) => s.isShipped).length}
                variant="success"
              />
              <StatsCard
                icon={<GitCompareArrows className="w-5 h-5" />}
                title="Transited"
                value={company._count?.transitedShipments ?? (company.shipments || []).filter((s) => s.isTransited).length}
                variant="warning"
              />
            </DashboardGrid>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px', marginBottom: '16px'}} className="grid-cols-1 grid md:grid-cols-[minmax(0,_1fr)_200px_180px]">
              <BareInput placeholder="Search VIN / vehicle / customer / reference" value={shipmentSearch} onChange={(e) => setShipmentSearch(e.target.value)} size="small" />
              <BareSelect options={[{ value: "ALL", label: `All Roles (${company.shipments?.length || 0})` }, { value: "DISPATCH", label: `Dispatched (${(company.shipments || []).filter((s) => s.isDispatched).length})` }, { value: "SHIPPING", label: `Shipped (${(company.shipments || []).filter((s) => s.isShipped).length})` }, { value: "TRANSIT", label: `Transited (${(company.shipments || []).filter((s) => s.isTransited).length})` }]} value={shipmentRoleFilter} size="small" onChange={(e) => setShipmentRoleFilter(e.target.value as any)} />
              <BareSelect options={[{ value: "ALL", label: 'All Statuses' }, ...Array.from(new Set((company.shipments || []).map((s) => s.status))).filter(Boolean).map((st) => ({ value: st, label: st.replace(/_/g, ' ') }))]} value={shipmentStatusFilter} size="small" onChange={(e) => setShipmentStatusFilter(e.target.value)} />
            </JXBox>

            <DataTable
              data={filteredCompanyShipments}
              columns={shipmentColumns}
              keyField="id"
              selectable
              onExport={(selectedRows) =>
                openUniversalShipmentExport({
                  shipmentIds: selectedRows.map((r) => r.id),
                  title: `Export Selected (${selectedRows.length}) Shipments`,
                  subtitle: `${company.name} Ledger • Selected vehicles`,
                })
              }
              onRowClick={(row) => router.push(`/dashboard/shipments/${row.id}`)}
            />
          </DashboardPanel>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
        <DashboardPanel
          title="Company Price List"
          description="Upload and manage the rate sheet used by this company"
          actions={
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center'}}>
              {activePriceList && (
                <Button
                  variant="outline"
                  icon={<Printer className="w-4 h-4" />}
                  onClick={handlePrintActivePriceList}
                >
                  Print Price List
                </Button>
              )}
              <Button variant="outline" icon={<GitCompareArrows className="w-4 h-4" />} onClick={() => router.push('/dashboard/finance/price-comparison')}>
                Compare Prices
              </Button>
            </JXBox>
          }
        >
          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '20px'}}>
            {/* Dual-Leg Active Price Lists Banner */}
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px'}} className="grid-cols-1 grid lg:grid-cols-[1fr_1fr]">
              {/* Card 1: Leg 1 Ocean Shipping */}
              <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: activeOceanPriceList ? '1px solid rgba(59, 130, 246, 0.4)' : '1px dashed var(--border)', background: activeOceanPriceList ? 'rgba(59, 130, 246, 0.06)' : 'var(--panel)'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '10px', alignItems: 'flex-start'}}>
                    <JXBox padding="none" border={false} style={{marginTop: '2px', width: '36px', height: '36px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: activeOceanPriceList ? 'rgba(59, 130, 246, 0.16)' : 'var(--background)', color: activeOceanPriceList ? '#2563eb' : 'var(--text-secondary)', border: '1px solid var(--border)'}}>
                      <Ship className="h-5 w-5" />
                    </JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em'}}>
                          Leg 1: Ocean Freight
                        </JXBox>
                        {activeOceanPriceList ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontWeight: 800, height: '18px', fontSize: '0.68rem', backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#1d4ed8'}}>{"Active"}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontWeight: 800, height: '18px', fontSize: '0.68rem', backgroundColor: 'rgba(234, 179, 8, 0.15)', color: 'var(--warning)'}}>{"Not Active"}</span>
                        )}
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '2.8px', fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)'}}>
                        {activeOceanPriceList ? activeOceanPriceList.name : 'USA to Mersin / Jebel Ali Ocean Sheet'}
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '2.8px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5}}>
                        {activeOceanPriceList
                          ? `Destination: ${activeOceanPriceList.destinationLabel} • ${activePriceListLaneCount} Auction Lanes • ${activePriceListStateCount} States • ${activeOceanPriceList.sourceFileName}`
                          : 'Upload a USA auction rate sheet (Copart/IAAI) to activate Leg 1 port shipping rates.'}
                      </JXBox>
                    </JXBox>
                  </JXBox>
                  {activeOceanPriceList && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Printer className="w-3.5 h-3.5" />}
                      onClick={handlePrintActivePriceList}
                    >
                      Print Ocean
                    </Button>
                  )}
                </JXBox>
              </JXBox>

              {/* Card 2: Leg 2 Overland Transit */}
              <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: (activeTransitPriceList || activeTransitData) ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed var(--border)', background: (activeTransitPriceList || activeTransitData) ? 'rgba(16, 185, 129, 0.06)' : 'var(--panel)'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '10px', alignItems: 'flex-start'}}>
                    <JXBox padding="none" border={false} style={{marginTop: '2px', width: '36px', height: '36px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: (activeTransitPriceList || activeTransitData) ? 'rgba(16, 185, 129, 0.16)' : 'var(--background)', color: (activeTransitPriceList || activeTransitData) ? '#059669' : 'var(--text-secondary)', border: '1px solid var(--border)'}}>
                      <Truck className="h-5 w-5" />
                    </JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.08em'}}>
                          Leg 2: Overland Transit
                        </JXBox>
                        {(activeTransitPriceList || activeTransitData) ? (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontWeight: 800, height: '18px', fontSize: '0.68rem', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#047857'}}>{"Active"}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontWeight: 800, height: '18px', fontSize: '0.68rem', backgroundColor: 'rgba(234, 179, 8, 0.15)', color: 'var(--warning)'}}>{"Not Active"}</span>
                        )}
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '2.8px', fontWeight: 800, fontSize: '0.98rem', color: 'var(--text-primary)'}}>
                        {activeTransitData ? `${activeTransitData.origin} ➔ ${activeTransitData.destination}` : 'Port to Islam Qala Transit Tariff'}
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '2.8px', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5}}>
                        {activeTransitData
                          ? `Sedan: ${formatCurrency(activeTransitData.rates?.sedan || 2300)} • SUV: ${formatCurrency(activeTransitData.rates?.suv || 2400)} • Customs clearance included • ${activeTransitPriceList?.name || 'Overland Tariff'}`
                          : 'Upload a Mersin or UAE to Islam Qala rate sheet to activate overland delivery tariffs.'}
                      </JXBox>
                    </JXBox>
                  </JXBox>
                  {(activeTransitPriceList || activeTransitData) && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<ReceiptText className="w-3.5 h-3.5" />}
                      onClick={() => {
                        setRateLookupLeg('transit');
                        scrollToPriceListSection('price-list-rate-lookup');
                      }}
                    >
                      View Tariff
                    </Button>
                  )}
                </JXBox>
              </JXBox>
            </JXBox>

            {/* Quick Metrics */}
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '8px'}} className="grid grid-cols-[1fr_1fr] sm:grid-cols-4">
              {[
                { label: 'Ocean Lanes', value: `${activePriceListLaneCount} rows` },
                { label: 'State Rates', value: `${activePriceListStateCount} states` },
                { label: 'Transit Sedan', value: activeTransitData ? formatCurrency(activeTransitData.rates?.sedan || 2300) : 'None' },
                { label: 'Transit SUV', value: activeTransitData ? formatCurrency(activeTransitData.rates?.suv || 2400) : 'None' },
              ].map((item) => (
                <JXBox padding="none" border={false} key={item.label} style={{padding: '10px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--background)'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.68rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 800}}>{item.label}</JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '2px', fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)'}}>{item.value}</JXBox>
                </JXBox>
              ))}
            </JXBox>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              {activeOceanPriceList && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={handlePrintActivePriceList}
                >
                  Print Ocean Rate Sheet
                </Button>
              )}
              {activeTransitData && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Printer className="w-3.5 h-3.5" />}
                  onClick={handlePrintTransitTariff}
                >
                  Print Transit Tariff
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => scrollToPriceListSection('price-list-upload-flow')}>Upload Rate Sheet</Button>
              <Button variant="outline" size="sm" onClick={() => scrollToPriceListSection('price-list-rate-lookup')}>Rate Lookup</Button>
              <Button variant="outline" size="sm" onClick={() => scrollToPriceListSection('price-list-import-history')}>Import History</Button>
              {activePriceListWarnings.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => scrollToPriceListSection('price-list-warnings')}>Warnings</Button>
              )}
            </JXBox>

            <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px solid rgba(var(--accent-gold-rgb), 0.32)', background: 'rgba(var(--accent-gold-rgb), 0.08)'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Navigation className="w-4 h-4 text-[var(--accent-gold)]" />
                Dual-Leg Pricing Architecture (USA ➔ Port ➔ Islam Qala)
              </JXBox>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '6px', fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7}}>
                Jacxi supports <strong>two concurrent price lists</strong> for every shipping company:
                <br />
                • <strong>Leg 1 (Ocean Freight)</strong>: USA auction yards (Copart & IAAI across 50 states) to Mersin, Turkey or Jebel Ali, UAE.
                <br />
                • <strong>Leg 2 (Overland Transit)</strong>: Port customs clearance and overland car-carrier transport from Mersin or UAE to Islam Qala, Herat border.
                <br />
                The system automatically detects whether an uploaded document is Leg 1 or Leg 2 from its destination and text content. Activating an overland transit list <strong>never</strong> overwrites or deactivates your ocean auction rates, and vice versa!
              </JXBox>
            </JXBox>
            <JXBox padding="none" border={false} id="price-list-upload-flow" style={{backgroundColor: 'transparent', borderRadius: 0, scrollMarginTop: 96, display: 'grid', gap: '8px'}} className="grid-cols-1 md:grid-cols-4">
              {[
                ['1', 'Upload', priceListFile ? priceListFile.name : 'Choose a rate sheet file'],
                ['2', 'Preview', priceListPreview ? `${priceListPreview.rows.length} editable rows found` : 'Check parser confidence before import'],
                ['3', 'Review', priceListPreview?.parserStats ? `${priceListPreview.parserStats.confidence} confidence` : 'Edit/delete questionable rows'],
                ['4', 'Activate', 'Save as a new active version'],
              ].map(([step, title, detail]) => (
                <JXBox padding="none" border={false} key={step} style={{padding: '10px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--background)', display: 'grid', gap: '4px'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '6px'}}>
                    <JXBox padding="none" border={false} style={{width: '22px', height: '22px', borderRadius: '7992px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, background: 'rgba(var(--accent-gold-rgb), 0.14)', color: 'var(--accent-gold)'}}>{step}</JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700, fontSize: '0.86rem'}}>{title}</JXBox>
                  </JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.76rem', color: 'var(--text-secondary)'}}>{detail}</JXBox>
                </JXBox>
              ))}
            </JXBox>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px'}} className="grid-cols-1 md:grid-cols-3">
              <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Destination</JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px', fontWeight: 700}}>{company.priceListConfig?.destinationLabel || 'Not imported'}</JXBox>
              </JXBox>
              <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>State Rates</JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px', fontWeight: 700}}>{Object.keys(company.priceListConfig?.stateRates || {}).length}</JXBox>
              </JXBox>
              <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Auction Rows</JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px', fontWeight: 700}}>{company.priceListConfig?.auctionRates?.length || 0}</JXBox>
              </JXBox>
            </JXBox>

            {activePriceListWarnings.length > 0 && (
              <JXBox padding="none" border={false} id="price-list-warnings" style={{scrollMarginTop: 96, padding: '12px', borderRadius: '16px', border: '1px solid rgba(234, 179, 8, 0.35)', background: 'rgba(234, 179, 8, 0.08)', color: 'var(--text-primary)'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700, marginBottom: '6px'}}>Import Warnings</JXBox>
                {activePriceListWarnings.map((warning) => (
                  <JXBox padding="none" border={false} key={warning} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.82rem', color: 'var(--text-secondary)'}}>{warning}</JXBox>
                ))}
              </JXBox>
            )}

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px'}} className="grid-cols-1 grid md:grid-cols-[1fr_1fr_180px_180px]">
              <FormField label="List Name" value={priceListForm.name} onChange={(event) => {
                  setPriceListForm((prev) => ({ ...prev, name: event.target.value }));
                  setPriceListPreview(null);
                }} placeholder={`${company.name} price list`} size="small" />
              <FormField label="Destination" value={priceListForm.destinationLabel} onChange={(event) => {
                  setPriceListForm((prev) => ({ ...prev, destinationLabel: event.target.value }));
                  setPriceListPreview(null);
                }} placeholder={company.priceListConfig?.destinationLabel || 'Islam Qala, Afghanistan'} size="small" />
              <FormField type="date" label="Effective From" InputLabelProps={{ shrink: true }} value={priceListForm.effectiveFrom} onChange={(event) => {
                  setPriceListForm((prev) => ({ ...prev, effectiveFrom: event.target.value }));
                  setPriceListPreview(null);
                }} size="small" />
              <Select label="Import Mode" options={[{ value: "merge", label: 'Merge/update' }, { value: "replace", label: 'Replace all' }, { value: "add_new", label: 'Add new only' }]} value={priceListForm.mode} size="small" onChange={(val) => {
                  setPriceListForm((prev) => ({ ...prev, mode: val as PriceListImportMode }));
                  setPriceListPreview(null);
                }} />
            </JXBox>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px'}} className="flex-col sm:flex-row items-stretch sm:items-center">
              <input id="company-price-list-pdf" type="file" accept=".pdf,.csv,.txt,.xlsx,application/pdf,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={handlePriceListFileChange} style={{ display: 'none' }} />
              <label htmlFor="company-price-list-pdf">
                <Button component="span" variant="outline" icon={<Upload className="w-4 h-4" />}>
                  {priceListFile ? priceListFile.name : 'Select File'}
                </Button>
              </label>
              <Button variant="outline" onClick={handlePreviewPriceListPdf} disabled={!priceListFile || previewingPriceList || importingPriceList}>
                {previewingPriceList ? 'Previewing...' : 'Preview'}
              </Button>
              <Button variant="primary" onClick={handleImportPriceListPdf} disabled={!priceListFile || !priceListPreview || importingPriceList || previewingPriceList}>
                {importingPriceList ? 'Importing...' : 'Import Price List'}
              </Button>
            </JXBox>

            {priceListPreview && (
              <JXBox padding="none" border={false} style={{display: 'grid', gap: '12px', padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--background)'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px'}} className="grid-cols-1 md:grid-cols-4">
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700}}>States Found</JXBox><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>{priceListPreview.importedCount}</JXBox></JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700}}>Auction Rows Found</JXBox><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>{priceListPreview.importedAuctionRateCount}</JXBox></JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700}}>After Import Rows</JXBox><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>{priceListPreview.totalAuctionRateCount}</JXBox></JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700}}>Mode</JXBox><JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>{priceListPreview.mode}</JXBox></JXBox>
                </JXBox>
                {priceListPreview.parserStats && (
                  <JXBox padding="none" border={false} style={{display: 'grid', gap: '8px', padding: '10px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.22)'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', alignItems: 'center'}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>Parser confidence: {priceListPreview.parserStats.confidence}</JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                        Direct {priceListPreview.parserStats.directRows} / Flexible {priceListPreview.parserStats.flexibleRows} / Guessed {priceListPreview.parserStats.guessedRows} / AI {priceListPreview.parserStats.aiRows}
                      </JXBox>
                    </JXBox>
                    {priceListPreview.rowSourceSummary && (
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                        {Object.entries(priceListPreview.rowSourceSummary).map(([source, count]) => (
                          <JXBox padding="none" border={false} key={source} style={{backgroundColor: 'transparent', paddingLeft: '8px', paddingRight: '8px', paddingTop: '2.8px', paddingBottom: '2.8px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.24)', fontSize: '0.76rem', fontWeight: 700}}>
                            {source}: {count}
                          </JXBox>
                        ))}
                      </JXBox>
                    )}
                    {priceListPreview.parserStats.notes.length > 0 && (
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '2px'}}>
                        {priceListPreview.parserStats.notes.map((note) => (
                          <JXBox padding="none" border={false} key={note} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.82rem', color: 'var(--text-secondary)'}}>{note}</JXBox>
                        ))}
                      </JXBox>
                    )}
                  </JXBox>
                )}
                {priceListPreview.warnings.length > 0 && (
                  <JXBox padding="none" border={false} style={{padding: '10px', borderRadius: '16px', background: 'rgba(234, 179, 8, 0.08)', border: '1px solid rgba(234, 179, 8, 0.3)'}}>
                    {priceListPreview.warnings.map((warning) => (
                      <JXBox padding="none" border={false} key={warning} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.82rem', color: 'var(--text-secondary)'}}>{warning}</JXBox>
                    ))}
                  </JXBox>
                )}
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>Preview Rows</JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.82rem', color: 'var(--text-secondary)'}}>Edit state, branch, city, loading point, or total before importing this version.</JXBox>
                  </JXBox>
                  <Button variant="outline" size="sm" onClick={downloadPriceListImportReport}>
                    Download Report
                  </Button>
                </JXBox>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, maxHeight: '380px', overflow: 'auto'}}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 90 }}>State</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 150 }}>Branch</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 150 }}>City</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 150 }}>Loading Point</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px', minWidth: 110 }}>Total</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px', minWidth: 130 }}>Source</th>
                          <th style={{ textAlign: 'center', padding: '10px 12px', width: 80 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {priceListPreview.rows.length > 0 ? priceListPreview.rows.map((row, index) => (
                          <tr key={`${row.stateCode}-${row.branch}-${row.city}-${index}`} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '8px 10px' }}>
                              <BareInput value={row.stateCode} onChange={(event) => handleUpdatePreviewRow(index, 'stateCode', event.target.value.toUpperCase())} inputProps={{ maxLength: 2 }} size="small" />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <BareInput value={row.branch} onChange={(event) => handleUpdatePreviewRow(index, 'branch', event.target.value)} size="small" />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <BareInput value={row.city} onChange={(event) => handleUpdatePreviewRow(index, 'city', event.target.value)} size="small" />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <BareInput value={row.loadingPoint || ''} onChange={(event) => handleUpdatePreviewRow(index, 'loadingPoint', event.target.value)} size="small" />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <BareInput type="number" value={row.total} onChange={(event) => handleUpdatePreviewRow(index, 'total', event.target.value)} inputProps={{ min: 1 }} size="small" />
                            </td>
                            <td style={{ padding: '8px 10px' }}>
                              <JXBox padding="none" border={false} style={{display: 'inline-flex', alignItems: 'center', gap: '4px', paddingLeft: '8px', paddingRight: '8px', paddingTop: '2.8px', paddingBottom: '2.8px', borderRadius: '8px', border: row.source === 'ai' ? '1px solid rgba(234, 179, 8, 0.5)' : '1px solid var(--border)', background: row.source === 'ai' ? 'rgba(234, 179, 8, 0.1)' : 'var(--panel)', color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap'}}>
                                {row.source || 'unknown'}{row.confidence ? ` / ${row.confidence}` : ''}
                              </JXBox>
                              {row.sourceNote && (
                                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '2.8px', fontSize: '0.72rem', color: 'var(--text-secondary)', maxWidth: '180px'}}>
                                  {row.sourceNote}
                                </JXBox>
                              )}
                            </td>
                            <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                              <Button variant="outline" size="sm" onClick={() => handleDeletePreviewRow(index)}>
                                Delete
                              </Button>
                            </td>
                          </tr>
                        )) : (
                          <tr><td colSpan={7} style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>No editable branch/city rows were detected. Check state-level rates above or upload a more detailed file.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </JXBox>
                </JXBox>
              </JXBox>
            )}

            <JXBox padding="none" border={false} id="price-list-rate-lookup" style={{backgroundColor: 'transparent', borderRadius: 0, scrollMarginTop: 96, display: 'grid', gap: '12px'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700, marginRight: '4px'}}>Rate Lookup</JXBox>
                  <JXBox padding="none" border={false} style={{display: 'inline-flex', padding: '4px', borderRadius: '12px', backgroundColor: 'var(--panel)', border: '1px solid var(--border)', gap: '4px'}}>
                    <Button
                      variant={rateLookupLeg === 'ocean' ? 'primary' : 'ghost'}
                      size="sm"
                      icon={<Ship className="w-3.5 h-3.5" />}
                      onClick={() => setRateLookupLeg('ocean')}
                    >
                      Ocean Rates ({activePriceListLaneCount})
                    </Button>
                    <Button
                      variant={rateLookupLeg === 'transit' ? 'primary' : 'ghost'}
                      size="sm"
                      icon={<Truck className="w-3.5 h-3.5" />}
                      onClick={() => setRateLookupLeg('transit')}
                    >
                      Overland Transit (Islam Qala)
                    </Button>
                  </JXBox>
                </JXBox>

                {rateLookupLeg === 'ocean' && (
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                    {activeOceanPriceList && (
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Printer className="w-3.5 h-3.5" />}
                        onClick={() => {
                          if (!company) return;
                          const config = normalizeShippingRateConfig(activeOceanPriceList?.config || company.priceListConfig);
                          const q = priceListSearch.trim().toLowerCase();
                          const filtered = q
                            ? config.auctionRates.filter((row) =>
                                [row.stateCode, row.branch, row.city, row.loadingPoint || '', String(row.total)]
                                  .join(' ')
                                  .toLowerCase()
                                  .includes(q)
                              )
                            : config.auctionRates;
                          printCompanyPriceList({
                            companyName: company.name,
                            companyType: companyTypeLabel,
                            priceListName: activeOceanPriceList?.name || 'Ocean Rate Sheet',
                            destinationLabel: config.destinationLabel || 'Mersin / Jebel Ali',
                            sourceFileName: activeOceanPriceList?.sourceFileName || config.updatedFromPdfName,
                            effectiveDate: activeOceanPriceList?.effectiveFrom || config.updatedAt,
                            auctionRates: filtered,
                            stateRates: q ? {} : config.stateRates,
                            filterInfo: q ? { searchQuery: priceListSearch.trim() } : undefined,
                          });
                        }}
                      >
                        {priceListSearch.trim() ? `Print Filtered (${activePriceListRows.length})` : 'Print Ocean Rates'}
                      </Button>
                    )}
                    <BareInput placeholder="Search state, branch, city" value={priceListSearch} onChange={(event) => setPriceListSearch(event.target.value)} size="small" />
                  </JXBox>
                )}

                {rateLookupLeg === 'transit' && activeTransitData && (
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Printer className="w-3.5 h-3.5" />}
                      onClick={handlePrintTransitTariff}
                    >
                      Print Transit Tariff
                    </Button>
                  </JXBox>
                )}
              </JXBox>

              {/* Ocean Leg Table View */}
              {rateLookupLeg === 'ocean' && (
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, maxHeight: '380px', overflow: 'auto'}}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>State</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Branch</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>City</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Loading Point</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px' }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activePriceListRows.length > 0 ? activePriceListRows.map((row, index) => (
                          <tr key={`${row.stateCode}-${row.branch}-${row.city}-${index}`} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 700 }}>{row.stateCode}</td>
                            <td style={{ padding: '10px 12px' }}>{row.branch || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{row.city || '-'}</td>
                            <td style={{ padding: '10px 12px' }}>{row.loadingPoint || '-'}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(row.total)}</td>
                          </tr>
                        )) : (
                          <tr><td colSpan={5} style={{ padding: '16px 12px', textAlign: 'center', color: 'var(--text-secondary)' }}>No imported auction rows to display.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </JXBox>
                </JXBox>
              )}

              {/* Overland Transit Tariff View */}
              {rateLookupLeg === 'transit' && (
                <JXBox padding="none" border={false} style={{display: 'grid', gap: '16px', padding: '16px', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.04)'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-secondary)'}}>
                        Overland Transit Corridor (Second Leg)
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)'}}>
                        {activeTransitData ? `${activeTransitData.origin} ➔ ${activeTransitData.destination}` : 'Mersin/UAE Port ➔ Islam Qala, Herat (Afghanistan)'}
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px'}}>
                        Car-carrier / container transit with port customs clearance and border transport included.
                      </JXBox>
                    </JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap'}}>
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontWeight: 800, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.3)'}}>{<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />} {"Customs Clearance Included"}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Printer className="w-3.5 h-3.5" />}
                        onClick={handlePrintTransitTariff}
                      >
                        Print Transit Tariff
                      </Button>
                    </JXBox>
                  </JXBox>

                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}} className="grid-cols-1 grid sm:grid-cols-[1fr_1fr]">
                    <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)', display: 'grid', gap: '4px'}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--text-secondary)'}}>Sedan / Saloon</JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1.8rem', fontWeight: 850, color: 'var(--text-primary)'}}>
                        {formatCurrency(activeTransitData?.rates?.sedan || 2300)}
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: 'var(--text-secondary)'}}>Standard passenger car to Islam Qala border</JXBox>
                    </JXBox>

                    <JXBox padding="none" border={false} style={{padding: '16px', borderRadius: '16px', border: '1px solid rgba(var(--accent-gold-rgb), 0.4)', background: 'linear-gradient(145deg, rgba(var(--accent-gold-rgb), 0.08), var(--panel))', display: 'grid', gap: '4px'}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800, color: 'var(--accent-gold)'}}>SUV / 4X4 / Truck</JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '1.8rem', fontWeight: 850, color: 'var(--accent-gold)'}}>
                        {formatCurrency(activeTransitData?.rates?.suv || 2400)}
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: 'var(--text-secondary)'}}>Large / heavy vehicle to Islam Qala border</JXBox>
                    </JXBox>
                  </JXBox>

                  {activeTransitData?.terms && activeTransitData.terms.length > 0 && (
                    <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 800, fontSize: '0.82rem', marginBottom: '6px'}}>Transit Terms & Policy:</JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '4px'}}>
                        {activeTransitData.terms.map((term: string, idx: number) => (
                          <JXBox padding="none" border={false} key={idx} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '6px'}}>
                            <JXBox padding="none" border={false} style={{width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--accent-gold)', marginTop: '6px', flexShrink: 0}} />
                            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>{term}</JXBox>
                          </JXBox>
                        ))}
                      </JXBox>
                    </JXBox>
                  )}
                </JXBox>
              )}
            </JXBox>

            {company.priceLists && company.priceLists.length > 0 && (
              <JXBox padding="none" border={false} id="price-list-import-history" style={{backgroundColor: 'transparent', borderRadius: 0, scrollMarginTop: 96, display: 'grid', gap: '8px'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>Import History & Multi-Leg Versions</JXBox>
                {company.priceLists.map((list) => {
                  const corridor = detectPriceListCorridor({
                    fileName: list.sourceFileName,
                    destinationLabel: list.destinationLabel,
                    name: list.name,
                    config: list.config,
                    auctionRateCount: list.importedAuctionRateCount,
                  });
                  const isTransit = corridor.leg === 'TRANSIT';
                  return (
                    <JXBox padding="none" border={false} key={list.id} style={{display: 'grid', gap: '12px', alignItems: 'center', padding: '12px', border: '1px solid var(--border)', borderRadius: '16px', background: list.isActive ? (isTransit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(59, 130, 246, 0.08)') : 'var(--panel)'}} className="grid-cols-1 grid md:grid-cols-[minmax(0,_1fr)_auto]">
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontWeight: 800, height: '20px', fontSize: '0.7rem', backgroundColor: isTransit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: isTransit ? '#047857' : '#1d4ed8'}}>{isTransit ? <Truck className="w-3 h-3 text-emerald-600" /> : <Ship className="w-3 h-3 text-blue-600" />} {corridor.shortLabel}</span>
                          <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>{list.name}</JXBox>
                          {list.isActive && (
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5" style={{fontWeight: 800, height: '18px', fontSize: '0.68rem', backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#15803d'}}>{"Active"}</span>
                          )}
                        </JXBox>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                          {list.sourceFileName} • {list.destinationLabel} • {isTransit ? 'Overland Tariff' : `${list.importedAuctionRateCount || list.importedStateRateCount} rows`} • {new Date(list.createdAt).toLocaleString()}
                        </JXBox>
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '6px', flexWrap: 'wrap'}} className="justify-start md:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Printer className="w-3.5 h-3.5" />}
                          onClick={() => handlePrintPriceListVersion(list)}
                        >
                          Print
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setPriceListVersionReview(list)}>
                          Compare
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={list.isActive || activatingPriceListId === list.id}
                          onClick={() => setPriceListVersionReview(list)}
                        >
                          {activatingPriceListId === list.id ? 'Restoring...' : list.isActive ? 'Active' : `Restore (${isTransit ? 'Transit Leg' : 'Ocean Leg'})`}
                        </Button>
                      </JXBox>
                    </JXBox>
                  );
                })}
              </JXBox>
            )}
          </JXBox>
        </DashboardPanel>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
        {(company.companyType === 'SHIPPING' || company.isShipping || (company.containers && company.containers.length > 0)) && (
          <DashboardPanel
            title="Shipping Operations"
            description="Containers and shipments linked to this shipping company"
          >
            <DashboardGrid className="grid-cols-1 md:grid-cols-2 mb-4">
              <StatsCard icon={<Building2 className="w-5 h-5" />} title="Containers" value={company._count?.containers || 0} variant="default" />
              <StatsCard icon={<Package className="w-5 h-5" />} title="Shipped Vehicles" value={(company.shipments || []).filter((s) => s.isShipped).length} variant="info" />
            </DashboardGrid>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginBottom: '24px'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, marginBottom: '8px'}}>Recent Containers</JXBox>
              <DataTable
                data={company.containers || []}
                keyField="id"
                columns={[
                  { key: 'containerNumber', header: 'Container', sortable: true },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: 'currentCount',
                    header: 'Capacity',
                    render: (_, row) => `${row.currentCount}/${row.maxCapacity}`,
                  },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
                  },
                ]}
              />
            </JXBox>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600}}>Shipped Vehicles</JXBox>
                {((company.shipments || []).filter((s) => s.isShipped).length > 0) && (
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Download className="w-3.5 h-3.5 text-emerald-500" />}
                    onClick={() => {
                      const shippedVehicles = (company.shipments || []).filter((s) => s.isShipped);
                      openUniversalShipmentExport({
                        shipmentIds: shippedVehicles.map((s) => s.id),
                        title: `Export Shipped Vehicles - ${company.name}`,
                        subtitle: `${shippedVehicles.length} vehicles linked to shipping operations`,
                      });
                    }}
                  >
                    Export Shipped Vehicles
                  </Button>
                )}
              </JXBox>
              <DataTable
                data={(company.shipments || []).filter((s) => s.isShipped)}
                keyField="id"
                selectable
                onExport={(selectedRows) =>
                  openUniversalShipmentExport({
                    shipmentIds: selectedRows.map((r) => r.id),
                    title: `Export Selected Shipped Vehicles (${selectedRows.length})`,
                    subtitle: `${company.name} • Shipped vehicles`,
                  })
                }
                columns={[
                  {
                    key: 'vehicleVIN',
                    header: 'Vehicle',
                    render: (_, row) => row.vehicleVIN || [row.vehicleMake, row.vehicleModel].filter(Boolean).join(' ') || '-',
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    align: 'center',
                    render: (_, row) => (
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Download className="w-3.5 h-3.5 text-emerald-500" />}
                          onClick={() =>
                            openUniversalShipmentExport({
                              shipmentIds: [row.id],
                              title: `Export Vehicle ${row.vehicleVIN || row.id}`,
                              subtitle: `${row.vehicleMake || ''} ${row.vehicleModel || ''}`.trim(),
                            })
                          }
                        >
                          Export
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => router.push(`/dashboard/shipments/${row.id}`)}
                        >
                          Shipment
                        </Button>
                        {row.containerId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/containers/${row.containerId}`)}
                          >
                            Container
                          </Button>
                        )}
                      </JXBox>
                    ),
                  },
                ]}
              />
            </JXBox>

          </DashboardPanel>
        )}

        {(company.companyType === 'DISPATCH' || company.isDispatch || (company.dispatches && company.dispatches.length > 0)) && (
          <DashboardPanel
            title="Dispatch Operations"
            description="Dispatch records and assigned shipments linked to this dispatch company"
          >
            <DashboardGrid className="grid-cols-1 md:grid-cols-2 mb-4">
              <StatsCard icon={<Truck className="w-5 h-5" />} title="Dispatches" value={company._count?.dispatches || 0} variant="default" />
              <StatsCard icon={<Package className="w-5 h-5" />} title="Dispatched Shipments" value={(company.shipments || []).filter((shipment) => shipment.isDispatched || Boolean(shipment.dispatchId)).length} variant="info" />
            </DashboardGrid>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginBottom: '24px'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, marginBottom: '8px'}}>Recent Dispatches</JXBox>
              <DataTable
                data={company.dispatches || []}
                keyField="id"
                columns={[
                  { key: 'referenceNumber', header: 'Reference', sortable: true },
                  {
                    key: 'origin',
                    header: 'Route',
                    render: (_, row) => `${row.origin} -> ${row.destination}`,
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: '_count',
                    header: 'Shipments',
                    render: (_, row) => row._count.shipments,
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    align: 'center',
                    render: (_, row) => (
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/dispatches/${row.id}`)}
                        >
                          Dispatch
                        </Button>
                      </JXBox>
                    ),
                  },
                ]}
              />
            </JXBox>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, marginBottom: '8px'}}>Assigned Shipments</JXBox>
              <DataTable
                data={(company.shipments || []).filter((shipment) => shipment.isDispatched || Boolean(shipment.dispatchId))}
                keyField="id"
                columns={[
                  {
                    key: 'vehicleVIN',
                    header: 'Vehicle',
                    render: (_, row) => row.vehicleVIN || [row.vehicleMake, row.vehicleModel].filter(Boolean).join(' ') || '-',
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    align: 'center',
                    render: (_, row) => (
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => router.push(`/dashboard/shipments/${row.id}`)}
                        >
                          Shipment
                        </Button>
                        {row.dispatchId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/dispatches/${row.dispatchId}`)}
                          >
                            Dispatch
                          </Button>
                        )}
                      </JXBox>
                    ),
                  },
                ]}
              />
            </JXBox>
          </DashboardPanel>
        )}

        {(company.companyType === 'TRANSIT' || company.isTransit || (company.transits && company.transits.length > 0)) && (
          <DashboardPanel
            title="Transit Operations"
            description="Transits and assigned shipments linked to this transit company"
          >
            <DashboardGrid className="grid-cols-1 md:grid-cols-2 mb-4">
              <StatsCard icon={<GitCompareArrows className="w-5 h-5" />} title="Transits" value={company._count?.transits || 0} variant="default" />
              <StatsCard icon={<Package className="w-5 h-5" />} title="Transited Shipments" value={(company.shipments || []).filter((shipment) => shipment.isTransited || Boolean(shipment.transitId)).length} variant="info" />
            </DashboardGrid>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginBottom: '24px'}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, marginBottom: '8px'}}>Recent Transits</JXBox>
              <DataTable
                data={company.transits || []}
                keyField="id"
                columns={[
                  { key: 'referenceNumber', header: 'Reference', sortable: true },
                  {
                    key: 'origin',
                    header: 'Route',
                    render: (_, row) => `${row.origin} -> ${row.destination}`,
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: '_count',
                    header: 'Shipments',
                    render: (_, row) => row._count.shipments,
                  },
                ]}
              />
            </JXBox>

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 600, marginBottom: '8px'}}>Assigned Shipments</JXBox>
              <DataTable
                data={(company.shipments || []).filter((shipment) => shipment.isTransited || Boolean(shipment.transitId))}
                keyField="id"
                columns={[
                  {
                    key: 'vehicleVIN',
                    header: 'Vehicle',
                    render: (_, row) => row.vehicleVIN || [row.vehicleMake, row.vehicleModel].filter(Boolean).join(' ') || '-',
                  },
                  { key: 'status', header: 'Status', sortable: true },
                  {
                    key: 'createdAt',
                    header: 'Created',
                    render: (_, row) => new Date(row.createdAt).toLocaleDateString(),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    align: 'center',
                    render: (_, row) => (
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'nowrap', whiteSpace: 'nowrap'}} onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => router.push(`/dashboard/shipments/${row.id}`)}
                        >
                          Shipment
                        </Button>
                        {row.transitId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/transits/${row.transitId}`)}
                          >
                            Transit
                          </Button>
                        )}
                      </JXBox>
                    ),
                  },
                ]}
              />
            </JXBox>

          </DashboardPanel>
        )}
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
        {report && report.summary.transactionCount > 0 && (
          <DashboardPanel title="Monthly Report" description="Transaction breakdown by month">
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, overflowX: 'auto'}}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Month</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Debit</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Credit</th>
                    <th style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--text-secondary)', fontWeight: 600 }}>Net</th>
                  </tr>
                </thead>
                <tbody>
                  {report.monthlyBreakdown?.map((row) => (
                    <tr key={row.month} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 500 }}>{row.month}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--error)' }}>{formatCurrency(row.debit)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--success)' }}>{formatCurrency(row.credit)}</td>
                      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600, color: row.net >= 0 ? 'var(--text-primary)' : 'var(--error)' }}>
                        {formatCurrency(row.net)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </JXBox>
          </DashboardPanel>
        )}
        {(!report || report.summary.transactionCount === 0) && (
          <DashboardPanel title="Monthly Report" description="Transaction breakdown by month">
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)'}}>No report data is available for this company yet.</JXBox>
          </DashboardPanel>
        )}
        </TabPanel>

        <Modal
          open={openEntry}
          onClose={() => { if (!posting) { setOpenEntry(false); setIsPaymentMode(false); } }}
          title={isPaymentMode ? `Record Payment to ${company?.name || 'Company'}` : 'Add Company Transaction'}
          size="sm"
          contentSx={{display: 'grid', gap: '16px', paddingTop: '12px'}}
          actions={<>

            <Button variant="outline" onClick={() => { setOpenEntry(false); setIsPaymentMode(false); }} disabled={posting}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateEntry} disabled={posting}>{posting ? 'Saving...' : isPaymentMode ? 'Record Payment' : 'Save Transaction'}</Button>
          </>}
        >

            <FormField label="Description" value={formData.description} onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))} required />
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <Select label="Type" options={[{ value: "DEBIT", label: 'DEBIT (Payment to Company)' }, { value: "CREDIT", label: 'CREDIT (Company Charge/Expense)' }]} value={formData.type} onChange={(val) => setFormData((prev) => ({ ...prev, type: val as string }))} />
              <FormField label="Amount" type="number" inputProps={{ min: 0.01, step: 0.01 }} value={formData.amount} onChange={(event) => setFormData((prev) => ({ ...prev, amount: event.target.value }))} />
            </JXBox>
            <FormField label="Transaction Date" type="date" InputLabelProps={{ shrink: true }} value={formData.transactionDate} onChange={(event) => setFormData((prev) => ({ ...prev, transactionDate: event.target.value }))} />
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <FormField label="Category" value={formData.category} onChange={(event) => setFormData((prev) => ({ ...prev, category: event.target.value }))} />
              <FormField label="Reference" value={formData.reference} onChange={(event) => setFormData((prev) => ({ ...prev, reference: event.target.value }))} />
            </JXBox>
            <FormField label="Notes" rows={3} multiline value={formData.notes} onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))} />
        </Modal>

        <Modal
          open={openImportDialog}
          onClose={() => { if (!importing && !previewingImport) { setOpenImportDialog(false); resetImportForm(); } }}
          title="Import Bank of America CSV"
          size="md"
          contentSx={{display: 'grid', gap: '16px', paddingTop: '12px'}}
          actions={<>

            <Button variant="outline" onClick={() => { setOpenImportDialog(false); resetImportForm(); }} disabled={importing || previewingImport}>Cancel</Button>
            <Button variant="outline" onClick={handlePreviewBankCsv} disabled={importing || previewingImport}>{previewingImport ? 'Previewing...' : 'Preview CSV'}</Button>
            <Button variant="primary" onClick={handleImportBankCsv} disabled={importing || previewingImport || !importPreview}>{importing ? 'Importing...' : 'Import CSV'}</Button>
          </>}
        >

            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
              Import a Bank of America CSV statement into this company ledger. Use a dedicated company record per bank account so the running balance stays meaningful.
            </JXBox>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
              Money in is imported as <strong>DEBIT</strong>. Money out is imported as <strong>CREDIT</strong>. Previously imported rows are skipped automatically.
            </JXBox>
            <div className="min-w-0 flex-1"><FormField label="Ledger Category" value={importForm.category} onChange={(event) => {
                setImportForm((prev) => ({ ...prev, category: event.target.value }));
                setImportPreview(null);
              }} placeholder="Bank Statement" /></div>
            <div className="min-w-0 flex-1"><FormField label="Statement Ending Balance" value={importForm.statementEndingBalance} onChange={(event) => {
                setImportForm((prev) => ({ ...prev, statementEndingBalance: event.target.value }));
                setImportPreview(null);
              }} placeholder="0.00" helperText="Optional, but recommended for reconciliation against the statement total" /></div>
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px'}}>
                CSV file
              </JXBox>
              <input type="file" accept=".csv,text/csv" onChange={handleImportFileChange} />
              {importFile && (
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)'}}>
                  Selected: {importFile.name}
                </JXBox>
              )}
            </JXBox>
            {importPreview && (
              <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '16px'}}>
                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '12px'}} className="grid-cols-1 md:grid-cols-4">
                  <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Rows</JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px', fontWeight: 700}}>{importPreview.totalCount}</JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: 'var(--text-secondary)'}}>{importPreview.importableCount} ready to import</JXBox>
                  </JXBox>
                  <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Duplicates</JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px', fontWeight: 700}}>{importPreview.duplicateCount}</JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: 'var(--text-secondary)'}}>Already imported or repeated in file</JXBox>
                  </JXBox>
                  <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Net Change</JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px', fontWeight: 700}}>{formatCurrency(importPreview.importableNetChange)}</JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: 'var(--text-secondary)'}}>Current {formatCurrency(importPreview.currentBalance)}</JXBox>
                  </JXBox>
                  <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700}}>Projected Ending</JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px', fontWeight: 700}}>{formatCurrency(importPreview.projectedEndingBalance)}</JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.78rem', color: importPreview.reconciliationStatus === 'MATCH' ? '#16a34a' : importPreview.reconciliationStatus === 'VARIANCE' ? '#dc2626' : 'var(--text-secondary)'}}>
                      {importPreview.reconciliationStatus === 'NOT_PROVIDED'
                        ? 'Add statement ending balance to reconcile'
                        : `${importPreview.reconciliationStatus === 'MATCH' ? 'Matches statement' : 'Difference'} ${formatCurrency(Math.abs(importPreview.reconciliationDifference || 0))}`}
                    </JXBox>
                  </JXBox>
                </JXBox>

                {importPreview.statementEndingBalance !== null && (
                  <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: importPreview.reconciliationStatus === 'MATCH' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)'}}>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700, color: 'var(--text-primary)'}}>
                      Statement ending balance: {formatCurrency(importPreview.statementEndingBalance)}
                    </JXBox>
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
                      {importPreview.reconciliationStatus === 'MATCH'
                        ? 'Projected ledger ending balance matches the statement total.'
                        : `Projected ledger ending balance differs by ${formatCurrency(Math.abs(importPreview.reconciliationDifference || 0))}. Review duplicates and source data before importing.`}
                    </JXBox>
                  </JXBox>
                )}

                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden'}}>
                  <JXBox padding="none" border={false} style={{borderRadius: 0, paddingLeft: '16px', paddingRight: '16px', paddingTop: '10px', paddingBottom: '10px', fontWeight: 700, borderBottom: '1px solid var(--border)', background: 'var(--panel)'}}>
                    Preview Rows
                  </JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, maxHeight: '320px', overflow: 'auto'}}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Date</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Description</th>
                          <th style={{ textAlign: 'left', padding: '10px 12px' }}>Status</th>
                          <th style={{ textAlign: 'right', padding: '10px 12px' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importPreview.rows.map((row, index) => (
                          <tr key={`${row.transactionDate}-${row.description}-${index}`} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{new Date(`${row.transactionDate}T00:00:00`).toLocaleDateString()}</td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <div style={{ fontWeight: 600 }}>{row.description}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                                {row.reference ? `Ref: ${row.reference}` : 'No reference'}{row.notes ? ` • ${row.notes}` : ''}
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 8px',
                                  borderRadius: 999,
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  background: row.isDuplicate ? 'rgba(234, 179, 8, 0.14)' : 'rgba(34, 197, 94, 0.12)',
                                  color: row.isDuplicate ? '#b45309' : '#15803d',
                                }}
                              >
                                {row.isDuplicate
                                  ? row.duplicateReason === 'ALREADY_IMPORTED'
                                    ? 'Already Imported'
                                    : 'Duplicate In File'
                                  : 'Will Import'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', verticalAlign: 'top', textAlign: 'right', color: row.type === 'DEBIT' ? 'var(--error)' : '#16a34a', fontWeight: 700 }}>
                              {row.type === 'DEBIT' ? '−' : '+'}{formatCurrency(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </JXBox>
                </JXBox>
              </JXBox>
            )}
        </Modal>

        <Modal
          open={Boolean(priceListVersionReview)}
          onClose={() => !activatingPriceListId && setPriceListVersionReview(null)}
          title={priceListVersionReview?.isActive ? 'Active Price List Details' : 'Review Price List Restore'}
          size="md"
          contentSx={{display: 'grid', gap: '16px', paddingTop: '12px'}}
          actions={<>

            {priceListVersionReview && (
              <Button
                variant="outline"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => handlePrintPriceListVersion(priceListVersionReview)}
              >
                Print This Version
              </Button>
            )}
            <Button variant="outline" onClick={() => setPriceListVersionReview(null)} disabled={Boolean(activatingPriceListId)}>Close</Button>
            {priceListVersionReview && !priceListVersionReview.isActive && (
              <Button variant="primary" onClick={() => void handleActivatePriceList(priceListVersionReview.id)} disabled={activatingPriceListId === priceListVersionReview.id}>
                {activatingPriceListId === priceListVersionReview.id ? 'Restoring...' : 'Restore This Version'}
              </Button>
            )}
          </>}
        >

            {priceListVersionReview && priceListVersionComparison && (
              <>
                <JXBox padding="none" border={false} style={{padding: '12px', borderRadius: '16px', border: '1px solid var(--border)', background: 'var(--panel)'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>{priceListVersionReview.name}</JXBox>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)'}}>
                    {priceListVersionReview.sourceFileName} - {priceListVersionReview.destinationLabel} - Imported {new Date(priceListVersionReview.createdAt).toLocaleString()}
                  </JXBox>
                  {!priceListVersionReview.isActive && activePriceList && (
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)'}}>
                      Restoring this version will replace the active version: <strong>{activePriceList.name}</strong>.
                    </JXBox>
                  )}
                </JXBox>

                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '8px'}} className="grid-cols-1 sm:grid-cols-4">
                  {[
                    { label: 'State changes', value: priceListVersionComparison.changedStates.length },
                    { label: 'Added lanes', value: priceListVersionComparison.addedLanes.length },
                    { label: 'Removed lanes', value: priceListVersionComparison.removedLanes.length },
                    { label: 'Changed lanes', value: priceListVersionComparison.changedLanes.length },
                  ].map((item) => (
                    <JXBox padding="none" border={false} key={item.label} style={{padding: '10px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--background)'}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase'}}>{item.label}</JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, marginTop: '2.8px', fontWeight: 800, fontSize: '1.15rem'}}>{item.value}</JXBox>
                    </JXBox>
                  ))}
                </JXBox>

                <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gap: '8px'}}>
                  <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>Sample Changes</JXBox>
                  {priceListVersionComparison.changedStates.slice(0, 5).map((row) => (
                    <JXBox padding="none" border={false} key={row.stateCode} style={{backgroundColor: 'transparent', display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '8px', borderRadius: '12px', border: '1px solid var(--border)'}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>{row.stateCode}</JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)'}}>
                        {row.current ? formatCurrency(row.current) : 'Missing'} -&gt; {row.target ? formatCurrency(row.target) : 'Missing'}
                      </JXBox>
                    </JXBox>
                  ))}
                  {priceListVersionComparison.changedLanes.slice(0, 5).map(({ current, target }) => (
                    <JXBox padding="none" border={false} key={priceListLaneKey(target)} style={{backgroundColor: 'transparent', display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '8px', borderRadius: '12px', border: '1px solid var(--border)'}}>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0}}>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontWeight: 700}}>{target.stateCode} {target.branch || target.city}</JXBox>
                        <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, fontSize: '0.76rem', color: 'var(--text-secondary)'}}>{target.city || '-'}{target.loadingPoint ? ` - ${target.loadingPoint}` : ''}</JXBox>
                      </JXBox>
                      <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, color: 'var(--text-secondary)', whiteSpace: 'nowrap'}}>{formatCurrency(current.total)} -&gt; {formatCurrency(target.total)}</JXBox>
                    </JXBox>
                  ))}
                  {!priceListVersionComparison.changedStates.length && !priceListVersionComparison.changedLanes.length && (
                    <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', padding: '10px', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-secondary)'}}>
                      No changed prices were found between the active version and this version. Added or removed lanes may still apply.
                    </JXBox>
                  )}
                </JXBox>
              </>
            )}
        </Modal>

        <Modal
          open={openEditEntry}
          onClose={() => !updating && setOpenEditEntry(false)}
          title="Edit Transaction"
          size="sm"
          contentSx={{display: 'grid', gap: '16px', paddingTop: '12px'}}
          actions={<>

            <Button variant="outline" onClick={() => setOpenEditEntry(false)} disabled={updating}>Cancel</Button>
            <Button variant="primary" onClick={handleEditEntry} disabled={updating}>{updating ? 'Saving...' : 'Save Changes'}</Button>
          </>}
        >

            <FormField label="Description" value={editForm.description} onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))} required />
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <Select label="Type" options={[{ value: "DEBIT", label: 'DEBIT' }, { value: "CREDIT", label: 'CREDIT' }]} value={editForm.type} onChange={(val) => setEditForm((prev) => ({ ...prev, type: val as string }))} />
              <FormField label="Amount" type="number" inputProps={{ min: 0.01, step: 0.01 }} value={editForm.amount} onChange={(event) => setEditForm((prev) => ({ ...prev, amount: event.target.value }))} />
            </JXBox>
            <FormField label="Transaction Date" type="date" InputLabelProps={{ shrink: true }} value={editForm.transactionDate} onChange={(event) => setEditForm((prev) => ({ ...prev, transactionDate: event.target.value }))} />
            <JXBox padding="none" border={false} style={{backgroundColor: 'transparent', borderRadius: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
              <FormField label="Category" value={editForm.category} onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))} />
              <FormField label="Reference" value={editForm.reference} onChange={(event) => setEditForm((prev) => ({ ...prev, reference: event.target.value }))} />
            </JXBox>
            <FormField label="Notes" rows={3} multiline value={editForm.notes} onChange={(event) => setEditForm((prev) => ({ ...prev, notes: event.target.value }))} />
        </Modal>

        {/* Company Price List Slide-over Drawer */}
        <CompanyPriceListDrawer
          open={openPriceListDrawer}
          onClose={() => setOpenPriceListDrawer(false)}
          companyId={company.id}
          companyName={company.name}
          companyType={companyTypeLabel}
          priceListConfig={company.priceListConfig}
          priceLists={company.priceLists}
          activePriceList={activePriceList}
          onSwitchToManageTab={() => {
            setActiveTab(1);
            const nextParams = new URLSearchParams(searchParams.toString());
            nextParams.set('tab', 'price-list');
            router.replace(`?${nextParams.toString()}`, { scroll: false });
          }}
        />
      </DashboardSurface>
    </PermissionRoute>
  );
}

// useSearchParams() must sit under a Suspense boundary or static
// prerendering fails (missing-suspense-with-csr-bailout).
export default function CompanyLedgerDetailPage() {
  return (
    <Suspense fallback={<div aria-busy="true" style={{ minHeight: '50vh' }} />}>
      <CompanyLedgerDetailPageContent />
    </Suspense>
  );
}
