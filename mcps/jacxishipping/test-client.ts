import { JacxiDataProvider } from './src/data-provider';
import {
  createAuthorizationCode,
  createOAuthTokens,
  getOAuthAuthorizationServerMetadata,
  verifyAuthorizationCode,
  verifyOAuthAccessToken,
} from './src/oauth';
import { verifyAuth } from './src/auth';

async function runTests() {
  console.log('--- Testing Jacxi MCP Data Provider ---');
  const provider = new JacxiDataProvider();

  // Test 1: VIN search
  console.log('\n[Test 1] Searching VIN: JTEBU5JR4A5011946');
  const vinResults = await provider.searchVin('JTEBU5JR4A5011946', true);
  console.log(`Found ${vinResults.length} match(es):`);
  if (vinResults[0]) {
    console.log({
      vin: vinResults[0].vin,
      car: `${vinResults[0].year} ${vinResults[0].make} ${vinResults[0].model}`,
      status: vinResults[0].status,
      container: vinResults[0].container?.containerNumber,
      source: vinResults[0].dataSource,
    });
  }

  // Test 2: Container search
  console.log('\n[Test 2] Searching Container: CAAU5189072');
  const containerResults = await provider.searchContainer('CAAU5189072', true);
  console.log(`Found ${containerResults.length} match(es):`);
  if (containerResults[0]) {
    console.log({
      container: containerResults[0].containerNumber,
      shippingLine: containerResults[0].shippingLine,
      status: containerResults[0].status,
      shipmentCount: containerResults[0].shipmentCount,
      shipments: containerResults[0].shipments,
      source: containerResults[0].dataSource,
    });
  }

  // Test 3: Universal Track
  console.log('\n[Test 3] Tracking: CAAU5189072');
  const trackResult = await provider.track('CAAU5189072');
  console.log({
    requested: trackResult?.requestedNumber,
    type: trackResult?.resolvedType,
    status: trackResult?.shipmentStatus,
    origin: trackResult?.origin,
    destination: trackResult?.destination,
    eventsCount: trackResult?.events.length,
    source: trackResult?.dataSource,
  });

  // Test 4: Overview Stats
  console.log('\n[Test 4] Overview Stats');
  const stats = await provider.getStats();
  console.log({
    totalShipments: stats.totalShipments,
    totalContainers: stats.totalContainers,
    activeOceanContainers: stats.activeOceanContainers,
    source: stats.dataSource,
  });

  // Test 5: Google OAuth 2.0 / MCP OAuth 2.1 Code & Token Flow
  console.log('\n[Test 5] Google OAuth 2.0 & MCP OAuth 2.1 Flow');
  const metadata = getOAuthAuthorizationServerMetadata('https://jacxishipping.com');
  const authCode = createAuthorizationCode({
    clientId: 'mcp-test-client',
    redirectUri: 'http://localhost:3000/callback',
    scope: 'openid email profile mcp:tools',
    user: {
      sub: 'google-12345',
      email: 'shkrbabar@gmail.com',
      name: 'Shakir Babar',
      role: 'admin',
      provider: 'google',
    },
  });
  const verifiedCode = verifyAuthorizationCode(authCode);
  const tokens = createOAuthTokens({
    clientId: verifiedCode!.clientId,
    scope: verifiedCode!.scope,
    user: verifiedCode!.user,
  });
  const verifiedToken = verifyOAuthAccessToken(tokens.access_token);
  const mockReq = new Request('https://jacxishipping.com/api/mcp', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const authCheck = await verifyAuth(mockReq);
  console.log({
    issuer: metadata.issuer,
    authorizeEndpoint: metadata.authorization_endpoint,
    tokenEndpoint: metadata.token_endpoint,
    codeVerified: Boolean(verifiedCode),
    tokenVerified: Boolean(verifiedToken),
    mcpRequestAuthenticated: authCheck.authenticated,
    authType: authCheck.authType,
    userEmail: authCheck.user?.email,
  });

  console.log('\nAll tests passed successfully!');
}

runTests().catch(console.error);

