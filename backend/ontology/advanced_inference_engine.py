"""
高度なグラフ推論エンジン
機械学習ベースの動的ルール生成と適応的推論システム
"""

import logging
import json
import pickle
from typing import List, Dict, Optional, Any, Tuple, Set
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass
import numpy as np
from pathlib import Path

from .ontology_graph import (
    InquiryOntologyGraph, Node, Edge, NodeType, RelationType
)
from .graph_inference_engine import GraphInferenceEngine, InferenceRule
from conversation_agent.schema import StateSnapshot, SupportType, SpeechAct

logger = logging.getLogger(__name__)


@dataclass
class LearningPattern:
    """学習パターン"""
    pattern_id: str
    sequence: List[NodeType]
    success_rate: float
    usage_count: int
    last_used: datetime
    effectiveness_score: float
    context_conditions: Dict[str, Any]


@dataclass
class AdaptiveRule:
    """適応的ルール"""
    rule_id: str
    name: str
    condition_template: str
    action_template: str
    priority: float
    confidence: float
    success_count: int
    failure_count: int
    learned_from_patterns: List[str]
    created_at: datetime
    last_updated: datetime


@dataclass
class UserProfile:
    """ユーザープロファイル"""
    user_id: str
    learning_style: Dict[str, float]  # analytical, creative, structured, exploratory
    preferred_support_types: Dict[str, float]
    effective_act_combinations: Dict[str, float]
    difficulty_preferences: Dict[str, float]
    session_patterns: List[Dict[str, Any]]
    adaptation_history: List[Dict[str, Any]]


class AdvancedInferenceEngine(GraphInferenceEngine):
    """高度な推論エンジン（学習・適応機能付き）"""
    
    def __init__(self, graph: InquiryOntologyGraph, model_dir: str = "inference_models"):
        super().__init__(graph)
        
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        # 学習システム
        self.learned_patterns: Dict[str, LearningPattern] = {}
        self.adaptive_rules: Dict[str, AdaptiveRule] = {}
        self.user_profiles: Dict[str, UserProfile] = {}
        
        # 推論履歴
        self.inference_history: List[Dict[str, Any]] = []
        self.feedback_history: List[Dict[str, Any]] = []
        
        # パフォーマンス統計
        self.rule_performance: Dict[str, Dict[str, float]] = defaultdict(lambda: {
            'success_rate': 0.0,
            'usage_count': 0,
            'avg_confidence': 0.0,
            'user_satisfaction': 0.0
        })
        
        # 動的重み
        self.dynamic_weights: Dict[str, float] = {
            'pattern_match': 0.3,
            'rule_confidence': 0.25,
            'user_preference': 0.2,
            'context_similarity': 0.15,
            'temporal_relevance': 0.1
        }
        
        # 学習済みモデルを読み込み
        self._load_models()
        
        # 基本ルールに加えて学習ルールを初期化
        self._initialize_adaptive_rules()
    
    def _load_models(self):
        """学習済みモデルを読み込み"""
        try:
            # パターンデータ
            patterns_file = self.model_dir / "learned_patterns.pkl"
            if patterns_file.exists():
                with open(patterns_file, 'rb') as f:
                    self.learned_patterns = pickle.load(f)
                logger.info(f"✅ 学習パターン読み込み: {len(self.learned_patterns)} patterns")
            
            # 適応ルール
            rules_file = self.model_dir / "adaptive_rules.pkl"
            if rules_file.exists():
                with open(rules_file, 'rb') as f:
                    self.adaptive_rules = pickle.load(f)
                logger.info(f"✅ 適応ルール読み込み: {len(self.adaptive_rules)} rules")
            
            # ユーザープロファイル
            profiles_file = self.model_dir / "user_profiles.pkl"
            if profiles_file.exists():
                with open(profiles_file, 'rb') as f:
                    self.user_profiles = pickle.load(f)
                logger.info(f"✅ ユーザープロファイル読み込み: {len(self.user_profiles)} users")
                
        except Exception as e:
            logger.error(f"❌ モデル読み込みエラー: {e}")
    
    def _save_models(self):
        """学習済みモデルを保存"""
        try:
            # パターンデータ
            with open(self.model_dir / "learned_patterns.pkl", 'wb') as f:
                pickle.dump(self.learned_patterns, f)
            
            # 適応ルール
            with open(self.model_dir / "adaptive_rules.pkl", 'wb') as f:
                pickle.dump(self.adaptive_rules, f)
            
            # ユーザープロファイル
            with open(self.model_dir / "user_profiles.pkl", 'wb') as f:
                pickle.dump(self.user_profiles, f)
                
            logger.info("💾 学習モデル保存完了")
            
        except Exception as e:
            logger.error(f"❌ モデル保存エラー: {e}")
    
    def _initialize_adaptive_rules(self):
        """適応ルールを初期化"""
        
        # ベースルールから適応ルールを生成
        base_adaptive_rules = [
            AdaptiveRule(
                rule_id="adaptive_clarity_boost",
                name="明確性向上ルール",
                condition_template="node.clarity < {threshold} and node.type == {node_type}",
                action_template="support_type=UNDERSTANDING, acts=[CLARIFY, PROBE], reason='明確性向上'",
                priority=8.0,
                confidence=0.9,
                success_count=0,
                failure_count=0,
                learned_from_patterns=[],
                created_at=datetime.now(),
                last_updated=datetime.now()
            ),
            AdaptiveRule(
                rule_id="adaptive_depth_progression",
                name="深度進行ルール",
                condition_template="node.depth > {threshold} and has_child_count < {min_children}",
                action_template="support_type=PATHFINDING, acts=[OUTLINE, ACT], reason='深度進行'",
                priority=7.0,
                confidence=0.8,
                success_count=0,
                failure_count=0,
                learned_from_patterns=[],
                created_at=datetime.now(),
                last_updated=datetime.now()
            )
        ]
        
        for rule in base_adaptive_rules:
            if rule.rule_id not in self.adaptive_rules:
                self.adaptive_rules[rule.rule_id] = rule
    
    def infer_next_step_advanced(self, current_node: Node, user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """高度な推論（学習・適応機能と構造的チェック付き）"""
        
        # 0. 構造的欠損チェック（最優先）
        structural_gaps = self.graph.check_structural_gaps(current_node.student_id)
        if structural_gaps:
            # 構造的欠損に基づく推論結果を返す
            top_gap = structural_gaps[0]
            return self._create_structural_inference_result(current_node, top_gap, structural_gaps)
        
        # 1. ユーザープロファイルを取得
        user_profile = self._get_or_create_user_profile(current_node.student_id)
        
        # 2. コンテキスト分析（構造的情報を含む）
        context_features = self._extract_context_features(current_node, user_context)
        context_features['structural_completeness'] = len(structural_gaps) == 0
        context_features['ontology_gaps'] = len(structural_gaps)
        
        # 3. パターンマッチング
        pattern_matches = self._find_pattern_matches(current_node, context_features)
        
        # 4. 適応ルール評価
        adaptive_results = self._evaluate_adaptive_rules(current_node, context_features, user_profile)
        
        # 5. 基本ルール評価
        basic_result = super().infer_next_step(current_node)
        
        # 6. 結果の統合と重み付け
        final_result = self._integrate_inference_results(
            basic_result, adaptive_results, pattern_matches, 
            user_profile, context_features
        )
        
        # 7. 構造的情報を結果に追加
        final_result['structural_analysis'] = {
            'gaps_found': len(structural_gaps),
            'ontology_completeness': context_features.get('structural_completeness', False),
            'resolution_focus': 'structural' if structural_gaps else 'content'
        }
        
        # 8. 推論履歴に記録
        self._record_inference(current_node, final_result, context_features)
        
        return final_result
    
    def _create_structural_inference_result(self, current_node: Node, top_gap: Dict[str, Any], all_gaps: List[Dict[str, Any]]) -> Dict[str, Any]:
        """構造的欠損に基づく推論結果を作成"""
        
        missing_element = top_gap['missing_element']
        
        # 支援タイプを決定
        if missing_element in ['Question', 'Hypothesis']:
            support_type = SupportType.UNDERSTANDING
            acts = [SpeechAct.CLARIFY, SpeechAct.PROBE]
        elif missing_element in ['Method', 'Data']:
            support_type = SupportType.PATHFINDING  
            acts = [SpeechAct.OUTLINE, SpeechAct.ACT]
        else:
            support_type = SupportType.REFRAMING
            acts = [SpeechAct.REFRAME, SpeechAct.REFLECT]
        
        return {
            "support_type": support_type,
            "acts": acts,
            "reason": top_gap['clarification_prompt'],
            "confidence": 0.95,  # 構造的欠損は高い確信度
            "inference_source": f"structural_gap:{top_gap['type']}",
            "structural_analysis": {
                "primary_gap": top_gap,
                "total_gaps": len(all_gaps),
                "missing_element": missing_element,
                "priority": top_gap.get('priority', 'medium'),
                "resolution_focus": "structural_completion"
            },
            "next_ontology_step": {
                "create_node_type": missing_element,
                "establish_relation": top_gap.get('required_relation'),
                "from_node": current_node.id
            }
        }
    
    def _get_or_create_user_profile(self, user_id: str) -> UserProfile:
        """ユーザープロファイルを取得または作成"""
        
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = UserProfile(
                user_id=user_id,
                learning_style={
                    'analytical': 0.5,
                    'creative': 0.5,
                    'structured': 0.5,
                    'exploratory': 0.5
                },
                preferred_support_types={st: 0.5 for st in SupportType.ALL_TYPES},
                effective_act_combinations={},
                difficulty_preferences={
                    'low': 0.3,
                    'medium': 0.5,
                    'high': 0.2
                },
                session_patterns=[],
                adaptation_history=[]
            )
        
        return self.user_profiles[user_id]
    
    def _extract_context_features(self, node: Node, user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """コンテキスト特徴量を抽出（会話文脈を含む）"""
        
        features = {
            'node_type': node.type.value,
            'clarity': node.clarity,
            'depth': node.depth,
            'confidence': node.confidence,
            'alignment_goal': node.alignment_goal,
            'tag_count': len(node.tags),
            'metadata_keys': list(node.metadata.keys()) if node.metadata else [],
            'time_since_creation': (datetime.now() - node.timestamp).total_seconds() / 3600,  # hours
            'session_context': user_context or {}
        }
        
        # ★重要: 会話文脈を特徴量に追加
        if node.metadata and 'conversation_context' in node.metadata:
            conv_context = node.metadata['conversation_context']
            features['has_conversation_context'] = True
            features['current_topic'] = conv_context.get('current_topic')
            features['mentioned_entities'] = conv_context.get('mentioned_entities', [])
            features['context_chain'] = conv_context.get('context_chain', [])
            features['key_phrases'] = conv_context.get('key_phrases', [])
        else:
            features['has_conversation_context'] = False
            features['current_topic'] = None
            features['mentioned_entities'] = []
            features['context_chain'] = []
            features['key_phrases'] = []
        
        # グラフ構造的特徴
        neighbors = self.graph.get_node_neighbors(node.id, "both")
        features['neighbor_count'] = len(neighbors)
        features['neighbor_types'] = [n.type.value for n, _ in neighbors]
        
        # ユーザーの履歴的特徴
        recent_nodes = self._get_recent_nodes(node.student_id, self.graph, limit=5)
        features['recent_node_types'] = [n.type.value for n in recent_nodes]
        features['recent_avg_clarity'] = np.mean([n.clarity for n in recent_nodes]) if recent_nodes else 0.5
        features['recent_avg_depth'] = np.mean([n.depth for n in recent_nodes]) if recent_nodes else 0.5
        
        return features
    
    def _find_pattern_matches(self, node: Node, context_features: Dict[str, Any]) -> List[Tuple[LearningPattern, float]]:
        """学習パターンとのマッチングを実行"""
        
        matches = []
        recent_sequence = context_features.get('recent_node_types', [])
        current_sequence = recent_sequence + [node.type.value]
        
        for pattern in self.learned_patterns.values():
            # シーケンスマッチング
            sequence_similarity = self._calculate_sequence_similarity(
                [nt.value for nt in pattern.sequence], 
                current_sequence
            )
            
            # コンテキスト条件マッチング
            context_similarity = self._calculate_context_similarity(
                pattern.context_conditions, 
                context_features
            )
            
            # 総合類似度
            total_similarity = (sequence_similarity * 0.6 + context_similarity * 0.4)
            
            if total_similarity > 0.3:  # 閾値
                matches.append((pattern, total_similarity))
        
        # 類似度でソート
        matches.sort(key=lambda x: x[1], reverse=True)
        return matches[:5]  # 上位5件
    
    def _calculate_sequence_similarity(self, pattern_seq: List[str], current_seq: List[str]) -> float:
        """シーケンス類似度を計算"""
        
        if not pattern_seq or not current_seq:
            return 0.0
        
        # 最長共通部分列 (LCS) を使用
        m, n = len(pattern_seq), len(current_seq)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if pattern_seq[i-1] == current_seq[j-1]:
                    dp[i][j] = dp[i-1][j-1] + 1
                else:
                    dp[i][j] = max(dp[i-1][j], dp[i][j-1])
        
        lcs_length = dp[m][n]
        return lcs_length / max(m, n)
    
    def _calculate_context_similarity(self, pattern_context: Dict[str, Any], current_context: Dict[str, Any]) -> float:
        """コンテキスト類似度を計算"""
        
        if not pattern_context:
            return 1.0
        
        similarities = []
        
        for key, pattern_value in pattern_context.items():
            if key in current_context:
                current_value = current_context[key]
                
                if isinstance(pattern_value, (int, float)) and isinstance(current_value, (int, float)):
                    # 数値の場合：正規化された差
                    if pattern_value == 0 and current_value == 0:
                        sim = 1.0
                    else:
                        sim = 1.0 - abs(pattern_value - current_value) / max(abs(pattern_value), abs(current_value), 1.0)
                elif isinstance(pattern_value, str) and isinstance(current_value, str):
                    # 文字列の場合：完全一致
                    sim = 1.0 if pattern_value == current_value else 0.0
                elif isinstance(pattern_value, list) and isinstance(current_value, list):
                    # リストの場合：ジャッカード係数
                    set1, set2 = set(pattern_value), set(current_value)
                    if not set1 and not set2:
                        sim = 1.0
                    else:
                        sim = len(set1 & set2) / len(set1 | set2) if set1 | set2 else 0.0
                else:
                    sim = 0.5  # デフォルト
                
                similarities.append(sim)
        
        return np.mean(similarities) if similarities else 0.5
    
    def _evaluate_adaptive_rules(self, node: Node, context_features: Dict[str, Any], user_profile: UserProfile) -> List[Dict[str, Any]]:
        """適応ルールを評価"""
        
        applicable_rules = []
        
        for rule in self.adaptive_rules.values():
            try:
                # ルール条件を評価
                if self._evaluate_rule_condition(rule, node, context_features, user_profile):
                    # アクションを生成
                    action = self._generate_rule_action(rule, node, context_features, user_profile)
                    
                    # 信頼度を計算
                    confidence = self._calculate_rule_confidence(rule, context_features, user_profile)
                    
                    applicable_rules.append({
                        'rule': rule,
                        'action': action,
                        'confidence': confidence,
                        'priority': rule.priority
                    })
                    
            except Exception as e:
                logger.error(f"ルール評価エラー: {rule.name} - {e}")
        
        # 優先度と信頼度でソート
        applicable_rules.sort(key=lambda x: (x['priority'], x['confidence']), reverse=True)
        return applicable_rules
    
    def _evaluate_rule_condition(self, rule: AdaptiveRule, node: Node, context: Dict[str, Any], profile: UserProfile) -> bool:
        """ルール条件を評価"""
        
        # 基本的なテンプレート評価
        condition = rule.condition_template
        
        # 動的パラメータ置換
        if 'clarity' in condition:
            # ユーザーのスタイルに基づいて閾値を調整
            clarity_threshold = 0.5 * (1.0 + profile.learning_style.get('analytical', 0.5) - 0.5)
            condition = condition.replace('{threshold}', str(clarity_threshold))
        
        if 'depth' in condition:
            depth_threshold = 0.6 * (1.0 + profile.learning_style.get('structured', 0.5) - 0.5)
            condition = condition.replace('{threshold}', str(depth_threshold))
        
        if '{node_type}' in condition:
            condition = condition.replace('{node_type}', f"'{node.type.value}'")
        
        # 安全な評価環境
        safe_dict = {
            'node': node,
            'context': context,
            'profile': profile,
            'NodeType': NodeType
        }
        
        try:
            return eval(condition, {"__builtins__": {}}, safe_dict)
        except:
            return False
    
    def _generate_rule_action(self, rule: AdaptiveRule, node: Node, context: Dict[str, Any], profile: UserProfile) -> Dict[str, Any]:
        """ルールアクションを生成"""
        
        # アクションテンプレートをパース
        action_str = rule.action_template
        
        # ユーザープロファイルに基づく調整
        if 'support_type=' in action_str:
            # サポートタイプをユーザー好みに調整
            preferred_support = max(profile.preferred_support_types.items(), key=lambda x: x[1])
            if preferred_support[1] > 0.7:  # 強い好みがある場合
                action_str = action_str.replace('UNDERSTANDING', preferred_support[0])
        
        # 基本的なパース
        action = {
            'support_type': SupportType.PATHFINDING,
            'acts': [SpeechAct.OUTLINE, SpeechAct.INFORM],
            'reason': '適応ルール適用',
            'next_node_type': NodeType.QUESTION,
            'confidence': rule.confidence,
            'applied_rule': rule.rule_id
        }
        
        # 簡単なパーシング（実装を簡略化）
        if 'UNDERSTANDING' in action_str:
            action['support_type'] = SupportType.UNDERSTANDING
            action['acts'] = [SpeechAct.CLARIFY, SpeechAct.PROBE]
        elif 'PATHFINDING' in action_str:
            action['support_type'] = SupportType.PATHFINDING
            action['acts'] = [SpeechAct.OUTLINE, SpeechAct.ACT]
        elif 'REFRAMING' in action_str:
            action['support_type'] = SupportType.REFRAMING
            action['acts'] = [SpeechAct.REFRAME, SpeechAct.REFLECT]
        
        return action
    
    def _calculate_rule_confidence(self, rule: AdaptiveRule, context: Dict[str, Any], profile: UserProfile) -> float:
        """ルール信頼度を計算"""
        
        base_confidence = rule.confidence
        
        # 成功率による調整
        total_uses = rule.success_count + rule.failure_count
        if total_uses > 0:
            success_rate = rule.success_count / total_uses
            success_factor = success_rate * 2 - 1  # -1 to 1
            base_confidence += success_factor * 0.2
        
        # ユーザー適合度による調整
        user_factor = self._calculate_user_rule_fit(rule, profile)
        base_confidence += user_factor * 0.1
        
        # コンテキスト適合度による調整
        context_factor = self._calculate_context_rule_fit(rule, context)
        base_confidence += context_factor * 0.1
        
        return max(0.0, min(1.0, base_confidence))
    
    def _calculate_user_rule_fit(self, rule: AdaptiveRule, profile: UserProfile) -> float:
        """ユーザーとルールの適合度を計算"""
        
        # ルールの特性とユーザーの学習スタイルの一致度
        rule_characteristics = {
            'clarity_boost': 'analytical',
            'depth_progression': 'structured',
            'creative_exploration': 'creative',
            'flexible_adaptation': 'exploratory'
        }
        
        fit_score = 0.0
        for char, style in rule_characteristics.items():
            if char in rule.rule_id.lower():
                fit_score += profile.learning_style.get(style, 0.5) - 0.5
        
        return fit_score
    
    def _calculate_context_rule_fit(self, rule: AdaptiveRule, context: Dict[str, Any]) -> float:
        """コンテキストとルールの適合度を計算"""
        
        # 時間的関連性
        hours_since_creation = context.get('time_since_creation', 0)
        if hours_since_creation < 1:  # 新しいノード
            temporal_factor = 0.2
        elif hours_since_creation < 24:  # 1日以内
            temporal_factor = 0.0
        else:  # 古いノード
            temporal_factor = -0.1
        
        # ノードタイプとの関連性
        node_type = context.get('node_type', '')
        type_factor = 0.0
        if 'question' in rule.rule_id.lower() and node_type == 'Question':
            type_factor = 0.1
        elif 'hypothesis' in rule.rule_id.lower() and node_type == 'Hypothesis':
            type_factor = 0.1
        
        return temporal_factor + type_factor
    
    def _integrate_inference_results(self, basic_result: Dict[str, Any], 
                                   adaptive_results: List[Dict[str, Any]], 
                                   pattern_matches: List[Tuple[LearningPattern, float]],
                                   user_profile: UserProfile,
                                   context_features: Dict[str, Any]) -> Dict[str, Any]:
        """推論結果を統合"""
        
        # 候補リストを作成
        candidates = []
        
        # 基本ルール結果
        candidates.append({
            'result': basic_result,
            'score': basic_result.get('confidence', 0.5) * self.dynamic_weights['rule_confidence'],
            'source': 'basic_rule'
        })
        
        # 適応ルール結果
        for adaptive in adaptive_results[:3]:  # 上位3件
            candidates.append({
                'result': adaptive['action'],
                'score': adaptive['confidence'] * self.dynamic_weights['rule_confidence'],
                'source': f"adaptive_rule:{adaptive['rule'].rule_id}"
            })
        
        # パターンマッチ結果
        for pattern, similarity in pattern_matches[:2]:  # 上位2件
            pattern_result = self._generate_pattern_action(pattern, context_features)
            candidates.append({
                'result': pattern_result,
                'score': similarity * pattern.effectiveness_score * self.dynamic_weights['pattern_match'],
                'source': f"pattern:{pattern.pattern_id}"
            })
        
        # ユーザー好み調整
        for candidate in candidates:
            user_pref_score = self._calculate_user_preference_score(
                candidate['result'], user_profile
            )
            candidate['score'] += user_pref_score * self.dynamic_weights['user_preference']
        
        # 最高スコアの候補を選択
        best_candidate = max(candidates, key=lambda x: x['score'])
        
        # 結果を調整
        final_result = best_candidate['result'].copy()
        final_result['inference_source'] = best_candidate['source']
        final_result['integrated_score'] = best_candidate['score']
        final_result['all_candidates'] = [
            {
                'source': c['source'],
                'score': c['score'],
                'support_type': c['result'].get('support_type', ''),
                'acts': c['result'].get('acts', [])
            }
            for c in candidates
        ]
        
        return final_result
    
    def _generate_pattern_action(self, pattern: LearningPattern, context: Dict[str, Any]) -> Dict[str, Any]:
        """パターンからアクションを生成"""
        
        # パターンの次のステップを予測
        current_type = context.get('node_type', '')
        
        # パターンシーケンスから次のタイプを予測
        try:
            current_index = [nt.value for nt in pattern.sequence].index(current_type)
            if current_index < len(pattern.sequence) - 1:
                next_type = pattern.sequence[current_index + 1]
            else:
                next_type = pattern.sequence[0]  # 循環
        except ValueError:
            next_type = pattern.sequence[0] if pattern.sequence else NodeType.QUESTION
        
        # タイプベースのアクション生成
        type_actions = {
            NodeType.QUESTION: {
                'support_type': SupportType.UNDERSTANDING,
                'acts': [SpeechAct.CLARIFY, SpeechAct.PROBE]
            },
            NodeType.HYPOTHESIS: {
                'support_type': SupportType.NARROWING,
                'acts': [SpeechAct.DECIDE, SpeechAct.OUTLINE]
            },
            NodeType.METHOD: {
                'support_type': SupportType.ACTIVATION,
                'acts': [SpeechAct.ACT, SpeechAct.INFORM]
            },
            NodeType.DATA: {
                'support_type': SupportType.REFRAMING,
                'acts': [SpeechAct.REFLECT, SpeechAct.PROBE]
            },
            NodeType.INSIGHT: {
                'support_type': SupportType.REFRAMING,
                'acts': [SpeechAct.REFRAME, SpeechAct.REFLECT]
            }
        }
        
        action = type_actions.get(next_type, type_actions[NodeType.QUESTION])
        
        return {
            'support_type': action['support_type'],
            'acts': action['acts'],
            'reason': f'パターン"{pattern.pattern_id}"から予測',
            'next_node_type': next_type,
            'confidence': pattern.effectiveness_score,
            'applied_rule': f'pattern_{pattern.pattern_id}'
        }
    
    def _calculate_user_preference_score(self, result: Dict[str, Any], profile: UserProfile) -> float:
        """ユーザー好みスコアを計算"""
        
        support_type = result.get('support_type', '')
        acts = result.get('acts', [])
        
        # サポートタイプ好み
        support_pref = profile.preferred_support_types.get(support_type, 0.5)
        
        # アクト組み合わせ好み
        acts_key = '_'.join(sorted(acts))
        acts_pref = profile.effective_act_combinations.get(acts_key, 0.5)
        
        return (support_pref - 0.5) * 0.3 + (acts_pref - 0.5) * 0.2
    
    def _record_inference(self, node: Node, result: Dict[str, Any], context: Dict[str, Any]):
        """推論履歴を記録"""
        
        record = {
            'timestamp': datetime.now().isoformat(),
            'user_id': node.student_id,
            'node_id': node.id,
            'node_type': node.type.value,
            'context_features': context,
            'inference_result': result,
            'source': result.get('inference_source', 'unknown')
        }
        
        self.inference_history.append(record)
        
        # 履歴サイズ制限
        if len(self.inference_history) > 10000:
            self.inference_history = self.inference_history[-5000:]
    
    def learn_from_feedback(self, inference_id: str, user_id: str, feedback: Dict[str, Any]):
        """フィードバックから学習"""
        
        # フィードバックを記録
        feedback_record = {
            'timestamp': datetime.now().isoformat(),
            'inference_id': inference_id,
            'user_id': user_id,
            'feedback': feedback
        }
        self.feedback_history.append(feedback_record)
        
        # ユーザープロファイルを更新
        self._update_user_profile_from_feedback(user_id, feedback)
        
        # パターンを更新
        self._update_patterns_from_feedback(user_id, feedback)
        
        # ルールを更新
        self._update_rules_from_feedback(feedback)
        
        # モデルを保存
        self._save_models()
        
        logger.info(f"📚 フィードバック学習完了: {user_id}")
    
    def _update_user_profile_from_feedback(self, user_id: str, feedback: Dict[str, Any]):
        """フィードバックからユーザープロファイルを更新"""
        
        profile = self._get_or_create_user_profile(user_id)
        
        satisfaction = feedback.get('satisfaction', 0.5)
        effectiveness = feedback.get('effectiveness', 0.5)
        
        if 'support_type' in feedback:
            support_type = feedback['support_type']
            current_pref = profile.preferred_support_types.get(support_type, 0.5)
            # 指数移動平均で更新
            alpha = 0.1
            profile.preferred_support_types[support_type] = (
                current_pref * (1 - alpha) + satisfaction * alpha
            )
        
        if 'acts' in feedback:
            acts_key = '_'.join(sorted(feedback['acts']))
            current_eff = profile.effective_act_combinations.get(acts_key, 0.5)
            alpha = 0.1
            profile.effective_act_combinations[acts_key] = (
                current_eff * (1 - alpha) + effectiveness * alpha
            )
        
        # 適応履歴に追加
        profile.adaptation_history.append({
            'timestamp': datetime.now().isoformat(),
            'feedback_summary': {
                'satisfaction': satisfaction,
                'effectiveness': effectiveness
            }
        })
        
        # 履歴サイズ制限
        if len(profile.adaptation_history) > 100:
            profile.adaptation_history = profile.adaptation_history[-50:]
    
    def _update_patterns_from_feedback(self, user_id: str, feedback: Dict[str, Any]):
        """フィードバックからパターンを更新"""
        
        effectiveness = feedback.get('effectiveness', 0.5)
        
        # 最近の推論でパターンが使われた場合
        recent_inferences = [
            r for r in self.inference_history[-10:]
            if r['user_id'] == user_id and 'pattern:' in r.get('source', '')
        ]
        
        for inference in recent_inferences:
            pattern_id = inference['source'].split(':')[1]
            if pattern_id in self.learned_patterns:
                pattern = self.learned_patterns[pattern_id]
                
                # 効果スコアを更新
                alpha = 0.2
                pattern.effectiveness_score = (
                    pattern.effectiveness_score * (1 - alpha) + effectiveness * alpha
                )
                
                # 使用カウント増加
                pattern.usage_count += 1
                pattern.last_used = datetime.now()
    
    def _update_rules_from_feedback(self, feedback: Dict[str, Any]):
        """フィードバックからルールを更新"""
        
        effectiveness = feedback.get('effectiveness', 0.5)
        
        # 最近の推論で適応ルールが使われた場合
        recent_adaptive_inferences = [
            r for r in self.inference_history[-5:]
            if 'adaptive_rule:' in r.get('source', '')
        ]
        
        for inference in recent_adaptive_inferences:
            rule_id = inference['source'].split(':')[1]
            if rule_id in self.adaptive_rules:
                rule = self.adaptive_rules[rule_id]
                
                # 成功/失敗カウント更新
                if effectiveness > 0.6:
                    rule.success_count += 1
                else:
                    rule.failure_count += 1
                
                # 信頼度調整
                total_uses = rule.success_count + rule.failure_count
                if total_uses > 0:
                    success_rate = rule.success_count / total_uses
                    rule.confidence = min(0.95, max(0.1, success_rate))
                
                rule.last_updated = datetime.now()
    
    def discover_new_patterns(self, user_id: str, min_support: int = 3) -> List[LearningPattern]:
        """新しいパターンを発見"""
        
        # ユーザーの履歴からシーケンスを抽出
        user_nodes = [n for n in self.graph.nodes.values() if n.student_id == user_id]
        user_nodes.sort(key=lambda n: n.timestamp)
        
        # ノードタイプシーケンスを作成
        type_sequence = [n.type for n in user_nodes]
        
        # 頻出パターンマイニング
        new_patterns = []
        
        for length in range(3, 6):  # 長さ3-5のパターン
            for i in range(len(type_sequence) - length + 1):
                pattern_seq = type_sequence[i:i+length]
                
                # パターンの出現回数をカウント
                occurrences = self._count_pattern_occurrences(pattern_seq, type_sequence)
                
                if occurrences >= min_support:
                    # 新しいパターンとして追加
                    pattern_id = f"discovered_{user_id}_{length}_{i}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
                    
                    # 効果スコアを初期化（過去の成功事例から推測）
                    effectiveness = self._estimate_pattern_effectiveness(pattern_seq, user_id)
                    
                    new_pattern = LearningPattern(
                        pattern_id=pattern_id,
                        sequence=pattern_seq,
                        success_rate=0.5,
                        usage_count=0,
                        last_used=datetime.now(),
                        effectiveness_score=effectiveness,
                        context_conditions=self._extract_pattern_context(pattern_seq, user_nodes[i:i+length])
                    )
                    
                    self.learned_patterns[pattern_id] = new_pattern
                    new_patterns.append(new_pattern)
        
        logger.info(f"🔍 新パターン発見: {len(new_patterns)} patterns for user {user_id}")
        return new_patterns
    
    def _count_pattern_occurrences(self, pattern: List[NodeType], sequence: List[NodeType]) -> int:
        """パターンの出現回数をカウント"""
        count = 0
        pattern_len = len(pattern)
        
        for i in range(len(sequence) - pattern_len + 1):
            if sequence[i:i+pattern_len] == pattern:
                count += 1
        
        return count
    
    def _estimate_pattern_effectiveness(self, pattern: List[NodeType], user_id: str) -> float:
        """パターンの効果を推定"""
        
        # 類似パターンの効果から推定
        similar_effectiveness = []
        
        for existing_pattern in self.learned_patterns.values():
            similarity = self._calculate_sequence_similarity(
                [nt.value for nt in pattern],
                [nt.value for nt in existing_pattern.sequence]
            )
            
            if similarity > 0.5:
                similar_effectiveness.append(existing_pattern.effectiveness_score)
        
        if similar_effectiveness:
            return np.mean(similar_effectiveness)
        else:
            return 0.6  # デフォルト
    
    def _extract_pattern_context(self, pattern: List[NodeType], nodes: List[Node]) -> Dict[str, Any]:
        """パターンのコンテキスト条件を抽出"""
        
        context = {}
        
        if nodes:
            context['avg_clarity'] = np.mean([n.clarity for n in nodes])
            context['avg_depth'] = np.mean([n.depth for n in nodes])
            context['avg_confidence'] = np.mean([n.confidence for n in nodes])
            
            # 時間的特徴
            time_spans = []
            for i in range(1, len(nodes)):
                span = (nodes[i].timestamp - nodes[i-1].timestamp).total_seconds() / 3600
                time_spans.append(span)
            
            if time_spans:
                context['avg_time_span_hours'] = np.mean(time_spans)
        
        return context
    
    def get_learning_statistics(self) -> Dict[str, Any]:
        """学習統計を取得"""
        
        stats = {
            'learned_patterns_count': len(self.learned_patterns),
            'adaptive_rules_count': len(self.adaptive_rules),
            'user_profiles_count': len(self.user_profiles),
            'inference_history_count': len(self.inference_history),
            'feedback_history_count': len(self.feedback_history),
            'top_patterns': [],
            'top_rules': [],
            'user_learning_summary': {}
        }
        
        # トップパターン
        top_patterns = sorted(
            self.learned_patterns.values(),
            key=lambda p: p.effectiveness_score * p.usage_count,
            reverse=True
        )[:5]
        
        stats['top_patterns'] = [
            {
                'pattern_id': p.pattern_id,
                'sequence': [nt.value for nt in p.sequence],
                'effectiveness_score': p.effectiveness_score,
                'usage_count': p.usage_count
            }
            for p in top_patterns
        ]
        
        # トップルール
        top_rules = sorted(
            self.adaptive_rules.values(),
            key=lambda r: r.confidence * (r.success_count + 1),
            reverse=True
        )[:5]
        
        stats['top_rules'] = [
            {
                'rule_id': r.rule_id,
                'name': r.name,
                'confidence': r.confidence,
                'success_rate': r.success_count / (r.success_count + r.failure_count) if (r.success_count + r.failure_count) > 0 else 0
            }
            for r in top_rules
        ]
        
        # ユーザー学習サマリー
        for user_id, profile in self.user_profiles.items():
            stats['user_learning_summary'][user_id] = {
                'learning_style': profile.learning_style,
                'preferred_support_type': max(profile.preferred_support_types.items(), key=lambda x: x[1])[0],
                'adaptation_count': len(profile.adaptation_history)
            }
        
        return stats