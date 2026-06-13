#!/usr/bin/env bash
# Health check for IDE / Judge0 deployment (self-hosted VM or Azure).
#
# Self-hosted (default):
#   ./scripts/check-ide-deployment.sh
#   NIBRAS_BASE_URL=https://nibrasplatform.me ./scripts/check-ide-deployment.sh --local
#
# Azure (when logged in with az CLI):
#   NIBRAS_IDE_CHECK_MODE=azure ./scripts/check-ide-deployment.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${NIBRAS_BASE_URL:-https://nibrasplatform.me}"
MODE="${NIBRAS_IDE_CHECK_MODE:-selfhosted}"
CHECK_LOCAL=false
RG="${RG:-nibras-rg}"
API_APP="${API_APP:-nibras-api}"
ACI_NAME="${ACI_NAME:-nibras-judge0}"
FAIL=0

for arg in "$@"; do
  case "$arg" in
    --local) CHECK_LOCAL=true ;;
  esac
done

pass() { echo "  OK   $1"; }
fail() { echo "  FAIL $1"; FAIL=1; }

echo "==> Nibras IDE deployment check ($MODE)"
echo

check_http_ide() {
  local label="$1"
  echo "$label:"
  if curl -sf --max-time 10 "${BASE_URL}/healthz" >/dev/null; then
    pass "${BASE_URL}/healthz"
  else
    fail "${BASE_URL}/healthz"
  fi

  STATUS=$(curl -sf --max-time 10 "${BASE_URL}/v1/ide/status" 2>/dev/null || echo '{}')
  if echo "$STATUS" | grep -q '"configured":true'; then
    pass "/v1/ide/status configured"
  else
    fail "/v1/ide/status configured ($STATUS)"
  fi
  if echo "$STATUS" | grep -q '"reachable":true'; then
    pass "/v1/ide/status reachable"
  else
    fail "/v1/ide/status reachable ($STATUS)"
  fi

  if curl -sf --max-time 15 -o /dev/null "${BASE_URL}/ide"; then
    pass "${BASE_URL}/ide"
  else
    fail "${BASE_URL}/ide (may require auth — check manually)"
  fi
  echo
}

check_local_judge0_containers() {
  echo "Local Judge0 containers:"
  cd "$ROOT"
  for svc in judge0-server judge0-worker judge0-db judge0-redis; do
    status="$(docker ps --filter "name=nibras-${svc}-1" --format '{{.Status}}' 2>/dev/null | head -1)"
    if [ -z "$status" ]; then
      fail "nibras-${svc}-1 not running (use NIBRAS_IDE_PROFILE=1 ./scripts/deploy-vm.sh)"
    else
      pass "nibras-${svc}-1 ($status)"
    fi
  done
  echo
}

if [ "$MODE" = "selfhosted" ] || [ "$MODE" = "auto" ]; then
  check_http_ide "Self-hosted ($BASE_URL)"
  if $CHECK_LOCAL; then
    check_local_judge0_containers
  fi
fi

if [ "$MODE" = "azure" ]; then
  RUN_AZURE=true
elif [ "$MODE" = "auto" ] && command -v az >/dev/null 2>&1 && az account show >/dev/null 2>&1 && az group show -g "$RG" >/dev/null 2>&1; then
  RUN_AZURE=true
else
  RUN_AZURE=false
fi

if $RUN_AZURE; then
    echo "Azure Container Apps ($RG):"
    for app in nibras-api nibras-web nibras-worker; do
      STATE=$(az containerapp show -g "$RG" -n "$app" --query 'properties.runningStatus' -o tsv 2>/dev/null || echo missing)
      if [ "$STATE" = "Running" ]; then pass "$app ($STATE)"; else fail "$app ($STATE)"; fi
    done

    API_FQDN=$(az containerapp show -g "$RG" -n "$API_APP" --query 'properties.configuration.ingress.fqdn' -o tsv 2>/dev/null || true)
    echo
    echo "Judge0 (Azure Container Instances):"
    if az container show -g "$RG" -n "$ACI_NAME" >/dev/null 2>&1; then
      ACI_STATE=$(az container show -g "$RG" -n "$ACI_NAME" --query 'instanceView.state' -o tsv)
      ACI_IP=$(az container show -g "$RG" -n "$ACI_NAME" --query 'ipAddress.ip' -o tsv)
      if [ "$ACI_STATE" = "Running" ]; then pass "$ACI_NAME ($ACI_STATE @ $ACI_IP)"; else fail "$ACI_NAME ($ACI_STATE)"; fi
      J0_URL=$(az containerapp show -g "$RG" -n "$API_APP" --query "properties.template.containers[0].env[?name=='JUDGE0_API_URL'].value" -o tsv 2>/dev/null || true)
      if [ -n "$J0_URL" ]; then pass "API JUDGE0_API_URL=$J0_URL"; else fail "API JUDGE0_API_URL not set"; fi
    else
      fail "$ACI_NAME not found"
    fi
    echo
    if [ -n "$API_FQDN" ]; then
      echo "Azure API FQDN: https://${API_FQDN}"
    fi
fi

echo "Dev Judge0 (optional):"
if curl -sf --max-time 3 -H "X-Auth-Token: nibras-judge0-dev-token" http://127.0.0.1:2358/about >/dev/null 2>&1; then
  pass "localhost:2358"
else
  echo "  skip localhost:2358 (not running or no token)"
fi

echo
if [ "$FAIL" -eq 0 ]; then
  echo "All checks passed."
else
  echo "Some checks failed."
  exit 1
fi
