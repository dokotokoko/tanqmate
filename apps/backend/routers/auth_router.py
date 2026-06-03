# routers/auth_router.py - Supabase認証ルーター

from datetime import datetime, timezone
import logging
import os
from typing import Any, Dict, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import Client

from services.base import ServiceManager
from utils.supabase_config import create_supabase_admin_client
from utils.supabase_auth import get_current_user as get_supabase_user
from utils.user_identity import resolve_legacy_user_id as lookup_legacy_user_id

load_dotenv()

logger = logging.getLogger(__name__)

INQUIRY_CONTEXT_FIELDS = ("theme", "question", "hypothesis")

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()


def get_supabase_client() -> Optional[Client]:
    return create_supabase_admin_client()


_service_manager = None


def get_service_manager() -> ServiceManager:
    global _service_manager

    if _service_manager is None:
        client = get_supabase_client()
        if client is None:
            raise ValueError("Supabase client could not be initialized")
        _service_manager = ServiceManager(client)

    return _service_manager


def resolve_application_user_id(auth_user: Dict[str, Any]) -> str:
    """Use Supabase UUID as the canonical application user id."""
    return auth_user["id"]


def resolve_legacy_user_id(auth_user: Dict[str, Any]) -> Optional[int]:
    """Lookup legacy ids only for migration / handover flows."""
    client = get_supabase_client()
    if client is None:
        return None
    legacy_user_id = lookup_legacy_user_id(client, auth_user["id"])
    if legacy_user_id is None:
        logger.info("No legacy user mapping found for Supabase user %s", auth_user["id"])
    return legacy_user_id


def ensure_profile(
    supabase_client: Client,
    auth_user: Dict[str, Any],
) -> Dict[str, Any]:
    result = (
        supabase_client.table("profiles")
        .select("*")
        .eq("id", auth_user["id"])
        .execute()
    )

    if result.data:
        return result.data[0]

    username = (
        auth_user.get("user_metadata", {}).get("username")
        or auth_user.get("email", "").split("@")[0]
        or auth_user["id"]
    )

    insert_result = (
        supabase_client.table("profiles")
        .insert(
            {
                "id": auth_user["id"],
                "email": auth_user.get("email"),
                "username": username,
                "role": "student",
                "school_id": None,
                "school_code_locked": False,
            }
        )
        .execute()
    )

    if not insert_result.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create profile",
        )

    return insert_result.data[0]


def extract_inquiry_context(profile: Dict[str, Any]) -> Dict[str, Optional[str]]:
    return {field: profile.get(field) for field in INQUIRY_CONTEXT_FIELDS}


def build_profile_response(profile: Dict[str, Any]) -> Dict[str, Any]:
    inquiry_context = extract_inquiry_context(profile)
    return {
        "profile": profile,
        "inquiry_context": inquiry_context,
        "inquiry_context_complete": all(inquiry_context.values()),
        "missing_inquiry_context_fields": [
            field for field, value in inquiry_context.items() if not value
        ],
    }


async def get_current_auth_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    return await get_supabase_user(credentials)


async def get_current_user(
    auth_user: Dict[str, Any] = Depends(get_current_auth_user),
) -> str:
    return resolve_application_user_id(auth_user)


class OnboardingRequest(BaseModel):
    name: str
    school_code: Optional[str] = None
    grade: Optional[str] = None
    class_name: Optional[str] = None
    attendance_number: Optional[int] = None
    theme: Optional[str] = None
    question: Optional[str] = None
    hypothesis: Optional[str] = None


class VerifySchoolCodeRequest(BaseModel):
    school_code: str


class TeacherLoginResolveRequest(BaseModel):
    school_code: str
    login_id: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    grade: Optional[str] = None
    class_name: Optional[str] = None
    attendance_number: Optional[int] = None
    theme: Optional[str] = None
    question: Optional[str] = None
    hypothesis: Optional[str] = None


@router.get("/me")
async def get_current_user_info(
    auth_user: Dict[str, Any] = Depends(get_current_auth_user),
):
    supabase_client = get_service_manager().supabase_client
    profile = ensure_profile(supabase_client, auth_user)
    return {
        "user": auth_user,
        **build_profile_response(profile),
        "application_user_id": resolve_application_user_id(auth_user),
        "legacy_user_id": resolve_legacy_user_id(auth_user),
    }


@router.post("/verify-school-code")
async def verify_school_code(
    request: VerifySchoolCodeRequest,
):
    try:
        supabase_client = get_service_manager().supabase_client
        result = (
            supabase_client.table("schools")
            .select("id, name")
            .eq("school_code", request.school_code)
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid school code",
            )

        school = result.data[0]
        return {
            "success": True,
            "school": {
                "id": school["id"],
                "name": school["name"],
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("School code verification error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify school code",
        ) from exc


@router.post("/teacher-login/resolve")
async def resolve_teacher_login(
    request: TeacherLoginResolveRequest,
):
    try:
        supabase_client = get_service_manager().supabase_client
        normalized_school_code = request.school_code.strip().upper()
        normalized_login_id = request.login_id.strip()

        if not normalized_school_code or not normalized_login_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="school_code and login_id are required",
            )

        school_result = (
            supabase_client.table("schools")
            .select("id, name, school_code")
            .eq("school_code", normalized_school_code)
            .execute()
        )

        if not school_result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher account not found",
            )

        school = school_result.data[0]
        login_queries = [
            ("username", normalized_login_id),
            ("email", normalized_login_id.lower()),
        ]

        teacher_profile = None
        for field, value in login_queries:
            profile_result = (
                supabase_client.table("profiles")
                .select("id, email, username, role, school_id, name")
                .eq("role", "teacher")
                .eq("school_id", school["id"])
                .eq(field, value)
                .execute()
            )
            if profile_result.data:
                teacher_profile = profile_result.data[0]
                break

        if not teacher_profile or not teacher_profile.get("email"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Teacher account not found",
            )

        return {
            "success": True,
            "email": teacher_profile["email"],
            "teacher": {
                "id": teacher_profile["id"],
                "name": teacher_profile.get("name"),
                "username": teacher_profile.get("username"),
            },
            "school": {
                "id": school["id"],
                "name": school["name"],
                "school_code": school["school_code"],
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Teacher login resolve error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resolve teacher account",
        ) from exc


@router.post("/onboarding")
async def complete_onboarding(
    request: OnboardingRequest,
    auth_user: Dict[str, Any] = Depends(get_current_auth_user),
):
    try:
        supabase_client = get_service_manager().supabase_client
        ensure_profile(supabase_client, auth_user)
        update_data: Dict[str, Any] = {
            "name": request.name,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        for field in INQUIRY_CONTEXT_FIELDS:
            value = getattr(request, field)
            if value is not None:
                update_data[field] = value

        if request.school_code:
            school_result = (
                supabase_client.table("schools")
                .select("id")
                .eq("school_code", request.school_code)
                .execute()
            )

            if not school_result.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid school code",
                )

            school_id = school_result.data[0]["id"]
            update_data.update(
                {
                    "school_id": school_id,
                    "school_code_locked": True,
                    "grade": request.grade,
                    "class_name": request.class_name,
                    "attendance_number": request.attendance_number,
                }
            )

        result = (
            supabase_client.table("profiles")
            .update(update_data)
            .eq("id", auth_user["id"])
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile",
            )

        return {
            "success": True,
            "message": "Onboarding completed successfully",
            **build_profile_response(result.data[0]),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Onboarding error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete onboarding",
        ) from exc


@router.get("/profile")
async def get_profile(
    auth_user: Dict[str, Any] = Depends(get_current_auth_user),
):
    try:
        supabase_client = get_service_manager().supabase_client
        ensure_profile(supabase_client, auth_user)
        result = (
            supabase_client.table("profiles")
            .select("*, schools(id, name)")
            .eq("id", auth_user["id"])
            .execute()
        )

        return {
            "success": True,
            **build_profile_response(result.data[0]),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Profile fetch error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch profile",
        ) from exc


@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    auth_user: Dict[str, Any] = Depends(get_current_auth_user),
):
    try:
        update_data: Dict[str, Any] = {}
        if request.name is not None:
            update_data["name"] = request.name
        if request.grade is not None:
            update_data["grade"] = request.grade
        if request.class_name is not None:
            update_data["class_name"] = request.class_name
        if request.attendance_number is not None:
            update_data["attendance_number"] = request.attendance_number
        if request.theme is not None:
            update_data["theme"] = request.theme
        if request.question is not None:
            update_data["question"] = request.question
        if request.hypothesis is not None:
            update_data["hypothesis"] = request.hypothesis

        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update",
            )

        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        supabase_client = get_service_manager().supabase_client
        ensure_profile(supabase_client, auth_user)
        result = (
            supabase_client.table("profiles")
            .update(update_data)
            .eq("id", auth_user["id"])
            .execute()
        )

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile",
            )

        return {
            "success": True,
            "message": "Profile updated successfully",
            **build_profile_response(result.data[0]),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Profile update error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile",
        ) from exc


@router.get("/check-onboarding")
async def check_onboarding_status(
    auth_user: Dict[str, Any] = Depends(get_current_auth_user),
):
    try:
        supabase_client = get_service_manager().supabase_client
        ensure_profile(supabase_client, auth_user)
        result = (
            supabase_client.table("profiles")
            .select("name, school_id, school_code_locked, theme, question, hypothesis")
            .eq("id", auth_user["id"])
            .execute()
        )

        if not result.data:
            return {
                "needs_onboarding": True,
                "reason": "profile_not_found",
            }

        profile = result.data[0]

        if not profile.get("name"):
            return {
                "needs_onboarding": True,
                "reason": "name_not_set",
            }

        missing_inquiry_context_fields = [
            field for field in INQUIRY_CONTEXT_FIELDS if not profile.get(field)
        ]

        return {
            "needs_onboarding": False,
            "profile": profile,
            "inquiry_context": extract_inquiry_context(profile),
            "inquiry_context_complete": not missing_inquiry_context_fields,
            "missing_inquiry_context_fields": missing_inquiry_context_fields,
        }
    except Exception as exc:
        logger.error("Onboarding check error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check onboarding status",
        ) from exc
