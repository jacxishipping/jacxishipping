
import { test, describe, it, before, after, mock } from 'node:test';
import assert from 'node:assert';
import { exportToCSV, exportToCSVWithHeaders, exportToExcel, formatDataForExport } from './export.ts';

describe('Export Utilities', () => {
  let originalDocument: any;
  let originalURL: any;
  let createdBlob: Blob | null = null;
  let createdLink: any = null;
  let clickedLink = false;
  let appendedLink = false;
  let removedLink = false;
  let revokedUrl: string | null = null;

  before(() => {
    originalDocument = global.document;
    originalURL = global.URL;

    // Mock document
    global.document = {
      createElement: (tag: string) => {
        if (tag === 'a') {
          createdLink = {
            setAttribute: (name: string, value: string) => {
              createdLink[name] = value;
            },
            style: {},
            click: () => {
              clickedLink = true;
            },
          };
          return createdLink;
        }
        return {};
      },
      body: {
        appendChild: (node: any) => {
          if (node === createdLink) appendedLink = true;
        },
        removeChild: (node: any) => {
          if (node === createdLink) removedLink = true;
        },
      },
    } as any;

    // Mock URL
    global.URL.createObjectURL = (blob: Blob) => {
      createdBlob = blob;
      return 'blob:url';
    };
    global.URL.revokeObjectURL = (url: string) => {
      revokedUrl = url;
    };
  });

  after(() => {
    global.document = originalDocument;
    global.URL = originalURL;
  });

  it('exportToCSV should create a CSV file and download it', async () => {
    const data = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
    const filename = 'users';

    // Reset mocks
    createdBlob = null;
    createdLink = null;
    clickedLink = false;
    appendedLink = false;
    removedLink = false;
    revokedUrl = null;

    exportToCSV(data, filename);

    assert.ok(createdBlob, 'Blob should be created');
    const csvBlob = createdBlob as Blob;
    assert.strictEqual(csvBlob.type, 'text/csv;charset=utf-8;');

    const text = await csvBlob.text();
    assert.ok(text.includes('name,age'), 'Header should be present');
    assert.ok(text.includes('John,30'), 'Data row 1 should be present');
    assert.ok(text.includes('Jane,25'), 'Data row 2 should be present');

    assert.ok(createdLink, 'Link element should be created');
    assert.strictEqual(createdLink.href, 'blob:url');
    assert.ok(createdLink.download.startsWith('users-'), 'Download filename should start with provided filename');
    assert.ok(createdLink.download.endsWith('.csv'), 'Download filename should end with .csv');

    assert.ok(appendedLink, 'Link should be appended to body');
    assert.ok(clickedLink, 'Link should be clicked');
    assert.ok(removedLink, 'Link should be removed from body');
    assert.strictEqual(revokedUrl, 'blob:url', 'URL should be revoked');
  });

  it('exportToCSVWithHeaders should use custom headers', async () => {
    const data = [{ name: 'John', age: 30 }, { name: 'Jane', age: 25 }];
    const headers: Array<{ key: 'name' | 'age'; label: string }> = [
      { key: 'name', label: 'Full Name' },
      { key: 'age', label: 'Years' },
    ];
    const filename = 'users-custom';

    exportToCSVWithHeaders(data, headers, filename);

    const text = await createdBlob!.text();
    assert.ok(text.includes('Full Name,Years'), 'Custom headers should be used');
    assert.ok(text.includes('John,30'), 'Data should be present');
  });

  it('exportToExcel should create a CSV with BOM', async () => {
    const data = [{ name: 'John', age: 30 }];
    const filename = 'users-excel';

    exportToExcel(data, filename);

    const buffer = await createdBlob!.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check for UTF-8 BOM: EF BB BF
    assert.strictEqual(bytes[0], 0xEF, 'First byte should be 0xEF');
    assert.strictEqual(bytes[1], 0xBB, 'Second byte should be 0xBB');
    assert.strictEqual(bytes[2], 0xBF, 'Third byte should be 0xBF');

    const text = await createdBlob!.text();
    assert.ok(text.includes('name,age'), 'Header should be present');
  });

  it('formatDataForExport should format dates and booleans', () => {
    const date = new Date('2023-01-01T00:00:00.000Z');
    const data = [
      { id: 1, active: true, created: date, details: { a: 1 } }
    ];

    const formatted = formatDataForExport(data);

    assert.strictEqual(formatted[0].active, 'Yes');
    assert.strictEqual(formatted[0].created, '2023-01-01');
    assert.strictEqual(formatted[0].details, '{"a":1}');
  });

  it('should handle empty data', () => {
    assert.throws(() => exportToCSV([], 'test'), /No data to export/);
  });

  it('should handle special characters in CSV', async () => {
    const data = [{ note: 'Hello, "World"' }];
    exportToCSV(data, 'test');

    const text = await createdBlob!.text();
    assert.ok(text.includes('"Hello, ""World"""'), 'Quotes and commas should be escaped');
  });

  it('exportToExcelWithHeaders should format headers with BOM', async () => {
    const { exportToExcelWithHeaders } = await import('./export.ts');
    const data = [{ name: 'Toyota Camry', vin: '4T1BF1FK5' }];
    exportToExcelWithHeaders(
      data,
      [
        { key: 'name', label: 'Vehicle Title' },
        { key: 'vin', label: 'VIN Code' },
      ],
      'shipments-excel'
    );

    const buffer = await createdBlob!.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    assert.strictEqual(bytes[0], 0xEF);
    assert.strictEqual(bytes[1], 0xBB);
    assert.strictEqual(bytes[2], 0xBF);

    const text = await createdBlob!.text();
    assert.ok(text.includes('Vehicle Title,VIN Code'));
    assert.ok(text.includes('Toyota Camry,4T1BF1FK5'));
  });

  it('formatShipmentForExport should properly normalize shipment records', async () => {
    const { formatShipmentForExport } = await import('./export.ts');
    const raw = {
      id: 'ship-123',
      vehicleYear: 2022,
      vehicleMake: 'Honda',
      vehicleModel: 'Accord',
      vehicleVIN: '1HGCV1F34',
      status: 'ON_HAND',
      purchasePrice: 15000,
      purchasePricePaid: 5000,
      user: { name: 'Ahmad Khan', email: 'ahmad@example.com' },
      container: { containerNumber: 'MSKU1234567' },
    };

    const formatted = formatShipmentForExport(raw);
    assert.strictEqual(formatted.vehicle, '2022 Honda Accord');
    assert.strictEqual(formatted.vin, '1HGCV1F34');
    assert.strictEqual(formatted.status, 'ON HAND');
    assert.strictEqual(formatted.purchasePrice, '15000.00');
    assert.strictEqual(formatted.purchasePricePaid, '5000.00');
    assert.strictEqual(formatted.purchaseRemaining, '10000.00');
    assert.strictEqual(formatted.container, 'MSKU1234567');
    assert.strictEqual(formatted.customerName, 'Ahmad Khan');
  });

  it('formatShipmentForExport with isCustomer=true should redact internal admin/finance fields', async () => {
    const { formatShipmentForExport, CUSTOMER_SHIPMENT_EXPORT_HEADERS, sanitizeShipmentForCustomer } = await import('./export.ts');
    const raw = {
      id: 'ship-123',
      vehicleYear: 2022,
      vehicleMake: 'Honda',
      vehicleModel: 'Accord',
      vehicleVIN: '1HGCV1F34',
      status: 'ON_HAND',
      purchasePrice: 15000,
      purchasePricePaid: 5000,
      user: { name: 'Ahmad Khan', email: 'ahmad@example.com', phone: '+123456789' },
      container: { containerNumber: 'MSKU1234567', loadingPort: 'Savannah', destinationPort: 'Jebel Ali' },
      transit: { referenceNumber: 'TRN-9988' },
      dispatch: { referenceNumber: 'DISP-7766' },
      yardReceived: true,
    };

    const formatted = formatShipmentForExport(raw, true);

    // Customer-allowed fields are preserved
    assert.strictEqual(formatted.vehicle, '2022 Honda Accord');
    assert.strictEqual(formatted.vin, '1HGCV1F34');
    assert.strictEqual(formatted.status, 'ON HAND');
    assert.strictEqual(formatted.yardReceived, 'Yes');
    assert.strictEqual(formatted.container, 'MSKU1234567');
    assert.strictEqual(formatted.loadingPort, 'Savannah');
    assert.strictEqual(formatted.destinationPort, 'Jebel Ali');

    // Internal administrative fields are redacted
    assert.strictEqual(formatted.customerName, '');
    assert.strictEqual(formatted.customerEmail, '');
    assert.strictEqual(formatted.customerPhone, '');
    assert.strictEqual(formatted.transit, '');
    assert.strictEqual(formatted.dispatch, '');
    assert.strictEqual(formatted.purchasePrice, '');
    assert.strictEqual(formatted.purchasePricePaid, '');
    assert.strictEqual(formatted.purchaseRemaining, '');

    // Sanitization retains only allowed headers
    const sanitized = sanitizeShipmentForCustomer(formatted);
    const keys = Object.keys(sanitized);
    assert.ok(!keys.includes('customerName'));
    assert.ok(!keys.includes('customerEmail'));
    assert.ok(!keys.includes('transit'));
    assert.ok(!keys.includes('dispatch'));
    assert.ok(!keys.includes('purchasePrice'));
    assert.strictEqual(keys.length, CUSTOMER_SHIPMENT_EXPORT_HEADERS.length);
  });

  it('exportShipments should support customer-safe export headers', async () => {
    const { exportShipments } = await import('./export.ts');
    const shipments = [
      {
        id: 'ship-customer',
        vehicleYear: 2023,
        vehicleMake: 'Tesla',
        vehicleModel: 'Model 3',
        vehicleVIN: '5YJ3E1EA8',
        status: 'IN_TRANSIT',
        purchasePrice: 35000,
        user: { name: 'Secret User', email: 'secret@user.com' },
        transit: { referenceNumber: 'INTERNAL-TR-1' },
      },
    ];

    exportShipments(shipments, 'csv', 'my-shipments', { isCustomer: true });

    const text = await createdBlob!.text();
    assert.ok(text.includes('Vehicle,VIN,Lot #,Auction'), 'Allowed headers should be present');
    assert.ok(!text.includes('Customer Email'), 'Customer Email header should NOT be present');
    assert.ok(!text.includes('Transit #'), 'Transit # header should NOT be present');
    assert.ok(!text.includes('Purchase Price'), 'Purchase Price header should NOT be present');
    assert.ok(!text.includes('Secret User'), 'Customer name value should NOT be present');
    assert.ok(!text.includes('INTERNAL-TR-1'), 'Transit ref should NOT be present');
    assert.ok(text.includes('2023 Tesla Model 3'), 'Vehicle info should be present');
  });

  it('formatShipmentForExport should correctly populate tracking, keys, title and fares', async () => {
    const { formatShipmentForExport } = await import('./export.ts');
    const raw = {
      id: 'shp-adv',
      vehicleYear: 2024,
      vehicleMake: 'Lexus',
      vehicleModel: 'RX350',
      vehicleVIN: '2T2BZMCA9',
      hasKey: true,
      hasTitle: true,
      titleStatus: 'DELIVERED',
      price: 1850,
      container: {
        containerNumber: 'OOLU9876543',
        departureDate: new Date('2026-03-10'),
        estimatedArrival: new Date('2026-04-05'),
      },
    };

    const formattedCustomer = formatShipmentForExport(raw, true);
    assert.strictEqual(formattedCustomer.hasKey, 'Yes');
    assert.strictEqual(formattedCustomer.titleStatus, 'DELIVERED');
    assert.strictEqual(formattedCustomer.shippingFare, '1850.00');
    assert.ok(formattedCustomer.trackingUrl.includes('2T2BZMCA9'));
    assert.ok(formattedCustomer.etd.length > 0);
    assert.ok(formattedCustomer.eta.length > 0);
  });

  it('exportToPrintableManifest should generate print window html', async () => {
    const { exportToPrintableManifest, formatShipmentForExport } = await import('./export.ts');
    let openedUrl = '';
    let writtenHtml = '';

    global.window = {
      location: { origin: 'http://localhost:3000' } as any,
      open: (url: string) => {
        openedUrl = url;
        return {
          document: {
            open: () => {},
            write: (html: string) => {
              writtenHtml = html;
            },
            close: () => {},
          },
        } as any;
      },
    } as any;

    const row = formatShipmentForExport({
      id: 'shp-print-1',
      vehicleYear: 2021,
      vehicleMake: 'Ford',
      vehicleModel: 'F-150',
      vehicleVIN: '1FTFW1E84',
    }, true);

    exportToPrintableManifest({
      title: 'Customer Vehicle Manifest',
      rows: [row],
      isCustomer: true,
    });

    assert.ok(writtenHtml.includes('Customer Vehicle Manifest'));
    assert.ok(writtenHtml.includes('2021 Ford F-150'));
    assert.ok(writtenHtml.includes('1FTFW1E84'));
    assert.ok(writtenHtml.includes('window.print()'));
  });
});

