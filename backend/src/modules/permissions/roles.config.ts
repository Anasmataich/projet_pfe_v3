// roles.config.ts - configuration des rôles et permissions (RBAC)

import { UserRole } from '../../shared/enums';

// ─────────────────────────────────────────────
// Permissions disponibles (ressource:action)
// ─────────────────────────────────────────────

export const Permission = {
  // Auth
  AUTH_REFRESH: 'auth:refresh',
  AUTH_LOGOUT: 'auth:logout',
  AUTH_CHANGE_PASSWORD: 'auth:change-password',
  AUTH_RESET_PASSWORD: 'auth:reset-password',

  // Documents
  DOC_CREATE: 'documents:create',
  DOC_READ: 'documents:read',
  DOC_UPDATE: 'documents:update',
  DOC_DELETE: 'documents:delete',
  DOC_UPLOAD: 'documents:upload',
  DOC_DOWNLOAD: 'documents:download',
  DOC_SHARE: 'documents:share',
  DOC_APPROVE: 'documents:approve',

  // Workflow
  WORKFLOW_SUBMIT: 'workflow:submit',
  WORKFLOW_APPROVE: 'workflow:approve',
  WORKFLOW_REJECT: 'workflow:reject',
  WORKFLOW_RETURN: 'workflow:return',

  // Users
  USER_CREATE: 'users:create',
  USER_READ: 'users:read',
  USER_UPDATE: 'users:update',
  USER_DELETE: 'users:delete',
  USER_SUSPEND: 'users:suspend',

  // Audit
  AUDIT_READ: 'audit:read',
  AUDIT_EXPORT: 'audit:export',

  // Reports
  REPORTS_READ: 'reports:read',
  REPORTS_EXPORT: 'reports:export',

  // Settings (admin)
  SETTINGS_UPDATE: 'settings:update',
} as const;

export type PermissionType = (typeof Permission)[keyof typeof Permission];

// ─────────────────────────────────────────────
// Mapping Rôle → Permissions
// ─────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, PermissionType[]> = {
  [UserRole.ADMIN]: [
    Permission.AUTH_REFRESH,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_CHANGE_PASSWORD,
    Permission.AUTH_RESET_PASSWORD,
    Permission.DOC_CREATE,
    Permission.DOC_READ,
    Permission.DOC_UPDATE,
    Permission.DOC_DELETE,
    Permission.DOC_UPLOAD,
    Permission.DOC_DOWNLOAD,
    Permission.DOC_SHARE,
    Permission.DOC_APPROVE,
    Permission.WORKFLOW_SUBMIT,
    Permission.WORKFLOW_APPROVE,
    Permission.WORKFLOW_REJECT,
    Permission.WORKFLOW_RETURN,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.USER_DELETE,
    Permission.USER_SUSPEND,
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT,
    Permission.REPORTS_READ,
    Permission.REPORTS_EXPORT,
    Permission.SETTINGS_UPDATE,
  ],

  [UserRole.CADRE]: [
    Permission.AUTH_REFRESH,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_CHANGE_PASSWORD,
    Permission.DOC_CREATE,
    Permission.DOC_READ,
    Permission.DOC_UPDATE,
    Permission.DOC_UPLOAD,
    Permission.DOC_DOWNLOAD,
    Permission.DOC_SHARE,
    Permission.DOC_APPROVE,
    Permission.WORKFLOW_SUBMIT,
    Permission.WORKFLOW_APPROVE,
    Permission.WORKFLOW_REJECT,
    Permission.WORKFLOW_RETURN,
    Permission.USER_READ,
    Permission.AUDIT_READ,
    Permission.REPORTS_READ,
    Permission.REPORTS_EXPORT,
  ],

  [UserRole.INSPECTEUR]: [
    Permission.AUTH_REFRESH,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_CHANGE_PASSWORD,
    Permission.DOC_CREATE,
    Permission.DOC_READ,
    Permission.DOC_UPDATE,
    Permission.DOC_UPLOAD,
    Permission.DOC_DOWNLOAD,
    Permission.WORKFLOW_SUBMIT,
    Permission.USER_READ,
    Permission.AUDIT_READ,
    Permission.REPORTS_READ,
  ],

  [UserRole.RH]: [
    Permission.AUTH_REFRESH,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_CHANGE_PASSWORD,
    Permission.DOC_CREATE,
    Permission.DOC_READ,
    Permission.DOC_UPDATE,
    Permission.DOC_UPLOAD,
    Permission.DOC_DOWNLOAD,
    Permission.WORKFLOW_SUBMIT,
    Permission.USER_CREATE,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.AUDIT_READ,
    Permission.REPORTS_READ,
  ],

  [UserRole.COMPTABLE]: [
    Permission.AUTH_REFRESH,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_CHANGE_PASSWORD,
    Permission.DOC_READ,
    Permission.DOC_DOWNLOAD,
    Permission.WORKFLOW_SUBMIT,
    Permission.AUDIT_READ,
    Permission.REPORTS_READ,
    Permission.REPORTS_EXPORT,
  ],

  [UserRole.CONSULTANT]: [
    Permission.AUTH_REFRESH,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_CHANGE_PASSWORD,
    Permission.DOC_READ,
    Permission.DOC_DOWNLOAD,
    Permission.AUDIT_READ,
    Permission.REPORTS_READ,
  ],

  // Gestionnaire documentaire — gestion avancée du cycle de vie des documents
  [UserRole.DOCUMENT_MANAGER]: [
    Permission.AUTH_REFRESH,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_CHANGE_PASSWORD,
    Permission.DOC_CREATE,
    Permission.DOC_READ,
    Permission.DOC_UPDATE,
    Permission.DOC_DELETE,
    Permission.DOC_UPLOAD,
    Permission.DOC_DOWNLOAD,
    Permission.DOC_SHARE,
    Permission.DOC_APPROVE,
    Permission.WORKFLOW_SUBMIT,
    Permission.WORKFLOW_RETURN,
    Permission.REPORTS_READ,
  ],

  // Utilisateur standard — consultation et dépôt de ses documents
  [UserRole.STANDARD_USER]: [
    Permission.AUTH_REFRESH,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_CHANGE_PASSWORD,
    Permission.DOC_CREATE,
    Permission.DOC_READ,
    Permission.DOC_UPLOAD,
    Permission.DOC_DOWNLOAD,
    Permission.WORKFLOW_SUBMIT,
  ],

  // RSSI / Security Officer — focalisé sur l'audit et l'intégrité
  [UserRole.SECURITY_OFFICER]: [
    Permission.AUTH_REFRESH,
    Permission.AUTH_LOGOUT,
    Permission.AUTH_CHANGE_PASSWORD,
    Permission.DOC_READ,
    Permission.DOC_DOWNLOAD,
    Permission.AUDIT_READ,
    Permission.AUDIT_EXPORT,
    Permission.REPORTS_READ,
    Permission.REPORTS_EXPORT,
  ],
};
