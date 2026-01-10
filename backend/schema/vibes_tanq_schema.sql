-- Vibes 探Q機能のデータベーススキーマ

-- ユーザーコンテキストテーブル
CREATE TABLE IF NOT EXISTS vibes_tanq_contexts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    theme_text TEXT NOT NULL,
    interest_tags TEXT[] DEFAULT '{}',
    vibes_actions TEXT[] DEFAULT '{}',
    progress_stage VARCHAR(50) DEFAULT '初期設定',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    CONSTRAINT unique_user_context UNIQUE (user_id)
);

-- ユーザー行動ログテーブル
CREATE TABLE IF NOT EXISTS vibes_tanq_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    context_snapshot JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_vibes_logs_user_id (user_id),
    INDEX idx_vibes_logs_timestamp (timestamp),
    INDEX idx_vibes_logs_event_type (event_type)
);

-- クエストアクションテーブル
CREATE TABLE IF NOT EXISTS vibes_tanq_quest_actions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    quest_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL, -- 'start', 'complete', 'skip'
    reflection TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_quest_actions_user_id (user_id),
    INDEX idx_quest_actions_quest_id (quest_id),
    INDEX idx_quest_actions_timestamp (timestamp)
);

-- クエストマスターテーブル（動的生成クエスト用）
CREATE TABLE IF NOT EXISTS vibes_tanq_quest_templates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20) NOT NULL, -- 'easy', 'medium', 'hard'
    estimated_time VARCHAR(20) NOT NULL,
    points INTEGER DEFAULT 10,
    required_tags TEXT[] DEFAULT '{}',
    template_prompt TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_quest_templates_category (category),
    INDEX idx_quest_templates_difficulty (difficulty),
    INDEX idx_quest_templates_active (is_active)
);

-- タイムラインアイテムテーブル（キャッシュ用）
CREATE TABLE IF NOT EXISTS vibes_tanq_timeline_cache (
    id SERIAL PRIMARY KEY,
    content_id VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'news', 'case_study', 'trending'
    title VARCHAR(200) NOT NULL,
    summary TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    published_at DATE NOT NULL,
    tags TEXT[] DEFAULT '{}',
    url VARCHAR(500),
    relevance_score DECIMAL(3,2) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- インデックス
    INDEX idx_timeline_cache_type (type),
    INDEX idx_timeline_cache_published (published_at),
    INDEX idx_timeline_cache_active (is_active),
    INDEX idx_timeline_cache_relevance (relevance_score),
    CONSTRAINT unique_content_id UNIQUE (content_id)
);

-- ユーザーフィードバックテーブル
CREATE TABLE IF NOT EXISTS vibes_tanq_user_feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    feedback_type VARCHAR(50) NOT NULL, -- 'quest_rating', 'timeline_reaction', 'general'
    target_id VARCHAR(100),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- インデックス
    INDEX idx_feedback_user_id (user_id),
    INDEX idx_feedback_type (feedback_type),
    INDEX idx_feedback_target (target_id)
);

-- 分析用ビュー
CREATE OR REPLACE VIEW vibes_tanq_user_analytics AS
SELECT 
    c.user_id,
    c.theme_text,
    c.interest_tags,
    c.vibes_actions,
    c.progress_stage,
    c.created_at as registration_date,
    COUNT(DISTINCT l.id) as total_events,
    COUNT(DISTINCT CASE WHEN qa.action = 'complete' THEN qa.id END) as completed_quests,
    COUNT(DISTINCT CASE WHEN qa.action = 'start' THEN qa.id END) as started_quests,
    COUNT(DISTINCT f.id) as feedback_count,
    AVG(f.rating) as average_rating,
    MAX(l.timestamp) as last_activity
FROM vibes_tanq_contexts c
LEFT JOIN vibes_tanq_logs l ON c.user_id = l.user_id
LEFT JOIN vibes_tanq_quest_actions qa ON c.user_id = qa.user_id
LEFT JOIN vibes_tanq_user_feedback f ON c.user_id = f.user_id
GROUP BY c.user_id, c.theme_text, c.interest_tags, c.vibes_actions, c.progress_stage, c.created_at;

-- 初期データの挿入

-- クエストテンプレートの初期データ
INSERT INTO vibes_tanq_quest_templates (title, description, category, difficulty, estimated_time, points, required_tags, template_prompt) VALUES
('テーマの核心を見つけよう', '探究テーマの中で最も「なんとかしたい」と思う問題を1つ特定してみましょう。', '問題の焦点化', 'easy', '15分', 10, '{}', 'ユーザーのテーマ: {theme}\n最も解決したい課題を見つけるための質問を生成してください。'),
('身近な人にインタビュー', '家族や友人3人に探究テーマについて意見を聞いてみましょう。', '情報収集', 'medium', '30分', 20, '{}', 'ユーザーのテーマ: {theme}\nインタビューで聞くべき質問を3つ提案してください。'),
('現地調査の計画', 'テーマに関連する場所や施設を見学する計画を立てましょう。', '現地調査', 'hard', '45分', 30, '{}', 'ユーザーのテーマ: {theme}\n現地調査で得られる情報と調査方法を提案してください。'),
('専門家に質問', 'テーマの専門家にメールや電話で質問してみましょう。', '専門知識獲得', 'medium', '25分', 25, '{}', 'ユーザーのテーマ: {theme}\n専門家への質問リストと連絡方法を提案してください。'),
('データ分析に挑戦', 'テーマに関連する統計データや調査結果を分析してみましょう。', 'データ分析', 'hard', '60分', 40, '{"データ", "統計", "分析"}', 'ユーザーのテーマ: {theme}\n分析可能なデータソースと簡単な分析方法を提案してください。'),
('解決策のアイデア出し', 'ブレインストーミングで問題の解決策を10個考えてみましょう。', '解決策創出', 'medium', '20分', 20, '{}', 'ユーザーのテーマ: {theme}\n創造的な解決策を考えるためのフレームワークを提案してください。');

-- タイムライン用サンプルデータ
INSERT INTO vibes_tanq_timeline_cache (content_id, type, title, summary, source, published_at, tags, url, relevance_score, expires_at) VALUES
('news_001', 'news', 'SDGs達成に向けた地域の取り組み', '持続可能な開発目標の実現に向けて、全国の地域で様々な取り組みが始まっています。', 'サステナビリティニュース', '2024-01-05', '{"環境", "SDGs", "地域活動"}', '#', 0.8, CURRENT_TIMESTAMP + INTERVAL '7 days'),
('case_001', 'case_study', '高校生が開発した革新的アプリ', '社会課題解決をテーマにした高校生のアプリ開発プロジェクトが注目を集めています。', '探究学習事例集', '2024-01-04', '{"高校生", "アプリ開発", "社会課題"}', '#', 0.9, CURRENT_TIMESTAMP + INTERVAL '14 days'),
('trending_001', 'trending', '2024年注目の学習法', 'アクティブラーニングと探究学習の効果的な組み合わせ方が話題になっています。', '教育トレンド研究所', '2024-01-03', '{"学習法", "アクティブラーニング", "探究学習"}', '#', 0.7, CURRENT_TIMESTAMP + INTERVAL '30 days');

-- インデックスの最適化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contexts_user_id ON vibes_tanq_contexts (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_logs_user_timestamp ON vibes_tanq_logs (user_id, timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quest_actions_user_quest ON vibes_tanq_quest_actions (user_id, quest_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timeline_tags ON vibes_tanq_timeline_cache USING GIN (tags);

-- 自動更新用トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vibes_contexts_updated_at
    BEFORE UPDATE ON vibes_tanq_contexts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quest_templates_updated_at
    BEFORE UPDATE ON vibes_tanq_quest_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- データ保持ポリシー（オプション）
-- 古いログデータを定期的にクリーンアップする関数
CREATE OR REPLACE FUNCTION cleanup_old_vibes_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM vibes_tanq_logs 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- キャッシュクリーンアップ関数
CREATE OR REPLACE FUNCTION cleanup_expired_timeline_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM vibes_tanq_timeline_cache 
    WHERE expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;