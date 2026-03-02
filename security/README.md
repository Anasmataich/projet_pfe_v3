# Security & Compliance Configuration

This folder contains the **security and compliance building blocks** for the GED platform. It complements the backend’s runtime security middlewares with configuration artifacts and documentation for:

- **SSL/TLS** certificate management (`ssl/`)
- **CORS** strict policies (`cors.config.ts`)
- **Content Security Policy (CSP)** strict policies (`csp.config.ts`)
- **Audit & monitoring standards** (`audit-policy.md`)

## Links

- **Main project README**: [`../README.md`](../README.md)
- **AI Microservice (FastAPI)**: [`../ai-service/README.md`](../ai-service/README.md)

---

## Security Layers Overview

### SSL/TLS (Transport Security)

TLS is typically enforced at the reverse-proxy layer (Nginx / ingress controller). Certificates are stored under:

- `security/ssl/`

This directory is intentionally committed with a `.gitkeep` placeholder to preserve structure, but **real certificates must never be committed**.

### CORS (Cross-Origin Resource Sharing)

File: `cors.config.ts`

Provides:

- A **development** profile that allows common local origins (frontend + backend + AI-service)
- A **production** profile that is **deny-by-default** (origins must be explicitly configured)
- Helpers:
  - `getCorsConfig(env, envOrigins)`
  - `isOriginAllowed(origin, config)`

Recommended production approach:

- define allowed origins via environment variable `CORS_ORIGIN` (comma-separated)
- keep the code strict (`allowNoOrigin: false`)

### CSP (Content Security Policy)

File: `csp.config.ts`

Provides:

- A **development** CSP (allows `unsafe-inline` and `unsafe-eval` for dev tooling / HMR)
- A **production** CSP (strict: no inline/eval; upgrades insecure requests; blocks mixed content)
- Helpers:
  - `getCspConfig(env, apiUrl?)`
  - `toHelmetDirectives(config)` (Helmet-compatible directives map)

---

## How to apply these policies in the backend

The backend currently applies Helmet and CORS directly in `backend/src/app.ts`.

This folder provides **production-ready config** that you can either:

- **mirror** into the backend codebase (recommended): copy `cors.config.ts` / `csp.config.ts` into `backend/src/security/`, or
- **package** as a shared workspace module (monorepo package) and import it, or
- adjust TypeScript build settings to allow importing files outside `backend/src/` (not recommended unless you really need it).

### CORS wiring example (Express)

```ts
import cors from 'cors';
import env from './config/env';
import { getCorsConfig, isOriginAllowed } from './security/cors.config';

const corsConfig = getCorsConfig(env.NODE_ENV, env.CORS_ORIGIN);

app.use(cors({
  origin: (origin, cb) => cb(null, isOriginAllowed(origin, corsConfig)),
  credentials: corsConfig.credentials,
  methods: corsConfig.allowedMethods,
  allowedHeaders: corsConfig.allowedHeaders,
  exposedHeaders: corsConfig.exposedHeaders,
  maxAge: corsConfig.maxAge,
}));
```

### CSP wiring example (Helmet)

```ts
import helmet from 'helmet';
import env from './config/env';
import { getCspConfig, toHelmetDirectives } from './security/csp.config';

const csp = getCspConfig(env.NODE_ENV, env.API_PREFIX);

app.use(helmet({
  contentSecurityPolicy: {
    directives: toHelmetDirectives(csp),
  },
}));
```

---

## Compliance & Audit

File: `audit-policy.md`

This document is the **reference standard** for logging, monitoring, and traceability across the platform. It is aligned with:

- **RGPD**
- **Loi 09-08** (Maroc)
- **ISO 27001**
- **OWASP Logging Cheat Sheet**

It describes:

- audited actions (auth, documents, workflow, admin, security/AI anomalies)
- the audit log schema (`audit_logs` table)
- how logs are implemented in the backend (`auditLogger.ts` + `createAuditLog()`)
- retention, access control, and alerting guidelines

---

## Deployment: SSL Certificate Management

### Recommended layout

Place certificates in `security/ssl/` (do not commit them):

```
security/ssl/
├── fullchain.pem
└── privkey.pem
```

### Operational guidance

- **Prefer managed certs** (Kubernetes ingress / cloud LB) when possible.
- If using **Nginx**, mount `security/ssl/` into the container and reference:
  - `fullchain.pem` for `ssl_certificate`
  - `privkey.pem` for `ssl_certificate_key`
- Rotate certificates regularly (e.g., Let’s Encrypt + `certbot` renewal).

### Git hygiene

- Do not store secrets or private keys in Git.
- Ensure `security/ssl/` is ignored by git (except `.gitkeep`) in `.gitignore`.

