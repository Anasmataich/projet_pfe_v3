export interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress: string;
  userAgent?: string;
  details: Record<string, unknown>;
  success: boolean;
  createdAt: string;
}

export interface AuditFilters {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  success?: boolean;
}

export interface AuditSummary {
  action: string;
  total: number;
  failed: number;
}
