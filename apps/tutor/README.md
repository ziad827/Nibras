# Hassona AI Tutor (`apps/tutor`)

Flask service for Hassona: community RAG, hints, insights, and learning-path routing. The Nibras API proxies `/v1/community/chatbot/*` when `CHATBOT_V1_URL` is set.

## Local development

1. Set `CHATBOT_V1_URL=http://127.0.0.1:5000` in the root `.env`.
2. **BYOK (default):** students save OpenAI, Groq, or OpenRouter keys in Settings → AI Integration.
3. **Platform key (optional):** `OPENAI_API_KEY` or `NIBRAS_AI_API_KEY` for shared inference and embeddings fallback.
4. **Internal API (optional):** `NIBRAS_INTERNAL_API_TOKEN` + `TUTOR_BOT_USER_ID` for bot community answers.
5. Start the stack, then:

```bash
npm run tutor:dev
```

Or Docker: `docker compose up -d tutor`

## API surface

| Endpoint                        | Purpose                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| `POST /api/ask`                 | RAG-backed tutor answer (JSON)                             |
| `POST /api/ask/stream`          | Streaming answer (SSE)                                     |
| `POST /api/explain`             | Explain an unclear term                                    |
| `POST /api/insights`            | Learning insights from stats payload                       |
| `POST /api/routing`             | Goal → study plan JSON                                     |
| `POST /api/answer-question`     | Post AI answer to community (via internal API)             |
| `GET /api/config`               | Client config (`matchThreshold`, `historyLimit`)           |
| `GET /api/health`               | Health + platform key status                               |
| `POST /api/admin/cleanup-cache` | Embedding cache cleanup (requires internal token when set) |

Proxied by the Nibras API at `/v1/community/chatbot/*`. The web app uses `/tutor` and talks to the API only.

## Environment

| Variable                    | Description                                                             |
| --------------------------- | ----------------------------------------------------------------------- |
| `CHATBOT_V1_URL`            | API → tutor base URL                                                    |
| `NIBRAS_API_URL`            | Tutor → community API (default `http://127.0.0.1:4848/v1/community`)    |
| `NIBRAS_API_ORIGIN`         | API origin for internal routes (derived from `NIBRAS_API_URL` if unset) |
| `NIBRAS_INTERNAL_API_TOKEN` | Bearer token for internal tutor→API calls                               |
| `TUTOR_BOT_USER_ID`         | User id for AI-authored community answers                               |
| `TUTOR_MATCH_THRESHOLD`     | Semantic match threshold (default `0.55`)                               |
| `TUTOR_HISTORY_LIMIT`       | Max history messages (default `20`, max `30`)                           |
| `REDIS_URL`                 | Optional Redis URI for distributed rate limiting                        |
| `FLASK_DEBUG`               | Set `true` for local debug server                                       |

## Semantic search

Community matching uses embeddings (`text-embedding-3-small`). Works with:

- Platform OpenAI key, or
- BYOK OpenAI / OpenRouter key

Groq BYOK does not support embeddings; matching falls back to platform key if configured.

## Tests

```bash
pip install -r apps/tutor/requirements.txt
pytest apps/tutor/tests
```
