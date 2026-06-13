#!/usr/bin/env bash
# Gateway smoke test through http://localhost:8080
# Usage: npm run smoke:gateway
# Requires: npm run dev:full (or docker compose) with gateway + backends running
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

BASE="${BASE:-http://localhost:8080}"
API="${BASE}/api"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

step() { echo -e "\n${GREEN}==>${NC} $1"; }
fail() { echo -e "${RED}ERROR:${NC} $1" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

request() {
  local method="$1"
  local url="$2"
  local data="${3:-}"
  local args=(-s -w "\n%{http_code}" -X "$method" "$url")
  if [[ -n "$data" ]]; then
    args+=(-H "Content-Type: application/json" -d "$data")
  fi
  local out
  out="$(curl "${args[@]}")"
  HTTP_STATUS="${out##*$'\n'}"
  HTTP_BODY="${out%$'\n'*}"
}

assert_status() {
  local expected="$1"
  local actual="$2"
  local label="$3"
  [[ "$actual" == "$expected" ]] || fail "$label: expected HTTP $expected, got $actual — body: $HTTP_BODY"
}

read_signup_otp() {
  local email="$1"
  if [[ -n "${SMOKE_OTP:-}" ]]; then
    echo "$SMOKE_OTP"
    return
  fi
  node -r dotenv/config -e "
    require('dotenv').config({ path: '${ROOT_DIR}/.env' });
    if (!process.env.DATABASE_URL) process.exit(0);
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    prisma.authVerification
      .findFirst({ where: { identifier: 'otp:signup:${email}' } })
      .then((record) => {
        if (record?.value) process.stdout.write(String(record.value));
      })
      .finally(() => prisma.\$disconnect());
  "
}

need_cmd curl
need_cmd jq
need_cmd node

step "Static login page"
request GET "${BASE}/Login/loginPage/login.html"
assert_status "200" "$HTTP_STATUS" "GET /Login/loginPage/login.html"

step "NestJS health via gateway"
request GET "${API}/ping"
assert_status "200" "$HTTP_STATUS" "GET /api/ping"
echo "$HTTP_BODY" | jq -e '.status == "ok"' >/dev/null || fail "ping: unhealthy"

step "Fastify health via gateway"
request GET "${BASE}/v1/health"
assert_status "200" "$HTTP_STATUS" "GET /v1/health"

step "Seeded credential login via gateway"
request POST "${API}/auth/login" '{"email":"demo@nibras.dev","password":"local123"}'
assert_status "200" "$HTTP_STATUS" "POST /api/auth/login"
echo "$HTTP_BODY" | jq -e '.accessToken' >/dev/null || fail "login: missing accessToken"

TEST_EMAIL="smoke-$(date +%s)@gmail.com"
TEST_PASSWORD="smokepass1"

step "Register + verify OTP via gateway"
request POST "${API}/auth/register" "{\"name\":\"Smoke User\",\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}"
assert_status "201" "$HTTP_STATUS" "POST /api/auth/register"

sleep 1
VERIFY_OTP="$(read_signup_otp "$TEST_EMAIL")"
if [[ -z "$VERIFY_OTP" ]]; then
  echo "Could not resolve OTP automatically."
  echo "Set SMOKE_OTP from server logs if RESEND_API_KEY is unset, then re-run with:"
  echo "  SMOKE_OTP=123456 npm run smoke:gateway"
  echo "Skipping OTP verification step."
else
  request POST "${API}/auth/verify-otp" "{\"email\":\"${TEST_EMAIL}\",\"otp\":\"${VERIFY_OTP}\"}"
  assert_status "200" "$HTTP_STATUS" "POST /api/auth/verify-otp"
  echo "$HTTP_BODY" | jq -e '.accessToken' >/dev/null || fail "verify-otp: missing accessToken"
fi

step "LeetCode practice route via gateway"
HTTP_STATUS=""
HTTP_BODY=""
out="$(curl -s -w "\n%{http_code}" --max-time 15 "${BASE}/v1/practice/leetcode/problems?page=1&limit=1")"
HTTP_STATUS="${out##*$'\n'}"
HTTP_BODY="${out%$'\n'*}"
assert_status "200" "$HTTP_STATUS" "GET /v1/practice/leetcode/problems"
if echo "$HTTP_BODY" | jq -e '.warning' >/dev/null 2>&1; then
  echo "LeetCode route OK (upstream unavailable, graceful fallback returned)"
else
  echo "LeetCode practice route OK"
fi

echo ""
echo -e "${GREEN}Gateway smoke checks passed.${NC}"
