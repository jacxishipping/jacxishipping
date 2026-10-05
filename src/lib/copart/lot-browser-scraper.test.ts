import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseCopartUrlSlug, normalizeRawSolrPayload } from './lot-browser-scraper';
import type { CopartLotRawPayload } from './lot-scraper';

describe('Copart In-House Native Scraper', () => {
  it('parses redirect slug with clean title, year, make, model, state, and yard', () => {
    const slugUrl = 'https://www.copart.com/lot/59292076/clean-title-2010-toyota-4runner-limited-co-denver-central';
    const parsed = parseCopartUrlSlug(slugUrl, '59292076', 'https://www.copart.com/lot/59292076');

    assert.ok(parsed);
    assert.equal(parsed.lotNumber, '59292076');
    assert.equal(parsed.auctionName, 'Copart');
    assert.equal(parsed.vehicleYear, '2010');
    assert.equal(parsed.vehicleMake, 'TOYOTA');
    assert.equal(parsed.vehicleModel, '4runner Limited');
    assert.equal(parsed.hasTitle, true);
    assert.equal(parsed.purchaseLocation, 'Denver Central, CO');
    assert.equal(parsed.vehicleType, 'suv');
    assert.equal(parsed.source, 'copart-native-browser');
  });

  it('parses redirect slug with location prefix (in-city format)', () => {
    const slugUrl = 'https://www.copart.com/lot/80214115/2018-toyota-prius-in-indianapolis';
    const parsed = parseCopartUrlSlug(slugUrl, '80214115', 'https://www.copart.com/lot/80214115');

    assert.ok(parsed);
    assert.equal(parsed.lotNumber, '80214115');
    assert.equal(parsed.vehicleYear, '2018');
    assert.equal(parsed.vehicleMake, 'TOYOTA');
    assert.equal(parsed.vehicleModel, 'Prius');
    assert.equal(parsed.purchaseLocation, 'Indianapolis');
    assert.equal(parsed.vehicleType, 'sedan');
  });

  it('normalizes raw Solr payload properly', () => {
    const rawPayload: CopartLotRawPayload = {
      lotNumberStr: '59292076',
      brand: 'COPART',
      mkn: 'TOYOTA',
      lm: '4RUNNER',
      lcy: 2010,
      fv: 'JTEBU5JR4A5******',
      clr: 'WHITE',
      bstl: 'SUV',
      hk: 'Y',
      htsmn: 'Y',
      locCity: 'DENVER',
      locState: 'CO',
      locCountry: 'USA',
      dd: 'MECHANICAL',
      tmtp: 'AUTOMATIC',
      egn: '4.0L 6',
      cy: '6',
      yn: 'CO - DENVER CENTRAL',
    };

    const normalized = normalizeRawSolrPayload(
      rawPayload,
      '59292076',
      'https://www.copart.com/lot/59292076',
      'copart-native-browser',
    );

    assert.equal(normalized.lotNumber, '59292076');
    assert.equal(normalized.vehicleMake, 'TOYOTA');
    assert.equal(normalized.vehicleModel, '4RUNNER');
    assert.equal(normalized.vehicleYear, '2010');
    assert.equal(normalized.vehicleVIN, 'JTEBU5JR4A5******');
    assert.equal(normalized.vehicleColor, 'WHITE');
    assert.equal(normalized.hasKey, true);
    assert.equal(normalized.hasTitle, true);
    assert.equal(normalized.purchaseLocation, 'DENVER, CO, USA');
    assert.ok(normalized.internalNotes?.includes('Damage: MECHANICAL'));
    assert.ok(normalized.internalNotes?.includes('Transmission: AUTOMATIC'));
    assert.equal(normalized.source, 'copart-native-browser');
  });
});
