// user.service.ts - service de gestion des utilisateurs

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database';
import { AppError } from '../../shared/AppError';
import { UserStatus } from '../../shared/enums';
import { buildPagination, PaginationMeta } from '../../shared/ApiResponse';
import type { User, UserCreate, UserUpdate } from './user.model';
import { mapRowToUser } from './user.model';

export const userService = {
  findAll: async (
    page: number,
    limit: number,
    filters: { role?: string; status?: string; search?: string }
  ): Promise<{ users: User[]; pagination: PaginationMeta }> => {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.role) {
      conditions.push(`role = $${idx++}`);
      params.push(filters.role);
    }
    if (filters.status) {
      conditions.push(`status = $${idx++}`);
      params.push(filters.status);
    }
    if (filters.search) {
      conditions.push(`(email ILIKE $${idx} OR first_name ILIKE $${idx} OR last_name ILIKE $${idx})`);
      params.push(`%${filters.search}%`);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM users ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    const result = await db.query(
      `SELECT id, email, role, status, first_name, last_name, mfa_enabled, created_at, updated_at 
       FROM users ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    return {
      users: result.rows.map(mapRowToUser),
      pagination: buildPagination(page, limit, total),
    };
  },

  findById: async (id: string): Promise<User> => {
    const result = await db.query(
      'SELECT id, email, role, status, first_name, last_name, mfa_enabled, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    if (!result.rows[0]) throw AppError.notFound('Utilisateur');
    return mapRowToUser(result.rows[0]);
  },

  create: async (data: UserCreate): Promise<User> => {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [data.email.toLowerCase()]);
    if (existing.rows[0]) throw AppError.conflict('Un utilisateur avec cet email existe déjà');

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(data.password, 12);

    await db.query(
      `INSERT INTO users (id, email, password_hash, role, status, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        id,
        data.email.toLowerCase(),
        passwordHash,
        data.role,
        UserStatus.ACTIVE,
        data.firstName ?? null,
        data.lastName ?? null,
      ]
    );

    return userService.findById(id);
  },

  update: async (id: string, data: UserUpdate): Promise<User> => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(data.role);
    }
    if (data.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(data.status);
    }
    if (data.firstName !== undefined) {
      fields.push(`first_name = $${idx++}`);
      values.push(data.firstName);
    }
    if (data.lastName !== undefined) {
      fields.push(`last_name = $${idx++}`);
      values.push(data.lastName);
    }

    if (fields.length === 0) throw AppError.badRequest('Aucune donnée à modifier');

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, email, role, status, first_name, last_name, mfa_enabled, created_at, updated_at`,
      values
    );
    if (!result.rows[0]) throw AppError.notFound('Utilisateur');
    return mapRowToUser(result.rows[0]);
  },

  delete: async (id: string): Promise<void> => {
    const result = await db.query('DELETE FROM users WHERE id = $1', [id]);
    if (result.rowCount === 0) throw AppError.notFound('Utilisateur');
  },
};
