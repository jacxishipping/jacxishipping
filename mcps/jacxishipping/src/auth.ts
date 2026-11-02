import { prisma } from '../../../src/lib/db';
import {
  verifyDirectGoogleToken,
  verifyOAuthAccessToken,
} from './oauth';

export interface AuthResult {
  authenticated: boolean;
  error?: string;
  user?: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
    picture?: string;
  };
  authType?: 'google_oauth' | 'api_key' | 'user_logincode' | 'public_dev';
}

/**
 * Generates the RFC 9728 WWW-Authenticate header so MCP clients
 * (Claude, Antigravity, Cursor, ChatGPT) automatically discover
 * and launch the Google OAuth 2.0 authorization flow.
 */
export function getWwwAuthenticateHeader(request: Request): string {
  let baseUrl = 'https://jacxishipping.com';
  try {
    const url = new URL(request.url);
    baseUrl = `${url.protocol}//${url.host}`;
  } catch {
    // Use default
  }
  return `Bearer realm="jacxishipping-mcp", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="openid email profile mcp:tools"`;
}

/**
 * Extracts and verifies authentication from standard Request or Headers.
 * Supports:
 *  - Google OAuth 2.0 / MCP OAuth 2.1 Access Token (jx_oauth_... or ya29.* or Google JWT)
 *  - Header: Authorization: Bearer <TOKEN>
 *  - Header: X-API-Key: <TOKEN>
 *  - Query: ?key=<TOKEN> or ?access_token=<TOKEN>
 *  - Customer 8-character loginCode
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
    const xApiKey =
      request.headers.get('x-api-key') || request.headers.get('x-mcp-key');
    if (xApiKey) {
      token = xApiKey.trim();
    }
  }

  // 3. Check query parameters
  if (!token) {
    try {
      const url = new URL(request.url);
      token =
        url.searchParams.get('access_token') ||
        url.searchParams.get('key') ||
        url.searchParams.get('apiKey') ||
        url.searchParams.get('api_key');
    } catch {
      // Ignore URL parse errors
    }
  }

  // Load database-configured MCP Gateway & Google OAuth settings
  let dbKey: string | null = null;
  let dbEnabled = true;
  let dbAuthMode: 'required' | 'optional' = 'required';
  let googleOAuthEnabled = true;
  let allowedGoogleDomains = '*';
  let requireExistingUser = false;

  try {
    const settings = await prisma.aiProviderSettings.findUnique({
      where: { scope: 'mcp-gateway' },
    });
    if (settings) {
      dbEnabled = settings.enabled;
      dbKey = settings.apiKey;
      dbAuthMode = settings.provider === 'optional' ? 'optional' : 'required';

      if (settings.chatCompletionsUrl && settings.chatCompletionsUrl.startsWith('{')) {
        try {
          const extra = JSON.parse(settings.chatCompletionsUrl);
          if (extra.googleOAuthEnabled !== undefined) {
            googleOAuthEnabled = Boolean(extra.googleOAuthEnabled);
          }
          if (extra.allowedGoogleDomains) {
            allowedGoogleDomains = String(extra.allowedGoogleDomains);
          }
          if (extra.requireExistingUser !== undefined) {
            requireExistingUser = Boolean(extra.requireExistingUser);
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // Database settings lookup optional
  }

  if (!dbEnabled) {
    return {
      authenticated: false,
      error:
        'The Jacxi MCP & AI Gateway is currently paused by an administrator.',
    };
  }

  if (token) {
    // A. Check if token is a signed Jacxi MCP Google OAuth Access Token (jx_oauth_...)
    if (googleOAuthEnabled && token.startsWith('jx_oauth.')) {
      const oauthPayload = verifyOAuthAccessToken(token);
      if (oauthPayload) {
        return {
          authenticated: true,
          authType: 'google_oauth',
          user: {
            id: oauthPayload.user.sub,
            name: oauthPayload.user.name || oauthPayload.user.email,
            email: oauthPayload.user.email,
            role: oauthPayload.user.role || 'user',
            picture: oauthPayload.user.picture,
          },
        };
      }
    }

    // B. Check if token matches Master MCP_API_KEY (env or DB)
    if ((envKey && token === envKey) || (dbKey && token === dbKey)) {
      return {
        authenticated: true,
        authType: 'api_key',
      };
    }

    // C. Check if token is a direct Google OAuth 2.0 Access Token (ya29.*) or Google ID Token (eyJ*)
    if (
      googleOAuthEnabled &&
      (token.startsWith('ya29.') ||
        token.startsWith('eyJ') ||
        token.length > 45) &&
      !token.startsWith('jx_mcp_')
    ) {
      const googleUser = await verifyDirectGoogleToken(token, {
        allowedDomains: allowedGoogleDomains,
        requireExistingUser,
      });
      if (googleUser) {
        return {
          authenticated: true,
          authType: 'google_oauth',
          user: {
            id: googleUser.sub,
            name: googleUser.name || googleUser.email,
            email: googleUser.email,
            role: googleUser.role || 'user',
            picture: googleUser.picture,
          },
        };
      }
    }

    // D. Check if token matches a Jacxi user 8-char loginCode
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
        'Google OAuth 2.0 or Bearer token authentication required. Authenticate via Google OAuth (/api/oauth/authorize) or provide a valid Bearer token.',
    };
  }

  return {
    authenticated: false,
    error: 'Invalid or expired Google OAuth token / API key.',
  };
}
