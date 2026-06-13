#!/usr/bin/env bash
# Set Railway variables for api, worker, and web gateway from railway/env.local.
# Usage: ./scripts/railway-secrets.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${HOME}/.railway/bin:${PATH}"

ENV_FILE="${RAILWAY_ENV_FILE:-$ROOT/railway/env.local}"

if ! railway whoami >/dev/null 2>&1; then
  echo "Run: railway login" >&2
  exit 1
fi

cd "$ROOT"

API_SERVICE="${RAILWAY_API_SERVICE:-api}"
WORKER_SERVICE="${RAILWAY_WORKER_SERVICE:-worker}"
WEB_SERVICE="${RAILWAY_WEB_SERVICE:-web}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${NIBRAS_ENCRYPTION_KEY:?NIBRAS_ENCRYPTION_KEY required}"
: "${AUTH_SECRET:?AUTH_SECRET required}"

FASTIFY_ORIGIN="${RAILWAY_FASTIFY_ORIGIN:-https://api-production-bd99.up.railway.app}"
NESTJS_ORIGIN="${NIBRAS_NESTJS_ORIGIN:-https://nibras-backend.up.railway.app}"

API_VARS=(
  "RAILWAY_DOCKERFILE_PATH=Dockerfile.api"
  "NODE_ENV=production"
  "HOST=0.0.0.0"
  "PORT=4848"
  "COMPETITIONS_SYNC_ENABLED=false"
  "COMPETITIONS_STARTUP_SYNC=true"
  "NIBRAS_ENCRYPTION_KEY=${NIBRAS_ENCRYPTION_KEY}"
  "AUTH_SECRET=${AUTH_SECRET}"
)

WORKER_VARS=(
  "RAILWAY_DOCKERFILE_PATH=Dockerfile.worker"
  "NODE_ENV=production"
  "COMPETITIONS_SYNC_ENABLED=false"
  "NIBRAS_ENCRYPTION_KEY=${NIBRAS_ENCRYPTION_KEY}"
  "WORKER_CONCURRENCY=1"
)

GATEWAY_VARS=(
  "RAILWAY_DOCKERFILE_PATH=Dockerfile.gateway"
  "NODE_ENV=production"
  "NIBRAS_STATIC_ROOT=Frontend/client"
  "NIBRAS_FASTIFY_ORIGIN=${FASTIFY_ORIGIN}"
  "NIBRAS_NESTJS_ORIGIN=${NESTJS_ORIGIN}"
)

if [[ -n "${DATABASE_URL:-}" ]]; then
  API_VARS+=("DATABASE_URL=${DATABASE_URL}" "DIRECT_DATABASE_URL=${DIRECT_DATABASE_URL:-$DATABASE_URL}")
  WORKER_VARS+=("DATABASE_URL=${DATABASE_URL}")
else
  API_VARS+=('DATABASE_URL=${{Postgres.DATABASE_URL}}' 'DIRECT_DATABASE_URL=${{Postgres.DATABASE_PUBLIC_URL}}')
  WORKER_VARS+=('DATABASE_URL=${{Postgres.DATABASE_URL}}')
fi

if [[ -n "${REDIS_URL:-}" ]]; then
  API_VARS+=("REDIS_URL=${REDIS_URL}")
  WORKER_VARS+=("REDIS_URL=${REDIS_URL}")
else
  echo "WARNING: REDIS_URL not set — worker BullMQ contest sync will not run." >&2
  echo "  Add REDIS_URL to ${ENV_FILE} (Railway Redis or Upstash)." >&2
fi

if [[ -n "${COMPETITIONS_STARTUP_SYNC:-}" ]]; then
  API_VARS+=("COMPETITIONS_STARTUP_SYNC=${COMPETITIONS_STARTUP_SYNC}")
fi

echo "Setting variables on ${API_SERVICE}..."
railway variable set -s "$API_SERVICE" "${API_VARS[@]}" --skip-deploys

echo "Setting variables on ${WORKER_SERVICE}..."
railway variable set -s "$WORKER_SERVICE" "${WORKER_VARS[@]}" --skip-deploys

echo "Setting variables on ${WEB_SERVICE} (gateway)..."
railway variable set -s "$WEB_SERVICE" "${GATEWAY_VARS[@]}" --skip-deploys

echo "Secrets configured. Deploy with: ./scripts/railway-deploy.sh"
