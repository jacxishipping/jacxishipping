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

    if (action === 'overview' || action === 'stats') {
      const stats = await provider.getStats();
      return NextResponse.json(stats, { headers });
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

    if (action === 'overview' || action === 'stats') {
      const stats = await provider.getStats();
      return NextResponse.json(stats, { headers });
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

