import axios from 'axios';
import { API_URL } from '@/utils/constants';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Envoie automatiquement les cookies HttpOnly
});

// Plus besoin d'intercepteur request pour injecter le token —
// le cookie HttpOnly est envoyé automatiquement par le navigateur.

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Si 401 (token expiré) et pas encore retenté → refresh via cookie
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        // Le refresh_token est envoyé automatiquement via le cookie
        await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        // Les nouveaux tokens sont automatiquement définis dans les cookies par le backend
        return api(original);
      } catch {
        // Refresh échoué → rediriger vers login
        window.location.href = '/login';
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
