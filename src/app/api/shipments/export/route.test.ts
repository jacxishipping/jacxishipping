import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import { GET } from './route';

describe('Shipments Export API Route', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const originalAuth = routeDeps.auth;
    try {
      (routeDeps as any).auth = async () => null as any;

      const req = new NextRequest('http://localhost:3000/api/shipments/export');
      const res = await GET(req);

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.strictEqual(data.message, 'Unauthorized');
    } finally {
      routeDeps.auth = originalAuth;
    }
  });

  it('exports shipments as CSV with BOM and headers for authenticated user', async () => {
    const originalAuth = routeDeps.auth;
    const originalFindMany = routeDeps.prisma.shipment.findMany;

    try {
      (routeDeps as any).auth = async () => ({
        user: { id: 'usr-admin', role: 'admin' },
      } as any);

      (routeDeps.prisma.shipment as any).findMany = async () => [
        {
          id: 'shp-1',
          vehicleType: 'SEDAN',
          vehicleMake: 'BMW',
          vehicleModel: '330i',
          vehicleYear: 2021,
          vehicleVIN: 'WBA330I12345',
          vehicleColor: 'Alpine White',
          lotNumber: '54889576',
          auctionName: 'Copart',
          status: 'IN_TRANSIT',
          createdAt: new Date('2026-01-15T10:00:00.000Z'),
          paymentStatus: 'PAID',
          serviceType: 'SHIPPING_ONLY',
          purchasePrice: 12000,
          user: { name: 'Sami Ahmad', email: 'sami@example.com', phone: '+123456789' },
          container: { containerNumber: 'MSKU9988771', loadingPort: 'Houston', destinationPort: 'Mersin', estimatedArrival: new Date('2026-03-01') },
          transit: null,
          dispatch: null,
          auditLogs: [],
          ledgerEntries: [],
        },
      ];

      const req = new NextRequest('http://localhost:3000/api/shipments/export?format=csv');
      const res = await GET(req);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('content-type'), 'text/csv; charset=utf-8');
      assert.ok(res.headers.get('content-disposition')?.includes('attachment; filename='));

      const text = await res.text();
      assert.ok(text.includes('Vehicle,VIN,Lot #,Auction'), 'Header should be present in CSV');
      assert.ok(text.includes('2021 BMW 330i'), 'Vehicle row should be present');
      assert.ok(text.includes('WBA330I12345'), 'VIN should be present');
      assert.ok(text.includes('MSKU9988771'), 'Container should be present');
    } finally {
      routeDeps.auth = originalAuth;
      routeDeps.prisma.shipment.findMany = originalFindMany;
    }
  });

  it('exports shipments as JSON when requested', async () => {
    const originalAuth = routeDeps.auth;
    const originalFindMany = routeDeps.prisma.shipment.findMany;

    try {
      (routeDeps as any).auth = async () => ({
        user: { id: 'usr-admin', role: 'admin' },
      } as any);

      (routeDeps.prisma.shipment as any).findMany = async () => [
        {
          id: 'shp-2',
          vehicleMake: 'Mercedes',
          vehicleModel: 'C300',
          vehicleYear: 2020,
          vehicleVIN: 'WDD2050401',
          status: 'ON_HAND',
          createdAt: new Date('2026-02-10T12:00:00.000Z'),
          purchasePrice: 18000,
          user: { name: 'John Doe', email: 'john@example.com' },
          auditLogs: [],
          ledgerEntries: [],
        },
      ];

      const req = new NextRequest('http://localhost:3000/api/shipments/export?format=json');
      const res = await GET(req);

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.count, 1);
      assert.strictEqual(data.shipments[0].vehicle, '2020 Mercedes C300');
      assert.strictEqual(data.shipments[0].vin, 'WDD2050401');
    } finally {
      routeDeps.auth = originalAuth;
      routeDeps.prisma.shipment.findMany = originalFindMany;
    }
  });

  it('restricts customer role to their own shipments and only allowed data columns', async () => {
    const originalAuth = routeDeps.auth;
    const originalFindMany = routeDeps.prisma.shipment.findMany;
    let capturedWhere: any = null;

    try {
      (routeDeps as any).auth = async () => ({
        user: { id: 'usr-customer-42', role: 'user' },
      } as any);

      (routeDeps.prisma.shipment as any).findMany = async (args: any) => {
        capturedWhere = args.where;
        return [
          {
            id: 'shp-cust-1',
            vehicleType: 'SUV',
            vehicleMake: 'Toyota',
            vehicleModel: 'RAV4',
            vehicleYear: 2023,
            vehicleVIN: '2T3F1RFV7PW',
            vehicleColor: 'Magnetic Gray',
            lotNumber: '88776655',
            auctionName: 'Manheim',
            status: 'IN_TRANSIT',
            createdAt: new Date('2026-03-01T08:00:00.000Z'),
            paymentStatus: 'PAID',
            serviceType: 'SHIPPING_ONLY',
            purchasePrice: 24000,
            user: { name: 'Customer John', email: 'john@cust.com', phone: '+1999888777' },
            container: { containerNumber: 'TGHU1122334', loadingPort: 'Newark', destinationPort: 'Dubai', estimatedArrival: new Date('2026-04-15') },
            transit: { referenceNumber: 'SECRET-TRANSIT-1' },
            dispatch: { referenceNumber: 'SECRET-DISP-1' },
            auditLogs: [],
            ledgerEntries: [],
          },
        ];
      };

      // Even if customer attempts to query another customer's userId, server must force customer's own session user id
      const req = new NextRequest('http://localhost:3000/api/shipments/export?format=csv&userId=usr-other-hacker');
      const res = await GET(req);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(capturedWhere.userId, 'usr-customer-42', 'Must enforce session user ID for customer');

      const disposition = res.headers.get('content-disposition') || '';
      assert.ok(disposition.includes('my-shipments-export-'), 'Filename should be customer specific');

      const text = await res.text();
      // Allowed columns
      assert.ok(text.includes('Vehicle,VIN,Lot #,Auction,Vehicle Type,Color,Status,Yard Received,Container #,Loading Port,Destination Port,ETA,Payment Status,Created Date'));
      assert.ok(text.includes('2023 Toyota RAV4'));
      assert.ok(text.includes('2T3F1RFV7PW'));
      assert.ok(text.includes('TGHU1122334'));
      assert.ok(text.includes('Newark'));
      assert.ok(text.includes('Dubai'));

      // Disallowed administrative and financial columns must NOT be present
      assert.ok(!text.includes('Customer Phone'));
      assert.ok(!text.includes('Customer Email'));
      assert.ok(!text.includes('Transit #'));
      assert.ok(!text.includes('Dispatch #'));
      assert.ok(!text.includes('Purchase Price'));
      assert.ok(!text.includes('Balance Remaining'));
      assert.ok(!text.includes('SECRET-TRANSIT-1'));
      assert.ok(!text.includes('SECRET-DISP-1'));
      assert.ok(!text.includes('john@cust.com'));
      assert.ok(!text.includes('Customer John'));
    } finally {
      routeDeps.auth = originalAuth;
      routeDeps.prisma.shipment.findMany = originalFindMany;
    }
  });

  it('sanitizes customer JSON exports to only allowed data fields', async () => {
    const originalAuth = routeDeps.auth;
    const originalFindMany = routeDeps.prisma.shipment.findMany;

    try {
      (routeDeps as any).auth = async () => ({
        user: { id: 'usr-customer-42', role: 'user' },
      } as any);

      (routeDeps.prisma.shipment as any).findMany = async () => [
        {
          id: 'shp-cust-2',
          vehicleMake: 'Honda',
          vehicleModel: 'CR-V',
          vehicleYear: 2022,
          vehicleVIN: '7FARW1H84NE',
          status: 'ON_HAND',
          createdAt: new Date('2026-02-15T09:00:00.000Z'),
          purchasePrice: 21000,
          user: { name: 'Sensitive Name', email: 'secret@email.com' },
          transit: { referenceNumber: 'SECRET-TR' },
          auditLogs: [],
          ledgerEntries: [],
        },
      ];

      const req = new NextRequest('http://localhost:3000/api/shipments/export?format=json');
      const res = await GET(req);

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.count, 1);
      const row = data.shipments[0];

      assert.strictEqual(row.vehicle, '2022 Honda CR-V');
      assert.strictEqual(row.vin, '7FARW1H84NE');
      // Verify no sensitive keys leaked
      assert.strictEqual(row.customerName, undefined);
      assert.strictEqual(row.customerEmail, undefined);
      assert.strictEqual(row.transit, undefined);
      assert.strictEqual(row.dispatch, undefined);
      assert.strictEqual(row.purchasePrice, undefined);
    } finally {
      routeDeps.auth = originalAuth;
      routeDeps.prisma.shipment.findMany = originalFindMany;
    }
  });
});
