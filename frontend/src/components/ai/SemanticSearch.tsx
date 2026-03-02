import { useState, type FormEvent } from 'react';
import { Search, FileText, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/common/Spinner';
import { aiService, type SearchResultItem } from '@/services/aiService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const data = await aiService.search(query, [], 10);
      setResults(data?.results ?? []);
    } catch {
      toast.error('Erreur lors de la recherche sémantique');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400" />
          <input
            type="text"
            className="input pl-10"
            placeholder="Recherche intelligente par sens… ex: 'contrats de construction signés en 2024'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-primary" disabled={isSearching}>
          <Search className="h-4 w-4" /> Rechercher
        </button>
      </form>

      {isSearching && (
        <div className="flex flex-col items-center py-12">
          <Spinner size="lg" className="text-blue-400" />
          <p className="text-sm text-slate-500 mt-3">Analyse sémantique en cours…</p>
        </div>
      )}

      {!isSearching && hasSearched && results.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 mx-auto text-slate-600 mb-3" />
          <p className="text-sm text-slate-500">Aucun résultat pour cette recherche</p>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{results.length} résultat(s) trouvé(s)</p>
          {results.map((r, i) => (
            <div
              key={`${r.documentId}-${i}`}
              onClick={() => navigate(`/documents/${r.documentId}`)}
              className="card-hover p-4 cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl p-2" style={{ background: 'rgba(37,99,235,0.15)' }}>
                  <FileText className="h-4 w-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">{r.title}</p>
                    <span className="shrink-0 badge-cyan">
                      {(r.score * 100).toFixed(0)}% pertinence
                    </span>
                  </div>
                  {r.snippet && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.snippet}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
