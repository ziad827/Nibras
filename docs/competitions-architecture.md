# Competitions architecture

Nibras competitions are split across two backends during migration:

## External contests (Fastify / Prisma)

Canonical routes under `/v1`:

- `/v1/contests` — calendar and listings
- `/v1/user-contests/*` — bookmarks, reminders, history
- `/v1/problems`, `/v1/ranking` — practice and rankings
- `/v1/practice/*` — Codeforces/LeetCode practice, Nibras 75, CP Roadmap
- `/v1/daily-problem/*` — daily problem assignments
- `/v1/contests/accounts/*` — linked account verify/resync

The gateway rewrites legacy root paths (`/contests`, `/practice`, `/daily-problem`, etc.) to `/v1/*`.

## Internal contests (NestJS / MongoDB bridge)

Until ported to Prisma, internal contest runtime stays on NestJS `/api`:

- `POST /api/contests` — create internal contest
- `POST /api/contests/:id/register` — register
- `POST /api/contests/:id/submissions` — submit solutions
- `POST /api/contests/:id/teams` — contest-scoped teams (2–3 members)
- Socket.io namespace `/contests` — live standings

The frontend uses `requestInternalContest()` in `Frontend/client/services/api.js` for these endpoints via the gateway `/api` proxy.

### NestJS bridge ops runbook

| Check | Command / URL |
| ----- | ------------- |
| Gateway up | `curl -s http://localhost:8080/api/ping` |
| Internal contest create | `POST http://localhost:8080/api/contests` (Bearer token) |
| Live standings | Connect Socket.io client to `http://localhost:8080/contests` |
| Judge executor | Set `EXECUTOR_ENABLED=true` and ensure Docker is available for sandbox runs; falls back to in-process JS when disabled |

Auth for internal contests uses the same NestJS session/JWT as legacy `/api/auth/*` (proxied to Fastify for platform auth on localhost). Smoke internal flows with `npm run test:e2e -- competitions-internal`.

Production: keep NestJS running alongside Fastify; gateway must route `/api/contests*` to NestJS while `/v1/contests*` stays on Fastify for external calendar data.

## Contest sync policy

External contest/problem sync runs on the **worker** (`contest-sync` BullMQ repeat job). Keep `COMPETITIONS_SYNC_ENABLED=false` in NestJS production env so the legacy `CompetitionsSchedulerService` cron does not duplicate worker sync. NestJS scheduler is not registered in `CompetitionsModule` after the migration trim.

## Local development

- Gateway: `http://localhost:8080`
- Community + external competitions clients default to gateway root
- Admin auth: `http://localhost:8080/api/auth/*` (Fastify platform auth)
- Smoke: `npm run smoke:gateway` (community + competitions via gateway)

## Platform backlog (not yet complete)

- **Mentorship** — UI only; backend not implemented (page shows coming soon)
- **Community badges** — catalog exists; full community badge UX still in progress
- **Platform integrations** — Kaggle, HTB, CTF platforms marked `coming_soon` in integrations UI
- **Nibras 75 workspace fork** — API exists; dedicated UI trigger pending
- **CP Roadmap admin CRUD** — API under `/v1/admin/cp-roadmap/*`; not linked from Admin UI yet
