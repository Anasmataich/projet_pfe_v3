export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface MfaVerifyInput {
  userId: string;
  totpToken: string;
  pendingToken: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResult {
  requiresMFA: boolean;
  userId: string;
  pendingToken?: string;
  // Les tokens sont désormais dans les cookies HttpOnly (pas dans le body)
}

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  mfaEnabled: boolean;
}

export type UserRole =
  | 'ADMIN'
  | 'CADRE'
  | 'INSPECTEUR'
  | 'RH'
  | 'COMPTABLE'
  | 'CONSULTANT';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
