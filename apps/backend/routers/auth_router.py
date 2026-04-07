# routers/auth_router.py - Supabase認証ルーター

from datetime import datetime, timezone
import logging
import os
from typing import Any, Dict, Optional, Union

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import Client

from services.base import ServiceManager
from utils.auth_utils import AuthUtils
from utils.supabase_auth import get_current_user as get_supabase_user

load_dotenv()

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()


def get_supabase_client() -> Optional[Client]:
    from supabase import create_client

    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_SECRET_KEY")

    if not supabase_url or not supabase_key:
        return None

    return create_client(supabase_url, supabase_key)


_service_manager = None


def get_service_manager() -> ServiceManager:
    global _service_manager

    if _service_manager is None:
        client = get_supabase_client()
        if client is None:
            raise ValueError("Supabase client could not be initialized")
        _service_manager = ServiceManager(client)

    return _service_manager


def resolve_application_user_id(auth_user: Dict[str, Any]) -> Union[int, str]:
    client = get_supabase_client()
    if client is not None:
        legacy_user_id = AuthUtils.convert_supabase_to_legacy_id(auth_user["id"], client)
        if legacy_user_id is not None:
            return legacy_user_id
    return auth_user["id"]


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


async def get_current_auth_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    return await get_supabase_user(credentials)


async def get_current_user(
    auth_user: Dict[str, Any] = Depends(get_current_auth_user),
) -> Union[int, str]:
    return resolve_application_user_id(auth_user)


class OnboardingRequest(BaseModel):
    name: str
    school_code: Optional[str] = None
    grade: Optional[str] = None
    class_name: Optional[str] = None
    attendance_number: Optional[int] = None


class VerifySchoolCodeRequest(BaseModel):
    school_code: str


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    grade: Optional[str] = None
    class_name: Optional[str] = None
    attendance_number: Optional[int] = None


@router.get("/me")
async def get_current_user_info(
    auth_user: Dict[str, Any] = Depends(get_current_auth_user),
):
    supabase_client = get_service_manager().supabase_client
    profile = ensure_profile(supabase_client, auth_user)
    return {
        "user": auth_user,
        "profile": profile,
        "application_user_id": resolve_application_user_id(auth_user),
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
            "profile": result.data[0],
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
            "profile": result.data[0],
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
            "profile": result.data[0],
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
            .select("name, school_id, school_code_locked")
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

        if not profile.get("school_id") and not profile.get("school_code_locked"):
            return {
                "needs_onboarding": True,
                "reason": "school_not_set",
                "can_set_school": True,
            }

        return {
            "needs_onboarding": False,
            "profile": profile,
        }
    except Exception as exc:
        logger.error("Onboarding check error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check onboarding status",
        ) from exc
