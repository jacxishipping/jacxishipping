/**
 * Unified AIS Provider Integration Service
 * Connects to MarineTraffic, VesselFinder, and AISHub APIs for live vessel positions.
 * Implements multi-provider fallback, rate limiting, and response caching.
 */

import { logger } from '@/lib/logger';

// ── Provider-Specific Response Types ──

export interface MarineTrafficVessel {
  MMSI: number;
  IMO: number;
  SHIPNAME: string;
  LAT: number;
  LON: number;
  SPEED: number;       // knots
  COURSE: number;      // degrees
  HEADING: number;     // degrees
  STATUS: number;      // navigational status code
  TIMESTAMP: string;
  DESTINATION: string;
  ETA: string;
  DRAUGHT: number;
  LENGTH: number;
  WIDTH: number;
  SHIPTYPE: number;
  AIS_CLASS: string;
}

export interface VesselFinderVessel {
  mmsi: number;
  imo: number;
  shipname: string;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  heading: number;
  status: number;
  timestamp: string;
  destination: string;
  eta: string;
  draught: number;
  length: number;
  width: number;
  shipType: number;
}

export interface AISHubVessel {
  MMSI: number;
  IMO: number;
  ShipName: string;
  LATITUDE: number;
  LONGITUDE: number;
  SPEED: number;
  COURSE: number;
  HEADING: number;
  Status: number;
  Timestamp: string;
  Destination: string;
  ETA: string;
  Draught: number;
  Length: number;
  Width: number;
  ShipType: number;
  CallSign: string;
}

export interface UnifiedAISPosition {
  mmsi: number;
  imo: number;
  vesselName: string;
  lat: number;
  lng: number;
  speedKnots: number;
  courseDeg: number;
  headingDeg: number;
  navigationalStatus: string;
  timestamp: string;
  destination: string;
  eta: string;
  draughtMeters: number;
  lengthMeters: number;
  beamMeters: number;
  shipType: number;
  provider: 'marinetraffic' | 'vesselfinder' | 'aishub';
}

export interface AISProviderConfig {
  marineTrafficApiKey?: string;
  vesselFinderApiKey?: string;
  aisHubApiKey?: string;
  cacheTTLMs: number;
}

// ── Navigational Status Mapping ──

const NAV_STATUS_MAP: Record<number, string> = {
  0: 'Under way using engine',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted manoeuvrability',
  4: 'Constrained by her draught',
  5: 'Moored',
  6: 'Aground',
  7: 'Engaged in fishing',
  8: 'Under way sailing',
  9: 'Reserved for HSC',
  10: 'Reserved for WIG',
  11: 'Reserved',
  12: 'Reserved',
  13: 'Reserved',
  14: 'AIS-SART',
  15: 'Not defined',
};

// ── In-Memory Cache ──

interface CacheEntry {
  data: UnifiedAISPosition[];
  timestamp: number;
}

// ── Service ──

export class AISProviderService {
  private config: AISProviderConfig;
  private cache = new Map<string, CacheEntry>();

  constructor(config?: Partial<AISProviderConfig>) {
    this.config = {
      marineTrafficApiKey: process.env.NEXT_PUBLIC_MARINETRAFFIC_API_KEY || '',
      vesselFinderApiKey: process.env.NEXT_PUBLIC_VESSELFINDER_API_KEY || '',
      aisHubApiKey: process.env.NEXT_PUBLIC_AISHUB_API_KEY || '',
      cacheTTLMs: 120_000, // 2 minutes default
      ...config,
    };
  }

  /**
   * Load AIS API keys from the server-side stored tracking settings.
   * This allows keys saved via the Settings UI to be picked up at runtime.
   */
  async loadFromServerSettings(): Promise<void> {
    try {
      const res = await fetch('/api/settings/tracking-apis', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data.aisProviders) {
        this.updateConfig({
          marineTrafficApiKey: data.aisProviders.marineTraffic?.key || this.config.marineTrafficApiKey,
          vesselFinderApiKey: data.aisProviders.vesselFinder?.key || this.config.vesselFinderApiKey,
          aisHubApiKey: data.aisProviders.aisHub?.key || this.config.aisHubApiKey,
        });
      }
    } catch {
      // Silently fail, keep existing config
    }
  }

  /**
   * Update provider API keys at runtime.
   */
  updateConfig(config: Partial<AISProviderConfig>) {
    Object.assign(this.config, config);
  }

  /**
   * Fetch live vessel position by IMO number with multi-provider fallback.
   * Tries MarineTraffic → VesselFinder → AISHub in order.
   */
  async getVesselPosition(imo: number): Promise<UnifiedAISPosition | null> {
    const cacheKey = `imo:${imo}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTLMs) {
      logger.debug(`[AISProvider] Returning cached position for IMO ${imo}`);
      return cached.data[0] || null;
    }

    // Try providers in order
    const providers: Array<() => Promise<UnifiedAISPosition | null>> = [
      () => this.fetchMarineTraffic(imo),
      () => this.fetchVesselFinder(imo),
      () => this.fetchAISHub(imo),
    ];

    for (const fetchFn of providers) {
      try {
        const result = await fetchFn();
        if (result) {
          this.cache.set(cacheKey, { data: [result], timestamp: Date.now() });
          return result;
        }
      } catch (err) {
        logger.warn(`[AISProvider] Provider fetch failed for IMO ${imo}:`, err);
      }
    }

    logger.warn(`[AISProvider] All providers failed for IMO ${imo}`);
    return null;
  }

  /**
   * Fetch positions for multiple vessels in batch.
   */
  async getVesselPositions(imos: number[]): Promise<Map<number, UnifiedAISPosition>> {
    const results = new Map<number, UnifiedAISPosition>();
    const batch = imos.filter(imo => {
      const cached = this.cache.get(`imo:${imo}`);
      return !cached || Date.now() - cached.timestamp >= this.config.cacheTTLMs;
    });

    // Return cached results immediately
    for (const imo of imos) {
      const cached = this.cache.get(`imo:${imo}`);
      if (cached && cached.data[0]) {
        results.set(imo, cached.data[0]);
      }
    }

    // Fetch uncached in parallel (with concurrency limit)
    const concurrency = 3;
    for (let i = 0; i < batch.length; i += concurrency) {
      const chunk = batch.slice(i, i + concurrency);
      const chunkResults = await Promise.allSettled(
        chunk.map(imo => this.getVesselPosition(imo))
      );
      chunkResults.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) {
          results.set(chunk[idx], r.value);
        }
      });
    }

    return results;
  }

  /**
   * Clear the in-memory cache.
   */
  clearCache() {
    this.cache.clear();
  }

  // ── MarineTraffic API ──

  private async fetchMarineTraffic(imo: number): Promise<UnifiedAISPosition | null> {
    const apiKey = this.config.marineTrafficApiKey;
    if (!apiKey) return null;

    const url = `https://services.marinetraffic.com/api/exportvessel/v:5/${apiKey}/timespan:10/protocol:json/imo:${imo}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      logger.warn(`[AISProvider] MarineTraffic returned ${res.status} for IMO ${imo}`);
      return null;
    }

    const data: MarineTrafficVessel[] = await res.json();
    if (!data || data.length === 0) return null;

    const v = data[0];
    return {
      mmsi: v.MMSI,
      imo: v.IMO,
      vesselName: v.SHIPNAME,
      lat: v.LAT,
      lng: v.LON,
      speedKnots: v.SPEED,
      courseDeg: v.COURSE,
      headingDeg: v.HEADING,
      navigationalStatus: NAV_STATUS_MAP[v.STATUS] || 'Unknown',
      timestamp: v.TIMESTAMP,
      destination: v.DESTINATION || '',
      eta: v.ETA || '',
      draughtMeters: v.DRAUGHT,
      lengthMeters: v.LENGTH,
      beamMeters: v.WIDTH,
      shipType: v.SHIPTYPE,
      provider: 'marinetraffic',
    };
  }

  // ── VesselFinder API ──

  private async fetchVesselFinder(imo: number): Promise<UnifiedAISPosition | null> {
    const apiKey = this.config.vesselFinderApiKey;
    if (!apiKey) return null;

    const url = `https://api.vesselfinder.com/v3/vessel/imo:${imo}?userkey=${apiKey}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) return null;

    const data: VesselFinderVessel[] = await res.json();
    if (!data || data.length === 0) return null;

    const v = data[0];
    return {
      mmsi: v.mmsi,
      imo: v.imo,
      vesselName: v.shipname,
      lat: v.latitude,
      lng: v.longitude,
      speedKnots: v.speed,
      courseDeg: v.course,
      headingDeg: v.heading,
      navigationalStatus: NAV_STATUS_MAP[v.status] || 'Unknown',
      timestamp: v.timestamp,
      destination: v.destination || '',
      eta: v.eta || '',
      draughtMeters: v.draught,
      lengthMeters: v.length,
      beamMeters: v.width,
      shipType: v.shipType,
      provider: 'vesselfinder',
    };
  }

  // ── AISHub API ──

  private async fetchAISHub(imo: number): Promise<UnifiedAISPosition | null> {
    const apiKey = this.config.aisHubApiKey;
    if (!apiKey) return null;

    const url = `https://data.aishub.net/ws/1.0/export.json?apikey=${apiKey}&format=1&imo=${imo}`;
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) return null;

    const json = await res.json();
    const data: AISHubVessel[] = json?.data || [];
    if (data.length === 0) return null;

    const v = data[0];
    return {
      mmsi: v.MMSI,
      imo: v.IMO,
      vesselName: v.ShipName,
      lat: v.LATITUDE,
      lng: v.LONGITUDE,
      speedKnots: v.SPEED,
      courseDeg: v.COURSE,
      headingDeg: v.HEADING,
      navigationalStatus: v.Status ? (NAV_STATUS_MAP[v.Status] || 'Unknown') : 'Unknown',
      timestamp: v.Timestamp,
      destination: v.Destination || '',
      eta: v.ETA || '',
      draughtMeters: v.Draught,
      lengthMeters: v.Length,
      beamMeters: v.Width,
      shipType: v.ShipType,
      provider: 'aishub',
    };
  }
}

// Singleton instance
export const aisProviderService = new AISProviderService();
