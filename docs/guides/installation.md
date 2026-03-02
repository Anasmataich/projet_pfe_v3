# Guide d'Installation — Plateforme GED

## Prérequis

| Outil | Version minimale | Vérification |
|-------|-----------------|-------------|
| Docker | 24.0+ | `docker --version` |
| Docker Compose | v2.20+ | `docker compose version` |
| Git | 2.40+ | `git --version` |
| Node.js (dev local) | 20 LTS | `node --version` |
| Python (dev local) | 3.11+ | `python --version` |

## Installation rapide (Docker)

### 1. Cloner le dépôt

```bash
git clone https://github.com/dsi-men/ged-platforme.git
cd ged-platforme
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
```

Editez `.env` et remplacez tous les `CHANGEME_*` par des valeurs sécurisées :

```bash
# Générer les secrets automatiquement
node -e "console.log('JWT_ACCESS_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('AI_SERVICE_API_KEY=' + require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Lancer la plateforme

```bash
docker compose up -d
```

### 4. Vérifier le démarrage

```bash
# État des services
docker compose ps

# Logs
docker compose logs -f backend
docker compose logs -f ai-service

# Health checks
curl http://localhost:5000/health
curl http://localhost:8000/health
```

### 5. Accéder aux services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Interface React |
| Backend API | http://localhost:5000/api/v1 | API REST |
| AI Service | http://localhost:8000/docs | Documentation FastAPI |
| MinIO Console | http://localhost:9001 | Gestion du stockage |
| MailHog | http://localhost:8025 | Capture d'emails (dev) |
| PostgreSQL | localhost:5432 | Base de données |
| Redis | localhost:6379 | Cache |

### 6. Compte administrateur par défaut

```
Email :    admin@education.gov.ma
Mot de passe : Admin@GED2024!
```

> Changez ce mot de passe immédiatement après la première connexion.

---

## Installation locale (développement)

### Backend

```bash
cd backend
npm install
npm run dev
```

Le serveur démarre sur `http://localhost:5000`.

### AI Service

```bash
cd ai-service
python -m venv venv
source venv/bin/activate       # Linux/macOS
# ou : venv\Scripts\activate   # Windows

pip install -r requirements.txt
python -m spacy download fr_core_news_md

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Le serveur Vite démarre sur `http://localhost:3000`.

---

## Services externes requis

### PostgreSQL (local)

```bash
# Via Docker (recommandé)
docker run -d --name ged-postgres \
  -e POSTGRES_DB=ged_db \
  -e POSTGRES_USER=ged_user \
  -e POSTGRES_PASSWORD=votre_mot_de_passe \
  -p 5432:5432 \
  postgres:16-alpine

# Initialiser le schéma
psql -h localhost -U ged_user -d ged_db -f database/schema.sql
psql -h localhost -U ged_user -d ged_db -f database/seeds/seed_roles.sql
psql -h localhost -U ged_user -d ged_db -f database/seeds/seed_admin.sql
```

### Redis (local)

```bash
docker run -d --name ged-redis \
  -p 6379:6379 \
  redis:7-alpine redis-server --requirepass votre_mot_de_passe
```

### MinIO (local)

```bash
docker run -d --name ged-minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=votre_mot_de_passe \
  -p 9000:9000 -p 9001:9001 \
  minio/minio server /data --console-address ":9001"

# Créer le bucket
docker exec ged-minio mc alias set local http://localhost:9000 minioadmin votre_mot_de_passe
docker exec ged-minio mc mb local/ged-documents
```

---

## Résolution des problèmes

### Le backend ne démarre pas

1. Vérifiez que PostgreSQL et Redis sont accessibles
2. Vérifiez les variables d'environnement dans `.env`
3. Consultez les logs : `docker compose logs backend`

### L'AI service est en mode dégradé

1. Vérifiez que MinIO est démarré et le bucket existe
2. En mode développement, le service utilise des modèles mock
3. En production, les modèles Transformers sont téléchargés au premier démarrage (cela peut prendre plusieurs minutes)

### Erreurs de permission MinIO

```bash
# Recréer le bucket
docker exec ged-minio mc mb --ignore-existing local/ged-documents
docker exec ged-minio mc anonymous set none local/ged-documents
```
