import api, { type ApiResponse } from './api';
import type { AuditLog, AuditFilters, AuditSummary } from '@/types/audit.types';
import { buildQueryString } from '@/utils/helpers';

export const auditService = {
  list: (filters: AuditFilters = {}) =>
    api.get<ApiResponse<AuditLog[]>>(`/audit${buildQueryString(filters)}`).then((r) => ({
      data: r.data.data ?? [],
      total: r.data.meta?.total ?? 0,
    })),

  getSummary: (from: string, to: string) =>
    api.get<ApiResponse<{ from: string; to: string; summary: AuditSummary[] }>>(`/audit/summary?from=${from}&to=${to}`)
      .then((r) => r.data.data?.summary ?? []),
};
