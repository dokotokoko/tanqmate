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
                "fallback_used": ai_response.get("fallback_used", False),
                # 質問明確化機能用フィールド
                "is_clarification": ai_response.get("is_clarification", False),
                "clarification_questions": ai_response.get("clarification_questions"),
                "suggestion_options": ai_response.get("suggestion_options"),
                # 応答スタイル表示用フィールド
                "response_style_used": ai_response.get("response_style_used")
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
        """AI応答生成（質問明確化機能付き）"""

        # 環境変数で機能のON/OFFを制御
        enable_clarification = os.environ.get("ENABLE_CLARIFICATION", "true").lower() == "true"

        # 明確化質問をスキップするスタイル
        # - research, deepen: 長考モード（詳細な応答を生成）
        # - select: サクサク進めるモード（常に行動選択肢を表示）
        skip_clarification_styles = ["research", "deepen", "select"]

        if enable_clarification and response_style not in skip_clarification_styles:
            intent = await self._classify_question_intent(message)

            # 抽象的な質問の場合は明確化質問を生成
            if intent == "abstract":
                try:
                    return await self._generate_clarification_questions(message)
                except Exception as e:
                    self.logger.warning(f"Clarification failed, falling back to normal response: {e}")
                    # 明確化失敗時は通常の応答にフォールバック

        # 通常の応答生成
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

            # デバッグログ: response_styleの確認
            self.logger.info(f"🎯 _process_with_async_llm called with response_style: {response_style}")

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

            # selectスタイルの場合はJSON応答をパース
            if response_style == "select":
                self.logger.info(f"🎮 Select style detected! Attempting to parse JSON...")
                self.logger.info(f"📝 Raw response (first 300 chars): {response[:300]}")
                try:
                    # 二重括弧 {{ }} を単一括弧に変換（LLMが二重括弧で出力する場合の対応）
                    cleaned_response = response.replace('{{', '{').replace('}}', '}')
                    self.logger.info(f"📝 Cleaned response (first 300 chars): {cleaned_response[:300]}")

                    # JSON部分を抽出
                    json_start = cleaned_response.find('{')
                    json_end = cleaned_response.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        json_text = cleaned_response[json_start:json_end]
                        parsed = json.loads(json_text)

                        # メッセージと行動オプションを抽出
                        message_text = parsed.get('message', '')
                        action_options = parsed.get('action_options', [])[:3]  # 3つまで

                        self.logger.info(f"✅ Select style JSON parsed successfully! message={message_text[:50]}..., options={action_options}")
                        return {
                            "response": message_text,
                            "agent_used": False,
                            "fallback_used": False,
                            "response_style_used": response_style,
                            "suggestion_options": action_options  # 行動選択肢として返す
                        }
                except Exception as parse_error:
                    self.logger.warning(f"Select style JSON parse failed: {parse_error}")
                    # パース失敗時は通常応答として返す

            return {
                "response": response,
                "agent_used": False,
                "fallback_used": False,
                "response_style_used": response_style  # 使用した応答スタイルを記録
            }
            
        except Exception as e:
            self.logger.error(f"Async LLM error: {e}")
            raise

    async def process_chat_message_streaming(
        self,
        message: str,
        user_id: int,
        project_id: Optional[str] = None,
        session_type: str = "general",
        response_style: Optional[str] = "auto",
        custom_instruction: Optional[str] = None
    ):
        """ストリーミングチャット処理（SSE用async generator）

        Yields:
            dict: {"chunk": str} or {"done": True, "response_style_used": str}
        """
        try:
            from module.llm_api import get_async_llm_client
            from .response_styles import ResponseStyleManager
            from async_helpers import AsyncDatabaseHelper, AsyncProjectContextBuilder

            db_helper = AsyncDatabaseHelper(self.supabase)
            context_builder = AsyncProjectContextBuilder(db_helper)

            conversation_id = self.get_or_create_conversation_sync(session_type)

            project_id_result, project_context, project, conversation_history = \
                await parallel_fetch_context_and_history(
                    db_helper,
                    context_builder,
                    project_id or "",
                    conversation_id,
                    user_id,
                    self.history_limit_default
                )

            pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
            llm_client = get_async_llm_client(pool_size=pool_size)
            if not llm_client:
                yield {"error": "LLMクライアントが利用できません"}
                return

            context_data = self._build_context_data(project_context, conversation_history)

            if response_style == "custom" and custom_instruction:
                system_prompt = RESPONSE_STYLE_PROMPTS["custom"].replace("{custom_instruction}", custom_instruction)
            else:
                system_prompt = ResponseStyleManager.get_system_prompt(response_style)

            is_deep_thinking = response_style in ["research", "deepen"]
            max_tokens = None if is_deep_thinking else int(os.environ.get("DEFAULT_MAX_TOKENS", "300"))

            input_items = [
                llm_client.text("system", system_prompt),
                llm_client.text("user", f"{context_data}\n\n{message}")
            ]

            self.logger.info(f"🌊 ストリーミング開始: user={user_id}, style={response_style}")

            # researchモードのみweb_searchを有効化
            use_web_search = is_deep_thinking
            full_response = ""

            async for chunk in llm_client.generate_response_streaming(
                input_items, max_tokens=max_tokens, use_web_search=use_web_search
            ):
                full_response += chunk
                yield {"chunk": chunk}

            self.logger.info(f"✅ ストリーミング完了: response_len={len(full_response)}")

            # selectスタイルの場合はJSON応答をパースして構造化データを返す
            done_event = {"done": True, "response_style_used": response_style}
            if response_style == "select":
                self.logger.info(f"🎮 Select style streaming完了、JSONパース開始...")
                try:
                    cleaned = full_response.replace('{{', '{').replace('}}', '}')
                    json_start = cleaned.find('{')
                    json_end = cleaned.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        parsed = json.loads(cleaned[json_start:json_end])
                        message_text = parsed.get('message', '')
                        action_options = parsed.get('action_options', [])[:3]
                        self.logger.info(f"✅ Select streaming JSON parsed: message={message_text[:50]}..., options={action_options}")
                        done_event["suggestion_options"] = action_options
                        done_event["parsed_message"] = message_text
                except Exception as parse_error:
                    self.logger.warning(f"Select streaming JSON parse failed: {parse_error}")

            # ログ保存（バックグラウンド）
            context_log = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "project_id": project_id_result
            }
            # ログにはパース済みメッセージを保存（あれば）
            saved_message = done_event.get("parsed_message", full_response)
            user_msg = {
                "user_id": user_id,
                "page_id": project_id_result or "",
                "sender": "user",
                "message": message,
                "conversation_id": conversation_id,
                "context_data": context_log
            }
            ai_msg = {
                "user_id": user_id,
                "page_id": project_id_result or "",
                "sender": "ai",
                "message": saved_message,
                "conversation_id": conversation_id,
                "context_data": context_log
            }
            asyncio.create_task(parallel_save_chat_logs(db_helper, user_msg, ai_msg))

            if conversation_id:
                asyncio.create_task(self._update_conversation_timestamp_async(conversation_id))

            yield done_event

        except Exception as e:
            self.logger.error(f"ストリーミングエラー: {e}")
            yield {"error": str(e)}

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

            # selectスタイルの場合はJSON応答をパース
            if response_style == "select":
                self.logger.info(f"🎮 Select style detected! Attempting to parse JSON...")
                self.logger.info(f"📝 Raw response (first 300 chars): {response[:300]}")
                try:
                    # 二重括弧 {{ }} を単一括弧に変換（LLMが二重括弧で出力する場合の対応）
                    cleaned_response = response.replace('{{', '{').replace('}}', '}')
                    self.logger.info(f"📝 Cleaned response (first 300 chars): {cleaned_response[:300]}")

                    # JSON部分を抽出
                    json_start = cleaned_response.find('{')
                    json_end = cleaned_response.rfind('}') + 1
                    if json_start != -1 and json_end > json_start:
                        json_text = cleaned_response[json_start:json_end]
                        parsed = json.loads(json_text)

                        # メッセージと行動オプションを抽出
                        message_text = parsed.get('message', '')
                        action_options = parsed.get('action_options', [])[:3]  # 3つまで

                        self.logger.info(f"✅ Select style JSON parsed successfully! message={message_text[:50]}..., options={action_options}")
                        return {
                            "response": message_text,
                            "agent_used": False,
                            "fallback_used": True,
                            "response_style_used": response_style,
                            "suggestion_options": action_options  # 行動選択肢として返す
                        }
                except Exception as parse_error:
                    self.logger.warning(f"Select style JSON parse failed: {parse_error}")
                    # パース失敗時は通常応答として返す

            return {
                "response": response,
                "agent_used": False,
                "fallback_used": True,
                "response_style_used": response_style  # 使用した応答スタイルを記録
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

    async def _classify_question_intent(self, message: str) -> str:
        """
        質問の抽象度を判定

        Args:
            message: ユーザーの質問メッセージ

        Returns:
            "abstract" | "specific"
        """
        # 簡易判定ロジック（キーワードベース）
        abstract_keywords = [
            "について", "とは", "どう", "なぜ", "なに", "何",
            "歴史", "全体", "基本", "概要", "教えて", "知りたい"
        ]
        specific_keywords = [
            "どのように", "手順", "方法", "やり方", "具体的",
            "いつ", "どこで", "ステップ", "実装", "コード"
        ]

        message_lower = message.lower()
        abstract_count = sum(1 for kw in abstract_keywords if kw in message_lower)
        specific_count = sum(1 for kw in specific_keywords if kw in message_lower)

        message_length = len(message)

        # 判定ロジック
        # 1. 文字数が短く（50文字未満）、抽象的なキーワードが多い
        if message_length < 50 and abstract_count > specific_count:
            return "abstract"

        # 2. 非常に短い質問（30文字未満）で抽象的なキーワードが1つ以上
        if message_length < 30 and abstract_count > 0:
            return "abstract"

        return "specific"

    async def _generate_clarification_questions(self, message: str) -> Dict[str, Any]:
        """
        抽象的な質問に対する3つの明確化質問と選択肢を生成

        Args:
            message: ユーザーの抽象的な質問

        Returns:
            フォーマット済みの明確化質問を含む応答
        """
        from module.llm_api import get_async_llm_client
        from prompt.prompt import CLARIFICATION_PROMPT

        llm_client = get_async_llm_client()

        # 明確化質問生成プロンプトを実行
        prompt_text = CLARIFICATION_PROMPT.replace("{user_message}", message)
        input_items = [
            llm_client.text("system", prompt_text),
            llm_client.text("user", message)
        ]

        # 質問生成は高速化のためmax_tokens制限
        response_obj = await llm_client.generate_response_async(input_items, max_tokens=500)
        response_text = llm_client.extract_output_text(response_obj)

        # JSONパース（フォールバック処理付き）
        try:
            # JSON部分を抽出
            json_start = response_text.find('{')
            json_end = response_text.rfind('}') + 1
            if json_start != -1 and json_end > json_start:
                json_text = response_text[json_start:json_end]
                parsed = json.loads(json_text)
            else:
                raise ValueError("JSON not found in response")

            # フォーマット済みの応答テキストを作成
            formatted_response = f"{parsed['summary']}\n\n"
            formatted_response += "以下の点について、詳しく教えてもらえますか？\n\n"

            # 質問リストをテキスト化
            questions_list = []
            all_options = []

            # 質問数を3つに制限
            clarification_questions = parsed['clarification_questions'][:3]

            for i, q_data in enumerate(clarification_questions, 1):
                question_text = q_data['question']
                options = q_data.get('options', [])[:3]  # 各質問の選択肢も3つまで

                formatted_response += f"{i}. {question_text}\n"
                if options:
                    formatted_response += f"   （例: {', '.join(options)}）\n"

                questions_list.append(question_text)
                all_options.extend(options)

            # quick_optionsも追加（3つまで）
            quick_opts = parsed.get('quick_options', [])[:3]
            all_options.extend(quick_opts)

            formatted_response += "\n💡 細かく希望がなければ、上記の選択肢から選んでください。"

            return {
                "response": formatted_response,
                "agent_used": False,
                "fallback_used": False,
                "is_clarification": True,
                "clarification_questions": questions_list,
                "suggestion_options": all_options,  # クリック可能な全選択肢
                "response_style_used": "clarification"  # 明確化質問モード
            }

        except Exception as parse_error:
            self.logger.warning(f"JSON parse failed for clarification: {parse_error}")

            # パース失敗時は通常応答へフォールバック
            return {
                "response": f"「{message}」について、もう少し詳しく教えてもらえますか？\n\n例えば、知りたい範囲や目的、具体的な関心事項などを教えてください。",
                "agent_used": False,
                "fallback_used": True,
                "is_clarification": False
            }

