#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# scripts/backup.sh — PostgreSQL database backup via pg_dump
#
# Usage:
#   ./scripts/backup.sh [output-dir]
#
# Defaults:
#   output-dir: ./backups
#
# Reads DATABASE_URL from the environment (or .env if dotenv-cli is present).
# Produces a timestamped gzip-compressed SQL dump.
#
# Example cron (daily at 02:00):
#   0 2 * * * cd /app && DATABASE_URL=... ./scripts/backup.sh /var/backups/nibras
# ---------------------------------------------------------------------------
set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP="$(date -u '+%Y%m%dT%H%M%SZ')"
FILENAME="nibras-db-${TIMESTAMP}.sql.gz"
DEST="${BACKUP_DIR}/${FILENAME}"

# ── Resolve DATABASE_URL ──────────────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  # Try loading from .env (no hard dependency on dotenv-cli)
  if [[ -f .env ]]; then
    # shellcheck disable=SC1091
    set -o allexport
    source .env
    set +o allexport
  fi
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

# ── Parse connection components from DATABASE_URL ─────────────────────────────
# Format: postgresql://user:password@host:port/dbname?params
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')
DB_USER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:@]+).*|\1|')
DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')

DB_PORT="${DB_PORT:-5432}"

# ── Ensure output directory exists ────────────────────────────────────────────
mkdir -p "$BACKUP_DIR"

# ── Run pg_dump ───────────────────────────────────────────────────────────────
echo "[backup] Starting backup → ${DEST}"

PGPASSWORD="$DB_PASS" pg_dump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --username="$DB_USER" \
  --dbname="$DB_NAME" \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip -9 > "$DEST"

SIZE=$(du -sh "$DEST" | cut -f1)
echo "[backup] Done. ${DEST} (${SIZE})"

# ── Prune old backups (keep last 30) ─────────────────────────────────────────
KEEP="${NIBRAS_BACKUP_KEEP:-30}"
BACKUP_COUNT=$(find "$BACKUP_DIR" -name 'nibras-db-*.sql.gz' | wc -l | tr -d ' ')

if [[ "$BACKUP_COUNT" -gt "$KEEP" ]]; then
  PRUNE_COUNT=$(( BACKUP_COUNT - KEEP ))
  echo "[backup] Pruning ${PRUNE_COUNT} old backup(s) (keeping last ${KEEP})..."
  find "$BACKUP_DIR" -name 'nibras-db-*.sql.gz' -printf '%T+ %p\n' \
    | sort \
    | head -n "$PRUNE_COUNT" \
    | awk '{print $2}' \
    | xargs rm -f
fi
