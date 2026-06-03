# routers/admin_router.py - 管理機能関連ルーター

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from typing import Dict, Any, List
from services.admin_service import AdminService
from services.base import ServiceManager
from routers.auth_router import (
    ensure_profile,
    get_current_auth_user,
    get_supabase_client,
)

# ルーター初期化
router = APIRouter(prefix="/admin", tags=["admin"])

# メトリクス用ルーター
metrics_router = APIRouter(prefix="/metrics", tags=["metrics"])

# デバッグ用ルーター
debug_router = APIRouter(prefix="/debug", tags=["debug"])

# サービスマネージャー
_service_manager = None

def get_service_manager() -> ServiceManager:
    global _service_manager
    if _service_manager is None:
        client = get_supabase_client()
        if client:
            _service_manager = ServiceManager(client)
        else:
            raise ValueError("Supabase client could not be initialized")
    return _service_manager

# Pydanticモデル
class AdminUserCreate(BaseModel):
    username: str
    password: str


class TeacherCredentialInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=3, max_length=255)
    login_id: str = Field(..., min_length=3, max_length=50)


class SchoolCredentialIssueRequest(BaseModel):
    school_name: str = Field(..., min_length=1, max_length=200)
    school_code: str | None = Field(default=None, max_length=20)
    teachers: List[TeacherCredentialInput]


class TeacherBatchAddRequest(BaseModel):
    teachers: List[TeacherCredentialInput]


class SchoolUpdateRequest(BaseModel):
    status: str | None = Field(default=None, max_length=20)
    operator_notes: str | None = None


class SupportTicketCreateRequest(BaseModel):
    school_id: str
    category: str = Field(..., min_length=2, max_length=20)
    severity: str = Field(..., min_length=2, max_length=20)
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=4000)
    source: str = Field(default="manual", min_length=2, max_length=30)


class SupportTicketUpdateRequest(BaseModel):
    status: str | None = Field(default=None, max_length=20)
    severity: str | None = Field(default=None, max_length=20)
    admin_note: str | None = None

# 依存関数
def get_admin_service() -> AdminService:
    """管理サービス取得"""
    return get_service_manager().get_service(AdminService)


async def require_admin_user(
    auth_user: Dict[str, Any] = Depends(get_current_auth_user),
) -> Dict[str, Any]:
    supabase_client = get_service_manager().supabase_client
    profile = ensure_profile(supabase_client, auth_user)
    role = profile.get("role") or auth_user.get("role")

    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access is required",
        )

    return auth_user

# 管理者エンドポイント
@router.post("/create-test-user")
async def create_test_user(
    user_data: AdminUserCreate,
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """負荷テスト用ユーザー作成"""
    return await admin_service.create_test_user(user_data.username, user_data.password)

@router.delete("/cleanup-test-users")
async def cleanup_test_users(
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """テストユーザーの一括削除"""
    return await admin_service.cleanup_test_users()

@router.post("/llm-system/log-status")
async def log_llm_system_status(
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """LLMシステムの状態をログに出力（管理者用）"""
    return admin_service.log_system_status_to_logger()

@router.get("/system/stats")
async def get_system_stats(
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """システム全体の統計情報取得"""
    return admin_service.get_system_stats()

@router.get("/system/health")
async def check_system_health(
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """システム健全性チェック"""
    return admin_service.check_system_health()

# メトリクス関連エンドポイント
@metrics_router.get("/llm-system")
async def get_llm_system_metrics(
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """LLMシステムのメトリクス取得（module.llm_api ベース）"""
    return admin_service.get_llm_system_metrics()

# デバッグ関連エンドポイント
@debug_router.get("/llm-system")
async def debug_llm_system(
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """LLMシステムのデバッグ情報（module.llm_api ベース）"""
    return admin_service.get_debug_info()


@router.get("/dashboard")
async def get_admin_dashboard(
    limit: int = Query(default=25, ge=1, le=100),
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """学校導入ダッシュボード用の一覧・集計"""
    return await admin_service.get_school_dashboard(limit=limit)


@router.post("/schools/issue-credentials")
async def issue_school_credentials(
    request: SchoolCredentialIssueRequest,
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """学校作成と先生用初期認証情報の発行"""
    return await admin_service.issue_school_credentials(
        school_name=request.school_name,
        school_code=request.school_code,
        teachers=[teacher.dict() for teacher in request.teachers],
    )


@router.post("/schools/{school_id}/teachers")
async def add_teachers_to_school(
    school_id: str,
    request: TeacherBatchAddRequest,
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """既存学校に先生アカウントを追加"""
    return await admin_service.add_teachers_to_school(
        school_id=school_id,
        teachers=[teacher.dict() for teacher in request.teachers],
    )


@router.post("/teachers/{teacher_id}/reset-password")
async def reset_teacher_password(
    teacher_id: str,
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """先生の初期パスワードを再発行"""
    return await admin_service.reset_teacher_password(teacher_id)


@router.patch("/schools/{school_id}")
async def update_school(
    school_id: str,
    request: SchoolUpdateRequest,
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """学校の状態・運営メモ更新"""
    return await admin_service.update_school(
        school_id=school_id,
        school_status=request.status,
        operator_notes=request.operator_notes,
    )


@router.delete("/schools/{school_id}")
async def delete_school(
    school_id: str,
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """空の学校データのみ削除"""
    return await admin_service.delete_school(school_id)


@router.post("/support-tickets")
async def create_support_ticket(
    request: SupportTicketCreateRequest,
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """学校別のバグ報告・問い合わせを登録"""
    return await admin_service.create_support_ticket(
        school_id=request.school_id,
        category=request.category,
        severity=request.severity,
        title=request.title,
        description=request.description,
        source=request.source,
    )


@router.patch("/support-tickets/{ticket_id}")
async def update_support_ticket(
    ticket_id: str,
    request: SupportTicketUpdateRequest,
    _admin_user: Dict[str, Any] = Depends(require_admin_user),
    admin_service: AdminService = Depends(get_admin_service),
):
    """学校別のバグ報告・問い合わせを更新"""
    return await admin_service.update_support_ticket(
        ticket_id=ticket_id,
        ticket_status=request.status,
        severity=request.severity,
        admin_note=request.admin_note,
    )

# ルーターを統合
router.include_router(metrics_router)
router.include_router(debug_router)
