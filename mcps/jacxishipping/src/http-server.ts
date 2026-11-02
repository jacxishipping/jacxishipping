import http from 'http';
import { parse } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { JacxiDataProvider } from './data-provider';
import { registerJacxiTools } from './tools';
import {
  getOpenApiSpec,
  getOpenAITools,
  getGeminiTools,
  getClaudeTools,
} from './ai-schemas';

const PORT = Number(process.env.MCP_HTTP_PORT || process.env.PORT || 3333);
const HOST = process.env.HOST || '0.0.0.0';

export async function startHttpServer() {
  const provider = new JacxiDataProvider();

  // Active SSE transports mapped by session ID
  const sseTransports = new Map<string, SSEServerTransport>();

  const server = http.createServer(async (req, res) => {
    // Enable CORS for all AI agents, web frontends, and tunnels
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const parsedUrl = parse(req.url || '/', true);
    const pathname = parsedUrl.pathname || '/';
    const query = parsedUrl.query;
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers.host || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}`;

    // Helper for JSON responses
    const sendJson = (status: number, data: any) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data, null, 2));
    };

    // Helper for reading JSON body
    const readBody = (): Promise<any> => {
      return new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve({});
          }
        });
      });
    };

    // -----------------------------------------------------------------------
    // 1. ROOT / HEALTH CHECK
    // -----------------------------------------------------------------------
    if (pathname === '/' || pathname === '/health') {
      sendJson(200, {
        status: 'online',
        service: 'Jacxi Shipping MCP & AI Agent Gateway',
        version: '1.0.0',
        endpoints: {
          mcp_sse: `${baseUrl}/sse`,
          mcp_messages: `${baseUrl}/messages`,
          chatgpt_openapi: `${baseUrl}/openapi.json`,
          rest_vin_search: `${baseUrl}/api/search-vin?vin={vin}`,
          rest_container_search: `${baseUrl}/api/search-container?number={number}`,
          rest_track: `${baseUrl}/api/track?query={query}`,
          schemas_gemini: `${baseUrl}/schemas/gemini`,
          schemas_openai_grok: `${baseUrl}/schemas/openai`,
          schemas_claude: `${baseUrl}/schemas/claude`,
        },
      });
      return;
    }

    // -----------------------------------------------------------------------
    // 2. OPENAPI SPECIFICATION (FOR CHATGPT ACTIONS / CUSTOM GPTS)
    // -----------------------------------------------------------------------
    if (pathname === '/openapi.json') {
      sendJson(200, getOpenApiSpec(baseUrl));
      return;
    }

    // -----------------------------------------------------------------------
    // 3. AI AGENT TOOL SCHEMAS EXPORT
    // -----------------------------------------------------------------------
    if (pathname === '/schemas/openai' || pathname === '/schemas/grok') {
      sendJson(200, { tools: getOpenAITools() });
      return;
    }

    if (pathname === '/schemas/gemini') {
      sendJson(200, { tools: getGeminiTools() });
      return;
    }

    if (pathname === '/schemas/claude') {
      sendJson(200, { tools: getClaudeTools() });
      return;
    }

    // -----------------------------------------------------------------------
    // 4. REST ENDPOINTS (DIRECT HTTP FOR CHATGPT, GROK, GEMINI CALLS)
    // -----------------------------------------------------------------------
    if (pathname === '/api/search-vin') {
      const body = req.method === 'POST' ? await readBody() : {};
      const vin = (query.vin as string) || body.vin || '';
      const includeTracking = query.includeTracking !== 'false' && body.includeTracking !== false;

      if (!vin) {
        sendJson(400, { error: 'Query parameter "vin" is required.' });
        return;
      }

      const results = await provider.searchVin(vin, includeTracking);
      sendJson(200, {
        query: vin,
        found: results.length > 0,
        count: results.length,
        results,
      });
      return;
    }

    if (pathname === '/api/search-container') {
      const body = req.method === 'POST' ? await readBody() : {};
      const containerNumber = (query.number as string) || (query.containerNumber as string) || body.containerNumber || body.number || '';
      const includeShipments = query.includeShipments !== 'false' && body.includeShipments !== false;

      if (!containerNumber) {
        sendJson(400, { error: 'Query parameter "number" is required.' });
        return;
      }

      const results = await provider.searchContainer(containerNumber, includeShipments);
      sendJson(200, {
        query: containerNumber,
        found: results.length > 0,
        count: results.length,
        results,
      });
      return;
    }

    if (pathname === '/api/track') {
      const body = req.method === 'POST' ? await readBody() : {};
      const trackQuery = (query.query as string) || (query.trackNumber as string) || body.query || body.trackNumber || '';

      if (!trackQuery) {
        sendJson(400, { error: 'Query parameter "query" is required.' });
        return;
      }

      const tracking = await provider.track(trackQuery);
      sendJson(200, {
        query: trackQuery,
        found: Boolean(tracking),
        tracking,
      });
      return;
    }

    if (pathname === '/api/overview') {
      const stats = await provider.getStats();
      sendJson(200, stats);
      return;
    }

    // -----------------------------------------------------------------------
    // 5. MCP SSE TRANSPORT (FOR MCP-OVER-HTTP CLIENTS)
    // -----------------------------------------------------------------------
    if (pathname === '/sse') {
      console.error('[jacxishipping-http] New SSE client connection initiated');
      const mcpServer = new McpServer({
        name: 'jacxishipping',
        version: '1.0.0',
      });
      registerJacxiTools(mcpServer, provider);

      const transport = new SSEServerTransport('/messages', res);
      const sessionId = transport.sessionId;
      sseTransports.set(sessionId, transport);

      req.on('close', () => {
        console.error(`[jacxishipping-http] SSE client disconnected: ${sessionId}`);
        sseTransports.delete(sessionId);
      });

      await mcpServer.connect(transport);
      return;
    }

    if (pathname === '/messages' && req.method === 'POST') {
      const sessionId = (query.sessionId as string) || (req.headers['x-session-id'] as string);
      const transport = sessionId ? sseTransports.get(sessionId) : Array.from(sseTransports.values())[0];

      if (!transport) {
        sendJson(404, { error: 'SSE session not found or expired.' });
        return;
      }

      await transport.handlePostMessage(req, res);
      return;
    }

    // Not found
    sendJson(404, { error: 'Not Found' });
  });

  server.listen(PORT, HOST, () => {
    console.error(`\n🚀 Jacxi Shipping MCP HTTP & AI Gateway running at http://${HOST}:${PORT}`);
    console.error(`   - SSE MCP Endpoint:   http://${HOST}:${PORT}/sse`);
    console.error(`   - ChatGPT OpenAPI:    http://${HOST}:${PORT}/openapi.json`);
    console.error(`   - Gemini Tools Spec:  http://${HOST}:${PORT}/schemas/gemini`);
    console.error(`   - Grok/OpenAI Spec:   http://${HOST}:${PORT}/schemas/openai\n`);
  });

  return server;
}

if (process.argv[1]?.endsWith('http-server.ts') || process.argv[1]?.endsWith('http-server.js')) {
  startHttpServer().catch(console.error);
}

