// audit.model.ts - modèle pour les journaux d'audit

import type { AuditAction } from '../../shared/enums';

// ─────────────────────────────────────────────
// Interface
// ─────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: AuditAction;
  resourceType: string | null;
  resourceId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  details: Record<string, unknown>;
  success: boolean;
  createdAt: Date;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  success?: boolean;
  from?: Date;
  to?: Date;
}

// ─────────────────────────────────────────────
// Mapping
// ─────────────────────────────────────────────

export function mapRowToAuditLog(row: Record<string, unknown>): AuditLogEntry {
  return {
    id: row['id'] as string,
    userId: (row['user_id'] as string | null) ?? null,
    action: row['action'] as AuditAction,
    resourceType: (row['resource_type'] as string | null) ?? null,
    resourceId: (row['resource_id'] as string | null) ?? null,
    ipAddress: (row['ip_address'] as string | null) ?? null,
    userAgent: (row['user_agent'] as string | null) ?? null,
    details: (row['details'] as Record<string, unknown>) ?? {},
    success: row['success'] as boolean,
    createdAt: new Date(row['created_at'] as string),
  };
}
