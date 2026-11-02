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
  const vin = (searchParams.get('vin') || searchParams.get('q') || '').trim();
  const includeTracking = searchParams.get('includeTracking') !== 'false';

  if (!vin) {
    return NextResponse.json({ error: 'Query parameter "vin" is required.' }, { status: 400, headers: corsHeaders });
  }

  const results = await provider.searchVin(vin, includeTracking);
  return NextResponse.json(
    {
      query: vin,
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
    const vin = (body.vin || body.query || '').trim();
    const includeTracking = body.includeTracking !== false;

    if (!vin) {
      return NextResponse.json({ error: 'Field "vin" is required in request body.' }, { status: 400, headers: corsHeaders });
    }

    const results = await provider.searchVin(vin, includeTracking);
    return NextResponse.json(
      {
        query: vin,
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

