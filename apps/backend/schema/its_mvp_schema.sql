-- ITS MVP internal metadata schema
-- These tables are not exposed through student or teacher-facing APIs.

CREATE TABLE IF NOT EXISTS its_chat_turn_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id UUID NOT NULL,
    legacy_student_id BIGINT,
    conversation_id UUID,
    user_chat_log_id UUID,
    ai_chat_log_id UUID,
    support_type TEXT NOT NULL,
    speech_acts TEXT[] NOT NULL DEFAULT '{}',
    response_style TEXT NOT NULL,
    disclosure_level INTEGER NOT NULL CHECK (disclosure_level BETWEEN 0 AND 5),
    question_budget INTEGER NOT NULL CHECK (question_budget BETWEEN 0 AND 1),
    action_pressure INTEGER NOT NULL CHECK (action_pressure BETWEEN 0 AND 3),
    intervention_reason_codes TEXT[] NOT NULL DEFAULT '{}',
    learner_model JSONB NOT NULL DEFAULT '{}',
    teaching_model JSONB NOT NULL DEFAULT '{}',
    task_model JSONB NOT NULL DEFAULT '{}',
    observation_model JSONB NOT NULL DEFAULT '{}',
    pre_state_snapshot JSONB NOT NULL DEFAULT '{}',
    post_state_snapshot JSONB NOT NULL DEFAULT '{}',
    decision_source TEXT NOT NULL CHECK (decision_source IN ('rule', 'llm', 'hybrid')),
    decision_confidence NUMERIC(4,3),
    rule_result JSONB NOT NULL DEFAULT '{}',
    llm_judgement_used BOOLEAN NOT NULL DEFAULT false,
    educational_validation JSONB NOT NULL DEFAULT '{}',
    policy_version TEXT NOT NULL,
    model_info TEXT,
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Existing development/staging databases may already have an older
-- its_chat_turn_logs table. CREATE TABLE IF NOT EXISTS does not add columns,
-- so keep this file re-runnable as an additive migration too.
ALTER TABLE IF EXISTS its_chat_turn_logs
    ADD COLUMN IF NOT EXISTS learner_model JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS teaching_model JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS task_model JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS observation_model JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS pre_state_snapshot JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS post_state_snapshot JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS decision_source TEXT NOT NULL DEFAULT 'rule',
    ADD COLUMN IF NOT EXISTS decision_confidence NUMERIC(4,3),
    ADD COLUMN IF NOT EXISTS rule_result JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS llm_judgement_used BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS educational_validation JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS policy_version TEXT NOT NULL DEFAULT 'unknown',
    ADD COLUMN IF NOT EXISTS model_info TEXT,
    ADD COLUMN IF NOT EXISTS response_time_ms INTEGER;

CREATE INDEX IF NOT EXISTS idx_its_chat_turn_logs_student_created
    ON its_chat_turn_logs (student_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_its_chat_turn_logs_conversation
    ON its_chat_turn_logs (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_its_chat_turn_logs_reasons
    ON its_chat_turn_logs USING GIN (intervention_reason_codes);

CREATE TABLE IF NOT EXISTS its_observation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id UUID NOT NULL,
    legacy_student_id BIGINT,
    diary_entry_id UUID,
    conversation_id UUID,
    target_date DATE NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'diary_ai_draft',
    ai_draft JSONB NOT NULL DEFAULT '{}',
    observation JSONB NOT NULL DEFAULT '{}',
    referenced_context JSONB NOT NULL DEFAULT '{}',
    policy_version TEXT NOT NULL,
    model_info TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_its_observation_records_student_date
    ON its_observation_records (student_user_id, target_date DESC);

CREATE INDEX IF NOT EXISTS idx_its_observation_records_diary
    ON its_observation_records (diary_entry_id);

CREATE TABLE IF NOT EXISTS its_observation_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_user_id UUID NOT NULL UNIQUE,
    legacy_student_id BIGINT,
    aggregate_summary TEXT NOT NULL DEFAULT '',
    aggregate_observations JSONB NOT NULL DEFAULT '[]',
    source_record_ids UUID[] NOT NULL DEFAULT '{}',
    policy_version TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_its_observation_profiles_student
    ON its_observation_profiles (student_user_id);

-- Refresh PostgREST/Supabase schema cache after additive migrations.
SELECT pg_notify('pgrst', 'reload schema');
