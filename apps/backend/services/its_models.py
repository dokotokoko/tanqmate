"""Internal ITS model structures.

These models make the four ITS components explicit:
- learner model
- teaching model
- inquiry task/domain model
- observation/evaluation model

They are internal only and are not returned through public chat or teacher APIs.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
import json
import re
from typing import Any, Dict, List, Optional, Sequence


@dataclass
class LearnerModel:
    grade_band: str = "unknown"
    school_constraints: List[str] = field(default_factory=list)
    interests: List[str] = field(default_factory=list)
    self_connection_signs: List[str] = field(default_factory=list)
    confusion_signs: List[str] = field(default_factory=list)
    support_preferences: List[str] = field(default_factory=list)
    choices_and_refusals: List[str] = field(default_factory=list)
    recent_emotion: Optional[Dict[str, Any]] = None
    observation_profile_summary: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TeachingModel:
    default_response_style: str = "auto"
    default_question_budget: int = 1
    max_disclosure_level: int = 4
    max_action_pressure: int = 3
    preferred_support_types: List[str] = field(default_factory=list)
    avoid_patterns: List[str] = field(default_factory=lambda: ["質問過多", "断定的評価", "完成案の押しつけ"])
    policy_notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class InquiryTaskModel:
    phase: str = "unknown"
    theme: Optional[str] = None
    inquiry_question: Optional[str] = None
    hypothesis: Optional[str] = None
    artifacts: List[str] = field(default_factory=list)
    current_topic: Optional[str] = None
    quality_signals: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ObservationModel:
    aggregate_summary: Optional[str] = None
    recent_observations: List[Dict[str, Any]] = field(default_factory=list)
    latest_reaction_signals: List[str] = field(default_factory=list)
    evidence_sources: List[str] = field(default_factory=list)
    caveats: List[str] = field(default_factory=lambda: ["AIの見立てであり、生徒の真実として扱わない"])

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ITSContext:
    learner_model: LearnerModel
    teaching_model: TeachingModel
    task_model: InquiryTaskModel
    observation_model: ObservationModel
    current_message: str
    conversation_excerpt: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "learner_model": self.learner_model.to_dict(),
            "teaching_model": self.teaching_model.to_dict(),
            "task_model": self.task_model.to_dict(),
            "observation_model": self.observation_model.to_dict(),
            "current_message": self.current_message,
            "conversation_excerpt": self.conversation_excerpt,
        }

    def model_snapshot(self) -> Dict[str, Any]:
        """Snapshot safe for internal metadata logs. It does not store raw chat text."""
        return {
            "learner_model": self.learner_model.to_dict(),
            "teaching_model": self.teaching_model.to_dict(),
            "task_model": self.task_model.to_dict(),
            "observation_model": self.observation_model.to_dict(),
        }

    def to_prompt_context(self) -> str:
        snapshot = self.model_snapshot()
        return (
            "ITS内部モデル（AIの支援調整用。生徒へ分類名を見せない）:\n"
            f"{json.dumps(snapshot, ensure_ascii=False)[:1800]}"
        )


def build_its_context(
    *,
    message: str,
    student_context: str,
    context_payload: Optional[Dict[str, Any]],
    conversation_history: Sequence[Dict[str, Any]],
    aggregate_profile: Optional[Dict[str, Any]],
    response_style: Optional[str],
) -> ITSContext:
    profile = (context_payload or {}).get("student_profile") or {}
    legacy_project = (context_payload or {}).get("legacy_project") or {}
    aggregate_summary = (aggregate_profile or {}).get("aggregate_summary")
    aggregate_observations = (aggregate_profile or {}).get("aggregate_observations") or []

    learner = LearnerModel(
        grade_band=_grade_band(profile.get("grade")),
        school_constraints=_school_constraints(profile),
        interests=_interests(profile, legacy_project, message),
        self_connection_signs=_self_connection_signs(message),
        confusion_signs=_confusion_signs(message),
        support_preferences=_support_preferences(message, aggregate_summary),
        choices_and_refusals=_choices_and_refusals(message),
        recent_emotion=_latest_emotion(aggregate_observations),
        observation_profile_summary=str(aggregate_summary)[:900] if aggregate_summary else None,
    )
    task = InquiryTaskModel(
        phase=_infer_phase(message, profile, legacy_project),
        theme=_first_present(profile.get("theme"), legacy_project.get("theme"), _extract_after_label(student_context, "探究テーマ")),
        inquiry_question=_first_present(profile.get("question"), legacy_project.get("question"), _extract_after_label(student_context, "問い")),
        hypothesis=_first_present(profile.get("hypothesis"), legacy_project.get("hypothesis"), _extract_after_label(student_context, "仮説")),
        artifacts=_infer_artifacts(message),
        current_topic=_short_topic(message),
        quality_signals=_quality_signals(message),
    )
    teaching = TeachingModel(
        default_response_style=response_style or "auto",
        default_question_budget=0 if learner.confusion_signs and "質問過多" in learner.support_preferences else 1,
        preferred_support_types=_preferred_support_types(task, learner),
        policy_notes=[
            "現在発話を観測プロファイルより優先する",
            "保留・拒否も主体性のサインとして扱う",
        ],
    )
    observation = ObservationModel(
        aggregate_summary=str(aggregate_summary)[:900] if aggregate_summary else None,
        recent_observations=_compact_observations(aggregate_observations),
        latest_reaction_signals=_reaction_signals(message),
        evidence_sources=_evidence_sources(conversation_history, aggregate_profile),
    )

    return ITSContext(
        learner_model=learner,
        teaching_model=teaching,
        task_model=task,
        observation_model=observation,
        current_message=message,
        conversation_excerpt=_conversation_excerpt(conversation_history),
    )


def _grade_band(grade: Any) -> str:
    if grade is None:
        return "unknown"
    text = str(grade)
    if "小" in text or text in {"1", "2", "3", "4", "5", "6"}:
        return "elementary_or_unknown"
    if "中" in text:
        return "junior_high"
    if "高" in text or text in {"7", "8", "9", "10", "11", "12"}:
        return "high_school"
    return text[:40]


def _school_constraints(profile: Dict[str, Any]) -> List[str]:
    constraints: List[str] = []
    if profile.get("school_id"):
        constraints.append("学校文脈あり")
    if profile.get("class_name"):
        constraints.append(f"クラス:{profile['class_name']}")
    return constraints


def _interests(profile: Dict[str, Any], legacy_project: Dict[str, Any], message: str) -> List[str]:
    values = [
        profile.get("theme"),
        legacy_project.get("theme"),
        _keyword_if_present(message, ["環境", "AI", "教育", "地域", "食品ロス", "プラスチック", "学校"]),
    ]
    return _dedupe([value for value in values if value])


def _self_connection_signs(message: str) -> List[str]:
    return [word for word in ("自分", "学校", "家", "地域", "友達", "好き", "困った") if word in message]


def _confusion_signs(message: str) -> List[str]:
    return [word for word in ("わからない", "分からない", "迷", "もやもや", "広すぎ", "決められない") if word in message]


def _support_preferences(message: str, aggregate_summary: Optional[str]) -> List[str]:
    prefs: List[str] = []
    if any(word in message for word in ("例", "具体", "選択肢")):
        prefs.append("例・選択肢がほしい")
    if any(word in message for word in ("質問ばっかり", "質問ばかり")):
        prefs.append("質問過多を避ける")
    if aggregate_summary and any(word in aggregate_summary for word in ("例", "選択肢")):
        prefs.append("過去観測:例・選択肢が有効そう")
    return prefs


def _choices_and_refusals(message: str) -> List[str]:
    signs = []
    if any(word in message for word in ("これにする", "選ぶ", "決めた")):
        signs.append("選択")
    if any(word in message for word in ("やめる", "違う", "保留", "いったん")):
        signs.append("拒否・保留")
    return signs


def _latest_emotion(observations: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    for observation in observations:
        signals = observation.get("signals")
        if signals:
            return signals
    return None


def _infer_phase(message: str, profile: Dict[str, Any], legacy_project: Dict[str, Any]) -> str:
    explicit = profile.get("progress_stage") or legacy_project.get("progress_stage")
    if explicit:
        return str(explicit)
    phase_keywords = [
        ("テーマ探索", ["テーマ", "興味", "好き"]),
        ("問いづくり", ["問い", "疑問", "広すぎ"]),
        ("仮説づくり", ["仮説", "予想"]),
        ("調査設計", ["調査", "アンケート", "インタビュー", "観察", "実験"]),
        ("分析", ["分析", "結果", "データ"]),
        ("発表・表現", ["発表", "スライド", "ポスター", "レポート"]),
        ("振り返り", ["振り返", "日誌"]),
    ]
    for phase, keywords in phase_keywords:
        if any(keyword in message for keyword in keywords):
            return phase
    return "unknown"


def _infer_artifacts(message: str) -> List[str]:
    artifacts = []
    for artifact in ("レポート", "スライド", "ポスター", "アンケート", "インタビュー項目", "発表原稿"):
        if artifact in message:
            artifacts.append(artifact)
    return artifacts


def _quality_signals(message: str) -> List[str]:
    signals = []
    if any(word in message for word in ("根拠", "理由", "データ")):
        signals.append("根拠への関心")
    if any(word in message for word in ("広すぎ", "ぼんやり", "曖昧")):
        signals.append("問いの具体化が必要")
    return signals


def _preferred_support_types(task: InquiryTaskModel, learner: LearnerModel) -> List[str]:
    mapping = {
        "テーマ探索": "テーマ発見支援",
        "問いづくり": "問いの改善支援",
        "仮説づくり": "仮説づくり支援",
        "調査設計": "調査設計支援",
        "分析": "分析支援",
        "発表・表現": "文章化支援",
        "振り返り": "振り返り支援",
    }
    preferred = []
    if learner.confusion_signs:
        preferred.append("感情・迷いの受け止め")
    if task.phase in mapping:
        preferred.append(mapping[task.phase])
    return _dedupe(preferred)


def _compact_observations(observations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    compact = []
    for observation in observations[:5]:
        compact.append(
            {
                "date": observation.get("date"),
                "ai_view_text": str(observation.get("ai_view_text") or "")[:160],
                "suggested_tags": observation.get("suggested_tags") or [],
                "signals": observation.get("signals") or {},
            }
        )
    return compact


def _reaction_signals(message: str) -> List[str]:
    return [word for word in ("だるい", "質問ばっかり", "もっと例", "わかりやすい", "いったん考えたい") if word in message]


def _evidence_sources(conversation_history: Sequence[Dict[str, Any]], aggregate_profile: Optional[Dict[str, Any]]) -> List[str]:
    sources = []
    if conversation_history:
        sources.append("recent_chat_history")
    if aggregate_profile:
        sources.append("aggregate_observation_profile")
    return sources


def _conversation_excerpt(conversation_history: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    excerpt = []
    for row in list(conversation_history)[-4:]:
        excerpt.append(
            {
                "sender": row.get("sender"),
                "has_message": bool(row.get("message")),
                "created_at": row.get("created_at"),
            }
        )
    return excerpt


def _extract_after_label(text: str, label: str) -> Optional[str]:
    match = re.search(rf"{re.escape(label)}[:：]([^\n]+)", text or "")
    if not match:
        return None
    return match.group(1).strip()[:120]


def _keyword_if_present(text: str, keywords: Sequence[str]) -> Optional[str]:
    for keyword in keywords:
        if keyword in text:
            return keyword
    return None


def _short_topic(message: str) -> Optional[str]:
    stripped = (message or "").strip()
    return stripped[:80] if stripped else None


def _first_present(*values: Any) -> Optional[str]:
    for value in values:
        if value:
            return str(value)
    return None


def _dedupe(values: Sequence[str]) -> List[str]:
    result: List[str] = []
    for value in values:
        text = str(value).strip()
        if text and text not in result:
            result.append(text)
    return result
