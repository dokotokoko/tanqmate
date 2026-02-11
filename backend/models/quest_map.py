# models/quest_map.py - 探Qマップ機能のデータベーススキーマ定義

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from enum import Enum
import json


class NodeType(str, Enum):
    """ノードタイプの定義"""
    GOAL = "goal"           # ゴールノード
    ACTION = "action"       # アクションノード
    BREAKDOWN = "breakdown" # 分解ノード
    MILESTONE = "milestone" # マイルストーンノード


class NodeStatus(str, Enum):
    """ノードステータスの定義"""
    PENDING = "pending"     # 未開始
    IN_PROGRESS = "in_progress"  # 進行中
    COMPLETED = "completed" # 完了
    BLOCKED = "blocked"     # ブロック中
    CANCELLED = "cancelled" # キャンセル


class EdgeType(str, Enum):
    """エッジタイプの定義"""
    NEXT = "next"           # 次のステップ
    BREAKDOWN = "breakdown" # 分解関係
    DEPENDENCY = "dependency"  # 依存関係
    ALTERNATIVE = "alternative"  # 代替選択肢


class QuestStatus(str, Enum):
    """クエストステータスの定義"""
    PLANNING = "planning"   # 計画中
    IN_PROGRESS = "in_progress"  # 進行中
    COMPLETED = "completed" # 完了
    PAUSED = "paused"      # 一時停止
    CANCELLED = "cancelled" # キャンセル


class QuestMapModel:
    """探Qマップ機能のデータモデル定義クラス"""
    
    @staticmethod
    def get_quest_table_schema() -> Dict[str, Any]:
        """Questテーブルのスキーマ定義"""
        return {
            "table_name": "quest_map_quests",
            "columns": {
                "id": "BIGSERIAL PRIMARY KEY",
                "user_id": "BIGINT NOT NULL",
                "goal": "TEXT NOT NULL",
                "current_status": "VARCHAR(50) DEFAULT 'planning'",
                "created_at": "TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
                "updated_at": "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
            },
            "indexes": [
                "CREATE INDEX idx_quest_map_quests_user_id ON quest_map_quests(user_id)",
                "CREATE INDEX idx_quest_map_quests_status ON quest_map_quests(current_status)"
            ],
            "constraints": [
                "ALTER TABLE quest_map_quests ADD CONSTRAINT fk_quest_map_quests_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
            ]
        }
    
    @staticmethod
    def get_quest_node_table_schema() -> Dict[str, Any]:
        """QuestNodeテーブルのスキーマ定義"""
        return {
            "table_name": "quest_map_nodes",
            "columns": {
                "id": "BIGSERIAL PRIMARY KEY",
                "quest_id": "BIGINT NOT NULL",
                "type": "VARCHAR(50) NOT NULL",
                "title": "VARCHAR(500) NOT NULL",
                "description": "TEXT",
                "category": "VARCHAR(100)",
                "status": "VARCHAR(50) DEFAULT 'pending'",
                "position_x": "INTEGER DEFAULT 0",
                "position_y": "INTEGER DEFAULT 0",
                "parent_id": "BIGINT",
                "metadata": "JSONB DEFAULT '{}'",
                "created_at": "TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
                "updated_at": "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
            },
            "indexes": [
                "CREATE INDEX idx_quest_map_nodes_quest_id ON quest_map_nodes(quest_id)",
                "CREATE INDEX idx_quest_map_nodes_type ON quest_map_nodes(type)",
                "CREATE INDEX idx_quest_map_nodes_status ON quest_map_nodes(status)",
                "CREATE INDEX idx_quest_map_nodes_parent_id ON quest_map_nodes(parent_id)",
                "CREATE INDEX idx_quest_map_nodes_position ON quest_map_nodes(position_x, position_y)"
            ],
            "constraints": [
                "ALTER TABLE quest_map_nodes ADD CONSTRAINT fk_quest_map_nodes_quest_id FOREIGN KEY (quest_id) REFERENCES quest_map_quests(id) ON DELETE CASCADE",
                "ALTER TABLE quest_map_nodes ADD CONSTRAINT fk_quest_map_nodes_parent_id FOREIGN KEY (parent_id) REFERENCES quest_map_nodes(id) ON DELETE SET NULL",
                "ALTER TABLE quest_map_nodes ADD CONSTRAINT chk_quest_map_nodes_type CHECK (type IN ('goal', 'action', 'breakdown', 'milestone'))",
                "ALTER TABLE quest_map_nodes ADD CONSTRAINT chk_quest_map_nodes_status CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled'))"
            ]
        }
    
    @staticmethod
    def get_quest_edge_table_schema() -> Dict[str, Any]:
        """QuestEdgeテーブルのスキーマ定義"""
        return {
            "table_name": "quest_map_edges",
            "columns": {
                "id": "BIGSERIAL PRIMARY KEY",
                "quest_id": "BIGINT NOT NULL",
                "source_id": "BIGINT NOT NULL",
                "target_id": "BIGINT NOT NULL",
                "type": "VARCHAR(50) NOT NULL DEFAULT 'next'",
                "weight": "INTEGER DEFAULT 1",
                "metadata": "JSONB DEFAULT '{}'",
                "created_at": "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
            },
            "indexes": [
                "CREATE INDEX idx_quest_map_edges_quest_id ON quest_map_edges(quest_id)",
                "CREATE INDEX idx_quest_map_edges_source_id ON quest_map_edges(source_id)",
                "CREATE INDEX idx_quest_map_edges_target_id ON quest_map_edges(target_id)",
                "CREATE INDEX idx_quest_map_edges_type ON quest_map_edges(type)"
            ],
            "constraints": [
                "ALTER TABLE quest_map_edges ADD CONSTRAINT fk_quest_map_edges_quest_id FOREIGN KEY (quest_id) REFERENCES quest_map_quests(id) ON DELETE CASCADE",
                "ALTER TABLE quest_map_edges ADD CONSTRAINT fk_quest_map_edges_source_id FOREIGN KEY (source_id) REFERENCES quest_map_nodes(id) ON DELETE CASCADE",
                "ALTER TABLE quest_map_edges ADD CONSTRAINT fk_quest_map_edges_target_id FOREIGN KEY (target_id) REFERENCES quest_map_nodes(id) ON DELETE CASCADE",
                "ALTER TABLE quest_map_edges ADD CONSTRAINT chk_quest_map_edges_type CHECK (type IN ('next', 'breakdown', 'dependency', 'alternative'))",
                "ALTER TABLE quest_map_edges ADD CONSTRAINT unq_quest_map_edges_source_target UNIQUE (source_id, target_id, type)"
            ]
        }
    
    @staticmethod
    def get_quest_history_table_schema() -> Dict[str, Any]:
        """QuestHistoryテーブルのスキーマ定義"""
        return {
            "table_name": "quest_map_history",
            "columns": {
                "id": "BIGSERIAL PRIMARY KEY",
                "quest_id": "BIGINT NOT NULL",
                "node_id": "BIGINT",
                "action_type": "VARCHAR(100) NOT NULL",
                "feedback": "TEXT",
                "metadata": "JSONB DEFAULT '{}'",
                "completed_at": "TIMESTAMP WITH TIME ZONE DEFAULT NOW()",
                "created_at": "TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
            },
            "indexes": [
                "CREATE INDEX idx_quest_map_history_quest_id ON quest_map_history(quest_id)",
                "CREATE INDEX idx_quest_map_history_node_id ON quest_map_history(node_id)",
                "CREATE INDEX idx_quest_map_history_action_type ON quest_map_history(action_type)",
                "CREATE INDEX idx_quest_map_history_completed_at ON quest_map_history(completed_at)"
            ],
            "constraints": [
                "ALTER TABLE quest_map_history ADD CONSTRAINT fk_quest_map_history_quest_id FOREIGN KEY (quest_id) REFERENCES quest_map_quests(id) ON DELETE CASCADE",
                "ALTER TABLE quest_map_history ADD CONSTRAINT fk_quest_map_history_node_id FOREIGN KEY (node_id) REFERENCES quest_map_nodes(id) ON DELETE SET NULL"
            ]
        }

    @staticmethod
    def create_all_tables_sql() -> List[str]:
        """全テーブル作成用SQLスクリプト生成"""
        schemas = [
            QuestMapModel.get_quest_table_schema(),
            QuestMapModel.get_quest_node_table_schema(),
            QuestMapModel.get_quest_edge_table_schema(),
            QuestMapModel.get_quest_history_table_schema()
        ]
        
        sql_statements = []
        
        for schema in schemas:
            # テーブル作成
            columns_def = ", ".join([f"{name} {definition}" for name, definition in schema["columns"].items()])
            create_table_sql = f"CREATE TABLE IF NOT EXISTS {schema['table_name']} ({columns_def});"
            sql_statements.append(create_table_sql)
            
            # インデックス作成
            sql_statements.extend(schema.get("indexes", []))
            
            # 制約追加
            for constraint in schema.get("constraints", []):
                # 制約が既に存在する場合のエラーを無視
                sql_statements.append(f"{constraint} IF NOT EXISTS;")
        
        return sql_statements


class QuestMapData:
    """探Qマップのデータ操作ユーティリティクラス"""
    
    @staticmethod
    def create_quest_dict(
        user_id: int,
        goal: str,
        current_status: str = QuestStatus.PLANNING
    ) -> Dict[str, Any]:
        """クエストデータ作成"""
        now = datetime.now(timezone.utc).isoformat()
        return {
            "user_id": user_id,
            "goal": goal,
            "current_status": current_status,
            "created_at": now,
            "updated_at": now
        }
    
    @staticmethod
    def create_node_dict(
        quest_id: int,
        node_type: NodeType,
        title: str,
        description: Optional[str] = None,
        category: Optional[str] = None,
        position_x: int = 0,
        position_y: int = 0,
        parent_id: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """ノードデータ作成"""
        now = datetime.now(timezone.utc).isoformat()
        return {
            "quest_id": quest_id,
            "type": node_type.value,
            "title": title,
            "description": description or "",
            "category": category,
            "status": NodeStatus.PENDING.value,
            "position_x": position_x,
            "position_y": position_y,
            "parent_id": parent_id,
            "metadata": json.dumps(metadata or {}),
            "created_at": now,
            "updated_at": now
        }
    
    @staticmethod
    def create_edge_dict(
        quest_id: int,
        source_id: int,
        target_id: int,
        edge_type: EdgeType = EdgeType.NEXT,
        weight: int = 1,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """エッジデータ作成"""
        now = datetime.now(timezone.utc).isoformat()
        return {
            "quest_id": quest_id,
            "source_id": source_id,
            "target_id": target_id,
            "type": edge_type.value,
            "weight": weight,
            "metadata": json.dumps(metadata or {}),
            "created_at": now
        }
    
    @staticmethod
    def create_history_dict(
        quest_id: int,
        action_type: str,
        node_id: Optional[int] = None,
        feedback: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """履歴データ作成"""
        now = datetime.now(timezone.utc).isoformat()
        return {
            "quest_id": quest_id,
            "node_id": node_id,
            "action_type": action_type,
            "feedback": feedback or "",
            "metadata": json.dumps(metadata or {}),
            "completed_at": now,
            "created_at": now
        }
    
    @staticmethod
    def format_node_response(node_data: Dict[str, Any]) -> Dict[str, Any]:
        """ノードデータをAPI応答形式にフォーマット"""
        metadata = node_data.get("metadata", "{}")
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except json.JSONDecodeError:
                metadata = {}
        
        return {
            "id": node_data["id"],
            "quest_id": node_data["quest_id"],
            "type": node_data["type"],
            "title": node_data["title"],
            "description": node_data.get("description", ""),
            "category": node_data.get("category"),
            "status": node_data["status"],
            "position": {
                "x": node_data.get("position_x", 0),
                "y": node_data.get("position_y", 0)
            },
            "parent_id": node_data.get("parent_id"),
            "metadata": metadata,
            "created_at": node_data["created_at"],
            "updated_at": node_data["updated_at"]
        }
    
    @staticmethod
    def format_edge_response(edge_data: Dict[str, Any]) -> Dict[str, Any]:
        """エッジデータをAPI応答形式にフォーマット"""
        metadata = edge_data.get("metadata", "{}")
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except json.JSONDecodeError:
                metadata = {}
        
        return {
            "id": edge_data["id"],
            "quest_id": edge_data["quest_id"],
            "source_id": edge_data["source_id"],
            "target_id": edge_data["target_id"],
            "type": edge_data["type"],
            "weight": edge_data.get("weight", 1),
            "metadata": metadata,
            "created_at": edge_data["created_at"]
        }
    
    @staticmethod
    def format_quest_graph_response(
        quest_data: Dict[str, Any],
        nodes: List[Dict[str, Any]],
        edges: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """クエストマップ全体のグラフデータをAPI応答形式にフォーマット"""
        return {
            "quest": {
                "id": quest_data["id"],
                "user_id": quest_data["user_id"],
                "goal": quest_data["goal"],
                "current_status": quest_data["current_status"],
                "created_at": quest_data["created_at"],
                "updated_at": quest_data["updated_at"]
            },
            "nodes": [QuestMapData.format_node_response(node) for node in nodes],
            "edges": [QuestMapData.format_edge_response(edge) for edge in edges],
            "statistics": {
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "completed_nodes": len([n for n in nodes if n.get("status") == NodeStatus.COMPLETED.value]),
                "pending_nodes": len([n for n in nodes if n.get("status") == NodeStatus.PENDING.value]),
                "in_progress_nodes": len([n for n in nodes if n.get("status") == NodeStatus.IN_PROGRESS.value])
            }
        }


# テーブル作成用ユーティリティ関数
def generate_migration_sql() -> str:
    """マイグレーション用SQLスクリプト生成"""
    statements = QuestMapModel.create_all_tables_sql()
    return "\n".join(statements)


# サンプルデータ作成用関数
def create_sample_quest_data() -> Dict[str, List[Dict[str, Any]]]:
    """サンプルデータ作成（テスト用）"""
    sample_data = {
        "quests": [
            QuestMapData.create_quest_dict(1, "プログラミングスキルを身につける", QuestStatus.IN_PROGRESS),
            QuestMapData.create_quest_dict(2, "健康的な生活習慣を確立する", QuestStatus.PLANNING),
        ],
        "nodes": [],
        "edges": [],
        "history": []
    }
    
    # ノードサンプル（quest_id=1用）
    sample_data["nodes"].extend([
        QuestMapData.create_node_dict(1, NodeType.GOAL, "プログラミングマスター", "プログラミングの基礎から応用まで習得する", "programming", 0, 0),
        QuestMapData.create_node_dict(1, NodeType.ACTION, "Python基礎学習", "Python基礎文法とライブラリを学ぶ", "programming", 100, 100, 1),
        QuestMapData.create_node_dict(1, NodeType.ACTION, "Web開発実践", "FlaskまたはDjangoでWebアプリを作る", "programming", 200, 100, 1),
        QuestMapData.create_node_dict(1, NodeType.MILESTONE, "基礎完了", "Python基礎学習完了のマイルストーン", "programming", 150, 200, 2),
    ])
    
    return sample_data