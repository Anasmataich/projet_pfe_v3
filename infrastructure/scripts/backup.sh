#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════
# GED — Script de sauvegarde automatisée
# DSI — Ministère de l'Éducation Nationale du Maroc
#
# Usage :
#   ./backup.sh                     # Sauvegarde complète
#   ./backup.sh --db-only           # Base de données uniquement
#   ./backup.sh --storage-only      # MinIO uniquement
#   ./backup.sh --retention 30      # Garder 30 jours
#
# Crontab suggéré (quotidien à 2h) :
#   0 2 * * * /opt/ged/infrastructure/scripts/backup.sh >> /var/log/ged-backup.log 2>&1
# ═══════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

BACKUP_DIR="${BACKUP_DIR:-/opt/ged/backups}"
RETENTION_DAYS=14
DB_ONLY=false
STORAGE_ONLY=false
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"

# ── Parse arguments ─────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --db-only)       DB_ONLY=true; shift ;;
    --storage-only)  STORAGE_ONLY=true; shift ;;
    --retention)     RETENTION_DAYS="$2"; shift 2 ;;
    --backup-dir)    BACKUP_DIR="$2"; BACKUP_PATH="$BACKUP_DIR/$TIMESTAMP"; shift 2 ;;
    *) echo "Option inconnue : $1"; exit 1 ;;
  esac
done

# ── Load environment ────────────────────────
if [[ -f "$PROJECT_ROOT/.env" ]]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${POSTGRES_DB:-ged_db}"
DB_USER="${POSTGRES_USER:-ged_user}"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
err() { log "ERREUR: $*" >&2; }

# ── Pre-checks ──────────────────────────────
mkdir -p "$BACKUP_PATH"
log "═══ Sauvegarde GED démarrée ═══"
log "Destination : $BACKUP_PATH"

# ── Database backup ─────────────────────────
backup_database() {
  log "Sauvegarde PostgreSQL..."

  local dump_file="$BACKUP_PATH/ged_db_${TIMESTAMP}.sql.gz"

  docker exec ged-postgres pg_dump \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --no-owner \
    --no-privileges \
    --format=custom \
    --compress=6 \
    | gzip > "$dump_file"

  local size
  size=$(du -sh "$dump_file" | cut -f1)
  log "Base de données sauvegardée : $dump_file ($size)"
}

# ── MinIO/Storage backup ────────────────────
backup_storage() {
  log "Sauvegarde MinIO (stockage objets)..."

  local storage_dir="$BACKUP_PATH/minio"
  mkdir -p "$storage_dir"

  docker exec ged-minio mc alias set local http://localhost:9000 \
    "${MINIO_ROOT_USER:-minioadmin}" "${MINIO_ROOT_PASSWORD}" 2>/dev/null || true

  docker exec ged-minio mc mirror \
    local/"${STORAGE_BUCKET:-ged-documents}" \
    /tmp/minio-backup/ 2>/dev/null || true

  docker cp ged-minio:/tmp/minio-backup/. "$storage_dir/" 2>/dev/null || {
    log "Fallback: copie du volume Docker..."
    docker run --rm \
      -v ged-platforme_minio_data:/data:ro \
      -v "$storage_dir":/backup \
      alpine sh -c "cp -r /data/* /backup/ 2>/dev/null || true"
  }

  local size
  size=$(du -sh "$storage_dir" | cut -f1)
  log "Stockage sauvegardé : $storage_dir ($size)"
}

# ── Redis snapshot ──────────────────────────
backup_redis() {
  log "Sauvegarde Redis (snapshot AOF/RDB)..."

  docker exec ged-redis redis-cli -a "${REDIS_PASSWORD}" BGSAVE 2>/dev/null || true
  sleep 2

  docker cp ged-redis:/data/dump.rdb "$BACKUP_PATH/redis_dump.rdb" 2>/dev/null || {
    log "Redis RDB non disponible, skip."
  }

  log "Redis sauvegardé."
}

# ── Execute backups ─────────────────────────
if [[ "$STORAGE_ONLY" == "false" ]]; then
  backup_database
  backup_redis
fi

if [[ "$DB_ONLY" == "false" ]]; then
  backup_storage
fi

# ── Compress full backup ────────────────────
log "Compression de la sauvegarde..."
ARCHIVE="$BACKUP_DIR/ged_backup_${TIMESTAMP}.tar.gz"
tar -czf "$ARCHIVE" -C "$BACKUP_DIR" "$TIMESTAMP"
rm -rf "$BACKUP_PATH"

ARCHIVE_SIZE=$(du -sh "$ARCHIVE" | cut -f1)
log "Archive créée : $ARCHIVE ($ARCHIVE_SIZE)"

# ── Cleanup old backups ─────────────────────
log "Nettoyage des sauvegardes de plus de $RETENTION_DAYS jours..."
DELETED=$(find "$BACKUP_DIR" -name "ged_backup_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete -print | wc -l)
log "$DELETED archive(s) supprimée(s)."

# ── Summary ─────────────────────────────────
REMAINING=$(find "$BACKUP_DIR" -name "ged_backup_*.tar.gz" | wc -l)
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log "═══ Sauvegarde terminée ═══"
log "Archives restantes : $REMAINING"
log "Espace total : $TOTAL_SIZE"
log "Rétention : $RETENTION_DAYS jours"
