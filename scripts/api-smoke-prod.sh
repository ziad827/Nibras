#!/usr/bin/env bash
# API-only production smoke (Fastify /v1/*). Use when BASE points at nibras-api, not gateway.
# Usage: BASE=https://nibras-api.fly.dev npm run smoke:api-prod
set -euo pipefail

BASE="${BASE:-https://nibras-api.fly.dev}"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

step() { echo -e "\n${GREEN}==>${NC} $1"; }
fail() { echo -e "${RED}ERROR:${NC} $1" >&2; exit 1; }

request() {
  local method="$1"
  local url="$2"
  local out
  out="$(curl -s -w "\n%{http_code}" -X "$method" "$url")"
  HTTP_STATUS="${out##*$'\n'}"
  HTTP_BODY="${out%$'\n'*}"
}

assert_status() {
  local expected="$1"
  local actual="$2"
  local label="$3"
  [[ "$actual" == "$expected" ]] || fail "$label: expected HTTP $expected, got $actual — body: $HTTP_BODY"
}

command -v curl >/dev/null || fail "curl required"
command -v jq >/dev/null || fail "jq required"

step "Fastify health"
request GET "${BASE}/v1/health"
assert_status "200" "$HTTP_STATUS" "GET /v1/health"
echo "$HTTP_BODY" | jq -e '.ok == true' >/dev/null || fail "health: expected ok:true"

step "Readiness"
request GET "${BASE}/readyz"
assert_status "200" "$HTTP_STATUS" "GET /readyz"

step "Community questions"
request GET "${BASE}/v1/community/questions?page=1&limit=5"
assert_status "200" "$HTTP_STATUS" "GET /v1/community/questions"

step "Community tags"
request GET "${BASE}/v1/community/tags"
assert_status "200" "$HTTP_STATUS" "GET /v1/community/tags"

step "Contests"
request GET "${BASE}/v1/contests?page=1&limit=5"
assert_status "200" "$HTTP_STATUS" "GET /v1/contests"

echo ""
echo -e "${GREEN}API production smoke checks passed.${NC}"
