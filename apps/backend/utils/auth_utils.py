# backend/utils/auth_utils.py - 認証ユーティリティ

import re
import jwt
import logging
from typing import Optional, Dict, Any, Union, Tuple
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
import os

logger = logging.getLogger(__name__)

class AuthUtils:
    """認証に関するユーティリティクラス"""
    
    # Supabase JWTの標準的な形式パターン（Base64URLエンコードされた3つのセクション）
    JWT_PATTERN = re.compile(r'^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$')
    
    # 既存JWTの最小長（通常数百文字以上）
    MIN_JWT_LENGTH = 100
    
    @classmethod
    def detect_token_type(cls, token: str) -> str:
        """
        トークンの形式を判別してSupabaseか既存JWTかを返す
        
        Args:
            token: 検証するトークン
            
        Returns:
            "supabase" or "legacy" or "invalid"
        """
        if not token or not isinstance(token, str):
            return "invalid"
        
        # 基本的な形式チェック
        if len(token) < cls.MIN_JWT_LENGTH or not cls.JWT_PATTERN.match(token):
            return "invalid"
        
        try:
            # JWTヘッダーをデコードして issuer を確認
            header = jwt.get_unverified_header(token)
            
            # Supabaseの場合、通常 typ は "JWT"、alg は "HS256" または "RS256"
            if header.get("alg") in ["HS256", "RS256"]:
                # ペイロードの iss (issuer) を確認
                payload = jwt.decode(token, options={"verify_signature": False})
                issuer = payload.get("iss", "")
                
                # Supabaseの発行者パターンを確認
                if "supabase" in issuer.lower() or issuer.startswith("https://"):
                    return "supabase"
                    
                # カスタムフィールドでSupabaseを判別
                if payload.get("aud") == "authenticated" or payload.get("role"):
                    return "supabase"
                    
                # 既存システムの判別
                if payload.get("token_type") == "access" and payload.get("user_id"):
                    return "legacy"
            
            # デフォルトは既存システムとして扱う
            return "legacy"
            
        except Exception as e:
            logger.warning(f"Token type detection failed: {e}")
            return "invalid"
    
    @classmethod
    def extract_bearer_token(cls, credentials: HTTPAuthorizationCredentials) -> Optional[str]:
        """
        Authorization ヘッダーからBearerトークンを抽出
        
        Args:
            credentials: FastAPIのHTTPAuthorizationCredentials
            
        Returns:
            抽出されたトークン文字列、または None
        """
        if not credentials or credentials.scheme.lower() != "bearer":
            return None
        
        token = credentials.credentials
        if not token or len(token.strip()) == 0:
            return None
            
        return token.strip()
    
    @classmethod
    def parse_authorization_header(cls, auth_header: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Authorizationヘッダーを解析してスキームとトークンを分離
        
        Args:
            auth_header: "Bearer <token>" 形式の文字列
            
        Returns:
            Tuple[scheme, token] または (None, None)
        """
        if not auth_header or not isinstance(auth_header, str):
            return None, None
        
        parts = auth_header.strip().split(" ", 1)
        if len(parts) != 2:
            return None, None
        
        scheme, token = parts
        if scheme.lower() != "bearer":
            return None, None
        
        return scheme, token.strip()
    
    @classmethod
    def validate_token_format(cls, token: str) -> bool:
        """
        トークンの基本的な形式を検証
        
        Args:
            token: 検証するトークン
            
        Returns:
            有効な形式の場合 True
        """
        if not token or not isinstance(token, str):
            return False
        
        # 長さチェック
        if len(token) < cls.MIN_JWT_LENGTH:
            return False
        
        # JWT形式チェック（3つのセクション）
        if not cls.JWT_PATTERN.match(token):
            return False
        
        # 数値のみのトークンを除外
        if token.isdigit():
            return False
        
        return True
    
    @classmethod
    def get_user_id_from_legacy_token(cls, token: str, jwt_secret: str) -> Optional[int]:
        """
        既存システムのJWTトークンからユーザーIDを抽出
        
        Args:
            token: 既存システムのJWTトークン
            jwt_secret: JWT署名検証用の秘密鍵
            
        Returns:
            ユーザーID（整数）、またはNone
        """
        try:
            payload = jwt.decode(token, jwt_secret, algorithms=["HS256"])
            user_id = payload.get("user_id")
            
            if user_id and isinstance(user_id, int):
                return user_id
            
            return None
            
        except jwt.ExpiredSignatureError:
            logger.warning("Legacy token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid legacy token: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error decoding legacy token: {e}")
            return None
    
    @classmethod
    def get_user_id_from_supabase_token(cls, token: str, supabase_jwt_secret: str) -> Optional[str]:
        """
        Supabase JWTトークンからユーザーIDを抽出
        
        Args:
            token: Supabase JWTトークン
            supabase_jwt_secret: Supabase JWT検証用の秘密鍵
            
        Returns:
            Supabase UID（文字列）、またはNone
        """
        try:
            payload = jwt.decode(token, supabase_jwt_secret, algorithms=["HS256"])
            user_id = payload.get("sub")  # Supabaseでは'sub'にユーザーIDが格納される
            
            if user_id and isinstance(user_id, str):
                return user_id
            
            return None
            
        except jwt.ExpiredSignatureError:
            logger.warning("Supabase token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid Supabase token: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error decoding Supabase token: {e}")
            return None
    
    @classmethod
    def convert_legacy_to_supabase_id(cls, legacy_user_id: int, supabase_client) -> Optional[str]:
        """
        既存ユーザーIDをSupabase UIDに変換
        
        Args:
            legacy_user_id: 既存システムのユーザーID（整数）
            supabase_client: Supabaseクライアント
            
        Returns:
            対応するSupabase UID、またはNone
        """
        try:
            # マッピングテーブルから検索
            result = supabase_client.table("user_id_mapping")\
                .select("supabase_uid")\
                .eq("legacy_user_id", legacy_user_id)\
                .execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]["supabase_uid"]
            
            return None
            
        except Exception as e:
            logger.error(f"Error converting legacy ID to Supabase UID: {e}")
            return None
    
    @classmethod
    def convert_supabase_to_legacy_id(cls, supabase_uid: str, supabase_client) -> Optional[int]:
        """
        Supabase UIDを既存ユーザーIDに変換
        
        Args:
            supabase_uid: Supabase UID（文字列）
            supabase_client: Supabaseクライアント
            
        Returns:
            対応する既存ユーザーID（整数）、またはNone
        """
        try:
            # マッピングテーブルから検索
            result = supabase_client.table("user_id_mapping")\
                .select("legacy_user_id")\
                .eq("supabase_uid", supabase_uid)\
                .execute()
            
            if result.data and len(result.data) > 0:
                return result.data[0]["legacy_user_id"]
            
            return None
            
        except Exception as e:
            logger.error(f"Error converting Supabase UID to legacy ID: {e}")
            return None
    
    @classmethod
    def validate_and_extract_user_info(cls, credentials: HTTPAuthorizationCredentials) -> Dict[str, Any]:
        """
        認証情報を検証してユーザー情報を抽出する統合メソッド
        
        Args:
            credentials: FastAPIのHTTPAuthorizationCredentials
            
        Returns:
            {
                "token_type": "supabase" | "legacy",
                "user_id": Union[str, int],
                "token": str,
                "valid": bool
            }
        """
        result = {
            "token_type": None,
            "user_id": None,
            "token": None,
            "valid": False
        }
        
        try:
            # トークン抽出
            token = cls.extract_bearer_token(credentials)
            if not token:
                return result
            
            result["token"] = token
            
            # 形式チェック
            if not cls.validate_token_format(token):
                return result
            
            # トークンタイプ判別
            token_type = cls.detect_token_type(token)
            if token_type == "invalid":
                return result
            
            result["token_type"] = token_type
            
            # 環境変数から秘密鍵を取得
            if token_type == "supabase":
                supabase_secret = os.environ.get("SUPABASE_JWT_SECRET")
                if supabase_secret:
                    user_id = cls.get_user_id_from_supabase_token(token, supabase_secret)
                    if user_id:
                        result["user_id"] = user_id
                        result["valid"] = True
            
            elif token_type == "legacy":
                jwt_secret = os.environ.get("JWT_SECRET_KEY")
                if jwt_secret:
                    user_id = cls.get_user_id_from_legacy_token(token, jwt_secret)
                    if user_id:
                        result["user_id"] = user_id
                        result["valid"] = True
            
            return result
            
        except Exception as e:
            logger.error(f"Error validating and extracting user info: {e}")
            return result
    
    @classmethod
    def sanitize_user_data(cls, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        ユーザーデータから機密情報を除去
        
        Args:
            user_data: サニタイズ対象のユーザーデータ
            
        Returns:
            機密情報を除去したユーザーデータ
        """
        # 除去する機密フィールド
        sensitive_fields = {
            "password", "password_hash", "token", "refresh_token", 
            "secret_key", "private_key", "api_key", "session_token"
        }
        
        # 安全なフィールドのみをコピー
        safe_data = {}
        for key, value in user_data.items():
            if key.lower() not in sensitive_fields:
                safe_data[key] = value
        
        return safe_data
    
    @classmethod
    def generate_error_response(cls, message: str, status_code: int = 401) -> HTTPException:
        """
        認証関連の標準化されたエラーレスポンスを生成
        
        Args:
            message: エラーメッセージ
            status_code: HTTPステータスコード（デフォルト401）
            
        Returns:
            FastAPIのHTTPException
        """
        return HTTPException(status_code=status_code, detail=message)