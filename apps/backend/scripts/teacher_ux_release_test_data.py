"""Shared constants for teacher UX release test data."""

from __future__ import annotations


BASE_EMAIL = "koutakado2@gmail.com"

SCHOOLS = [
    {
        "key": "a",
        "name": "探Qメイト リリース検証校 A",
        "school_code": "TQREL-A-202606",
    },
    {
        "key": "b",
        "name": "探Qメイト リリース検証校 B",
        "school_code": "TQREL-B-202606",
    },
]

TEACHERS = [
    {
        "school_key": "a",
        "name": "検証先生 A",
        "email": "koutakado2+tanq-teacher-a@gmail.com",
        "login_id": "tanq-release-teacher-a",
    },
    {
        "school_key": "b",
        "name": "検証先生 B",
        "email": "koutakado2+tanq-teacher-b@gmail.com",
        "login_id": "tanq-release-teacher-b",
    },
]

STUDENTS = [
    {
        "school_key": "a",
        "name": "検証生徒 A1",
        "email": "koutakado2+tanq-student-a1@gmail.com",
        "username": "tanq-release-student-a1",
        "grade": "1年",
        "class_name": "A組",
        "attendance_number": 1,
        "summary": "A校A1の共有summaryです。A校だけに表示される検証用データです。",
    },
    {
        "school_key": "a",
        "name": "検証生徒 A2",
        "email": "koutakado2+tanq-student-a2@gmail.com",
        "username": "tanq-release-student-a2",
        "grade": "1年",
        "class_name": "A組",
        "attendance_number": 2,
        "summary": "A校A2の共有summaryです。B校画面に出てはいけない検証用データです。",
    },
    {
        "school_key": "b",
        "name": "検証生徒 B1",
        "email": "koutakado2+tanq-student-b1@gmail.com",
        "username": "tanq-release-student-b1",
        "grade": "1年",
        "class_name": "B組",
        "attendance_number": 1,
        "summary": "B校B1の共有summaryです。B校だけに表示される検証用データです。",
    },
    {
        "school_key": "b",
        "name": "検証生徒 B2",
        "email": "koutakado2+tanq-student-b2@gmail.com",
        "username": "tanq-release-student-b2",
        "grade": "1年",
        "class_name": "B組",
        "attendance_number": 2,
        "summary": "B校B2の共有summaryです。A校画面に出てはいけない検証用データです。",
    },
]

ALL_TEST_EMAILS = [item["email"] for item in TEACHERS + STUDENTS]
ALL_TEST_SCHOOL_CODES = [item["school_code"] for item in SCHOOLS]
