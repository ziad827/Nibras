#!/usr/bin/env bash
# Set Fly secrets from local .env (never prints secret values).
# Usage: ./scripts/fly-secrets.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${HOME}/.fly/bin:${PATH}"

if [[ ! -f "$ROOT/.env" ]]; then
  echo "Missing $ROOT/.env" >&2
  exit 1
fi

# shellcheck disable=SC1091
source "$ROOT/.env"

: "${NIBRAS_ENCRYPTION_KEY:?NIBRAS_ENCRYPTION_KEY required in .env}"
: "${AUTH_SECRET:?AUTH_SECRET required in .env}"
: "${REDIS_URL:?REDIS_URL required in .env (Upstash or Fly Redis)}"

API_APP="${FLY_API_APP:-nibras-api-v2}"
WORKER_APP="${FLY_WORKER_APP:-nibras-worker-v2}"

echo "Setting secrets on ${API_APP}..."
fly secrets set -a "$API_APP" \
  NIBRAS_ENCRYPTION_KEY="$NIBRAS_ENCRYPTION_KEY" \
  AUTH_SECRET="$AUTH_SECRET" \
  REDIS_URL="$REDIS_URL" \
  COMPETITIONS_SYNC_ENABLED=false

if [[ -n "${DATABASE_URL:-}" ]]; then
  echo "Setting DATABASE_URL on ${WORKER_APP}..."
  fly secrets set -a "$WORKER_APP" \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_URL="$REDIS_URL" \
    COMPETITIONS_SYNC_ENABLED=false
else
  echo "DATABASE_URL not in .env — worker should inherit from postgres attach on api app."
  fly secrets set -a "$WORKER_APP" \
    REDIS_URL="$REDIS_URL" \
    COMPETITIONS_SYNC_ENABLED=false
fi

echo "Secrets set."
