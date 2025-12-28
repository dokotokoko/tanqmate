# main_refactored.py - リファクタリング後のメインアプリケーション

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
from routers.quest_router import router as quest_router
from routers.admin_router import router as admin_router
from routers.theme_router import router as theme_router
from routers.conversation_router import router as conversation_router

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

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# GZip圧縮
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ルーター登録
app.include_router(auth_router)           # 認証関連
app.include_router(chat_router)           # チャット関連
app.include_router(conversation_router)   # 会話管理関連
app.include_router(project_router)        # プロジェクト関連
app.include_router(memo_router)           # メモ管理関連
app.include_router(quest_router)          # クエストシステム関連
app.include_router(admin_router)          # 管理機能関連
app.include_router(theme_router)          # テーマ探究ツール関連
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
            "ThemeService - テーマ探究ツール"
        ],
        "migration_status": "Phase 2 Complete - Full Service Architecture"
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