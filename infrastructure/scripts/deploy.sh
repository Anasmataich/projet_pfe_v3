#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# GED — Script de déploiement production
# DSI — Ministère de l'Éducation Nationale du Maroc
#
# Usage :
#   ./deploy.sh                  # Déploiement complet
#   ./deploy.sh --build          # Rebuild des images
#   ./deploy.sh --migrate        # Migrations DB uniquement
#   ./deploy.sh --rollback       # Retour au dernier tag
#   ./deploy.sh --status         # État des services
# ═══════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env"

ACTION="deploy"
BUILD_FLAG=""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── Parse arguments ─────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --build)     BUILD_FLAG="--build"; shift ;;
    --migrate)   ACTION="migrate"; shift ;;
    --rollback)  ACTION="rollback"; shift ;;
    --status)    ACTION="status"; shift ;;
    --help)      ACTION="help"; shift ;;
    *) echo -e "${RED}Option inconnue : $1${NC}"; exit 1 ;;
  esac
done

log()  { echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $*"; }
warn() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARN:${NC} $*"; }
err()  { echo -e "${RED}[$(date '+%H:%M:%S')] ERREUR:${NC} $*" >&2; }

# ── Pre-flight checks ──────────────────────
preflight() {
  log "Vérifications pré-déploiement..."

  if ! command -v docker &>/dev/null; then
    err "Docker n'est pas installé."
    exit 1
  fi

  if ! docker compose version &>/dev/null; then
    err "Docker Compose v2 n'est pas disponible."
    exit 1
  fi

  if [[ ! -f "$ENV_FILE" ]]; then
    err "Fichier .env introuvable. Copiez .env.example vers .env"
    exit 1
  fi

  if [[ ! -f "$COMPOSE_FILE" ]]; then
    err "Fichier docker-compose.prod.yml introuvable."
    exit 1
  fi

  # Vérifier les variables critiques
  set -a; source "$ENV_FILE"; set +a

  local missing=()
  for var in POSTGRES_PASSWORD REDIS_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET ENCRYPTION_KEY MINIO_ROOT_PASSWORD AI_SERVICE_API_KEY; do
    if [[ -z "${!var:-}" ]] || [[ "${!var}" == CHANGEME* ]]; then
      missing+=("$var")
    fi
  done

  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Variables non configurées dans .env :"
    for v in "${missing[@]}"; do
      echo "  - $v"
    done
    exit 1
  fi

  log "Vérifications OK."
}

# ── Deploy ──────────────────────────────────
do_deploy() {
  preflight

  log "═══ Déploiement GED — Production ═══"

  log "Arrêt des services existants..."
  docker compose -f "$COMPOSE_FILE" down --remove-orphans 2>/dev/null || true

  log "Construction et démarrage des services..."
  docker compose -f "$COMPOSE_FILE" up -d $BUILD_FLAG

  log "Attente du démarrage des services..."
  sleep 10

  log "Vérification de la santé des services..."
  do_status

  log "═══ Déploiement terminé ═══"
}

# ── Status ──────────────────────────────────
do_status() {
  log "État des services :"
  echo ""
  docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
  echo ""

  local services=("ged-postgres" "ged-redis" "ged-minio" "ged-backend" "ged-ai-service" "ged-frontend" "ged-nginx")
  local all_healthy=true

  for svc in "${services[@]}"; do
    if docker ps --filter "name=$svc" --filter "status=running" --format "{{.Names}}" | grep -q "$svc"; then
      local health
      health=$(docker inspect --format='{{.State.Health.Status}}' "$svc" 2>/dev/null || echo "n/a")
      if [[ "$health" == "healthy" || "$health" == "n/a" ]]; then
        echo -e "  ${GREEN}✓${NC} $svc (${health})"
      else
        echo -e "  ${YELLOW}⏳${NC} $svc (${health})"
        all_healthy=false
      fi
    else
      echo -e "  ${RED}✗${NC} $svc (arrêté)"
      all_healthy=false
    fi
  done

  echo ""
  if [[ "$all_healthy" == "true" ]]; then
    log "Tous les services sont opérationnels."
  else
    warn "Certains services ne sont pas encore prêts."
  fi
}

# ── Migrate ─────────────────────────────────
do_migrate() {
  preflight
  log "Exécution des migrations..."

  for migration in "$PROJECT_ROOT"/database/migrations/*.sql; do
    local name
    name=$(basename "$migration")
    log "Migration : $name"
    docker exec -i ged-postgres psql \
      -U "${POSTGRES_USER:-ged_user}" \
      -d "${POSTGRES_DB:-ged_db}" \
      < "$migration"
  done

  log "Migrations terminées."
}

# ── Rollback ────────────────────────────────
do_rollback() {
  preflight
  warn "Rollback vers les images précédentes..."

  docker compose -f "$COMPOSE_FILE" down --remove-orphans
  docker compose -f "$COMPOSE_FILE" up -d

  log "Rollback effectué. Vérifiez l'état :"
  do_status
}

# ── Help ────────────────────────────────────
do_help() {
  cat <<'HELP'
GED — Script de déploiement

Usage:
  ./deploy.sh                  Déploiement complet (production)
  ./deploy.sh --build          Rebuild les images Docker
  ./deploy.sh --migrate        Exécuter les migrations SQL
  ./deploy.sh --rollback       Rollback (redémarrage)
  ./deploy.sh --status         Afficher l'état des services
  ./deploy.sh --help           Afficher cette aide

Prérequis:
  - Docker et Docker Compose v2
  - Fichier .env configuré (cp .env.example .env)
  - Certificats SSL dans security/ssl/ (production)
HELP
}

# ── Main ────────────────────────────────────
case "$ACTION" in
  deploy)   do_deploy ;;
  migrate)  do_migrate ;;
  rollback) do_rollback ;;
  status)   do_status ;;
  help)     do_help ;;
esac
