-- Dual user-id migration for Supabase Auth
-- Goal:
-- 1. Keep legacy bigint user_id / student_id for migrated users.
-- 2. Add canonical Supabase UUID columns for all new writes.
-- 3. Allow new users without legacy ids to operate normally.
-- 4. Backfill UUID columns only from user_id_mapping, which links old users.id to Supabase auth users.
-- Run schema/create_user_id_mapping.sql first when bootstrapping a DB that does not yet have the mapping table.

BEGIN;

-- =========================================================
-- Add canonical UUID columns
-- =========================================================
ALTER TABLE IF EXISTS public.projects
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

ALTER TABLE IF EXISTS public.memos
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

ALTER TABLE IF EXISTS public.chat_logs
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

ALTER TABLE IF EXISTS public.chat_conversations
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

ALTER TABLE IF EXISTS public.diary_entries
  ADD COLUMN IF NOT EXISTS supabase_student_id UUID;

-- =========================================================
-- Relax legacy bigint requirement for new users
-- =========================================================
ALTER TABLE IF EXISTS public.projects
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.memos
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.chat_logs
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.chat_conversations
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE IF EXISTS public.diary_entries
  ALTER COLUMN student_id DROP NOT NULL;

-- =========================================================
-- Backfill UUID columns from user_id_mapping + legacy users
-- =========================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'user_id_mapping'
  ) THEN
    UPDATE public.projects p
    SET supabase_user_id = uim.supabase_uid::uuid
    FROM public.user_id_mapping uim
    JOIN public.users u ON u.id = uim.legacy_user_id
    WHERE p.user_id = u.id
      AND p.supabase_user_id IS NULL;

    UPDATE public.memos m
    SET supabase_user_id = uim.supabase_uid::uuid
    FROM public.user_id_mapping uim
    JOIN public.users u ON u.id = uim.legacy_user_id
    WHERE m.user_id = u.id
      AND m.supabase_user_id IS NULL;

    UPDATE public.chat_logs cl
    SET supabase_user_id = uim.supabase_uid::uuid
    FROM public.user_id_mapping uim
    JOIN public.users u ON u.id = uim.legacy_user_id
    WHERE cl.user_id = u.id
      AND cl.supabase_user_id IS NULL;

    UPDATE public.chat_conversations cc
    SET supabase_user_id = uim.supabase_uid::uuid
    FROM public.user_id_mapping uim
    JOIN public.users u ON u.id = uim.legacy_user_id
    WHERE cc.user_id = u.id
      AND cc.supabase_user_id IS NULL;

    UPDATE public.diary_entries de
    SET supabase_student_id = uim.supabase_uid::uuid
    FROM public.user_id_mapping uim
    JOIN public.users u ON u.id = uim.legacy_user_id
    WHERE de.student_id = u.id
      AND de.supabase_student_id IS NULL;
  END IF;
END $$;

-- =========================================================
-- Indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_projects_supabase_user_id
  ON public.projects (supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_memos_supabase_user_id
  ON public.memos (supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_chat_logs_supabase_user_id
  ON public.chat_logs (supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_chat_logs_supabase_user_id_created_at
  ON public.chat_logs (supabase_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_supabase_user_id
  ON public.chat_conversations (supabase_user_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_supabase_user_id_updated_at
  ON public.chat_conversations (supabase_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_diary_entries_supabase_student_id
  ON public.diary_entries (supabase_student_id);

CREATE INDEX IF NOT EXISTS idx_diary_entries_supabase_student_id_date
  ON public.diary_entries (supabase_student_id, date DESC);

-- =========================================================
-- Foreign keys
-- =========================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND constraint_name = 'projects_supabase_user_id_fkey'
  ) THEN
    ALTER TABLE public.projects
      ADD CONSTRAINT projects_supabase_user_id_fkey
      FOREIGN KEY (supabase_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'memos'
      AND constraint_name = 'memos_supabase_user_id_fkey'
  ) THEN
    ALTER TABLE public.memos
      ADD CONSTRAINT memos_supabase_user_id_fkey
      FOREIGN KEY (supabase_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'chat_logs'
      AND constraint_name = 'chat_logs_supabase_user_id_fkey'
  ) THEN
    ALTER TABLE public.chat_logs
      ADD CONSTRAINT chat_logs_supabase_user_id_fkey
      FOREIGN KEY (supabase_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'chat_conversations'
      AND constraint_name = 'chat_conversations_supabase_user_id_fkey'
  ) THEN
    ALTER TABLE public.chat_conversations
      ADD CONSTRAINT chat_conversations_supabase_user_id_fkey
      FOREIGN KEY (supabase_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'diary_entries'
      AND constraint_name = 'diary_entries_supabase_student_id_fkey'
  ) THEN
    ALTER TABLE public.diary_entries
      ADD CONSTRAINT diary_entries_supabase_student_id_fkey
      FOREIGN KEY (supabase_student_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;

-- Verification query examples:
-- SELECT COUNT(*) FROM public.projects WHERE supabase_user_id IS NULL AND user_id IS NOT NULL;
-- SELECT COUNT(*) FROM public.chat_logs WHERE supabase_user_id IS NULL AND user_id IS NOT NULL;
-- SELECT COUNT(*) FROM public.diary_entries WHERE supabase_student_id IS NULL AND student_id IS NOT NULL;
