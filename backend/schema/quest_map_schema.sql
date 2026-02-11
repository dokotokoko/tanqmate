-- 探Qマップ機能のデータベーススキーマ
-- PostgreSQL/Supabase用

-- =============================================
-- 1. クエストテーブル
-- =============================================
CREATE TABLE IF NOT EXISTS quest_map_quests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    goal TEXT NOT NULL,
    current_status VARCHAR(50) DEFAULT 'planning',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_quest_map_quests_user_id ON quest_map_quests(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_map_quests_status ON quest_map_quests(current_status);

-- 制約追加（usersテーブルが存在する場合）
-- ALTER TABLE quest_map_quests ADD CONSTRAINT fk_quest_map_quests_user_id 
-- FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- =============================================
-- 2. ノードテーブル
-- =============================================
CREATE TABLE IF NOT EXISTS quest_map_nodes (
    id BIGSERIAL PRIMARY KEY,
    quest_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    position_x INTEGER DEFAULT 0,
    position_y INTEGER DEFAULT 0,
    parent_id BIGINT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_quest_id ON quest_map_nodes(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_type ON quest_map_nodes(type);
CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_status ON quest_map_nodes(status);
CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_parent_id ON quest_map_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_position ON quest_map_nodes(position_x, position_y);

-- 制約追加
ALTER TABLE quest_map_nodes ADD CONSTRAINT IF NOT EXISTS fk_quest_map_nodes_quest_id 
FOREIGN KEY (quest_id) REFERENCES quest_map_quests(id) ON DELETE CASCADE;

ALTER TABLE quest_map_nodes ADD CONSTRAINT IF NOT EXISTS fk_quest_map_nodes_parent_id 
FOREIGN KEY (parent_id) REFERENCES quest_map_nodes(id) ON DELETE SET NULL;

ALTER TABLE quest_map_nodes ADD CONSTRAINT IF NOT EXISTS chk_quest_map_nodes_type 
CHECK (type IN ('goal', 'action', 'breakdown', 'milestone'));

ALTER TABLE quest_map_nodes ADD CONSTRAINT IF NOT EXISTS chk_quest_map_nodes_status 
CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled'));

-- =============================================
-- 3. エッジテーブル
-- =============================================
CREATE TABLE IF NOT EXISTS quest_map_edges (
    id BIGSERIAL PRIMARY KEY,
    quest_id BIGINT NOT NULL,
    source_id BIGINT NOT NULL,
    target_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'next',
    weight INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_quest_map_edges_quest_id ON quest_map_edges(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_map_edges_source_id ON quest_map_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_quest_map_edges_target_id ON quest_map_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_quest_map_edges_type ON quest_map_edges(type);

-- 制約追加
ALTER TABLE quest_map_edges ADD CONSTRAINT IF NOT EXISTS fk_quest_map_edges_quest_id 
FOREIGN KEY (quest_id) REFERENCES quest_map_quests(id) ON DELETE CASCADE;

ALTER TABLE quest_map_edges ADD CONSTRAINT IF NOT EXISTS fk_quest_map_edges_source_id 
FOREIGN KEY (source_id) REFERENCES quest_map_nodes(id) ON DELETE CASCADE;

ALTER TABLE quest_map_edges ADD CONSTRAINT IF NOT EXISTS fk_quest_map_edges_target_id 
FOREIGN KEY (target_id) REFERENCES quest_map_nodes(id) ON DELETE CASCADE;

ALTER TABLE quest_map_edges ADD CONSTRAINT IF NOT EXISTS chk_quest_map_edges_type 
CHECK (type IN ('next', 'breakdown', 'dependency', 'alternative'));

ALTER TABLE quest_map_edges ADD CONSTRAINT IF NOT EXISTS unq_quest_map_edges_source_target 
UNIQUE (source_id, target_id, type);

-- =============================================
-- 4. 履歴テーブル
-- =============================================
CREATE TABLE IF NOT EXISTS quest_map_history (
    id BIGSERIAL PRIMARY KEY,
    quest_id BIGINT NOT NULL,
    node_id BIGINT,
    action_type VARCHAR(100) NOT NULL,
    feedback TEXT,
    metadata JSONB DEFAULT '{}',
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_quest_map_history_quest_id ON quest_map_history(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_map_history_node_id ON quest_map_history(node_id);
CREATE INDEX IF NOT EXISTS idx_quest_map_history_action_type ON quest_map_history(action_type);
CREATE INDEX IF NOT EXISTS idx_quest_map_history_completed_at ON quest_map_history(completed_at);

-- 制約追加
ALTER TABLE quest_map_history ADD CONSTRAINT IF NOT EXISTS fk_quest_map_history_quest_id 
FOREIGN KEY (quest_id) REFERENCES quest_map_quests(id) ON DELETE CASCADE;

ALTER TABLE quest_map_history ADD CONSTRAINT IF NOT EXISTS fk_quest_map_history_node_id 
FOREIGN KEY (node_id) REFERENCES quest_map_nodes(id) ON DELETE SET NULL;

-- =============================================
-- 5. 更新時刻自動更新トリガー
-- =============================================

-- クエストテーブル用トリガー
CREATE OR REPLACE FUNCTION update_quest_map_quests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quest_map_quests_updated_at ON quest_map_quests;
CREATE TRIGGER trigger_quest_map_quests_updated_at
    BEFORE UPDATE ON quest_map_quests
    FOR EACH ROW
    EXECUTE FUNCTION update_quest_map_quests_updated_at();

-- ノードテーブル用トリガー
CREATE OR REPLACE FUNCTION update_quest_map_nodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quest_map_nodes_updated_at ON quest_map_nodes;
CREATE TRIGGER trigger_quest_map_nodes_updated_at
    BEFORE UPDATE ON quest_map_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_quest_map_nodes_updated_at();

-- =============================================
-- 6. Row Level Security (RLS) 設定 (Supabase用)
-- =============================================

-- クエストテーブルのRLS有効化
ALTER TABLE quest_map_quests ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のクエストのみアクセス可能
CREATE POLICY quest_map_quests_policy ON quest_map_quests
    FOR ALL USING (auth.uid()::text = user_id::text);

-- ノードテーブルのRLS有効化
ALTER TABLE quest_map_nodes ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のクエストのノードのみアクセス可能
CREATE POLICY quest_map_nodes_policy ON quest_map_nodes
    FOR ALL USING (
        quest_id IN (
            SELECT id FROM quest_map_quests 
            WHERE user_id::text = auth.uid()::text
        )
    );

-- エッジテーブルのRLS有効化
ALTER TABLE quest_map_edges ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のクエストのエッジのみアクセス可能
CREATE POLICY quest_map_edges_policy ON quest_map_edges
    FOR ALL USING (
        quest_id IN (
            SELECT id FROM quest_map_quests 
            WHERE user_id::text = auth.uid()::text
        )
    );

-- 履歴テーブルのRLS有効化
ALTER TABLE quest_map_history ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のクエストの履歴のみアクセス可能
CREATE POLICY quest_map_history_policy ON quest_map_history
    FOR ALL USING (
        quest_id IN (
            SELECT id FROM quest_map_quests 
            WHERE user_id::text = auth.uid()::text
        )
    );

-- =============================================
-- 7. サンプルデータ (開発用)
-- =============================================

-- 注意: 本番環境では実行しないでください
-- INSERT INTO quest_map_quests (user_id, goal, current_status) VALUES
-- (1, 'プログラミングスキルを身につける', 'in_progress'),
-- (1, '健康的な生活習慣を確立する', 'planning');

-- 実行完了メッセージ
SELECT 'Quest Map database schema created successfully!' as message;