import api, { type ApiResponse } from './api';
import type { Document, DocumentVersion, DocumentFilters, DocumentUpdateInput } from '@/types/document.types';
import { buildQueryString } from '@/utils/helpers';

export const documentService = {
  list: (filters: DocumentFilters = {}) =>
    api.get<ApiResponse<Document[]>>(`/documents${buildQueryString(filters)}`).then((r) => ({
      data: r.data.data ?? [],
      total: r.data.meta?.total ?? 0,
    })),

  getById: (id: string) =>
    api.get<ApiResponse<Document>>(`/documents/${id}`).then((r) => r.data.data!),

  upload: (formData: FormData) =>
    api.post<ApiResponse<Document>>('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120_000,
    }).then((r) => r.data.data!),

  update: (id: string, data: DocumentUpdateInput) =>
    api.patch<ApiResponse<Document>>(`/documents/${id}`, data).then((r) => r.data.data!),

  remove: (id: string) =>
    api.delete(`/documents/${id}`),

  getVersions: (id: string) =>
    api.get<ApiResponse<DocumentVersion[]>>(`/documents/${id}/versions`).then((r) => r.data.data ?? []),

  getDownloadUrl: (id: string) =>
    api.get<ApiResponse<{ url: string }>>(`/documents/${id}/download-url`).then((r) => r.data.data!.url),
};
