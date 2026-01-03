# routers/conversation_agent_router.py - 会話エージェント関連ルーター

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from services.conversation_agent_service import ConversationAgentService
from services.base import ServiceManager
from routers.auth_router import get_current_user, get_supabase_client

# ルーター初期化
router = APIRouter(prefix="/conversation-agent", tags=["conversation-agent"])

# サービスマネージャー
service_manager = ServiceManager(get_supabase_client())

# Pydanticモデル
class ConversationAgentRequest(BaseModel):
    message: str
    project_id: Optional[str] = None
    mode: Optional[str] = "default"

class ConversationAgentResponse(BaseModel):
    response: str
    agent_type: Optional[str]
    project_context: Optional[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]]

class AgentStatusResponse(BaseModel):
    status: str
    active_sessions: int
    last_activity: Optional[str]
    agent_types: List[str]

class AgentInitializeRequest(BaseModel):
    agent_type: str = "default"
    project_id: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

# 依存関数
def get_conversation_agent_service(current_user_id: int = Depends(get_current_user)) -> ConversationAgentService:
    """会話エージェントサービス取得"""
    return service_manager.get_service(ConversationAgentService, current_user_id)

# エンドポイント
@router.post("/chat", response_model=ConversationAgentResponse)
async def conversation_agent_chat(
    request: ConversationAgentRequest,
    current_user_id: int = Depends(get_current_user),
    agent_service: ConversationAgentService = Depends(get_conversation_agent_service)
):
    """会話エージェントとの対話"""
    try:
        result = await agent_service.process_chat(
            message=request.message,
            user_id=current_user_id,
            project_id=request.project_id,
            mode=request.mode
        )
        
        return ConversationAgentResponse(
            response=result["response"],
            agent_type=result.get("agent_type"),
            project_context=result.get("project_context"),
            metadata=result.get("metadata", {})
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"会話エージェント処理エラー: {str(e)}"
        )

@router.get("/status", response_model=AgentStatusResponse)
async def get_agent_status(
    current_user_id: int = Depends(get_current_user),
    agent_service: ConversationAgentService = Depends(get_conversation_agent_service)
):
    """エージェントの状態を取得"""
    try:
        status_info = agent_service.get_agent_status(current_user_id)
        
        return AgentStatusResponse(
            status=status_info["status"],
            active_sessions=status_info["active_sessions"],
            last_activity=status_info.get("last_activity"),
            agent_types=status_info.get("agent_types", ["default"])
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"エージェント状態取得エラー: {str(e)}"
        )

@router.post("/initialize")
async def initialize_agent(
    request: AgentInitializeRequest,
    current_user_id: int = Depends(get_current_user),
    agent_service: ConversationAgentService = Depends(get_conversation_agent_service)
):
    """エージェントを初期化"""
    try:
        result = await agent_service.initialize_agent(
            user_id=current_user_id,
            agent_type=request.agent_type,
            project_id=request.project_id,
            config=request.config
        )
        
        return {
            "message": "エージェントが初期化されました",
            "agent_type": result["agent_type"],
            "session_id": result.get("session_id"),
            "status": "initialized"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"エージェント初期化エラー: {str(e)}"
        )