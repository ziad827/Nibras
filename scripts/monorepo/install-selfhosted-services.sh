#!/usr/bin/env bash
# Install user systemd units so nibrasplatform.me survives reboot:
#   nibras-stack.service  — docker compose up (postgres, redis, api, worker, web, nginx)
#   cloudflared-nibras    — starts only after nginx /healthz responds
#
# Usage: ./scripts/install-selfhosted-services.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
CF="${CLOUDFLARED:-$ROOT/bin/cloudflared}"
CF_CONFIG="${CLOUDFLARED_DIR:-$HOME/.cloudflared}/config.yml"
WAIT_SCRIPT="$ROOT/scripts/wait-for-nginx-origin.sh"

mkdir -p "$UNIT_DIR"
chmod +x "$WAIT_SCRIPT"

IDE_PROFILE_ARGS=""
JUDGE0_SERVICES=""
if [ -f "$ROOT/.env.prod" ] && grep -qE '^JUDGE0_AUTH_TOKEN=.+' "$ROOT/.env.prod"; then
  IDE_PROFILE_ARGS="--profile ide"
  JUDGE0_SERVICES="judge0-server judge0-worker judge0-db judge0-redis"
fi

cat > "$UNIT_DIR/nibras-stack.service" <<EOF
[Unit]
Description=Nibras production Docker stack (nibrasplatform.me)
After=docker.service network-online.target
Wants=docker.service network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$ROOT
ExecStart=/bin/bash -c '/usr/bin/docker compose --env-file .env.prod -f docker-compose.selfhosted.yml $IDE_PROFILE_ARGS up -d --remove-orphans postgres redis api worker web nginx backup tutor $JUDGE0_SERVICES && /usr/bin/docker compose --env-file .env.prod -f docker-compose.selfhosted.yml restart nginx'
ExecStop=/usr/bin/docker compose --env-file .env.prod -f docker-compose.selfhosted.yml stop api worker web nginx
TimeoutStartSec=600

[Install]
WantedBy=default.target
EOF

cat > "$UNIT_DIR/cloudflared-nibras.service" <<CLOUDEOF
[Unit]
Description=Cloudflare Tunnel for nibrasplatform.me
After=network-online.target nibras-stack.service docker.service
Wants=nibras-stack.service
Requires=nibras-stack.service

[Service]
ExecStartPre=${WAIT_SCRIPT}
ExecStart=${CF} tunnel --config ${CF_CONFIG} run nibras
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
CLOUDEOF

systemctl --user daemon-reload
systemctl --user enable nibras-stack.service cloudflared-nibras.service

if command -v loginctl >/dev/null 2>&1; then
  loginctl enable-linger "$USER" 2>/dev/null || true
fi

echo "Installed nibras-stack.service and cloudflared-nibras.service (user systemd)."
echo "Start now: systemctl --user start nibras-stack.service cloudflared-nibras.service"
