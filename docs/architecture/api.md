# API Architecture

This document records the current API architecture. The exact router registration in `apps/backend/main.py` remains the implementation reference.

## Principles

- Keep FastAPI routers thin.
- Put business logic in `apps/backend/services`.
- Make authentication and authorization requirements explicit.
- Return response shapes that frontend service layers can consume predictably.
- Do not leak internal exception details or sensitive student data to clients.
- Internal ITS metadata such as support type, speech acts, disclosure level, and observation profiles stays out of public chat and teacher-facing response contracts unless a feature requirement explicitly changes that boundary.

## Main Router Areas

- `auth_router`: authentication and profile-related entry points
- `chat_router`: AI chat
- `conversations_router`: conversation management
- `diary_router`: diary and reflection features
- `quest_router` / `user_quest_router`: quest features
- `theme_router`: inquiry theme features
- `admin_router`: admin features
- `metrics_router` / `debug_router`: metrics and debugging
- `migration_router`: migration utilities
- `inquiry_router`: existing inquiry learning API

## Authentication

Current APIs are centered on Supabase Auth while maintaining compatibility with existing user identity data where needed.

Rules:

- Authentication-required APIs must use the existing Supabase auth middleware and user scope helpers.
- Changes to user scope must inspect `apps/backend/utils/user_identity.py` and related services.
- Do not add public unauthenticated APIs unless the endpoint is safe to expose.
- Do not weaken CORS, token validation, or role checks.

## Profile Context APIs

`auth_router` owns profile context used by onboarding, profile editing, and AI support context.

- `POST /auth/onboarding` accepts `name`, required `interests: string[]`, optional school/class fields, optional migration request fields `migration_requested`, `legacy_username`, `migration_note`, and optional inquiry context fields `theme`, `question`, `hypothesis`.
- `GET /auth/profile` returns the full profile, including `interests`, `first_ai_tutorial_completed`, and `first_ai_tutorial_completed_at`.
- `PUT /auth/profile` accepts optional `interests: string[]` together with existing profile and inquiry context fields.
- `POST /auth/first-ai-tutorial/complete` marks the authenticated user's first AI tutorial complete. It updates only the caller's `profiles` row, is idempotent, and is a no-op success for teacher/admin roles because the forced tutorial applies only to students.
- Interest tags are normalized server-side by trimming empty values, deduplicating, and rejecting tags longer than the configured short-tag limit.
- When `migration_requested` is true, `legacy_username` is required and a pending `migration_requests` row is inserted or updated for the authenticated user.
- The first AI tutorial completion state is stored in `profiles`, not local browser storage.

## Frontend API Usage

Frontend code should use existing API clients and service layers:

- `apps/frontend/src/services`
- `apps/frontend/src/lib/api.ts`
- existing auth hooks and stores

Do not scatter ad hoc fetch logic through screens when a service layer exists.

## OpenAI Model and Generation Budget

The shared client in `apps/backend/module/llm_api.py` uses the Responses API with `model="gpt-6-luna"`, `reasoning={"effort": "medium"}`, and `text={"verbosity": "low"}`. This applies to the sync, async, streaming, and Web search entry points, including chat and the auxiliary ITS judgement/card generation that use this client. Claude and the separate legacy inquiry API keep their existing models.

The existing `max_tokens` argument supplies a text budget. The client adds a reasoning allowance before setting `max_output_tokens`, which limits reasoning and visible output together:

| Setting | Default | Purpose |
| --- | --- | --- |
| `LLM_REASONING_TOKEN_BUDGET` | `4096` | Reasoning allowance added to the requested text budget |
| `LLM_DEFAULT_TEXT_TOKEN_BUDGET` | `4096` | Text budget when the caller does not specify `max_tokens` |

For example, a chat request with `max_tokens=600` has a combined limit of 4696 tokens. The combined limit is capped at 128000 tokens. This is not an exact visible-text limit: existing prompt constraints and low verbosity keep the response concise. Actual reasoning usage, latency, and cost vary with the request.

Incomplete, failed, cancelled, or textless responses raise a safe error instead of returning a Response object's representation. Explicit refusals are preserved as visible replies, and content-filter interruptions are not retried on a different model. The async primary path retains the existing `gpt-4o-mini` fallback without reasoning parameters, Web search, or the extra reasoning allowance; fallback replies must also be complete and contain visible text. Streams report incomplete/failed events and disconnects before completion as errors and close their connections on exit; consumers must handle an error even after receiving some text deltas.

Chat response diagnostics record only output event types and counts. They do not dump response objects, message contents, or reasoning payloads.

After changing the client or budget environment settings, restart the running backend with `docker compose -f infra/docker-compose.yml restart backend`, then check `/api/health` through nginx and use synthetic input to verify the LLM API. Restarting alone does not reload changed Compose environment variables; apply those with `docker compose -f infra/docker-compose.yml up -d --no-deps backend`. Roll back the relevant code/configuration change and restart or recreate the backend in the same way if needed. Keep authentication enabled during verification.

References: [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna), [migration guidance](https://developers.openai.com/api/docs/guides/latest-model#migration-quickstart), [reasoning budgets](https://developers.openai.com/api/docs/guides/reasoning#allocating-space-for-reasoning).

## Documentation Update Rule

Update this file when:

- A router is added or removed
- An API contract changes
- Authentication or authorization behavior changes
- Error response behavior changes
- Frontend API client architecture changes
