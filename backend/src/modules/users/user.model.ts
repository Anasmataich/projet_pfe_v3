// user.model.ts - modèle utilisateur

import { UserRole, UserStatus } from '../../shared/enums';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  mfaEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreate {
  email: string;
  password: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
}

export interface UserUpdate {
  role?: UserRole;
  status?: UserStatus;
  firstName?: string;
  lastName?: string;
}

export function mapRowToUser(row: Record<string, unknown>): User {
  return {
    id: row['id'] as string,
    email: row['email'] as string,
    role: row['role'] as UserRole,
    status: row['status'] as UserStatus,
    firstName: (row['first_name'] as string | null) ?? null,
    lastName: (row['last_name'] as string | null) ?? null,
    mfaEnabled: Boolean(row['mfa_enabled']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}
