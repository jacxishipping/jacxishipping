import { NextRequest, NextResponse } from 'next/server';
import { JacxiDataProvider } from '../../../../../mcps/jacxishipping/src/data-provider';

const provider = new JacxiDataProvider();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    if (action === 'search_vin') {
      const vin = searchParams.get('vin') || '';
      const includeTracking = searchParams.get('includeTracking') !== 'false';
      const results = await provider.searchVin(vin, includeTracking);
      return NextResponse.json({ found: results.length > 0, count: results.length, results }, { headers });
    }

    if (action === 'search_container') {
      const number = searchParams.get('number') || searchParams.get('containerNumber') || '';
      const includeShipments = searchParams.get('includeShipments') !== 'false';
      const results = await provider.searchContainer(number, includeShipments);
      return NextResponse.json({ found: results.length > 0, count: results.length, results }, { headers });
    }

    if (action === 'track') {
      const query = searchParams.get('query') || searchParams.get('q') || '';
      const tracking = await provider.track(query);
      return NextResponse.json({ found: Boolean(tracking), tracking }, { headers });
    }

    if (action === 'overview' || action === 'stats' || action === 'get_shipping_overview') {
      const stats = await provider.getStats();
      return NextResponse.json(stats, { headers });
    }

    if (action === 'get_customer_ledger_and_balance') {
      const res = await provider.getCustomerLedgerAndBalance(searchParams.get('query') || '');
      return NextResponse.json(res, { headers });
    }

    if (action === 'list_and_search_invoices') {
      const res = await provider.listAndSearchInvoices({
        query: searchParams.get('query') || undefined,
        status: searchParams.get('status') || undefined,
      });
      return NextResponse.json(res, { headers });
    }

    if (action === 'get_financial_and_expense_summary') {
      const res = await provider.getFinancialAndExpenseSummary({
        containerNumber: searchParams.get('containerNumber') || undefined,
      });
      return NextResponse.json(res, { headers });
    }

    if (action === 'fetch_auction_lot') {
      const res = await provider.fetchAuctionLot(
        searchParams.get('lotOrVin') || searchParams.get('query') || ''
      );
      return NextResponse.json(res, { headers });
    }

    return NextResponse.json(
      {
        message: 'Jacxi AI Agent Tool Router. Use action=search_vin | search_container | track | overview',
      },
      { headers }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500, headers });
  }
}

export async function POST(request: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const body = await request.json();
    const action = body.action || body.tool;

    if (action === 'search_vin') {
      const vin = body.vin || '';
      const includeTracking = body.includeTracking !== false;
      const results = await provider.searchVin(vin, includeTracking);
      return NextResponse.json({ found: results.length > 0, count: results.length, results }, { headers });
    }

    if (action === 'search_container') {
      const number = body.number || body.containerNumber || '';
      const includeShipments = body.includeShipments !== false;
      const results = await provider.searchContainer(number, includeShipments);
      return NextResponse.json({ found: results.length > 0, count: results.length, results }, { headers });
    }

    if (action === 'track') {
      const query = body.query || body.trackNumber || '';
      const tracking = await provider.track(query);
      return NextResponse.json({ found: Boolean(tracking), tracking }, { headers });
    }

    if (action === 'overview' || action === 'stats' || action === 'get_shipping_overview') {
      const stats = await provider.getStats();
      return NextResponse.json(stats, { headers });
    }

    if (action === 'get_customer_ledger_and_balance') {
      const res = await provider.getCustomerLedgerAndBalance(body.query || '');
      return NextResponse.json(res, { headers });
    }

    if (action === 'list_and_search_invoices') {
      const res = await provider.listAndSearchInvoices(body);
      return NextResponse.json(res, { headers });
    }

    if (action === 'get_financial_and_expense_summary') {
      const res = await provider.getFinancialAndExpenseSummary(body);
      return NextResponse.json(res, { headers });
    }

    if (action === 'list_and_manage_transits') {
      const res = await provider.listAndManageTransits(body);
      return NextResponse.json(res, { headers });
    }

    if (action === 'fetch_auction_lot') {
      const res = await provider.fetchAuctionLot(body.lotOrVin || body.query || '');
      return NextResponse.json(res, { headers });
    }

    if (action === 'sync_live_container_tracking') {
      const res = await provider.syncLiveContainerTracking(body.containerNumber || '');
      return NextResponse.json(res, { headers });
    }

    if (action === 'list_and_generate_documents') {
      const res = await provider.listAndGenerateDocuments(body);
      return NextResponse.json(res, { headers });
    }

    if (action === 'send_customer_notification') {
      const res = await provider.sendCustomerNotification(body);
      return NextResponse.json(res, { headers });
    }

    if (action === 'create_shipment') {
      const res = await provider.createShipment(body);
      return NextResponse.json(res, { headers });
    }

    if (action === 'update_shipment') {
      const res = await provider.updateShipment(body);
      return NextResponse.json(res, { headers });
    }

    if (action === 'create_container') {
      const res = await provider.createContainer(body);
      return NextResponse.json(res, { headers });
    }

    if (action === 'update_container_and_tracking') {
      const res = await provider.updateContainerAndTracking(body);
      return NextResponse.json(res, { headers });
    }

    if (action === 'create_dispatch') {
      const res = await provider.createDispatch(body);
      return NextResponse.json(res, { headers });
    }

    if (action === 'manage_customer') {
      const res = await provider.manageCustomer(body);
      return NextResponse.json(res, { headers });
    }

    return NextResponse.json({ error: `Unknown tool action: ${action}` }, { status: 400, headers });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Invalid request' }, { status: 500, headers });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

