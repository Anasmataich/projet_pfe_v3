import { FileText, Eye, Download, Clock, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Document } from '@/types/document.types';
import { cn } from '@/utils/helpers';

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
  document: Document;
  onDownload?: (id: string) => void;
}

export function DocumentCard({ document: doc, onDownload }: Props) {
  const navigate = useNavigate();

  return (
    <div
      className="card-hover p-5 flex flex-col gap-4 cursor-pointer group"
      onClick={() => navigate(`/documents/${doc.id}`)}
    >
      {/* Icon + title */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: 'rgba(37,99,235,0.15)' }}>
          <FileText className="h-5 w-5 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight truncate group-hover:text-blue-300 transition-colors">
            {doc.title}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{doc.category}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={STATUS_BADGE[doc.status] ?? 'badge-gray'}>
          {STATUS_LABEL[doc.status] ?? doc.status}
        </span>
        <span className={CONF_BADGE[doc.confidentialityLevel] ?? 'badge-gray'}>
          <Lock className="h-3 w-3" />
          {doc.confidentialityLevel}
        </span>
        {doc.version > 1 && (
          <span className="badge-purple">v{doc.version}</span>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2"
           style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(doc.createdAt), { addSuffix: true, locale: fr })}
        </span>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
            onClick={(e) => { e.stopPropagation(); navigate(`/documents/${doc.id}`); }}
            title="Voir"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          {onDownload && (
            <button
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
              onClick={(e) => { e.stopPropagation(); onDownload(doc.id); }}
              title="Télécharger"
            >
              <Download className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
