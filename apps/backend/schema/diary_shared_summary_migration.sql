-- 日誌共有summaryと私的記述を分離するための移行

ALTER TABLE diary_entries
  ADD COLUMN IF NOT EXISTS student_note TEXT,
  ADD COLUMN IF NOT EXISTS shared_summary TEXT,
  ADD COLUMN IF NOT EXISTS share_status TEXT DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS shared_at TIMESTAMP WITH TIME ZONE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'diary_entries_share_status_check'
  ) THEN
    ALTER TABLE diary_entries
      ADD CONSTRAINT diary_entries_share_status_check
      CHECK (share_status IN ('private', 'shared'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_diary_entries_shared_at
  ON diary_entries (shared_at DESC)
  WHERE shared_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_diary_entries_share_status
  ON diary_entries (share_status);

