import argparse
import asyncio
import secrets
import string
import sys
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any, Dict
from uuid import uuid4

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
SCRIPT_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

load_dotenv(BACKEND_DIR / ".env")

from services.supabase_auth_service import SupabaseAuthService
from teacher_ux_release_test_data import SCHOOLS, STUDENTS, TEACHERS
from utils.supabase_config import create_supabase_admin_client


PASSWORD_ALPHABET = string.ascii_letters + string.digits + "!@#$%^&*"


def temporary_password() -> str:
    return "".join(secrets.choice(PASSWORD_ALPHABET) for _ in range(18))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Seed production Supabase with release-test schools, teachers, students, and shared diaries."
    )
    parser.add_argument(
        "--confirm-production",
        action="store_true",
        help="Required safety flag because this script writes to the configured Supabase project.",
    )
    parser.add_argument(
        "--diary-date",
        default=date.today().isoformat(),
        help="Diary date to seed, in YYYY-MM-DD format.",
    )
    return parser.parse_args()


def school_by_key(schools: Dict[str, Dict[str, Any]], key: str) -> Dict[str, Any]:
    return schools[key]


def get_profile_by_email(client, email: str) -> Dict[str, Any] | None:
    result = (
        client.table("profiles")
        .select("id, email, username, role, school_id, name")
        .eq("email", email)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def upsert_school(client, school: Dict[str, str]) -> Dict[str, Any]:
    existing = (
        client.table("schools")
        .select("id, name, school_code")
        .eq("school_code", school["school_code"])
        .limit(1)
        .execute()
    )
    if existing.data:
        row = existing.data[0]
        if row.get("name") != school["name"]:
            raise RuntimeError(
                f"school_code {school['school_code']} already belongs to {row.get('name')}"
            )
        return row

    result = (
        client.table("schools")
        .insert({"name": school["name"], "school_code": school["school_code"]})
        .execute()
    )
    if not result.data:
        raise RuntimeError(f"Failed to create school: {school['name']}")
    return result.data[0]


async def ensure_auth_user(
    client,
    auth_service: SupabaseAuthService,
    *,
    email: str,
    password: str,
    user_metadata: Dict[str, Any],
) -> Dict[str, Any]:
    existing_profile = get_profile_by_email(client, email)
    if existing_profile:
        existing_user = await auth_service.get_user_by_id(existing_profile["id"])
        metadata = (existing_user or {}).get("user_metadata") or {}
        metadata.update(user_metadata)
        await auth_service.update_user(existing_profile["id"], password=password, user_metadata=metadata)
        return {"id": existing_profile["id"], "email": email, "status": "password_reset"}

    created_user = await auth_service.create_user(
        email=email,
        password=password,
        user_metadata=user_metadata,
    )
    if not created_user:
        raise RuntimeError(f"Failed to create auth user: {email}")
    return {"id": created_user["id"], "email": email, "status": "created"}


def upsert_profile(
    client,
    *,
    user_id: str,
    email: str,
    username: str,
    name: str,
    role: str,
    school_id: str,
    grade: str | None = None,
    class_name: str | None = None,
    attendance_number: int | None = None,
) -> None:
    payload = {
        "id": user_id,
        "email": email,
        "username": username,
        "name": name,
        "role": role,
        "school_id": school_id,
        "school_code_locked": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    if role == "student":
        payload.update(
            {
                "grade": grade,
                "class_name": class_name,
                "attendance_number": attendance_number,
                "theme": "先生用UXリリース検証",
                "question": "学校間で表示が混ざらないか",
                "hypothesis": "同じ学校の先生にだけ共有summaryが見える",
            }
        )

    result = client.table("profiles").upsert(payload).execute()
    if not result.data:
        raise RuntimeError(f"Failed to upsert profile: {email}")


def upsert_shared_diary(client, *, student: Dict[str, Any], student_id: str, diary_date: str) -> str:
    existing = (
        client.table("diary_entries")
        .select("id")
        .eq("supabase_student_id", student_id)
        .eq("date", diary_date)
        .limit(1)
        .execute()
    )
    payload = {
        "supabase_student_id": student_id,
        "student_id": student_id,
        "date": diary_date,
        "ai_draft": {
            "draft_body": "先生には表示してはいけないAI下書きです。",
            "shared_summary_draft": student["summary"],
            "seed": "teacher_ux_release_test",
        },
        "published_body": "先生には本文を直接表示しない検証用本文です。",
        "published_quote": f"{student['name']} の検証用引用",
        "published_tags": ["リリース検証", student["school_key"].upper()],
        "student_note": "先生には表示してはいけない私的記述です。",
        "shared_summary": student["summary"],
        "share_status": "shared",
        "shared_at": datetime.now(timezone.utc).isoformat(),
        "emotion": {
            "effort_score": 3,
            "mood_tags": ["検証"],
            "free_text": "先生向け表示範囲の検証用です。",
        },
        "diff_added": 10,
        "diff_removed": 5,
        "turning_point": student["school_key"] == "a",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    if existing.data:
        diary_id = existing.data[0]["id"]
        result = client.table("diary_entries").update(payload).eq("id", diary_id).execute()
    else:
        diary_id = str(uuid4())
        payload["id"] = diary_id
        result = client.table("diary_entries").insert(payload).execute()

    if not result.data:
        raise RuntimeError(f"Failed to upsert diary for {student['email']}")
    return result.data[0]["id"]


async def main() -> int:
    args = parse_args()
    if not args.confirm_production:
        print("Refusing to write without --confirm-production.", file=sys.stderr)
        return 2

    client = create_supabase_admin_client()
    if client is None:
        print("Supabase admin credentials are not configured.", file=sys.stderr)
        return 1

    auth_service = SupabaseAuthService(client)
    schools: Dict[str, Dict[str, Any]] = {}
    issued_passwords: Dict[str, str] = {}
    created_students: Dict[str, str] = {}
    diary_ids: Dict[str, str] = {}

    for school in SCHOOLS:
        schools[school["key"]] = upsert_school(client, school)

    for teacher in TEACHERS:
        password = temporary_password()
        school = school_by_key(schools, teacher["school_key"])
        user = await ensure_auth_user(
            client,
            auth_service,
            email=teacher["email"],
            password=password,
            user_metadata={
                "name": teacher["name"],
                "username": teacher["login_id"],
                "role": "teacher",
            },
        )
        upsert_profile(
            client,
            user_id=user["id"],
            email=teacher["email"],
            username=teacher["login_id"],
            name=teacher["name"],
            role="teacher",
            school_id=school["id"],
        )
        issued_passwords[teacher["email"]] = password

    for student in STUDENTS:
        password = temporary_password()
        school = school_by_key(schools, student["school_key"])
        user = await ensure_auth_user(
            client,
            auth_service,
            email=student["email"],
            password=password,
            user_metadata={
                "name": student["name"],
                "username": student["username"],
                "role": "student",
            },
        )
        upsert_profile(
            client,
            user_id=user["id"],
            email=student["email"],
            username=student["username"],
            name=student["name"],
            role="student",
            school_id=school["id"],
            grade=student["grade"],
            class_name=student["class_name"],
            attendance_number=student["attendance_number"],
        )
        diary_ids[student["email"]] = upsert_shared_diary(
            client,
            student=student,
            student_id=user["id"],
            diary_date=args.diary_date,
        )
        created_students[student["email"]] = user["id"]
        issued_passwords[student["email"]] = password

    print("Seed completed.")
    print("")
    for school in SCHOOLS:
        row = schools[school["key"]]
        print(f"School {school['key'].upper()}: {row['name']} / {row['school_code']} / {row['id']}")
    print("")
    print("Temporary passwords:")
    for email, password in issued_passwords.items():
        print(f"  {email}: {password}")
    print("")
    print("Student IDs and diary IDs:")
    for email, student_id in created_students.items():
        print(f"  {email}: student_id={student_id}, diary_id={diary_ids[email]}")
    print("")
    print("Cleanup command:")
    print("  python apps/backend/scripts/cleanup_teacher_ux_release_test_data.py --confirm")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
