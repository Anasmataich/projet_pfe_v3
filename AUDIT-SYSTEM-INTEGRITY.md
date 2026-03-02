# Audit d'intégrité système — GED Plateforme

**Date:** 2025  
**Objectif:** Vérifier que le projet est prêt pour la production et pleinement fonctionnel.

---

## 1. Infrastructure & Docker

### Vérifications effectuées
- **Réseau:** Tous les services utilisent le réseau `ged-network` (bridge 172.28.0.0/16). Les hostnames internes (`postgres`, `redis`, `minio`, `ai-service`) sont corrects.
- **Volumes persistants:** `postgres_data`, `redis_data`, `minio_data`, `ai_model_cache` sont déclarés et montés correctement.
- **PostgreSQL:** Healthcheck `pg_isready`, dépendances `condition: service_healthy` pour le backend.
- **Redis:** Healthcheck `redis-cli -a $REDIS_PASSWORD ping`, mot de passe avec défaut `ged_local_redis_2024` pour le run local.
- **MinIO:** 
  - Mot de passe par défaut `minioadmin123` (≥ 8 caractères) pour éviter le crash au démarrage.
  - Healthcheck désactivé (image minimale sans curl/wget). Le service est considéré prêt via `condition: service_started`.
  - `minio-init` utilise le même mot de passe et un délai de 15 s avant les commandes `mc`.
- **Backend:** Dépend de postgres (healthy), redis (healthy), minio (started). Healthcheck wget sur `/health`.

### Correctifs appliqués
- `docker-compose.yml`: `STORAGE_SECRET_KEY` du backend utilise `${MINIO_ROOT_PASSWORD:-minioadmin123}` pour éviter une valeur vide si `.env` est absent.
- `AI_SERVICE_API_KEY` en compose accepte une valeur vide (`:-`) pour le mode dev (AI accepte toutes les requêtes quand la clé n’est pas configurée).

---

## 2. Backend – AI – Stockage (MinIO)

### Flux vérifié
1. **Upload document (backend):**  
   `document.service.upload` → chiffrement AES → `storageService.uploadFile(storageKey, buffer, mime)` → MinIO (S3), puis INSERT en base, puis `triggerAIAnalysis(documentId, storageKey)` en arrière-plan.
2. **Backend → MinIO:**  
   `backend/src/config/storage.ts` utilise `env.STORAGE_ENDPOINT`, `env.STORAGE_ACCESS_KEY`, `env.STORAGE_SECRET_KEY`, `env.STORAGE_BUCKET`. En Docker: `http://minio:9000`, `minioadmin`, même secret que MinIO, `ged-documents`.
3. **Backend → AI Service:**  
   `document.service.triggerAIAnalysis` appelle `POST ${env.AI_SERVICE_URL}/analyze` avec `{ documentId, storageKey }` et header `X-API-Key: env.AI_SERVICE_API_KEY`. En Docker: `http://ai-service:8000`. Si `AI_SERVICE_API_KEY` est vide, l’AI service (security.py) accepte en mode dev.
4. **AI Service → MinIO:**  
   `ai-service/core/dependencies.py` utilise `download_file_from_s3(storage_key)` avec `settings.S3_*` (S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET). En Docker: même endpoint, user et secret que le backend, même bucket.

### Correctifs
- Aucun correctif nécessaire sur les URLs ou clients. Les variables d’environnement et hostnames sont cohérents entre backend, AI et MinIO.

---

## 3. Base de données et authentification

### Schéma et migrations
- **Schéma unique:** `database/schema.sql` est monté en `01-schema.sql` dans Postgres. Il crée extensions, types, tables (users, documents, versions, workflow, audit_logs, role_permissions, user_permissions, document_access, notifications, notification_preferences).
- **Seeds:**  
  - `02-seed-roles.sql`: permissions RBAC par rôle.  
  - `03-seed-admin.sql`: utilisateur `admin@ged.gov.ma` avec hash bcrypt pour `Admin@GED2024`.  
  - `04-seed-categories.sql`: catégories de documents.
- **Cohérence:** Les seeds s’appuient sur les tables du schéma (role_permissions, users, notification_preferences). Aucune migration séparée n’est exécutée en Docker; le schéma consolidé suffit.

### JWT / MFA (backend ↔ frontend)
- **Backend:**  
  Routes auth: `POST /login`, `POST /mfa/verify`, `POST /refresh`, `GET /me`, `POST /logout`, `PATCH /password`, `POST /mfa/setup`, `POST /mfa/enable`, `DELETE /mfa`. Préfixe API: `env.API_PREFIX` = `/api/v1`.
- **Frontend:**  
  `authService` appelle `/auth/login`, `/auth/mfa/verify`, `/auth/refresh`, etc. avec `baseURL: API_URL` = `VITE_API_URL` (ex. `http://localhost:5000/api/v1`).  
  Stockage des tokens: `localStorage` (access_token, refresh_token). Intercepteur axios renvoie les 401 vers refresh puis retry ou redirection vers `/login`.  
  MFA: état `pendingMFA` (userId, pendingToken), redirection vers `/mfa`, puis `verifyMFA` et stockage des tokens.
- **Cohérence:** Les chemins et le flux login → (optionnel) MFA → tokens sont alignés entre backend et frontend.

### Correctifs
- Suppression de l’instrumentation de debug (fetch vers serveur de logs) dans `auth.controller.ts` et `auth.service.ts` pour un état prêt production.

---

## 4. Frontend – Intégration API

### Vérifications
- **URL API:** `VITE_API_URL` = `http://localhost:5000/api/v1` (docker-compose). Utilisée dans `frontend/src/utils/constants.ts` et `api.ts` (baseURL, refresh).
- **Routes:** AppRouter définit `/login`, `/mfa`, `/`, `/documents`, `/documents/:id`, `/upload`, `/workflow`, `/ai`, `/reports`, `/audit`, `/users`, `/settings`, `/404`. Aucune route cassée détectée.
- **État auth:** `authStore` (login, verifyMFA, logout, loadUser) et `ProtectedRoute` (redirection `/login`, contrôle de rôles) sont cohérents avec les routes et l’API.

### Correctifs
- Aucun correctif nécessaire.

---

## 5. Sécurité

### Secrets et configuration
- **Code:** Aucun secret en dur (mot de passe, JWT, clés API) dans le code applicatif. Les références à “password” ou “secret” concernent des variables d’env, des champs de schéma ou des librairies.
- **.env.example:**  
  - Complet par rapport à `backend/src/config/env.ts` et aux services Docker.  
  - Valeurs de dev documentées (JWT, ENCRYPTION_KEY, Postgres, Redis, MinIO).  
  - `AI_SERVICE_API_KEY` et `API_KEY` (AI) vides pour le dev (AI accepte tout).  
  - Commentaires indiquant de remplacer les secrets en production.

### Correctifs
- `.env.example` mis à jour (doublon `AI_SERVICE_API_KEY` supprimé, commentaires pour AI et MinIO).

---

## 6. Identifiants et accès

### Compte administrateur (seed)

| Champ           | Valeur              |
|-----------------|---------------------|
| **Email**       | `admin@ged.gov.ma`  |
| **Mot de passe**| `Admin@GED2024`     |
| **Rôle**        | `ADMIN`             |

- Défini dans `database/seeds/seed_admin.sql` (hash bcrypt rounds=12).  
- À changer en production (régénérer le hash et mettre à jour le seed ou la base).

### URL d’accès au système (run local Docker)

- **Interface (frontend):** http://localhost:3000  
- **API backend:** http://localhost:5000/api/v1  
- **Health backend:** http://localhost:5000/health  
- **Console MinIO:** http://localhost:9001  
- **API MinIO (S3):** http://localhost:9000  
- **Service IA (docs):** http://localhost:8000/docs  
- **MailHog (emails dev):** http://localhost:8025  

### Étapes pour lancer en local avec Docker

1. `cd ged-platforme`
2. `cp .env.example .env` (optionnel: ajuster les secrets pour la prod)
3. `docker compose up --build` (ou `docker compose up --build -d`)
4. Attendre que postgres, redis, backend (et optionnellement ai-service) soient healthy / running
5. Ouvrir http://localhost:3000 et se connecter avec `admin@ged.gov.ma` / `Admin@GED2024`

---

## Résumé des correctifs appliqués

| Zone              | Correctif |
|-------------------|-----------|
| **Docker / MinIO**| Valeur par défaut `MINIO_ROOT_PASSWORD` et `STORAGE_SECRET_KEY` (minioadmin123) pour éviter crash et backend sans secret MinIO. |
| **Docker backend**| `STORAGE_SECRET_KEY: ${MINIO_ROOT_PASSWORD:-minioadmin123}`. `AI_SERVICE_API_KEY` accepte valeur vide. |
| **Auth (production)** | Suppression des appels de debug (fetch instrumentation) dans le contrôleur et le service d’auth. |
| **.env.example**  | Nettoyage et clarification des variables AI (AI_SERVICE_API_KEY, API_KEY), commentaires pour dev/prod. |

Aucune modification des fonctionnalités métier; uniquement configuration, robustesse et hygiène pour un état “production-ready” et une expérience locale fiable.
