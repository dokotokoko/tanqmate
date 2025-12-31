# services/conversation_service.py - 会話管理サービス

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import json
from fastapi import HTTPException, status
from .base import BaseService, CacheableService

class ConversationService(CacheableService):
    """会話管理を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
    
    def get_service_name(self) -> str:
        return "ConversationService"
    
    async def create_conversation(
        self,
        user_id: int,
        title: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """新規会話作成"""
        try:
            conversation_data = {
                "user_id": user_id,
                "title": title,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            if metadata:
                conversation_data["metadata"] = json.dumps(metadata, ensure_ascii=False)
            
            result = self.supabase.table("chat_conversations").insert(conversation_data).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="会話の作成に失敗しました")
            
            # キャッシュクリア
            self.clear_user_conversation_cache(user_id)
            
            return result.data[0]["id"]
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Create conversation")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def get_conversation(self, conversation_id: str, user_id: int) -> Optional[Dict[str, Any]]:
        """会話詳細取得"""
        try:
            cache_key = f"conversation_{conversation_id}_{user_id}"
            cached_conv = self.get_cached_result(cache_key)
            
            if cached_conv:
                return cached_conv['data']
            
            result = self.supabase.table("chat_conversations")\
                .select("*")\
                .eq("id", conversation_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                return None
            
            conversation = result.data[0]
            
            # メタデータのパース
            if conversation.get("metadata") and isinstance(conversation["metadata"], str):
                try:
                    conversation["metadata"] = json.loads(conversation["metadata"])
                except json.JSONDecodeError:
                    conversation["metadata"] = {}
            
            # メッセージ数を取得
            message_count_result = self.supabase.table("chat_logs")\
                .select("id", count="exact")\
                .eq("conversation_id", conversation_id)\
                .execute()
            
            conversation["message_count"] = message_count_result.count if message_count_result.count else 0
            
            self.set_cached_result(cache_key, conversation, ttl=300)  # 5分
            
            return conversation
            
        except Exception as e:
            error_result = self.handle_error(e, "Get conversation")
            self.logger.error(f"Failed to get conversation {conversation_id}: {e}")
            return None
    
    async def list_conversations(
        self,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
        is_active: Optional[bool] = None
    ) -> Dict[str, Any]:
        """会話一覧取得"""
        try:
            cache_key = f"conversations_{user_id}_{limit}_{offset}_{is_active}"
            cached_list = self.get_cached_result(cache_key)
            
            if cached_list:
                return cached_list['data']
            
            query = self.supabase.table("chat_conversations")\
                .select("*", count="exact")\
                .eq("user_id", user_id)
            
            if is_active is not None:
                query = query.eq("is_active", is_active)
            
            query = query.order("updated_at", desc=True)\
                .range(offset, offset + limit - 1)
            
            result = query.execute()
            
            conversations = []
            for conv in result.data:
                # メタデータのパース
                if conv.get("metadata") and isinstance(conv["metadata"], str):
                    try:
                        conv["metadata"] = json.loads(conv["metadata"])
                    except json.JSONDecodeError:
                        conv["metadata"] = {}
                conversations.append(conv)
            
            response = {
                "conversations": conversations,
                "total": result.count if result.count else 0,
                "limit": limit,
                "offset": offset
            }
            
            self.set_cached_result(cache_key, response, ttl=60)  # 1分
            
            return response
            
        except Exception as e:
            error_result = self.handle_error(e, "List conversations")
            self.logger.error(f"Failed to list conversations for user {user_id}: {e}")
            return {"conversations": [], "total": 0, "limit": limit, "offset": offset}
    
    async def update_conversation(
        self,
        conversation_id: str,
        user_id: int,
        update_data: Dict[str, Any]
    ) -> bool:
        """会話更新"""
        try:
            # 更新可能なフィールドのみ抽出
            allowed_fields = ["title", "is_active", "metadata"]
            filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields and v is not None}
            
            if not filtered_data:
                return True  # 更新するものがない場合は成功とする
            
            # メタデータをJSON文字列に変換
            if "metadata" in filtered_data:
                filtered_data["metadata"] = json.dumps(filtered_data["metadata"], ensure_ascii=False)
            
            filtered_data["updated_at"] = datetime.now(timezone.utc).isoformat()
            
            result = self.supabase.table("chat_conversations")\
                .update(filtered_data)\
                .eq("id", conversation_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                return False
            
            # キャッシュクリア
            self.clear_conversation_cache(conversation_id, user_id)
            
            return True
            
        except Exception as e:
            error_result = self.handle_error(e, "Update conversation")
            self.logger.error(f"Failed to update conversation {conversation_id}: {e}")
            return False
    
    async def delete_conversation(self, conversation_id: str, user_id: int) -> bool:
        """会話削除（論理削除）"""
        try:
            result = self.supabase.table("chat_conversations")\
                .update({"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()})\
                .eq("id", conversation_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                return False
            
            # キャッシュクリア
            self.clear_conversation_cache(conversation_id, user_id)
            
            return True
            
        except Exception as e:
            error_result = self.handle_error(e, "Delete conversation")
            self.logger.error(f"Failed to delete conversation {conversation_id}: {e}")
            return False
    
    async def get_messages(
        self,
        conversation_id: str,
        user_id: int,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """会話のメッセージ取得"""
        try:
            # 会話の所有権確認
            conversation = await self.get_conversation(conversation_id, user_id)
            if not conversation:
                raise HTTPException(status_code=404, detail="会話が見つかりません")
            
            result = self.supabase.table("chat_logs")\
                .select("id, sender, message, context_data, created_at")\
                .eq("conversation_id", conversation_id)\
                .order("created_at", desc=False)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            messages = []
            for msg in result.data:
                # context_dataのパース
                if msg.get("context_data") and isinstance(msg["context_data"], str):
                    try:
                        msg["context_data"] = json.loads(msg["context_data"])
                    except json.JSONDecodeError:
                        msg["context_data"] = {}
                messages.append(msg)
            
            return messages
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Get messages")
            self.logger.error(f"Failed to get messages for conversation {conversation_id}: {e}")
            return []
    
    async def get_or_create_global_session(self, user_id: int) -> str:
        """ユーザーのグローバルチャットセッション取得または作成"""
        try:
            # 最新のアクティブな会話を取得
            result = await self.list_conversations(
                user_id=user_id,
                limit=1,
                offset=0,
                is_active=True
            )
            
            if result["conversations"]:
                return result["conversations"][0]["id"]
            else:
                # 新しい会話を作成
                return await self.create_conversation(
                    user_id=user_id,
                    title="AIチャットセッション",
                    metadata={"session_type": "global_chat", "auto_created": True}
                )
                
        except Exception as e:
            error_result = self.handle_error(e, "Get or create global session")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def clear_conversation_cache(self, conversation_id: str, user_id: int) -> None:
        """会話関連キャッシュクリア"""
        cache_keys_to_clear = [
            f"conversation_{conversation_id}_{user_id}",
            f"conversations_{user_id}_*"  # ワイルドカード的にクリア
        ]
        
        for key in list(self._cache.keys()):
            for pattern in cache_keys_to_clear:
                if pattern.endswith("*"):
                    if key.startswith(pattern[:-1]):
                        del self._cache[key]
                elif key == pattern:
                    del self._cache[key]
    
    def clear_user_conversation_cache(self, user_id: int) -> None:
        """ユーザーの会話関連キャッシュクリア"""
        cache_keys = [key for key in self._cache.keys() 
                     if f"_{user_id}_" in key or f"conversations_{user_id}" in key]
        
        for key in cache_keys:
            del self._cache[key]