# routers/memo_router.py - メモ関連ルーター

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.memo_service import MemoService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/memos", tags=["memos"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class MemoSave(BaseModel):
    content: str

class MemoCreate(BaseModel):
    project_id: int
    title: Optional[str] = None
    content: Optional[str] = None

class MemoUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

class MemoResponse(BaseModel):
    id: int
    project_id: int
    title: Optional[str]
    content: Optional[str]
    created_at: str
    updated_at: str

class MemoSearchRequest(BaseModel):
    query: str
    project_id: Optional[int] = None
    limit: int = 20

# 依存関数
def get_memo_service(current_user_id: int = Depends(get_current_user)) -> MemoService:
    """メモサービス取得"""
    return service_manager.get_service(MemoService, current_user_id)

# エンドポイント
@router.post("", response_model=MemoResponse)
async def create_memo(
    memo_data: MemoCreate,
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """メモ作成"""
    result = await memo_service.create_memo(
        user_id=current_user_id,
        project_id=memo_data.project_id,
        title=memo_data.title,
        content=memo_data.content
    )
    
    return MemoResponse(
        id=result["id"],
        project_id=result["project_id"],
        title=result["title"],
        content=result["content"],
        created_at=result["created_at"],
        updated_at=result["updated_at"]
    )

@router.get("", response_model=List[MemoResponse])
async def get_user_memos(
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """ユーザーの全メモ取得"""
    memos = memo_service.get_user_memos(current_user_id)
    return [
        MemoResponse(
            id=memo["id"],
            project_id=memo["project_id"],
            title=memo["title"],
            content=memo["content"],
            created_at=memo["created_at"],
            updated_at=memo["updated_at"]
        )
        for memo in memos
    ]

@router.get("/{memo_id}", response_model=MemoResponse)
async def get_memo_by_id(
    memo_id: int,
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """特定メモ取得"""
    memo = memo_service.get_memo_by_id(memo_id, current_user_id)
    return MemoResponse(
        id=memo["id"],
        title=memo["title"],
        content=memo["content"],
        tags=memo["tags"],
        project_id=memo["project_id"],
        created_at=memo["created_at"],
        updated_at=memo["updated_at"]
    )

@router.put("/{memo_id}", response_model=MemoResponse)
async def update_memo(
    memo_id: int,
    memo_data: MemoUpdate,
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """メモ更新"""
    updated_memo = await memo_service.update_memo(
        memo_id=memo_id,
        user_id=current_user_id,
        title=memo_data.title,
        content=memo_data.content
    )
    
    return MemoResponse(
        id=updated_memo["id"],
        title=updated_memo["title"],
        content=updated_memo["content"],
        tags=updated_memo["tags"],
        project_id=updated_memo["project_id"],
        created_at=updated_memo["created_at"],
        updated_at=updated_memo["updated_at"]
    )

@router.delete("/{memo_id}")
async def delete_memo(
    memo_id: int,
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """メモ削除"""
    return await memo_service.delete_memo(memo_id, current_user_id)

@router.get("/project/{project_id}", response_model=List[MemoResponse])
async def get_project_memos(
    project_id: int,
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """プロジェクト内メモ一覧取得"""
    memos = memo_service.get_project_memos(current_user_id, project_id)
    return [
        MemoResponse(
            id=memo["id"],
            project_id=memo["project_id"],
            title=memo["title"],
            content=memo["content"],
            created_at=memo["created_at"],
            updated_at=memo["updated_at"]
        )
        for memo in memos
    ]

@router.post("/search", response_model=List[MemoResponse])
async def search_memos(
    search_data: MemoSearchRequest,
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """メモ検索"""
    memos = memo_service.search_memos(
        user_id=current_user_id,
        query=search_data.query,
        project_id=search_data.project_id,
        limit=search_data.limit
    )
    
    return [
        MemoResponse(
            id=memo["id"],
            project_id=memo["project_id"],
            title=memo["title"],
            content=memo["content"],
            created_at=memo["created_at"],
            updated_at=memo["updated_at"]
        )
        for memo in memos
    ]

@router.get("/stats/overview")
async def get_memo_stats(
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """メモ統計情報取得"""
    return memo_service.get_memo_stats(current_user_id)

# 旧API互換エンドポイント（段階移行用）
@router.post("/save", response_model=MemoResponse, deprecated=True)
async def save_memo_legacy(
    memo_data: MemoSave,
    current_user_id: int = Depends(get_current_user)
):
    """レガシーメモ保存（非推奨）"""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="page_memosベースのメモ保存は現在利用できません。プロジェクトベースのメモ機能をご利用ください。"
    )

# ===============================================
# レガシーエンドポイント（後方互換性のため維持）
# ===============================================

@router.post("/projects/{project_id}/memos", response_model=MemoResponse, deprecated=True)
async def create_project_memo_legacy(
    project_id: int,
    memo_data: MemoCreate,
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """
    [非推奨] プロジェクト内メモ作成（レガシー版）
    代わりに POST /memos を使用してください
    """
    # 新しいAPIに処理を委譲（project_idを設定）
    result = await memo_service.create_memo(
        user_id=current_user_id,
        project_id=project_id,
        title=memo_data.title,
        content=memo_data.content
    )
    
    return MemoResponse(
        id=result["id"],
        project_id=result["project_id"],
        title=result["title"],
        content=result["content"],
        created_at=result["created_at"],
        updated_at=result["updated_at"]
    )

@router.get("/projects/{project_id}/memos", response_model=List[MemoResponse], deprecated=True)
async def get_project_memos_legacy(
    project_id: int,
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """
    [非推奨] プロジェクト内メモ一覧取得（レガシー版）
    代わりに GET /memos/project/{project_id} を使用してください
    """
    # 新しいAPIに処理を委譲
    memos = memo_service.get_project_memos(current_user_id, project_id)
    return [
        MemoResponse(
            id=memo["id"],
            project_id=memo["project_id"],
            title=memo["title"],
            content=memo["content"],
            created_at=memo["created_at"],
            updated_at=memo["updated_at"]
        )
        for memo in memos
    ]