"""
Supabase Auth integration for FastAPI
JWK/JWKS URL方式を使用した認証実装
"""
import os
import json
import httpx
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
from jose import jwt, jwk, JWTError
from jose.utils import base64url_decode
from functools import lru_cache

# 環境変数の読み込み
load_dotenv()

logger = logging.getLogger(__name__)

# Supabase設定
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
# JWK URL方式を使用（レガシーJWT_SECRETの代わり）
SUPABASE_JWKS_URL = os.getenv("SUPABASE_JWKS_URL")

# HTTPBearer for extracting tokens
security = HTTPBearer(auto_error=False)

# JWKSキャッシュ（パフォーマンス向上のため）
_jwks_cache = None
_jwks_cache_time = None
JWKS_CACHE_TTL = 3600  # 1時間

# Supabaseクライアントの初期化
def get_supabase_client() -> Client:
    """Supabaseクライアントを取得"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("Supabase環境変数が設定されていません")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async def get_jwks() -> Dict[str, Any]:
    """
    JWKS（JSON Web Key Set）を取得
    キャッシュ機能付きで効率的に公開鍵を管理
    """
    global _jwks_cache, _jwks_cache_time
    
    # キャッシュの有効性チェック
    if _jwks_cache and _jwks_cache_time:
        if (datetime.now(timezone.utc) - _jwks_cache_time).total_seconds() < JWKS_CACHE_TTL:
            return _jwks_cache
    
    if not SUPABASE_JWKS_URL:
        # JWKS URLが設定されていない場合、プロジェクトURLから構築
        if SUPABASE_URL:
            jwks_url = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
        else:
            raise ValueError("SUPABASE_JWKS_URLまたはSUPABASE_URLが設定されていません")
    else:
        jwks_url = SUPABASE_JWKS_URL
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(jwks_url)
            response.raise_for_status()
            _jwks_cache = response.json()
            _jwks_cache_time = datetime.now(timezone.utc)
            return _jwks_cache
    except Exception as e:
        logger.error(f"JWKS取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="認証サービスへの接続に失敗しました"
        )

def get_rsa_key(token: str, keys: list) -> Optional[Dict]:
    """
    トークンのヘッダーからkidを取得し、対応する公開鍵を返す
    """
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        return None
    
    kid = unverified_header.get("kid")
    if not kid:
        # kidがない場合は最初の鍵を使用（通常は1つしかない）
        return keys[0] if keys else None
    
    for key in keys:
        if key.get("kid") == kid:
            return key
    return None

class AuthUser(BaseModel):
    """認証済みユーザーのモデル"""
    id: str
    email: Optional[str] = None
    user_metadata: Dict[str, Any] = {}
    app_metadata: Dict[str, Any] = {}
    aud: str
    created_at: datetime
    
class JWTAuthenticationError(HTTPException):
    """JWT認証エラー"""
    def __init__(self, detail: str = "認証が必要です"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": 'Bearer realm="auth_required"'},
        )

async def verify_jwt_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    JWTトークンをJWKS方式で検証
    より安全で標準的な認証方式
    """
    if credentials is None:
        raise JWTAuthenticationError("認証トークンが提供されていません")
    
    token = credentials.credentials
    
    try:
        # JWKS方式のみをサポート（レガシーJWT_SECRETは使用不可）
        if not (SUPABASE_JWKS_URL or SUPABASE_URL):
            raise JWTAuthenticationError("JWKS URLが設定されていません。SUPABASE_JWKS_URLまたはSUPABASE_URLを設定してください。")
        
        # JWKSを取得
        jwks = await get_jwks()
        keys = jwks.get("keys", [])
        
        if not keys:
            raise JWTAuthenticationError("公開鍵の取得に失敗しました")
        
        # 適切な公開鍵を選択
        public_key = get_rsa_key(token, keys)
        
        if not public_key:
            raise JWTAuthenticationError("適切な公開鍵が見つかりません")
        
        # RS256アルゴリズムで検証
        payload = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            audience="authenticated",
            options={"verify_exp": True}
        )
        
        # トークンの有効期限チェック（追加の安全性確認）
        exp = payload.get("exp")
        if exp:
            exp_datetime = datetime.fromtimestamp(exp, tz=timezone.utc)
            if exp_datetime < datetime.now(timezone.utc):
                raise JWTAuthenticationError("トークンの有効期限が切れています")
        
        return payload
        
    except JWTError as e:
        if "expired" in str(e).lower():
            raise JWTAuthenticationError("トークンの有効期限が切れています")
        logger.error(f"JWT検証エラー: {e}")
        raise JWTAuthenticationError("無効な認証トークンです")
    except Exception as e:
        logger.error(f"認証処理エラー: {e}")
        raise JWTAuthenticationError("認証の検証に失敗しました")

async def get_current_user(
    token_payload: Dict[str, Any] = Depends(verify_jwt_token)
) -> AuthUser:
    """
    現在の認証済みユーザーを取得
    JWTペイロードからユーザー情報を構築
    """
    try:
        user = AuthUser(
            id=token_payload.get("sub"),
            email=token_payload.get("email"),
            user_metadata=token_payload.get("user_metadata", {}),
            app_metadata=token_payload.get("app_metadata", {}),
            aud=token_payload.get("aud", "authenticated"),
            created_at=datetime.fromtimestamp(
                token_payload.get("iat", 0), 
                tz=timezone.utc
            )
        )
        return user
    except Exception as e:
        logger.error(f"ユーザー情報の構築エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ユーザー情報の取得に失敗しました"
        )

async def get_current_user_with_refresh(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> AuthUser:
    """
    Supabaseサーバーでトークンを検証（より安全だが遅い）
    トークンのリフレッシュも自動的に処理
    """
    if credentials is None:
        raise JWTAuthenticationError("認証トークンが提供されていません")
    
    try:
        supabase = get_supabase_client()
        
        # Supabaseでユーザーを取得（トークン検証込み）
        response = supabase.auth.get_user(credentials.credentials)
        
        if not response.user:
            raise JWTAuthenticationError("ユーザー情報の取得に失敗しました")
        
        user_data = response.user
        
        return AuthUser(
            id=user_data.id,
            email=user_data.email,
            user_metadata=user_data.user_metadata or {},
            app_metadata=user_data.app_metadata or {},
            aud=user_data.aud,
            created_at=datetime.fromisoformat(user_data.created_at)
        )
        
    except Exception as e:
        logger.error(f"Supabase認証エラー: {e}")
        raise JWTAuthenticationError("認証の検証に失敗しました")

# オプション: 管理者権限チェック
async def require_admin(
    user: AuthUser = Depends(get_current_user)
) -> AuthUser:
    """管理者権限を要求"""
    is_admin = user.app_metadata.get("role") == "admin"
    if not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です"
        )
    return user

# オプション: 特定のロールを要求
def require_role(role: str):
    """特定のロールを要求するデコレーター"""
    async def role_checker(
        user: AuthUser = Depends(get_current_user)
    ) -> AuthUser:
        user_role = user.app_metadata.get("role")
        if user_role != role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{role}権限が必要です"
            )
        return user
    return role_checker