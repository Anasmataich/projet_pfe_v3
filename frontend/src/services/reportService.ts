import api, { type ApiResponse } from './api';
import type { User, UserFilters } from '@/types/user.types';
import { buildQueryString } from '@/utils/helpers';

export interface DashboardStats {
  totalDocuments: number;
  pendingWorkflows: number;
  totalUsers: number;
  documentsThisMonth: number;
  byCategory: { label: string; value: number }[];
  byStatus: { label: string; value: number }[];
  monthly: { label: string; value: number }[];
}

export const reportService = {
  getDashboardStats: async (): Promise<DashboardStats | null> => {
    try {
      const [docRes, userRes] = await Promise.all([
        api.get<ApiResponse<unknown[]>>('/documents?page=1&limit=1'),
        api.get<ApiResponse<unknown[]>>('/users?page=1&limit=1'),
      ]);
      const totalDocuments = docRes.data.meta?.total ?? 0;
      const totalUsers = userRes.data.meta?.total ?? 0;
      return {
        totalDocuments,
        totalUsers,
        pendingWorkflows: 0,
        documentsThisMonth: 0,
        byCategory: [],
        byStatus: [],
        monthly: [],
      };
    } catch {
      return null;
    }
  },

  getUsers: (filters: UserFilters = {}) =>
    api.get<ApiResponse<User[]>>(`/users${buildQueryString(filters)}`).then((r) => ({
      data: r.data.data ?? [],
      total: r.data.meta?.total ?? 0,
    })),

  createUser: (data: { email: string; password: string; role: string; firstName?: string; lastName?: string }) =>
    api.post<ApiResponse<User>>('/admin/users', data).then((r) => r.data.data!),

  updateUser: (id: string, data: Record<string, unknown>) =>
    api.patch<ApiResponse<User>>(`/users/${id}`, data).then((r) => r.data.data!),

  deleteUser: (id: string) =>
    api.delete(`/users/${id}`),
};
