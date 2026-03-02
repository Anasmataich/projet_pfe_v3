import { useState, useEffect } from 'react';
import { Download, Eye, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/common/Badge';
import { Spinner } from '@/components/common/Spinner';
import { formatDate, formatFileSize } from '@/utils/formatters';
import { CATEGORY_LABELS, STATUS_COLORS, CONFIDENTIALITY_COLORS, CONFIDENTIALITY_LABELS, STATUS_LABELS } from '@/utils/constants';
import { documentService } from '@/services/documentService';
import type { Document } from '@/types/document.types';
import toast from 'react-hot-toast';

interface DocumentViewerProps {
  document: Document;
}

export function DocumentViewer({ document: doc }: DocumentViewerProps) {
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);

  useEffect(() => {
    setDownloadUrl(null);
  }, [doc.id]);

  const handleDownload = async () => {
    setLoadingUrl(true);
    try {
      const url = await documentService.getDownloadUrl(doc.id);
      setDownloadUrl(url);
      window.open(url, '_blank');
    } catch {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setLoadingUrl(false);
    }
  };

  const isPdf = doc.mimeType === 'application/pdf';
  const isImage = doc.mimeType.startsWith('image/');

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-white">{doc.title}</h2>
          <p className="text-sm text-slate-500 mt-1">{doc.fileName}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {downloadUrl && (isPdf || isImage) && (
            <button className="btn-secondary text-xs px-3 py-1.5 rounded-lg" onClick={() => window.open(downloadUrl, '_blank')}>
              <Eye className="h-4 w-4" /> Prévisualiser
            </button>
          )}
          <button className="btn-primary text-xs px-3 py-1.5 rounded-lg" onClick={handleDownload} disabled={loadingUrl}>
            <Download className="h-4 w-4" /> {loadingUrl ? 'Chargement…' : 'Télécharger'}
          </button>
        </div>
      </div>

      {downloadUrl && isPdf && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <iframe src={downloadUrl} className="w-full h-[500px]" title="Aperçu du document" />
        </div>
      )}
      {downloadUrl && isImage && (
        <div className="rounded-xl overflow-hidden flex items-center justify-center p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <img src={downloadUrl} alt={doc.title} className="max-w-full max-h-[500px] object-contain" />
        </div>
      )}
      {!downloadUrl && !loadingUrl && (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl" style={{ border: '2px dashed rgba(255,255,255,0.10)' }}>
          <ExternalLink className="h-10 w-10 text-slate-600 mb-3" />
          <p className="text-sm text-slate-500">Cliquez sur "Télécharger" pour accéder au document</p>
        </div>
      )}
      {loadingUrl && (
        <div className="flex justify-center py-8"><Spinner size="lg" className="text-blue-400" /></div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <InfoItem label="Catégorie" value={CATEGORY_LABELS[doc.category]} />
        <InfoItem label="Statut">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[doc.status]}`}>
            {STATUS_LABELS[doc.status]}
          </span>
        </InfoItem>
        <InfoItem label="Confidentialité">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${CONFIDENTIALITY_COLORS[doc.confidentialityLevel]}`}>
            {CONFIDENTIALITY_LABELS[doc.confidentialityLevel]}
          </span>
        </InfoItem>
        <InfoItem label="Taille" value={formatFileSize(doc.fileSize)} />
        <InfoItem label="Version" value={`v${doc.currentVersion}`} />
        <InfoItem label="Créé le" value={formatDate(doc.createdAt)} />
      </div>

      {doc.description && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Description</h3>
          <p className="text-sm text-slate-400 whitespace-pre-wrap">{doc.description}</p>
        </div>
      )}

      {doc.tags.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-300 mb-2">Tags</h3>
          <div className="flex flex-wrap gap-1.5">
            {doc.tags.map((t) => <Badge key={t} variant="info">{t}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      {children ?? <p className="text-sm font-medium text-white">{value}</p>}
    </div>
  );
}
