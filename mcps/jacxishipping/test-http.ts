import { startHttpServer } from './src/http-server';

async function testHttp() {
  const server = await startHttpServer();

  try {
    // Test 1: Health check
    console.log('[Test 1] Testing /health');
    const res1 = await fetch('http://localhost:3333/health');
    const json1 = await res1.json();
    console.log('Health status:', json1.status, json1.service);

    // Test 2: OpenAPI spec for ChatGPT
    console.log('\n[Test 2] Testing /openapi.json');
    const res2 = await fetch('http://localhost:3333/openapi.json');
    const json2 = await res2.json();
    console.log('OpenAPI Title:', json2.info?.title, 'Paths:', Object.keys(json2.paths));

    // Test 3: REST VIN Search
    console.log('\n[Test 3] Testing /api/search-vin?vin=JTEBU5JR4A5011946');
    const res3 = await fetch('http://localhost:3333/api/search-vin?vin=JTEBU5JR4A5011946');
    const json3 = await res3.json();
    console.log('VIN search result:', {
      found: json3.found,
      count: json3.count,
      car: json3.results?.[0]?.make + ' ' + json3.results?.[0]?.model,
    });

    // Test 4: Gemini schemas
    console.log('\n[Test 4] Testing /schemas/gemini');
    const res4 = await fetch('http://localhost:3333/schemas/gemini');
    const json4 = await res4.json();
    console.log('Gemini function declarations count:', json4.tools?.[0]?.functionDeclarations?.length);

    console.log('\nHTTP Gateway tested successfully!');
  } finally {
    server.close();
  }
}

testHttp().catch(console.error);

