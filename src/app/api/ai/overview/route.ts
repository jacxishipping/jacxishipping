import { NextResponse } from 'next/server';
import { JacxiDataProvider } from '../../../../../mcps/jacxishipping/src/data-provider';

const provider = new JacxiDataProvider();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET() {
  const stats = await provider.getStats();
  return NextResponse.json(stats, { headers: corsHeaders });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

