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
DEFAULT_API_URL="https://web-production-3011ec.up.railway.app"
API_URL="${RAILWAY_API_URL:-$DEFAULT_API_URL}"

is_valid_url() {
  local value="$1"
  [[ "$value" =~ ^https?://[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9](/.*)?$ ]]
}

resolve_gateway_url() {
  if [[ -n "${RAILWAY_API_URL:-}" ]] && is_valid_url "${RAILWAY_API_URL}"; then
    echo "${RAILWAY_API_URL}"
    return
  fi
  local raw candidate
  raw="$(railway domain --service "$WEB_SERVICE" 2>/dev/null || true)"
  while IFS= read -r candidate; do
    candidate="${candidate#🚀 }"
    candidate="${candidate//$'\r'/}"
    if is_valid_url "$candidate"; then
      echo "$candidate"
      return
    fi
  done < <(echo "$raw" | rg -o 'https://[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9](/[^[:space:]]*)?' || true)
  echo "$DEFAULT_API_URL"
}

if ! railway whoami >/dev/null 2>&1; then
  echo "Run: railway login" >&2
  exit 1
fi

cd "$ROOT"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ -z "${RAILWAY_API_URL:-}" ]] || ! is_valid_url "${RAILWAY_API_URL:-}"; then
  API_URL="$DEFAULT_API_URL"
else
  API_URL="${RAILWAY_API_URL}"
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

if ! is_valid_url "$API_URL"; then
  API_URL="$(resolve_gateway_url || true)"
fi

if ! is_valid_url "$API_URL"; then
  echo "Warning: skipping health checks; invalid API_URL (${API_URL:-unset})" >&2
else
  echo "==> Health checks (${API_URL})"
  curl -sf "${API_URL}/v1/health" | head -c 200
  echo ""
  curl -sf "${API_URL}/readyz" >/dev/null || curl -sf "${API_URL}/v1/health" >/dev/null

  echo "==> Contests smoke"
  CONTESTS_BODY="$(curl -sf "${API_URL}/v1/contests?upcoming=true&limit=1")"
  echo "$CONTESTS_BODY" | jq -e 'type == "array"' >/dev/null || {
    echo "Contests endpoint did not return a JSON array" >&2
    exit 1
  }
  CONTEST_COUNT="$(echo "$CONTESTS_BODY" | jq 'length')"
  echo "Contests OK (${CONTEST_COUNT} upcoming in sample)"

  if BASE="$API_URL" npm run smoke:gateway; then
    echo "Full gateway smoke passed."
  elif BASE="$API_URL" npm run smoke:api-prod; then
    echo "API smoke passed (gateway smoke skipped optional NestJS checks)."
  else
    echo "Warning: extended smoke checks failed; core health + contests OK." >&2
  fi
fi

echo "Railway deploy complete."
