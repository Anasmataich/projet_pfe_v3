// app.ts - configuration de l'application Express (stub)

import 'express-async-errors';
import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import compression from 'compression';
import hpp from 'hpp';

import env from './config/env';
import logger from './utils/logger';

// Middlewares
import { globalRateLimiter } from './middlewares/rateLimiter';
import { sanitize } from './middlewares/sanitize';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

// Routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import documentRoutes from './modules/documents/document.routes';
import auditRoutes from './modules/audit/audit.routes';
import workflowRoutes from './modules/workflow/workflow.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import adminRoutes from './modules/admin/admin.routes';

// ─────────────────────────────────────────────
// Création de l'application Express
// ─────────────────────────────────────────────
const createApp = (): Application => {
  const app: Application = express();

  // ── Sécurité HTTP Headers ────────────────────
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: {
      maxAge: 31_536_000,     // 1 an
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'same-origin' },
    xssFilter: true,
    noSniff: true,
    frameguard: { action: 'deny' },
  }));

  // ── Cookie Parser ────────────────────────────
  app.use(cookieParser());

  // ── CORS ────────────────────────────────────
  app.use(cors({
    origin: (origin, callback) => {
      const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origine non autorisée — ${origin}`));
      }
    },
    credentials: env.CORS_CREDENTIALS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Pending-Token', 'X-Request-ID'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Limit'],
  }));

  // ── Compression ─────────────────────────────
  app.use(compression());

  // ── Parsing du corps des requêtes ───────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Protection contre la pollution des paramètres ──
  app.use(hpp());

  // ── Sanitisation des entrées ─────────────────
  app.use(sanitize);

  // ── Rate Limiting global ─────────────────────
  app.use(globalRateLimiter);

  // ── Logging HTTP ─────────────────────────────
  app.use(morgan('combined', {
    stream: { write: (message: string) => logger.http(message.trim()) },
    skip: (req: Request) => req.url === '/health',
  }));

  // ── Trust Proxy (pour obtenir les vraies IPs derrière Nginx) ─
  app.set('trust proxy', 1);

  // ─────────────────────────────────────────────
  // Route de santé (Health Check)
  // ─────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'GED Backend — DSI Ministère Éducation Nationale',
      version: process.env['npm_package_version'] ?? '1.0.0',
      environment: env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });

  // ─────────────────────────────────────────────
  // Montage des routes API
  // ─────────────────────────────────────────────
  const API = env.API_PREFIX;

  app.use(`${API}/auth`, authRoutes);
  app.use(`${API}/users`, userRoutes);
  app.use(`${API}/documents`, documentRoutes);
  app.use(`${API}/audit`, auditRoutes);
  app.use(`${API}/workflow`, workflowRoutes);
  app.use(`${API}/notifications`, notificationRoutes);
  app.use(`${API}/admin`, adminRoutes);

  // ─────────────────────────────────────────────
  // Gestionnaires d'erreurs (doivent être en dernier)
  // ─────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
