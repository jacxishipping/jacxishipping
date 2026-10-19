import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SITE_BRANDING, type SiteBrandingConfig } from './site-branding';
import {
  getStoredSiteBranding,
  saveStoredSiteBranding,
  resetStoredSiteBranding,
} from './services/site-branding-service';

describe('Site Branding System', () => {
  it('should have default branding values defined', () => {
    assert.strictEqual(DEFAULT_SITE_BRANDING.companyName, 'JACXI SHIPPING');
    assert.strictEqual(DEFAULT_SITE_BRANDING.logoUrl, '/main-logo.png');
    assert.strictEqual(DEFAULT_SITE_BRANDING.headerLogoUrl, '/higher-logo.png');
    assert.strictEqual(DEFAULT_SITE_BRANDING.faviconUrl, '/favicon.png');
    assert.strictEqual(DEFAULT_SITE_BRANDING.companyTagline, 'Vehicle Logistics');
  });

  it('should read stored branding without throwing', async () => {
    const branding = await getStoredSiteBranding();
    assert.ok(branding);
    assert.ok(typeof branding.companyName === 'string');
    assert.ok(typeof branding.logoUrl === 'string');
  });

  it('should save and retrieve custom branding configuration', async () => {
    const testCustom: Partial<SiteBrandingConfig> = {
      companyName: 'Test Logistics Global',
      companyTagline: 'Worldwide Vehicle Freight',
      logoUrl: '/uploads/branding/test-logo.png',
    };

    const saved = await saveStoredSiteBranding(testCustom);
    assert.strictEqual(saved.companyName, 'Test Logistics Global');
    assert.strictEqual(saved.companyTagline, 'Worldwide Vehicle Freight');
    assert.strictEqual(saved.logoUrl, '/uploads/branding/test-logo.png');
    assert.strictEqual(saved.headerLogoUrl, '/uploads/branding/test-logo.png');

    const retrieved = await getStoredSiteBranding();
    assert.strictEqual(retrieved.companyName, 'Test Logistics Global');
    assert.strictEqual(retrieved.logoUrl, '/uploads/branding/test-logo.png');

    // Clean up by resetting
    await resetStoredSiteBranding();
    const afterReset = await getStoredSiteBranding();
    assert.strictEqual(afterReset.companyName, DEFAULT_SITE_BRANDING.companyName);
    assert.strictEqual(afterReset.logoUrl, DEFAULT_SITE_BRANDING.logoUrl);
  });
});
