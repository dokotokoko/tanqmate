-- 日誌機能のデータベーススキーマ

-- 日誌エントリーテーブル
CREATE TABLE IF NOT EXISTS diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    date DATE NOT NULL,
    ai_draft JSONB DEFAULT '{}',
    published_body TEXT,
    published_quote TEXT,
    published_tags TEXT[] DEFAULT '{}',
    student_note TEXT,
    shared_summary TEXT,
    share_status TEXT DEFAULT 'private' CHECK (share_status IN ('private', 'shared')),
    shared_at TIMESTAMP WITH TIME ZONE,
    emotion JSONB DEFAULT '{}',
    diff_added INTEGER DEFAULT 0,
    diff_removed INTEGER DEFAULT 0,
    turning_point BOOLEAN DEFAULT false,
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX idx_diary_entries_student_id ON diary_entries (student_id);
CREATE INDEX idx_diary_entries_date ON diary_entries (date DESC);
CREATE INDEX idx_diary_entries_student_id_submitted_at ON diary_entries (student_id, submitted_at DESC);
CREATE INDEX idx_diary_entries_submitted_at ON diary_entries (submitted_at DESC);
CREATE INDEX idx_diary_entries_shared_at ON diary_entries (shared_at DESC) WHERE shared_at IS NOT NULL;
CREATE INDEX idx_diary_entries_share_status ON diary_entries (share_status);
CREATE INDEX idx_diary_entries_turning_point ON diary_entries (turning_point) WHERE turning_point = true;

-- 先生のコメントテーブル（将来フェーズ用、MVP対象外）
CREATE TABLE IF NOT EXISTS diary_teacher_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    diary_id UUID NOT NULL REFERENCES diary_entries(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    CONSTRAINT unique_diary_teacher UNIQUE (diary_id, teacher_id)
);

-- インデックスの作成
CREATE INDEX idx_teacher_comments_diary_id ON diary_teacher_comments (diary_id);
CREATE INDEX idx_teacher_comments_teacher_id ON diary_teacher_comments (teacher_id);

-- 自動更新用トリガー
CREATE OR REPLACE FUNCTION update_diary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_diary_entries_updated_at
    BEFORE UPDATE ON diary_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_diary_updated_at();

CREATE TRIGGER update_diary_comments_updated_at
    BEFORE UPDATE ON diary_teacher_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_diary_updated_at();

-- ビュー：先生用ダッシュボード
CREATE OR REPLACE VIEW teacher_diary_dashboard AS
SELECT 
    de.id,
    de.student_id,
    de.date,
    de.published_body,
    de.shared_summary,
    de.published_quote,
    de.published_tags,
    de.emotion,
    de.turning_point,
    de.submitted_at,
    u.name as student_name,
    u.email as student_email,
    CASE 
        WHEN de.turning_point = true THEN 'turning_point'
        WHEN (de.emotion->>'effort_score')::int <= 2 THEN 'low_effort'
        WHEN de.emotion->'mood_tags' ? '不安だった' THEN 'anxious'
        WHEN de.emotion->'mood_tags' ? '悔しかった' THEN 'frustrated'
        ELSE null
    END as follow_up_flag
FROM diary_entries de
LEFT JOIN users u ON de.student_id = u.id
WHERE de.submitted_at IS NOT NULL
  AND de.share_status = 'shared'
  AND de.shared_at IS NOT NULL
ORDER BY de.submitted_at DESC;

-- ビュー：生徒の日誌履歴
CREATE OR REPLACE VIEW student_diary_history AS
SELECT 
    de.id,
    de.date,
    de.published_body,
    de.shared_summary,
    de.share_status,
    de.shared_at,
    de.published_quote,
    de.published_tags,
    de.emotion,
    de.turning_point,
    de.submitted_at,
    de.diff_added,
    de.diff_removed,
    CASE 
        WHEN de.submitted_at IS NULL THEN 'draft'
        ELSE 'submitted'
    END as status
FROM diary_entries de
ORDER BY de.date DESC;

-- 統計ビュー：日誌提出状況
CREATE OR REPLACE VIEW diary_submission_stats AS
SELECT 
    student_id,
    COUNT(*) as total_entries,
    COUNT(submitted_at) as submitted_entries,
    COUNT(*) FILTER (WHERE turning_point = true) as turning_points_count,
    AVG((emotion->>'effort_score')::int) as avg_effort_score,
    MAX(date) as last_entry_date,
    MAX(submitted_at) as last_submission_date
FROM diary_entries
GROUP BY student_id;
