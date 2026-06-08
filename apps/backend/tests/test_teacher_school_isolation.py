import asyncio
import logging
import os
import sys
import unittest

from fastapi import HTTPException

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.diary_service import DiaryService


class _FakeResult:
    def __init__(self, data=None):
        self.data = data if data is not None else []


class _FakeQuery:
    def __init__(self, table):
        self.table = table
        self.filters = []
        self.limit_value = None
        self.order_column = None
        self.order_desc = False

    def select(self, *args, **kwargs):
        return self

    def eq(self, column, value):
        self.filters.append(("eq", column, value))
        return self

    def in_(self, column, values):
        self.filters.append(("in", column, list(values)))
        return self

    def filter(self, column, operator, value):
        self.filters.append(("filter", column, operator, value))
        return self

    def order(self, column, desc=False):
        self.order_column = column
        self.order_desc = desc
        return self

    def limit(self, value):
        self.limit_value = value
        return self

    def execute(self):
        rows = list(self.table.rows)
        for item in self.filters:
            if item[0] == "eq":
                _, column, value = item
                rows = [row for row in rows if row.get(column) == value]
            elif item[0] == "in":
                _, column, values = item
                rows = [row for row in rows if row.get(column) in values]
            elif item[0] == "filter":
                _, column, operator, value = item
                if operator == "not.is" and value == "null":
                    rows = [row for row in rows if row.get(column) is not None]

        if self.order_column:
            rows.sort(key=lambda row: row.get(self.order_column) or "", reverse=self.order_desc)
        if self.limit_value is not None:
            rows = rows[: self.limit_value]
        return _FakeResult(rows)


class _FakeTable:
    def __init__(self, rows=None):
        self.rows = rows if rows is not None else []

    def select(self, *args, **kwargs):
        return _FakeQuery(self).select(*args, **kwargs)


class _FakeSupabase:
    def __init__(self, rows_by_table):
        self.rows_by_table = rows_by_table

    def table(self, name):
        return _FakeTable(self.rows_by_table.setdefault(name, []))


def _build_service(rows_by_table):
    service = object.__new__(DiaryService)
    service.supabase = _FakeSupabase(rows_by_table)
    service.logger = logging.getLogger("test-diary-service")
    service._cache = {}
    return service


class TeacherSchoolIsolationTests(unittest.TestCase):
    def setUp(self):
        self.rows_by_table = {
            "user_id_mapping": [],
            "profiles": [
                {
                    "id": "teacher-a",
                    "email": "teacher-a@example.com",
                    "name": "先生A",
                    "role": "teacher",
                    "school_id": "school-a",
                },
                {
                    "id": "teacher-b",
                    "email": "teacher-b@example.com",
                    "name": "先生B",
                    "role": "teacher",
                    "school_id": "school-b",
                },
                {
                    "id": "student-a1",
                    "email": "student-a1@example.com",
                    "name": "生徒A1",
                    "role": "student",
                    "school_id": "school-a",
                    "grade": "1年",
                    "class_name": "A組",
                    "attendance_number": 1,
                    "legacy_user_id": None,
                },
                {
                    "id": "student-a2",
                    "email": "student-a2@example.com",
                    "name": "生徒A2",
                    "role": "student",
                    "school_id": "school-a",
                    "grade": "1年",
                    "class_name": "A組",
                    "attendance_number": 2,
                    "legacy_user_id": None,
                },
                {
                    "id": "student-b1",
                    "email": "student-b1@example.com",
                    "name": "生徒B1",
                    "role": "student",
                    "school_id": "school-b",
                    "grade": "1年",
                    "class_name": "B組",
                    "attendance_number": 1,
                    "legacy_user_id": None,
                },
            ],
            "diary_entries": [
                {
                    "id": "diary-a1",
                    "student_id": "student-a1",
                    "supabase_student_id": "student-a1",
                    "date": "2026-06-04",
                    "published_body": "先生には直接見せない本文",
                    "published_quote": "A1 quote",
                    "published_tags": ["A"],
                    "shared_summary": "A1 summary",
                    "share_status": "shared",
                    "shared_at": "2026-06-04T00:00:00+00:00",
                    "emotion": {"effort_score": 3, "mood_tags": ["検証"]},
                    "turning_point": False,
                    "submitted_at": "2026-06-04T00:00:00+00:00",
                    "ai_draft": {"draft_body": "private"},
                    "student_note": "private note",
                    "diff_added": 99,
                    "diff_removed": 11,
                },
                {
                    "id": "diary-a2",
                    "student_id": "student-a2",
                    "supabase_student_id": "student-a2",
                    "date": "2026-06-04",
                    "published_body": "先生には直接見せない本文",
                    "published_quote": "A2 quote",
                    "published_tags": ["A"],
                    "shared_summary": "A2 summary",
                    "share_status": "shared",
                    "shared_at": "2026-06-04T00:00:00+00:00",
                    "emotion": {"effort_score": 4, "mood_tags": ["検証"]},
                    "turning_point": True,
                    "submitted_at": "2026-06-04T00:00:00+00:00",
                },
                {
                    "id": "diary-b1",
                    "student_id": "student-b1",
                    "supabase_student_id": "student-b1",
                    "date": "2026-06-04",
                    "published_body": "先生には直接見せない本文",
                    "published_quote": "B1 quote",
                    "published_tags": ["B"],
                    "shared_summary": "B1 summary",
                    "share_status": "shared",
                    "shared_at": "2026-06-04T00:00:00+00:00",
                    "emotion": {"effort_score": 2, "mood_tags": ["検証"]},
                    "turning_point": False,
                    "submitted_at": "2026-06-04T00:00:00+00:00",
                },
            ],
        }
        self.service = _build_service(self.rows_by_table)

    def test_teacher_dashboard_returns_only_same_school_students(self):
        rows = asyncio.run(self.service.get_teacher_dashboard("teacher-a", include_inactive=True))

        student_ids = {row["student_id"] for row in rows}
        self.assertEqual(student_ids, {"student-a1", "student-a2"})
        self.assertNotIn("student-b1", student_ids)

    def test_teacher_student_detail_rejects_other_school_student(self):
        with self.assertRaises(HTTPException) as exc:
            asyncio.run(self.service.get_student_diaries("teacher-a", "student-b1"))

        self.assertEqual(exc.exception.status_code, 403)

    def test_teacher_student_detail_sanitizes_private_fields(self):
        diaries = asyncio.run(self.service.get_student_diaries("teacher-a", "student-a1"))

        self.assertEqual(len(diaries), 1)
        diary = diaries[0]
        self.assertEqual(diary["student_id"], "student-a1")
        self.assertIsNone(diary["published_body"])
        self.assertEqual(diary["shared_summary"], "A1 summary")
        self.assertNotIn("ai_draft", diary)
        self.assertNotIn("student_note", diary)
        self.assertNotIn("diff_added", diary)
        self.assertNotIn("diff_removed", diary)

    def test_student_user_cannot_use_teacher_detail_endpoint(self):
        with self.assertRaises(HTTPException) as exc:
            asyncio.run(self.service.get_student_diaries("student-a1", "student-a1"))

        self.assertEqual(exc.exception.status_code, 403)


if __name__ == "__main__":
    unittest.main()
