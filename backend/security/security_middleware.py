# backend/security/security_middleware.py - セキュリティミドルウェア
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send
import re
import jwt
import time
import hashlib
from typing import Dict, List, Optional, Set
import logging
from datetime import datetime, timedelta
import bleach
from html import escape
import secrets
import json

logger = logging.getLogger(__name__)

# セキュリティ設定
class SecurityConfig:
    # JWT設定
    SECRET_KEY = "your-secret-key"  # 環境変数から取得すべき
    ALGORITHM = "HS256"
    TOKEN_EXPIRE_HOURS = 24
    
    # CSRF設定
    CSRF_TOKEN_EXPIRE_HOURS = 1
    
    # レート制限設定
    RATE_LIMIT_REQUESTS = 100
    RATE_LIMIT_WINDOW = 60  # 秒
    
    # XSS対策設定
    ALLOWED_HTML_TAGS = ['b', 'i', 'em', 'strong', 'p', 'br']
    ALLOWED_HTML_ATTRS = {}
    
    # SQLインジェクション対策
    SQL_INJECTION_PATTERNS = [
        r"(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)",
        r"(\-\-|\#|\/\*|\*\/)",
        r"(\bOR\b.*\=.*\=|\bAND\b.*\=.*\=)",
        r"(\'\s*OR\s*\'|\"\s*OR\s*\")",
        r"(\bEXEC\b|\bEXECUTE\b|\bSP_\w+)",
    ]

# JWT認証クラス
class JWTAuth:
    def __init__(self, secret_key: str, algorithm: str = "HS256"):
        self.secret_key = secret_key
        self.algorithm = algorithm
    
    def create_token(self, user_id: int, permissions: List[str] = None) -> str:
        """JWTトークン作成"""
        payload = {
            'user_id': user_id,
            'permissions': permissions or [],
            'exp': datetime.utcnow() + timedelta(hours=SecurityConfig.TOKEN_EXPIRE_HOURS),
            'iat': datetime.utcnow(),
            'jti': secrets.token_hex(16)  # JWT ID
        }
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Dict:
        """JWTトークン検証"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

# CSRF保護クラス
class CSRFProtection:
    def __init__(self):
        self.tokens: Dict[str, Dict] = {}  # 実際の実装ではRedisを使用
    
    def generate_token(self, user_id: int) -> str:
        """CSRFトークン生成"""
        token = secrets.token_hex(32)
        self.tokens[token] = {
            'user_id': user_id,
            'created_at': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(hours=SecurityConfig.CSRF_TOKEN_EXPIRE_HOURS)
        }
        return token
    
    def verify_token(self, token: str, user_id: int) -> bool:
        """CSRFトークン検証"""
        if token not in self.tokens:
            return False
        
        token_data = self.tokens[token]
        if datetime.utcnow() > token_data['expires_at']:
            del self.tokens[token]
            return False
        
        if token_data['user_id'] != user_id:
            return False
        
        return True

# レート制限クラス
class RateLimiter:
    def __init__(self):
        self.requests: Dict[str, List[float]] = {}
    
    def is_allowed(self, identifier: str, max_requests: int = None, window: int = None) -> bool:
        """レート制限チェック"""
        max_requests = max_requests or SecurityConfig.RATE_LIMIT_REQUESTS
        window = window or SecurityConfig.RATE_LIMIT_WINDOW
        
        now = time.time()
        if identifier not in self.requests:
            self.requests[identifier] = []
        
        # 古いリクエストを削除
        self.requests[identifier] = [
            req_time for req_time in self.requests[identifier]
            if now - req_time < window
        ]
        
        # リクエスト数チェック
        if len(self.requests[identifier]) >= max_requests:
            return False
        
        # 新しいリクエストを記録
        self.requests[identifier].append(now)
        return True

# XSS対策クラス
class XSSProtection:
    @staticmethod
    def sanitize_html(text: str) -> str:
        """HTMLサニタイズ"""
        if not text:
            return ""
        
        # HTMLタグの除去・エスケープ
        cleaned = bleach.clean(
            text,
            tags=SecurityConfig.ALLOWED_HTML_TAGS,
            attributes=SecurityConfig.ALLOWED_HTML_ATTRS,
            strip=True
        )
        return cleaned
    
    @staticmethod
    def escape_json_string(text: str) -> str:
        """JSON文字列のエスケープ"""
        if not text:
            return ""
        
        # JavaScript文字列内で危険な文字をエスケープ
        text = text.replace('\\', '\\\\')
        text = text.replace('"', '\\"')
        text = text.replace('\'', '\\\'')
        text = text.replace('\n', '\\n')
        text = text.replace('\r', '\\r')
        text = text.replace('\t', '\\t')
        text = text.replace('<', '\\u003c')
        text = text.replace('>', '\\u003e')
        text = text.replace('&', '\\u0026')
        return text

# SQLインジェクション対策クラス
class SQLInjectionProtection:
    @staticmethod
    def detect_sql_injection(text: str) -> bool:
        """SQLインジェクション攻撃検出"""
        if not text:
            return False
        
        text_upper = text.upper()
        
        for pattern in SecurityConfig.SQL_INJECTION_PATTERNS:
            if re.search(pattern, text_upper, re.IGNORECASE):
                logger.warning(f"Potential SQL injection detected: {text[:100]}...")
                return True
        
        return False
    
    @staticmethod
    def sanitize_input(text: str) -> str:
        """入力データのサニタイズ"""
        if not text:
            return ""
        
        # 危険な文字の除去・エスケープ
        text = text.replace("'", "''")  # シングルクォートのエスケープ
        text = re.sub(r'[;\-\-]', '', text)  # セミコロンとコメントアウトの除去
        return text

# 入力バリデーションクラス
class InputValidator:
    @staticmethod
    def validate_quest_input(data: Dict) -> Dict:
        """クエスト入力データの検証とサニタイズ"""
        validated = {}
        
        # goal フィールド
        if 'goal' in data:
            goal = str(data['goal']).strip()
            
            # XSS対策
            goal = XSSProtection.sanitize_html(goal)
            
            # SQLインジェクション対策
            if SQLInjectionProtection.detect_sql_injection(goal):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid characters in goal"
                )
            
            # 長さチェック
            if len(goal) > 1000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Goal too long"
                )
            
            validated['goal'] = goal
        
        # initial_context フィールド
        if 'initial_context' in data:
            context = str(data['initial_context']).strip()
            context = XSSProtection.sanitize_html(context)
            
            if SQLInjectionProtection.detect_sql_injection(context):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid characters in context"
                )
            
            if len(context) > 2000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Context too long"
                )
            
            validated['initial_context'] = context
        
        return validated
    
    @staticmethod
    def validate_node_input(data: Dict) -> Dict:
        """ノード入力データの検証とサニタイズ"""
        validated = {}
        
        # title フィールド
        if 'title' in data:
            title = str(data['title']).strip()
            title = XSSProtection.sanitize_html(title)
            
            if SQLInjectionProtection.detect_sql_injection(title):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid characters in title"
                )
            
            if len(title) > 500:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Title too long"
                )
            
            validated['title'] = title
        
        # description フィールド
        if 'description' in data:
            description = str(data['description']).strip()
            description = XSSProtection.sanitize_html(description)
            
            if SQLInjectionProtection.detect_sql_injection(description):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid characters in description"
                )
            
            if len(description) > 2000:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Description too long"
                )
            
            validated['description'] = description
        
        return validated

# セキュリティミドルウェア
class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, jwt_auth: JWTAuth, csrf_protection: CSRFProtection, rate_limiter: RateLimiter):
        super().__init__(app)
        self.jwt_auth = jwt_auth
        self.csrf_protection = csrf_protection
        self.rate_limiter = rate_limiter
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # セキュリティヘッダーの設定
        response = await call_next(request)
        
        # セキュリティヘッダーの追加
        self.add_security_headers(response)
        
        # レスポンス時間のログ
        process_time = time.time() - start_time
        logger.info(f"Request processed in {process_time:.3f}s")
        
        return response
    
    def add_security_headers(self, response: Response):
        """セキュリティヘッダーの追加"""
        headers = {
            # XSSProtection
            'X-XSS-Protection': '1; mode=block',
            
            # Content Type Sniffing対策
            'X-Content-Type-Options': 'nosniff',
            
            # Clickjacking対策
            'X-Frame-Options': 'DENY',
            
            # HSTS (HTTPS必須環境でのみ)
            # 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
            
            # CSP
            'Content-Security-Policy': (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' https:; "
                "connect-src 'self' https: wss:;"
            ),
            
            # Referrer Policy
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            
            # Feature Policy
            'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
        }
        
        for header, value in headers.items():
            response.headers[header] = value

# 権限チェッククラス
class PermissionChecker:
    # 権限の定義
    PERMISSIONS = {
        'quest_create': 'クエスト作成',
        'quest_read': 'クエスト読み取り',
        'quest_update': 'クエスト更新',
        'quest_delete': 'クエスト削除',
        'ai_features': 'AI機能利用',
        'admin_access': '管理者機能',
    }
    
    @staticmethod
    def check_permission(user_permissions: List[str], required_permission: str) -> bool:
        """権限チェック"""
        if 'admin_access' in user_permissions:
            return True  # 管理者は全権限を持つ
        
        return required_permission in user_permissions
    
    @staticmethod
    def check_resource_ownership(user_id: int, resource_user_id: int) -> bool:
        """リソースの所有権チェック"""
        return user_id == resource_user_id

# セキュリティユーティリティ関数
def get_client_ip(request: Request) -> str:
    """クライアントIPアドレス取得"""
    # プロキシ経由の場合のヘッダーもチェック
    forwarded_for = request.headers.get('X-Forwarded-For')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    
    real_ip = request.headers.get('X-Real-IP')
    if real_ip:
        return real_ip
    
    return request.client.host if request.client else "unknown"

def hash_password(password: str) -> str:
    """パスワードハッシュ化"""
    import bcrypt
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """パスワード検証"""
    import bcrypt
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# セキュリティミドルウェアの設定関数
def setup_security_middleware(app: FastAPI):
    """セキュリティミドルウェアのセットアップ"""
    
    # CORS設定
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://tanqmates.com",
            "https://www.tanqmates.com",
            "http://localhost:3000",  # 開発環境
            "http://localhost:5173",  # Vite開発サーバー
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-CSRF-Token",
            "X-Requested-With",
        ],
        expose_headers=["X-CSRF-Token"],
    )
    
    # セキュリティインスタンス作成
    jwt_auth = JWTAuth(SecurityConfig.SECRET_KEY)
    csrf_protection = CSRFProtection()
    rate_limiter = RateLimiter()
    
    # セキュリティミドルウェア追加
    app.add_middleware(
        SecurityMiddleware,
        jwt_auth=jwt_auth,
        csrf_protection=csrf_protection,
        rate_limiter=rate_limiter
    )
    
    return jwt_auth, csrf_protection, rate_limiter

# セキュリティデコレーター
def require_permission(permission: str):
    """権限チェックデコレーター"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # リクエストからユーザー情報を取得
            request = kwargs.get('request')
            if not request:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            
            # JWT から権限情報を取得
            auth_header = request.headers.get('Authorization')
            if not auth_header or not auth_header.startswith('Bearer '):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication"
                )
            
            token = auth_header.split(' ')[1]
            jwt_auth = JWTAuth(SecurityConfig.SECRET_KEY)
            payload = jwt_auth.verify_token(token)
            
            user_permissions = payload.get('permissions', [])
            
            if not PermissionChecker.check_permission(user_permissions, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission '{permission}' required"
                )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator