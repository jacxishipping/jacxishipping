import { decodeVIN, VINDecoderResult } from '@/lib/services/vin-decoder';

export interface ParsedAuctionData {
  lotNumber?: string;
  auctionName?: 'Copart' | 'IAAI' | 'Manheim' | 'Impact' | 'Other';
  vehicleYear?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleVIN?: string;
  vehicleColor?: string;
  vehicleType?: string;
  hasKey?: boolean;
  hasTitle?: boolean;
  purchaseDate?: string;
  purchaseLocation?: string;
  purchasePrice?: number;
  odometer?: string;
  primaryDamage?: string;
  secondaryDamage?: string;
  bodyStyle?: string;
  engine?: string;
  transmission?: string;
  drivetrain?: string;
  internalNotes?: string;
  copartUrl?: string;
  iaaiUrl?: string;
  source: 'url' | 'page-text' | 'vin' | 'invoice';
}

function normalizeValue(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function parseYesNo(val: string | undefined): boolean | undefined {
  if (!val) return undefined;
  const upper = val.toUpperCase().trim();
  if (upper === 'YES' || upper === 'Y' || upper === 'TRUE' || upper === '1') return true;
  if (upper === 'NO' || upper === 'N' || upper === 'FALSE' || upper === '0') return false;
  return undefined;
}

function inferVehicleType(bodyStyle?: string, vehicleTypeDesc?: string): string | undefined {
  const source = `${bodyStyle || ''} ${vehicleTypeDesc || ''}`.toLowerCase();
  if (source.includes('motorcycle') || source.includes('bike')) return 'motorcycle';
  if (source.includes('pickup') || source.includes('truck')) return 'truck';
  if (source.includes('suv') || source.includes('utility') || source.includes('crossover') || source.includes('4runner')) return 'suv';
  if (source.includes('van') || source.includes('cargo van') || source.includes('minivan')) return 'van';
  if (source.includes('coupe')) return 'coupe';
  if (source.includes('convertible') || source.includes('cabriolet')) return 'convertible';
  if (source.includes('wagon')) return 'wagon';
  if (source.includes('sedan') || source.includes('automobile') || source.includes('saloon')) return 'sedan';
  return undefined;
}

/**
 * Parses Copart or IAAI URL to extract Lot/Stock number, auction name, and vehicle metadata
 */
export function parseAuctionUrl(url: string): Partial<ParsedAuctionData> | null {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;

  // Copart URL: https://www.copart.com/lot/82341234/2021-toyota-camry-tx-dallas
  const copartMatch = trimmed.match(/copart\.com\/lot\/(\d+)(?:\/([a-zA-Z0-9_-]+))?/i);
  if (copartMatch) {
    const lotNumber = copartMatch[1];
    const slug = copartMatch[2] || '';
    const result: Partial<ParsedAuctionData> = {
      lotNumber,
      auctionName: 'Copart',
      copartUrl: `https://www.copart.com/lot/${lotNumber}`,
      source: 'url',
    };

    if (slug) {
      const parts = slug.split('-');
      const yearMatch = parts[0]?.match(/^(19\d{2}|20\d{2})$/);
      if (yearMatch) {
        result.vehicleYear = yearMatch[1];
        if (parts[1]) result.vehicleMake = parts[1].toUpperCase();
        if (parts.length > 2) {
          result.vehicleModel = parts.slice(2).join(' ').toUpperCase();
        }
      }
    }

    return result;
  }

  // IAAI URL: https://www.iaai.com/VehicleDetail/39182312~US
  const iaaiMatch = trimmed.match(/iaai\.com\/VehicleDetail\/([a-zA-Z0-9~_-]+)/i);
  if (iaaiMatch) {
    const stockRaw = iaaiMatch[1];
    const stockNumber = stockRaw.replace(/~US$/i, '');
    return {
      lotNumber: stockNumber,
      auctionName: 'IAAI',
      iaaiUrl: `https://www.iaai.com/VehicleDetail/${stockRaw}`,
      source: 'url',
    };
  }

  return null;
}

/**
 * Robust text parser that extracts vehicle and auction details from copied Copart/IAAI listing text,
 * browser inspector copies, emails, or buyer receipts.
 */
export async function parseAuctionText(text: string): Promise<ParsedAuctionData> {
  const clean = text.trim();
  const result: ParsedAuctionData = {
    source: 'page-text',
  };

  // Check if text is just a URL
  if (/^https?:\/\//i.test(clean) && clean.split(/\s+/).length === 1) {
    const fromUrl = parseAuctionUrl(clean);
    if (fromUrl) {
      Object.assign(result, fromUrl);
    }
  }

  // 1. Detect Auction Type
  if (/copart/i.test(clean)) {
    result.auctionName = 'Copart';
  } else if (/iaai|insurance auto auctions/i.test(clean)) {
    result.auctionName = 'IAAI';
  } else if (/manheim/i.test(clean)) {
    result.auctionName = 'Manheim';
  }

  // 2. Extract Lot Number / Stock Number
  const lotPatterns = [
    /(?:Lot\s*(?:#|Number|No\.|Num)?|Stock\s*(?:#|Number|No\.)?)\s*[:=\s]\s*([0-9]{5,12})/i,
    /\b(?:lot|stock)\s*[:#]?\s*([0-9]{6,10})\b/i,
    /copart\.com\/lot\/([0-9]{5,12})/i,
    /iaai\.com\/VehicleDetail\/([0-9]{5,12})/i,
  ];
  for (const pattern of lotPatterns) {
    const match = clean.match(pattern);
    if (match?.[1]) {
      result.lotNumber = match[1];
      break;
    }
  }

  // 3. Extract 17-digit VIN (handles unmasked or partially masked)
  const vinPatterns = [
    /\bVIN\s*[:=\s]\s*([A-HJ-NPR-Z0-9*]{17})\b/i,
    /\bVIN\s*[:=\s]\s*([A-HJ-NPR-Z0-9]{11,17})\b/i,
    /\b([A-HJ-NPR-Z0-9]{17})\b/,
  ];
  for (const pattern of vinPatterns) {
    const match = clean.match(pattern);
    if (match?.[1]) {
      const candidate = match[1].toUpperCase();
      // Avoid false matches with pure digits if not 17 chars
      if (candidate.length === 17 && !/^\d{17}$/.test(candidate)) {
        result.vehicleVIN = candidate;
        break;
      }
    }
  }

  // 4. Extract Year, Make, Model
  const ymmPatterns = [
    /(?:Description|Vehicle|Title|Vehicle Description)\s*[:=\s]\s*(19\d{2}|20\d{2})\s+([A-Za-z]+)\s+([^\n\r,;|]+)/i,
    /\b(19\d{2}|20\d{2})\s+([A-Za-z]+)\s+([A-Za-z0-9\s_-]+?)(?=\s+(?:VIN|Lot|Damage|Color|Keys|Location|Odometer|\n|\r|$))/i,
    /\b(19\d{2}|20\d{2})\s+([A-Za-z]+)\s+([A-Za-z0-9_-]+)/i,
  ];
  for (const pattern of ymmPatterns) {
    const match = clean.match(pattern);
    if (match?.[1] && match?.[2]) {
      result.vehicleYear = match[1];
      result.vehicleMake = match[2].toUpperCase();
      if (match[3]) {
        result.vehicleModel = match[3].trim().toUpperCase().replace(/\s+(VIN|LOT|STOCK|COLOR|DAMAGE|KEYS).*$/i, '');
      }
      break;
    }
  }

  // 5. Extract Location / Yard / Branch
  const locationPatterns = [
    /(?:Location|Yard|Selling Branch|Branch|Yard Location|Sale Location|Facility)\s*[:=\s]\s*([^\n\r;|]+)/i,
    /(?:Located in|Location)\s*[:=\s]\s*([A-Z]{2}\s*-\s*[A-Za-z\s]+)/i,
  ];
  for (const pattern of locationPatterns) {
    const match = clean.match(pattern);
    if (match?.[1]) {
      const loc = match[1].trim().replace(/\s+(Lane|Item|Grid|Row|Aisle).*$/i, '');
      if (loc && loc.length < 50) {
        result.purchaseLocation = loc;
        break;
      }
    }
  }

  // 6. Extract Primary & Secondary Damage
  const damageMatch = clean.match(/(?:Primary Damage|Damage Description|Damage|Loss Type)\s*[:=\s]\s*([^\n\r;|]+)/i);
  if (damageMatch?.[1]) {
    result.primaryDamage = damageMatch[1].trim();
  }

  const secDamageMatch = clean.match(/(?:Secondary Damage)\s*[:=\s]\s*([^\n\r;|]+)/i);
  if (secDamageMatch?.[1]) {
    result.secondaryDamage = secDamageMatch[1].trim();
  }

  // 7. Extract Keys Status
  const keyMatch = clean.match(/(?:Keys|Key|Has Key|Has Keys)\s*[:=\s]\s*([A-Za-z]+)/i);
  if (keyMatch?.[1]) {
    result.hasKey = parseYesNo(keyMatch[1]);
  }

  // 8. Extract Title Status
  const titleMatch = clean.match(/(?:Title(?:\/Sale Doc)?|Title Status|Title Code|Certificate)\s*[:=\s]\s*([^\n\r;|]+)/i);
  if (titleMatch?.[1]) {
    const titleVal = titleMatch[1].trim();
    result.hasTitle = !/missing|no title|bill of sale only/i.test(titleVal);
  }

  // 9. Extract Color
  const colorMatch = clean.match(/(?:Color|Exterior Color|Vehicle Color)\s*[:=\s]\s*([A-Za-z\s/-]+?)(?=(?:\s+(?:Interior|VIN|Lot|Damage|Keys|Odometer))|[\n\r,;|]|$)/i);
  if (colorMatch?.[1]) {
    const c = colorMatch[1].trim();
    if (c.length >= 3 && c.length < 25) {
      result.vehicleColor = c.toUpperCase();
    }
  }

  // 10. Extract Odometer
  const odoMatch = clean.match(/(?:Odometer|Mileage)\s*[:=\s]\s*([0-9,]+\s*(?:mi|km|miles)?)/i);
  if (odoMatch?.[1]) {
    result.odometer = odoMatch[1].trim();
  }

  // 11. Extract Engine & Transmission
  const engineMatch = clean.match(/(?:Engine|Engine Type|Cylinders)\s*[:=\s]\s*([^\n\r;|]+)/i);
  if (engineMatch?.[1]) {
    result.engine = engineMatch[1].trim();
  }

  const transMatch = clean.match(/(?:Transmission|Transmission Type)\s*[:=\s]\s*([^\n\r;|]+)/i);
  if (transMatch?.[1]) {
    result.transmission = transMatch[1].trim();
  }

  // 12. Extract Purchase Price / Bid / Total
  const priceMatch = clean.match(/(?:Sale Price|Winning Bid|Total Paid|Purchase Price|Price)\s*[:=\s]\s*\$?([0-9,]+(?:\.[0-9]{2})?)/i);
  if (priceMatch?.[1]) {
    const num = parseFloat(priceMatch[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      result.purchasePrice = num;
    }
  }

  // 13. Auto-Enrich with NHTSA if full 17-digit unmasked VIN exists
  if (result.vehicleVIN && result.vehicleVIN.length === 17 && !result.vehicleVIN.includes('*')) {
    try {
      const nhtsa = await decodeVIN(result.vehicleVIN);
      if (nhtsa.make && !result.vehicleMake) result.vehicleMake = nhtsa.make.toUpperCase();
      if (nhtsa.model && !result.vehicleModel) result.vehicleModel = nhtsa.model.toUpperCase();
      if (nhtsa.year && !result.vehicleYear) result.vehicleYear = nhtsa.year;
      if (nhtsa.vehicleType && !result.vehicleType) result.vehicleType = inferVehicleType(nhtsa.bodyClass, nhtsa.vehicleType);
      if (nhtsa.bodyClass && !result.bodyStyle) result.bodyStyle = nhtsa.bodyClass;
    } catch {
      // Ignore NHTSA offline / timeout fallback
    }
  }

  // 14. Infer Vehicle Type
  if (!result.vehicleType) {
    result.vehicleType = inferVehicleType(result.bodyStyle, result.vehicleModel);
  }

  // 15. Build Internal Notes Summary
  const noteParts = [
    result.primaryDamage ? `Damage: ${result.primaryDamage}` : undefined,
    result.secondaryDamage ? `Sec Damage: ${result.secondaryDamage}` : undefined,
    result.odometer ? `Odometer: ${result.odometer}` : undefined,
    result.engine ? `Engine: ${result.engine}` : undefined,
    result.transmission ? `Transmission: ${result.transmission}` : undefined,
    result.purchaseLocation ? `Yard: ${result.purchaseLocation}` : undefined,
  ].filter(Boolean);

  if (noteParts.length > 0) {
    result.internalNotes = noteParts.join(' | ');
  }

  return result;
}
