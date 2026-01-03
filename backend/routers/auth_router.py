# routers/auth_router.py - 認証関連ルーター

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from services.auth_service import AuthService
from services.base import ServiceManager
from supabase import Client
import os

# ルーター初期化
router = APIRouter(prefix="/auth", tags=["authentication"])
security = HTTPBearer()

# Supabaseクライアント初期化
def get_supabase_client() -> Client:
    from supabase import create_client
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_ANON_KEY")
    return create_client(supabase_url, supabase_key)

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class UserLogin(BaseModel):
    username: str
    password: str

class UserRegister(BaseModel):
    username: str
    password: str
    # email: str  # 将来の実装用にコメントアウト

class UserResponse(BaseModel):
    user: dict
    token: str

# 依存関数
def get_auth_service() -> AuthService:
    """認証サービス取得"""
    return service_manager.get_service(AuthService)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service)
) -> int:
    """現在のユーザー取得"""
    return auth_service.verify_token(credentials)

# エンドポイント
@router.post("/login", response_model=UserResponse)
async def login(
    login_data: UserLogin,
    auth_service: AuthService = Depends(get_auth_service)
):
    """ユーザーログイン"""
    return await auth_service.login_user(login_data.username, login_data.password)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    register_data: UserRegister,
    auth_service: AuthService = Depends(get_auth_service)
):
    """ユーザー登録"""
    return await auth_service.register_user(
        register_data.username,
        register_data.password
    )

@router.get("/me")
async def get_current_user_info(
    current_user_id: int = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """現在のユーザー情報取得"""
    return auth_service.get_user_by_id(current_user_id)

@router.post("/logout")
async def logout(
    current_user_id: int = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service)
):
    """ログアウト（キャッシュクリア）"""
    auth_service.invalidate_user_cache(current_user_id)
    return {"message": "Successfully logged out"}