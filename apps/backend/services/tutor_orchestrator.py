"""ITS tutor strategy orchestration for chat responses.

This module keeps student-facing chat responses unchanged while producing
internal tutoring metadata for logging and prompt steering.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
import json
import re
from typing import Any, Awaitable, Callable, Dict, List, Optional, Sequence

from .its_models import ITSContext


ITS_POLICY_VERSION = "its-mvp-2026-05-24"


@dataclass
class TutorDecision:
    support_type: str
    speech_acts: List[str]
    response_style: str
    disclosure_level: int
    question_budget: int
    action_pressure: int
    intervention_reason_codes: List[str]
    decision_source: str
    confidence: float
    rule_flags: List[str] = field(default_factory=list)
    llm_used: bool = False
    llm_error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class EducationalValidation:
    question_count: int
    question_budget: int
    question_budget_ok: bool
    action_pressure_ok: bool
    disclosure_level_ok: bool
    issues: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


LLMDecisionCallable = Callable[[str], Awaitable[Dict[str, Any]]]


class TutorOrchestrator:
    """Selects tutoring strategy with fast rules and optional LLM judgement."""

    COMPLAINT_PATTERNS = [
        "質問ばっかり",
        "質問ばかり",
        "だるい",
        "しんどい",
        "疲れた",
        "めんどくさい",
        "面倒",
        "もういい",
        "わからん",
    ]
    DELEGATION_PATTERNS = [
        "全部考えて",
        "全部やって",
        "代わりに",
        "答えを教えて",
        "答え教えて",
        "そのまま書いて",
        "丸投げ",
        "完成させて",
    ]
    PRIVACY_SAFETY_PATTERNS = [
        "個人情報",
        "住所",
        "電話番号",
        "本名",
        "無断撮影",
        "録音",
        "家庭環境",
        "収入",
        "病気",
        "体重",
        "差別",
    ]
    BROAD_OR_STUCK_PATTERNS = [
        "広すぎ",
        "決められない",
        "何をすれば",
        "なにをすれば",
        "どうすれば",
        "わからない",
        "分からない",
        "テーマ",
        "問い",
    ]
    RESEARCH_PATTERNS = [
        "調べ",
        "アンケート",
        "インタビュー",
        "観察",
        "データ",
        "資料",
        "実験",
    ]
    AMBIGUOUS_PATTERNS = [
        "なんか",
        "微妙",
        "もやもや",
        "違和感",
        "うーん",
        "迷",
        "よくわからない",
    ]

    def __init__(
        self,
        *,
        llm_decision_func: Optional[LLMDecisionCallable] = None,
        enable_llm: bool = True,
    ):
        self.llm_decision_func = llm_decision_func
        self.enable_llm = enable_llm

    async def select_strategy(
        self,
        *,
        message: str,
        conversation_history: Sequence[Dict[str, Any]],
        student_context: str = "",
        aggregate_profile: Optional[Dict[str, Any]] = None,
        response_style: Optional[str] = None,
        its_context: Optional[ITSContext] = None,
    ) -> TutorDecision:
        rule_decision = self._select_by_rules(message, conversation_history, response_style, its_context)

        if not self._should_use_llm(message, rule_decision):
            return rule_decision

        if not self.enable_llm or not self.llm_decision_func:
            return rule_decision

        try:
            llm_payload = await self.llm_decision_func(
                self._build_llm_prompt(
                    message=message,
                    conversation_history=conversation_history,
                    student_context=student_context,
                    aggregate_profile=aggregate_profile,
                    rule_decision=rule_decision,
                    its_context=its_context,
                )
            )
            return self._merge_llm_decision(rule_decision, llm_payload)
        except Exception as exc:
            rule_decision.llm_error = str(exc)
            return rule_decision

    def build_strategy_prompt(self, decision: TutorDecision) -> str:
        """Prompt fragment for the response generator. Not returned to clients."""
        acts = "、".join(decision.speech_acts)
        reasons = "、".join(decision.intervention_reason_codes)
        return f"""【今回のITS支援方略】
- 支援タイプ: {decision.support_type}
- 発話アクト: {acts}
- 応答スタイル: {decision.response_style}
- 開示レベル: {decision.disclosure_level}（0=反映のみ、5=完成案に近い）
- 質問予算: 実質的な質問は最大{decision.question_budget}個
- 行動促進の強さ: {decision.action_pressure}（0=促さない、3=手順化）
- 介入理由: {reasons}

この方略は内部制御用です。生徒には分類名やレベル名を見せず、自然な返答にしてください。
"""

    def validate_response(self, response_text: str, decision: TutorDecision) -> EducationalValidation:
        question_count = self._count_questions(response_text)
        issues: List[str] = []

        if question_count > decision.question_budget:
            issues.append("question_budget_exceeded")

        action_pressure_ok = True
        if decision.action_pressure <= 1 and re.search(r"(必ず|今すぐ|次に.*してください|やりましょう)", response_text):
            action_pressure_ok = False
            issues.append("action_pressure_too_strong")

        disclosure_level_ok = True
        if decision.disclosure_level <= 2 and re.search(r"(完成版|そのまま使える|答えは|結論は)", response_text):
            disclosure_level_ok = False
            issues.append("disclosure_too_high")

        return EducationalValidation(
            question_count=question_count,
            question_budget=decision.question_budget,
            question_budget_ok=question_count <= decision.question_budget,
            action_pressure_ok=action_pressure_ok,
            disclosure_level_ok=disclosure_level_ok,
            issues=issues,
        )

    def _select_by_rules(
        self,
        message: str,
        conversation_history: Sequence[Dict[str, Any]],
        response_style: Optional[str],
        its_context: Optional[ITSContext] = None,
    ) -> TutorDecision:
        normalized = message.lower()
        flags: List[str] = []
        preferred_support_types = (
            its_context.teaching_model.preferred_support_types
            if its_context
            else []
        )
        inferred_phase = its_context.task_model.phase if its_context else "unknown"
        default_question_budget = (
            its_context.teaching_model.default_question_budget
            if its_context
            else 1
        )

        def contains_any(patterns: Sequence[str]) -> bool:
            return any(pattern.lower() in normalized for pattern in patterns)

        if contains_any(self.COMPLAINT_PATTERNS):
            flags.append("complaint_or_fatigue")
            return TutorDecision(
                support_type="感情・迷いの受け止め",
                speech_acts=["受け止める", "言い換え", "例示"],
                response_style="受け止め型",
                disclosure_level=2,
                question_budget=0,
                action_pressure=0,
                intervention_reason_codes=["不満・困り感が高い", "保留・違和感の尊重"],
                decision_source="rule",
                confidence=0.92,
                rule_flags=flags,
            )

        if contains_any(self.PRIVACY_SAFETY_PATTERNS):
            flags.append("privacy_or_safety")
            return TutorDecision(
                support_type="調査設計支援",
                speech_acts=["受け止める", "説明", "選択肢提示"],
                response_style="コーチ型",
                disclosure_level=3,
                question_budget=1,
                action_pressure=1,
                intervention_reason_codes=["安全・プライバシー懸念"],
                decision_source="rule",
                confidence=0.9,
                rule_flags=flags,
            )

        if contains_any(self.DELEGATION_PATTERNS):
            flags.append("delegation_risk")
            return TutorDecision(
                support_type="文章化支援",
                speech_acts=["受け止める", "例示", "選択肢提示"],
                response_style="研究パートナー型",
                disclosure_level=2,
                question_budget=1,
                action_pressure=1,
                intervention_reason_codes=["丸投げリスク", "例示が必要"],
                decision_source="rule",
                confidence=0.88,
                rule_flags=flags,
            )

        if contains_any(self.RESEARCH_PATTERNS):
            flags.append("research_design")
            return TutorDecision(
                support_type="調査設計支援",
                speech_acts=["言い換え", "説明", "選択肢提示"],
                response_style="研究パートナー型",
                disclosure_level=3,
                question_budget=1,
                action_pressure=2,
                intervention_reason_codes=["例示が必要"],
                decision_source="rule",
                confidence=0.72,
                rule_flags=flags,
            )

        if contains_any(self.BROAD_OR_STUCK_PATTERNS) or "問いの改善支援" in preferred_support_types:
            flags.append("broad_or_stuck")
            return TutorDecision(
                support_type="問いの改善支援",
                speech_acts=["言い換え", "選択肢提示"],
                response_style="コーチ型",
                disclosure_level=2,
                question_budget=min(1, default_question_budget),
                action_pressure=1,
                intervention_reason_codes=["問いが曖昧", "例示が必要"],
                decision_source="rule",
                confidence=0.72,
                rule_flags=flags,
            )

        if "振り返り支援" in preferred_support_types or inferred_phase == "振り返り":
            flags.append("reflection_phase")
            return TutorDecision(
                support_type="振り返り支援",
                speech_acts=["要約", "振り返り"],
                response_style="受け止め型",
                disclosure_level=1,
                question_budget=min(1, default_question_budget),
                action_pressure=0,
                intervention_reason_codes=["保留・違和感の尊重"],
                decision_source="rule",
                confidence=0.7,
                rule_flags=flags,
            )

        return TutorDecision(
            support_type=preferred_support_types[0] if preferred_support_types else "テーマ発見支援",
            speech_acts=["言い換え", "選択肢提示"],
            response_style="研究パートナー型" if response_style in (None, "auto") else str(response_style),
            disclosure_level=2,
            question_budget=min(1, default_question_budget),
            action_pressure=1,
            intervention_reason_codes=["順調に進んでいる"],
            decision_source="rule",
            confidence=0.58,
            rule_flags=flags,
        )

    def _should_use_llm(self, message: str, rule_decision: TutorDecision) -> bool:
        normalized = message.lower()
        ambiguous = any(pattern.lower() in normalized for pattern in self.AMBIGUOUS_PATTERNS)
        low_confidence = rule_decision.confidence < 0.65
        mixed_intent = sum(
            1
            for patterns in (
                self.COMPLAINT_PATTERNS,
                self.DELEGATION_PATTERNS,
                self.RESEARCH_PATTERNS,
                self.BROAD_OR_STUCK_PATTERNS,
            )
            if any(pattern.lower() in normalized for pattern in patterns)
        ) >= 2
        return ambiguous or low_confidence or mixed_intent

    def _build_llm_prompt(
        self,
        *,
        message: str,
        conversation_history: Sequence[Dict[str, Any]],
        student_context: str,
        aggregate_profile: Optional[Dict[str, Any]],
        rule_decision: TutorDecision,
        its_context: Optional[ITSContext] = None,
    ) -> str:
        history_excerpt = "\n".join(
            f"{item.get('sender', 'unknown')}: {str(item.get('message', ''))[:160]}"
            for item in list(conversation_history)[-6:]
        )
        profile_excerpt = json.dumps(aggregate_profile or {}, ensure_ascii=False)[:1200]
        model_excerpt = (
            json.dumps(its_context.model_snapshot(), ensure_ascii=False)[:1800]
            if its_context
            else "{}"
        )
        return f"""探究学習ITSの内部方略だけをJSONで判定してください。
生徒に返す本文は書かないでください。

出力JSON:
{{
  "support_type": "...",
  "speech_acts": ["..."],
  "response_style": "...",
  "disclosure_level": 0,
  "question_budget": 1,
  "action_pressure": 0,
  "intervention_reason_codes": ["..."],
  "confidence": 0.0
}}

制約:
- 生徒を固定的に評価しない
- 質問予算は原則1、負担・不満が強い場合は0
- 完成案に近い提示は避け、必要な例や選択肢で支える

ルール判定:
{json.dumps(rule_decision.to_dict(), ensure_ascii=False)}

ITS 4モデル:
{model_excerpt}

生徒コンテキスト:
{student_context[:1000]}

集約型観測プロファイル:
{profile_excerpt}

直近履歴:
{history_excerpt}

今回の生徒発話:
{message}
"""

    def _merge_llm_decision(self, rule_decision: TutorDecision, llm_payload: Dict[str, Any]) -> TutorDecision:
        if not isinstance(llm_payload, dict):
            return rule_decision

        disclosure_level = self._clamp_int(llm_payload.get("disclosure_level"), 0, 5, rule_decision.disclosure_level)
        question_budget = self._clamp_int(llm_payload.get("question_budget"), 0, 1, rule_decision.question_budget)
        action_pressure = self._clamp_int(llm_payload.get("action_pressure"), 0, 3, rule_decision.action_pressure)
        confidence = self._clamp_float(llm_payload.get("confidence"), 0.0, 1.0, rule_decision.confidence)

        speech_acts = llm_payload.get("speech_acts")
        if not isinstance(speech_acts, list) or not all(isinstance(item, str) for item in speech_acts):
            speech_acts = rule_decision.speech_acts

        reasons = llm_payload.get("intervention_reason_codes")
        if not isinstance(reasons, list) or not all(isinstance(item, str) for item in reasons):
            reasons = rule_decision.intervention_reason_codes

        return TutorDecision(
            support_type=str(llm_payload.get("support_type") or rule_decision.support_type),
            speech_acts=speech_acts[:3],
            response_style=str(llm_payload.get("response_style") or rule_decision.response_style),
            disclosure_level=disclosure_level,
            question_budget=question_budget,
            action_pressure=action_pressure,
            intervention_reason_codes=reasons[:4],
            decision_source="hybrid",
            confidence=confidence,
            rule_flags=rule_decision.rule_flags,
            llm_used=True,
        )

    def _count_questions(self, text: str) -> int:
        if not text:
            return 0
        return text.count("?") + text.count("？")

    def _clamp_int(self, value: Any, minimum: int, maximum: int, default: int) -> int:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return default
        return max(minimum, min(maximum, parsed))

    def _clamp_float(self, value: Any, minimum: float, maximum: float, default: float) -> float:
        try:
            parsed = float(value)
        except (TypeError, ValueError):
            return default
        return max(minimum, min(maximum, parsed))
