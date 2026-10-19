import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { containerTrackingClient } from '@/lib/services/container-tracking-client';
import { 
  getStoredTrackingSettings, 
  saveStoredTrackingSettings, 
  maskSecret, 
  type TrackingSettingsValues 
} from '@/lib/tracking-settings';

export const dynamic = 'force-dynamic';

const updateSettingsSchema = z.object({
  supabaseUrl: z.string().trim().url().optional(),
  anonKey: z.string().trim().optional(),
  accessToken: z.string().trim().optional(),
  refreshToken: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  subscriptionStatus: z.string().trim().optional(),
  publicTrackingApiKey: z.string().trim().optional(),
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

export async function GET() {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const storedSettings = getStoredTrackingSettings();
    const supabaseDiagnostics = containerTrackingClient.getDiagnostics();

    // Check configured public tracking API keys
    const combinedKeys = [
      process.env.PUBLIC_TRACKING_API_KEYS,
      process.env.PUBLIC_TRACKING_API_KEY,
      storedSettings.publicTrackingApiKey,
    ]
      .filter(Boolean)
      .join(',');

    const publicKeysList = Array.from(
      new Set(
        combinedKeys
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean)
      )
    );

    // Fetch sample containers from DB for 1-click test populating
    let recentContainers: Array<{
      id: string;
      containerNumber: string;
      trackingNumber: string | null;
      shippingLine: string | null;
      status: string;
      updatedAt: string;
    }> = [];

    try {
      const dbContainers = await prisma.container.findMany({
        take: 8,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          containerNumber: true,
          trackingNumber: true,
          shippingLine: true,
          status: true,
          updatedAt: true,
        },
      });

      recentContainers = dbContainers.map((c) => ({
        id: c.id,
        containerNumber: c.containerNumber,
        trackingNumber: c.trackingNumber,
        shippingLine: c.shippingLine,
        status: c.status,
        updatedAt: c.updatedAt.toISOString(),
      }));
    } catch {
      // Ignore if DB lookup fails
    }

    return NextResponse.json({
      supabase: supabaseDiagnostics,
      turkon: {
        name: 'Turkon Line Online API',
        endpoint: storedSettings.turkonEndpoint,
        targetPrefix: 'TRKU',
        protocol: 'POST /shipping-prod-service/tracking/getTrackingTopInformation/en/',
        status: 'Active',
      },
      pgl: {
        name: 'PGL Legacy Tracking System',
        endpoint: storedSettings.pglEndpoint,
        protocol: 'GET /api/public/tracking?tracking_value=',
        status: 'Active',
      },
      publicGateway: {
        name: 'Jacxi Public & Customer Tracking API',
        endpoints: ['POST /api/tracking', 'GET /api/public/tracking', 'POST /api/public/tracking'],
        keysConfigured: publicKeysList.length > 0,
        keyCount: publicKeysList.length,
        maskedKeys: publicKeysList.map((k) => maskSecret(k)),
      },
      recentContainers,
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to fetch tracking APIs status' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = updateSettingsSchema.parse(await request.json());
    const partial: Partial<TrackingSettingsValues> = {};

    if (payload.supabaseUrl !== undefined) partial.supabaseUrl = payload.supabaseUrl;
    if (payload.anonKey !== undefined && payload.anonKey !== '') partial.anonKey = payload.anonKey;
    if (payload.accessToken !== undefined && payload.accessToken !== '') partial.accessToken = payload.accessToken;
    if (payload.refreshToken !== undefined && payload.refreshToken !== '') partial.refreshToken = payload.refreshToken;
    if (payload.userId !== undefined) partial.userId = payload.userId;
    if (payload.subscriptionStatus !== undefined) partial.subscriptionStatus = payload.subscriptionStatus;
    if (payload.publicTrackingApiKey !== undefined) partial.publicTrackingApiKey = payload.publicTrackingApiKey;

    const saved = saveStoredTrackingSettings(partial);
    containerTrackingClient.updateConfig(saved);

    await createAuditLog(
      'SETTINGS',
      'tracking-apis',
      'UPDATE',
      session.user.id as string,
      {
        summary: `Updated tracking API fields: ${Object.keys(partial).join(', ')}`,
        updatedFields: Object.keys(partial),
      },
      request
    );

    return NextResponse.json({
      ok: true,
      supabase: containerTrackingClient.getDiagnostics(),
      message: 'Tracking API settings saved successfully.',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: 'Invalid tracking settings payload.', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to save tracking settings' },
      { status: 500 }
    );
  }
}
