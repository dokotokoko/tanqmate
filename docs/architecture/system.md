# System Architecture

This document is the source of truth for the high-level technical structure of 探Qメイト.

## Runtime Overview

```text
Browser
  |
  | HTTPS / dev.tanqmates.local.test
  v
Nginx
  |-- /api/* -> FastAPI backend
  |-- /*     -> Vite / React frontend

FastAPI backend
  |-- Routers
  |-- Services
  |-- Supabase client
  |-- LLM client
  |
  |-- Supabase / PostgreSQL
  |-- OpenAI Responses API
```

## Main Directories

- `apps/frontend`: Vite + React + TypeScript application
- `apps/backend`: FastAPI application
- `infra`: Docker Compose configuration
- `nginx`: local HTTPS and reverse proxy
- `schema` / `apps/backend/schema`: database schema and migration SQL
- `docs`: current documentation
- `archive`: historical artifacts only; not a current source of truth

## Frontend Responsibilities

- Route-level screens under `apps/frontend/src/pages`
- UI components under `apps/frontend/src/components`
- Shared components under `apps/frontend/src/components/common`
- API clients and feature communication under `apps/frontend/src/services` and `apps/frontend/src/lib`
- App state under `apps/frontend/src/stores`
- Design tokens under `apps/frontend/src/styles/design-system.ts`

## Backend Responsibilities

- `apps/backend/main.py`: FastAPI app initialization, middleware, router registration
- `apps/backend/routers`: HTTP input/output and authentication boundary
- `apps/backend/services`: business logic, Supabase operations, external API orchestration
- `apps/backend/utils`: authentication, user identity, Supabase configuration, shared helpers
- `apps/backend/module`: LLM and related clients
- `apps/backend/schema`: schema and migration SQL

## Design Constraints

- Routers should stay thin.
- Service layer owns behavior.
- UI implementation follows `DESIGN.md`.
- Feature behavior follows `docs/requirements/`.
- API and data model changes update `docs/architecture/api.md` or `docs/architecture/data-model.md`.
