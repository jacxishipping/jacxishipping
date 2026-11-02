import { NextRequest, NextResponse } from 'next/server';
import { JacxiDataProvider } from '../../../../../mcps/jacxishipping/src/data-provider';
import { verifyAuth } from '../../../../../mcps/jacxishipping/src/auth';

const provider = new JacxiDataProvider();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401, headers: corsHeaders });
  }

  const { searchParams } = new URL(request.url);
  const query = (
    searchParams.get('query') ||
    searchParams.get('trackNumber') ||
    searchParams.get('q') ||
    ''
  ).trim();

  if (!query) {
    return NextResponse.json({ error: 'Query parameter "query" is required.' }, { status: 400, headers: corsHeaders });
  }

  const tracking = await provider.track(query);
  return NextResponse.json(
    {
      query,
      found: Boolean(tracking),
      tracking,
    },
    { headers: corsHeaders }
  );
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const query = (body.query || body.trackNumber || body.trackingNumber || '').trim();

    if (!query) {
      return NextResponse.json({ error: 'Field "query" is required in request body.' }, { status: 400, headers: corsHeaders });
    }

    const tracking = await provider.track(query);
    return NextResponse.json(
      {
        query,
        found: Boolean(tracking),
        tracking,
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

