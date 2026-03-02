#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
# health-check.sh — Vérifie que tous les services GED sont opérationnels
#
# Usage:
#   bash scripts/health-check.sh              # HTTP + DB checks
#   bash scripts/health-check.sh --compose    # + Docker container status
#
# Works inside Linux containers and on the host machine.
# ═══════════════════════════════════════════════════════════════════════

set -uo pipefail
# Note: not using set -e so individual check failures don't abort the script

# ── Colours ───────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m'

# ── Configuration ─────────────────────────────────────────────────────
BACKEND_URL="${BACKEND_URL:-http://localhost:5000}"
AI_URL="${AI_URL:-http://localhost:8000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"
MINIO_URL="${MINIO_URL:-http://localhost:9000}"
MAILHOG_URL="${MAILHOG_URL:-http://localhost:8025}"

DB_CONTAINER="${DB_CONTAINER:-ged-postgres}"
REDIS_CONTAINER="${REDIS_CONTAINER:-ged-redis}"
DB_NAME="${POSTGRES_DB:-ged_db}"
DB_USER="${POSTGRES_USER:-ged_user}"
REDIS_PASS="${REDIS_PASSWORD:-}"

TIMEOUT=5
ERRORS=0
PASSED=0

# ── Helpers ───────────────────────────────────────────────────────────
print_check() {
  local status="$1"  # PASS, FAIL, WARN
  local label="$2"
  local detail="${3:-}"

  case "$status" in
    PASS)
      printf "  [${GREEN}OK${NC}]   %-34s %s\n" "$label" "$detail"
      PASSED=$((PASSED + 1))
      ;;
    FAIL)
      printf "  [${RED}FAIL${NC}] %-34s ${RED}%s${NC}\n" "$label" "$detail"
      ERRORS=$((ERRORS + 1))
      ;;
    WARN)
      printf "  [${YELLOW}WARN${NC}] %-34s ${YELLOW}%s${NC}\n" "$label" "$detail"
      ;;
  esac
}

# ── HTTP health check (expects 200) ──────────────────────────────────
check_http() {
  local name="$1"
  local url="$2"
  local expected="${3:-}"

  local http_code body
  body=$(curl -s --max-time "$TIMEOUT" -o /dev/stdout -w "\n%{http_code}" "$url" 2>/dev/null) || true
  http_code=$(echo "$body" | tail -1)
  body=$(echo "$body" | sed '$d')

  if [[ "$http_code" == "200" ]]; then
    if [[ -n "$expected" ]] && ! echo "$body" | grep -qi "$expected"; then
      print_check "WARN" "$name" "Response missing '$expected' — $url"
    else
      print_check "PASS" "$name" "$url"
    fi
  elif [[ "$http_code" =~ ^[0-9]+$ ]] && [[ "$http_code" -gt 0 ]]; then
    print_check "WARN" "$name" "HTTP $http_code — $url (service is up)"
  else
    print_check "FAIL" "$name" "Unreachable — $url"
  fi
}

# ── Protected route check (expects 401) ──────────────────────────────
check_protected_route() {
  local name="$1"
  local url="$2"

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" 2>/dev/null) || true

  if [[ "$http_code" == "401" ]]; then
    print_check "PASS" "$name" "401 Unauthorized (correct)"
  elif [[ "$http_code" == "200" ]]; then
    print_check "WARN" "$name" "Expected 401, got 200 — auth middleware issue"
  elif [[ "$http_code" =~ ^[0-9]+$ ]] && [[ "$http_code" -gt 0 ]]; then
    print_check "WARN" "$name" "Expected 401, got $http_code — $url"
  else
    print_check "FAIL" "$name" "Backend unreachable — $url"
  fi
}

# ── Docker container check ───────────────────────────────────────────
check_docker_container() {
  local name="$1"
  local container="$2"

  if ! command -v docker &>/dev/null; then
    print_check "WARN" "$name" "docker not available — skipped"
    return
  fi

  if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container}$"; then
    local status health
    status=$(docker inspect --format='{{.State.Status}}' "$container" 2>/dev/null || echo "unknown")
    health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container" 2>/dev/null || echo "none")

    if [[ "$status" == "running" && ("$health" == "healthy" || "$health" == "none") ]]; then
      print_check "PASS" "$name" "running / $health"
    elif [[ "$status" == "running" ]]; then
      print_check "WARN" "$name" "running / $health"
    else
      print_check "FAIL" "$name" "status: $status"
    fi
  else
    print_check "WARN" "$name" "Container '$container' not found"
  fi
}

# ── PostgreSQL connection check ──────────────────────────────────────
check_database() {
  if ! command -v docker &>/dev/null; then
    print_check "WARN" "PostgreSQL Connection" "docker not available — skipped"
    return
  fi

  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then
    print_check "WARN" "PostgreSQL Connection" "Container '$DB_CONTAINER' not running"
    return
  fi

  if docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" &>/dev/null; then
    print_check "PASS" "PostgreSQL Connection" "$DB_USER@$DB_NAME (pg_isready)"
  else
    print_check "FAIL" "PostgreSQL Connection" "pg_isready failed inside $DB_CONTAINER"
  fi

  local table_count
  table_count=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
    -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | tr -d '[:space:]') || true

  if [[ "$table_count" =~ ^[0-9]+$ ]] && [[ "$table_count" -gt 0 ]]; then
    print_check "PASS" "PostgreSQL Schema" "$table_count tables in public schema"
  elif [[ "$table_count" == "0" ]]; then
    print_check "WARN" "PostgreSQL Schema" "0 tables — migrations may not have run"
  else
    print_check "WARN" "PostgreSQL Schema" "Could not query tables"
  fi
}

# ── Redis connection check ───────────────────────────────────────────
check_redis() {
  if ! command -v docker &>/dev/null; then
    print_check "WARN" "Redis Connection" "docker not available — skipped"
    return
  fi

  if ! docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${REDIS_CONTAINER}$"; then
    print_check "WARN" "Redis Connection" "Container '$REDIS_CONTAINER' not running"
    return
  fi

  local pong
  if [[ -n "$REDIS_PASS" ]]; then
    pong=$(docker exec "$REDIS_CONTAINER" redis-cli -a "$REDIS_PASS" --no-auth-warning ping 2>/dev/null) || true
  else
    pong=$(docker exec "$REDIS_CONTAINER" redis-cli ping 2>/dev/null) || true
  fi

  if [[ "$pong" == *"PONG"* ]]; then
    print_check "PASS" "Redis Connection" "PONG received"
  else
    print_check "FAIL" "Redis Connection" "No PONG — check REDIS_PASSWORD"
  fi
}

# ══════════════════════════════════════════════════════════════════════
# Main
# ══════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}================================================================${NC}"
echo -e "${CYAN}  GED Platform — Health Check${NC}"
echo -e "${CYAN}  $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${CYAN}================================================================${NC}"
echo ""

# ── 1. HTTP Services ─────────────────────────────────────────────────
echo -e "  ${CYAN}HTTP Services${NC}"
echo -e "  ${GRAY}─────────────────────────────────────────────${NC}"
check_http "Backend API (port 5000)"   "$BACKEND_URL/health"            "status"
check_http "AI Service (port 8000)"    "$AI_URL/health"                 "status"
check_http "AI Swagger Docs"           "$AI_URL/docs"                   "swagger"
check_http "Frontend (port 3000)"      "$FRONTEND_URL"                  ""
check_http "MinIO Health (port 9000)"  "$MINIO_URL/minio/health/live"   ""
check_http "MailHog UI (port 8025)"    "$MAILHOG_URL"                   ""
echo ""

# ── 2. API Security ──────────────────────────────────────────────────
echo -e "  ${CYAN}API Security (expect 401 without token)${NC}"
echo -e "  ${GRAY}─────────────────────────────────────────────${NC}"
check_protected_route "GET /api/v1/documents" "$BACKEND_URL/api/v1/documents"
check_protected_route "GET /api/v1/users"     "$BACKEND_URL/api/v1/users"
echo ""

# ── 3. Database & Redis ──────────────────────────────────────────────
echo -e "  ${CYAN}Database & Cache${NC}"
echo -e "  ${GRAY}─────────────────────────────────────────────${NC}"
check_database
check_redis
echo ""

# ── 4. Docker Containers (optional) ──────────────────────────────────
if [[ "${1:-}" == "--compose" ]]; then
  echo -e "  ${CYAN}Docker Containers${NC}"
  echo -e "  ${GRAY}─────────────────────────────────────────────${NC}"
  check_docker_container "PostgreSQL"    "ged-postgres"
  check_docker_container "Redis"         "ged-redis"
  check_docker_container "MinIO"         "ged-minio"
  check_docker_container "Backend"       "ged-backend"
  check_docker_container "AI Service"    "ged-ai-service"
  check_docker_container "Frontend"      "ged-frontend"
  check_docker_container "MailHog"       "ged-mailhog"
  echo ""
fi

# ── Summary ───────────────────────────────────────────────────────────
echo -e "${CYAN}================================================================${NC}"
if [[ $ERRORS -eq 0 ]]; then
  echo -e "  ${GREEN}All checks passed ($PASSED OK) — Platform is healthy!${NC}"
else
  echo -e "  ${RED}$ERRORS check(s) FAILED${NC}, ${GREEN}$PASSED passed${NC}"
  echo ""
  echo -e "  ${GRAY}Troubleshooting:${NC}"
  echo -e "  ${GRAY}  docker compose ps                      # container status${NC}"
  echo -e "  ${GRAY}  docker compose logs backend             # backend logs${NC}"
  echo -e "  ${GRAY}  docker compose logs ai-service          # AI service logs${NC}"
  echo -e "  ${GRAY}  cat .env                                # verify env vars${NC}"
fi
echo -e "${CYAN}================================================================${NC}"
echo ""

exit $ERRORS
