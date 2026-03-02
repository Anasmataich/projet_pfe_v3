import { create } from 'zustand';
import type { Document, DocumentFilters } from '@/types/document.types';
import { documentService } from '@/services/documentService';

interface DocumentState {
  documents: Document[];
  total: number;
  filters: DocumentFilters;
  isLoading: boolean;
  error: string | null;

  setFilters: (filters: Partial<DocumentFilters>) => void;
  fetchDocuments: () => Promise<void>;
  resetFilters: () => void;
}

const defaultFilters: DocumentFilters = { page: 1, limit: 20 };

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  total: 0,
  filters: { ...defaultFilters },
  isLoading: false,
  error: null,

  setFilters: (newFilters) => {
    set((s) => ({ filters: { ...s.filters, ...newFilters } }));
    get().fetchDocuments();
  },

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, total } = await documentService.list(get().filters);
      set({ documents: data, total, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  resetFilters: () => {
    set({ filters: { ...defaultFilters } });
    get().fetchDocuments();
  },
}));
