// admin.routes.ts - routes d'administration réservées au rôle ADMIN
import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { adminOnly } from '../../middlewares/authorize';
import { auditLogger } from '../../middlewares/auditLogger';
import { AuditAction } from '../../shared/enums';
import * as userController from '../users/user.controller';

const router = Router();

router.use(authenticate);

// POST /api/v1/admin/users — création d'utilisateur par un ADMIN uniquement
router.post(
  '/users',
  adminOnly,
  auditLogger(AuditAction.USER_CREATE, 'user'),
  userController.createAdminUser
);

export default router;

