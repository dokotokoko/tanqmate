"""
会話管理マネージャー
会話のライフサイクルとアクティブな会話の管理を一元化
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid
import logging


class ConversationManager:
    """会話管理の一元化クラス"""
    
    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.logger = logging.getLogger(__name__)
        # 会話の有効期限（24時間）
        self.conversation_timeout_hours = 24
    
    def get_or_create_active_conversation(self, user_id: int, session_type: str = "general") -> Optional[str]:
        """
        ユーザーごとに1つのアクティブな会話を維持
        24時間以上経過した会話は自動的に新規作成
        
        Args:
            user_id: ユーザーID
            session_type: セッションタイプ
        
        Returns:
            会話ID（UUID文字列）
        """
        try:
            # 既存のアクティブな会話を検索
            result = self.supabase.table("chat_conversations")\
                .select("id, updated_at")\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .order("updated_at", desc=True)\
                .limit(1)\
                .execute()
            
            if result.data:
                conversation = result.data[0]
                conversation_id = conversation["id"]
                updated_at = datetime.fromisoformat(conversation["updated_at"].replace('Z', '+00:00'))
                
                # 24時間以内の会話であれば継続使用
                time_diff = datetime.now(timezone.utc) - updated_at
                if time_diff < timedelta(hours=self.conversation_timeout_hours):
                    # タイムスタンプを更新
                    self._update_conversation_timestamp(conversation_id)
                    return conversation_id
                else:
                    # 古い会話をアーカイブ
                    self._archive_conversation(conversation_id)
            
            # 新しい会話を作成
            return self._create_new_conversation(user_id, session_type)
            
        except Exception as e:
            self.logger.error(f"会話管理エラー: {e}")
            # エラー時はUUIDを生成してフォールバック
            return str(uuid.uuid4())
    
    def validate_conversation(self, user_id: int, conversation_id: str) -> bool:
        """
        会話IDが有効かチェック
        
        Args:
            user_id: ユーザーID
            conversation_id: 検証する会話ID
        
        Returns:
            有効な場合True
        """
        try:
            result = self.supabase.table("chat_conversations")\
                .select("id")\
                .eq("id", conversation_id)\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .limit(1)\
                .execute()
            
            return bool(result.data)
        except Exception as e:
            self.logger.error(f"会話検証エラー: {e}")
            return False
    
    def _create_new_conversation(self, user_id: int, session_type: str) -> str:
        """新しい会話を作成"""
        try:
            new_conversation = self.supabase.table("chat_conversations").insert({
                "user_id": user_id,
                "title": f"AIチャットセッション - {session_type}",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
            return new_conversation.data[0]["id"]
        except Exception as e:
            self.logger.error(f"会話作成エラー: {e}")
            return str(uuid.uuid4())
    
    def _update_conversation_timestamp(self, conversation_id: str) -> None:
        """会話のタイムスタンプを更新"""
        try:
            self.supabase.table("chat_conversations")\
                .update({"updated_at": datetime.now(timezone.utc).isoformat()})\
                .eq("id", conversation_id)\
                .execute()
        except Exception as e:
            self.logger.warning(f"タイムスタンプ更新失敗: {e}")
    
    def _archive_conversation(self, conversation_id: str) -> None:
        """古い会話をアーカイブ（非アクティブ化）"""
        try:
            self.supabase.table("chat_conversations")\
                .update({"is_active": False})\
                .eq("id", conversation_id)\
                .execute()
        except Exception as e:
            self.logger.warning(f"会話アーカイブ失敗: {e}")
    
    def archive_old_conversations(self, user_id: int, hours: int = 24) -> int:
        """
        指定時間以上経過した会話を自動的にアーカイブ
        
        Args:
            user_id: ユーザーID
            hours: アーカイブ対象とする経過時間（デフォルト24時間）
        
        Returns:
            アーカイブした会話数
        """
        try:
            cutoff_time = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
            
            result = self.supabase.table("chat_conversations")\
                .update({"is_active": False})\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .lt("updated_at", cutoff_time)\
                .execute()
            
            archived_count = len(result.data) if result.data else 0
            if archived_count > 0:
                self.logger.info(f"ユーザー {user_id} の古い会話を {archived_count} 件アーカイブしました")
            
            return archived_count
            
        except Exception as e:
            self.logger.error(f"会話アーカイブ処理エラー: {e}")
            return 0
    
    def get_active_conversation(self, user_id: int) -> Optional[str]:
        """
        最新のアクティブな会話IDを取得（作成はしない）
        
        Args:
            user_id: ユーザーID
        
        Returns:
            会話ID、存在しない場合はNone
        """
        try:
            result = self.supabase.table("chat_conversations")\
                .select("id")\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .order("updated_at", desc=True)\
                .limit(1)\
                .execute()
            
            if result.data:
                return result.data[0]["id"]
            return None
            
        except Exception as e:
            self.logger.error(f"アクティブ会話取得エラー: {e}")
            return None