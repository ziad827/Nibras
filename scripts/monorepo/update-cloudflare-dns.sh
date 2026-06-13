#!/usr/bin/env bash
# Cloudflare DNS helper for self-hosted VM cutover.
#
# Requires: CF_API_TOKEN with Zone.DNS Edit on nibrasplatform.me
# Usage:
#   CF_API_TOKEN=... VM_IP=1.2.3.4 ./scripts/update-cloudflare-dns.sh
#
# Sets proxied A record for @ to VM_IP. SSL mode must be Full (strict) in dashboard.

set -euo pipefail

ZONE_NAME="${ZONE_NAME:-nibrasplatform.me}"
RECORD_NAME="${RECORD_NAME:-nibrasplatform.me}"
VM_IP="${VM_IP:-}"
TOKEN="${CF_API_TOKEN:-${CLOUDFLARE_API_TOKEN:-}}"

if [ -z "$TOKEN" ] || [ -z "$VM_IP" ]; then
  cat <<EOF
Usage: CF_API_TOKEN=... VM_IP=x.x.x.x $0

Manual steps if no API token:
  1. Cloudflare → DNS → A record @ → \$VM_IP (proxied)
  2. SSL/TLS → Full (strict) with origin cert on nginx
  3. Remove old Azure IP 4.178.250.152 if present
EOF
  exit 1
fi

ZONE_ID="$(curl -fsS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones?name=$ZONE_NAME" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['result'][0]['id'])")"

RECORD_ID="$(curl -fsS -H "Authorization: Bearer $TOKEN" \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=A&name=$RECORD_NAME" \
  | python3 -c "import sys,json; r=json.load(sys.stdin)['result']; print(r[0]['id'] if r else '')")"

PAYLOAD="$(python3 - <<PY
import json
print(json.dumps({"type":"A","name":"$RECORD_NAME","content":"$VM_IP","ttl":1,"proxied":True}))
PY
)"

if [ -n "$RECORD_ID" ]; then
  curl -fsS -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records/$RECORD_ID" \
    -d "$PAYLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print('updated', d['success'])"
else
  curl -fsS -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    -d "$PAYLOAD" | python3 -c "import sys,json; d=json.load(sys.stdin); print('created', d['success'])"
fi

echo "DNS A record $RECORD_NAME → $VM_IP (proxied). Set SSL/TLS to Full (strict) in Cloudflare dashboard."
