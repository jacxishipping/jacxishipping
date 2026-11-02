import { NextRequest, NextResponse } from 'next/server';
import { getOpenApiSpec } from '../../../mcps/jacxishipping/src/ai-schemas';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const spec = getOpenApiSpec(baseUrl);

  return NextResponse.json(spec, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

