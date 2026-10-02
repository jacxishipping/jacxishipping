import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user?.role, 'users:manage') && !hasPermission(session.user?.role, 'customers:view')) {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can view users' },
        { status: 403 }
      );
    }

    // ⚡ Bolt: Fetch all customers and their VINs in a single query to prevent N+1 issues during CSV export.
    const customers = await prisma.user.findMany({
      where: {
        role: 'user',
      },
      select: {
        id: true,
        name: true,
        shipments: {
          select: {
            vehicleVIN: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const rows = customers.map((customer) => {
      const shipmentVins = customer.shipments
        .map((shipment) => shipment.vehicleVIN)
        .filter((vin): vin is string => Boolean(vin && vin.trim()))
        .join(' | ');

      return {
        customerName: customer.name || 'Unnamed Customer',
        shipmentVins: shipmentVins || 'N/A',
      };
    });

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('Error fetching customer VINs for export:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
