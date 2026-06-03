import asyncio
import os
import sys
import unittest

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.its_observation_service import ITSObservationService
from services.its_models import ITSContext, build_its_context
from services.tutor_orchestrator import EducationalValidation, TutorDecision, TutorOrchestrator


class TestTutorOrchestrator(unittest.TestCase):
    def test_uses_explicit_its_models_for_strategy(self):
        orchestrator = TutorOrchestrator(enable_llm=False)
        its_context = build_its_context(
            message="問いが広すぎて決められない",
            student_context="探究テーマ:環境問題\n問い:未設定\n仮説:未設定",
            context_payload={
                "student_profile": {"grade": "高校2年", "theme": "環境問題"},
                "legacy_project": {},
            },
            conversation_history=[],
            aggregate_profile={"aggregate_summary": "例や選択肢があると考えやすそう。"},
            response_style="auto",
        )

        decision = asyncio.run(
            orchestrator.select_strategy(
                message="問いが広すぎて決められない",
                conversation_history=[],
                response_style="auto",
                its_context=its_context,
            )
        )

        self.assertIsInstance(its_context, ITSContext)
        self.assertEqual(its_context.learner_model.grade_band, "high_school")
        self.assertEqual(its_context.task_model.phase, "問いづくり")
        self.assertEqual(decision.support_type, "問いの改善支援")

    def test_complaint_suppresses_questions(self):
        orchestrator = TutorOrchestrator(enable_llm=False)

        decision = asyncio.run(
            orchestrator.select_strategy(
                message="質問ばっかりでだるい",
                conversation_history=[],
            )
        )

        self.assertEqual(decision.support_type, "感情・迷いの受け止め")
        self.assertEqual(decision.question_budget, 0)
        self.assertEqual(decision.action_pressure, 0)
        self.assertIn("不満・困り感が高い", decision.intervention_reason_codes)

    def test_delegation_limits_disclosure(self):
        orchestrator = TutorOrchestrator(enable_llm=False)

        decision = asyncio.run(
            orchestrator.select_strategy(
                message="この発表原稿を全部考えて、そのまま書いて",
                conversation_history=[],
            )
        )

        self.assertLessEqual(decision.disclosure_level, 2)
        self.assertIn("丸投げリスク", decision.intervention_reason_codes)

    def test_llm_called_only_for_ambiguous_case(self):
        calls = []

        async def fake_llm(prompt):
            calls.append(prompt)
            return {
                "support_type": "問いの改善支援",
                "speech_acts": ["言い換え", "選択肢提示"],
                "response_style": "コーチ型",
                "disclosure_level": 2,
                "question_budget": 1,
                "action_pressure": 1,
                "intervention_reason_codes": ["問いが曖昧"],
                "confidence": 0.8,
            }

        orchestrator = TutorOrchestrator(llm_decision_func=fake_llm, enable_llm=True)
        clear_decision = asyncio.run(
            orchestrator.select_strategy(
                message="アンケートの作り方を相談したい",
                conversation_history=[],
            )
        )
        ambiguous_decision = asyncio.run(
            orchestrator.select_strategy(
                message="なんかテーマが微妙でもやもやする",
                conversation_history=[],
            )
        )

        self.assertEqual(clear_decision.decision_source, "rule")
        self.assertEqual(ambiguous_decision.decision_source, "hybrid")
        self.assertEqual(len(calls), 1)

    def test_validation_detects_question_budget_exceeded(self):
        orchestrator = TutorOrchestrator(enable_llm=False)
        decision = TutorDecision(
            support_type="問いの改善支援",
            speech_acts=["選択肢提示"],
            response_style="コーチ型",
            disclosure_level=2,
            question_budget=1,
            action_pressure=1,
            intervention_reason_codes=["問いが曖昧"],
            decision_source="rule",
            confidence=0.8,
        )

        validation = orchestrator.validate_response("なぜですか？どう調べますか？", decision)

        self.assertFalse(validation.question_budget_ok)
        self.assertIn("question_budget_exceeded", validation.issues)


class _FakeResult:
    def __init__(self, data=None):
        self.data = data if data is not None else []


class _FakeQuery:
    def __init__(self, table):
        self.table = table
        self.payload = None

    def select(self, *args, **kwargs):
        return self

    def eq(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    def order(self, *args, **kwargs):
        return self

    def insert(self, payload):
        self.payload = payload
        self.table.inserted.append(payload)
        return self

    def update(self, payload):
        self.payload = payload
        self.table.updated.append(payload)
        return self

    def execute(self):
        if self.payload is not None:
            return _FakeResult([self.payload])
        return _FakeResult(self.table.selected)


class _FakeTable:
    def __init__(self, selected=None):
        self.selected = selected if selected is not None else []
        self.inserted = []
        self.updated = []

    def select(self, *args, **kwargs):
        return _FakeQuery(self).select(*args, **kwargs)

    def insert(self, payload):
        return _FakeQuery(self).insert(payload)

    def update(self, payload):
        return _FakeQuery(self).update(payload)


class _FakeSupabase:
    def __init__(self):
        self.tables = {
            "user_id_mapping": _FakeTable([]),
            "its_chat_turn_logs": _FakeTable([]),
            "its_observation_records": _FakeTable([]),
            "its_observation_profiles": _FakeTable([]),
        }

    def table(self, name):
        return self.tables.setdefault(name, _FakeTable([]))


class TestITSObservationService(unittest.TestCase):
    def test_chat_turn_log_does_not_store_raw_message(self):
        supabase = _FakeSupabase()
        service = ITSObservationService(supabase, "11111111-1111-1111-1111-111111111111")
        decision = TutorDecision(
            support_type="問いの改善支援",
            speech_acts=["言い換え"],
            response_style="コーチ型",
            disclosure_level=2,
            question_budget=1,
            action_pressure=1,
            intervention_reason_codes=["問いが曖昧"],
            decision_source="rule",
            confidence=0.8,
        )
        validation = EducationalValidation(
            question_count=1,
            question_budget=1,
            question_budget_ok=True,
            action_pressure_ok=True,
            disclosure_level_ok=True,
        )

        service.record_chat_turn(
            user_id="11111111-1111-1111-1111-111111111111",
            conversation_id="22222222-2222-2222-2222-222222222222",
            user_chat_log_id="33333333-3333-3333-3333-333333333333",
            ai_chat_log_id="44444444-4444-4444-4444-444444444444",
            decision=decision,
            validation=validation,
            response_time_ms=1200,
            model_info="test-model",
        )

        payload = supabase.tables["its_chat_turn_logs"].inserted[0]
        serialized = str(payload)
        self.assertNotIn("message", payload)
        self.assertNotIn("raw", serialized.lower())
        self.assertEqual(payload["support_type"], "問いの改善支援")
        self.assertIn("learner_model", payload)
        self.assertIn("task_model", payload)

    def test_aggregate_records_uses_recent_observations(self):
        service = ITSObservationService(_FakeSupabase(), "11111111-1111-1111-1111-111111111111")

        aggregate = service._aggregate_records(
            [
                {
                    "id": "record-1",
                    "target_date": "2026-05-24",
                    "observation": {
                        "ai_view_text": "テーマを学校生活に近づけると考えやすそうに見えました。",
                        "suggested_tags": ["学校", "テーマ"],
                    },
                }
            ]
        )

        self.assertIn("学校生活", aggregate["aggregate_summary"])
        self.assertEqual(aggregate["source_record_ids"], ["record-1"])
        self.assertEqual(len(aggregate["aggregate_observations"]), 1)


if __name__ == "__main__":
    unittest.main()
