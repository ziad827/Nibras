#!/usr/bin/env bash
# Deploy Nibras to Fly.io (nibras-api-v2, nibras-worker-v2, nibras-web-v2).
# Prerequisites: fly auth login, billing active, nibras-db-v2 postgres attached.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH="${HOME}/.fly/bin:${PATH}"

if ! fly auth whoami >/dev/null 2>&1; then
  echo "Run: fly auth login" >&2
  exit 1
fi

cd "$ROOT"

echo "==> Attach Postgres (idempotent if already attached)"
fly postgres attach nibras-db-v2 --app nibras-api-v2 --yes || true

echo "==> Deploy API (runs prisma migrate deploy on boot)"
fly deploy --config fly/nibras-api/fly.toml --remote-only

echo "==> Deploy worker"
fly deploy --config fly/nibras-worker/fly.toml --remote-only

echo "==> Deploy gateway (static + proxy)"
fly deploy --config fly/nibras-gateway/fly.toml --remote-only

echo "==> Health checks"
curl -sf "https://nibras-api-v2.fly.dev/v1/health" | head -c 200
echo ""
BASE="https://nibras-api-v2.fly.dev" npm run smoke:gateway

echo "Deploy complete."
