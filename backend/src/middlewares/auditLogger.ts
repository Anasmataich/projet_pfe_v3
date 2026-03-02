import { Request, Response, NextFunction } from 'express';
import { AuditAction } from '../shared/enums';
import logger from '../utils/logger';
import db from '../config/database';

export interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  ipAddress: string;
  userAgent?: string;
  details?: Record<string, unknown>;
  success: boolean;
}

const SENSITIVE_FIELDS = new Set([
  'password', 'currentPassword', 'newPassword', 'confirmPassword',
  'secret', 'mfa_secret', 'token', 'accessToken', 'refreshToken',
  'authorization', 'credit_card', 'ssn',
]);

const sanitizeForAudit = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeForAudit(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
};

const IP_RE = /^[\d.:a-fA-F]+$/;

const sanitizeIp = (raw: string | undefined): string => {
  if (!raw) return 'unknown';
  const cleaned = raw.replace(/^::ffff:/, '');
  return IP_RE.test(cleaned) ? cleaned : 'invalid';
};

export const createAuditLog = async (entry: AuditLogEntry): Promise<void> => {
  try {
    const sanitizedDetails = entry.details ? sanitizeForAudit(entry.details) : {};
    const safeIp = sanitizeIp(entry.ipAddress);

    await db.query(
      `INSERT INTO audit_logs 
       (user_id, action, resource_type, resource_id, ip_address, user_agent, details, success, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        entry.userId ?? null,
        entry.action,
        entry.resourceType ?? null,
        entry.resourceId ?? null,
        safeIp,
        entry.userAgent ?? null,
        JSON.stringify(sanitizedDetails),
        entry.success,
      ]
    );

    logger.info(`[AUDIT] ${entry.action} — User: ${entry.userId ?? 'anonyme'} — IP: ${safeIp}`);
  } catch (err) {
    logger.error(`[AUDIT] Échec de l'enregistrement du log : ${(err as Error).message}`);
  }
};

const BODY_CAPTURE_ACTIONS = new Set<AuditAction>([
  AuditAction.USER_CREATE,
  AuditAction.USER_UPDATE,
  AuditAction.USER_DELETE,
  AuditAction.DOC_CREATE,
  AuditAction.DOC_UPDATE,
  AuditAction.DOC_DELETE,
  AuditAction.WORKFLOW_SUBMIT,
  AuditAction.WORKFLOW_APPROVE,
  AuditAction.WORKFLOW_REJECT,
]);

export const auditLogger = (action: AuditAction, resourceType?: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const originalSend = res.json.bind(res);
    let statusCode = 200;

    res.json = (body: unknown) => {
      statusCode = res.statusCode;
      return originalSend(body);
    };

    res.on('finish', () => {
      const success = statusCode >= 200 && statusCode < 300;
      const details: Record<string, unknown> = {
        method: req.method,
        url: req.originalUrl,
        statusCode,
      };

      if (BODY_CAPTURE_ACTIONS.has(action) && req.body && typeof req.body === 'object') {
        details.requestBody = sanitizeForAudit(req.body as Record<string, unknown>);
      }

      void createAuditLog({
        userId: req.user?.userId,
        action,
        resourceType,
        resourceId: req.params['id'],
        ipAddress: req.ip ?? req.socket.remoteAddress ?? 'unknown',
        userAgent: req.headers['user-agent'],
        details,
        success,
      });
    });

    next();
  };
};
