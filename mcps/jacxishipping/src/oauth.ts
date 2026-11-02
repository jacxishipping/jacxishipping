import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { prisma } from '../../../src/lib/db';

export interface OAuthUserClaims {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  role?: string;
  provider: 'google' | 'jacxi';
}

export interface AuthorizationCodePayload {
  type: 'auth_code';
  clientId: string;
  redirectUri: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope: string;
  user: OAuthUserClaims;
  iat: number;
  exp: number;
}

export interface AccessTokenPayload {
  type: 'access_token' | 'refresh_token';
  clientId: string;
  scope: string;
  user: OAuthUserClaims;
  iat: number;
  exp: number;
}

export interface GoogleOAuthStatePayload {
  clientId: string;
  redirectUri: string;
  clientState?: string;
  codeChallenge?: string;
  codeChallengeMethod?: string;
  scope: string;
  exp: number;
}

// In-memory cache for verified external Google OAuth tokens (ya29.* / ID tokens)
const googleTokenCache = new Map<
  string,
  { user: OAuthUserClaims; expiresAt: number }
>();

function getSigningSecret(): string {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.MCP_API_KEY ||
    'jacxi-mcp-oauth-default-signing-secret-2026'
  );
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8');
}

function signSegment(prefix: string, payloadObj: unknown): string {
  const payloadSegment = base64UrlEncode(JSON.stringify(payloadObj));
  const sig = createHmac('sha256', getSigningSecret())
    .update(`${prefix}.${payloadSegment}`)
    .digest('base64url');
  return `${prefix}.${payloadSegment}.${sig}`;
}

function verifySegment<T>(expectedPrefix: string, token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [prefix, payloadSegment, sig] = parts;
    if (prefix !== expectedPrefix) return null;

    const expectedSig = createHmac('sha256', getSigningSecret())
      .update(`${prefix}.${payloadSegment}`)
      .digest();
    const providedSig = Buffer.from(sig, 'base64url');

    if (
      expectedSig.length !== providedSig.length ||
      !timingSafeEqual(expectedSig, providedSig)
    ) {
      return null;
    }

    const parsed = JSON.parse(base64UrlDecode(payloadSegment)) as T & {
      exp?: number;
    };
    if (parsed.exp && Date.now() > parsed.exp) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Create a short-lived (10 min) signed authorization code after Google Sign-In
 */
export function createAuthorizationCode(
  params: Omit<AuthorizationCodePayload, 'type' | 'iat' | 'exp'>
): string {
  const now = Date.now();
  const payload: AuthorizationCodePayload = {
    type: 'auth_code',
    ...params,
    iat: now,
    exp: now + 10 * 60 * 1000, // 10 minutes
  };
  return signSegment('jx_code', payload);
}

export function verifyAuthorizationCode(
  code: string
): AuthorizationCodePayload | null {
  return verifySegment<AuthorizationCodePayload>('jx_code', code);
}

/**
 * Verify PKCE code_verifier against code_challenge
 */
export function verifyPkceChallenge(
  codeVerifier: string | undefined,
  codeChallenge: string | undefined,
  method: string | undefined = 'S256'
): boolean {
  if (!codeChallenge) return true; // No PKCE required if not sent during authorize
  if (!codeVerifier) return false;

  if (method?.toUpperCase() === 'S256') {
    const hash = createHash('sha256').update(codeVerifier).digest('base64url');
    return hash === codeChallenge;
  }
  return codeVerifier === codeChallenge;
}

/**
 * Create signed OAuth 2.1 access token & refresh token
 */
export function createOAuthTokens(params: {
  clientId: string;
  scope: string;
  user: OAuthUserClaims;
}) {
  const now = Date.now();
  const expiresInSeconds = 7 * 24 * 60 * 60; // 7 days
  const refreshExpiresInSeconds = 90 * 24 * 60 * 60; // 90 days

  const accessToken = signSegment('jx_oauth', {
    type: 'access_token',
    clientId: params.clientId,
    scope: params.scope,
    user: params.user,
    iat: now,
    exp: now + expiresInSeconds * 1000,
  } satisfies AccessTokenPayload);

  const refreshToken = signSegment('jx_refresh', {
    type: 'refresh_token',
    clientId: params.clientId,
    scope: params.scope,
    user: params.user,
    iat: now,
    exp: now + refreshExpiresInSeconds * 1000,
  } satisfies AccessTokenPayload);

  return {
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: expiresInSeconds,
    refresh_token: refreshToken,
    scope: params.scope,
  };
}

export function verifyOAuthAccessToken(
  token: string
): AccessTokenPayload | null {
  return verifySegment<AccessTokenPayload>('jx_oauth', token);
}

export function verifyOAuthRefreshToken(
  token: string
): AccessTokenPayload | null {
  return verifySegment<AccessTokenPayload>('jx_refresh', token);
}

/**
 * Encode & verify upstream Google OAuth state parameter
 */
export function createGoogleOAuthState(
  params: Omit<GoogleOAuthStatePayload, 'exp'>
): string {
  return signSegment('jx_state', {
    ...params,
    exp: Date.now() + 15 * 60 * 1000, // 15 minutes
  });
}

export function verifyGoogleOAuthState(
  state: string
): GoogleOAuthStatePayload | null {
  return verifySegment<GoogleOAuthStatePayload>('jx_state', state);
}

/**
 * Dynamically register an MCP OAuth client (RFC 7591)
 */
export function registerDynamicOAuthClient(body: {
  client_name?: string;
  redirect_uris?: string[];
  grant_types?: string[];
  response_types?: string[];
  token_endpoint_auth_method?: string;
}) {
  const clientId = `jx_client_${randomBytes(12).toString('hex')}`;
  const clientSecret = `jx_secret_${randomBytes(18).toString('hex')}`;

  return {
    client_id: clientId,
    client_secret: clientSecret,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_secret_expires_at: 0,
    client_name: body.client_name || 'MCP AI Client (Google OAuth)',
    redirect_uris: body.redirect_uris || [],
    grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
    response_types: body.response_types || ['code'],
    token_endpoint_auth_method: body.token_endpoint_auth_method || 'none',
  };
}

/**
 * Verify a direct Google OAuth 2.0 Access Token (ya29.*) or Google ID Token (JWT)
 * against Google's official OAuth2 endpoints and match against Jacxi users/settings.
 */
export async function verifyDirectGoogleToken(
  token: string,
  options?: {
    allowedDomains?: string;
    requireExistingUser?: boolean;
  }
): Promise<OAuthUserClaims | null> {
  const cached = googleTokenCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.user;
  }

  try {
    let email = '';
    let sub = '';
    let name = '';
    let picture = '';
    let emailVerified = false;

    // 1. Check if it looks like a Google Access Token (ya29.*) or generic bearer token
    if (token.startsWith('ya29.') || !token.startsWith('eyJ')) {
      const userInfoRes = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (userInfoRes.ok) {
        const data = (await userInfoRes.json()) as {
          sub?: string;
          email?: string;
          email_verified?: boolean;
          name?: string;
          picture?: string;
        };
        sub = data.sub || '';
        email = (data.email || '').toLowerCase();
        emailVerified = Boolean(data.email_verified);
        name = data.name || email;
        picture = data.picture || '';
      }
    }

    // 2. If not resolved yet and looks like a Google JWT ID token (eyJ...)
    if (!email && token.startsWith('eyJ')) {
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`
      );
      if (tokenInfoRes.ok) {
        const data = (await tokenInfoRes.json()) as {
          sub?: string;
          email?: string;
          email_verified?: string | boolean;
          name?: string;
          picture?: string;
        };
        sub = data.sub || '';
        email = (data.email || '').toLowerCase();
        emailVerified =
          data.email_verified === true || data.email_verified === 'true';
        name = data.name || email;
        picture = data.picture || '';
      }
    }

    if (!email || !emailVerified) {
      return null;
    }

    // Check domain restrictions if configured
    if (options?.allowedDomains && options.allowedDomains.trim() !== '*') {
      const allowedList = options.allowedDomains
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);

      if (allowedList.length > 0) {
        const domain = email.split('@')[1] || '';
        const matches = allowedList.some(
          (entry) => entry === email || entry === domain || entry === `@${domain}`
        );
        if (!matches) {
          return null;
        }
      }
    }

    // Check Jacxi database for matching user role
    let role = 'user';
    try {
      const dbUser = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, role: true },
      });
      if (options?.requireExistingUser && !dbUser) {
        return null;
      }
      if (dbUser) {
        sub = dbUser.id;
        name = dbUser.name || name;
        role = dbUser.role;
      }
    } catch {
      if (options?.requireExistingUser) return null;
    }

    const claims: OAuthUserClaims = {
      sub: sub || email,
      email,
      name,
      picture,
      role,
      provider: 'google',
    };

    googleTokenCache.set(token, {
      user: claims,
      expiresAt: Date.now() + 5 * 60 * 1000, // Cache for 5 minutes
    });

    return claims;
  } catch {
    return null;
  }
}

/**
 * RFC 9728 OAuth 2.0 Protected Resource Metadata for MCP
 */
export function getOAuthProtectedResourceMetadata(
  baseUrl = 'https://www.jacxishipping.com'
) {
  const cleanUrl = baseUrl.replace(/\/$/, '');
  return {
    resource: `${cleanUrl}/api/mcp`,
    authorization_servers: [cleanUrl],
    bearer_methods_supported: ['header', 'query'],
    scopes_supported: ['openid', 'email', 'profile', 'mcp:tools', 'mcp:read'],
    resource_documentation: `${cleanUrl}/dashboard/mcp`,
  };
}

/**
 * RFC 8414 OAuth 2.0 Authorization Server Metadata for MCP + Google OAuth
 */
export function getOAuthAuthorizationServerMetadata(
  baseUrl = 'https://www.jacxishipping.com'
) {
  const cleanUrl = baseUrl.replace(/\/$/, '');
  return {
    issuer: cleanUrl,
    authorization_endpoint: `${cleanUrl}/api/oauth/authorize`,
    token_endpoint: `${cleanUrl}/api/oauth/token`,
    userinfo_endpoint: `${cleanUrl}/api/oauth/userinfo`,
    registration_endpoint: `${cleanUrl}/api/oauth/register`,
    scopes_supported: ['openid', 'email', 'profile', 'mcp:tools', 'mcp:read'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    token_endpoint_auth_methods_supported: [
      'none',
      'client_secret_post',
      'client_secret_basic',
    ],
    code_challenge_methods_supported: ['S256', 'plain'],
    service_documentation: `${cleanUrl}/dashboard/mcp`,
  };
}

/**
 * Signed token for direct one-click downloads of Invoices, Branded Documents, Statements, Gate Passes, and Manifests
 */
export interface SignedDownloadTokenPayload {
  type: 'download';
  resourceType: string;
  resourceId: string;
  exp: number;
}

export function createSignedDownloadToken(
  resourceType: string,
  resourceId: string,
  ttlSeconds = 30 * 24 * 3600
): string {
  const payload: SignedDownloadTokenPayload = {
    type: 'download',
    resourceType,
    resourceId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  return signSegment('jx_dl', payload);
}

export function verifySignedDownloadToken(
  token: string,
  expectedResourceType?: string,
  expectedResourceId?: string
): SignedDownloadTokenPayload | null {
  const payload = verifySegment<SignedDownloadTokenPayload>('jx_dl', token);
  if (!payload || payload.type !== 'download') return null;
  if (expectedResourceType && payload.resourceType !== expectedResourceType && payload.resourceType !== '*') {
    return null;
  }
  if (expectedResourceId && payload.resourceId !== expectedResourceId && payload.resourceId !== '*') {
    return null;
  }
  return payload;
}


