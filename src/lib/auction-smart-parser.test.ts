import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseAuctionUrl, parseAuctionText } from './auction-smart-parser';

describe('Auction Smart Parser (Zero-Proxy / Free)', () => {
  it('parses Copart URLs accurately', () => {
    const url = 'https://www.copart.com/lot/82341234/2022-toyota-camry-tx-dallas';
    const parsed = parseAuctionUrl(url);

    assert.ok(parsed);
    assert.equal(parsed.lotNumber, '82341234');
    assert.equal(parsed.auctionName, 'Copart');
    assert.equal(parsed.vehicleYear, '2022');
    assert.equal(parsed.vehicleMake, 'TOYOTA');
    assert.equal(parsed.vehicleModel, 'CAMRY TX DALLAS');
  });

  it('parses IAAI URLs accurately', () => {
    const url = 'https://www.iaai.com/VehicleDetail/39182312~US';
    const parsed = parseAuctionUrl(url);

    assert.ok(parsed);
    assert.equal(parsed.lotNumber, '39182312');
    assert.equal(parsed.auctionName, 'IAAI');
  });

  it('parses copied Copart text details with VIN, damage, keys, and location', async () => {
    const text = `
      Lot # 50234124
      2021 HONDA ACCORD SPORT
      VIN: 1HGCV1F38MA123456
      Primary Damage: FRONT END
      Secondary Damage: MINOR DENT/SCRATCHES
      Location: TX - DALLAS SOUTH
      Keys: YES
      Title: TX - SALVAGE TITLE
      Color: BLUE
      Odometer: 34,210 mi (ACTUAL)
      Transmission: AUTOMATIC
      Engine: 1.5L 4
      Sale Price: $14,200
    `;

    const parsed = await parseAuctionText(text);

    assert.equal(parsed.lotNumber, '50234124');
    assert.equal(parsed.vehicleVIN, '1HGCV1F38MA123456');
    assert.equal(parsed.vehicleYear, '2021');
    assert.equal(parsed.vehicleMake, 'HONDA');
    assert.equal(parsed.vehicleModel, 'ACCORD SPORT');
    assert.equal(parsed.primaryDamage, 'FRONT END');
    assert.equal(parsed.hasKey, true);
    assert.equal(parsed.hasTitle, true);
    assert.equal(parsed.vehicleColor, 'BLUE');
    assert.equal(parsed.purchasePrice, 14200);
    assert.equal(parsed.purchaseLocation, 'TX - DALLAS SOUTH');
  });
});
