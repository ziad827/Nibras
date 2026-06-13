# Integrations Backlog (Post-MVP)

The following integrations from Phase 11 are **deferred** after the Fastify-first MVP. Core GitHub, email, and notification flows are implemented; LMS and chat integrations remain planned work.

## Deferred

| Integration        | Status      | Notes                                            |
| ------------------ | ----------- | ------------------------------------------------ |
| Canvas LMS         | Not started | OAuth 2.0, LTI 1.3, grade passback, roster sync  |
| Moodle             | Not started | REST API enrollment and activity sync            |
| Slack              | Not started | OAuth app, slash commands, webhook notifications |
| Discord            | Not started | Bot + channel webhooks                           |
| WebRTC study rooms | Not started | Real-time rooms outside current scope            |
| GitLab webhooks    | Stub only   | `POST /v1/webhooks/gitlab` returns 501           |

## Implemented (MVP)

- GitHub App OAuth, repo linking, push webhooks (`/v1/github/webhooks`)
- Competitive programming platform linking (Codeforces, LeetCode, HackerRank)
- Transactional email via Resend (`apps/worker/src/email.ts`)
- Notification preferences (`/v1/notifications/preferences`)

## Follow-up issues

When ready to implement deferred items, create separate tracking issues per integration with:

1. OAuth / credential storage model
2. Webhook signature verification
3. Idempotent sync jobs in the worker
4. Bruno collections + integration tests
