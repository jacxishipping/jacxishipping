import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import {
  getStoredAutomationSettings,
  saveStoredAutomationSettings,
} from '@/lib/settings/automation-settings';
import { createSystemAuditLog } from '@/lib/system-audit';

export const dynamic = 'force-dynamic';

const updateAutomationSettingsSchema = z.object({
  autoInvoicingEnabled: z.boolean().optional(),
  autoInvoiceOnShipmentCreation: z.boolean().optional(),
  autoInvoiceOnContainerCompletion: z.boolean().optional(),
  autoInvoiceCronBatchEnabled: z.boolean().optional(),
  autoInvoicePaymentTermsDays: z.number().int().min(0).max(180).optional(),
  autoInvoiceSendEmail: z.boolean().optional(),
  milestoneNotificationsEnabled: z.boolean().optional(),
  milestoneWhatsAppEnabled: z.boolean().optional(),
  milestoneEmailEnabled: z.boolean().optional(),
  autoMarkOverdueInvoices: z.boolean().optional(),
  autoPaymentRemindersEnabled: z.boolean().optional(),
  autoApplyAiDamageInspection: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || !hasPermission(session.user.role, 'dashboard:view')) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const settings = getStoredAutomationSettings();
    return NextResponse.json({ settings }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Failed to load automation settings.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateAutomationSettingsSchema.parse(body);

    const oldSettings = getStoredAutomationSettings();
    const updated = saveStoredAutomationSettings(validated);

    try {
      await createSystemAuditLog({
        action: 'UPDATE_AUTOMATION_SETTINGS',
        entityType: 'settings',
        actorUserId: session.user.id,
        summary: 'Updated system automation and lifecycle invoicing settings',
        metadata: {
          changedFields: Object.keys(validated),
          previous: oldSettings as unknown as Prisma.InputJsonValue,
          current: updated as unknown as Prisma.InputJsonValue,
        },
      });
    } catch {
      // Non-blocking audit log
    }

    return NextResponse.json({
      success: true,
      message: 'Automation and invoicing settings updated successfully.',
      settings: updated,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid settings payload', errors: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { message: error?.message || 'Failed to save automation settings.' },
      { status: 500 }
    );
  }
}

