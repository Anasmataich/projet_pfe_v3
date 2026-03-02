// AppError.ts - classe d'erreur applicative centralisée

import { HttpStatus } from './enums';

// ─────────────────────────────────────────────
// Classe d'erreur applicative personnalisée
// ─────────────────────────────────────────────
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintenir la stack trace correcte
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // ─────────────────────────────────────────────
  // Factory methods pour erreurs courantes
  // ─────────────────────────────────────────────

  static badRequest(message: string, details?: unknown): AppError {
    return new AppError(message, HttpStatus.BAD_REQUEST, details);
  }

  static unauthorized(message = 'Accès non autorisé'): AppError {
    return new AppError(message, HttpStatus.UNAUTHORIZED);
  }

  static forbidden(message = 'Accès interdit'): AppError {
    return new AppError(message, HttpStatus.FORBIDDEN);
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} introuvable`, HttpStatus.NOT_FOUND);
  }

  static conflict(message: string): AppError {
    return new AppError(message, HttpStatus.CONFLICT);
  }

  static validationError(message: string, details?: unknown): AppError {
    return new AppError(message, HttpStatus.UNPROCESSABLE_ENTITY, details);
  }

  static tooManyRequests(message = 'Trop de requêtes. Réessayez plus tard.'): AppError {
    return new AppError(message, HttpStatus.TOO_MANY_REQUESTS);
  }

  static internal(message = 'Erreur interne du serveur'): AppError {
    return new AppError(message, HttpStatus.INTERNAL_SERVER_ERROR, undefined, false);
  }

  static serviceUnavailable(message = 'Service temporairement indisponible', details?: unknown): AppError {
    return new AppError(message, HttpStatus.SERVICE_UNAVAILABLE, details);
  }

  /** Sérialisation pour les logs et les réponses API */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}