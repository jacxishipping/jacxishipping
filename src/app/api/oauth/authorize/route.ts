import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { JacxiDataProvider } from '../../../../../mcps/jacxishipping/src/data-provider';
import {
  createAuthorizationCode,
  createGoogleOAuthState,
} from '../../../../../mcps/jacxishipping/src/oauth';

const provider = new JacxiDataProvider();

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const clientId = url.searchParams.get('client_id') || 'mcp-client';
  const redirectUri =
    url.searchParams.get('redirect_uri') || `${baseUrl}/dashboard/mcp`;
  const state = url.searchParams.get('state') || '';
  const scope =
    url.searchParams.get('scope') || 'openid email profile mcp:tools';
  const codeChallenge = url.searchParams.get('code_challenge') || undefined;
  const codeChallengeMethod =
    url.searchParams.get('code_challenge_method') || 'S256';
  const action = url.searchParams.get('action') || '';
  const errorMsg = url.searchParams.get('error_msg') || '';

  const settings = await provider.getMcpGatewaySettings();
  const googleClientId =
    settings.googleClientId || process.env.GOOGLE_CLIENT_ID || '';

  // If user clicked "Sign in with Google" and GOOGLE_CLIENT_ID is configured, redirect to Google OAuth 2.0
  if (action === 'google' && googleClientId) {
    const googleState = createGoogleOAuthState({
      clientId,
      redirectUri,
      clientState: state,
      codeChallenge,
      codeChallengeMethod,
      scope,
    });

    const googleCallbackUrl = `${baseUrl}/api/oauth/callback/google`;
    const googleAuthUrl = new URL(
      'https://accounts.google.com/o/oauth2/v2/auth'
    );
    googleAuthUrl.searchParams.set('client_id', googleClientId);
    googleAuthUrl.searchParams.set('redirect_uri', googleCallbackUrl);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('state', googleState);
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'select_account');

    return NextResponse.redirect(googleAuthUrl.toString());
  }

  // Check if user already has an active Jacxi / Google NextAuth session
  const session = await auth().catch(() => null);
  const sessionUser = session?.user;

  const googleStartUrl = new URL(request.url);
  googleStartUrl.searchParams.set('action', 'google');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sign in with Google — Jacxi Shipping MCP Gateway</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #F9FAFB;
      color: #111827;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      max-width: 440px;
      width: 100%;
      padding: 32px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.06);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .brand-badge {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: rgba(212, 175, 55, 0.14);
      border: 1px solid rgba(212, 175, 55, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: #9A7B1C;
      font-size: 16px;
    }
    h1 {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      line-height: 1.3;
    }
    .subtitle {
      font-size: 13px;
      color: #4B5563;
      margin-top: 6px;
      line-height: 1.5;
    }
    .scope-box {
      margin: 20px 0;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 12px;
      color: #4B5563;
    }
    .scope-box strong {
      display: block;
      color: #111827;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .scope-list {
      list-style: none;
      space-y: 4px;
    }
    .scope-list li {
      padding: 3px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-google {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 12px 16px;
      background: #FFFFFF;
      color: #1F2937;
      border: 1px solid #D1D5DB;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.15s ease;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .btn-google:hover {
      background: #F9FAFB;
      border-color: #9CA3AF;
    }
    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      padding: 12px 16px;
      background: #D4AF37;
      color: #111827;
      border: none;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 10px;
    }
    .btn-primary:hover {
      background: #C5A028;
    }
    .divider {
      display: flex;
      align-items: center;
      text-align: center;
      margin: 20px 0;
      color: #9CA3AF;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid #E5E7EB;
    }
    .divider:not(:empty)::before { margin-right: 10px; }
    .divider:not(:empty)::after { margin-left: 10px; }
    .input-group {
      margin-bottom: 12px;
    }
    .input-group label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #4B5563;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .input-group input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 13px;
      font-family: monospace;
    }
    .error-banner {
      background: #FEF2F2;
      border: 1px solid #FECACA;
      color: #B91C1C;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12px;
      margin-bottom: 16px;
    }
    .meta {
      margin-top: 18px;
      font-size: 11px;
      color: #6B7280;
      text-align: center;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <div class="brand-badge">JX</div>
      <div>
        <h1>Jacxi Shipping MCP</h1>
        <div style="font-size: 12px; color: #6B7280;">Google OAuth 2.0 & AI Agent Gateway</div>
      </div>
    </div>

    <p class="subtitle">
      An AI agent (<strong>${escapeHtml(clientId)}</strong>) is requesting permission to connect to your Jacxi Shipping MCP server.
    </p>

    ${errorMsg ? `<div class="error-banner">${escapeHtml(errorMsg)}</div>` : ''}

    <div class="scope-box">
      <strong>Requested MCP Permissions:</strong>
      <ul class="scope-list">
        <li>✓ Search vehicles by VIN & lot number</li>
        <li>✓ Track ocean containers, vessels & booking numbers</li>
        <li>✓ View container manifests, dispatches & shipping quotes</li>
      </ul>
    </div>

    ${
      googleClientId
        ? `<a href="${escapeHtml(googleStartUrl.toString())}" class="btn-google">
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continue with Google
          </a>`
        : ''
    }

    ${
      sessionUser?.email
        ? `<form method="POST" action="/api/oauth/authorize" style="margin-top: 10px;">
            <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
            <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
            <input type="hidden" name="state" value="${escapeHtml(state)}" />
            <input type="hidden" name="scope" value="${escapeHtml(scope)}" />
            <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge || '')}" />
            <input type="hidden" name="code_challenge_method" value="${escapeHtml(codeChallengeMethod)}" />
            <input type="hidden" name="auth_mode" value="session" />
            <button type="submit" class="btn-primary">
              Approve as ${escapeHtml(sessionUser.name || sessionUser.email)}
            </button>
          </form>`
        : ''
    }

    <div class="divider">Or Authorize with Google Token / Access Key</div>

    <form method="POST" action="/api/oauth/authorize">
      <input type="hidden" name="client_id" value="${escapeHtml(clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeHtml(redirectUri)}" />
      <input type="hidden" name="state" value="${escapeHtml(state)}" />
      <input type="hidden" name="scope" value="${escapeHtml(scope)}" />
      <input type="hidden" name="code_challenge" value="${escapeHtml(codeChallenge || '')}" />
      <input type="hidden" name="code_challenge_method" value="${escapeHtml(codeChallengeMethod)}" />
      <div class="input-group">
        <label>Google Email / Login Code / MCP Key</label>
        <input type="password" name="credential" placeholder="Enter Customer Login Code or MCP Key" required />
      </div>
      <button type="submit" class="btn-primary">Authorize AI Agent</button>
    </form>

    <div class="meta">
      Redirect URI: ${escapeHtml(redirectUri)}
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const clientId = String(formData.get('client_id') || 'mcp-client');
  const redirectUri = String(formData.get('redirect_uri') || '');
  const state = String(formData.get('state') || '');
  const scope = String(
    formData.get('scope') || 'openid email profile mcp:tools'
  );
  const codeChallenge = String(formData.get('code_challenge') || '') || undefined;
  const codeChallengeMethod =
    String(formData.get('code_challenge_method') || 'S256') || 'S256';
  const authMode = String(formData.get('auth_mode') || '');
  const credential = String(formData.get('credential') || '').trim();

  // 1. Check active NextAuth session if user clicked "Approve as <session user>"
  if (authMode === 'session') {
    const session = await auth().catch(() => null);
    if (session?.user?.email) {
      const code = createAuthorizationCode({
        clientId,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        scope,
        user: {
          sub: session.user.id || session.user.email,
          email: session.user.email,
          name: session.user.name || session.user.email,
          picture: session.user.image || undefined,
          role: (session.user as any).role || 'user',
          provider: 'google',
        },
      });

      const target = new URL(redirectUri);
      target.searchParams.set('code', code);
      if (state) target.searchParams.set('state', state);
      return NextResponse.redirect(target.toString(), 302);
    }
  }

  // 2. Check credential against MCP_API_KEY or Jacxi User loginCode
  const settings = await provider.getMcpGatewaySettings();
  if (credential && credential === settings.apiKey) {
    const code = createAuthorizationCode({
      clientId,
      redirectUri,
      codeChallenge,
      codeChallengeMethod,
      scope,
      user: {
        sub: 'mcp-admin',
        email: 'admin@jacxishipping.com',
        name: 'Jacxi MCP Administrator',
        role: 'admin',
        provider: 'google',
      },
    });

    const target = new URL(redirectUri);
    target.searchParams.set('code', code);
    if (state) target.searchParams.set('state', state);
    return NextResponse.redirect(target.toString(), 302);
  }

  if (credential) {
    const dbUser = await prisma.user
      .findFirst({
        where: {
          OR: [
            { loginCode: credential.toUpperCase() },
            { id: credential },
          ],
        },
      })
      .catch(() => null);

    if (dbUser) {
      const code = createAuthorizationCode({
        clientId,
        redirectUri,
        codeChallenge,
        codeChallengeMethod,
        scope,
        user: {
          sub: dbUser.id,
          email: dbUser.email,
          name: dbUser.name || dbUser.email,
          role: dbUser.role,
          provider: 'jacxi',
        },
      });

      const target = new URL(redirectUri);
      target.searchParams.set('code', code);
      if (state) target.searchParams.set('state', state);
      return NextResponse.redirect(target.toString(), 302);
    }
  }

  // Return back to authorize screen with error message
  const retryUrl = new URL('/api/oauth/authorize', request.url);
  retryUrl.searchParams.set('client_id', clientId);
  retryUrl.searchParams.set('redirect_uri', redirectUri);
  if (state) retryUrl.searchParams.set('state', state);
  retryUrl.searchParams.set('scope', scope);
  if (codeChallenge) retryUrl.searchParams.set('code_challenge', codeChallenge);
  retryUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
  retryUrl.searchParams.set(
    'error_msg',
    'Invalid credential. Please sign in with Google or provide a valid Jacxi Login Code / MCP Key.'
  );

  return NextResponse.redirect(retryUrl.toString(), 302);
}

