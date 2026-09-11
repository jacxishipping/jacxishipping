import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NotificationType, Prisma } from '@prisma/client';
import { createNotification } from '@/lib/notifications';
import { createInvoiceAuditLogs } from '@/lib/entity-audit-history';
import { z } from 'zod';
import { hasPermission } from '@/lib/rbac';
import { buildLinkedCompanyLedgerEntryMap } from '@/lib/company-ledger-links';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import {
  markInvoiceShipmentChargesPaid,
  releaseInvoiceShipmentCharges,
  resetInvoiceShipmentCharges,
} from '@/lib/billing/shipment-charges';
import { recalculateInvoiceTotal } from '@/lib/shipment-invoice';

function normalizeShipmentRefInDescription(
  description: string,
  shipment?: { id: string; vehicleVIN: string | null }
) {
  if (!shipment?.id || !shipment.vehicleVIN) return description;
  return description
    .replace(new RegExp(`\\(Shipment\\s+${shipment.id}\\)`, 'gi'), `(VIN ${shipment.vehicleVIN})`)
    .replace(new RegExp(`Shipment\\s+${shipment.id}`, 'gi'), `VIN ${shipment.vehicleVIN}`)
    .replace(new RegExp(`shipment\\s+${shipment.id}`, 'g'), `VIN ${shipment.vehicleVIN}`);
}

function buildExpenseLineItemKey(shipmentId: string, description: string, amount: number) {
  return `${shipmentId}::${description.trim().toLowerCase()}::${amount.toFixed(2)}`;
}

function isShipmentFinancialExpenseLineItem(lineItem: {
  shipmentId: string | null;
  description: string;
}) {
  if (!lineItem.shipmentId) return false;

  const description = lineItem.description.toLowerCase();

  if (description.includes('shared container expenses')) return false;
  if (description.includes('damage note')) return false;
  if (description.includes('damage compensation')) return false;
  if (description.includes('damage credit')) return false;
  if (description.endsWith('- vehicle price')) return false;
  if (description.endsWith('- insurance')) return false;

  return description.includes('(vin ') || description.includes('(shipment ');
}

/**
 * GET /api/invoices/[id]
 * Get a specific invoice
 */
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canReadAllInvoices = hasPermission(session.user?.role, 'invoices:manage');

    const invoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
          },
        },
        container: {
          select: {
            id: true,
            containerNumber: true,
            trackingNumber: true,
            status: true,
            vesselName: true,
            loadingPort: true,
            destinationPort: true,
            estimatedArrival: true,
          },
        },
        shipment: {
          select: {
            id: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
            vehicleVIN: true,
            vehicleColor: true,
            status: true,
            paymentStatus: true,
          },
        },
        lineItems: {
          include: {
            shipment: {
              select: {
                id: true,
                vehicleType: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleYear: true,
                vehicleVIN: true,
                vehicleColor: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        auditLogs: canReadAllInvoices
          ? {
              select: {
                id: true,
                action: true,
                description: true,
                performedBy: true,
                oldValue: true,
                newValue: true,
                timestamp: true,
                metadata: true,
              },
              orderBy: {
                timestamp: 'desc',
              },
              take: 50,
            }
          : false,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Check permissions: users can only view their own invoices
    if (!canReadAllInvoices && invoice.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const actorIds = canReadAllInvoices
      ? Array.from(
          new Set((invoice.auditLogs || []).map((log) => log.performedBy).filter(Boolean))
        )
      : [];

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
      actors.map((actor) => [actor.id, actor.name?.trim() || actor.email || actor.id])
    );

    const containerIds = canReadAllInvoices
      ? Array.from(
          new Set(
            (invoice.auditLogs || [])
              .flatMap((log) => {
                const metadata =
                  log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
                    ? (log.metadata as Record<string, unknown>)
                    : null;

                return [
                  typeof metadata?.oldContainerId === 'string' ? metadata.oldContainerId : null,
                  typeof metadata?.newContainerId === 'string' ? metadata.newContainerId : null,
                  typeof metadata?.containerId === 'string' ? metadata.containerId : null,
                ].filter((value): value is string => Boolean(value));
              })
          )
        )
      : [];

    const containers = containerIds.length
      ? await prisma.container.findMany({
          where: {
            id: {
              in: containerIds,
            },
          },
          select: {
            id: true,
            containerNumber: true,
          },
        })
      : [];

    const containerMap = new Map(
      containers.map((container) => [container.id, container.containerNumber])
    );

    const auditLogs = canReadAllInvoices
      ? (invoice.auditLogs || []).map((log) => {
          const metadata =
            log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
              ? { ...(log.metadata as Record<string, unknown>) }
              : log.metadata;

          if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
            const oldContainerId = typeof metadata.oldContainerId === 'string' ? metadata.oldContainerId : null;
            const newContainerId = typeof metadata.newContainerId === 'string' ? metadata.newContainerId : null;
            const containerId = typeof metadata.containerId === 'string' ? metadata.containerId : null;

            if (oldContainerId && containerMap.has(oldContainerId)) {
              metadata.oldContainerNumber = containerMap.get(oldContainerId);
            }

            if (newContainerId && containerMap.has(newContainerId)) {
              metadata.newContainerNumber = containerMap.get(newContainerId);
            }

            if (containerId && containerMap.has(containerId)) {
              metadata.containerNumber = containerMap.get(containerId);
            }
          }

          return {
            id: log.id,
            action: log.action,
            description: log.description,
            performedBy: actorMap.get(log.performedBy) || log.performedBy,
            oldValue: log.oldValue,
            newValue: log.newValue,
            timestamp: log.timestamp,
            metadata,
          };
        })
      : [];

    const shipmentIds = Array.from(
      new Set(invoice.lineItems.map((lineItem) => lineItem.shipmentId).filter((value): value is string => Boolean(value)))
    );

    const shipmentExpenseEntries = shipmentIds.length
      ? await prisma.ledgerEntry.findMany({
          where: {
            shipmentId: { in: shipmentIds },
            type: 'DEBIT',
          },
          select: {
            id: true,
            shipmentId: true,
            description: true,
            amount: true,
            transactionDate: true,
            metadata: true,
          },
          orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
        })
      : [];

    const expenseEntryIds = shipmentExpenseEntries.map((entry) => entry.id);
    const companyLedgerEntries = expenseEntryIds.length
      ? await prisma.companyLedgerEntry.findMany({
          where: {
            reference: {
              in: expenseEntryIds.map((entryId) => `shipment-expense:${entryId}`),
            },
          },
          select: {
            id: true,
            companyId: true,
            description: true,
            reference: true,
            notes: true,
            metadata: true,
            company: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        })
      : [];

    const linkedCompanyEntriesByUserExpenseId = buildLinkedCompanyLedgerEntryMap(companyLedgerEntries);
    const shipmentById = new Map(
      invoice.lineItems
        .filter((lineItem) => lineItem.shipment)
        .map((lineItem) => [lineItem.shipment!.id, lineItem.shipment!])
    );
    const queuedExpenseEntriesByKey = new Map<string, typeof shipmentExpenseEntries>();

    for (const entry of shipmentExpenseEntries) {
      if (!entry.shipmentId) continue;

      const shipment = shipmentById.get(entry.shipmentId);
      const normalizedDescription = normalizeShipmentRefInDescription(entry.description || '', shipment);
      const key = buildExpenseLineItemKey(entry.shipmentId, normalizedDescription, entry.amount);
      const queuedEntries = queuedExpenseEntriesByKey.get(key) || [];
      queuedEntries.push(entry);
      queuedExpenseEntriesByKey.set(key, queuedEntries);
    }

    const lineItemsWithLinks = invoice.lineItems.map((lineItem) => {
      if (!lineItem.shipmentId) {
        return { ...lineItem, linkedCompanyLedgerEntry: null, matchedUserExpenseEntryId: null };
      }

      const key = buildExpenseLineItemKey(lineItem.shipmentId, lineItem.description, lineItem.amount);
      const queuedEntries = queuedExpenseEntriesByKey.get(key);
      const matchedUserExpenseEntry = queuedEntries?.shift();

      return {
        ...lineItem,
        matchedUserExpenseEntryId: matchedUserExpenseEntry?.id || null,
        linkedCompanyLedgerEntry: matchedUserExpenseEntry
          ? linkedCompanyEntriesByUserExpenseId.get(matchedUserExpenseEntry.id) || null
          : null,
      };
    });

    const isEditableInvoice = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
    const lineItems = isEditableInvoice
      ? lineItemsWithLinks.filter((lineItem) => {
          if (!isShipmentFinancialExpenseLineItem({ shipmentId: lineItem.shipmentId, description: lineItem.description })) {
            return true;
          }

          return Boolean(lineItem.matchedUserExpenseEntryId || lineItem.linkedCompanyLedgerEntry);
        })
      : lineItemsWithLinks;

    const subtotal = isEditableInvoice
      ? lineItems.reduce((sum, lineItem) => sum + lineItem.amount, 0)
      : invoice.subtotal;
    const total = isEditableInvoice
      ? subtotal - (invoice.discount ?? 0) + (invoice.tax ?? 0)
      : invoice.total;

    return NextResponse.json({
      ...invoice,
      lineItems,
      subtotal,
      total,
      auditLogs,
    });

  } catch (error) {
    console.error('Error fetching invoice:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/invoices/[id]
 * Update an invoice (admin only)
 */
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can update invoices
    if (!hasPermission(session.user?.role, 'invoices:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();

    const updateSchema = z.object({
      status: z.enum(['DRAFT', 'PENDING', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
      dueDate: z.string().nullable().optional(),
      paidDate: z.string().nullable().optional(),
      paymentMethod: z.string().nullable().optional(),
      paymentReference: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      internalNotes: z.string().nullable().optional(),
      discount: z.number().min(0).optional(),
      tax: z.number().min(0).optional(),
    });

    const validatedData = updateSchema.parse(body);

    // Get current invoice to recalculate total if discount or tax changes
    const currentInvoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
      include: {
        lineItems: true,
      },
    });
    if (!currentInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Recalculate total if discount or tax is updated
    let total = currentInvoice.total;
    if (validatedData.discount !== undefined || validatedData.tax !== undefined) {
      const subtotal = currentInvoice.subtotal;
      const discount = validatedData.discount ?? currentInvoice.discount;
      const tax = validatedData.tax ?? currentInvoice.tax;
      total = recalculateInvoiceTotal(subtotal, discount, tax);
    }

    const previousStatus = currentInvoice.status;

    // When marking as PAID:
    //   1. Check customer credit balance is sufficient for the portion not already posted
    //      into the ledger (excluding car purchase price)
    //   2. Tag pending DUE expense ledger entries with invoice details
    //   3. Create a DEBIT for the non-expense portion (excluding car purchase price)
    //   4. Recalculate running balances
    let paymentLedgerEntryId: string | undefined;
    if (validatedData.status === 'PAID' && previousStatus !== 'PAID') {
      const invoiceTotal = total;

      // Collect shipment IDs from invoice line items
      // Collect shipment IDs from invoice line items AND the invoice's direct shipmentId
      const invoiceShipmentIds = [
        ...new Set(
          [
            ...currentInvoice.lineItems
              .map((li) => li.shipmentId)
              .filter((id): id is string => Boolean(id)),
            currentInvoice.shipmentId ?? undefined,
          ].filter((id): id is string => Boolean(id))
        ),
      ];

      // Car purchase price line items are excluded from the customer ledger.
      // Cap at invoiceTotal to ensure ledgerRelevantTotal is never negative.
      const purchasePriceTotal = Math.min(
        currentInvoice.lineItems
          .filter((li) => li.type === 'PURCHASE_PRICE')
          .reduce((sum, li) => sum + li.amount, 0),
        invoiceTotal
      );

      // The ledger-relevant total excludes the car purchase price
      const ledgerRelevantTotal = invoiceTotal - purchasePriceTotal;

      // Find all pending expense entries for those shipments belonging to this customer
      const pendingExpenseEntries = invoiceShipmentIds.length > 0
        ? await prisma.ledgerEntry.findMany({
            where: {
              userId: currentInvoice.userId,
              shipmentId: { in: invoiceShipmentIds },
              type: 'DEBIT',
              metadata: {
                path: ['pendingInvoice'],
                equals: true,
              },
            },
            select: { id: true, amount: true, metadata: true },
          })
        : [];

      const pendingExpenseTotal = pendingExpenseEntries.reduce((sum, e) => sum + e.amount, 0);

      // Effective balance already includes pending shipment expenses.
      const latestEntry = await prisma.ledgerEntry.findFirst({
        where: { userId: currentInvoice.userId },
        orderBy: { transactionDate: 'desc' },
        select: { balance: true },
      });
      const effectiveBalance = latestEntry?.balance ?? 0;
      const availableCredit = effectiveBalance < 0 ? -effectiveBalance : 0;

      // The non-expense portion = invoice items not already tracked as ledger entries
      // (insurance, shared container expenses, etc.) — car purchase price is excluded.
      const nonExpenseAmount = Math.max(0, ledgerRelevantTotal - pendingExpenseTotal);

      if (nonExpenseAmount > availableCredit + 0.001) {
        return NextResponse.json(
          {
            error: `Insufficient credit balance. Customer has $${availableCredit.toFixed(2)} available but invoice needs $${nonExpenseAmount.toFixed(2)} more for non-shipment charges. Please deposit credit first.`,
          },
          { status: 400 }
        );
      }

      await prisma.$transaction(async (tx) => {
        // Tag each pending expense entry with invoice details. The entry already affects the
        // balance; clearing pendingInvoice just marks it as invoiced/settled in workflow terms.
        for (const entry of pendingExpenseEntries) {
          const meta = (entry.metadata ?? {}) as Record<string, unknown>;
          await tx.ledgerEntry.update({
            where: { id: entry.id },
            data: {
              metadata: {
                ...meta,
                pendingInvoice: false,
                invoiceId: currentInvoice.id,
                invoiceNumber: currentInvoice.invoiceNumber,
              },
            },
          });
        }

        // Create a DEBIT for the non-expense portion (vehicle price, insurance, etc.)
        let nonExpenseEntry: { id: string } | undefined;
        if (nonExpenseAmount > 0.001) {
          nonExpenseEntry = await tx.ledgerEntry.create({
            data: {
              userId: currentInvoice.userId,
              description: `Invoice ${currentInvoice.invoiceNumber} payment — vehicle / other charges`,
              type: 'DEBIT',
              transactionInfoType: 'CAR_PAYMENT',
              amount: nonExpenseAmount,
              balance: 0, // will be corrected by recalculate below
              createdBy: actorId,
              notes: validatedData.notes,
              metadata: {
                invoiceId: currentInvoice.id,
                invoiceNumber: currentInvoice.invoiceNumber,
                paymentMethod: validatedData.paymentMethod ?? null,
                paymentType: 'invoice_payment',
              },
            },
          });
        }

        // Recalculate all running balances (pending entries now activated)
        await recalculateUserLedgerBalances(tx, currentInvoice.userId);

        // Mark related shipments as paymentStatus COMPLETED
        if (invoiceShipmentIds.length > 0) {
          await tx.shipment.updateMany({
            where: { id: { in: invoiceShipmentIds } },
            data: { paymentStatus: 'COMPLETED' },
          });
        }

        await markInvoiceShipmentChargesPaid(tx, currentInvoice.id);

        paymentLedgerEntryId = nonExpenseEntry?.id ?? pendingExpenseEntries[0]?.id;
      });
    }

    // Update invoice and synchronize linked shipment charge states.
    const invoice = await prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.userInvoice.update({
        where: { id: params.id },
        data: {
          ...validatedData,
          total,
          paymentReference: paymentLedgerEntryId ?? validatedData.paymentReference ?? null,
          dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : validatedData.dueDate === null ? null : undefined,
          paidDate: validatedData.paidDate ? new Date(validatedData.paidDate) : validatedData.paidDate === null ? null : undefined,
          paymentMethod: validatedData.paymentMethod ?? null,
          notes: validatedData.notes ?? null,
          internalNotes: validatedData.internalNotes ?? null,
          discount: validatedData.discount ?? currentInvoice.discount,
          tax: validatedData.tax ?? currentInvoice.tax,
        },
        include: {
          user: true,
          container: true,
          lineItems: {
            include: {
              shipment: true,
            },
          },
        },
      });

      if (validatedData.status === 'CANCELLED' && previousStatus !== 'PAID') {
        await releaseInvoiceShipmentCharges(tx, updatedInvoice.id);
      }

      return updatedInvoice;
    });

    const invoiceAuditLogs: Array<{
      invoiceId: string;
      action: string;
      description: string;
      performedBy: string;
      oldValue?: string | null;
      newValue?: string | null;
      metadata?: Prisma.InputJsonValue;
    }> = [];

    if (validatedData.status && validatedData.status !== previousStatus) {
      invoiceAuditLogs.push({
        invoiceId: invoice.id,
        action: 'STATUS_CHANGE',
        description: `Invoice status changed from ${previousStatus} to ${validatedData.status}`,
        performedBy: actorId,
        oldValue: previousStatus,
        newValue: validatedData.status,
      });
    }

    const updatedFieldNames = Object.keys(validatedData).filter((fieldName) => {
      if (fieldName === 'status') {
        return false;
      }

      return validatedData[fieldName as keyof typeof validatedData] !== undefined;
    });

    if (updatedFieldNames.length > 0) {
      invoiceAuditLogs.push({
        invoiceId: invoice.id,
        action: 'INVOICE_UPDATED',
        description: `Invoice fields updated: ${updatedFieldNames.join(', ')}`,
        performedBy: actorId,
        metadata: {
          updatedFields: updatedFieldNames,
        },
      });
    }

    await createInvoiceAuditLogs(invoiceAuditLogs);

    if (validatedData.status && validatedData.status !== previousStatus) {
      const formattedStatus = validatedData.status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());

      try {
        await createNotification({
          userId: invoice.userId,
          senderId: actorId,
          title: 'Invoice status updated',
          description: `Invoice ${invoice.invoiceNumber} is now ${formattedStatus}.`,
          type: NotificationType.INFO,
          link: `/dashboard/invoices/${invoice.id}`,
        });
      } catch (notificationError) {
        console.error('Failed to create invoice status notification:', notificationError);
      }
    }

    return NextResponse.json(invoice);

  } catch (error) {
    console.error('Error updating invoice:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update invoice' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/[id]
 * Delete an invoice (admin only)
 */
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can delete invoices
    if (!hasPermission(session.user?.role, 'invoices:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if invoice exists
    const invoice = await prisma.userInvoice.findUnique({
      where: { id: params.id },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Only un-issued invoices may be deleted. Issued invoices carry customer and
    // ledger state; they must be reversed (cancelled) instead, which keeps the
    // document for the audit trail and releases its charges for dispute.
    if (!['DRAFT', 'PENDING'].includes(invoice.status)) {
      return NextResponse.json(
        {
          error:
            invoice.status === 'PAID'
              ? 'Paid invoices cannot be deleted. Record the refund/reversal first.'
              : `Invoice ${invoice.invoiceNumber} is ${invoice.status.toLowerCase()} and cannot be deleted. Reverse it instead — that releases its charges while keeping the audit trail.`,
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const userLedgerLinks = await tx.ledgerEntry.findMany({
        where: {
          OR: [
            {
              metadata: {
                path: ['invoiceId'],
                equals: invoice.id,
              },
            },
            {
              metadata: {
                path: ['invoiceNumber'],
                equals: invoice.invoiceNumber,
              },
            },
            ...(invoice.paymentReference
              ? [
                  {
                    id: invoice.paymentReference,
                  },
                ]
              : []),
          ],
        },
        select: { id: true },
      });

      const companyLedgerLinks = await tx.companyLedgerEntry.findMany({
        where: {
          OR: [
            {
              metadata: {
                path: ['invoiceId'],
                equals: invoice.id,
              },
            },
            {
              metadata: {
                path: ['invoiceNumber'],
                equals: invoice.invoiceNumber,
              },
            },
            {
              reference: invoice.invoiceNumber,
            },
          ],
        },
        select: { id: true },
      });

      const userLedgerEntryIds = userLedgerLinks.map((entry) => entry.id);
      const companyLedgerEntryIds = companyLedgerLinks.map((entry) => entry.id);

      if (userLedgerEntryIds.length > 0) {
        await tx.ledgerEntry.deleteMany({
          where: {
            id: { in: userLedgerEntryIds },
          },
        });
      }

      if (companyLedgerEntryIds.length > 0) {
        await tx.companyLedgerEntry.deleteMany({
          where: {
            id: { in: companyLedgerEntryIds },
          },
        });
      }

      await resetInvoiceShipmentCharges(tx, invoice.id);

      // Delete invoice (cascade will delete line items)
      await tx.userInvoice.delete({
        where: { id: params.id },
      });

      return {
        removedUserLedgerEntries: userLedgerEntryIds.length,
        removedCompanyLedgerEntries: companyLedgerEntryIds.length,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'Invoice and linked ledger transactions deleted successfully',
      ...result,
    });

  } catch (error) {
    console.error('Error deleting invoice:', error);
    return NextResponse.json(
      { error: 'Failed to delete invoice' },
      { status: 500 }
    );
  }
}
