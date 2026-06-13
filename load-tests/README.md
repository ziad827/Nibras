# Load tests

Smoke tests for the unified gateway using [k6](https://k6.io/).

## Prerequisites

- Gateway running at `http://127.0.0.1:8080` (`npm run dev:full` or `docker compose up`)
- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) installed locally

## Run

```bash
k6 run load-tests/smoke.js
```

Override the gateway URL:

```bash
NIBRAS_GATEWAY_URL=http://localhost:8080 k6 run load-tests/smoke.js
```

## What it checks

- `GET /api/ping` — NestJS health
- `GET /v1/health` — Fastify platform health
- p95 latency under 2s with 10 virtual users for 30s

For authenticated flows (community, contests), extend this script with session tokens from `npm run dev:session`.
