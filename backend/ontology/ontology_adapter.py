"""
オントロジーグラフと既存システムの統合アダプター
線形5段階プロセスからグラフ駆動の循環プロセスへの橋渡し
"""

import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime
from .ontology_graph import (
    InquiryOntologyGraph, Node, Edge, NodeType, RelationType
)
from conversation_agent.schema import (
    StateSnapshot, TurnDecision, SupportType, SpeechAct
)

logger = logging.getLogger(__name__)


class OntologyAdapter:
    """既存システムとオントロジーグラフを統合するアダプター"""
    
    def __init__(self, ontology_path: str = "ontology.yaml", 
                 constraints_path: str = "constraints.yaml"):
        # オントロジーグラフを初期化
        self.graph = InquiryOntologyGraph(ontology_path, constraints_path)
        
        # 既存ファイルからデータをインポート
        try:
            self.graph.import_from_jsonl("node.jsonl", "edges.jsonl")
            logger.info("既存のグラフデータをインポートしました")
        except Exception as e:
            logger.warning(f"グラフデータのインポートをスキップ: {e}")
        
        # マッピングテーブル（5段階プロセス ↔ グラフノード）
        self.process_to_graph_mapping = {
            "状態抽出": [NodeType.QUESTION, NodeType.GOAL],
            "計画思考": [NodeType.HYPOTHESIS, NodeType.METHOD],
            "支援タイプ判定": None,  # グラフのトラバーサルで動的に決定
            "発話アクト選択": None,  # 現在のノード状態から決定
            "応答生成": [NodeType.INSIGHT, NodeType.REFLECTION]
        }
        
        # 支援タイプとノード状態のマッピング
        self.support_to_node_mapping = {
            SupportType.UNDERSTANDING: NodeType.QUESTION,
            SupportType.PATHFINDING: NodeType.METHOD,
            SupportType.REFRAMING: NodeType.INSIGHT,
            SupportType.ACTIVATION: NodeType.METHOD,
            SupportType.NARROWING: NodeType.HYPOTHESIS,
            SupportType.DECISION: NodeType.GOAL
        }
    
    def state_to_graph_node(self, state: StateSnapshot, user_id: str) -> Node:
        """StateSnapshotをグラフノードに変換"""
        
        # 現在の状態から最も適切なノードタイプを決定
        node_type = self._determine_node_type(state)
        
        # ノードを作成
        node = Node(
            id=f"{node_type.value.lower()}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            type=node_type,
            text=state.goal or "探究中",
            student_id=user_id,
            timestamp=datetime.now(),
            state="tentative",
            confidence=0.7,
            tags=state.project_context.get("tags", []) if state.project_context else [],
            clarity=self._calculate_clarity(state),
            depth=self._calculate_depth(state),
            alignment_goal=0.7,
            metadata={
                "blockers": state.blockers,
                "uncertainties": state.uncertainties,
                "options": state.options_considered
            }
        )
        
        return node
    
    def _determine_node_type(self, state: StateSnapshot) -> NodeType:
        """状態から適切なノードタイプを決定"""
        
        # プロジェクトコンテキストから判断
        if state.project_context:
            if "hypothesis" in state.project_context and state.project_context["hypothesis"]:
                return NodeType.HYPOTHESIS
            elif "question" in state.project_context and state.project_context["question"]:
                return NodeType.QUESTION
            elif "theme" in state.project_context:
                return NodeType.TOPIC
        
        # ブロッカーや不確実性から判断
        if state.uncertainties and len(state.uncertainties) > 2:
            return NodeType.QUESTION
        elif state.blockers and len(state.blockers) > 0:
            return NodeType.CHALLENGE
        elif state.options_considered and len(state.options_considered) > 0:
            return NodeType.METHOD
        else:
            return NodeType.GOAL
    
    def _calculate_clarity(self, state: StateSnapshot) -> float:
        """状態から明確性スコアを計算"""
        score = 0.5
        
        # ゴールが明確なら+0.2
        if state.goal and len(state.goal) > 20:
            score += 0.2
        
        # 不確実性が少ないほど高スコア
        if len(state.uncertainties) == 0:
            score += 0.3
        elif len(state.uncertainties) <= 2:
            score += 0.1
        else:
            score -= 0.1
        
        return min(1.0, max(0.0, score))
    
    def _calculate_depth(self, state: StateSnapshot) -> float:
        """状態から深さスコアを計算"""
        score = 0.3
        
        # プロジェクトコンテキストの充実度
        if state.project_context:
            if "hypothesis" in state.project_context:
                score += 0.2
            if "method" in state.project_context:
                score += 0.2
            if "data" in state.project_context:
                score += 0.3
        
        return min(1.0, max(0.0, score))
    
    def decide_support_type_from_graph(self, node: Node) -> Tuple[str, str, float]:
        """グラフの現在位置から支援タイプを決定（構造的欠損を優先）"""
        
        # 1. 構造的欠損をチェック（最優先）
        structural_gaps = self.graph.check_structural_gaps(node.student_id)
        if structural_gaps:
            # 最優先の構造的欠損から支援タイプを決定
            top_gap = structural_gaps[0]
            
            if top_gap['type'] == 'structural_gap':
                missing_element = top_gap['missing_element']
                if missing_element in ['Question', 'Hypothesis']:
                    return SupportType.UNDERSTANDING, top_gap['clarification_prompt'], 0.95
                elif missing_element in ['Method', 'Data']:
                    return SupportType.PATHFINDING, top_gap['clarification_prompt'], 0.9
                else:
                    return SupportType.REFRAMING, top_gap['clarification_prompt'], 0.85
            
            elif top_gap['type'] in ['alignment_gap', 'depth_gap', 'cycle_gap']:
                return SupportType.REFRAMING, top_gap['gap_prompt'], 0.8
        
        # 2. ガード条件をチェック
        guards = self.graph.check_guards(node)
        if guards:
            # 明確化が必要な場合
            return SupportType.UNDERSTANDING, guards[0].message, 0.9
        
        # 3. 次のステップ提案から支援タイプを決定
        suggestions = self.graph.suggest_next_step(node)
        
        if not suggestions:
            # デフォルト：道筋提示
            return SupportType.PATHFINDING, "次のステップが不明確", 0.5
        
        # 最優先の提案から支援タイプを決定
        top_suggestion = suggestions[0]
        
        # 提案タイプに応じて支援タイプを選択
        if top_suggestion["type"] == "guard":
            return SupportType.UNDERSTANDING, top_suggestion["reason"], 0.9
        elif top_suggestion["type"] == "cycle":
            return SupportType.REFRAMING, "洞察から仮説への循環", 0.8
        elif "Hypothesis" in top_suggestion.get("action", ""):
            return SupportType.NARROWING, "仮説形成の支援", 0.7
        elif "Method" in top_suggestion.get("action", ""):
            return SupportType.ACTIVATION, "実行方法の具体化", 0.7
        elif "Data" in top_suggestion.get("action", ""):
            return SupportType.PATHFINDING, "データ収集の道筋", 0.6
        else:
            return SupportType.PATHFINDING, "探究プロセスの推進", 0.5
    
    def select_acts_from_graph(self, node: Node, support_type: str) -> Tuple[List[str], str]:
        """グラフ状態から発話アクトを選択"""
        
        selected_acts = []
        reason = ""
        
        # ノードタイプと支援タイプの組み合わせで発話アクトを決定
        act_mapping = {
            (NodeType.QUESTION, SupportType.UNDERSTANDING): [SpeechAct.CLARIFY, SpeechAct.PROBE],
            (NodeType.QUESTION, SupportType.PATHFINDING): [SpeechAct.OUTLINE, SpeechAct.INFORM],
            (NodeType.HYPOTHESIS, SupportType.NARROWING): [SpeechAct.DECIDE, SpeechAct.PROBE],
            (NodeType.HYPOTHESIS, SupportType.REFRAMING): [SpeechAct.REFRAME, SpeechAct.REFLECT],
            (NodeType.METHOD, SupportType.ACTIVATION): [SpeechAct.ACT, SpeechAct.OUTLINE],
            (NodeType.METHOD, SupportType.PATHFINDING): [SpeechAct.OUTLINE, SpeechAct.INFORM],
            (NodeType.DATA, SupportType.UNDERSTANDING): [SpeechAct.REFLECT, SpeechAct.PROBE],
            (NodeType.INSIGHT, SupportType.REFRAMING): [SpeechAct.REFRAME, SpeechAct.PROBE],
        }
        
        # マッピングから発話アクトを取得
        key = (node.type, support_type)
        if key in act_mapping:
            selected_acts = act_mapping[key]
            reason = f"{node.type.value}に対する{support_type}"
        else:
            # デフォルトの発話アクト
            if node.clarity < 0.5:
                selected_acts = [SpeechAct.CLARIFY, SpeechAct.PROBE]
                reason = "明確化が必要"
            elif node.depth < 0.3:
                selected_acts = [SpeechAct.PROBE, SpeechAct.INFORM]
                reason = "深掘りが必要"
            else:
                selected_acts = [SpeechAct.OUTLINE, SpeechAct.ACT]
                reason = "次の行動へ"
        
        return selected_acts[:2], reason
    
    def update_graph_from_response(self, 
                                  current_node: Node,
                                  response_type: str,
                                  response_content: str,
                                  confidence: float = 0.7) -> Optional[Node]:
        """応答に基づいてグラフを更新"""
        
        # 応答タイプから新しいノードタイプを決定
        response_to_node_mapping = {
            "question": NodeType.QUESTION,
            "hypothesis": NodeType.HYPOTHESIS,
            "method": NodeType.METHOD,
            "insight": NodeType.INSIGHT,
            "reflection": NodeType.REFLECTION
        }
        
        new_node_type = response_to_node_mapping.get(response_type)
        if not new_node_type:
            return None
        
        # 新しいノードを作成
        new_node = Node(
            id=f"{new_node_type.value.lower()}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            type=new_node_type,
            text=response_content[:200],  # 最初の200文字
            student_id=current_node.student_id,
            timestamp=datetime.now(),
            state="tentative",
            confidence=confidence,
            tags=current_node.tags,
            clarity=current_node.clarity * 0.9,  # 少し減衰
            depth=current_node.depth + 0.1,  # 深さ増加
            alignment_goal=current_node.alignment_goal
        )
        
        # グラフに追加
        self.graph.add_node(new_node)
        
        # エッジを作成（現在のノードから新しいノードへ）
        rel_type = self._determine_relation_type(current_node.type, new_node_type)
        if rel_type:
            edge = Edge(
                src=current_node.id,
                rel=rel_type,
                dst=new_node.id,
                confidence=confidence
            )
            self.graph.add_edge(edge)
        
        return new_node
    
    def create_enhanced_graph_node(self, 
                                  state: 'StateSnapshot', 
                                  user_message: str, 
                                  user_id: str,
                                  session_info: Optional[Dict[str, Any]] = None) -> Node:
        """拡張グラフノード作成（セッション情報と会話文脈の統合）"""
        
        # 基本ノード作成
        node = self.state_to_graph_node(state, user_id)
        node.text = user_message[:200] if user_message else node.text
        
        # セッション情報でノードを強化
        if session_info:
            node.metadata = node.metadata or {}
            node.metadata['session_id'] = session_info.get('session_id')
            node.metadata['interaction_count'] = session_info.get('interaction_count', 0)
            
            # 会話文脈を保存
            if hasattr(state, 'conversation_context') and state.conversation_context:
                node.metadata['conversation_context'] = state.conversation_context
            
            # 学習軌跡から深さを調整
            if session_info.get('learning_trajectory'):
                trajectory = session_info['learning_trajectory']
                depth_progression = [item.get('depth', 0.5) for item in trajectory[-5:]]
                
                if depth_progression:
                    # 深さの進行傾向を反映
                    avg_depth = sum(depth_progression) / len(depth_progression)
                    depth_trend = (depth_progression[-1] - depth_progression[0]) / len(depth_progression) if len(depth_progression) > 1 else 0
                    
                    node.depth = min(1.0, max(0.0, avg_depth + depth_trend * 0.1))
            
            # ユーザープリファレンスから明確性を調整
            if 'learning_style' in session_info.get('user_preferences', {}):
                style = session_info['user_preferences']['learning_style']
                
                # 分析的学習者は明確性を重視
                if isinstance(style, dict) and style.get('analytical', 0.5) > 0.7:
                    node.clarity = min(1.0, node.clarity * 1.1)
                # 探索的学習者は多少の曖昧さを許容
                elif isinstance(style, dict) and style.get('exploratory', 0.5) > 0.7:
                    node.clarity = max(0.0, node.clarity * 0.9)
        
        # 前のノードから文脈を引き継ぐ
        current_position = self.graph.get_current_position(user_id)
        if current_position and current_position.metadata and current_position.metadata.get('conversation_context'):
            # 前のノードの文脈を引き継いで拡張
            prev_context = current_position.metadata['conversation_context']
            if node.metadata and 'conversation_context' in node.metadata:
                # 文脈をマージ
                node.metadata['conversation_context'] = {
                    **prev_context,
                    **node.metadata['conversation_context'],
                    'previous_topic': prev_context.get('current_topic'),
                    'context_chain': prev_context.get('context_chain', []) + [prev_context.get('current_topic')]
                }
            elif node.metadata:
                node.metadata['conversation_context'] = prev_context
        
        # グラフに追加
        self.graph.add_node(node)
        
        # 前のノードとの関係を作成
        if current_position:
            rel_type = self._determine_relation_type(current_position.type, node.type)
            if rel_type:
                edge = Edge(
                    src=current_position.id,
                    rel=rel_type,
                    dst=node.id,
                    confidence=0.7
                )
                self.graph.add_edge(edge)
        
        return node
    
    def update_node_with_inference_result(self, node: Node, inference_result: Dict[str, Any]) -> None:
        """推論結果でノードを更新"""
        
        if not node.metadata:
            node.metadata = {}
        
        # 推論情報を保存
        node.metadata['inference_result'] = {
            'support_type': inference_result.get('support_type'),
            'confidence': inference_result.get('confidence'),
            'applied_rule': inference_result.get('applied_rule'),
            'inference_source': inference_result.get('inference_source'),
            'timestamp': datetime.now().isoformat()
        }
        
        # 信頼度に基づいてノードの状態を更新
        confidence = inference_result.get('confidence', 0.5)
        if confidence > 0.8:
            node.state = 'confirmed'
        elif confidence > 0.6:
            node.state = 'probable'
        else:
            node.state = 'tentative'
    
    def create_graph_edge_from_response(self, 
                                       current_node: Node,
                                       response_content: str,
                                       response_type: str,
                                       confidence: float = 0.6) -> Optional[Node]:
        """応答に基づいてグラフエッジと新ノードを作成"""
        
        # 応答タイプから新しいノードタイプを決定
        response_to_node_mapping = {
            "question": NodeType.QUESTION,
            "hypothesis": NodeType.HYPOTHESIS,
            "method": NodeType.METHOD,
            "insight": NodeType.INSIGHT,
            "reflection": NodeType.REFLECTION,
            "clarification": NodeType.QUESTION,
            "suggestion": NodeType.METHOD
        }
        
        new_node_type = response_to_node_mapping.get(response_type)
        if not new_node_type:
            return None
        
        # 新しいノードを作成
        new_node = Node(
            id=f"{new_node_type.value.lower()}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            type=new_node_type,
            text=response_content[:200],  # 最初の200文字
            student_id=current_node.student_id,
            timestamp=datetime.now(),
            state="assistant_generated",  # アシスタントが生成したノード
            confidence=confidence,
            tags=current_node.tags,
            clarity=current_node.clarity * 0.9,  # 少し減衰
            depth=current_node.depth + 0.05,  # 小幅増加
            alignment_goal=current_node.alignment_goal,
            metadata={
                "source": "assistant_response",
                "original_node": current_node.id,
                "response_type": response_type
            }
        )
        
        # グラフに追加
        self.graph.add_node(new_node)
        
        # エッジを作成（現在のノードから新しいノードへ）
        rel_type = self._determine_relation_type(current_node.type, new_node_type)
        if rel_type:
            edge = Edge(
                src=current_node.id,
                rel=rel_type,
                dst=new_node.id,
                confidence=confidence
            )
            self.graph.add_edge(edge)
        
        return new_node
    
    def get_node_learning_context(self, node: Node) -> Dict[str, Any]:
        """ノードの学習コンテキストを取得"""
        
        context = {
            'node_id': node.id,
            'node_type': node.type.value,
            'learning_stage': self._determine_learning_stage(node),
            'context_richness': self._calculate_context_richness(node),
            'connection_strength': self._calculate_connection_strength(node),
            'learning_patterns': self._extract_learning_patterns(node)
        }
        
        return context
    
    def _determine_learning_stage(self, node: Node) -> str:
        """ノードの学習段階を判定"""
        
        if node.type in [NodeType.TOPIC, NodeType.GOAL, NodeType.WILL]:
            return "初期探索"
        elif node.type in [NodeType.QUESTION, NodeType.NEED]:
            return "問題発見"
        elif node.type in [NodeType.HYPOTHESIS]:
            return "仮説形成"
        elif node.type in [NodeType.METHOD]:
            return "方法模索"
        elif node.type in [NodeType.DATA]:
            return "データ収集"
        elif node.type in [NodeType.INSIGHT, NodeType.REFLECTION]:
            return "洞察統合"
        else:
            return "未分類"
    
    def _calculate_context_richness(self, node: Node) -> float:
        """ノードのコンテキスト豊富度を計算"""
        
        richness = 0.0
        
        # メタデータの豊富さ
        if node.metadata:
            richness += min(0.3, len(node.metadata) * 0.05)
        
        # タグの多様性
        if node.tags:
            richness += min(0.2, len(node.tags) * 0.04)
        
        # テキストの長さ
        if node.text:
            richness += min(0.2, len(node.text) / 1000)
        
        # 会話コンテキストの有無
        if node.metadata and 'conversation_context' in node.metadata:
            context = node.metadata['conversation_context']
            if context.get('topics'):
                richness += min(0.3, len(context['topics']) * 0.06)
        
        return min(1.0, richness)
    
    def _calculate_connection_strength(self, node: Node) -> float:
        """ノードの接続強度を計算"""
        
        # このノードに関連するエッジの数と品質
        incoming_edges = [edge for edge in self.graph.edges.values() if edge.dst == node.id]
        outgoing_edges = [edge for edge in self.graph.edges.values() if edge.src == node.id]
        
        total_edges = len(incoming_edges) + len(outgoing_edges)
        if total_edges == 0:
            return 0.0
        
        # エッジの信頼度の平均
        total_confidence = sum(edge.confidence for edge in incoming_edges + outgoing_edges)
        avg_confidence = total_confidence / total_edges
        
        # 接続数の正規化（最大10接続として）
        connection_ratio = min(1.0, total_edges / 10)
        
        return avg_confidence * connection_ratio
    
    def _extract_learning_patterns(self, node: Node) -> List[str]:
        """ノードから学習パターンを抽出"""
        
        patterns = []
        
        # メタデータからパターンを抽出
        if node.metadata and 'conversation_context' in node.metadata:
            context = node.metadata['conversation_context']
            
            # 繰り返しパターン
            if context.get('context_chain') and len(context['context_chain']) > 1:
                if len(set(context['context_chain'])) < len(context['context_chain']) * 0.7:
                    patterns.append("反復学習パターン")
            
            # 探索パターン
            if context.get('topics') and len(context['topics']) > 3:
                patterns.append("多角的探索パターン")
            
            # 深掘りパターン
            if context.get('key_phrases') and any("深く" in phrase or "詳しく" in phrase for phrase in context['key_phrases']):
                patterns.append("深掘り学習パターン")
        
        # ノード属性からパターンを抽出
        if node.depth > 0.7:
            patterns.append("深い理解追求")
        if node.clarity > 0.8:
            patterns.append("明確性重視")
        
        return patterns
    
    def _determine_relation_type(self, src_type: NodeType, dst_type: NodeType) -> Optional[RelationType]:
        """ノードタイプ間の関係を決定"""
        
        relation_mapping = {
            (NodeType.TOPIC, NodeType.QUESTION): RelationType.GENERATES,
            (NodeType.WILL, NodeType.QUESTION): RelationType.MOTIVATES,
            (NodeType.NEED, NodeType.QUESTION): RelationType.GROUNDS,
            (NodeType.GOAL, NodeType.QUESTION): RelationType.FRAMES,
            (NodeType.QUESTION, NodeType.HYPOTHESIS): RelationType.LEADS_TO,
            (NodeType.HYPOTHESIS, NodeType.METHOD): RelationType.IS_TESTED_BY,
            (NodeType.METHOD, NodeType.DATA): RelationType.RESULTS_IN,
            (NodeType.DATA, NodeType.INSIGHT): RelationType.LEADS_TO_INSIGHT,
            (NodeType.INSIGHT, NodeType.HYPOTHESIS): RelationType.MODIFIES,
            (NodeType.QUESTION, NodeType.GOAL): RelationType.ALIGNED_WITH
        }
        
        return relation_mapping.get((src_type, dst_type))
    
    def get_graph_context(self, student_id: str) -> Dict[str, Any]:
        """学習者のグラフコンテキストを取得（構造的欠損情報を含む）"""
        
        # 現在位置
        current_position = self.graph.get_current_position(student_id)
        
        # 進捗計算
        progress = self.graph.calculate_progress(student_id)
        
        # 次のステップ提案
        suggestions = []
        if current_position:
            suggestions = self.graph.suggest_next_step(current_position)
        
        # 構造的欠損をチェック
        structural_gaps = self.graph.check_structural_gaps(student_id)
        
        return {
            "current_node": current_position.to_dict() if current_position else None,
            "progress": progress,
            "suggestions": suggestions,
            "structural_gaps": structural_gaps,
            "graph_size": len(self.graph.nodes),
            "cycles_completed": progress.get("cycles_completed", 0),
            "ontology_completeness": self._calculate_ontology_completeness(student_id, structural_gaps)
        }
    
    def _calculate_ontology_completeness(self, student_id: str, structural_gaps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """オントロジーの完成度を計算"""
        
        # 学習者のノードを取得
        student_nodes = [node for node in self.graph.nodes.values() if node.student_id == student_id]
        
        # 基本要素の存在チェック
        node_types_present = set(node.type.value for node in student_nodes)
        required_types = ['Goal', 'Question', 'Hypothesis', 'Method', 'Data', 'Insight']
        
        completeness_score = len(node_types_present.intersection(required_types)) / len(required_types)
        
        # 構造的欠損の数でペナルティ
        high_priority_gaps = len([gap for gap in structural_gaps if gap.get('priority') == 'high'])
        gap_penalty = min(0.5, high_priority_gaps * 0.1)
        
        final_score = max(0.0, completeness_score - gap_penalty)
        
        return {
            "score": final_score,
            "present_elements": list(node_types_present),
            "missing_elements": list(set(required_types) - node_types_present),
            "high_priority_gaps": high_priority_gaps,
            "total_gaps": len(structural_gaps)
        }
    
    def export_current_state(self):
        """現在のグラフ状態をエクスポート"""
        self.graph.export_to_jsonl("node_export.jsonl", "edges_export.jsonl")
        logger.info("グラフ状態をエクスポートしました")