// rateLimiter.ts - middleware de limitation de débit

import rateLimit from 'express-rate-limit';
import env from '../config/env';
import { HttpStatus } from '../shared/enums';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

const isDev = env.NODE_ENV === 'development';

// En développement on est très permissif pour ne pas bloquer le développeur.
// En production les valeurs strictes s'appliquent.
const devOr = (prodValue: number, devValue: number) => (isDev ? devValue : prodValue);

// ─────────────────────────────────────────────
// Rate Limiters
// ─────────────────────────────────────────────

/**
 * Limiter global pour toutes les routes API
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: devOr(env.RATE_LIMIT_MAX, 1000),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Trop de requêtes. Veuillez réessayer dans quelques minutes.',
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
  },
});

/**
 * Limiter strict pour les tentatives de connexion
 * Production : 5 tentatives par 15 minutes par IP
 * Développement : 100 tentatives par 5 minutes (très permissif)
 */
export const authRateLimiter = rateLimit({
  windowMs: devOr(15 * 60 * 1000, 5 * 60 * 1000), // prod 15min, dev 5min
  max: devOr(5, 100),
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Trop de tentatives de connexion. Votre accès est bloqué pendant 15 minutes.',
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
  },
});

/**
 * Limiter pour les uploads de fichiers
 * 20 uploads par heure (prod) / 200 par heure (dev)
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: devOr(20, 200),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Limite d\'upload atteinte. Réessayez dans une heure.',
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
  },
});

/**
 * Limiter pour les requêtes IA (coûteuses en ressources)
 * 10 par minute (prod) / 100 par minute (dev)
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: devOr(10, 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Limite de requêtes IA atteinte. Réessayez dans une minute.',
    statusCode: HttpStatus.TOO_MANY_REQUESTS,
  },
});