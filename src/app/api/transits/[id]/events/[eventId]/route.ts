import { NextRequest, NextResponse } from 'next/server';
import { TransitStatus } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { companySupportsRole } from '@/lib/company-roles';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { isClosedStageOverrideAllowed } from '@/lib/workflow-access';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';

const updateEventSchema = z.object({
  companyId: z.string().min(1).optional(),
  origin: z.string().min(1).optional(),
  destination: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  location: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  eventDate: z.string().optional(),
});

function mapEventStatusToTransitStatus(status: string): TransitStatus | null {
  const upper = status.trim().toUpperCase().replace(/[\s_-]+/g, '_');
  if (['IN_TRANSIT', 'LOADED', 'BORDER_CROSSING', 'CUSTOMS_CLEARANCE', 'CUSTOMS_HOLD', 'DEPARTED'].some((s) => upper.includes(s))) {
    return TransitStatus.IN_TRANSIT;
  }
  if (upper === 'ARRIVED' || upper.startsWith('ARRIV')) {
    return TransitStatus.ARRIVED;
  }
  if (upper === 'DISPATCHED' || upper.startsWith('DISPATCH')) {
    return TransitStatus.DISPATCHED;
  }
  if (upper === 'PENDING') {
    return TransitStatus.PENDING;
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string; eventId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'transits:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transit = await prisma.transit.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        companyId: true,
        shipments: {
          select: {
            id: true,
            userId: true,
            vehicleVIN: true,
            vehicleYear: true,
            vehicleMake: true,
            vehicleModel: true,
          },
        },
      },
    });

    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    if (
      (transit.status === TransitStatus.DELIVERED || transit.status === TransitStatus.CANCELLED) &&
      !isClosedStageOverrideAllowed(session.user?.role)
    ) {
      return NextResponse.json(
        { error: 'Closed transit events can only be modified by administrators' },
        { status: 400 }
      );
    }

    const existingEvent = await prisma.transitEvent.findUnique({
      where: { id: params.eventId },
    });

    if (!existingEvent || existingEvent.transitId !== params.id) {
      return NextResponse.json({ error: 'Transit event not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateEventSchema.parse(body);

    if (validatedData.companyId && validatedData.companyId !== existingEvent.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: validatedData.companyId },
        select: { id: true, isActive: true, companyType: true, isTransit: true },
      });

      if (!company || !company.isActive || !companySupportsRole(company, 'TRANSIT')) {
        return NextResponse.json({ error: 'Transit company not found or inactive' }, { status: 404 });
      }

      // Safeguard against modifying carrier when expenses are already posted under this event
      const expenseCount = await prisma.transitExpense.count({
        where: { transitEventId: params.eventId },
      });

      if (expenseCount > 0) {
        return NextResponse.json(
          {
            error: `Cannot change carrier on this event because ${expenseCount} expense(s) are already linked to it. Please delete or reassign those expenses first.`,
          },
          { status: 400 }
        );
      }
    }

    const updatedEvent = await prisma.$transaction(async (tx) => {
      const event = await tx.transitEvent.update({
        where: { id: params.eventId },
        data: {
          ...(validatedData.companyId !== undefined ? { companyId: validatedData.companyId } : {}),
          ...(validatedData.origin !== undefined ? { origin: validatedData.origin } : {}),
          ...(validatedData.destination !== undefined ? { destination: validatedData.destination } : {}),
          ...(validatedData.status !== undefined ? { status: validatedData.status } : {}),
          ...(validatedData.location !== undefined ? { location: validatedData.location } : {}),
          ...(validatedData.description !== undefined ? { description: validatedData.description } : {}),
          ...(validatedData.eventDate !== undefined
            ? { eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : new Date() }
            : {}),
        },
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
      });

      // If status changed and this is the latest event, conditionally update transit status
      if (
        validatedData.status &&
        transit.status !== TransitStatus.DELIVERED &&
        transit.status !== TransitStatus.CANCELLED
      ) {
        const latestEvent = await tx.transitEvent.findFirst({
          where: { transitId: params.id },
          orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
          select: { id: true },
        });

        if (latestEvent?.id === params.eventId) {
          const mappedStatus = mapEventStatusToTransitStatus(validatedData.status);
          if (mappedStatus) {
            await tx.transit.update({
              where: { id: params.id },
              data: { status: mappedStatus },
            });
          }
        }
      }

      return event;
    });

    if (transit.shipments && transit.shipments.length > 0 && validatedData.status) {
      try {
        const statusLabel = validatedData.status.replace(/_/g, ' ');
        const origin = validatedData.origin || existingEvent.origin;
        const destination = validatedData.destination || existingEvent.destination;
        const location = validatedData.location !== undefined ? validatedData.location : existingEvent.location;
        const description = validatedData.description !== undefined ? validatedData.description : existingEvent.description;
        const routeLabel = `${origin} → ${destination}`;
        const locationLabel = location ? ` at ${location}` : '';
        const descLabel = description ? ` (${description})` : '';

        const notificationEvents = transit.shipments.map((shipment) => {
          const vehicleName = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle';
          return {
            shipmentId: shipment.id,
            shipmentUserId: shipment.userId,
            title: `Transit Milestone Updated: ${statusLabel}`,
            customerDescription: `${vehicleName} milestone updated on leg ${routeLabel}${locationLabel}${descLabel}.`,
            internalDescription: `Transit ${transit.referenceNumber} milestone updated: ${statusLabel} on ${routeLabel}${locationLabel}.`,
            link: `/dashboard/shipments/${shipment.id}`,
          };
        });

        await sendShipmentWorkflowNotifications(session.user!.id as string, notificationEvents, { prisma });
      } catch (notifyErr) {
        console.warn('[Transit Event Update] Workflow notification failed:', notifyErr);
      }
    }

    return NextResponse.json({ event: updatedEvent });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error updating transit event:', error);
    return NextResponse.json({ error: 'Failed to update transit event' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string; eventId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'transits:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transit = await prisma.transit.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });

    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    if (
      (transit.status === TransitStatus.DELIVERED || transit.status === TransitStatus.CANCELLED) &&
      !isClosedStageOverrideAllowed(session.user?.role)
    ) {
      return NextResponse.json(
        { error: 'Closed transit events can only be deleted by administrators' },
        { status: 400 }
      );
    }

    const existingEvent = await prisma.transitEvent.findUnique({
      where: { id: params.eventId },
    });

    if (!existingEvent || existingEvent.transitId !== params.id) {
      return NextResponse.json({ error: 'Transit event not found' }, { status: 404 });
    }

    // Financial integrity check: Do not allow deleting an event that has transit expenses linked
    const expenseCount = await prisma.transitExpense.count({
      where: { transitEventId: params.eventId },
    });

    if (expenseCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete transit event because it has ${expenseCount} associated expense(s). Please delete or reassign those expenses first.`,
        },
        { status: 400 }
      );
    }

    await prisma.transitEvent.delete({
      where: { id: params.eventId },
    });

    return NextResponse.json({
      success: true,
      message: 'Transit event deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transit event:', error);
    return NextResponse.json({ error: 'Failed to delete transit event' }, { status: 500 });
  }
}
