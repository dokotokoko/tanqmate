# schemas/quest_map.py - 探Qマップ機能のPydanticスキーマ定義

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum


class NodeType(str, Enum):
    """ノードタイプ"""
    GOAL = "goal"
    ACTION = "action"
    BREAKDOWN = "breakdown"
    MILESTONE = "milestone"


class NodeStatus(str, Enum):
    """ノードステータス"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    CANCELLED = "cancelled"


class EdgeType(str, Enum):
    """エッジタイプ"""
    NEXT = "next"
    BREAKDOWN = "breakdown"
    DEPENDENCY = "dependency"
    ALTERNATIVE = "alternative"


class QuestStatus(str, Enum):
    """クエストステータス"""
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PAUSED = "paused"
    CANCELLED = "cancelled"


# ===== Request Schemas =====

class QuestCreateRequest(BaseModel):
    """新規クエスト作成リクエスト"""
    goal: str = Field(..., min_length=1, max_length=1000, description="達成したい目標")
    initial_context: Optional[str] = Field(None, max_length=2000, description="現在の状況・背景情報")
    
    @validator('goal')
    def validate_goal(cls, v):
        if not v or v.strip() == "":
            raise ValueError("ゴールは必須です")
        return v.strip()


class QuestUpdateRequest(BaseModel):
    """クエスト更新リクエスト"""
    goal: Optional[str] = Field(None, min_length=1, max_length=1000)
    current_status: Optional[QuestStatus] = Field(None)


class NodeGenerateRequest(BaseModel):
    """AI選択肢生成リクエスト"""
    quest_id: int = Field(..., gt=0)
    context: Optional[str] = Field(None, max_length=2000, description="追加のコンテキスト情報")
    node_count: Optional[int] = Field(5, ge=3, le=10, description="生成する選択肢の数")
    focus_category: Optional[str] = Field(None, max_length=100, description="特に焦点を当てるカテゴリ")


class NodeBreakdownRequest(BaseModel):
    """ノード細分化リクエスト"""
    node_id: int = Field(..., gt=0)
    detail_level: Optional[int] = Field(3, ge=2, le=5, description="詳細レベル（2-5）")
    context: Optional[str] = Field(None, max_length=1000, description="追加のコンテキスト")


class NodeExpandRequest(BaseModel):
    """ノード拡散リクエスト"""
    node_id: int = Field(..., gt=0)
    alternative_count: Optional[int] = Field(3, ge=2, le=8, description="代替案の数")
    context: Optional[str] = Field(None, max_length=1000, description="追加のコンテキスト")


class NodeCompleteRequest(BaseModel):
    """ノード完了リクエスト"""
    node_id: int = Field(..., gt=0)
    feedback: Optional[str] = Field(None, max_length=2000, description="完了時のフィードバック")
    evidence: Optional[str] = Field(None, max_length=1000, description="完了の証拠・成果物")
    rating: Optional[int] = Field(None, ge=1, le=5, description="達成度評価（1-5）")


class NodeUpdateRequest(BaseModel):
    """ノード更新リクエスト"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[NodeStatus] = Field(None)
    category: Optional[str] = Field(None, max_length=100)
    position_x: Optional[int] = Field(None)
    position_y: Optional[int] = Field(None)
    metadata: Optional[Dict[str, Any]] = Field(None)


class NodePositionUpdateRequest(BaseModel):
    """ノード位置更新リクエスト"""
    x: int = Field(..., description="X座標")
    y: int = Field(..., description="Y座標")


class EdgeCreateRequest(BaseModel):
    """エッジ作成リクエスト"""
    quest_id: int = Field(..., gt=0)
    source_id: int = Field(..., gt=0)
    target_id: int = Field(..., gt=0)
    type: EdgeType = Field(EdgeType.NEXT)
    weight: Optional[int] = Field(1, ge=1, le=10)
    metadata: Optional[Dict[str, Any]] = Field(None)
    
    @validator('target_id')
    def validate_different_nodes(cls, v, values):
        if 'source_id' in values and v == values['source_id']:
            raise ValueError("送信元と送信先のノードは異なる必要があります")
        return v


# ===== Response Schemas =====

class Position(BaseModel):
    """ノード位置情報"""
    x: int = Field(0)
    y: int = Field(0)


class NodeBase(BaseModel):
    """ノード基本情報"""
    id: int
    quest_id: int
    type: NodeType
    title: str
    description: Optional[str] = ""
    category: Optional[str] = None
    status: NodeStatus
    position: Position
    parent_id: Optional[int] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class NodeResponse(NodeBase):
    """ノード応答スキーマ"""
    children_count: Optional[int] = Field(0, description="子ノードの数")
    completion_rate: Optional[float] = Field(0.0, ge=0.0, le=1.0, description="完了率")


class EdgeResponse(BaseModel):
    """エッジ応答スキーマ"""
    id: int
    quest_id: int
    source_id: int
    target_id: int
    type: EdgeType
    weight: int = 1
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class QuestBase(BaseModel):
    """クエスト基本情報"""
    id: int
    user_id: int
    goal: str
    current_status: QuestStatus
    created_at: datetime
    updated_at: datetime


class QuestResponse(QuestBase):
    """クエスト応答スキーマ"""
    node_count: Optional[int] = Field(0, description="ノード総数")
    completed_nodes: Optional[int] = Field(0, description="完了ノード数")
    completion_rate: Optional[float] = Field(0.0, ge=0.0, le=1.0, description="全体完了率")


class QuestStatistics(BaseModel):
    """クエスト統計情報"""
    total_nodes: int = 0
    total_edges: int = 0
    completed_nodes: int = 0
    pending_nodes: int = 0
    in_progress_nodes: int = 0
    blocked_nodes: int = 0
    completion_rate: float = Field(0.0, ge=0.0, le=1.0)


class QuestGraphResponse(BaseModel):
    """クエストマップ全体のグラフデータ応答"""
    quest: QuestResponse
    nodes: List[NodeResponse]
    edges: List[EdgeResponse]
    statistics: QuestStatistics


class HistoryEntry(BaseModel):
    """履歴エントリ"""
    id: int
    quest_id: int
    node_id: Optional[int] = None
    action_type: str
    feedback: Optional[str] = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)
    completed_at: datetime
    created_at: datetime


class QuestHistoryResponse(BaseModel):
    """クエスト履歴応答"""
    quest_id: int
    entries: List[HistoryEntry]
    total_count: int


# ===== AI Generation Response Schemas =====

class GeneratedNodeOption(BaseModel):
    """AI生成されたノード選択肢"""
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, max_length=2000)
    type: NodeType = Field(NodeType.ACTION)
    category: Optional[str] = Field(None, max_length=100)
    priority: int = Field(1, ge=1, le=5, description="優先度（1-5）")
    difficulty: int = Field(3, ge=1, le=5, description="難易度（1-5）")
    estimated_duration: Optional[str] = Field(None, description="推定所要時間")
    prerequisites: Optional[List[str]] = Field(None, description="前提条件")
    expected_outcome: Optional[str] = Field(None, description="期待される成果")


class NodeGenerationResponse(BaseModel):
    """ノード生成応答"""
    quest_id: int
    suggested_nodes: List[GeneratedNodeOption]
    reasoning: str = Field(..., description="選択肢提案の理由")
    next_steps_advice: Optional[str] = Field(None, description="次のステップに関するアドバイス")


class BreakdownNodeOption(BaseModel):
    """分解されたノード選択肢"""
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, max_length=1000)
    order: int = Field(..., ge=1, description="実行順序")
    type: NodeType = Field(NodeType.ACTION)
    estimated_duration: Optional[str] = Field(None)
    dependencies: Optional[List[int]] = Field(None, description="依存する他のサブタスクのorder")


class NodeBreakdownResponse(BaseModel):
    """ノード細分化応答"""
    original_node_id: int
    subtasks: List[BreakdownNodeOption]
    reasoning: str = Field(..., description="分解理由と構成説明")
    completion_criteria: Optional[str] = Field(None, description="全体完了の判定基準")


class AlternativeNodeOption(BaseModel):
    """代替ノード選択肢"""
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, max_length=1000)
    approach: str = Field(..., description="アプローチの特徴")
    pros: List[str] = Field(..., description="メリット")
    cons: List[str] = Field(..., description="デメリット")
    difficulty: int = Field(3, ge=1, le=5)
    risk_level: int = Field(3, ge=1, le=5, description="リスクレベル")


class NodeExpansionResponse(BaseModel):
    """ノード拡散応答"""
    original_node_id: int
    alternatives: List[AlternativeNodeOption]
    reasoning: str = Field(..., description="代替案提案の理由")
    recommendation: Optional[str] = Field(None, description="推奨される選択肢の説明")


class NodeRecommendation(BaseModel):
    """ノード推奨"""
    node_id: int
    reason: str
    priority_score: float = Field(..., ge=0.0, le=1.0)
    category: str


class RecommendationResponse(BaseModel):
    """推奨応答"""
    quest_id: int
    recommendations: List[NodeRecommendation]
    overall_advice: str = Field(..., description="全体的なアドバイス")


# ===== Error Response Schemas =====

class ErrorDetail(BaseModel):
    """エラー詳細"""
    field: Optional[str] = None
    message: str
    code: Optional[str] = None


class ErrorResponse(BaseModel):
    """エラー応答"""
    error: str
    details: Optional[List[ErrorDetail]] = None
    status_code: int


# ===== Utility Schemas =====

class BulkOperationRequest(BaseModel):
    """一括操作リクエスト"""
    node_ids: List[int] = Field(..., min_items=1, max_items=50)
    operation: str = Field(..., pattern="^(complete|cancel|reset|delete)$")
    feedback: Optional[str] = Field(None, max_length=1000)


class BulkOperationResponse(BaseModel):
    """一括操作応答"""
    successful: List[int]
    failed: List[int]
    errors: Dict[int, str] = Field(default_factory=dict)


class QuestExportRequest(BaseModel):
    """クエスト エクスポートリクエスト"""
    quest_id: int = Field(..., gt=0)
    format: str = Field("json", pattern="^(json|yaml|mermaid)$")
    include_history: bool = Field(False)
    include_metadata: bool = Field(True)


class QuestImportRequest(BaseModel):
    """クエスト インポートリクエスト"""
    data: str = Field(..., min_length=1)
    format: str = Field("json", pattern="^(json|yaml)$")
    overwrite_existing: bool = Field(False)


# ===== Configuration =====

class Config:
    """共通設定"""
    json_encoders = {
        datetime: lambda v: v.isoformat()
    }
    use_enum_values = True