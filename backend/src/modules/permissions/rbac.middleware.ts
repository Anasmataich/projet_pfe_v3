// rbac.middleware.ts - réexport du middleware RBAC centralisé

/**
 * Les middlewares RBAC sont définis dans src/middlewares/authorize.ts.
 * Ce fichier réexporte pour cohérence avec la structure du module permissions.
 */
export {
  authorize,
  authorizeOwnerOrAdmin,
  requirePermission,
  requireAllPermissions,
  adminOnly,
  cadreOrAdmin,
} from '../../middlewares/authorize';
