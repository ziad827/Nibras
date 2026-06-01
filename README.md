# Nibras Backend

NestJS backend services for the [Nibras](https://github.com/NibrasPlatform/Nibras) educational platform — collaborative learning, competitive programming, and project-based assessment.

[![CI](https://github.com/NibrasPlatform/Nibras/actions/workflows/ci.yml/badge.svg)](https://github.com/NibrasPlatform/Nibras/actions/workflows/ci.yml)

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Docker** and Docker Compose (optional, for local MongoDB + Redis)

## Quick start

```bash
cp .env.example .env
npm ci
npm run start:dev
```

The API listens on [http://localhost:3000](http://localhost:3000).

## Docker

Start the API with MongoDB and Redis:

```bash
docker compose up --build
```

Compose overrides `MONGO_URI` and `REDIS_HOST` with container DNS names, so `.env` can keep localhost values for non-Docker development.

## Scripts

| Script               | Description                                 |
| -------------------- | ------------------------------------------- |
| `npm run start:dev`  | Start with hot reload                       |
| `npm run start:prod` | Run compiled output (`dist/main.js`)        |
| `npm run build`      | Compile TypeScript and resolve path aliases |
| `npm run lint`       | ESLint + Prettier                           |
| `npm test`           | Unit tests (Jest)                           |
| `npm run test:e2e`   | E2E tests (in-memory Mongo + Redis)         |
| `npm run format`     | Format source and test files                |

## API

| Endpoint        | Description                                                     |
| --------------- | --------------------------------------------------------------- |
| `GET /api/ping` | Health check — MongoDB and Redis status (503 if either is down) |
| `GET /api/docs` | Swagger UI (OpenAPI)                                            |

Example:

```bash
curl -s http://localhost:3000/api/ping | jq .
```

## Environment

Copy [`.env.example`](.env.example) to `.env`. All variables are validated at boot via Joi (`src/config/validation.ts`).

Required for local development without Docker:

- `MONGO_URI` — e.g. `mongodb://localhost:27017/nibras`
- `REDIS_HOST` — e.g. `localhost`

## Project layout

```
src/
  config/     # Typed configuration + Joi validation
  database/   # MongoDB (Mongoose) and Redis (cache) modules
  modules/    # Feature modules (health, …)
  common/     # Shared utilities
test/         # Unit and e2e tests
```

## License

MIT — see [LICENSE](LICENSE).
