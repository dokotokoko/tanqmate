# services/conversation_agent_service.py - 会話エージェント管理サービス

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import json
import logging
from .base import BaseService

class ConversationAgentService(BaseService):
    """会話エージェント管理を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
    
    def get_service_name(self) -> str:
        return "ConversationAgentService"
    
    async def process_chat(
        self, 
        message: str, 
        user_id: int, 
        project_id: Optional[str] = None,
        mode: str = "default"
    ) -> Dict[str, Any]:
        """会話エージェントとのチャット処理"""
        try:
            # プロジェクトコンテキストを取得
            project_context = None
            if project_id:
                project_context = await self._get_project_context(project_id, user_id)
            
            # 会話エージェントシステムを使用して応答を生成
            # 既存のconversation_agentモジュールを利用
            from conversation_agent.orchestrator import ConversationOrchestrator
            from conversation_agent.schema import ConversationRequest, ConversationMode
            
            # リクエストを構築
            conv_mode = ConversationMode(mode) if mode in ["default", "research", "creative"] else ConversationMode.DEFAULT
            
            agent_request = ConversationRequest(
                message=message,
                user_id=user_id,
                project_id=project_id,
                mode=conv_mode,
                context=project_context or {}
            )
            
            # オーケストレーターで処理
            orchestrator = ConversationOrchestrator(self.supabase)
            result = await orchestrator.process_conversation(agent_request)
            
            return {
                "response": result.response,
                "agent_type": result.agent_type,
                "project_context": project_context,
                "metadata": {
                    "processing_time": result.processing_time,
                    "tokens_used": result.tokens_used if hasattr(result, 'tokens_used') else None,
                    "mode": mode
                }
            }
            
        except Exception as e:
            error_result = self.handle_error(e, "Conversation agent chat")
            self.logger.error(f"Conversation agent chat failed: {e}")
            raise Exception(error_result["error"])
    
    def get_agent_status(self, user_id: int) -> Dict[str, Any]:
        """エージェントの状態を取得"""
        try:
            # アクティブな会話セッションをカウント
            active_sessions_result = self.supabase.table("chat_conversations")\
                .select("id")\
                .eq("user_id", user_id)\
                .eq("is_active", True)\
                .execute()
            
            active_sessions = len(active_sessions_result.data)
            
            # 最後の活動を取得
            last_activity_result = self.supabase.table("chat_logs")\
                .select("created_at")\
                .eq("user_id", user_id)\
                .order("created_at", desc=True)\
                .limit(1)\
                .execute()
            
            last_activity = None
            if last_activity_result.data:
                last_activity = last_activity_result.data[0]["created_at"]
            
            return {
                "status": "active" if active_sessions > 0 else "idle",
                "active_sessions": active_sessions,
                "last_activity": last_activity,
                "agent_types": ["default", "research", "creative"]
            }
            
        except Exception as e:
            error_result = self.handle_error(e, "Get agent status")
            self.logger.error(f"Failed to get agent status: {e}")
            return {
                "status": "error",
                "active_sessions": 0,
                "last_activity": None,
                "agent_types": []
            }
    
    async def initialize_agent(
        self, 
        user_id: int, 
        agent_type: str = "default",
        project_id: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """エージェントを初期化"""
        try:
            # エージェント設定を保存（必要に応じて）
            agent_config = {
                "agent_type": agent_type,
                "project_id": project_id,
                "config": config or {},
                "initialized_at": datetime.now(timezone.utc).isoformat(),
                "user_id": user_id
            }
            
            # 会話セッションを作成
            session_result = self.supabase.table("chat_conversations").insert({
                "user_id": user_id,
                "title": f"会話エージェント - {agent_type}",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).execute()
            
            session_id = session_result.data[0]["id"] if session_result.data else None
            
            return {
                "agent_type": agent_type,
                "session_id": session_id,
                "config": agent_config,
                "status": "initialized"
            }
            
        except Exception as e:
            error_result = self.handle_error(e, "Initialize agent")
            self.logger.error(f"Failed to initialize agent: {e}")
            raise Exception(error_result["error"])
    
    async def _get_project_context(self, project_id: str, user_id: int) -> Optional[Dict[str, Any]]:
        """プロジェクトコンテキストを取得"""
        try:
            # project_idの形式を判定
            if project_id.startswith('project-'):
                actual_project_id = int(project_id.replace('project-', ''))
            elif project_id.isdigit():
                # メモIDからプロジェクトIDを取得
                memo_result = self.supabase.table('memos')\
                    .select('project_id')\
                    .eq('id', int(project_id))\
                    .eq('user_id', user_id)\
                    .execute()
                
                if memo_result.data and memo_result.data[0].get('project_id'):
                    actual_project_id = memo_result.data[0]['project_id']
                else:
                    return None
            else:
                return None
            
            # プロジェクト情報を取得
            project_result = self.supabase.table('projects')\
                .select('*')\
                .eq('id', actual_project_id)\
                .eq('user_id', user_id)\
                .execute()
            
            if project_result.data:
                project = project_result.data[0]
                return {
                    "id": project["id"],
                    "title": project.get("title", ""),
                    "theme": project.get("theme", ""),
                    "question": project.get("question", ""),
                    "hypothesis": project.get("hypothesis", ""),
                    "description": project.get("description", "")
                }
            
            return None
            
        except Exception as e:
            self.logger.warning(f"Failed to get project context: {e}")
            return None