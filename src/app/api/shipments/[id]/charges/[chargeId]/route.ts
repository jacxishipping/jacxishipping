import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ShipmentChargeStatus } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { syncMutableInvoicesAfterChargeRelease } from '@/lib/billing/shipment-charges';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';

const mutableStatuses = new Set<ShipmentChargeStatus>(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPUTED', 'VOID']);
const mutableInvoiceStatuses = new Set(['DRAFT', 'PENDING']);
const inactiveInvoiceStatuses = new Set(['CANCELLED', 'VOID']);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user.id;

    if (!hasAnyPermission(session.user.role, ['shipments:manage', 'invoices:manage', 'finance:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, chargeId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      status?: 'APPROVED' | 'DISPUTED' | 'VOID';
      note?: string;
    };

    if (body.status !== 'APPROVED' && body.status !== 'DISPUTED' && body.status !== 'VOID') {
      return NextResponse.json({ error: 'Invalid charge status update' }, { status: 400 });
    }

    const charge = await prisma.shipmentCharge.findFirst({
      where: {
        id: chargeId,
        shipmentId: id,
      },
      select: {
        id: true,
        shipmentId: true,
        status: true,
        description: true,
        invoiceId: true,
        metadata: true,
      },
    });

    if (!charge) {
      return NextResponse.json({ error: 'Shipment charge not found' }, { status: 404 });
    }

    const canReadAllShipments = hasPermission(session.user.role, 'shipments:read_all');
    if (!canReadAllShipments) {
      const shipment = await prisma.shipment.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!shipment || shipment.userId !== session.user.id || !hasPermission(session.user.role, 'shipments:manage')) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // A charge linked to a DRAFT/PENDING (not yet issued) invoice can still be
    // approved/disputed/voided: the link is released and the draft invoice is
    // synced immediately. Charges on issued invoices must be reversed first.
    let linkedInvoice: { id: string; invoiceNumber: string; status: string } | null = null;
    if (charge.invoiceId) {
      linkedInvoice = await prisma.userInvoice.findUnique({
        where: { id: charge.invoiceId },
        select: { id: true, invoiceNumber: true, status: true },
      });

      const invoiceIsMutable = linkedInvoice
        ? mutableInvoiceStatuses.has(linkedInvoice.status) || inactiveInvoiceStatuses.has(linkedInvoice.status)
        : false;
      if (!invoiceIsMutable) {
        return NextResponse.json(
          {
            error: `Charge is locked to invoice ${linkedInvoice?.invoiceNumber ?? ''} (${(linkedInvoice?.status || 'unknown').toLowerCase()}). Reverse that invoice first, then dispute or approve this row.`,
          },
          { status: 400 },
        );
      }
    }

    const statusIsMutable =
      mutableStatuses.has(charge.status) || (charge.status === 'INVOICED' && Boolean(linkedInvoice));
    if (!statusIsMutable) {
      return NextResponse.json(
        { error: `Charge cannot be updated while it is ${charge.status.toLowerCase()}.` },
        { status: 400 },
      );
    }

    const updatedCharge = await prisma.$transaction(async (tx) => {
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

      const nextCharge = await tx.shipmentCharge.update({
        where: { id: charge.id },
        data: {
          status: body.status,
          approvedAt: body.status === 'APPROVED' ? new Date() : null,
          approvedBy: body.status === 'APPROVED' ? session.user.id : null,
          voidedAt: body.status === 'VOID' ? new Date() : isRestoringFromVoid ? null : undefined,
          ...(body.status === 'VOID' || isRestoringFromVoid
            ? { metadata: existingMeta as Prisma.InputJsonValue }
            : {}),
          notes: body.note ? body.note.trim() : undefined,
          invoiceId: linkedInvoice ? null : undefined,
          invoicedAt: linkedInvoice ? null : undefined,
        },
      });

      if (linkedInvoice && mutableInvoiceStatuses.has(linkedInvoice.status)) {
        await syncMutableInvoicesAfterChargeRelease(tx, [
          { invoiceId: linkedInvoice.id, chargeId: charge.id },
        ]);
      }

      await tx.shipmentChargeAuditLog.create({
        data: {
          chargeId: charge.id,
          action: isRestoringFromVoid
            ? 'RESTORE_FROM_VOID'
            : body.status === 'APPROVED'
            ? 'MANUAL_APPROVAL'
            : body.status === 'VOID'
            ? 'MANUAL_VOID'
            : 'MANUAL_DISPUTE',
          description: isRestoringFromVoid
            ? `Shipment charge restored from void to approved: ${charge.description}`
            : body.status === 'APPROVED'
            ? `Shipment charge approved: ${charge.description}`
            : body.status === 'VOID'
            ? `Shipment charge voided: ${charge.description}`
            : `Shipment charge disputed: ${charge.description}`,
          performedBy: actorId,
          oldValue: charge.status,
          newValue: body.status,
          metadata: {
            ...(body.note ? { note: body.note.trim() } : {}),
            ...(linkedInvoice
              ? { releasedFromInvoice: linkedInvoice.invoiceNumber, releasedFromInvoiceStatus: linkedInvoice.status }
              : {}),
          },
        },
      });

      return nextCharge;
    });

    return NextResponse.json({ charge: updatedCharge });
  } catch (error) {
    console.error('Error updating shipment charge status:', error);
    return NextResponse.json({ error: 'Failed to update shipment charge' }, { status: 500 });
  }
}