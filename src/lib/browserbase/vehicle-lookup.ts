import '@/lib/env-bootstrap';
import { z } from 'zod/v4';

export const VehicleSpecsSchema = z.object({
  vehicleYear: z.string().describe('The 4-digit model year of the vehicle (e.g., "2021")'),
  vehicleMake: z.string().describe('The vehicle manufacturer or make (e.g., "TOYOTA")'),
  vehicleModel: z.string().describe('The vehicle model name (e.g., "4Runner" or "Camry")'),
  trim: z.string().nullable().describe('The trim or series level if shown, or null'),
  bodyStyle: z.string().nullable().describe('The body class or style (e.g., "Sport Utility Vehicle (SUV)/Multi-Purpose Vehicle (MPV)"), or null'),
  vehicleType: z.string().nullable().describe('The NHTSA vehicle type classification (e.g., "MULTIPURPOSE PASSENGER VEHICLE (MPV)"), or null'),
  driveType: z.string().nullable().describe('The drive type or drivetrain (e.g., "4WD/4-Wheel Drive/4x4"), or null'),
  engineCylinders: z.string().nullable().describe('Engine number of cylinders (e.g., "6"), or null'),
  engineDisplacement: z.string().nullable().describe('Engine displacement in liters (e.g., "4.0"), or null'),
  fuelType: z.string().nullable().describe('Primary fuel type (e.g., "Gasoline"), or null'),
  plantLocation: z.string().nullable().describe('Manufacturing plant city/country (e.g., "TAHARA, JAPAN"), or null'),
});

export type BrowserbaseVehicleLookupResult = {
  vehicleVIN: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleType?: string;
  extracted: {
    trim?: string;
    bodyStyle?: string;
    driveType?: string;
    engine?: string;
    cylinders?: string;
    fuelType?: string;
    plantLocation?: string;
  };
  source: 'browserbase-stagehand-nhtsa';
  sessionId: string;
  sessionUrl: string;
  cacheStatus: {
    fillVin?: string;
    decodeClick?: string;
    extractSpecs?: string;
  };
};

export type BrowserbaseVehicleLookupOptions = {
  vin: string;
  apiKey?: string;
  onStep?: (stepMessage: string) => void;
};

const NHTSA_DECODER_URL = 'https://vpic.nhtsa.dot.gov/decoder/';

/**
 * Looks up and extracts structured vehicle details by VIN using a cloud Chrome
 * browser on Browserbase driven by Stagehand v4 (`act`, `observe`, `extract`).
 */
export async function lookupVehicleWithBrowserbase(
  options: BrowserbaseVehicleLookupOptions,
): Promise<BrowserbaseVehicleLookupResult> {
  const vin = options.vin.trim().toUpperCase();
  if (!vin) {
    throw new Error('A valid VIN is required for vehicle lookup.');
  }

  const apiKey = options.apiKey || process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing BROWSERBASE_API_KEY environment variable.');
  }

  const log = options.onStep ?? ((msg: string) => console.log(`[Browserbase] ${msg}`));
  const { browserbase, Stagehand } = await import('@browserbasehq/stagehand');

  log('Launching cloud Chrome session on Browserbase...');
  const browser = await browserbase.launch({ apiKey });
  const sessionId = browser.sessionId ?? 'unknown';
  const sessionUrl = `https://www.browserbase.com/sessions/${sessionId}`;

  log(`Session started! Live View & Replay: ${sessionUrl}`);

  try {
    const stagehand = await Stagehand.create({
      browser,
      cache: true,
    });

    try {
      const [page] = await browser.context.pages();
      if (!page) {
        throw new Error('Stagehand initialized without an active browser page.');
      }

      // Lock viewport and block analytics noise for deterministic server-side caching
      await page.setViewportSize(1280, 720);
      await browser.context.setDomainPolicy({
        blockedDomains: ['*.google-analytics.com', '*.doubleclick.net', '*.googletagmanager.com'],
      });

      log(`Navigating to NHTSA VIN Decoder (${NHTSA_DECODER_URL})...`);
      await page.goto(NHTSA_DECODER_URL, { waitUntil: 'domcontentloaded' });

      // Wait for the VIN input field to be attached in the DOM before acting
      await page.waitForSelector('input[type="text"], #VIN', { state: 'visible', timeout: 15000 });

      log(`Entering VIN (${vin}) using Stagehand act() with parameterized variables...`);
      const fillResult = await stagehand.act('type %vin% into the Enter VIN input field', {
        variables: { vin },
      });

      log('Observing the Decode VIN submit button with Stagehand observe()...');
      const observed = await stagehand.observe('click the Decode VIN button');
      const [decodeAction] = observed.data;

      log('Clicking the Decode VIN button...');
      const clickResult = decodeAction
        ? await stagehand.act(decodeAction)
        : await stagehand.act('click the Decode VIN button');

      await page.waitForLoadState('domcontentloaded', 15000);

      log('Extracting structured vehicle specifications with Stagehand extract()...');
      const { data, metadata: extractMeta } = await stagehand.extract(
        'extract the decoded vehicle year, make, model, trim, body style, vehicle type, drive type, engine cylinders, engine displacement, fuel type, and plant location from the decoded VIN results on the page',
        VehicleSpecsSchema,
      );

      const engineSummary = [
        data.engineDisplacement ? `${data.engineDisplacement}L` : undefined,
        data.engineCylinders ? `${data.engineCylinders}-Cyl` : undefined,
        data.fuelType,
      ]
        .filter(Boolean)
        .join(' ');

      return {
        vehicleVIN: vin,
        vehicleYear: data.vehicleYear,
        vehicleMake: data.vehicleMake,
        vehicleModel: data.vehicleModel,
        vehicleType: data.vehicleType ?? undefined,
        extracted: {
          trim: data.trim ?? undefined,
          bodyStyle: data.bodyStyle ?? undefined,
          driveType: data.driveType ?? undefined,
          engine: engineSummary || undefined,
          cylinders: data.engineCylinders ?? undefined,
          fuelType: data.fuelType ?? undefined,
          plantLocation: data.plantLocation ?? undefined,
        },
        source: 'browserbase-stagehand-nhtsa',
        sessionId,
        sessionUrl,
        cacheStatus: {
          fillVin: fillResult.metadata.cache.status,
          decodeClick: clickResult.metadata.cache.status,
          extractSpecs: extractMeta.cache.status,
        },
      };
    } finally {
      await stagehand.close();
    }
  } finally {
    await browser.close();
  }
}
