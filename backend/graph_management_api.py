"""
グラフ状態管理API
オントロジーグラフの詳細な操作と管理用エンドポイント
"""

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import logging
import json
import os
from datetime import datetime, timedelta

# プロジェクトパスを追加
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from conversation_agent.ontology_graph import (
    InquiryOntologyGraph, Node, Edge, NodeType, RelationType
)
from conversation_agent.graph_inference_engine import GraphInferenceEngine

# ロギング設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPIアプリ作成
app = FastAPI(
    title="グラフ状態管理API",
    description="オントロジーグラフの詳細操作・管理API",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# グローバルグラフインスタンス
graph: Optional[InquiryOntologyGraph] = None
inference_engine: Optional[GraphInferenceEngine] = None

# データモデル
class NodeResponse(BaseModel):
    id: str
    type: str
    text: str
    student_id: str
    timestamp: str
    state: str
    confidence: float
    clarity: float
    depth: float
    alignment_goal: float
    tags: List[str]
    metadata: Dict[str, Any]

class EdgeResponse(BaseModel):
    src: str
    dst: str
    relation: str
    confidence: float
    timestamp: str
    metadata: Dict[str, Any]

class GraphStats(BaseModel):
    total_nodes: int
    total_edges: int
    users: List[str]
    node_type_counts: Dict[str, int]
    relation_type_counts: Dict[str, int]
    avg_clarity: float
    avg_depth: float

class UserProgress(BaseModel):
    user_id: str
    current_node: Optional[NodeResponse]
    progress: Dict[str, Any]
    recent_nodes: List[NodeResponse]
    cycles_completed: int
    patterns: List[List[str]]

class InferenceResult(BaseModel):
    support_type: str
    acts: List[str]
    reason: str
    next_node_type: str
    confidence: float
    applied_rule: str
    predictions: List[Dict[str, Any]]

class NodeCreateRequest(BaseModel):
    type: str = Field(..., description="ノードタイプ")
    text: str = Field(..., description="ノードの内容")
    student_id: str = Field(..., description="学習者ID")
    clarity: float = Field(0.5, ge=0.0, le=1.0)
    depth: float = Field(0.5, ge=0.0, le=1.0)
    tags: List[str] = Field(default_factory=list)

class EdgeCreateRequest(BaseModel):
    src_id: str = Field(..., description="ソースノードID")
    dst_id: str = Field(..., description="宛先ノードID")
    relation: str = Field(..., description="関係タイプ")
    confidence: float = Field(0.7, ge=0.0, le=1.0)

class PathRequest(BaseModel):
    start_node_id: str
    target_type: str
    max_depth: int = Field(5, ge=1, le=10)


def get_graph():
    """グラフインスタンスを取得"""
    global graph, inference_engine
    
    if graph is None:
        try:
            graph = InquiryOntologyGraph(
                "ontology.yaml",
                "constraints.yaml"
            )
            
            # 既存データを読み込み
            graph.import_from_jsonl("node.jsonl", "edges.jsonl")
            
            inference_engine = GraphInferenceEngine(graph)
            
            logger.info("✅ グラフシステム初期化完了")
        except Exception as e:
            logger.error(f"❌ グラフ初期化エラー: {e}")
            # 空のグラフを作成
            graph = InquiryOntologyGraph()
            inference_engine = GraphInferenceEngine(graph)
    
    return graph, inference_engine


@app.get("/graph/stats", response_model=GraphStats)
async def get_graph_stats():
    """グラフの統計情報を取得"""
    
    graph, _ = get_graph()
    
    # ユーザー一覧
    users = list(set(node.student_id for node in graph.nodes.values()))
    
    # ノードタイプ別カウント
    node_type_counts = {}
    total_clarity = 0
    total_depth = 0
    
    for node in graph.nodes.values():
        node_type = node.type.value
        node_type_counts[node_type] = node_type_counts.get(node_type, 0) + 1
        total_clarity += node.clarity
        total_depth += node.depth
    
    # 関係タイプ別カウント
    relation_type_counts = {}
    for edge in graph.edges:
        rel_type = edge.rel.value
        relation_type_counts[rel_type] = relation_type_counts.get(rel_type, 0) + 1
    
    # 平均値計算
    total_nodes = len(graph.nodes)
    avg_clarity = total_clarity / total_nodes if total_nodes > 0 else 0
    avg_depth = total_depth / total_nodes if total_nodes > 0 else 0
    
    return GraphStats(
        total_nodes=total_nodes,
        total_edges=len(graph.edges),
        users=users,
        node_type_counts=node_type_counts,
        relation_type_counts=relation_type_counts,
        avg_clarity=avg_clarity,
        avg_depth=avg_depth
    )


@app.get("/graph/nodes", response_model=List[NodeResponse])
async def get_all_nodes(
    user_id: Optional[str] = Query(None, description="特定ユーザーのノードのみ取得"),
    node_type: Optional[str] = Query(None, description="特定タイプのノードのみ取得"),
    limit: int = Query(100, ge=1, le=1000, description="取得件数制限")
):
    """ノード一覧を取得"""
    
    graph, _ = get_graph()
    
    nodes = list(graph.nodes.values())
    
    # フィルタリング
    if user_id:
        nodes = [n for n in nodes if n.student_id == user_id]
    
    if node_type:
        nodes = [n for n in nodes if n.type.value == node_type]
    
    # 最新順でソート
    nodes.sort(key=lambda n: n.timestamp, reverse=True)
    
    # 制限適用
    nodes = nodes[:limit]
    
    # レスポンス形式に変換
    return [
        NodeResponse(
            id=node.id,
            type=node.type.value,
            text=node.text,
            student_id=node.student_id,
            timestamp=node.timestamp.isoformat(),
            state=node.state,
            confidence=node.confidence,
            clarity=node.clarity,
            depth=node.depth,
            alignment_goal=node.alignment_goal,
            tags=node.tags,
            metadata=node.metadata
        )
        for node in nodes
    ]


@app.get("/graph/edges", response_model=List[EdgeResponse])
async def get_all_edges(
    src_id: Optional[str] = Query(None, description="特定ソースノードのエッジのみ"),
    relation: Optional[str] = Query(None, description="特定関係のエッジのみ"),
    limit: int = Query(100, ge=1, le=1000)
):
    """エッジ一覧を取得"""
    
    graph, _ = get_graph()
    
    edges = graph.edges
    
    # フィルタリング
    if src_id:
        edges = [e for e in edges if e.src == src_id]
    
    if relation:
        edges = [e for e in edges if e.rel.value == relation]
    
    # 最新順でソート
    edges.sort(key=lambda e: e.timestamp, reverse=True)
    
    # 制限適用
    edges = edges[:limit]
    
    # レスポンス形式に変換
    return [
        EdgeResponse(
            src=edge.src,
            dst=edge.dst,
            relation=edge.rel.value,
            confidence=edge.confidence,
            timestamp=edge.timestamp.isoformat(),
            metadata=edge.metadata
        )
        for edge in edges
    ]


@app.get("/graph/users/{user_id}/progress", response_model=UserProgress)
async def get_user_progress(user_id: str):
    """ユーザーの学習進捗を取得"""
    
    graph, inference_engine = get_graph()
    
    # 現在位置
    current_node = graph.get_current_position(user_id)
    
    # 進捗計算
    progress = graph.calculate_progress(user_id)
    
    # 最近のノード
    user_nodes = [n for n in graph.nodes.values() if n.student_id == user_id]
    user_nodes.sort(key=lambda n: n.timestamp, reverse=True)
    recent_nodes = user_nodes[:10]
    
    # パターン検出
    patterns = inference_engine.find_patterns(user_id, pattern_length=3)
    
    return UserProgress(
        user_id=user_id,
        current_node=NodeResponse(
            id=current_node.id,
            type=current_node.type.value,
            text=current_node.text,
            student_id=current_node.student_id,
            timestamp=current_node.timestamp.isoformat(),
            state=current_node.state,
            confidence=current_node.confidence,
            clarity=current_node.clarity,
            depth=current_node.depth,
            alignment_goal=current_node.alignment_goal,
            tags=current_node.tags,
            metadata=current_node.metadata
        ) if current_node else None,
        progress=progress,
        recent_nodes=[
            NodeResponse(
                id=node.id,
                type=node.type.value,
                text=node.text,
                student_id=node.student_id,
                timestamp=node.timestamp.isoformat(),
                state=node.state,
                confidence=node.confidence,
                clarity=node.clarity,
                depth=node.depth,
                alignment_goal=node.alignment_goal,
                tags=node.tags,
                metadata=node.metadata
            )
            for node in recent_nodes
        ],
        cycles_completed=progress.get("cycles_completed", 0),
        patterns=[[node_type.value for node_type in pattern] for pattern in patterns]
    )


@app.get("/graph/users/{user_id}/inference", response_model=InferenceResult)
async def get_user_inference(user_id: str):
    """ユーザーの現在位置から推論結果を取得"""
    
    graph, inference_engine = get_graph()
    
    current_node = graph.get_current_position(user_id)
    if not current_node:
        raise HTTPException(status_code=404, detail="ユーザーのノードが見つかりません")
    
    # 推論実行
    inference_result = inference_engine.infer_next_step(current_node)
    
    # 予測
    predictions = inference_engine.predict_next_nodes(current_node, depth=3)
    
    return InferenceResult(
        support_type=inference_result["support_type"],
        acts=inference_result["acts"],
        reason=inference_result["reason"],
        next_node_type=inference_result["next_node_type"].value,
        confidence=inference_result["confidence"],
        applied_rule=inference_result.get("applied_rule", "default"),
        predictions=predictions
    )


@app.post("/graph/nodes", response_model=Dict[str, Any])
async def create_node(node_req: NodeCreateRequest):
    """新しいノードを作成"""
    
    graph, _ = get_graph()
    
    try:
        # ノードタイプを変換
        node_type = NodeType(node_req.type)
        
        # ノードを作成
        node = Node(
            id=f"{node_req.type.lower()}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            type=node_type,
            text=node_req.text,
            student_id=node_req.student_id,
            timestamp=datetime.now(),
            clarity=node_req.clarity,
            depth=node_req.depth,
            tags=node_req.tags
        )
        
        # グラフに追加
        success = graph.add_node(node)
        
        if success:
            return {
                "success": True,
                "node_id": node.id,
                "message": "ノードが作成されました"
            }
        else:
            raise HTTPException(status_code=400, detail="ノード作成に失敗しました")
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"無効なノードタイプ: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/graph/edges", response_model=Dict[str, Any])
async def create_edge(edge_req: EdgeCreateRequest):
    """新しいエッジを作成"""
    
    graph, _ = get_graph()
    
    try:
        # 関係タイプを変換
        rel_type = RelationType(edge_req.relation)
        
        # エッジを作成
        edge = Edge(
            src=edge_req.src_id,
            rel=rel_type,
            dst=edge_req.dst_id,
            confidence=edge_req.confidence
        )
        
        # グラフに追加
        success = graph.add_edge(edge)
        
        if success:
            return {
                "success": True,
                "message": "エッジが作成されました"
            }
        else:
            raise HTTPException(status_code=400, detail="エッジ作成に失敗しました")
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"無効な関係タイプ: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/graph/find-path")
async def find_path(path_req: PathRequest):
    """ノード間のパスを探索"""
    
    graph, _ = get_graph()
    
    try:
        target_type = NodeType(path_req.target_type)
        
        path = graph.find_path(
            path_req.start_node_id,
            target_type,
            max_depth=path_req.max_depth
        )
        
        if path:
            # パス上のノード情報を取得
            path_nodes = []
            for node_id in path:
                if node_id in graph.nodes:
                    node = graph.nodes[node_id]
                    path_nodes.append({
                        "id": node.id,
                        "type": node.type.value,
                        "text": node.text
                    })
            
            return {
                "success": True,
                "path": path,
                "path_nodes": path_nodes,
                "length": len(path)
            }
        else:
            return {
                "success": False,
                "message": "パスが見つかりませんでした"
            }
            
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"無効なノードタイプ: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/graph/export")
async def export_graph():
    """グラフデータをエクスポート"""
    
    graph, _ = get_graph()
    
    # ノードとエッジを辞書形式で出力
    export_data = {
        "nodes": [node.to_dict() for node in graph.nodes.values()],
        "edges": [edge.to_dict() for edge in graph.edges],
        "exported_at": datetime.now().isoformat(),
        "version": "1.0"
    }
    
    return export_data


@app.post("/graph/import")
async def import_graph(data: Dict[str, Any]):
    """グラフデータをインポート"""
    
    graph, _ = get_graph()
    
    try:
        nodes_imported = 0
        edges_imported = 0
        
        # ノードをインポート
        if "nodes" in data:
            for node_data in data["nodes"]:
                node = Node(
                    id=node_data["id"],
                    type=NodeType(node_data["type"]),
                    text=node_data["text"],
                    student_id=node_data["student_id"],
                    timestamp=datetime.fromisoformat(node_data["timestamp"]),
                    state=node_data.get("state", "tentative"),
                    confidence=node_data.get("confidence", 0.5),
                    clarity=node_data.get("clarity", 0.5),
                    depth=node_data.get("depth", 0.5),
                    alignment_goal=node_data.get("alignment_goal", 0.5),
                    tags=node_data.get("tags", []),
                    metadata=node_data.get("metadata", {})
                )
                
                if graph.add_node(node):
                    nodes_imported += 1
        
        # エッジをインポート
        if "edges" in data:
            for edge_data in data["edges"]:
                edge = Edge(
                    src=edge_data["src"],
                    rel=RelationType(edge_data["rel"]),
                    dst=edge_data["dst"],
                    confidence=edge_data.get("confidence", 0.5),
                    timestamp=datetime.fromisoformat(edge_data.get("timestamp", datetime.now().isoformat())),
                    metadata=edge_data.get("metadata", {})
                )
                
                if graph.add_edge(edge):
                    edges_imported += 1
        
        return {
            "success": True,
            "nodes_imported": nodes_imported,
            "edges_imported": edges_imported
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"インポートエラー: {e}")


@app.delete("/graph/users/{user_id}")
async def delete_user_data(user_id: str):
    """ユーザーのデータを削除"""
    
    graph, _ = get_graph()
    
    # ユーザーのノードを削除
    user_nodes = [node_id for node_id, node in graph.nodes.items() 
                  if node.student_id == user_id]
    
    nodes_deleted = 0
    edges_deleted = 0
    
    for node_id in user_nodes:
        # 関連エッジを削除
        graph.edges = [e for e in graph.edges 
                      if e.src != node_id and e.dst != node_id]
        edges_deleted += len([e for e in graph.edges 
                            if e.src == node_id or e.dst == node_id])
        
        # ノードを削除
        if node_id in graph.nodes:
            del graph.nodes[node_id]
            nodes_deleted += 1
        
        # インデックスから削除
        for node_type, node_set in graph.type_index.items():
            node_set.discard(node_id)
        
        if node_id in graph.edge_index:
            del graph.edge_index[node_id]
    
    return {
        "success": True,
        "nodes_deleted": nodes_deleted,
        "edges_deleted": edges_deleted
    }


@app.get("/health")
async def health_check():
    """ヘルスチェック"""
    graph, inference_engine = get_graph()
    
    return {
        "status": "healthy",
        "graph_nodes": len(graph.nodes),
        "graph_edges": len(graph.edges),
        "inference_engine": inference_engine is not None,
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "graph_management_api:app",
        host="0.0.0.0",
        port=8081,
        reload=True,
        log_level="info"
    )