"""
Supabase Auth認証エンドポイント
公式のSupabase Auth APIを使用した認証フロー
JWK/JWKS URL方式対応
"""
from fastapi import APIRouter, HTTPException, status, Depends, Response
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, Dict, Any
from supabase import Client
import os
import logging
from .supabase_auth import get_supabase_client, AuthUser, get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["認証"])

# リクエスト/レスポンスモデル
class SignUpRequest(BaseModel):
    """サインアップリクエスト"""
    email: EmailStr
    password: str = Field(..., min_length=6)
    username: Optional[str] = None
    
    @validator("password")
    def validate_password(cls, v):
        """パスワード強度の検証"""
        if len(v) < 6:
            raise ValueError("パスワードは6文字以上である必要があります")
        return v

class SignInRequest(BaseModel):
    """サインインリクエスト"""
    email: EmailStr
    password: str

class SignInWithProviderRequest(BaseModel):
    """ソーシャルプロバイダーでのサインイン"""
    provider: str  # google, github, etc.
    redirect_to: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    """パスワードリセットリクエスト"""
    email: EmailStr

class UpdatePasswordRequest(BaseModel):
    """パスワード更新リクエスト"""
    new_password: str = Field(..., min_length=6)

class AuthResponse(BaseModel):
    """認証レスポンス"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str
    user: Dict[str, Any]

class MessageResponse(BaseModel):
    """メッセージレスポンス"""
    message: str
    success: bool = True

@router.post("/signup", response_model=AuthResponse)
async def sign_up(request: SignUpRequest):
    """
    新規ユーザー登録
    Supabase Authを使用してユーザーを作成
    """
    try:
        supabase = get_supabase_client()
        
        # ユーザーメタデータの設定
        user_metadata = {}
        if request.username:
            user_metadata["username"] = request.username
        
        # Supabase Authでユーザー作成
        response = supabase.auth.sign_up({
            "email": request.email,
            "password": request.password,
            "options": {
                "data": user_metadata  # カスタムユーザーデータ
            }
        })
        
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="ユーザー登録に失敗しました"
            )
        
        # セッション情報を返す
        return AuthResponse(
            access_token=response.session.access_token,
            expires_in=response.session.expires_in,
            refresh_token=response.session.refresh_token,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "created_at": response.user.created_at,
                "user_metadata": response.user.user_metadata
            }
        )
        
    except Exception as e:
        logger.error(f"サインアップエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/signin", response_model=AuthResponse)
async def sign_in(request: SignInRequest):
    """
    ユーザーサインイン
    メールアドレスとパスワードでサインイン
    """
    try:
        supabase = get_supabase_client()
        
        # Supabase Authでサインイン
        response = supabase.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not response.user or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="メールアドレスまたはパスワードが正しくありません"
            )
        
        return AuthResponse(
            access_token=response.session.access_token,
            expires_in=response.session.expires_in,
            refresh_token=response.session.refresh_token,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "created_at": response.user.created_at,
                "user_metadata": response.user.user_metadata
            }
        )
        
    except Exception as e:
        logger.error(f"サインインエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました"
        )

@router.post("/signin/provider")
async def sign_in_with_provider(request: SignInWithProviderRequest):
    """
    ソーシャルプロバイダーでサインイン
    Google, GitHub等のOAuth認証
    """
    try:
        supabase = get_supabase_client()
        
        # プロバイダー認証URLを生成
        response = supabase.auth.sign_in_with_oauth({
            "provider": request.provider,
            "options": {
                "redirect_to": request.redirect_to
            }
        })
        
        return {
            "url": response.url,
            "provider": request.provider
        }
        
    except Exception as e:
        logger.error(f"プロバイダー認証エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"プロバイダー認証の初期化に失敗しました: {str(e)}"
        )

@router.post("/signout", response_model=MessageResponse)
async def sign_out(user: AuthUser = Depends(get_current_user)):
    """
    ユーザーサインアウト
    現在のセッションを無効化
    """
    try:
        supabase = get_supabase_client()
        
        # Supabaseでサインアウト
        supabase.auth.sign_out()
        
        return MessageResponse(
            message="サインアウトしました",
            success=True
        )
        
    except Exception as e:
        logger.error(f"サインアウトエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="サインアウトに失敗しました"
        )

@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(refresh_token: str):
    """
    アクセストークンのリフレッシュ
    リフレッシュトークンを使用して新しいアクセストークンを取得
    """
    try:
        supabase = get_supabase_client()
        
        # トークンをリフレッシュ
        response = supabase.auth.refresh_session(refresh_token)
        
        if not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="トークンのリフレッシュに失敗しました"
            )
        
        return AuthResponse(
            access_token=response.session.access_token,
            expires_in=response.session.expires_in,
            refresh_token=response.session.refresh_token,
            user={
                "id": response.user.id,
                "email": response.user.email,
                "created_at": response.user.created_at,
                "user_metadata": response.user.user_metadata
            }
        )
        
    except Exception as e:
        logger.error(f"トークンリフレッシュエラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="トークンのリフレッシュに失敗しました"
        )

@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(request: ResetPasswordRequest):
    """
    パスワードリセットメール送信
    指定されたメールアドレスにパスワードリセットリンクを送信
    """
    try:
        supabase = get_supabase_client()
        
        # パスワードリセットメールを送信
        supabase.auth.reset_password_email(
            request.email,
            options={
                "redirect_to": f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/reset-password"
            }
        )
        
        return MessageResponse(
            message="パスワードリセットメールを送信しました",
            success=True
        )
        
    except Exception as e:
        logger.error(f"パスワードリセットエラー: {e}")
        # セキュリティのため、メールアドレスの存在有無は明かさない
        return MessageResponse(
            message="パスワードリセットメールを送信しました",
            success=True
        )

@router.put("/update-password", response_model=MessageResponse)
async def update_password(
    request: UpdatePasswordRequest,
    user: AuthUser = Depends(get_current_user)
):
    """
    パスワード更新
    認証済みユーザーのパスワードを更新
    """
    try:
        supabase = get_supabase_client()
        
        # パスワードを更新
        response = supabase.auth.update_user({
            "password": request.new_password
        })
        
        if not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="パスワードの更新に失敗しました"
            )
        
        return MessageResponse(
            message="パスワードを更新しました",
            success=True
        )
        
    except Exception as e:
        logger.error(f"パスワード更新エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="パスワードの更新に失敗しました"
        )

@router.get("/me")
async def get_current_user_info(user: AuthUser = Depends(get_current_user)):
    """
    現在のユーザー情報を取得
    認証済みユーザーの詳細情報を返す
    """
    return {
        "id": user.id,
        "email": user.email,
        "user_metadata": user.user_metadata,
        "created_at": user.created_at.isoformat()
    }