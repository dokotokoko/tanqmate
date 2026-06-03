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

## Frontend API Usage

Frontend code should use existing API clients and service layers:

- `apps/frontend/src/services`
- `apps/frontend/src/lib/api.ts`
- existing auth hooks and stores

Do not scatter ad hoc fetch logic through screens when a service layer exists.

## Documentation Update Rule

Update this file when:

- A router is added or removed
- An API contract changes
- Authentication or authorization behavior changes
- Error response behavior changes
- Frontend API client architecture changes
