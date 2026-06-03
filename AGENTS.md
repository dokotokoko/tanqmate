# AGENTS.md

This is the first document AI coding agents should read before working in this repository. It is a lightweight action guide, not a feature specification, API reference, or design system.

## 1. Project Overview

探Qメイト is an educational product that supports inquiry-based learning. The goal is not to give students final answers, but to help them clarify questions, plan next actions, reflect on learning, and let teachers notice where support may be needed.

Current implementation roots:

- `apps/frontend`: Vite + React + TypeScript frontend
- `apps/backend`: FastAPI backend
- `infra`: Docker Compose configuration
- `nginx`: local reverse proxy
- `schema` / `apps/backend/schema`: Supabase and DB schema files

Old paths such as `backend/` and `react-app/` may appear in archived material. New work must use `apps/backend` and `apps/frontend`.

## 2. Core Principles

1. Support inquiry, not answer substitution.
2. Preserve student agency.
3. Keep the UI calm, readable, and non-judgmental.
4. Protect student privacy and school-related data.
5. Make small, focused changes.
6. Prefer existing project patterns over introducing new ones.
7. Keep UI implementation aligned with `DESIGN.md`.
8. Keep feature behavior aligned with `docs/requirements/`.
9. Do not use `archive` as a source of current truth.

## 3. Source of Truth Documents

- `README.md`: human-facing project overview and setup notes
- `AGENTS.md`: AI-agent-facing development instructions
- `DESIGN.md`: visual design system and UI tone
- `docs/INDEX.md`: documentation map
- `docs/workflows/DEVELOPMENT_WORKFLOW.md`: development workflow and spec-driven development
- `docs/requirements/`: product and feature requirements
- `docs/architecture/`: system, API, and data model documentation
- `docs/adr/`: important decision records
- `docs/checklists/`: production and release checklists
- `docs/reviews/`: review reports

`archive` stores historical artifacts only. Do not consult it for implementation, design, or requirements unless the useful content is first promoted into a current document.

## 4. Required Workflow

For new features, large changes, UI/UX flow changes, API changes, database changes, AI behavior changes, privacy/security-related changes, or multi-layer changes, follow:

`docs/workflows/DEVELOPMENT_WORKFLOW.md`

Small typo fixes, formatting changes, narrow documentation edits, or obvious bug fixes that do not change behavior may use a lightweight flow.

## 5. Requirements Workflow

Before implementing feature behavior:

1. Read `docs/requirements/README.md`.
2. Read `docs/requirements/000-overview.md`.
3. Read the relevant file under `docs/requirements/features/`.
4. Read `docs/requirements/010-non-functional.md` when the change touches privacy, security, accessibility, performance, reliability, or AI behavior.
5. Implement the smallest change that satisfies the relevant requirements.
6. Update requirements docs if implemented behavior changes the current specification.

## 6. Design System Rules

`DESIGN.md` is the source of truth for visual design.

When editing UI:

- Use colors, typography, spacing, rounded corners, and component patterns defined in `DESIGN.md`.
- Do not introduce new visual tokens unless `DESIGN.md` is updated.
- Keep student-facing UI calm, clear, and supportive.
- Keep teacher-facing UI scannable and careful with judgmental signals.
- Do not make AI output look like a final answer.
- Use `apps/frontend/src/styles/design-system.ts` for implemented tokens.

## 7. Coding Rules

- Preserve existing architecture, naming, and directory boundaries.
- Never revert user changes or unrelated work.
- Keep routers thin and put backend business logic in `apps/backend/services`.
- Put FastAPI routers in `apps/backend/routers`.
- Put frontend pages in `apps/frontend/src/pages` and reusable UI in `apps/frontend/src/components`.
- Use existing API clients, stores, hooks, and common components before adding new abstractions.
- Add dependencies only when existing libraries cannot reasonably solve the problem.

## 8. AI / LLM Feature Rules

- AI should support reflection, questioning, planning, and next actions; it must not present itself as the final authority.
- Preserve student agency by showing AI output as a suggestion or perspective.
- Do not expose raw private reflections, raw chat logs, or sensitive student context to users who should not see them.
- Route LLM calls through existing backend clients and services.
- Do not hard-code prompts, model behavior, or API keys outside the established prompt/service structure.

## 9. Privacy and Security

- Never commit secrets, API keys, tokens, credentials, or `.env` files.
- Do not log student names, private reflections, class information, or other personal data unless explicitly required and safe.
- Do not expose private student reflections to unauthorized users.
- Do not hard-code IP addresses, hostnames, or environment-specific URLs.
- Do not weaken authentication, authorization, CORS, or data access checks.
- Ask before running destructive data migrations or SQL.

## 10. Test and Quality Commands

Run checks relevant to the change through Docker Compose. Commands are run from the repository root. If a check cannot be run, report why.

Development environment:

```bash
docker compose -f infra/docker-compose.dev.yml up --build
```

Frontend build:

```bash
docker compose -f infra/docker-compose.dev.yml run --rm frontend npm run build
```

Backend tests:

```bash
docker compose -f infra/docker-compose.dev.yml run --rm backend python -m pytest
```

## 11. Documentation Update Rules

Update documentation when behavior, setup, API, schema, UI rules, AI behavior, privacy/security assumptions, or release process changes.

Use the right destination:

- Feature behavior: `docs/requirements/`
- Technical architecture: `docs/architecture/`
- Visual/UI rules: `DESIGN.md`
- Important decisions: `docs/adr/`
- Workflow rules: `docs/workflows/DEVELOPMENT_WORKFLOW.md`
- Production checks: `docs/checklists/`

## 12. Completion Checklist

Before reporting completion:

- The change is scoped to the request.
- Current requirements and design documents were followed.
- Privacy and authorization implications were checked.
- Relevant tests/builds were run, or the reason for not running them is stated.
- Documentation was updated if behavior or process changed.
- No secrets, generated artifacts, or unrelated changes were introduced.

## 13. Agent Behavior

- Read the codebase before assuming how it works.
- Prefer existing patterns over new architecture.
- Keep final reports concise and include changed files, checks run, and any residual risk.
- When blocked by ambiguous product, privacy, or data migration decisions, ask for confirmation.
