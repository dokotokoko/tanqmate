# routers/metrics_router.py - メトリクス・デバッグ関連ルーター

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.admin_service import AdminService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/metrics", tags=["metrics"])
debug_router = APIRouter(prefix="/debug", tags=["debug"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class LLMSystemStatus(BaseModel):
    status: str
    active_clients: int
    last_request: Optional[str]
    error_rate: float
    total_requests: int
    avg_response_time: float

class LLMLogEntry(BaseModel):
    timestamp: str
    status: str
    message: str
    metadata: Optional[Dict[str, Any]]

# 依存関数
def get_admin_service(current_user_id: int = Depends(get_current_user)) -> AdminService:
    """管理サービス取得"""
    return service_manager.get_service(AdminService, current_user_id)

# メトリクス関連エンドポイント
@router.get("/llm-system", response_model=LLMSystemStatus)
async def get_llm_system_metrics(
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """LLMシステムのメトリクス取得（module.llm_api ベース）"""
    try:
        metrics = await admin_service.get_llm_system_metrics_async()
        
        return LLMSystemStatus(
            status=metrics["status"],
            active_clients=metrics["active_clients"],
            last_request=metrics.get("last_request"),
            error_rate=metrics["error_rate"],
            total_requests=metrics["total_requests"],
            avg_response_time=metrics["avg_response_time"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLMシステムメトリクス取得エラー: {str(e)}"
        )

# デバッグ関連エンドポイント
@debug_router.get("/llm-system")
async def get_llm_system_debug(
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """LLMシステムのデバッグ情報取得（module.llm_api ベース）"""
    try:
        debug_info = await admin_service.get_llm_system_debug()
        return debug_info
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLMシステムデバッグ情報取得エラー: {str(e)}"
        )

@debug_router.get("/check-quest-tables")
async def check_quest_tables_debug(
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """クエスト関連テーブルの存在確認（デバッグ用）"""
    try:
        table_status = admin_service.check_quest_tables()
        return table_status
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"テーブル確認エラー: {str(e)}"
        )

# 管理機能
@router.post("/llm-system/log-status")
async def log_llm_system_status(
    log_entry: LLMLogEntry,
    current_user_id: int = Depends(get_current_user),
    admin_service: AdminService = Depends(get_admin_service)
):
    """LLMシステム状態をログ記録"""
    try:
        result = await admin_service.log_llm_system_status(
            timestamp=log_entry.timestamp,
            status=log_entry.status,
            message=log_entry.message,
            metadata=log_entry.metadata
        )
        
        return {
            "message": "LLMシステム状態をログ記録しました",
            "log_id": result.get("log_id")
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLMシステム状態ログ記録エラー: {str(e)}"
        )