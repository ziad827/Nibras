#!/usr/bin/env bash
# Expose the local Docker stack at nibrasplatform.me via Cloudflare Tunnel.
# No Oracle VM or router port-forwarding required.
#
# Prerequisites:
#   1. Docker stack running (docker compose --env-file .env.prod -f docker-compose.selfhosted.yml up -d)
#   2. Cloudflare account with nibrasplatform.me zone
#
# Usage:
#   ./scripts/setup-cloudflare-tunnel.sh login     # one-time browser auth
#   ./scripts/setup-cloudflare-tunnel.sh install   # create tunnel + DNS routes
#   ./scripts/setup-cloudflare-tunnel.sh run       # foreground tunnel (test)
#   ./scripts/setup-cloudflare-tunnel.sh start     # systemd user service

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CF="${CLOUDFLARED:-$ROOT/bin/cloudflared}"
TUNNEL_NAME="${TUNNEL_NAME:-nibras}"
DOMAIN="${DOMAIN:-nibrasplatform.me}"
ORIGIN="${ORIGIN:-https://127.0.0.1:443}"
CF_DIR="${CLOUDFLARED_DIR:-$HOME/.cloudflared}"
CONFIG="$CF_DIR/config.yml"

ensure_cloudflared() {
  if [ ! -x "$CF" ]; then
    mkdir -p "$ROOT/bin"
    curl -fsSL -o "$CF" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
    chmod +x "$CF"
  fi
}

cmd_login() {
  ensure_cloudflared
  mkdir -p "$CF_DIR"
  echo "Opening Cloudflare login — select the zone for $DOMAIN when prompted."
  "$CF" tunnel login
}

cmd_install() {
  ensure_cloudflared
  mkdir -p "$CF_DIR"

  if [ ! -f "$CF_DIR/cert.pem" ]; then
    echo "error: run '$0 login' first (browser auth required)." >&2
    exit 1
  fi

  if ! "$CF" tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
    "$CF" tunnel create "$TUNNEL_NAME"
  fi

  TUNNEL_ID="$("$CF" tunnel list 2>/dev/null | awk -v n="$TUNNEL_NAME" '$0 ~ n {print $1; exit}')"
  if [ -z "$TUNNEL_ID" ]; then
    echo "error: could not resolve tunnel id for $TUNNEL_NAME" >&2
    exit 1
  fi

  route_dns() {
    local host="$1"
    if ! "$CF" tunnel route dns -f "$TUNNEL_NAME" "$host"; then
      echo ""
      echo "Could not set DNS for $host automatically."
      echo "In Cloudflare → DNS, delete any A/AAAA/CNAME for $host, then add:"
      echo "  CNAME  $host  →  ${TUNNEL_ID}.cfargotunnel.com  (proxied)"
      echo "Or re-run: $CF tunnel route dns -f $TUNNEL_NAME $host"
      echo ""
    fi
  }

  route_dns "$DOMAIN"
  route_dns "www.$DOMAIN"

  cat > "$CONFIG" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $CF_DIR/$TUNNEL_ID.json

ingress:
  - hostname: $DOMAIN
    service: $ORIGIN
    originRequest:
      noTLSVerify: true
  - hostname: www.$DOMAIN
    service: $ORIGIN
    originRequest:
      noTLSVerify: true
  - service: http_status:404
EOF

  echo "Wrote $CONFIG"
  echo "DNS for $DOMAIN and www.$DOMAIN should now route through the tunnel."
  echo "Start with: $0 run   (or: $0 start for systemd user service)"
}

cmd_run() {
  ensure_cloudflared
  [ -f "$CONFIG" ] || { echo "run '$0 install' first" >&2; exit 1; }
  "$CF" tunnel --config "$CONFIG" run "$TUNNEL_NAME"
}

cmd_start() {
  ensure_cloudflared
  [ -f "$CONFIG" ] || { echo "run '$0 install' first" >&2; exit 1; }
  UNIT_DIR="$HOME/.config/systemd/user"
  mkdir -p "$UNIT_DIR"
  cat > "$UNIT_DIR/cloudflared-nibras.service" <<EOF
[Unit]
Description=Cloudflare Tunnel for nibrasplatform.me
After=network-online.target

[Service]
ExecStart=$CF tunnel --config $CONFIG run $TUNNEL_NAME
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
EOF
  systemctl --user daemon-reload
  systemctl --user enable --now cloudflared-nibras.service
  echo "Started cloudflared-nibras.service (user systemd)."
  systemctl --user status cloudflared-nibras.service --no-pager || true
}

case "${1:-}" in
  login) cmd_login ;;
  install) cmd_install ;;
  run) cmd_run ;;
  start) cmd_start ;;
  *)
    echo "Usage: $0 {login|install|run|start}" >&2
    exit 1
    ;;
esac
