import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeAccessCode } from './session';
import {
  escapeHtml,
  formatProgressBar,
  formatShipmentCard,
  formatStatusBadge,
  type TelegramShipmentSummary,
} from './services';
import { getWebhookUrl } from './config';

describe('Telegram Utilities & Sanitization', () => {
  it('should sanitize 8-digit access codes correctly', () => {
    assert.strictEqual(sanitizeAccessCode('  abcd-1234 '), 'ABCD1234');
    assert.strictEqual(sanitizeAccessCode('1234 5678'), '12345678');
    assert.strictEqual(sanitizeAccessCode('JACX_9999'), 'JACX9999');
    assert.strictEqual(sanitizeAccessCode(''), '');
  });

  it('should generate correct webhook URL from app URL', () => {
    assert.strictEqual(
      getWebhookUrl('https://jacxishipping.com'),
      'https://jacxishipping.com/api/telegram/webhook'
    );
    assert.strictEqual(
      getWebhookUrl('https://jacxishipping.com/'),
      'https://jacxishipping.com/api/telegram/webhook'
    );
  });

  it('should format progress bar properly', () => {
    assert.strictEqual(formatProgressBar(0), '░░░░░░░░░░ 0%');
    assert.strictEqual(formatProgressBar(50), '█████░░░░░ 50%');
    assert.strictEqual(formatProgressBar(100), '██████████ 100%');
  });

  it('should format status badge properly', () => {
    assert.strictEqual(formatStatusBadge('ON_HAND'), '🟡 Yard On-Hand');
    assert.strictEqual(formatStatusBadge('IN_TRANSIT'), '🌊 Ocean Transit');
    assert.strictEqual(formatStatusBadge('DELIVERED'), '✅ Delivered');
  });

  it('should escape HTML safely', () => {
    assert.strictEqual(escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert("xss")&lt;/script&gt;');
    assert.strictEqual(escapeHtml('BMW & Audi'), 'BMW &amp; Audi');
  });

  it('should format shipment card with vehicle info and photo count', () => {
    const mockShipment: TelegramShipmentSummary = {
      id: 'ship-123',
      vehicleLabel: '2023 BMW X5',
      vehicleYear: 2023,
      vehicleMake: 'BMW',
      vehicleModel: 'X5',
      vehicleVIN: '5UXCR6C00N1234567',
      vehicleColor: 'Alpine White',
      lotNumber: '78291024',
      auctionName: 'Copart Atlanta',
      status: 'IN_TRANSIT',
      statusLabel: '🌊 Ocean Transit',
      paymentStatus: 'COMPLETED',
      price: 1850,
      containerNumber: 'MSCU9876543',
      vesselName: 'MSC GULSUN',
      voyageNumber: '240W',
      shippingLine: 'MSC',
      loadingPort: 'Savannah, GA',
      destinationPort: 'Jebel Ali, UAE',
      departureDate: '10/15/2026',
      estimatedArrival: '11/05/2026',
      actualArrival: null,
      currentLocation: 'Atlantic Ocean',
      progress: 60,
      arrivalPhotos: ['https://jacxishipping.com/photos/1.jpg'],
      vehiclePhotos: ['https://jacxishipping.com/photos/2.jpg'],
      totalPhotosCount: 2,
      createdAt: '10/01/2026',
    };

    const card = formatShipmentCard(mockShipment);
    assert.ok(card.includes('2023 BMW X5'));
    assert.ok(card.includes('5UXCR6C00N1234567'));
    assert.ok(card.includes('MSCU9876543'));
    assert.ok(card.includes('MSC GULSUN'));
    assert.ok(card.includes('2 photo(s)'));
    assert.ok(card.includes('✅ Paid'));
  });
});
