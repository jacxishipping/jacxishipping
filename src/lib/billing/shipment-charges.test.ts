import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { syncShipmentChargeFromLedgerEntry } from './shipment-charges';

describe('syncShipmentChargeFromLedgerEntry', () => {
  it('preserves a disputed shipment charge instead of re-approving it during ledger sync', async () => {
    const updates: any[] = [];
    const auditLogs: any[] = [];

    const db = {
      shipmentCharge: {
        findFirst: async () => ({
          id: 'charge-1',
          status: 'DISPUTED',
          invoiceId: null,
        }),
        update: async (args: any) => {
          updates.push(args);
          return { id: 'charge-1', status: args.data.status };
        },
        create: async () => ({ id: 'charge-2', status: 'APPROVED' }),
      },
      shipmentChargeAuditLog: {
        create: async (args: any) => {
          auditLogs.push(args);
          return args;
        },
      },
      shipment: {
        updateMany: async () => ({ count: 0 }),
      },
    } as any;

    await syncShipmentChargeFromLedgerEntry(db, {
      entryId: 'entry-1',
      userId: 'user-1',
      shipmentId: 'shipment-1',
      description: 'Fuel surcharge',
      type: 'DEBIT',
      amount: 150,
      transactionDate: new Date('2026-09-01'),
      transactionInfoType: 'SHIPPING_PAYMENT',
      notes: 'Fuel',
      metadata: { isExpense: true, expenseType: 'SHIPPING_FEE' },
      actorId: 'actor-1',
    });

    assert.equal(updates.length, 1);
    assert.equal(updates[0].data.status, 'DISPUTED');
    assert.equal(auditLogs.length, 1);
  });

  it('syncs an expense ledger entry even if metadata contains invoiceId without voiding it', async () => {
    const updates: any[] = [];
    const auditLogs: any[] = [];

    const db = {
      shipmentCharge: {
        findFirst: async () => ({
          id: 'charge-1',
          status: 'APPROVED',
          invoiceId: null,
          voidedAt: null,
        }),
        update: async (args: any) => {
          updates.push(args);
          return { id: 'charge-1', status: args.data.status };
        },
        create: async () => ({ id: 'charge-2', status: 'APPROVED' }),
      },
      shipmentChargeAuditLog: {
        create: async (args: any) => {
          auditLogs.push(args);
          return args;
        },
      },
      shipment: {
        updateMany: async () => ({ count: 0 }),
      },
    } as any;

    await syncShipmentChargeFromLedgerEntry(db, {
      entryId: 'entry-2',
      userId: 'user-1',
      shipmentId: 'shipment-1',
      description: 'Storage fee',
      type: 'DEBIT',
      amount: 200,
      transactionDate: new Date('2026-09-02'),
      transactionInfoType: 'STORAGE_PAYMENT',
      notes: 'Storage at port',
      metadata: {
        isExpense: true,
        expenseType: 'STORAGE_FEE',
        invoiceId: 'inv-123',
        invoiceNumber: 'INV-2026-0001',
      },
      actorId: 'actor-1',
    });

    assert.equal(updates.length, 1);
    assert.equal(updates[0].data.status, 'APPROVED');
    assert.notEqual(updates[0].data.status, 'VOID');
    assert.equal(updates[0].data.voidedAt, null);
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].data.action, 'SYNC_FROM_LEDGER');
  });

  it('restores a previously voided charge to approved status when syncing a valid expense ledger entry', async () => {
    const updates: any[] = [];
    const auditLogs: any[] = [];

    const db = {
      shipmentCharge: {
        findFirst: async () => ({
          id: 'charge-voided',
          status: 'VOID',
          invoiceId: null,
          voidedAt: new Date('2026-09-01'),
        }),
        update: async (args: any) => {
          updates.push(args);
          return { id: 'charge-voided', status: args.data.status };
        },
        create: async () => ({ id: 'charge-new', status: 'APPROVED' }),
      },
      shipmentChargeAuditLog: {
        create: async (args: any) => {
          auditLogs.push(args);
          return args;
        },
      },
      shipment: {
        updateMany: async () => ({ count: 0 }),
      },
    } as any;

    await syncShipmentChargeFromLedgerEntry(db, {
      entryId: 'entry-3',
      userId: 'user-1',
      shipmentId: 'shipment-1',
      description: 'Towing fee',
      type: 'DEBIT',
      amount: 300,
      transactionDate: new Date('2026-09-03'),
      transactionInfoType: null,
      notes: 'Towing to yard',
      metadata: {
        isExpense: true,
        pendingInvoice: true,
        expenseType: 'TOWING',
      },
      actorId: 'actor-1',
    });

    assert.equal(updates.length, 1);
    assert.equal(updates[0].data.status, 'APPROVED');
    assert.equal(updates[0].data.voidedAt, null);
    assert.equal(auditLogs.length, 1);
    assert.equal(auditLogs[0].data.action, 'SYNC_FROM_LEDGER');
  });
});
