import { NextRequest, NextResponse } from 'next/server';
import { registerDynamicOAuthClient } from '../../../../../mcps/jacxishipping/src/oauth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * RFC 7591 OAuth 2.0 Dynamic Client Registration Endpoint
 * Used by MCP clients (Claude, Antigravity, Cursor, MCP Inspector)
 * to automatically register their redirect_uris before launching Google OAuth.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const clientMetadata = registerDynamicOAuthClient(body);
    return NextResponse.json(clientMetadata, {
      status: 201,
      headers: corsHeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: error?.message },
      { status: 400, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
