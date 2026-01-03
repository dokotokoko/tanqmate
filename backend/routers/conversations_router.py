# routers/conversations_router.py - 会話管理ルーター

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from routers.auth_router import get_current_user, get_supabase_client
from conversation_api import (
    ConversationManager, 
    ConversationCreate, 
    ConversationResponse,
    ConversationListResponse,
    ConversationUpdate
)

# ルーター初期化
router = APIRouter(prefix="/conversations", tags=["conversations"])

# 依存関数
def get_conversation_manager() -> ConversationManager:
    """会話管理マネージャー取得"""
    supabase_client = get_supabase_client()
    return ConversationManager(supabase_client)

# エンドポイント
@router.post("", response_model=ConversationResponse)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user_id: int = Depends(get_current_user),
    manager: ConversationManager = Depends(get_conversation_manager)
):
    """新しい会話を作成"""
    try:
        conversation_id = await manager.create_conversation(
            user_id=current_user_id,
            title=conversation_data.title,
            metadata=conversation_data.metadata
        )
        
        # 作成した会話の情報を取得して返却
        conversation = await manager.get_conversation(conversation_id, current_user_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="作成した会話の取得に失敗しました"
            )
        
        return conversation
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"会話の作成に失敗しました: {str(e)}"
        )

@router.get("", response_model=ConversationListResponse)
async def get_conversations(
    limit: int = 20,
    offset: int = 0,
    is_active: Optional[bool] = True,
    current_user_id: int = Depends(get_current_user),
    manager: ConversationManager = Depends(get_conversation_manager)
):
    """ユーザーの会話リストを取得"""
    try:
        return await manager.list_conversations(
            user_id=current_user_id,
            limit=limit,
            offset=offset,
            is_active=is_active
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"会話リストの取得に失敗しました: {str(e)}"
        )

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user_id: int = Depends(get_current_user),
    manager: ConversationManager = Depends(get_conversation_manager)
):
    """特定の会話を取得"""
    try:
        conversation = await manager.get_conversation(conversation_id, current_user_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="会話が見つかりません"
            )
        
        return conversation
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"会話の取得に失敗しました: {str(e)}"
        )

@router.put("/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    update_data: ConversationUpdate,
    current_user_id: int = Depends(get_current_user),
    manager: ConversationManager = Depends(get_conversation_manager)
):
    """会話情報を更新"""
    try:
        success = await manager.update_conversation(
            conversation_id=conversation_id,
            user_id=current_user_id,
            update_data=update_data
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="会話が見つからないか、更新に失敗しました"
            )
        
        return {"message": "会話が正常に更新されました"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"会話の更新に失敗しました: {str(e)}"
        )

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user_id: int = Depends(get_current_user),
    manager: ConversationManager = Depends(get_conversation_manager)
):
    """会話を削除（論理削除）"""
    try:
        success = await manager.delete_conversation(conversation_id, current_user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="会話が見つからないか、削除に失敗しました"
            )
        
        return {"message": "会話が正常に削除されました"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"会話の削除に失敗しました: {str(e)}"
        )

@router.get("/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    limit: int = 50,
    offset: int = 0,
    current_user_id: int = Depends(get_current_user),
    manager: ConversationManager = Depends(get_conversation_manager)
):
    """会話のメッセージを取得"""
    try:
        # パラメータ制限
        limit = min(limit, 200)  # 最大200件
        offset = max(offset, 0)
        
        messages = await manager.get_messages(
            conversation_id=conversation_id,
            user_id=current_user_id,
            limit=limit,
            offset=offset
        )
        
        return messages
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"メッセージの取得に失敗しました: {str(e)}"
        )

@router.get("/global/session")
async def get_global_session(
    current_user_id: int = Depends(get_current_user),
    manager: ConversationManager = Depends(get_conversation_manager)
):
    """ユーザーのグローバルチャットセッションを取得または作成"""
    try:
        session_id = await manager.get_or_create_global_session(current_user_id)
        return {"session_id": session_id}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"グローバルセッションの取得に失敗しました: {str(e)}"
        )