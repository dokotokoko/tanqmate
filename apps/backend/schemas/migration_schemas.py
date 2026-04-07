# backend/schemas/migration_schemas.py - 移行用Pydanticモデル

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum

class MigrationStatus(str, Enum):
    """移行ステータス"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"

class DataType(str, Enum):
    """移行対象データタイプ"""
    PROJECTS = "projects"
    MEMOS = "memos"
    CONVERSATIONS = "conversations"
    QUESTS = "quests"
    USER_PREFERENCES = "user_preferences"
    ALL = "all"

# リクエストスキーマ
class LinkAccountRequest(BaseModel):
    """旧アカウントとの紐付けリクエスト"""
    username: str = Field(..., min_length=3, max_length=50, description="既存システムのユーザー名")
    password: str = Field(..., min_length=8, description="既存システムのパスワード")
    
    @validator('username')
    def validate_username(cls, v):
        """ユーザー名のバリデーション"""
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('ユーザー名は英数字、ハイフン、アンダースコアのみ使用可能です')
        return v.strip()
    
    class Config:
        schema_extra = {
            "example": {
                "username": "existing_user",
                "password": "SecurePassword123"
            }
        }

class MigrateDataRequest(BaseModel):
    """データ移行実行リクエスト"""
    include_projects: bool = Field(default=True, description="プロジェクトデータを移行するか")
    include_memos: bool = Field(default=True, description="メモデータを移行するか")
    include_conversations: bool = Field(default=True, description="会話履歴を移行するか")
    include_quests: bool = Field(default=True, description="クエストデータを移行するか")
    include_user_preferences: bool = Field(default=True, description="ユーザー設定を移行するか")
    backup_before_migration: bool = Field(default=True, description="移行前にバックアップを作成するか")
    
    class Config:
        schema_extra = {
            "example": {
                "include_projects": True,
                "include_memos": True,
                "include_conversations": False,
                "include_quests": True,
                "include_user_preferences": True,
                "backup_before_migration": True
            }
        }

class RollbackRequest(BaseModel):
    """ロールバックリクエスト"""
    migration_id: str = Field(..., description="ロールバック対象の移行ID")
    force_rollback: bool = Field(default=False, description="強制ロールバックするか")
    
    class Config:
        schema_extra = {
            "example": {
                "migration_id": "mig_20240321_123456",
                "force_rollback": False
            }
        }

# レスポンススキーマ
class UserLinkResponse(BaseModel):
    """アカウント紐付け結果"""
    success: bool = Field(..., description="紐付け成功フラグ")
    legacy_user_id: int = Field(..., description="既存システムのユーザーID")
    supabase_uid: str = Field(..., description="Supabaseのユーザー UID")
    linked_at: datetime = Field(..., description="紐付け完了時刻")
    message: str = Field(..., description="結果メッセージ")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "legacy_user_id": 123,
                "supabase_uid": "uuid-string-here",
                "linked_at": "2024-03-21T10:30:00Z",
                "message": "アカウントの紐付けが完了しました"
            }
        }

class DataMigrationItem(BaseModel):
    """個別データ移行項目"""
    data_type: DataType = Field(..., description="データタイプ")
    status: MigrationStatus = Field(..., description="移行ステータス")
    total_count: int = Field(default=0, description="移行対象の総数")
    migrated_count: int = Field(default=0, description="移行済み数")
    failed_count: int = Field(default=0, description="失敗数")
    error_messages: List[str] = Field(default=[], description="エラーメッセージ一覧")
    started_at: Optional[datetime] = Field(None, description="開始時刻")
    completed_at: Optional[datetime] = Field(None, description="完了時刻")
    
    @property
    def progress_percentage(self) -> float:
        """進捗率を計算"""
        if self.total_count == 0:
            return 0.0
        return (self.migrated_count / self.total_count) * 100

class MigrationStatusResponse(BaseModel):
    """移行ステータス応答"""
    migration_id: str = Field(..., description="移行ID")
    overall_status: MigrationStatus = Field(..., description="全体の移行ステータス")
    user_id: str = Field(..., description="対象ユーザーのSupabase UID")
    items: List[DataMigrationItem] = Field(..., description="個別データ移行状況")
    started_at: datetime = Field(..., description="移行開始時刻")
    completed_at: Optional[datetime] = Field(None, description="移行完了時刻")
    backup_location: Optional[str] = Field(None, description="バックアップファイルの場所")
    total_errors: int = Field(default=0, description="エラー総数")
    
    @property
    def overall_progress_percentage(self) -> float:
        """全体の進捗率を計算"""
        if not self.items:
            return 0.0
        
        total_progress = sum(item.progress_percentage for item in self.items)
        return total_progress / len(self.items)
    
    class Config:
        schema_extra = {
            "example": {
                "migration_id": "mig_20240321_123456",
                "overall_status": "in_progress",
                "user_id": "uuid-string-here",
                "items": [
                    {
                        "data_type": "projects",
                        "status": "completed",
                        "total_count": 15,
                        "migrated_count": 15,
                        "failed_count": 0,
                        "error_messages": [],
                        "started_at": "2024-03-21T10:30:00Z",
                        "completed_at": "2024-03-21T10:31:30Z"
                    }
                ],
                "started_at": "2024-03-21T10:30:00Z",
                "completed_at": None,
                "backup_location": "/backups/user_123_20240321.json",
                "total_errors": 0
            }
        }

class MigrationResult(BaseModel):
    """移行実行結果"""
    migration_id: str = Field(..., description="移行ID")
    success: bool = Field(..., description="移行成功フラグ")
    message: str = Field(..., description="結果メッセージ")
    status_details: MigrationStatusResponse = Field(..., description="詳細ステータス")
    
    class Config:
        schema_extra = {
            "example": {
                "migration_id": "mig_20240321_123456",
                "success": True,
                "message": "データ移行が正常に開始されました",
                "status_details": {
                    "migration_id": "mig_20240321_123456",
                    "overall_status": "in_progress",
                    "user_id": "uuid-string-here",
                    "items": [],
                    "started_at": "2024-03-21T10:30:00Z",
                    "total_errors": 0
                }
            }
        }

class RollbackResult(BaseModel):
    """ロールバック結果"""
    success: bool = Field(..., description="ロールバック成功フラグ")
    migration_id: str = Field(..., description="対象移行ID")
    message: str = Field(..., description="結果メッセージ")
    rolled_back_at: datetime = Field(..., description="ロールバック実行時刻")
    restored_data_types: List[DataType] = Field(..., description="復元されたデータタイプ一覧")
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "migration_id": "mig_20240321_123456",
                "message": "データのロールバックが完了しました",
                "rolled_back_at": "2024-03-21T11:00:00Z",
                "restored_data_types": ["projects", "memos"]
            }
        }

class ErrorResponse(BaseModel):
    """エラーレスポンス"""
    success: bool = Field(False, description="成功フラグ")
    error_code: str = Field(..., description="エラーコード")
    message: str = Field(..., description="エラーメッセージ")
    details: Optional[Dict[str, Any]] = Field(None, description="エラー詳細情報")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="エラー発生時刻")
    
    class Config:
        schema_extra = {
            "example": {
                "success": False,
                "error_code": "MIGRATION_FAILED",
                "message": "データ移行中にエラーが発生しました",
                "details": {
                    "failed_data_type": "projects",
                    "error_reason": "Database connection timeout"
                },
                "timestamp": "2024-03-21T10:45:00Z"
            }
        }

# 内部処理用スキーマ
class UserMappingData(BaseModel):
    """ユーザーマッピング内部データ"""
    legacy_user_id: int
    supabase_uid: str
    username: str
    linked_at: datetime
    migration_status: MigrationStatus = MigrationStatus.NOT_STARTED
    
class BackupData(BaseModel):
    """バックアップデータ構造"""
    user_id: int
    backup_id: str
    created_at: datetime
    data: Dict[str, Any]
    data_types: List[DataType]
    
class MigrationTask(BaseModel):
    """移行タスク内部構造"""
    task_id: str
    migration_id: str
    data_type: DataType
    status: MigrationStatus
    parameters: Dict[str, Any]
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None