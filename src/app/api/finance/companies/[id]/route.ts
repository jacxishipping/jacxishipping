import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

function isCompanyExpenseLedgerEntry(entry: {
  category?: string | null;
  reference?: string | null;
  metadata?: unknown;
}) {
  const category = (entry.category || '').toLowerCase();
  const reference = (entry.reference || '').toLowerCase();
  const metadata =
    entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
      ? (entry.metadata as Record<string, unknown>)
      : {};

  if (category.includes('expense recovery') || category.includes('shipping fare') || category.includes('damage cost')) {
    return true;
  }

  return (
    metadata.isExpenseRecovery === true ||
    metadata.isDispatchExpense === true ||
    metadata.isTransitExpense === true ||
    metadata.isContainerExpense === true ||
    metadata.isShipmentShippingFare === true ||
    metadata.isShipmentDamage === true ||
    reference.startsWith('shipment-expense:') ||
    reference.startsWith('dispatch-expense:') ||
    reference.startsWith('transit-expense:') ||
    reference.startsWith('container-expense:') ||
    reference.startsWith('shipment-shipping-fare:') ||
    reference.startsWith('shipment-damage:')
  );
}

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  companyType: z.enum(['SHIPPING', 'DISPATCH', 'TRANSIT']).optional(),
  isDispatch: z.boolean().optional(),
  isShipping: z.boolean().optional(),
  isTransit: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

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

    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        dispatches: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            origin: true,
            destination: true,
            createdAt: true,
            _count: {
              select: {
                shipments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        containers: {
          select: {
            id: true,
            containerNumber: true,
            status: true,
            currentCount: true,
            maxCapacity: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        shipments: {
          where: {
            OR: [
              { containerId: { not: null } },
              { transitId: { not: null } },
            ],
          },
          select: {
            id: true,
            vehicleVIN: true,
            vehicleMake: true,
            vehicleModel: true,
            status: true,
            createdAt: true,
            transitId: true,
            containerId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        },
        transits: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            origin: true,
            destination: true,
            createdAt: true,
            _count: {
              select: {
                shipments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        _count: {
          select: {
            ledgerEntries: true,
            dispatches: true,
            containers: true,
            shipments: true,
            transits: true,
          },
        },
        priceLists: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            name: true,
            destinationLabel: true,
            sourceFileName: true,
            importMode: true,
            importedStateRateCount: true,
            importedAuctionRateCount: true,
            config: true,
            warnings: true,
            isActive: true,
            effectiveFrom: true,
            createdAt: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Unified query: fetch all shipments this company dispatched, shipped, or transited
    const shipmentsPromise = prisma.shipment.findMany({
      where: {
        OR: [
          // Dispatched by this company
          { dispatch: { companyId: company.id } },
          // Shipped by this company (directly or via container)
          { shippingCompanyId: company.id },
          { container: { companyId: company.id } },
          // Transited by this company (directly or via transit event)
          { transit: { companyId: company.id } },
          { transit: { events: { some: { companyId: company.id } } } },
        ],
      },
      select: {
        id: true,
        vehicleVIN: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehicleColor: true,
        lotNumber: true,
        status: true,
        serviceType: true,
        price: true,
        companyShippingFare: true,
        damageCost: true,
        damageCredit: true,
        createdAt: true,
        dispatchId: true,
        containerId: true,
        transitId: true,
        shippingCompanyId: true,
        dispatch: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            origin: true,
            destination: true,
            dispatchDate: true,
            companyId: true,
          },
        },
        container: {
          select: {
            id: true,
            containerNumber: true,
            status: true,
            trackingNumber: true,
            companyId: true,
          },
        },
        transit: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            origin: true,
            destination: true,
            companyId: true,
            events: {
              where: { companyId: company.id },
              select: { id: true, companyId: true },
              take: 1,
            },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // ⚡ Bolt: Consolidated aggregates and parallelized with shipments query
    const [rawShipments, groupedSums, latestEntry, expenseEntries] = await Promise.all([
      shipmentsPromise,
      prisma.companyLedgerEntry.groupBy({
        by: ['type'],
        where: { companyId: company.id, type: { in: ['DEBIT', 'CREDIT'] } },
        _sum: { amount: true },
      }),
      prisma.companyLedgerEntry.findFirst({
        where: { companyId: company.id },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        select: { balance: true },
      }),
      prisma.companyLedgerEntry.findMany({
        where: { companyId: company.id },
        select: { amount: true, category: true, reference: true, metadata: true },
      }),
    ]);

    const totalExpenseCharges = expenseEntries.reduce((sum, entry) => {
      return isCompanyExpenseLedgerEntry(entry) ? sum + entry.amount : sum;
    }, 0);

    const enrichedShipments = rawShipments.map((s) => {
      const isDispatched = Boolean(s.dispatch?.companyId === company.id);
      const isShipped = Boolean(s.shippingCompanyId === company.id || s.container?.companyId === company.id);
      const isTransited = Boolean(s.transit?.companyId === company.id || (s.transit?.events && s.transit.events.length > 0));
      const roles: Array<'DISPATCH' | 'SHIPPING' | 'TRANSIT'> = [];
      if (isDispatched) roles.push('DISPATCH');
      if (isShipped) roles.push('SHIPPING');
      if (isTransited) roles.push('TRANSIT');

      return {
        id: s.id,
        vehicleVIN: s.vehicleVIN,
        vehicleMake: s.vehicleMake,
        vehicleModel: s.vehicleModel,
        vehicleYear: s.vehicleYear,
        vehicleColor: s.vehicleColor,
        lotNumber: s.lotNumber,
        status: s.status,
        serviceType: s.serviceType,
        price: s.price,
        companyShippingFare: s.companyShippingFare,
        damageCost: s.damageCost,
        damageCredit: s.damageCredit,
        createdAt: s.createdAt,
        dispatchId: s.dispatchId,
        containerId: s.containerId,
        transitId: s.transitId,
        shippingCompanyId: s.shippingCompanyId,
        isDispatched,
        isShipped,
        isTransited,
        roles,
        dispatch: s.dispatch
          ? {
              id: s.dispatch.id,
              referenceNumber: s.dispatch.referenceNumber,
              status: s.dispatch.status,
              origin: s.dispatch.origin,
              destination: s.dispatch.destination,
              dispatchDate: s.dispatch.dispatchDate,
            }
          : null,
        container: s.container
          ? {
              id: s.container.id,
              containerNumber: s.container.containerNumber,
              status: s.container.status,
              trackingNumber: s.container.trackingNumber,
            }
          : null,
        transit: s.transit
          ? {
              id: s.transit.id,
              referenceNumber: s.transit.referenceNumber,
              status: s.transit.status,
              origin: s.transit.origin,
              destination: s.transit.destination,
            }
          : null,
        customer: s.user
          ? {
              id: s.user.id,
              name: s.user.name,
              email: s.user.email,
            }
          : null,
      };
    });

    const dispatchedCount = enrichedShipments.filter((s) => s.isDispatched).length;
    const shippedCount = enrichedShipments.filter((s) => s.isShipped).length;
    const transitedCount = enrichedShipments.filter((s) => s.isTransited).length;

    const responseCompany = {
      ...company,
      shipments: enrichedShipments,
      _count: {
        ...company._count,
        shipments: enrichedShipments.length,
        dispatchedShipments: dispatchedCount,
        shippedShipments: shippedCount,
        transitedShipments: transitedCount,
      },
    };

    return NextResponse.json({
      company: responseCompany,
      summary: {
        totalDebit: groupedSums.find(g => g.type === 'DEBIT')?._sum?.amount || 0,
        totalCredit: groupedSums.find(g => g.type === 'CREDIT')?._sum?.amount || 0,
        totalExpenseCharges,
        currentBalance: latestEntry?.balance || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCompanySchema.parse(body);

    const existing = await prisma.company.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...validatedData,
      },
    });

    return NextResponse.json({ company });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company._count.ledgerEntries > 0 && !forceDelete) {
      return NextResponse.json(
        { error: 'Company has ledger transactions. Use force=true to delete all records.' },
        { status: 400 }
      );
    }

    await prisma.company.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
