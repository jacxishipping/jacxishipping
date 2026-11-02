import { NextRequest, NextResponse } from 'next/server';
import {
  createOAuthTokens,
  verifyAuthorizationCode,
  verifyOAuthRefreshToken,
  verifyPkceChallenge,
} from '../../../../../mcps/jacxishipping/src/oauth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
};

/**
 * OAuth 2.1 Token Endpoint for MCP Clients & ChatGPT Plugins
 * Supports:
 *  - grant_type=authorization_code (with PKCE S256 / plain verification)
 *  - grant_type=refresh_token
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let params: Record<string, string> = {};

    if (contentType.includes('application/json')) {
      const json = await request.json().catch(() => ({}));
      for (const [k, v] of Object.entries(json)) {
        if (v !== undefined && v !== null) params[k] = String(v);
      }
    } else {
      const text = await request.text();
      const searchParams = new URLSearchParams(text);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    }

    const grantType = params.grant_type || 'authorization_code';

    if (grantType === 'authorization_code') {
      const code = params.code;
      const codeVerifier = params.code_verifier;

      if (!code) {
        return NextResponse.json(
          {
            error: 'invalid_request',
            error_description: 'Missing authorization code.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      const codePayload = verifyAuthorizationCode(code);
      if (!codePayload) {
        return NextResponse.json(
          {
            error: 'invalid_grant',
            error_description: 'Authorization code is invalid or expired.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      // Verify PKCE if codeChallenge was present during /authorize
      const pkceValid = verifyPkceChallenge(
        codeVerifier,
        codePayload.codeChallenge,
        codePayload.codeChallengeMethod
      );
      if (!pkceValid) {
        return NextResponse.json(
          {
            error: 'invalid_grant',
            error_description: 'PKCE code_verifier verification failed.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      const tokens = createOAuthTokens({
        clientId: codePayload.clientId,
        scope: codePayload.scope,
        user: codePayload.user,
      });

      return NextResponse.json(tokens, { status: 200, headers: corsHeaders });
    }

    if (grantType === 'refresh_token') {
      const refreshToken = params.refresh_token;
      if (!refreshToken) {
        return NextResponse.json(
          {
            error: 'invalid_request',
            error_description: 'Missing refresh_token.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      const refreshPayload = verifyOAuthRefreshToken(refreshToken);
      if (!refreshPayload) {
        return NextResponse.json(
          {
            error: 'invalid_grant',
            error_description: 'Refresh token is invalid or expired.',
          },
          { status: 400, headers: corsHeaders }
        );
      }

      const tokens = createOAuthTokens({
        clientId: refreshPayload.clientId,
        scope: refreshPayload.scope,
        user: refreshPayload.user,
      });

      return NextResponse.json(tokens, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json(
      {
        error: 'unsupported_grant_type',
        error_description: `Grant type "${grantType}" is not supported.`,
      },
      { status: 400, headers: corsHeaders }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: error?.message || 'OAuth token endpoint error',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

