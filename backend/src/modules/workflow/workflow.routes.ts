// workflow.routes.ts - routes de gestion des workflows

import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requirePermission } from '../../middlewares/authorize';
import { auditLogger } from '../../middlewares/auditLogger';
import { Permission } from '../permissions/roles.config';
import { AuditAction } from '../../shared/enums';
import * as workflowController from './workflow.controller';

const router = Router();

router.use(authenticate);

router.get('/:documentId', requirePermission(Permission.WORKFLOW_SUBMIT), workflowController.getStatus);
router.post(
  '/:documentId/submit',
  requirePermission(Permission.WORKFLOW_SUBMIT),
  auditLogger(AuditAction.WORKFLOW_SUBMIT, 'document'),
  workflowController.submit
);
router.post(
  '/:documentId/approve',
  requirePermission(Permission.WORKFLOW_APPROVE),
  auditLogger(AuditAction.WORKFLOW_APPROVE, 'document'),
  workflowController.approve
);
router.post(
  '/:documentId/reject',
  requirePermission(Permission.WORKFLOW_REJECT),
  auditLogger(AuditAction.WORKFLOW_REJECT, 'document'),
  workflowController.reject
);

export default router;
