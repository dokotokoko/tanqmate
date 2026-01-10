# routers/vibes_tanq_router.py - Vibes 探Q機能ルーター

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
from services.vibes_tanq_service import VibesTanqService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/vibes-tanq", tags=["vibes-tanq"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class UserRegistrationRequest(BaseModel):
    theme_text: str
    interest_tags: List[str]
    vibes_actions: List[str]

class UserContextResponse(BaseModel):
    theme: str
    interestTags: List[str]
    vibesActions: List[str]
    currentStage: str

class QuestRecommendation(BaseModel):
    id: str
    title: str
    description: str
    estimatedTime: str
    difficulty: str
    category: str
    points: int
    status: str

class TimelineItem(BaseModel):
    id: str
    type: str
    title: str
    summary: str
    source: str
    publishedAt: str
    tags: List[str]
    url: Optional[str] = None

class QuestActionRequest(BaseModel):
    action: str  # 'start', 'complete', 'skip'
    questId: str
    reflection: Optional[str] = None

# 依存関数
def get_vibes_tanq_service(current_user_id: int = Depends(get_current_user)) -> VibesTanqService:
    """Vibes 探Qサービス取得"""
    return service_manager.get_service(VibesTanqService, current_user_id)

# エンドポイント
@router.post("/register")
async def register_user_context(
    request: UserRegistrationRequest,
    current_user_id: int = Depends(get_current_user),
    vibes_tanq_service: VibesTanqService = Depends(get_vibes_tanq_service)
):
    """ユーザーコンテキストの登録"""
    try:
        result = await vibes_tanq_service.register_user_context(
            user_id=current_user_id,
            theme_text=request.theme_text,
            interest_tags=request.interest_tags,
            vibes_actions=request.vibes_actions
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/context", response_model=UserContextResponse)
async def get_user_context(
    current_user_id: int = Depends(get_current_user),
    vibes_tanq_service: VibesTanqService = Depends(get_vibes_tanq_service)
):
    """ユーザーコンテキストの取得"""
    try:
        context = vibes_tanq_service.get_user_context(current_user_id)
        return UserContextResponse(
            theme=context.get("theme_text", ""),
            interestTags=context.get("interest_tags", []),
            vibesActions=context.get("vibes_actions", []),
            currentStage=context.get("progress_stage", "調査中")
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail="User context not found")

@router.get("/quests/recommendations", response_model=List[QuestRecommendation])
async def get_quest_recommendations(
    limit: int = 3,
    current_user_id: int = Depends(get_current_user),
    vibes_tanq_service: VibesTanqService = Depends(get_vibes_tanq_service)
):
    """パーソナライズされたクエスト推薦"""
    try:
        quests = await vibes_tanq_service.generate_personalized_quests(
            user_id=current_user_id,
            limit=limit
        )
        
        return [
            QuestRecommendation(
                id=quest["id"],
                title=quest["title"],
                description=quest["description"],
                estimatedTime=quest["estimated_time"],
                difficulty=quest["difficulty"],
                category=quest["category"],
                points=quest["points"],
                status=quest.get("status", "not_started")
            )
            for quest in quests
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/timeline", response_model=List[TimelineItem])
async def get_timeline(
    limit: int = 3,
    current_user_id: int = Depends(get_current_user),
    vibes_tanq_service: VibesTanqService = Depends(get_vibes_tanq_service)
):
    """パーソナライズされたタイムライン取得"""
    try:
        timeline_items = await vibes_tanq_service.generate_personalized_timeline(
            user_id=current_user_id,
            limit=limit
        )
        
        return [
            TimelineItem(
                id=item["id"],
                type=item["type"],
                title=item["title"],
                summary=item["summary"],
                source=item["source"],
                publishedAt=item["published_at"],
                tags=item["tags"],
                url=item.get("url")
            )
            for item in timeline_items
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/quests/action")
async def perform_quest_action(
    request: QuestActionRequest,
    current_user_id: int = Depends(get_current_user),
    vibes_tanq_service: VibesTanqService = Depends(get_vibes_tanq_service)
):
    """クエストアクション実行"""
    try:
        result = await vibes_tanq_service.perform_quest_action(
            user_id=current_user_id,
            quest_id=request.questId,
            action=request.action,
            reflection=request.reflection
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log-event")
async def log_user_event(
    event_data: Dict[str, Any],
    current_user_id: int = Depends(get_current_user),
    vibes_tanq_service: VibesTanqService = Depends(get_vibes_tanq_service)
):
    """ユーザーイベントログ記録"""
    try:
        await vibes_tanq_service.log_user_event(
            user_id=current_user_id,
            event_type=event_data.get("event_type"),
            target_type=event_data.get("target_type"),
            target_id=event_data.get("target_id"),
            context_snapshot=event_data.get("context_snapshot", {})
        )
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/overview")
async def get_analytics_overview(
    current_user_id: int = Depends(get_current_user),
    vibes_tanq_service: VibesTanqService = Depends(get_vibes_tanq_service)
):
    """ユーザー分析概要"""
    try:
        analytics = vibes_tanq_service.get_user_analytics(current_user_id)
        return analytics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/context")
async def update_user_context(
    context_data: Dict[str, Any],
    current_user_id: int = Depends(get_current_user),
    vibes_tanq_service: VibesTanqService = Depends(get_vibes_tanq_service)
):
    """ユーザーコンテキストの更新"""
    try:
        result = await vibes_tanq_service.update_user_context(
            user_id=current_user_id,
            update_data=context_data
        )
        return {"status": "success", "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# デバッグ用エンドポイント
@router.get("/debug/context")
async def debug_get_context(
    current_user_id: int = Depends(get_current_user),
    vibes_tanq_service: VibesTanqService = Depends(get_vibes_tanq_service)
):
    """デバッグ用コンテキスト取得"""
    try:
        context = vibes_tanq_service.get_user_context(current_user_id)
        return {
            "user_id": current_user_id,
            "context": context,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "error": str(e),
            "user_id": current_user_id,
            "timestamp": datetime.now().isoformat()
        }