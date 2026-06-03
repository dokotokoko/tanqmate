BEGIN;

CREATE TABLE IF NOT EXISTS public.user_id_mapping (
  supabase_uid UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  legacy_user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  legacy_username TEXT,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_id_mapping_legacy_user_id_key UNIQUE (legacy_user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_id_mapping_legacy_user_id
  ON public.user_id_mapping (legacy_user_id);

CREATE INDEX IF NOT EXISTS idx_user_id_mapping_linked_at
  ON public.user_id_mapping (linked_at DESC);

CREATE OR REPLACE FUNCTION public.set_user_id_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_id_mapping_updated_at ON public.user_id_mapping;

CREATE TRIGGER trg_user_id_mapping_updated_at
BEFORE UPDATE ON public.user_id_mapping
FOR EACH ROW
EXECUTE FUNCTION public.set_user_id_mapping_updated_at();

COMMENT ON TABLE public.user_id_mapping IS 'Maps legacy public.users.id values to Supabase auth.users UUIDs during the auth migration period.';
COMMENT ON COLUMN public.user_id_mapping.supabase_uid IS 'Canonical Supabase auth.users.id UUID.';
COMMENT ON COLUMN public.user_id_mapping.legacy_user_id IS 'Legacy public.users.id bigint.';

COMMIT;

-- Verification:
-- SELECT * FROM public.user_id_mapping ORDER BY linked_at DESC LIMIT 20;
