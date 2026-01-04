# routers/project_router.py - プロジェクト関連ルーター

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from services.project_service import ProjectService
from services.memo_service import MemoService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/projects", tags=["projects"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class ProjectCreate(BaseModel):
    theme: str
    question: Optional[str] = None
    hypothesis: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None

class ProjectUpdate(BaseModel):
    theme: Optional[str] = None
    question: Optional[str] = None
    hypothesis: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    theme: str
    question: Optional[str] = None
    hypothesis: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    created_at: str
    updated_at: str

class MemoCreate(BaseModel):
    title: Optional[str] = None
    content: str

class MemoResponse(BaseModel):
    id: int
    project_id: int
    title: Optional[str] = None
    content: str
    created_at: str
    updated_at: str

# 依存関数
def get_project_service(current_user_id: int = Depends(get_current_user)) -> ProjectService:
    """プロジェクトサービス取得"""
    return service_manager.get_service(ProjectService, current_user_id)

def get_memo_service(current_user_id: int = Depends(get_current_user)) -> MemoService:
    """メモサービス取得"""
    return service_manager.get_service(MemoService, current_user_id)

# エンドポイント
@router.post("", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate,
    current_user_id: int = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service)
):
    """プロジェクト作成"""
    return await project_service.create_project(
        user_id=current_user_id,
        theme=project_data.theme,
        question=project_data.question,
        hypothesis=project_data.hypothesis,
        title=project_data.title,
        description=project_data.description,
        tags=project_data.tags
    )

@router.get("", response_model=List[ProjectResponse])
async def get_user_projects(
    current_user_id: int = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service)
):
    """ユーザーのプロジェクト一覧取得"""
    projects = project_service.get_user_projects(current_user_id)
    return [
        ProjectResponse(
            id=project["id"],
            theme=project["theme"],
            question=project["question"],
            hypothesis=project["hypothesis"],
            title=project["title"],
            description=project["description"],
            tags=project["tags"],
            created_at=project["created_at"],
            updated_at=project["updated_at"]
        )
        for project in projects
    ]

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project_by_id(
    project_id: int,
    current_user_id: int = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service)
):
    """プロジェクト詳細取得"""
    project = project_service.get_project_by_id(project_id, current_user_id)
    return ProjectResponse(
        id=project["id"],
        theme=project["theme"],
        question=project["question"],
        hypothesis=project["hypothesis"],
        title=project["title"],
        description=project["description"],
        tags=project["tags"],
        created_at=project["created_at"],
        updated_at=project["updated_at"]
    )

@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    current_user_id: int = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service)
):
    """プロジェクト更新"""
    updated_project = await project_service.update_project(
        project_id=project_id,
        user_id=current_user_id,
        theme=project_data.theme,
        question=project_data.question,
        hypothesis=project_data.hypothesis,
        title=project_data.title,
        description=project_data.description,
        tags=project_data.tags
    )
    return ProjectResponse(
        id=updated_project["id"],
        theme=updated_project["theme"],
        question=updated_project["question"],
        hypothesis=updated_project["hypothesis"],
        title=updated_project["title"],
        description=updated_project["description"],
        tags=updated_project["tags"],
        created_at=updated_project["created_at"],
        updated_at=updated_project["updated_at"]
    )

@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    current_user_id: int = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service)
):
    """プロジェクト削除"""
    return await project_service.delete_project(project_id, current_user_id)

@router.get("/{project_id}/context")
async def get_project_context(
    project_id: int,
    current_user_id: int = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service)
):
    """プロジェクトコンテキスト取得（AI用）"""
    context = project_service.get_project_context(project_id, current_user_id)
    return {
        "project_id": project_id,
        "context": context,
        "user_id": current_user_id
    }

# プロジェクト関連メモエンドポイント
@router.get("/{project_id}/memos", response_model=List[MemoResponse])
async def get_project_memos(
    project_id: int,
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """プロジェクトのメモ一覧取得"""
    try:
        memos = memo_service.get_project_memos(project_id, current_user_id)
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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project memos: {str(e)}"
        )

@router.post("/{project_id}/memos", response_model=MemoResponse)
async def create_project_memo(
    project_id: int,
    memo_data: MemoCreate,
    current_user_id: int = Depends(get_current_user),
    memo_service: MemoService = Depends(get_memo_service)
):
    """プロジェクトに新しいメモを作成"""
    try:
        memo = await memo_service.create_memo(
            project_id=project_id,
            user_id=current_user_id,
            title=memo_data.title,
            content=memo_data.content
        )
        return MemoResponse(
            id=memo["id"],
            project_id=memo["project_id"],
            title=memo["title"],
            content=memo["content"],
            created_at=memo["created_at"],
            updated_at=memo["updated_at"]
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create memo: {str(e)}"
        )

