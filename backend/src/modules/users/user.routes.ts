// user.routes.ts - routes de gestion des utilisateurs

import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requirePermission, adminOnly } from '../../middlewares/authorize';
import { auditLogger } from '../../middlewares/auditLogger';
import { Permission } from '../permissions/roles.config';
import { AuditAction } from '../../shared/enums';
import * as userController from './user.controller';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(Permission.USER_READ), userController.list);
router.get('/:id', requirePermission(Permission.USER_READ), userController.getById);
router.post(
  '/',
  requirePermission(Permission.USER_CREATE),
  auditLogger(AuditAction.USER_CREATE, 'user'),
  userController.create
);
router.patch(
  '/:id',
  requirePermission(Permission.USER_UPDATE),
  auditLogger(AuditAction.USER_UPDATE, 'user'),
  userController.update
);
router.delete(
  '/:id',
  adminOnly,
  auditLogger(AuditAction.USER_DELETE, 'user'),
  userController.remove
);

export default router;
