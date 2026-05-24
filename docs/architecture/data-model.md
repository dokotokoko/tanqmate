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
- School/class membership rules change
