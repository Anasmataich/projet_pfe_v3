// audit.routes.ts - routes pour les journaux d'audit

import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requirePermission, adminOnly } from '../../middlewares/authorize';
import { Permission } from '../permissions/roles.config';
import * as auditController from './audit.controller';

const router = Router();

router.use(authenticate);

router.get('/',         requirePermission(Permission.AUDIT_READ), auditController.list);
router.get('/summary',  adminOnly,                                 auditController.getSummary);
router.get('/:id',      requirePermission(Permission.AUDIT_READ), auditController.getById);

export default router;
