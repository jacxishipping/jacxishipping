export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'CUSTOMER' | 'CUSTOMER_SERVICE';

/** Staff roles that should see the admin workspace. */
export const STAFF_ROLES: ReadonlyArray<UserRole> = ['ADMIN', 'MANAGER', 'CUSTOMER_SERVICE'];

/** End-customer roles that should see the customer workspace. */
export const CUSTOMER_ROLES: ReadonlyArray<UserRole> = ['USER', 'CUSTOMER'];

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  loginCode?: string;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginCodeCredentials {
  loginCode: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  expiresAt?: string;
}

export interface AuthSession {
  user: User;
  token?: string;
  expiresAt?: string;
}

export interface RefreshTokenResponse {
  token: string;
  expiresAt: string;
}
