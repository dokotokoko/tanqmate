"""
グラフベースの推論エンジン
オントロジーグラフを活用した探究学習の推論と次ステップ予測
"""

import logging
from typing import List, Dict, Optional, Any, Tuple, Set
from datetime import datetime, timedelta
from collections import defaultdict, deque
from .ontology_graph import (
    InquiryOntologyGraph, Node, Edge, NodeType, RelationType
)
from conversation_agent.schema import StateSnapshot, SupportType, SpeechAct

logger = logging.getLogger(__name__)


class InferenceRule:
    """推論ルール"""
    def __init__(self, name: str, condition: callable, action: callable, priority: int = 5):
        self.name = name
        self.condition = condition  # (node, graph) -> bool
        self.action = action        # (node, graph) -> Dict
        self.priority = priority    # 1-10 (高いほど優先)


class GraphInferenceEngine:
    """グラフベースの推論エンジン"""
    
    def __init__(self, graph: InquiryOntologyGraph):
        self.graph = graph
        self.rules = self._initialize_rules()
        self.pattern_cache = {}  # パターンマッチングのキャッシュ
        
    def _initialize_rules(self) -> List[InferenceRule]:
        """推論ルールを初期化"""
        rules = []
        
        # ルール1: 問いが不明確な場合、明確化を促す
        rules.append(InferenceRule(
            name="clarify_unclear_question",
            condition=lambda n, g: n.type == NodeType.QUESTION and n.clarity < 0.5,
            action=lambda n, g: {
                "support_type": SupportType.UNDERSTANDING,
                "acts": [SpeechAct.CLARIFY, SpeechAct.PROBE],
                "reason": "問いの明確化が必要",
                "next_node_type": NodeType.QUESTION,
                "confidence": 0.9
            },
            priority=9
        ))
        
        # ルール2: 問いから仮説への遷移
        rules.append(InferenceRule(
            name="question_to_hypothesis",
            condition=lambda n, g: (
                n.type == NodeType.QUESTION and 
                n.clarity >= 0.7 and
                not self._has_child_of_type(n, NodeType.HYPOTHESIS, g)
            ),
            action=lambda n, g: {
                "support_type": SupportType.PATHFINDING,
                "acts": [SpeechAct.PROBE, SpeechAct.OUTLINE],
                "reason": "仮説形成の段階へ",
                "next_node_type": NodeType.HYPOTHESIS,
                "confidence": 0.8
            },
            priority=7
        ))
        
        # ルール3: 仮説から方法への遷移
        rules.append(InferenceRule(
            name="hypothesis_to_method",
            condition=lambda n, g: (
                n.type == NodeType.HYPOTHESIS and
                not self._has_child_of_type(n, NodeType.METHOD, g)
            ),
            action=lambda n, g: {
                "support_type": SupportType.ACTIVATION,
                "acts": [SpeechAct.ACT, SpeechAct.OUTLINE],
                "reason": "検証方法の設計へ",
                "next_node_type": NodeType.METHOD,
                "confidence": 0.7
            },
            priority=6
        ))
        
        # ルール4: 方法からデータ収集への遷移
        rules.append(InferenceRule(
            name="method_to_data",
            condition=lambda n, g: (
                n.type == NodeType.METHOD and
                not self._has_child_of_type(n, NodeType.DATA, g)
            ),
            action=lambda n, g: {
                "support_type": SupportType.ACTIVATION,
                "acts": [SpeechAct.ACT, SpeechAct.INFORM],
                "reason": "実行とデータ収集へ",
                "next_node_type": NodeType.DATA,
                "confidence": 0.7
            },
            priority=6
        ))
        
        # ルール5: データから洞察への遷移
        rules.append(InferenceRule(
            name="data_to_insight",
            condition=lambda n, g: (
                n.type == NodeType.DATA and
                not self._has_child_of_type(n, NodeType.INSIGHT, g)
            ),
            action=lambda n, g: {
                "support_type": SupportType.REFRAMING,
                "acts": [SpeechAct.REFLECT, SpeechAct.REFRAME],
                "reason": "データから洞察を導く",
                "next_node_type": NodeType.INSIGHT,
                "confidence": 0.8
            },
            priority=7
        ))
        
        # ルール6: 洞察から仮説修正への循環
        rules.append(InferenceRule(
            name="insight_modifies_hypothesis",
            condition=lambda n, g: (
                n.type == NodeType.INSIGHT and
                self._find_ancestor_of_type(n, NodeType.HYPOTHESIS, g) is not None
            ),
            action=lambda n, g: {
                "support_type": SupportType.REFRAMING,
                "acts": [SpeechAct.REFRAME, SpeechAct.PROBE],
                "reason": "洞察を基に仮説を修正",
                "next_node_type": NodeType.HYPOTHESIS,
                "confidence": 0.8
            },
            priority=8
        ))
        
        # ルール7: ループ検出時の視点転換
        rules.append(InferenceRule(
            name="break_loop",
            condition=lambda n, g: self._detect_loop(n, g),
            action=lambda n, g: {
                "support_type": SupportType.REFRAMING,
                "acts": [SpeechAct.REFRAME, SpeechAct.PROBE],
                "reason": "ループ検出：視点を変えて考えましょう",
                "next_node_type": NodeType.INSIGHT,
                "confidence": 0.9
            },
            priority=10
        ))
        
        # ルール8: 選択肢が多すぎる場合の絞り込み
        rules.append(InferenceRule(
            name="narrow_options",
            condition=lambda n, g: len(n.metadata.get("options", [])) > 5,
            action=lambda n, g: {
                "support_type": SupportType.NARROWING,
                "acts": [SpeechAct.DECIDE, SpeechAct.PROBE],
                "reason": "選択肢を絞り込む必要がある",
                "next_node_type": n.type,
                "confidence": 0.7
            },
            priority=6
        ))
        
        return sorted(rules, key=lambda r: r.priority, reverse=True)
    
    def _has_child_of_type(self, node: Node, child_type: NodeType, graph: InquiryOntologyGraph) -> bool:
        """指定タイプの子ノードを持つか確認"""
        neighbors = graph.get_node_neighbors(node.id, "out")
        return any(n.type == child_type for n, _ in neighbors)
    
    def _find_ancestor_of_type(self, node: Node, ancestor_type: NodeType, graph: InquiryOntologyGraph) -> Optional[Node]:
        """指定タイプの祖先ノードを探索"""
        visited = set()
        queue = deque([node.id])
        
        while queue:
            current_id = queue.popleft()
            if current_id in visited:
                continue
            visited.add(current_id)
            
            neighbors = graph.get_node_neighbors(current_id, "in")
            for neighbor, _ in neighbors:
                if neighbor.type == ancestor_type:
                    return neighbor
                queue.append(neighbor.id)
        
        return None
    
    def _detect_loop(self, node: Node, graph: InquiryOntologyGraph) -> bool:
        """ループを検出（同じパターンの繰り返し）"""
        # 最近のノードタイプの履歴を取得
        recent_nodes = self._get_recent_nodes(node.student_id, graph, limit=10)
        if len(recent_nodes) < 6:
            return False
        
        # タイプのシーケンスを作成
        type_sequence = [n.type for n in recent_nodes]
        
        # 長さ2-4のパターンでループを検出
        for pattern_len in range(2, 5):
            if len(type_sequence) >= pattern_len * 2:
                # 最後のpattern_len個と、その前のpattern_len個を比較
                last_pattern = type_sequence[-pattern_len:]
                prev_pattern = type_sequence[-pattern_len*2:-pattern_len]
                if last_pattern == prev_pattern:
                    logger.info(f"ループ検出: {last_pattern}")
                    return True
        
        return False
    
    def _get_recent_nodes(self, student_id: str, graph: InquiryOntologyGraph, limit: int = 10) -> List[Node]:
        """最近のノードを取得"""
        student_nodes = [n for n in graph.nodes.values() if n.student_id == student_id]
        student_nodes.sort(key=lambda n: n.timestamp, reverse=True)
        return student_nodes[:limit]
    
    def infer_next_step(self, current_node: Node) -> Dict[str, Any]:
        """現在のノードから次のステップを推論"""
        
        # 適用可能なルールを評価
        applicable_rules = []
        for rule in self.rules:
            if rule.condition(current_node, self.graph):
                applicable_rules.append(rule)
                logger.info(f"ルール適用可能: {rule.name} (優先度: {rule.priority})")
        
        # 最も優先度の高いルールを適用
        if applicable_rules:
            best_rule = applicable_rules[0]
            result = best_rule.action(current_node, self.graph)
            result["applied_rule"] = best_rule.name
            return result
        
        # デフォルトの推論
        return self._default_inference(current_node)
    
    def _default_inference(self, node: Node) -> Dict[str, Any]:
        """デフォルトの推論（ルールが適用されない場合）"""
        return {
            "support_type": SupportType.PATHFINDING,
            "acts": [SpeechAct.OUTLINE, SpeechAct.INFORM],
            "reason": "探究を前に進める",
            "next_node_type": NodeType.QUESTION,
            "confidence": 0.5,
            "applied_rule": "default"
        }
    
    def find_patterns(self, student_id: str, pattern_length: int = 3) -> List[List[NodeType]]:
        """学習パターンを発見"""
        nodes = self._get_recent_nodes(student_id, self.graph, limit=20)
        
        if len(nodes) < pattern_length:
            return []
        
        patterns = []
        type_sequence = [n.type for n in nodes]
        
        # パターンを抽出
        for i in range(len(type_sequence) - pattern_length + 1):
            pattern = type_sequence[i:i+pattern_length]
            patterns.append(pattern)
        
        # パターンの頻度を計算
        pattern_counts = defaultdict(int)
        for pattern in patterns:
            pattern_key = tuple(pattern)
            pattern_counts[pattern_key] += 1
        
        # 頻出パターンを返す
        frequent_patterns = [
            list(pattern) for pattern, count in pattern_counts.items()
            if count >= 2
        ]
        
        return frequent_patterns
    
    def predict_next_nodes(self, current_node: Node, depth: int = 3) -> List[Dict[str, Any]]:
        """次のノードを予測（複数ステップ先まで）"""
        predictions = []
        
        # 現在のノードから推論
        current_inference = self.infer_next_step(current_node)
        predictions.append({
            "step": 1,
            "node_type": current_inference["next_node_type"],
            "support_type": current_inference["support_type"],
            "confidence": current_inference["confidence"]
        })
        
        # 仮想ノードを作成して次のステップを予測
        for step in range(2, depth + 1):
            if predictions:
                last_prediction = predictions[-1]
                virtual_node = Node(
                    id=f"virtual_{step}",
                    type=last_prediction["node_type"],
                    text="仮想ノード",
                    student_id=current_node.student_id,
                    timestamp=datetime.now(),
                    clarity=0.6,
                    depth=current_node.depth + 0.1 * step
                )
                
                next_inference = self.infer_next_step(virtual_node)
                predictions.append({
                    "step": step,
                    "node_type": next_inference["next_node_type"],
                    "support_type": next_inference["support_type"],
                    "confidence": next_inference["confidence"] * (0.9 ** step)  # 距離による減衰
                })
        
        return predictions
    
    def calculate_path_quality(self, path: List[str]) -> float:
        """パスの品質を評価"""
        if not path or len(path) < 2:
            return 0.0
        
        quality = 0.0
        
        # パスの連続性を評価
        for i in range(len(path) - 1):
            src_id = path[i]
            dst_id = path[i + 1]
            
            # エッジの存在確認
            edge_exists = any(
                e.dst == dst_id 
                for e in self.graph.edge_index.get(src_id, [])
            )
            
            if edge_exists:
                quality += 1.0
        
        # オントロジーで定義された許可パスとの一致度
        allowed_paths = self.graph.ontology.get("allowed_paths", [])
        path_types = [self.graph.nodes[node_id].type.value for node_id in path if node_id in self.graph.nodes]
        
        for allowed_path in allowed_paths:
            if self._matches_allowed_path(path_types, allowed_path):
                quality += 2.0
                break
        
        # 正規化（0-1の範囲）
        max_quality = len(path) - 1 + 2.0
        return min(1.0, quality / max_quality)
    
    def _matches_allowed_path(self, path_types: List[str], allowed_path: List[str]) -> bool:
        """パスが許可パターンと一致するか確認"""
        # allowed_pathは [NodeType, RelationType, NodeType, ...] の形式
        allowed_types = [allowed_path[i] for i in range(0, len(allowed_path), 2) if i < len(allowed_path)]
        
        # 部分一致を確認
        if len(path_types) > len(allowed_types):
            return False
        
        for i, ptype in enumerate(path_types):
            if i >= len(allowed_types) or ptype != allowed_types[i]:
                return False
        
        return True
    
    def suggest_alternative_paths(self, current_node: Node, goal_type: NodeType) -> List[Dict[str, Any]]:
        """代替パスを提案"""
        alternatives = []
        
        # 直接パス
        direct_path = self.graph.find_path(current_node.id, goal_type, max_depth=5)
        if direct_path:
            alternatives.append({
                "type": "direct",
                "path": direct_path,
                "quality": self.calculate_path_quality(direct_path),
                "description": f"{current_node.type.value}から{goal_type.value}への直接経路"
            })
        
        # 循環パス（Insight経由）
        if current_node.type != NodeType.INSIGHT:
            insight_path = self.graph.find_path(current_node.id, NodeType.INSIGHT, max_depth=3)
            if insight_path:
                alternatives.append({
                    "type": "cyclic",
                    "path": insight_path,
                    "quality": self.calculate_path_quality(insight_path) * 0.9,
                    "description": "洞察を経由した循環的アプローチ"
                })
        
        # 基本に戻るパス（Question経由）
        if current_node.type not in [NodeType.QUESTION, NodeType.TOPIC]:
            question_path = self.graph.find_path(current_node.id, NodeType.QUESTION, max_depth=3)
            if question_path:
                alternatives.append({
                    "type": "reset",
                    "path": question_path,
                    "quality": self.calculate_path_quality(question_path) * 0.7,
                    "description": "問いに立ち返るアプローチ"
                })
        
        # 品質でソート
        alternatives.sort(key=lambda x: x["quality"], reverse=True)
        
        return alternatives[:3]  # 上位3つを返す