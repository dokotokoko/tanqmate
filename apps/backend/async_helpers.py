"""
非同期処理用ヘルパー関数群
既存のコードベースとの互換性を保ちながら、パフォーマンスを改善するための関数を提供します。
"""

import asyncio
import json
import logging
import os
import time
from typing import Optional, Dict, Any, List, Tuple
from datetime import datetime, timezone
from supabase import Client
from services.base import UserID
from utils.user_identity import apply_user_scope, attach_user_identity

logger = logging.getLogger(__name__)

# 環境変数から履歴取得上限を取得（デフォルト20件）
DEFAULT_HISTORY_LIMIT = int(os.getenv("CHAT_HISTORY_CONTEXT_LIMIT", "20"))


class AsyncDatabaseHelper:
    """データベース操作の非同期化を支援するヘルパークラス"""
    
    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client

    async def get_profile_context(self, user_id: UserID) -> Optional[Dict[str, Any]]:
        """
        プロフィールベースの学習コンテキストを非同期で取得

        Args:
            user_id: ユーザーID

        Returns:
            プロフィール情報、または None
        """
        start_time = time.time()
        try:
            def fetch_profile():
                return self.supabase.table("profiles")\
                    .select(
                        "id, email, username, role, school_id, school_code_locked, "
                        "grade, class_name, attendance_number, theme, question, hypothesis, "
                        "created_at, updated_at"
                    )\
                    .eq("id", user_id)\
                    .execute()

            result = await asyncio.to_thread(fetch_profile)

            if (not result.data) and isinstance(user_id, str) and user_id.isdigit():
                result = await asyncio.to_thread(
                    lambda: self.supabase.table("profiles")
                    .select(
                        "id, email, username, role, school_id, school_code_locked, "
                        "grade, class_name, attendance_number, theme, question, hypothesis, "
                        "created_at, updated_at"
                    )
                    .eq("legacy_user_id", int(user_id))
                    .execute()
                )

            response_time = time.time() - start_time
            logger.info(f"🔷 DB Query [get_profile_context]: 応答秒={response_time:.3f}s")

            if result.data:
                return result.data[0]
            return None

        except Exception as e:
            logger.error(f"プロフィール情報取得エラー (async): {e}")
            return None
    
    async def get_project_info(self, project_id: int, user_id: UserID) -> Optional[Dict[str, Any]]:
        """
        プロジェクト情報を非同期で取得
        
        Args:
            project_id: プロジェクトID
            user_id: ユーザーID
            
        Returns:
            プロジェクト情報のDict、または None
        """
        start_time = time.time()
        try:
            result = await asyncio.to_thread(
                lambda: apply_user_scope(
                    self.supabase.table('projects')
                    .select('*')
                    .eq('id', project_id),
                    self.supabase,
                    user_id
                ).execute()
            )
            
            response_time = time.time() - start_time
            logger.info(f"🔷 DB Query [get_project_info]: 応答秒={response_time:.3f}s")
            
            if result.data:
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"プロジェクト情報取得エラー (async): {e}")
            return None
    
    async def get_memo_project_id(self, memo_id: int, user_id: UserID) -> Optional[int]:
        """
        メモIDからプロジェクトIDを非同期で取得
        
        Args:
            memo_id: メモID
            user_id: ユーザーID
            
        Returns:
            プロジェクトID、または None
        """
        start_time = time.time()
        try:
            result = await asyncio.to_thread(
                lambda: apply_user_scope(
                    self.supabase.table('memos')
                    .select('project_id')
                    .eq('id', memo_id),
                    self.supabase,
                    user_id
                ).execute()
            )
            
            response_time = time.time() - start_time
            logger.info(f"🔷 DB Query [get_memo_project_id]: 応答秒={response_time:.3f}s")
            
            if result.data and result.data[0].get('project_id'):
                return result.data[0]['project_id']
            return None
            
        except Exception as e:
            logger.warning(f"メモからのプロジェクトID取得エラー (async): {e}")
            return None
    
    async def get_latest_project(self, user_id: UserID) -> Optional[int]:
        """
        最新のプロジェクトIDを非同期で取得
        
        Args:
            user_id: ユーザーID
            
        Returns:
            最新のプロジェクトID、または None
        """
        start_time = time.time()
        try:
            result = await asyncio.to_thread(
                lambda: apply_user_scope(
                    self.supabase.table('projects')
                    .select('id'),
                    self.supabase,
                    user_id
                )
                .order('updated_at', desc=True)
                .limit(1)
                .execute()
            )
            
            response_time = time.time() - start_time
            logger.info(f"🔷 DB Query [get_latest_project]: 応答秒={response_time:.3f}s")
            
            if result.data:
                return result.data[0]['id']
            return None
            
        except Exception as e:
            logger.warning(f"最新プロジェクト取得エラー (async): {e}")
            return None
    
    async def get_conversation_history(
        self,
        conversation_id: str,
        limit: int = None
    ) -> List[Dict[str, Any]]:
        """
        対話履歴を非同期で取得

        Args:
            conversation_id: 会話ID
            limit: 取得する履歴の最大数（Noneの場合は環境変数から取得、デフォルト20件）

        Returns:
            対話履歴のリスト
        """
        if limit is None:
            limit = DEFAULT_HISTORY_LIMIT
        start_time = time.time()
        try:
            result = await asyncio.to_thread(
                lambda: self.supabase.table("chat_logs")
                .select("id, sender, message, created_at, context_data")
                .eq("conversation_id", conversation_id)
                .order("created_at", desc=False)
                .limit(limit)
                .execute()
            )
            
            response_time = time.time() - start_time
            record_count = len(result.data) if result.data else 0
            logger.info(f"🔷 DB Query [get_conversation_history]: 応答秒={response_time:.3f}s, 件数={record_count}")
            
            return result.data if result.data is not None else []
            
        except Exception as e:
            logger.error(f"対話履歴取得エラー (async): {e}")
            return []
    
    async def save_chat_log(
        self, 
        user_id: UserID,
        page_id: str,
        sender: str,
        message: str,
        conversation_id: str,
        context_data: Dict[str, Any]
    ) -> Optional[str]:
        """
        チャットログを非同期で保存
        
        Args:
            user_id: ユーザーID
            page_id: ページID
            sender: 送信者 (user/assistant)
            message: メッセージ内容
            conversation_id: 会話ID
            context_data: コンテキスト情報
            
        Returns:
            保存されたチャットログID。IDを取得できないが保存できた場合は "saved"。
        """
        start_time = time.time()
        try:
            message_data = attach_user_identity({
                "page": page_id,
                "sender": sender,
                "message": message,
                "conversation_id": conversation_id,
                "context_data": json.dumps(context_data, ensure_ascii=False)
            }, self.supabase, user_id)
            
            result = await asyncio.to_thread(
                lambda: self.supabase.table("chat_logs").insert(message_data).execute()
            )
            
            response_time = time.time() - start_time
            logger.info(f"🔷 DB Insert [save_chat_log]: 応答秒={response_time:.3f}s, sender={sender}")
            
            if result.data and result.data[0].get("id"):
                return str(result.data[0]["id"])
            return "saved"
            
        except Exception as e:
            logger.error(f"チャットログ保存エラー (async): {e}")
            return None


class AsyncProjectContextBuilder:
    """
    学習コンテキスト構築の非同期化ヘルパー
    """
    
    def __init__(self, db_helper: AsyncDatabaseHelper):
        self.db_helper = db_helper
    
    async def build_context_from_page_id(
        self, 
        page_id: str, 
        user_id: UserID
    ) -> Tuple[Optional[int], Optional[str], Optional[Dict[str, Any]]]:
        """
        ページIDとプロフィールから非同期で学習コンテキストを構築
        
        Args:
            page_id: ページID
            user_id: ユーザーID
            
        Returns:
            (legacy_project_id, student_context_string, context_payload) のタプル
        """
        legacy_project_id = None
        student_context = ""
        legacy_project = None
        profile = await self.db_helper.get_profile_context(user_id)
        context_payload: Dict[str, Any] = {"student_profile": profile, "legacy_project": None}
        student_context_parts: List[str] = []

        if profile:
            profile_name = profile.get("username") or profile.get("email") or "未設定"
            school_id = profile.get("school_id") or "未設定"
            grade = profile.get("grade") or "未設定"
            class_name = profile.get("class_name") or "未設定"
            attendance_number = profile.get("attendance_number") or "未設定"
            theme = (profile.get("theme") or "未設定")[:40]
            question = (profile.get("question") or "未設定")[:40]
            hypothesis = (profile.get("hypothesis") or "未設定")[:40]

            student_context_parts.extend([
                f"生徒名:{profile_name}",
                f"学校:{school_id}",
                f"学年:{grade}",
                f"クラス:{class_name}",
                f"出席番号:{attendance_number}",
                f"探究テーマ:{theme}",
                f"問い:{question}",
                f"仮説:{hypothesis}",
            ])
            logger.info("✅ プロフィールベースの学習コンテキストを取得しました")
        
        # page_idの形式を判定して適切な処理を選択
        if page_id.startswith('project-'):
            try:
                legacy_project_id = int(page_id.replace('project-', ''))
                logger.info(f"✅ project-形式から旧プロジェクトIDを取得: {legacy_project_id}")
            except ValueError:
                logger.warning(f"⚠️ project-形式の解析に失敗: {page_id}")
        
        elif page_id.isdigit():
            # メモIDからプロジェクトIDを取得
            legacy_project_id = await self.db_helper.get_memo_project_id(int(page_id), user_id)
            if legacy_project_id:
                logger.info(f"✅ memo_id:{page_id}から旧プロジェクトIDを取得: {legacy_project_id}")
            else:
                logger.info(f"🔴 memo_id:{page_id}にプロジェクト関連付けなし")
        
        elif page_id == 'conversation-agent-test':
            # 既存のテスト経路は残しつつ、基本はプロフィールコンテキストを優先
            if not profile:
                legacy_project_id = await self.db_helper.get_latest_project(user_id)
                if legacy_project_id:
                    logger.info(f"✅ 最新の旧プロジェクトIDを取得: {legacy_project_id}")
                else:
                    logger.info("🔴 利用可能な旧プロジェクトが見つかりませんでした")
        
        elif page_id == '' or page_id is None:
            # page_idが空またはNoneの場合、プロフィールコンテキストのみで続行
            logger.info("ℹ️ page_idが空です。プロフィールコンテキストを優先します。")
        else:
            logger.info(f"🔴 page_id形式が未対応: {page_id}")
        
        # 旧プロジェクト情報は必要な場合のみ追記
        if legacy_project_id:
            legacy_project = await self.db_helper.get_project_info(legacy_project_id, user_id)
            if legacy_project:
                theme_short = (legacy_project.get('theme') or '')[:30]
                question_short = (legacy_project.get('question') or 'NA')[:25]
                hypothesis_short = (legacy_project.get('hypothesis') or 'NA')[:25]
                legacy_context = f"[テーマ:{theme_short}|問い:{question_short}|仮説:{hypothesis_short}]"
                student_context_parts.append(f"旧プロジェクト情報:\n{legacy_context}")
                logger.info(f"✅ 旧プロジェクト情報を軽量フォーマットで取得成功: {legacy_project.get('theme')}")
            else:
                logger.warning(f"⚠️ 旧プロジェクトが見つからない: project_id={legacy_project_id}")

        if student_context_parts:
            student_context = "\n".join(student_context_parts)

        context_payload["legacy_project"] = legacy_project
        return legacy_project_id, student_context, context_payload


async def parallel_fetch_context_and_history(
    db_helper: AsyncDatabaseHelper,
    context_builder: AsyncProjectContextBuilder,
    page_id: str,
    conversation_id: str,
    user_id: UserID,
    history_limit: int = None
) -> Tuple[Optional[int], Optional[str], Optional[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    学習コンテキストと対話履歴を並列で取得

    Args:
        db_helper: データベースヘルパー
        context_builder: コンテキストビルダー
        page_id: ページID
        conversation_id: 会話ID
        user_id: ユーザーID
        history_limit: 履歴取得数の上限（Noneの場合は環境変数から取得、デフォルト20件）

    Returns:
        (legacy_project_id, student_context, context_payload, conversation_history) のタプル
    """
    if history_limit is None:
        history_limit = DEFAULT_HISTORY_LIMIT
    start_time = time.time()
    try:
        # プロジェクトコンテキスト構築と履歴取得を並列実行
        context_task = context_builder.build_context_from_page_id(page_id, user_id)
        history_task = db_helper.get_conversation_history(conversation_id, history_limit)
        
        # 両方のタスクを並列実行
        (legacy_project_id, student_context, context_payload), conversation_history = await asyncio.gather(
            context_task,
            history_task
        )
        
        total_time = time.time() - start_time
        logger.info(f"🔷 DB Parallel Fetch [context+history]: 応答秒={total_time:.3f}s, 履歴件数={len(conversation_history)}")
        
        return legacy_project_id, student_context, context_payload, conversation_history
        
    except Exception as e:
        logger.error(f"並列データ取得エラー: {e}")
        # エラー時は個別に取得を試みる
        legacy_project_id, student_context, context_payload = await context_builder.build_context_from_page_id(page_id, user_id)
        conversation_history = await db_helper.get_conversation_history(conversation_id, history_limit)
        return legacy_project_id, student_context, context_payload, conversation_history


async def parallel_save_chat_logs(
    db_helper: AsyncDatabaseHelper,
    user_message_data: Dict[str, Any],
    ai_message_data: Dict[str, Any]
) -> Tuple[Optional[str], Optional[str]]:
    """
    ユーザーメッセージとAIメッセージを並列で保存
    
    Args:
        db_helper: データベースヘルパー
        user_message_data: ユーザーメッセージのデータ
        ai_message_data: AIメッセージのデータ
        
    Returns:
        (user_chat_log_id, ai_chat_log_id) のタプル。保存失敗時は None。
    """
    start_time = time.time()
    try:
        user_task = db_helper.save_chat_log(**user_message_data)
        ai_task = db_helper.save_chat_log(**ai_message_data)
        
        # 両方のログを並列で保存
        results = await asyncio.gather(user_task, ai_task, return_exceptions=True)
        
        user_success = results[0] if not isinstance(results[0], Exception) else None
        ai_success = results[1] if not isinstance(results[1], Exception) else None
        
        total_time = time.time() - start_time
        logger.info(f"🔷 DB Parallel Save [chat_logs]: 応答秒={total_time:.3f}s, user_saved={user_success}, ai_saved={ai_success}")
        
        return user_success, ai_success
        
    except Exception as e:
        logger.error(f"並列ログ保存エラー: {e}")
        return False, False


# レート制限用のセマフォ（OpenAI API同時呼び出し数制限）
OPENAI_SEMAPHORE = asyncio.Semaphore(10)  # 最大10並列まで

async def rate_limited_openai_call(func, *args, **kwargs):
    """
    レート制限付きOpenAI API呼び出しラッパー
    
    Args:
        func: 呼び出す関数
        *args, **kwargs: 関数の引数
        
    Returns:
        関数の実行結果
    """
    async with OPENAI_SEMAPHORE:
        return await asyncio.to_thread(func, *args, **kwargs)
