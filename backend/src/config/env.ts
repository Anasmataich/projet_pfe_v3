// env.ts - gestion des variables d'environnement (stub)

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Charger les variables d'environnement — try multiple paths
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(__dirname, '../../../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), '../.env'),
];
const envFile = envPaths.find(p => fs.existsSync(p));
if (envFile) {
  dotenv.config({ path: envFile });
} else {
  dotenv.config();
}

// ─────────────────────────────────────────────
// Types des variables d'environnement
// ─────────────────────────────────────────────
interface EnvConfig {
  // Serveur
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_PREFIX: string;

  // PostgreSQL
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;
  DB_POOL_MIN: number;
  DB_POOL_MAX: number;

  // Redis
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_TTL: number;

  // JWT
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // MFA
  MFA_APP_NAME: string;
  MFA_ISSUER: string;

  // Chiffrement
  ENCRYPTION_KEY: string;
  ENCRYPTION_IV_LENGTH: number;

  // Stockage
  STORAGE_ENDPOINT: string;
  STORAGE_ACCESS_KEY: string;
  STORAGE_SECRET_KEY: string;
  STORAGE_BUCKET: string;
  STORAGE_REGION: string;
  STORAGE_USE_SSL: boolean;

  // Email
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASSWORD: string;
  EMAIL_FROM: string;

  // CORS
  CORS_ORIGIN: string;
  CORS_CREDENTIALS: boolean;

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;

  // AI Service
  AI_SERVICE_URL: string;
  AI_SERVICE_API_KEY: string;

  // Logs
  LOG_LEVEL: string;
  LOG_FILE: string;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
const getRequired = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`[ENV] Variable d'environnement manquante : ${key}`);
  }
  return value;
};

const getOptional = (key: string, defaultValue: string): string => {
  return process.env[key] ?? defaultValue;
};

const getNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`[ENV] La variable ${key} doit être un nombre. Valeur reçue : "${value}"`);
  }
  return parsed;
};

const getBoolean = (key: string, defaultValue: boolean): boolean => {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
};

const getNodeEnv = (): EnvConfig['NODE_ENV'] => {
  const env = process.env['NODE_ENV'] ?? 'development';
  if (!['development', 'production', 'test'].includes(env)) {
    throw new Error(`[ENV] NODE_ENV invalide : "${env}". Valeurs acceptées : development, production, test`);
  }
  return env as EnvConfig['NODE_ENV'];
};

// ─────────────────────────────────────────────
// Détection Docker — fallback local automatique
// ─────────────────────────────────────────────

/**
 * Détecte si l'application tourne dans un conteneur Docker.
 * Vérifie la présence de /.dockerenv ou de la variable DOCKER_CONTAINER.
 */
const isRunningInDocker = (): boolean => {
  // Variable d'environnement explicite (peut être définie dans docker-compose)
  if (process.env['DOCKER_CONTAINER'] === 'true') return true;
  // Fichier sentinelle créé automatiquement par Docker
  try { return fs.existsSync('/.dockerenv'); } catch { return false; }
};

const IS_DOCKER = isRunningInDocker();

/**
 * Résout un hostname Docker vers localhost quand on tourne en local.
 * En Docker : retourne la valeur d'origine (ex: "postgres", "redis", "minio").
 * En local  : remplace les hostnames Docker connus par "localhost".
 */
const DOCKER_SERVICE_HOSTS = new Set(['postgres', 'redis', 'minio', 'mailhog', 'ai-service']);

const resolveHost = (host: string): string => {
  if (IS_DOCKER) return host;
  if (DOCKER_SERVICE_HOSTS.has(host)) {
    console.log(`[ENV] 🔄 Fallback local : "${host}" → "localhost"`);
    return 'localhost';
  }
  return host;
};

/**
 * Résout une URL contenant un hostname Docker vers localhost en local.
 * Ex: "http://minio:9000" → "http://localhost:9000"
 */
const resolveUrl = (url: string): string => {
  if (IS_DOCKER) return url;
  try {
    const parsed = new URL(url);
    if (DOCKER_SERVICE_HOSTS.has(parsed.hostname)) {
      console.log(`[ENV] 🔄 Fallback local URL : "${parsed.hostname}" → "localhost"`);
      parsed.hostname = 'localhost';
      return parsed.toString().replace(/\/$/, ''); // enlever le trailing slash
    }
  } catch { /* URL invalide — ne pas modifier */ }
  return url;
};

// ─────────────────────────────────────────────
// Validation & export de la configuration
// ─────────────────────────────────────────────
const buildEnvConfig = (): EnvConfig => {
  console.log(`[ENV] 🏠 Environnement détecté : ${IS_DOCKER ? 'DOCKER' : 'LOCAL'}`);

  const config: EnvConfig = {
    // Serveur
    NODE_ENV: getNodeEnv(),
    PORT: getNumber('PORT', 5000),
    API_PREFIX: getOptional('API_PREFIX', '/api/v1'),

    // PostgreSQL
    DB_HOST: resolveHost(getRequired('DB_HOST')),
    DB_PORT: getNumber('DB_PORT', 5432),
    DB_NAME: getRequired('DB_NAME'),
    DB_USER: getRequired('DB_USER'),
    DB_PASSWORD: getRequired('DB_PASSWORD'),
    DB_SSL: getBoolean('DB_SSL', false),
    DB_POOL_MIN: getNumber('DB_POOL_MIN', 2),
    DB_POOL_MAX: getNumber('DB_POOL_MAX', 10),

    // Redis
    REDIS_HOST: resolveHost(getOptional('REDIS_HOST', 'localhost')),
    REDIS_PORT: getNumber('REDIS_PORT', 6379),
    REDIS_PASSWORD: getOptional('REDIS_PASSWORD', ''),
    REDIS_TTL: getNumber('REDIS_TTL', 3600),

    // JWT
    JWT_ACCESS_SECRET: getRequired('JWT_ACCESS_SECRET'),
    JWT_REFRESH_SECRET: getRequired('JWT_REFRESH_SECRET'),
    JWT_ACCESS_EXPIRES_IN: getOptional('JWT_ACCESS_EXPIRES_IN', '15m'),
    JWT_REFRESH_EXPIRES_IN: getOptional('JWT_REFRESH_EXPIRES_IN', '7d'),

    // MFA
    MFA_APP_NAME: getOptional('MFA_APP_NAME', 'GED-Ministere'),
    MFA_ISSUER: getOptional('MFA_ISSUER', 'DSI-MinistereEducation'),

    // Chiffrement
    ENCRYPTION_KEY: getRequired('ENCRYPTION_KEY'),
    ENCRYPTION_IV_LENGTH: getNumber('ENCRYPTION_IV_LENGTH', 16),

    // Stockage
    STORAGE_ENDPOINT: resolveUrl(getRequired('STORAGE_ENDPOINT')),
    STORAGE_ACCESS_KEY: getRequired('STORAGE_ACCESS_KEY'),
    STORAGE_SECRET_KEY: getRequired('STORAGE_SECRET_KEY'),
    STORAGE_BUCKET: getOptional('STORAGE_BUCKET', 'ged-documents'),
    STORAGE_REGION: getOptional('STORAGE_REGION', 'us-east-1'),
    STORAGE_USE_SSL: getBoolean('STORAGE_USE_SSL', false),

    // Email
    SMTP_HOST: resolveHost(getOptional('SMTP_HOST', 'localhost')),
    SMTP_PORT: getNumber('SMTP_PORT', 587),
    SMTP_SECURE: getBoolean('SMTP_SECURE', false),
    SMTP_USER: getOptional('SMTP_USER', ''),
    SMTP_PASSWORD: getOptional('SMTP_PASSWORD', ''),
    EMAIL_FROM: getOptional('EMAIL_FROM', 'GED <noreply@ministere.gov.ma>'),

    // CORS
    CORS_ORIGIN: getOptional('CORS_ORIGIN', 'http://localhost:3000'),
    CORS_CREDENTIALS: getBoolean('CORS_CREDENTIALS', true),

    // Rate limiting
    RATE_LIMIT_WINDOW_MS: getNumber('RATE_LIMIT_WINDOW_MS', 900000),
    RATE_LIMIT_MAX: getNumber('RATE_LIMIT_MAX', 100),

    // AI Service
    AI_SERVICE_URL: resolveUrl(getOptional('AI_SERVICE_URL', 'http://localhost:8000')),
    AI_SERVICE_API_KEY: getOptional('AI_SERVICE_API_KEY', ''),

    // Logs
    LOG_LEVEL: getOptional('LOG_LEVEL', 'info'),
    LOG_FILE: getOptional('LOG_FILE', 'logs/app.log'),
  };

  return config;
};

// Singleton — chargé une seule fois au démarrage
export const env = buildEnvConfig();
export default env;