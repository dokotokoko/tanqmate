# main.py - メインアプリケーションのAPIエンドポイント

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import uvicorn
import logging
import os
from dotenv import load_dotenv

# 環境設定読み込み
load_dotenv()

# ルーターインポート
from routers.auth_router import router as auth_router
from routers.chat_router import router as chat_router
from routers.project_router import router as project_router
from routers.memo_router import router as memo_router
from routers.quest_router import router as quest_router, user_quest_router
from routers.admin_router import router as admin_router
from routers.theme_router import router as theme_router
from routers.conversation_agent_router import router as conversation_agent_router
from routers.conversations_router import router as conversations_router
from routers.metrics_router import router as metrics_router, debug_router
from routers.vibes_tanq_router import router as vibes_tanq_router
from routers.migration_router import router as migration_router

# LLMクライアントをインポート
from module.llm_api import get_async_llm_client

# Supabase認証ミドルウェアをインポート
from middleware.supabase_auth import SupabaseAuthMiddleware
from services.base import ServiceManager

# 既存のAPIルーターもインポート（段階移行のため）
from inquiry_api import router as inquiry_router
from conversation_api import (
    ConversationManager,
    ConversationCreate,
    ConversationUpdate,
    ConversationResponse,
    ConversationListResponse,
    MessageResponse
)

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPIアプリケーション初期化
app = FastAPI(
    title="探Qメイト API (リファクタリング版)",
    version="2.0.0",
    description="AI探究学習支援アプリケーションのバックエンドAPI（クラスベース設計版）"
)

# Supabaseクライアント初期化とサービスマネージャー
def get_supabase_client():
    from supabase import create_client
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_secret_key = os.environ.get("SUPABASE_SECRET_KEY")
    if supabase_url and supabase_secret_key:
        return create_client(supabase_url, supabase_secret_key)
    return None

# サービスマネージャーの初期化
try:
    supabase_client = get_supabase_client()
    if supabase_client:
        service_manager = ServiceManager(supabase_client)
        logger.info("✅ Supabase client and service manager initialized")
    else:
        service_manager = None
        logger.warning("⚠️ Supabase client not initialized - some features may be limited")
except Exception as e:
    logger.error(f"❌ Failed to initialize Supabase client: {e}")
    service_manager = None

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://dev.tanqmates.local.test",
        "http://dev.tanqmates.local.test"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip圧縮
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Supabase認証ミドルウェアを追加（設定可能な場合のみ）
if service_manager:
    try:
        # 認証をスキップするパス
        excluded_paths = [
            "/",
            "/health",
            "/auth/verify-school-code",
            "/docs",
            "/openapi.json",
            "/redoc"
        ]
        
        supabase_auth_middleware = SupabaseAuthMiddleware(
            app=app,
            service_manager=service_manager,
            excluded_paths=excluded_paths,
            rate_limit_per_minute=60,
            cache_ttl=1800
        )
        
        app.add_middleware(SupabaseAuthMiddleware, 
                          service_manager=service_manager,
                          excluded_paths=excluded_paths)
        
        logger.info("✅ Supabase Auth Middleware added")
    except Exception as e:
        logger.warning(f"⚠️ Failed to add Supabase Auth Middleware: {e}")
else:
    logger.warning("⚠️ Supabase Auth Middleware not added - service manager unavailable")

# ルーター登録
app.include_router(auth_router)           # 認証関連
app.include_router(chat_router)           # チャット関連
app.include_router(project_router)        # プロジェクト関連
app.include_router(memo_router)           # メモ管理関連
app.include_router(quest_router)          # クエストシステム関連
app.include_router(user_quest_router)     # ユーザークエスト関連
app.include_router(admin_router)          # 管理機能関連
app.include_router(theme_router)          # テーマ探究ツール関連
app.include_router(conversation_agent_router)  # 会話エージェント関連
app.include_router(conversations_router)  # 会話管理関連
app.include_router(metrics_router)        # メトリクス関連
app.include_router(debug_router)          # デバッグ関連
app.include_router(vibes_tanq_router)     # Vibes Tanq関連
app.include_router(migration_router)      # データ移行関連（Supabase認証必須）
app.include_router(inquiry_router)        # 探究学習API（既存）

# 基本エンドポイント
@app.get("/")
async def root():
    """API ルート"""
    return {
        "message": "探Qメイト API (リファクタリング版)",
        "version": "2.0.0",
        "architecture": "クラスベース設計",
        "services": [
            "AuthService - 認証・ユーザー管理",
            "ChatService - チャット・対話管理",
            "ConversationService - 会話管理",
            "ProjectService - プロジェクト管理",
            "MemoService - メモ管理",
            "QuestService - クエストシステム",
            "AdminService - 管理機能・メトリクス",
            "ThemeService - テーマ探究ツール",
            "SupabaseAuthService - Supabase認証管理"
        ],
        "migration_status": "Phase 2 Complete - Full Service Architecture + Supabase Integration"
    }

@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    return {"status": "healthy", "version": "2.0.0"}

# アプリケーション起動イベント
@app.on_event("startup")
async def startup_event():
    """アプリケーション起動時の初期化"""
    logger.info("🚀 探Qメイト API (リファクタリング版) を起動中...")
    
    # LLM同時実行制御の初期化（初回pool_sizeのみ有効なため、起動時に確定させる）
    try:
        pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
        get_async_llm_client(pool_size=pool_size)
        logger.info(f"✅ 非同期LLMクライアント初期化完了（LLM_POOL_SIZE={pool_size}）")
    except Exception as e:
        # 起動は継続（チャット処理側でフォールバック/例外処理を行う）
        logger.warning(f"⚠️ 非同期LLMクライアント初期化に失敗（起動は継続）: {e}")
    
    logger.info("✅ サービスクラスベース設計で初期化完了")

@app.on_event("shutdown") 
async def shutdown_event():
    """アプリケーション終了時のクリーンアップ"""
    logger.info("🛑 探Qメイト API を終了中...")

if __name__ == "__main__":
    # 開発用サーバー起動
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        reload=True,  # 開発モードではリロード有効
        log_level="info"
    )
