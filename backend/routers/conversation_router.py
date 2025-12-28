# routers/conversation_router.py - 会話管理ルーター

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.conversation_service import ConversationService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/conversations", tags=["conversations"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class ConversationCreate(BaseModel):
    title: str
    metadata: Optional[Dict[str, Any]] = None

class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    is_active: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None

class ConversationResponse(BaseModel):
    id: str
    user_id: int
    title: str
    is_active: bool
    metadata: Optional[Dict[str, Any]]
    message_count: int
    created_at: str
    updated_at: str

class ConversationListResponse(BaseModel):
    conversations: List[ConversationResponse]
    total: int
    limit: int
    offset: int

class MessageResponse(BaseModel):
    id: int
    sender: str
    message: str
    context_data: Optional[Dict[str, Any]]
    created_at: str

# 依存関数
def get_conversation_service(current_user_id: int = Depends(get_current_user)) -> ConversationService:
    """会話サービス取得"""
    return service_manager.get_service(ConversationService, current_user_id)

# エンドポイント
@router.post("", response_model=ConversationResponse)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user_id: int = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """新しい会話を作成"""
    conversation_id = await conversation_service.create_conversation(
        user_id=current_user_id,
        title=conversation_data.title,
        metadata=conversation_data.metadata
    )
    
    # 作成した会話情報を取得して返す
    conversation = await conversation_service.get_conversation(conversation_id, current_user_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="会話の作成後の取得に失敗しました"
        )
    
    return ConversationResponse(
        id=conversation["id"],
        user_id=conversation["user_id"],
        title=conversation["title"],
        is_active=conversation["is_active"],
        metadata=conversation.get("metadata"),
        message_count=conversation.get("message_count", 0),
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"]
    )

@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    limit: Optional[int] = 20,
    offset: Optional[int] = 0,
    is_active: Optional[bool] = None,
    current_user_id: int = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """会話リストを取得"""
    # パラメータ制限
    limit = min(limit or 20, 100)  # 最大100件
    offset = max(offset or 0, 0)
    
    result = await conversation_service.list_conversations(
        user_id=current_user_id,
        limit=limit,
        offset=offset,
        is_active=is_active
    )
    
    conversations = [
        ConversationResponse(
            id=conv["id"],
            user_id=conv["user_id"],
            title=conv["title"],
            is_active=conv["is_active"],
            metadata=conv.get("metadata"),
            message_count=conv.get("message_count", 0),
            created_at=conv["created_at"],
            updated_at=conv["updated_at"]
        )
        for conv in result["conversations"]
    ]
    
    return ConversationListResponse(
        conversations=conversations,
        total=result["total"],
        limit=result["limit"],
        offset=result["offset"]
    )

@router.get("/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: str,
    current_user_id: int = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """指定した会話の詳細を取得"""
    conversation = await conversation_service.get_conversation(conversation_id, current_user_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会話が見つからないか、アクセス権限がありません"
        )
    
    return ConversationResponse(
        id=conversation["id"],
        user_id=conversation["user_id"],
        title=conversation["title"],
        is_active=conversation["is_active"],
        metadata=conversation.get("metadata"),
        message_count=conversation.get("message_count", 0),
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"]
    )

@router.put("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    update_data: ConversationUpdate,
    current_user_id: int = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """会話情報を更新"""
    success = await conversation_service.update_conversation(
        conversation_id=conversation_id,
        user_id=current_user_id,
        update_data=update_data.dict(exclude_unset=True)
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会話が見つからないか、更新に失敗しました"
        )
    
    # 更新後の会話情報を取得して返す
    conversation = await conversation_service.get_conversation(conversation_id, current_user_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="会話の更新後の取得に失敗しました"
        )
    
    return ConversationResponse(
        id=conversation["id"],
        user_id=conversation["user_id"],
        title=conversation["title"],
        is_active=conversation["is_active"],
        metadata=conversation.get("metadata"),
        message_count=conversation.get("message_count", 0),
        created_at=conversation["created_at"],
        updated_at=conversation["updated_at"]
    )

@router.delete("/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user_id: int = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """会話を削除（論理削除）"""
    success = await conversation_service.delete_conversation(conversation_id, current_user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="会話が見つからないか、削除に失敗しました"
        )
    
    return {"message": "会話を削除しました", "conversation_id": conversation_id}

@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: str,
    limit: Optional[int] = 50,
    offset: Optional[int] = 0,
    current_user_id: int = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """会話のメッセージを取得"""
    # パラメータ制限
    limit = min(limit or 50, 200)  # 最大200件
    offset = max(offset or 0, 0)
    
    messages = await conversation_service.get_messages(
        conversation_id=conversation_id,
        user_id=current_user_id,
        limit=limit,
        offset=offset
    )
    
    return [
        MessageResponse(
            id=msg["id"],
            sender=msg["sender"],
            message=msg["message"],
            context_data=msg.get("context_data"),
            created_at=msg["created_at"]
        )
        for msg in messages
    ]

# グローバルセッション用エンドポイント（内部用）
@router.get("/global/session")
async def get_global_session(
    current_user_id: int = Depends(get_current_user),
    conversation_service: ConversationService = Depends(get_conversation_service)
):
    """ユーザーのグローバルチャットセッション取得"""
    session_id = await conversation_service.get_or_create_global_session(current_user_id)
    return {"session_id": session_id}