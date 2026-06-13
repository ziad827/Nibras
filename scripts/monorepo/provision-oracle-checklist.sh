#!/usr/bin/env bash
# Oracle Cloud Always Free VM checklist (manual steps in browser + SSH).
# After the VM exists, run: sudo ./scripts/bootstrap-vm.sh
#
# Usage: ./scripts/provision-oracle-checklist.sh

set -euo pipefail

cat <<'EOF'
Oracle Cloud Always Free — provision checklist
============================================

1. Create account: https://www.oracle.com/cloud/free/
2. Compute → Instances → Create (Ampere A1 Flex)
   - Ubuntu 22.04 or 24.04
   - 2 OCPU, 12 GB RAM (adjust within free limits)
   - Assign public IPv4
3. Networking → Security List → Ingress rules:
   - TCP 22 from your IP (SSH)
   - TCP 80 from 0.0.0.0/0
   - TCP 443 from 0.0.0.0/0
4. SSH to the VM:
   ssh ubuntu@YOUR_VM_IP
5. Clone and bootstrap:
   git clone https://github.com/EpitomeZied/nibras.git
   cd nibras
   # Copy .env.prod + backups/nibras-prod-data.sql from your laptop (scp)
   scp .env.prod ubuntu@VM:nibras/
   scp backups/nibras-prod-data.sql ubuntu@VM:nibras/backups/
   scp -r nginx/certs ubuntu@VM:nibras/nginx/   # Cloudflare origin cert
   sudo ./scripts/bootstrap-vm.sh
6. Point DNS:
   CF_API_TOKEN=... VM_IP=YOUR_VM_IP ./scripts/update-cloudflare-dns.sh
7. GitHub App URLs:
   ./scripts/setup-github-app-urls.sh

See docs/selfhosted-deploy.md for full details.
EOF
