# backend/scripts/migrate_quest_map.py - 探Qマップマイグレーションスクリプト
import os
import sys
import asyncio
import logging
import argparse
from datetime import datetime
from typing import List, Dict, Any
import json

# プロジェクトルートを追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.quest_map import QuestMapModel, QuestMapData
from config.database import get_database_connection

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('migration.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class QuestMapMigration:
    """探Qマップマイグレーションクラス"""
    
    def __init__(self, db_connection):
        self.db = db_connection
        self.migration_history = []
    
    async def run_migrations(self, target_version: str = None):
        """マイグレーション実行"""
        logger.info("Starting Quest Map migration...")
        
        try:
            # マイグレーション履歴テーブル作成
            await self.create_migration_table()
            
            # 実行済みマイグレーション取得
            executed = await self.get_executed_migrations()
            
            # マイグレーション一覧取得
            migrations = self.get_migration_list()
            
            # 実行すべきマイグレーション特定
            pending = [m for m in migrations if m['version'] not in executed]
            
            if target_version:
                pending = [m for m in pending if m['version'] <= target_version]
            
            logger.info(f"Found {len(pending)} pending migrations")
            
            # マイグレーション実行
            for migration in pending:
                await self.execute_migration(migration)
            
            logger.info("Migration completed successfully!")
            
        except Exception as e:
            logger.error(f"Migration failed: {e}")
            raise
    
    async def create_migration_table(self):
        """マイグレーション履歴テーブル作成"""
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS quest_map_migrations (
            id SERIAL PRIMARY KEY,
            version VARCHAR(50) NOT NULL UNIQUE,
            description TEXT,
            executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            success BOOLEAN DEFAULT TRUE,
            error_message TEXT
        );
        """
        
        await self.db.execute(create_table_sql)
        logger.info("Migration history table created/verified")
    
    async def get_executed_migrations(self) -> List[str]:
        """実行済みマイグレーション取得"""
        query = "SELECT version FROM quest_map_migrations WHERE success = TRUE ORDER BY executed_at"
        
        try:
            result = await self.db.fetch_all(query)
            return [row['version'] for row in result]
        except Exception:
            # テーブルが存在しない場合
            return []
    
    def get_migration_list(self) -> List[Dict[str, Any]]:
        """マイグレーション一覧定義"""
        return [
            {
                'version': '001_create_base_tables',
                'description': '基本テーブル作成',
                'sql': self.migration_001_create_base_tables,
            },
            {
                'version': '002_add_indexes',
                'description': 'インデックス追加',
                'sql': self.migration_002_add_indexes,
            },
            {
                'version': '003_add_constraints',
                'description': '制約追加',
                'sql': self.migration_003_add_constraints,
            },
            {
                'version': '004_add_metadata_columns',
                'description': 'メタデータカラム追加',
                'sql': self.migration_004_add_metadata_columns,
            },
            {
                'version': '005_add_performance_indexes',
                'description': 'パフォーマンス向上インデックス',
                'sql': self.migration_005_add_performance_indexes,
            },
            {
                'version': '006_add_audit_columns',
                'description': '監査カラム追加',
                'sql': self.migration_006_add_audit_columns,
            }
        ]
    
    async def execute_migration(self, migration: Dict[str, Any]):
        """個別マイグレーション実行"""
        version = migration['version']
        description = migration['description']
        
        logger.info(f"Executing migration {version}: {description}")
        
        try:
            # トランザクション開始
            async with self.db.transaction():
                # マイグレーションSQL実行
                sql_statements = migration['sql']()
                
                for sql in sql_statements:
                    logger.debug(f"Executing SQL: {sql[:100]}...")
                    await self.db.execute(sql)
                
                # マイグレーション履歴記録
                await self.record_migration_success(version, description)
                
                logger.info(f"Migration {version} completed successfully")
                
        except Exception as e:
            logger.error(f"Migration {version} failed: {e}")
            await self.record_migration_failure(version, description, str(e))
            raise
    
    async def record_migration_success(self, version: str, description: str):
        """マイグレーション成功記録"""
        query = """
        INSERT INTO quest_map_migrations (version, description, success)
        VALUES ($1, $2, TRUE)
        """
        await self.db.execute(query, version, description)
    
    async def record_migration_failure(self, version: str, description: str, error: str):
        """マイグレーション失敗記録"""
        try:
            query = """
            INSERT INTO quest_map_migrations (version, description, success, error_message)
            VALUES ($1, $2, FALSE, $3)
            """
            await self.db.execute(query, version, description, error)
        except Exception:
            # 履歴記録に失敗した場合はログのみ
            logger.error(f"Failed to record migration failure: {error}")
    
    # ===== 個別マイグレーション定義 =====
    
    def migration_001_create_base_tables(self) -> List[str]:
        """基本テーブル作成"""
        return [
            # クエストテーブル
            """
            CREATE TABLE IF NOT EXISTS quest_map_quests (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                goal TEXT NOT NULL,
                current_status VARCHAR(50) DEFAULT 'planning',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            """,
            
            # ノードテーブル
            """
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
            """,
            
            # エッジテーブル
            """
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
            """,
            
            # 履歴テーブル
            """
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
            """,
        ]
    
    def migration_002_add_indexes(self) -> List[str]:
        """インデックス追加"""
        return [
            "CREATE INDEX IF NOT EXISTS idx_quest_map_quests_user_id ON quest_map_quests(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_quests_status ON quest_map_quests(current_status);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_quest_id ON quest_map_nodes(quest_id);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_type ON quest_map_nodes(type);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_status ON quest_map_nodes(status);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_parent_id ON quest_map_nodes(parent_id);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_edges_quest_id ON quest_map_edges(quest_id);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_edges_source_id ON quest_map_edges(source_id);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_edges_target_id ON quest_map_edges(target_id);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_history_quest_id ON quest_map_history(quest_id);",
        ]
    
    def migration_003_add_constraints(self) -> List[str]:
        """制約追加"""
        return [
            # 外部キー制約
            """
            ALTER TABLE quest_map_nodes 
            ADD CONSTRAINT IF NOT EXISTS fk_quest_map_nodes_quest_id 
            FOREIGN KEY (quest_id) REFERENCES quest_map_quests(id) ON DELETE CASCADE;
            """,
            
            """
            ALTER TABLE quest_map_nodes 
            ADD CONSTRAINT IF NOT EXISTS fk_quest_map_nodes_parent_id 
            FOREIGN KEY (parent_id) REFERENCES quest_map_nodes(id) ON DELETE SET NULL;
            """,
            
            """
            ALTER TABLE quest_map_edges 
            ADD CONSTRAINT IF NOT EXISTS fk_quest_map_edges_quest_id 
            FOREIGN KEY (quest_id) REFERENCES quest_map_quests(id) ON DELETE CASCADE;
            """,
            
            """
            ALTER TABLE quest_map_edges 
            ADD CONSTRAINT IF NOT EXISTS fk_quest_map_edges_source_id 
            FOREIGN KEY (source_id) REFERENCES quest_map_nodes(id) ON DELETE CASCADE;
            """,
            
            """
            ALTER TABLE quest_map_edges 
            ADD CONSTRAINT IF NOT EXISTS fk_quest_map_edges_target_id 
            FOREIGN KEY (target_id) REFERENCES quest_map_nodes(id) ON DELETE CASCADE;
            """,
            
            # チェック制約
            """
            ALTER TABLE quest_map_nodes 
            ADD CONSTRAINT IF NOT EXISTS chk_quest_map_nodes_type 
            CHECK (type IN ('goal', 'action', 'breakdown', 'milestone'));
            """,
            
            """
            ALTER TABLE quest_map_nodes 
            ADD CONSTRAINT IF NOT EXISTS chk_quest_map_nodes_status 
            CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled'));
            """,
            
            """
            ALTER TABLE quest_map_edges 
            ADD CONSTRAINT IF NOT EXISTS chk_quest_map_edges_type 
            CHECK (type IN ('next', 'breakdown', 'dependency', 'alternative'));
            """,
            
            # ユニーク制約
            """
            ALTER TABLE quest_map_edges 
            ADD CONSTRAINT IF NOT EXISTS unq_quest_map_edges_source_target 
            UNIQUE (source_id, target_id, type);
            """,
        ]
    
    def migration_004_add_metadata_columns(self) -> List[str]:
        """メタデータカラム追加"""
        return [
            "ALTER TABLE quest_map_quests ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT FALSE;",
            "ALTER TABLE quest_map_quests ADD COLUMN IF NOT EXISTS complexity_score INTEGER;",
            "ALTER TABLE quest_map_quests ADD COLUMN IF NOT EXISTS estimated_duration INTERVAL;",
            "ALTER TABLE quest_map_nodes ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2);",
            "ALTER TABLE quest_map_nodes ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1;",
            "ALTER TABLE quest_map_nodes ADD COLUMN IF NOT EXISTS estimated_time INTERVAL;",
            "ALTER TABLE quest_map_nodes ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;",
        ]
    
    def migration_005_add_performance_indexes(self) -> List[str]:
        """パフォーマンス向上インデックス"""
        return [
            "CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_position ON quest_map_nodes(position_x, position_y);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_updated_at ON quest_map_nodes(updated_at);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_history_completed_at ON quest_map_history(completed_at);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_quests_created_at ON quest_map_quests(created_at);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_category ON quest_map_nodes(category);",
            
            # 複合インデックス
            "CREATE INDEX IF NOT EXISTS idx_quest_map_nodes_quest_status ON quest_map_nodes(quest_id, status);",
            "CREATE INDEX IF NOT EXISTS idx_quest_map_edges_source_type ON quest_map_edges(source_id, type);",
        ]
    
    def migration_006_add_audit_columns(self) -> List[str]:
        """監査カラム追加"""
        return [
            "ALTER TABLE quest_map_quests ADD COLUMN IF NOT EXISTS created_by BIGINT;",
            "ALTER TABLE quest_map_quests ADD COLUMN IF NOT EXISTS updated_by BIGINT;",
            "ALTER TABLE quest_map_quests ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;",
            "ALTER TABLE quest_map_nodes ADD COLUMN IF NOT EXISTS created_by BIGINT;",
            "ALTER TABLE quest_map_nodes ADD COLUMN IF NOT EXISTS updated_by BIGINT;",
            "ALTER TABLE quest_map_nodes ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;",
            
            # トリガー作成（更新時刻自動更新）
            """
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = NOW();
                NEW.version = OLD.version + 1;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
            """,
            
            """
            DROP TRIGGER IF EXISTS trigger_quest_updated_at ON quest_map_quests;
            CREATE TRIGGER trigger_quest_updated_at 
                BEFORE UPDATE ON quest_map_quests 
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            """,
            
            """
            DROP TRIGGER IF EXISTS trigger_node_updated_at ON quest_map_nodes;
            CREATE TRIGGER trigger_node_updated_at 
                BEFORE UPDATE ON quest_map_nodes 
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            """,
        ]
    
    async def rollback_migration(self, target_version: str):
        """マイグレーションロールバック"""
        logger.info(f"Rolling back to version {target_version}")
        
        try:
            # 実装: 指定バージョン以降のマイグレーションを逆順で実行
            # 実際の実装では、各マイグレーションにrollback SQLも定義する
            logger.warning("Rollback functionality not fully implemented")
            
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            raise
    
    async def validate_schema(self) -> bool:
        """スキーマ検証"""
        logger.info("Validating Quest Map schema...")
        
        try:
            # 必要なテーブルの存在確認
            required_tables = [
                'quest_map_quests',
                'quest_map_nodes', 
                'quest_map_edges',
                'quest_map_history'
            ]
            
            for table in required_tables:
                query = """
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                );
                """
                result = await self.db.fetch_one(query, table)
                if not result['exists']:
                    logger.error(f"Required table {table} not found")
                    return False
            
            # 必要なカラムの存在確認
            essential_columns = {
                'quest_map_quests': ['id', 'user_id', 'goal', 'current_status'],
                'quest_map_nodes': ['id', 'quest_id', 'type', 'title', 'status'],
                'quest_map_edges': ['id', 'quest_id', 'source_id', 'target_id', 'type']
            }
            
            for table, columns in essential_columns.items():
                for column in columns:
                    query = """
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = $1 AND column_name = $2
                    );
                    """
                    result = await self.db.fetch_one(query, table, column)
                    if not result['exists']:
                        logger.error(f"Required column {table}.{column} not found")
                        return False
            
            logger.info("Schema validation successful")
            return True
            
        except Exception as e:
            logger.error(f"Schema validation failed: {e}")
            return False

async def main():
    """メイン実行関数"""
    parser = argparse.ArgumentParser(description='Quest Map Migration Tool')
    parser.add_argument('--action', choices=['migrate', 'rollback', 'validate'], 
                       default='migrate', help='Action to perform')
    parser.add_argument('--target', type=str, help='Target migration version')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be executed')
    
    args = parser.parse_args()
    
    # データベース接続
    try:
        db = await get_database_connection()
        migration = QuestMapMigration(db)
        
        if args.action == 'migrate':
            if args.dry_run:
                logger.info("DRY RUN: Would execute migrations")
                # 実装: 実行予定のマイグレーションを表示
            else:
                await migration.run_migrations(args.target)
                
        elif args.action == 'rollback':
            if not args.target:
                logger.error("Target version required for rollback")
                sys.exit(1)
            await migration.rollback_migration(args.target)
            
        elif args.action == 'validate':
            success = await migration.validate_schema()
            sys.exit(0 if success else 1)
            
    except Exception as e:
        logger.error(f"Migration failed: {e}")
        sys.exit(1)
    
    finally:
        if 'db' in locals():
            await db.disconnect()

if __name__ == '__main__':
    asyncio.run(main())