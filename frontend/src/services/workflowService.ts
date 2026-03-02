import api, { type ApiResponse } from './api';
import type { WorkflowInstance } from '@/types/workflow.types';

export const workflowService = {
  getStatus: (documentId: string) =>
    api.get<ApiResponse<WorkflowInstance>>(`/workflow/${documentId}`).then((r) => r.data.data!),

  submit: (documentId: string) =>
    api.post<ApiResponse<WorkflowInstance>>(`/workflow/${documentId}/submit`).then((r) => r.data.data!),

  approve: (documentId: string) =>
    api.post<ApiResponse<WorkflowInstance>>(`/workflow/${documentId}/approve`).then((r) => r.data.data!),

  reject: (documentId: string, reason: string) =>
    api.post<ApiResponse<WorkflowInstance>>(`/workflow/${documentId}/reject`, { reason }).then((r) => r.data.data!),
};
