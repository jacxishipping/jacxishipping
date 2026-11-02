import { NextRequest, NextResponse } from 'next/server';
import { getChatGPTPluginManifest } from '../../../../mcps/jacxishipping/src/ai-schemas';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const manifest = getChatGPTPluginManifest(baseUrl);

  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
    },
  });
}

