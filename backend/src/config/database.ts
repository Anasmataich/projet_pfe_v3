// database.ts - configuration de la base de données PostgreSQL (stub)

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import env from './env';
import logger from '../utils/logger';

// ─────────────────────────────────────────────
// Pool de connexions PostgreSQL
// ─────────────────────────────────────────────
const pool = new Pool({
  host: env.DB_HOST,
  port: env.DB_PORT,
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  min: env.DB_POOL_MIN,
  max: env.DB_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
});

// ─────────────────────────────────────────────
// Événements du pool
// ─────────────────────────────────────────────
pool.on('connect', (client: PoolClient) => {
  logger.debug(`[DB] Nouveau client connecté — Total actifs : ${pool.totalCount}`);
  // Définir le fuseau horaire pour chaque connexion
  client.query("SET timezone = 'Africa/Casablanca'").catch((err: Error) => {
    logger.error(`[DB] Impossible de définir le timezone : ${err.message}`);
  });
});

pool.on('error', (err: Error) => {
  logger.error(`[DB] Erreur inattendue sur un client inactif : ${err.message}`);
});

pool.on('remove', () => {
  logger.debug(`[DB] Client retiré du pool — Total actifs : ${pool.totalCount}`);
});

// ─────────────────────────────────────────────
// Interface de la base de données
// ─────────────────────────────────────────────
export interface DatabaseService {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>>;
  getClient(): Promise<PoolClient>;
  transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
  close(): Promise<void>;
}

// ─────────────────────────────────────────────
// Implémentation des méthodes
// ─────────────────────────────────────────────

/**
 * Exécute une requête SQL simple avec le pool
 */
const query = async <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> => {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug(`[DB] Requête exécutée — durée: ${duration}ms — rows: ${result.rowCount}`);
    return result;
  } catch (err) {
    const error = err as Error;
    logger.error(`[DB] Erreur lors de l'exécution de la requête : ${error.message}`);
    logger.error(`[DB] Requête : ${text}`);
    throw error;
  }
};

/**
 * Obtenir un client dédié du pool (pour transactions manuelles)
 */
const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  return client;
};

/**
 * Exécuter une transaction de manière atomique
 * Rollback automatique en cas d'erreur
 */
const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    logger.debug('[DB] Transaction démarrée');

    const result = await callback(client);

    await client.query('COMMIT');
    logger.debug('[DB] Transaction validée (COMMIT)');

    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    const error = err as Error;
    logger.error(`[DB] Transaction annulée (ROLLBACK) — raison : ${error.message}`);
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Vérifier la connectivité à la base de données
 */
const healthCheck = async (): Promise<boolean> => {
  try {
    const result = await pool.query<{ now: Date }>('SELECT NOW() as now');
    logger.info(`[DB] HealthCheck OK — Heure serveur BDD : ${result.rows[0]?.now}`);
    return true;
  } catch (err) {
    const error = err as Error;
    logger.error(`[DB] HealthCheck ÉCHOUÉ : ${error.message}`);
    return false;
  }
};

/**
 * Fermer proprement le pool (utilisé à l'arrêt du serveur)
 */
const close = async (): Promise<void> => {
  logger.info('[DB] Fermeture du pool de connexions PostgreSQL...');
  await pool.end();
  logger.info('[DB] Pool fermé.');
};

// ─────────────────────────────────────────────
// Connexion initiale
// ─────────────────────────────────────────────
export const connectDatabase = async (): Promise<void> => {
  try {
    await healthCheck();
    logger.info(`[DB] Connecté à PostgreSQL — ${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`);
  } catch (err) {
    const error = err as Error;
    logger.error(`[DB] Impossible de se connecter à PostgreSQL : ${error.message}`);
    process.exit(1);
  }
};

// ─────────────────────────────────────────────
// Export du service de base de données
// ─────────────────────────────────────────────
export const db: DatabaseService = {
  query,
  getClient,
  transaction,
  healthCheck,
  close,
};

export { pool };
export default db;