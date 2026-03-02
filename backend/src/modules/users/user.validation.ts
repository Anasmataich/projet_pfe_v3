// user.validation.ts - schémas de validation pour les utilisateurs

import { AppError } from '../../shared/AppError';
import { HttpStatus, UserRole, UserStatus } from '../../shared/enums';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface UserCreateInput {
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

export interface UserUpdateInput {
  role?: UserRole;
  status?: UserStatus;
  firstName?: string;
  lastName?: string;
}

export interface UserFilterInput {
  page: number;
  limit: number;
  role?: string;
  status?: string;
  search?: string;
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
  return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);
}

// ─────────────────────────────────────────────
// Validation functions
// ─────────────────────────────────────────────

export function validateUserCreateInput(body: unknown): UserCreateInput {
  const data = body as Record<string, unknown>;
  const errors: string[] = [];

  if (!isValidEmail(data.email)) errors.push('Email invalide');
  if (!isStrongPassword(data.password)) {
    errors.push(`Mot de passe faible — min. ${PASSWORD_MIN_LENGTH} caractères, une majuscule, une minuscule, un chiffre`);
  }
  if (!data.role || !Object.values(UserRole).includes(data.role as UserRole)) {
    errors.push(`Rôle invalide. Valeurs acceptées : ${Object.values(UserRole).join(', ')}`);
  }
  if (errors.length > 0) {
    throw new AppError(errors.join(' | '), HttpStatus.BAD_REQUEST, errors);
  }

  return {
    email: (data.email as string).toLowerCase().trim(),
    password: data.password as string,
    role: data.role as UserRole,
    firstName: typeof data.firstName === 'string' ? data.firstName.trim() : undefined,
    lastName: typeof data.lastName === 'string' ? data.lastName.trim() : undefined,
  };
}

export function validateUserUpdateInput(body: unknown): UserUpdateInput {
  const data = body as Record<string, unknown>;
  const result: UserUpdateInput = {};
  const errors: string[] = [];

  if (data.role !== undefined) {
    if (!Object.values(UserRole).includes(data.role as UserRole)) {
      errors.push(`Rôle invalide. Valeurs acceptées : ${Object.values(UserRole).join(', ')}`);
    } else {
      result.role = data.role as UserRole;
    }
  }

  if (data.status !== undefined) {
    if (!Object.values(UserStatus).includes(data.status as UserStatus)) {
      errors.push(`Statut invalide. Valeurs acceptées : ${Object.values(UserStatus).join(', ')}`);
    } else {
      result.status = data.status as UserStatus;
    }
  }

  if (data.firstName !== undefined) {
    result.firstName = typeof data.firstName === 'string' ? data.firstName.trim() : undefined;
  }
  if (data.lastName !== undefined) {
    result.lastName = typeof data.lastName === 'string' ? data.lastName.trim() : undefined;
  }

  if (errors.length > 0) {
    throw new AppError(errors.join(' | '), HttpStatus.BAD_REQUEST, errors);
  }
  if (Object.keys(result).length === 0) {
    throw new AppError('Aucune donnée valide à mettre à jour', HttpStatus.BAD_REQUEST);
  }

  return result;
}

export function validateUserFilters(query: Record<string, unknown>): UserFilterInput {
  const page = Math.max(1, parseInt(String(query['page'] ?? 1), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query['limit'] ?? 20), 10) || 20));

  return {
    page,
    limit,
    role: typeof query['role'] === 'string' ? query['role'] : undefined,
    status: typeof query['status'] === 'string' ? query['status'] : undefined,
    search: typeof query['search'] === 'string' ? query['search'] : undefined,
  };
}
