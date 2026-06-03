import argparse
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(BACKEND_DIR / ".env")

from services.admin_service import AdminService
from utils.supabase_config import create_supabase_admin_client


def parse_teacher(value: str) -> Dict[str, str]:
    parts = [part.strip() for part in value.split("|")]
    if len(parts) != 3 or not all(parts):
        raise argparse.ArgumentTypeError(
            "teacher must be formatted as 'name|email|login_id'"
        )

    return {
        "name": parts[0],
        "email": parts[1],
        "login_id": parts[2],
    }


def build_default_teachers() -> List[Dict[str, str]]:
    suffix = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    return [
        {
            "name": "Test Teacher",
            "email": f"teacher.{suffix}@example.com",
            "login_id": f"teacher{suffix[-6:]}",
        }
    ]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Issue a test school code and temporary teacher password(s)."
    )
    parser.add_argument(
        "--school-name",
        default=f"TanQ Test School {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        help="School name to create or reuse.",
    )
    parser.add_argument(
        "--school-code",
        help="Optional school code. If omitted, an existing school with the same name is reused or a new code is generated.",
    )
    parser.add_argument(
        "--teacher",
        action="append",
        type=parse_teacher,
        help="Teacher definition in the form 'name|email|login_id'. Repeat for multiple teachers.",
    )
    return parser.parse_args()


async def main() -> int:
    args = parse_args()
    client = create_supabase_admin_client()
    if client is None:
        print("Supabase admin credentials are not configured.", file=sys.stderr)
        return 1

    service = AdminService(client)
    teachers = args.teacher or build_default_teachers()
    result = await service.issue_school_credentials(
        school_name=args.school_name,
        school_code=args.school_code,
        teachers=teachers,
    )

    school = result["school"]
    print(f"School Name: {school['name']}")
    print(f"School UUID: {school['id']}")
    print(f"School ID: {school['school_code']}")
    print("")
    for index, teacher in enumerate(result["teachers"], start=1):
        print(f"Teacher {index}")
        print(f"  Status: {teacher['status']}")
        print(f"  Name: {teacher['name']}")
        print(f"  Email: {teacher['email']}")
        print(f"  Login ID: {teacher['login_id']}")
        print(f"  Temporary Password: {teacher['temporary_password']}")
        print("")

    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
