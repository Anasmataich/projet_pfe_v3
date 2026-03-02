// audit.service.ts - service de gestion des journaux d'audit

import db from '../../config/database';
import { AppError } from '../../shared/AppError';
import { AuditAction } from '../../shared/enums';
import { buildPagination, PaginationMeta } from '../../shared/ApiResponse';
import { type AuditLogEntry, type AuditLogFilters, mapRowToAuditLog } from './audit.model';

export type { AuditLogEntry };

// ─────────────────────────────────────────────
// Service d'audit
// ─────────────────────────────────────────────

export const auditService = {
  /**
   * Liste les logs d'audit avec pagination et filtres
   */
  findAll: async (
    page: number,
    limit: number,
    filters: AuditLogFilters & { action?: AuditAction; dateFrom?: string; dateTo?: string }
  ): Promise<{ logs: AuditLogEntry[]; pagination: PaginationMeta }> => {
    const offset = (page - 1) * limit;
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${idx++}`);
      params.push(filters.userId);
    }
    if (filters.action) {
      conditions.push(`action = $${idx++}`);
      params.push(filters.action);
    }
    if (filters.resourceType) {
      conditions.push(`resource_type = $${idx++}`);
      params.push(filters.resourceType);
    }
    if (filters.resourceId) {
      conditions.push(`resource_id = $${idx++}`);
      params.push(filters.resourceId);
    }
    if (filters.success !== undefined) {
      conditions.push(`success = $${idx++}`);
      params.push(filters.success);
    }
    if (filters.from) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(filters.from);
    }
    if (filters.to) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(filters.to);
    }
    // Support legacy dateFrom / dateTo string filters
    const filtersAny = filters as Record<string, unknown>;
    if (filtersAny['dateFrom'] && !filters.from) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(filtersAny['dateFrom']);
    }
    if (filtersAny['dateTo'] && !filters.to) {
      conditions.push(`created_at <= $${idx++}`);
      params.push(filtersAny['dateTo']);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, result] = await Promise.all([
      db.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM audit_logs ${where}`,
        params
      ),
      db.query(
        `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
    ]);

    const total = parseInt(countResult.rows[0]?.count ?? '0', 10);

    return {
      logs: result.rows.map((r) => mapRowToAuditLog(r as Record<string, unknown>)),
      pagination: buildPagination(page, limit, total),
    };
  },

  /**
   * Récupère un log d'audit par ID
   */
  findById: async (id: string): Promise<AuditLogEntry> => {
    const result = await db.query('SELECT * FROM audit_logs WHERE id = $1', [id]);
    if (!result.rows[0]) throw AppError.notFound('Log d\'audit');
    return mapRowToAuditLog(result.rows[0] as Record<string, unknown>);
  },

  /**
   * Statistiques d'audit — résumé par action
   */
  getSummary: async (
    from: Date,
    to: Date
  ): Promise<{ action: string; total: number; failed: number }[]> => {
    const result = await db.query(
      `SELECT action,
              COUNT(*) AS total,
              COUNT(*) FILTER (WHERE success = FALSE) AS failed
       FROM audit_logs
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY action
       ORDER BY total DESC`,
      [from, to]
    );
    return result.rows.map((r) => ({
      action: r['action'] as string,
      total: parseInt(r['total'] as string, 10),
      failed: parseInt(r['failed'] as string, 10),
    }));
  },
};

export default auditService;
