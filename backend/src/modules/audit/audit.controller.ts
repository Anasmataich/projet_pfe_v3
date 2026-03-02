// audit.controller.ts - contrôleur des journaux d'audit

import { Request, Response } from 'express';
import { ApiResponse } from '../../shared/ApiResponse';
import { HttpStatus } from '../../shared/enums';
import { auditService } from './audit.service';
import { AuditAction } from '../../shared/enums';

const parseQueryInt = (val: unknown, defaultVal: number): number => {
  if (val == null) return defaultVal;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? defaultVal : Math.max(1, n);
};

export const list = async (req: Request, res: Response): Promise<void> => {
  const page = parseQueryInt(req.query['page'], 1);
  const limit = Math.min(parseQueryInt(req.query['limit'], 50), 100);
  const filters = {
    userId: req.query['userId'] as string | undefined,
    action: req.query['action'] as AuditAction | undefined,
    resourceType: req.query['resourceType'] as string | undefined,
    resourceId: req.query['resourceId'] as string | undefined,
    success: req.query['success'] === 'true' ? true : req.query['success'] === 'false' ? false : undefined,
    dateFrom: req.query['dateFrom'] as string | undefined,
    dateTo: req.query['dateTo'] as string | undefined,
  };

  const { logs, pagination } = await auditService.findAll(page, limit, filters);
  ApiResponse.paginated(res, logs, { page, limit, total: pagination.total });
};

export const getById = async (req: Request, res: Response): Promise<void> => {
  const log = await auditService.findById(req.params['id']!);
  ApiResponse.success(res, log);
};

export const getSummary = async (req: Request, res: Response): Promise<void> => {
  const fromStr = req.query['from'] as string | undefined;
  const toStr = req.query['to'] as string | undefined;

  const to = toStr ? new Date(toStr) : new Date();
  const from = fromStr ? new Date(fromStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    ApiResponse.error(res, 'Dates invalides. Format attendu : ISO 8601', HttpStatus.BAD_REQUEST);
    return;
  }

  const summary = await auditService.getSummary(from, to);
  ApiResponse.success(res, { from, to, summary }, 'Résumé d\'audit');
};
