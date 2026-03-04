import { useCallback, useEffect } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import type { DocumentFilters } from '@/types/document.types';

export function useDocuments(autoFetch = true) {
  const {
    documents,
    total,
    filters,
    isLoading,
    error,
    setFilters,
    fetchDocuments,
    resetFilters,
  } = useDocumentStore();

  useEffect(() => {
    if (autoFetch) fetchDocuments();
  }, [autoFetch, fetchDocuments]);

  // ✅ Search always resets page
  const search = useCallback(
    (searchTerm: string) => setFilters({ search: searchTerm, page: 1 }),
    [setFilters]
  );

  // ✅ Pagination
  const changePage = useCallback(
    (page: number) => setFilters({ page }),
    [setFilters]
  );

  // ✅ Apply filters:
  // - If caller passes page => keep it
  // - else => reset to 1
  const applyFilters = useCallback(
    (f: Partial<DocumentFilters>) => {
      const next = { ...f };
      if (next.page === undefined) next.page = 1;
      setFilters(next);
    },
    [setFilters]
  );

  // ✅ Optional helpers (useful in UI)
  const setLimit = useCallback(
    (limit: number) => setFilters({ limit, page: 1 }),
    [setFilters]
  );

  // If your DocumentFilters has "sortBy"/"sortOrder" you can enable this:
  // const setSort = useCallback(
  //   (sortBy: string, sortOrder: 'asc' | 'desc' = 'desc') =>
  //     setFilters({ sortBy, sortOrder, page: 1 } as any),
  //   [setFilters]
  // );

  return {
    documents,
    total,
    filters,
    isLoading,
    error,
    search,
    changePage,
    applyFilters,
    setLimit,
    resetFilters,
    refresh: fetchDocuments,
  };
}