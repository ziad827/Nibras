#!/usr/bin/env bash
# Deploy Nibras platform to Railway: backend, tutor, api, worker, web gateway.
# Prerequisites:
#   1. railway login
#   2. railway link -p nibras-platform
#   3. ./scripts/railway-provision-mongo.sh (first time)
#   4. ./scripts/railway-secrets.sh
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

resolve_service_url() {
  local service="$1"
  local raw candidate
  raw="$(railway domain --service "$service" 2>/dev/null || true)"
  while IFS= read -r candidate; do
    candidate="${candidate#🚀 }"
    candidate="${candidate//$'\r'/}"
    if is_valid_url "$candidate"; then
      echo "${candidate%/}"
      return
    fi
  done < <(echo "$raw" | rg -o 'https://[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9](/[^[:space:]]*)?' || true)
  return 1
}

wait_for_deploy() {
  local service="$1"
  local max_attempts="${2:-60}"
  local attempt=0
  local status=""
  echo "==> Waiting for ${service} deployment..."
  while (( attempt < max_attempts )); do
    status="$(railway deployment list -s "$service" --json 2>/dev/null | jq -r '.[0].status // "UNKNOWN"' 2>/dev/null || echo "UNKNOWN")"
    case "$status" in
      SUCCESS)
        echo "  ${service}: SUCCESS"
        return 0
        ;;
      FAILED|CRASHED)
        echo "  ${service}: ${status}" >&2
        railway logs -s "$service" --lines 50 2>&1 | tail -30 >&2 || true
        return 1
        ;;
      *)
        sleep 15
        (( attempt++ )) || true
        ;;
    esac
  done
  echo "  ${service}: timed out (last status: ${status})" >&2
  return 1
}

service_exists() {
  local name="$1"
  railway service list --json 2>/dev/null | jq -r '.[].name' 2>/dev/null | rg -i "^${name}$" >/dev/null
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
BACKEND_SERVICE="${RAILWAY_BACKEND_SERVICE:-backend}"
TUTOR_SERVICE="${RAILWAY_TUTOR_SERVICE:-tutor}"

if ! railway status >/dev/null 2>&1; then
  echo "Link project first: railway link -p nibras-platform" >&2
  exit 1
fi

echo "==> Connect GitHub (branch main)"
for svc in "$API_SERVICE" "$WORKER_SERVICE" "$WEB_SERVICE" "$BACKEND_SERVICE" "$TUTOR_SERVICE"; do
  if service_exists "$svc"; then
    railway service source connect --repo NibrasPlatform/Nibras --branch main --service "$svc" || true
  fi
done

if service_exists "$BACKEND_SERVICE"; then
  echo "==> Deploy backend (${BACKEND_SERVICE})"
  railway up --service "$BACKEND_SERVICE" -y -d -m "Deploy NestJS backend"
  wait_for_deploy "$BACKEND_SERVICE" || true
fi

if service_exists "$TUTOR_SERVICE"; then
  echo "==> Deploy tutor (${TUTOR_SERVICE})"
  railway up --service "$TUTOR_SERVICE" -y -d -m "Deploy AI Tutor"
  wait_for_deploy "$TUTOR_SERVICE" || true
  if TUTOR_URL="$(resolve_service_url "$TUTOR_SERVICE" 2>/dev/null || true)" && [[ -n "$TUTOR_URL" ]]; then
    echo "==> Wire CHATBOT_V1_URL=${TUTOR_URL}"
    railway variable set -s "$API_SERVICE" "CHATBOT_V1_URL=${TUTOR_URL}" --skip-deploys
  fi
fi

if service_exists "$BACKEND_SERVICE"; then
  if BACKEND_URL="$(resolve_service_url "$BACKEND_SERVICE" 2>/dev/null || true)" && [[ -n "$BACKEND_URL" ]]; then
    echo "==> Wire NIBRAS_NESTJS_ORIGIN=${BACKEND_URL}"
    railway variable set -s "$WEB_SERVICE" "NIBRAS_NESTJS_ORIGIN=${BACKEND_URL}" --skip-deploys
  fi
fi

echo "==> Deploy API (${API_SERVICE})"
railway up --service "$API_SERVICE" -y -d -m "Deploy Fastify API"
wait_for_deploy "$API_SERVICE" || true

if service_exists "$WORKER_SERVICE"; then
  echo "==> Deploy worker (${WORKER_SERVICE})"
  railway up --service "$WORKER_SERVICE" -y -d -m "Deploy worker"
  wait_for_deploy "$WORKER_SERVICE" || true
else
  echo "Skipping ${WORKER_SERVICE} (service not created)."
fi

echo "==> Deploy gateway (${WEB_SERVICE})"
railway up --service "$WEB_SERVICE" -y -d -m "Deploy gateway"
wait_for_deploy "$WEB_SERVICE" || true

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

  if service_exists "$BACKEND_SERVICE"; then
    BACKEND_URL="$(resolve_service_url "$BACKEND_SERVICE" 2>/dev/null || true)"
    if [[ -n "$BACKEND_URL" ]]; then
      echo "==> NestJS backend smoke (${BACKEND_URL})"
      curl -sf "${BACKEND_URL}/api/ping" | head -c 200 || echo "Warning: backend /api/ping failed" >&2
      echo ""
      curl -sf "${API_URL}/api/ping" | head -c 200 || echo "Warning: gateway→backend proxy failed" >&2
      echo ""
    fi
  fi

  if service_exists "$TUTOR_SERVICE"; then
    TUTOR_URL="$(resolve_service_url "$TUTOR_SERVICE" 2>/dev/null || true)"
    if [[ -n "$TUTOR_URL" ]]; then
      echo "==> Tutor smoke (${TUTOR_URL})"
      curl -sf "${TUTOR_URL}/api/health" | head -c 200 || echo "Warning: tutor health failed" >&2
      echo ""
    fi
  fi

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
