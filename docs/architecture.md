# Architecture Technique — Plateforme GED

**DSI — Ministère de l'Éducation Nationale du Maroc**

---

## 1. Vue d'ensemble

La plateforme GED est un système de gestion documentaire intelligent et sécurisé conçu pour le Ministère de l'Éducation Nationale du Maroc. Elle permet la dématérialisation, le classement automatique, la validation par workflow et la recherche sémantique de documents administratifs.

```
┌───────────────────────────────────────────────────────────┐
│                        Navigateur                         │
│                    (React + TypeScript)                    │
└──────────────────────────┬────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼────────────────────────────────┐
│                    Nginx (Reverse Proxy)                   │
│              SSL/TLS · Rate Limiting · Gzip               │
└──────┬───────────────────┬────────────────────┬───────────┘
       │ /api/*            │ /                  │
       ▼                   ▼                    │
┌──────────────┐    ┌──────────────┐            │
│   Backend    │    │   Frontend   │            │
│  (Express)   │    │   (Nginx)    │            │
│  Node.js     │    │  React SPA   │            │
└──┬───┬───┬───┘    └──────────────┘            │
   │   │   │                                    │
   │   │   └──────── HTTP (interne) ────────────┘
   │   │                                  ┌─────────────┐
   │   └────── HTTP (interne) ───────────►│ AI Service  │
   │                                      │  (FastAPI)  │
   │                                      │  Python     │
   │                                      └──────┬──────┘
   │                                             │
   ▼                    ▼                        ▼
┌────────┐      ┌────────────┐           ┌────────────┐
│  Post  │      │   Redis    │           │   MinIO    │
│ greSQL │      │  (Cache)   │           │   (S3)     │
└────────┘      └────────────┘           └────────────┘
```

## 2. Principes architecturaux

### Clean Architecture

Chaque service respecte le principe de séparation des préoccupations :

```
Routes (HTTP) → Controllers → Services (Logique métier) → Repositories (Data)
      ↓              ↓              ↓                          ↓
  Validation    Orchestration   Règles métier          Accès base de données
```

### SOLID

| Principe | Application |
|----------|-------------|
| **S** — Single Responsibility | Chaque module a une seule responsabilité (auth, documents, workflow) |
| **O** — Open/Closed | Les middlewares sont extensibles sans modifier le code existant |
| **L** — Liskov Substitution | Les services implémentent des interfaces cohérentes |
| **I** — Interface Segregation | Les types TypeScript et Pydantic sont spécifiques à chaque contexte |
| **D** — Dependency Inversion | Les services dépendent d'abstractions (interfaces) pas d'implémentations |

## 3. Services

### 3.1 Backend (Node.js / Express)

**Port** : 5000 | **Langage** : TypeScript | **Runtime** : Node.js 20

Responsabilités :
- API RESTful (CRUD documents, utilisateurs, workflow)
- Authentification JWT + MFA (TOTP)
- Contrôle d'accès RBAC
- Upload/download de fichiers via S3
- Journalisation d'audit
- Communication avec le microservice IA

Structure :
```
backend/src/
├── config/        # Configuration (DB, Redis, JWT, S3, env)
├── middlewares/    # Auth, rate limit, sanitization, audit, upload
├── modules/       # Modules métier
│   ├── auth/      # Authentification & MFA
│   ├── users/     # Gestion utilisateurs
│   ├── documents/ # Documents & versioning
│   ├── workflow/  # Circuit de validation
│   ├── audit/     # Logs d'audit
│   ├── permissions/ # RBAC
│   └── notifications/ # Email & notifications
├── shared/        # AppError, ApiResponse, enums
└── utils/         # Encryption, logger, fichiers
```

### 3.2 AI Service (Python / FastAPI)

**Port** : 8000 | **Langage** : Python 3.11 | **Framework** : FastAPI

Responsabilités :
- Classification automatique (zero-shot NLI)
- Extraction d'entités nommées (spaCy)
- Résumé automatique (seq2seq)
- OCR (Tesseract)
- Recherche sémantique (Sentence-Transformers)
- Détection d'anomalies (heuristiques + ML)

Pipeline IA :
```
Document → S3 Download → Text Extraction → Language Detection
    → Classification → NER → Summarization → Anomaly Detection
    → AIResponse
```

### 3.3 Frontend (React / Vite)

**Port** : 3000 | **Framework** : React 18 + TypeScript + Tailwind CSS

Structure :
- 83 composants React organisés par domaine
- 13 pages (Login, Dashboard, Documents, Workflow, etc.)
- Zustand pour le state management
- Axios pour les appels API

### 3.4 Nginx (Reverse Proxy)

**Ports** : 80 (HTTP → redirect), 443 (HTTPS)

Responsabilités :
- Terminaison SSL/TLS (TLS 1.2/1.3)
- Rate limiting par zone (API, auth, upload)
- Compression gzip
- Headers de sécurité (HSTS, X-Frame-Options, CSP)
- Routage vers les services internes

## 4. Base de données

**PostgreSQL 16** avec les extensions `uuid-ossp` et `pgcrypto`.

Tables principales :
| Table | Description |
|-------|-------------|
| `users` | Comptes utilisateurs avec rôles et MFA |
| `documents` | Métadonnées des documents |
| `document_versions` | Historique des versions |
| `workflow_instances` | Instances de validation |
| `workflow_comments` | Commentaires de workflow |
| `audit_logs` | Journal d'audit complet |
| `role_permissions` | Permissions par rôle |
| `user_permissions` | Permissions spécifiques utilisateur |
| `document_access` | ACL par document |
| `notifications` | Notifications in-app |

## 5. Sécurité

### Authentification
- JWT (HS256) avec access token (15 min) et refresh token (7 jours)
- Rotation des token families avec détection de réutilisation
- MFA optionnel (TOTP via Speakeasy)
- Verrouillage de compte après 5 tentatives

### Autorisation (RBAC)
6 rôles : ADMIN, CADRE, INSPECTEUR, RH, COMPTABLE, CONSULTANT

### Chiffrement
- AES-256-GCM pour les données sensibles
- Chiffrement au repos (S3 SSE-AES256)
- HTTPS obligatoire en production

### Protection OWASP
- XSS : sanitization des entrées + CSP
- CSRF : SameSite cookies
- Injection : requêtes paramétrées (pg)
- Rate limiting : express-rate-limit + Nginx zones
- File upload : validation MIME + magic bytes

## 6. Infrastructure

```
docker-compose.prod.yml
├── postgres    (PostgreSQL 16)
├── redis       (Redis 7, cache + sessions)
├── minio       (MinIO, stockage S3)
├── backend     (Node.js production)
├── ai-service  (FastAPI production)
├── frontend    (React build via Nginx)
└── nginx       (Reverse proxy SSL)
```

### Réseau
Tous les services communiquent sur un réseau Docker interne (`ged-internal`). Seul Nginx expose les ports 80/443 vers l'extérieur.

### Volumes persistants
- `postgres_data` — données PostgreSQL
- `redis_data` — persistance Redis (AOF)
- `minio_data` — fichiers stockés
- `ai_model_cache` — modèles IA téléchargés

## 7. Monitoring

- **Health checks** : chaque service expose `/health`
- **Logs structurés** : Winston (backend), Loguru (AI), Nginx access logs
- **Audit trail** : table `audit_logs` avec IP, user-agent, détails
- **Docker health checks** : redémarrage automatique si unhealthy
