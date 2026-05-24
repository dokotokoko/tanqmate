# Development Workflow

This document defines how development work proceeds in 探Qメイト. `AGENTS.md` keeps only the entry rules; detailed workflow lives here.

## 1. Basic Flow

```text
Requirement definition
  ↓
Design
  ↓
Implementation plan
  ↓
Issue creation
  ↓
Implementation
  ↓
Testing and quality checks
  ↓
Draft PR
  ↓
Requester report
```

日本語では次の流れです。

```text
要件定義
  ↓
設計
  ↓
実装計画
  ↓
issue 作成
  ↓
実装
  ↓
テスト・品質確認
  ↓
Draft PR 作成
  ↓
依頼者への報告
```

## 2. When Spec-Driven Development Is Required

Use the full spec-driven workflow for:

- New features
- Large behavior changes
- UI / UX flow changes
- API contract changes
- DB schema or data model changes
- AI / LLM response behavior changes
- Authentication, authorization, privacy, or security changes
- Changes that affect student-facing or teacher-facing visible information
- Multi-file or multi-layer changes

## 3. Lightweight Flow

The full workflow may be skipped for:

- Typo fixes
- Small documentation edits
- Formatting-only changes
- Obvious bug fixes that do not change existing specification
- Small test fixes
- Small refactors with no behavior change

Even in lightweight flow, follow `AGENTS.md`, `DESIGN.md`, `docs/requirements/`, privacy rules, and relevant test/build checks.

## 4. Spec Workspace

Working specs are temporary and live under:

```text
.codex/specs/{spec_name}/
```

Each spec directory should contain:

```text
.codex/specs/{spec_name}/
├── requirements.md
├── design.md
└── implementations.md
```

`.codex/specs/` is not a current source of truth. After implementation, durable content must be reflected into `docs/requirements/`, `docs/architecture/`, `DESIGN.md`, or `docs/adr/`.

## 5. Requirement Definition Phase

Create:

```text
.codex/specs/{spec_name}/requirements.md
```

Include:

```md
# Requirements

## Background
## Goal
## Non-goals
## Users
## Current behavior
## Desired behavior
## Functional requirements
## Non-functional requirements
## Acceptance criteria
## Related documents
## Open questions
```

After this phase, ask:

```text
要件定義フェーズが完了しました。設計フェーズに進んでよろしいですか？
```

Do not proceed until the requester approves, unless the requester explicitly asked for direct implementation and the change qualifies for lightweight flow.

## 6. Design Phase

Create:

```text
.codex/specs/{spec_name}/design.md
```

Include:

```md
# Design

## Overview
## User flow
## UI design
## API design
## Data model
## AI behavior
## Privacy and security
## Error handling
## Accessibility
## Test strategy
## Documentation updates
## Risks
## Alternatives considered
```

UI design must follow `DESIGN.md`.

After this phase, ask:

```text
設計フェーズが完了しました。実装計画フェーズに進んでよろしいですか？
```

## 7. Implementation Plan Phase

Create:

```text
.codex/specs/{spec_name}/implementations.md
```

Include:

```md
# Implementation Plan

## Summary
## Tasks
## Files to change
## Frontend changes
## Backend changes
## Database changes
## AI / prompt changes
## Tests
## Documentation updates
## Migration or rollout
## Done definition
```

After this phase, ask:

```text
実装計画フェーズが完了しました。issue作成フェーズに進んでよろしいですか？
```

## 8. Issue Creation Phase

After the implementation plan is approved, create a GitHub issue when the requester wants issue-based tracking.

Issue body:

```md
## Summary
## Background
## Requirements
## Design
## Implementation plan
## Acceptance criteria
## Tasks
## Test plan
## Documentation
```

After issue creation, ask:

```text
issue作成フェーズが完了しました。実行フェーズに進んでよろしいですか？
```

## 9. Implementation Phase

During implementation:

- Follow `requirements.md`, `design.md`, and `implementations.md`
- Follow `DESIGN.md`
- Follow current `docs/requirements/`
- Follow `docs/architecture/`
- Avoid unplanned large changes
- Ask when product, privacy, or data migration decisions are unclear
- Do not revert unrelated user changes

## 10. Testing and Quality Checks

Run checks relevant to the change through Docker Compose. Commands are run from the repository root.

Start the development environment:

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

Also inspect project configuration when needed:

```text
package.json
package-lock.json
requirements.txt
pyproject.toml
Makefile
CI workflow files
```

If a check cannot be run, state the reason. Never claim unrun tests passed.

## 11. Draft PR Phase

Create PRs as Draft PRs unless the requester says otherwise.

Title:

```text
[探Qメイト] <title>
```

Body:

```md
## Summary
## Related issue
## Referenced specs
## Changes
## Test results
## Documentation updates
## Notes
```

## 12. Reviewer Comment Handling

If reviewer comments arrive, do not automatically make broad changes. Ask the requester for the response policy when the requested action is ambiguous or changes scope.

```text
レビュワーからコメントがありました。対応方針を確認したいため、指示をお願いします。
```

## 13. Completion Report

After implementation or Draft PR creation, report:

```md
- Changed files:
- Related issue / PR:
- Referenced specs:
- Tests run:
- Documentation updates:
- Remaining risks:
```

## 14. Reflecting Back to Source Documents

After implementation, move durable knowledge out of working specs:

- Feature behavior: `docs/requirements/features/`
- Non-functional requirements: `docs/requirements/010-non-functional.md`
- API, DB, and system structure: `docs/architecture/`
- UI design system changes: `DESIGN.md`
- Important long-term decisions: `docs/adr/`

Do not keep temporary working specs as current documentation.
