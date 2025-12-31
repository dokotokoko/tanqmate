# routers/theme_router.py - テーマ探究ツール関連ルーター

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from services.theme_service import ThemeService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/framework-games", tags=["theme-exploration"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class ThemeDeepDiveRequest(BaseModel):
    theme: str
    parent_theme: str
    depth: int
    path: List[str]
    user_interests: List[str] = []

class ThemeDeepDiveResponse(BaseModel):
    suggestions: List[str]
    context_info: Dict[str, Any]

class ThemeSelectionSave(BaseModel):
    theme: str
    path: List[str] = []
    parent_theme: Optional[str] = None
    depth: Optional[int] = None
    user_interests: List[str] = []

class ThemeHistoryResponse(BaseModel):
    id: int
    theme: str
    path: List[str]
    parent_theme: Optional[str]
    depth: int
    user_interests: List[str]
    selected_at: str

class PopularThemeResponse(BaseModel):
    theme: str
    count: int
    rank: int

# 依存関数
def get_theme_service(current_user_id: int = Depends(get_current_user)) -> ThemeService:
    """テーマサービス取得"""
    return service_manager.get_service(ThemeService, current_user_id)

# エンドポイント
@router.post("/theme-deep-dive/suggestions", response_model=ThemeDeepDiveResponse)
async def generate_theme_suggestions(
    request: ThemeDeepDiveRequest,
    current_user_id: int = Depends(get_current_user),
    theme_service: ThemeService = Depends(get_theme_service)
):
    """探究テーマの深掘り提案を生成"""
    result = await theme_service.generate_theme_suggestions(
        theme=request.theme,
        parent_theme=request.parent_theme,
        depth=request.depth,
        path=request.path,
        user_interests=request.user_interests
    )
    
    return ThemeDeepDiveResponse(
        suggestions=result["suggestions"],
        context_info=result["context_info"]
    )

@router.post("/theme-deep-dive/save-selection")
async def save_theme_selection(
    request: ThemeSelectionSave,
    current_user_id: int = Depends(get_current_user),
    theme_service: ThemeService = Depends(get_theme_service)
):
    """テーマ選択の保存"""
    return await theme_service.save_theme_selection(
        user_id=current_user_id,
        theme=request.theme,
        path=request.path,
        parent_theme=request.parent_theme,
        depth=request.depth,
        user_interests=request.user_interests
    )

@router.get("/theme-deep-dive/history", response_model=List[ThemeHistoryResponse])
async def get_theme_history(
    limit: int = 20,
    current_user_id: int = Depends(get_current_user),
    theme_service: ThemeService = Depends(get_theme_service)
):
    """ユーザーのテーマ選択履歴取得"""
    history = theme_service.get_theme_selection_history(current_user_id, limit)
    
    return [
        ThemeHistoryResponse(
            id=item["id"],
            theme=item["theme"],
            path=item["path"],
            parent_theme=item["parent_theme"],
            depth=item["depth"],
            user_interests=item["user_interests"],
            selected_at=item["selected_at"]
        )
        for item in history
    ]

@router.get("/themes/popular", response_model=List[PopularThemeResponse])
async def get_popular_themes(
    limit: int = 10,
    current_user_id: int = Depends(get_current_user),
    theme_service: ThemeService = Depends(get_theme_service)
):
    """人気テーマの統計取得"""
    popular_themes = theme_service.get_popular_themes(limit)
    
    return [
        PopularThemeResponse(
            theme=theme["theme"],
            count=theme["count"],
            rank=theme["rank"]
        )
        for theme in popular_themes
    ]

@router.get("/themes/{theme}/related")
async def get_related_themes(
    theme: str,
    current_user_id: int = Depends(get_current_user),
    theme_service: ThemeService = Depends(get_theme_service)
):
    """関連テーマの提案"""
    related_themes = theme_service.suggest_related_themes(theme, current_user_id)
    
    return {
        "theme": theme,
        "related_themes": related_themes,
        "count": len(related_themes)
    }

@router.get("/themes/stats")
async def get_theme_statistics(
    current_user_id: int = Depends(get_current_user),
    theme_service: ThemeService = Depends(get_theme_service)
):
    """テーマ選択統計（ユーザー個人）"""
    return theme_service.get_theme_statistics(current_user_id)

@router.get("/themes/stats/global")
async def get_global_theme_statistics(
    current_user_id: int = Depends(get_current_user),
    theme_service: ThemeService = Depends(get_theme_service)
):
    """テーマ選択統計（全体）"""
    return theme_service.get_theme_statistics()

# 旧API互換エンドポイント（段階移行用）
@router.post("/theme-deep-dive/save-selection", deprecated=True)
async def save_theme_selection_legacy(
    request: Dict[str, Any],
    current_user_id: int = Depends(get_current_user),
    theme_service: ThemeService = Depends(get_theme_service)
):
    """テーマ選択の保存（レガシー形式）"""
    return await theme_service.save_theme_selection(
        user_id=current_user_id,
        theme=request.get("theme"),
        path=request.get("path", []),
        parent_theme=request.get("parent_theme"),
        depth=request.get("depth"),
        user_interests=request.get("user_interests", [])
    )