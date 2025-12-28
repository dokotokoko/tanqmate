# routers/admin_router.py - 管理機能関連ルーター

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any
from services.admin_service import AdminService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/admin", tags=["admin"])

# メトリクス用ルーター
metrics_router = APIRouter(prefix="/metrics", tags=["metrics"])

# デバッグ用ルーター
debug_router = APIRouter(prefix="/debug", tags=["debug"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class AdminUserCreate(BaseModel):
    username: str
    password: str

# 依存関数
def get_admin_service() -> AdminService:
    """管理サービス取得"""
    return service_manager.get_service(AdminService)

# 管理者エンドポイント
@router.post("/create-test-user")
async def create_test_user(
    user_data: AdminUserCreate,
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """負荷テスト用ユーザー作成"""
    return await admin_service.create_test_user(user_data.username, user_data.password)

@router.delete("/cleanup-test-users")
async def cleanup_test_users(
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """テストユーザーの一括削除"""
    return await admin_service.cleanup_test_users()

@router.post("/llm-system/log-status")
async def log_llm_system_status(
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """LLMシステムの状態をログに出力（管理者用）"""
    return admin_service.log_system_status_to_logger()

@router.get("/system/stats")
async def get_system_stats(
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """システム全体の統計情報取得"""
    return admin_service.get_system_stats()

@router.get("/system/health")
async def check_system_health(
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """システム健全性チェック"""
    return admin_service.check_system_health()

# メトリクス関連エンドポイント
@metrics_router.get("/llm-system")
async def get_llm_system_metrics(
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """Phase 1 LLMシステムのメトリクス取得"""
    return admin_service.get_llm_system_metrics()

# デバッグ関連エンドポイント
@debug_router.get("/llm-system")
async def debug_llm_system(
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """Phase 1 LLMシステムのデバッグ情報"""
    return admin_service.get_debug_info()

# ルーターを統合
router.include_router(metrics_router)
router.include_router(debug_router)