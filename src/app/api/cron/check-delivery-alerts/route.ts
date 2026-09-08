import { NextRequest, NextResponse } from 'next/server';
import { ContainerLifecycleStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { validateCronRequest } from '@/lib/cron-auth';
import { logger } from '@/lib/logger';

// Arrival alert status
enum ArrivalAlertStatus {
  ON_TIME = 'ON_TIME',
  WARNING = 'WARNING',
  OVERDUE = 'OVERDUE',
  ARRIVED = 'ARRIVED',
}

// This endpoint can be called by a cron job to check container arrival alerts
export async function GET(request: NextRequest) {
  return runDeliveryAlerts(request);
}

export async function POST(request: NextRequest) {
  return runDeliveryAlerts(request);
}

async function runDeliveryAlerts(request: NextRequest) {
  try {
    // Verify cron secret for security
    if (!validateCronRequest(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Get all containers that are in transit and have an ETA
    const containersToCheck = await prisma.container.findMany({
      where: {
        status: {
          in: [ContainerLifecycleStatus.IN_TRANSIT, ContainerLifecycleStatus.LOADED],
        },
        estimatedArrival: {
          not: null,
        },
      },
      select: {
        id: true,
        containerNumber: true,
        estimatedArrival: true,
        status: true,
        shipments: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    const results = {
      total: containersToCheck.length,
      warnings: 0,
      overdue: 0,
      onTime: 0,
      details: [] as Array<{
        containerId: string;
        containerNumber: string;
        status: string;
        estimatedArrival: Date;
        alertStatus: string;
      }>,
    };

    // Check each container
    for (const container of containersToCheck) {
      try {
        const eta = new Date(container.estimatedArrival!);
        let alertStatus: ArrivalAlertStatus;

        // Determine alert status
        if (now > eta) {
          // Past ETA - OVERDUE
          alertStatus = ArrivalAlertStatus.OVERDUE;
          results.overdue++;
        } else if (eta <= threeDaysFromNow) {
          // Within 3 days of ETA - WARNING
          alertStatus = ArrivalAlertStatus.WARNING;
          results.warnings++;
        } else {
          // More than 3 days until ETA - ON_TIME
          alertStatus = ArrivalAlertStatus.ON_TIME;
          results.onTime++;
        }

        results.details.push({
          containerId: container.id,
          containerNumber: container.containerNumber,
          status: container.status,
          estimatedArrival: eta,
          alertStatus: alertStatus,
        });

        // TODO: Send notification to users with shipments in this container
        // You can implement email/SMS notifications here based on the alert status
      } catch (error) {
        logger.error(`Error checking container ${container.id}:`, error);
      }
    }

    return NextResponse.json({
      message: 'Container arrival alerts check completed',
      results,
    }, { status: 200 });
  } catch (error) {
    logger.error('Error checking delivery alerts:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
