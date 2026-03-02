import api, { type ApiResponse } from './api';
import type { LoginInput, LoginResult, RegisterInput, ChangePasswordInput } from '@/types/auth.types';
import type { User } from '@/types/user.types';

export const authService = {
  login: (input: LoginInput) =>
    api.post<ApiResponse<LoginResult>>('/auth/login', input).then((r) => r.data.data!),

  register: (input: RegisterInput) =>
    api.post<ApiResponse<{ userId: string; email: string }>>('/auth/register', input).then((r) => r.data.data!),

  verifyMFA: (userId: string, totpToken: string, pendingToken: string) =>
    api.post<ApiResponse<{ verified: boolean }>>('/auth/mfa/verify', { userId, totpToken, pendingToken }).then((r) => r.data.data!),

  refresh: () =>
    api.post<ApiResponse<{ refreshed: boolean }>>('/auth/refresh', {}).then((r) => r.data.data!),

  getMe: () =>
    api.get<ApiResponse<User>>('/auth/me').then((r) => r.data.data!),

  logout: () =>
    api.post('/auth/logout'),

  changePassword: (input: ChangePasswordInput) =>
    api.patch('/auth/password', input),

  setupMFA: () =>
    api.post<ApiResponse<{ secret: string; otpauthUrl: string; qrData: string }>>('/auth/mfa/setup').then((r) => r.data.data!),

  enableMFA: (totpToken: string) =>
    api.post('/auth/mfa/enable', { totpToken }),

  disableMFA: (totpToken: string) =>
    api.delete('/auth/mfa', { data: { totpToken } }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};
