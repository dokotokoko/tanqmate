"""Supabase Auth helpers backed by the official Supabase Auth API."""

import os
from typing import Optional, Dict, Any
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from functools import lru_cache

# 環境変数から設定を取得
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")

# HTTPBearer認証スキーム
security = HTTPBearer(auto_error=False)

@lru_cache()
def get_supabase_client() -> Client:
    """Supabaseクライアントのシングルトンを取得"""
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise ValueError("Supabase environment variables not configured")
    
    return create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

class SupabaseAuth:
    """Supabase Auth API 経由でユーザー情報を取得するラッパー。"""
    
    def __init__(self):
        self.supabase = get_supabase_client()

    def _normalize_user(self, user: Any) -> Dict[str, Any]:
        user_metadata = getattr(user, "user_metadata", None) or {}
        app_metadata = getattr(user, "app_metadata", None) or {}

        return {
            "id": getattr(user, "id", None),
            "email": getattr(user, "email", None),
            "role": user_metadata.get("role") or app_metadata.get("role") or "authenticated",
            "app_metadata": app_metadata,
            "user_metadata": user_metadata,
            "aud": getattr(user, "aud", None),
            "created_at": getattr(user, "created_at", None),
            "updated_at": getattr(user, "updated_at", None),
            "last_sign_in_at": getattr(user, "last_sign_in_at", None),
        }
    
    def get_user_from_token(self, token: str) -> Dict[str, Any]:
        """Supabase Auth の標準 API でトークンからユーザー情報を取得する。"""
        try:
            response = self.supabase.auth.get_user(token)
            if not response or not response.user:
                raise HTTPException(status_code=401, detail="Could not validate credentials")

            return self._normalize_user(response.user)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(
                status_code=401,
                detail="Could not validate credentials",
            ) from exc

# シングルトンインスタンス
auth = SupabaseAuth()

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Dict[str, Any]:
    """
    現在のユーザーを取得する依存関数
    
    FastAPIのルートで使用:
    ```python
    @router.get("/protected")
    async def protected_route(user: Dict = Depends(get_current_user)):
        return {"user": user}
    ```
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )

    return auth.get_user_from_token(credentials.credentials)

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> Optional[Dict[str, Any]]:
    """
    オプショナルな認証用の依存関数
    認証されていない場合はNoneを返す
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

def require_role(required_role: str):
    """
    特定のロールを要求するデコレータ
    
    使用例:
    ```python
    @router.get("/admin")
    async def admin_route(user: Dict = Depends(require_role("admin"))):
        return {"message": "Admin access granted"}
    ```
    """
    async def role_checker(
        user: Dict = Depends(get_current_user)
    ) -> Dict[str, Any]:
        user_role = user.get("role", "")
        
        # ロールチェック（Supabaseのカスタムクレームまたはプロファイルテーブルから）
        if user_role != required_role:
            # プロファイルテーブルからロールを確認
            supabase = get_supabase_client()
            result = supabase.table("profiles").select("role").eq("id", user["id"]).single().execute()
            
            if not result.data or result.data.get("role") != required_role:
                raise HTTPException(
                    status_code=403,
                    detail=f"Required role: {required_role}"
                )
        
        return user
    
    return role_checker

# Legacy compatibility - 既存のコードとの互換性のため
def verify_token(token: str) -> Dict[str, Any]:
    """
    レガシー互換性のためのトークン検証関数
    
    Args:
        token: Bearer tokenまたはJWTトークン
        
    Returns:
        ユーザー情報
        
    Raises:
        HTTPException: 認証失敗時
    """
    # "Bearer " プレフィックスを削除
    if token.startswith("Bearer "):
        token = token[7:]
    
    return auth.get_user_from_token(token)
