import { useCallback, useEffect } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import type { DocumentFilters } from '@/types/document.types';

export function useDocuments(autoFetch = true) {
  const { documents, total, filters, isLoading, error, setFilters, fetchDocuments, resetFilters } = useDocumentStore();

  useEffect(() => {
    if (autoFetch) fetchDocuments();
  }, [autoFetch, fetchDocuments]);

  const search = useCallback((searchTerm: string) => setFilters({ search: searchTerm, page: 1 }), [setFilters]);
  const changePage = useCallback((page: number) => setFilters({ page }), [setFilters]);
  const applyFilters = useCallback((f: Partial<DocumentFilters>) => setFilters({ ...f, page: 1 }), [setFilters]);

  return { documents, total, filters, isLoading, error, search, changePage, applyFilters, resetFilters, refresh: fetchDocuments };
}
