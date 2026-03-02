// document.routes.ts - routes de gestion des documents

import { Router } from 'express';
import { authenticate } from '../../middlewares/authenticate';
import { requirePermission } from '../../middlewares/authorize';
import { auditLogger } from '../../middlewares/auditLogger';
import { documentUpload } from '../../middlewares/uploadMiddleware';
import { Permission } from '../permissions/roles.config';
import { AuditAction } from '../../shared/enums';
import * as documentController from './document.controller';

const router = Router();

router.use(authenticate);

router.get('/', requirePermission(Permission.DOC_READ), documentController.list);
router.get('/:id/versions', requirePermission(Permission.DOC_READ), documentController.listVersions);
router.get('/:id/download-url', requirePermission(Permission.DOC_DOWNLOAD), documentController.getDownloadUrl);
router.get('/:id', requirePermission(Permission.DOC_READ), documentController.getById);
router.post(
  '/',
  requirePermission(Permission.DOC_UPLOAD),
  documentUpload,
  auditLogger(AuditAction.DOC_UPLOAD, 'document'),
  documentController.upload
);
router.patch(
  '/:id',
  requirePermission(Permission.DOC_UPDATE),
  auditLogger(AuditAction.DOC_UPDATE, 'document'),
  documentController.update
);
router.delete(
  '/:id',
  requirePermission(Permission.DOC_DELETE),
  auditLogger(AuditAction.DOC_DELETE, 'document'),
  documentController.remove
);

export default router;
