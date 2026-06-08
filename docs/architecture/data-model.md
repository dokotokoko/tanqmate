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
- Profile interest tags
- First AI tutorial state
- Migration request
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

## Profile Interest Tags

`profiles.interests` stores self-declared student interest tags as `text[]`.

Rules:

- Interest tags are short words or phrases selected during onboarding or edited from the profile page.
- They are used as AI support context for theme exploration and learner model interests.
- They are not teacher-confirmed facts, evaluations, or raw private reflections.
- Do not expose them as teacher-facing raw data unless a future requirement explicitly changes that boundary.

## First AI Tutorial State

`profiles.first_ai_tutorial_completed` and `profiles.first_ai_tutorial_completed_at` store whether a student has completed the required first AI chat tutorial.

Rules:

- The state applies to student profiles only. Teacher and admin profiles are not forced through this tutorial.
- The database profile row is the source of truth. Do not use localStorage, sessionStorage, or a client-only tutorial store as the authoritative completion state.
- Completion is recorded after the student confirms either the first successful AI response or the first AI response error.
- The timestamp records the first successful completion API update and should not be reset by normal profile editing.
- This is an app progress flag, not an assessment or teacher-facing learner signal.

## Migration Requests

`migration_requests` stores lightweight, manual handover requests submitted during onboarding by users who previously used the older authentication flow.

Rules:

- A request belongs to the new Supabase user via `new_user_id`.
- The user provides `legacy_username` and optional `note` as lookup hints only.
- The request does not trigger automatic data migration.
- The default status is `pending`; later operational handling can mark it `completed` or `rejected`.
- The table is operational support data and should not expose legacy lookup hints to other students or teachers.

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
