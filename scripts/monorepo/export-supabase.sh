#!/usr/bin/env bash
# Dump production Supabase Postgres before migrating to self-hosted VM.
#
# Usage:
#   SUPABASE_DATABASE_URL='postgresql://...' ./scripts/export-supabase.sh
#   # or put DATABASE_URL in .env and run:
#   ./scripts/export-supabase.sh
#
# Output: backups/nibras-prod-data.sql (public schema data; run prisma migrate before restore)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${OUT:-$ROOT/backups/nibras-prod.sql}"

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$ROOT/.env"
  set +a
fi

URL="${SUPABASE_DATABASE_URL:-${DATABASE_URL:-}}"
if [ -z "$URL" ]; then
  echo "error: set SUPABASE_DATABASE_URL or DATABASE_URL (Supabase session/direct URL)." >&2
  exit 1
fi

if [[ "$URL" != *supabase.com* ]]; then
  echo "warning: URL does not look like Supabase — continuing anyway." >&2
fi

mkdir -p "$(dirname "$OUT")"

# Parse connection string without exposing password in process list longer than needed.
python3 - "$URL" "$OUT" <<'PY'
import os, re, subprocess, sys, urllib.parse

url = sys.argv[1]
out = sys.argv[2]
parsed = urllib.parse.urlparse(url)
user = urllib.parse.unquote(parsed.username or "postgres")
password = urllib.parse.unquote(parsed.password or "")
host = parsed.hostname or "localhost"
port = str(parsed.port or 5432)
db = (parsed.path or "/postgres").lstrip("/").split("?")[0] or "postgres"

env = os.environ.copy()
env["PGPASSWORD"] = password
cmd = [
    "pg_dump", "-h", host, "-p", port, "-U", user, "-d", db,
    "--format=plain", "--no-owner", "--no-acl",
    "--schema=public",
    "--data-only",
    "-f", out,
]
result = subprocess.run(cmd, env=env, capture_output=True, text=True)
if result.returncode != 0:
    sys.stderr.write(result.stderr)
    sys.exit(result.returncode)
print(f"Wrote {out} ({os.path.getsize(out)} bytes)")
PY
