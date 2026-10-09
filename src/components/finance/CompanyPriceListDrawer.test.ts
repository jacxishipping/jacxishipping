import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeShippingRateConfig,
  type AuctionRateEntry,
} from '@/lib/shipping-rate-calculator';

describe('company price list inside ledger helpers', () => {
  const sampleAuctionRates: AuctionRateEntry[] = [
    { stateCode: 'GA', branch: 'Atlanta South', city: 'Atlanta', total: 1250, loadingPoint: 'Savannah' },
    { stateCode: 'TX', branch: 'Dallas', city: 'Dallas', total: 1100, loadingPoint: 'Houston' },
    { stateCode: 'TX', branch: 'Houston', city: 'Houston', total: 1050, loadingPoint: 'Houston' },
    { stateCode: 'CA', branch: 'Los Angeles', city: 'Los Angeles', total: 1400, loadingPoint: 'Long Beach' },
  ];

  it('normalizes shipping rate config correctly for drawer display', () => {
    const config = normalizeShippingRateConfig({
      destinationLabel: 'Islam Qala, Afghanistan',
      auctionRates: sampleAuctionRates,
      stateRates: { GA: 1250, TX: 1100, CA: 1400 },
    });

    assert.equal(config.destinationLabel, 'Islam Qala, Afghanistan');
    assert.equal(config.auctionRates.length, 4);
    assert.equal(config.stateRates.GA, 1250);
    assert.equal(config.stateRates.TX, 1100);
    assert.equal(config.stateRates.CA, 1400);
  });

  it('filters auction lanes by query across state, branch, city, loadingPoint', () => {
    const q = 'dallas';
    const matches = sampleAuctionRates.filter((r) =>
      [r.stateCode, r.branch, r.city, r.loadingPoint || '', String(r.total)]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );

    assert.equal(matches.length, 1);
    assert.equal(matches[0].branch, 'Dallas');
    assert.equal(matches[0].total, 1100);
  });

  it('filters auction lanes by state filter', () => {
    const selectedState = 'TX';
    const matches = sampleAuctionRates.filter((r) => r.stateCode.toUpperCase() === selectedState);

    assert.equal(matches.length, 2);
    assert.deepEqual(matches.map((m) => m.branch), ['Dallas', 'Houston']);
  });

  it('matches shipment lane context correctly for highlighting inside company ledger', () => {
    const shipmentHighlight = {
      stateCode: 'GA',
      city: 'Atlanta',
      branch: 'Atlanta South',
    };

    const isMatch = (row: AuctionRateEntry) => {
      if (shipmentHighlight.stateCode && row.stateCode.toUpperCase() !== shipmentHighlight.stateCode) return false;
      if (shipmentHighlight.branch && row.branch.toLowerCase().includes(shipmentHighlight.branch.toLowerCase())) return true;
      if (shipmentHighlight.city && row.city.toLowerCase().includes(shipmentHighlight.city.toLowerCase())) return true;
      return false;
    };

    const matched = sampleAuctionRates.filter(isMatch);
    assert.equal(matched.length, 1);
    assert.equal(matched[0].stateCode, 'GA');
    assert.equal(matched[0].total, 1250);
  });
});
