import { useState, useCallback } from 'react';
import type { AuditLog, AuditFilters } from '@/types/audit.types';
import { auditService } from '@/services/auditService';

export function useAudit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = useCallback(async (filters: AuditFilters = {}) => {
    setIsLoading(true);
    try {
      const result = await auditService.list(filters);
      setLogs(result.data);
      setTotal(result.total);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { logs, total, isLoading, fetchLogs };
}
