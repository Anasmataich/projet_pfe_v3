// errorHandler.ts - middleware global de gestion des erreurs

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/AppError';
import { ApiResponse } from '../shared/ApiResponse';
import { HttpStatus } from '../shared/enums';
import logger from '../utils/logger';

// ─────────────────────────────────────────────
// Gestionnaire d'erreurs global (Express)
// ─────────────────────────────────────────────
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log de l'erreur
  logger.error(`[ErrorHandler] ${err.message}`, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId,
    stack: err.stack,
  });

  // Erreurs applicatives connues
  if (err instanceof AppError) {
    ApiResponse.error(res, err.message, err.statusCode, err.details);
    return;
  }

  // Erreurs de validation Joi
  if (err.name === 'ValidationError') {
    const joiErr = err as { details?: Array<{ message: string; path: (string | number)[] }>; message?: string };
    const details = Array.isArray(joiErr.details)
      ? joiErr.details.map((d) => ({ field: d.path.join('.'), message: d.message }))
      : joiErr.message;
    ApiResponse.error(res, 'Données de requête invalides', HttpStatus.UNPROCESSABLE_ENTITY, details);
    return;
  }

  // Erreurs JWT (non gérées par le middleware)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    ApiResponse.error(res, 'Token d\'authentification invalide ou expiré', HttpStatus.UNAUTHORIZED);
    return;
  }

  // Erreurs PostgreSQL
  const pgError = err as { code?: string; constraint?: string };
  if (pgError.code === '23505') {
    ApiResponse.error(res, 'Cette ressource existe déjà', HttpStatus.CONFLICT, {
      constraint: pgError.constraint,
    });
    return;
  }
  if (pgError.code === '23503') {
    ApiResponse.error(res, 'Référence invalide — ressource liée introuvable', HttpStatus.BAD_REQUEST);
    return;
  }

  // Erreurs Multer (upload fichier)
  if (err.name === 'MulterError') {
    const multerError = err as unknown as { code: string };
    if (multerError.code === 'LIMIT_FILE_SIZE') {
      ApiResponse.error(res, 'Fichier trop volumineux', HttpStatus.BAD_REQUEST);
      return;
    }
    ApiResponse.error(res, 'Erreur lors de l\'upload du fichier', HttpStatus.BAD_REQUEST);
    return;
  }

  // Erreur inconnue — ne pas exposer les détails en production
  const isDev = process.env['NODE_ENV'] === 'development';
  ApiResponse.error(
    res,
    'Erreur interne du serveur',
    HttpStatus.INTERNAL_SERVER_ERROR,
    isDev ? { stack: err.stack, message: err.message } : undefined,
    'INTERNAL_SERVER_ERROR'
  );
};

/**
 * Middleware pour les routes introuvables (404)
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  ApiResponse.error(
    res,
    `Route introuvable : ${req.method} ${req.originalUrl}`,
    HttpStatus.NOT_FOUND
  );
};