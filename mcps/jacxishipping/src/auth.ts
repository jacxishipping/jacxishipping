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
  const configuredKey = process.env.MCP_API_KEY || process.env.JACXI_API_KEY;

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
      token = url.searchParams.get('key') || url.searchParams.get('apiKey') || url.searchParams.get('api_key');
    } catch {
      // Ignore URL parse errors
    }
  }

  // If NO master API key is configured in environment, allow with warning or dev mode
  if (!configuredKey) {
    return {
      authenticated: true,
      authType: 'public_dev',
    };
  }

  if (!token) {
    return {
      authenticated: false,
      error: 'Authentication required. Please provide an API key via Bearer token, X-API-Key header, or ?key= query parameter.',
    };
  }

  // Check master API key
  if (token === configuredKey) {
    return {
      authenticated: true,
      authType: 'api_key',
    };
  }

  // Optional: Check if token matches a Jacxi user loginCode
  try {
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { loginCode: token },
          { id: token },
        ],
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
