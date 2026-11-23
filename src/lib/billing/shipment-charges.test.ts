import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  syncMutableInvoicesAfterChargeRelease,
  syncShipmentChargeFromLedgerEntry,
  upsertShipmentSystemCharge,
} from './shipment-charges';

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

  it('skips DB writes and audit log spam when the ledger-backed charge is unchanged (idempotent GET)', async () => {
    const updates: any[] = [];
    const auditLogs: any[] = [];
    const shipmentUpdates: any[] = [];

    const db = {
      shipmentCharge: {
        findFirst: async () => ({
          id: 'charge-unchanged',
          status: 'APPROVED',
          invoiceId: null,
          voidedAt: null,
          chargeCode: 'SHIPPING_FEE',
          category: 'SHIPPING',
          billingMilestone: 'ORIGIN_HANDOFF',
          description: 'Fuel surcharge',
          quantity: 1,
          unitAmount: 150,
          totalAmount: 150,
          currency: 'USD',
          notes: 'Manual billing note',
          approvedAt: new Date('2026-09-01'),
          approvedBy: 'admin-1',
        }),
        update: async (args: any) => {
          updates.push(args);
          return args;
        },
      },
      shipmentChargeAuditLog: {
        create: async (args: any) => {
          auditLogs.push(args);
          return args;
        },
      },
      shipment: {
        updateMany: async (args: any) => {
          shipmentUpdates.push(args);
          return { count: 0 };
        },
      },
    } as any;

    const result = await syncShipmentChargeFromLedgerEntry(db, {
      entryId: 'entry-unchanged',
      userId: 'user-1',
      shipmentId: 'shipment-1',
      description: 'Fuel surcharge',
      type: 'DEBIT',
      amount: 150,
      transactionDate: new Date('2026-09-01'),
      transactionInfoType: 'SHIPPING_PAYMENT',
      notes: null,
      metadata: { isExpense: true, expenseType: 'SHIPPING_FEE' },
      actorId: 'actor-1',
    });

    assert.equal(result?.id, 'charge-unchanged');
    assert.equal(updates.length, 0);
    assert.equal(auditLogs.length, 0);
    assert.equal(shipmentUpdates.length, 0);
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

describe('upsertShipmentSystemCharge', () => {
  it('preserves DISPUTED status instead of silently re-approving during invoice generation', async () => {
    const updates: any[] = [];

    const db = {
      shipmentCharge: {
        findFirst: async () => ({
          id: 'sys-1',
          status: 'DISPUTED',
          chargeCode: 'INSURANCE',
          category: 'INSURANCE',
          billingMilestone: 'ORIGIN_HANDOFF',
          description: '2022 Camry - Insurance',
          quantity: 1,
          unitAmount: 250,
          totalAmount: 250,
          currency: 'USD',
          notes: 'Customer declined coverage',
          approvedAt: null,
          approvedBy: null,
        }),
        update: async (args: any) => {
          updates.push(args);
          return { id: 'sys-1', status: args.data.status };
        },
      },
      shipment: {
        updateMany: async () => ({ count: 0 }),
      },
    } as any;

    const result = await upsertShipmentSystemCharge(db, {
      shipmentId: 'shipment-1',
      userId: 'user-1',
      sourceType: 'SHIPMENT',
      sourceId: 'shipment:shipment-1:insurance',
      chargeCode: 'INSURANCE',
      category: 'INSURANCE',
      billingMilestone: 'ORIGIN_HANDOFF',
      description: '2022 Camry - Insurance',
      unitAmount: 250,
      totalAmount: 250,
      actorId: 'actor-1',
    });

    assert.equal(result.status, 'DISPUTED');
    // Unchanged disputed system charge should not even trigger a DB write.
    assert.equal(updates.length, 0);
  });

  it('keeps a manually voided system charge VOID during re-materialization', async () => {
    const updates: any[] = [];

    const db = {
      shipmentCharge: {
        findFirst: async () => ({
          id: 'sys-void-1',
          status: 'VOID',
          metadata: { manuallyVoided: true },
        }),
        update: async (args: any) => {
          updates.push(args);
          return args;
        },
      },
      shipment: {
        updateMany: async () => ({ count: 0 }),
      },
    } as any;

    const result = await upsertShipmentSystemCharge(db, {
      shipmentId: 'shipment-1',
      userId: 'user-1',
      sourceType: 'SHIPMENT',
      sourceId: 'shipment:shipment-1:insurance',
      chargeCode: 'INSURANCE',
      category: 'INSURANCE',
      billingMilestone: 'ORIGIN_HANDOFF',
      description: '2022 Camry - Insurance',
      unitAmount: 250,
      totalAmount: 250,
      actorId: 'actor-1',
    });

    assert.equal(result.status, 'VOID');
    assert.equal(updates.length, 0);
  });
});

describe('syncMutableInvoicesAfterChargeRelease', () => {
  it('recalculates subtotal, total, and amountRemaining when a charge is released from a draft invoice', async () => {
    const deletedItems: any[] = [];
    const invoiceUpdates: any[] = [];

    const db = {
      userInvoice: {
        findUnique: async () => ({
          id: 'inv-draft-1',
          status: 'DRAFT',
          discount: 50,
          tax: 10,
          amountPaid: 0,
        }),
        update: async (args: any) => {
          invoiceUpdates.push(args);
          return args;
        },
        delete: async () => {
          throw new Error('Should not delete draft with remaining items');
        },
      },
      invoiceLineItem: {
        deleteMany: async (args: any) => {
          deletedItems.push(args);
          return { count: 1 };
        },
        findMany: async () => [{ amount: 500 }],
      },
    } as any;

    await syncMutableInvoicesAfterChargeRelease(db, [
      { invoiceId: 'inv-draft-1', chargeId: 'charge-disputed' },
    ]);

    assert.equal(deletedItems.length, 1);
    assert.deepEqual(deletedItems[0].where, {
      invoiceId: 'inv-draft-1',
      chargeId: { in: ['charge-disputed'] },
    });
    assert.equal(invoiceUpdates.length, 1);
    assert.deepEqual(invoiceUpdates[0].data, {
      subtotal: 500,
      total: 460,
      amountRemaining: 460,
    });
  });

  it('deletes an empty DRAFT invoice when its last charge is released', async () => {
    const deletedInvoices: any[] = [];

    const db = {
      userInvoice: {
        findUnique: async () => ({
          id: 'inv-draft-empty',
          status: 'DRAFT',
          discount: 0,
          tax: 0,
          amountPaid: 0,
        }),
        delete: async (args: any) => {
          deletedInvoices.push(args);
          return args;
        },
      },
      invoiceLineItem: {
        deleteMany: async () => ({ count: 1 }),
        findMany: async () => [],
      },
    } as any;

    await syncMutableInvoicesAfterChargeRelease(db, [
      { invoiceId: 'inv-draft-empty', chargeId: 'charge-only' },
    ]);

    assert.equal(deletedInvoices.length, 1);
    assert.deepEqual(deletedInvoices[0].where, { id: 'inv-draft-empty' });
  });
});
