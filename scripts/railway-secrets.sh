#!/usr/bin/env bash
# Set Railway variables for api, worker, web gateway, backend, and tutor from railway/env.local.
# Usage: ./scripts/railway-secrets.sh
#
# Redis: set REDIS_URL in railway/env.local, or leave unset to wire
#   REDIS_URL=${{Redis.REDIS_URL}} (requires: ./scripts/railway-provision-redis.sh)
# MongoDB: run ./scripts/railway-provision-mongo.sh first
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
BACKEND_SERVICE="${RAILWAY_BACKEND_SERVICE:-backend}"
TUTOR_SERVICE="${RAILWAY_TUTOR_SERVICE:-tutor}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

: "${NIBRAS_ENCRYPTION_KEY:?NIBRAS_ENCRYPTION_KEY required}"
: "${AUTH_SECRET:?AUTH_SECRET required}"

FASTIFY_ORIGIN="${RAILWAY_FASTIFY_ORIGIN:-https://api-production-bd99.up.railway.app}"
GATEWAY_ORIGIN="${RAILWAY_API_URL:-https://web-production-3011ec.up.railway.app}"
USE_RAILWAY_REDIS="${USE_RAILWAY_REDIS:-true}"

resolve_service_url() {
  local service="$1"
  local fallback="$2"
  local raw candidate
  raw="$(railway domain --service "$service" 2>/dev/null || true)"
  while IFS= read -r candidate; do
    candidate="${candidate#🚀 }"
    candidate="${candidate//$'\r'/}"
    if [[ "$candidate" =~ ^https?:// ]]; then
      echo "${candidate%/}"
      return
    fi
  done < <(echo "$raw" | rg -o 'https://[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9](/[^[:space:]]*)?' || true)
  echo "$fallback"
}

NESTJS_ORIGIN="${NIBRAS_NESTJS_ORIGIN:-}"
if [[ -z "$NESTJS_ORIGIN" ]]; then
  NESTJS_ORIGIN="$(resolve_service_url "$BACKEND_SERVICE" "https://nibras-backend.up.railway.app")"
fi

TUTOR_ORIGIN="${RAILWAY_TUTOR_ORIGIN:-}"
if [[ -z "$TUTOR_ORIGIN" ]]; then
  TUTOR_ORIGIN="$(resolve_service_url "$TUTOR_SERVICE" "")"
fi

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

BACKEND_VARS=(
  "RAILWAY_DOCKERFILE_PATH=Dockerfile"
  "NODE_ENV=production"
  "HOST=0.0.0.0"
  "PORT=3000"
  "MONGO_URI=\${{MongoDB.MONGO_URL}}"
  "AUTH_SECRET=${AUTH_SECRET}"
  "REDIS_HOST=\${{Redis.REDISHOST}}"
  "REDIS_PORT=\${{Redis.REDISPORT}}"
  "REDIS_PASSWORD=\${{Redis.REDISPASSWORD}}"
  "WEB_BASE_URL=${GATEWAY_ORIGIN}"
  "API_BASE_URL=${GATEWAY_ORIGIN}"
  "COMPETITIONS_SYNC_ENABLED=false"
)

TUTOR_VARS=(
  "RAILWAY_DOCKERFILE_PATH=Dockerfile"
  "NODE_ENV=production"
  "PORT=5000"
  "NIBRAS_API_URL=${FASTIFY_ORIGIN}/v1/community"
  "NIBRAS_API_ORIGIN=${FASTIFY_ORIGIN}"
  "REDIS_URL=\${{Redis.REDIS_URL}}"
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
elif [[ "${USE_RAILWAY_REDIS}" == "true" ]]; then
  API_VARS+=('REDIS_URL=${{Redis.REDIS_URL}}')
  WORKER_VARS+=('REDIS_URL=${{Redis.REDIS_URL}}')
  echo "Wiring REDIS_URL=\${{Redis.REDIS_URL}} (run ./scripts/railway-provision-redis.sh if Redis is missing)"
else
  echo "WARNING: REDIS_URL not set — worker BullMQ contest sync will not run." >&2
  echo "  Add REDIS_URL to ${ENV_FILE} or set USE_RAILWAY_REDIS=true." >&2
fi

if [[ -n "${COMPETITIONS_STARTUP_SYNC:-}" ]]; then
  API_VARS+=("COMPETITIONS_STARTUP_SYNC=${COMPETITIONS_STARTUP_SYNC}")
fi

if [[ -n "${NIBRAS_INTERNAL_API_TOKEN:-}" ]]; then
  API_VARS+=("NIBRAS_INTERNAL_API_TOKEN=${NIBRAS_INTERNAL_API_TOKEN}")
  TUTOR_VARS+=("NIBRAS_INTERNAL_API_TOKEN=${NIBRAS_INTERNAL_API_TOKEN}")
fi

if [[ -n "${TUTOR_ORIGIN}" ]]; then
  API_VARS+=("CHATBOT_V1_URL=${TUTOR_ORIGIN}")
fi

if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  TUTOR_VARS+=("OPENAI_API_KEY=${OPENAI_API_KEY}")
elif [[ -n "${NIBRAS_AI_API_KEY:-}" ]]; then
  TUTOR_VARS+=("NIBRAS_AI_API_KEY=${NIBRAS_AI_API_KEY}")
fi

service_exists() {
  local name="$1"
  railway service list --json 2>/dev/null | jq -r '.[].name' 2>/dev/null | rg -i "^${name}$" >/dev/null
}

echo "Setting variables on ${API_SERVICE}..."
railway variable set -s "$API_SERVICE" "${API_VARS[@]}" --skip-deploys

echo "Setting variables on ${WORKER_SERVICE}..."
railway variable set -s "$WORKER_SERVICE" "${WORKER_VARS[@]}" --skip-deploys

echo "Setting variables on ${WEB_SERVICE} (gateway)..."
echo "  NIBRAS_NESTJS_ORIGIN=${NESTJS_ORIGIN}"
railway variable set -s "$WEB_SERVICE" "${GATEWAY_VARS[@]}" --skip-deploys

if service_exists "$BACKEND_SERVICE"; then
  echo "Setting variables on ${BACKEND_SERVICE}..."
  railway variable set -s "$BACKEND_SERVICE" "${BACKEND_VARS[@]}" --skip-deploys
else
  echo "Skipping ${BACKEND_SERVICE} (service not created yet)."
fi

if service_exists "$TUTOR_SERVICE"; then
  echo "Setting variables on ${TUTOR_SERVICE}..."
  railway variable set -s "$TUTOR_SERVICE" "${TUTOR_VARS[@]}" --skip-deploys
  if [[ -n "${TUTOR_ORIGIN}" ]]; then
    echo "  CHATBOT_V1_URL=${TUTOR_ORIGIN}"
    railway variable set -s "$API_SERVICE" "CHATBOT_V1_URL=${TUTOR_ORIGIN}" --skip-deploys
  fi
else
  echo "Skipping ${TUTOR_SERVICE} (service not created yet)."
fi

echo "Secrets configured. Deploy with: ./scripts/railway-deploy.sh"
