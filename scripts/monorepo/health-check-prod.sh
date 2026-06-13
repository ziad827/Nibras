#!/usr/bin/env bash
# Smoke-check production stack (self-hosted / Cloudflare tunnel).
#
# Usage:
#   ./scripts/health-check-prod.sh
#   NIBRAS_BASE_URL=https://nibrasplatform.me ./scripts/health-check-prod.sh
#   ./scripts/health-check-prod.sh --local   # also check docker containers
#   ./scripts/health-check-prod.sh --ide     # also check /v1/ide/status

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${NIBRAS_BASE_URL:-https://nibrasplatform.me}"
COMPOSE="docker compose --env-file .env.prod -f docker-compose.selfhosted.yml"
CHECK_CONTAINERS=false
CHECK_IDE=false

for arg in "$@"; do
  case "$arg" in
    --local) CHECK_CONTAINERS=true ;;
    --ide) CHECK_IDE=true ;;
  esac
done

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

pass() {
  echo "OK: $1"
}

http_ok() {
  local path="$1"
  local code
  code="$(curl -sS -o /dev/null -w '%{http_code}' "${BASE_URL}${path}" 2>/dev/null || echo 000)"
  [ "$code" = "200" ]
}

echo "Checking ${BASE_URL} ..."

if $CHECK_CONTAINERS; then
  cd "$ROOT"
  for svc in postgres redis api worker web nginx tutor; do
    status="$(docker ps --filter "name=nibras-${svc}-1" --format '{{.Status}}' 2>/dev/null | head -1)"
    if [ -z "$status" ]; then
      fail "container nibras-${svc}-1 is not running"
    fi
    if [ "$svc" = "postgres" ] && ! echo "$status" | grep -qi healthy; then
      fail "postgres is not healthy ($status)"
    fi
    pass "container nibras-${svc}-1 ($status)"
  done
  if $CHECK_IDE; then
    for svc in judge0-server judge0-worker judge0-db judge0-redis; do
      status="$(docker ps --filter "name=nibras-${svc}-1" --format '{{.Status}}' 2>/dev/null | head -1)"
      if [ -z "$status" ]; then
        fail "container nibras-${svc}-1 is not running (deploy with NIBRAS_IDE_PROFILE=1)"
      fi
      pass "container nibras-${svc}-1 ($status)"
    done
  fi
fi

http_ok /healthz || fail "GET /healthz"
pass "GET /healthz"

http_ok /readyz || fail "GET /readyz"
pass "GET /readyz"

http_ok /sign-in || fail "GET /sign-in"
pass "GET /sign-in"

http_ok /docs || fail "GET /docs"
pass "GET /docs"

auth_body="$(curl -sS -X POST "${BASE_URL}/api/auth/sign-in/email" \
  -H 'Content-Type: application/json' \
  -H "Origin: ${BASE_URL}" \
  -d '{"email":"demo@nibras.dev","password":"local123"}' 2>/dev/null || true)"
echo "$auth_body" | grep -q '"token"' || fail "demo email sign-in"
pass "demo@nibras.dev email sign-in"

github_body="$(curl -sS -X POST "${BASE_URL}/api/auth/sign-in/social" \
  -H 'Content-Type: application/json' \
  -H "Origin: ${BASE_URL}" \
  -d "{\"provider\":\"github\",\"callbackURL\":\"${BASE_URL}/api/nibras/session-bridge\"}" 2>/dev/null || true)"
echo "$github_body" | grep -q 'github.com/login/oauth' || fail "GitHub sign-in redirect"
pass "GitHub sign-in redirect"

device_body="$(curl -sS -X POST "${BASE_URL}/v1/device/start" 2>/dev/null || true)"
echo "$device_body" | grep -q 'deviceCode' || fail "CLI device flow"
pass "CLI device flow"

if $CHECK_IDE; then
  ide_status="$(curl -sS "${BASE_URL}/v1/ide/status" 2>/dev/null || echo '{}')"
  echo "$ide_status" | grep -q '"configured":true' || fail "/v1/ide/status configured ($ide_status)"
  pass "/v1/ide/status configured"
  echo "$ide_status" | grep -q '"reachable":true' || fail "/v1/ide/status reachable ($ide_status)"
  pass "/v1/ide/status reachable"
fi

echo ""
echo "All production health checks passed."
