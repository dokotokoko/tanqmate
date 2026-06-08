import asyncio
import os
import sys
import unittest
from types import SimpleNamespace
from unittest.mock import patch

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers.auth_router import check_onboarding_status, complete_first_ai_tutorial


class _FakeResult:
    def __init__(self, data=None):
        self.data = data if data is not None else []


class _FakeProfilesQuery:
    def __init__(self, client):
        self.client = client
        self.operation = None
        self.columns = None
        self.payload = None

    def select(self, columns="*"):
        self.operation = "select"
        self.columns = columns
        self.client.selects.append(columns)
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = payload
        return self

    def eq(self, *args, **kwargs):
        return self

    def execute(self):
        if self.operation == "insert":
            self.client.profile = dict(self.payload)
            return _FakeResult([dict(self.client.profile)])

        if self.operation == "update":
            self.client.updates.append(dict(self.payload))
            self.client.profile.update(self.payload)
            return _FakeResult([dict(self.client.profile)])

        if not self.client.profile:
            return _FakeResult([])

        return _FakeResult([dict(self.client.profile)])


class _FakeSupabase:
    def __init__(self, profile):
        self.profile = dict(profile)
        self.updates = []
        self.selects = []

    def table(self, name):
        if name != "profiles":
            raise AssertionError(f"unexpected table: {name}")
        return _FakeProfilesQuery(self)


class TestFirstAiTutorial(unittest.TestCase):
    def _run_with_profile(self, profile, coroutine_factory):
        supabase = _FakeSupabase(profile)
        service_manager = SimpleNamespace(supabase_client=supabase)

        with patch("routers.auth_router.get_service_manager", return_value=service_manager):
            response = asyncio.run(coroutine_factory())

        return response, supabase

    def test_student_completion_updates_profile_once(self):
        profile = {
            "id": "student-1",
            "email": "student@example.com",
            "name": "Student",
            "role": "student",
            "first_ai_tutorial_completed": False,
            "first_ai_tutorial_completed_at": None,
        }

        response, supabase = self._run_with_profile(
            profile,
            lambda: complete_first_ai_tutorial(auth_user={"id": "student-1", "email": "student@example.com"}),
        )

        self.assertTrue(response["success"])
        self.assertTrue(response["profile"]["first_ai_tutorial_completed"])
        self.assertIsNotNone(response["profile"]["first_ai_tutorial_completed_at"])
        self.assertEqual(len(supabase.updates), 1)
        self.assertTrue(supabase.updates[0]["first_ai_tutorial_completed"])

    def test_student_completion_is_idempotent(self):
        profile = {
            "id": "student-1",
            "email": "student@example.com",
            "name": "Student",
            "role": "student",
            "first_ai_tutorial_completed": True,
            "first_ai_tutorial_completed_at": "2026-06-08T00:00:00+00:00",
        }

        response, supabase = self._run_with_profile(
            profile,
            lambda: complete_first_ai_tutorial(auth_user={"id": "student-1", "email": "student@example.com"}),
        )

        self.assertTrue(response["success"])
        self.assertEqual(response["message"], "First AI tutorial already completed")
        self.assertEqual(supabase.updates, [])

    def test_non_student_completion_is_noop(self):
        profile = {
            "id": "teacher-1",
            "email": "teacher@example.com",
            "name": "Teacher",
            "role": "teacher",
            "first_ai_tutorial_completed": False,
            "first_ai_tutorial_completed_at": None,
        }

        response, supabase = self._run_with_profile(
            profile,
            lambda: complete_first_ai_tutorial(auth_user={"id": "teacher-1", "email": "teacher@example.com"}),
        )

        self.assertTrue(response["success"])
        self.assertEqual(response["message"], "First AI tutorial is not required for this role")
        self.assertEqual(supabase.updates, [])

    def test_check_onboarding_returns_first_ai_tutorial_fields(self):
        profile = {
            "id": "student-1",
            "email": "student@example.com",
            "name": "Student",
            "role": "student",
            "school_id": None,
            "school_code_locked": False,
            "interests": ["宇宙"],
            "theme": None,
            "question": None,
            "hypothesis": None,
            "first_ai_tutorial_completed": False,
            "first_ai_tutorial_completed_at": None,
        }

        response, supabase = self._run_with_profile(
            profile,
            lambda: check_onboarding_status(auth_user={"id": "student-1", "email": "student@example.com"}),
        )

        self.assertFalse(response["needs_onboarding"])
        self.assertFalse(response["first_ai_tutorial_completed"])
        self.assertIsNone(response["first_ai_tutorial_completed_at"])
        self.assertIn("first_ai_tutorial_completed", response["profile"])
        self.assertTrue(
            any("first_ai_tutorial_completed" in str(columns) for columns in supabase.selects)
        )


if __name__ == "__main__":
    unittest.main()
