import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractBearerToken, JwtAccessPayload } from '../config/jwt';
import { redisService } from '../config/redis';
import { AppError } from '../shared/AppError';
import { HttpStatus, UserRole } from '../shared/enums';

export type { AuthenticatedUser } from '../types/express';

/**
 * Extrait le token d'accès depuis les cookies ou le header Authorization.
 * Priorité : cookie > header (rétrocompatibilité Postman / API externes).
 */
const extractToken = (req: Request): string | null => {
  // 1. Cookie HttpOnly (navigateur)
  const cookieToken = (req.cookies as Record<string, string>)?.access_token;
  if (cookieToken && cookieToken.length >= 10) return cookieToken;

  // 2. Fallback : header Authorization: Bearer (Postman / API)
  return extractBearerToken(req.headers['authorization']);
};

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AppError('Token d\'authentification manquant', HttpStatus.UNAUTHORIZED);
    }

    let isBlacklisted = false;
    try {
      isBlacklisted = await redisService.isTokenBlacklisted(token);
    } catch {
      throw AppError.serviceUnavailable(
        'Service d\'authentification indisponible. Réessayez dans quelques instants.'
      );
    }
    if (isBlacklisted) {
      throw AppError.unauthorized('Session expirée. Veuillez vous reconnecter.');
    }

    const payload: JwtAccessPayload = verifyAccessToken(token);

    const invalidatedAt = await redisService.get(`sessions:invalidated:${payload.sub}`);
    if (invalidatedAt && payload.iat && payload.iat * 1000 < Number(invalidatedAt)) {
      throw AppError.unauthorized('Session invalidée. Veuillez vous reconnecter.');
    }

    req.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
      sessionId: payload.sessionId,
    };

    next();
  } catch (err) {
    next(err);
  }
};

export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req);
    if (!token) {
      next();
      return;
    }

    let isBlacklisted = false;
    try {
      isBlacklisted = await redisService.isTokenBlacklisted(token);
    } catch {
      next();
      return;
    }
    if (isBlacklisted) {
      next();
      return;
    }

    const payload: JwtAccessPayload = verifyAccessToken(token);

    const invalidatedAt = await redisService.get(`sessions:invalidated:${payload.sub}`);
    if (invalidatedAt && payload.iat && payload.iat * 1000 < Number(invalidatedAt)) {
      next();
      return;
    }

    req.user = {
      userId: payload.sub,
      email: payload.email,
      role: payload.role as UserRole,
      sessionId: payload.sessionId,
    };
  } catch {
    // Silently skip for optional auth
  }
  next();
};
