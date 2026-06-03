# Data Model

This document records the current data model concepts for 探Qメイト. SQL files under `schema` and `apps/backend/schema` remain the implementation reference.

## Main Concepts

- User / Profile
- School
- Teacher
- Student
- School membership
- Class / class membership
- Inquiry theme
- Conversation / message
- ITS chat turn log
- ITS observation profile
- Quest
- Diary
- Shared summary
- Vibes Tanq

## Identity

Supabase Auth user IDs and legacy user identifiers may both appear in the codebase.

Rules:

- Treat Supabase user ID as the canonical authentication identity where possible.
- Check `apps/backend/utils/user_identity.py` when changing user scope behavior.
- Avoid introducing new integer user ID assumptions.
- API responses should expose stable ID formats expected by the frontend.

## Privacy Boundaries

Student private reflections, raw chat logs, AI drafts, and edit details must not be exposed to users who should only see summarized or confirmed information.

Teacher-facing views should use student-confirmed summaries and support cues rather than raw private data.

ITS chat turn logs and observation profiles are internal AI-support metadata. They must not be exposed in student-facing chat responses or teacher-facing diary/dashboard APIs unless a future requirement explicitly changes that visibility rule.

The ITS runtime keeps four internal model snapshots for each chat turn:

- Learner model: grade band, interests, support preferences, confusion signs, and observation profile summary.
- Teaching model: response style, question budget, disclosure/action-pressure limits, and preferred support types.
- Inquiry task/domain model: inquiry phase, theme, question, hypothesis, artifacts, and quality signals.
- Observation/evaluation model: aggregate AI observation summary, recent observation records, reaction signals, evidence sources, and caveats.

## Schema Changes

When changing schema:

- Add or update SQL files in the relevant schema directory
- Document migration or rollout steps
- Check frontend types and API response effects
- Consider existing data migration
- Ask before destructive SQL or irreversible migrations

## Documentation Update Rule

Update this file when:

- A major entity is added or removed
- Identity or ownership rules change
- Teacher/student visibility changes
- Diary, summary, or conversation persistence changes
- ITS chat turn log or observation profile persistence changes
- School/class membership rules change
