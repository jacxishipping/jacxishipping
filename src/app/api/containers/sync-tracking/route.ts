import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { trackingSync } from '@/lib/services/tracking-sync';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Optional containerId from body if user wants to refresh a single container
    let containerId: string | undefined;
    try {
      const body = await request.json();
      if (body?.containerId) {
        containerId = body.containerId;
      }
    } catch {
      // Empty or absent body is normal for full refresh
    }

    if (containerId) {
      const result = await trackingSync.syncContainerTracking(containerId, { force: true });
      return NextResponse.json({
        success: result.success,
        processed: 1,
        synced: result.success ? 1 : 0,
        newEvents: result.newEvents,
        updatedEta: result.updatedETA,
        error: result.error,
        message: result.success
          ? `Container tracking refreshed successfully (${result.newEvents} new events).`
          : (result.error || 'Failed to refresh tracking for container.'),
      });
    }

    // Refresh all trackable active containers (exclude closed)
    const containers = await prisma.container.findMany({
      where: {
        status: {
          not: 'CLOSED',
        },
      },
      select: {
        id: true,
        containerNumber: true,
        trackingNumber: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    let synced = 0;
    let totalNewEvents = 0;
    let updatedEtas = 0;
    const errors: Array<{ containerNumber: string; error: string }> = [];

    // Process in concurrent batches of 4
    const BATCH_SIZE = 4;
    for (let i = 0; i < containers.length; i += BATCH_SIZE) {
      const batch = containers.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((c) => trackingSync.syncContainerTracking(c.id, { force: true }))
      );

      results.forEach((res, index) => {
        const c = batch[index];
        if (res.status === 'fulfilled') {
          if (res.value.success) {
            synced++;
            totalNewEvents += res.value.newEvents;
            if (res.value.updatedETA) updatedEtas++;
          } else if (res.value.error) {
            errors.push({ containerNumber: c.containerNumber, error: res.value.error });
          }
        } else {
          errors.push({ containerNumber: c.containerNumber, error: String(res.reason) });
        }
      });
    }

    return NextResponse.json({
      success: true,
      processed: containers.length,
      synced,
      totalNewEvents,
      updatedEtas,
      errorsCount: errors.length,
      message: `Refreshed tracking for ${synced} of ${containers.length} containers (${totalNewEvents} new events tracked).`,
    });
  } catch (error: any) {
    logger.error('Failed to sync container tracking:', error);
    return NextResponse.json(
      { error: 'Failed to sync tracking data', details: error?.message },
      { status: 500 }
    );
  }
}
