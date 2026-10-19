import { chromium, type Browser } from '@playwright/test';
import type { IaaiLotVehicleData } from './lot-scraper';

const IAAI_VEHICLE_URL = 'https://www.iaai.com/VehicleDetail';

let browserInstance: Browser | null = null;
let browserCloseTimeout: NodeJS.Timeout | null = null;

function normalizeValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function parseYesNo(value: unknown): boolean | undefined {
  if (!value) return undefined;
  const upper = String(value).toUpperCase().trim();
  if (upper === 'Y' || upper === 'YES' || upper === 'TRUE' || upper === '1') return true;
  if (upper === 'N' || upper === 'NO' || upper === 'FALSE' || upper === '0') return false;
  return undefined;
}

function inferVehicleType(bodyStyle?: string, vehicleTypeDescription?: string): string | undefined {
  const source = `${bodyStyle || ''} ${vehicleTypeDescription || ''}`.toLowerCase();
  if (source.includes('motorcycle') || source.includes('bike')) return 'motorcycle';
  if (source.includes('pickup') || source.includes('truck')) return 'truck';
  if (source.includes('suv') || source.includes('utility') || source.includes('crossover')) return 'suv';
  if (source.includes('van') || source.includes('cargo van') || source.includes('minivan')) return 'van';
  if (source.includes('coupe')) return 'coupe';
  if (source.includes('convertible') || source.includes('cabriolet')) return 'convertible';
  if (source.includes('wagon')) return 'wagon';
  if (source.includes('sedan') || source.includes('automobile')) return 'sedan';
  return undefined;
}

function buildInternalNotes(extracted: {
  damage?: string;
  odometer?: string;
  bodyStyle?: string;
  branch?: string;
  titleStatus?: string;
  saleStatus?: string;
}): string | undefined {
  const details = [
    extracted.damage ? `Damage: ${extracted.damage}` : undefined,
    extracted.odometer ? `Odometer: ${extracted.odometer}` : undefined,
    extracted.bodyStyle ? `Body style: ${extracted.bodyStyle}` : undefined,
    extracted.titleStatus ? `Title: ${extracted.titleStatus}` : undefined,
    extracted.branch ? `Branch: ${extracted.branch}` : undefined,
    extracted.saleStatus ? `Sale status: ${extracted.saleStatus}` : undefined,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' | ') : undefined;
}

async function getOrLaunchBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.isConnected()) {
    if (browserCloseTimeout) {
      clearTimeout(browserCloseTimeout);
      browserCloseTimeout = null;
    }
    return browserInstance;
  }

  const launchOptions = {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
    ],
  };

  try {
    browserInstance = await chromium.launch(launchOptions);
    return browserInstance;
  } catch {
    try {
      browserInstance = await chromium.launch({ ...launchOptions, channel: 'chrome' });
      return browserInstance;
    } catch {
      try {
        browserInstance = await chromium.launch({ ...launchOptions, channel: 'msedge' });
        return browserInstance;
      } catch {
        throw new Error('Headless browser engine is not available in this environment.');
      }
    }
  }
}

function scheduleBrowserIdleClose() {
  if (browserCloseTimeout) {
    clearTimeout(browserCloseTimeout);
  }
  browserCloseTimeout = setTimeout(async () => {
    if (browserInstance) {
      try {
        await browserInstance.close();
      } catch {}
      browserInstance = null;
    }
  }, 60000);
}

export async function fetchIaaiLotWithNativeBrowser(stockNumber: string): Promise<IaaiLotVehicleData> {
  const normalizedStockNumber = normalizeValue(stockNumber);
  if (!normalizedStockNumber || !/^\d{5,12}$/.test(normalizedStockNumber)) {
    throw new Error('IAAI stock numbers must be numeric.');
  }

  const iaaiUrl = `${IAAI_VEHICLE_URL}/${normalizedStockNumber}`;
  const browser = await getOrLaunchBrowser();

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/New_York',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // @ts-ignore
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  const page = await context.newPage();

  try {
    let interceptedJson: Record<string, any> | null = null;

    page.on('response', async (res) => {
      try {
        const url = res.url();
        if (url.includes('vehicledetail') || url.includes('vehicleinfo') || url.includes('getvehicledetails')) {
          const text = await res.text();
          if (text && (text.includes('vin') || text.includes('make') || text.includes('model'))) {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object') {
              interceptedJson = parsed;
            }
          }
        }
      } catch {}
    });

    try {
      await page.goto(iaaiUrl, {
        waitUntil: 'commit',
        timeout: 15000,
      });
    } catch {}

    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(1500);

    const html = await page.content().catch(() => '');

    // Vector 1: Schema.org JSON-LD extraction
    const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
    if (jsonLdMatch) {
      for (const tag of jsonLdMatch) {
        try {
          const content = tag.replace(/<script[^>]*>|<\/script>/gi, '').trim();
          const parsed = JSON.parse(content);
          const vehicle = Array.isArray(parsed) ? parsed.find((p) => p['@type'] === 'Vehicle' || p['@type'] === 'Car' || p['@type'] === 'Product') : parsed;

          if (vehicle && (vehicle.name || vehicle.model || vehicle.vehicleIdentificationNumber)) {
            const nameParts = (vehicle.name || '').match(/\b(19\d{2}|20\d{2})\b\s+([^\s]+)\s+(.+)/);
            const year = nameParts ? nameParts[1] : normalizeValue(vehicle.productionDate);
            const make = nameParts ? nameParts[2] : normalizeValue(vehicle.brand?.name || vehicle.manufacturer);
            const model = nameParts ? nameParts[3] : normalizeValue(vehicle.model);

            const extracted = {
              bodyStyle: normalizeValue(vehicle.bodyType),
              damage: normalizeValue(vehicle.itemCondition),
              branch: normalizeValue(vehicle.offers?.seller?.name),
            };

            return {
              lotNumber: normalizedStockNumber,
              auctionName: 'IAAI',
              vehicleMake: make,
              vehicleModel: model,
              vehicleYear: year,
              vehicleVIN: normalizeValue(vehicle.vehicleIdentificationNumber || vehicle.vin),
              vehicleColor: normalizeValue(vehicle.color),
              vehicleType: inferVehicleType(extracted.bodyStyle, model),
              purchaseLocation: extracted.branch,
              internalNotes: buildInternalNotes(extracted),
              iaaiUrl,
              source: 'iaai-public-page',
              extracted,
            };
          }
        } catch {}
      }
    }

    // Vector 2: Page Title & Meta Tags
    const title = await page.title().catch(() => '');
    const titleMatch = title.match(/\b(19\d{2}|20\d{2})\b\s+([^\s]+)\s+([^-|]+)/i);
    if (titleMatch) {
      const year = titleMatch[1];
      const make = titleMatch[2].toUpperCase();
      const model = titleMatch[3].trim();

      // Check VIN in HTML
      const vinMatch = html.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
      const vin = vinMatch ? vinMatch[1].toUpperCase() : undefined;

      // Check Branch in HTML
      const branchMatch = html.match(/Branch:\s*<[^>]+>([^<]+)<\//i) || html.match(/data-branch="([^"]+)"/i);
      const branch = branchMatch ? branchMatch[1].trim() : undefined;

      const extracted = {
        branch,
      };

      return {
        lotNumber: normalizedStockNumber,
        auctionName: 'IAAI',
        vehicleMake: make,
        vehicleModel: model,
        vehicleYear: year,
        vehicleVIN: vin,
        vehicleType: inferVehicleType(undefined, model),
        purchaseLocation: branch,
        internalNotes: buildInternalNotes(extracted),
        iaaiUrl,
        source: 'iaai-public-page',
        extracted,
      };
    }

    throw new Error('IAAI stock details could not be found on the page.');
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    scheduleBrowserIdleClose();
  }
}
