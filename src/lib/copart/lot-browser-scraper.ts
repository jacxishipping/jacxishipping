import { chromium, type Browser } from '@playwright/test';
import type { CopartLotRawPayload, CopartLotVehicleData } from './lot-scraper';

const COPART_LOT_URL = 'https://www.copart.com/lot';

let browserInstance: Browser | null = null;
let browserCloseTimeout: NodeJS.Timeout | null = null;

function normalizeValue(value: string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function capitalizeWords(text: string): string {
  return text
    .split(/\s+/)
    .map((w) => (w.length > 0 ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

function parseYesNo(value: string | null | undefined): boolean | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase().trim();
  if (upper === 'Y' || upper === 'YES' || upper === 'TRUE') return true;
  if (upper === 'N' || upper === 'NO' || upper === 'FALSE') return false;
  return undefined;
}

function inferVehicleType(bodyStyle?: string, vehicleTypeDescription?: string): string | undefined {
  const source = `${bodyStyle || ''} ${vehicleTypeDescription || ''}`.toLowerCase();
  if (source.includes('motorcycle') || source.includes('bike')) return 'motorcycle';
  if (source.includes('pickup') || source.includes('truck')) return 'truck';
  if (source.includes('suv') || source.includes('utility') || source.includes('4runner')) return 'suv';
  if (source.includes('van') || source.includes('cargo van')) return 'van';
  if (source.includes('coupe')) return 'coupe';
  if (source.includes('convertible') || source.includes('cabriolet')) return 'convertible';
  if (source.includes('wagon')) return 'wagon';
  if (source.includes('sedan') || source.includes('automobile') || source.includes('prius')) return 'sedan';
  return undefined;
}

function buildLocation(raw: CopartLotRawPayload): string | undefined {
  const detailedLocation = [raw.locCity, raw.locState, raw.locCountry]
    .map((value) => normalizeValue(value))
    .filter(Boolean)
    .join(', ');

  return detailedLocation || normalizeValue(raw.yn);
}

function buildInternalNotes(raw: CopartLotRawPayload): string | undefined {
  const details = [
    normalizeValue(raw.dd) ? `Damage: ${normalizeValue(raw.dd)}` : undefined,
    normalizeValue(raw.bstl) ? `Body style: ${normalizeValue(raw.bstl)}` : undefined,
    normalizeValue(raw.tmtp) ? `Transmission: ${normalizeValue(raw.tmtp)}` : undefined,
    normalizeValue(raw.egn) ? `Engine: ${normalizeValue(raw.egn)}` : undefined,
    normalizeValue(raw.cy) ? `Cylinders: ${normalizeValue(raw.cy)}` : undefined,
    normalizeValue(raw.dynamicLotDetails?.saleStatus)
      ? `Sale status: ${normalizeValue(raw.dynamicLotDetails?.saleStatus)}`
      : undefined,
    normalizeValue(raw.yn) ? `Yard: ${normalizeValue(raw.yn)}` : undefined,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' | ') : undefined;
}

export function parseCopartUrlSlug(
  url: string,
  lotNumber: string,
  copartUrl: string,
): CopartLotVehicleData | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts[parts.length - 1];

    if (!slug || slug === lotNumber) {
      return null;
    }

    // Pattern examples:
    // clean-title-2010-toyota-4runner-limited-co-denver-central
    // 2018-toyota-prius-in-indianapolis
    // 2011-toyota-4runner-sr5-tx-longview
    // salvage-title-2022-honda-civic-sport-fl-orlando-north
    const titleMatch = slug.match(/^(clean-title|salvage-title|non-repairable)-/i);
    let titleStatus: boolean | undefined = undefined;
    let remaining = slug;

    if (titleMatch) {
      titleStatus = titleMatch[1].toLowerCase() === 'clean-title';
      remaining = remaining.substring(titleMatch[0].length);
    }

    const yearMatch = remaining.match(/^(\d{4})-(.+)$/);
    if (!yearMatch) return null;

    const vehicleYear = yearMatch[1];
    const rest = yearMatch[2];

    let make = '';
    let model = '';
    let location = '';

    const inMatch = rest.match(/^([a-z0-9]+)-(.+?)-in-(.+)$/i);
    const stateMatch = rest.match(/^([a-z0-9]+)-(.+?)-([a-z]{2})-(.+)$/i);

    if (inMatch) {
      make = inMatch[1].toUpperCase();
      model = capitalizeWords(inMatch[2].replace(/-/g, ' '));
      location = capitalizeWords(inMatch[3].replace(/-/g, ' '));
    } else if (stateMatch) {
      make = stateMatch[1].toUpperCase();
      model = capitalizeWords(stateMatch[2].replace(/-/g, ' '));
      const state = stateMatch[3].toUpperCase();
      const city = capitalizeWords(stateMatch[4].replace(/-/g, ' '));
      location = `${city}, ${state}`;
    } else {
      const tokens = rest.split('-');
      if (tokens.length >= 2) {
        make = tokens[0].toUpperCase();
        model = capitalizeWords(tokens.slice(1).join(' '));
      }
    }

    if (!make && !model) return null;

    return {
      lotNumber,
      auctionName: 'Copart',
      vehicleMake: make || undefined,
      vehicleModel: model || undefined,
      vehicleYear,
      hasTitle: titleStatus,
      purchaseLocation: location || undefined,
      vehicleType: inferVehicleType(undefined, model),
      copartUrl,
      source: 'copart-native-browser' as any,
      extracted: {
        yardName: location || undefined,
      },
    };
  } catch {
    return null;
  }
}

export function normalizeRawSolrPayload(
  raw: CopartLotRawPayload,
  normalizedLotNumber: string,
  copartUrl: string,
  source: CopartLotVehicleData['source'] = 'copart-native-browser' as any,
): CopartLotVehicleData {
  return {
    lotNumber: normalizeValue(raw.lotNumberStr) || normalizedLotNumber,
    auctionName: normalizeValue(raw.brand) || 'Copart',
    vehicleMake: normalizeValue(raw.mkn),
    vehicleModel: normalizeValue(raw.lm) || normalizeValue(raw.lmg),
    vehicleYear: raw.lcy ? String(raw.lcy) : undefined,
    vehicleVIN: normalizeValue(raw.fv),
    vehicleColor: normalizeValue(raw.clr),
    vehicleType: inferVehicleType(normalizeValue(raw.bstl), normalizeValue(raw.vehTypDesc)),
    hasKey: parseYesNo(raw.hk),
    hasTitle: parseYesNo(raw.htsmn),
    purchaseLocation: buildLocation(raw),
    internalNotes: buildInternalNotes(raw),
    vehiclePhotos: raw.tims ? [raw.tims.replace('_thb.jpg', '_ful.jpg'), raw.tims] : undefined,
    copartUrl,
    source,
    extracted: {
      bodyStyle: normalizeValue(raw.bstl),
      damage: normalizeValue(raw.dd),
      transmission: normalizeValue(raw.tmtp),
      engine: normalizeValue(raw.egn),
      cylinders: normalizeValue(raw.cy),
      saleStatus: normalizeValue(raw.dynamicLotDetails?.saleStatus),
      yardName: normalizeValue(raw.yn),
    },
  };
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
  // Keep browser warm for 60 seconds of inactivity before closing
  browserCloseTimeout = setTimeout(async () => {
    if (browserInstance) {
      try {
        await browserInstance.close();
      } catch {}
      browserInstance = null;
    }
  }, 60000);
}

export async function fetchCopartLotWithNativeBrowser(lotNumber: string): Promise<CopartLotVehicleData> {
  const normalizedLotNumber = normalizeValue(lotNumber);
  if (!normalizedLotNumber || !/^\d{5,12}$/.test(normalizedLotNumber)) {
    throw new Error('Copart lot numbers must be numeric.');
  }

  const copartUrl = `${COPART_LOT_URL}/${normalizedLotNumber}`;
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
    let redirectedUrl: string | null = null;
    let interceptedSolrPayload: CopartLotRawPayload | null = null;

    page.on('response', async (response) => {
      try {
        const url = response.url();
        if (url.includes('/lot/') && !url.endsWith(`/${normalizedLotNumber}`) && url !== copartUrl) {
          redirectedUrl = url;
        }

        const loc = response.headers()['location'];
        if (loc && loc.includes('/lot/')) {
          redirectedUrl = loc.startsWith('http') ? loc : `https://www.copart.com${loc}`;
        }

        if (url.includes('/solr/') || url.includes('/lotdetails/')) {
          const text = await response.text();
          if (text && text.includes('lotNumberStr')) {
            const parsed = JSON.parse(text);
            if (parsed && typeof parsed === 'object') {
              interceptedSolrPayload = (parsed.data?.lotDetails || parsed.data || parsed) as CopartLotRawPayload;
            }
          }
        }
      } catch {}
    });

    try {
      await page.goto(copartUrl, {
        waitUntil: 'commit',
        timeout: 15000,
      });
    } catch {}

    // Wait for redirect / dom to settle
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(1000);

    // Vector 1: Intercepted Solr Network Payload
    const intercepted = interceptedSolrPayload as CopartLotRawPayload | null;
    if (intercepted && (intercepted.mkn || intercepted.lotNumberStr)) {
      return normalizeRawSolrPayload(intercepted, normalizedLotNumber, copartUrl, 'copart-native-browser' as any);
    }

    // Vector 2: Embedded JSON in HTML
    try {
      const html = await page.content();
      const match = html.match(/cachedSolrLotDetailsStr:\s*"((?:\\.|[^"\\])*)"/);
      if (match?.[1]) {
        const rawJsonString = JSON.parse(`"${match[1]}"`) as string;
        const rawPayload = JSON.parse(rawJsonString) as CopartLotRawPayload;
        if (rawPayload && (rawPayload.mkn || rawPayload.lotNumberStr)) {
          return normalizeRawSolrPayload(rawPayload, normalizedLotNumber, copartUrl, 'copart-native-browser' as any);
        }
      }
    } catch {}

    // Vector 3: Window State Evaluation
    try {
      const windowState = await page.evaluate(() => {
        // @ts-ignore
        return window.lotDetails || window.cachedSolrLotDetails || null;
      });
      if (windowState && typeof windowState === 'object') {
        return normalizeRawSolrPayload(windowState as CopartLotRawPayload, normalizedLotNumber, copartUrl, 'copart-native-browser' as any);
      }
    } catch {}

    // Vector 4: URL Slug from Redirect or Current Page URL
    const candidates = [redirectedUrl, page.url()].filter(Boolean) as string[];
    for (const cand of candidates) {
      const parsedSlug = parseCopartUrlSlug(cand, normalizedLotNumber, copartUrl);
      if (parsedSlug && (parsedSlug.vehicleMake || parsedSlug.vehicleModel)) {
        return parsedSlug;
      }
    }

    throw new Error('Copart lot details could not be found.');
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    scheduleBrowserIdleClose();
  }
}
