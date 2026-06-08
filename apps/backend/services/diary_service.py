# services/diary_service.py - 日誌管理サービス

import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, date as DateType, timedelta
import json
import asyncio
from uuid import uuid4
from fastapi import HTTPException, status
from .base import BaseService, CacheableService, UserID
from .its_observation_service import ITSObservationService
from module.claude_llm_api import get_claude_llm_client

class DiaryService(CacheableService):
    """日誌管理を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[UserID] = None):
        super().__init__(supabase_client, user_id)
        self.llm_client = get_claude_llm_client()
        self.its_observation_service = ITSObservationService(supabase_client, user_id)
    
    def get_service_name(self) -> str:
        return "DiaryService"

    def _apply_student_scope(self, query, user_id: UserID):
        return self.apply_user_scope(
            query,
            user_id,
            legacy_column="student_id",
            supabase_column="supabase_student_id",
        )

    def _attach_student_identity(self, payload: Dict[str, Any], user_id: UserID) -> Dict[str, Any]:
        return self.attach_user_identity(
            payload,
            user_id,
            legacy_column="student_id",
            supabase_column="supabase_student_id",
        )

    def _normalize_diary_entry(self, diary: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(diary)
        if normalized.get("supabase_student_id"):
            normalized["student_id"] = normalized["supabase_student_id"]
        elif normalized.get("student_id") is not None:
            normalized["student_id"] = str(normalized["student_id"])
        return normalized

    def _get_profile_map(self, supabase_user_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        if not supabase_user_ids:
            return {}

        try:
            result = (
                self.supabase.table("profiles")
                .select("id, name, email")
                .in_("id", supabase_user_ids)
                .execute()
            )
            return {row["id"]: row for row in (result.data or [])}
        except Exception as exc:
            self.logger.warning("Failed to load diary profile map: %s", exc)
            return {}

    def _get_single_profile(
        self,
        user_id: UserID,
        fields: str = "id, email, name, role, school_id",
    ) -> Optional[Dict[str, Any]]:
        try:
            result = (
                self.supabase.table("profiles")
                .select(fields)
                .eq("id", user_id)
                .limit(1)
                .execute()
            )
            if result.data:
                return result.data[0]
            return None
        except Exception as exc:
            self.logger.error("Get single profile error: %s", exc)
            return None

    def _assert_teacher_can_access_student(
        self,
        teacher_id: UserID,
        student_id: UserID,
    ) -> Dict[str, Any]:
        teacher_profile = self._get_single_profile(
            teacher_id,
            fields="id, email, name, role, school_id",
        )
        if not teacher_profile or teacher_profile.get("role") not in ("teacher", "admin"):
            raise HTTPException(status_code=403, detail="Teacher access is required")

        student_profile = self._get_single_profile(
            student_id,
            fields="id, email, name, role, school_id",
        )
        if not student_profile or student_profile.get("role") != "student":
            raise HTTPException(status_code=404, detail="Student not found")

        if teacher_profile.get("role") == "admin":
            return student_profile

        teacher_school_id = teacher_profile.get("school_id")
        student_school_id = student_profile.get("school_id")
        if not teacher_school_id:
            raise HTTPException(status_code=400, detail="Teacher school is not configured")
        if teacher_school_id != student_school_id:
            raise HTTPException(status_code=403, detail="Student is outside teacher school")

        return student_profile

    def _sanitize_teacher_diary_entry(self, diary: Dict[str, Any]) -> Dict[str, Any]:
        allowed_fields = {
            "id",
            "student_id",
            "date",
            "published_body",
            "published_quote",
            "published_tags",
            "shared_summary",
            "share_status",
            "shared_at",
            "emotion",
            "turning_point",
            "submitted_at",
            "status",
        }
        sanitized = {key: diary.get(key) for key in allowed_fields if key in diary}
        sanitized["published_body"] = None
        sanitized["status"] = "submitted"
        return sanitized

    def _derive_follow_up_flag(self, entry: Dict[str, Any]) -> Optional[str]:
        emotion = entry.get("emotion") or {}
        mood_tags = emotion.get("mood_tags") or []
        effort_score = emotion.get("effort_score") or 0

        if entry.get("turning_point"):
            return "turning_point"
        if isinstance(effort_score, (int, float)) and effort_score <= 2:
            return "low_effort"
        if any(tag in mood_tags for tag in ("fuan", "不安", "不安だった", "心配")):
            return "anxious"
        if any(tag in mood_tags for tag in ("ikizumari", "悔しかった", "frustrated")):
            return "frustrated"
        return None
    
    async def generate_draft(
        self,
        user_id: UserID,
        target_date: Optional[DateType] = None,
        conversation_id: Optional[str] = None,
        emotion_context: Optional[Dict[str, Any]] = None
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
            
            # 直近の日誌を取得（同日2回目以降の繰り返し防止用）
            previous_diary = await self._get_previous_diary(user_id, target_date)
            aggregate_profile = self.its_observation_service.get_aggregate_profile(user_id)
            
            # プロンプト作成
            prompt = self._create_diary_prompt(
                conversations,
                previous_diary,
                emotion_context or {},
                aggregate_profile=aggregate_profile,
            )
            
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
            ai_diary_draft = draft.get("ai_diary_draft") or draft.get("draft_body", "")
            reflection_question = draft.get("reflection_question") or draft.get("closing_question", "")
            shared_summary_draft = draft.get("shared_summary_draft") or self._fallback_shared_summary(ai_diary_draft)
            
            # 検証と型変換
            result = {
                "draft_body": ai_diary_draft,
                "quote": draft.get("quote", ""),
                "quote_context": draft.get("quote_context", ""),
                "closing_question": reflection_question,
                "suggested_tags": draft.get("suggested_tags", []),
                "turning_point_detected": draft.get("turning_point_detected", False),
                "turning_point_note": draft.get("turning_point_note", None),
                "ai_diary_draft": ai_diary_draft,
                "shared_summary_draft": shared_summary_draft,
                "reflection_question": reflection_question
            }
            observation_record_id = self.its_observation_service.record_diary_observation(
                user_id=user_id,
                target_date=target_date,
                conversation_id=conversation_id,
                ai_draft={**result, "model_info": diary_model},
                conversations=conversations,
                previous_diary=previous_diary,
                emotion_context=emotion_context or {},
            )
            self.logger.info(
                "ITS diary observation hook completed: user_id=%s date=%s conversation_id=%s "
                "observation_record_id=%s draft_model=%s",
                user_id,
                target_date.isoformat(),
                conversation_id,
                observation_record_id,
                diary_model,
            )
            return result
            
        except json.JSONDecodeError as e:
            self.logger.error(f"Failed to parse AI response: {e}")
            raise HTTPException(status_code=500, detail="AI応答のパースに失敗しました")
        except Exception as e:
            self.logger.error(f"Draft generation error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def submit_diary(
        self,
        user_id: UserID,
        target_date: Optional[DateType],
        published_body: str,
        published_quote: str,
        published_tags: List[str],
        emotion: Dict[str, Any],
        ai_draft: Dict[str, Any],
        shared_summary: Optional[str] = None,
        student_note: Optional[str] = None
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
            
            diary_data = self._attach_student_identity({
                "date": target_date.isoformat(),
                "ai_draft": ai_draft,
                "published_body": published_body,
                "published_quote": published_quote,
                "published_tags": published_tags,
                "student_note": student_note,
                "shared_summary": shared_summary or self._fallback_shared_summary(published_body),
                "share_status": "shared",
                "shared_at": datetime.now(timezone.utc).isoformat(),
                "emotion": emotion,
                "diff_added": diff_added,
                "diff_removed": diff_removed,
                "turning_point": ai_draft.get("turning_point_detected", False),
                "submitted_at": datetime.now(timezone.utc).isoformat()
            }, user_id)
            
            diary_data["id"] = str(uuid4())
            result = self.supabase.table("diary_entries")\
                .insert(diary_data)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="日誌の保存に失敗しました")
            
            # キャッシュクリア
            self._clear_user_diary_cache(user_id)
            
            diary = self._normalize_diary_entry(result.data[0])
            diary["status"] = "submitted"
            return diary
            
        except Exception as e:
            self.logger.error(f"Submit diary error: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_user_diaries(
        self,
        user_id: UserID,
        limit: int = 10,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """ユーザーの日誌一覧取得"""
        try:
            result = self._apply_student_scope(
                self.supabase.table("diary_entries")\
                .select("*")\
                .order("submitted_at", desc=True)\
                .order("created_at", desc=True)\
                .range(offset, offset + limit - 1),
                user_id
            ).execute()
            
            diaries = []
            for diary in result.data:
                diary = self._normalize_diary_entry(diary)
                diary["status"] = "submitted" if diary.get("submitted_at") else "draft"
                diaries.append(diary)
            
            return diaries
            
        except Exception as e:
            self.logger.error(f"Get user diaries error: {e}")
            return []
    
    async def get_diary_by_date(
        self,
        user_id: UserID,
        target_date: DateType
    ) -> Optional[Dict[str, Any]]:
        """特定日付の日誌取得"""
        try:
            result = self._apply_student_scope(
                self.supabase.table("diary_entries")\
                .select("*")\
                .eq("date", target_date.isoformat()),
                user_id
            ).order("submitted_at", desc=True).order("created_at", desc=True).limit(1).execute()
            
            if result.data:
                diary = self._normalize_diary_entry(result.data[0])
                diary["status"] = "submitted" if diary.get("submitted_at") else "draft"
                return diary
            
            return None
            
        except Exception as e:
            self.logger.error(f"Get diary by date error: {e}")
            return None
    
    async def get_teacher_dashboard(
        self,
        teacher_id: UserID,
        class_name: Optional[str] = None,
        date_from: Optional[DateType] = None,
        date_to: Optional[DateType] = None,
        follow_up_only: bool = False,
        include_inactive: bool = True,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """先生用ダッシュボードデータ取得"""
        try:
            teacher_profile = self._get_single_profile(teacher_id)
            if not teacher_profile or teacher_profile.get("role") not in ("teacher", "admin"):
                raise HTTPException(status_code=403, detail="Teacher access is required")

            school_id = teacher_profile.get("school_id")
            if not school_id:
                raise HTTPException(status_code=400, detail="Teacher school is not configured")

            student_query = (
                self.supabase.table("profiles")
                .select("id, email, name, grade, class_name, attendance_number, legacy_user_id")
                .eq("role", "student")
                .eq("school_id", school_id)
                .order("class_name")
                .order("attendance_number")
            )
            if class_name:
                student_query = student_query.eq("class_name", class_name)

            student_result = student_query.execute()
            students = student_result.data or []
            if not students:
                return []

            student_map = {student["id"]: student for student in students}
            legacy_map = {
                str(student["legacy_user_id"]): student["id"]
                for student in students
                if student.get("legacy_user_id") is not None
            }

            diary_entries: List[Dict[str, Any]] = []
            seen_diary_ids = set()

            def _append_entries(rows: List[Dict[str, Any]]):
                for raw_entry in rows:
                    diary_id = raw_entry.get("id")
                    if diary_id in seen_diary_ids:
                        continue
                    seen_diary_ids.add(diary_id)
                    entry = self._normalize_diary_entry(raw_entry)
                    resolved_student_id = entry.get("supabase_student_id")
                    if not resolved_student_id and entry.get("student_id") is not None:
                        resolved_student_id = legacy_map.get(str(entry["student_id"]))
                    if not resolved_student_id or resolved_student_id not in student_map:
                        continue
                    if raw_entry.get("share_status") not in (None, "shared") and not raw_entry.get("shared_at"):
                        continue
                    if raw_entry.get("share_status") is None and not raw_entry.get("shared_at") and not raw_entry.get("shared_summary"):
                        continue
                    entry["student_id"] = resolved_student_id
                    diary_entries.append(entry)

            supabase_student_ids = list(student_map.keys())
            supabase_query = (
                self.supabase.table("diary_entries")
                .select("*")
                .in_("supabase_student_id", supabase_student_ids)
                .filter("submitted_at", "not.is", "null")
                .order("submitted_at", desc=True)
            )
            if date_from:
                supabase_query = supabase_query.gte("date", date_from.isoformat())
            if date_to:
                supabase_query = supabase_query.lte("date", date_to.isoformat())
            supabase_result = supabase_query.execute()
            _append_entries(supabase_result.data or [])

            legacy_student_ids = [student["legacy_user_id"] for student in students if student.get("legacy_user_id") is not None]
            if legacy_student_ids:
                legacy_query = (
                    self.supabase.table("diary_entries")
                    .select("*")
                    .in_("student_id", legacy_student_ids)
                    .filter("submitted_at", "not.is", "null")
                    .order("submitted_at", desc=True)
                )
                if date_from:
                    legacy_query = legacy_query.gte("date", date_from.isoformat())
                if date_to:
                    legacy_query = legacy_query.lte("date", date_to.isoformat())
                legacy_result = legacy_query.execute()
                _append_entries(legacy_result.data or [])

            latest_by_student: Dict[str, Dict[str, Any]] = {}
            entry_counts: Dict[str, int] = {}
            for entry in diary_entries:
                student_id = entry["student_id"]
                entry_counts[student_id] = entry_counts.get(student_id, 0) + 1
                if student_id not in latest_by_student:
                    latest_by_student[student_id] = entry

            student_views: List[Dict[str, Any]] = []
            for student in students:
                student_id = student["id"]
                latest_entry = latest_by_student.get(student_id)
                follow_up_flag = self._derive_follow_up_flag(latest_entry or {}) if latest_entry else None

                if follow_up_only and not follow_up_flag:
                    continue
                if not include_inactive and not latest_entry:
                    continue

                student_views.append(
                    {
                        "id": latest_entry.get("id") if latest_entry else f"student-{student_id}",
                        "student_id": student_id,
                        "student_name": student.get("name") or "氏名未設定",
                        "student_email": student.get("email") or "",
                        "grade": student.get("grade"),
                        "class_name": student.get("class_name"),
                        "attendance_number": student.get("attendance_number"),
                        "date": latest_entry.get("date") if latest_entry else None,
                        "published_body": None,
                        "shared_summary": latest_entry.get("shared_summary") if latest_entry else None,
                        "published_quote": latest_entry.get("published_quote") if latest_entry else None,
                        "published_tags": latest_entry.get("published_tags", []) if latest_entry else [],
                        "emotion": latest_entry.get("emotion") if latest_entry else None,
                        "turning_point": bool(latest_entry.get("turning_point")) if latest_entry else False,
                        "submitted_at": latest_entry.get("submitted_at") if latest_entry else None,
                        "share_status": latest_entry.get("share_status") if latest_entry else None,
                        "shared_at": latest_entry.get("shared_at") if latest_entry else None,
                        "follow_up_flag": follow_up_flag,
                        "entry_count": entry_counts.get(student_id, 0),
                        "has_submission": latest_entry is not None,
                    }
                )

            def _submitted_timestamp(submitted_at: Optional[str]) -> float:
                if not submitted_at:
                    return 0.0
                try:
                    return datetime.fromisoformat(submitted_at.replace("Z", "+00:00")).timestamp()
                except ValueError:
                    return 0.0

            def _sort_key(item: Dict[str, Any]):
                attendance_number = item.get("attendance_number") or 9999
                class_value = item.get("class_name") or ""
                return (
                    0 if item.get("follow_up_flag") else 1,
                    0 if item.get("has_submission") else 1,
                    -_submitted_timestamp(item.get("submitted_at")),
                    class_value,
                    attendance_number,
                )

            student_views.sort(key=_sort_key)
            return student_views[:limit]
        except Exception as e:
            self.logger.error(f"Get teacher dashboard error: {e}")
            if isinstance(e, HTTPException):
                raise
            raise HTTPException(status_code=500, detail="Failed to load teacher dashboard")
    
    async def get_student_diaries(
        self,
        teacher_id: UserID,
        student_id: UserID,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """特定生徒の日誌履歴取得（先生用）"""
        try:
            self._assert_teacher_can_access_student(teacher_id, student_id)

            result = self._apply_student_scope(
                self.supabase.table("diary_entries")\
                .select("*")\
                .filter("submitted_at", "not.is", "null")\
                .eq("share_status", "shared")\
                .filter("shared_at", "not.is", "null")\
                .order("submitted_at", desc=True)\
                .limit(limit),
                student_id
            ).execute()
            
            diaries = []
            for diary in result.data:
                diary = self._normalize_diary_entry(diary)
                diaries.append(self._sanitize_teacher_diary_entry(diary))
            
            return diaries
            
        except Exception as e:
            self.logger.error(f"Get student diaries error: {e}")
            if isinstance(e, HTTPException):
                raise
            return []
    
    async def get_user_stats(self, user_id: UserID) -> Dict[str, Any]:
        """ユーザーの日誌統計取得"""
        try:
            result = self._apply_student_scope(
                self.supabase.table("diary_entries")\
                .select("*"),
                user_id
            ).execute()
            
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
        user_id: UserID,
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
                .gte("created_at", start_time.isoformat())\
                .lt("created_at", end_time.isoformat())
            query = self.apply_user_scope(query, user_id)
            query = query.order("created_at")
            
            if conversation_id:
                query = query.eq("conversation_id", conversation_id)
            
            result = query.execute()
            return result.data
            
        except Exception as e:
            self.logger.error(f"Get day conversations error: {e}")
            return []
    
    async def _get_previous_diary(
        self,
        user_id: UserID,
        before_date: DateType
    ) -> Optional[str]:
        """直近の日誌取得"""
        try:
            result = self._apply_student_scope(
                self.supabase.table("diary_entries")\
                .select("published_body")\
                .lte("date", before_date.isoformat())\
                .filter("submitted_at", "not.is", "null")\
                .order("submitted_at", desc=True)\
                .limit(1),
                user_id
            ).execute()
            
            if result.data:
                return result.data[0].get("published_body")
            return None
            
        except Exception as e:
            self.logger.error(f"Get previous diary error: {e}")
            return None
    
    def _create_diary_prompt(
        self,
        conversations: List[Dict[str, Any]],
        previous_diary: Optional[str],
        emotion_context: Optional[Dict[str, Any]] = None,
        aggregate_profile: Optional[Dict[str, Any]] = None,
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
        aggregate_summary = (aggregate_profile or {}).get("aggregate_summary")
        if aggregate_summary:
            prompt += f"""
AI観測プロファイル（過去のAI見立ての集約。現在の会話と生徒自身の言葉を優先し、断定に使わないでください）：
{str(aggregate_summary)[:900]}

"""
        if emotion_context:
            emotion_tags = ", ".join(emotion_context.get("emotion_tags") or [])
            primary_emotion = emotion_context.get("primary_emotion") or "未選択"
            motivation_level = emotion_context.get("motivation_level")
            student_note = emotion_context.get("student_note") or ""
            prompt += f"""
生徒がAI日誌を見る前に自分で置いた感情・感覚：
感情タグ: {emotion_tags or "未選択"}
一番近い感情: {primary_emotion}
探究の熱量: {motivation_level if motivation_level is not None else "未入力"}
生徒自身の短い記述: {student_note or "未入力"}

"""
        
        prompt += "上記の会話と生徒自身が先に置いた感情・感覚から、ユーザーが違和感や納得をもとに編集するための日誌下書きと、先生共有用のsummary案を生成してください。"
        
        return prompt
    
    def _get_system_prompt(self) -> str:
        """システムプロンプト取得"""
        return """あなたは「探Qメイト」です。
ユーザーとの会話ログが渡されます。
その内容から、ユーザー自身が「編集・加筆」するための日誌の下書きを書いてください。

## あなたの役割
完成品ではなく、ユーザーが自分の言葉に直すための出発点を作ること。
AI視点で「私はあなたの今日をこう読みました」と返し、生徒が自分の感情・感覚と照らして違和感や納得を見つけられるようにする。

## 重要な方針
- 読み手はユーザー本人
- 解釈を一歩踏み込んで書く → 「そうじゃなくて、本当はこういうこと」と言いたくなる余白を意図的に作る
- 断定しない。「〜のように見えました」「〜かもしれません」
- 行動記録だけで終わらせず、興味の揺れ、身体感覚、感情の温度と結びつける
- 生徒が先に置いた感情・感覚を正解扱いせず、AI視点の読みと重ねる
- 先生共有用summaryは、生徒の生の言葉や私的な記述を直接出さず、確認済み共有情報として安全な粒度にする

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
  "ai_diary_draft": "（AI視点の日誌下書き。引用を除く、140〜220字）",
  "draft_body": "（ai_diary_draftと同じ内容）",
  "quote": "（ユーザー発話の原文引用）",
  "quote_context": "（引用の文脈を10字以内で）",
  "reflection_question": "（AIの見立てと自分の感覚のズレを確認する問い1文）",
  "closing_question": "（reflection_questionと同じ内容）",
  "shared_summary_draft": "（先生に共有してもよい粒度のsummary案。生の私的記述を直接出さない。80〜140字）",
  "suggested_tags": ["タグ1", "タグ2"],
  "turning_point_detected": false,
  "turning_point_note": ""
}"""

    def _fallback_shared_summary(self, body: str) -> str:
        """先生共有summaryのフォールバックを生成する。"""
        text = (body or "").strip()
        if not text:
            return ""
        if len(text) <= 140:
            return text
        return text[:137] + "..."
    
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
    
    def _clear_user_diary_cache(self, user_id: UserID):
        """ユーザー日誌キャッシュクリア"""
        cache_keys = [
            f"user_diaries_{user_id}",
            f"today_diary_{user_id}",
            f"diary_stats_{user_id}"
        ]
        for key in cache_keys:
            self.invalidate_cache(key)
