import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ApiError } from '../types/api';
import * as secureStorage from '../utils/secureStorage';

function resolveApiUrl() {
  const configuredUrl = Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  const normalizedConfiguredUrl = (() => {
    try {
      const parsedUrl = new URL(configuredUrl);
      if (parsedUrl.hostname === 'jacxishipping.com') {
        parsedUrl.hostname = 'www.jacxishipping.com';
      }
      return parsedUrl.toString().replace(/\/$/, '');
    } catch {
      return configuredUrl;
    }
  })();

  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    ['127.0.0.1', 'localhost'].includes(window.location.hostname)
  ) {
    const configuredHostname = (() => {
      try {
        return new URL(normalizedConfiguredUrl).hostname;
      } catch {
        return null;
      }
    })();

    if (configuredHostname && ['127.0.0.1', 'localhost'].includes(configuredHostname)) {
      return `http://${window.location.hostname}:3000`;
    }
  }

  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    normalizedConfiguredUrl.includes('localhost:3000') &&
    window.location.hostname.endsWith('.app.github.dev')
  ) {
    const forwardedBackendHost = window.location.hostname.replace(/-\d+\.app\.github\.dev$/, '-3000.app.github.dev');
    return `https://${forwardedBackendHost}`;
  }

  return normalizedConfiguredUrl;
}

export const API_URL = resolveApiUrl();

const TOKEN_KEY = 'auth_token';
const SESSION_KEY = 'auth_session';

export class ApiClient {
  private client: AxiosInstance;
  private unauthorizedHandler: (() => Promise<void> | void) | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  public onUnauthorized(handler: (() => Promise<void> | void) | null) {
    this.unauthorizedHandler = handler;
  }

  private async handleUnauthorized() {
    await secureStorage.deleteItem(TOKEN_KEY);
    await secureStorage.deleteItem(SESSION_KEY);
    try {
      await this.unauthorizedHandler?.();
    } catch (error) {
      console.error('Unauthorized handler error:', error);
    }
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await secureStorage.getItem(TOKEN_KEY);
        if (token && config.headers) {
          config.headers.Authorization = 'Bearer ' + token;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // Mobile auth tokens are long-lived JWTs issued by /api/mobile-auth/*
        // and there is no refresh endpoint. A 401 means the session is dead:
        // clear it once and notify the auth store so the UI returns to login.
        if (error.response?.status === 401) {
          const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
          if (originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            await this.handleUnauthorized();
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      const data = error.response.data as any;
      return {
        message: data?.message || 'An error occurred',
        code: data?.code,
        status: error.response.status,
        errors: data?.errors,
      };
    }

    if (error.request) {
      return {
        message: 'No response from server. Please check your connection.',
        code: 'NETWORK_ERROR',
      };
    }

    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  public getClient(): AxiosInstance {
    return this.client;
  }

  public async setToken(token: string) {
    await secureStorage.setItem(TOKEN_KEY, token);
  }

  public async getToken(): Promise<string | null> {
    return await secureStorage.getItem(TOKEN_KEY);
  }

  public async removeToken() {
    await secureStorage.deleteItem(TOKEN_KEY);
    await secureStorage.deleteItem(SESSION_KEY);
  }
}

export const apiClient = new ApiClient();
export default apiClient.getClient();
