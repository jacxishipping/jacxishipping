import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { JacxiDataProvider } from '../../../../../../mcps/jacxishipping/src/data-provider';
import {
  createAuthorizationCode,
  verifyGoogleOAuthState,
} from '../../../../../../mcps/jacxishipping/src/oauth';

const provider = new JacxiDataProvider();

/**
 * Google OAuth 2.0 Callback Handler for MCP Server Authentication
 * Exchanges Google's authorization code for user profile and redirects back
 * to the MCP client's redirect_uri (Claude, Antigravity, Cursor, ChatGPT)
 * with a signed MCP authorization code.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;
  const googleCode = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');
  const googleError = url.searchParams.get('error');

  if (googleError || !googleCode || !stateParam) {
    return NextResponse.json(
      {
        error: googleError || 'invalid_request',
        error_description: 'Missing Google authorization code or state parameter.',
      },
      { status: 400 }
    );
  }

  const stateData = verifyGoogleOAuthState(stateParam);
  if (!stateData) {
    return NextResponse.json(
      {
        error: 'invalid_state',
        error_description: 'Expired or invalid OAuth state parameter.',
      },
      { status: 400 }
    );
  }

  const settings = await provider.getMcpGatewaySettings();
  const googleClientId =
    settings.googleClientId || process.env.GOOGLE_CLIENT_ID || '';
  const googleClientSecret =
    settings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || '';

  if (!googleClientId || !googleClientSecret) {
    return NextResponse.json(
      {
        error: 'server_configuration_error',
        error_description:
          'Google Client ID or Client Secret is not configured on the MCP Gateway.',
      },
      { status: 500 }
    );
  }

  try {
    // 1. Exchange Google code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: googleCode,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: `${baseUrl}/api/oauth/callback/google`,
        grant_type: 'authorization_code',
      }).toString(),
    });

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      id_token?: string;
      error?: string;
      error_description?: string;
    };

    if (!tokenRes.ok || !tokenJson.access_token) {
      return NextResponse.json(
        {
          error: tokenJson.error || 'google_token_exchange_failed',
          error_description:
            tokenJson.error_description ||
            'Failed to exchange Google authorization code.',
        },
        { status: 400 }
      );
    }

    // 2. Fetch Google user profile
    const userRes = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      }
    );

    const googleUser = (await userRes.json()) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };

    const email = (googleUser.email || '').toLowerCase();
    if (!email || !googleUser.email_verified) {
      return NextResponse.json(
        {
          error: 'access_denied',
          error_description: 'Google account email is not verified.',
        },
        { status: 403 }
      );
    }

    // 3. Enforce allowed Google domain / email rules if configured
    if (
      settings.allowedGoogleDomains &&
      settings.allowedGoogleDomains.trim() !== '*'
    ) {
      const allowedList = settings.allowedGoogleDomains
        .split(',')
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      const domain = email.split('@')[1] || '';
      const allowed = allowedList.some(
        (entry) =>
          entry === email || entry === domain || entry === `@${domain}`
      );
      if (!allowed) {
        return NextResponse.json(
          {
            error: 'access_denied',
            error_description: `Google account ${email} is not in the allowed domains list.`,
          },
          { status: 403 }
        );
      }
    }

    // 4. Match against Jacxi User database
    let userId = googleUser.sub || email;
    let role = 'user';
    let userName = googleUser.name || email;

    const dbUser = await prisma.user
      .findUnique({
        where: { email },
        select: { id: true, name: true, role: true },
      })
      .catch(() => null);

    if (settings.requireExistingUser && !dbUser) {
      return NextResponse.json(
        {
          error: 'access_denied',
          error_description: `No Jacxi Shipping account found for ${email}.`,
        },
        { status: 403 }
      );
    }

    if (dbUser) {
      userId = dbUser.id;
      role = dbUser.role;
      userName = dbUser.name || userName;
    }

    // 5. Issue signed MCP Authorization Code and redirect to MCP client redirect_uri
    const mcpAuthCode = createAuthorizationCode({
      clientId: stateData.clientId,
      redirectUri: stateData.redirectUri,
      codeChallenge: stateData.codeChallenge,
      codeChallengeMethod: stateData.codeChallengeMethod,
      scope: stateData.scope,
      user: {
        sub: userId,
        email,
        name: userName,
        picture: googleUser.picture,
        role,
        provider: 'google',
      },
    });

    await provider.logMcpActivity({
      tool: 'oauth_google_login',
      query: email,
      provider: 'google-oauth',
      status: 'SUCCESS',
      responseSummary: `Authorized Google OAuth user ${email} (${role}) for client ${stateData.clientId}`,
    });

    const redirectTarget = new URL(stateData.redirectUri);
    redirectTarget.searchParams.set('code', mcpAuthCode);
    if (stateData.clientState) {
      redirectTarget.searchParams.set('state', stateData.clientState);
    }

    return NextResponse.redirect(redirectTarget.toString(), 302);
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'server_error',
        error_description: error?.message || 'Google OAuth callback error',
      },
      { status: 500 }
    );
  }
}

