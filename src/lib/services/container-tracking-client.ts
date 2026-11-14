/**
 * Live ContainerTracking Supabase API Client
 * Connects directly to the ContainerTracking backend with automatic JWT token renewal,
 * live vessel AIS location lookup by IMO, and real-time container event stream updates.
 */

import { logger } from '@/lib/logger';
import { getStoredTrackingSettings, maskSecret } from '@/lib/tracking-settings';

export interface SupabaseTrackingEvent {
  event_date: string;
  event_type: 'actual' | 'expected';
  event_recent?: boolean;
  action?: {
    action_name?: string;
  };
  location?: {
    port?: string;
    country?: string;
  };
  mode?: {
    vessel?: {
      vessel_name?: string;
      voyage_nr?: string;
      imo?: number;
    };
  };
}

export interface SupabaseTrackingData {
  container?: {
    number?: string;
    type?: string;
    completed?: boolean;
  };
  scac?: string;
  pol?: {
    port?: string;
    country?: string;
    etd_date?: string;
  };
  pod?: {
    port?: string;
    country?: string;
    eta_date?: string;
  };
  events?: SupabaseTrackingEvent[];
}

export interface VesselLiveLocation {
  imo: number;
  lat: number | null;
  lon: number | null;
  course: number | null;
}

class ContainerTrackingSupabaseClient {
  private supabaseUrl: string;
  private anonKey: string;
  private accessToken: string;
  private refreshToken: string;
  private userId: string;
  private subscriptionStatus: string;

  constructor() {
    const stored = getStoredTrackingSettings();
    this.supabaseUrl = stored.supabaseUrl;
    this.anonKey = stored.anonKey;
    this.accessToken = stored.accessToken;
    this.refreshToken = stored.refreshToken;
    this.userId = stored.userId;
    this.subscriptionStatus = stored.subscriptionStatus;
  }

  /**
   * Decode expiration time from JWT (seconds since epoch)
   */
  public getTokenExpiry(jwt?: string): number | null {
    try {
      const token = jwt || this.accessToken;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  }

  /**
   * Return comprehensive diagnostics and status for the Supabase tracking integration
   */
  public getDiagnostics() {
    const exp = this.getTokenExpiry(this.accessToken);
    const nowEpoch = Math.floor(Date.now() / 1000);
    const isExpired = exp !== null ? exp <= nowEpoch : false;
    const secondsUntilExpiry = exp !== null ? exp - nowEpoch : null;

    return {
      supabaseUrl: this.supabaseUrl,
      userId: this.userId,
      subscriptionStatus: this.subscriptionStatus,
      hasAnonKey: Boolean(this.anonKey),
      hasAccessToken: Boolean(this.accessToken),
      hasRefreshToken: Boolean(this.refreshToken),
      maskedAnonKey: maskSecret(this.anonKey),
      maskedAccessToken: maskSecret(this.accessToken),
      maskedRefreshToken: maskSecret(this.refreshToken),
      tokenExpiresAt: exp ? new Date(exp * 1000).toISOString() : null,
      isTokenExpired: isExpired,
      secondsUntilExpiry,
    };
  }

  /**
   * Update tracking client credentials in-memory
   */
  public updateConfig(updates: {
    supabaseUrl?: string;
    anonKey?: string;
    accessToken?: string;
    refreshToken?: string;
    userId?: string;
    subscriptionStatus?: string;
  }) {
    if (updates.supabaseUrl?.trim()) this.supabaseUrl = updates.supabaseUrl.trim();
    if (updates.anonKey?.trim()) this.anonKey = updates.anonKey.trim();
    if (updates.accessToken?.trim()) this.accessToken = updates.accessToken.trim();
    if (updates.refreshToken?.trim()) this.refreshToken = updates.refreshToken.trim();
    if (updates.userId?.trim()) this.userId = updates.userId.trim();
    if (updates.subscriptionStatus?.trim()) this.subscriptionStatus = updates.subscriptionStatus.trim();
  }

  /**
   * Test and renew Supabase OAuth access token using refresh_token grant
   */
  public async testTokenRenewal(signal?: AbortSignal): Promise<{
    success: boolean;
    httpStatus?: number;
    error?: string;
    tokenExpiresAt?: string | null;
    secondsUntilExpiry?: number | null;
    latencyMs: number;
    renewedAt: string;
  }> {
    const start = Date.now();
    if (!this.refreshToken) {
      return {
        success: false,
        error: 'No refresh token configured',
        latencyMs: Date.now() - start,
        renewedAt: new Date().toISOString(),
      };
    }

    const url = `${this.supabaseUrl}/auth/v1/token?grant_type=refresh_token`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          apikey: this.anonKey,
          'Content-Type': 'application/json',
        },
        signal,
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });

      const latencyMs = Date.now() - start;
      const resText = await res.text();
      let body: any = null;
      try {
        body = JSON.parse(resText);
      } catch {
        body = { raw: resText };
      }

      if (!res.ok) {
        const errorMsg = body?.msg || body?.error_description || body?.message || body?.error || `HTTP ${res.status}`;
        logger.warn(`Supabase tracking token refresh failed with HTTP ${res.status}: ${errorMsg}`);
        return {
          success: false,
          httpStatus: res.status,
          error: errorMsg,
          latencyMs,
          renewedAt: new Date().toISOString(),
        };
      }

      if (body?.access_token) {
        this.accessToken = body.access_token;
        if (body.refresh_token) {
          this.refreshToken = body.refresh_token;
        }
        const exp = this.getTokenExpiry(this.accessToken);
        const nowEpoch = Math.floor(Date.now() / 1000);

        logger.info('Supabase container tracking access token renewed successfully.');
        return {
          success: true,
          httpStatus: res.status,
          tokenExpiresAt: exp ? new Date(exp * 1000).toISOString() : null,
          secondsUntilExpiry: exp ? exp - nowEpoch : null,
          latencyMs,
          renewedAt: new Date().toISOString(),
        };
      }

      return {
        success: false,
        httpStatus: res.status,
        error: 'No access_token found in Supabase response',
        latencyMs,
        renewedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Network error during token renewal',
        latencyMs: Date.now() - start,
        renewedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Ping Supabase backend to verify connectivity and API key validity
   */
  public async testPing(): Promise<{
    success: boolean;
    httpStatus?: number;
    latencyMs: number;
    error?: string;
  }> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          apikey: this.anonKey,
          Accept: 'application/json',
        },
        cache: 'no-store',
      });
      return {
        success: res.ok,
        httpStatus: res.status,
        latencyMs: Date.now() - start,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Date.now() - start,
        error: err?.message || 'Connection failed',
      };
    }
  }

  /**
   * Automatically exchange refresh token for a fresh JWT access token
   */
  private async refreshAccessToken(signal?: AbortSignal): Promise<boolean> {
    const res = await this.testTokenRenewal(signal);
    return res.success;
  }

  /**
   * Ensure the access token is fresh before making API calls.
   */
  private async ensureFreshToken(signal?: AbortSignal): Promise<void> {
    const exp = this.getTokenExpiry(this.accessToken);
    const nowEpoch = Math.floor(Date.now() / 1000);
    // If expires in less than 5 minutes (300 seconds), renew it
    if (exp && exp - nowEpoch < 300) {
      await this.refreshAccessToken(signal);
    }
  }

  /**
   * Make an authenticated request with automatic retry on 401
   */
  private async authenticatedFetch(
    url: string,
    options: RequestInit,
    retries = 2
  ): Promise<Response> {
    await this.ensureFreshToken(options.signal ?? undefined);

    for (let attempt = 0; attempt < retries; attempt++) {
      const headers = {
        apikey: this.anonKey,
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-client-info': 'jacxi-shipping-tracking/1.0',
        ...(options.headers || {}),
      };

      try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 && attempt < retries - 1) {
          const renewed = await this.refreshAccessToken(options.signal ?? undefined);
          if (renewed) continue;
        }
        return response;
      } catch (error) {
        // An aborted request must fail fast instead of burning the retry delay.
        if (error instanceof Error && error.name === 'AbortError') throw error;
        if (attempt === retries - 1) throw error;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw new Error(`Request to ${url} failed after retries.`);
  }

  /**
   * Register a container with the tracking backend.
   */
  async registerContainer(trackingNumber: string, options?: { signal?: AbortSignal }): Promise<boolean> {
    const cleanNumber = trackingNumber.trim().toUpperCase();
    const url = `${this.supabaseUrl}/rest/v1/trackings_ids?on_conflict=user_id%2Ctracking_number`;

    const payload = {
      user_id: this.userId,
      tracking_number: cleanNumber,
      tracking_type: 'container',
      shipping_line: null,
      note: null,
      created_at: new Date().toISOString(),
      completed: false,
      subscription_status: this.subscriptionStatus,
    };

    try {
      const res = await this.authenticatedFetch(url, {
        method: 'POST',
        signal: options?.signal,
        headers: {
          'content-profile': 'public',
          'accept-profile': 'public',
          prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(payload),
      });
      return res.ok;
    } catch (err) {
      logger.error(`Failed to register container ${cleanNumber} in Supabase:`, err);
      return false;
    }
  }

  /**
   * Fetch real-time container tracking data from update-tracking-v2 function.
   */
  async fetchContainerTracking(
    trackingNumber: string,
    options?: { signal?: AbortSignal }
  ): Promise<SupabaseTrackingData | null> {
    const cleanNumber = trackingNumber.trim().toUpperCase();
    // Auto-register first if needed
    await this.registerContainer(cleanNumber, { signal: options?.signal }).catch(() => {});

    const url = `${this.supabaseUrl}/functions/v1/update-tracking-v2`;

    try {
      const res = await this.authenticatedFetch(url, {
        method: 'POST',
        signal: options?.signal,
        body: JSON.stringify({ tracking_number: cleanNumber }),
      });

      if (!res.ok) {
        logger.warn(`update-tracking-v2 returned HTTP ${res.status} for ${cleanNumber}`);
        return null;
      }

      const body = await res.json();
      const trackingData: SupabaseTrackingData = (body?.data || body)?.data || body?.data || body;
      return trackingData;
    } catch (err) {
      logger.error(`Error fetching tracking for ${cleanNumber}:`, err);
      return null;
    }
  }

  /**
   * Get real-time live satellite GPS position of a vessel by IMO number.
   */
  async getLiveVesselLocation(imo: number | string): Promise<VesselLiveLocation | null> {
    const imoNum = parseInt(String(imo).replace(/\D/g, ''), 10);
    if (Number.isNaN(imoNum) || imoNum <= 0) return null;

    const url = `${this.supabaseUrl}/functions/v1/get-vessel-location`;

    try {
      const res = await this.authenticatedFetch(url, {
        method: 'POST',
        body: JSON.stringify({ imo: imoNum }),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      return {
        imo: imoNum,
        lat: typeof data.lat === 'number' ? data.lat : null,
        lon: typeof data.lon === 'number' ? data.lon : null,
        course: typeof data.course === 'number' ? data.course : null,
      };
    } catch (err) {
      logger.error(`Error fetching vessel location for IMO ${imoNum}:`, err);
      return null;
    }
  }
}

export const containerTrackingClient = new ContainerTrackingSupabaseClient();
