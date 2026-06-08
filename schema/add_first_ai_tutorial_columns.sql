-- Add required first AI tutorial completion state to profiles.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_ai_tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_ai_tutorial_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.first_ai_tutorial_completed
  IS 'Whether the student completed the required first AI chat tutorial';

COMMENT ON COLUMN public.profiles.first_ai_tutorial_completed_at
  IS 'Timestamp when the required first AI chat tutorial was completed';
