import { useAuthStore } from '../store/auth';
import { CUSTOMER_ROLES, STAFF_ROLES } from '../types/auth';

export const useAuth = () => {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    loginWithCode,
    logout,
    loadSession,
    clearError,
  } = useAuthStore();

  const isAdmin = user ? STAFF_ROLES.includes(user.role) : false;
  const isCustomer = user ? CUSTOMER_ROLES.includes(user.role) : false;

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    isAdmin,
    isCustomer,
    login,
    loginWithCode,
    logout,
    loadSession,
    clearError,
  };
};
