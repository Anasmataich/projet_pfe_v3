import { useNavigate } from 'react-router-dom';
import { FileText, Eye, Download, Lock, ArrowUpDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Spinner } from '@/components/common/Spinner';
import type { Document } from '@/types/document.types';

const STATUS_BADGE: Record<string, string> = {
  APPROUVE:    'badge-green',
  EN_ATTENTE:  'badge-amber',
  REJETE:      'badge-red',
  BROUILLON:   'badge-gray',
  ARCHIVE:     'badge-purple',
};
const STATUS_LABEL: Record<string, string> = {
  APPROUVE:    'Approuvé',
  EN_ATTENTE:  'En attente',
  REJETE:      'Rejeté',
  BROUILLON:   'Brouillon',
  ARCHIVE:     'Archivé',
};
const CONF_BADGE: Record<string, string> = {
  PUBLIC:       'badge-green',
  INTERNE:      'badge-blue',
  CONFIDENTIEL: 'badge-amber',
  SECRET:       'badge-red',
};

interface Props {
  documents: Document[];
  isLoading: boolean;
}

export function DocumentTable({ documents, isLoading }: Props) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" className="text-blue-400" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="h-14 w-14 rounded-2xl flex items-center justify-center"
             style={{ background: 'rgba(37,99,235,0.10)' }}>
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
            <span className="flex items-center gap-1.5">
              Titre <ArrowUpDown className="h-3 w-3 opacity-40" />
            </span>
          </th>
          <th>Catégorie</th>
          <th>Confidentialité</th>
          <th>Version</th>
          <th>Statut</th>
          <th>Date</th>
          <th className="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {documents.map((doc) => (
          <tr key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)}>
            <td>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                     style={{ background: 'rgba(37,99,235,0.12)' }}>
                  <FileText className="h-4 w-4 text-blue-400" />
                </div>
                <span className="font-medium text-white truncate max-w-[220px]">{doc.title}</span>
              </div>
            </td>
            <td>
              <span className="badge-gray">{doc.category}</span>
            </td>
            <td>
              <span className={`${CONF_BADGE[doc.confidentialityLevel] ?? 'badge-gray'} flex items-center gap-1`}>
                <Lock className="h-3 w-3" />{doc.confidentialityLevel}
              </span>
            </td>
            <td>
              <span className="text-slate-400 text-xs font-mono">v{doc.version}</span>
            </td>
            <td>
              <span className={STATUS_BADGE[doc.status] ?? 'badge-gray'}>
                {STATUS_LABEL[doc.status] ?? doc.status}
              </span>
            </td>
            <td>
              <span className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: fr })}
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
