"""
Supabase認証ユーティリティ
Supabase JWTトークンの検証と認証を処理
"""

import os
import jwt
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from functools import lru_cache
import httpx

# 環境変数から設定を取得
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")
SUPABASE_JWT_SECRET = os.environ.get("SUPABASE_JWT_SECRET", SUPABASE_SECRET_KEY)

# HTTPBearer認証スキーム
security = HTTPBearer()

@lru_cache()
def get_supabase_client() -> Client:
    """Supabaseクライアントのシングルトンを取得"""
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise ValueError("Supabase environment variables not configured")
    
    return create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)

class SupabaseAuth:
    """Supabase認証クラス"""
    
    def __init__(self):
        self.supabase = get_supabase_client()
        self.jwt_secret = SUPABASE_JWT_SECRET
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """
        JWTトークンを検証して、ペイロードを返す
        
        Args:
            token: JWTトークン文字列
            
        Returns:
            デコードされたトークンペイロード
            
        Raises:
            HTTPException: トークンが無効な場合
        """
        try:
            # JWTトークンをデコード
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=["HS256"],
                options={"verify_aud": False}  # Supabaseのデフォルト設定
            )
            
            # 有効期限をチェック
            exp = payload.get("exp")
            if exp:
                exp_datetime = datetime.fromtimestamp(exp, tz=timezone.utc)
                if exp_datetime < datetime.now(timezone.utc):
                    raise HTTPException(
                        status_code=401,
                        detail="Token has expired"
                    )
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=401,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=401,
                detail=f"Invalid token: {str(e)}"
            )
    
    async def verify_user_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Supabase APIを使用してユーザートークンを検証
        
        Args:
            token: アクセストークン
            
        Returns:
            ユーザー情報、または無効な場合はNone
        """
        try:
            # Supabase Admin APIを使用してユーザー情報を取得
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{SUPABASE_URL}/auth/v1/user",
                    headers={
                        "Authorization": f"Bearer {token}",
                        "apikey": SUPABASE_SECRET_KEY
                    }
                )
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 401:
                    return None
                else:
                    print(f"Unexpected status code: {response.status_code}")
                    return None
                    
        except Exception as e:
            print(f"Error verifying user token: {e}")
            return None
    
    def get_user_from_token(self, token: str) -> Dict[str, Any]:
        """
        トークンからユーザー情報を取得（JWT検証のみ）
        
        Args:
            token: JWTトークン
            
        Returns:
            ユーザー情報を含む辞書
        """
        payload = self.verify_jwt_token(token)
        
        # Supabaseのトークンペイロードからユーザー情報を抽出
        user_info = {
            "id": payload.get("sub"),  # Supabase user ID
            "email": payload.get("email"),
            "role": payload.get("role", "authenticated"),
            "app_metadata": payload.get("app_metadata", {}),
            "user_metadata": payload.get("user_metadata", {}),
        }
        
        return user_info

# シングルトンインスタンス
auth = SupabaseAuth()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security)
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
    token = credentials.credentials
    
    # まずJWT検証を試みる（高速）
    try:
        user = auth.get_user_from_token(token)
        return user
    except HTTPException:
        # JWT検証が失敗した場合、Supabase APIで確認（低速だが確実）
        user_data = await auth.verify_user_token(token)
        if user_data:
            return user_data
        
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials"
        )

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