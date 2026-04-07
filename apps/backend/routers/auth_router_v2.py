# backend/routers/auth_router_v2.py - 新認証システム用ルーター

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timezone

from middleware.supabase_auth import get_current_user_v2
from services.base import ServiceManager
from routers.auth_router import get_supabase_client, get_service_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v2/auth", tags=["auth-v2"])

# リクエストスキーマ
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

# エンドポイント

@router.post("/verify-school-code")
async def verify_school_code(
    request: VerifySchoolCodeRequest
):
    """学校コードの検証"""
    try:
        supabase_client = get_service_manager().supabase_client
        
        # 学校コードで学校を検索
        result = supabase_client.table("schools")\
            .select("id, name")\
            .eq("school_code", request.school_code)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Invalid school code"
            )
        
        school = result.data[0]
        return {
            "success": True,
            "school": {
                "id": school["id"],
                "name": school["name"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"School code verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify school code"
        )

@router.post("/onboarding")
async def complete_onboarding(
    request: OnboardingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_v2)
):
    """初期プロフィール設定"""
    try:
        supabase_client = get_service_manager().supabase_client
        user_id = current_user["id"]
        
        # 更新データの準備
        update_data = {
            "name": request.name,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # 学校コードが提供された場合
        if request.school_code:
            # 学校コードで学校を検索
            school_result = supabase_client.table("schools")\
                .select("id")\
                .eq("school_code", request.school_code)\
                .execute()
            
            if not school_result.data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid school code"
                )
            
            school_id = school_result.data[0]["id"]
            update_data.update({
                "school_id": school_id,
                "school_code_locked": True,
                "grade": request.grade,
                "class_name": request.class_name,
                "attendance_number": request.attendance_number
            })
        
        # プロフィール更新
        result = supabase_client.table("profiles")\
            .update(update_data)\
            .eq("id", user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
        
        return {
            "success": True,
            "message": "Onboarding completed successfully",
            "profile": result.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Onboarding error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete onboarding"
        )

@router.get("/profile")
async def get_profile(
    current_user: Dict[str, Any] = Depends(get_current_user_v2)
):
    """現在のユーザープロフィール取得"""
    try:
        supabase_client = get_service_manager().supabase_client
        user_id = current_user["id"]
        
        # プロフィール取得（学校情報も含む）
        result = supabase_client.table("profiles")\
            .select("*, schools(id, name)")\
            .eq("id", user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found"
            )
        
        profile = result.data[0]
        return {
            "success": True,
            "profile": profile
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile fetch error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch profile"
        )

@router.put("/profile")
async def update_profile(
    request: UpdateProfileRequest,
    current_user: Dict[str, Any] = Depends(get_current_user_v2)
):
    """プロフィール更新"""
    try:
        supabase_client = get_service_manager().supabase_client
        user_id = current_user["id"]
        
        # 更新データの準備
        update_data = {}
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
                detail="No fields to update"
            )
        
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # プロフィール更新
        result = supabase_client.table("profiles")\
            .update(update_data)\
            .eq("id", user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update profile"
            )
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "profile": result.data[0]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Profile update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.get("/check-onboarding")
async def check_onboarding_status(
    current_user: Dict[str, Any] = Depends(get_current_user_v2)
):
    """オンボーディング状態確認"""
    try:
        supabase_client = get_service_manager().supabase_client
        user_id = current_user["id"]
        
        # プロフィール取得
        result = supabase_client.table("profiles")\
            .select("name, school_id, school_code_locked")\
            .eq("id", user_id)\
            .execute()
        
        if not result.data:
            return {
                "needs_onboarding": True,
                "reason": "profile_not_found"
            }
        
        profile = result.data[0]
        
        # 名前が未設定の場合
        if not profile.get("name"):
            return {
                "needs_onboarding": True,
                "reason": "name_not_set"
            }
        
        # 学校が未設定かつロックされていない場合
        if not profile.get("school_id") and not profile.get("school_code_locked"):
            return {
                "needs_onboarding": True,
                "reason": "school_not_set",
                "can_set_school": True
            }
        
        return {
            "needs_onboarding": False,
            "profile": profile
        }
        
    except Exception as e:
        logger.error(f"Onboarding check error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check onboarding status"
        )