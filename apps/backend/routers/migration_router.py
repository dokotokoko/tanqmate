# backend/routers/migration_router.py - データ移行用エンドポイント

from fastapi import APIRouter, Depends, HTTPException, status, Request, BackgroundTasks
from fastapi.security import HTTPBearer
import logging
import json
import os
import uuid
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pathlib import Path

# プロジェクト内のインポート
from middleware.supabase_auth import require_supabase_auth, get_auth_info
from services.supabase_auth_service import SupabaseAuthService
from services.auth_service import AuthService
from services.base import ServiceManager
from schemas.migration_schemas import (
    LinkAccountRequest, MigrateDataRequest, RollbackRequest,
    UserLinkResponse, MigrationResult, MigrationStatusResponse,
    RollbackResult, ErrorResponse, MigrationStatus, DataType
)

# ルーター初期化
router = APIRouter(prefix="/migration", tags=["migration"])
security = HTTPBearer()

# ロガー設定
logger = logging.getLogger(__name__)

class MigrationService:
    """データ移行処理を担当するサービスクラス"""
    
    def __init__(self, service_manager: ServiceManager):
        self.service_manager = service_manager
        self.backup_dir = Path("backups")
        self.backup_dir.mkdir(exist_ok=True)
        
        # 進行中の移行を管理
        self.active_migrations = {}
    
    async def link_account(
        self,
        supabase_uid: str,
        username: str,
        password: str
    ) -> Dict[str, Any]:
        """旧アカウントとSupabaseアカウントを紐付け"""
        try:
            # 既存システムでユーザー認証
            auth_service = self.service_manager.get_service(AuthService)
            legacy_user = await auth_service.login_user(username, password)
            
            if not legacy_user or not legacy_user.get("user"):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid legacy credentials"
                )
            
            legacy_user_id = legacy_user["user"]["id"]
            
            # 既に紐付け済みかチェック
            supabase_auth = self.service_manager.get_service(SupabaseAuthService)
            existing_mapping = await supabase_auth.get_user_mapping(supabase_uid)
            
            if existing_mapping:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Account already linked"
                )
            
            # 既存ユーザーIDが他のSupabaseユーザーと紐付け済みかチェック
            supabase_client = self.service_manager.supabase_client
            existing_legacy = supabase_client.table("user_id_mapping")\
                .select("supabase_uid")\
                .eq("legacy_user_id", legacy_user_id)\
                .execute()
            
            if existing_legacy.data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Legacy account already linked to another Supabase account"
                )
            
            # アカウントを紐付け
            link_success = await supabase_auth.link_legacy_user(
                supabase_uid, legacy_user_id, username
            )
            
            if not link_success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to link accounts"
                )
            
            return {
                "success": True,
                "legacy_user_id": legacy_user_id,
                "supabase_uid": supabase_uid,
                "linked_at": datetime.now(timezone.utc),
                "message": "アカウントの紐付けが完了しました"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Account linking failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Account linking failed"
            )
    
    async def start_data_migration(
        self,
        supabase_uid: str,
        migration_request: MigrateDataRequest
    ) -> Dict[str, Any]:
        """データ移行を開始"""
        try:
            # ユーザーマッピングを確認
            supabase_auth = self.service_manager.get_service(SupabaseAuthService)
            mapping = await supabase_auth.get_user_mapping(supabase_uid)
            
            if not mapping:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Account not linked. Please link your legacy account first."
                )
            
            legacy_user_id = mapping["legacy_user_id"]
            migration_id = f"mig_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
            
            # バックアップ作成（要求された場合）
            backup_location = None
            if migration_request.backup_before_migration:
                backup_location = await self._create_backup(legacy_user_id, migration_id)
            
            # 移行ステータスレコードを作成
            migration_status = {
                "migration_id": migration_id,
                "supabase_uid": supabase_uid,
                "legacy_user_id": legacy_user_id,
                "overall_status": MigrationStatus.IN_PROGRESS,
                "started_at": datetime.now(timezone.utc).isoformat(),
                "backup_location": backup_location,
                "migration_config": migration_request.dict()
            }
            
            # データベースに移行レコードを保存
            supabase_client = self.service_manager.supabase_client
            result = supabase_client.table("data_migrations").insert(migration_status).execute()
            
            if not result.data:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create migration record"
                )
            
            # バックグラウンドで移行処理を開始
            self.active_migrations[migration_id] = {
                "status": MigrationStatus.IN_PROGRESS,
                "started_at": datetime.now(timezone.utc),
                "legacy_user_id": legacy_user_id,
                "supabase_uid": supabase_uid
            }
            
            return {
                "migration_id": migration_id,
                "success": True,
                "message": "データ移行が開始されました"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Migration start failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Migration start failed"
            )
    
    async def _create_backup(self, legacy_user_id: int, migration_id: str) -> str:
        """ユーザーデータのバックアップを作成"""
        try:
            supabase_client = self.service_manager.supabase_client
            backup_data = {}
            
            # プロジェクトデータ
            projects = supabase_client.table("projects")\
                .select("*")\
                .eq("user_id", legacy_user_id)\
                .execute()
            backup_data["projects"] = projects.data or []
            
            # メモデータ
            memos = supabase_client.table("memos")\
                .select("*")\
                .eq("user_id", legacy_user_id)\
                .execute()
            backup_data["memos"] = memos.data or []
            
            # 会話履歴
            conversations = supabase_client.table("conversations")\
                .select("*")\
                .eq("user_id", legacy_user_id)\
                .execute()
            backup_data["conversations"] = conversations.data or []
            
            # クエストデータ
            quests = supabase_client.table("user_quests")\
                .select("*")\
                .eq("user_id", legacy_user_id)\
                .execute()
            backup_data["quests"] = quests.data or []
            
            # バックアップファイルに保存
            backup_filename = f"user_{legacy_user_id}_{migration_id}_backup.json"
            backup_path = self.backup_dir / backup_filename
            
            with open(backup_path, 'w', encoding='utf-8') as f:
                json.dump(backup_data, f, ensure_ascii=False, indent=2, default=str)
            
            logger.info(f"Created backup: {backup_path}")
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"Backup creation failed: {e}")
            return None
    
    async def execute_migration_step(
        self,
        migration_id: str,
        data_type: DataType,
        legacy_user_id: int,
        supabase_uid: str
    ) -> Dict[str, Any]:
        """個別のデータタイプの移行を実行"""
        try:
            supabase_client = self.service_manager.supabase_client
            migrated_count = 0
            failed_count = 0
            error_messages = []
            
            if data_type == DataType.PROJECTS:
                # プロジェクトデータの移行
                projects = supabase_client.table("projects")\
                    .select("*")\
                    .eq("user_id", legacy_user_id)\
                    .execute()
                
                for project in projects.data or []:
                    try:
                        # 新しいプロジェクトレコードを作成（Supabase UIDで）
                        new_project = project.copy()
                        new_project["user_id"] = supabase_uid  # ユーザーIDを変更
                        new_project["migrated_from_legacy"] = True
                        new_project["original_legacy_id"] = project["id"]
                        new_project["migration_id"] = migration_id
                        
                        # IDを削除して新規作成
                        if "id" in new_project:
                            del new_project["id"]
                        
                        result = supabase_client.table("supabase_projects").insert(new_project).execute()
                        if result.data:
                            migrated_count += 1
                        else:
                            failed_count += 1
                            error_messages.append(f"Failed to migrate project: {project.get('name', 'unknown')}")
                            
                    except Exception as e:
                        failed_count += 1
                        error_messages.append(f"Project migration error: {str(e)}")
            
            elif data_type == DataType.MEMOS:
                # メモデータの移行
                memos = supabase_client.table("memos")\
                    .select("*")\
                    .eq("user_id", legacy_user_id)\
                    .execute()
                
                for memo in memos.data or []:
                    try:
                        new_memo = memo.copy()
                        new_memo["user_id"] = supabase_uid
                        new_memo["migrated_from_legacy"] = True
                        new_memo["original_legacy_id"] = memo["id"]
                        new_memo["migration_id"] = migration_id
                        
                        if "id" in new_memo:
                            del new_memo["id"]
                        
                        result = supabase_client.table("supabase_memos").insert(new_memo).execute()
                        if result.data:
                            migrated_count += 1
                        else:
                            failed_count += 1
                            error_messages.append(f"Failed to migrate memo: {memo.get('title', 'unknown')}")
                            
                    except Exception as e:
                        failed_count += 1
                        error_messages.append(f"Memo migration error: {str(e)}")
            
            elif data_type == DataType.CONVERSATIONS:
                # 会話履歴の移行
                conversations = supabase_client.table("conversations")\
                    .select("*")\
                    .eq("user_id", legacy_user_id)\
                    .execute()
                
                for conversation in conversations.data or []:
                    try:
                        new_conversation = conversation.copy()
                        new_conversation["user_id"] = supabase_uid
                        new_conversation["migrated_from_legacy"] = True
                        new_conversation["original_legacy_id"] = conversation["id"]
                        new_conversation["migration_id"] = migration_id
                        
                        if "id" in new_conversation:
                            del new_conversation["id"]
                        
                        result = supabase_client.table("supabase_conversations").insert(new_conversation).execute()
                        if result.data:
                            migrated_count += 1
                        else:
                            failed_count += 1
                            error_messages.append(f"Failed to migrate conversation: {conversation.get('title', 'unknown')}")
                            
                    except Exception as e:
                        failed_count += 1
                        error_messages.append(f"Conversation migration error: {str(e)}")
            
            return {
                "data_type": data_type,
                "migrated_count": migrated_count,
                "failed_count": failed_count,
                "error_messages": error_messages,
                "status": MigrationStatus.COMPLETED if failed_count == 0 else MigrationStatus.FAILED
            }
            
        except Exception as e:
            logger.error(f"Migration step failed for {data_type}: {e}")
            return {
                "data_type": data_type,
                "migrated_count": 0,
                "failed_count": 1,
                "error_messages": [f"Migration step failed: {str(e)}"],
                "status": MigrationStatus.FAILED
            }
    
    async def get_migration_status(self, migration_id: str) -> Optional[Dict[str, Any]]:
        """移行ステータスを取得"""
        try:
            supabase_client = self.service_manager.supabase_client
            result = supabase_client.table("data_migrations")\
                .select("*")\
                .eq("migration_id", migration_id)\
                .execute()
            
            if not result.data:
                return None
            
            migration_record = result.data[0]
            
            # 詳細ステータス項目を取得
            items_result = supabase_client.table("migration_items")\
                .select("*")\
                .eq("migration_id", migration_id)\
                .execute()
            
            items = items_result.data or []
            
            return {
                "migration_id": migration_id,
                "overall_status": migration_record["overall_status"],
                "user_id": migration_record["supabase_uid"],
                "items": items,
                "started_at": migration_record["started_at"],
                "completed_at": migration_record.get("completed_at"),
                "backup_location": migration_record.get("backup_location"),
                "total_errors": sum(item.get("failed_count", 0) for item in items)
            }
            
        except Exception as e:
            logger.error(f"Failed to get migration status: {e}")
            return None
    
    async def rollback_migration(self, migration_id: str, force: bool = False) -> Dict[str, Any]:
        """移行をロールバック"""
        try:
            # 移行レコードを取得
            migration_status = await self.get_migration_status(migration_id)
            if not migration_status:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Migration not found"
                )
            
            # ロールバック可能状態かチェック
            if not force and migration_status["overall_status"] == MigrationStatus.IN_PROGRESS:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot rollback migration in progress. Use force_rollback=true if necessary."
                )
            
            supabase_client = self.service_manager.supabase_client
            restored_data_types = []
            
            # 移行されたデータを削除
            for item in migration_status["items"]:
                data_type = item["data_type"]
                
                if data_type == "projects":
                    supabase_client.table("supabase_projects")\
                        .delete()\
                        .eq("migration_id", migration_id)\
                        .execute()
                    restored_data_types.append(DataType.PROJECTS)
                
                elif data_type == "memos":
                    supabase_client.table("supabase_memos")\
                        .delete()\
                        .eq("migration_id", migration_id)\
                        .execute()
                    restored_data_types.append(DataType.MEMOS)
                
                elif data_type == "conversations":
                    supabase_client.table("supabase_conversations")\
                        .delete()\
                        .eq("migration_id", migration_id)\
                        .execute()
                    restored_data_types.append(DataType.CONVERSATIONS)
            
            # 移行ステータスを更新
            supabase_client.table("data_migrations")\
                .update({
                    "overall_status": MigrationStatus.ROLLED_BACK,
                    "rolled_back_at": datetime.now(timezone.utc).isoformat()
                })\
                .eq("migration_id", migration_id)\
                .execute()
            
            return {
                "success": True,
                "migration_id": migration_id,
                "message": "データのロールバックが完了しました",
                "rolled_back_at": datetime.now(timezone.utc),
                "restored_data_types": restored_data_types
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Rollback failed: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Rollback failed"
            )


# サービスマネージャーの初期化
from dotenv import load_dotenv

# 環境変数を読み込み
load_dotenv()

def get_supabase_client():
    from supabase import create_client
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SECRET_KEY")
    
    if not supabase_url or not supabase_key:
        return None
    
    return create_client(supabase_url, supabase_key)

# サービスマネージャーの遅延初期化
_service_manager = None
_migration_service = None

def get_service_manager() -> ServiceManager:
    global _service_manager
    if _service_manager is None:
        client = get_supabase_client()
        if client:
            _service_manager = ServiceManager(client)
        else:
            raise ValueError("Supabase client could not be initialized")
    return _service_manager

def get_migration_service() -> MigrationService:
    global _migration_service
    if _migration_service is None:
        _migration_service = MigrationService(get_service_manager())
    return _migration_service

# エンドポイント実装

@router.post("/link-account", response_model=UserLinkResponse)
async def link_account(
    request: LinkAccountRequest,
    auth: dict = Depends(require_supabase_auth)
):
    """旧アカウントとの紐付け"""
    supabase_uid = auth["user_id"]
    
    result = await get_migration_service().link_account(
        supabase_uid,
        request.username,
        request.password
    )
    
    return UserLinkResponse(**result)

@router.post("/migrate-data", response_model=MigrationResult)
async def migrate_data(
    request: MigrateDataRequest,
    background_tasks: BackgroundTasks,
    auth: dict = Depends(require_supabase_auth)
):
    """データ移行実行"""
    supabase_uid = auth["user_id"]
    
    # 移行開始
    migration_result = await get_migration_service().start_data_migration(
        supabase_uid, request
    )
    
    # バックグラウンドで実際の移行処理を実行
    background_tasks.add_task(
        _execute_background_migration,
        migration_result["migration_id"],
        supabase_uid,
        request
    )
    
    # ステータス詳細を取得
    status_details = await get_migration_service().get_migration_status(
        migration_result["migration_id"]
    )
    
    return MigrationResult(
        migration_id=migration_result["migration_id"],
        success=migration_result["success"],
        message=migration_result["message"],
        status_details=MigrationStatusResponse(**status_details)
    )

@router.get("/status/{migration_id}", response_model=MigrationStatusResponse)
async def get_migration_status(
    migration_id: str,
    auth: dict = Depends(require_supabase_auth)
):
    """移行状況確認"""
    status = await get_migration_service().get_migration_status(migration_id)
    
    if not status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Migration not found"
        )
    
    return MigrationStatusResponse(**status)

@router.post("/rollback", response_model=RollbackResult)
async def rollback_migration(
    request: RollbackRequest,
    auth: dict = Depends(require_supabase_auth)
):
    """ロールバック"""
    result = await get_migration_service().rollback_migration(
        request.migration_id,
        request.force_rollback
    )
    
    return RollbackResult(**result)

# バックグラウンド処理関数

async def _execute_background_migration(
    migration_id: str,
    supabase_uid: str,
    migration_request: MigrateDataRequest
):
    """バックグラウンドで実行される移行処理"""
    try:
        # ユーザーマッピングを取得
        supabase_auth = get_service_manager().get_service(SupabaseAuthService)
        mapping = await supabase_auth.get_user_mapping(supabase_uid)
        legacy_user_id = mapping["legacy_user_id"]
        
        # 移行するデータタイプを決定
        data_types = []
        if migration_request.include_projects:
            data_types.append(DataType.PROJECTS)
        if migration_request.include_memos:
            data_types.append(DataType.MEMOS)
        if migration_request.include_conversations:
            data_types.append(DataType.CONVERSATIONS)
        if migration_request.include_quests:
            data_types.append(DataType.QUESTS)
        
        # 各データタイプを移行
        supabase_client = get_service_manager().supabase_client
        overall_success = True
        
        for data_type in data_types:
            result = await get_migration_service().execute_migration_step(
                migration_id, data_type, legacy_user_id, supabase_uid
            )
            
            # 移行項目レコードを保存
            item_record = {
                "migration_id": migration_id,
                "data_type": result["data_type"],
                "status": result["status"],
                "total_count": result["migrated_count"] + result["failed_count"],
                "migrated_count": result["migrated_count"],
                "failed_count": result["failed_count"],
                "error_messages": result["error_messages"],
                "started_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": datetime.now(timezone.utc).isoformat()
            }
            
            supabase_client.table("migration_items").insert(item_record).execute()
            
            if result["status"] == MigrationStatus.FAILED:
                overall_success = False
        
        # 全体ステータスを更新
        final_status = MigrationStatus.COMPLETED if overall_success else MigrationStatus.FAILED
        supabase_client.table("data_migrations")\
            .update({
                "overall_status": final_status,
                "completed_at": datetime.now(timezone.utc).isoformat()
            })\
            .eq("migration_id", migration_id)\
            .execute()
        
        # アクティブな移行から削除
        migration_svc = get_migration_service()
        if migration_id in migration_svc.active_migrations:
            del migration_svc.active_migrations[migration_id]
        
        logger.info(f"Migration {migration_id} completed with status: {final_status}")
        
    except Exception as e:
        logger.error(f"Background migration failed: {e}")
        
        # エラー状態に更新
        try:
            supabase_client = get_service_manager().supabase_client
            supabase_client.table("data_migrations")\
                .update({
                    "overall_status": MigrationStatus.FAILED,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "error_message": str(e)
                })\
                .eq("migration_id", migration_id)\
                .execute()
        except:
            pass