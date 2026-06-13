#!/usr/bin/env bash
# Print GitHub App URL checklist for nibrasplatform.me self-hosted deployment.
# Update these manually at https://github.com/settings/apps/nibras-platfrom
#
# Usage: ./scripts/setup-github-app-urls.sh [base-url]

set -euo pipefail

BASE="${1:-https://nibrasplatform.me}"

cat <<EOF
Update GitHub App (nibras-platfrom) at:
  https://github.com/settings/apps/nibras-platfrom

Homepage URL:     $BASE
Callback URL:     $BASE/v1/github/oauth/callback
Setup URL:        $BASE/install/complete
Webhook URL:      $BASE/v1/github/webhooks

OAuth callback (web sign-in):
  $BASE/api/auth/callback/github
EOF

if command -v gh >/dev/null 2>&1; then
  echo
  echo "Current app metadata (read-only via gh):"
  gh api /apps/nibras-platfrom --jq '{name, html_url, client_id}' 2>/dev/null || true
fi
