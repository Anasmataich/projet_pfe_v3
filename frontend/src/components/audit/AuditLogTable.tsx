import { Table, type Column } from '@/components/common/Table';
import { Badge } from '@/components/common/Badge';
import { formatDateTime } from '@/utils/formatters';
import type { AuditLog } from '@/types/audit.types';

interface AuditLogTableProps {
  logs: AuditLog[];
  isLoading: boolean;
}

export function AuditLogTable({ logs, isLoading }: AuditLogTableProps) {
  const columns: Column<AuditLog>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (log) => <span className="text-xs whitespace-nowrap">{formatDateTime(log.createdAt)}</span>,
    },
    {
      key: 'user',
      header: 'Utilisateur',
      render: (log) => <span className="text-xs">{log.userName ?? log.userId ?? '—'}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (log) => <Badge variant={log.action.includes('DELETE') || log.action.includes('FAIL') ? 'danger' : 'info'}>{log.action}</Badge>,
    },
    {
      key: 'resource',
      header: 'Ressource',
      render: (log) => (
        <span className="text-xs text-slate-500">
          {log.resourceType ?? '—'} {log.resourceId ? `(${log.resourceId.slice(0, 8)}…)` : ''}
        </span>
      ),
    },
    {
      key: 'ip',
      header: 'IP',
      render: (log) => <span className="text-xs font-mono text-slate-500">{log.ipAddress}</span>,
    },
    {
      key: 'status',
      header: 'Statut',
      render: (log) => (
        <Badge variant={log.success ? 'success' : 'danger'}>
          {log.success ? 'Succès' : 'Échec'}
        </Badge>
      ),
    },
  ];

  return <Table columns={columns} data={logs} isLoading={isLoading} rowKey={(l) => l.id} emptyMessage="Aucun log d'audit" />;
}
