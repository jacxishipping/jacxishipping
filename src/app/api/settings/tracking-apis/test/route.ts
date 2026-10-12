import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { containerTrackingClient } from '@/lib/services/container-tracking-client';
import { trackingAPI } from '@/lib/services/tracking-api';
import { buildTrackingResponse } from '@/lib/tracking-response';

export const dynamic = 'force-dynamic';

const testRequestSchema = z.object({
  target: z.enum([
    'supabase-token',
    'supabase-ping',
    'supabase-container',
    'supabase-vessel',
    'turkon',
    'pgl',
    'pipeline',
    'public-api',
  ]),
  trackingNumber: z.string().trim().optional(),
  imo: z.union([z.string(), z.number()]).optional(),
  apiKey: z.string().trim().optional(),
});

async function requireAdmin() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = testRequestSchema.parse(await request.json());
    const trackingNumber = (payload.trackingNumber || 'TRKU3019842').trim().toUpperCase();

    switch (payload.target) {
      case 'supabase-token': {
        const renewal = await containerTrackingClient.testTokenRenewal();
        const currentDiagnostics = containerTrackingClient.getDiagnostics();

        return NextResponse.json({
          target: 'supabase-token',
          success: renewal.success,
          httpStatus: renewal.httpStatus || (renewal.success ? 200 : 400),
          latencyMs: renewal.latencyMs,
          error: renewal.error,
          tokenExpiresAt: renewal.tokenExpiresAt,
          secondsUntilExpiry: renewal.secondsUntilExpiry,
          renewedAt: renewal.renewedAt,
          diagnostics: currentDiagnostics,
        });
      }

      case 'supabase-ping': {
        const ping = await containerTrackingClient.testPing();
        return NextResponse.json({
          target: 'supabase-ping',
          success: ping.success,
          httpStatus: ping.httpStatus || (ping.success ? 200 : 500),
          latencyMs: ping.latencyMs,
          error: ping.error,
        });
      }

      case 'supabase-container': {
        const start = Date.now();
        const data = await containerTrackingClient.fetchContainerTracking(trackingNumber);
        const latencyMs = Date.now() - start;
        const hasEvents = Boolean(data?.events && data.events.length > 0);

        return NextResponse.json({
          target: 'supabase-container',
          success: Boolean(data),
          trackingNumber,
          latencyMs,
          data,
          eventsCount: data?.events?.length || 0,
          hasEvents,
          message: data
            ? hasEvents
              ? `Found ${data.events?.length} tracking event(s)`
              : 'Container found, but no tracking events yet'
            : 'No container data returned by update-tracking-v2',
        });
      }

      case 'supabase-vessel': {
        const start = Date.now();
        const imo = payload.imo || 9811000;
        const location = await containerTrackingClient.getLiveVesselLocation(imo);
        const latencyMs = Date.now() - start;

        return NextResponse.json({
          target: 'supabase-vessel',
          success: Boolean(location && location.lat !== null && location.lon !== null),
          imo,
          latencyMs,
          location,
          message: location
            ? `Vessel coordinates: ${location.lat}, ${location.lon}`
            : 'Unable to retrieve live AIS coordinates for this IMO',
        });
      }

      case 'turkon': {
        const turkonResult = await trackingAPI.testTurkonLookup(trackingNumber);
        return NextResponse.json({
          target: 'turkon',
          trackingNumber,
          ...turkonResult,
          message: turkonResult.success
            ? `Turkon Online returned active container moves (${turkonResult.snapshot?.trackingEvents.length || 0} events)`
            : turkonResult.error || 'Turkon returned no tracking records for this number',
        });
      }

      case 'pgl': {
        const pglResult = await trackingAPI.testPGLLookup(trackingNumber);
        return NextResponse.json({
          target: 'pgl',
          trackingNumber,
          ...pglResult,
          message: pglResult.success
            ? `PGL System returned ${pglResult.count} tracking records`
            : pglResult.error || 'PGL returned no tracking entries for this number',
        });
      }

      case 'pipeline': {
        const start = Date.now();
        const snapshot = await trackingAPI.fetchContainerTrackingData(trackingNumber);
        const unified = await buildTrackingResponse(trackingNumber);
        const latencyMs = Date.now() - start;

        let detectedSource = 'None';
        if (snapshot) {
          if (trackingNumber.startsWith('TRKU')) {
            detectedSource = 'Turkon Line Direct';
          } else if (snapshot.trackingEvents?.length > 0) {
            detectedSource = 'Supabase / Upstream Engine';
          } else {
            detectedSource = 'PGL / Carrier Fallback';
          }
        }

        return NextResponse.json({
          target: 'pipeline',
          trackingNumber,
          success: Boolean(snapshot || unified),
          latencyMs,
          detectedSource,
          snapshot,
          unified,
          message: snapshot || unified
            ? `Tracking data resolved via ${detectedSource} (${snapshot?.trackingEvents?.length || unified?.events?.length || 0} milestones)`
            : 'No tracking information found across any carrier pipeline',
        });
      }

      case 'public-api': {
        const start = Date.now();
        const tracking = await buildTrackingResponse(trackingNumber);
        const latencyMs = Date.now() - start;

        return NextResponse.json({
          target: 'public-api',
          trackingNumber,
          success: Boolean(tracking),
          latencyMs,
          tracking,
          message: tracking
            ? `Public tracking gateway resolved payload (${tracking.events.length} events)`
            : 'No public tracking information found for this query',
        });
      }

      default:
        return NextResponse.json({ message: 'Unknown test target' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid test payload.', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Test execution failed' },
      { status: 500 }
    );
  }
}
