import fs from 'fs';
import path from 'path';
import { decryptSecret, encryptSecret } from './secret-crypto';

export interface TrackingSettingsValues {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
  subscriptionStatus: string;
  publicTrackingApiKey: string;
  pglEndpoint: string;
  turkonEndpoint: string;
  marineTrafficApiKey: string;
  vesselFinderApiKey: string;
  aisHubApiKey: string;
}

const CONFIG_FILE_PATH = path.join(process.cwd(), '.tracking-config.json');

export const DEFAULT_TRACKING_SETTINGS: TrackingSettingsValues = {
  supabaseUrl: process.env.SUPABASE_TRACKING_URL || '',
  anonKey: process.env.SUPABASE_TRACKING_ANON_KEY || '',
  accessToken: process.env.SUPABASE_TRACKING_ACCESS_TOKEN || '',
  refreshToken: process.env.SUPABASE_TRACKING_REFRESH_TOKEN || '',
  userId: process.env.SUPABASE_TRACKING_USER_ID || '',
  subscriptionStatus: process.env.SUBSCRIPTION_STATUS || '',
  publicTrackingApiKey: process.env.PUBLIC_TRACKING_API_KEY || '',
  pglEndpoint: 'https://api.pglsystem.com/api/public/tracking',
  turkonEndpoint: 'https://myturkonline.turkon.com/shipping-prod-service/tracking/getTrackingTopInformation/en/',
  marineTrafficApiKey: process.env.NEXT_PUBLIC_MARINETRAFFIC_API_KEY || '',
  vesselFinderApiKey: process.env.NEXT_PUBLIC_VESSELFINDER_API_KEY || '',
  aisHubApiKey: process.env.NEXT_PUBLIC_AISHUB_API_KEY || '',
};

export function maskSecret(secret?: string | null): string {
  if (!secret) return '';
  const trimmed = secret.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 4)}••••${trimmed.slice(-4)}`;
}

export function getStoredTrackingSettings(): TrackingSettingsValues {
  let overrides: Partial<TrackingSettingsValues> = {};

  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      overrides = {
        supabaseUrl: parsed.supabaseUrl,
        anonKey: parsed.anonKey,
        accessToken: parsed.accessToken ? decryptSecret(parsed.accessToken) : undefined,
        refreshToken: parsed.refreshToken ? decryptSecret(parsed.refreshToken) : undefined,
        userId: parsed.userId,
        subscriptionStatus: parsed.subscriptionStatus,
        publicTrackingApiKey: parsed.publicTrackingApiKey ? decryptSecret(parsed.publicTrackingApiKey) : undefined,
        pglEndpoint: parsed.pglEndpoint,
        turkonEndpoint: parsed.turkonEndpoint,
        marineTrafficApiKey: parsed.marineTrafficApiKey ? decryptSecret(parsed.marineTrafficApiKey) : undefined,
        vesselFinderApiKey: parsed.vesselFinderApiKey ? decryptSecret(parsed.vesselFinderApiKey) : undefined,
        aisHubApiKey: parsed.aisHubApiKey ? decryptSecret(parsed.aisHubApiKey) : undefined,
      };
    }
  } catch {
    // If reading fails, ignore and use env defaults
  }

  return {
    supabaseUrl: overrides.supabaseUrl?.trim() || process.env.SUPABASE_TRACKING_URL?.trim() || DEFAULT_TRACKING_SETTINGS.supabaseUrl,
    anonKey: overrides.anonKey?.trim() || process.env.SUPABASE_TRACKING_ANON_KEY?.trim() || DEFAULT_TRACKING_SETTINGS.anonKey,
    accessToken: overrides.accessToken?.trim() || process.env.SUPABASE_TRACKING_ACCESS_TOKEN?.trim() || DEFAULT_TRACKING_SETTINGS.accessToken,
    refreshToken: overrides.refreshToken?.trim() || process.env.SUPABASE_TRACKING_REFRESH_TOKEN?.trim() || DEFAULT_TRACKING_SETTINGS.refreshToken,
    userId: overrides.userId?.trim() || process.env.SUPABASE_TRACKING_USER_ID?.trim() || DEFAULT_TRACKING_SETTINGS.userId,
    subscriptionStatus: overrides.subscriptionStatus?.trim() || process.env.SUBSCRIPTION_STATUS?.trim() || DEFAULT_TRACKING_SETTINGS.subscriptionStatus,
    publicTrackingApiKey: overrides.publicTrackingApiKey?.trim() || process.env.PUBLIC_TRACKING_API_KEY?.trim() || DEFAULT_TRACKING_SETTINGS.publicTrackingApiKey,
    pglEndpoint: overrides.pglEndpoint?.trim() || DEFAULT_TRACKING_SETTINGS.pglEndpoint,
    turkonEndpoint: overrides.turkonEndpoint?.trim() || DEFAULT_TRACKING_SETTINGS.turkonEndpoint,
    marineTrafficApiKey: overrides.marineTrafficApiKey?.trim() || process.env.NEXT_PUBLIC_MARINETRAFFIC_API_KEY?.trim() || DEFAULT_TRACKING_SETTINGS.marineTrafficApiKey,
    vesselFinderApiKey: overrides.vesselFinderApiKey?.trim() || process.env.NEXT_PUBLIC_VESSELFINDER_API_KEY?.trim() || DEFAULT_TRACKING_SETTINGS.vesselFinderApiKey,
    aisHubApiKey: overrides.aisHubApiKey?.trim() || process.env.NEXT_PUBLIC_AISHUB_API_KEY?.trim() || DEFAULT_TRACKING_SETTINGS.aisHubApiKey,
  };
}

export function saveStoredTrackingSettings(updates: Partial<TrackingSettingsValues>): TrackingSettingsValues {
  const current = getStoredTrackingSettings();
  const next: TrackingSettingsValues = {
    ...current,
    ...updates,
  };

  try {
    const toPersist = {
      supabaseUrl: next.supabaseUrl,
      anonKey: next.anonKey,
      accessToken: next.accessToken ? encryptSecret(next.accessToken) : null,
      refreshToken: next.refreshToken ? encryptSecret(next.refreshToken) : null,
      userId: next.userId,
      subscriptionStatus: next.subscriptionStatus,
      publicTrackingApiKey: next.publicTrackingApiKey ? encryptSecret(next.publicTrackingApiKey) : null,
      pglEndpoint: next.pglEndpoint,
      turkonEndpoint: next.turkonEndpoint,
      marineTrafficApiKey: next.marineTrafficApiKey ? encryptSecret(next.marineTrafficApiKey) : null,
      vesselFinderApiKey: next.vesselFinderApiKey ? encryptSecret(next.vesselFinderApiKey) : null,
      aisHubApiKey: next.aisHubApiKey ? encryptSecret(next.aisHubApiKey) : null,
    };

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(toPersist, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to persist tracking settings overrides:', error);
  }

  return next;
}
