import { create } from 'zustand';
import api, { type ApiResponse } from '@/services/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const { data } = await api.get<ApiResponse<Notification[]>>('/notifications');
      set({ notifications: data.data ?? [] });
    } catch { /* endpoint may not exist yet */ }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
      set({ unreadCount: data.data?.count ?? 0 });
    } catch { /* endpoint may not exist yet */ }
  },

  markAsRead: async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }));
    } catch { /* silent */ }
  },

  markAllRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch { /* silent */ }
  },
}));
