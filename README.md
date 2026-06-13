# Nibras — Full Service Platform

Collaborative learning, competitive programming, and project-based assessment — unified static frontend, NestJS API, Fastify platform API, and CLI.

[![CI](https://github.com/NibrasPlatform/Nibras/actions/workflows/ci.yml/badge.svg)](https://github.com/NibrasPlatform/Nibras/actions/workflows/ci.yml)

## Architecture

| Component   | Port | Role                                                              |
| ----------- | ---- | ----------------------------------------------------------------- |
| **Gateway** | 8080 | Serves `Frontend/client`, routes `/api` → NestJS, `/v1` → Fastify |
| **NestJS**  | 3000 | Auth, community, competitions, courses (`/api/*`)                 |
| **Fastify** | 4848 | Projects, CLI, tracking, programs (`/v1/*`)                       |
| **Worker**  | 9090 | Submission verification, grading jobs                             |
| **CLI**     | —    | `nibras login`, `test`, `submit`                                  |

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Docker** and Docker Compose (MongoDB, PostgreSQL, Redis)
- **Python** 3.11+ (optional, for AI tutor)

## Quick start (full stack)

```bash
cp .env.example .env
docker compose up -d mongodb redis postgres
npm ci
npm run build:platform
npm run db:deploy
npm run dev:full
```

Open [http://localhost:8080/Login/loginPage/login.html](http://localhost:8080/Login/loginPage/login.html)

### Docker (all services)

```bash
cp .env.example .env
docker compose up --build
```

Gateway: [http://localhost:8080](http://localhost:8080)

## Scripts

| Script                      | Description                                  |
| --------------------------- | -------------------------------------------- |
| `npm run dev:full`          | NestJS + Fastify platform + worker + gateway |
| `npm run dev:platform`      | Fastify API, worker, and package watch build |
| `npm run start:dev`         | NestJS API only (port 3000)                  |
| `npm run proxy:dev`         | Gateway only (port 8080)                     |
| `npm run build`             | Compile NestJS backend                       |
| `npm run build:platform`    | Build Fastify API, worker, CLI, packages     |
| `npm run build:all`         | Build platform + NestJS                      |
| `npm run build:cli:package` | Build CLI for local install (`npm link`)     |
| `npm test`                  | NestJS unit tests (Jest)                     |
| `npm run test:platform`     | Monorepo integration tests                   |
| `npm run test:e2e`          | NestJS E2E tests                             |
| `npm run dev:session`       | Create local instructor session token        |
| `npm run smoke:local`       | HTTP smoke test against NestJS API           |
| `npm run db:deploy`         | Apply Prisma migrations                      |
| `npm run seed:screenshot`   | Seed demo data for UI screenshots            |

## CLI

```bash
npm run build:cli:package
npm link
nibras login
nibras list
nibras test
nibras submit
```

CLI targets the gateway at `http://localhost:8080` by default (`NIBRAS_API_BASE_URL` in `.env`).

## API endpoints

| Endpoint         | Backend | Description                     |
| ---------------- | ------- | ------------------------------- |
| `GET /api/ping`  | NestJS  | Health — MongoDB + Redis        |
| `GET /api/docs`  | NestJS  | Swagger UI                      |
| `GET /v1/health` | Fastify | Platform health                 |
| `GET /docs`      | Fastify | Platform Swagger (when enabled) |

Via gateway:

```bash
curl -s http://localhost:8080/api/ping | jq .
curl -s http://localhost:8080/v1/health | jq .
```

## Environment

Copy [`.env.example`](.env.example) to `.env`. Sections cover NestJS, Fastify/platform, and gateway settings.

Key variables:

- `MONGO_URI`, `REDIS_HOST`, `AUTH_SECRET` — NestJS
- `DATABASE_URL` — PostgreSQL for Fastify/Prisma
- `NIBRAS_STATIC_ROOT=Frontend/client` — static UI root for gateway
- `NIBRAS_NESTJS_ORIGIN`, `NIBRAS_FASTIFY_ORIGIN` — gateway upstreams

## Project layout

```
src/              NestJS backend (auth, community, competitions)
Frontend/client/  Static student/instructor dashboard
apps/
  api/            Fastify platform API
  cli/            @nibras/cli
  worker/         Job processor
  proxy/          Unified gateway
  tutor/          AI tutor (Flask)
packages/         Shared contracts, core, grading, github
prisma/           PostgreSQL schema + seeds
courses/          Sample course assignments
bin/nibras.js     CLI entry point
```

## Bruno API collection

See [`bruno/README.md`](bruno/README.md) for NestJS API testing.

## License

MIT — see [LICENSE](LICENSE).
