# routers/project_router.py - プロジェクト関連ルーター

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from services.project_service import ProjectService
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

# 依存関数
def get_project_service(current_user_id: int = Depends(get_current_user)) -> ProjectService:
    """プロジェクトサービス取得"""
    return service_manager.get_service(ProjectService, current_user_id)

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

# ===============================================
# レガシーエンドポイント（後方互換性のため維持）
# ===============================================

@router.get("/users/{user_id}/projects", response_model=List[ProjectResponse], deprecated=True)
async def get_user_projects_legacy(
    user_id: int,
    current_user_id: int = Depends(get_current_user),
    project_service: ProjectService = Depends(get_project_service)
):
    """
    [非推奨] ユーザーのプロジェクト一覧取得（レガシー版）
    代わりに GET /projects を使用してください
    """
    # 自分のプロジェクトのみアクセス可能
    if user_id != current_user_id:
        raise HTTPException(status_code=403, detail="アクセス権限がありません")
    
    # 通常の get_user_projects に処理を委譲
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