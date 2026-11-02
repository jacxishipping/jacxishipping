import { NextRequest, NextResponse } from 'next/server';
import { JacxiDataProvider } from '../../../../../mcps/jacxishipping/src/data-provider';

const provider = new JacxiDataProvider();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const number = (
    searchParams.get('number') ||
    searchParams.get('containerNumber') ||
    searchParams.get('q') ||
    ''
  ).trim();
  const includeShipments = searchParams.get('includeShipments') !== 'false';

  if (!number) {
    return NextResponse.json({ error: 'Query parameter "number" is required.' }, { status: 400, headers: corsHeaders });
  }

  const results = await provider.searchContainer(number, includeShipments);
  return NextResponse.json(
    {
      query: number,
      found: results.length > 0,
      count: results.length,
      results,
    },
    { headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const number = (body.number || body.containerNumber || body.query || '').trim();
    const includeShipments = body.includeShipments !== false;

    if (!number) {
      return NextResponse.json({ error: 'Field "number" is required in request body.' }, { status: 400, headers: corsHeaders });
    }

    const results = await provider.searchContainer(number, includeShipments);
    return NextResponse.json(
      {
        query: number,
        found: results.length > 0,
        count: results.length,
        results,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Invalid JSON body' }, { status: 400, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

