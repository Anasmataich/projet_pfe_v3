/**
 * Audit de connectivité inter-services — Backend GED
 * Vérifie sans UI : PostgreSQL, Redis, MinIO, AI-Service, MailHog et réseau Docker.
 *
 * Exécution (depuis la racine du projet) :
 *   docker compose exec backend npx ts-node src/scripts/audit-connectivity.ts
 * Ou en local (depuis backend/) :
 *   npx ts-node src/scripts/audit-connectivity.ts
 */

import axios from 'axios';
import { HeadBucketCommand } from '@aws-sdk/client-s3';
import nodemailer from 'nodemailer';
import db from '../config/database';
import { connectRedis, getRedisClient, redisService } from '../config/redis';
import env from '../config/env';
import { s3Client, storageService } from '../config/storage';

const results: { name: string; ok: boolean; detail: string }[] = [];

function pass(name: string, detail: string): void {
  results.push({ name, ok: true, detail });
  console.log(`  [OK] ${name}: ${detail}`);
}

function fail(name: string, detail: string): void {
  results.push({ name, ok: false, detail });
  console.error(`  [FAIL] ${name}: ${detail}`);
}

async function auditPostgres(): Promise<void> {
  try {
    const ok = await db.healthCheck();
    if (ok) {
      const r = await db.query<{ now: string }>('SELECT NOW() as now');
      pass('Backend → PostgreSQL', `Pool actif, heure BDD: ${r.rows[0]?.now ?? 'N/A'}`);
    } else {
      fail('Backend → PostgreSQL', 'healthCheck a retourné false');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail('Backend → PostgreSQL', `Pool ou requête bloquée: ${msg}`);
  }
}

async function auditRedis(): Promise<void> {
  try {
    const testKey = 'audit:ratelimit:test';
    await redisService.set(testKey, '1', 10);
    const val = await redisService.get(testKey);
    await redisService.del(testKey);
    const blacklistKey = 'blacklist:audit-test-token';
    await redisService.blacklistToken('audit-test-token', 5);
    const isBl = await redisService.isTokenBlacklisted('audit-test-token');
    await redisService.del(blacklistKey);
    if (val === '1' && isBl) {
      pass('Backend → Redis', 'SET/GET/DEL et blacklist tokens OK');
    } else {
      fail('Backend → Redis', `SET/GET OK mais blacklist=${isBl}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail('Backend → Redis', `Cache/blacklist: ${msg}`);
  }
}

async function auditMinio(): Promise<void> {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: env.STORAGE_BUCKET }));
    const testKey = 'audit/connectivity-test.txt';
    const signed = await storageService.getSignedDownloadUrl(testKey, 60);
    const hasUrl = signed.startsWith('http') && signed.includes(env.STORAGE_BUCKET);
    if (hasUrl) {
      pass('Backend → MinIO', `Bucket accessible, Signed URL générée (S3 OK)`);
    } else {
      fail('Backend → MinIO', 'Bucket OK mais Signed URL invalide');
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail('Backend → MinIO', `S3/bucket ou Signed URL: ${msg}`);
  }
}

async function auditAIService(): Promise<void> {
  const url = `${env.AI_SERVICE_URL.replace(/\/$/, '')}/health`;
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: env.AI_SERVICE_API_KEY ? { 'X-API-Key': env.AI_SERVICE_API_KEY } : {},
      validateStatus: () => true,
    });
    if (res.status === 200 && res.data?.status) {
      const models = (res.data as { models_loaded?: boolean }).models_loaded;
      pass('Backend → AI-Service', `FastAPI prêt (status: ${res.data.status}, modèles: ${models ? 'chargés' : 'degraded'})`);
    } else {
      fail('Backend → AI-Service', `HTTP ${res.status} ou body invalide`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail('Backend → AI-Service', `Ping/health: ${msg}`);
  }
}

async function auditMailHog(): Promise<void> {
  const host = env.SMTP_HOST;
  const port = env.SMTP_PORT;
  const user = env.SMTP_USER || undefined;
  const passwd = env.SMTP_PASSWORD || undefined;
  try {
    const transport = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: user && passwd ? { user, pass: passwd } : undefined,
      tls: { rejectUnauthorized: false },
    });
    await transport.verify();
    pass('Backend → MailHog (SMTP)', `Transport vérifié ${host}:${port} (mails récupération MDP acceptés)`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    fail('Backend → MailHog (SMTP)', `Transport SMTP: ${msg}`);
  }
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════');
  console.log('  Audit connectivité — Backend GED (sans UI)');
  console.log('═══════════════════════════════════════════════════\n');

  await auditPostgres();

  try {
    await connectRedis();
  } catch (e) {
    fail('Backend → Redis', 'Connexion initiale impossible');
  }
  await auditRedis();

  await auditMinio();
  await auditAIService();
  await auditMailHog();

  console.log('\n═══════════════════════════════════════════════════');
  const failed = results.filter((r) => !r.ok);
  if (failed.length === 0) {
    console.log('  Résultat: tous les liens sont opérationnels.');
  } else {
    console.log(`  Résultat: ${failed.length} lien(s) en échec.`);
    failed.forEach((r) => console.error(`    - ${r.name}: ${r.detail}`));
  }
  console.log('═══════════════════════════════════════════════════\n');

  await db.close();
  try {
    await getRedisClient().quit();
  } catch {
    // ignore
  }
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Erreur fatale audit:', err);
  process.exit(1);
});
