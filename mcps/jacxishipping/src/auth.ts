import { prisma } from '../../../src/lib/db';

export interface AuthResult {
  authenticated: boolean;
  error?: string;
  user?: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  };
  authType?: 'api_key' | 'user_logincode' | 'public_dev';
}

/**
 * Extracts and verifies authentication from standard Request or Headers.
 * Supports:
 *  - Header: Authorization: Bearer <TOKEN>
 *  - Header: Authorization: <TOKEN>
 *  - Header: X-API-Key: <TOKEN>
 *  - Query: ?key=<TOKEN> or ?apiKey=<TOKEN>
 */
export async function verifyAuth(request: Request): Promise<AuthResult> {
  const envKey = process.env.MCP_API_KEY || process.env.JACXI_API_KEY;

  // Extract token from multiple possible sources
  let token: string | null = null;

  // 1. Check Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }
  }

  // 2. Check X-API-Key header
  if (!token) {
    const xApiKey = request.headers.get('x-api-key') || request.headers.get('x-mcp-key');
    if (xApiKey) {
      token = xApiKey.trim();
    }
  }

  // 3. Check query parameters
  if (!token) {
    try {
      const url = new URL(request.url);
      token =
        url.searchParams.get('key') ||
        url.searchParams.get('apiKey') ||
        url.searchParams.get('api_key');
    } catch {
      // Ignore URL parse errors
    }
  }

  // Check if token matches env key immediately
  if (token && envKey && token === envKey) {
    return {
      authenticated: true,
      authType: 'api_key',
    };
  }

  // Check database-configured MCP Gateway settings & user login codes
  let dbKey: string | null = null;
  let dbEnabled = true;
  let dbAuthMode: 'required' | 'optional' = 'required';

  try {
    const settings = await prisma.aiProviderSettings.findUnique({
      where: { scope: 'mcp-gateway' },
    });
    if (settings) {
      dbEnabled = settings.enabled;
      dbKey = settings.apiKey;
      dbAuthMode = settings.provider === 'optional' ? 'optional' : 'required';
    }
  } catch {
    // Database settings lookup optional
  }

  if (!dbEnabled) {
    return {
      authenticated: false,
      error: 'The Jacxi MCP & AI Gateway is currently paused by an administrator.',
    };
  }

  if (token && dbKey && token === dbKey) {
    return {
      authenticated: true,
      authType: 'api_key',
    };
  }

  const effectiveKey = dbKey || envKey;

  // If no key is configured or authMode is set to optional, allow
  if (!effectiveKey || dbAuthMode === 'optional') {
    return {
      authenticated: true,
      authType: 'public_dev',
    };
  }

  if (!token) {
    return {
      authenticated: false,
      error:
        'Authentication required. Please provide an API key via Bearer token, X-API-Key header, or ?key= query parameter.',
    };
  }

  // Optional: Check if token matches a Jacxi user loginCode
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ loginCode: token }, { id: token }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    if (user) {
      return {
        authenticated: true,
        authType: 'user_logincode',
        user,
      };
    }
  } catch {
    // Database check failed or not connected
  }

  return {
    authenticated: false,
    error: 'Invalid API key or authentication token.',
  };
}
