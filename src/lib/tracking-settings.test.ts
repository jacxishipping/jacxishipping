import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getStoredTrackingSettings, maskSecret } from './tracking-settings';
import { containerTrackingClient } from './services/container-tracking-client';

describe('Tracking Settings & Diagnostics', () => {
  it('masks secret values properly', () => {
    assert.equal(maskSecret(null), '');
    assert.equal(maskSecret(''), '');
    assert.equal(maskSecret('short'), '••••••••');
    assert.equal(maskSecret('12345678'), '••••••••');
    assert.equal(maskSecret('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'eyJh••••VCJ9');
  });

  it('retrieves default or stored tracking settings with required endpoints', () => {
    const settings = getStoredTrackingSettings();
    assert.ok(settings.supabaseUrl.startsWith('https://'));
    assert.ok(settings.turkonEndpoint.includes('turkon.com'));
    assert.ok(settings.pglEndpoint.includes('pglsystem.com'));
    assert.ok(typeof settings.anonKey === 'string');
    assert.ok(typeof settings.subscriptionStatus === 'string');
  });

  it('returns valid diagnostics from containerTrackingClient', () => {
    const diag = containerTrackingClient.getDiagnostics();
    assert.ok(typeof diag.supabaseUrl === 'string');
    assert.ok(typeof diag.hasAnonKey === 'boolean');
    assert.ok(typeof diag.hasAccessToken === 'boolean');
    assert.ok(typeof diag.hasRefreshToken === 'boolean');
    assert.ok(typeof diag.maskedAnonKey === 'string');
    assert.ok(typeof diag.maskedAccessToken === 'string');
    assert.ok(typeof diag.maskedRefreshToken === 'string');
    assert.ok(typeof diag.userId === 'string');
    assert.ok(typeof diag.subscriptionStatus === 'string');
  });

  it('correctly decodes token expiry from JWT format', () => {
    // Generate a test JWT with an exp claim in the future
    const expFuture = Math.floor(Date.now() / 1000) + 7200;
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({ exp: expFuture, sub: 'test-user' })).toString('base64');
    const fakeJwt = `${header}.${payload}.fakesignature`;

    const decoded = containerTrackingClient.getTokenExpiry(fakeJwt);
    assert.equal(decoded, expFuture);
  });
});
