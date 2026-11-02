import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../../mcps/jacxishipping/src/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'unauthorized', error_description: auth.error },
      { status: 401, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      sub: auth.user?.id || 'jacxi-mcp-user',
      name: auth.user?.name || 'Jacxi Shipping User',
      email: auth.user?.email || 'info@jacxishipping.com',
      picture: auth.user?.picture || null,
      role: auth.user?.role || 'admin',
      auth_type: auth.authType,
      email_verified: true,
    },
    { headers: corsHeaders }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

