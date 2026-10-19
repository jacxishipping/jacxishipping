import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractStateCode } from './shipment-price-list-lifecycle';

describe('shipment-price-list-lifecycle helpers', () => {
  it('extracts two-letter state codes from addresses and locations', () => {
    assert.equal(extractStateCode('GA'), 'GA');
    assert.equal(extractStateCode('Atlanta, GA'), 'GA');
    assert.equal(extractStateCode('Dallas, TX 75201'), 'TX');
    assert.equal(extractStateCode('Copart Los Angeles, CA'), 'CA');
    assert.equal(extractStateCode('Miami FL'), 'FL');
    assert.equal(extractStateCode(''), null);
    assert.equal(extractStateCode(null), null);
    assert.equal(extractStateCode('Unknown Location'), null);
  });
});
