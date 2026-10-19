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
}

const CONFIG_FILE_PATH = path.join(process.cwd(), '.tracking-config.json');

export const DEFAULT_TRACKING_SETTINGS: TrackingSettingsValues = {
  supabaseUrl: process.env.SUPABASE_TRACKING_URL || 'https://wdnqhocjcjolsmgthfjm.supabase.co',
  anonKey: process.env.SUPABASE_TRACKING_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkbnFob2NqY2pvbHNtZ3RoZmptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ1Mjk3MTAsImV4cCI6MjA2MDEwNTcxMH0.FnfHss745CusFG1HNluhARQIqgwjvBhGVAgLU_bi8uc',
  accessToken: process.env.SUPABASE_TRACKING_ACCESS_TOKEN || 'eyJhbGciOiJIUzI1NiIsImtpZCI6Ik9DeUVoUTBoTWNxdGJNa2UiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3dkbnFob2NqY2pvbHNtZ3RoZmptLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiI0NTA3ZGJlMi01YTNkLTQyZWItOWY1Ny05OTU2OWI1NmNmNWQiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzkwNTY4OTMzLCJpYXQiOjE3OTA1NjUzMzMsImVtYWlsIjoic2hrcmJhYmFyQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZ29vZ2xlIiwicHJvdmlkZXJzIjpbImdvb2dsZSJdfSwidXNlcl9tZXRhZGF0YSI6eyJhdmF0YXJfdXJsIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS082bzBQa2dWZGhkZjhYRDdJbE5CX3hMa0ppUkJ0WFhuOGt5UWNoVzJ6a3otNXdlST1zOTYtYyIsImVtYWlsIjoic2hrcmJhYmFyQGdtYWlsLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJTaGFraXIgQmFiYXIiLCJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJuYW1lIjoiU2hha2lyIEJhYmFyIiwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJwaWN0dXJlIjoiaHR0cHM6Ly9saDMuZ29vZ2xldXNlcmNvbnRlbnQuY29tL2EvQUNnOG9jS082bzBQa2dWZGhkZjhYRDdJbE5CX3hMa0ppUkJ0WFhuOGt5UWNoVzJ6a3otNXdlST1zOTYtYyIsInByb3ZpZGVyX2lkIjoiMTAyMjA0MDI3MTM3MDQ0MzU4NzI4Iiwic3ViIjoiMTAyMjA0MDI3MTM3MDQ0MzU4NzI4In0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoib2F1dGgiLCJ0aW1lc3RhbXAiOjE3OTAzNTMwOTN9XSwic2Vzc2lvbl9pZCI6IjYwMmMwNzMzLTBjNGMtNDc4Ny1hYmFmLTBjOTljMDNjZTYzNiIsImlzX2Fub255bW91cyI6ZmFsc2V9.LZLND3nqJ_9LjeXYMeODrohPzri9mUx6tl2aUD-FYR0',
  refreshToken: process.env.SUPABASE_TRACKING_REFRESH_TOKEN || 'osl3x2ix7cr7',
  userId: process.env.SUPABASE_TRACKING_USER_ID || '4507dbe2-5a3d-42eb-9f57-99569b56cf5d',
  subscriptionStatus: process.env.SUBSCRIPTION_STATUS || 'pro',
  publicTrackingApiKey: process.env.PUBLIC_TRACKING_API_KEY || '',
  pglEndpoint: 'https://api.pglsystem.com/api/public/tracking',
  turkonEndpoint: 'https://myturkonline.turkon.com/shipping-prod-service/tracking/getTrackingTopInformation/en/',
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
    };

    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(toPersist, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to persist tracking settings overrides:', error);
  }

  return next;
}
