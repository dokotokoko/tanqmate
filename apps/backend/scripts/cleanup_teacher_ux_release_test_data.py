import argparse
import asyncio
import sys
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
SCRIPT_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

load_dotenv(BACKEND_DIR / ".env")

from services.supabase_auth_service import SupabaseAuthService
from teacher_ux_release_test_data import ALL_TEST_EMAILS, ALL_TEST_SCHOOL_CODES
from utils.supabase_config import create_supabase_admin_client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Remove teacher UX release test data from the configured Supabase project."
    )
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Actually delete the listed test data. Without this flag the script only prints targets.",
    )
    return parser.parse_args()


def fetch_profiles(client) -> List[Dict[str, Any]]:
    result = (
        client.table("profiles")
        .select("id, email, role, school_id, name")
        .in_("email", ALL_TEST_EMAILS)
        .execute()
    )
    return result.data or []


def fetch_schools(client) -> List[Dict[str, Any]]:
    result = (
        client.table("schools")
        .select("id, name, school_code")
        .in_("school_code", ALL_TEST_SCHOOL_CODES)
        .execute()
    )
    return result.data or []


def fetch_diaries(client, user_ids: List[str]) -> List[Dict[str, Any]]:
    if not user_ids:
        return []
    result = (
        client.table("diary_entries")
        .select("id, supabase_student_id, student_id, date")
        .in_("supabase_student_id", user_ids)
        .execute()
    )
    return result.data or []


async def main() -> int:
    args = parse_args()
    client = create_supabase_admin_client()
    if client is None:
        print("Supabase admin credentials are not configured.", file=sys.stderr)
        return 1

    auth_service = SupabaseAuthService(client)
    profiles = fetch_profiles(client)
    user_ids = [profile["id"] for profile in profiles]
    diaries = fetch_diaries(client, user_ids)
    schools = fetch_schools(client)

    print("Cleanup targets:")
    print(f"  profiles/auth users: {len(profiles)}")
    for profile in profiles:
        print(f"    {profile['email']} / {profile['role']} / {profile['id']}")
    print(f"  diary_entries: {len(diaries)}")
    for diary in diaries:
        print(f"    {diary['id']} / student={diary.get('supabase_student_id')} / date={diary.get('date')}")
    print(f"  schools: {len(schools)}")
    for school in schools:
        print(f"    {school['name']} / {school['school_code']} / {school['id']}")

    if not args.confirm:
        print("")
        print("Dry run only. Re-run with --confirm to delete these records.")
        return 0

    for diary in diaries:
        client.table("diary_entries").delete().eq("id", diary["id"]).execute()

    for profile in profiles:
        deleted = await auth_service.delete_user(profile["id"])
        if not deleted:
            client.table("profiles").delete().eq("id", profile["id"]).execute()

    for school in schools:
        remaining_profiles = (
            client.table("profiles")
            .select("id")
            .eq("school_id", school["id"])
            .limit(1)
            .execute()
        )
        if remaining_profiles.data:
            print(f"Skipping school with remaining profiles: {school['name']}", file=sys.stderr)
            continue
        client.table("schools").delete().eq("id", school["id"]).execute()

    print("Cleanup completed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
