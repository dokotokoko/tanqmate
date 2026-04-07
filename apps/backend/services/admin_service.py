# services/admin_service.py - 管理機能・メトリクス管理サービス

from typing import Dict, Any, Optional
from datetime import datetime, timezone
import os
import json
import logging
from fastapi import HTTPException, status
from .base import BaseService

logger = logging.getLogger(__name__)

class AdminService(BaseService):
    """管理機能・システム監視を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
    
    def get_service_name(self) -> str:
        return "AdminService"
    
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
        """LLMシステムのメトリクス取得（refactored版: module.llm_api中心）"""
        try:
            metrics_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "async_llm": {}
            }

            # module.llm_api の非同期クライアントメトリクス
            try:
                from module.llm_api import get_async_llm_client
                pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
                client = get_async_llm_client(pool_size=pool_size)
                metrics_data["async_llm"] = {
                    "status": "active",
                    "pool_size": pool_size,
                    "metrics": client.get_metrics()
                }
            except Exception as e:
                metrics_data["async_llm"] = {"status": "error", "error": str(e)}
            
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
                    "LLM_POOL_SIZE": os.environ.get("LLM_POOL_SIZE", "5"),
                },
                "system_status": {
                    "current_time": datetime.now(timezone.utc).isoformat()
                }
            }
            
            # module.llm_api の非同期LLM状態
            try:
                from module.llm_api import get_async_llm_client
                pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
                client = get_async_llm_client(pool_size=pool_size)
                debug_info["system_status"]["async_llm_available"] = client is not None
                debug_info["system_status"]["async_llm_pool_size"] = pool_size
                debug_info["system_status"]["async_llm_metrics"] = client.get_metrics()
            except Exception as e:
                debug_info["system_status"]["async_llm_error"] = str(e)
            
            return debug_info
            
        except Exception as e:
            error_result = self.handle_error(e, "Get debug info")
            return {"error": error_result["error"]}
    
    def log_system_status_to_logger(self) -> Dict[str, Any]:
        """LLMシステムの状態をログに出力"""
        try:
            from module.llm_api import get_async_llm_client
            pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
            client = get_async_llm_client(pool_size=pool_size)
            metrics = client.get_metrics()
            self.logger.info(f"📊 LLMシステム状態: async_llm active (LLM_POOL_SIZE={pool_size}) metrics={metrics}")
            return {
                "message": "LLMシステム状態をログに出力しました",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "success",
                "metrics": metrics
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
                from module.llm_api import get_async_llm_client
                pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
                client = get_async_llm_client(pool_size=pool_size)
                health_status["components"]["async_llm"] = "healthy" if client else "not_available"
                
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
    
    async def get_llm_system_metrics_async(self) -> Dict[str, Any]:
        """LLMシステムのメトリクス取得（非同期版）"""
        try:
            metrics = self.get_llm_system_metrics()
            
            # フォーマットを統一
            llm_metrics = metrics.get("async_llm", {}).get("metrics", {}) or {}
            return {
                "status": "active" if metrics.get("async_llm", {}).get("status") == "active" else "degraded",
                "active_clients": 1 if metrics.get("async_llm", {}).get("status") == "active" else 0,
                "last_request": None,  # 実装されていない
                "error_rate": 0.0,  # 現状、OpenAI SDK側のエラー率は集計していない
                "total_requests": int(llm_metrics.get("total_requests", 0)),
                "avg_response_time": float(llm_metrics.get("average_response_time", 0.0)),
                "detailed_metrics": metrics
            }
        except Exception as e:
            error_result = self.handle_error(e, "Get LLM system metrics async")
            return {
                "status": "error",
                "active_clients": 0,
                "last_request": None,
                "error_rate": 1.0,
                "total_requests": 0,
                "avg_response_time": 0.0,
                "error": error_result["error"]
            }
    
    async def get_llm_system_debug(self) -> Dict[str, Any]:
        """LLMシステムのデバッグ情報取得（非同期版）"""
        try:
            return self.get_debug_info()
        except Exception as e:
            error_result = self.handle_error(e, "Get LLM system debug async")
            return {"error": error_result["error"]}
    
    def check_quest_tables(self) -> Dict[str, Any]:
        """クエスト関連テーブルの存在確認"""
        try:
            table_status = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "tables": {}
            }
            
            # 確認するテーブルのリスト
            quest_tables = [
                "quests",
                "user_quests", 
                "quest_submissions",
                "quest_categories"
            ]
            
            all_exist = True
            
            for table_name in quest_tables:
                try:
                    # テーブルの存在確認（1行だけ取得を試行）
                    result = self.supabase.table(table_name)\
                        .select("*")\
                        .limit(1)\
                        .execute()
                    
                    table_status["tables"][table_name] = {
                        "exists": True,
                        "row_count": len(result.data) if result.data else 0
                    }
                    
                except Exception as e:
                    table_status["tables"][table_name] = {
                        "exists": False,
                        "error": str(e)
                    }
                    all_exist = False
            
            table_status["all_tables_exist"] = all_exist
            table_status["status"] = "healthy" if all_exist else "missing_tables"
            
            return table_status
            
        except Exception as e:
            error_result = self.handle_error(e, "Check quest tables")
            return {
                "error": error_result["error"],
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "status": "error"
            }
    
    async def log_llm_system_status(
        self,
        timestamp: str,
        status: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """LLMシステム状態をログ記録"""
        try:
            # ログエントリを作成
            log_entry = {
                "timestamp": timestamp,
                "status": status,
                "message": message,
                "metadata": metadata or {},
                "recorded_at": datetime.now(timezone.utc).isoformat()
            }
            
            # ログをファイルまたはデータベースに記録
            self.logger.info(f"LLM System Status: {status} - {message}")
            
            if metadata:
                self.logger.debug(f"LLM System Metadata: {metadata}")
            
            # 必要に応じてデータベースにも記録
            try:
                # システムログテーブルに保存（存在する場合）
                result = self.supabase.table("system_logs").insert({
                    "service": "llm_system",
                    "level": status,
                    "message": message,
                    "metadata": json.dumps(metadata) if metadata else None,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }).execute()
                
                log_id = result.data[0]["id"] if result.data else None
                
            except Exception as db_error:
                # テーブルが存在しない場合はログのみ
                self.logger.debug(f"System logs table not available: {db_error}")
                log_id = None
            
            return {
                "message": "LLMシステム状態をログ記録しました",
                "log_id": log_id,
                "timestamp": timestamp
            }
            
        except Exception as e:
            error_result = self.handle_error(e, "Log LLM system status")
            raise Exception(error_result["error"])