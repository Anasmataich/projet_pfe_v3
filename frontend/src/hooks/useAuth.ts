import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/auth.types';

export function useAuth() {
  const { user, isAuthenticated, isLoading, pendingMFA, login, verifyMFA, logout, loadUser, hasRole } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    pendingMFA,
    login,
    verifyMFA,
    logout,
    loadUser,
    hasRole,
    isAdmin: user?.role === 'ADMIN',
    role: user?.role as UserRole | undefined,
  };
}
