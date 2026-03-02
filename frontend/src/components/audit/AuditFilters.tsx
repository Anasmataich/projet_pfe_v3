import { useState } from 'react';
import { Filter } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type { AuditFilters as AuditFiltersType } from '@/types/audit.types';

interface AuditFiltersProps {
  onApply: (filters: AuditFiltersType) => void;
}

const ACTIONS = [
  'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'MFA_VERIFIED',
  'DOC_CREATE', 'DOC_UPDATE', 'DOC_DELETE', 'DOC_UPLOAD', 'DOC_DOWNLOAD',
  'WORKFLOW_SUBMIT', 'WORKFLOW_APPROVE', 'WORKFLOW_REJECT',
  'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
];

export function AuditFilters({ onApply }: AuditFiltersProps) {
  const [action, setAction] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handleApply = () => {
    onApply({
      action: action || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: 1,
    });
  };

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Action</label>
          <select className="select w-48" value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Toutes</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Du</label>
          <input type="date" className="input w-40" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">Au</label>
          <input type="date" className="input w-40" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <Button variant="secondary" size="sm" onClick={handleApply}>
          <Filter className="h-4 w-4" /> Filtrer
        </Button>
      </div>
    </div>
  );
}
