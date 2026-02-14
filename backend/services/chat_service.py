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
        custom_instruction: Optional[str] = None,
        conversation_id: Optional[str] = None  # 既存の会話IDを受け取る
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
            # 既存のconversation_idが渡された場合はそれを使用、なければ新規作成
            if not conversation_id:
                conversation_id = self.get_or_create_conversation_sync(session_type)
            else:
                # 既存のconversation_idが有効か確認
                conversation_id = self.get_or_create_conversation_sync(session_type, existing_id=conversation_id)
            
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
                "conversation_id": conversation_id,  # 使用した会話IDを返す
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
            response_obj = await llm_client.generate_response_async(input_items, max_tokens=max_tokens, status_callback=None)

            # Web検索実行確認のログ出力（Responseオブジェクトに対して行う）
            self.dump_response_events(response_obj)
            
            # Response APIのoutput_textを取得
            response = llm_client.extract_output_text(response_obj)
            
            # フォールバック使用の確認
            fallback_used = getattr(response_obj, 'fallback_used', False)
            fallback_model = getattr(response_obj, 'fallback_model', None)

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

            # すべてのレスポンスからクエストカードを抽出
            quest_cards = self._extract_quest_cards(response)
            
            # クエストカードのJSONブロックを応答から削除
            cleaned_response = response
            if quest_cards:
                import re
                # JSONブロックパターン（```jsonで囲まれた部分）を削除
                cleaned_response = re.sub(
                    r'```json\s*\{[^}]*"quest_cards"[^}]*\}[^}]*\}\s*```', 
                    '', 
                    cleaned_response, 
                    flags=re.DOTALL | re.IGNORECASE
                )
                # 単純なJSONブロック（```なし）も削除
                cleaned_response = re.sub(
                    r'\{[^}]*"quest_cards"\s*:\s*\[[^\]]*\][^}]*\}', 
                    '', 
                    cleaned_response,
                    flags=re.DOTALL | re.IGNORECASE
                )
                # 余分な空白行を削除
                cleaned_response = re.sub(r'\n\s*\n+', '\n\n', cleaned_response).strip()
            
            result = {
                "response": cleaned_response,
                "agent_used": False,
                "fallback_used": fallback_used,
                "fallback_model": fallback_model,
                "response_style_used": response_style  # 使用した応答スタイルを記録
            }
            
            # クエストカードがある場合は追加
            if quest_cards:
                result["quest_cards"] = quest_cards
                
            return result
            
        except Exception as e:
            self.logger.error(f"Async LLM error: {e}")
            raise
    
    def _extract_quest_cards(self, response: str) -> List[Dict[str, Any]]:
        """
        AI応答からクエストカードJSONを抽出・パース
        
        Args:
            response: AI応答テキスト
            
        Returns:
            クエストカードのリスト
        """
        try:
            # JSONブロックを探す
            quest_cards_pattern = r'```json\s*\{\s*"quest_cards"\s*:\s*\[(.*?)\]\s*\}\s*```'
            import re
            
            # JSON部分を検索
            matches = re.search(quest_cards_pattern, response, re.DOTALL | re.IGNORECASE)
            if not matches:
                # パターンが見つからない場合、単純な { "quest_cards": [...] } 形式も試す
                json_start = response.find('{"quest_cards":')
                if json_start == -1:
                    json_start = response.find('"quest_cards"')
                    if json_start != -1:
                        # quest_cardsフィールドがある場合、その周辺を抽出
                        bracket_start = response.rfind('{', 0, json_start)
                        if bracket_start != -1:
                            json_start = bracket_start
                        else:
                            return []
                
                if json_start != -1:
                    # 対応する閉じ括弧を見つける
                    bracket_count = 0
                    json_end = json_start
                    for i in range(json_start, len(response)):
                        if response[i] == '{':
                            bracket_count += 1
                        elif response[i] == '}':
                            bracket_count -= 1
                            if bracket_count == 0:
                                json_end = i + 1
                                break
                    
                    if bracket_count == 0:
                        json_text = response[json_start:json_end]
                    else:
                        return []
                else:
                    return []
            else:
                # マッチした場合、完全なJSONブロックを再構築
                json_text = f'{{"quest_cards": [{matches.group(1)}]}}'
            
            # JSONをパース
            try:
                parsed = json.loads(json_text)
                quest_cards_raw = parsed.get('quest_cards', [])
                
                # クエストカードを正規化
                quest_cards = []
                for card in quest_cards_raw:
                    if isinstance(card, dict) and 'id' in card and 'label' in card:
                        normalized_card = {
                            'id': card['id'],
                            'label': card['label'],
                            'emoji': card.get('emoji', '🎯'),
                            'color': card.get('color', 'teal')
                        }
                        # colorが有効な値かチェック
                        valid_colors = ['teal', 'yellow', 'purple', 'pink', 'green']
                        if normalized_card['color'] not in valid_colors:
                            normalized_card['color'] = 'teal'
                        quest_cards.append(normalized_card)
                
                if quest_cards:
                    self.logger.info(f"✅ Extracted {len(quest_cards)} quest cards from AI response")
                return quest_cards
                
            except json.JSONDecodeError as e:
                self.logger.warning(f"Quest card JSON parse error: {e}")
                return []
                
        except Exception as e:
            self.logger.warning(f"Quest card extraction failed: {e}")
            return []
    
    # 同期フォールバック処理は削除 - 軽量モデル非同期フォールバックに統合済み
    
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
    
    def get_or_create_conversation_sync(self, session_type: str = "general", existing_id: Optional[str] = None) -> str:
        """会話セッション管理"""
        try:
            if not self.user_id:
                raise ValueError("User ID is required for conversation management")
            
            # 既存のIDが渡された場合、それが有効かチェック
            if existing_id:
                check_result = self.supabase.table("chat_conversations")\
                    .select("id")\
                    .eq("id", existing_id)\
                    .eq("user_id", self.user_id)\
                    .eq("is_active", True)\
                    .limit(1)\
                    .execute()
                
                if check_result.data:
                    return existing_id
                # 既存IDが無効な場合は、新規作成へ進む
            
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

