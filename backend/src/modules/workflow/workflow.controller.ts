// workflow.controller.ts - contrôleur des workflows

import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/ApiResponse';
import { HttpStatus } from '../../shared/enums';
import { workflowService } from './workflow.service';

export const getStatus = async (req: Request, res: Response): Promise<void> => {
  const workflow = await workflowService.getOrCreate(req.params['documentId']!);
  ApiResponse.success(res, workflow, 'Statut du workflow');
};

export const submit = async (req: Request, res: Response): Promise<void> => {
  const documentId = req.params['documentId']!;
  const userId = req.user!.userId;
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';

  const workflow = await workflowService.submit(documentId, userId, ipAddress);
  ApiResponse.success(res, workflow, 'Document soumis pour validation');
};

export const approve = async (req: Request, res: Response): Promise<void> => {
  const documentId = req.params['documentId']!;
  const userId = req.user!.userId;
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';

  const workflow = await workflowService.approve(documentId, userId, ipAddress);
  ApiResponse.success(res, workflow, 'Document approuvé');
};

export const reject = async (req: Request, res: Response): Promise<void> => {
  const documentId = req.params['documentId']!;
  const userId = req.user!.userId;
  const ipAddress = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  const { reason } = req.body as { reason?: string };

  if (!reason || typeof reason !== 'string') {
    ApiResponse.error(res, 'La raison du rejet est requise', HttpStatus.UNPROCESSABLE_ENTITY);
    return;
  }

  const workflow = await workflowService.reject(documentId, userId, reason, ipAddress);
  ApiResponse.success(res, workflow, 'Document rejeté');
};
