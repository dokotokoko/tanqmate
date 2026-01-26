# routers/chat_router.py - チャット関連ルーター

from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel
from typing import List, Optional
from services.chat_service import ChatService
from services.auth_service import AuthService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client
import time
import os

# ルーター初期化
router = APIRouter(prefix="/chat", tags=["chat"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# レート制限設定
ENABLE_CHAT_RATE_LIMIT = os.environ.get("ENABLE_CHAT_RATE_LIMIT", "true").lower() == "true"
RATE_LIMIT_WINDOW_SEC = int(os.environ.get("CHAT_RATE_LIMIT_WINDOW_SEC", "60"))
RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("CHAT_RATE_LIMIT_MAX", "20"))
rate_limit_store = {}

# Pydanticモデル
class ChatMessage(BaseModel):
    message: str
    project_id: Optional[str] = None
    session_type: str = "general"
    max_tokens: Optional[int] = 4096
    temperature: Optional[float] = 0.7
    response_style: Optional[str] = "auto"  # 応答スタイルパラメータ追加
    custom_instruction: Optional[str] = None  # カスタムスタイル用の指示

class ChatResponse(BaseModel):
    response: str
    project_id: Optional[str] = None
    metrics: Optional[dict] = None
    agent_used: Optional[bool] = False
    fallback_used: Optional[bool] = False

    # 質問明確化機能用フィールド
    is_clarification: Optional[bool] = False  # 明確化質問かどうか
    clarification_questions: Optional[List[str]] = None  # 構造化された質問リスト
    suggestion_options: Optional[List[str]] = None  # クリック可能な選択肢

    # 応答スタイル表示用フィールド
    response_style_used: Optional[str] = None  # 使用された応答スタイル

class ChatHistoryResponse(BaseModel):
    message: str
    response: str
    timestamp: str

# 依存関数
def get_chat_service(current_user_id: int = Depends(get_current_user)) -> ChatService:
    """チャットサービス取得"""
    return service_manager.get_service(ChatService, current_user_id)

def chat_rate_limiter(request: Request, current_user_id: int = Depends(get_current_user)):
    """チャット用レート制限"""
    if not ENABLE_CHAT_RATE_LIMIT:
        return
    
    client_ip = request.client.host
    rate_key = f"{current_user_id}:{client_ip}"
    now = time.time()
    
    if rate_key in rate_limit_store:
        requests, window_start = rate_limit_store[rate_key]
        
        # ウィンドウリセット
        if now - window_start > RATE_LIMIT_WINDOW_SEC:
            rate_limit_store[rate_key] = (1, now)
        elif requests >= RATE_LIMIT_MAX_REQUESTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )
        else:
            rate_limit_store[rate_key] = (requests + 1, window_start)
    else:
        rate_limit_store[rate_key] = (1, now)

# エンドポイント
@router.post("", response_model=ChatResponse, dependencies=[Depends(chat_rate_limiter)])
async def chat_with_ai(
    chat_data: ChatMessage,
    current_user_id: int = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
):
    """AIとのチャット（統合最適化版）"""

    # デバッグログ: response_styleの確認
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"🎯 Received response_style: {chat_data.response_style}")

    # メッセージ長制限
    MAX_MESSAGE_LENGTH = int(os.environ.get("MAX_CHAT_MESSAGE_LENGTH", "2000"))
    if len(chat_data.message) > MAX_MESSAGE_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Message too long. Maximum {MAX_MESSAGE_LENGTH} characters allowed."
        )
    
    try:
        result = await chat_service.process_chat_message(
            message=chat_data.message,
            user_id=current_user_id,
            project_id=chat_data.project_id,
            session_type=chat_data.session_type,
            response_style=chat_data.response_style,  # 応答スタイルを渡す
            custom_instruction=chat_data.custom_instruction  # カスタム指示を渡す
        )
        
        return ChatResponse(
            response=result["response"],
            project_id=result.get("project_id"),
            metrics=result.get("metrics"),
            agent_used=result.get("agent_used", False),
            fallback_used=result.get("fallback_used", False),
            is_clarification=result.get("is_clarification", False),
            clarification_questions=result.get("clarification_questions"),
            suggestion_options=result.get("suggestion_options"),
            response_style_used=result.get("response_style_used")
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chat processing failed: {str(e)}"
        )

@router.get("/history", response_model=List[ChatHistoryResponse])
async def get_chat_history(
    limit: int = 20,
    current_user_id: int = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
):
    """
    チャット履歴取得
    
    認証が必要です。リクエストヘッダーにAuthorizationを含めてください:
    Authorization: Bearer <your_jwt_token>
    """
    try:
        history = chat_service.get_chat_history(current_user_id, limit)
        return [
            ChatHistoryResponse(
                message=item["message"],
                response=item["response"],
                timestamp=item["timestamp"]
            )
            for item in history
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get chat history: {str(e)}"
        )

@router.post("/conversation/{session_type}")
async def create_conversation_session(
    session_type: str,
    current_user_id: int = Depends(get_current_user),
    chat_service: ChatService = Depends(get_chat_service)
):
    """会話セッション作成/取得"""
    try:
        conversation_id = chat_service.get_or_create_conversation_sync(session_type)
        return {
            "conversation_id": conversation_id,
            "session_type": session_type,
            "user_id": current_user_id
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )

@router.delete("/rate-limit/reset")
async def reset_rate_limit(
    current_user_id: int = Depends(get_current_user)
):
    """レート制限リセット（デバッグ用）"""
    keys_to_remove = [key for key in rate_limit_store.keys() 
                     if key.startswith(f"{current_user_id}:")]
    
    for key in keys_to_remove:
        del rate_limit_store[key]
    
    return {"message": f"Rate limit reset for user {current_user_id}"}