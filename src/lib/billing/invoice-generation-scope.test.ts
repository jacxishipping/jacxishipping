import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateInvoicePDF } from '@/lib/utils/generateInvoicePDF';

describe('Invoice PDF and scope resolution', () => {
  it('includes vehicle VIN and container number when an invoice has both shipment and container', async () => {
    const invoice = {
      invoiceNumber: 'INV-2026-0001',
      issueDate: '2026-10-27T00:00:00.000Z',
      dueDate: '2026-11-26T00:00:00.000Z',
      paidDate: null,
      status: 'DRAFT',
      subtotal: 1500,
      tax: 0,
      discount: 0,
      total: 1500,
      paymentMethod: null,
      paymentReference: null,
      notes: null,
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1 555-1234',
        address: '123 Main St',
        city: 'New York',
        country: 'USA',
      },
      container: {
        containerNumber: 'MSKU9876543',
        trackingNumber: 'TRK-9876',
        vesselName: 'Maersk Mc-Kinney',
        loadingPort: 'New York',
        destinationPort: 'Jebel Ali',
      },
      shipment: {
        id: 'shipment-1',
        vehicleType: 'Sedan',
        vehicleMake: 'Toyota',
        vehicleModel: 'Camry',
        vehicleYear: 2022,
        vehicleVIN: '4T1B11HK5NU123456',
        vehicleColor: 'Silver',
        paymentStatus: 'PENDING',
      },
      lineItems: [
        {
          id: 'item-1',
          description: 'Ocean Freight for 2022 Toyota Camry',
          type: 'SHIPPING_FEE',
          quantity: 1,
          unitPrice: 1500,
          amount: 1500,
          shipment: {
            vehicleYear: 2022,
            vehicleMake: 'Toyota',
            vehicleModel: 'Camry',
            vehicleVIN: '4T1B11HK5NU123456',
          },
        },
      ],
    };

    const doc = await generateInvoicePDF(invoice as any);
    assert.ok(doc, 'PDF document should be generated');

    // Extract text from the generated PDF pages
    const textOutput = (doc as any).internal.pages.join(' ');

    // Must include the vehicle make, model, year, VIN, and color
    assert.match(textOutput, /Toyota/i, 'PDF should include vehicle make');
    assert.match(textOutput, /Camry/i, 'PDF should include vehicle model');
    assert.match(textOutput, /4T1B11HK5NU123456/, 'PDF should include vehicle VIN');
    assert.match(textOutput, /Silver/i, 'PDF should include vehicle color');

    // Must also include container number and shipping details
    assert.match(textOutput, /MSKU9876543/, 'PDF should include container number');
    assert.match(textOutput, /Maersk Mc-Kinney/i, 'PDF should include vessel name');
  });

  it('generates container invoice without single vehicle header when multiple vehicles are present', async () => {
    const invoice = {
      invoiceNumber: 'INV-2026-0002',
      issueDate: '2026-10-27T00:00:00.000Z',
      dueDate: '2026-11-26T00:00:00.000Z',
      paidDate: null,
      status: 'SENT',
      subtotal: 3000,
      tax: 0,
      discount: 0,
      total: 3000,
      paymentMethod: null,
      paymentReference: null,
      notes: null,
      user: {
        name: 'Fleet Customer',
        email: 'fleet@example.com',
        phone: null,
        address: null,
        city: null,
        country: null,
      },
      container: {
        containerNumber: 'MSKU1112233',
        trackingNumber: 'TRK-111',
        vesselName: 'Ever Given',
        loadingPort: 'Savannah',
        destinationPort: 'Dubai',
      },
      shipment: null, // Container invoice
      lineItems: [
        {
          id: 'item-1',
          description: 'Ocean Freight - Car 1',
          type: 'SHIPPING_FEE',
          quantity: 1,
          unitPrice: 1500,
          amount: 1500,
          shipment: {
            vehicleYear: 2021,
            vehicleMake: 'Honda',
            vehicleModel: 'Civic',
            vehicleVIN: '1HGCR2F83HA000001',
          },
        },
        {
          id: 'item-2',
          description: 'Ocean Freight - Car 2',
          type: 'SHIPPING_FEE',
          quantity: 1,
          unitPrice: 1500,
          amount: 1500,
          shipment: {
            vehicleYear: 2023,
            vehicleMake: 'BMW',
            vehicleModel: 'X5',
            vehicleVIN: '5UXCR6C09P9000002',
          },
        },
      ],
    };

    const doc = await generateInvoicePDF(invoice as any);
    assert.ok(doc, 'PDF document should be generated');

    const textOutput = (doc as any).internal.pages.join(' ');
    assert.match(textOutput, /MSKU1112233/, 'PDF should include container number');
    assert.match(textOutput, /1HGCR2F83HA000001/, 'PDF should include VIN for car 1');
    assert.match(textOutput, /5UXCR6C09P9000002/, 'PDF should include VIN for car 2');
  });
});
