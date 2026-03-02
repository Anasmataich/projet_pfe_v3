import jwt, { SignOptions, VerifyErrors, Algorithm } from 'jsonwebtoken';
import env from './env';
import { AppError } from '../shared/AppError';
import { HttpStatus } from '../shared/enums';

const JWT_ALGORITHM: Algorithm = 'HS256';
const JWT_ISSUER = 'ged-ministere-backend';
const JWT_AUDIENCE = 'ged-ministere-frontend';

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  tokenFamily: string;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export const generateAccessToken = (payload: JwtAccessPayload): string => {
  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, options);
};

export const generateRefreshToken = (payload: JwtRefreshPayload): string => {
  const options: SignOptions = {
    algorithm: JWT_ALGORITHM,
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, options);
};

export const generateTokenPair = (
  userId: string,
  email: string,
  role: string,
  sessionId: string,
  tokenFamily: string
): TokenPair => {
  const accessPayload: JwtAccessPayload = { sub: userId, email, role, sessionId };
  const refreshPayload: JwtRefreshPayload = { sub: userId, sessionId, tokenFamily };

  return {
    accessToken: generateAccessToken(accessPayload),
    refreshToken: generateRefreshToken(refreshPayload),
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  };
};

export const verifyAccessToken = (token: string): JwtAccessPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtAccessPayload;
  } catch (err) {
    return handleJwtError(err as VerifyErrors);
  }
};

export const verifyRefreshToken = (token: string): JwtRefreshPayload => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      algorithms: [JWT_ALGORITHM],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtRefreshPayload;
  } catch (err) {
    return handleJwtError(err as VerifyErrors);
  }
};

export const decodeToken = (token: string): jwt.JwtPayload | null => {
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string') return null;
  return decoded;
};

export const extractBearerToken = (authHeader: string | undefined): string | null => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7).trim();
  if (!token || token.length < 10 || token.length > 4096) return null;
  return token;
};

const handleJwtError = (error: VerifyErrors): never => {
  if (error.name === 'TokenExpiredError') {
    throw new AppError('Token expiré. Veuillez vous reconnecter.', HttpStatus.UNAUTHORIZED);
  }
  if (error.name === 'JsonWebTokenError') {
    throw new AppError('Token invalide.', HttpStatus.UNAUTHORIZED);
  }
  if (error.name === 'NotBeforeError') {
    throw new AppError('Token non encore actif.', HttpStatus.UNAUTHORIZED);
  }
  throw new AppError('Erreur d\'authentification.', HttpStatus.UNAUTHORIZED);
};

export const getTokenExpirationDate = (expiresIn: string): Date => {
  const units: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) {
    throw new AppError(`Format d'expiration invalide : ${expiresIn}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multiplier = units[unit] ?? 1000;

  return new Date(Date.now() + value * multiplier);
};
