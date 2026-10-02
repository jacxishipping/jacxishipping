import client, { apiClient } from './client';
import { AuthResponse, LoginCodeCredentials, LoginCredentials, User } from '../types/auth';

// Canonical mobile auth endpoints served by Next.js (`src/app/api/auth/*`).
// These share the same HMAC token contract as the web mobile bridge
// (`src/lib/mobile-auth.ts`), so the app must not invent parallel
// `/api/mobile-auth/*` or `/api/auth/refresh` paths.
const AUTH_PATH = '/api/auth';

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await client.post<AuthResponse>(`${AUTH_PATH}/signin`, credentials);
    
    if (response.data.token) {
      await apiClient.setToken(response.data.token);
    }
    
    return response.data;
  },

  async loginWithCode(credentials: LoginCodeCredentials): Promise<AuthResponse> {
    const response = await client.post<AuthResponse>(`${AUTH_PATH}/signin-code`, credentials);
    
    if (response.data.token) {
      await apiClient.setToken(response.data.token);
    }
    
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await client.post(`${AUTH_PATH}/signout`);
    } finally {
      await apiClient.removeToken();
    }
  },

  async getCurrentUser(): Promise<User> {
    const response = await client.get<User>(`${AUTH_PATH}/me`);
    return response.data;
  },

  // NOTE: the backend issues long-lived HMAC tokens (30d TTL) and exposes no
  // refresh or password-reset endpoints for mobile. Callers should treat 401
  // as terminal (the apiClient clears storage + fires onUnauthorized) and send
  // the user back through login instead of attempting a silent refresh.
  async refreshToken(): Promise<never> {
    throw new Error('Session refresh is not supported. Please sign in again.');
  },

  async forgotPassword(_email: string): Promise<never> {
    throw new Error('Password reset is not available in the mobile app yet.');
  },

  async resetPassword(_token: string, _password: string): Promise<never> {
    throw new Error('Password reset is not available in the mobile app yet.');
  },
};
