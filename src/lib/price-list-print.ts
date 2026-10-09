import { formatMoney as formatCurrency } from '@/lib/format';
import { US_STATES, type AuctionRateEntry } from '@/lib/shipping-rate-calculator';

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
      background: #ffffff;
      padding: 24px 32px;
      font-size: 11px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Print toolbar */
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f3f4f6;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 12px 18px;
      margin-bottom: 24px;
    }
    .toolbar-title {
      font-weight: 700;
      font-size: 14px;
      color: #1a1a1a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .toolbar-btn {
      background: #b89327;
      color: #ffffff;
      border: none;
      padding: 8px 20px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      margin-left: 8px;
      transition: background 0.15s ease;
    }
    .toolbar-btn:hover {
      background: #9a781b;
    }
    .toolbar-btn-secondary {
      background: #ffffff;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    .toolbar-btn-secondary:hover {
      background: #f9fafb;
    }

    /* Page container */
    .doc-page {
      background: #ffffff;
      margin-bottom: 24px;
      position: relative;
    }

    .page-break {
      page-break-after: always;
      break-after: page;
    }

    /* Running Header */
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1.5px solid #1a1a1a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .doc-header-left {
      display: flex;
      flex-direction: column;
    }
    .doc-header-category {
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #b89327;
    }
    .doc-header-subtitle {
      font-size: 7.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #5c5c5c;
      margin-top: 2px;
    }
    .doc-header-right {
      text-align: right;
    }
    .doc-header-right-title {
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #b89327;
    }
    .doc-header-right-sub {
      font-size: 7.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #5c5c5c;
      margin-top: 2px;
    }

    /* Cover Page Elements */
    .cover-hero {
      margin-top: 8px;
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
      font-size: 10px;
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
      border: 1px solid #e5e7eb;
      background: #fafafa;
      border-radius: 6px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      position: relative;
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
      font-size: 17px;
      font-weight: 850;
      color: #b89327;
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

    /* Stats Bar (4 columns) */
    .stats-bar {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      background: #fdfbf7;
      border: 1px solid #ebdcb8;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 22px;
    }
    .stat-item {
      text-align: center;
    }
    .stat-value {
      font-size: 16px;
      font-weight: 850;
      color: #1a1a1a;
      letter-spacing: -0.01em;
    }
    .stat-label {
      font-size: 7.5px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #8a701c;
      margin-top: 3px;
    }

    /* Section Header */
    .guide-section-title {
      font-size: 8.5px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 10px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
    }

    /* How to Read a Line (4 steps) */
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 22px;
    }
    .step-box {
      border: 1px solid #e5e7eb;
      background: #ffffff;
      border-radius: 6px;
      padding: 10px 12px;
    }
    .step-num {
      font-size: 11px;
      font-weight: 850;
      color: #b89327;
      margin-bottom: 2px;
    }
    .step-title {
      font-size: 9.5px;
      font-weight: 800;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .step-desc {
      font-size: 7.5px;
      color: #5c5c5c;
      line-height: 1.45;
    }

    /* Policy Inclusions / Exclusions */
    .policy-boxes {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }
    .policy-box {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px 14px;
      background: #ffffff;
    }
    .policy-box.included {
      border-left: 3px solid #16a34a;
      background: #fcfdfc;
    }
    .policy-box.excluded {
      border-left: 3px solid #d97706;
      background: #fdfcf9;
    }
    .policy-title {
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .policy-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .policy-list li {
      font-size: 8px;
      color: #4b5563;
      margin-bottom: 5px;
      line-height: 1.45;
      position: relative;
      padding-left: 14px;
    }
    .policy-list li::before {
      content: "•";
      position: absolute;
      left: 0;
      color: #b89327;
      font-weight: bold;
    }

    /* Page 2: Commercial Rules */
    .rules-title {
      font-size: 20px;
      font-weight: 800;
      color: #1a1a1a;
      letter-spacing: -0.01em;
      margin-top: 6px;
      margin-bottom: 18px;
    }
    .rules-grid {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }
    .rule-card {
      border: 1px solid #e5e7eb;
      border-left: 3.5px solid #b89327;
      background: #fafafa;
      border-radius: 6px;
      padding: 12px 16px;
    }
    .rule-card-title {
      font-size: 10px;
      font-weight: 800;
      color: #1a1a1a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
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
      font-weight: 700;
      color: #374151;
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
      background: #f3f4f6;
      border-top: 1.5px solid #1a1a1a;
      border-bottom: 1.5px solid #1a1a1a;
      padding: 6px 8px;
      text-align: left;
      font-weight: 800;
      font-size: 7.5px;
      text-transform: uppercase;
      color: #1a1a1a;
      letter-spacing: 0.05em;
    }
    table.rates-table th.num-col {
      text-align: right;
    }
    table.rates-table tr {
      page-break-inside: avoid;
    }
    table.rates-table tbody tr:nth-child(even) {
      background: #fbfbfb;
    }
    table.rates-table td {
      padding: 5.5px 8px;
      border-bottom: 1px solid #ebebeb;
      color: #262626;
      font-size: 7.8px;
    }
    table.rates-table td.num-col {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-family: inherit;
    }
    table.rates-table td.sedan-total {
      font-weight: 800;
      color: #1a1a1a;
    }
    table.rates-table td.suv-total {
      font-weight: 800;
      color: #926315;
    }

    /* State Banner Row */
    .state-banner-row td {
      background: #f6f1e3 !important;
      border-top: 1px solid #d4af37 !important;
      border-bottom: 1px solid #d4af37 !important;
      padding: 5px 8px !important;
    }
    .state-banner-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8.5px;
      font-weight: 850;
      color: #1a1a1a;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }
    .state-yard-badge {
      font-size: 7.2px;
      font-weight: 800;
      background: rgba(184, 147, 39, 0.15);
      color: #8a701c;
      padding: 1px 7px;
      border-radius: 4px;
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
      background: #fafafa;
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
        background: #ffffff;
      }
      .no-print {
        display: none !important;
      }
      @page {
        size: A4;
        margin: 10mm 12mm 12mm 12mm;
      }
      .doc-page {
        margin-bottom: 0;
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
      <span>📄</span>
      <span>${companyName} — Price List Print Preview (${destinationLabel})</span>
    </div>
    <div>
      <button class="toolbar-btn toolbar-btn-secondary" onclick="window.close()">Close Preview</button>
      <button class="toolbar-btn" onclick="window.print()">Print Document (Ctrl+P)</button>
    </div>
  </div>

  <!-- PAGE 1: COVER / CORRIDOR GUIDE -->
  <div class="doc-page page-break">
    <div class="doc-header">
      <div class="doc-header-left">
        <span class="doc-header-category">PRICE LIST</span>
        <span class="doc-header-subtitle">${tariffYear} · ${destinationLabel.toUpperCase()} TARIFF</span>
      </div>
      <div class="doc-header-right">
        <span class="doc-header-right-title">${companyName}</span>
        <span class="doc-header-right-sub">${companyType.toUpperCase()} RATE SCHEDULE</span>
      </div>
    </div>

    <div class="cover-hero">
      <h1 class="cover-title">Single-car rate schedule</h1>
      <p class="cover-desc">
        Door-to-${destinationLabel} guide rates for a running sedan. Each line is origin towing from the named US auction yard to the load port, plus ocean freight and clearance to ${destinationLabel}. Effective ${effectiveDate}.
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

    <!-- Key Stats Metrics Row -->
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
        <div class="step-desc">Inland from that yard to the nominated load port.</div>
      </div>
      <div class="step-box">
        <div class="step-num">04</div>
        <div class="step-title">Total sedan</div>
        <div class="step-desc">Towing + ocean + ${destinationLabel} clearance. SUV add $100.</div>
      </div>
    </div>

    <!-- Included / Not Included -->
    <div class="policy-boxes">
      <div class="policy-box included">
        <div class="policy-title">INCLUDED IN THE PRINTED TOTAL</div>
        <ul class="policy-list">
          <li>Origin towing from the named main-branch yard to the load port</li>
          <li>Ocean freight on the nominated corridor</li>
          <li>${destinationLabel} arrival clearance as packaged in the source tariff</li>
        </ul>
      </div>
      <div class="policy-box excluded">
        <div class="policy-title">NOT IN THE PRINTED TOTAL</div>
        <ul class="policy-list">
          <li>SUV +$100 · pickup / extra-large SUV / full-size truck +$50–$100</li>
          <li>Sublot, off-site, Manheim and ADESA extras · destination demurrage</li>
          <li>Inland transit beyond ${destinationLabel} (Islam Qala & provinces) — quoted on file</li>
          <li>Marine insurance, non-running handling, enclosed inland, storage after free time</li>
        </ul>
      </div>
    </div>

    <div class="doc-footer">
      <span class="doc-footer-brand">Transparency  ·  Precision  ·  Reliability</span>
      <span>USA → ${destinationLabel}  ·  Effective ${effectiveDate}</span>
      <span>1</span>
    </div>
  </div>

  <!-- PAGE 2: COMMERCIAL RULES -->
  <div class="doc-page page-break">
    <div class="doc-header">
      <div class="doc-header-left">
        <span class="doc-header-category">PRICE LIST</span>
        <span class="doc-header-subtitle">${tariffYear} · RULES</span>
      </div>
      <div class="doc-header-right">
        <span class="doc-header-right-title">${companyName}</span>
        <span class="doc-header-right-sub">COMMERCIAL POLICY</span>
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
          Figures are the ${effectiveDate} schedule. Ocean, bunker, equipment and inland move with the market. A dated ${companyName} quotation is the instrument that locks a named vehicle.
        </div>
      </div>
    </div>

    <div class="doc-footer">
      <span class="doc-footer-brand">Transparency  ·  Precision  ·  Reliability</span>
      <span>USA → ${destinationLabel}  ·  Effective ${effectiveDate}</span>
      <span>2</span>
    </div>
  </div>

  <!-- PAGE 3 ONWARDS: YARD RATES (SEDAN + SUV) -->
  <div class="doc-page">
    <div class="doc-header">
      <div class="doc-header-left">
        <span class="doc-header-category">PRICE LIST</span>
        <span class="doc-header-subtitle">YARD RATES · SEDAN + SUV</span>
      </div>
      <div class="doc-header-right">
        <span class="doc-header-right-title">${companyName}</span>
        <span class="doc-header-right-sub">${destinationLabel.toUpperCase()} TARIFF SCHEDULE</span>
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
            <th style="width: 32px;">STATE</th>
            <th>BRANCH / AUCTION</th>
            <th>CITY / YARD</th>
            <th style="width: 40px; text-align: center;">PORT</th>
            <th class="num-col" style="width: 65px;">TOWING</th>
            <th class="num-col" style="width: 95px;">OCEAN + CLEARANCE</th>
            <th class="num-col" style="width: 80px;">SEDAN TOTAL</th>
            <th class="num-col" style="width: 80px;">SUV TOTAL</th>
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
      <span>USA → ${destinationLabel}  ·  Effective ${effectiveDate}</span>
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

export function printCompanyPriceList(options: PrintCompanyPriceListOptions): void {
  if (typeof window === 'undefined') return;

  const html = generatePriceListPrintHtml(options);

  // Attempt window.open first
  const printWindow = window.open('', '_blank', 'width=1020,height=850,scrollbars=yes,resizable=yes');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    return;
  }

  // Fallback: use an invisible iframe if popups are blocked
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
