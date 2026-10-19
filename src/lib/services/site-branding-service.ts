import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { put } from '@vercel/blob';
import { DEFAULT_SITE_BRANDING, type SiteBrandingConfig } from '@/lib/site-branding';

const BRANDING_FILE_NAME = 'site-branding.json';
const UPLOAD_DIR_REL = 'uploads/branding';

function getPublicDir(): string {
  return join(process.cwd(), 'public');
}

function getBrandingConfigFilePath(): string {
  return join(getPublicDir(), BRANDING_FILE_NAME);
}

/**
 * Reads the active site branding configuration from persistent storage.
 * Falls back to DEFAULT_SITE_BRANDING if not yet customized.
 */
export async function getStoredSiteBranding(): Promise<SiteBrandingConfig> {
  try {
    const filePath = getBrandingConfigFilePath();
    if (!existsSync(filePath)) {
      return { ...DEFAULT_SITE_BRANDING };
    }

    const data = await readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data) as Partial<SiteBrandingConfig>;

    return {
      companyName: parsed.companyName?.trim() || DEFAULT_SITE_BRANDING.companyName,
      companyTagline: parsed.companyTagline?.trim() || DEFAULT_SITE_BRANDING.companyTagline,
      logoUrl: parsed.logoUrl?.trim() || DEFAULT_SITE_BRANDING.logoUrl,
      headerLogoUrl: parsed.headerLogoUrl?.trim() || parsed.logoUrl?.trim() || DEFAULT_SITE_BRANDING.headerLogoUrl,
      faviconUrl: parsed.faviconUrl?.trim() || DEFAULT_SITE_BRANDING.faviconUrl,
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error reading site branding configuration:', error);
    return { ...DEFAULT_SITE_BRANDING };
  }
}

/**
 * Persists the site branding configuration to disk and syncs default static assets where possible.
 */
export async function saveStoredSiteBranding(
  updates: Partial<SiteBrandingConfig>
): Promise<SiteBrandingConfig> {
  const current = await getStoredSiteBranding();

  const nextConfig: SiteBrandingConfig = {
    companyName: updates.companyName !== undefined ? updates.companyName.trim() : current.companyName,
    companyTagline: updates.companyTagline !== undefined ? updates.companyTagline.trim() : current.companyTagline,
    logoUrl: updates.logoUrl !== undefined && updates.logoUrl.trim().length > 0 ? updates.logoUrl.trim() : current.logoUrl,
    headerLogoUrl: updates.headerLogoUrl !== undefined && updates.headerLogoUrl.trim().length > 0 
      ? updates.headerLogoUrl.trim() 
      : (updates.logoUrl ? updates.logoUrl.trim() : current.headerLogoUrl),
    faviconUrl: updates.faviconUrl !== undefined && updates.faviconUrl.trim().length > 0 ? updates.faviconUrl.trim() : current.faviconUrl,
    updatedAt: new Date().toISOString(),
  };

  const publicDir = getPublicDir();
  if (!existsSync(publicDir)) {
    await mkdir(publicDir, { recursive: true });
  }

  const filePath = getBrandingConfigFilePath();
  await writeFile(filePath, JSON.stringify(nextConfig, null, 2), 'utf-8');

  // If logoUrl is a local public upload, mirror to public/main-logo.png for backwards-compatibility with static references
  try {
    if (nextConfig.logoUrl.startsWith('/') && !nextConfig.logoUrl.startsWith('//')) {
      const localSourcePath = join(publicDir, nextConfig.logoUrl.replace(/^\//, ''));
      if (existsSync(localSourcePath)) {
        const mainLogoDest = join(publicDir, 'main-logo.png');
        const higherLogoDest = join(publicDir, 'higher-logo.png');
        await copyFile(localSourcePath, mainLogoDest).catch(() => null);
        await copyFile(localSourcePath, higherLogoDest).catch(() => null);
      }
    }
  } catch (err) {
    console.warn('Unable to mirror brand logo to default asset paths:', err);
  }

  return nextConfig;
}

/**
 * Resets site branding to original default JACXI assets.
 */
export async function resetStoredSiteBranding(): Promise<SiteBrandingConfig> {
  const filePath = getBrandingConfigFilePath();
  const resetConfig: SiteBrandingConfig = {
    ...DEFAULT_SITE_BRANDING,
    updatedAt: new Date().toISOString(),
  };

  const publicDir = getPublicDir();
  if (!existsSync(publicDir)) {
    await mkdir(publicDir, { recursive: true });
  }

  await writeFile(filePath, JSON.stringify(resetConfig, null, 2), 'utf-8');
  return resetConfig;
}

/**
 * Saves an uploaded logo file locally to public/uploads/branding/ and optionally to Vercel Blob if configured.
 */
export async function saveBrandLogoUpload(
  file: File
): Promise<{ url: string; filename: string }> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const extension = file.type === 'image/png' 
    ? 'png' 
    : file.type === 'image/webp' 
    ? 'webp' 
    : file.type === 'image/svg+xml' 
    ? 'svg' 
    : 'jpg';

  const sanitizedBaseName = file.name?.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '') || `logo.${extension}`;
  const uniqueName = `brand-logo-${Date.now()}-${randomUUID().slice(0, 8)}-${sanitizedBaseName}`;

  // 1. Check if Vercel Blob storage is configured
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (blobToken) {
    try {
      const blob = await put(`branding/${uniqueName}`, file, {
        access: 'public',
        token: blobToken,
        contentType: file.type,
      });

      return {
        url: blob.url,
        filename: blob.pathname,
      };
    } catch (blobError) {
      console.warn('Vercel Blob upload failed, falling back to local filesystem storage:', blobError);
    }
  }

  // 2. Local public filesystem storage
  const uploadDir = join(getPublicDir(), UPLOAD_DIR_REL);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  const localFilePath = join(uploadDir, uniqueName);
  await writeFile(localFilePath, buffer);

  const publicUrl = `/${UPLOAD_DIR_REL}/${uniqueName}`;
  return {
    url: publicUrl,
    filename: uniqueName,
  };
}
