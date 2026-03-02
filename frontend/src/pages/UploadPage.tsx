// ─── UploadPage.tsx ──────────────────────────────────────────────────────────
import { Upload } from 'lucide-react';
import { UploadForm } from '@/components/documents/UploadForm';

export function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      <div className="mb-6">
        <h1 className="page-title flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center"
               style={{ background: 'rgba(37,99,235,0.20)' }}>
            <Upload className="h-4.5 w-4.5 text-blue-400" />
          </div>
          Uploader un document
        </h1>
        <p className="page-sub mt-2">Ajoutez un nouveau document sécurisé à la plateforme</p>
      </div>
      <div className="card p-6">
        <UploadForm />
      </div>
    </div>
  );
}
