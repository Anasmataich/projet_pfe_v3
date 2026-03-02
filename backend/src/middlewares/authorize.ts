// authorize.ts - middleware d'autorisation RBAC (Role-Based Access Control)

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/AppError';
import { HttpStatus, UserRole } from '../shared/enums';
import logger from '../utils/logger';
import { permissionService } from '../modules/permissions/permission.service';
import type { PermissionType } from '../modules/permissions/roles.config';

// ─────────────────────────────────────────────
// Middleware d'autorisation par rôle (RBAC)
// ─────────────────────────────────────────────

/**
 * Autorise uniquement les rôles spécifiés
 * @param allowedRoles - Liste des rôles autorisés
 */
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentification requise', HttpStatus.UNAUTHORIZED));
      return;
    }

    const { role, userId, email } = req.user;

    if (allowedRoles.indexOf(role) === -1) {
      logger.warn(`[RBAC] Accès refusé — User: ${email} (${role}) — Route: ${req.method} ${req.originalUrl}`);
      next(new AppError(
        `Accès interdit. Rôle requis : ${allowedRoles.join(' ou ')}`,
        HttpStatus.FORBIDDEN
      ));
      return;
    }

    logger.debug(`[RBAC] Accès autorisé — User: ${userId} (${role}) — ${req.method} ${req.originalUrl}`);
    next();
  };
};

/**
 * Vérifie qu'un utilisateur accède uniquement à ses propres ressources
 * (sauf si ADMIN)
 */
export const authorizeOwnerOrAdmin = (
  getUserIdFromParams: (req: Request) => string
) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentification requise', HttpStatus.UNAUTHORIZED));
      return;
    }

    const { userId, role } = req.user;
    const resourceUserId = getUserIdFromParams(req);

    if (role === UserRole.ADMIN || userId === resourceUserId) {
      next();
      return;
    }

    next(new AppError('Vous n\'êtes pas autorisé à accéder à cette ressource', HttpStatus.FORBIDDEN));
  };
};

/**
 * Middleware basé sur les permissions (granularité fine)
 * @param requiredPermissions - Une ou plusieurs permissions (OR : au moins une requise)
 */
export const requirePermission = (...requiredPermissions: PermissionType[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentification requise', HttpStatus.UNAUTHORIZED));
      return;
    }

    const { role, email } = req.user;

    if (!permissionService.hasAnyPermission(role, requiredPermissions)) {
      logger.warn(
        `[RBAC] Permission refusée — User: ${email} (${role}) — Permissions requises: [${requiredPermissions.join(', ')}] — Route: ${req.method} ${req.originalUrl}`
      );
      next(
        new AppError(
          `Permission insuffisante. Droits requis : ${requiredPermissions.join(' ou ')}`,
          HttpStatus.FORBIDDEN
        )
      );
      return;
    }

    logger.debug(`[RBAC] Permission OK — User: ${email} (${role}) — ${req.method} ${req.originalUrl}`);
    next();
  };
};

/**
 * Vérifie que l'utilisateur possède TOUTES les permissions
 */
export const requireAllPermissions = (...requiredPermissions: PermissionType[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Authentification requise', HttpStatus.UNAUTHORIZED));
      return;
    }

    const { role, email } = req.user;

    if (!permissionService.hasAllPermissions(role, requiredPermissions)) {
      logger.warn(
        `[RBAC] Permissions incomplètes — User: ${email} (${role}) — Requises: [${requiredPermissions.join(', ')}]`
      );
      next(
        new AppError('Permissions insuffisantes pour cette action', HttpStatus.FORBIDDEN)
      );
      return;
    }

    next();
  };
};

/**
 * Autorise uniquement les administrateurs
 */
export const adminOnly = authorize(UserRole.ADMIN);

/**
 * Autorise les administrateurs et les cadres
 */
export const cadreOrAdmin = authorize(UserRole.ADMIN, UserRole.CADRE);