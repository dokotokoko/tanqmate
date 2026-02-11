# services/quest_map_service.py - 探Qマップ機能のメインサービス

import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone
from fastapi import HTTPException, status
import json

from services.base import BaseService, CacheableService
from services.quest_map_ai import QuestMapAIService
from models.quest_map import QuestMapData, NodeType, NodeStatus, EdgeType, QuestStatus
from schemas.quest_map import (
    QuestCreateRequest, QuestUpdateRequest,
    NodeGenerateRequest, NodeBreakdownRequest, NodeExpandRequest, 
    NodeCompleteRequest, NodeUpdateRequest,
    EdgeCreateRequest,
    QuestResponse, NodeResponse, EdgeResponse, QuestGraphResponse,
    QuestStatistics, HistoryEntry, QuestHistoryResponse
)

logger = logging.getLogger(__name__)


class QuestMapService(CacheableService):
    """探Qマップ機能のメインサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        self.ai_service = QuestMapAIService(supabase_client, user_id)
    
    def get_service_name(self) -> str:
        return "QuestMapService"
    
    # ===== クエスト管理 =====
    
    async def create_quest(self, request: QuestCreateRequest, user_id: int) -> QuestResponse:
        """新規クエスト作成"""
        try:
            # クエストデータ作成
            quest_data = QuestMapData.create_quest_dict(user_id, request.goal)
            
            # データベースに保存
            result = self.supabase.table("quest_map_quests").insert(quest_data).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="クエストの作成に失敗しました")
            
            quest = result.data[0]
            quest_id = quest["id"]
            
            # ゴールノードを作成
            goal_node_data = QuestMapData.create_node_dict(
                quest_id=quest_id,
                node_type=NodeType.GOAL,
                title=request.goal,
                description=request.initial_context or "",
                category="goal",
                position_x=400,
                position_y=100
            )
            
            node_result = self.supabase.table("quest_map_nodes").insert(goal_node_data).execute()
            
            if not node_result.data:
                # ロールバック
                self.supabase.table("quest_map_quests").delete().eq("id", quest_id).execute()
                raise HTTPException(status_code=500, detail="ゴールノードの作成に失敗しました")
            
            # 履歴記録
            await self._add_history(quest_id, "quest_created", feedback="新しいクエストが作成されました")
            
            # キャッシュクリア
            self._clear_quest_cache(user_id)
            
            logger.info(f"✅ クエスト作成完了: quest_id={quest_id}, goal='{request.goal}'")
            
            return QuestResponse(
                id=quest["id"],
                user_id=quest["user_id"],
                goal=quest["goal"],
                current_status=QuestStatus(quest["current_status"]),
                created_at=quest["created_at"],
                updated_at=quest["updated_at"],
                node_count=1,
                completed_nodes=0,
                completion_rate=0.0
            )
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Create quest")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_quest(self, quest_id: int, user_id: int) -> QuestResponse:
        """クエスト詳細取得"""
        try:
            cache_key = f"quest_{quest_id}_{user_id}"
            cached_quest = self.get_cached_result(cache_key)
            
            if cached_quest:
                return QuestResponse(**cached_quest['data'])
            
            # クエスト取得
            result = self.supabase.table("quest_map_quests")\
                .select("*")\
                .eq("id", quest_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="クエストが見つかりません")
            
            quest = result.data[0]
            
            # 統計情報取得
            stats = self._get_quest_statistics(quest_id)
            
            quest_response = QuestResponse(
                id=quest["id"],
                user_id=quest["user_id"],
                goal=quest["goal"],
                current_status=QuestStatus(quest["current_status"]),
                created_at=quest["created_at"],
                updated_at=quest["updated_at"],
                node_count=stats["total_nodes"],
                completed_nodes=stats["completed_nodes"],
                completion_rate=stats["completion_rate"]
            )
            
            self.set_cached_result(cache_key, quest_response.dict(), ttl=300)
            
            return quest_response
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Get quest")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def update_quest(self, quest_id: int, request: QuestUpdateRequest, user_id: int) -> QuestResponse:
        """クエスト更新"""
        try:
            # 権限確認
            self._verify_quest_ownership(quest_id, user_id)
            
            # 更新データ準備
            update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
            
            if request.goal is not None:
                update_data["goal"] = request.goal.strip()
            if request.current_status is not None:
                update_data["current_status"] = request.current_status.value
            
            # データベース更新
            result = self.supabase.table("quest_map_quests")\
                .update(update_data)\
                .eq("id", quest_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="更新するクエストが見つかりません")
            
            # 履歴記録
            await self._add_history(quest_id, "quest_updated", feedback="クエストが更新されました")
            
            # キャッシュクリア
            self._clear_quest_cache(user_id)
            
            # 更新されたクエストを取得
            return self.get_quest(quest_id, user_id)
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Update quest")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def delete_quest(self, quest_id: int, user_id: int) -> Dict[str, str]:
        """クエスト削除"""
        try:
            # 権限確認
            self._verify_quest_ownership(quest_id, user_id)
            
            # 履歴記録（削除前）
            await self._add_history(quest_id, "quest_deleted", feedback="クエストが削除されました")
            
            # 関連データを順次削除（外部キー制約により自動削除される）
            result = self.supabase.table("quest_map_quests")\
                .delete()\
                .eq("id", quest_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="削除するクエストが見つかりません")
            
            # キャッシュクリア
            self._clear_quest_cache(user_id)
            
            logger.info(f"✅ クエスト削除完了: quest_id={quest_id}")
            
            return {"message": "クエストが正常に削除されました"}
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Delete quest")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    # ===== ノード操作 =====
    
    async def generate_action_nodes(self, request: NodeGenerateRequest, user_id: int):
        """AI選択肢生成"""
        try:
            # 権限確認
            self._verify_quest_ownership(request.quest_id, user_id)
            
            # クエスト情報取得
            quest = self.get_quest(request.quest_id, user_id)
            
            # AI生成実行
            ai_response = await self.ai_service.generate_action_nodes(
                quest_id=request.quest_id,
                goal=quest.goal,
                current_context=request.context,
                node_count=request.node_count,
                focus_category=request.focus_category
            )
            
            # 履歴記録
            await self._add_history(
                request.quest_id, 
                "nodes_generated",
                feedback=f"{len(ai_response.suggested_nodes)}個の選択肢が生成されました"
            )
            
            return ai_response
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Generate action nodes")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def breakdown_node(self, request: NodeBreakdownRequest, user_id: int):
        """ノード細分化"""
        try:
            # ノード取得と権限確認
            node = self._get_node_with_verification(request.node_id, user_id)
            
            # AI分解実行
            ai_response = await self.ai_service.breakdown_node(
                node_id=request.node_id,
                node_title=node["title"],
                node_description=node.get("description", ""),
                detail_level=request.detail_level,
                context=request.context
            )
            
            # 履歴記録
            await self._add_history(
                node["quest_id"],
                "node_breakdown",
                node_id=request.node_id,
                feedback=f"ノードが{len(ai_response.subtasks)}個のサブタスクに分解されました"
            )
            
            return ai_response
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Breakdown node")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def expand_node(self, request: NodeExpandRequest, user_id: int):
        """ノード拡散"""
        try:
            # ノード取得と権限確認
            node = self._get_node_with_verification(request.node_id, user_id)
            
            # AI拡散実行
            ai_response = await self.ai_service.expand_node(
                node_id=request.node_id,
                node_title=node["title"],
                node_description=node.get("description", ""),
                alternative_count=request.alternative_count,
                context=request.context
            )
            
            # 履歴記録
            await self._add_history(
                node["quest_id"],
                "node_expansion",
                node_id=request.node_id,
                feedback=f"{len(ai_response.alternatives)}個の代替案が生成されました"
            )
            
            return ai_response
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Expand node")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def complete_node(self, request: NodeCompleteRequest, user_id: int) -> NodeResponse:
        """ノード完了"""
        try:
            # ノード取得と権限確認
            node = self._get_node_with_verification(request.node_id, user_id)
            
            # ノードステータス更新
            update_data = {
                "status": NodeStatus.COMPLETED.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # メタデータに完了情報追加
            metadata = json.loads(node.get("metadata", "{}"))
            metadata.update({
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "evidence": request.evidence,
                "rating": request.rating
            })
            update_data["metadata"] = json.dumps(metadata)
            
            result = self.supabase.table("quest_map_nodes")\
                .update(update_data)\
                .eq("id", request.node_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="ノードの更新に失敗しました")
            
            # 履歴記録
            await self._add_history(
                node["quest_id"],
                "node_completed",
                node_id=request.node_id,
                feedback=request.feedback or "ノードが完了されました"
            )
            
            # キャッシュクリア
            self._clear_quest_cache(user_id)
            
            # 更新されたノードを取得
            return self._format_node_response(result.data[0])
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Complete node")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def update_node_position(self, node_id: int, x: int, y: int, user_id: int) -> None:
        """ノード位置更新"""
        try:
            # ノード取得と権限確認
            node = self._get_node_with_verification(node_id, user_id)
            
            # 位置更新
            update_data = {
                "position_x": x,
                "position_y": y,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.table("quest_map_nodes")\
                .update(update_data)\
                .eq("id", node_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="ノードの位置更新に失敗しました")
            
            # キャッシュクリア
            self._clear_quest_cache(user_id)
            
            logger.info(f"✅ ノード位置更新完了: node_id={node_id}, position=({x}, {y})")
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Update node position")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    # ===== グラフデータ取得 =====
    
    def get_quest_graph(self, quest_id: int, user_id: int) -> QuestGraphResponse:
        """マップ全体のグラフデータ取得"""
        try:
            cache_key = f"quest_graph_{quest_id}_{user_id}"
            cached_graph = self.get_cached_result(cache_key)
            
            if cached_graph:
                return QuestGraphResponse(**cached_graph['data'])
            
            # クエスト取得
            quest = self.get_quest(quest_id, user_id)
            
            # ノード取得
            nodes_result = self.supabase.table("quest_map_nodes")\
                .select("*")\
                .eq("quest_id", quest_id)\
                .order("created_at")\
                .execute()
            
            # エッジ取得
            edges_result = self.supabase.table("quest_map_edges")\
                .select("*")\
                .eq("quest_id", quest_id)\
                .order("created_at")\
                .execute()
            
            # レスポンス形式に変換
            nodes = [self._format_node_response(node) for node in nodes_result.data]
            edges = [self._format_edge_response(edge) for edge in edges_result.data]
            
            # 統計情報
            statistics = self._calculate_quest_statistics(nodes)
            
            graph_response = QuestGraphResponse(
                quest=quest,
                nodes=nodes,
                edges=edges,
                statistics=statistics
            )
            
            self.set_cached_result(cache_key, graph_response.dict(), ttl=600)
            
            return graph_response
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Get quest graph")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    # ===== ユーティリティメソッド =====
    
    def _verify_quest_ownership(self, quest_id: int, user_id: int) -> None:
        """クエストの所有権を確認"""
        result = self.supabase.table("quest_map_quests")\
            .select("id")\
            .eq("id", quest_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="クエストが見つかりません")
    
    def _get_node_with_verification(self, node_id: int, user_id: int) -> Dict[str, Any]:
        """ノードを取得し、ユーザーのアクセス権を確認"""
        result = self.supabase.table("quest_map_nodes")\
            .select("*, quest_map_quests!inner(user_id)")\
            .eq("id", node_id)\
            .eq("quest_map_quests.user_id", user_id)\
            .execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="ノードが見つかりません")
        
        return result.data[0]
    
    def _get_quest_statistics(self, quest_id: int) -> Dict[str, Any]:
        """クエスト統計を取得"""
        nodes_result = self.supabase.table("quest_map_nodes")\
            .select("status")\
            .eq("quest_id", quest_id)\
            .execute()
        
        total_nodes = len(nodes_result.data)
        completed_nodes = len([n for n in nodes_result.data if n["status"] == NodeStatus.COMPLETED.value])
        
        return {
            "total_nodes": total_nodes,
            "completed_nodes": completed_nodes,
            "completion_rate": completed_nodes / total_nodes if total_nodes > 0 else 0.0
        }
    
    def _calculate_quest_statistics(self, nodes: List[NodeResponse]) -> QuestStatistics:
        """ノードリストから統計を計算"""
        total_nodes = len(nodes)
        status_counts = {}
        
        for node in nodes:
            status = node.status.value
            status_counts[status] = status_counts.get(status, 0) + 1
        
        completed_nodes = status_counts.get(NodeStatus.COMPLETED.value, 0)
        completion_rate = completed_nodes / total_nodes if total_nodes > 0 else 0.0
        
        return QuestStatistics(
            total_nodes=total_nodes,
            total_edges=0,  # エッジ数は別途計算
            completed_nodes=completed_nodes,
            pending_nodes=status_counts.get(NodeStatus.PENDING.value, 0),
            in_progress_nodes=status_counts.get(NodeStatus.IN_PROGRESS.value, 0),
            blocked_nodes=status_counts.get(NodeStatus.BLOCKED.value, 0),
            completion_rate=completion_rate
        )
    
    def _format_node_response(self, node_data: Dict[str, Any]) -> NodeResponse:
        """ノードデータをレスポンス形式に変換"""
        formatted = QuestMapData.format_node_response(node_data)
        
        return NodeResponse(
            id=formatted["id"],
            quest_id=formatted["quest_id"],
            type=NodeType(formatted["type"]),
            title=formatted["title"],
            description=formatted["description"],
            category=formatted["category"],
            status=NodeStatus(formatted["status"]),
            position=formatted["position"],
            parent_id=formatted["parent_id"],
            metadata=formatted["metadata"],
            created_at=formatted["created_at"],
            updated_at=formatted["updated_at"],
            children_count=0,  # TODO: 子ノード数を計算
            completion_rate=1.0 if formatted["status"] == NodeStatus.COMPLETED.value else 0.0
        )
    
    def _format_edge_response(self, edge_data: Dict[str, Any]) -> EdgeResponse:
        """エッジデータをレスポンス形式に変換"""
        formatted = QuestMapData.format_edge_response(edge_data)
        
        return EdgeResponse(
            id=formatted["id"],
            quest_id=formatted["quest_id"],
            source_id=formatted["source_id"],
            target_id=formatted["target_id"],
            type=EdgeType(formatted["type"]),
            weight=formatted["weight"],
            metadata=formatted["metadata"],
            created_at=formatted["created_at"]
        )
    
    async def _add_history(
        self,
        quest_id: int,
        action_type: str,
        node_id: Optional[int] = None,
        feedback: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """履歴エントリを追加"""
        try:
            history_data = QuestMapData.create_history_dict(
                quest_id=quest_id,
                action_type=action_type,
                node_id=node_id,
                feedback=feedback,
                metadata=metadata
            )
            
            self.supabase.table("quest_map_history").insert(history_data).execute()
            
        except Exception as e:
            # 履歴記録の失敗はメイン処理に影響しない
            logger.warning(f"⚠️ 履歴記録失敗: {e}")
    
    def _clear_quest_cache(self, user_id: int) -> None:
        """クエスト関連キャッシュをクリア"""
        cache_keys = [
            key for key in self._cache.keys() 
            if f"quest_" in key and f"_{user_id}" in key
        ]
        
        for key in cache_keys:
            if key in self._cache:
                del self._cache[key]