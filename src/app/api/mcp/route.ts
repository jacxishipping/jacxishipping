import { NextRequest, NextResponse } from 'next/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { JacxiDataProvider } from '../../../../mcps/jacxishipping/src/data-provider';
import { registerJacxiTools } from '../../../../mcps/jacxishipping/src/tools';
import { getWwwAuthenticateHeader, verifyAuth } from '../../../../mcps/jacxishipping/src/auth';

const provider = new JacxiDataProvider();

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-API-Key, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID, Accept',
  'Access-Control-Expose-Headers':
    'WWW-Authenticate, Mcp-Session-Id, MCP-Protocol-Version',
};

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const forceOAuth =
    url.searchParams.get('oauth') === '1' ||
    url.searchParams.get('oauth') === 'true';
  const hasAuthHeader =
    Boolean(request.headers.get('authorization')) ||
    Boolean(request.headers.get('x-api-key')) ||
    Boolean(url.searchParams.get('key')) ||
    Boolean(url.searchParams.get('access_token'));

  // If ?oauth=true is requested without a token, trigger RFC 9728 OAuth 2.1 discovery
  if (forceOAuth && !hasAuthHeader) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Google OAuth 2.0 authentication required',
        },
        id: null,
      },
      {
        status: 401,
        headers: {
          ...corsHeaders,
          'WWW-Authenticate': getWwwAuthenticateHeader(request),
        },
      }
    );
  }

  // If an Authorization header / token was provided, verify it
  if (hasAuthHeader) {
    const auth = await verifyAuth(request);
    if (!auth.authenticated) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: auth.error || 'Invalid Google OAuth token or API key',
          },
          id: null,
        },
        {
          status: 401,
          headers: {
            ...corsHeaders,
            'WWW-Authenticate': getWwwAuthenticateHeader(request),
          },
        }
      );
    }
  }

  try {
    const mcpServer = new McpServer({
      name: 'jacxishipping',
      version: '1.0.0',
    });
    registerJacxiTools(mcpServer, provider);

    // Use stateless JSON response mode for reliable Vercel Serverless execution
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    await mcpServer.connect(transport);

    // Ensure Accept header includes both application/json and text/event-stream per SDK check
    const headers = new Headers(request.headers);
    headers.set('accept', 'application/json, text/event-stream');
    if (!headers.get('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const bodyText = await request.text();
    const req = new Request(request.url, {
      method: 'POST',
      headers,
      body: bodyText,
    });

    const response = await transport.handleRequest(req);

    const resHeaders = new Headers(response.headers);
    for (const [k, v] of Object.entries(corsHeaders)) {
      resHeaders.set(k, v);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error?.message || 'Internal MCP server error',
        },
        id: null,
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}

export async function GET(request: NextRequest) {
  const accept = request.headers.get('accept') || '';

  // Per MCP Streamable HTTP Spec Section 2.2:
  // Stateless servers that do not offer a standalone GET SSE stream MUST return 405 Method Not Allowed
  if (accept.includes('text/event-stream')) {
    return new NextResponse(null, {
      status: 405,
      headers: {
        ...corsHeaders,
        Allow: 'POST, DELETE, OPTIONS',
      },
    });
  }

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  return NextResponse.json(
    {
      name: 'jacxishipping',
      version: '1.0.0',
      protocolVersion: '2025-03-26',
      status: 'online',
      transport: 'streamable-http',
      mcpEndpoint: `${baseUrl}/api/mcp`,
      oauth: {
        protectedResourceMetadata: `${baseUrl}/.well-known/oauth-protected-resource`,
        authorizationServerMetadata: `${baseUrl}/.well-known/oauth-authorization-server`,
        authorizeEndpoint: `${baseUrl}/api/oauth/authorize`,
        tokenEndpoint: `${baseUrl}/api/oauth/token`,
        registerEndpoint: `${baseUrl}/api/oauth/register`,
      },
    },
    { status: 200, headers: corsHeaders }
  );
}

export async function DELETE() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
