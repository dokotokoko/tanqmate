# routers/lab_router.py - 探Q LAB ルーター

from fastapi import APIRouter, Depends
from services.lab_service import LabService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/lab", tags=["lab"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())


# 依存関数
def get_lab_service(current_user_id: int = Depends(get_current_user)) -> LabService:
    """LABサービス取得"""
    return service_manager.get_service(LabService, current_user_id)


@router.get("/stats")
async def get_user_stats(
    current_user_id: int = Depends(get_current_user),
    lab_service: LabService = Depends(get_lab_service),
):
    """ユーザーの全体統計を取得"""
    return lab_service.get_user_stats(current_user_id)


@router.get("/progress")
async def get_project_progress(
    current_user_id: int = Depends(get_current_user),
    lab_service: LabService = Depends(get_lab_service),
):
    """全プロジェクトの進捗状況を取得"""
    return lab_service.get_project_progress(current_user_id)


@router.get("/personality")
async def get_learning_personality(
    current_user_id: int = Depends(get_current_user),
    lab_service: LabService = Depends(get_lab_service),
):
    """学習パーソナリティ分析結果を取得"""
    return lab_service.get_learning_personality(current_user_id)
