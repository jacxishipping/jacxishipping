import { NextRequest, NextResponse } from 'next/server';
import { TransitStatus } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { companySupportsRole } from '@/lib/company-roles';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';

const createEventSchema = z.object({
  companyId: z.string().min(1),
  origin: z.string().min(1),
  destination: z.string().min(1),
  status: z.string().min(1),
  location: z.string().optional(),
  description: z.string().optional(),
  eventDate: z.string().optional(),
});

function mapEventStatusToTransitStatus(status: string): TransitStatus | null {
  const upper = status.trim().toUpperCase().replace(/[\s_-]+/g, '_');
  if (['IN_TRANSIT', 'LOADED', 'BORDER_CROSSING', 'CUSTOMS_CLEARANCE', 'CUSTOMS_HOLD', 'DEPARTED'].some(s => upper.includes(s))) {
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

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
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

    const transit = await prisma.transit.findUnique({ where: { id: params.id }, select: { id: true } });
    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    const events = await prisma.transitEvent.findMany({
      where: { transitId: params.id },
      include: {
        company: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching transit events:', error);
    return NextResponse.json({ error: 'Failed to fetch transit events' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
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

    const body = await request.json();
    const validatedData = createEventSchema.parse(body);

    const company = await prisma.company.findUnique({
      where: { id: validatedData.companyId },
      select: { id: true, isActive: true, companyType: true, isTransit: true },
    });

    if (!company || !company.isActive || !companySupportsRole(company, 'TRANSIT')) {
      return NextResponse.json({ error: 'Transit company not found' }, { status: 404 });
    }

    const event = await prisma.$transaction(async (tx) => {
      const createdEvent = await tx.transitEvent.create({
        data: {
          transitId: params.id,
          companyId: validatedData.companyId,
          origin: validatedData.origin,
          destination: validatedData.destination,
          status: validatedData.status,
          location: validatedData.location ?? null,
          description: validatedData.description ?? null,
          eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : new Date(),
          createdBy: session.user!.id as string,
        },
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
      });

      const transitUpdates: { companyId?: string; status?: TransitStatus } = {};
      if (!transit.companyId) {
        transitUpdates.companyId = validatedData.companyId;
      }

      if (transit.status !== TransitStatus.DELIVERED && transit.status !== TransitStatus.CANCELLED) {
        const mappedStatus = mapEventStatusToTransitStatus(validatedData.status);
        if (mappedStatus) {
          transitUpdates.status = mappedStatus;
        }
      }

      if (Object.keys(transitUpdates).length > 0) {
        await tx.transit.update({
          where: { id: params.id },
          data: transitUpdates,
        });
      }

      return createdEvent;
    });

    if (transit.shipments && transit.shipments.length > 0) {
      try {
        const statusLabel = validatedData.status.replace(/_/g, ' ');
        const routeLabel = `${validatedData.origin} → ${validatedData.destination}`;
        const locationLabel = validatedData.location ? ` at ${validatedData.location}` : '';
        const descLabel = validatedData.description ? ` (${validatedData.description})` : '';

        const notificationEvents = transit.shipments.map((shipment) => {
          const vehicleName = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || 'Vehicle';
          return {
            shipmentId: shipment.id,
            shipmentUserId: shipment.userId,
            title: `Transit Milestone: ${statusLabel}`,
            customerDescription: `${vehicleName} milestone reached on leg ${routeLabel}${locationLabel}${descLabel}.`,
            internalDescription: `Transit ${transit.referenceNumber} milestone updated: ${statusLabel} on ${routeLabel}${locationLabel}.`,
            link: `/dashboard/shipments/${shipment.id}`,
          };
        });

        await sendShipmentWorkflowNotifications(session.user!.id as string, notificationEvents, { prisma });
      } catch (notifyErr) {
        console.warn('[Transit Event] Workflow notification failed:', notifyErr);
      }
    }

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error creating transit event:', error);
    return NextResponse.json({ error: 'Failed to create transit event' }, { status: 500 });
  }
}
