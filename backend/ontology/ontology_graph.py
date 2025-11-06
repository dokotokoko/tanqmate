"""
探究学習オントロジーグラフシステム
学習者の探究プロセスを知識グラフとして表現し、循環的な学習を支援
"""

import json
import logging
from typing import List, Dict, Optional, Any, Tuple, Set
from datetime import datetime
from enum import Enum
from dataclasses import dataclass, field
from pathlib import Path
import yaml

logger = logging.getLogger(__name__)


class NodeType(Enum):
    """ノードタイプの定義（オントロジーのクラス）"""
    GOAL = "Goal"
    QUESTION = "Question"  
    HYPOTHESIS = "Hypothesis"
    METHOD = "Method"
    DATA = "Data"
    INSIGHT = "Insight"
    REFLECTION = "Reflection"
    WILL = "Will"
    NEED = "Need"
    TOPIC = "Topic"
    CHALLENGE = "Challenge"


class RelationType(Enum):
    """関係タイプの定義（オントロジーの関係）"""
    GENERATES = "generates"           # Topic → Question
    MOTIVATES = "motivates"          # Will → Question
    GROUNDS = "grounds"              # Need → Question
    FRAMES = "frames"                # Goal → Question
    LEADS_TO = "leads_to"            # Question → Hypothesis
    IS_TESTED_BY = "is_tested_by"   # Hypothesis → Method
    RESULTS_IN = "results_in"        # Method → Data
    LEADS_TO_INSIGHT = "leads_to_insight"  # Data → Insight
    MODIFIES = "modifies"            # Insight → Hypothesis
    ALIGNED_WITH = "aligned_with"   # Question → Goal


@dataclass
class Node:
    """グラフのノード（探究要素）"""
    id: str
    type: NodeType
    text: str
    student_id: str
    timestamp: datetime
    state: str = "tentative"  # tentative, confirmed, revised, abandoned
    confidence: float = 0.5
    tags: List[str] = field(default_factory=list)
    
    # ノード固有の属性
    clarity: float = 0.5      # 明確さ（0-1）
    depth: float = 0.5        # 深さ（0-1）
    alignment_goal: float = 0.5  # ゴールとの整合性（0-1）
    
    # メタデータ
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type.value,
            "text": self.text,
            "student_id": self.student_id,
            "timestamp": self.timestamp.isoformat(),
            "state": self.state,
            "confidence": self.confidence,
            "tags": self.tags,
            "clarity": self.clarity,
            "depth": self.depth,
            "alignment_goal": self.alignment_goal,
            "metadata": self.metadata
        }


@dataclass
class Edge:
    """グラフのエッジ（関係）"""
    src: str  # ソースノードID
    rel: RelationType
    dst: str  # 宛先ノードID
    confidence: float = 0.5
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "src": self.src,
            "rel": self.rel.value,
            "dst": self.dst,
            "confidence": self.confidence,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }


@dataclass
class PathConstraint:
    """パス制約（必須の経路）"""
    path: List[Tuple[NodeType, RelationType, NodeType]]
    required: bool = True
    message: str = ""


@dataclass
class GuardCondition:
    """ガード条件（ノードの状態チェック）"""
    node_type: NodeType
    attribute: str
    operator: str  # "lt", "gt", "eq", "lte", "gte"
    value: Any
    suggestion: str
    message: str


class InquiryOntologyGraph:
    """探究学習オントロジーグラフ管理クラス"""
    
    def __init__(self, ontology_path: Optional[str] = None, constraints_path: Optional[str] = None):
        self.nodes: Dict[str, Node] = {}
        self.edges: List[Edge] = []
        self.ontology: Dict[str, Any] = {}
        self.constraints: Dict[str, Any] = {}
        
        # オントロジーと制約を読み込み
        if ontology_path:
            self.load_ontology(ontology_path)
        if constraints_path:
            self.load_constraints(constraints_path)
        
        # インデックス（高速検索用）
        self.type_index: Dict[NodeType, Set[str]] = {nt: set() for nt in NodeType}
        self.edge_index: Dict[str, List[Edge]] = {}  # src_id -> edges
        
    def load_ontology(self, path: str):
        """オントロジー定義を読み込み"""
        with open(path, 'r', encoding='utf-8') as f:
            self.ontology = yaml.safe_load(f)
        logger.info(f"オントロジー読み込み完了: {path}")
        
    def load_constraints(self, path: str):
        """制約定義を読み込み"""
        with open(path, 'r', encoding='utf-8') as f:
            self.constraints = yaml.safe_load(f)
        logger.info(f"制約読み込み完了: {path}")
    
    def add_node(self, node: Node) -> bool:
        """ノードを追加"""
        if node.id in self.nodes:
            logger.warning(f"ノード {node.id} は既に存在します")
            return False
        
        self.nodes[node.id] = node
        self.type_index[node.type].add(node.id)
        logger.info(f"ノード追加: {node.id} (type={node.type.value})")
        return True
    
    def add_edge(self, edge: Edge) -> bool:
        """エッジを追加（制約チェック付き）"""
        # 関係の妥当性をチェック
        if not self._validate_edge(edge):
            return False
        
        self.edges.append(edge)
        if edge.src not in self.edge_index:
            self.edge_index[edge.src] = []
        self.edge_index[edge.src].append(edge)
        
        logger.info(f"エッジ追加: {edge.src} -{edge.rel.value}-> {edge.dst}")
        return True
    
    def _validate_edge(self, edge: Edge) -> bool:
        """エッジの妥当性をチェック"""
        # ノードの存在確認
        if edge.src not in self.nodes or edge.dst not in self.nodes:
            logger.error(f"エッジのノードが存在しません: {edge.src} or {edge.dst}")
            return False
        
        # オントロジーで定義された関係かチェック
        src_type = self.nodes[edge.src].type
        dst_type = self.nodes[edge.dst].type
        
        valid_relations = self.ontology.get("relations", {})
        rel_name = edge.rel.value
        
        if rel_name in valid_relations:
            rel_def = valid_relations[rel_name]
            expected_domain = rel_def.get("domain")
            expected_range = rel_def.get("range")
            
            if expected_domain and src_type.value != expected_domain:
                logger.error(f"関係 {rel_name} のドメインが不正: {src_type.value} != {expected_domain}")
                return False
            if expected_range and dst_type.value != expected_range:
                logger.error(f"関係 {rel_name} のレンジが不正: {dst_type.value} != {expected_range}")
                return False
        
        return True
    
    def get_node_neighbors(self, node_id: str, direction: str = "out") -> List[Tuple[Node, Edge]]:
        """ノードの隣接ノードを取得"""
        neighbors = []
        
        if direction in ["out", "both"]:
            # 出力エッジ
            for edge in self.edge_index.get(node_id, []):
                if edge.dst in self.nodes:
                    neighbors.append((self.nodes[edge.dst], edge))
        
        if direction in ["in", "both"]:
            # 入力エッジ
            for edge in self.edges:
                if edge.dst == node_id and edge.src in self.nodes:
                    neighbors.append((self.nodes[edge.src], edge))
        
        return neighbors
    
    def find_path(self, start_id: str, end_type: NodeType, max_depth: int = 5) -> Optional[List[str]]:
        """指定タイプのノードまでのパスを探索（幅優先探索）"""
        if start_id not in self.nodes:
            return None
        
        visited = set()
        queue = [(start_id, [start_id])]
        
        while queue:
            current_id, path = queue.pop(0)
            
            if len(path) > max_depth:
                continue
            
            if current_id in visited:
                continue
            visited.add(current_id)
            
            current_node = self.nodes[current_id]
            if current_node.type == end_type and current_id != start_id:
                return path
            
            # 隣接ノードを探索
            for neighbor, _ in self.get_node_neighbors(current_id, "out"):
                if neighbor.id not in visited:
                    queue.append((neighbor.id, path + [neighbor.id]))
        
        return None
    
    def check_structural_gaps(self, student_id: str) -> List[Dict[str, Any]]:
        """構造的な欠損をチェックし、質問を生成"""
        gaps = []
        
        if 'structural_requirements' not in self.constraints:
            return gaps
        
        # 学習者のノードを取得
        student_nodes = [node for node in self.nodes.values() if node.student_id == student_id]
        
        for requirement in self.constraints['structural_requirements']:
            # 条件となるノードタイプが存在するかチェック
            if_type = requirement['if_exists']['type']
            existing_nodes = [node for node in student_nodes if node.type.value == if_type]
            
            for existing_node in existing_nodes:
                # 必要な関係が存在するかチェック
                must_have_type = requirement['must_have']['type']
                required_relation = requirement['must_have']['relation']
                
                # 既存ノードから必要な関係があるかチェック
                has_required_relation = self._has_outgoing_relation(
                    existing_node.id, required_relation, must_have_type
                )
                
                if not has_required_relation:
                    # 欠損を発見 - 質問を生成
                    gap_info = {
                        'type': 'structural_gap',
                        'missing_element': must_have_type,
                        'existing_node': existing_node,
                        'gap_prompt': requirement['gap_prompt'],
                        'clarification_prompt': requirement['clarification_prompt'].format(
                            **{f"{if_type.lower()}_text": existing_node.text}
                        ),
                        'priority': requirement.get('priority', 'medium'),
                        'required_relation': required_relation
                    }
                    gaps.append(gap_info)
        
        # 高度な構造的チェック
        if 'advanced_structural_checks' in self.constraints:
            advanced_gaps = self._check_advanced_structural_requirements(student_nodes)
            gaps.extend(advanced_gaps)
        
        # 優先度でソート
        priority_order = {'high': 3, 'medium': 2, 'low': 1}
        gaps.sort(key=lambda x: priority_order.get(x.get('priority', 'medium'), 2), reverse=True)
        
        return gaps
    
    def _has_outgoing_relation(self, src_node_id: str, relation_type: str, target_node_type: str) -> bool:
        """指定されたノードから特定の関係で特定のタイプのノードにつながっているかチェック"""
        
        # エッジをチェック
        for edge in self.edges:
            if (edge.src == src_node_id and 
                edge.rel.value == relation_type and
                edge.dst in self.nodes and
                self.nodes[edge.dst].type.value == target_node_type):
                return True
        return False
    
    def _check_advanced_structural_requirements(self, student_nodes: List[Node]) -> List[Dict[str, Any]]:
        """高度な構造的要件をチェック"""
        gaps = []
        
        advanced_checks = self.constraints.get('advanced_structural_checks', [])
        
        for check in advanced_checks:
            name = check['name']
            condition = check['condition']
            check_rule = check['check']
            gap_prompt = check['gap_prompt']
            
            if name == 'question_goal_alignment':
                # 問いとゴールの整合性チェック
                questions = [n for n in student_nodes if n.type == NodeType.QUESTION]
                goals = [n for n in student_nodes if n.type == NodeType.GOAL]
                
                if questions and goals:
                    for question in questions:
                        has_alignment = any(
                            self._has_outgoing_relation(question.id, 'aligned_with', 'Goal')
                            for goal in goals
                        )
                        if not has_alignment:
                            gaps.append({
                                'type': 'alignment_gap',
                                'missing_element': 'Goal alignment',
                                'existing_node': question,
                                'gap_prompt': gap_prompt,
                                'priority': 'medium'
                            })
            
            elif name == 'inquiry_depth':
                # 探究の深さチェック
                questions = [n for n in student_nodes if n.type == NodeType.QUESTION]
                for question in questions:
                    path_length = self._calculate_inquiry_path_length(question.id)
                    if path_length < 3:  # Question -> Hypothesis -> Method の最低ライン
                        gaps.append({
                            'type': 'depth_gap',
                            'missing_element': 'Inquiry depth',
                            'existing_node': question,
                            'gap_prompt': gap_prompt,
                            'priority': 'low'
                        })
            
            elif name == 'insight_reflection_cycle':
                # 洞察から仮説修正への循環チェック
                insights = [n for n in student_nodes if n.type == NodeType.INSIGHT]
                for insight in insights:
                    has_reflection_cycle = self._has_outgoing_relation(
                        insight.id, 'modifies', 'Hypothesis'
                    )
                    if not has_reflection_cycle:
                        gaps.append({
                            'type': 'cycle_gap',
                            'missing_element': 'Reflection cycle',
                            'existing_node': insight,
                            'gap_prompt': gap_prompt,
                            'priority': 'low'
                        })
        
        return gaps
    
    def _calculate_inquiry_path_length(self, start_node_id: str) -> int:
        """探究パスの長さを計算"""
        visited = set()
        path_length = 0
        current_id = start_node_id
        
        while current_id and current_id not in visited:
            visited.add(current_id)
            path_length += 1
            
            # 次のノードを探す
            next_id = None
            for edge in self.edges:
                if edge.src == current_id:
                    next_id = edge.dst
                    break
            
            current_id = next_id
            if path_length > 10:  # 無限ループ防止
                break
        
        return path_length
    
    def check_guards(self, node: Node) -> List[GuardCondition]:
        """ノードのガード条件をチェック"""
        triggered_guards = []
        
        for guard in self.constraints.get("guards", []):
            condition = guard.get("if", {})
            
            # ノードタイプチェック
            if condition.get("node.type") != node.type.value:
                continue
            
            # 属性条件チェック
            for key, value in condition.items():
                if key == "node.type":
                    continue
                
                # clarity_lt のような形式をパース
                if "_" in key:
                    attr, op = key.rsplit("_", 1)
                    node_value = getattr(node, attr, None)
                    
                    if node_value is not None:
                        if op == "lt" and node_value < value:
                            action = guard.get("then", {})
                            triggered_guards.append(GuardCondition(
                                node_type=node.type,
                                attribute=attr,
                                operator=op,
                                value=value,
                                suggestion=action.get("suggest", ""),
                                message=action.get("message", "")
                            ))
        
        return triggered_guards
    
    def get_current_position(self, student_id: str) -> Optional[Node]:
        """学習者の現在位置（最新のノード）を取得"""
        student_nodes = [n for n in self.nodes.values() if n.student_id == student_id]
        if not student_nodes:
            return None
        
        # タイムスタンプでソートして最新を返す
        student_nodes.sort(key=lambda n: n.timestamp, reverse=True)
        return student_nodes[0]
    
    def suggest_next_step(self, current_node: Node) -> List[Dict[str, Any]]:
        """現在のノードから次のステップを提案"""
        suggestions = []
        
        # 1. ガード条件をチェック
        guards = self.check_guards(current_node)
        for guard in guards:
            suggestions.append({
                "type": "guard",
                "priority": "high",
                "action": guard.suggestion,
                "reason": guard.message
            })
        
        # 2. オントロジーに基づく次のステップ
        allowed_paths = self.ontology.get("allowed_paths", [])
        for path_def in allowed_paths:
            # 現在のノードタイプがパスの中にあるか
            for i, step in enumerate(path_def):
                if i % 2 == 0 and step == current_node.type.value:
                    # 次のステップを提案
                    if i + 2 < len(path_def):
                        next_rel = path_def[i + 1]
                        next_type = path_def[i + 2]
                        suggestions.append({
                            "type": "path",
                            "priority": "medium",
                            "action": f"{next_type}を作成",
                            "reason": f"{current_node.type.value}から{next_rel}関係で{next_type}へ"
                        })
        
        # 3. 循環パス（Insight → Hypothesis）のチェック
        if current_node.type == NodeType.INSIGHT:
            suggestions.append({
                "type": "cycle",
                "priority": "medium", 
                "action": "仮説を修正",
                "reason": "洞察から仮説へのフィードバック"
            })
        
        return suggestions
    
    def calculate_progress(self, student_id: str) -> Dict[str, Any]:
        """学習者の進捗を計算"""
        student_nodes = [n for n in self.nodes.values() if n.student_id == student_id]
        
        if not student_nodes:
            return {"progress": 0, "stage": "initial"}
        
        # ノードタイプ別カウント
        type_counts = {}
        for node in student_nodes:
            type_counts[node.type.value] = type_counts.get(node.type.value, 0) + 1
        
        # 進捗段階を判定
        if NodeType.INSIGHT.value in type_counts:
            stage = "insight_generation"
            progress = 0.8
        elif NodeType.DATA.value in type_counts:
            stage = "data_collection"
            progress = 0.6
        elif NodeType.METHOD.value in type_counts:
            stage = "method_design"
            progress = 0.4
        elif NodeType.HYPOTHESIS.value in type_counts:
            stage = "hypothesis_formation"
            progress = 0.3
        elif NodeType.QUESTION.value in type_counts:
            stage = "question_formulation"
            progress = 0.2
        else:
            stage = "initial"
            progress = 0.1
        
        # 循環回数を計算（Insight → Hypothesis のループ）
        cycles = min(type_counts.get(NodeType.INSIGHT.value, 0),
                    type_counts.get(NodeType.HYPOTHESIS.value, 0))
        
        return {
            "progress": progress,
            "stage": stage,
            "type_counts": type_counts,
            "total_nodes": len(student_nodes),
            "cycles_completed": cycles
        }
    
    def export_to_jsonl(self, nodes_file: str, edges_file: str):
        """グラフをJSONL形式でエクスポート"""
        # ノードをエクスポート
        with open(nodes_file, 'w', encoding='utf-8') as f:
            for node in self.nodes.values():
                f.write(json.dumps(node.to_dict(), ensure_ascii=False) + '\n')
        
        # エッジをエクスポート
        with open(edges_file, 'w', encoding='utf-8') as f:
            for edge in self.edges:
                f.write(json.dumps(edge.to_dict(), ensure_ascii=False) + '\n')
    
    def import_from_jsonl(self, nodes_file: str, edges_file: str):
        """JSONL形式からグラフをインポート"""
        # ノードをインポート
        if Path(nodes_file).exists():
            with open(nodes_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip().startswith("//"):
                        continue
                    data = json.loads(line)
                    node = Node(
                        id=data["id"],
                        type=NodeType(data["type"]),
                        text=data["text"],
                        student_id=data["student_id"],
                        timestamp=datetime.fromisoformat(data["timestamp"]),
                        state=data.get("state", "tentative"),
                        confidence=data.get("confidence", 0.5),
                        tags=data.get("tags", []),
                        clarity=data.get("clarity", 0.5),
                        depth=data.get("depth", 0.5),
                        alignment_goal=data.get("alignment_goal", 0.5),
                        metadata=data.get("metadata", {})
                    )
                    self.add_node(node)
        
        # エッジをインポート
        if Path(edges_file).exists():
            with open(edges_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip().startswith("//"):
                        continue
                    data = json.loads(line)
                    edge = Edge(
                        src=data["src"],
                        rel=RelationType(data["rel"]),
                        dst=data["dst"],
                        confidence=data.get("confidence", 0.5),
                        timestamp=datetime.fromisoformat(data.get("timestamp", datetime.now().isoformat())),
                        metadata=data.get("metadata", {})
                    )
                    self.add_edge(edge)