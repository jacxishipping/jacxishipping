type CopartDynamicLotDetails = {
  saleStatus?: string;
};

import { fetchLotHtml, hasLotFetchProxy } from '@/lib/lot-fetch-proxy';
import { fetchCopartLotWithNativeBrowser } from '@/lib/copart/lot-browser-scraper';

type OxylabsCopartParsedContent = {
  vin?: string;
  color?: string;
  notes?: string;
  title?: string;
  has_key?: boolean;
  odometer?: string;
  cylinders?: number | string;
  sale_date?: string;
  body_style?: string;
  drivetrain?: string;
  highlights?: string;
  lot_number?: string;
  engine_type?: string;
  transmission?: boolean | string;
  vehicle_type?: string;
  primary_damage?: string;
  estimated_retail_value?: number;
  images?: string[];
  photos?: string[];
  vehicle_images?: string[];
};

type OxylabsCopartResult = {
  content?: OxylabsCopartParsedContent;
  url?: string;
  status_code?: number;
};

type OxylabsCopartJobPayload = {
  id?: string;
  status?: string;
  results?: OxylabsCopartResult[];
};

export type CopartLotRawPayload = {
  lotNumberStr?: string;
  lcy?: number;
  mkn?: string;
  lm?: string;
  lmg?: string;
  fv?: string;
  clr?: string;
  dd?: string;
  bstl?: string;
  vehTypDesc?: string;
  tmtp?: string;
  egn?: string;
  cy?: string;
  yn?: string;
  locCity?: string;
  locState?: string;
  locCountry?: string;
  hk?: string;
  htsmn?: string;
  brand?: string;
  tims?: string;
  dynamicLotDetails?: CopartDynamicLotDetails;
};

export type CopartLotVehicleData = {
  lotNumber: string;
  auctionName: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleVIN?: string;
  vehicleColor?: string;
  vehicleType?: string;
  hasKey?: boolean;
  hasTitle?: boolean;
  purchaseDate?: string;
  purchaseLocation?: string;
  internalNotes?: string;
  vehiclePhotos?: string[];
  copartUrl: string;
  source: 'copart-native-browser' | 'copart-public-page' | 'copart-oxylabs-data-api';
  extracted: {
    bodyStyle?: string;
    damage?: string;
    odometer?: string;
    transmission?: string;
    engine?: string;
    cylinders?: string;
    saleStatus?: string;
    yardName?: string;
  };
};

const COPART_LOT_URL = 'https://www.copart.com/lot';
const OXYLABS_DATA_API_URL = 'https://data.oxylabs.io/v1/queries';
const OXYLABS_COPART_POLL_ATTEMPTS = 20;
const OXYLABS_COPART_POLL_INTERVAL_MS = 2000;

function getOxylabsDataApiUsername() {
  return normalizeValue(process.env.OXYLABS_DATA_API_USERNAME);
}

function getOxylabsDataApiPassword() {
  return normalizeValue(process.env.OXYLABS_DATA_API_PASSWORD);
}

function getOxylabsCopartParserPreset() {
  return normalizeValue(process.env.OXYLABS_COPART_PARSER_PRESET) || 'shkrcopart';
}

function hasOxylabsCopartProvider() {
  return Boolean(getOxylabsDataApiUsername() && getOxylabsDataApiPassword());
}

export function getCopartDataProviderDebugInfo() {
  return {
    engine: 'copart-native-browser',
    hasNativeEngine: true,
    hasOxylabsDataApi: hasOxylabsCopartProvider(),
    oxylabsParserPreset: getOxylabsCopartParserPreset(),
    hasLotFetchProxy: hasLotFetchProxy(),
  };
}

function looksBlockedByCopart(html: string) {
  return /_Incapsula_Resource|Request unsuccessful\. Incapsula|captcha|pardon our interruption|access denied/i.test(html);
}

function buildCopartBlockedMessage(viaProxy: boolean) {
  if (viaProxy) {
    return 'Copart blocked the public lot fetch even through the configured LOT_FETCH_PROXY_URL. Datacenter proxies can still be blocked by Incapsula; use a residential or unblocker-grade proxy/provider in Vercel, or enter the Copart details manually.';
  }

  return 'Copart blocked the public lot fetch from this server. Configure LOT_FETCH_PROXY_URL in Vercel, or enter the Copart details manually.';
}

function buildCopartStatusMessage(status: number, viaProxy: boolean) {
  if ([403, 429].includes(status) || status >= 500) {
    return buildCopartBlockedMessage(viaProxy);
  }

  return `Copart returned status ${status}.`;
}

function buildOxylabsCopartErrorMessage(message: string) {
  return `Oxylabs Copart data API failed. ${message}`;
}

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function parseYesNo(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  if (value === 'Y' || value === 'YES') {
    return true;
  }

  if (value === 'N' || value === 'NO') {
    return false;
  }

  return undefined;
}

function inferVehicleType(bodyStyle?: string, vehicleTypeDescription?: string) {
  const source = `${bodyStyle || ''} ${vehicleTypeDescription || ''}`.toLowerCase();

  if (source.includes('motorcycle') || source.includes('bike')) return 'motorcycle';
  if (source.includes('pickup') || source.includes('truck')) return 'truck';
  if (source.includes('suv') || source.includes('utility')) return 'suv';
  if (source.includes('van') || source.includes('cargo van')) return 'van';
  if (source.includes('coupe')) return 'coupe';
  if (source.includes('convertible') || source.includes('cabriolet')) return 'convertible';
  if (source.includes('wagon')) return 'wagon';
  if (source.includes('sedan')) return 'sedan';
  if (source.includes('automobile')) return 'sedan';
  return undefined;
}

function buildLocation(raw: CopartLotRawPayload) {
  const detailedLocation = [raw.locCity, raw.locState, raw.locCountry]
    .map((value) => normalizeValue(value))
    .filter(Boolean)
    .join(', ');

  return detailedLocation || normalizeValue(raw.yn);
}

function buildInternalNotes(raw: CopartLotRawPayload) {
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

function buildOxylabsLocation(notes?: string) {
  const normalized = normalizeValue(notes);
  if (!normalized) return undefined;
  if (/no notes for this lot|n\/a|none|no notes/i.test(normalized)) return undefined;

  return normalizeValue(normalized.replace(/^located in\s+/i, '')) || normalized;
}

function parseCopartSaleDateToPurchaseDate(value?: string) {
  const normalized = normalizeValue(value);
  if (!normalized) return undefined;

  const monthMatch = normalized.match(/\b(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\b\.?\s+(\d{1,2}),\s*(\d{4})/i);
  if (!monthMatch) return undefined;

  const rawMonth = monthMatch[1].toLowerCase();
  const day = monthMatch[2].padStart(2, '0');
  const year = monthMatch[3];
  const months: Record<string, string> = {
    jan: '01',
    january: '01',
    feb: '02',
    february: '02',
    mar: '03',
    march: '03',
    apr: '04',
    april: '04',
    may: '05',
    jun: '06',
    june: '06',
    jul: '07',
    july: '07',
    aug: '08',
    august: '08',
    sep: '09',
    sept: '09',
    september: '09',
    oct: '10',
    october: '10',
    nov: '11',
    november: '11',
    dec: '12',
    december: '12',
  };

  const month = months[rawMonth];
  if (!month) return undefined;

  return `${year}-${month}-${day}`;
}

function buildOxylabsInternalNotes(content: OxylabsCopartParsedContent) {
  const details = [
    normalizeValue(content.primary_damage) ? `Damage: ${normalizeValue(content.primary_damage)}` : undefined,
    normalizeValue(content.body_style) ? `Body style: ${normalizeValue(content.body_style)}` : undefined,
    normalizeValue(content.engine_type) ? `Engine: ${normalizeValue(content.engine_type)}` : undefined,
    normalizeValue(content.cylinders) ? `Cylinders: ${normalizeValue(content.cylinders)}` : undefined,
    normalizeValue(content.odometer) ? `Odometer: ${normalizeValue(content.odometer)}` : undefined,
    normalizeValue(content.drivetrain) ? `Drivetrain: ${normalizeValue(content.drivetrain)}` : undefined,
    normalizeValue(content.highlights) ? `Highlights: ${normalizeValue(content.highlights)}` : undefined,
    normalizeValue(content.sale_date) ? `Sale date: ${normalizeValue(content.sale_date)}` : undefined,
    typeof content.estimated_retail_value === 'number'
      ? `Estimated retail value: $${content.estimated_retail_value.toLocaleString()}`
      : undefined,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' | ') : undefined;
}

function parseOxylabsTitle(title?: string) {
  const normalized = normalizeValue(title);
  if (!normalized) {
    return {
      vehicleYear: undefined,
      vehicleMake: undefined,
      vehicleModel: undefined,
    };
  }

  const match = normalized.match(/\b(19\d{2}|20\d{2})\b\s+([^\s]+)\s+(.+)/);
  if (!match) {
    return {
      vehicleYear: undefined,
      vehicleMake: undefined,
      vehicleModel: normalized,
    };
  }

  return {
    vehicleYear: normalizeValue(match[1]),
    vehicleMake: normalizeValue(match[2]),
    vehicleModel: normalizeValue(match[3]),
  };
}

export function parseCopartSlug(slug: string) {
  if (!slug) return {};
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const tokens = cleanSlug.split('-').filter(Boolean);

  const yearIdx = tokens.findIndex((t) => /^(19\d{2}|20\d{2})$/.test(t));
  if (yearIdx === -1) return {};

  const year = tokens[yearIdx];
  const prefixTokens = tokens.slice(0, yearIdx);
  const remainingTokens = tokens.slice(yearIdx + 1);

  let make: string | undefined;
  let modelTokens: string[] = [];
  let state: string | undefined;
  let cityTokens: string[] = [];

  if (remainingTokens.length > 0) {
    make = remainingTokens[0].charAt(0).toUpperCase() + remainingTokens[0].slice(1);
    const afterMake = remainingTokens.slice(1);

    const stateIdx = afterMake.findIndex((t) => /^[a-z]{2}$/.test(t));
    if (stateIdx !== -1) {
      modelTokens = afterMake.slice(0, stateIdx);
      state = afterMake[stateIdx].toUpperCase();
      cityTokens = afterMake.slice(stateIdx + 1);
    } else {
      modelTokens = afterMake;
    }
  }

  const model = modelTokens
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' ');

  const city = cityTokens
    .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    .join(' ');

  const purchaseLocation = state && city ? `${city}, ${state}` : state || city || undefined;
  const docType = prefixTokens.length > 0 ? prefixTokens.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' ') : undefined;

  return {
    year,
    make,
    model: model || undefined,
    purchaseLocation,
    docType,
  };
}

function normalizeOxylabsCopartResult(
  lotNumber: string,
  fallbackUrl: string,
  result: OxylabsCopartResult,
  raw?: CopartLotRawPayload,
  galleryPhotos?: string[],
): CopartLotVehicleData {
  const content = result.content || {};
  const titleParts = parseOxylabsTitle(content.title);
  const resultUrl = normalizeValue(result.url) || fallbackUrl;
  
  // Extract slug metadata from redirected Copart URL if title parts are missing
  const slugMatch = resultUrl.match(/copart\.com\/lot\/\d+\/([a-zA-Z0-9_-]+)/i);
  const slugMeta = slugMatch ? parseCopartSlug(slugMatch[1]) : {};

  const vehicleYear = (raw?.lcy ? String(raw.lcy) : undefined) || titleParts.vehicleYear || slugMeta.year;
  const vehicleMake = normalizeValue(raw?.mkn) || titleParts.vehicleMake || slugMeta.make;
  const vehicleModel = normalizeValue(raw?.lm) || normalizeValue(raw?.lmg) || titleParts.vehicleModel || slugMeta.model;
  const purchaseLocation = buildLocation(raw || {}) || buildOxylabsLocation(content.notes) || slugMeta.purchaseLocation;
  const purchaseDate = parseCopartSaleDateToPurchaseDate(content.sale_date);

  const notesParts = [
    buildOxylabsInternalNotes(content),
    raw ? buildInternalNotes(raw) : undefined,
    slugMeta.docType ? `Doc type: ${slugMeta.docType}` : undefined,
  ].filter(Boolean);

  const rawPhotos = content.images || content.photos || content.vehicle_images;
  let vehiclePhotos = Array.isArray(galleryPhotos) && galleryPhotos.length > 0
    ? galleryPhotos
    : (Array.isArray(rawPhotos) && rawPhotos.length > 0
      ? rawPhotos.filter((p): p is string => typeof p === 'string' && p.startsWith('http'))
      : undefined);

  if (!vehiclePhotos && raw?.tims) {
    vehiclePhotos = [raw.tims.replace('_thb.jpg', '_ful.jpg'), raw.tims];
  }

  const hasKey = typeof content.has_key === 'boolean'
    ? content.has_key
    : parseYesNo(raw?.hk);

  const hasTitle = typeof raw?.htsmn === 'string'
    ? parseYesNo(raw.htsmn)
    : (slugMeta.docType ? !slugMeta.docType.toLowerCase().includes('bill of sale') : undefined);

  return {
    lotNumber: normalizeValue(content.lot_number) || normalizeValue(raw?.lotNumberStr) || lotNumber,
    auctionName: 'Copart',
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleVIN: normalizeValue(content.vin) || normalizeValue(raw?.fv),
    vehicleColor: normalizeValue(content.color) || normalizeValue(raw?.clr),
    vehicleType: inferVehicleType(normalizeValue(content.body_style) || normalizeValue(raw?.bstl), normalizeValue(content.vehicle_type) || normalizeValue(raw?.vehTypDesc)),
    hasKey,
    hasTitle,
    purchaseDate,
    purchaseLocation,
    internalNotes: notesParts.length > 0 ? Array.from(new Set(notesParts)).join(' | ') : undefined,
    vehiclePhotos,
    copartUrl: resultUrl,
    source: 'copart-oxylabs-data-api',
    extracted: {
      bodyStyle: normalizeValue(content.body_style) || normalizeValue(raw?.bstl),
      damage: normalizeValue(content.primary_damage) || normalizeValue(raw?.dd) || slugMeta.docType,
      odometer: normalizeValue(content.odometer),
      transmission: typeof content.transmission === 'string' ? normalizeValue(content.transmission) : normalizeValue(raw?.tmtp),
      engine: normalizeValue(content.engine_type) || normalizeValue(raw?.egn),
      cylinders: normalizeValue(content.cylinders) || normalizeValue(raw?.cy),
      saleStatus: normalizeValue(raw?.dynamicLotDetails?.saleStatus),
      yardName: purchaseLocation,
    },
  };
}

async function fetchOxylabsJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as T;
  return { response, payload };
}

async function waitForOxylabsCopartJob(jobId: string, authHeader: string) {
  for (let attempt = 0; attempt < OXYLABS_COPART_POLL_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, OXYLABS_COPART_POLL_INTERVAL_MS));
    }

    const { response, payload } = await fetchOxylabsJson<OxylabsCopartJobPayload>(
      `${OXYLABS_DATA_API_URL}/${jobId}`,
      {
        headers: {
          Authorization: authHeader,
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new Error(buildOxylabsCopartErrorMessage(`job polling returned status ${response.status}.`));
    }

    if (payload.status === 'done') {
      return;
    }

    if (payload.status === 'failed') {
      throw new Error(buildOxylabsCopartErrorMessage('job polling reported a failed status.'));
    }
  }

  throw new Error(buildOxylabsCopartErrorMessage('timed out waiting for the job to finish.'));
}

export async function fetchCopartLotVehicleDataFromOxylabs(lotNumber: string, copartUrl: string): Promise<CopartLotVehicleData> {
  const username = getOxylabsDataApiUsername();
  const password = getOxylabsDataApiPassword();
  if (!username || !password) {
    throw new Error(buildOxylabsCopartErrorMessage('OXYLABS_DATA_API_USERNAME or OXYLABS_DATA_API_PASSWORD is missing.'));
  }

  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  
  // Concurrently fetch high-res gallery images from Copart's lotImages API endpoint via Oxylabs
  const imagesPromise = fetchCopartLotImagesFromOxylabs(lotNumber, authHeader);

  const createBody = {
    source: 'universal',
    url: copartUrl,
    user_agent_type: 'desktop_edge',
    geo_location: 'United States',
    render: 'html',
    parse: true,
    parser_preset: getOxylabsCopartParserPreset(),
  };

  const { response: createResponse, payload: createPayload } = await fetchOxylabsJson<OxylabsCopartJobPayload>(
    OXYLABS_DATA_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(createBody),
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      cache: 'no-store',
    },
  );

  const immediateResult = createPayload.results?.[0];
  if (createResponse.ok && immediateResult?.content) {
    const galleryPhotos = await imagesPromise.catch(() => []);
    return normalizeOxylabsCopartResult(lotNumber, copartUrl, immediateResult, undefined, galleryPhotos);
  }

  const jobId = normalizeValue(createPayload.id);
  if (!jobId) {
    throw new Error(buildOxylabsCopartErrorMessage(`job creation returned status ${createResponse.status} without a job id.`));
  }

  await waitForOxylabsCopartJob(jobId, authHeader);

  // Fetch parsed content, raw rendered HTML, and gallery photos in parallel to extract all data points
  const [parsedRes, rawRes, galleryPhotos] = await Promise.all([
    fetchOxylabsJson<OxylabsCopartJobPayload>(
      `${OXYLABS_DATA_API_URL}/${jobId}/results`,
      {
        headers: {
          Authorization: authHeader,
        },
        cache: 'no-store',
      },
    ),
    fetchOxylabsJson<OxylabsCopartJobPayload>(
      `${OXYLABS_DATA_API_URL}/${jobId}/results?type=raw`,
      {
        headers: {
          Authorization: authHeader,
        },
        cache: 'no-store',
      },
    ).catch(() => ({ response: { ok: false } as Response, payload: {} as OxylabsCopartJobPayload })),
    imagesPromise,
  ]);

  const result = parsedRes.payload.results?.[0];
  const rawHtml = rawRes.payload.results?.[0]?.content;
  const rawSolr = typeof rawHtml === 'string' ? tryExtractLotPayload(rawHtml) : undefined;

  if (result || rawSolr) {
    return normalizeOxylabsCopartResult(lotNumber, copartUrl, result || {}, rawSolr, galleryPhotos);
  }

  throw new Error(buildOxylabsCopartErrorMessage(`results endpoint returned status ${parsedRes.response.status} without content.`));
}

interface CopartImagesApiResponse {
  returnCode?: number;
  data?: {
    imagesList?: {
      content?: Array<{
        fullUrl?: string;
        highResUrl?: string;
        thumbnailUrl?: string;
      }>;
    };
  };
}

async function fetchCopartLotImagesFromOxylabs(lotNumber: string, authHeader: string): Promise<string[]> {
  try {
    const { response, payload } = await fetchOxylabsJson<OxylabsCopartJobPayload>(
      OXYLABS_DATA_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({
          source: 'universal',
          url: `https://www.copart.com/public/data/lotdetails/solr/lotImages/${lotNumber}/USA`,
          render: 'html',
        }),
        cache: 'no-store',
      },
    );

    const jobId = normalizeValue(payload.id);
    if (!response.ok || !jobId) return [];

    await waitForOxylabsCopartJob(jobId, authHeader);

    const { payload: rawPayload } = await fetchOxylabsJson<OxylabsCopartJobPayload>(
      `${OXYLABS_DATA_API_URL}/${jobId}/results?type=raw`,
      {
        headers: { Authorization: authHeader },
        cache: 'no-store',
      },
    );

    const contentStr = rawPayload.results?.[0]?.content;
    if (typeof contentStr !== 'string') return [];

    const parsed = JSON.parse(contentStr) as CopartImagesApiResponse;
    const items = parsed.data?.imagesList?.content || [];
    const urls = items
      .map((img) => img.fullUrl || img.highResUrl || img.thumbnailUrl)
      .filter((u): u is string => Boolean(u && u.startsWith('http')));
    return Array.from(new Set(urls));
  } catch {
    return [];
  }
}

function extractLotPayload(html: string) {
  const match = html.match(/cachedSolrLotDetailsStr:\s*"((?:\\.|[^"\\])*)"/);
  if (!match?.[1]) {
    throw new Error('Copart lot payload was not found on the public page.');
  }

  const rawJsonString = JSON.parse(`"${match[1]}"`) as string;
  return JSON.parse(rawJsonString) as CopartLotRawPayload;
}

function tryExtractLotPayload(html: string) {
  try {
    return extractLotPayload(html);
  } catch {
    return undefined;
  }
}

export async function fetchCopartLotVehicleData(lotNumber: string): Promise<CopartLotVehicleData> {
  const normalizedLotNumber = normalizeValue(lotNumber);
  if (!normalizedLotNumber || !/^\d{5,12}$/.test(normalizedLotNumber)) {
    throw new Error('Copart lot numbers must be numeric.');
  }

  const copartUrl = `${COPART_LOT_URL}/${normalizedLotNumber}`;
  let oxylabsError: Error | undefined;

  // 1. Primary Engine when configured: Dedicated Oxylabs Data API
  // Produces rich full specs: unmasked/masked VIN, keys, damage, color, title, engine, cylinders, odometer, retail value
  if (hasOxylabsCopartProvider()) {
    try {
      return await fetchCopartLotVehicleDataFromOxylabs(normalizedLotNumber, copartUrl);
    } catch (error) {
      oxylabsError = error instanceof Error ? error : new Error(String(error));
    }
  }

  // 2. High-Performance Secondary Engine: Stealth Headless Browser
  let nativeEngineError: Error | undefined;
  try {
    return await fetchCopartLotWithNativeBrowser(normalizedLotNumber);
  } catch (error) {
    nativeEngineError = error instanceof Error ? error : new Error(String(error));
  }

  // 3. Direct Fast HTTP / Proxy Fallback
  const requestHeaders = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };

  let page = await (async () => {
    try {
      return await fetchLotHtml(copartUrl, requestHeaders);
    } catch (error) {
      if (!hasLotFetchProxy()) throw error;
      return fetchLotHtml(copartUrl, requestHeaders, true);
    }
  })();

  let raw = tryExtractLotPayload(page.html);

  if (!raw && hasLotFetchProxy() && !page.viaProxy) {
    page = await fetchLotHtml(copartUrl, requestHeaders, true);
    raw = tryExtractLotPayload(page.html);
  }

  if (!raw) {
    if (looksBlockedByCopart(page.html)) {
      throw new Error(buildCopartBlockedMessage(page.viaProxy));
    }

    if (!page.response.ok) {
      throw new Error(buildCopartStatusMessage(page.response.status, page.viaProxy));
    }

    throw new Error('Copart lot payload was not found on the public page. You can use the Smart Paste feature to auto-fill this shipment.');
  }

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
    source: 'copart-public-page',
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