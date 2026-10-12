import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generatePriceListPrintHtml } from './price-list-print';

describe('price list print HTML generator', () => {
  it('generates a full printable HTML document with auction lanes and company info', () => {
    const html = generatePriceListPrintHtml({
      companyName: 'AFG Shipping',
      companyType: 'Shipping',
      priceListName: 'AFG Shipping 2026',
      destinationLabel: 'Kabul via Mersin',
      sourceFileName: 'rates.pdf',
      auctionRates: [
        {
          stateCode: 'AL',
          branch: 'Florence',
          city: 'Florence',
          total: 1288,
          loadingPoint: 'SAVANNAH, GA',
        },
        {
          stateCode: 'TX',
          branch: 'Dallas',
          city: 'Dallas',
          total: 1450,
          loadingPoint: 'HOUSTON, TX',
        },
      ],
      stateRates: {
        AL: 1200,
        TX: 1400,
      },
      filterInfo: {
        selectedState: 'AL',
      },
    });

    assert.ok(html.includes('AFG Shipping'));
    assert.ok(html.includes('Kabul via Mersin'));
    assert.ok(html.includes('Florence'));
    assert.ok(html.includes('$1,288'));
    assert.ok(html.includes('State: AL'));
    assert.ok(html.includes('window.print()'));
    assert.ok(html.includes('@media print'));
  });

  it('handles empty rates gracefully without errors', () => {
    const html = generatePriceListPrintHtml({
      companyName: 'Test Logistics',
      auctionRates: [],
      stateRates: {},
    });

    assert.ok(html.includes('Test Logistics'));
    assert.ok(html.includes('No auction rate rows available'));
  });
});
