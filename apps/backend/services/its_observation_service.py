"""Persistence helpers for ITS chat logs and observation profiles."""

from __future__ import annotations

from datetime import date as DateType, datetime, timezone
import json
from typing import Any, Dict, List, Optional
from uuid import UUID, uuid4

from .base import BaseService, UserID
from .its_models import ITSContext, ObservationModel
from .tutor_orchestrator import EducationalValidation, ITS_POLICY_VERSION, TutorDecision


class ITSObservationService(BaseService):
    """Stores internal ITS metadata without changing student/teacher UI contracts."""

    def get_service_name(self) -> str:
        return "ITSObservationService"

    def get_aggregate_profile(self, user_id: UserID) -> Optional[Dict[str, Any]]:
        try:
            result = (
                self.supabase.table("its_observation_profiles")
                .select("*")
                .eq("student_user_id", user_id)
                .limit(1)
                .execute()
            )
            if result.data:
                return result.data[0]
            return None
        except Exception as exc:
            self.logger.warning("Failed to load ITS aggregate profile: %s", exc)
            return None

    def record_chat_turn(
        self,
        *,
        user_id: UserID,
        conversation_id: str,
        user_chat_log_id: Optional[str],
        ai_chat_log_id: Optional[str],
        decision: TutorDecision,
        validation: EducationalValidation,
        response_time_ms: int,
        model_info: Optional[str],
        its_context: Optional[ITSContext] = None,
        rule_result: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        model_snapshot = its_context.model_snapshot() if its_context else {}
        payload = self.attach_user_identity(
            {
                "id": str(uuid4()),
                "conversation_id": self._uuid_or_none(conversation_id),
                "user_chat_log_id": self._uuid_or_none(user_chat_log_id),
                "ai_chat_log_id": self._uuid_or_none(ai_chat_log_id),
                "support_type": decision.support_type,
                "speech_acts": decision.speech_acts,
                "response_style": decision.response_style,
                "disclosure_level": decision.disclosure_level,
                "question_budget": decision.question_budget,
                "action_pressure": decision.action_pressure,
                "intervention_reason_codes": decision.intervention_reason_codes,
                "learner_model": model_snapshot.get("learner_model", {}),
                "teaching_model": model_snapshot.get("teaching_model", {}),
                "task_model": model_snapshot.get("task_model", {}),
                "observation_model": model_snapshot.get("observation_model", {}),
                "pre_state_snapshot": model_snapshot,
                "post_state_snapshot": {
                    **model_snapshot,
                    "last_decision": decision.to_dict(),
                    "educational_validation": validation.to_dict(),
                },
                "decision_source": decision.decision_source,
                "decision_confidence": decision.confidence,
                "rule_result": rule_result or {
                    "rule_flags": decision.rule_flags,
                    "llm_error": decision.llm_error,
                },
                "llm_judgement_used": decision.llm_used,
                "educational_validation": validation.to_dict(),
                "policy_version": ITS_POLICY_VERSION,
                "model_info": model_info,
                "response_time_ms": response_time_ms,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            user_id,
            legacy_column="legacy_student_id",
            supabase_column="student_user_id",
        )

        try:
            result = self.supabase.table("its_chat_turn_logs").insert(payload).execute()
            if result.data:
                saved_id = result.data[0].get("id")
                self.logger.info(
                    "ITS chat turn log persisted: id=%s student_user_id=%s conversation_id=%s "
                    "support_type=%s decision_source=%s has_model_snapshot=%s",
                    saved_id,
                    user_id,
                    self._uuid_or_none(conversation_id),
                    decision.support_type,
                    decision.decision_source,
                    bool(model_snapshot),
                )
                return saved_id
            self.logger.info(
                "ITS chat turn log persisted: id=%s student_user_id=%s conversation_id=%s "
                "support_type=%s decision_source=%s has_model_snapshot=%s",
                payload["id"],
                user_id,
                self._uuid_or_none(conversation_id),
                decision.support_type,
                decision.decision_source,
                bool(model_snapshot),
            )
            return payload["id"]
        except Exception as exc:
            self.logger.warning("Failed to persist ITS chat turn log: %s", exc)
            return None

    def record_diary_observation(
        self,
        *,
        user_id: UserID,
        target_date: DateType,
        conversation_id: Optional[str],
        ai_draft: Dict[str, Any],
        conversations: List[Dict[str, Any]],
        previous_diary: Optional[str],
        emotion_context: Optional[Dict[str, Any]] = None,
        diary_entry_id: Optional[str] = None,
    ) -> Optional[str]:
        record_id = str(uuid4())
        observation = self._build_observation_payload(
            ai_draft=ai_draft,
            conversations=conversations,
            previous_diary=previous_diary,
            emotion_context=emotion_context or {},
        )
        payload = self.attach_user_identity(
            {
                "id": record_id,
                "diary_entry_id": self._uuid_or_none(diary_entry_id),
                "conversation_id": self._uuid_or_none(conversation_id),
                "target_date": target_date.isoformat(),
                "source_type": "diary_ai_draft",
                "ai_draft": ai_draft,
                "observation": observation,
                "referenced_context": {
                    "conversation_count": len(conversations),
                    "has_previous_diary": bool(previous_diary),
                    "has_emotion_context": bool(emotion_context),
                },
                "policy_version": ITS_POLICY_VERSION,
                "model_info": ai_draft.get("model_info") or ai_draft.get("model"),
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            user_id,
            legacy_column="legacy_student_id",
            supabase_column="student_user_id",
        )

        try:
            self.supabase.table("its_observation_records").insert(payload).execute()
            profile_id = self.refresh_aggregate_profile(user_id=user_id)
            self.logger.info(
                "ITS diary observation persisted: record_id=%s student_user_id=%s target_date=%s "
                "conversation_id=%s profile_id=%s conversation_count=%s has_previous_diary=%s",
                record_id,
                user_id,
                target_date.isoformat(),
                self._uuid_or_none(conversation_id),
                profile_id,
                len(conversations),
                bool(previous_diary),
            )
            return record_id
        except Exception as exc:
            self.logger.warning("Failed to persist ITS diary observation: %s", exc)
            return None

    def refresh_aggregate_profile(self, *, user_id: UserID, limit: int = 8) -> Optional[str]:
        try:
            records_result = (
                self.supabase.table("its_observation_records")
                .select("id, target_date, observation, created_at")
                .eq("student_user_id", user_id)
                .order("target_date", desc=True)
                .limit(limit)
                .execute()
            )
            records = records_result.data or []
            aggregate = self._aggregate_records(records)

            existing = self.get_aggregate_profile(user_id)
            payload = self.attach_user_identity(
                {
                    "aggregate_summary": aggregate["aggregate_summary"],
                    "aggregate_observations": aggregate["aggregate_observations"],
                    "source_record_ids": aggregate["source_record_ids"],
                    "policy_version": ITS_POLICY_VERSION,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                user_id,
                legacy_column="legacy_student_id",
                supabase_column="student_user_id",
            )

            if existing:
                result = (
                    self.supabase.table("its_observation_profiles")
                    .update(payload)
                    .eq("id", existing["id"])
                    .execute()
                )
                self.logger.info(
                    "ITS aggregate profile refreshed: id=%s student_user_id=%s source_record_count=%s mode=update",
                    existing["id"],
                    user_id,
                    len(aggregate["source_record_ids"]),
                )
                return existing["id"] if result.data is not None else None

            payload["id"] = str(uuid4())
            payload["created_at"] = datetime.now(timezone.utc).isoformat()
            result = self.supabase.table("its_observation_profiles").insert(payload).execute()
            self.logger.info(
                "ITS aggregate profile refreshed: id=%s student_user_id=%s source_record_count=%s mode=insert",
                payload["id"],
                user_id,
                len(aggregate["source_record_ids"]),
            )
            if result.data:
                return result.data[0].get("id")
            return payload["id"]
        except Exception as exc:
            self.logger.warning("Failed to refresh ITS aggregate profile: %s", exc)
            return None

    def _build_observation_payload(
        self,
        *,
        ai_draft: Dict[str, Any],
        conversations: List[Dict[str, Any]],
        previous_diary: Optional[str],
        emotion_context: Dict[str, Any],
    ) -> Dict[str, Any]:
        draft_body = ai_draft.get("ai_diary_draft") or ai_draft.get("draft_body") or ""
        return {
            "ai_view_text": draft_body,
            "quote": ai_draft.get("quote") or "",
            "reflection_question": ai_draft.get("reflection_question") or ai_draft.get("closing_question") or "",
            "shared_summary_draft": ai_draft.get("shared_summary_draft") or "",
            "suggested_tags": ai_draft.get("suggested_tags") or [],
            "turning_point_detected": bool(ai_draft.get("turning_point_detected")),
            "turning_point_note": ai_draft.get("turning_point_note") or "",
            "emotion_context": emotion_context,
            "signals": self._derive_observation_signals(draft_body, conversations, previous_diary),
        }

    def _derive_observation_signals(
        self,
        draft_body: str,
        conversations: List[Dict[str, Any]],
        previous_diary: Optional[str],
    ) -> Dict[str, Any]:
        user_messages = [
            str(row.get("message", ""))
            for row in conversations
            if row.get("sender") in ("user", "student")
        ]
        joined_user_text = "\n".join(user_messages)
        return {
            "conversation_user_turns": len(user_messages),
            "mentions_confusion": any(word in joined_user_text for word in ("わからない", "分からない", "迷", "もやもや")),
            "mentions_interest": any(word in joined_user_text for word in ("面白", "気になる", "興味", "好き")),
            "has_previous_diary": bool(previous_diary),
            "ai_view_length": len(draft_body),
        }

    def _aggregate_records(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        source_ids: List[str] = []
        observations: List[Dict[str, Any]] = []
        summary_lines: List[str] = []

        for record in records:
            source_ids.append(record.get("id"))
            observation = record.get("observation") or {}
            if isinstance(observation, str):
                try:
                    observation = json.loads(observation)
                except json.JSONDecodeError:
                    observation = {"ai_view_text": observation}

            compact = {
                "date": record.get("target_date"),
                "ai_view_text": (observation.get("ai_view_text") or "")[:220],
                "suggested_tags": observation.get("suggested_tags") or [],
                "turning_point_detected": bool(observation.get("turning_point_detected")),
                "signals": observation.get("signals") or {},
            }
            observations.append(compact)

            if compact["ai_view_text"]:
                summary_lines.append(f"{compact['date']}: {compact['ai_view_text'][:100]}")

        return {
            "aggregate_summary": "\n".join(summary_lines[:5]),
            "aggregate_observations": observations,
            "source_record_ids": [record_id for record_id in source_ids if record_id],
        }

    def build_observation_model(self, user_id: UserID) -> ObservationModel:
        """Build the explicit observation model from the aggregate profile."""
        profile = self.get_aggregate_profile(user_id) or {}
        return ObservationModel(
            aggregate_summary=profile.get("aggregate_summary"),
            recent_observations=profile.get("aggregate_observations") or [],
            evidence_sources=["aggregate_observation_profile"] if profile else [],
        )

    def _uuid_or_none(self, value: Optional[str]) -> Optional[str]:
        if not value or isinstance(value, bool):
            return None
        try:
            return str(UUID(str(value)))
        except (TypeError, ValueError):
            return None
