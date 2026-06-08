-- Store lightweight legacy data handover requests submitted during onboarding.

CREATE TABLE IF NOT EXISTS public.migration_requests (
  id BIGSERIAL PRIMARY KEY,
  new_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  new_user_email TEXT,
  legacy_username TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_migration_requests_pending_user
  ON public.migration_requests(new_user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_migration_requests_status
  ON public.migration_requests(status);

ALTER TABLE public.migration_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own migration requests" ON public.migration_requests;
DROP POLICY IF EXISTS "Service role can manage migration requests" ON public.migration_requests;

CREATE POLICY "Users can view their own migration requests" ON public.migration_requests
  FOR SELECT
  USING (auth.uid() = new_user_id);

CREATE POLICY "Service role can manage migration requests" ON public.migration_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

GRANT ALL ON public.migration_requests TO service_role;
GRANT SELECT ON public.migration_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.migration_requests_id_seq TO service_role;

COMMENT ON TABLE public.migration_requests IS 'Manual legacy data handover requests submitted during onboarding';
COMMENT ON COLUMN public.migration_requests.new_user_id IS 'Supabase Auth user id for the new account';
COMMENT ON COLUMN public.migration_requests.legacy_username IS 'Legacy username provided by the user as a lookup hint';
COMMENT ON COLUMN public.migration_requests.note IS 'Optional lookup hint such as display name, school, or period of use';
