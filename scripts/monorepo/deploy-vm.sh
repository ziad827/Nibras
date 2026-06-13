#!/usr/bin/env bash
# Pull latest main and rebuild running services on the self-hosted VM.
#
# Usage (on VM):
#   ./scripts/deploy-vm.sh
#   ./scripts/deploy-vm.sh <git-ref>
#   NIBRAS_IDE_PROFILE=1 ./scripts/deploy-vm.sh   # include Judge0 /ide sandbox
#
# Usage (from laptop via SSH):
#   NIBRAS_SSH=user@vm-ip ./scripts/deploy-vm.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REF="${1:-main}"
COMPOSE="docker compose --env-file .env.prod -f docker-compose.selfhosted.yml"
SERVICES="postgres redis api worker web nginx backup tutor"
JUDGE0_SERVICES="judge0-server judge0-worker judge0-db judge0-redis"
PROFILE_ARGS=()

if [ -z "${NIBRAS_IDE_PROFILE:-}" ] && [ -f "$ROOT/.env.prod" ]; then
  if grep -qE '^JUDGE0_AUTH_TOKEN=.+' "$ROOT/.env.prod"; then
    NIBRAS_IDE_PROFILE=1
  fi
fi

if [ "${NIBRAS_IDE_PROFILE:-}" = "1" ] || [ "${NIBRAS_IDE_PROFILE:-}" = "true" ]; then
  PROFILE_ARGS=(--profile ide)
  SERVICES="$SERVICES $JUDGE0_SERVICES"
  echo "Including Judge0 IDE sandbox (--profile ide)"
fi

REMOTE="${NIBRAS_SSH:-}"

run_remote() {
  ssh "$REMOTE" "cd nibras && git fetch origin && git checkout $REF && git pull --ff-only origin $REF && $COMPOSE ${PROFILE_ARGS[*]:-} up -d --remove-orphans --build $SERVICES && $COMPOSE run --rm --no-deps api npx prisma migrate deploy && $COMPOSE run --rm --no-deps api npm run seed:cp-roadmap || true && $COMPOSE restart nginx"
}

run_local() {
  cd "$ROOT"
  git fetch origin
  git checkout "$REF"
  git pull --ff-only origin "$REF" || true
  $COMPOSE "${PROFILE_ARGS[@]}" up -d --remove-orphans --build $SERVICES
  $COMPOSE run --rm --no-deps api npx prisma migrate deploy
  $COMPOSE run --rm --no-deps api npm run seed:cp-roadmap || true
  # nginx caches upstream container IPs; restart after api/web recreate.
  $COMPOSE restart nginx
}

if [ -n "$REMOTE" ]; then
  run_remote
else
  run_local
fi

echo "Deploy complete."
