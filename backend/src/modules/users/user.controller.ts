// user.controller.ts - contrôleur des utilisateurs

import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/ApiResponse';
import { HttpStatus, UserRole, UserStatus } from '../../shared/enums';
import { userService } from './user.service';
import { validateRegisterInput } from '../auth/auth.validation';

const parseQueryInt = (val: unknown, defaultVal: number): number => {
  if (val == null) return defaultVal;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? defaultVal : Math.max(1, n);
};

export const list = async (req: Request, res: Response): Promise<void> => {
  const page = parseQueryInt(req.query['page'], 1);
  const limit = Math.min(parseQueryInt(req.query['limit'], 20), 100);
  const filters = {
    role: req.query['role'] as string | undefined,
    status: req.query['status'] as string | undefined,
    search: req.query['search'] as string | undefined,
  };

  const { users, pagination } = await userService.findAll(page, limit, filters);
  ApiResponse.paginated(res, users, { page, limit, total: pagination.total });
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const user = await userService.findById(req.params['id']!);
  ApiResponse.success(res, user);
};

export const create = async (req: Request, res: Response): Promise<void> => {
  const data = req.body as { email?: string; password?: string; role?: string; firstName?: string; lastName?: string };
  if (!data.email || !data.password || !data.role) {
    ApiResponse.error(res, 'email, password et role requis', HttpStatus.BAD_REQUEST);
    return;
  }

  const role = data.role as UserRole;
  if (!role || !Object.values(UserRole).includes(role)) {
    ApiResponse.error(res, 'Rôle invalide', HttpStatus.BAD_REQUEST);
    return;
  }
  const user = await userService.create({
    email: data.email,
    password: data.password,
    role,
    firstName: data.firstName,
    lastName: data.lastName,
  });
  ApiResponse.created(res, user);
};

export const update = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { role?: string; status?: string; firstName?: string; lastName?: string };
  const data: { role?: UserRole; status?: UserStatus; firstName?: string; lastName?: string } = {};
  if (body.role != null) {
    if (!Object.values(UserRole).includes(body.role as UserRole)) {
      ApiResponse.error(res, 'Rôle invalide', HttpStatus.BAD_REQUEST);
      return;
    }
    data.role = body.role as UserRole;
  }
  if (body.status != null) {
    if (!Object.values(UserStatus).includes(body.status as UserStatus)) {
      ApiResponse.error(res, 'Statut invalide', HttpStatus.BAD_REQUEST);
      return;
    }
    data.status = body.status as UserStatus;
  }
  if (body.firstName !== undefined) data.firstName = body.firstName;
  if (body.lastName !== undefined) data.lastName = body.lastName;
  const user = await userService.update(req.params['id']!, data);
  ApiResponse.success(res, user, 'Utilisateur mis à jour');
};

export const remove = async (req: Request, res: Response): Promise<void> => {
  await userService.delete(req.params['id']!);
  ApiResponse.noContent(res);
};

/**
 * Création d'un utilisateur via l'API d'administration :
 * - Mot de passe robuste (réutilise la validation d'inscription)
 * - Email normalisé / validé
 * - Rôle limité à DOCUMENT_MANAGER, STANDARD_USER, SECURITY_OFFICER
 */
export const createAdminUser = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as { role?: string };

  if (!body.role) {
    ApiResponse.error(res, 'role requis', HttpStatus.BAD_REQUEST);
    return;
  }

  const allowedRoles: UserRole[] = [
    UserRole.DOCUMENT_MANAGER,
    UserRole.STANDARD_USER,
    UserRole.SECURITY_OFFICER,
  ];

  const role = body.role as UserRole;
  if (!allowedRoles.includes(role)) {
    ApiResponse.error(
      res,
      'Rôle non autorisé pour la création via /admin/users',
      HttpStatus.BAD_REQUEST
    );
    return;
  }

  // Valide email + mot de passe robuste + normalisation des champs
  const { email, password, firstName, lastName } = validateRegisterInput(req.body);

  const user = await userService.create({
    email,
    password,
    role,
    firstName,
    lastName,
  });

  ApiResponse.created(res, user);
};
