# Audit de connectivité inter-services (sans UI)

Vérification de la santé technique des 7 conteneurs et des liens **Backend → PostgreSQL, Redis, MinIO, AI-Service, MailHog** ainsi que du réseau Docker.

## Commande d’audit

À exécuter **à la racine du projet** (avec la stack Docker démarrée) :

```bash
docker compose exec backend npm run audit:connectivity
```

Ou directement avec ts-node :

```bash
docker compose exec backend npx ts-node src/scripts/audit-connectivity.ts
```

En local (depuis `backend/`, avec `.env` ou variables d’environnement configurées) :

```bash
cd backend && npx ts-node src/scripts/audit-connectivity.ts
```

## Ce qui est vérifié

| Lien | Vérification |
|------|----------------|
| **Backend → PostgreSQL** | Pool actif, `healthCheck()` + `SELECT NOW()` |
| **Backend → Redis** | SET/GET/DEL (rate limiting) + blacklist tokens |
| **Backend → MinIO** | `HeadBucket` + génération d’une Signed URL (S3) |
| **Backend → AI-Service** | GET `http://ai-service:8000/health` (FastAPI prêt, modèles) |
| **Backend → MailHog** | Transport SMTP vérifié (host:port, sans auth en dev) |
| **Réseau Docker** | Implicite : résolution des noms `postgres`, `redis`, `minio`, `ai-service`, `mailhog` depuis le conteneur backend |

## En cas d’échec

- **PostgreSQL** : Vérifier `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (`.env` / `docker-compose.yml`). Le backend doit avoir `depends_on: postgres (service_healthy)`.
- **Redis** : Vérifier `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`. Le backend doit avoir `depends_on: redis (service_healthy)`.
- **MinIO** : Vérifier `STORAGE_ENDPOINT` (ex. `http://minio:9000`), `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`. Le service `minio-init` doit avoir créé le bucket au démarrage.
- **AI-Service** : Vérifier `AI_SERVICE_URL=http://ai-service:8000`. Le backend a `depends_on: ai-service (service_healthy)` pour démarrer après le service IA.
- **MailHog** : Vérifier `SMTP_HOST=mailhog`, `SMTP_PORT=1025`. Aucune authentification en dev (MailHog accepte tout sur 1025). Le service email utilise désormais `SMTP_PASSWORD` (ou `SMTP_PASS`) si une auth est configurée.

## Corrections appliquées

- **Email (MailHog)** : Le service email accepte un transport SMTP sans authentification (host + port uniquement) pour MailHog ; utilisation de `SMTP_PASSWORD` (avec repli sur `SMTP_PASS`).
- **Docker** : Le backend dépend de `ai-service` (healthy) et de `mailhog` (started) pour garantir que les services sont disponibles au démarrage.
