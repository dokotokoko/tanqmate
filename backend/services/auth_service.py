# services/auth_service.py - 認証・ユーザー管理サービス

from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
import bcrypt
import jwt
import os
from datetime import datetime, timedelta, timezone
from .base import BaseService, CacheableService

class AuthService(CacheableService):
    """認証・ユーザー管理を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        self.jwt_secret = os.environ.get("JWT_SECRET", "fallback-secret")
        self.jwt_algorithm = "HS256"
        self.token_expire_hours = 24
    
    def get_service_name(self) -> str:
        return "AuthService"
    
    async def register_user(self, username: str, password: str, email: str) -> Dict[str, Any]:
        """新規ユーザー登録"""
        try:
            # パスワードハッシュ化
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # ユーザー作成
            result = self.supabase.table("users").insert({
                "username": username,
                "password": password_hash,
                # "email": email,
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
            if not result.data:
                raise HTTPException(status_code=400, detail="User creation failed")
            
            user = result.data[0]
            token = self._generate_token(user["id"])
            
            return {
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    # "email": user["email"]
                },
                "token": token
            }
            
        except Exception as e:
            error_result = self.handle_error(e, "User registration")
            if "duplicate key" in str(e).lower():
                raise HTTPException(status_code=409, detail="Username or email already exists")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def login_user(self, username: str, password: str) -> Dict[str, Any]:
        """ユーザーログイン"""
        try:
            # ユーザー検索
            result = self.supabase.table("users")\
                .select("id, username, password")\
                .eq("username", username)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            user = result.data[0]
            stored = user.get("password")

            if not stored:
                raise HTTPException(status_code=401, detail="Invalid credentials")

            # 1) bcryptハッシュっぽいならbcryptで検証
            # bcrypt hash は $2a$ / $2b$ / $2y$ で始まることが多い
            is_bcrypt = isinstance(stored, str) and stored.startswith(("$2a$", "$2b$", "$2y$"))

            if is_bcrypt:
                ok = bcrypt.checkpw(password.encode("utf-8"), stored.encode("utf-8"))
            else:
                # 2) 平文として比較（暫定）
                ok = (stored == password)

            if not ok:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            # JWTトークン生成
            token = self._generate_token(user["id"])
            
            return {
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    #"email": user["email"]
                },
                "token": token
            }
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "User login")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def verify_token(self, credentials: HTTPAuthorizationCredentials) -> int:
        """JWTトークン検証"""
        try:
            # キャッシュからユーザーIDを取得
            cache_key = f"user_token_{credentials.credentials}"
            cached_user_id = self.get_cached_result(cache_key)
            
            if cached_user_id:
                return cached_user_id['data']
            
            # JWTデコード
            payload = jwt.decode(
                credentials.credentials,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm]
            )
            
            user_id = payload.get("user_id")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
            
            # ユーザー存在確認
            result = self.supabase.table("users")\
                .select("id")\
                .eq("id", user_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=401, detail="User not found")
            
            # キャッシュに保存
            self.set_cached_result(cache_key, user_id, ttl=1800)  # 30分
            
            return user_id
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Token verification failed: {e}")
            raise HTTPException(status_code=500, detail="Authentication error")
    
    def get_user_by_id(self, user_id: int) -> Dict[str, Any]:
        """ユーザーIDでユーザー情報取得"""
        try:
            cache_key = f"user_info_{user_id}"
            cached_user = self.get_cached_result(cache_key)
            
            if cached_user:
                return cached_user['data']
            
            result = self.supabase.table("users")\
                .select("id, username, created_at")\
                .eq("id", user_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="User not found")
            
            user_data = result.data[0]
            self.set_cached_result(cache_key, user_data, ttl=600)  # 10分
            
            return user_data
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Get user info")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def _generate_token(self, user_id: int) -> str:
        """JWTトークン生成"""
        payload = {
            "user_id": user_id,
            "exp": datetime.now(timezone.utc) + timedelta(hours=self.token_expire_hours),
            "iat": datetime.now(timezone.utc)
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    def invalidate_user_cache(self, user_id: int) -> None:
        """ユーザー関連キャッシュを無効化"""
        cache_keys = [key for key in self._cache.keys() if f"user_{user_id}" in key]
        for key in cache_keys:
            del self._cache[key]