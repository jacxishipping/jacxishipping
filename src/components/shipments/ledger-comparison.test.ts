import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Ledger Comparison Calculations & Discrepancies', () => {
  test('flags a deficit when carrier cost exceeds customer charge', () => {
    const customerAmount = 400;
    const carrierCost = 450;
    const marginDiff = customerAmount - carrierCost;
    const isDeficit = carrierCost > customerAmount;
    const marginPct = customerAmount > 0 ? (marginDiff / customerAmount) * 100 : 0;

    assert.equal(isDeficit, true);
    assert.equal(marginDiff, -50);
    assert.equal(Math.round(marginPct * 10) / 10, -12.5);
  });

  test('calculates positive profit margin when customer charge exceeds carrier cost', () => {
    const customerAmount = 600;
    const carrierCost = 450;
    const marginDiff = customerAmount - carrierCost;
    const isDeficit = carrierCost > customerAmount;
    const marginPct = (marginDiff / customerAmount) * 100;

    assert.equal(isDeficit, false);
    assert.equal(marginDiff, 150);
    assert.equal(marginPct, 25);
  });

  test('correctly identifies date range presets', () => {
    const now = new Date('2026-11-15T12:00:00Z');
    const within3Days = new Date('2026-11-12T12:00:00Z');
    const within20Days = new Date('2026-10-28T12:00:00Z');
    const twoMonthsAgo = new Date('2026-09-01T12:00:00Z');

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 7 days check
    assert.equal(within3Days >= sevenDaysAgo, true);
    assert.equal(within20Days >= sevenDaysAgo, false);

    // 30 days check
    assert.equal(within20Days >= thirtyDaysAgo, true);
    assert.equal(twoMonthsAgo >= thirtyDaysAgo, false);
  });
});

