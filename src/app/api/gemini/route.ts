import { NextRequest, NextResponse } from 'next/server';
import { JacxiDataProvider } from '../../../../mcps/jacxishipping/src/data-provider';
import { getGeminiTools } from '../../../../mcps/jacxishipping/src/ai-schemas';
import { verifyAuth } from '../../../../mcps/jacxishipping/src/auth';

const provider = new JacxiDataProvider();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

/**
 * GET /api/gemini
 * Returns Gemini function declarations, instructions, and interactive test schema.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // If action is specified, execute simple GET request
  if (action) {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json({ error: auth.error }, { status: 401, headers: corsHeaders });
    }

    if (action === 'search_vin') {
      const vin = searchParams.get('vin') || '';
      const includeTracking = searchParams.get('includeTracking') !== 'false';
      const results = await provider.searchVin(vin, includeTracking);
      return NextResponse.json({ found: results.length > 0, results }, { headers: corsHeaders });
    }

    if (action === 'search_container') {
      const number = searchParams.get('number') || searchParams.get('containerNumber') || '';
      const includeShipments = searchParams.get('includeShipments') !== 'false';
      const results = await provider.searchContainer(number, includeShipments);
      return NextResponse.json({ found: results.length > 0, results }, { headers: corsHeaders });
    }

    if (action === 'track') {
      const query = searchParams.get('query') || '';
      const tracking = await provider.track(query);
      return NextResponse.json({ found: Boolean(tracking), tracking }, { headers: corsHeaders });
    }
  }

  // Otherwise return full Gemini tool declarations & quickstart code
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  return NextResponse.json(
    {
      service: 'Jacxi Shipping Simple Gemini Gateway',
      description: 'Plug-and-play Function Calling endpoint for Google Gemini API and Gemini Live',
      endpoint: `${baseUrl}/api/gemini`,
      tools: getGeminiTools(),
      python_sdk_example: `
import google.generativeai as genai
import requests

genai.configure(api_key="YOUR_GEMINI_API_KEY")

API_URL = "${baseUrl}/api/gemini"
HEADERS = {"Authorization": "Bearer YOUR_MCP_API_KEY"}

def search_vin(vin: str, includeTracking: bool = True):
    """Search for a vehicle in Jacxi Shipping by VIN or lot number."""
    return requests.post(API_URL, headers=HEADERS, json={
        "name": "search_vin",
        "args": {"vin": vin, "includeTracking": includeTracking}
    }).json()

def search_container(containerNumber: str, includeShipments: bool = True):
    """Search for an ocean freight container by container number or booking ID."""
    return requests.post(API_URL, headers=HEADERS, json={
        "name": "search_container",
        "args": {"containerNumber": containerNumber, "includeShipments": includeShipments}
    }).json()

def track(query: str):
    """Universal live tracking for any VIN or container number."""
    return requests.post(API_URL, headers=HEADERS, json={
        "name": "track",
        "args": {"query": query}
    }).json()

model = genai.GenerativeModel("gemini-1.5-pro", tools=[search_vin, search_container, track])
chat = model.start_chat(enable_automatic_function_calling=True)
response = chat.send_message("Where is container CAAU5189072 and what cars are inside?")
print(response.text)
`.trim(),
    },
    { headers: corsHeaders }
  );
}

/**
 * POST /api/gemini
 * Receives Gemini function call payloads, executes them, and returns standard response.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error || 'Authentication required' },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json();

    // Support both direct format and Google Gemini FunctionCall format:
    // Format 1: { name: "search_vin", args: { vin: "..." } }
    // Format 2: { functionCall: { name: "search_vin", args: { ... } } }
    // Format 3: { action: "search_vin", vin: "..." }
    const callObj = body.functionCall || body;
    const toolName = callObj.name || callObj.action || callObj.tool;
    const args = callObj.args || callObj.parameters || body;

    let result: any = null;

    if (toolName === 'search_vin') {
      const vin = args.vin || args.query || '';
      const includeTracking = args.includeTracking !== false;
      result = await provider.searchVin(vin, includeTracking);
    } else if (toolName === 'search_container') {
      const number = args.containerNumber || args.number || args.query || '';
      const includeShipments = args.includeShipments !== false;
      result = await provider.searchContainer(number, includeShipments);
    } else if (toolName === 'track') {
      const query = args.query || args.trackingNumber || args.trackNumber || '';
      result = await provider.track(query);
    } else if (toolName === 'get_shipping_overview' || toolName === 'overview') {
      result = await provider.getStats();
    } else if (toolName === 'list_containers') {
      result = await provider.listContainers(args);
    } else if (toolName === 'list_shipments') {
      result = await provider.listShipments(args);
    } else if (toolName === 'search_customer') {
      result = await provider.searchCustomers(args.query || 'all', args.limit ? Number(args.limit) : undefined);
    } else if (toolName === 'list_dispatches') {
      result = await provider.listDispatches(args);
    } else if (toolName === 'get_container_manifest') {
      const containers = await provider.searchContainer(args.containerNumber || '', true);
      result = containers[0] || null;
    } else if (toolName === 'calculate_shipping_quote') {
      result = provider.calculateQuote(args);
    } else if (toolName === 'create_shipment') {
      result = await provider.createShipment(args);
    } else if (toolName === 'update_shipment') {
      result = await provider.updateShipment(args);
    } else if (toolName === 'create_container') {
      result = await provider.createContainer(args);
    } else if (toolName === 'update_container_and_tracking') {
      result = await provider.updateContainerAndTracking(args);
    } else if (toolName === 'create_dispatch') {
      result = await provider.createDispatch(args);
    } else if (toolName === 'list_and_manage_transits') {
      result = await provider.listAndManageTransits(args);
    } else if (toolName === 'manage_customer') {
      result = await provider.manageCustomer(args);
    } else if (toolName === 'get_customer_ledger_and_balance') {
      result = await provider.getCustomerLedgerAndBalance(args.query || '');
    } else if (toolName === 'list_and_search_invoices') {
      result = await provider.listAndSearchInvoices(args);
    } else if (toolName === 'get_financial_and_expense_summary') {
      result = await provider.getFinancialAndExpenseSummary(args);
    } else if (toolName === 'fetch_auction_lot') {
      result = await provider.fetchAuctionLot(args.lotOrVin || args.query || '');
    } else if (toolName === 'sync_live_container_tracking') {
      result = await provider.syncLiveContainerTracking(args.containerNumber || '');
    } else if (toolName === 'list_and_generate_documents') {
      result = await provider.listAndGenerateDocuments(args);
    } else if (toolName === 'send_customer_notification') {
      result = await provider.sendCustomerNotification(args);
    } else if (toolName === 'manage_office_expenses') {
      result = await provider.manageOfficeExpenses(args);
    } else if (toolName === 'manage_shipment_expenses') {
      result = await provider.manageShipmentExpenses(args);
    } else {
      return NextResponse.json(
        { error: `Unknown tool function: "${toolName}".` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Return in standard and Gemini-compatible format
    return NextResponse.json(
      {
        tool: toolName,
        result,
        functionResponse: {
          name: toolName,
          response: {
            output: result,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to execute Gemini function call' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

