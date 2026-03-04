import { create } from 'zustand';
import type { Document, DocumentFilters } from '@/types/document.types';
import { documentService } from '@/services/documentService';

interface CacheEntry {
  data: Document[];
  total: number;
  ts: number;
}

interface DocumentState {
  documents: Document[];
  total: number;
  filters: DocumentFilters;
  isLoading: boolean;
  error: string | null;

  // internal
  _abort?: AbortController;
  _debounceTimer?: number;
  _cache: Record<string, CacheEntry>;

  setFilters: (filters: Partial<DocumentFilters>) => void;
  fetchDocuments: (force?: boolean) => Promise<void>;
  resetFilters: () => void;
}

const defaultFilters: DocumentFilters = { page: 1, limit: 20 };

function stableKey(filters: DocumentFilters) {
  // remove undefined to keep keys stable
  const clean: any = {};
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') clean[k] = v;
  });
  return JSON.stringify(clean);
}

const CACHE_TTL_MS = 20_000; // 20s (adjust as you want)
const DEBOUNCE_MS = 150;

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  total: 0,
  filters: { ...defaultFilters },
  isLoading: false,
  error: null,

  _abort: undefined,
  _debounceTimer: undefined,
  _cache: {},

  setFilters: (newFilters) => {
    // 1) Update filters
    set((s) => ({ filters: { ...s.filters, ...newFilters } }));

    // 2) Debounce fetch (prevents request spam)
    const current = get();
    if (current._debounceTimer) window.clearTimeout(current._debounceTimer);

    const timer = window.setTimeout(() => {
      get().fetchDocuments(false);
    }, DEBOUNCE_MS);

    set({ _debounceTimer: timer });
  },

  fetchDocuments: async (force = false) => {
    const { filters, _cache } = get();
    const key = stableKey(filters);
    const now = Date.now();

    // ✅ Serve from cache if fresh (unless force)
    const cached = _cache[key];
    if (!force && cached && now - cached.ts < CACHE_TTL_MS) {
      set({ documents: cached.data, total: cached.total, isLoading: false, error: null });
      return;
    }

    // ✅ Abort previous request
    const prev = get()._abort;
    if (prev) prev.abort();

    const abort = new AbortController();
    set({ isLoading: true, error: null, _abort: abort });

    try {
      // If your documentService.list supports signal, pass it.
      // If not, keep it as is; abort will only prevent state update in catch block checks below.
      const res = await documentService.list(filters as any /*, { signal: abort.signal }*/);

      // If aborted, ignore
      if (abort.signal.aborted) return;

      const { data, total } = res;

      set((s) => ({
        documents: data,
        total,
        isLoading: false,
        error: null,
        _cache: {
          ...s._cache,
          [key]: { data, total, ts: now },
        },
      }));
    } catch (err) {
      // If aborted, ignore errors
      if (abort.signal.aborted) return;

      set({ error: (err as Error).message, isLoading: false });
    }
  },

  resetFilters: () => {
    // reset + fetch (force to avoid old cache)
    set({ filters: { ...defaultFilters } });
    get().fetchDocuments(true);
  },
}));