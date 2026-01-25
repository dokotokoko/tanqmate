# services/auth_service.py - 認証・ユーザー管理サービス

from typing import Dict, Any, Optional
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
import bcrypt
import jwt
import os
import secrets
import hashlib
import uuid
import re
from datetime import datetime, timedelta, timezone
from .base import BaseService, CacheableService

class AuthService(CacheableService):
    """認証・ユーザー管理を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        # セキュリティ: パスワードベースの秘密鍵でJWT署名
        self.jwt_secret = os.environ.get("JWT_SECRET_KEY")
        if not self.jwt_secret or len(self.jwt_secret) < 32:
            raise ValueError("JWT_SECRET_KEY must be set and at least 32 characters long")
        self.jwt_algorithm = "HS256"
        self.access_token_expire_minutes = 15  # アクセストークン: 15分
        self.refresh_token_expire_days = 7  # リフレッシュトークン: 7日間
        # セキュリティ: ユーザー名バリデーション
        self.username_pattern = re.compile(r'^[a-zA-Z0-9_-]{3,50}$')
    
    def get_service_name(self) -> str:
        return "AuthService"
    
    async def register_user(self, username: str, password: str) -> Dict[str, Any]:
        """新規ユーザー登録"""
        try:
            # セキュリティ: 入力バリデーション
            if not self._validate_username(username):
                raise HTTPException(status_code=400, detail="Invalid username format")
            if not self._validate_password(password):
                raise HTTPException(status_code=400, detail="Password does not meet security requirements")
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
            user_data = {
                "id": user["id"],
                "username": user["username"]
            }
            access_token = self._generate_access_token(user_data)
            refresh_token = await self._generate_refresh_token(user["id"])
            
            return {
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    # "email": user["email"]
                },
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "Bearer",
                "expires_in": self.access_token_expire_minutes * 60  # 秒単位
            }
            
        except Exception as e:
            error_result = self.handle_error(e, "User registration")
            if "duplicate key" in str(e).lower():
                raise HTTPException(status_code=409, detail="Username already exists")
            sanitized_error = self._sanitize_error_message(str(e), "User registration")
            raise HTTPException(status_code=500, detail=sanitized_error)
    
    async def login_user(self, username: str, password: str) -> Dict[str, Any]:
        """ユーザーログイン"""
        try:
            # セキュリティ: 入力バリデーション
            if not self._validate_username(username):
                raise HTTPException(status_code=401, detail="Invalid credentials")
            if not password or len(password.strip()) == 0:
                raise HTTPException(status_code=401, detail="Invalid credentials")
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
            user_data = {
                "id": user["id"],
                "username": user["username"]
            }
            access_token = self._generate_access_token(user_data)
            refresh_token = await self._generate_refresh_token(user["id"])
            
            return {
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    #"email": user["email"]
                },
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "Bearer",
                "expires_in": self.access_token_expire_minutes * 60  # 秒単位
            }
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "User login")
            sanitized_error = self._sanitize_error_message(str(e), "User login")
            raise HTTPException(status_code=500, detail=sanitized_error)
    
    def verify_token(self, credentials: HTTPAuthorizationCredentials) -> int:
        """JWTトークン検証"""
        try:
            # トークンの詳細デバッグ
            token = credentials.credentials
            self.logger.debug(f"Received token type: {type(token)}, value: {token[:50] if token and len(token) > 50 else token}")
            
            # 空のトークンや不正な形式のチェック
            if not token or not isinstance(token, str):
                self.logger.warning(f"Invalid token format: {token}")
                raise HTTPException(status_code=401, detail="Invalid token format")
            
            # 最小長チェック（JWTは通常数百文字以上）
            if len(token) < 10:
                self.logger.warning(f"Invalid token format - too short: {token}")
                raise HTTPException(status_code=401, detail="Invalid token format")
            
            # 数値のみのトークンを早期検出
            if token.isdigit():
                self.logger.warning(f"Invalid token format - numeric only: {token}")
                raise HTTPException(status_code=401, detail="Invalid token format")
            
            # JWTトークンの基本的な形式チェック（header.payload.signature）
            if token.count('.') != 2:
                self.logger.warning(f"Invalid JWT format - segments: {token.count('.')}, token: {token[:20]}...")
                raise HTTPException(status_code=401, detail="Invalid token format")
            
            # キャッシュからユーザーIDを取得
            cache_key = f"user_token_{token}"
            cached_user_id = self.get_cached_result(cache_key)
            
            if cached_user_id:
                # キャッシュヒット時はデバッグレベル
                self.logger.debug(f"Using cached user_id: {cached_user_id['data']}")
                return cached_user_id['data']
            
            # JWTデコード（初回のみ詳細ログ）
            self.logger.debug(f"Token verification started. Token length: {len(token)}")
            payload = jwt.decode(
                token,
                self.jwt_secret,
                algorithms=[self.jwt_algorithm]
            )
            
            # トークンタイプの確認（アクセストークンのみ許可）
            token_type = payload.get("token_type")
            if token_type != "access":
                self.logger.warning(f"Invalid token type: {token_type}")
                raise HTTPException(status_code=401, detail="Invalid token type")
            
            user_id = payload.get("user_id")
            self.logger.debug(f"Extracted user_id from token: {user_id}")
            
            if not user_id:
                self.logger.warning("No user_id found in token payload")
                raise HTTPException(status_code=401, detail="Invalid token: missing user_id")
            
            # ユーザー存在確認
            result = self.supabase.table("users")\
                .select("id")\
                .eq("id", user_id)\
                .execute()
            
            if not result.data:
                self.logger.warning(f"User not found in database: {user_id}")
                raise HTTPException(status_code=401, detail="User not found")
            
            # キャッシュに保存
            self.set_cached_result(cache_key, user_id, ttl=1800)  # 30分
            self.logger.debug(f"Token verification successful for user: {user_id}")
            
            return user_id
            
        except jwt.ExpiredSignatureError as e:
            self.logger.warning(f"Token expired: {e}")
            raise HTTPException(status_code=401, detail="Token has expired")
        except jwt.InvalidTokenError as e:
            self.logger.warning(f"Invalid token: {e}")
            raise HTTPException(status_code=401, detail="Invalid token format")
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Token verification failed with unexpected error: {e}")
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
    
    def _generate_access_token(self, user_data: Dict[str, Any], jti: Optional[str] = None) -> str:
        """アクセストークン生成（15分有効のJWT）"""
        if jti is None:
            jti = str(uuid.uuid4())
            
        now = datetime.now(timezone.utc)
        payload = {
            "user_id": user_data["id"],
            "username": user_data["username"],
            "token_type": "access",
            "scope": "api:access",
            "jti": jti,
            "exp": now + timedelta(minutes=self.access_token_expire_minutes),
            "iat": now
        }
        
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
    
    async def _generate_refresh_token(self, user_id: int) -> str:
        """リフレッシュトークン生成"""
        # ユーザーの既存トークン数を制限
        await self._limit_user_refresh_tokens(user_id)
        
        # ランダムトークン生成
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        jti = str(uuid.uuid4())
        session_id = str(uuid.uuid4())  # セッションIDを生成
        
        # データベースに保存
        try:
            result = self.supabase.table("refresh_tokens").insert({
                "user_id": user_id,
                "session_id": session_id,  # session_idを追加
                "token_hash": token_hash,
                "jti": jti,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)).isoformat(),
                "client_info": {},
                "is_revoked": False  # 明示的にfalseを設定
            }).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="Failed to create refresh token")
                
            return token
            
        except Exception as e:
            self.logger.error(f"Failed to create refresh token: {e}")
            raise HTTPException(status_code=500, detail="Failed to create refresh token")
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """リフレッシュトークンから新しいアクセストークンとリフレッシュトークンを生成（ローテーション）"""
        try:
            # リフレッシュトークンの検証
            token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
            
            result = self.supabase.table("refresh_tokens")\
                .select("id, user_id, jti, session_id, expires_at, is_revoked")\
                .eq("token_hash", token_hash)\
                .eq("is_revoked", False)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=401, detail="Invalid refresh token")
            
            token_data = result.data[0]
            
            # 期限チェック
            expires_at = datetime.fromisoformat(token_data["expires_at"].replace('Z', '+00:00'))
            if expires_at <= datetime.now(timezone.utc):
                # 期限切れトークンを削除
                await self._revoke_refresh_token(refresh_token)
                raise HTTPException(status_code=401, detail="Refresh token has expired")
            
            # last_used_atを更新
            self.supabase.table("refresh_tokens")\
                .update({"last_used_at": datetime.now(timezone.utc).isoformat()})\
                .eq("id", token_data["id"])\
                .execute()
            
            # 古いリフレッシュトークンを無効化（ローテーション）
            await self._revoke_refresh_token(refresh_token)
            
            # ユーザー情報を取得
            user_id = token_data["user_id"]
            user_info = self.get_user_by_id(user_id)
            user_data = {
                "id": user_info["id"],
                "username": user_info["username"]
            }
            
            # 新しいアクセストークンとリフレッシュトークンを生成
            new_access_token = self._generate_access_token(user_data)
            new_refresh_token = await self._generate_refresh_token(user_id)
            
            return {
                "access_token": new_access_token,
                "refresh_token": new_refresh_token,
                "token_type": "Bearer",
                "expires_in": self.access_token_expire_minutes * 60
            }
            
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Refresh token processing failed: {e}")
            raise HTTPException(status_code=500, detail="Token refresh failed")
    
    async def _revoke_refresh_token(self, refresh_token: str) -> None:
        """リフレッシュトークンを無効化"""
        token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
        
        self.supabase.table("refresh_tokens")\
            .update({"is_revoked": True})\
            .eq("token_hash", token_hash)\
            .execute()
    
    async def logout(self, user_id: int, refresh_token: Optional[str] = None) -> Dict[str, str]:
        """ログアウト処理 - 特定トークンまたは全トークンを無効化"""
        try:
            if refresh_token:
                # 特定のリフレッシュトークンのみ無効化
                await self._revoke_refresh_token(refresh_token)
                self.logger.info(f"Single refresh token revoked for user {user_id}")
                return {"message": "Successfully logged out from this device"}
            else:
                # ユーザーの全リフレッシュトークンを無効化
                await self.revoke_all_user_refresh_tokens(user_id)
                self.invalidate_user_cache(user_id)
                self.logger.info(f"All refresh tokens revoked for user {user_id}")
                return {"message": "Successfully logged out from all devices"}
        except Exception as e:
            self.logger.error(f"Logout failed for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail="Logout failed")
    
    async def revoke_all_user_refresh_tokens(self, user_id: int) -> None:
        """ユーザーの全リフレッシュトークンを無効化"""
        self.supabase.table("refresh_tokens")\
            .update({"is_revoked": True})\
            .eq("user_id", user_id)\
            .execute()
    
    async def _limit_user_refresh_tokens(self, user_id: int, max_tokens: int = 5) -> None:
        """ユーザーのリフレッシュトークン数を制限"""
        try:
            # 現在のアクティブトークンを取得（セッションごと）
            result = self.supabase.table("refresh_tokens")\
                .select("id, session_id, created_at")\
                .eq("user_id", user_id)\
                .eq("is_revoked", False)\
                .gte("expires_at", datetime.now(timezone.utc).isoformat())\
                .order("created_at", desc=True)\
                .execute()
            
            # セッション単位でグループ化
            sessions = {}
            for token in result.data:
                session_id = token["session_id"]
                if session_id not in sessions:
                    sessions[session_id] = token
            
            # セッション数が上限を超えていたら古いセッションのトークンを無効化
            if len(sessions) >= max_tokens:
                # 作成日時でソートして古いセッションを特定
                sorted_sessions = sorted(sessions.values(), key=lambda x: x["created_at"], reverse=True)
                sessions_to_revoke = sorted_sessions[max_tokens-1:]
                
                for session in sessions_to_revoke:
                    # そのセッションのすべてのトークンを無効化
                    self.supabase.table("refresh_tokens")\
                        .update({"is_revoked": True})\
                        .eq("user_id", user_id)\
                        .eq("session_id", session["session_id"])\
                        .execute()
        except Exception as e:
            self.logger.warning(f"Failed to limit refresh tokens: {e}")
    
    def invalidate_user_cache(self, user_id: int) -> None:
        """ユーザー関連キャッシュを無効化"""
        cache_keys = [key for key in self._cache.keys() if f"user_{user_id}" in key]
        for key in cache_keys:
            del self._cache[key]
    
    # Phase1要件のメソッド群
    def generate_access_token(self, user_data: Dict[str, Any]) -> str:
        """15分有効のJWTアクセストークン生成 (外部API用)"""
        return self._generate_access_token(user_data)
    
    def generate_refresh_token(self) -> str:
        """32バイトランダムリフレッシュトークン生成 (外部API用)"""
        return secrets.token_urlsafe(32)
    
    async def store_refresh_token(self, token: str, user_id: int) -> bool:
        """リフレッシュトークンをハッシュ化してDB保存 (外部API用)"""
        try:
            await self._limit_user_refresh_tokens(user_id)
            
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            jti = str(uuid.uuid4())
            
            result = self.supabase.table("refresh_tokens").insert({
                "user_id": user_id,
                "token_hash": token_hash,
                "jti": jti,
                "expires_at": (datetime.now(timezone.utc) + timedelta(days=self.refresh_token_expire_days)).isoformat(),
                "client_info": {}
            }).execute()
            
            return bool(result.data)
            
        except Exception as e:
            self.logger.error(f"Failed to store refresh token: {e}")
            return False
    
    async def validate_refresh_token(self, token: str) -> Optional[Dict[str, Any]]:
        """リフレッシュトークンをDB検証 (外部API用)"""
        try:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            
            result = self.supabase.table("refresh_tokens")\
                .select("user_id, jti, expires_at, is_revoked")\
                .eq("token_hash", token_hash)\
                .eq("is_revoked", False)\
                .execute()
            
            if not result.data:
                return None
                
            token_data = result.data[0]
            
            # 期限チェック
            expires_at = datetime.fromisoformat(token_data["expires_at"].replace('Z', '+00:00'))
            if expires_at <= datetime.now(timezone.utc):
                await self._revoke_refresh_token(token)
                return None
            
            # ユーザー情報を取得
            user_info = self.get_user_by_id(token_data["user_id"])
            return {
                "id": user_info["id"],
                "username": user_info["username"]
            }
            
        except Exception as e:
            self.logger.error(f"Failed to validate refresh token: {e}")
            return None
    
    async def rotate_refresh_token(self, old_token: str) -> Optional[Dict[str, str]]:
        """リフレッシュトークンローテーション (外部API用)"""
        try:
            # 古いトークンを検証
            user_data = await self.validate_refresh_token(old_token)
            if not user_data:
                return None
            
            # 古いトークンを無効化
            await self._revoke_refresh_token(old_token)
            
            # 新しいトークンを生成
            new_access_token = self._generate_access_token(user_data)
            new_refresh_token = await self._generate_refresh_token(user_data["id"])
            
            return {
                "access_token": new_access_token,
                "refresh_token": new_refresh_token
            }
            
        except Exception as e:
            self.logger.error(f"Failed to rotate refresh token: {e}")
            return None
    
    # セキュリティヘルパーメソッド
    def _validate_username(self, username: str) -> bool:
        """ユーザー名バリデーション - SQLi対策"""
        return bool(username and self.username_pattern.match(username))
    
    def _validate_password(self, password: str) -> bool:
        """パスワード強度チェック"""
        if not password or len(password) < 8:
            return False
        # 少なくとも1つの大文字、小文字、数字を含む
        has_upper = any(c.isupper() for c in password)
        has_lower = any(c.islower() for c in password)
        has_digit = any(c.isdigit() for c in password)
        return has_upper and has_lower and has_digit
    
    def _sanitize_error_message(self, error: str, operation: str) -> str:
        """エラーメッセージのサニタイズ - 情報漏洩防止"""
        # データベース関連情報を除去
        if "duplicate key" in error.lower():
            return "Resource already exists"
        elif "connection" in error.lower():
            return "Service temporarily unavailable"
        elif "timeout" in error.lower():
            return "Request timeout"
        else:
            return f"{operation} failed"