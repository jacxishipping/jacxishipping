import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTrackingSource } from '@/components/tracking/TrackingSourceBadge';

test('parseTrackingSource parses distinct API sources accurately', async (t) => {
  await t.test('detects Supabase ContainerTracking API', () => {
    const res = parseTrackingSource('Supabase Tracking API');
    assert.equal(res.key, 'supabase');
    assert.equal(res.label, 'Supabase API');
  });

  await t.test('detects Turkon Line Online API', () => {
    const res = parseTrackingSource('Turkon Online API');
    assert.equal(res.key, 'turkon');
    assert.equal(res.label, 'Turkon API');
  });

  await t.test('detects PGL System API', () => {
    const res = parseTrackingSource('PGL System API');
    assert.equal(res.key, 'pgl');
    assert.equal(res.label, 'PGL System');
  });

  await t.test('detects Ocean Carrier API with specific carrier name', () => {
    const res = parseTrackingSource('Carrier API (Maersk Line)');
    assert.equal(res.key, 'carrier');
    assert.match(res.label, /Carrier API/);
  });

  await t.test('detects Webhook source', () => {
    const res = parseTrackingSource('Webhook');
    assert.equal(res.key, 'webhook');
    assert.equal(res.label, 'Webhook');
  });

  await t.test('detects Manual entry', () => {
    const res = parseTrackingSource('Manual');
    assert.equal(res.key, 'manual');
    assert.equal(res.label, 'Manual Entry');
  });

  await t.test('detects fallback generic API', () => {
    const res = parseTrackingSource('API');
    assert.equal(res.key, 'api');
    assert.equal(res.label, 'Tracking API');
  });

  await t.test('handles empty or null source gracefully', () => {
    const res = parseTrackingSource(null);
    assert.equal(res.key, 'unknown');
  });
});
