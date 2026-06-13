#!/usr/bin/env bash
# First-time bootstrap for a fresh Ubuntu VM (Oracle Cloud Always Free, etc.).
# Run as root or with sudo on the VM after cloning the repo.
#
# Usage:
#   curl -fsSL .../bootstrap-vm.sh | sudo bash
#   # or from repo root:
#   sudo ./scripts/bootstrap-vm.sh
#
# What it does:
#   - Installs Docker + Compose plugin
#   - Creates nginx/certs and backups dirs
#   - Optionally installs Cloudflare origin cert files
#   - Builds and starts the slim self-hosted stack

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="docker compose --env-file $ROOT/.env.prod -f $ROOT/docker-compose.selfhosted.yml"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git python3

if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi

systemctl enable docker
systemctl start docker

mkdir -p "$ROOT/nginx/certs" "$ROOT/backups"
chmod 700 "$ROOT/nginx/certs"

if [ ! -f "$ROOT/.env.prod" ]; then
  echo "Copy and fill $ROOT/.env.prod from .env.prod.example before starting."
  cp "$ROOT/.env.prod.example" "$ROOT/.env.prod"
  echo "Edit .env.prod, add nginx/certs/fullchain.pem + privkey.pem, then re-run:"
  echo "  cd $ROOT && docker compose --env-file .env.prod -f docker-compose.selfhosted.yml up -d --build"
  echo "For the IDE sandbox, also set JUDGE0_AUTH_TOKEN (match judge0/judge0.conf) and add --profile ide"
  exit 0
fi

if [ ! -f "$ROOT/nginx/certs/fullchain.pem" ] || [ ! -f "$ROOT/nginx/certs/privkey.pem" ]; then
  echo "error: place TLS certs in $ROOT/nginx/certs/ (Cloudflare Origin Certificate recommended)." >&2
  exit 1
fi

cd "$ROOT"
$COMPOSE up -d --build postgres redis
echo "Waiting for Postgres…"
for i in $(seq 1 30); do
  if $COMPOSE exec -T postgres pg_isready -U nibras >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

if [ -f "$ROOT/backups/nibras-prod-data.sql" ]; then
  echo "Restoring Supabase dump…"
  sudo -u "${SUDO_USER:-$USER}" "$ROOT/scripts/restore-postgres.sh" || true
fi

IDE_PROFILE_ARGS=()
JUDGE0_SERVICES=""
if grep -qE '^JUDGE0_AUTH_TOKEN=.+' "$ROOT/.env.prod"; then
  IDE_PROFILE_ARGS=(--profile ide)
  JUDGE0_SERVICES="judge0-server judge0-worker judge0-db judge0-redis"
  echo "JUDGE0_AUTH_TOKEN set — starting Judge0 IDE sandbox"
fi

$COMPOSE "${IDE_PROFILE_ARGS[@]}" up -d --build api worker web nginx backup tutor $JUDGE0_SERVICES
echo
echo "Bootstrap complete. Verify on the VM:"
echo "  curl -k https://127.0.0.1/healthz"
if [ "${#IDE_PROFILE_ARGS[@]}" -eq 0 ]; then
  echo "For /ide, set JUDGE0_AUTH_TOKEN in .env.prod and run:"
  echo "  $ROOT/scripts/deploy-vm.sh"
else
  echo "  curl -k https://127.0.0.1/v1/ide/status"
fi
echo "Then point Cloudflare A record at this VM's public IP."
