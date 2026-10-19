import dotenv from 'dotenv';
dotenv.config();

import { fetchCopartLotVehicleData, getCopartDataProviderDebugInfo } from './src/lib/copart/lot-scraper';
import { fetchLotHtml, hasLotFetchProxy } from './src/lib/lot-fetch-proxy';

const lotNumber = '54889576';
const url = `https://www.copart.com/lot/${lotNumber}`;

console.log('========================================================');
console.log(`TESTING COPART LOT: ${lotNumber} (${url})`);
console.log('Debug Info:', JSON.stringify(getCopartDataProviderDebugInfo(), null, 2));
console.log('========================================================\n');

async function testOxylabsDataApiDirect() {
  console.log('--- TEST 1: Direct Oxylabs Web Scraper Data API ---');
  const username = process.env.OXYLABS_DATA_API_USERNAME;
  const password = process.env.OXYLABS_DATA_API_PASSWORD;
  const authHeader = 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  const preset = process.env.OXYLABS_COPART_PARSER_PRESET || 'shkrcopart';

  try {
    const createRes = await fetch('https://data.oxylabs.io/v1/queries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify({
        source: 'universal',
        url: url,
        user_agent_type: 'desktop_edge',
        geo_location: 'United States',
        render: 'html',
        parse: true,
        parser_preset: preset
      })
    });

    const createPayload = await createRes.json();
    console.log(`Job Created [HTTP ${createRes.status}], ID:`, createPayload.id);

    if (createPayload.id) {
      let isDone = false;
      for (let i = 1; i <= 20; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const sRes = await fetch(`https://data.oxylabs.io/v1/queries/${createPayload.id}`, {
          headers: { Authorization: authHeader }
        });
        const sPayload = await sRes.json();
        process.stdout.write(`[Poll ${i}: ${sPayload.status}] `);
        if (sPayload.status === 'done') {
          isDone = true;
          break;
        }
        if (sPayload.status === 'failed') break;
      }
      console.log('');

      if (isDone) {
        const rRes = await fetch(`https://data.oxylabs.io/v1/queries/${createPayload.id}/results`, {
          headers: { Authorization: authHeader }
        });
        const rPayload = await rRes.json();
        console.log('Oxylabs Raw Results:');
        console.log(JSON.stringify(rPayload.results?.[0]?.content, null, 2));
      }
    }
  } catch (err) {
    console.error('Test 1 Error:', err.message);
  }
}

async function testResidentialProxy() {
  console.log('\n--- TEST 2: Direct Fetch via Oxylabs Residential Proxy ---');
  try {
    console.log('Fetching HTML through proxy...');
    const result = await fetchLotHtml(url, {
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    }, true);

    console.log(`Proxy response status: ${result.response.status}`);
    console.log(`Via Proxy: ${result.viaProxy}`);
    console.log(`HTML length: ${result.html.length}`);
    const hasIncapsula = result.html.includes('_Incapsula_Resource');
    const hasSolr = result.html.includes('cachedSolrLotDetailsStr');
    console.log(`Incapsula challenge: ${hasIncapsula}`);
    console.log(`Cached Solr data present: ${hasSolr}`);

    if (hasSolr) {
      const match = result.html.match(/cachedSolrLotDetailsStr:\s*"((?:\\.|[^"\\])*)"/);
      if (match?.[1] && match[1] !== 'null') {
        const data = JSON.parse(JSON.parse(`"${match[1]}"`));
        console.log('Solr Parsed Data:');
        console.log(JSON.stringify({
          lot: data.lotNumberStr,
          year: data.lcy,
          make: data.mkn,
          model: data.lm,
          vin: data.fv,
          color: data.clr,
          damage: data.dd,
          yard: data.yn,
          keys: data.hk
        }, null, 2));
      }
    }
  } catch (err) {
    console.error('Test 2 Error:', err.message);
  }
}

async function testFullApplicationPipeline() {
  console.log('\n--- TEST 3: Full Application fetchCopartLotVehicleData() Pipeline ---');
  try {
    const data = await fetchCopartLotVehicleData(lotNumber);
    console.log('✅ Pipeline Succeeded! Vehicle Data Extracted:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test 3 Error:', err.message);
  }
}

async function runAll() {
  await testOxylabsDataApiDirect();
  await testResidentialProxy();
  await testFullApplicationPipeline();
}

runAll();
