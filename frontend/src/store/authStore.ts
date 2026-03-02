import { create } from 'zustand';
import type { AuthUser, UserRole } from '@/types/auth.types';
import { authService } from '@/services/authService';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingMFA: { userId: string; pendingToken: string } | null;

  setUser: (user: AuthUser | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  verifyMFA: (totpToken: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false, // Sera déterminé par loadUser() via /auth/me
  isLoading: true,
  pendingMFA: null,

  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

  login: async (email, password) => {
    const result = await authService.login({ email, password });

    if (result.requiresMFA) {
      set({ pendingMFA: { userId: result.userId, pendingToken: result.pendingToken! } });
      return true;
    }

    // Les tokens sont maintenant dans les cookies HttpOnly (définis par le backend)
    // On appelle /auth/me pour récupérer les infos utilisateur
    const user = await authService.getMe();
    set({
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        mfaEnabled: user.mfaEnabled,
      },
      isAuthenticated: true,
      isLoading: false,
      pendingMFA: null,
    });
    return false;
  },

  verifyMFA: async (totpToken) => {
    const { pendingMFA } = get();
    if (!pendingMFA) throw new Error('No pending MFA');

    // Le backend place les tokens dans les cookies
    await authService.verifyMFA(pendingMFA.userId, totpToken, pendingMFA.pendingToken);

    const user = await authService.getMe();
    set({
      user: {
        userId: user.id,
        email: user.email,
        role: user.role,
        firstName: user.firstName ?? undefined,
        lastName: user.lastName ?? undefined,
        mfaEnabled: user.mfaEnabled,
      },
      isAuthenticated: true,
      isLoading: false,
      pendingMFA: null,
    });
  },

  logout: async () => {
    try { await authService.logout(); } catch { /* ignore */ }
    // Le backend efface les cookies via clearAuthCookies()
    set({ user: null, isAuthenticated: false, isLoading: false, pendingMFA: null });
  },

  loadUser: async () => {
    // Tenter de charger le profil — le cookie est envoyé automatiquement
    try {
      const user = await authService.getMe();
      set({
        user: {
          userId: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          mfaEnabled: user.mfaEnabled,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // Cookie invalide ou absent — utilisateur non connecté
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  hasRole: (...roles) => {
    const { user } = get();
    if (!user) return false;
    return roles.includes(user.role);
  },
}));
