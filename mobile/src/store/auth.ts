import { create } from 'zustand';
import { User, AuthSession } from '../types/auth';
import { authApi } from '../api/auth';
import { apiClient } from '../api/client';
import * as secureStorage from '../utils/secureStorage';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithCode: (loginCode: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  setUser: (user: User) => void;
  clearError: () => void;
}

const SESSION_KEY = 'auth_session';

function isSessionExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const expiry = Date.parse(expiresAt);
  return Number.isNaN(expiry) ? false : expiry <= Date.now();
}

async function persistSession(session: AuthSession) {
  await secureStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

async function clearSession() {
  // apiClient.removeToken purges both the bearer token and cached session.
  await apiClient.removeToken();
}

export const useAuthStore = create<AuthState>((set) => {
  // A 401 from the API means the HMAC token is dead (no refresh endpoint).
  // Funnel that signal here so any screen drops back to the login flow.
  apiClient.onUnauthorized(() => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: 'Your session has expired. Please sign in again.',
    });
  });

  return {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.login({ email, password });

      const session: AuthSession = {
        user: response.user,
        token: response.token,
        expiresAt: response.expiresAt,
      };

      await persistSession(session);

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  loginWithCode: async (loginCode: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await authApi.loginWithCode({ loginCode });

      const session: AuthSession = {
        user: response.user,
        token: response.token,
        expiresAt: response.expiresAt,
      };

      await persistSession(session);

      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearSession();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  loadSession: async () => {
    try {
      set({ isLoading: true });
      const sessionData = await secureStorage.getItem(SESSION_KEY);

      if (sessionData) {
        let session: AuthSession;
        try {
          session = JSON.parse(sessionData);
        } catch {
          await clearSession();
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        if (isSessionExpired(session.expiresAt)) {
          await clearSession();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: 'Your session has expired. Please sign in again.',
          });
          return;
        }

        try {
          const user = await authApi.getCurrentUser();
          // Re-seed the cached session with the verified user so a stale
          // profile can never linger after a role change.
          const nextSession: AuthSession = { ...session, user };
          await persistSession(nextSession);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          await clearSession();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        set({ isLoading: false, isAuthenticated: false, user: null });
      }
    } catch (error) {
      console.error('Load session error:', error);
      set({ isLoading: false });
    }
  },

  setUser: (user: User) => {
    set({ user, isAuthenticated: Boolean(user) });
  },

  clearError: () => {
    set({ error: null });
  },
  };
});
