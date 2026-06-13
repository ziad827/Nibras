#!/usr/bin/env bash
# Deploy Nibras Fastify API + worker to Railway (no credit card).
# Prerequisites:
#   1. railway login
#   2. Downgrade to Free plan if trial expired: https://railway.com/workspace/plans
#   3. railway link -p nibras-platform
#   4. ./scripts/railway-secrets.sh (optional if vars not set in dashboard)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${HOME}/.railway/bin:${PATH}"

ENV_FILE="${RAILWAY_ENV_FILE:-$ROOT/railway/env.local}"
API_URL="${RAILWAY_API_URL:-}"

if ! railway whoami >/dev/null 2>&1; then
  echo "Run: railway login" >&2
  exit 1
fi

cd "$ROOT"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

API_SERVICE="${RAILWAY_API_SERVICE:-api}"
WORKER_SERVICE="${RAILWAY_WORKER_SERVICE:-worker}"
WEB_SERVICE="${RAILWAY_WEB_SERVICE:-web}"

if ! railway status >/dev/null 2>&1; then
  echo "Link project first: railway link -p nibras-platform" >&2
  exit 1
fi

echo "==> Connect GitHub (branch phase-5/competitive-programming)"
railway service source connect --repo NibrasPlatform/Nibras --branch phase-5/competitive-programming --service "$API_SERVICE" || true
railway service source connect --repo NibrasPlatform/Nibras --branch phase-5/competitive-programming --service "$WORKER_SERVICE" || true
railway service source connect --repo NibrasPlatform/Nibras --branch phase-5/competitive-programming --service "$WEB_SERVICE" || true

echo "==> Deploy API (${API_SERVICE})"
railway up --service "$API_SERVICE" -y -d

echo "==> Deploy worker (${WORKER_SERVICE})"
railway up --service "$WORKER_SERVICE" -y -d

echo "==> Deploy gateway (${WEB_SERVICE})"
railway up --service "$WEB_SERVICE" -y -d

if [[ -z "$API_URL" ]]; then
  API_URL="$(railway domain --service "$WEB_SERVICE" 2>/dev/null | head -1 || true)"
  if [[ -n "$API_URL" && "$API_URL" != http* ]]; then
    API_URL="https://${API_URL}"
  fi
fi

if [[ -n "$API_URL" ]]; then
  echo "==> Health checks (${API_URL})"
  curl -sf "${API_URL}/v1/health" | head -c 200
  echo ""
  curl -sf "${API_URL}/readyz" >/dev/null || curl -sf "${API_URL}/v1/health" >/dev/null
  BASE="$API_URL" npm run smoke:gateway || BASE="$API_URL" npm run smoke:api-prod
fi

echo "Railway deploy complete."
