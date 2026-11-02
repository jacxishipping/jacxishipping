import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { JacxiDataProvider } from '../../../../../mcps/jacxishipping/src/data-provider';
import { getMcpToolsCatalog } from '../../../../../mcps/jacxishipping/src/tools';

const provider = new JacxiDataProvider();

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage =
      session.user.role === 'admin' ||
      hasPermission(session.user.role, 'shipments:read_all');

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const currentOrigin = `${url.protocol}//${url.host}`;
    const prodOrigin = 'https://jacxishipping.com';

    const [settings, stats, logs] = await Promise.all([
      provider.getMcpGatewaySettings(),
      provider.getStats(),
      provider.getRecentMcpLogs(30),
    ]);

    const tools = getMcpToolsCatalog();

    const resources = [
      {
        uri: 'jacxi://stats/overview',
        name: 'Operational Overview Metrics',
        mimeType: 'application/json',
        description: 'Live count of shipments, containers, and yard inventory by status.',
      },
      {
        uri: 'jacxi://containers/active',
        name: 'Active Ocean Containers',
        mimeType: 'application/json',
        description: 'Live list of containers currently loaded or in transit.',
      },
      {
        uri: 'jacxi://openapi.json',
        name: 'OpenAPI 3.1 Specification',
        mimeType: 'application/json',
        description: 'Full OpenAPI specification for ChatGPT Actions and REST clients.',
      },
    ];

    const prompts = [
      {
        name: 'customer-tracking-update',
        description: 'Draft a customer WhatsApp & Email tracking update from live VIN/Container status.',
        arguments: ['query'],
      },
      {
        name: 'container-manifest-audit',
        description: 'Generate a customs & loading manifest summary for a specific container.',
        arguments: ['containerNumber'],
      },
    ];

    return NextResponse.json({
      serverInfo: {
        name: 'jacxishipping-mcp',
        version: '1.0.0',
        protocolVersion: '2025-03-26',
        transports: ['Streamable HTTP (/api/mcp)', 'SSE (/sse)', 'Stdio (Local CLI)', 'OpenAPI 3.1 (/openapi.json)'],
      },
      settings,
      stats,
      tools,
      resources,
      prompts,
      logs,
      endpoints: {
        production: {
          baseUrl: prodOrigin,
          mcpStreamableHttp: `${prodOrigin}/api/mcp`,
          openApiSpec: `${prodOrigin}/openapi.json`,
          chatGptPluginManifest: `${prodOrigin}/.well-known/ai-plugin.json`,
          simpleGeminiGateway: `${prodOrigin}/api/gemini`,
          schemasEndpoint: `${prodOrigin}/api/ai/schemas`,
          searchVin: `${prodOrigin}/api/ai/search-vin`,
          searchContainer: `${prodOrigin}/api/ai/search-container`,
          track: `${prodOrigin}/api/ai/track`,
        },
        current: {
          baseUrl: currentOrigin,
          mcpStreamableHttp: `${currentOrigin}/api/mcp`,
          openApiSpec: `${currentOrigin}/openapi.json`,
          chatGptPluginManifest: `${currentOrigin}/.well-known/ai-plugin.json`,
          simpleGeminiGateway: `${currentOrigin}/api/gemini`,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load MCP dashboard state' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const canManage =
      session.user.role === 'admin' ||
      hasPermission(session.user.role, 'shipments:read_all');

    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const action = body.action;

    // 1. Rotate / Generate New API Key
    if (action === 'rotate_key') {
      const newKey = `jx_mcp_${crypto.randomBytes(24).toString('hex')}`;
      const updated = await provider.saveMcpGatewaySettings({ apiKey: newKey });
      await provider.logMcpActivity({
        tool: 'rotate_api_key',
        query: 'Admin rotated MCP API key',
        provider: 'dashboard-admin',
        entityType: 'SECURITY',
        responseSummary: 'Generated new MCP_API_KEY',
      });
      return NextResponse.json({
        message: 'New MCP API key generated and saved.',
        settings: updated,
      });
    }

    // 2. Update Gateway Settings
    if (action === 'update_settings') {
      const updated = await provider.saveMcpGatewaySettings({
        enabled: body.enabled,
        apiKey: body.apiKey,
        authMode: body.authMode,
      });
      await provider.logMcpActivity({
        tool: 'update_settings',
        query: `enabled=${updated.enabled}, authMode=${updated.authMode}`,
        provider: 'dashboard-admin',
        entityType: 'SETTINGS',
        responseSummary: 'Updated MCP Gateway configuration',
      });
      return NextResponse.json({
        message: 'MCP Gateway settings updated.',
        settings: updated,
      });
    }

    // 3. Interactive Tool Playground Execution
    if (action === 'execute_tool') {
      const toolName = body.toolName as string;
      const args = (body.args || {}) as Record<string, any>;
      const startTime = Date.now();

      let result: any = null;
      let summary = '';

      switch (toolName) {
        case 'search_vin': {
          const vin = String(args.vin || '').trim();
          result = await provider.searchVin(vin, args.includeTracking !== false);
          summary = `Found ${result.length} vehicle shipment(s) for "${vin}"`;
          break;
        }
        case 'search_container': {
          const num = String(args.containerNumber || args.number || '').trim();
          result = await provider.searchContainer(num, args.includeShipments !== false);
          summary = `Found ${result.length} container(s) for "${num}"`;
          break;
        }
        case 'track': {
          const q = String(args.query || '').trim();
          result = await provider.track(q);
          summary = result
            ? `Tracked ${result.requestedNumber} (${result.resolvedType} - ${result.shipmentStatus})`
            : `No tracking found for "${q}"`;
          break;
        }
        case 'list_containers': {
          result = await provider.listContainers({
            status: args.status || undefined,
            destinationPort: args.destinationPort || undefined,
            search: args.search || undefined,
            limit: Number(args.limit || 15),
          });
          summary = `Listed ${result.length} container(s)`;
          break;
        }
        case 'list_shipments': {
          result = await provider.listShipments({
            status: args.status || undefined,
            search: args.search || undefined,
            containerNumber: args.containerNumber || undefined,
            limit: Number(args.limit || 15),
          });
          summary = `Listed ${result.length} shipment(s)`;
          break;
        }
        case 'get_shipping_overview': {
          result = await provider.getStats();
          summary = `Overview: ${result.totalShipments} shipments, ${result.totalContainers} containers`;
          break;
        }
        case 'search_customer': {
          const q = String(args.query || '').trim();
          result = await provider.searchCustomers(q, Number(args.limit || 10));
          summary = `Found ${result.length} customer(s) matching "${q}"`;
          break;
        }
        case 'list_dispatches': {
          result = await provider.listDispatches({
            status: args.status || undefined,
            search: args.search || undefined,
            limit: Number(args.limit || 15),
          });
          summary = `Listed ${result.length} inland dispatch(es)`;
          break;
        }
        case 'get_container_manifest': {
          const num = String(args.containerNumber || '').trim();
          const containers = await provider.searchContainer(num, true);
          result = containers[0] || null;
          summary = result
            ? `Generated manifest for ${result.containerNumber} (${result.shipmentCount} vehicles)`
            : `Container "${num}" not found`;
          break;
        }
        case 'calculate_shipping_quote': {
          result = provider.calculateQuote({
            vehicleType: args.vehicleType,
            originPort: args.originPort,
            destination: args.destination,
          });
          summary = `Quote estimated at $${result.totalEstimatedUsd} USD (${result.estimatedTransitDays})`;
          break;
        }
        default:
          return NextResponse.json(
            { error: `Unknown tool: ${toolName}` },
            { status: 400 }
          );
      }

      const durationMs = Date.now() - startTime;

      await provider.logMcpActivity({
        tool: toolName,
        query: JSON.stringify(args),
        provider: 'dashboard-playground',
        entityType: 'PLAYGROUND',
        responseSummary: `${summary} (${durationMs}ms)`,
        requestPayload: args,
        responsePayload: Array.isArray(result) ? { count: result.length } : { ok: Boolean(result) },
      });

      const recentLogs = await provider.getRecentMcpLogs(30);

      return NextResponse.json({
        toolName,
        durationMs,
        summary,
        result,
        logs: recentLogs,
      });
    }

    return NextResponse.json({ error: `Invalid action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to process MCP admin request' },
      { status: 500 }
    );
  }
}

