// redis.ts - configuration de Redis (stub)

import { createClient, RedisClientType } from 'redis';
import env from './env';
import logger from '../utils/logger';

// ─────────────────────────────────────────────
// Client Redis
// ─────────────────────────────────────────────
let redisClient: RedisClientType;

export const connectRedis = async (): Promise<RedisClientType> => {
  const url = env.REDIS_PASSWORD
    ? `redis://:${env.REDIS_PASSWORD}@${env.REDIS_HOST}:${env.REDIS_PORT}`
    : `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`;

  redisClient = createClient({ url }) as RedisClientType;

  redisClient.on('connect', () => {
    logger.info(`[Redis] Connecté — ${env.REDIS_HOST}:${env.REDIS_PORT}`);
  });

  redisClient.on('error', (err: Error) => {
    logger.error(`[Redis] Erreur : ${err.message}`);
  });

  redisClient.on('reconnecting', () => {
    logger.warn('[Redis] Reconnexion en cours...');
  });

  await redisClient.connect();
  return redisClient;
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error('[Redis] Client non initialisé. Appelez connectRedis() d\'abord.');
  }
  return redisClient;
};

// ─────────────────────────────────────────────
// Service Redis — opérations courantes
// ─────────────────────────────────────────────
export const redisService = {
  /** Stocker une valeur avec TTL (en secondes) */
  set: async (key: string, value: string, ttl: number = env.REDIS_TTL): Promise<void> => {
    await getRedisClient().setEx(key, ttl, value);
  },

  /** Récupérer une valeur */
  get: async (key: string): Promise<string | null> => {
    return getRedisClient().get(key);
  },

  /** Supprimer une clé */
  del: async (key: string): Promise<void> => {
    await getRedisClient().del(key);
  },

  /** Vérifier si une clé existe */
  exists: async (key: string): Promise<boolean> => {
    const result = await getRedisClient().exists(key);
    return result === 1;
  },

  /** Stocker un objet JSON */
  setJson: async <T>(key: string, value: T, ttl: number = env.REDIS_TTL): Promise<void> => {
    await getRedisClient().setEx(key, ttl, JSON.stringify(value));
  },

  /** Récupérer un objet JSON */
  getJson: async <T>(key: string): Promise<T | null> => {
    const data = await getRedisClient().get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  },

  /** Blacklister un token JWT révoqué */
  blacklistToken: async (token: string, ttlSeconds: number): Promise<void> => {
    await getRedisClient().setEx(`blacklist:${token}`, ttlSeconds, '1');
  },

  /** Vérifier si un token est blacklisté */
  isTokenBlacklisted: async (token: string): Promise<boolean> => {
    return redisService.exists(`blacklist:${token}`);
  },

  /** Stocker le code MFA temporaire */
  setMFACode: async (userId: string, code: string): Promise<void> => {
    await getRedisClient().setEx(`mfa:${userId}`, 300, code); // 5 minutes
  },

  /** Récupérer le code MFA */
  getMFACode: async (userId: string): Promise<string | null> => {
    return getRedisClient().get(`mfa:${userId}`);
  },

  /** Supprimer le code MFA après utilisation */
  deleteMFACode: async (userId: string): Promise<void> => {
    await getRedisClient().del(`mfa:${userId}`);
  },

  /** HealthCheck Redis */
  ping: async (): Promise<boolean> => {
    try {
      const response = await getRedisClient().ping();
      return response === 'PONG';
    } catch {
      return false;
    }
  },
};

export default redisService;