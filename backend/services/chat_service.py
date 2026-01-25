# services/chat_service.py - チャット・対話管理サービス

from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
import time
import asyncio
import os
import json
import uuid
import logging
from .base import BaseService
from async_helpers import (
    parallel_fetch_context_and_history,
    parallel_save_chat_logs,
    rate_limited_openai_call
)

from prompt.prompt import RESPONSE_STYLE_PROMPTS

# turn_indexバグ修正を一時的に無効化のためコメントアウト
# from async_helpers_turn_index import (
#     ChatLogStore,
#     parallel_save_chat_logs_with_turn_index
# )

class ChatService(BaseService):
    """チャット・対話管理を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        self.history_limit_default = int(os.environ.get("CHAT_HISTORY_LIMIT_DEFAULT", "50"))
        self.history_limit_max = int(os.environ.get("CHAT_HISTORY_LIMIT_MAX", "100"))
    
    def get_service_name(self) -> str:
        return "ChatService"

    def dump_response_events(self, resp):
        logger = logging.getLogger(__name__)

        try:
            logger.info(f"dump_response_events: resp type={type(resp)} repr={repr(resp)[:200]}")

            events = getattr(resp, "output", []) or []
            logger.info("=== Response.output events dump ===")
            for i, ev in enumerate(events):
                # SDKオブジェクトをdict化して出す（可能なら）
                if hasattr(ev, "model_dump"):
                    logger.info(f"[{i}] {json.dumps(ev.model_dump(), ensure_ascii=False)}")
                else:
                    logger.info(f"[{i}] {repr(ev)}")
        except Exception as e:
            logger.exception(f"Failed to dump response events: {e}")
    
    async def process_chat_message(
        self,
        message: str,
        user_id: int,
        project_id: Optional[str] = None,
        session_type: str = "general",
        response_style: Optional[str] = "auto",
        custom_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """メインチャット処理（統合最適化版）"""
        start_time = time.time()
        metrics = {
            "db_fetch_time": 0,
            "llm_response_time": 0,
            "db_save_time": 0,
            "total_time": 0
        }
        
        try:
            # Phase 1: 並列コンテキスト・履歴取得
            fetch_start = time.time()
            
            # AsyncDatabaseHelperとAsyncProjectContextBuilderのインスタンスを作成
            from async_helpers import AsyncDatabaseHelper, AsyncProjectContextBuilder
            db_helper = AsyncDatabaseHelper(self.supabase)
            # AsyncProjectContextBuilder は AsyncDatabaseHelper を受け取る
            context_builder = AsyncProjectContextBuilder(db_helper)
            
            # 会話IDを取得または作成
            conversation_id = self.get_or_create_conversation_sync(session_type)
            
            project_id, project_context, project, conversation_history = \
                await parallel_fetch_context_and_history(
                    db_helper, 
                    context_builder,
                    project_id or "",  # page_id
                    conversation_id,   # conversation_id
                    user_id,          # user_id
                    self.history_limit_default
                )
            metrics["db_fetch_time"] = time.time() - fetch_start
            
            # Phase 2: AI応答生成（フォールバック機構付き）
            llm_start = time.time()
            ai_response = await self._generate_ai_response(
                message, user_id, project_context, conversation_history, session_type, response_style, custom_instruction
            )

            metrics["llm_response_time"] = time.time() - llm_start
            
            # Phase 3: 並列ログ保存
            save_start = time.time()
            
            # ログデータを準備
            context_data = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "project_id": project_id
            }
            
            user_message_data = {
                "user_id": user_id,
                "page_id": project_id or "",
                "sender": "user",
                "message": message,
                "conversation_id": conversation_id,
                "context_data": context_data
            }
            ai_message_data = {
                "user_id": user_id,
                "page_id": project_id or "",
                "sender": "ai",
                "message": ai_response["response"],
                "conversation_id": conversation_id,
                "context_data": context_data
            }
            
            # 従来の保存処理を使用（turn_indexバグ修正を一時的に無効化）
            user_saved, ai_saved = await parallel_save_chat_logs(
                db_helper,
                user_message_data,
                ai_message_data
            )
            metrics["db_save_time"] = time.time() - save_start
            
            # Phase 4: 非同期タイムスタンプ更新（ノンブロッキング）
            if conversation_id:
                asyncio.create_task(self._update_conversation_timestamp_async(conversation_id))
            
            metrics["total_time"] = time.time() - start_time
            
            return {
                "response": ai_response["response"],
                "project_id": project_id,
                "metrics": metrics,
                "agent_used": ai_response.get("agent_used", False),
                "fallback_used": ai_response.get("fallback_used", False)
            }
            
        except Exception as e:
            error_result = self.handle_error(e, "Chat processing")
            self.logger.error(f"Chat processing failed for user {user_id}: {e}")
            raise Exception(error_result["error"])
    
    async def _generate_ai_response(
        self,
        message: str,
        user_id: int,
        project_context: str,
        conversation_history: List[Dict],
        session_type: str,
        response_style: Optional[str] = "auto",
        custom_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """AI応答生成（シンプル版）"""
        
        # 非同期LLMクライアントを優先的に使用
        try:
            return await self._process_with_async_llm(
                message, project_context, conversation_history, response_style, custom_instruction
            )
        except Exception as e:
            self.logger.warning(f"Async LLM failed, falling back to sync: {e}")
            # 同期LLMクライアント（フォールバック）
            return await self._process_with_sync_llm(
                message, project_context, conversation_history, response_style, custom_instruction
            )
    
    
    async def _process_with_async_llm(
        self,
        message: str,
        project_context: str,
        conversation_history: List[Dict],
        response_style: Optional[str] = "auto",
        custom_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """非同期LLMクライアントによる処理"""
        try:
            from module.llm_api import get_async_llm_client
            from .response_styles import ResponseStyleManager

            # NOTE: get_async_llm_client は初回呼び出しの pool_size（=Semaphore上限）のみ有効
            pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
            llm_client = get_async_llm_client(pool_size=pool_size)  # awaitは不要
            if not llm_client:
                raise Exception("Async LLM client not available")

            context_data = self._build_context_data(project_context, conversation_history)

            # 応答スタイルに応じたシステムプロンプトを取得
            if response_style == "custom" and custom_instruction:
                # カスタムスタイルの場合は、プロンプトテンプレートに指示を埋め込む
                system_prompt = RESPONSE_STYLE_PROMPTS["custom"].replace("{custom_instruction}", custom_instruction)
            else:
                system_prompt = ResponseStyleManager.get_system_prompt(response_style)

            # 応答スタイルに応じたトークン数制限を設定
            # 長考モード: research, deepen → 制限なし（従来通り）
            # 通常モード: organize, expand, ideas → 300トークン（約400文字）
            is_deep_thinking = response_style in ["research", "deepen"]
            max_tokens = None if is_deep_thinking else int(os.environ.get("DEFAULT_MAX_TOKENS", "300"))

            # llm_clientのgenerate_response_asyncメソッドを呼び出す
            input_items = [
                llm_client.text("system", system_prompt),
                llm_client.text("user", f"{context_data}\n\n{message}")
            ]
            response_obj = await llm_client.generate_response_async(input_items, max_tokens=max_tokens)

            # Web検索実行確認のログ出力（Responseオブジェクトに対して行う）
            self.dump_response_events(response_obj)
            
            # Response APIのoutput_textを取得
            response = llm_client.extract_output_text(response_obj)
            
            return {
                "response": response,
                "agent_used": False,
                "fallback_used": False
            }
            
        except Exception as e:
            self.logger.error(f"Async LLM error: {e}")
            raise
    
    async def _process_with_sync_llm(
        self,
        message: str,
        project_context: str,
        conversation_history: List[Dict],
        response_style: Optional[str] = "auto",
        custom_instruction: Optional[str] = None
    ) -> Dict[str, Any]:
        """同期LLMクライアントによる処理（最終フォールバック）"""
        try:
            import sys
            #sys.path.append('C:\\Users\\kouta\\learning-assistant')
            from module.llm_api import learning_plannner
            from .response_styles import ResponseStyleManager

            context_data = self._build_context_data(project_context, conversation_history)

            # 応答スタイルに応じたシステムプロンプトを取得
            if response_style == "custom" and custom_instruction:
                # カスタムスタイルの場合は、プロンプトテンプレートに指示を埋め込む
                system_prompt = RESPONSE_STYLE_PROMPTS["custom"].replace("{custom_instruction}", custom_instruction)
            else:
                system_prompt = ResponseStyleManager.get_system_prompt(response_style)

            # 応答スタイルに応じたトークン数制限を設定
            # 長考モード: research, deepen → 制限なし（従来通り）
            # 通常モード: organize, expand, ideas → 300トークン（約400文字）
            is_deep_thinking = response_style in ["research", "deepen"]
            max_tokens = None if is_deep_thinking else int(os.environ.get("DEFAULT_MAX_TOKENS", "300"))

            # learning_plannnerクラスのインスタンスを作成
            llm_instance = learning_plannner()

            # 同期処理を非同期コンテキストで実行
            input_items = [
                llm_instance.text("system", system_prompt),
                llm_instance.text("user", f"{context_data}\n\n{message}")
            ]

            # max_tokensを引数として渡す
            if max_tokens:
                response_obj = await asyncio.get_event_loop().run_in_executor(
                    None,
                    lambda: llm_instance.generate_response(input_items, max_tokens)
                )
            else:
                response_obj = await asyncio.get_event_loop().run_in_executor(
                    None,
                    llm_instance.generate_response,
                    input_items
                )

            # Web検索実行確認のログ出力（Responseオブジェクトに対して行う）
            self.dump_response_events(response_obj)
            
            # Response APIのoutput_textを取得
            response = llm_instance.extract_output_text(response_obj)
            
            return {
                "response": response,
                "agent_used": False,
                "fallback_used": True
            }
            
        except Exception as e:
            self.logger.error(f"Sync LLM error: {e}")
            raise Exception("All LLM processing methods failed")
    
    def get_chat_history(self, user_id: int, limit: int = 20) -> List[Dict[str, Any]]:
        """チャット履歴取得"""
        try:
            limit = min(limit, 100)  # 最大100件
            
            result = self.supabase.table("chat_logs")\
                .select("id, message, sender, created_at")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(limit)\
                .execute()
            
            # ユーザーメッセージとAI応答をペアにして返す
            history = []
            for i, log in enumerate(result.data):
                if log["sender"] == "user":
                    # 次のレコードがAI応答かチェック
                    ai_response = ""
                    if i + 1 < len(result.data) and result.data[i + 1]["sender"] == "ai":
                        ai_response = result.data[i + 1]["message"]
                    
                    history.append({
                        "id": log["id"],
                        "message": log["message"],
                        "response": ai_response,
                        "timestamp": log["created_at"],
                        "sender": log["sender"],
                        "created_at": log["created_at"]
                    })
            
            return history
            
        except Exception as e:
            error_result = self.handle_error(e, "Get chat history")
            self.logger.error(f"Failed to get chat history: {e}")
            return []
    
    def get_or_create_conversation_sync(self, session_type: str = "general") -> str:
        """会話セッション管理"""
        try:
            if not self.user_id:
                raise ValueError("User ID is required for conversation management")
            
            # 既存のアクティブな会話を検索
            result = self.supabase.table("chat_conversations")\
                .select("id")\
                .eq("user_id", self.user_id)\
                .eq("is_active", True)\
                .order("updated_at", desc=True)\
                .limit(1)\
                .execute()
            
            if result.data:
                return result.data[0]["id"]
            
            # 新しい会話を作成
            new_conversation = self.supabase.table("chat_conversations").insert({
                "user_id": self.user_id,
                "title": f"AIチャットセッション - {session_type}",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
            return new_conversation.data[0]["id"]
            
        except Exception as e:
            self.logger.error(f"Conversation management error: {e}")
            # UUIDを生成してフォールバック（UUID型のカラムに対応）
            return str(uuid.uuid4())
    
    def _build_context_data(
        self,
        project_context: str,
        conversation_history: List[Dict]
    ) -> str:
        """コンテキストデータ構築"""
        context_parts = []
        
        if project_context:
            context_parts.append(f"プロジェクト情報:\n{project_context}")
        
        if conversation_history:
            history_text = "\n".join([
                f"ユーザー: {item.get('message', '')}\nAI: {item.get('response', '')}"
                for item in conversation_history[-10:]  # 最新10件
            ])
            context_parts.append(f"会話履歴:\n{history_text}")
        
        return "\n\n".join(context_parts)
    
    
    async def _update_conversation_timestamp_async(self, conversation_id: str) -> None:
        """非同期タイムスタンプ更新（ノンブロッキング）"""
        try:
            await asyncio.sleep(0)  # 非同期実行
            self.supabase.table("chat_conversations")\
                .update({"updated_at": datetime.now(timezone.utc).isoformat()})\
                .eq("id", conversation_id)\
                .execute()
        except Exception as e:
            self.logger.warning(f"Conversation timestamp update failed: {e}")
    
