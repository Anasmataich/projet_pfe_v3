// auth.validation.ts - schémas de validation pour l'authentification

import { AppError } from '../../shared/AppError';
import { HttpStatus } from '../../shared/enums';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

export interface MfaEnableInput {
  totpToken: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

function isValidEmail(email: unknown): email is string {
  return typeof email === 'string' && EMAIL_REGEX.test(email.trim());
}

function isStrongPassword(password: unknown): password is string {
  if (typeof password !== 'string') return false;
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  return hasUppercase && hasLowercase && hasDigit;
}

function isNonEmptyString(val: unknown): val is string {
  return typeof val === 'string' && val.trim().length > 0;
}

// ─────────────────────────────────────────────
// Validation functions
// ─────────────────────────────────────────────

export function validateLoginInput(body: unknown): LoginInput {
  const data = body as Record<string, unknown>;

  if (!isValidEmail(data.email)) {
    throw new AppError('Email invalide', HttpStatus.BAD_REQUEST);
  }
  if (!isNonEmptyString(data.password)) {
    throw new AppError('Mot de passe requis', HttpStatus.BAD_REQUEST);
  }

  return {
    email: (data.email as string).toLowerCase().trim(),
    password: (data.password as string).trim(),
  };
}

export function validateRegisterInput(body: unknown): RegisterInput {
  const data = body as Record<string, unknown>;

  if (!isValidEmail(data.email)) {
    throw new AppError('Email invalide', HttpStatus.BAD_REQUEST);
  }
  if (!isStrongPassword(data.password)) {
    throw new AppError(
      `Mot de passe trop faible. Minimum ${PASSWORD_MIN_LENGTH} caractères avec au moins une majuscule, une minuscule et un chiffre.`,
      HttpStatus.BAD_REQUEST
    );
  }

  return {
    email: (data.email as string).toLowerCase().trim(),
    password: data.password as string,
    firstName: typeof data.firstName === 'string' ? data.firstName.trim() : undefined,
    lastName: typeof data.lastName === 'string' ? data.lastName.trim() : undefined,
  };
}

export function validateMfaVerifyInput(body: unknown): MfaVerifyInput {
  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.userId)) throw new AppError('userId requis', HttpStatus.BAD_REQUEST);
  if (!isNonEmptyString(data.totpToken)) throw new AppError('totpToken requis', HttpStatus.BAD_REQUEST);
  if (!isNonEmptyString(data.pendingToken)) throw new AppError('pendingToken requis', HttpStatus.BAD_REQUEST);

  return {
    userId: data.userId as string,
    totpToken: (data.totpToken as string).replace(/\s/g, ''),
    pendingToken: data.pendingToken as string,
  };
}

export function validateMfaEnableInput(body: unknown): MfaEnableInput {
  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.totpToken)) throw new AppError('totpToken requis', HttpStatus.BAD_REQUEST);

  return { totpToken: (data.totpToken as string).replace(/\s/g, '') };
}

export function validateRefreshInput(body: unknown): RefreshInput {
  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.refreshToken)) {
    throw new AppError('refreshToken requis', HttpStatus.BAD_REQUEST);
  }

  return { refreshToken: data.refreshToken as string };
}

export function validateChangePasswordInput(body: unknown): ChangePasswordInput {
  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.currentPassword)) {
    throw new AppError('currentPassword requis', HttpStatus.BAD_REQUEST);
  }
  if (!isStrongPassword(data.newPassword)) {
    throw new AppError(
      `Nouveau mot de passe trop faible. Minimum ${PASSWORD_MIN_LENGTH} caractères avec au moins une majuscule, une minuscule et un chiffre.`,
      HttpStatus.BAD_REQUEST
    );
  }
  if (data.currentPassword === data.newPassword) {
    throw new AppError(
      'Le nouveau mot de passe doit être différent de l\'actuel',
      HttpStatus.BAD_REQUEST
    );
  }

  return {
    currentPassword: data.currentPassword as string,
    newPassword: data.newPassword as string,
  };
}

// ─────────────────────────────────────────────
// Forgot / Reset Password
// ─────────────────────────────────────────────

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export function validateForgotPasswordInput(body: unknown): ForgotPasswordInput {
  const data = body as Record<string, unknown>;

  if (!isValidEmail(data.email)) {
    throw new AppError('Email invalide', HttpStatus.BAD_REQUEST);
  }

  return { email: (data.email as string).toLowerCase().trim() };
}

export function validateResetPasswordInput(body: unknown): ResetPasswordInput {
  const data = body as Record<string, unknown>;

  if (!isNonEmptyString(data.token)) {
    throw new AppError('Token de réinitialisation requis', HttpStatus.BAD_REQUEST);
  }
  if (!isStrongPassword(data.newPassword)) {
    throw new AppError(
      `Nouveau mot de passe trop faible. Minimum ${PASSWORD_MIN_LENGTH} caractères avec au moins une majuscule, une minuscule et un chiffre.`,
      HttpStatus.BAD_REQUEST
    );
  }

  return {
    token: data.token as string,
    newPassword: data.newPassword as string,
  };
}
