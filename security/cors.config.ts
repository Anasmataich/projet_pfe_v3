/**
 * cors.config.ts — Configuration CORS (Cross-Origin Resource Sharing).
 *
 * Définit les politiques CORS pour tous les environnements
 * de la plateforme GED. Utilisé par le backend Express dans app.ts.
 *
 * @module security/cors
 */

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
  allowNoOrigin: boolean;
}

export const developmentCors: CorsConfig = {
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Pending-Token',
    'X-Request-ID',
    'X-API-Key',
    'Accept',
    'Accept-Language',
    'Cache-Control',
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page',
    'X-Limit',
    'X-Request-ID',
    'Content-Disposition',
  ],
  credentials: true,
  maxAge: 600,
  allowNoOrigin: true,
};

export const productionCors: CorsConfig = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Pending-Token',
    'X-Request-ID',
    'Accept',
  ],
  exposedHeaders: [
    'X-Total-Count',
    'X-Page',
    'X-Limit',
    'Content-Disposition',
  ],
  credentials: true,
  maxAge: 86400,
  allowNoOrigin: false,
};

/**
 * Retourne la configuration CORS selon l'environnement.
 *
 * In production, CORS_ORIGIN env var is **mandatory** — an error is
 * thrown if no origins are configured. This prevents accidental
 * open-CORS deployments.
 */
export function getCorsConfig(
  env: string = 'development',
  envOrigins?: string,
): CorsConfig {
  const isProduction = env === 'production';
  const base = isProduction ? { ...productionCors } : { ...developmentCors };

  if (envOrigins) {
    const extras = envOrigins
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);
    base.allowedOrigins = [...new Set([...base.allowedOrigins, ...extras])];
  }

  if (isProduction && base.allowedOrigins.length === 0) {
    throw new Error(
      '[CORS] CORS_ORIGIN est obligatoire en production. '
      + 'Définissez les origines autorisées dans la variable d\'environnement CORS_ORIGIN.'
    );
  }

  return base;
}

export function isOriginAllowed(
  origin: string | undefined,
  config: CorsConfig,
): boolean {
  if (!origin) return config.allowNoOrigin;
  return config.allowedOrigins.includes(origin);
}
