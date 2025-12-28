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

class ChatService(BaseService):
    """チャット・対話管理を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        self.conversation_agent_available = False  # 実験機能として無効化
        self.phase1_available = self._check_phase1_system()
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
        session_type: str = "general"
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
            context_builder = AsyncProjectContextBuilder(self.supabase)
            
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
                message, user_id, project_context, conversation_history, session_type
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
        session_type: str
    ) -> Dict[str, Any]:
        """AI応答生成（フォールバック機構付き）"""
        
        # Option 1: 対話エージェント（最優先）
        if self.conversation_agent_available and session_type == "conversation_agent":
            try:
                return await self._process_with_conversation_agent(
                    message, user_id, project_context, conversation_history
                )
            except Exception as e:
                self.logger.warning(f"Conversation agent failed, falling back: {e}")
        
        # Option 2: 非同期LLMクライアント
        try:
            return await self._process_with_async_llm(
                message, project_context, conversation_history
            )
        except Exception as e:
            self.logger.warning(f"Async LLM failed, falling back: {e}")
        
        # Option 3: 同期LLMクライアント（最終フォールバック）
        return await self._process_with_sync_llm(
            message, project_context, conversation_history
        )
    
    async def _process_with_conversation_agent(
        self,
        message: str,
        user_id: int,
        project_context: str,
        conversation_history: List[Dict]
    ) -> Dict[str, Any]:
        """対話エージェントによる処理"""
        try:
            from conversation_agent import ConversationOrchestrator
            
            context_data = self._build_ai_context_data(project_context, conversation_history)
            orchestrator = ConversationOrchestrator()
            
            result = await orchestrator.process_request({
                "message": message,
                "user_id": user_id,
                "context": context_data,
                "session_type": "conversation_agent"
            })
            
            response = self._extract_agent_payload(result)
            return {
                "response": response.get("message", "対話エージェントからの応答を取得できませんでした。"),
                "agent_used": True,
                "fallback_used": False
            }
            
        except Exception as e:
            self.logger.error(f"Conversation agent error: {e}")
            raise
    
    async def _process_with_async_llm(
        self,
        message: str,
        project_context: str,
        conversation_history: List[Dict]
    ) -> Dict[str, Any]:
        """非同期LLMクライアントによる処理"""
        try:
            from module.llm_api import get_async_llm_client
            
            llm_client = get_async_llm_client()  # awaitは不要
            if not llm_client:
                raise Exception("Async LLM client not available")
            
            context_data = self._build_context_data(project_context, conversation_history)
            
            # llm_clientのgenerate_response_asyncメソッドを呼び出す
            input_items = [
                llm_client.text(
                    "system",
                    "あなたは学習支援AIアシスタントです。必要に応じて利用可能なweb_searchツールを使い、根拠となる出典URLを含めて回答してください。",
                ),
                llm_client.text("user", f"{context_data}\n\n{message}")
            ]
            response_obj = await llm_client.generate_response_async(input_items)

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
        conversation_history: List[Dict]
    ) -> Dict[str, Any]:
        """同期LLMクライアントによる処理（最終フォールバック）"""
        try:
            import sys
            #sys.path.append('C:\\Users\\kouta\\learning-assistant')
            from module.llm_api import learning_plannner
            
            context_data = self._build_context_data(project_context, conversation_history)
            
            # learning_plannnerクラスのインスタンスを作成
            llm_instance = learning_plannner()
            
            # 同期処理を非同期コンテキストで実行
            input_items = [
                llm_instance.text(
                    "system",
                    "あなたは学習支援AIアシスタントです。必要に応じて利用可能なweb_searchツールを使い、根拠となる出典URLを含めて回答してください。",
                ),
                llm_instance.text("user", f"{context_data}\n\n{message}")
            ]
            
            response_obj = await asyncio.get_event_loop().run_in_executor(
                None,
                llm_instance.generate_response,
                input_items
            )

            # Web検索実行確認のログ出力（Responseオブジェクトに対して行う）
            self.dump_response_events(response_obj)
            
            # Response APIのoutput_textを取得
            response = llm_client.extract_output_text(response_obj)
            
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
                .select("message, response, timestamp")\
                .eq("user_id", user_id)\
                .order("timestamp", desc=True)\
                .limit(limit)\
                .execute()
            
            return [{
                "message": log["message"],
                "response": log["response"],
                "timestamp": log["timestamp"]
            } for log in result.data]
            
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
    
    def _build_ai_context_data(
        self,
        project_context: str,
        conversation_history: List[Dict]
    ) -> Dict[str, Any]:
        """AIコンテキストデータ構築（辞書形式）"""
        return {
            "project_context": project_context or "",
            "conversation_history": conversation_history or [],
            "history_length": len(conversation_history) if conversation_history else 0
        }
    
    def _extract_agent_payload(self, agent_result: Dict[str, Any]) -> Dict[str, Any]:
        """エージェントペイロード抽出"""
        if "result" in agent_result:
            return agent_result["result"]
        elif "response" in agent_result:
            return {"message": agent_result["response"]}
        else:
            return {"message": str(agent_result)}
    
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
    
    def _check_conversation_agent(self) -> bool:
        """対話エージェント利用可能性チェック"""
        try:
            from conversation_agent import ConversationOrchestrator
            return True
        except ImportError:
            return False
    
    def _check_phase1_system(self) -> bool:
        """Phase 1システム利用可能性チェック"""
        try:
            from phase1_llm_system import get_phase1_manager
            return True
        except ImportError:
            return False