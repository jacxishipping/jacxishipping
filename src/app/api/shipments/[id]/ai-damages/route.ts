import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import {
  detectDamagesWithAi,
  convertAiResultToInspectionData,
} from '@/lib/ai/damage-detection';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const canManage =
      session.user?.role === 'admin' ||
      hasPermission(session.user?.role, 'shipments:manage') ||
      hasPermission(session.user?.role, 'workflow:move');

    if (!canManage) {
      return NextResponse.json(
        { message: 'Forbidden: Insufficient permissions to analyze damages' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { photoSource, photoUrls, maxPhotos, autoApply, mode } = body as {
      photoSource?: 'ALL' | 'VEHICLE' | 'ARRIVAL' | 'CUSTOM';
      photoUrls?: string[];
      maxPhotos?: number;
      autoApply?: boolean;
      mode?: 'INSPECTION' | 'TRANSIT_COMPARISON';
    };

    const aiResult = await detectDamagesWithAi(id, {
      photoSource,
      photoUrls,
      maxPhotos,
      mode,
    });

    // If autoApply is requested, save directly as an inspection quality check
    if (autoApply) {
      const inspectionData = convertAiResultToInspectionData(
        aiResult,
        `AI Vision (${session.user?.name || 'Automated Surveyor'})`,
        'AI Intake Analysis'
      );

      const existingCheck = await prisma.qualityCheck.findFirst({
        where: {
          shipmentId: id,
          checkType: 'DAMAGE_ASSESSMENT',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingCheck) {
        await prisma.qualityCheck.update({
          where: { id: existingCheck.id },
          data: {
            status: 'PASSED',
            inspector: inspectionData.inspectorName,
            notes: JSON.stringify(inspectionData),
            checkedAt: new Date(),
          },
        });
      } else {
        await prisma.qualityCheck.create({
          data: {
            shipmentId: id,
            checkType: 'DAMAGE_ASSESSMENT',
            status: 'PASSED',
            inspector: inspectionData.inspectorName,
            notes: JSON.stringify(inspectionData),
            checkedAt: new Date(),
          },
        });
      }

      try {
        await prisma.shipmentAuditLog.create({
          data: {
            shipmentId: id,
            performedBy: session.user?.name || session.user?.email || 'System',
            action: 'AI_DAMAGE_DETECTION_APPLIED',
            description: `AI Vision auto-detected and logged ${aiResult.damagesCount} damages (${aiResult.overallGrade}, Est. $${aiResult.totalEstimatedCost.toFixed(2)}) from shipment photos.`,
          },
        });
      } catch (err) {
        console.warn('Failed to create audit log for AI damage scan:', err);
      }
    }

    return NextResponse.json({
      success: true,
      result: aiResult,
    });
  } catch (error: any) {
    console.error('[ai-damages-api] Error:', error);
    return NextResponse.json(
      { message: error?.message || 'Failed to detect damages using AI' },
      { status: 500 }
    );
  }
}
