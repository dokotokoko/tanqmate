# services/diary_service.py - 日誌管理サービス

import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, date as DateType, timedelta
import json
import asyncio
from uuid import uuid4
from fastapi import HTTPException, status
from .base import BaseService, CacheableService
from module.claude_llm_api import get_claude_llm_client

class DiaryService(CacheableService):
    """日誌管理を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        self.llm_client = get_claude_llm_client()
    
    def get_service_name(self) -> str:
        return "DiaryService"
    
    async def generate_draft(
        self,
        user_id: int,
        target_date: Optional[DateType] = None,
        conversation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """AI日誌下書きを生成"""
        try:
            # 対象日付の設定
            if target_date is None:
                target_date = DateType.today()

            diary_model = os.getenv("CLAUDE_DIARY_MODEL") or getattr(self.llm_client, "model", None)
            
            self.logger.info(
                f"Generating diary draft for user_id={user_id}, date={target_date}, "
                f"conversation_id={conversation_id}, model={diary_model}"
            )
            
            # その日の会話ログを取得
            conversations = await self._get_day_conversations(user_id, target_date, conversation_id)
            
            self.logger.info(f"Found {len(conversations)} conversation logs")
            
            if not conversations:
                raise HTTPException(
                    status_code=404, 
                    detail="今日の会話ログが見つかりません"
                )
            
            # 前回の日誌を取得（繰り返し防止用）
            previous_diary = await self._get_previous_diary(user_id, target_date)
            
            # プロンプト作成
            prompt = self._create_diary_prompt(conversations, previous_diary)
            
            self.logger.info("Creating AI draft with prompt")
            
            # AIによる下書き生成（Claude LLMクライアントを使用）
            draft_text = await self.llm_client.generate_response_async(
                messages=[{"role": "user", "content": prompt}],
                system=self._get_system_prompt(),
                model=diary_model,
                temperature=0.7,
                max_tokens=1000
            )
            
            self.logger.info("AI draft generation completed")
            
            # JSONパース（マークダウンコードブロックを除去）
            if draft_text.startswith("```"):
                draft_text = draft_text.split("```")[1]
                if draft_text.startswith("json"):
                    draft_text = draft_text[4:]
            
            draft = json.loads(draft_text.strip())
            
            # 検証と型変換
            return {
                "draft_body": draft.get("draft_body", ""),
                "quote": draft.get("quote", ""),
                "quote_context": draft.get("quote_context", ""),
                "closing_question": draft.get("closing_question", ""),
                "suggested_tags": draft.get("suggested_tags", []),
                "turning_point_detected": draft.get("turning_point_detected", False),
                "turning_point_note": draft.get("turning_point_note", None)
            }
            
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse AI response: {e}")
            raise HTTPException(status_code=500, detail="AI応答のパースに失敗しました")
        except Exception as e:
            self.logger.error(f"Draft generation error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def submit_diary(
        self,
        user_id: int,
        target_date: Optional[DateType],
        published_body: str,
        published_quote: str,
        published_tags: List[str],
        emotion: Dict[str, Any],
        ai_draft: Dict[str, Any]
    ) -> Dict[str, Any]:
        """日誌を送信・保存"""
        try:
            if target_date is None:
                target_date = DateType.today()
            
            # 差分計算
            diff_added, diff_removed = self._calculate_diff(
                ai_draft.get("draft_body", ""),
                published_body
            )
            
            diary_data = {
                "student_id": user_id,
                "date": target_date.isoformat(),
                "ai_draft": ai_draft,
                "published_body": published_body,
                "published_quote": published_quote,
                "published_tags": published_tags,
                "emotion": emotion,
                "diff_added": diff_added,
                "diff_removed": diff_removed,
                "turning_point": ai_draft.get("turning_point_detected", False),
                "submitted_at": datetime.now(timezone.utc).isoformat()
            }
            
            # 既存の日誌をチェック（上書き処理）
            existing = self.supabase.table("diary_entries")\
                .select("id")\
                .eq("student_id", user_id)\
                .eq("date", target_date.isoformat())\
                .execute()
            
            if existing.data:
                # 更新
                result = self.supabase.table("diary_entries")\
                    .update(diary_data)\
                    .eq("id", existing.data[0]["id"])\
                    .execute()
            else:
                # 新規作成
                diary_data["id"] = str(uuid4())
                result = self.supabase.table("diary_entries")\
                    .insert(diary_data)\
                    .execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="日誌の保存に失敗しました")
            
            # キャッシュクリア
            self._clear_user_diary_cache(user_id)
            
            diary = result.data[0]
            diary["status"] = "submitted"
            return diary
            
        except Exception as e:
            self.logger.error(f"Submit diary error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_user_diaries(
        self,
        user_id: int,
        limit: int = 10,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """ユーザーの日誌一覧取得"""
        try:
            result = self.supabase.table("diary_entries")\
                .select("*")\
                .eq("student_id", user_id)\
                .order("date", desc=True)\
                .range(offset, offset + limit - 1)\
                .execute()
            
            diaries = []
            for diary in result.data:
                diary["status"] = "submitted" if diary.get("submitted_at") else "draft"
                diaries.append(diary)
            
            return diaries
            
        except Exception as e:
            self.logger.error(f"Get user diaries error: {e}")
            return []
    
    async def get_diary_by_date(
        self,
        user_id: int,
        target_date: DateType
    ) -> Optional[Dict[str, Any]]:
        """特定日付の日誌取得"""
        try:
            result = self.supabase.table("diary_entries")\
                .select("*")\
                .eq("student_id", user_id)\
                .eq("date", target_date.isoformat())\
                .execute()
            
            if result.data:
                diary = result.data[0]
                diary["status"] = "submitted" if diary.get("submitted_at") else "draft"
                return diary
            
            return None
            
        except Exception as e:
            self.logger.error(f"Get diary by date error: {e}")
            return None
    
    async def get_teacher_dashboard(
        self,
        teacher_id: int,
        class_id: Optional[int] = None,
        date_from: Optional[DateType] = None,
        date_to: Optional[DateType] = None,
        follow_up_only: bool = False,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """先生用ダッシュボードデータ取得"""
        try:
            # ベースクエリ
            query = self.supabase.table("diary_entries")\
                .select("*, users!student_id(name, email)")\
                .filter("submitted_at", "not.is", "null")\
                .order("submitted_at", desc=True)\
                .limit(limit)
            
            # フィルター適用
            if date_from:
                query = query.gte("date", date_from.isoformat())
            if date_to:
                query = query.lte("date", date_to.isoformat())
            
            result = query.execute()
            
            diaries = []
            for entry in result.data:
                # フォローアップフラグ判定
                follow_up_flag = None
                if entry.get("turning_point"):
                    follow_up_flag = "turning_point"
                elif entry.get("emotion", {}).get("effort_score", 5) <= 2:
                    follow_up_flag = "low_effort"
                elif "不安だった" in entry.get("emotion", {}).get("mood_tags", []):
                    follow_up_flag = "anxious"
                elif "悔しかった" in entry.get("emotion", {}).get("mood_tags", []):
                    follow_up_flag = "frustrated"
                
                if follow_up_only and not follow_up_flag:
                    continue
                
                diary_view = {
                    **entry,
                    "student_name": entry.get("users", {}).get("name", "Unknown"),
                    "student_email": entry.get("users", {}).get("email", ""),
                    "follow_up_flag": follow_up_flag
                }
                diaries.append(diary_view)
            
            return diaries
            
        except Exception as e:
            self.logger.error(f"Get teacher dashboard error: {e}")
            return []
    
    async def get_student_diaries(
        self,
        teacher_id: int,
        student_id: int,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """特定生徒の日誌履歴取得（先生用）"""
        try:
            result = self.supabase.table("diary_entries")\
                .select("*")\
                .eq("student_id", student_id)\
                .filter("submitted_at", "not.is", "null")\
                .order("date", desc=True)\
                .limit(limit)\
                .execute()
            
            diaries = []
            for diary in result.data:
                diary["status"] = "submitted"
                diaries.append(diary)
            
            return diaries
            
        except Exception as e:
            self.logger.error(f"Get student diaries error: {e}")
            return []
    
    async def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """ユーザーの日誌統計取得"""
        try:
            result = self.supabase.table("diary_entries")\
                .select("*")\
                .eq("student_id", user_id)\
                .execute()
            
            total_entries = len(result.data)
            submitted_entries = sum(1 for d in result.data if d.get("submitted_at"))
            turning_points = sum(1 for d in result.data if d.get("turning_point"))
            
            effort_scores = [
                d.get("emotion", {}).get("effort_score", 0) 
                for d in result.data 
                if d.get("emotion", {}).get("effort_score")
            ]
            avg_effort = sum(effort_scores) / len(effort_scores) if effort_scores else 0
            
            return {
                "total_entries": total_entries,
                "submitted_entries": submitted_entries,
                "turning_points_count": turning_points,
                "avg_effort_score": round(avg_effort, 1),
                "submission_rate": round(submitted_entries / total_entries * 100, 1) if total_entries > 0 else 0
            }
            
        except Exception as e:
            self.logger.error(f"Get user stats error: {e}")
            return {}
    
    # プライベートメソッド
    
    async def _get_day_conversations(
        self,
        user_id: int,
        target_date: DateType,
        conversation_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """指定日の会話ログ取得"""
        try:
            start_time = datetime.combine(target_date, datetime.min.time())
            end_time = start_time + timedelta(days=1)
            
            # chat_logsテーブルから会話ログを取得
            query = self.supabase.table("chat_logs")\
                .select("*")\
                .eq("user_id", user_id)\
                .gte("created_at", start_time.isoformat())\
                .lt("created_at", end_time.isoformat())\
                .order("created_at")
            
            if conversation_id:
                query = query.eq("conversation_id", conversation_id)
            
            result = query.execute()
            return result.data
            
        except Exception as e:
            self.logger.error(f"Get day conversations error: {e}")
            return []
    
    async def _get_previous_diary(
        self,
        user_id: int,
        before_date: DateType
    ) -> Optional[str]:
        """前回の日誌取得"""
        try:
            result = self.supabase.table("diary_entries")\
                .select("published_body")\
                .eq("student_id", user_id)\
                .lt("date", before_date.isoformat())\
                .filter("submitted_at", "not.is", "null")\
                .order("date", desc=True)\
                .limit(1)\
                .execute()
            
            if result.data:
                return result.data[0].get("published_body")
            return None
            
        except Exception as e:
            self.logger.error(f"Get previous diary error: {e}")
            return None
    
    def _create_diary_prompt(
        self,
        conversations: List[Dict[str, Any]],
        previous_diary: Optional[str]
    ) -> str:
        """日誌生成用プロンプト作成"""
        # 会話ログを整形（chat_logsテーブルの形式に合わせる）
        conversation_text = ""
        for log in conversations:
            # chat_logsテーブルのデータ形式:
            # sender: 'user' or 'assistant'
            # message: メッセージ内容
            sender = log.get("sender", "")
            role = "ユーザー" if sender == "user" else "AI"
            content = log.get("message", "")
            conversation_text += f"{role}: {content}\n\n"
        
        prompt = f"""
以下は今日のユーザーとの会話ログです：

{conversation_text}

"""
        
        if previous_diary:
            prompt += f"""
前回の日誌（参考用、同じ内容を繰り返さないでください）：
{previous_diary}

"""
        
        prompt += "上記の会話から、ユーザーが編集するための日誌の下書きを生成してください。"
        
        return prompt
    
    def _get_system_prompt(self) -> str:
        """システムプロンプト取得"""
        return """あなたは「探Qメイト」です。
ユーザーとの会話ログが渡されます。
その内容から、ユーザー自身が「編集・加筆」するための日誌の下書きを書いてください。

## あなたの役割
完成品ではなく、ユーザーが自分の言葉に直すための出発点を作ること。
「私はあなたの今日をこう読みました」というトーンで書く。

## 重要な方針
- 読み手はユーザー本人
- 解釈を一歩踏み込んで書く → 「そうじゃなくて、本当はこういうこと」と言いたくなる余白を意図的に作る
- 断定しない。「〜のように見えました」「〜かもしれません」

## 下書きの構成
1. 書き出し（1文）: 今日の「空気」を二人称で
2. 本文（3〜4文）: 何を考え、どこに引っかかり、何に気づいたか
3. 引用（1箇所）: ユーザー自身の言葉をログからそのまま抜粋
4. 問いかけ（1文）: 「これは合っていますか？」という確認

## 文体のルール
- 二人称（「あなたは」）、温かいが馴れ馴れしくない
- 「気づき」「成長」「素晴らしい」などの教育的ワードを避ける
- 評価的な褒め言葉を使わない

## 引用の選び方
ユーザーの発言から1つ。迷いや驚き・思考の転換が現れているもの。
AIの発言は引用しないこと。

## 出力形式
JSON形式のみ。マークダウンのコードブロックも含めず、純粋なJSONのみ返すこと。

{
  "draft_body": "（下書き本文。引用を除く、100〜150字）",
  "quote": "（ユーザー発話の原文引用）",
  "quote_context": "（引用の文脈を10字以内で）",
  "closing_question": "（ユーザーへの問いかけ1文）",
  "suggested_tags": ["タグ1", "タグ2"],
  "turning_point_detected": false,
  "turning_point_note": ""
}"""
    
    def _calculate_diff(self, original: str, edited: str) -> tuple[int, int]:
        """差分文字数を計算"""
        # 簡易的な差分計算（文字数ベース）
        original_len = len(original)
        edited_len = len(edited)
        
        # 共通部分を推定（簡易版）
        common_len = min(original_len, edited_len)
        for i in range(min(original_len, edited_len)):
            if i < len(original) and i < len(edited):
                if original[i] != edited[i]:
                    common_len = i
                    break
        
        added = max(0, edited_len - original_len)
        removed = max(0, original_len - edited_len)
        
        return added, removed
    
    def _clear_user_diary_cache(self, user_id: int):
        """ユーザー日誌キャッシュクリア"""
        cache_keys = [
            f"user_diaries_{user_id}",
            f"today_diary_{user_id}",
            f"diary_stats_{user_id}"
        ]
        for key in cache_keys:
            self.invalidate_cache(key)
