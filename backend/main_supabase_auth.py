"""
Supabase Auth統合版のmain.py
既存のエンドポイントを新しい認証システムで保護
"""
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import sys
import os
import logging
from datetime import datetime
import asyncio
import uvicorn
from dotenv import load_dotenv

# .envファイルを読み込み
load_dotenv()

# プロジェクトルートをPythonパスに追加
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Supabase Auth統合
from auth import (
    auth_router,
    get_current_user,
    AuthUser,
    get_supabase_client
)

from module.llm_api import learning_plannner
from prompt.prompt import system_prompt, dev_system_prompt

# 探究学習APIルーターのインポート
from inquiry_api import router as inquiry_router

# ロギング設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="探Qメイト API (Supabase Auth版)",
    description="Supabase Authを統合した探究学習支援アプリケーションAPI",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 認証ルーターを登録
app.include_router(auth_router)

# 探究学習APIルーターを登録（認証付き）
app.include_router(inquiry_router)

# 静的ファイル提供
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

# パフォーマンス最適化ミドルウェア
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:80",
        os.getenv("FRONTEND_URL", "http://localhost:3000")
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# リクエスト/レスポンスモデル
class ChatMessage(BaseModel):
    message: str
    page: Optional[str] = "general"
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    user_id: str
    timestamp: str

class ProjectResponse(BaseModel):
    id: str
    name: str
    created_at: str
    user_id: str

class MemoResponse(BaseModel):
    id: str
    project_id: str
    title: str
    content: Optional[str] = ""
    order: int
    created_at: str
    updated_at: str

@app.get("/")
async def root():
    """ヘルスチェックエンドポイント"""
    return {
        "message": "探Qメイト API (Supabase Auth版)",
        "status": "running",
        "version": "2.0.0",
        "auth": "Supabase Auth enabled"
    }

@app.get("/health")
async def health_check():
    """nginx用ヘルスチェック"""
    return {"status": "healthy", "message": "OK"}

@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(
    chat_data: ChatMessage,
    current_user: AuthUser = Depends(get_current_user)
):
    """
    AIとのチャット（認証必須）
    Supabase Authで保護されたエンドポイント
    """
    try:
        # Supabaseクライアントを取得
        supabase = get_supabase_client()
        
        # チャット履歴の取得（オプション）
        history_result = await supabase.table("chat_logs")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .eq("page", chat_data.page)\
            .order("created_at", desc=True)\
            .limit(10)\
            .execute()
        
        chat_history = history_result.data if history_result else []
        
        # LLM APIを呼び出し（既存の処理を使用）
        # ここでは簡単な例を示します
        ai_response = f"ユーザー {current_user.email} さん、メッセージを受け取りました: {chat_data.message}"
        
        # チャットログを保存
        log_data = {
            "user_id": current_user.id,
            "page": chat_data.page,
            "sender": "user",
            "message": chat_data.message,
            "created_at": datetime.utcnow().isoformat()
        }
        await supabase.table("chat_logs").insert(log_data).execute()
        
        # AI応答も保存
        ai_log_data = {
            "user_id": current_user.id,
            "page": chat_data.page,
            "sender": "ai",
            "message": ai_response,
            "created_at": datetime.utcnow().isoformat()
        }
        await supabase.table("chat_logs").insert(ai_log_data).execute()
        
        return ChatResponse(
            response=ai_response,
            user_id=current_user.id,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"チャット処理エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"チャット処理中にエラーが発生しました: {str(e)}"
        )

@app.get("/projects", response_model=List[ProjectResponse])
async def get_user_projects(
    current_user: AuthUser = Depends(get_current_user)
):
    """
    ユーザーのプロジェクト一覧を取得（認証必須）
    """
    try:
        supabase = get_supabase_client()
        
        result = await supabase.table("projects")\
            .select("*")\
            .eq("user_id", current_user.id)\
            .order("created_at", desc=True)\
            .execute()
        
        projects = []
        for project in result.data:
            projects.append(ProjectResponse(
                id=project["id"],
                name=project["name"],
                created_at=project["created_at"],
                user_id=project["user_id"]
            ))
        
        return projects
        
    except Exception as e:
        logger.error(f"プロジェクト取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="プロジェクトの取得に失敗しました"
        )

@app.get("/projects/{project_id}/memos", response_model=List[MemoResponse])
async def get_project_memos(
    project_id: str,
    current_user: AuthUser = Depends(get_current_user)
):
    """
    プロジェクトのメモ一覧を取得（認証必須）
    """
    try:
        supabase = get_supabase_client()
        
        # プロジェクトの所有者確認
        project_result = await supabase.table("projects")\
            .select("user_id")\
            .eq("id", project_id)\
            .single()\
            .execute()
        
        if not project_result.data or project_result.data["user_id"] != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="このプロジェクトへのアクセス権限がありません"
            )
        
        # メモを取得
        result = await supabase.table("memos")\
            .select("*")\
            .eq("project_id", project_id)\
            .order("order")\
            .execute()
        
        memos = []
        for memo in result.data:
            memos.append(MemoResponse(
                id=memo["id"],
                project_id=memo["project_id"],
                title=memo["title"],
                content=memo.get("content", ""),
                order=memo["order"],
                created_at=memo["created_at"],
                updated_at=memo["updated_at"]
            ))
        
        return memos
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"メモ取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="メモの取得に失敗しました"
        )

@app.post("/projects", response_model=ProjectResponse)
async def create_project(
    name: str,
    current_user: AuthUser = Depends(get_current_user)
):
    """
    新しいプロジェクトを作成（認証必須）
    """
    try:
        supabase = get_supabase_client()
        
        project_data = {
            "name": name,
            "user_id": current_user.id,
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = await supabase.table("projects")\
            .insert(project_data)\
            .execute()
        
        if result.data:
            project = result.data[0]
            return ProjectResponse(
                id=project["id"],
                name=project["name"],
                created_at=project["created_at"],
                user_id=project["user_id"]
            )
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="プロジェクトの作成に失敗しました"
        )
        
    except Exception as e:
        logger.error(f"プロジェクト作成エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"プロジェクトの作成に失敗しました: {str(e)}"
        )

# オプション: 管理者専用エンドポイント
from auth import require_admin

@app.get("/admin/users", dependencies=[Depends(require_admin)])
async def get_all_users(
    current_user: AuthUser = Depends(get_current_user)
):
    """
    全ユーザー一覧を取得（管理者のみ）
    """
    try:
        supabase = get_supabase_client()
        
        # 管理者権限でユーザー一覧を取得
        result = await supabase.auth.admin.list_users()
        
        users = []
        for user in result.users:
            users.append({
                "id": user.id,
                "email": user.email,
                "created_at": user.created_at,
                "last_sign_in_at": user.last_sign_in_at
            })
        
        return {"users": users, "total": len(users)}
        
    except Exception as e:
        logger.error(f"ユーザー一覧取得エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="ユーザー一覧の取得に失敗しました"
        )

if __name__ == "__main__":
    # サーバー起動
    uvicorn.run(
        "main_supabase_auth:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )