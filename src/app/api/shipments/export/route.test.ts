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
});
