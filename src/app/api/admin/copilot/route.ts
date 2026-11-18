import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import {
  processAdminCopilotMessage,
  updateShipmentStatusTool,
  createShipmentTool,
  getSystemOverviewTool,
  searchCarriersTool,
  getShipmentDamageTool,
  draftWhatsAppUpdateTool,
  generateReleaseTokenTool,
  CopilotContext,
} from '@/lib/ai/admin-copilot';
import { createAiInteractionLog } from '@/lib/ai/audit';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'dashboard:view')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to access Admin Copilot' }, { status: 403 });
    }

    const body = await request.json();
    const { message, history = [], actionId, payload, context } = body as {
      message?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
      actionId?: string;
      payload?: Record<string, any>;
      context?: CopilotContext;
    };

    const contextUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
    };

    // If an action button was clicked directly
    if (actionId) {
      if (actionId === 'system_overview') {
        const res = await getSystemOverviewTool();
        return NextResponse.json({
          reply: res.reply,
          toolExecuted: 'get_system_overview',
          actionCards: res.actionCards,
          suggestedPrompts: ['Show active containers', 'List dispatches', 'Outstanding invoices'],
        });
      }

      if (actionId === 'draft_whatsapp' && (payload?.shipmentId || payload?.vin)) {
        const target = payload.shipmentId || payload.vin;
        const res = await draftWhatsAppUpdateTool(target, payload?.note);
        return NextResponse.json({
          reply: res.reply,
          toolExecuted: 'draft_whatsapp',
          actionCards: res.actionCards,
          suggestedPrompts: ['System Overview', 'View Shipments'],
        });
      }

      if (actionId === 'generate_release_token' && (payload?.shipmentId || payload?.vin)) {
        const target = payload.shipmentId || payload.vin;
        const res = await generateReleaseTokenTool(target, contextUser);
        return NextResponse.json({
          reply: res.reply,
          toolExecuted: 'generate_release_token',
          actionCards: res.actionCards,
          suggestedPrompts: ['Assign Transit', 'System Overview'],
        });
      }

      if (actionId === 'search_carriers') {
        const res = await searchCarriersTool(payload?.query);
        return NextResponse.json({
          reply: res.reply,
          toolExecuted: 'search_carriers',
          actionCards: res.actionCards,
          suggestedPrompts: ['List dispatches', 'System Overview'],
        });
      }

      if (actionId === 'get_damage_summary') {
        const res = await getShipmentDamageTool(payload?.query);
        return NextResponse.json({
          reply: res.reply,
          toolExecuted: 'get_damage_summary',
          actionCards: res.actionCards,
          suggestedPrompts: ['Vehicle Inspections', 'System Overview'],
        });
      }

      if (actionId === 'update_shipment_status' && payload?.shipmentId && payload?.status) {
        const res = await updateShipmentStatusTool(payload.shipmentId, payload.status, contextUser);
        return NextResponse.json({
          reply: res.reply,
          toolExecuted: 'update_shipment_status',
          actionCards: res.actionCards,
          suggestedPrompts: ['System Overview', 'View Shipments'],
        });
      }

      if (actionId === 'create_shipment' && payload?.vin) {
        const res = await createShipmentTool(payload as any, contextUser);
        return NextResponse.json({
          reply: res.reply,
          toolExecuted: 'create_shipment',
          actionCards: res.actionCards,
          suggestedPrompts: ['System Overview', 'View Shipments'],
        });
      }
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const result = await processAdminCopilotMessage(message, history, contextUser, context);

    try {
      await createAiInteractionLog({
        feature: 'admin_copilot',
        entityType: 'admin_panel',
        entityId: session.user.id,
        prompt: message,
        response: result.reply,
        requestPayload: { historyCount: history.length, path: context?.currentPath },
        responsePayload: { tool: result.toolExecuted, cardsCount: result.actionCards?.length || 0 },
        status: 'SUCCESS',
        actorUserId: session.user.id,
        provider: 'tokenrouter',
      });
    } catch {
      // Non-blocking audit logging
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Admin Copilot Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to process Admin Copilot request',
      },
      { status: 500 }
    );
  }
}
