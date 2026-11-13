import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canView = hasPermission(session.user?.role, 'containers:view');
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Container status distribution
    const statusCounts = await prisma.container.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusDistribution: Record<string, number> = {};
    for (const row of statusCounts) {
      statusDistribution[row.status] = row._count.id;
    }

    // Total counts
    const totalContainers = await prisma.container.count();
    const activeContainers = await prisma.container.count({
      where: {
        status: { in: ['CREATED', 'WAITING_FOR_LOADING', 'LOADED', 'IN_TRANSIT', 'ARRIVED_PORT', 'CUSTOMS_CLEARANCE'] },
      },
    });
    const autoTrackingEnabled = await prisma.container.count({
      where: { autoTrackingEnabled: true },
    });
    const containersWithTrackingEvents = await prisma.container.count({
      where: { trackingEvents: { some: {} } },
    });

    // Carrier / shipping line distribution
    const carrierCounts = await prisma.container.groupBy({
      by: ['shippingLine'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 15,
    });

    const carrierDistribution = carrierCounts
      .filter((r) => r.shippingLine)
      .map((r) => ({ carrier: r.shippingLine!, count: r._count.id }));

    // Recent containers (last 24h)
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const containersLast24h = await prisma.container.count({
      where: { updatedAt: { gte: last24h } },
    });

    // Containers by destination port (top 10)
    const portCounts = await prisma.container.groupBy({
      by: ['destinationPort'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    const topDestinations = portCounts
      .filter((r) => r.destinationPort)
      .map((r) => ({ port: r.destinationPort!, count: r._count.id }));

    return NextResponse.json({
      totalContainers,
      activeContainers,
      autoTrackingEnabled,
      containersWithTrackingEvents,
      containersLast24h,
      statusDistribution,
      carrierDistribution,
      topDestinations,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch container stats' },
      { status: 500 }
    );
  }
}
