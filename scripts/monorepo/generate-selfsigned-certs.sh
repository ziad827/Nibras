#!/usr/bin/env bash
# Generate a self-signed TLS cert for local / VM bootstrap testing.
# For production behind Cloudflare, replace with a Cloudflare Origin Certificate
# (SSL/TLS → Origin Server → Create Certificate) saved as:
#   nginx/certs/fullchain.pem
#   nginx/certs/privkey.pem
#
# Usage: ./scripts/generate-selfsigned-certs.sh [domain]

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="${1:-nibrasplatform.me}"
DIR="$ROOT/nginx/certs"

mkdir -p "$DIR"
openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout "$DIR/privkey.pem" \
  -out "$DIR/fullchain.pem" \
  -subj "/CN=$DOMAIN" \
  2>/dev/null

chmod 600 "$DIR/privkey.pem"
echo "Wrote $DIR/fullchain.pem and privkey.pem for CN=$DOMAIN"
