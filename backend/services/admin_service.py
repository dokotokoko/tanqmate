# services/admin_service.py - 管理機能・メトリクス管理サービス

from typing import Dict, Any, Optional
from datetime import datetime, timezone
import os
import logging
from fastapi import HTTPException, status
from .base import BaseService

logger = logging.getLogger(__name__)

class AdminService(BaseService):
    """管理機能・システム監視を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        self._check_phase1_system()
    
    def get_service_name(self) -> str:
        return "AdminService"
    
    def _check_phase1_system(self) -> None:
        """Phase 1システム利用可能性チェック"""
        try:
            from phase1_llm_system import (
                get_phase1_manager,
                log_system_status
            )
            self.phase1_available = True
            self.log_system_status = log_system_status
            
            # Phase 1マネージャー取得
            try:
                self.phase1_manager = get_phase1_manager()
            except Exception as e:
                self.logger.warning(f"Phase 1 manager initialization failed: {e}")
                self.phase1_manager = None
                
        except ImportError:
            self.phase1_available = False
            self.phase1_manager = None
            self.log_system_status = None
    
    async def create_test_user(self, username: str, password: str) -> Dict[str, Any]:
        """負荷テスト用ユーザー作成"""
        try:
            # セキュリティ: loadtest_user_* パターンのみ許可
            if not username.startswith("loadtest_user_"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="テストユーザー名は 'loadtest_user_' で始まる必要があります"
                )
            
            # 既存ユーザーチェック
            existing_user = self.supabase.table("users")\
                .select("id")\
                .eq("username", username)\
                .execute()
                
            if existing_user.data:
                return {
                    "message": f"ユーザー {username} は既に存在します",
                    "id": existing_user.data[0]["id"],
                    "status": "already_exists"
                }
            
            # ユーザー作成
            result = self.supabase.table("users").insert({
                "username": username,
                "password": password,  # 本来はハッシュ化すべき
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
            if result.data and len(result.data) > 0:
                user = result.data[0]
                return {
                    "message": f"テストユーザー {username} を作成しました",
                    "id": user["id"],
                    "status": "created"
                }
            else:
                raise HTTPException(status_code=500, detail="ユーザー作成に失敗しました")
                
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Create test user")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def cleanup_test_users(self) -> Dict[str, Any]:
        """テストユーザーの一括削除"""
        try:
            # loadtest_user_* パターンのユーザーを削除
            result = self.supabase.table("users")\
                .delete()\
                .like("username", "loadtest_user_%")\
                .execute()
            
            deleted_count = len(result.data) if result.data else 0
            
            # 関連データのクリーンアップ（必要に応じて）
            if deleted_count > 0:
                self.logger.info(f"Cleaned up {deleted_count} test users")
            
            return {
                "message": f"{deleted_count}人のテストユーザーを削除しました",
                "deleted_count": deleted_count,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            error_result = self.handle_error(e, "Cleanup test users")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_llm_system_metrics(self) -> Dict[str, Any]:
        """Phase 1 LLMシステムのメトリクス取得"""
        try:
            metrics_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "phase1_system": {},
                "legacy_system": {}
            }
            
            # Phase 1システムのメトリクス
            if self.phase1_available and self.phase1_manager:
                try:
                    if hasattr(self.phase1_manager, '_initialized') and self.phase1_manager._initialized:
                        metrics_data["phase1_system"] = {
                            "metrics": self.phase1_manager.get_metrics(),
                            "health": self.phase1_manager.health_check(),
                            "status": "active"
                        }
                    else:
                        metrics_data["phase1_system"] = {
                            "status": "not_initialized",
                            "message": "Phase 1システムが初期化されていません"
                        }
                except Exception as e:
                    metrics_data["phase1_system"] = {
                        "status": "error",
                        "error": str(e)
                    }
            else:
                metrics_data["phase1_system"] = {
                    "status": "not_available",
                    "message": "Phase 1システムが利用不可です"
                }
            
            # レガシーシステムの状態
            try:
                from module.llm_api import llm_client
                metrics_data["legacy_system"] = {
                    "available": llm_client is not None,
                    "status": "active",
                    "class": llm_client.__class__.__name__ if llm_client else None,
                    "message": "既存システムのみ動作中"
                }
            except Exception as e:
                metrics_data["legacy_system"] = {
                    "available": False,
                    "status": "error",
                    "error": str(e)
                }
            
            return metrics_data
            
        except Exception as e:
            error_result = self.handle_error(e, "Get LLM system metrics")
            return {
                "error": error_result["error"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    def get_debug_info(self) -> Dict[str, Any]:
        """システムデバッグ情報取得"""
        try:
            debug_info = {
                "environment_variables": {
                    "ENABLE_LLM_POOL": os.environ.get("ENABLE_LLM_POOL", "false"),
                    "LLM_POOL_SIZE": os.environ.get("LLM_POOL_SIZE", "5"),
                    "LLM_POOL_TIMEOUT": os.environ.get("LLM_POOL_TIMEOUT", "30.0"),
                    "LLM_AUTO_FALLBACK": os.environ.get("LLM_AUTO_FALLBACK", "true"),
                    "LLM_POOL_DEBUG": os.environ.get("LLM_POOL_DEBUG", "false")
                },
                "system_status": {
                    "phase1_available": self.phase1_available,
                    "phase1_manager_exists": self.phase1_manager is not None,
                    "phase1_initialized": (
                        hasattr(self.phase1_manager, '_initialized') and 
                        self.phase1_manager._initialized
                    ) if self.phase1_manager else False,
                    "current_time": datetime.now(timezone.utc).isoformat()
                }
            }
            
            # レガシーシステム状態
            try:
                from module.llm_api import llm_client
                debug_info["system_status"]["legacy_client_exists"] = llm_client is not None
            except Exception as e:
                debug_info["system_status"]["legacy_client_error"] = str(e)
            
            # 詳細メトリクス
            if self.phase1_available and self.phase1_manager:
                try:
                    if hasattr(self.phase1_manager, '_initialized') and self.phase1_manager._initialized:
                        debug_info["detailed_metrics"] = self.phase1_manager.get_metrics()
                        debug_info["health_check"] = self.phase1_manager.health_check()
                except Exception as e:
                    debug_info["metrics_error"] = str(e)
            
            return debug_info
            
        except Exception as e:
            error_result = self.handle_error(e, "Get debug info")
            return {"error": error_result["error"]}
    
    def log_system_status_to_logger(self) -> Dict[str, Any]:
        """LLMシステムの状態をログに出力"""
        try:
            if self.phase1_available and self.log_system_status:
                self.log_system_status()
                return {
                    "message": "Phase 1システム状態をログに出力しました",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "success"
                }
            else:
                self.logger.info("📊 LLMシステム状態: Phase 1は利用不可、既存システムのみ動作中")
                return {
                    "message": "Phase 1は利用不可、既存システムのみ動作中",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "status": "phase1_unavailable"
                }
                
        except Exception as e:
            error_result = self.handle_error(e, "Log system status")
            return {
                "error": error_result["error"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "error"
            }
    
    def get_system_stats(self) -> Dict[str, Any]:
        """システム全体の統計情報取得"""
        try:
            stats = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "database_stats": {},
                "user_stats": {},
                "content_stats": {}
            }
            
            # ユーザー統計
            try:
                user_count = self.supabase.table("users")\
                    .select("id", count="exact")\
                    .execute().count or 0
                    
                test_user_count = self.supabase.table("users")\
                    .select("id", count="exact")\
                    .like("username", "loadtest_user_%")\
                    .execute().count or 0
                    
                stats["user_stats"] = {
                    "total_users": user_count,
                    "test_users": test_user_count,
                    "regular_users": user_count - test_user_count
                }
            except Exception as e:
                stats["user_stats"]["error"] = str(e)
            
            # コンテンツ統計
            try:
                memo_count = self.supabase.table("memos")\
                    .select("id", count="exact")\
                    .execute().count or 0
                    
                project_count = self.supabase.table("projects")\
                    .select("id", count="exact")\
                    .execute().count or 0
                    
                chat_count = self.supabase.table("chat_logs")\
                    .select("id", count="exact")\
                    .execute().count or 0
                    
                stats["content_stats"] = {
                    "memos": memo_count,
                    "projects": project_count,
                    "chat_logs": chat_count
                }
            except Exception as e:
                stats["content_stats"]["error"] = str(e)
            
            # クエスト統計
            try:
                quest_count = self.supabase.table("quests")\
                    .select("id", count="exact")\
                    .eq("is_active", True)\
                    .execute().count or 0
                    
                user_quest_count = self.supabase.table("user_quests")\
                    .select("id", count="exact")\
                    .execute().count or 0
                    
                stats["content_stats"]["quests"] = quest_count
                stats["content_stats"]["user_quests"] = user_quest_count
            except Exception as e:
                stats["content_stats"]["quest_error"] = str(e)
            
            return stats
            
        except Exception as e:
            error_result = self.handle_error(e, "Get system stats")
            return {
                "error": error_result["error"],
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    def check_system_health(self) -> Dict[str, Any]:
        """システム健全性チェック"""
        try:
            health_status = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "overall_status": "healthy",
                "components": {}
            }
            
            issues = []
            
            # データベース接続チェック
            try:
                self.supabase.table("users").select("id").limit(1).execute()
                health_status["components"]["database"] = "healthy"
            except Exception as e:
                health_status["components"]["database"] = f"unhealthy: {str(e)}"
                issues.append("database_connection")
            
            # LLMシステムチェック
            try:
                if self.phase1_available and self.phase1_manager:
                    if hasattr(self.phase1_manager, 'health_check'):
                        phase1_health = self.phase1_manager.health_check()
                        health_status["components"]["phase1_llm"] = phase1_health
                    else:
                        health_status["components"]["phase1_llm"] = "unknown"
                else:
                    health_status["components"]["phase1_llm"] = "not_available"
                
                # レガシーLLMチェック
                from module.llm_api import llm_client
                health_status["components"]["legacy_llm"] = "healthy" if llm_client else "not_available"
                
            except Exception as e:
                health_status["components"]["llm_systems"] = f"check_failed: {str(e)}"
                issues.append("llm_system_check")
            
            # 全体ステータス判定
            if issues:
                health_status["overall_status"] = "degraded" if len(issues) == 1 else "unhealthy"
                health_status["issues"] = issues
            
            return health_status
            
        except Exception as e:
            return {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "overall_status": "error",
                "error": str(e)
            }