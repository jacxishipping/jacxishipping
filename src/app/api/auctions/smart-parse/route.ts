import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { parseAuctionText, parseAuctionUrl } from '@/lib/auction-smart-parser';
import { decodeVIN, getBestWeightEstimate } from '@/lib/services/vin-decoder';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'shipments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { text, vin, url } = body as { text?: string; vin?: string; url?: string };

    // 1. Direct VIN Decode via Free NHTSA API
    if (vin && vin.trim().length === 17) {
      const trimmedVin = vin.trim().toUpperCase();
      try {
        const decoded = await decodeVIN(trimmedVin);
        const weight = getBestWeightEstimate(decoded);

        return NextResponse.json({
          success: true,
          source: 'nhtsa-vin',
          data: {
            vehicleVIN: trimmedVin,
            vehicleMake: decoded.make?.toUpperCase(),
            vehicleModel: decoded.model?.toUpperCase(),
            vehicleYear: decoded.year,
            vehicleType: decoded.vehicleType?.toLowerCase(),
            bodyStyle: decoded.bodyClass,
            color: decoded.color?.toUpperCase(),
            weightEstimate: weight,
            internalNotes: [
              decoded.engineDisplacement ? `Engine: ${decoded.engineDisplacement}L` : undefined,
              decoded.engineCylinders ? `Cylinders: ${decoded.engineCylinders}` : undefined,
              decoded.fuelType ? `Fuel: ${decoded.fuelType}` : undefined,
              decoded.driveType ? `Drive: ${decoded.driveType}` : undefined,
              decoded.plantCountry ? `Assembly: ${decoded.plantCountry}` : undefined,
            ].filter(Boolean).join(' | '),
          },
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `Failed to decode VIN: ${err.message}`,
        }, { status: 400 });
      }
    }

    // 2. Direct URL Parser
    if (url && url.trim()) {
      const parsedUrl = parseAuctionUrl(url.trim());
      if (parsedUrl) {
        return NextResponse.json({
          success: true,
          source: 'url',
          data: parsedUrl,
        });
      }
    }

    // 3. Raw Text / Copied Page / Document Text Parser
    if (text && text.trim()) {
      const parsed = await parseAuctionText(text.trim());
      return NextResponse.json({
        success: true,
        source: parsed.source,
        data: parsed,
      });
    }

    return NextResponse.json(
      { error: 'Provide text, url, or vin to parse.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[smart-parse-api] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to parse auction details' },
      { status: 500 }
    );
  }
}
