import { useEffect, useState } from 'react';
import { Shield, Download } from 'lucide-react';
import { AuditFilters } from '@/components/audit/AuditFilters';
import { AuditLogTable } from '@/components/audit/AuditLogTable';
import { Pagination } from '@/components/common/Pagination';
import { useAudit } from '@/hooks/useAudit';
import type { AuditFilters as AuditFiltersType } from '@/types/audit.types';

export function AuditLogsPage() {
  const { logs, total, isLoading, fetchLogs } = useAudit();
  const [filters, setFilters] = useState<AuditFiltersType>({ page: 1, limit: 25 });

  useEffect(() => { fetchLogs(filters); }, [fetchLogs, filters]);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                 style={{ background: 'rgba(239,68,68,0.15)' }}>
              <Shield className="h-4.5 w-4.5 text-rose-400" />
            </div>
            Journal d'audit
          </h1>
          <p className="page-sub mt-1">
            Traçabilité complète des actions — {total.toLocaleString()} entrées
          </p>
        </div>
        <button className="btn-secondary self-start text-xs">
          <Download className="h-3.5 w-3.5" /> Exporter CSV
        </button>
      </div>

      <AuditFilters onApply={(f) => setFilters({ ...filters, ...f })} />

      <div className="table-wrapper">
        <AuditLogTable logs={logs} isLoading={isLoading} />
      </div>

      {total > (filters.limit ?? 25) && (
        <div className="flex justify-center">
          <Pagination
            page={filters.page ?? 1}
            total={total}
            limit={filters.limit ?? 25}
            onPageChange={(p) => setFilters({ ...filters, page: p })}
          />
        </div>
      )}
    </div>
  );
}
