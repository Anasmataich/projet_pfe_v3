import axios, { type AxiosError, type AxiosInstance, type AxiosResponse } from 'axios';
import { API_URL } from '@/utils/constants';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,            // ✅ لازم تكون "/api/v1"
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,       // ✅ cookies HttpOnly
});

// منع تكرار refresh requests
let isRefreshing = false;
let refreshPromise: Promise<void> | null = null;

function isAuthEndpoint(url?: string) {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/me') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/verify-mfa') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password')
  );
}

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const original: any = error.config;

    const status = error.response?.status;
    const url = original?.url as string | undefined;

    // إذا request ما عندوش config ولا status → رجع error عادي
    if (!original || !status) return Promise.reject(error);

    // ✅ لا تعمل refresh على auth endpoints (لتفادي loop)
    if (isAuthEndpoint(url)) {
      return Promise.reject(error);
    }

    // ✅ فقط 401 نحاول refresh مرة واحدة
    if (status === 401 && !original._retry) {
      original._retry = true;

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = api.post('/auth/refresh', {}).then(() => undefined);
        }

        // استنى refresh (سواء كان أنت اللي بدأته أو واحد آخر)
        await refreshPromise;

        // رجّع flags
        isRefreshing = false;
        refreshPromise = null;

        // عاود نفس الطلب
        return api(original);
      } catch {
        isRefreshing = false;
        refreshPromise = null;

        // ✅ فشل refresh → رجع login
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: ResponseMeta;
  timestamp: string;
}

export default api;