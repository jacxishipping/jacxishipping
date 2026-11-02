import { NextRequest, NextResponse } from 'next/server';
import { JacxiDataProvider } from '../../../../../mcps/jacxishipping/src/data-provider';
import { verifyAuth } from '../../../../../mcps/jacxishipping/src/auth';

const provider = new JacxiDataProvider();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: auth.error }, { status: 401, headers: corsHeaders });
  }

  const stats = await provider.getStats();
  return NextResponse.json(stats, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

