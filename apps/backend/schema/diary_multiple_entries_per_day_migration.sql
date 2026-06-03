-- Allow students to create more than one diary entry on the same date.
-- Existing rows are preserved; future saves insert a new diary_entries row.

ALTER TABLE IF EXISTS diary_entries
  DROP CONSTRAINT IF EXISTS unique_student_date;

CREATE INDEX IF NOT EXISTS idx_diary_entries_student_id_submitted_at
  ON diary_entries (student_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_diary_entries_supabase_student_id_submitted_at
  ON diary_entries (supabase_student_id, submitted_at DESC);
