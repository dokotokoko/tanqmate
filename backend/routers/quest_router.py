# routers/quest_router.py - クエストシステム関連ルーター

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.quest_service import QuestService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/quests", tags=["quests"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class QuestResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    difficulty: int
    points: int
    required_evidence: str
    icon_name: Optional[str]
    is_active: bool
    created_at: str
    updated_at: str

class UserQuestResponse(BaseModel):
    id: int
    user_id: int
    quest_id: int
    status: str
    progress: int
    quest: QuestResponse
    started_at: Optional[str]
    completed_at: Optional[str]
    created_at: str
    updated_at: str

class QuestSubmissionCreate(BaseModel):
    description: str
    file_url: Optional[str] = None
    reflection_data: Optional[Dict[str, Any]] = None

class QuestSubmissionResponse(BaseModel):
    id: int
    user_quest_id: int
    quest_id: int
    description: str
    file_url: Optional[str]
    reflection_data: Optional[Dict[str, Any]]
    status: str
    points_awarded: int
    submitted_at: str

class UserQuestStart(BaseModel):
    quest_id: int

# 依存関数
def get_quest_service(current_user_id: int = Depends(get_current_user)) -> QuestService:
    """クエストサービス取得"""
    return service_manager.get_service(QuestService, current_user_id)

# エンドポイント
@router.get("", response_model=List[QuestResponse])
async def get_quests(
    category: Optional[str] = None,
    difficulty: Optional[int] = None,
    current_user_id: int = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service)
):
    """利用可能なクエスト一覧を取得"""
    quests = quest_service.get_available_quests(category, difficulty)
    return [
        QuestResponse(
            id=quest["id"],
            title=quest["title"],
            description=quest["description"],
            category=quest["category"],
            difficulty=quest["difficulty"],
            points=quest["points"],
            required_evidence=quest["required_evidence"],
            icon_name=quest["icon_name"],
            is_active=quest["is_active"],
            created_at=quest["created_at"],
            updated_at=quest["updated_at"]
        )
        for quest in quests
    ]

@router.get("/{quest_id}", response_model=QuestResponse)
async def get_quest(
    quest_id: int,
    current_user_id: int = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service)
):
    """特定のクエスト詳細を取得"""
    quest = quest_service.get_quest_by_id(quest_id)
    return QuestResponse(
        id=quest["id"],
        title=quest["title"],
        description=quest["description"],
        category=quest["category"],
        difficulty=quest["difficulty"],
        points=quest["points"],
        required_evidence=quest["required_evidence"],
        icon_name=quest["icon_name"],
        is_active=quest["is_active"],
        created_at=quest["created_at"],
        updated_at=quest["updated_at"]
    )

# ユーザークエスト関連のルーター
user_quest_router = APIRouter(prefix="/user-quests", tags=["user-quests"])

@user_quest_router.get("", response_model=List[UserQuestResponse])
async def get_user_quests(
    status: Optional[str] = None,
    current_user_id: int = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service)
):
    """ユーザーのクエスト進捗を取得"""
    user_quests = quest_service.get_user_quests(current_user_id, status)
    return [
        UserQuestResponse(
            id=uq["id"],
            user_id=uq["user_id"],
            quest_id=uq["quest_id"],
            status=uq["status"],
            progress=uq["progress"],
            quest=QuestResponse(
                id=uq["quest"]["id"],
                title=uq["quest"]["title"],
                description=uq["quest"]["description"],
                category=uq["quest"]["category"],
                difficulty=uq["quest"]["difficulty"],
                points=uq["quest"]["points"],
                required_evidence=uq["quest"]["required_evidence"],
                icon_name=uq["quest"]["icon_name"],
                is_active=uq["quest"]["is_active"],
                created_at=uq["quest"]["created_at"],
                updated_at=uq["quest"]["updated_at"]
            ),
            started_at=uq["started_at"],
            completed_at=uq["completed_at"],
            created_at=uq["created_at"],
            updated_at=uq["updated_at"]
        )
        for uq in user_quests
    ]

@user_quest_router.post("/start", response_model=UserQuestResponse)
async def start_quest(
    quest_data: UserQuestStart,
    current_user_id: int = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service)
):
    """クエストを開始"""
    result = await quest_service.start_quest(current_user_id, quest_data.quest_id)
    
    return UserQuestResponse(
        id=result["id"],
        user_id=result["user_id"],
        quest_id=result["quest_id"],
        status=result["status"],
        progress=result["progress"],
        quest=QuestResponse(
            id=result["quest"]["id"],
            title=result["quest"]["title"],
            description=result["quest"]["description"],
            category=result["quest"]["category"],
            difficulty=result["quest"]["difficulty"],
            points=result["quest"]["points"],
            required_evidence=result["quest"]["required_evidence"],
            icon_name=result["quest"]["icon_name"],
            is_active=result["quest"]["is_active"],
            created_at=result["quest"]["created_at"],
            updated_at=result["quest"]["updated_at"]
        ),
        started_at=result["started_at"],
        completed_at=result["completed_at"],
        created_at=result["created_at"],
        updated_at=result["updated_at"]
    )

@user_quest_router.post("/{user_quest_id}/submit", response_model=QuestSubmissionResponse)
async def submit_quest(
    user_quest_id: int,
    submission_data: QuestSubmissionCreate,
    current_user_id: int = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service)
):
    """クエストの成果物を提出"""
    result = await quest_service.submit_quest(
        user_quest_id=user_quest_id,
        user_id=current_user_id,
        description=submission_data.description,
        file_url=submission_data.file_url,
        reflection_data=submission_data.reflection_data
    )
    
    return QuestSubmissionResponse(
        id=result["id"],
        user_quest_id=result["user_quest_id"],
        quest_id=result["quest_id"],
        description=result["description"],
        file_url=result["file_url"],
        reflection_data=result["reflection_data"],
        status=result["status"],
        points_awarded=result["points_awarded"],
        submitted_at=result["submitted_at"]
    )

@user_quest_router.get("/{user_quest_id}/submission", response_model=QuestSubmissionResponse)
async def get_quest_submission(
    user_quest_id: int,
    current_user_id: int = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service)
):
    """クエスト提出内容を取得"""
    submission = quest_service.get_quest_submission(user_quest_id, current_user_id)
    
    return QuestSubmissionResponse(
        id=submission["id"],
        user_quest_id=submission["user_quest_id"],
        quest_id=submission["quest_id"],
        description=submission["description"],
        file_url=submission["file_url"],
        reflection_data=submission["reflection_data"],
        status=submission["status"],
        points_awarded=submission["points_awarded"],
        submitted_at=submission["submitted_at"]
    )

# 統計・管理機能
@router.get("/stats/overview")
async def get_quest_stats(
    current_user_id: int = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service)
):
    """クエスト統計情報を取得"""
    return quest_service.get_quest_stats(current_user_id)

@router.get("/debug/check-tables")
async def check_quest_tables(
    current_user_id: int = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service)
):
    """クエスト関連テーブルの存在確認（デバッグ用）"""
    return quest_service.check_quest_tables()

# =====================================================
# クエスト推薦・生成エンドポイント（main.pyから移行）
# =====================================================

class QuestRecommendationResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    difficulty: int
    points: int
    recommendation_score: float

class QuestGenerateRequest(BaseModel):
    theme: str
    difficulty: int = 3
    category: Optional[str] = None

@router.get("/recommendations", response_model=List[QuestRecommendationResponse])
async def get_quest_recommendations(
    limit: int = 5,
    current_user_id: int = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service)
):
    """おすすめクエスト一覧取得"""
    recommendations = quest_service.get_quest_recommendations(
        user_id=current_user_id,
        limit=min(limit, 10)  # 最大10件
    )
    
    return [
        QuestRecommendationResponse(
            id=rec["id"],
            title=rec["title"],
            description=rec["description"],
            category=rec["category"],
            difficulty=rec["difficulty"],
            points=rec["points"],
            recommendation_score=rec["recommendation_score"]
        )
        for rec in recommendations
    ]

@router.post("/generate", response_model=QuestResponse)
async def generate_quest(
    quest_data: QuestGenerateRequest,
    current_user_id: int = Depends(get_current_user),
    quest_service: QuestService = Depends(get_quest_service)
):
    """新しいクエスト生成（管理者機能）"""
    # 簡易的な管理者権限チェック（実際のシステムでは適切な権限管理を実装）
    # この例では全ユーザーが生成可能
    
    generated_quest = await quest_service.generate_quest(
        theme=quest_data.theme,
        difficulty=quest_data.difficulty,
        category=quest_data.category
    )
    
    return QuestResponse(
        id=generated_quest["id"],
        title=generated_quest["title"],
        description=generated_quest["description"],
        category=generated_quest["category"],
        difficulty=generated_quest["difficulty"],
        points=generated_quest["points"],
        required_evidence=generated_quest["required_evidence"],
        icon_name=generated_quest.get("icon_name"),
        is_active=generated_quest["is_active"],
        created_at=generated_quest["created_at"],
        updated_at=generated_quest["updated_at"]
    )

# ユーザークエストルーターをメインルーターに含める
router.include_router(user_quest_router)