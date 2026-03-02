// server.ts - point d'entrée du serveur backend (stub)

import createApp from './app';
import env from './config/env';
import { connectDatabase, db } from './config/database';
import { connectRedis, getRedisClient } from './config/redis';
import logger from './utils/logger';
import http from 'http';

// ─────────────────────────────────────────────
// Point d'entrée principal du serveur
// ─────────────────────────────────────────────
const startServer = async (): Promise<void> => {
  try {
    logger.info('═══════════════════════════════════════════════════');
    logger.info('  GED — Plateforme Documentaire Intelligente & Sécurisée');
    logger.info('  DSI — Ministère de l\'Éducation Nationale du Maroc');
    logger.info('═══════════════════════════════════════════════════');
    logger.info(`  Environnement : ${env.NODE_ENV}`);

    // 1. Connexion à PostgreSQL
    logger.info('[Boot] Connexion à PostgreSQL...');
    await connectDatabase();
    logger.info('[Boot] ✓ PostgreSQL connecté');

    // 2. Connexion à Redis
    logger.info('[Boot] Connexion à Redis...');
    await connectRedis();
    logger.info('[Boot] ✓ Redis connecté');

    // 3. Créer l'application Express
    const app = createApp();
    const server = http.createServer(app);

    // 4. Démarrer le serveur
    server.listen(env.PORT, () => {
      logger.info(`[Boot] ✓ Serveur démarré sur le port ${env.PORT}`);
      logger.info(`[Boot] ✓ API disponible : http://localhost:${env.PORT}${env.API_PREFIX}`);
      logger.info(`[Boot] ✓ Health Check : http://localhost:${env.PORT}/health`);
      logger.info('═══════════════════════════════════════════════════');
    });

    // ─────────────────────────────────────────
    // Arrêt propre (Graceful Shutdown)
    // ─────────────────────────────────────────
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`\n[Shutdown] Signal reçu : ${signal} — Arrêt en cours...`);

      // Arrêter d'accepter de nouvelles connexions
      server.close(async () => {
        logger.info('[Shutdown] Serveur HTTP fermé');

        try {
          // Fermer les connexions Redis et PostgreSQL
          await getRedisClient().quit();
          logger.info('[Shutdown] ✓ Redis déconnecté');

          await db.close();
          logger.info('[Shutdown] ✓ PostgreSQL déconnecté');

          logger.info('[Shutdown] Arrêt propre effectué. Au revoir.');
          process.exit(0);
        } catch (err) {
          logger.error(`[Shutdown] Erreur lors de l'arrêt : ${(err as Error).message}`);
          process.exit(1);
        }
      });

      // Forcer l'arrêt après 15 secondes
      setTimeout(() => {
        logger.error('[Shutdown] Arrêt forcé après timeout de 15s');
        process.exit(1);
      }, 15_000);
    };

    process.on('SIGTERM', () => void gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => void gracefulShutdown('SIGINT'));

    // ─────────────────────────────────────────
    // Gestion des erreurs non capturées
    // ─────────────────────────────────────────
    process.on('uncaughtException', (err: Error) => {
      logger.error(`[FATAL] Exception non capturée : ${err.message}`, { stack: err.stack });
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error(`[FATAL] Promesse rejetée non gérée : ${String(reason)}`);
      process.exit(1);
    });

  } catch (err) {
    logger.error(`[Boot] ÉCHEC du démarrage : ${(err as Error).message}`);
    process.exit(1);
  }
};

// Lancer le serveur
void startServer();