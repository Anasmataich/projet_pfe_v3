import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Lock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Document } from '@/types/document.types';

const STATUS_BADGE: Record<string, string> = {
  APPROUVE: 'badge-green',
  EN_ATTENTE: 'badge-amber',
  REJETE: 'badge-red',
  BROUILLON: 'badge-gray',
  ARCHIVE: 'badge-purple',
};
const STATUS_LABEL: Record<string, string> = {
  APPROUVE: 'Approuvé',
  EN_ATTENTE: 'En attente',
  REJETE: 'Rejeté',
  BROUILLON: 'Brouillon',
  ARCHIVE: 'Archivé',
};
const CONF_BADGE: Record<string, string> = {
  PUBLIC: 'badge-green',
  INTERNE: 'badge-blue',
  CONFIDENTIEL: 'badge-amber',
  SECRET: 'badge-red',
};

interface Props {
  documents: Document[];
  isLoading: boolean;
}

type SortKey = 'title' | 'category' | 'confidentialityLevel' | 'version' | 'status' | 'createdAt';
type SortDir = 'asc' | 'desc';

function TableSkeleton() {
  return (
    <div className="p-5">
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-xl animate-pulse"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function DocumentTable({ documents, isLoading }: Props) {
  const navigate = useNavigate();

  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const sorted = useMemo(() => {
    const arr = [...documents];

    const get = (d: Document) => {
      switch (sortKey) {
        case 'title':
          return (d.title ?? '').toLowerCase();
        case 'category':
          return String((d as any).category ?? '').toLowerCase();
        case 'confidentialityLevel':
          return String((d as any).confidentialityLevel ?? '').toLowerCase();
        case 'version':
          return Number((d as any).version ?? 0);
        case 'status':
          return String((d as any).status ?? '').toLowerCase();
        case 'createdAt':
        default: {
          const t = (d as any).createdAt;
          const ms = t ? new Date(t).getTime() : 0;
          return Number.isFinite(ms) ? ms : 0;
        }
      }
    };

    arr.sort((a, b) => {
      const va = get(a);
      const vb = get(b);

      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });

    return arr;
  }, [documents, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  if (isLoading) return <TableSkeleton />;

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div
          className="h-14 w-14 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(37,99,235,0.10)' }}
        >
          <FileText className="h-7 w-7 text-slate-600" />
        </div>
        <p className="text-slate-500 text-sm">Aucun document trouvé</p>
      </div>
    );
  }

  return (
    <table className="table-base">
      <thead>
        <tr>
          <th>
            <button onClick={() => toggleSort('title')} className="flex items-center gap-1.5 hover:text-white transition">
              Titre <SortIcon k="title" />
            </button>
          </th>
          <th>
            <button onClick={() => toggleSort('category')} className="flex items-center gap-1.5 hover:text-white transition">
              Catégorie <SortIcon k="category" />
            </button>
          </th>
          <th>
            <button
              onClick={() => toggleSort('confidentialityLevel')}
              className="flex items-center gap-1.5 hover:text-white transition"
            >
              Confidentialité <SortIcon k="confidentialityLevel" />
            </button>
          </th>
          <th>
            <button onClick={() => toggleSort('version')} className="flex items-center gap-1.5 hover:text-white transition">
              Version <SortIcon k="version" />
            </button>
          </th>
          <th>
            <button onClick={() => toggleSort('status')} className="flex items-center gap-1.5 hover:text-white transition">
              Statut <SortIcon k="status" />
            </button>
          </th>
          <th>
            <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1.5 hover:text-white transition">
              Date <SortIcon k="createdAt" />
            </button>
          </th>
          <th className="text-right">Actions</th>
        </tr>
      </thead>

      <tbody>
        {sorted.map((doc) => (
          <tr key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)} className="hover:bg-white/[0.03] transition">
            <td>
              <div className="flex items-center gap-3">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(37,99,235,0.12)' }}
                >
                  <FileText className="h-4 w-4 text-blue-400" />
                </div>
                <span className="font-medium text-white truncate max-w-[240px]">{doc.title}</span>
              </div>
            </td>

            <td>
              <span className="badge-gray">{(doc as any).category}</span>
            </td>

            <td>
              <span className={`${CONF_BADGE[(doc as any).confidentialityLevel] ?? 'badge-gray'} flex items-center gap-1`}>
                <Lock className="h-3 w-3" />
                {(doc as any).confidentialityLevel}
              </span>
            </td>

            <td>
              <span className="text-slate-400 text-xs font-mono">v{Number((doc as any).version ?? 0)}</span>
            </td>

            <td>
              <span className={STATUS_BADGE[(doc as any).status] ?? 'badge-gray'}>
                {STATUS_LABEL[(doc as any).status] ?? (doc as any).status}
              </span>
            </td>

            <td>
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(new Date((doc as any).createdAt), { addSuffix: true, locale: fr })}
              </span>
            </td>

            <td>
              <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  title="Voir"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}