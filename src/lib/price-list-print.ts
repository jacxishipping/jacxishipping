import { formatMoney as formatCurrency } from '@/lib/format';
import { US_STATES, type AuctionRateEntry } from '@/lib/shipping-rate-calculator';
import { JACXI_LOGO_BASE64 } from './jacxi-pdf-logo-base64';

export interface PrintCompanyPriceListOptions {
  companyName: string;
  companyType?: string | null;
  priceListName?: string | null;
  destinationLabel?: string | null;
  sourceFileName?: string | null;
  effectiveDate?: string | null;
  auctionRates: AuctionRateEntry[];
  stateRates?: Record<string, number> | null;
  filterInfo?: {
    selectedState?: string | null;
    searchQuery?: string | null;
  } | null;
  logoUrl?: string | null;
  legType?: 'ocean' | 'transit';
  rates?: {
    sedan: number;
    suv: number;
    pickup?: number;
    motorcycle?: number;
    van?: number;
  };
  origin?: string | null;
  destination?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  terms?: string[] | null;
  carrierInfo?: {
    name?: string;
    brand?: string;
    phone?: string;
    slogan?: string;
    website?: string;
  } | null;
}

export interface PrintTransitPriceListOptions {
  companyName: string;
  companyType?: string | null;
  priceListName?: string | null;
  origin?: string | null;
  destination?: string | null;
  destinationLabel?: string | null;
  sourceFileName?: string | null;
  effectiveDate?: string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  rates: {
    sedan: number;
    suv: number;
    pickup?: number;
    motorcycle?: number;
    van?: number;
  };
  terms?: string[] | null;
  carrierInfo?: {
    name?: string;
    brand?: string;
    phone?: string;
    slogan?: string;
    website?: string;
  } | null;
  logoUrl?: string | null;
  legType?: 'transit';
}

interface CorridorConfig {
  port: string;
  label: string;
  defaultOcean: number;
  typicalOrigins: string[];
}

const CORRIDOR_MAP: Record<string, CorridorConfig> = {
  GA: {
    port: 'GA',
    label: 'SOUTHEAST LOAD',
    defaultOcean: 737.5,
    typicalOrigins: ['AL', 'FL', 'GA', 'KY', 'MS', 'NC', 'SC', 'TN'],
  },
  NJ: {
    port: 'NJ',
    label: 'NORTHEAST LOAD',
    defaultOcean: 812.5,
    typicalOrigins: ['CT', 'DE', 'IL', 'IN', 'MA', 'MD', 'MI', 'NJ', 'NY', 'OH', 'PA', 'VT', 'WI', 'WV', 'ME', 'NH', 'RI', 'VA', 'DC'],
  },
  TX: {
    port: 'TX',
    label: 'GULF LOAD',
    defaultOcean: 1100.0,
    typicalOrigins: ['AR', 'CO', 'KS', 'LA', 'MO', 'NM', 'OK', 'TX', 'NE', 'IA'],
  },
  CA: {
    port: 'CA',
    label: 'WEST COAST LOAD',
    defaultOcean: 1625.0,
    typicalOrigins: ['AZ', 'CA', 'HI', 'ID', 'MT', 'NV', 'OR', 'UT', 'WA', 'WY', 'ND', 'SD', 'AK'],
  },
};

function resolveCorridor(stateCode: string, loadingPoint?: string | null): CorridorConfig {
  const lp = (loadingPoint || '').toUpperCase();
  if (lp.includes('GA') || lp.includes('SAVANNAH')) return CORRIDOR_MAP.GA;
  if (lp.includes('NJ') || lp.includes('NEW JERSEY') || lp.includes('NEW YORK') || lp.includes('NY')) return CORRIDOR_MAP.NJ;
  if (lp.includes('TX') || lp.includes('HOUSTON') || lp.includes('GALVESTON')) return CORRIDOR_MAP.TX;
  if (lp.includes('CA') || lp.includes('LOS ANGELES') || lp.includes('LONG BEACH') || lp.includes('OAKLAND')) return CORRIDOR_MAP.CA;

  const sc = stateCode.toUpperCase();
  for (const corridor of Object.values(CORRIDOR_MAP)) {
    if (corridor.typicalOrigins.includes(sc)) {
      return corridor;
    }
  }
  return CORRIDOR_MAP.CA;
}

export function generatePriceListPrintHtml(options: PrintCompanyPriceListOptions): string {
  const companyName = options.companyName || 'JACXI SHIPPING';
  const companyType = options.companyType || 'Shipping';
  const priceListName = options.priceListName || 'Active Rate Sheet';
  const destinationLabel = options.destinationLabel || 'Mersin';
  const sourceFileName = options.sourceFileName || undefined;
  const effectiveDate = options.effectiveDate || '1 September 2026';
  const auctionRates = options.auctionRates || [];
  const stateRates = options.stateRates || {};
  const filterInfo = options.filterInfo || undefined;

  const activeLogo = options.logoUrl || (typeof window !== 'undefined' ? (() => {
    try {
      const cached = localStorage.getItem('jacxi_site_branding_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.logoUrl) return parsed.logoUrl;
      }
    } catch {
      // Ignore
    }
    return JACXI_LOGO_BASE64;
  })() : JACXI_LOGO_BASE64);

  const currentYear = new Date().getFullYear();
  const tariffYear = effectiveDate.includes('202') ? (effectiveDate.match(/202\d/)?.[0] || String(currentYear)) : String(currentYear);

  const stateEntries = Object.entries(stateRates).sort(([a], [b]) => a.localeCompare(b));
  const uniqueStates = Array.from(new Set(auctionRates.map((r) => r.stateCode.toUpperCase()))).sort();

  // Calculate pricing metrics
  const totalSedanRates = auctionRates.map((r) => {
    const corridor = resolveCorridor(r.stateCode, r.loadingPoint);
    return r.total > corridor.defaultOcean ? r.total : r.total + corridor.defaultOcean;
  });
  const lowestSedan = totalSedanRates.length > 0 ? Math.min(...totalSedanRates) : (stateEntries.length > 0 ? Math.min(...stateEntries.map(([, v]) => v)) : 837.5);
  const highestSedan = totalSedanRates.length > 0 ? Math.max(...totalSedanRates) : (stateEntries.length > 0 ? Math.max(...stateEntries.map(([, v]) => v)) : 4325.0);

  // Group auction rates by state
  const ratesByState = new Map<string, AuctionRateEntry[]>();
  for (const rate of auctionRates) {
    const sc = rate.stateCode.toUpperCase();
    if (!ratesByState.has(sc)) {
      ratesByState.set(sc, []);
    }
    ratesByState.get(sc)!.push(rate);
  }
  const sortedStateCodes = Array.from(ratesByState.keys()).sort();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${companyName} - Price List (${destinationLabel})</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1a1a1a;
      background: #f0f2f5;
      padding: 0;
      margin: 0;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Print toolbar */
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #1e293b;
      color: #ffffff;
      padding: 12px 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .toolbar-title {
      font-weight: 700;
      font-size: 14px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toolbar-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .toolbar-btn {
      background: #d4af37;
      color: #111827;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .toolbar-btn:hover {
      background: #c59b27;
    }
    .toolbar-btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }
    .toolbar-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    /* Page container */
    .doc-page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      padding: 42pt 34pt 32pt 34pt;
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      box-sizing: border-box;
      overflow: hidden;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* Top Accent Bars */
    .top-bar-black {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 18px;
      background: #000000;
    }
    .top-bar-gold {
      position: absolute;
      top: 18px;
      left: 0;
      right: 0;
      height: 3.5px;
      background: #d4af37;
    }

    /* Running Header */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #d4af37;
      padding-bottom: 10px;
      margin-bottom: 18px;
    }
    .doc-logo {
      height: 38px;
      object-fit: contain;
      display: block;
    }
    .doc-header-right {
      text-align: right;
    }
    .doc-header-right-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #000000;
    }
    .doc-header-right-sub {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #c59b27;
      margin-top: 2px;
    }

    /* Cover Page Elements */
    .cover-hero {
      margin-top: 4px;
      margin-bottom: 22px;
    }
    .cover-title {
      font-size: 26px;
      font-weight: 800;
      color: #1a1a1a;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }
    .cover-desc {
      font-size: 9.5px;
      color: #4b5563;
      margin-top: 8px;
      line-height: 1.55;
      max-width: 680px;
    }

    /* Corridor Matrix (4 columns) */
    .corridor-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 22px;
    }
    .corridor-card {
      border: 1px solid #e8dfce;
      border-top: 3px solid #d4af37;
      background: #ffffff;
      border-radius: 3px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
    }
    .corridor-card-header {
      font-size: 7.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #888888;
    }
    .corridor-card-title {
      font-size: 10px;
      font-weight: 800;
      color: #1a1a1a;
      margin-top: 3px;
    }
    .corridor-card-price {
      font-size: 18px;
      font-weight: 850;
      color: #c59b27;
      margin-top: 8px;
      letter-spacing: -0.01em;
    }
    .corridor-card-caption {
      font-size: 7.5px;
      font-weight: 600;
      color: #5c5c5c;
      margin-top: 3px;
    }
    .corridor-card-origins {
      font-size: 7.2px;
      color: #6b7280;
      margin-top: 8px;
      line-height: 1.4;
      border-top: 1px solid #eeeeee;
      padding-top: 6px;
    }

    /* Stats Bar (Solid Black Background matching PDF) */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #000000;
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 22px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-value {
      font-size: 18px;
      font-weight: 850;
      color: #c59b27;
      letter-spacing: -0.01em;
    }
    .stat-label {
      font-size: 7.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #ffffff;
      margin-top: 4px;
    }

    /* Section Header */
    .guide-section-title {
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #c59b27;
      margin-bottom: 10px;
    }

    /* How to Read a Line (4 steps) */
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 22px;
    }
    .step-box {
      border: 1px solid #e8dfce;
      background: #ffffff;
      border-radius: 3px;
      padding: 10px 12px;
    }
    .step-num {
      font-size: 12px;
      font-weight: 850;
      color: #c59b27;
      margin-bottom: 2px;
    }
    .step-title {
      font-size: 10px;
      font-weight: 800;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .step-desc {
      font-size: 7.8px;
      color: #5c5c5c;
      line-height: 1.45;
    }

    /* Policy Inclusions / Exclusions */
    .policy-section {
      margin-bottom: 20px;
    }
    .policy-block {
      margin-bottom: 14px;
    }
    .policy-block-title {
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #c59b27;
      margin-bottom: 6px;
    }
    .policy-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .policy-list li {
      font-size: 8px;
      color: #374151;
      margin-bottom: 4px;
      line-height: 1.45;
      position: relative;
      padding-left: 14px;
    }
    .policy-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #c59b27;
      font-weight: bold;
      font-size: 11px;
      line-height: 1;
    }

    /* Page 2: Commercial Rules */
    .rules-title {
      font-size: 26px;
      font-weight: 800;
      color: #1a1a1a;
      letter-spacing: -0.01em;
      margin-top: 4px;
      margin-bottom: 18px;
    }
    .rules-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .rule-card {
      border: 1px solid #e8dfce;
      border-left: 3.5px solid #c59b27;
      background: #ffffff;
      border-radius: 3px;
      padding: 12px 16px;
    }
    .rule-card-title {
      font-size: 10.5px;
      font-weight: 800;
      color: #1a1a1a;
      letter-spacing: 0.02em;
      margin-bottom: 4px;
    }
    .rule-card-text {
      font-size: 8.5px;
      color: #4b5563;
      line-height: 1.6;
    }

    /* Running Footer */
    .doc-footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
      margin-top: 20px;
      font-size: 7.5px;
      color: #6b7280;
      display: flex;
      justify-content: space-between;
      align-items: center;
      letter-spacing: 0.02em;
    }
    .doc-footer-brand {
      color: #5c5c5c;
    }
    .doc-footer-center {
      color: #1a1a1a;
      font-weight: 600;
    }

    /* Table Styles */
    .rates-table-container {
      width: 100%;
      margin-bottom: 16px;
    }
    table.rates-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8px;
      line-height: 1.35;
    }
    table.rates-table thead {
      display: table-header-group;
    }
    table.rates-table th {
      background: #000000;
      color: #d4af37;
      padding: 6px 8px;
      text-align: left;
      font-weight: 800;
      font-size: 7.5px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border: none;
    }
    table.rates-table th.num-col {
      text-align: right;
    }
    table.rates-table tr {
      page-break-inside: avoid;
    }
    table.rates-table tbody tr:nth-child(even) {
      background: #f6f1e3;
    }
    table.rates-table tbody tr:nth-child(odd) {
      background: #ffffff;
    }
    table.rates-table td {
      padding: 5.5px 8px;
      border-bottom: 1px solid #e4e4e4;
      color: #1a1a1a;
      font-size: 7.8px;
    }
    table.rates-table td.num-col {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-family: inherit;
    }
    table.rates-table td.sedan-total {
      font-weight: 850;
      color: #1a1a1a;
    }
    table.rates-table td.suv-total {
      font-weight: 850;
      color: #c59b27;
    }

    /* State Banner Row (Solid Black matching PDF) */
    .state-banner-row td {
      background: #000000 !important;
      border: none !important;
      padding: 5px 8px !important;
    }
    .state-banner-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      font-weight: 850;
      color: #d4af37;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .state-yard-badge {
      font-size: 7.5px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.05em;
    }

    /* Filter Notice */
    .filter-notice-banner {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      color: #1e40af;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    /* State Flat Rates (if present) */
    .state-flat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-top: 14px;
      margin-bottom: 18px;
    }
    .state-flat-card {
      border: 1px solid #e5e7eb;
      background: #ffffff;
      border-radius: 4px;
      padding: 6px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7.8px;
    }
    .state-flat-card strong {
      color: #1a1a1a;
      font-weight: 800;
    }

    /* Print media optimization */
    @media print {
      body {
        padding: 0;
        margin: 0;
        background: #ffffff;
      }
      .no-print {
        display: none !important;
      }
      @page {
        size: A4 portrait;
        margin: 0;
      }
      .doc-page {
        margin: 0;
        padding: 42pt 34pt 32pt 34pt;
        width: 210mm;
        min-height: 297mm;
        box-shadow: none;
        page-break-after: always;
        break-after: page;
      }
      .page-break {
        page-break-after: always;
        break-after: page;
      }
      table.rates-table thead {
        display: table-header-group;
      }
      .state-banner-row {
        page-break-after: avoid;
        break-after: avoid;
      }
    }
  </style>
</head>
<body>

  <!-- Print Toolbar (Hidden during actual print) -->
  <div class="toolbar no-print">
    <div class="toolbar-title">
      <img src="${activeLogo}" alt="JACXI" style="height: 24px; filter: brightness(0) invert(1);" />
      <span>${companyName} — Price List Rate Sheet (${destinationLabel})</span>
    </div>
    <div class="toolbar-actions">
      <a class="toolbar-btn toolbar-btn-secondary" href="/downloads/JACXI_Price_List_2026_Mersin_Yards.pdf" target="_blank" download="JACXI_Price_List_2026_Mersin_Yards.pdf">
        ⬇ Download Original PDF
      </a>
      <button class="toolbar-btn toolbar-btn-secondary" onclick="window.close()">Close</button>
      <button class="toolbar-btn" onclick="window.print()">🖨 Print Rate Sheet</button>
    </div>
  </div>

  <!-- PAGE 1: COVER / CORRIDOR GUIDE -->
  <div class="doc-page page-break">
    <div class="top-bar-black"></div>
    <div class="top-bar-gold"></div>

    <div class="doc-header">
      <div>
        <img src="${activeLogo}" alt="${companyName}" class="doc-logo" />
      </div>
      <div class="doc-header-right">
        <div class="doc-header-right-title">PRICE LIST</div>
        <div class="doc-header-right-sub">${tariffYear} · ${destinationLabel.toUpperCase()} TARIFF</div>
      </div>
    </div>

    <div class="cover-hero">
      <h1 class="cover-title">Single-car rate schedule</h1>
      <p class="cover-desc">
        Door-to-${destinationLabel} guide rates for a running sedan. Each line is origin towing from the named US auction yard to the load port, plus ocean freight and clearance to ${destinationLabel}, Turkey. Effective ${effectiveDate}.
      </p>
    </div>

    <!-- 4 Corridor Load Port Cards -->
    <div class="corridor-grid">
      <div class="corridor-card">
        <div class="corridor-card-header">${CORRIDOR_MAP.GA.label}</div>
        <div class="corridor-card-title">${CORRIDOR_MAP.GA.port} corridor</div>
        <div class="corridor-card-price">${formatCurrency(CORRIDOR_MAP.GA.defaultOcean)}</div>
        <div class="corridor-card-caption">Ocean + ${destinationLabel} clearance</div>
        <div class="corridor-card-origins">Typical origin: AL, FL, GA, KY, MS, NC, SC, TN</div>
      </div>
      <div class="corridor-card">
        <div class="corridor-card-header">${CORRIDOR_MAP.NJ.label}</div>
        <div class="corridor-card-title">${CORRIDOR_MAP.NJ.port} corridor</div>
        <div class="corridor-card-price">${formatCurrency(CORRIDOR_MAP.NJ.defaultOcean)}</div>
        <div class="corridor-card-caption">Ocean + ${destinationLabel} clearance</div>
        <div class="corridor-card-origins">Typical origin: CT, DE, IL, IN, MA, MD, MI, NJ, NY, OH, PA</div>
      </div>
      <div class="corridor-card">
        <div class="corridor-card-header">${CORRIDOR_MAP.TX.label}</div>
        <div class="corridor-card-title">${CORRIDOR_MAP.TX.port} corridor</div>
        <div class="corridor-card-price">${formatCurrency(CORRIDOR_MAP.TX.defaultOcean)}</div>
        <div class="corridor-card-caption">Ocean + ${destinationLabel} clearance</div>
        <div class="corridor-card-origins">Typical origin: AR, CO, KS, LA, MO, NM, OK, TX</div>
      </div>
      <div class="corridor-card">
        <div class="corridor-card-header">${CORRIDOR_MAP.CA.label}</div>
        <div class="corridor-card-title">${CORRIDOR_MAP.CA.port} corridor</div>
        <div class="corridor-card-price">${formatCurrency(CORRIDOR_MAP.CA.defaultOcean)}</div>
        <div class="corridor-card-caption">Ocean + ${destinationLabel} clearance</div>
        <div class="corridor-card-origins">Typical origin: AZ, CA, HI, ID, MT, NV, OR, UT, WA, WY</div>
      </div>
    </div>

    <!-- Key Stats Metrics Row (Solid Black Bar matching PDF) -->
    <div class="stats-bar">
      <div class="stat-item">
        <div class="stat-value">${auctionRates.length > 0 ? auctionRates.length : (stateEntries.length || 307)}</div>
        <div class="stat-label">PRICED YARDS</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${uniqueStates.length > 0 ? uniqueStates.length : (stateEntries.length || 49)}</div>
        <div class="stat-label">US STATES</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${formatCurrency(lowestSedan)}</div>
        <div class="stat-label">LOWEST SEDAN</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${formatCurrency(highestSedan)}</div>
        <div class="stat-label">HIGHEST SEDAN</div>
      </div>
    </div>

    <!-- How to Read a Line -->
    <div class="guide-section-title">HOW TO READ A LINE</div>
    <div class="steps-grid">
      <div class="step-box">
        <div class="step-num">01</div>
        <div class="step-title">Yard</div>
        <div class="step-desc">Branch and city are the auction or pickup point.</div>
      </div>
      <div class="step-box">
        <div class="step-num">02</div>
        <div class="step-title">Load port</div>
        <div class="step-desc">GA, NJ, TX or CA — this sets the ocean + clearance.</div>
      </div>
      <div class="step-box">
        <div class="step-num">03</div>
        <div class="step-title">Towing</div>
        <div class="step-desc">Inland from that yard to the load port.</div>
      </div>
      <div class="step-box">
        <div class="step-num">04</div>
        <div class="step-title">Total sedan</div>
        <div class="step-desc">Towing + ocean + ${destinationLabel} clearance. SUV add $100.</div>
      </div>
    </div>

    <!-- Included / Not Included -->
    <div class="policy-section">
      <div class="policy-block">
        <div class="policy-block-title">INCLUDED IN THE PRINTED TOTAL</div>
        <ul class="policy-list">
          <li>Origin towing from the named main-branch yard to the load port</li>
          <li>Ocean freight on the nominated corridor</li>
          <li>${destinationLabel} arrival clearance as packaged in the source tariff</li>
        </ul>
      </div>
      <div class="policy-block">
        <div class="policy-block-title">NOT IN THE PRINTED TOTAL</div>
        <ul class="policy-list">
          <li>SUV +$100 · pickup / extra-large SUV / full-size truck +$50–$100</li>
          <li>Sublot, off-site, Manheim and ADESA extras · destination demurrage</li>
          <li>Afghanistan inland beyond ${destinationLabel} (Islam Qala and provinces) — quoted on the file</li>
          <li>Marine insurance, non-running handling, enclosed inland, storage after free time</li>
        </ul>
      </div>
    </div>

    <div class="doc-footer">
      <span class="doc-footer-brand">Transparency  ·  Precision  ·  Reliability</span>
      <span class="doc-footer-center">USA → ${destinationLabel}  ·  Effective ${effectiveDate}</span>
      <span>1</span>
    </div>
  </div>

  <!-- PAGE 2: COMMERCIAL RULES -->
  <div class="doc-page page-break">
    <div class="top-bar-black"></div>
    <div class="top-bar-gold"></div>

    <div class="doc-header">
      <div>
        <img src="${activeLogo}" alt="${companyName}" class="doc-logo" />
      </div>
      <div class="doc-header-right">
        <div class="doc-header-right-title">PRICE LIST</div>
        <div class="doc-header-right-sub">${tariffYear} · RULES</div>
      </div>
    </div>

    <h2 class="rules-title">Commercial rules</h2>

    <div class="rules-grid">
      <div class="rule-card">
        <div class="rule-card-title">Vehicle class</div>
        <div class="rule-card-text">
          Printed totals are sedan. Add USD 100 for an SUV. Add USD 50–100 for pickup trucks, extra-large SUVs and full-size trucks. Confirm cube and running condition before booking.
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-card-title">Yard scope</div>
        <div class="rule-card-text">
          Rates apply to the main auction branch named in the table. Sublots and off-site yards are extra, priced on distance from that branch. Storage on sublot or off-site units is not included.
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-card-title">Other auctions</div>
        <div class="rule-card-text">
          Manheim and ADESA files carry additional handling. Alaska is not in this book — confirm availability before a pickup request. Hawaii yards are listed and should still be reconfirmed before dispatch.
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-card-title">Destination risk</div>
        <div class="rule-card-text">
          If equipment stays at ${destinationLabel} because of congestion or events beyond reasonable control, demurrage and related charges sit with the customer. Force majeure extras are not absorbed.
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-card-title">Beyond ${destinationLabel}</div>
        <div class="rule-card-text">
          This book prices USA yard → ${destinationLabel}. Onward movement to Islam Qala and Afghan provinces is a separate inland quotation.
        </div>
      </div>

      <div class="rule-card">
        <div class="rule-card-title">Validity</div>
        <div class="rule-card-text">
          Figures are the ${effectiveDate} schedule. Ocean, bunker, equipment and inland move. A dated JACXI quotation is the instrument that locks a named vehicle.
        </div>
      </div>
    </div>

    <div class="doc-footer">
      <span class="doc-footer-brand">Transparency  ·  Precision  ·  Reliability</span>
      <span class="doc-footer-center">USA → ${destinationLabel}  ·  Effective ${effectiveDate}</span>
      <span>2</span>
    </div>
  </div>

  <!-- PAGE 3 ONWARDS: YARD RATES (SEDAN + SUV) -->
  <div class="doc-page">
    <div class="top-bar-black"></div>
    <div class="top-bar-gold"></div>

    <div class="doc-header">
      <div>
        <img src="${activeLogo}" alt="${companyName}" class="doc-logo" />
      </div>
      <div class="doc-header-right">
        <div class="doc-header-right-title">PRICE LIST</div>
        <div class="doc-header-right-sub">YARD RATES · SEDAN + SUV</div>
      </div>
    </div>

    ${
      filterInfo?.selectedState || filterInfo?.searchQuery
        ? `<div class="filter-notice-banner">
            Filtered view: ${
              [
                filterInfo.selectedState ? `State: ${filterInfo.selectedState}` : '',
                filterInfo.searchQuery ? `Search: "${filterInfo.searchQuery}"` : '',
              ]
                .filter(Boolean)
                .join(' • ')
            }
          </div>`
        : ''
    }

    <div class="rates-table-container">
      <table class="rates-table">
        <thead>
          <tr>
            <th style="width: 38px;">STATE</th>
            <th>BRANCH / AUCTION</th>
            <th>CITY / YARD</th>
            <th style="width: 35px; text-align: center;">PORT</th>
            <th class="num-col" style="width: 65px;">TOWING</th>
            <th class="num-col" style="width: 110px;">OCEAN + CLEARANCE</th>
            <th class="num-col" style="width: 85px;">SEDAN TOTAL</th>
            <th class="num-col" style="width: 85px;">SUV TOTAL</th>
          </tr>
        </thead>
        <tbody>
          ${
            sortedStateCodes.length > 0
              ? sortedStateCodes
                  .map((stateCode) => {
                    const rows = ratesByState.get(stateCode) || [];
                    const stateObj = US_STATES.find((s) => s.code.toUpperCase() === stateCode.toUpperCase());
                    const stateName = stateObj?.name.toUpperCase() || stateCode;
                    const yardCount = rows.length;

                    const stateBanner = `
          <tr class="state-banner-row">
            <td colspan="8">
              <div class="state-banner-content">
                <span><strong>${stateCode}</strong> &nbsp; ${stateName}</span>
                <span class="state-yard-badge">${yardCount} YARD${yardCount > 1 ? 'S' : ''}</span>
              </div>
            </td>
          </tr>`;

                    const rowHtml = rows
                      .map((row) => {
                        const corridor = resolveCorridor(row.stateCode, row.loadingPoint);
                        const oceanClearance = corridor.defaultOcean;
                        let towing = row.total > oceanClearance ? row.total - oceanClearance : row.total;
                        let sedanTotal = row.total > oceanClearance ? row.total : row.total + oceanClearance;
                        let suvTotal = sedanTotal + 100;

                        return `
          <tr>
            <td style="font-weight: 750;">${row.stateCode}</td>
            <td style="font-weight: 600;">${row.branch || '-'}</td>
            <td>${row.city || '-'}${row.loadingPoint ? ` <span style="color:#6b7280; font-size:7px;">(${row.loadingPoint})</span>` : ''}</td>
            <td style="text-align: center; font-weight: 700; color: #5c5c5c;">${corridor.port}</td>
            <td class="num-col">${formatCurrency(towing)}</td>
            <td class="num-col">${formatCurrency(oceanClearance)}</td>
            <td class="num-col sedan-total">${formatCurrency(sedanTotal)}</td>
            <td class="num-col suv-total">${formatCurrency(suvTotal)}</td>
          </tr>`;
                      })
                      .join('');

                    return stateBanner + rowHtml;
                  })
                  .join('')
              : `<tr><td colspan="8" style="text-align: center; padding: 30px; color: #6b7280;">No auction rate rows available.</td></tr>`
          }
        </tbody>
      </table>
    </div>

    ${
      stateEntries.length > 0
        ? `
      <div class="guide-section-title" style="margin-top: 18px;">STATE FLAT RATES (${stateEntries.length} STATES)</div>
      <div class="state-flat-grid">
        ${stateEntries
          .map(([code, rate]) => {
            const stateObj = US_STATES.find((s) => s.code.toUpperCase() === code.toUpperCase());
            return `
          <div class="state-flat-card">
            <span><strong>${code}</strong> &nbsp; ${stateObj?.name || ''}</span>
            <strong>${formatCurrency(rate)}</strong>
          </div>`;
          })
          .join('')}
      </div>`
        : ''
    }

    <div class="doc-footer">
      <span class="doc-footer-brand">Transparency  ·  Precision  ·  Reliability</span>
      <span class="doc-footer-center">USA → ${destinationLabel}  ·  Effective ${effectiveDate}</span>
      <span>${companyName} Official Rate Schedule</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;
}

export function openPrintDocument(html: string): void {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank', 'width=1020,height=850,scrollbars=yes,resizable=yes');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    return;
  }

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  iframe.contentDocument?.open();
  iframe.contentDocument?.write(html);
  iframe.contentDocument?.close();
  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 60000);
  }, 400);
}

export function generateTransitPriceListPrintHtml(options: PrintTransitPriceListOptions): string {
  const companyName = options.companyName || 'JACXI SHIPPING';
  const companyType = options.companyType || 'Shipping Carrier';
  const priceListName = options.priceListName || 'Overland Transit Tariff';
  const origin = options.origin || 'Mersin Port, Turkey';
  const destination = options.destination || 'Islam Qala, Herat (Afghanistan)';
  const destinationLabel = options.destinationLabel || 'Islam Qala, Herat';
  const effectiveFrom = options.effectiveFrom || options.effectiveDate || '1 October 2026';
  const effectiveTo = options.effectiveTo || '15 October 2026';
  const rates = options.rates || { sedan: 2300, suv: 2400 };
  const carrierInfo = options.carrierInfo || undefined;
  const terms = options.terms && options.terms.length > 0 ? options.terms : [
    'Rates include complete port customs clearance, transit declarations, and bonded overland transportation from port to Islam Qala border terminal.',
    'Unforeseen Circumstances: Additional expenses from port congestion, force majeure, natural disasters, or state border closures beyond carrier control are billed at cost.',
    'Rate Validity: Rates apply based on the vehicle departure/shipping date from origin port (Mersin, Turkey or Jebel Ali, UAE).',
    'Standard Carrier Terms: All cargo is transported under standard international road freight transit terms and carrier insurance coverage.',
  ];

  const activeLogo = options.logoUrl || (typeof window !== 'undefined' ? (() => {
    try {
      const cached = localStorage.getItem('jacxi_site_branding_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.logoUrl) return parsed.logoUrl;
      }
    } catch {
      // Ignore
    }
    return JACXI_LOGO_BASE64;
  })() : JACXI_LOGO_BASE64);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${companyName} - Overland Transit Tariff (${origin} to ${destination})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background: #f0f2f5;
      padding: 0;
      margin: 0;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      color: #ffffff;
      padding: 12px 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.18);
    }
    .toolbar-title {
      font-weight: 700;
      font-size: 14px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .toolbar-actions { display: flex; gap: 10px; align-items: center; }
    .toolbar-btn {
      background: #d4af37;
      color: #111827;
      border: none;
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      transition: background 0.15s ease;
    }
    .toolbar-btn:hover { background: #c59b27; }
    .toolbar-btn-secondary {
      background: rgba(255, 255, 255, 0.15);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }
    .toolbar-btn-secondary:hover { background: rgba(255, 255, 255, 0.25); }
    .doc-page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      padding: 38pt 34pt 32pt 34pt;
      background: #ffffff;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      box-sizing: border-box;
      overflow: hidden;
    }
    .top-bar-black {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 18px;
      background: #000000;
    }
    .top-bar-gold {
      position: absolute;
      top: 18px;
      left: 0;
      right: 0;
      height: 3.5px;
      background: #d4af37;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #d4af37;
      padding-bottom: 12px;
      margin-bottom: 20px;
    }
    .doc-logo { height: 38px; object-fit: contain; }
    .doc-header-right { text-align: right; }
    .doc-header-right-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #000000;
    }
    .doc-header-right-sub {
      font-size: 8.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #c59b27;
      margin-top: 2px;
    }
    .corridor-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #ffffff;
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 18px;
      border-left: 4px solid #d4af37;
      position: relative;
    }
    .corridor-badge {
      display: inline-block;
      background: rgba(212, 175, 55, 0.2);
      color: #d4af37;
      border: 1px solid rgba(212, 175, 55, 0.4);
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .corridor-route-flow {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #ffffff;
      margin-bottom: 6px;
      flex-wrap: wrap;
    }
    .route-arrow {
      color: #d4af37;
      font-size: 18px;
      font-weight: 900;
    }
    .corridor-desc {
      font-size: 9px;
      color: #cbd5e1;
      line-height: 1.5;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .meta-card {
      border: 1px solid #e2e8f0;
      border-top: 2.5px solid #d4af37;
      background: #f8fafc;
      border-radius: 4px;
      padding: 10px 12px;
    }
    .meta-card-label {
      font-size: 7.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #64748b;
    }
    .meta-card-val {
      font-size: 10.5px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .section-title {
      font-size: 11px;
      font-weight: 850;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #0f172a;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 5px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .rates-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 20px;
    }
    .rate-card {
      border: 1.5px solid #e2e8f0;
      border-radius: 6px;
      padding: 18px 20px;
      background: #ffffff;
      position: relative;
    }
    .rate-card-highlight {
      border: 1.5px solid #d4af37;
      background: #fffdf7;
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.08);
    }
    .rate-card-pill {
      display: inline-block;
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 3px 8px;
      border-radius: 3px;
      margin-bottom: 8px;
    }
    .rate-card-pill-std {
      background: #f1f5f9;
      color: #475569;
    }
    .rate-card-pill-gold {
      background: rgba(212, 175, 55, 0.15);
      color: #996515;
      border: 1px solid rgba(212, 175, 55, 0.35);
    }
    .rate-card-title {
      font-size: 14px;
      font-weight: 850;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .rate-card-price {
      font-size: 32px;
      font-weight: 900;
      color: #0f172a;
      margin: 8px 0 4px 0;
      line-height: 1;
      letter-spacing: -0.02em;
    }
    .rate-card-price-gold {
      color: #c59b27;
    }
    .rate-card-sub {
      font-size: 8px;
      font-weight: 600;
      color: #64748b;
      margin-bottom: 12px;
    }
    .rate-features {
      list-style: none;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      margin-top: 10px;
    }
    .rate-features li {
      font-size: 8.5px;
      color: #334155;
      padding: 3px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .check-icon {
      color: #059669;
      font-weight: 900;
      font-size: 10px;
    }
    .service-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 20px;
    }
    .service-card {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 12px;
      background: #ffffff;
    }
    .service-card-title {
      font-size: 9px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .service-card-text {
      font-size: 8px;
      color: #64748b;
      line-height: 1.45;
    }
    .terms-box {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 4px;
      padding: 12px 16px;
      margin-bottom: 18px;
    }
    .terms-list {
      list-style: none;
    }
    .terms-list li {
      font-size: 8px;
      color: #475569;
      padding: 3px 0;
      display: flex;
      align-items: flex-start;
      gap: 6px;
      line-height: 1.45;
    }
    .terms-bullet {
      color: #d4af37;
      font-weight: 900;
      font-size: 10px;
      line-height: 1;
      margin-top: 2px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 14px;
      margin-bottom: 18px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
    }
    .signature-card {
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 10px 12px;
      background: #ffffff;
    }
    .signature-card-title {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #475569;
      margin-bottom: 22px;
    }
    .signature-line {
      border-bottom: 1px solid #0f172a;
      margin-bottom: 4px;
    }
    .signature-caption {
      font-size: 7.5px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
    }
    .doc-footer {
      border-top: 1px solid #d4af37;
      padding-top: 10px;
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8px;
      color: #64748b;
    }
    @media print {
      .toolbar { display: none !important; }
      body { background: #ffffff !important; }
      .doc-page {
        box-shadow: none !important;
        margin: 0 !important;
        width: 100% !important;
        min-height: auto !important;
        padding: 24pt 20pt 16pt 20pt !important;
      }
      @page {
        size: A4 portrait;
        margin: 8mm 10mm;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div class="toolbar-title">
      <span style="color: #d4af37; font-size: 16px;">🚚</span>
      Jacxi Shipping — Overland Transit Tariff (${origin} ➔ ${destination})
    </div>
    <div class="toolbar-actions">
      <button class="toolbar-btn" onclick="window.print()">Print Tariff Document</button>
      <button class="toolbar-btn toolbar-btn-secondary" onclick="window.close()">Close Preview</button>
    </div>
  </div>

  <div class="doc-page">
    <div class="top-bar-black"></div>
    <div class="top-bar-gold"></div>

    <div class="doc-header">
      <img src="${activeLogo}" alt="Jacxi Shipping" class="doc-logo" />
      <div class="doc-header-right">
        <div class="doc-header-right-title">JACXI FREIGHT NETWORK · OVERLAND TRANSIT LOGISTICS</div>
        <div class="doc-header-right-sub">OFFICIAL FREIGHT TARIFF · SECOND LEG ROUTE</div>
      </div>
    </div>

    <div class="corridor-banner">
      <div class="corridor-badge">OVERLAND TRANSIT CORRIDOR · SECOND LEG</div>
      <div class="corridor-route-flow">
        <span>⚓ ${origin}</span>
        <span class="route-arrow">➔</span>
        <span>🏁 ${destination}</span>
      </div>
      <div class="corridor-desc">
        Bonded overland transit service connecting Mediterranean/Gulf ports directly to Afghanistan's western customs terminal. All port handling, documentation, and port export/transit customs clearance are included in the published rates.
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card">
        <div class="meta-card-label">Shipping Carrier</div>
        <div class="meta-card-val">${carrierInfo?.name || companyName}${carrierInfo?.brand ? ` (${carrierInfo.brand})` : ''}</div>
      </div>
      <div class="meta-card">
        <div class="meta-card-label">Tariff Route</div>
        <div class="meta-card-val">${origin.split(',')[0]} ➔ ${destinationLabel}</div>
      </div>
      <div class="meta-card">
        <div class="meta-card-label">Validity Period</div>
        <div class="meta-card-val">${effectiveFrom} – ${effectiveTo}</div>
      </div>
      <div class="meta-card">
        <div class="meta-card-label">Customs Clearance</div>
        <div class="meta-card-val" style="color: #047857;">✓ Included & Guaranteed</div>
      </div>
    </div>

    <div class="section-title">
      <span>Published Overland Vehicle Rates</span>
      <span style="font-size: 8px; font-weight: 700; color: #047857; text-transform: none;">Port Customs Clearance & Transportation Included</span>
    </div>

    <div class="rates-container">
      <!-- Sedan Rate Card -->
      <div class="rate-card">
        <div class="rate-card-pill rate-card-pill-std">Standard Passenger Vehicle</div>
        <div class="rate-card-title">SEDAN / SALOON CAR</div>
        <div class="rate-card-price">${formatCurrency(rates.sedan)}</div>
        <div class="rate-card-sub">USD All-Inclusive per vehicle • Port to Islam Qala Border</div>
        <ul class="rate-features">
          <li><span class="check-icon">✓</span> Mersin / UAE port terminal reception & handling</li>
          <li><span class="check-icon">✓</span> Full export transit customs clearance included</li>
          <li><span class="check-icon">✓</span> Transport via multi-car carrier / sealed container</li>
          <li><span class="check-icon">✓</span> Handover at Islam Qala Customs Compound, Herat</li>
        </ul>
      </div>

      <!-- SUV Rate Card -->
      <div class="rate-card rate-card-highlight">
        <div class="rate-card-pill rate-card-pill-gold">Heavy & Large Vehicle</div>
        <div class="rate-card-title">SUV / 4X4 / PICKUP TRUCK</div>
        <div class="rate-card-price rate-card-price-gold">${formatCurrency(rates.suv)}</div>
        <div class="rate-card-sub">USD All-Inclusive per vehicle • Port to Islam Qala Border</div>
        <ul class="rate-features">
          <li><span class="check-icon">✓</span> Mersin / UAE port terminal reception & handling</li>
          <li><span class="check-icon">✓</span> Full export transit customs clearance included</li>
          <li><span class="check-icon">✓</span> Heavy-duty carrier dispatch with 4WD securing</li>
          <li><span class="check-icon">✓</span> Handover at Islam Qala Customs Compound, Herat</li>
        </ul>
      </div>
    </div>

    <div class="section-title">
      <span>Operational Guarantees & Handover Protocol</span>
    </div>

    <div class="service-grid">
      <div class="service-card">
        <div class="service-card-title">🛡️ Customs Clearance Included</div>
        <div class="service-card-text">Port terminal exit fees, bonded road transit declarations, and port customs clearance are finalized prior to border convoy dispatch.</div>
      </div>
      <div class="service-card">
        <div class="service-card-title">🚛 Dedicated Auto Carriers</div>
        <div class="service-card-text">Specialized multi-car transporters and sealed shipping containers ensure complete vehicle protection and GPS convoy monitoring.</div>
      </div>
      <div class="service-card">
        <div class="service-card-title">📍 Islam Qala Border Handover</div>
        <div class="service-card-text">Vehicles received at Islam Qala Customs Yard with official vehicle condition inspection certificates and waybills.</div>
      </div>
    </div>

    <div class="section-title">
      <span>Carrier Terms, Policy & Conditions</span>
    </div>

    <div class="terms-box">
      <ul class="terms-list">
        ${terms.map((t) => `<li><span class="terms-bullet">◆</span><span>${t}</span></li>`).join('')}
      </ul>
    </div>

    <div class="signature-grid">
      <div class="signature-card">
        <div class="signature-card-title">Authorized Dispatch & Logistics Carrier</div>
        <div class="signature-line"></div>
        <div class="signature-caption">
          <span>Carrier Signature & Stamp</span>
          <span>Date</span>
        </div>
      </div>
      <div class="signature-card">
        <div class="signature-card-title">Jacxi Shipping Freight Verification</div>
        <div class="signature-line"></div>
        <div class="signature-caption">
          <span>Document Ref: ${priceListName.replace(/[^a-zA-Z0-9-]/g, '_').slice(0, 24)}</span>
          <span>Verified Rate Schedule</span>
        </div>
      </div>
    </div>

    <div class="doc-footer">
      <span>Jacxi Shipping Network · Precision Freight Services</span>
      <span>${origin} ➔ ${destination}</span>
      <span>${companyName} Official Schedule</span>
    </div>
  </div>

  <script>
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;
}

export function printTransitPriceList(options: PrintTransitPriceListOptions): void {
  if (typeof window === 'undefined') return;
  const html = generateTransitPriceListPrintHtml(options);
  openPrintDocument(html);
}

export function printCompanyPriceList(options: PrintCompanyPriceListOptions | any): void {
  if (typeof window === 'undefined') return;

  // Auto-route to transit print if options represent a transit price list
  if (
    options.legType === 'transit' ||
    options.corridorLeg === 'TRANSIT' ||
    (!options.auctionRates?.length && options.rates?.sedan)
  ) {
    printTransitPriceList(options as PrintTransitPriceListOptions);
    return;
  }

  const html = generatePriceListPrintHtml(options);
  openPrintDocument(html);
}
