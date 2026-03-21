from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
import logging
from datetime import datetime

from services.title_service import TitleService
from services.conversation_manager import ConversationManager
from routers.auth_router import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

class TitleGenerationRequest(BaseModel):
    first_message: str

class TitleGenerationResponse(BaseModel):
    status: str
    message: str

@router.post("/conversations/{conversation_id}/generate-title")
async def generate_title(
    conversation_id: str,
    request: TitleGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user)
) -> TitleGenerationResponse:
    """
    会話の最初のメッセージからタイトルを生成する（バックグラウンド処理）
    """
    try:
        # ユーザーIDを取得
        user_id = current_user.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="User not authenticated")
        
        # バックグラウンドでタイトル生成を実行
        background_tasks.add_task(
            generate_and_update_title,
            conversation_id,
            request.first_message,
            user_id
        )
        
        return TitleGenerationResponse(
            status="processing",
            message="Title generation started in background"
        )
        
    except Exception as e:
        logger.error(f"Error initiating title generation: {str(e)}")
        return TitleGenerationResponse(
            status="error",
            message="Failed to start title generation"
        )

async def generate_and_update_title(
    conversation_id: str,
    first_message: str,
    user_id: str
):
    """
    バックグラウンドでタイトルを生成し、会話を更新する
    """
    try:
        # タイトル生成サービスを使用
        title_service = TitleService()
        generated_title = await title_service.generate_title_from_message(first_message)
        
        if generated_title:
            # 会話マネージャーでタイトルとfirst_messageを更新
            conversation_manager = ConversationManager()
            await conversation_manager.update_conversation_title(
                conversation_id,
                generated_title,
                user_id,
                first_message  # first_messageも保存
            )
            logger.info(f"Successfully generated title for conversation {conversation_id}: {generated_title}")
        else:
            # 生成失敗時はuntitledに設定、first_messageは保存
            conversation_manager = ConversationManager()
            await conversation_manager.update_conversation_title(
                conversation_id,
                "untitled",
                user_id,
                first_message  # first_messageも保存
            )
            logger.warning(f"Failed to generate title for conversation {conversation_id}, using 'untitled'")
            
    except Exception as e:
        logger.error(f"Error in background title generation: {str(e)}")
        # エラー時もuntitledに設定
        try:
            conversation_manager = ConversationManager()
            await conversation_manager.update_conversation_title(
                conversation_id,
                "untitled",
                user_id
            )
        except:
            pass