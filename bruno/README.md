# Nibras API — Bruno collection

## Setup

1. Install [Bruno](https://www.usebruno.com/).
2. **Open Collection** → select this `bruno/` directory.
3. Start MongoDB, Redis, and the API (`npm run start:dev`).
4. Run `npm run dev:session` in the repo root.
5. In Bruno, open **Environments → local** → **vars** tab (not Secret vars) → set `token` to the `web_…` value (no `Bearer` prefix, no quotes).
6. Confirm **local** is selected as the active environment (dropdown in the top bar).

### Pre-request script says "token not set"?

Bruno **Secret** variables are not visible to `bru.getEnvVar()` in scripts. Store `token` in the regular **vars** section of `environments/local.bru`, not under `vars:secret`.

### INVALID_SESSION?

- Generate a **fresh** token: `npm run dev:session` (old tokens fail after logout or a different MongoDB).
- API and `dev:session` must use the **same** `.env` / `MONGO_URI` (e.g. both `localhost:27017`).
- In Bruno, use explicit header auth on **Get Me** — not an empty `token` variable.
- Verify in terminal: `curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/users/me`

## Variables

| Variable    | Description                                                                    |
| ----------- | ------------------------------------------------------------------------------ |
| `baseUrl`   | `http://localhost:3000/api`                                                    |
| `token`     | Bearer session from `dev:session`                                              |
| `userId`    | Set automatically by **Get Me**                                                |
| `problemId` | Set by **Create Problem** (runtime var) or paste MongoDB id into **local** env |
| `contestId` | Set by **Create Contest** (runtime var) or paste MongoDB id into **local** env |

**Submit Solution** builds the JSON body in a pre-request script — do not rely on `{{problemId}}` inside `body:json` (Bruno may send `{100}` or leave it unresolved). Run **Create Problem** and **Create Contest** first in the same Bruno run.
| `host` | Platform for verify/unlink (`hackerrank`, `codeforces`, …) |
| `hrHandle` / `cfHandle` / `lcHandle` | Handles for connect/practice |

## Internal contest flow

See [`flows/README.md`](flows/README.md) for the recommended request order.

## OpenAPI import

You can also import http://localhost:3000/api/docs-json into Bruno and merge with this collection.
