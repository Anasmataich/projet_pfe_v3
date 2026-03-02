// ApiResponse.ts - modèle de réponse API standardisée (réponses uniformes)

import { Response } from 'express';
import { HttpStatus } from './enums';

// ─────────────────────────────────────────────
// Interfaces des réponses
// ─────────────────────────────────────────────

export interface ApiResponsePayload<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: ResponseMeta;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface ResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/** Alias pour la pagination (utilisé par les services) */
export type PaginationMeta = ResponseMeta & { page: number; limit: number; total: number; totalPages: number };

/**
 * Construit l'objet meta de pagination pour les réponses de services
 */
export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

// ─────────────────────────────────────────────
// Classe ApiResponse — réponses uniformes
// ─────────────────────────────────────────────

export class ApiResponse {
  /**
   * Réponse succès standard (200 OK)
   */
  static success<T>(
    res: Response,
    data?: T,
    message = 'Opération réussie',
    statusCode = HttpStatus.OK
  ): void {
    const payload: ApiResponsePayload<T> = {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(payload);
  }

  /**
   * Réponse création (201 Created)
   */
  static created<T>(res: Response, data?: T, message = 'Ressource créée avec succès'): void {
    ApiResponse.success(res, data, message, HttpStatus.CREATED);
  }

  /**
   * Réponse succès sans contenu (204 No Content)
   */
  static noContent(res: Response): void {
    res.status(HttpStatus.NO_CONTENT).send();
  }

  /**
   * Réponse paginée
   */
  static paginated<T>(
    res: Response,
    data: T[],
    meta: {
      page: number;
      limit: number;
      total: number;
    },
    message = 'Données récupérées avec succès'
  ): void {
    const totalPages = Math.ceil(meta.total / meta.limit) || 1;
    const payload: ApiResponsePayload<T[]> = {
      success: true,
      message,
      data,
      meta: {
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages,
        hasNext: meta.page < totalPages,
        hasPrev: meta.page > 1,
      },
      timestamp: new Date().toISOString(),
    };
    res.status(HttpStatus.OK).json(payload);
  }

  /**
   * Réponse erreur (format uniforme)
   */
  static error(
    res: Response,
    message: string,
    statusCode = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: unknown,
    code?: string
  ): void {
    const payload: ApiResponsePayload = {
      success: false,
      error: {
        message,
        code: code ?? `HTTP_${statusCode}`,
        details,
      },
      timestamp: new Date().toISOString(),
    };
    res.status(statusCode).json(payload);
  }

  /**
   * Réponse service indisponible (503)
   */
  static serviceUnavailable(
    res: Response,
    message = 'Service temporairement indisponible',
    details?: unknown
  ): void {
    ApiResponse.error(res, message, HttpStatus.SERVICE_UNAVAILABLE, details, 'SERVICE_UNAVAILABLE');
  }
}
