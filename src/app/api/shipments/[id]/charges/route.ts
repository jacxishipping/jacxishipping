import { NextRequest, NextResponse } from 'next/server';
import {
  Prisma,
  ShipmentBillingMilestone,
  ShipmentChargeCategory,
  ShipmentChargeSourceType,
  ShipmentChargeStatus,
} from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { allocateExpenses, type AllocationMethod } from '@/lib/expense-allocation';
import { materializeContainerShipmentCharges } from '@/lib/billing/container-shipment-charge-materialization';
import { syncMutableInvoicesAfterChargeRelease } from '@/lib/billing/shipment-charges';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';

const mutableStatuses = new Set<ShipmentChargeStatus>([
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'DISPUTED',
  'VOID',
]);
const mutableInvoiceStatuses = new Set(['DRAFT', 'PENDING']);
const inactiveInvoiceStatuses = new Set(['CANCELLED', 'VOID']);

const createManualChargeSchema = z.object({
  description: z.string().trim().min(1, 'Description is required').max(300),
  category: z.nativeEnum(ShipmentChargeCategory).default(ShipmentChargeCategory.OTHER),
  billingMilestone: z.nativeEnum(ShipmentBillingMilestone).default(ShipmentBillingMilestone.MANUAL),
  quantity: z.number().positive('Quantity must be greater than zero').default(1),
  unitAmount: z.number().finite('Amount must be a valid number').refine((val) => val !== 0, 'Amount cannot be zero'),
  currency: z.string().trim().min(3).max(6).default('USD'),
  status: z.enum(['DRAFT', 'APPROVED']).default('APPROVED'),
  notes: z.string().trim().max(1000).optional(),
});

function buildPostIssueDelta(
  charges: Array<{
    totalAmount: number;
    status: string;
    invoice: { id: string; invoiceNumber: string; status: string } | null;
  }>,
) {
  const approvedUninvoicedCharges = charges.filter((charge) => charge.status === 'APPROVED' && !charge.invoice);
  const issuedInvoices = Array.from(
    new Map(
      charges
        .filter(
          (charge) =>
            charge.invoice &&
            !mutableInvoiceStatuses.has(charge.invoice.status) &&
            !inactiveInvoiceStatuses.has(charge.invoice.status),
        )
        .map((charge) => [charge.invoice!.id, charge.invoice]),
    ).values(),
  );

  const deltaAmount = approvedUninvoicedCharges.reduce((sum, charge) => sum + charge.totalAmount, 0);
  const latestIssuedInvoice = issuedInvoices[issuedInvoices.length - 1] || null;
  const kind = deltaAmount < 0 ? 'CREDIT_NOTE' : deltaAmount > 0 ? 'SUPPLEMENTAL_INVOICE' : 'ADJUSTMENT';

  return {
    active: issuedInvoices.length > 0 && approvedUninvoicedCharges.length > 0,
    kind,
    approvedUninvoicedCount: approvedUninvoicedCharges.length,
    deltaAmount,
    latestIssuedInvoiceNumber: latestIssuedInvoice?.invoiceNumber || null,
    latestIssuedInvoiceStatus: latestIssuedInvoice?.status || null,
    description:
      issuedInvoices.length > 0 && approvedUninvoicedCharges.length > 0
        ? deltaAmount < 0
          ? `${approvedUninvoicedCharges.length} approved post-issue charge${approvedUninvoicedCharges.length === 1 ? '' : 's'} would generate a credit note instead of changing the issued invoice.`
          : `${approvedUninvoicedCharges.length} approved post-issue charge${approvedUninvoicedCharges.length === 1 ? '' : 's'} would generate a supplemental invoice instead of changing the issued invoice.`
        : null,
  };
}

function buildBillingReadiness(charges: Array<{ status: string; invoice: { id: string; status?: string } | null }>) {
  // Exclude VOID charges from readiness calculations so voided/replaced rows
  // never permanently trap a shipment in PARTIALLY_BILLABLE.
  const activeCharges = charges.filter((charge) => charge.status !== 'VOID');
  const approvedUninvoicedCount = activeCharges.filter((charge) => charge.status === 'APPROVED' && !charge.invoice).length;
  const blockedCount = activeCharges.filter((charge) => ['DRAFT', 'PENDING_APPROVAL', 'DISPUTED'].includes(charge.status)).length;
  const settledCount = activeCharges.filter(
    (charge) =>
      ['INVOICED', 'PAID'].includes(charge.status) ||
      Boolean(charge.invoice && !inactiveInvoiceStatuses.has(charge.invoice.status || '')),
  ).length;
  const paidCount = activeCharges.filter((charge) => charge.status === 'PAID').length;

  if (!activeCharges.length) {
    return {
      status: 'NOT_BILLABLE',
      label: 'Not Billable',
      description: 'No active shipment charges are available yet. Add or sync billable activity before invoicing.',
      approvedUninvoicedCount,
      blockedCount,
      settledCount,
      totalCharges: 0,
    };
  }

  if (paidCount === activeCharges.length) {
    return {
      status: 'PAID',
      label: 'Paid',
      description: 'All active shipment charges linked to this shipment have been settled.',
      approvedUninvoicedCount,
      blockedCount,
      settledCount,
      totalCharges: activeCharges.length,
    };
  }

  if (settledCount === activeCharges.length && approvedUninvoicedCount === 0 && blockedCount === 0) {
    return {
      status: 'INVOICED',
      label: 'Invoiced',
      description: 'All active shipment charges are already tied to invoices or completed payment.',
      approvedUninvoicedCount,
      blockedCount,
      settledCount,
      totalCharges: activeCharges.length,
    };
  }

  if (approvedUninvoicedCount > 0 && blockedCount === 0) {
    return {
      status: 'READY_TO_INVOICE',
      label: 'Ready To Invoice',
      description: `${approvedUninvoicedCount} approved charge${approvedUninvoicedCount === 1 ? '' : 's'} can be picked up by invoice generation now.`,
      approvedUninvoicedCount,
      blockedCount,
      settledCount,
      totalCharges: activeCharges.length,
    };
  }

  return {
    status: 'PARTIALLY_BILLABLE',
    label: 'Partially Billable',
    description:
      approvedUninvoicedCount > 0
        ? `${approvedUninvoicedCount} approved charge${approvedUninvoicedCount === 1 ? '' : 's'} are invoiceable, but ${blockedCount} still need review.`
        : `${blockedCount} charge${blockedCount === 1 ? '' : 's'} still need review before this shipment becomes invoice-ready.`,
    approvedUninvoicedCount,
    blockedCount,
    settledCount,
    totalCharges: activeCharges.length,
  };
}

async function assertShipmentAccess(shipmentId: string, sessionUserId: string, role: string | undefined) {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!shipment) {
    return { error: NextResponse.json({ error: 'Shipment not found' }, { status: 404 }) };
  }

  const canReadAllShipments = hasPermission(role, 'shipments:read_all');
  if (!canReadAllShipments && shipment.userId !== sessionUserId) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { shipment };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const access = await assertShipmentAccess(id, session.user.id, session.user.role);
    if ('error' in access) {
      return access.error;
    }

    const fallbackActorId = session.user.id as string;

    // Materializing charges is a write — only performed when the client opts in
    // with `?materialize=true` (e.g. the Billing tab). Materializes BOTH ledger
    // expenses AND shipment/container/damage system charges idempotently so
    // shipments without ledger expenses are still billable on first open.
    const { searchParams } = new URL(request.url);
    const shouldMaterialize = searchParams.get('materialize') === 'true';

    if (shouldMaterialize) {
      const shipmentRecord = await prisma.shipment.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          serviceType: true,
          purchasePrice: true,
          price: true,
          priceListPricingSnapshot: true,
          insuranceValue: true,
          damageCredit: true,
          weight: true,
          vehicleYear: true,
          vehicleMake: true,
          vehicleModel: true,
          vehicleVIN: true,
          containerId: true,
          container: {
            select: {
              id: true,
              expenseAllocationMethod: true,
              expenses: true,
              shipments: {
                select: {
                  id: true,
                  price: true,
                  insuranceValue: true,
                  weight: true,
                },
              },
            },
          },
        },
      });

      if (shipmentRecord) {
        const allocationMethod: AllocationMethod =
          (shipmentRecord.container?.expenseAllocationMethod as AllocationMethod | null) || 'EQUAL';
        const expenseAllocations = shipmentRecord.container
          ? allocateExpenses(
              shipmentRecord.container.shipments,
              shipmentRecord.container.expenses,
              allocationMethod,
            )
          : {};

        await prisma.$transaction(async (tx) => {
          const [ledgerEntries, damageRecords] = await Promise.all([
            tx.ledgerEntry.findMany({
              where: {
                shipmentId: id,
                type: 'DEBIT',
              },
              select: {
                id: true,
                userId: true,
                shipmentId: true,
                description: true,
                type: true,
                amount: true,
                transactionDate: true,
                transactionInfoType: true,
                notes: true,
                metadata: true,
                createdBy: true,
              },
            }),
            tx.containerDamage.findMany({
              where: {
                shipmentId: id,
                damageType: 'WE_PAY',
              },
              select: {
                shipmentId: true,
                amount: true,
              },
            }),
          ]);

          await materializeContainerShipmentCharges(tx, {
            actorId: fallbackActorId,
            allocationMethod,
            containerId: shipmentRecord.container?.id || `shipment:${shipmentRecord.id}`,
            expenseAllocations,
            shipmentDamageRecords: damageRecords,
            shipmentLedgerEntries: ledgerEntries.map((entry) => ({
              ...entry,
              type: entry.type as 'DEBIT' | 'CREDIT',
              transactionInfoType: entry.transactionInfoType as
                | 'CAR_PAYMENT'
                | 'SHIPPING_PAYMENT'
                | 'STORAGE_PAYMENT'
                | null,
              metadata: (entry.metadata ?? {}) as Prisma.JsonValue,
            })),
            shipments: [
              {
                id: shipmentRecord.id,
                userId: shipmentRecord.userId,
                serviceType: shipmentRecord.serviceType,
                purchasePrice: shipmentRecord.purchasePrice,
                price: shipmentRecord.price,
                priceListPricingSnapshot: shipmentRecord.priceListPricingSnapshot as Prisma.JsonValue | null,
                insuranceValue: shipmentRecord.insuranceValue,
                damageCredit: shipmentRecord.damageCredit,
                vehicleYear: shipmentRecord.vehicleYear,
                vehicleMake: shipmentRecord.vehicleMake,
                vehicleModel: shipmentRecord.vehicleModel,
                vehicleVIN: shipmentRecord.vehicleVIN,
              },
            ],
          });
        });
      }
    }

    const charges = await prisma.shipmentCharge.findMany({
      where: {
        shipmentId: id,
      },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            containerId: true,
            shipmentId: true,
          },
        },
        auditLogs: {
          select: {
            id: true,
            action: true,
            description: true,
            performedBy: true,
            oldValue: true,
            newValue: true,
            metadata: true,
            timestamp: true,
          },
          orderBy: {
            timestamp: 'desc',
          },
        },
      },
      orderBy: [
        { billableAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    const actorIds = Array.from(
      new Set(
        charges.flatMap((charge) => charge.auditLogs.map((log) => log.performedBy)).filter(Boolean),
      ),
    );

    const actors = actorIds.length
      ? await prisma.user.findMany({
          where: {
            id: {
              in: actorIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const actorMap = new Map(
      actors.map((actor) => [actor.id, actor.name?.trim() || actor.email || actor.id]),
    );

    const chargesWithActors = charges.map((charge) => ({
      ...charge,
      auditLogs: charge.auditLogs.map((log) => ({
        ...log,
        actorLabel: actorMap.get(log.performedBy) || log.performedBy,
      })),
    }));

    const summary = chargesWithActors.reduce(
      (accumulator, charge) => {
        if (charge.status === 'VOID') {
          accumulator.voided += charge.totalAmount;
        } else if (charge.status === 'DISPUTED') {
          accumulator.disputed += charge.totalAmount;
        } else {
          accumulator.total += charge.totalAmount;

          if (charge.status === 'PAID') {
            accumulator.paid += charge.totalAmount;
          } else if (charge.status === 'INVOICED') {
            accumulator.invoiced += charge.totalAmount;
          } else if (charge.status === 'APPROVED' && !charge.invoice) {
            accumulator.open += charge.totalAmount;
          }
        }

        accumulator.counts[charge.status] = (accumulator.counts[charge.status] || 0) + 1;
        return accumulator;
      },
      {
        total: 0,
        invoiced: 0,
        paid: 0,
        open: 0,
        disputed: 0,
        voided: 0,
        counts: {} as Record<string, number>,
      },
    );

    return NextResponse.json({
      charges: chargesWithActors,
      summary,
      readiness: buildBillingReadiness(chargesWithActors),
      postIssueDelta: buildPostIssueDelta(chargesWithActors),
    });
  } catch (error) {
    console.error('Error fetching shipment charges:', error);
    return NextResponse.json({ error: 'Failed to fetch shipment charges' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user.role, ['shipments:manage', 'invoices:manage', 'finance:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const access = await assertShipmentAccess(id, session.user.id, session.user.role);
    if ('error' in access) {
      return access.error;
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsed = createManualChargeSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid charge payload' },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const actorId = session.user.id;
    const totalAmount = Math.round(data.quantity * data.unitAmount * 100) / 100;
    const chargeCode = `MANUAL_${data.category}`;

    const charge = await prisma.$transaction(async (tx) => {
      const created = await tx.shipmentCharge.create({
        data: {
          shipmentId: access.shipment.id,
          userId: access.shipment.userId,
          sourceType: ShipmentChargeSourceType.MANUAL,
          chargeCode,
          category: data.category,
          billingMilestone: data.billingMilestone,
          description: data.description,
          quantity: data.quantity,
          unitAmount: data.unitAmount,
          totalAmount,
          currency: data.currency.toUpperCase(),
          status: data.status,
          billableAt: new Date(),
          approvedAt: data.status === 'APPROVED' ? new Date() : null,
          approvedBy: data.status === 'APPROVED' ? actorId : null,
          notes: data.notes || null,
          metadata: {
            origin: 'manual-billing-tab',
          },
        },
      });

      await tx.shipmentChargeAuditLog.create({
        data: {
          chargeId: created.id,
          action: 'MANUAL_CREATE',
          description: `Manual shipment charge added: ${created.description}`,
          performedBy: actorId,
          newValue: created.status,
          metadata: {
            ...(data.notes ? { note: data.notes } : {}),
            totalAmount,
            currency: created.currency,
          },
        },
      });

      return created;
    });

    return NextResponse.json({ charge }, { status: 201 });
  } catch (error) {
    console.error('Error creating manual shipment charge:', error);
    return NextResponse.json({ error: 'Failed to create shipment charge' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user.role, ['shipments:manage', 'invoices:manage', 'finance:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const access = await assertShipmentAccess(id, session.user.id, session.user.role);
    if ('error' in access) {
      return access.error;
    }

    const body = (await request.json().catch(() => ({}))) as {
      chargeIds?: string[];
      status?: 'APPROVED' | 'DISPUTED' | 'VOID';
      note?: string;
    };

    if (!Array.isArray(body.chargeIds) || body.chargeIds.length === 0) {
      return NextResponse.json({ error: 'At least one charge ID is required' }, { status: 400 });
    }

    if (body.status !== 'APPROVED' && body.status !== 'DISPUTED' && body.status !== 'VOID') {
      return NextResponse.json({ error: 'Invalid bulk charge status update' }, { status: 400 });
    }

    const trimmedNote = body.note?.trim();
    const uniqueChargeIds = Array.from(new Set(body.chargeIds));
    const charges = await prisma.shipmentCharge.findMany({
      where: {
        id: { in: uniqueChargeIds },
        shipmentId: id,
      },
      select: {
        id: true,
        status: true,
        description: true,
        invoiceId: true,
        metadata: true,
      },
    });

    if (charges.length !== uniqueChargeIds.length) {
      return NextResponse.json({ error: 'One or more shipment charges were not found' }, { status: 404 });
    }

    // Load the invoices linked to selected charges so draft/pending links can be
    // released while issued-invoice links stay blocked.
    const linkedInvoiceIds = Array.from(
      new Set(charges.map((charge) => charge.invoiceId).filter((value): value is string => Boolean(value))),
    );
    const linkedInvoices = linkedInvoiceIds.length
      ? await prisma.userInvoice.findMany({
          where: { id: { in: linkedInvoiceIds } },
          select: { id: true, invoiceNumber: true, status: true },
        })
      : [];
    const linkedInvoiceMap = new Map(linkedInvoices.map((invoice) => [invoice.id, invoice]));

    const blockedCharge = charges.find((charge) => {
      const linkedInvoice = charge.invoiceId ? linkedInvoiceMap.get(charge.invoiceId) : undefined;
      const invoiceMutable = Boolean(
        linkedInvoice &&
          (mutableInvoiceStatuses.has(linkedInvoice.status) || inactiveInvoiceStatuses.has(linkedInvoice.status)),
      );

      if (charge.invoiceId && !invoiceMutable) {
        return true; // locked to an issued invoice
      }

      return !mutableStatuses.has(charge.status) && !(charge.status === 'INVOICED' && invoiceMutable);
    });

    if (blockedCharge) {
      return NextResponse.json(
        {
          error: blockedCharge.invoiceId
            ? 'One or more charges are locked to an issued invoice. Reverse that invoice first.'
            : `Charge cannot be updated while it is ${blockedCharge.status.toLowerCase()}.`,
        },
        { status: 400 },
      );
    }

    const actorId = session.user.id;
    await prisma.$transaction(async (tx) => {
      const releasedLinks: Array<{ invoiceId: string; chargeId: string }> = [];

      for (const charge of charges) {
        const linkedInvoice = charge.invoiceId ? linkedInvoiceMap.get(charge.invoiceId) : undefined;
        const isRestoringFromVoid = charge.status === 'VOID' && body.status === 'APPROVED';
        const existingMeta =
          charge.metadata && typeof charge.metadata === 'object' && !Array.isArray(charge.metadata)
            ? { ...(charge.metadata as Record<string, unknown>) }
            : {};
        if (body.status === 'VOID') {
          existingMeta.manuallyVoided = true;
        } else if (isRestoringFromVoid) {
          delete existingMeta.manuallyVoided;
        }

        await tx.shipmentCharge.update({
          where: { id: charge.id },
          data: {
            status: body.status,
            approvedAt: body.status === 'APPROVED' ? new Date() : null,
            approvedBy: body.status === 'APPROVED' ? actorId : null,
            voidedAt: body.status === 'VOID' ? new Date() : isRestoringFromVoid ? null : undefined,
            ...(body.status === 'VOID' || isRestoringFromVoid
              ? { metadata: existingMeta as Prisma.InputJsonValue }
              : {}),
            ...(trimmedNote ? { notes: trimmedNote } : {}),
            ...(linkedInvoice ? { invoiceId: null, invoicedAt: null } : {}),
          },
        });

        if (linkedInvoice && mutableInvoiceStatuses.has(linkedInvoice.status)) {
          releasedLinks.push({ invoiceId: linkedInvoice.id, chargeId: charge.id });
        }

        await tx.shipmentChargeAuditLog.create({
          data: {
            chargeId: charge.id,
            action: isRestoringFromVoid
              ? 'RESTORE_FROM_VOID'
              : body.status === 'APPROVED'
              ? 'BULK_APPROVAL'
              : body.status === 'VOID'
              ? 'BULK_VOID'
              : 'BULK_DISPUTE',
            description: isRestoringFromVoid
              ? `Shipment charge restored from void in bulk: ${charge.description}`
              : body.status === 'APPROVED'
              ? `Shipment charge approved in bulk: ${charge.description}`
              : body.status === 'VOID'
              ? `Shipment charge voided in bulk: ${charge.description}`
              : `Shipment charge disputed in bulk: ${charge.description}`,
            performedBy: actorId,
            oldValue: charge.status,
            newValue: body.status,
            metadata: {
              mode: 'bulk',
              chargeIds: uniqueChargeIds,
              ...(trimmedNote ? { note: trimmedNote } : {}),
              ...(linkedInvoice
                ? { releasedFromInvoice: linkedInvoice.invoiceNumber, releasedFromInvoiceStatus: linkedInvoice.status }
                : {}),
            },
          },
        });
      }

      if (releasedLinks.length > 0) {
        await syncMutableInvoicesAfterChargeRelease(tx, releasedLinks);
      }
    });

    return NextResponse.json({ success: true, updated: uniqueChargeIds.length });
  } catch (error) {
    console.error('Error bulk updating shipment charges:', error);
    return NextResponse.json({ error: 'Failed to bulk update shipment charges' }, { status: 500 });
  }
}