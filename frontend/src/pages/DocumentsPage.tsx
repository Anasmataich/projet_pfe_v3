import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Grid3X3, List, Upload, Filter, Search, X } from 'lucide-react';
import { Pagination } from '@/components/common/Pagination';
import { DocumentTable } from '@/components/documents/DocumentTable';
import { DocumentCard } from '@/components/documents/DocumentCard';
import { useDocuments } from '@/hooks/useDocuments';
import { usePermissions } from '@/hooks/usePermissions';
import { CATEGORY_LABELS, STATUS_LABELS, CONFIDENTIALITY_LABELS } from '@/utils/constants';
import type { DocumentCategory, DocumentStatus, ConfidentialityLevel } from '@/types/document.types';
import { cn } from '@/utils/helpers';

export function DocumentsPage() {
  const navigate = useNavigate();
  const { canUpload } = usePermissions();
  const { documents, total, filters, isLoading, search, changePage, applyFilters, resetFilters } = useDocuments();
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState(filters.search ?? '');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    search(e.target.value);
  };

  return (
    <div className="space-y-5 animate-fade-in">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-sub">{total.toLocaleString()} document(s) au total</p>
        </div>
        {canUpload && (
          <button onClick={() => navigate('/upload')} className="btn-primary self-start">
            <Upload className="h-4 w-4" /> Uploader
          </button>
        )}
      </div>

      {/* ── TOOLBAR ── */}
      <div className="card p-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={searchValue}
              onChange={handleSearch}
              placeholder="Rechercher par titre, catégorie…"
              className="input pl-9 h-9"
            />
            {searchValue && (
              <button onClick={() => { setSearchValue(''); search(''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn('btn-secondary h-9 px-3 text-xs', showFilters && 'border-blue-500/50 text-blue-300')}
            >
              <Filter className="h-3.5 w-3.5" /> Filtres
            </button>

            {/* View toggle */}
            <div className="flex rounded-xl overflow-hidden"
                 style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
              <button
                onClick={() => setViewMode('table')}
                className={cn('flex h-9 w-9 items-center justify-center transition-colors',
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200')}
              >
                <List className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn('flex h-9 w-9 items-center justify-center transition-colors',
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200')}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ── FILTERS PANEL ── */}
        {showFilters && (
          <div className="mt-3 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in"
               style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div>
              <label className="label">Catégorie</label>
              <select
                className="select"
                value={filters.category ?? ''}
                onChange={(e) => applyFilters({ category: (e.target.value as DocumentCategory) || undefined })}
              >
                <option value="">Toutes</option>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Statut</label>
              <select
                className="select"
                value={filters.status ?? ''}
                onChange={(e) => applyFilters({ status: (e.target.value as DocumentStatus) || undefined })}
              >
                <option value="">Tous</option>
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Confidentialité</label>
              <select
                className="select"
                value={filters.confidentialityLevel ?? ''}
                onChange={(e) => applyFilters({ confidentialityLevel: (e.target.value as ConfidentialityLevel) || undefined })}
              >
                <option value="">Tous niveaux</option>
                {Object.entries(CONFIDENTIALITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <button onClick={resetFilters} className="btn-ghost text-xs px-3 py-2">
                <X className="h-3.5 w-3.5" /> Réinitialiser
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── CONTENT ── */}
      {viewMode === 'table' ? (
        <div className="table-wrapper animate-fade-in">
          <DocumentTable documents={documents} isLoading={isLoading} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-in">
          {documents.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}

      {/* ── PAGINATION ── */}
      {total > (filters.limit ?? 20) && (
        <div className="flex justify-center">
          <Pagination
            page={filters.page ?? 1}
            total={total}
            limit={filters.limit ?? 20}
            onPageChange={changePage}
          />
        </div>
      )}
    </div>
  );
}
