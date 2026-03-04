import api, { type ApiResponse } from './api';
import type { Document, DocumentVersion, DocumentFilters, DocumentUpdateInput } from '@/types/document.types';
import { buildQueryString } from '@/utils/helpers';

type ListResult = Promise<{ data: Document[]; total: number }>;

export const documentService = {
  // ✅ signal optional without breaking axios typings
  list: (filters: DocumentFilters = {}, signal?: AbortSignal): ListResult =>
    api
      .get<ApiResponse<Document[]>>(
        `/documents${buildQueryString(filters)}`,
        signal ? ({ signal } as any) : undefined
      )
      .then((r) => ({
        data: r.data.data ?? [],
        total: r.data.meta?.total ?? 0,
      })),

  getById: (id: string, signal?: AbortSignal) =>
    api
      .get<ApiResponse<Document>>(`/documents/${id}`, signal ? ({ signal } as any) : undefined)
      .then((r) => r.data.data!),

  upload: (formData: FormData, signal?: AbortSignal) =>
    api
      .post<ApiResponse<Document>>(
        '/documents',
        formData,
        ({
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120_000,
          ...(signal ? { signal } : {}),
        } as any)
      )
      .then((r) => r.data.data!),

  update: (id: string, data: DocumentUpdateInput, signal?: AbortSignal) =>
    api
      .patch<ApiResponse<Document>>(`/documents/${id}`, data, signal ? ({ signal } as any) : undefined)
      .then((r) => r.data.data!),

  remove: (id: string, signal?: AbortSignal) =>
    api.delete(`/documents/${id}`, signal ? ({ signal } as any) : undefined),

  getVersions: (id: string, signal?: AbortSignal) =>
    api
      .get<ApiResponse<DocumentVersion[]>>(`/documents/${id}/versions`, signal ? ({ signal } as any) : undefined)
      .then((r) => r.data.data ?? []),

  getDownloadUrl: (id: string, signal?: AbortSignal) =>
    api
      .get<ApiResponse<{ url: string }>>(`/documents/${id}/download-url`, signal ? ({ signal } as any) : undefined)
      .then((r) => r.data.data!.url),
};