import { NextRequest, NextResponse } from 'next/server';
import { getOAuthAuthorizationServerMetadata } from '../../../../../mcps/jacxishipping/src/oauth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, MCP-Protocol-Version',
};

export async function GET(request: NextRequest) {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.jacxishipping.com';
  try {
    const url = new URL(request.url);
    baseUrl = `${url.protocol}//${url.host}`;
  } catch {
    // Use default
  }

  return NextResponse.json(getOAuthAuthorizationServerMetadata(baseUrl), {
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

