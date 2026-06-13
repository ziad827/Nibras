#!/usr/bin/env bash
# Restore Supabase data into a Postgres that already has Prisma schema applied.
#
# Usage:
#   ./scripts/restore-postgres.sh [path/to/nibras-prod-data.sql]
#
# Flow:
#   1. docker compose up -d postgres redis
#   2. docker compose run --rm api npx prisma migrate deploy
#   3. ./scripts/restore-postgres.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DUMP="${1:-$ROOT/backups/nibras-prod-data.sql}"
if [ ! -f "$DUMP" ] && [ -f "$ROOT/backups/nibras-prod.sql" ]; then
  DUMP="$ROOT/backups/nibras-prod.sql"
fi
COMPOSE="${COMPOSE:-docker compose --env-file $ROOT/.env.prod -f docker-compose.selfhosted.yml}"

if [ ! -f "$DUMP" ]; then
  echo "error: dump not found: $DUMP" >&2
  echo "Run ./scripts/export-supabase.sh first." >&2
  exit 1
fi

if [ -f "$ROOT/.env.prod" ]; then
  POSTGRES_USER="$(grep '^POSTGRES_USER=' "$ROOT/.env.prod" | head -1 | cut -d= -f2- | tr -d '"')"
  POSTGRES_DB="$(grep '^POSTGRES_DB=' "$ROOT/.env.prod" | head -1 | cut -d= -f2- | tr -d '"')"
fi

PGUSER="${POSTGRES_USER:-nibras}"
PGDB="${POSTGRES_DB:-nibras}"

echo "Applying Prisma migrations…"
DB_URL="$(grep '^DATABASE_URL=' "$ROOT/.env.prod" | head -1 | cut -d= -f2- | tr -d '"')"
LOCAL_DB_URL="${DB_URL/@postgres:5432/@127.0.0.1:5433}"
if command -v npx >/dev/null 2>&1 && [ -d "$ROOT/node_modules/prisma" ]; then
  (cd "$ROOT" && DATABASE_URL="$LOCAL_DB_URL" DIRECT_DATABASE_URL="$LOCAL_DB_URL" npx prisma migrate deploy)
else
  $COMPOSE run --rm --no-deps api npx prisma migrate deploy
fi

echo "Restoring data from $DUMP…"
$COMPOSE cp "$DUMP" "postgres:/tmp/nibras-prod-data.sql"
$COMPOSE exec -T postgres psql -U "$PGUSER" -d "$PGDB" -v ON_ERROR_STOP=1 -f /tmp/nibras-prod-data.sql
$COMPOSE exec -T postgres rm -f /tmp/nibras-prod-data.sql
echo "Restore complete."
