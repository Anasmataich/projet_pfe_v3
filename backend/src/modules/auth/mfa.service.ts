import crypto from 'node:crypto';
import speakeasy from 'speakeasy';
import { redisService } from '../../config/redis';

const PENDING_MFA_TTL = 300; // 5 minutes
const PENDING_PREFIX = 'mfa:pending:';

/**
 * Timing-safe string comparison to prevent side-channel attacks.
 */
const timingSafeEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
};

export const storePendingMFA = async (userId: string, pendingToken: string): Promise<void> => {
  await redisService.set(`${PENDING_PREFIX}${userId}`, pendingToken, PENDING_MFA_TTL);
};

export const validatePendingMFA = async (userId: string, pendingToken: string): Promise<boolean> => {
  const stored = await redisService.get(`${PENDING_PREFIX}${userId}`);
  if (!stored) return false;

  const isValid = timingSafeEqual(stored, pendingToken);
  if (isValid) {
    await redisService.del(`${PENDING_PREFIX}${userId}`);
  }
  return isValid;
};

export const verifyToken = (token: string, secret: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
};

export const generateSecret = (email?: string): { secret: string; otpauthUrl: string } => {
  const name = email ? `GED-Ministere:${email}` : 'GED-Ministere';
  const secret = speakeasy.generateSecret({
    name,
    issuer: 'GED-Ministere',
    length: 32,
  });
  return {
    secret: secret.base32 ?? '',
    otpauthUrl: secret.otpauth_url ?? '',
  };
};

export const mfaService = {
  storePendingMFA,
  validatePendingMFA,
  verifyToken,
  generateSecret,
};

export default mfaService;
