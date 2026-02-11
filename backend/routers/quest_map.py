# routers/quest_map.py - 探Qマップ機能のAPIエンドポイント

from fastapi import APIRouter, HTTPException, Depends, status, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict, Any
import logging
import json
import asyncio

from services.quest_map_service import QuestMapService
from services.quest_map_ai import QuestMapAIService
from services.quest_card_integration import QuestCardIntegrationService
from services.quest_map_realtime import QuestMapRealtimeService, UpdateType
from services.base import ServiceManager
from routers.auth_router import get_current_user
from schemas.quest_map import (
    QuestCreateRequest, QuestUpdateRequest,
    NodeGenerateRequest, NodeBreakdownRequest, NodeExpandRequest,
    NodeCompleteRequest, NodeUpdateRequest, NodePositionUpdateRequest,
    EdgeCreateRequest,
    QuestResponse, NodeResponse, EdgeResponse, QuestGraphResponse,
    QuestHistoryResponse, ErrorResponse,
    NodeGenerationResponse, NodeBreakdownResponse, NodeExpansionResponse,
    RecommendationResponse
)
from config.database import get_supabase_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quest-map", tags=["quest-map"])

# 依存関数
def get_quest_map_service(user_id: Optional[int] = None) -> QuestMapService:
    """QuestMapServiceの依存注入"""
    supabase_client = get_supabase_client()
    return QuestMapService(supabase_client, user_id)

def get_quest_map_ai_service(user_id: Optional[int] = None) -> QuestMapAIService:
    """QuestMapAIServiceの依存注入"""
    supabase_client = get_supabase_client()
    return QuestMapAIService(supabase_client, user_id)

def get_quest_card_integration_service(user_id: Optional[int] = None) -> QuestCardIntegrationService:
    """QuestCardIntegrationServiceの依存注入"""
    supabase_client = get_supabase_client()
    return QuestCardIntegrationService(supabase_client, user_id)

def get_quest_map_realtime_service(user_id: Optional[int] = None) -> QuestMapRealtimeService:
    """QuestMapRealtimeServiceの依存注入"""
    supabase_client = get_supabase_client()
    return QuestMapRealtimeService(supabase_client, user_id)

# get_current_user関数は auth_router からインポート済み

# リアルタイムサービスのグローバルインスタンス
realtime_service_instance = None

def get_realtime_service_instance() -> QuestMapRealtimeService:
    """リアルタイムサービスのシングルトンインスタンス取得"""
    global realtime_service_instance
    if realtime_service_instance is None:
        supabase_client = get_supabase_client()
        realtime_service_instance = QuestMapRealtimeService(supabase_client)
    return realtime_service_instance

# ===== クエスト管理エンドポイント =====

@router.post("/quests", response_model=QuestResponse, status_code=status.HTTP_201_CREATED)
async def create_quest(
    request: QuestCreateRequest,
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    新規クエスト作成
    
    - **goal**: 達成したい目標（必須）
    - **initial_context**: 現在の状況・背景情報（オプション）
    
    Returns:
        作成されたクエストの詳細情報
    """
    try:
        logger.info(f"📍 新規クエスト作成要求: user_id={user_id}, goal='{request.goal[:50]}...'")
        result = await service.create_quest(request, user_id)
        logger.info(f"✅ クエスト作成成功: quest_id={result.id}")
        return result
    except Exception as e:
        logger.error(f"❌ クエスト作成エラー: {e}")
        raise


@router.get("/quests/{quest_id}", response_model=QuestResponse)
async def get_quest(
    quest_id: int,
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    クエスト詳細取得
    
    Args:
        quest_id: 取得するクエストのID
        
    Returns:
        クエストの詳細情報（統計情報含む）
    """
    try:
        logger.info(f"📍 クエスト詳細取得: quest_id={quest_id}, user_id={user_id}")
        result = service.get_quest(quest_id, user_id)
        return result
    except Exception as e:
        logger.error(f"❌ クエスト取得エラー: {e}")
        raise


@router.put("/quests/{quest_id}", response_model=QuestResponse)
async def update_quest(
    quest_id: int,
    request: QuestUpdateRequest,
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    クエスト更新
    
    Args:
        quest_id: 更新するクエストのID
        request: 更新内容
        
    Returns:
        更新されたクエストの詳細情報
    """
    try:
        logger.info(f"📍 クエスト更新要求: quest_id={quest_id}, user_id={user_id}")
        result = await service.update_quest(quest_id, request, user_id)
        logger.info(f"✅ クエスト更新成功: quest_id={quest_id}")
        return result
    except Exception as e:
        logger.error(f"❌ クエスト更新エラー: {e}")
        raise


@router.delete("/quests/{quest_id}")
async def delete_quest(
    quest_id: int,
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    クエスト削除
    
    Args:
        quest_id: 削除するクエストのID
        
    Returns:
        削除完了メッセージ
    """
    try:
        logger.info(f"📍 クエスト削除要求: quest_id={quest_id}, user_id={user_id}")
        result = await service.delete_quest(quest_id, user_id)
        logger.info(f"✅ クエスト削除成功: quest_id={quest_id}")
        return result
    except Exception as e:
        logger.error(f"❌ クエスト削除エラー: {e}")
        raise


# ===== ノード操作エンドポイント =====

@router.post("/nodes/generate", response_model=NodeGenerationResponse)
async def generate_action_nodes(
    request: NodeGenerateRequest,
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    AI選択肢生成
    
    AIがクエストの目標と現状を分析し、具体的なアクションプランを提案します。
    
    Args:
        request: 生成条件
        - quest_id: 対象クエストID
        - context: 追加のコンテキスト情報（オプション）
        - node_count: 生成する選択肢の数（3-10、デフォルト：5）
        - focus_category: 特に焦点を当てるカテゴリ（オプション）
        
    Returns:
        AI生成された選択肢のリスト
    """
    try:
        logger.info(f"📍 AI選択肢生成要求: quest_id={request.quest_id}, user_id={user_id}")
        result = await service.generate_action_nodes(request, user_id)
        logger.info(f"✅ AI選択肢生成成功: {len(result.suggested_nodes)}個の選択肢")
        return result
    except Exception as e:
        logger.error(f"❌ AI選択肢生成エラー: {e}")
        raise


@router.post("/nodes/{node_id}/breakdown", response_model=NodeBreakdownResponse)
async def breakdown_node(
    node_id: str,
    request: NodeBreakdownRequest,
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    ノード細分化
    
    選択したノードをより小さな実行可能なタスクに分解します。
    
    Args:
        node_id: 分解するノードのID
        request: 分解条件
        - detail_level: 詳細レベル（2-5、デフォルト：3）
        - context: 追加のコンテキスト（オプション）
        
    Returns:
        分解されたサブタスクのリスト
    """
    try:
        # requestにnode_idを設定
        request.node_id = node_id
        logger.info(f"📍 ノード分解要求: node_id={node_id}, user_id={user_id}")
        result = await service.breakdown_node(request, user_id)
        logger.info(f"✅ ノード分解成功: {len(result.subtasks)}個のサブタスク")
        return result
    except Exception as e:
        logger.error(f"❌ ノード分解エラー: {e}")
        raise


@router.post("/nodes/{node_id}/expand", response_model=NodeExpansionResponse)
async def expand_node(
    node_id: str,
    request: NodeExpandRequest,
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    ノード拡散
    
    選択したノードに対して、異なるアプローチや手法による代替案を生成します。
    
    Args:
        node_id: 拡散するノードのID
        request: 拡散条件
        - alternative_count: 代替案の数（2-8、デフォルト：3）
        - context: 追加のコンテキスト（オプション）
        
    Returns:
        代替選択肢のリスト
    """
    try:
        # requestにnode_idを設定
        request.node_id = node_id
        logger.info(f"📍 ノード拡散要求: node_id={node_id}, user_id={user_id}")
        result = await service.expand_node(request, user_id)
        logger.info(f"✅ ノード拡散成功: {len(result.alternatives)}個の代替案")
        return result
    except Exception as e:
        logger.error(f"❌ ノード拡散エラー: {e}")
        raise


@router.post("/nodes/{node_id}/complete", response_model=NodeResponse)
async def complete_node(
    node_id: str,
    request: NodeCompleteRequest,
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    ノード完了
    
    ノードを完了状態にマークし、フィードバックや成果物を記録します。
    
    Args:
        node_id: 完了するノードのID
        request: 完了情報
        - feedback: 完了時のフィードバック（オプション）
        - evidence: 完了の証拠・成果物（オプション）
        - rating: 達成度評価（1-5、オプション）
        
    Returns:
        更新されたノード情報
    """
    try:
        # requestにnode_idを設定
        request.node_id = node_id
        logger.info(f"📍 ノード完了要求: node_id={node_id}, user_id={user_id}")
        result = await service.complete_node(request, user_id)
        logger.info(f"✅ ノード完了成功: node_id={node_id}")
        return result
    except Exception as e:
        logger.error(f"❌ ノード完了エラー: {e}")
        raise


@router.put("/quests/{quest_id}/nodes/{node_id}/position")
async def update_node_position(
    quest_id: int,
    node_id: str,
    request: NodePositionUpdateRequest,
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    ノード位置更新
    
    ノードの表示位置を更新します。
    
    Args:
        quest_id: クエストのID
        node_id: ノードのID
        request: 新しい位置情報（x, y座標）
        
    Returns:
        成功時は204 No Content
    """
    try:
        logger.info(f"📍 ノード位置更新要求: quest_id={quest_id}, node_id={node_id}, position=({request.x}, {request.y}), user_id={user_id}")
        
        # ノードIDから数値部分を抽出（例: "action-1" -> 1）
        actual_node_id = None
        if '-' in node_id:
            parts = node_id.split('-')
            if len(parts) > 1 and parts[-1].isdigit():
                actual_node_id = int(parts[-1])
        elif node_id.isdigit():
            actual_node_id = int(node_id)
        
        if actual_node_id is None:
            raise HTTPException(status_code=400, detail=f"Invalid node ID format: {node_id}")
        
        # サービスメソッドを呼び出して位置を更新
        await service.update_node_position(actual_node_id, request.x, request.y, user_id)
        
        logger.info(f"✅ ノード位置更新成功: node_id={node_id}")
        return {"status": "success"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"❌ ノード位置更新エラー: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ===== グラフデータ取得エンドポイント =====

@router.get("/quests/{quest_id}/graph", response_model=QuestGraphResponse)
async def get_quest_graph(
    quest_id: int,
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    マップ全体のグラフデータ取得
    
    クエストに関連するすべてのノードとエッジ、統計情報を含むグラフデータを取得します。
    
    Args:
        quest_id: 取得するクエストのID
        
    Returns:
        完全なグラフデータ（ノード、エッジ、統計情報）
    """
    try:
        logger.info(f"📍 グラフデータ取得要求: quest_id={quest_id}, user_id={user_id}")
        result = service.get_quest_graph(quest_id, user_id)
        logger.info(f"✅ グラフデータ取得成功: {len(result.nodes)}ノード, {len(result.edges)}エッジ")
        return result
    except Exception as e:
        logger.error(f"❌ グラフデータ取得エラー: {e}")
        raise


# ===== 追加のユーティリティエンドポイント =====

@router.get("/quests", response_model=List[QuestResponse])
async def get_user_quests(
    user_id: int = Depends(get_current_user),
    status: Optional[str] = Query(None, description="フィルタするステータス"),
    limit: int = Query(10, ge=1, le=100, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    ユーザーのクエスト一覧取得
    
    Args:
        status: フィルタするステータス（オプション）
        limit: 取得件数（1-100、デフォルト：10）
        offset: オフセット（デフォルト：0）
        
    Returns:
        ユーザーのクエストリスト
    """
    try:
        logger.info(f"📍 ユーザークエスト一覧取得: user_id={user_id}")
        # TODO: サービスにget_user_questsメソッドを実装
        return []
    except Exception as e:
        logger.error(f"❌ クエスト一覧取得エラー: {e}")
        raise


@router.get("/quests/{quest_id}/recommendations", response_model=RecommendationResponse)
async def get_quest_recommendations(
    quest_id: int,
    user_id: int = Depends(get_current_user),
    context: Optional[str] = Query(None, description="追加のコンテキスト"),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    推奨ノード取得
    
    現在の進捗状況を分析し、次に取り組むべきノードを推奨します。
    
    Args:
        quest_id: 対象クエストID
        context: 追加のコンテキスト（オプション）
        
    Returns:
        推奨ノードと理由
    """
    try:
        logger.info(f"📍 推奨ノード取得要求: quest_id={quest_id}, user_id={user_id}")
        # TODO: サービスにget_recommendationsメソッドを実装
        return RecommendationResponse(
            quest_id=quest_id,
            recommendations=[],
            overall_advice="推奨機能は開発中です"
        )
    except Exception as e:
        logger.error(f"❌ 推奨ノード取得エラー: {e}")
        raise


@router.get("/quests/{quest_id}/history", response_model=QuestHistoryResponse)
async def get_quest_history(
    quest_id: int,
    user_id: int = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200, description="取得件数"),
    offset: int = Query(0, ge=0, description="オフセット"),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    クエスト履歴取得
    
    Args:
        quest_id: 対象クエストID
        limit: 取得件数（1-200、デフォルト：50）
        offset: オフセット（デフォルト：0）
        
    Returns:
        クエストの操作履歴
    """
    try:
        logger.info(f"📍 クエスト履歴取得: quest_id={quest_id}, user_id={user_id}")
        # TODO: サービスにget_quest_historyメソッドを実装
        return QuestHistoryResponse(
            quest_id=quest_id,
            entries=[],
            total_count=0
        )
    except Exception as e:
        logger.error(f"❌ クエスト履歴取得エラー: {e}")
        raise


# ===== ヘルスチェック・統計エンドポイント =====

@router.get("/health")
async def health_check():
    """
    ヘルスチェック
    
    Returns:
        システム稼働状況
    """
    try:
        # 簡単な接続テスト
        supabase_client = get_supabase_client()
        # TODO: 実際のヘルスチェックロジックを実装
        
        return {
            "status": "healthy",
            "service": "quest-map",
            "timestamp": "2024-01-01T00:00:00Z"  # TODO: 実際のタイムスタンプ
        }
    except Exception as e:
        logger.error(f"❌ ヘルスチェック失敗: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable"
        )


@router.get("/stats")
async def get_system_stats(
    user_id: int = Depends(get_current_user),
    service: QuestMapService = Depends(get_quest_map_service)
):
    """
    システム統計情報取得
    
    Returns:
        ユーザーの探Qマップ利用統計
    """
    try:
        logger.info(f"📍 システム統計取得: user_id={user_id}")
        # TODO: 統計情報の取得ロジックを実装
        return {
            "user_id": user_id,
            "total_quests": 0,
            "active_quests": 0,
            "completed_quests": 0,
            "total_nodes": 0,
            "completed_nodes": 0,
            "ai_generations": 0
        }
    except Exception as e:
        logger.error(f"❌ 統計取得エラー: {e}")
        raise


# ===== 新機能: AIチャット・相談エンドポイント =====

@router.post("/quests/{quest_id}/ai-consult")
async def consult_ai_for_quest(
    quest_id: int,
    question: str,
    node_id: Optional[str] = Query(None, description="相談対象のノードID"),
    user_id: int = Depends(get_current_user),
    ai_service: QuestMapAIService = Depends(get_quest_map_ai_service)
):
    """
    探QマップAIチャット相談
    
    Args:
        quest_id: 対象クエストID
        question: 質問内容
        node_id: 特定ノードに関する相談の場合のノードID
        
    Returns:
        AIからのアドバイス
    """
    try:
        logger.info(f"🤖 AIチャット相談: quest_id={quest_id}, node_id={node_id}")
        
        # コンテキスト情報を構築
        quest_context = {"quest_id": quest_id}  # TODO: 実際のクエスト情報を取得
        node_context = {"node_id": node_id} if node_id else None
        
        advice = await ai_service.consult_ai_for_node(
            question=question,
            quest_context=quest_context,
            node_context=node_context,
            user_context={"user_id": user_id}
        )
        
        return {"advice": advice, "timestamp": "2024-01-01T00:00:00Z"}
        
    except Exception as e:
        logger.error(f"❌ AIチャット相談エラー: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI相談に失敗しました: {str(e)}"
        )


@router.get("/quests/{quest_id}/ai-consult/stream")
async def stream_ai_consultation(
    quest_id: int,
    question: str,
    node_id: Optional[str] = Query(None),
    user_id: int = Depends(get_current_user),
    ai_service: QuestMapAIService = Depends(get_quest_map_ai_service)
):
    """
    ストリーミングAIチャット相談（将来実装）
    
    Returns:
        ストリーミングレスポンス
    """
    try:
        async def generate_streaming_response():
            quest_context = {"quest_id": quest_id}
            node_context = {"node_id": node_id} if node_id else None
            
            async for chunk in ai_service.generate_streaming_consultation(
                question, quest_context, node_context, user_context={"user_id": user_id}
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
            
            yield f"data: {json.dumps({'done': True})}\n\n"
        
        return StreamingResponse(
            generate_streaming_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )
        
    except Exception as e:
        logger.error(f"❌ ストリーミング相談エラー: {e}")
        raise


@router.post("/nodes/{node_id}/ai-breakdown")
async def ai_breakdown_node(
    node_id: str,
    detail_level: int = Query(3, ge=2, le=5, description="詳細レベル"),
    context: Optional[str] = Query(None, description="追加コンテキスト"),
    user_id: int = Depends(get_current_user),
    ai_service: QuestMapAIService = Depends(get_quest_map_ai_service)
):
    """
    AI強化ノード細分化
    
    Args:
        node_id: 分解するノードID
        detail_level: 詳細レベル（2-5）
        context: 追加コンテキスト
        
    Returns:
        AI分析による細分化結果
    """
    try:
        logger.info(f"🤖 AI細分化: node_id={node_id}, detail_level={detail_level}")
        
        # TODO: ノード情報を取得
        node_title = f"ノード{node_id}"
        node_description = f"ノード{node_id}の説明"
        
        result = await ai_service.breakdown_node(
            node_id=node_id,
            node_title=node_title,
            node_description=node_description,
            detail_level=detail_level,
            context=context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ AI細分化エラー: {e}")
        raise


@router.post("/nodes/{node_id}/ai-expand")
async def ai_expand_node(
    node_id: str,
    alternative_count: int = Query(3, ge=2, le=5, description="代替案数"),
    context: Optional[str] = Query(None, description="追加コンテキスト"),
    user_id: int = Depends(get_current_user),
    ai_service: QuestMapAIService = Depends(get_quest_map_ai_service)
):
    """
    AI強化ノード拡散
    
    Args:
        node_id: 拡散するノードID
        alternative_count: 代替案の数（2-5）
        context: 追加コンテキスト
        
    Returns:
        AI分析による代替案
    """
    try:
        logger.info(f"🤖 AI拡散: node_id={node_id}, alternatives={alternative_count}")
        
        # TODO: ノード情報を取得
        node_title = f"ノード{node_id}"
        node_description = f"ノード{node_id}の説明"
        
        result = await ai_service.expand_node(
            node_id=node_id,
            node_title=node_title,
            node_description=node_description,
            alternative_count=alternative_count,
            context=context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ AI拡散エラー: {e}")
        raise


@router.post("/quests/{quest_id}/ai-recommendations")
async def get_ai_recommendations(
    quest_id: int,
    context: Optional[str] = Query(None, description="追加コンテキスト"),
    user_id: int = Depends(get_current_user),
    ai_service: QuestMapAIService = Depends(get_quest_map_ai_service)
):
    """
    AI推奨ノード分析
    
    Args:
        quest_id: 対象クエストID
        context: 追加コンテキスト
        
    Returns:
        AI分析による推奨ノード
    """
    try:
        logger.info(f"🤖 AI推奨分析: quest_id={quest_id}")
        
        # TODO: 実際のクエストデータを取得
        completed_nodes = []
        pending_nodes = []
        
        result = await ai_service.recommend_next_nodes(
            quest_id=quest_id,
            completed_nodes=completed_nodes,
            pending_nodes=pending_nodes,
            current_context=context
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ AI推奨分析エラー: {e}")
        raise


# ===== 新機能: クエストカード連携エンドポイント =====

@router.post("/quest-cards/to-quest-map")
async def convert_quest_cards_to_map(
    quest_cards: List[Dict[str, Any]],
    goal: str,
    current_situation: str = "",
    quest_title: Optional[str] = None,
    user_id: int = Depends(get_current_user),
    integration_service: QuestCardIntegrationService = Depends(get_quest_card_integration_service)
):
    """
    クエストカードから探Qマップを生成
    
    Args:
        quest_cards: クエストカードのリスト
        goal: 全体目標
        current_situation: 現在の状況
        quest_title: クエストタイトル（省略時自動生成）
        
    Returns:
        生成された探Qマップ
    """
    try:
        logger.info(f"🔄 カード→マップ変換: {len(quest_cards)}枚のカード")
        
        result = await integration_service.convert_quest_cards_to_quest_map(
            quest_cards=quest_cards,
            goal=goal,
            current_situation=current_situation,
            quest_title=quest_title
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ カード変換エラー: {e}")
        raise


@router.get("/quests/{quest_id}/to-quest-cards")
async def convert_quest_map_to_cards(
    quest_id: int,
    max_cards: int = Query(8, ge=3, le=12, description="最大カード数"),
    user_id: int = Depends(get_current_user),
    integration_service: QuestCardIntegrationService = Depends(get_quest_card_integration_service)
):
    """
    探Qマップからクエストカードを生成
    
    Args:
        quest_id: 対象クエストID
        max_cards: 最大カード数（3-12）
        
    Returns:
        生成されたクエストカード
    """
    try:
        logger.info(f"🔄 マップ→カード変換: quest_id={quest_id}")
        
        # TODO: 実際のクエストデータを取得
        quest = None  # service.get_quest(quest_id)
        
        if not quest:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Quest not found"
            )
        
        cards = integration_service.convert_quest_map_to_quest_cards(
            quest=quest,
            max_cards=max_cards
        )
        
        return {"cards": cards, "quest_id": quest_id}
        
    except Exception as e:
        logger.error(f"❌ マップ変換エラー: {e}")
        raise


@router.post("/quests/{quest_id}/sync-card-status")
async def sync_quest_card_status(
    quest_id: str,
    node_id: str,
    new_status: str,
    user_id: int = Depends(get_current_user),
    integration_service: QuestCardIntegrationService = Depends(get_quest_card_integration_service)
):
    """
    クエストカードとノードのステータス同期
    
    Args:
        quest_id: クエストID
        node_id: ノードID
        new_status: 新しいステータス
        
    Returns:
        同期結果
    """
    try:
        from ..schemas.quest_map import NodeStatus
        node_status = NodeStatus(new_status)
        
        result = await integration_service.sync_quest_card_with_node_status(
            quest_id=quest_id,
            node_id=node_id,
            new_status=node_status
        )
        
        return result
        
    except Exception as e:
        logger.error(f"❌ ステータス同期エラー: {e}")
        raise


# ===== 新機能: リアルタイム更新エンドポイント =====

@router.websocket("/quests/{quest_id}/realtime")
async def websocket_quest_map_realtime(
    websocket: WebSocket,
    quest_id: str,
    user_id: str = Query(...),
    device_id: str = Query(...)
):
    """
    探Qマップリアルタイム更新WebSocket
    
    Args:
        quest_id: クエストID  
        user_id: ユーザーID
        device_id: デバイスID
    """
    realtime_service = get_realtime_service_instance()
    client_id = f"{user_id}_{device_id}_{quest_id}"
    
    await websocket.accept()
    logger.info(f"📡 WebSocket接続開始: {client_id}")
    
    try:
        # WebSocket送信コールバックを設定
        async def websocket_send(client_id_target: str, message: str):
            if client_id_target == client_id:
                await websocket.send_text(message)
        
        realtime_service.set_websocket_callback(websocket_send)
        
        # クライアント登録
        await realtime_service.register_client(
            client_id=client_id,
            user_id=user_id,
            quest_id=quest_id,
            device_id=device_id
        )
        
        # メッセージループ
        while True:
            try:
                # タイムアウト付きでメッセージを受信
                message_text = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message_data = json.loads(message_text)
                
                # メッセージを処理
                response = await realtime_service.handle_client_message(client_id, message_data)
                
                # 応答を送信
                await websocket.send_text(json.dumps(response))
                
            except asyncio.TimeoutError:
                # ハートビート更新
                await realtime_service.update_heartbeat(client_id)
                await websocket.send_text(json.dumps({"type": "heartbeat"}))
                
    except WebSocketDisconnect:
        logger.info(f"📡 WebSocket切断: {client_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket エラー: {e}")
    finally:
        # クリーンアップ
        await realtime_service.unregister_client(client_id)


@router.post("/quests/{quest_id}/realtime/broadcast")
async def broadcast_update(
    quest_id: str,
    update_type: str,
    data: Dict[str, Any],
    user_id: int = Depends(get_current_user)
):
    """
    リアルタイム更新をブロードキャスト
    
    Args:
        quest_id: 対象クエストID
        update_type: 更新タイプ
        data: 更新データ
        
    Returns:
        ブロードキャスト結果
    """
    try:
        realtime_service = get_realtime_service_instance()
        
        # 更新タイプをEnumに変換
        try:
            update_enum = UpdateType(update_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid update type: {update_type}"
            )
        
        success = await realtime_service._broadcast_update(
            update_type=update_enum,
            quest_id=quest_id,
            user_id=str(user_id),
            data=data
        )
        
        return {"success": success, "quest_id": quest_id, "update_type": update_type}
        
    except Exception as e:
        logger.error(f"❌ ブロードキャストエラー: {e}")
        raise


@router.get("/realtime/stats")
async def get_realtime_stats():
    """
    リアルタイム機能の統計情報取得
    
    Returns:
        統計情報
    """
    try:
        realtime_service = get_realtime_service_instance()
        stats = realtime_service.get_realtime_statistics()
        return stats
        
    except Exception as e:
        logger.error(f"❌ リアルタイム統計エラー: {e}")
        raise


# ===== バッチ処理エンドポイント =====

@router.post("/ai/batch-generate")
async def batch_generate_nodes(
    requests: List[Dict[str, Any]],
    user_id: int = Depends(get_current_user),
    ai_service: QuestMapAIService = Depends(get_quest_map_ai_service)
):
    """
    複数ノード生成のバッチ処理
    
    Args:
        requests: 生成リクエストのリスト
        
    Returns:
        バッチ生成結果
    """
    try:
        logger.info(f"🚀 バッチ生成開始: {len(requests)}件")
        
        results = await ai_service.batch_generate_nodes(requests)
        
        success_count = len([r for r in results if r.suggested_nodes])
        
        return {
            "total_requests": len(requests),
            "success_count": success_count,
            "results": results
        }
        
    except Exception as e:
        logger.error(f"❌ バッチ生成エラー: {e}")
        raise