import { NextRequest, NextResponse } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { JacxiDataProvider } from '../../../../mcps/jacxishipping/src/data-provider';
import { registerJacxiTools } from '../../../../mcps/jacxishipping/src/tools';
import { verifyAuth } from '../../../../mcps/jacxishipping/src/auth';

const provider = new JacxiDataProvider();

export async function POST(request: NextRequest) {
  // Verify authentication if configured
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32000, message: auth.error || 'Authentication required' },
        id: null,
      },
      {
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        },
      }
    );
  }

  try {
    const mcpServer = new McpServer({
      name: 'jacxishipping',
      version: '1.0.0',
    });
    registerJacxiTools(mcpServer, provider);

    const transport = new WebStandardStreamableHTTPServerTransport();

    await mcpServer.connect(transport);

    // Normalize accept header so clients that only send application/json are supported
    const headers = new Headers(request.headers);
    const accept = headers.get('accept') || '';
    if (!accept.includes('text/event-stream')) {
      headers.set('accept', accept ? `${accept}, text/event-stream` : 'application/json, text/event-stream');
    }

    const bodyText = await request.text();
    const req = new Request(request.url, {
      method: 'POST',
      headers,
      body: bodyText,
    });

    const response = await transport.handleRequest(req);

    // Add CORS headers to response
    const resHeaders = new Headers(response.headers);
    resHeaders.set('Access-Control-Allow-Origin', '*');
    resHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    resHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: { code: -32603, message: error?.message || 'Internal MCP server error' },
        id: null,
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.authenticated) {
    return NextResponse.json(
      { error: auth.error || 'Authentication required' },
      {
        status: 401,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
        },
      }
    );
  }

  try {
    const mcpServer = new McpServer({
      name: 'jacxishipping',
      version: '1.0.0',
    });
    registerJacxiTools(mcpServer, provider);

    const transport = new WebStandardStreamableHTTPServerTransport();

    await mcpServer.connect(transport);

    const response = await transport.handleRequest(request);
    const resHeaders = new Headers(response.headers);
    resHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-session-id',
    },
  });
}

