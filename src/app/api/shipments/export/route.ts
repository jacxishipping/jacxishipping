import { NextRequest, NextResponse } from 'next/server';
import { Prisma, ShipmentSimpleStatus } from '@prisma/client';
import { routeDeps } from '@/lib/route-deps';
import { sanitizeTrackNumber } from '@/lib/tracking-sanitize';
import { buildShipmentWorkflowStageWhereInput, isShipmentWorkflowStage } from '@/lib/shipment-workflow-stage';
import { SHIPMENT_EXPORT_HEADERS, formatShipmentForExport } from '@/lib/export';

const SUPPORTED_SHIPMENT_STATUSES = new Set<ShipmentSimpleStatus>([
  'ON_HAND',
  'DISPATCHING',
  'IN_TRANSIT',
  'RELEASED',
  'IN_TRANSIT_TO_DESTINATION',
  'DELIVERED',
]);

export async function GET(request: NextRequest) {
  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'csv').toLowerCase();
    const rawQuery = (searchParams.get('query') || searchParams.get('search') || '').trim();
    const query = rawQuery ? sanitizeTrackNumber(rawQuery) || rawQuery : '';
    const status = searchParams.get('status');
    const workflowStage = searchParams.get('workflowStage');
    const yardReceived = searchParams.get('yardReceived');
    const containerId = searchParams.get('containerId');
    const transitId = searchParams.get('transitId');
    const dispatchId = searchParams.get('dispatchId');
    const userId = searchParams.get('userId') || searchParams.get('customerId');
    const idsParam = searchParams.get('ids');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limitParam = parseInt(searchParams.get('limit') || '5000', 10);
    const limit = Math.min(Math.max(1, limitParam), 10000);

    const canReadAll = (session.user?.role && routeDeps.hasPermission(session.user.role, 'shipments:read_all')) || session.user?.role === 'admin';

    const where: Prisma.ShipmentWhereInput = {};

    // Permission enforcement: regular customers can only export their own shipments
    if (!canReadAll) {
      where.userId = session.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    // Specific IDs filter
    if (idsParam) {
      const idList = idsParam.split(',').map((id) => id.trim()).filter(Boolean);
      if (idList.length > 0) {
        where.id = { in: idList };
      }
    }

    // Status filter
    if (status && SUPPORTED_SHIPMENT_STATUSES.has(status as ShipmentSimpleStatus)) {
      where.status = status as ShipmentSimpleStatus;
    }

    // Workflow stage filter
    if (workflowStage && isShipmentWorkflowStage(workflowStage)) {
      Object.assign(where, buildShipmentWorkflowStageWhereInput(workflowStage));
    }

    // Yard received filter via auditLogs
    if (yardReceived === 'true') {
      where.auditLogs = {
        some: {
          action: 'DISPATCH_COMPLETED',
          description: { contains: 'received to yard', mode: 'insensitive' },
        },
      };
    } else if (yardReceived === 'false') {
      where.auditLogs = {
        none: {
          action: 'DISPATCH_COMPLETED',
          description: { contains: 'received to yard', mode: 'insensitive' },
        },
      };
    }

    // Container filter
    if (containerId) {
      where.containerId = containerId;
    }

    // Transit filter
    if (transitId) {
      where.transitId = transitId;
    }

    // Dispatch filter
    if (dispatchId) {
      where.dispatchId = dispatchId;
    }

    // Date range filter
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) {
        where.createdAt.gte = new Date(dateFrom);
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    // Search query filter
    if (query) {
      const orConditions: Prisma.ShipmentWhereInput[] = [
        { id: { equals: query } },
        { vehicleType: { contains: query, mode: 'insensitive' } },
        { vehicleMake: { contains: query, mode: 'insensitive' } },
        { vehicleModel: { contains: query, mode: 'insensitive' } },
        { vehicleVIN: { contains: query, mode: 'insensitive' } },
        { lotNumber: { contains: query, mode: 'insensitive' } },
        { auctionName: { contains: query, mode: 'insensitive' } },
        {
          container: {
            OR: [
              { containerNumber: { contains: query, mode: 'insensitive' } },
              { trackingNumber: { contains: query, mode: 'insensitive' } },
            ],
          },
        },
        {
          dispatch: {
            referenceNumber: { contains: query, mode: 'insensitive' },
          },
        },
      ];

      if (canReadAll) {
        orConditions.push(
          { user: { name: { contains: query, mode: 'insensitive' } } },
          { user: { email: { contains: query, mode: 'insensitive' } } }
        );
      }

      where.OR = orConditions;
    }

    const shipments = await routeDeps.prisma.shipment.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehicleVIN: true,
        vehicleColor: true,
        lotNumber: true,
        auctionName: true,
        status: true,
        createdAt: true,
        paymentStatus: true,
        serviceType: true,
        purchasePrice: true,
        auditLogs: {
          where: {
            action: 'DISPATCH_COMPLETED',
            description: { contains: 'received to yard', mode: 'insensitive' },
          },
          select: {
            timestamp: true,
          },
          take: 1,
        },
        ledgerEntries: {
          select: {
            type: true,
            amount: true,
            transactionInfoType: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        container: {
          select: {
            containerNumber: true,
            loadingPort: true,
            destinationPort: true,
            estimatedArrival: true,
          },
        },
        transit: {
          select: {
            referenceNumber: true,
            origin: true,
            destination: true,
          },
        },
        dispatch: {
          select: {
            referenceNumber: true,
            origin: true,
            destination: true,
          },
        },
      },
    });

    const formattedRows = (shipments as Array<any>).map((s) => {
      let purchasePricePaid = 0;
      for (const entry of (s.ledgerEntries || [])) {
        if (entry.type === 'CREDIT' && entry.transactionInfoType === 'CAR_PAYMENT') {
          purchasePricePaid += entry.amount;
        }
      }

      return formatShipmentForExport({
        ...s,
        purchasePricePaid,
        yardReceived: Boolean(s.auditLogs && s.auditLogs.length > 0),
      });
    });

    if (format === 'json') {
      return NextResponse.json({
        count: formattedRows.length,
        shipments: formattedRows,
      });
    }

    // Generate CSV (with UTF-8 BOM so Excel displays correctly)
    const headerLine = SHIPMENT_EXPORT_HEADERS.map((h) => h.label).join(',');
    const dataLines = formattedRows.map((row) =>
      SHIPMENT_EXPORT_HEADERS.map((header) => {
        const val = row[header.key];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    );

    const BOM = '\uFEFF';
    const csvContent = BOM + [headerLine, ...dataLines].join('\n');
    const dateStamp = new Date().toISOString().split('T')[0];
    const filename = `shipments-export-${dateStamp}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Shipment export error:', error);
    return NextResponse.json(
      { message: 'Failed to export shipments' },
      { status: 500 }
    );
  }
}
