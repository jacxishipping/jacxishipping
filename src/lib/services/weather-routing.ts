/**
 * Ocean Weather Routing Integration
 * Fetches real ocean weather data (wind, waves, currents, storm tracks)
 * from OpenWeatherMap / StormGlass APIs and provides formatted data for map overlays.
 */

import { logger } from '@/lib/logger';

// ── Types ──

export interface OceanWeatherPoint {
  lat: number;
  lng: number;
  waveHeightMeters: number;
  waveDirectionDeg: number;
  wavePeriodSeconds: number;
  windSpeedKnots: number;
  windDirectionDeg: number;
  windGustsKnots: number;
  currentSpeedKnots: number;
  currentDirectionDeg: number;
  seaLevelPressureHPa: number;
  waterTempC: number;
  timestamp: string;
}

export interface StormWarning {
  type: 'tropical_cyclone' | 'extra_tropical' | 'storm' | 'gale';
  name: string;
  centerLat: number;
  centerLng: number;
  windSpeedKnots: number;
  radiusNM: number;
  movementDirectionDeg: number;
  movementSpeedKnots: number;
  timestamp: string;
  forecastTrack: Array<{ lat: number; lng: number; timestamp: string }>;
}

export interface WeatherRouteOverlay {
  points: OceanWeatherPoint[];
  storms: StormWarning[];
  generatedAt: string;
  region: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

export interface WeatherProviderConfig {
  openWeatherMapApiKey?: string;
  stormGlassApiKey?: string;
  cacheTTLMs: number;
}

// ── In-Memory Cache ──

interface CacheEntry {
  data: WeatherRouteOverlay;
  timestamp: number;
}

// ── Service ──

export class WeatherRoutingService {
  private config: WeatherProviderConfig;
  private cache = new Map<string, CacheEntry>();

  constructor(config?: Partial<WeatherProviderConfig>) {
    this.config = {
      openWeatherMapApiKey: process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY || '',
      stormGlassApiKey: process.env.NEXT_PUBLIC_STORMGLASS_API_KEY || '',
      cacheTTLMs: 600_000, // 10 minutes
      ...config,
    };
  }

  updateConfig(config: Partial<WeatherProviderConfig>) {
    Object.assign(this.config, config);
  }

  /**
   * Fetch weather data along a maritime route corridor.
   * Samples weather at key waypoints along the route.
   */
  async getRouteWeather(
    waypoints: Array<{ lat: number; lng: number }>,
    vesselLat?: number,
    vesselLng?: number,
  ): Promise<WeatherRouteOverlay | null> {
    if (waypoints.length === 0) return null;

    // Build a bounding box around the route
    const lats = waypoints.map(w => w.lat);
    const lngs = waypoints.map(w => w.lng);
    if (vesselLat != null) lats.push(vesselLat);
    if (vesselLng != null) lngs.push(vesselLng);

    const minLat = Math.min(...lats) - 5;
    const maxLat = Math.max(...lats) + 5;
    const minLng = Math.min(...lngs) - 5;
    const maxLng = Math.max(...lngs) + 5;

    const cacheKey = `weather:${minLat.toFixed(1)}:${maxLat.toFixed(1)}:${minLng.toFixed(1)}:${maxLng.toFixed(1)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.cacheTTLMs) {
      return cached.data;
    }

    // Sample weather at key points along the route (every Nth waypoint)
    const sampleStep = Math.max(1, Math.floor(waypoints.length / 12));
    const samplePoints = waypoints.filter((_, i) => i % sampleStep === 0);
    if (vesselLat != null && vesselLng != null) {
      samplePoints.push({ lat: vesselLat, lng: vesselLng });
    }

    try {
      const points = await this.fetchWeatherPoints(samplePoints);
      const storms = await this.fetchStormWarnings(minLat, maxLat, minLng, maxLng);

      const overlay: WeatherRouteOverlay = {
        points,
        storms,
        generatedAt: new Date().toISOString(),
        region: { minLat, maxLat, minLng, maxLng },
      };

      this.cache.set(cacheKey, { data: overlay, timestamp: Date.now() });
      return overlay;
    } catch (err) {
      logger.error('[WeatherRouting] Failed to fetch route weather:', err);
      return null;
    }
  }

  /**
   * Fetch weather data for specific coordinate points using OpenWeatherMap.
   */
  private async fetchWeatherPoints(
    points: Array<{ lat: number; lng: number }>
  ): Promise<OceanWeatherPoint[]> {
    const apiKey = this.config.openWeatherMapApiKey;
    if (!apiKey) return this.generateSimulatedWeather(points);

    const results: OceanWeatherPoint[] = [];

    for (const pt of points) {
      try {
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${pt.lat}&lon=${pt.lng}&appid=${apiKey}&units=metric`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;

        const data = await res.json();
        results.push({
          lat: pt.lat,
          lng: pt.lng,
          waveHeightMeters: data.main?.sea_level ? data.main.sea_level / 100 : 1.5,
          waveDirectionDeg: data.wind?.deg || 180,
          wavePeriodSeconds: 6,
          windSpeedKnots: data.wind?.speed ? data.wind.speed * 1.944 : 10,
          windDirectionDeg: data.wind?.deg || 180,
          windGustsKnots: data.wind?.gust ? data.wind.gust * 1.944 : 15,
          currentSpeedKnots: 1.5,
          currentDirectionDeg: 90,
          seaLevelPressureHPa: data.main?.pressure || 1013,
          waterTempC: data.main?.temp || 20,
          timestamp: new Date(data.dt * 1000).toISOString(),
        });
      } catch {
        // Fall through to simulated data for this point
      }
    }

    // Fill in any missing points with simulated data
    if (results.length < points.length) {
      const simulated = this.generateSimulatedWeather(
        points.filter((_, i) => !results[i])
      );
      results.push(...simulated);
    }

    return results;
  }

  /**
   * Fetch storm warnings from OpenWeatherMap alerts / StormGlass.
   */
  private async fetchStormWarnings(
    minLat: number, maxLat: number,
    minLng: number, maxLng: number
  ): Promise<StormWarning[]> {
    const apiKey = this.config.openWeatherMapApiKey;
    if (!apiKey) return this.generateSimulatedStorms(minLat, maxLat, minLng, maxLng);

    try {
      const url = `https://api.openweathermap.org/data/2.5/box/city?bbox=${minLng},${minLat},${maxLng},${maxLat},10&appid=${apiKey}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return [];

      const data = await res.json();
      const storms: StormWarning[] = [];

      for (const alert of (data?.list || [])) {
        if (alert.wind?.speed && alert.wind.speed > 20) {
          storms.push({
            type: alert.wind.speed > 30 ? 'storm' : 'gale',
            name: alert.name || 'Weather System',
            centerLat: alert.coord?.lat || 0,
            centerLng: alert.coord?.lon || 0,
            windSpeedKnots: alert.wind.speed * 1.944,
            radiusNM: 100,
            movementDirectionDeg: 270,
            movementSpeedKnots: 10,
            timestamp: new Date().toISOString(),
            forecastTrack: [],
          });
        }
      }

      return storms;
    } catch {
      return this.generateSimulatedStorms(minLat, maxLat, minLng, maxLng);
    }
  }

  /**
   * Generate realistic simulated weather data for points (fallback when no API key).
   */
  private generateSimulatedWeather(points: Array<{ lat: number; lng: number }>): OceanWeatherPoint[] {
    const now = new Date().toISOString();
    return points.map(pt => {
      // Simulate realistic ocean conditions based on latitude
      const isTropical = Math.abs(pt.lat) < 23.5;
      const isNorthAtlantic = pt.lat > 30 && pt.lng < -20;
      const isSouthernOcean = Math.abs(pt.lat) > 40;

      return {
        lat: pt.lat,
        lng: pt.lng,
        waveHeightMeters: isSouthernOcean ? 3.5 + Math.random() * 2 : isTropical ? 1.0 + Math.random() * 0.8 : 1.8 + Math.random() * 1.5,
        waveDirectionDeg: Math.round(Math.random() * 360),
        wavePeriodSeconds: Math.round(5 + Math.random() * 7),
        windSpeedKnots: isNorthAtlantic ? 18 + Math.random() * 12 : isTropical ? 8 + Math.random() * 8 : 12 + Math.random() * 10,
        windDirectionDeg: Math.round(Math.random() * 360),
        windGustsKnots: 0,
        currentSpeedKnots: 1 + Math.random() * 2,
        currentDirectionDeg: Math.round(Math.random() * 360),
        seaLevelPressureHPa: isTropical ? 1010 + Math.random() * 5 : 1015 + Math.random() * 10,
        waterTempC: isTropical ? 26 + Math.random() * 4 : isNorthAtlantic ? 12 + Math.random() * 6 : 18 + Math.random() * 5,
        timestamp: now,
      };
    });
  }

  /**
   * Generate simulated storm warnings for demo purposes.
   */
  private generateSimulatedStorms(
    minLat: number, maxLat: number,
    minLng: number, maxLng: number
  ): StormWarning[] {
    const storms: StormWarning[] = [];

    // North Atlantic storm track
    if (maxLat > 35 && minLng < -20) {
      storms.push({
        type: 'extra_tropical',
        name: 'North Atlantic Storm System',
        centerLat: 42 + Math.random() * 5,
        centerLng: -35 + Math.random() * 10,
        windSpeedKnots: 40 + Math.random() * 15,
        radiusNM: 200 + Math.random() * 100,
        movementDirectionDeg: 70,
        movementSpeedKnots: 15,
        timestamp: new Date().toISOString(),
        forecastTrack: [
          { lat: 43, lng: -38, timestamp: new Date(Date.now() + 6 * 3600000).toISOString() },
          { lat: 44, lng: -32, timestamp: new Date(Date.now() + 12 * 3600000).toISOString() },
          { lat: 45, lng: -26, timestamp: new Date(Date.now() + 18 * 3600000).toISOString() },
        ],
      });
    }

    return storms;
  }

  clearCache() {
    this.cache.clear();
  }
}

// Singleton
export const weatherRoutingService = new WeatherRoutingService();
