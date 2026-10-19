export interface SiteBrandingConfig {
  companyName: string;
  companyTagline?: string;
  logoUrl: string;
  headerLogoUrl?: string;
  faviconUrl?: string;
  updatedAt?: string;
}

export const DEFAULT_SITE_BRANDING: SiteBrandingConfig = {
  companyName: 'JACXI SHIPPING',
  companyTagline: 'Vehicle Logistics',
  logoUrl: '/main-logo.png',
  headerLogoUrl: '/higher-logo.png',
  faviconUrl: '/favicon.png',
};

export const siteBrandAssets = {
  favicon: '/favicon.png',
  headerLogo: '/higher-logo.png',
  mainLogo: '/main-logo.png',
} as const;

export const siteBrandAssetFiles = {
  favicon: 'public/favicon.png',
} as const;