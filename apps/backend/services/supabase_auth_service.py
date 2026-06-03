# backend/services/supabase_auth_service.py - Supabase認証サービス

from typing import Dict, Any, Optional, List
from fastapi import HTTPException, status
import logging
import os
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from supabase import Client
from .base import CacheableService
from utils.supabase_config import create_supabase_admin_client, get_supabase_service_key, get_supabase_url
import json
import hashlib

logger = logging.getLogger(__name__)

class SupabaseAuthService(CacheableService):
    """
    Supabase Admin SDKを使用した認証・ユーザー管理サービス
    """
    
    def __init__(self, supabase_client, user_id: Optional[str] = None):
        super().__init__(supabase_client, user_id)
        
        # Supabase認証設定
        self.supabase_url = get_supabase_url()
        self.secret_key = get_supabase_service_key()
        
        if not all([self.supabase_url, self.secret_key]):
            raise ValueError("SUPABASE_URL and SUPABASE_SECRET_KEY must be set")
        
        # Admin権限を持つSupabaseクライアントの初期化
        try:
            # Secret Keyを使用してAdmin権限のクライアントを作成
            self.admin_client = create_supabase_admin_client()
        except Exception as e:
            logger.error(f"Failed to initialize Supabase Admin Client: {e}")
            self.admin_client = None
        
        # キャッシュTTL設定
        self.user_cache_ttl = 600  # 10分
        self.session_cache_ttl = 1800  # 30分
    
    def get_service_name(self) -> str:
        return "SupabaseAuthService"
    
    async def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Supabase JWTトークンを検証してユーザー情報を取得
        Supabase-pyクライアントを使用してトークンを検証
        
        Args:
            token: Supabase JWTトークン
            
        Returns:
            ユーザー情報辞書、または None
        """
        try:
            # キャッシュから確認
            cache_key = f"supabase_token_{hashlib.md5(token.encode()).hexdigest()}"
            cached_user = self.get_cached_result(cache_key)
            
            if cached_user:
                logger.debug(f"Using cached user data for token verification")
                return cached_user['data']
            
            # Supabaseクライアントを使用してトークンからユーザー情報を取得
            if not self.admin_client:
                logger.error("Admin client not initialized")
                return None
            
            try:
                # トークンを使用してユーザー情報を取得
                # Admin APIを使用してトークンのユーザーを確認
                response = self.admin_client.auth.get_user(token)
                
                if not response or not response.user:
                    logger.warning("Token verification failed: no user found")
                    return None
                
                user = response.user
                user_info = {
                    "id": user.id,
                    "email": user.email,
                    "user_metadata": user.user_metadata or {},
                    "app_metadata": user.app_metadata or {},
                    "role": user.user_metadata.get("role", "student") if user.user_metadata else "student",
                    "created_at": user.created_at if user.created_at else None,
                    "updated_at": user.updated_at if user.updated_at else None,
                    "last_sign_in_at": user.last_sign_in_at if user.last_sign_in_at else None,
                    "confirmed_at": user.confirmed_at if user.confirmed_at else None
                }
                
                # キャッシュに保存
                self.set_cached_result(cache_key, user_info, ttl=self.session_cache_ttl)
                
                return user_info
                
            except Exception as api_error:
                # APIエラーの詳細をログに記録
                error_message = str(api_error)
                if "expired" in error_message.lower():
                    logger.warning("Supabase token expired")
                elif "invalid" in error_message.lower() or "malformed" in error_message.lower():
                    logger.warning(f"Invalid Supabase token: {error_message}")
                else:
                    logger.error(f"Token verification API call failed: {error_message}")
                return None
            
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        ユーザーIDでSupabaseユーザー情報を取得
        
        Args:
            user_id: Supabase UID
            
        Returns:
            ユーザー情報辞書
        """
        try:
            # キャッシュから確認
            cache_key = f"supabase_user_{user_id}"
            cached_user = self.get_cached_result(cache_key)
            
            if cached_user:
                return cached_user['data']
            
            if not self.admin_client:
                logger.error("Admin client not initialized")
                return None
            
            # Admin権限でユーザー情報を取得
            try:
                # auth.admin.get_user_by_id を使用
                response = self.admin_client.auth.admin.get_user_by_id(user_id)
                if not response or not response.user:
                    return None
                
                user = response.user
                user_info = {
                    "id": user.id,
                    "email": user.email,
                    "user_metadata": user.user_metadata or {},
                    "app_metadata": user.app_metadata or {},
                    "created_at": user.created_at if user.created_at else None,
                    "updated_at": user.updated_at if user.updated_at else None,
                    "last_sign_in_at": user.last_sign_in_at if user.last_sign_in_at else None,
                    "confirmed_at": user.confirmed_at if user.confirmed_at else None
                }
                
                # キャッシュに保存
                self.set_cached_result(cache_key, user_info, ttl=self.user_cache_ttl)
                
                return user_info
                
            except Exception as api_error:
                logger.error(f"Admin API call failed: {api_error}")
                return None
            
        except Exception as e:
            logger.error(f"Failed to get user by ID: {e}")
            return None
    
    async def create_user(
        self,
        email: str,
        password: str,
        user_metadata: Optional[Dict[str, Any]] = None,
        app_metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        新しいSupabaseユーザーを作成
        
        Args:
            email: メールアドレス
            password: パスワード
            user_metadata: ユーザーメタデータ
            app_metadata: アプリケーションメタデータ
            
        Returns:
            作成されたユーザー情報
        """
        try:
            if not self.admin_client:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Authentication service unavailable"
                )
            
            # ユーザー作成
            response = self.admin_client.auth.admin.create_user({
                "email": email,
                "password": password,
                "user_metadata": user_metadata or {},
                "app_metadata": app_metadata or {},
                "email_confirm": True  # 自動確認
            })
            
            if not response or not response.user:
                return None
            
            user = response.user
            user_info = {
                "id": user.id,
                "email": user.email,
                "user_metadata": user.user_metadata or {},
                "app_metadata": user.app_metadata or {},
                "created_at": user.created_at if user.created_at else None
            }
            
            # キャッシュに保存
            cache_key = f"supabase_user_{user.id}"
            self.set_cached_result(cache_key, user_info, ttl=self.user_cache_ttl)
            
            logger.info(f"Created Supabase user: {user.id}")
            return user_info
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            if "email" in str(e).lower() and "unique" in str(e).lower():
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Email already exists"
                )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User creation failed"
            )
    
    async def update_user(
        self,
        user_id: str,
        email: Optional[str] = None,
        password: Optional[str] = None,
        user_metadata: Optional[Dict[str, Any]] = None,
        app_metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Supabaseユーザー情報を更新
        
        Args:
            user_id: ユーザーID
            email: 新しいメールアドレス
            password: 新しいパスワード
            user_metadata: 更新するユーザーメタデータ
            app_metadata: 更新するアプリケーションメタデータ
            
        Returns:
            更新されたユーザー情報
        """
        try:
            if not self.admin_client:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Authentication service unavailable"
                )
            
            # 更新データの構築
            update_data = {}
            if email:
                update_data["email"] = email
            if password:
                update_data["password"] = password
            if user_metadata is not None:
                update_data["user_metadata"] = user_metadata
            if app_metadata is not None:
                update_data["app_metadata"] = app_metadata
            
            if not update_data:
                current_user = await self.get_user_by_id(user_id)
                return current_user
            
            # ユーザー更新
            response = self.admin_client.auth.admin.update_user_by_id(user_id, update_data)
            
            if not response or not response.user:
                return None
            
            user = response.user
            user_info = {
                "id": user.id,
                "email": user.email,
                "user_metadata": user.user_metadata or {},
                "app_metadata": user.app_metadata or {},
                "updated_at": user.updated_at if user.updated_at else None
            }
            
            # キャッシュを更新
            cache_key = f"supabase_user_{user_id}"
            self.set_cached_result(cache_key, user_info, ttl=self.user_cache_ttl)
            
            logger.info(f"Updated Supabase user: {user_id}")
            return user_info
            
        except Exception as e:
            logger.error(f"Failed to update user: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User update failed"
            )
    
    async def delete_user(self, user_id: str) -> bool:
        """
        Supabaseユーザーを削除
        
        Args:
            user_id: 削除対象のユーザーID
            
        Returns:
            削除成功時True
        """
        try:
            if not self.admin_client:
                return False
            
            # ユーザー削除
            result = self.admin_client.auth.admin.delete_user(user_id)
            
            # キャッシュから削除
            cache_key = f"supabase_user_{user_id}"
            if cache_key in self._cache:
                del self._cache[cache_key]
            
            logger.info(f"Deleted Supabase user: {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete user: {e}")
            return False
    
    async def search_users(
        self,
        query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        ユーザーを検索
        
        Args:
            query: 検索クエリ（メールアドレスなど）
            limit: 取得上限
            offset: オフセット
            
        Returns:
            ユーザー情報のリスト
        """
        try:
            if not self.admin_client:
                return []
            
            # Admin APIでユーザー一覧を取得
            response = self.admin_client.auth.admin.list_users(page=offset // limit + 1, per_page=limit)
            users = response.users if response else []
            
            if not users:
                return []
            
            user_list = []
            for user in users:
                user_info = {
                    "id": user.id,
                    "email": user.email,
                    "user_metadata": user.user_metadata or {},
                    "created_at": user.created_at.isoformat() if user.created_at else None,
                    "last_sign_in_at": user.last_sign_in_at.isoformat() if user.last_sign_in_at else None
                }
                
                # クエリによるフィルタリング
                if query:
                    if query.lower() in (user.email or "").lower():
                        user_list.append(user_info)
                else:
                    user_list.append(user_info)
            
            return user_list
            
        except Exception as e:
            logger.error(f"Failed to search users: {e}")
            return []
    
    async def link_legacy_user(
        self,
        supabase_uid: str,
        legacy_user_id: int,
        legacy_username: str
    ) -> bool:
        """
        SupabaseユーザーIDと既存ユーザーIDを紐付け
        
        Args:
            supabase_uid: Supabase UID
            legacy_user_id: 既存システムのユーザーID
            legacy_username: 既存システムのユーザー名
            
        Returns:
            紐付け成功時True
        """
        try:
            # マッピングテーブルにレコードを挿入
            result = self.supabase.table("user_id_mapping").insert({
                "supabase_uid": supabase_uid,
                "legacy_user_id": legacy_user_id,
                "legacy_username": legacy_username,
                "linked_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
            if result.data:
                logger.info(f"Linked Supabase user {supabase_uid} with legacy user {legacy_user_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to link users: {e}")
            return False
    
    async def get_user_mapping(self, supabase_uid: str) -> Optional[Dict[str, Any]]:
        """
        ユーザーIDマッピング情報を取得
        
        Args:
            supabase_uid: Supabase UID
            
        Returns:
            マッピング情報
        """
        try:
            result = self.supabase.table("user_id_mapping")\
                .select("*")\
                .eq("supabase_uid", supabase_uid)\
                .execute()
            
            if result.data:
                return result.data[0]
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get user mapping: {e}")
            return None
    
    async def manage_session(
        self,
        user_id: str,
        action: str,  # "create", "refresh", "revoke"
        session_data: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        ユーザーセッションの管理
        
        Args:
            user_id: ユーザーID
            action: 実行するアクション
            session_data: セッションデータ
            
        Returns:
            セッション情報
        """
        try:
            if action == "create":
                # 新しいセッションを作成
                session_id = str(uuid.uuid4())
                session_record = {
                    "session_id": session_id,
                    "user_id": user_id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
                    "metadata": session_data or {}
                }
                
                result = self.supabase.table("user_sessions").insert(session_record).execute()
                
                if result.data:
                    return result.data[0]
            
            elif action == "refresh":
                # セッションの期限を延長
                new_expires_at = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
                
                result = self.supabase.table("user_sessions")\
                    .update({"expires_at": new_expires_at})\
                    .eq("user_id", user_id)\
                    .gt("expires_at", datetime.now(timezone.utc).isoformat())\
                    .execute()
                
                return {"refreshed": len(result.data) if result.data else 0}
            
            elif action == "revoke":
                # セッションを無効化
                result = self.supabase.table("user_sessions")\
                    .delete()\
                    .eq("user_id", user_id)\
                    .execute()
                
                return {"revoked": len(result.data) if result.data else 0}
            
            return None
            
        except Exception as e:
            logger.error(f"Session management failed: {e}")
            return None
    
    async def get_user_sessions(self, user_id: str) -> List[Dict[str, Any]]:
        """
        ユーザーのアクティブなセッション一覧を取得
        
        Args:
            user_id: ユーザーID
            
        Returns:
            セッション一覧
        """
        try:
            result = self.supabase.table("user_sessions")\
                .select("*")\
                .eq("user_id", user_id)\
                .gt("expires_at", datetime.now(timezone.utc).isoformat())\
                .order("created_at", desc=True)\
                .execute()
            
            return result.data or []
            
        except Exception as e:
            logger.error(f"Failed to get user sessions: {e}")
            return []
    
    def invalidate_user_cache(self, user_id: str) -> None:
        """ユーザー関連キャッシュを無効化"""
        cache_keys = [key for key in self._cache.keys() if user_id in key]
        for key in cache_keys:
            del self._cache[key]
        logger.debug(f"Invalidated cache for user: {user_id}")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        サービスの健全性確認
        
        Returns:
            ヘルスチェック結果
        """
        try:
            # Admin クライアントの接続確認
            if not self.admin_client:
                return {
                    "status": "unhealthy",
                    "message": "Admin client not initialized",
                    "timestamp": datetime.now(timezone.utc).isoformat()
                }
            
            # 簡単な操作でAPI接続を確認
            try:
                # 存在しないユーザーIDで確認（エラーが返ってくればAPI自体は動作している）
                self.admin_client.auth.admin.get_user_by_id("00000000-0000-0000-0000-000000000000")
            except Exception:
                pass  # 期待されるエラー
            
            return {
                "status": "healthy",
                "message": "Supabase Auth Service operational",
                "cache_size": len(self._cache),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "message": f"Service check failed: {str(e)}",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
