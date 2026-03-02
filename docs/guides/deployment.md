# Guide de Déploiement — Plateforme GED

## Prérequis serveur

| Élément | Minimum | Recommandé |
|---------|---------|-----------|
| CPU | 4 vCPU | 8 vCPU |
| RAM | 8 Go | 16 Go |
| Stockage | 100 Go SSD | 500 Go SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| Docker | 24.0+ | Dernière stable |
| Docker Compose | v2.20+ | Dernière stable |

## 1. Préparation du serveur

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# Installation de Docker Compose v2
sudo apt install docker-compose-plugin
```

## 2. Déploiement

### 2.1 Cloner et configurer

```bash
sudo mkdir -p /opt/ged
cd /opt/ged
git clone https://github.com/dsi-men/ged-platforme.git .

# Configurer l'environnement
cp .env.example .env
nano .env
```

Variables critiques à configurer :

```bash
NODE_ENV=production

# Secrets (générer avec openssl rand -hex 64)
JWT_ACCESS_SECRET=<64 bytes hex>
JWT_REFRESH_SECRET=<64 bytes hex different>
ENCRYPTION_KEY=<32 bytes hex>
AI_SERVICE_API_KEY=<32 bytes hex>

# Mots de passe forts
POSTGRES_PASSWORD=<strong password>
REDIS_PASSWORD=<strong password>
MINIO_ROOT_PASSWORD=<strong password>

# Domaine
CORS_ORIGIN=https://ged.education.gov.ma
VITE_API_URL=https://ged.education.gov.ma/api/v1
```

### 2.2 Certificats SSL

#### Option A : Let's Encrypt (recommandé)

```bash
sudo apt install certbot
sudo certbot certonly --standalone -d ged.education.gov.ma

# Copier les certificats
sudo cp /etc/letsencrypt/live/ged.education.gov.ma/fullchain.pem security/ssl/
sudo cp /etc/letsencrypt/live/ged.education.gov.ma/privkey.pem security/ssl/
```

Renouvellement automatique :
```bash
echo "0 3 * * * certbot renew --post-hook 'docker exec ged-nginx nginx -s reload'" | sudo tee -a /etc/crontab
```

#### Option B : Certificat auto-signé (test)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout security/ssl/privkey.pem \
  -out security/ssl/fullchain.pem \
  -subj "/CN=ged.education.gov.ma"
```

### 2.3 Lancer la plateforme

```bash
# Via le script de déploiement
chmod +x infrastructure/scripts/deploy.sh
./infrastructure/scripts/deploy.sh --build

# Ou manuellement
docker compose -f docker-compose.prod.yml up -d --build
```

### 2.4 Exécuter les migrations

```bash
./infrastructure/scripts/deploy.sh --migrate
```

### 2.5 Vérifier le déploiement

```bash
./infrastructure/scripts/deploy.sh --status

# Test HTTPS
curl -k https://ged.education.gov.ma/health
```

## 3. Sauvegardes

### Configuration automatique

```bash
chmod +x infrastructure/scripts/backup.sh

# Sauvegarde quotidienne à 2h du matin
echo "0 2 * * * /opt/ged/infrastructure/scripts/backup.sh >> /var/log/ged-backup.log 2>&1" | sudo tee -a /etc/crontab
```

### Sauvegarde manuelle

```bash
./infrastructure/scripts/backup.sh                # Complète
./infrastructure/scripts/backup.sh --db-only       # DB uniquement
./infrastructure/scripts/backup.sh --retention 30  # 30 jours de rétention
```

### Restauration

```bash
# Restaurer la base de données
tar xzf /opt/ged/backups/ged_backup_YYYYMMDD_HHMMSS.tar.gz
docker exec -i ged-postgres pg_restore \
  -U ged_user -d ged_db --clean --if-exists \
  < YYYYMMDD_HHMMSS/ged_db_*.sql.gz
```

## 4. Mise à jour

```bash
cd /opt/ged

# Sauvegarder avant mise à jour
./infrastructure/scripts/backup.sh

# Mettre à jour le code
git pull origin main

# Redéployer
./infrastructure/scripts/deploy.sh --build

# Exécuter les nouvelles migrations
./infrastructure/scripts/deploy.sh --migrate
```

## 5. Monitoring

### Logs

```bash
# Tous les services
docker compose -f docker-compose.prod.yml logs -f

# Service spécifique
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f ai-service

# Logs Nginx
docker exec ged-nginx tail -f /var/log/nginx/access.log
docker exec ged-nginx tail -f /var/log/nginx/error.log
```

### Métriques

```bash
# Utilisation des ressources
docker stats

# Espace disque des volumes
docker system df -v
```

### Health checks

```bash
# Backend
curl -s https://ged.education.gov.ma/health | jq

# AI Service (interne)
docker exec ged-ai-service curl -s http://localhost:8000/health | jq

# PostgreSQL
docker exec ged-postgres pg_isready

# Redis
docker exec ged-redis redis-cli -a $REDIS_PASSWORD ping
```

## 6. Sécurité en production

### Checklist

- [ ] Tous les `CHANGEME_*` remplacés dans `.env`
- [ ] `NODE_ENV=production`
- [ ] Certificats SSL valides
- [ ] Ports internes non exposés (seul 80/443 via Nginx)
- [ ] Firewall configuré (ufw)
- [ ] Sauvegardes automatiques activées
- [ ] Logs rotatés
- [ ] Mot de passe admin par défaut changé

### Firewall

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### Rotation des logs Docker

Créez `/etc/docker/daemon.json` :
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

```bash
sudo systemctl restart docker
```

## 7. Rollback

En cas de problème après une mise à jour :

```bash
# Arrêter les services
docker compose -f docker-compose.prod.yml down

# Revenir à la version précédente
git checkout <commit-hash-precedent>

# Redéployer
docker compose -f docker-compose.prod.yml up -d --build

# Restaurer la DB si nécessaire
# (voir section Restauration)
```
