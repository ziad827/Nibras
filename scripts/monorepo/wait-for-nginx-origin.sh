#!/usr/bin/env bash
# Wait until local nginx serves /healthz (used before starting cloudflared).
set -euo pipefail

ORIGIN="${ORIGIN:-https://127.0.0.1:443/healthz}"
TIMEOUT_SEC="${TIMEOUT_SEC:-180}"
INTERVAL_SEC="${INTERVAL_SEC:-2}"

deadline=$((SECONDS + TIMEOUT_SEC))
while [ "$SECONDS" -lt "$deadline" ]; do
  if curl -skf --max-time 3 "$ORIGIN" >/dev/null 2>&1; then
    exit 0
  fi
  sleep "$INTERVAL_SEC"
done

echo "Timed out after ${TIMEOUT_SEC}s waiting for nginx origin at $ORIGIN" >&2
exit 1
