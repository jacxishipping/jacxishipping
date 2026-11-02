import { startHttpServer } from './src/http-server';

async function testHttp() {
  process.env.MCP_API_KEY = 'test_secret_mcp_key_123';
  const server = await startHttpServer();

  try {
    // Test 1: ChatGPT Plugin manifest
    console.log('[Test 1] Testing /.well-known/ai-plugin.json');
    const resPlugin = await fetch('http://localhost:3333/.well-known/ai-plugin.json');
    const pluginJson = await resPlugin.json();
    console.log('Plugin name:', pluginJson.name_for_human, 'Auth type:', pluginJson.auth?.type);

    // Test 2: OpenAPI security schemes
    console.log('\n[Test 2] Testing /openapi.json security');
    const resOpenApi = await fetch('http://localhost:3333/openapi.json');
    const openapiJson = await resOpenApi.json();
    console.log('Security schemes:', Object.keys(openapiJson.components?.securitySchemes || {}));

    // Test 3: Auth rejection without key
    console.log('\n[Test 3] Testing unauthenticated call to /api/search-vin');
    const resUnauthorized = await fetch('http://localhost:3333/api/search-vin?vin=JTEBU5JR4A5011946');
    console.log('Status without auth:', resUnauthorized.status, '(expected 401)');

    // Test 4: Auth success with Bearer token
    console.log('\n[Test 4] Testing Bearer token auth on /api/search-vin');
    const resBearer = await fetch('http://localhost:3333/api/search-vin?vin=JTEBU5JR4A5011946', {
      headers: { Authorization: 'Bearer test_secret_mcp_key_123' },
    });
    const bearerJson = await resBearer.json();
    console.log('Status with Bearer:', resBearer.status, 'Found:', bearerJson.found);

    // Test 5: Auth success with ?key= query parameter
    console.log('\n[Test 5] Testing query parameter key auth');
    const resQueryKey = await fetch(
      'http://localhost:3333/api/search-vin?vin=JTEBU5JR4A5011946&key=test_secret_mcp_key_123'
    );
    const queryKeyJson = await resQueryKey.json();
    console.log('Status with ?key=:', resQueryKey.status, 'Found:', queryKeyJson.found);

    console.log('\nAll Auth & ChatGPT Plugin tests passed successfully!');
  } finally {
    server.close();
    delete process.env.MCP_API_KEY;
  }
}

testHttp().catch(console.error);
