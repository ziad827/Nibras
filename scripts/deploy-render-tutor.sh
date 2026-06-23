#!/usr/bin/env bash
# Deploy AI Tutor to Render (free tier) when RENDER_API_KEY is set.
# Manual path: Render Dashboard → New → Blueprint → connect NibrasPlatform/Nibras
#
# Usage:
#   RENDER_API_KEY=rnd_... ./scripts/deploy-render-tutor.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${RAILWAY_ENV_FILE:-$ROOT/railway/env.local}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

if [[ -z "${RENDER_API_KEY:-}" ]]; then
  cat >&2 <<'EOF'
RENDER_API_KEY is not set.

Deploy via Render Dashboard (free, remote build — no local Docker):
  1. https://render.com → Sign Up (GitHub)
  2. New → Blueprint → connect NibrasPlatform/Nibras (branch main)
  3. Set secret env vars when prompted:
       OPENAI_API_KEY, NIBRAS_AI_API_KEY, NIBRAS_INTERNAL_API_TOKEN
  4. Apply and wait for deploy (~5–10 min)
  5. curl https://<your-service>.onrender.com/api/health
  6. Add to railway/env.local:
       RAILWAY_TUTOR_ORIGIN=https://<your-service>.onrender.com
  7. ./scripts/railway-secrets.sh && railway up --service api -y -d
EOF
  exit 1
fi

OWNER_ID="${RENDER_OWNER_ID:-}"
if [[ -z "$OWNER_ID" ]]; then
  OWNER_ID="$(curl -fsS -H "Authorization: Bearer ${RENDER_API_KEY}" \
    https://api.render.com/v1/owners | python3 -c "import json,sys; print(json.load(sys.stdin)[0]['owner']['id'])")"
fi

echo "Creating Render web service nibras-tutor..."
curl -fsS -X POST https://api.render.com/v1/services \
  -H "Authorization: Bearer ${RENDER_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "type": "web_service",
  "name": "nibras-tutor",
  "ownerId": "${OWNER_ID}",
  "repo": "https://github.com/NibrasPlatform/Nibras",
  "branch": "main",
  "autoDeploy": "yes",
  "serviceDetails": {
    "env": "docker",
    "envSpecificDetails": {
      "dockerfilePath": "Dockerfile.tutor"
    },
    "plan": "free",
    "healthCheckPath": "/api/health"
  }
}
EOF

echo "Set env vars in Render dashboard, then RAILWAY_TUTOR_ORIGIN in railway/env.local"
