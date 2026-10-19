/**
 * Price List Corridors and Leg Classification
 * 
 * Supports Jacxi Shipping's dual-pricing architecture:
 * 1. Leg 1 (Ocean Freight / Longest Leg):
 *    - USA Auction Yards -> Mersin, Turkey
 *    - USA Auction Yards -> Jebel Ali, UAE
 * 
 * 2. Leg 2 (Overland Transit / Second Leg):
 *    - Mersin, Turkey -> Islam Qala, Herat (Afghanistan)
 *    - UAE (Dubai / Jebel Ali) -> Islam Qala, Herat (Afghanistan)
 */

export type PriceListLeg = 'OCEAN' | 'TRANSIT';

export type CorridorRouteCode =
  | 'USA_TO_MERSIN'        // Ocean: USA to Mersin, Turkey
  | 'USA_TO_JEBEL_ALI'     // Ocean: USA to Jebel Ali, UAE
  | 'MERSIN_TO_ISLAM_QALA' // Transit: Mersin to Islam Qala, Afghanistan
  | 'UAE_TO_ISLAM_QALA'    // Transit: UAE/Dubai to Islam Qala, Afghanistan
  | 'CUSTOM';

export interface PriceListCorridorMeta {
  leg: PriceListLeg;
  routeCode: CorridorRouteCode;
  origin: string;
  destination: string;
  gateway: 'MERSIN' | 'JEBEL_ALI' | 'DIRECT' | 'OTHER';
  label: string;
  shortLabel: string;
  badgeColor: 'blue' | 'emerald' | 'amber' | 'purple';
  description: string;
}

export interface TransitLegRates {
  sedan: number;
  suv: number;
  pickup?: number;
  motorcycle?: number;
  van?: number;
  currency?: string;
  notes?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  terms?: string[];
}

export const CORRIDOR_DEFINITIONS: Record<CorridorRouteCode, PriceListCorridorMeta> = {
  USA_TO_MERSIN: {
    leg: 'OCEAN',
    routeCode: 'USA_TO_MERSIN',
    origin: 'USA (Auction Yards)',
    destination: 'Mersin, Turkey',
    gateway: 'MERSIN',
    label: 'USA ➔ Mersin, Turkey (Ocean Freight)',
    shortLabel: 'USA ➔ Mersin',
    badgeColor: 'blue',
    description: 'First leg: Towing from US auction yards + ocean container shipping to Mersin Port, Turkey.',
  },
  USA_TO_JEBEL_ALI: {
    leg: 'OCEAN',
    routeCode: 'USA_TO_JEBEL_ALI',
    origin: 'USA (Auction Yards)',
    destination: 'Jebel Ali, UAE',
    gateway: 'JEBEL_ALI',
    label: 'USA ➔ Jebel Ali, UAE (Ocean Freight)',
    shortLabel: 'USA ➔ Jebel Ali',
    badgeColor: 'blue',
    description: 'First leg: Towing from US auction yards + ocean container shipping to Jebel Ali Port, UAE.',
  },
  MERSIN_TO_ISLAM_QALA: {
    leg: 'TRANSIT',
    routeCode: 'MERSIN_TO_ISLAM_QALA',
    origin: 'Mersin, Turkey',
    destination: 'Islam Qala, Herat',
    gateway: 'MERSIN',
    label: 'Mersin, Turkey ➔ Islam Qala, Herat (Overland Transit)',
    shortLabel: 'Mersin ➔ Islam Qala',
    badgeColor: 'emerald',
    description: 'Second leg: Customs clearance at Mersin Port + overland transport to Islam Qala, Herat border.',
  },
  UAE_TO_ISLAM_QALA: {
    leg: 'TRANSIT',
    routeCode: 'UAE_TO_ISLAM_QALA',
    origin: 'Dubai / Jebel Ali, UAE',
    destination: 'Islam Qala, Herat',
    gateway: 'JEBEL_ALI',
    label: 'UAE ➔ Islam Qala, Herat (Overland Transit)',
    shortLabel: 'UAE ➔ Islam Qala',
    badgeColor: 'emerald',
    description: 'Second leg: Clearance at UAE port + overland transport to Islam Qala, Herat border.',
  },
  CUSTOM: {
    leg: 'OCEAN',
    routeCode: 'CUSTOM',
    origin: 'Custom Origin',
    destination: 'Custom Destination',
    gateway: 'OTHER',
    label: 'Custom Route Price List',
    shortLabel: 'Custom Route',
    badgeColor: 'purple',
    description: 'Custom origin and destination rate sheet.',
  },
};

/**
 * Automatically inspects the document text, filename, destination label, and config
 * to detect whether it is an Ocean Freight rate sheet (USA -> Mersin/Jebel Ali)
 * or an Overland Transit rate sheet (Mersin/UAE -> Islam Qala).
 */
export function detectPriceListCorridor(params: {
  text?: string | null;
  fileName?: string | null;
  destinationLabel?: string | null;
  name?: string | null;
  config?: any;
  auctionRateCount?: number;
}): PriceListCorridorMeta {
  const combined = [
    params.text || '',
    params.fileName || '',
    params.destinationLabel || '',
    params.name || '',
    typeof params.config === 'object' && params.config ? JSON.stringify(params.config) : '',
  ].join(' ').toLowerCase();

  const auctionCount = params.auctionRateCount ?? (Array.isArray(params.config?.auctionRates) ? params.config.auctionRates.length : 0);

  // 1. Check for Overland Transit: Mersin -> Islam Qala
  const hasMersin = combined.includes('mersin');
  const hasIslamQala = combined.includes('islam qala') || combined.includes('islamqala');
  const hasUae = combined.includes('jebel ali') || combined.includes('jabel ali') || combined.includes('uae') || combined.includes('dubai');
  const hasUsa = combined.includes('usa') || combined.includes('united states') || combined.includes('auction') || combined.includes('copart') || combined.includes('iaai');
  const hasTransitPricing = combined.includes('seden') || combined.includes('sedan') || combined.includes('suv') || combined.includes('transit');

  // Explicit Transit checks:
  if (hasMersin && hasIslamQala && (hasTransitPricing || auctionCount <= 5 || !hasUsa)) {
    return CORRIDOR_DEFINITIONS.MERSIN_TO_ISLAM_QALA;
  }

  if (hasUae && hasIslamQala && (hasTransitPricing || auctionCount <= 5 || !hasUsa)) {
    return CORRIDOR_DEFINITIONS.UAE_TO_ISLAM_QALA;
  }

  // 2. Check for Ocean Freight: USA -> Mersin
  if (hasMersin && (hasUsa || auctionCount > 10 || combined.includes('single car rates mersin') || combined.includes('mix rate usa to mersin'))) {
    return CORRIDOR_DEFINITIONS.USA_TO_MERSIN;
  }

  // 3. Check for Ocean Freight: USA -> Jebel Ali
  if (hasUae && (hasUsa || auctionCount > 10)) {
    return CORRIDOR_DEFINITIONS.USA_TO_JEBEL_ALI;
  }

  // 4. Fallback based on auction rate count and destination
  if (auctionCount > 10) {
    // Large auction rate sheets are Ocean Freight
    if (hasMersin) {
      return CORRIDOR_DEFINITIONS.USA_TO_MERSIN;
    }
    return CORRIDOR_DEFINITIONS.USA_TO_JEBEL_ALI;
  }

  if (hasIslamQala) {
    if (hasMersin) return CORRIDOR_DEFINITIONS.MERSIN_TO_ISLAM_QALA;
    return CORRIDOR_DEFINITIONS.UAE_TO_ISLAM_QALA;
  }

  return CORRIDOR_DEFINITIONS.CUSTOM;
}

/**
 * Checks if a price list record represents an overland transit rate sheet.
 */
export function isTransitPriceList(list: {
  config?: any;
  destinationLabel?: string | null;
  sourceFileName?: string | null;
  name?: string | null;
  importedAuctionRateCount?: number;
}): boolean {
  if (list.config && typeof list.config === 'object') {
    if (list.config.kind === 'TRANSIT') return true;
    if (list.config.rates?.sedan || list.config.transitRates?.sedan) return true;
  }

  const corridor = detectPriceListCorridor({
    fileName: list.sourceFileName,
    destinationLabel: list.destinationLabel,
    name: list.name,
    config: list.config,
    auctionRateCount: list.importedAuctionRateCount,
  });

  return corridor.leg === 'TRANSIT';
}

/**
 * Extracts overland transit rates (Sedan, SUV) from text if present.
 */
export function parseTransitRatesFromText(text: string): TransitLegRates | null {
  const normalized = text.toLowerCase();
  
  // Look for Sedan / Seden pattern: e.g. "SEDEN $2,300" or "SEDAN: $2300"
  const sedanMatch = normalized.match(/(?:seden|sedan)\s*[:#-]?\s*\$?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);
  // Look for SUV pattern: e.g. "SUV $2,400" or "SUV: $2400"
  const suvMatch = normalized.match(/suv\s*[:#-]?\s*\$?\s*([0-9][0-9,]*(?:\.\d{1,2})?)/i);

  if (!sedanMatch && !suvMatch) return null;

  const sedan = sedanMatch ? Number(sedanMatch[1].replace(/[$,\s]/g, '')) : 2300;
  const suv = suvMatch ? Number(suvMatch[1].replace(/[$,\s]/g, '')) : 2400;

  // Extract terms if present
  const terms: string[] = [];
  if (normalized.includes('customs clearance')) {
    terms.push('Rates include customs clearance and transportation.');
  }
  if (normalized.includes('unforeseen') || normalized.includes('congestion') || normalized.includes('force majeure')) {
    terms.push('Unforeseen circumstances (port congestion, force majeure, etc.) passed to client.');
  }
  if (normalized.includes('validity') || normalized.includes('effective')) {
    terms.push('Rates are applicable based on the date the vehicle is shipped from the departure port.');
  }

  // Extract dates e.g. "October 1st-15th, 2026"
  let effectiveFrom: string | undefined;
  let effectiveTo: string | undefined;
  const dateRangeMatch = text.match(/([a-zA-Z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*[-–]\s*(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})/i);
  if (dateRangeMatch) {
    const month = dateRangeMatch[1];
    const dayStart = dateRangeMatch[2];
    const dayEnd = dateRangeMatch[3];
    const year = dateRangeMatch[4];
    effectiveFrom = `${year}-${month}-${dayStart}`;
    effectiveTo = `${year}-${month}-${dayEnd}`;
  }

  return {
    sedan: Number.isFinite(sedan) && sedan > 0 ? sedan : 2300,
    suv: Number.isFinite(suv) && suv > 0 ? suv : 2400,
    currency: 'USD',
    terms: terms.length > 0 ? terms : undefined,
    effectiveFrom,
    effectiveTo,
  };
}
