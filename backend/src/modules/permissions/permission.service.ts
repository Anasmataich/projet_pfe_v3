// permission.service.ts - service de gestion des permissions RBAC

import { UserRole } from '../../shared/enums';
import { ROLE_PERMISSIONS, PermissionType } from './roles.config';

// ─────────────────────────────────────────────
// PermissionService — vérification des droits
// ─────────────────────────────────────────────

export const permissionService = {
  /**
   * Vérifie si un rôle possède une permission donnée
   */
  hasPermission(role: UserRole, permission: PermissionType): boolean {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    return permissions.includes(permission);
  },

  /**
   * Vérifie si un rôle possède au moins une des permissions
   */
  hasAnyPermission(role: UserRole, permissions: PermissionType[]): boolean {
    return permissions.some((p) => permissionService.hasPermission(role, p));
  },

  /**
   * Vérifie si un rôle possède toutes les permissions
   */
  hasAllPermissions(role: UserRole, permissions: PermissionType[]): boolean {
    return permissions.every((p) => permissionService.hasPermission(role, p));
  },

  /**
   * Retourne la liste des permissions d'un rôle
   */
  getRolePermissions(role: UserRole): PermissionType[] {
    return ROLE_PERMISSIONS[role] ?? [];
  },
};
