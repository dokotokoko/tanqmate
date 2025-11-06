"""
動的ルールエンジンと適応学習システム
リアルタイムでルールを学習・調整し、ユーザーに最適化された支援を提供
"""

import logging
import json
import pickle
import numpy as np
from typing import List, Dict, Optional, Any, Tuple, Set
from datetime import datetime, timedelta
from collections import defaultdict, deque
from dataclasses import dataclass, field
from pathlib import Path
import threading
import time

from .ontology_graph import Node, NodeType, RelationType
from .schema import SupportType, SpeechAct

logger = logging.getLogger(__name__)


@dataclass
class DynamicRule:
    """動的に生成・調整されるルール"""
    rule_id: str
    name: str
    condition_function: callable
    action_function: callable
    priority: float
    confidence: float
    
    # 学習統計
    activation_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    user_satisfaction_scores: List[float] = field(default_factory=list)
    
    # 適応パラメータ
    learning_rate: float = 0.1
    decay_factor: float = 0.95
    min_confidence: float = 0.1
    max_confidence: float = 0.95
    
    # 生成情報
    created_at: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    generated_from: str = ""  # "pattern", "feedback", "interaction"
    
    def update_from_feedback(self, success: bool, satisfaction: float = 0.5):
        """フィードバックからルールを更新"""
        self.activation_count += 1
        
        if success:
            self.success_count += 1
        else:
            self.failure_count += 1
        
        self.user_satisfaction_scores.append(satisfaction)
        
        # 信頼度を更新
        total_attempts = self.success_count + self.failure_count
        if total_attempts > 0:
            success_rate = self.success_count / total_attempts
            avg_satisfaction = np.mean(self.user_satisfaction_scores[-10:])  # 最近10件の平均
            
            # 成功率と満足度の重み付き平均
            performance_score = 0.6 * success_rate + 0.4 * avg_satisfaction
            
            # 指数移動平均で信頼度を更新
            self.confidence = (
                self.confidence * (1 - self.learning_rate) + 
                performance_score * self.learning_rate
            )
            
            # 範囲制限
            self.confidence = max(self.min_confidence, min(self.max_confidence, self.confidence))
        
        # 優先度を調整（高性能なルールの優先度を上げる）
        if self.confidence > 0.7:
            self.priority = min(10.0, self.priority + 0.1)
        elif self.confidence < 0.3:
            self.priority = max(1.0, self.priority - 0.1)
        
        self.last_updated = datetime.now()
    
    def calculate_effectiveness(self) -> float:
        """ルールの効果を計算"""
        if self.activation_count == 0:
            return 0.5
        
        # 成功率
        success_rate = self.success_count / (self.success_count + self.failure_count) if (self.success_count + self.failure_count) > 0 else 0.5
        
        # 満足度平均
        avg_satisfaction = np.mean(self.user_satisfaction_scores) if self.user_satisfaction_scores else 0.5
        
        # 使用頻度（正規化）
        usage_frequency = min(1.0, self.activation_count / 100.0)
        
        # 時間的重要度（最近使われたルールを重視）
        days_since_update = (datetime.now() - self.last_updated).days
        temporal_factor = np.exp(-days_since_update / 30.0)  # 30日で半減
        
        # 総合効果
        effectiveness = (
            0.3 * success_rate +
            0.3 * avg_satisfaction +
            0.2 * usage_frequency +
            0.2 * temporal_factor
        )
        
        return effectiveness


@dataclass
class LearningContext:
    """学習コンテキスト"""
    user_id: str
    session_id: str
    interaction_sequence: List[Dict[str, Any]] = field(default_factory=list)
    user_behavior_patterns: Dict[str, Any] = field(default_factory=dict)
    environmental_factors: Dict[str, Any] = field(default_factory=dict)
    temporal_patterns: Dict[str, Any] = field(default_factory=dict)


class DynamicRuleEngine:
    """動的ルールエンジン"""
    
    def __init__(self, model_dir: str = "dynamic_rules"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        # ルール管理
        self.dynamic_rules: Dict[str, DynamicRule] = {}
        self.rule_templates: Dict[str, Dict[str, Any]] = {}
        
        # 学習システム
        self.learning_contexts: Dict[str, LearningContext] = {}
        self.interaction_buffer: deque = deque(maxlen=10000)
        self.feedback_buffer: deque = deque(maxlen=5000)
        
        # 適応パラメータ
        self.adaptation_threshold = 0.6  # ルール生成の閾値
        self.rule_pruning_threshold = 0.2  # ルール削除の閾値
        self.max_rules_per_user = 50
        self.learning_batch_size = 100
        
        # パフォーマンス追跡
        self.performance_metrics: Dict[str, Any] = {
            'rules_generated': 0,
            'rules_pruned': 0,
            'adaptation_events': 0,
            'learning_cycles': 0
        }
        
        # バックグラウンド学習
        self.learning_thread: Optional[threading.Thread] = None
        self.learning_active = False
        
        # テンプレートを初期化
        self._initialize_rule_templates()
        
        # 既存モデルを読み込み
        self._load_models()
        
        # バックグラウンド学習開始
        self._start_background_learning()
    
    def _initialize_rule_templates(self):
        """ルールテンプレートを初期化"""
        
        self.rule_templates = {
            'clarity_adaptive': {
                'name': '明確性適応ルール',
                'base_condition': lambda node, context: node.clarity < context.get('clarity_threshold', 0.5),
                'base_action': {
                    'support_type': SupportType.UNDERSTANDING,
                    'acts': [SpeechAct.CLARIFY, SpeechAct.PROBE],
                    'reason': '明確性向上のため'
                },
                'parameters': ['clarity_threshold'],
                'adaptation_scope': 'user'
            },
            
            'depth_progression': {
                'name': '深度進行ルール',
                'base_condition': lambda node, context: (
                    node.depth > context.get('depth_threshold', 0.7) and 
                    context.get('stagnation_detected', False)
                ),
                'base_action': {
                    'support_type': SupportType.PATHFINDING,
                    'acts': [SpeechAct.OUTLINE, SpeechAct.ACT],
                    'reason': '探究の進展促進'
                },
                'parameters': ['depth_threshold', 'stagnation_threshold'],
                'adaptation_scope': 'global'
            },
            
            'user_preference_adaptation': {
                'name': 'ユーザー好み適応ルール',
                'base_condition': lambda node, context: context.get('user_satisfaction', 0.5) < 0.4,
                'base_action': {
                    'support_type': SupportType.REFRAMING,
                    'acts': [SpeechAct.REFRAME, SpeechAct.REFLECT],
                    'reason': 'ユーザー好みに適応'
                },
                'parameters': ['satisfaction_threshold', 'preferred_support_type'],
                'adaptation_scope': 'user'
            },
            
            'temporal_adaptation': {
                'name': '時間適応ルール',
                'base_condition': lambda node, context: (
                    context.get('time_of_day', 12) < 9 or context.get('time_of_day', 12) > 21
                ),
                'base_action': {
                    'support_type': SupportType.ACTIVATION,
                    'acts': [SpeechAct.ACT, SpeechAct.INFORM],
                    'reason': '時間帯に応じた支援'
                },
                'parameters': ['morning_threshold', 'evening_threshold'],
                'adaptation_scope': 'temporal'
            },
            
            'interaction_pattern_rule': {
                'name': '対話パターンルール',
                'base_condition': lambda node, context: (
                    context.get('interaction_frequency', 0) > context.get('frequency_threshold', 5)
                ),
                'base_action': {
                    'support_type': SupportType.NARROWING,
                    'acts': [SpeechAct.DECIDE, SpeechAct.OUTLINE],
                    'reason': '対話パターンに基づく支援'
                },
                'parameters': ['frequency_threshold', 'interaction_window'],
                'adaptation_scope': 'session'
            }
        }
    
    def _load_models(self):
        """動的ルールモデルを読み込み"""
        try:
            rules_file = self.model_dir / "dynamic_rules.pkl"
            if rules_file.exists():
                with open(rules_file, 'rb') as f:
                    self.dynamic_rules = pickle.load(f)
                logger.info(f"✅ 動的ルール読み込み: {len(self.dynamic_rules)} rules")
            
            metrics_file = self.model_dir / "performance_metrics.json"
            if metrics_file.exists():
                with open(metrics_file, 'r') as f:
                    self.performance_metrics = json.load(f)
                
        except Exception as e:
            logger.error(f"❌ 動的ルールモデル読み込みエラー: {e}")
    
    def _save_models(self):
        """動的ルールモデルを保存"""
        try:
            with open(self.model_dir / "dynamic_rules.pkl", 'wb') as f:
                pickle.dump(self.dynamic_rules, f)
            
            with open(self.model_dir / "performance_metrics.json", 'w') as f:
                json.dump(self.performance_metrics, f, indent=2)
                
            logger.info("💾 動的ルールモデル保存完了")
            
        except Exception as e:
            logger.error(f"❌ 動的ルールモデル保存エラー: {e}")
    
    def _start_background_learning(self):
        """バックグラウンド学習を開始"""
        if self.learning_thread is None or not self.learning_thread.is_alive():
            self.learning_active = True
            self.learning_thread = threading.Thread(target=self._background_learning_loop, daemon=True)
            self.learning_thread.start()
            logger.info("🔄 バックグラウンド学習開始")
    
    def _background_learning_loop(self):
        """バックグラウンド学習ループ"""
        while self.learning_active:
            try:
                # 5分ごとに学習実行
                time.sleep(300)
                
                if len(self.interaction_buffer) >= self.learning_batch_size:
                    self._perform_learning_cycle()
                
                # 1時間ごとにルール最適化
                if datetime.now().hour % 1 == 0:
                    self._optimize_rules()
                
            except Exception as e:
                logger.error(f"❌ バックグラウンド学習エラー: {e}")
                time.sleep(60)  # エラー時は1分待機
    
    def stop_background_learning(self):
        """バックグラウンド学習を停止"""
        self.learning_active = False
        if self.learning_thread:
            self.learning_thread.join(timeout=10)
        logger.info("⏹️ バックグラウンド学習停止")
    
    def evaluate_rules(self, node: Node, context: Dict[str, Any]) -> List[Tuple[DynamicRule, float]]:
        """動的ルールを評価"""
        
        applicable_rules = []
        
        for rule in self.dynamic_rules.values():
            try:
                # ルール条件を評価
                if rule.condition_function(node, context):
                    # 適用スコアを計算
                    application_score = self._calculate_application_score(rule, node, context)
                    applicable_rules.append((rule, application_score))
                    
            except Exception as e:
                logger.error(f"ルール評価エラー ({rule.rule_id}): {e}")
        
        # スコアでソート
        applicable_rules.sort(key=lambda x: x[1], reverse=True)
        return applicable_rules
    
    def _calculate_application_score(self, rule: DynamicRule, node: Node, context: Dict[str, Any]) -> float:
        """ルール適用スコアを計算"""
        
        # 基本スコア（信頼度と優先度）
        base_score = 0.6 * rule.confidence + 0.4 * (rule.priority / 10.0)
        
        # コンテキスト適合度
        context_fit = self._calculate_context_fit(rule, context)
        
        # ユーザー適合度
        user_fit = self._calculate_user_fit(rule, context.get('user_id', ''))
        
        # 時間的関連性
        temporal_relevance = self._calculate_temporal_relevance(rule, context)
        
        # 総合スコア
        total_score = (
            0.4 * base_score +
            0.25 * context_fit +
            0.25 * user_fit +
            0.1 * temporal_relevance
        )
        
        return total_score
    
    def _calculate_context_fit(self, rule: DynamicRule, context: Dict[str, Any]) -> float:
        """コンテキスト適合度を計算"""
        
        # ノードタイプとの適合性
        node_type = context.get('node_type', '')
        if 'question' in rule.name.lower() and node_type == 'Question':
            type_fit = 1.0
        elif 'hypothesis' in rule.name.lower() and node_type == 'Hypothesis':
            type_fit = 1.0
        else:
            type_fit = 0.5
        
        # セッション状態との適合性
        session_length = context.get('session_length', 0)
        interaction_count = context.get('interaction_count', 0)
        
        if 'adaptation' in rule.name.lower() and interaction_count > 5:
            session_fit = 1.0
        elif 'initial' in rule.name.lower() and interaction_count <= 2:
            session_fit = 1.0
        else:
            session_fit = 0.7
        
        return 0.6 * type_fit + 0.4 * session_fit
    
    def _calculate_user_fit(self, rule: DynamicRule, user_id: str) -> float:
        """ユーザー適合度を計算"""
        
        if not user_id or user_id not in self.learning_contexts:
            return 0.5
        
        user_context = self.learning_contexts[user_id]
        
        # ユーザーの行動パターンとの適合性
        behavior_patterns = user_context.user_behavior_patterns
        
        # 過去の成功率
        past_interactions = [
            interaction for interaction in user_context.interaction_sequence
            if interaction.get('rule_id') == rule.rule_id
        ]
        
        if past_interactions:
            success_rate = sum(1 for i in past_interactions if i.get('success', False)) / len(past_interactions)
            return success_rate
        
        # 類似ルールの成功率
        similar_rules = [
            r for r in self.dynamic_rules.values()
            if r.generated_from == rule.generated_from and r.rule_id != rule.rule_id
        ]
        
        if similar_rules:
            avg_effectiveness = np.mean([r.calculate_effectiveness() for r in similar_rules])
            return avg_effectiveness
        
        return 0.5
    
    def _calculate_temporal_relevance(self, rule: DynamicRule, context: Dict[str, Any]) -> float:
        """時間的関連性を計算"""
        
        current_time = datetime.now()
        
        # ルールの最終更新からの時間
        time_since_update = (current_time - rule.last_updated).total_seconds() / 3600  # hours
        
        # 新しいルールを優遇（24時間以内は高スコア）
        if time_since_update < 24:
            recency_score = 1.0 - (time_since_update / 24)
        else:
            recency_score = np.exp(-(time_since_update - 24) / 168)  # 1週間で半減
        
        # 時間帯との適合性
        hour = current_time.hour
        if 'temporal' in rule.name.lower():
            if 'morning' in rule.name.lower() and 6 <= hour <= 11:
                time_fit = 1.0
            elif 'evening' in rule.name.lower() and 18 <= hour <= 22:
                time_fit = 1.0
            else:
                time_fit = 0.3
        else:
            time_fit = 0.8
        
        return 0.7 * recency_score + 0.3 * time_fit
    
    def generate_rule_from_pattern(self, pattern: Dict[str, Any], user_id: str) -> Optional[DynamicRule]:
        """パターンから動的ルールを生成"""
        
        try:
            # パターンの特徴を分析
            sequence = pattern.get('sequence', [])
            effectiveness = pattern.get('effectiveness', 0.5)
            context_conditions = pattern.get('context_conditions', {})
            
            if effectiveness < self.adaptation_threshold:
                return None
            
            # 適切なテンプレートを選択
            template_name = self._select_template_for_pattern(pattern)
            if template_name not in self.rule_templates:
                return None
            
            template = self.rule_templates[template_name]
            
            # ルールIDを生成
            rule_id = f"pattern_{user_id}_{template_name}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
            
            # 条件関数を生成
            condition_func = self._generate_condition_function(template, pattern, context_conditions)
            
            # アクション関数を生成
            action_func = self._generate_action_function(template, pattern)
            
            # 動的ルールを作成
            dynamic_rule = DynamicRule(
                rule_id=rule_id,
                name=f"{template['name']} (パターン生成)",
                condition_function=condition_func,
                action_function=action_func,
                priority=5.0 + effectiveness * 3.0,  # 5.0-8.0の範囲
                confidence=effectiveness,
                generated_from="pattern",
                created_at=datetime.now()
            )
            
            self.dynamic_rules[rule_id] = dynamic_rule
            self.performance_metrics['rules_generated'] += 1
            
            logger.info(f"🆕 パターンから動的ルール生成: {rule_id}")
            return dynamic_rule
            
        except Exception as e:
            logger.error(f"❌ パターンルール生成エラー: {e}")
            return None
    
    def _select_template_for_pattern(self, pattern: Dict[str, Any]) -> str:
        """パターンに適したテンプレートを選択"""
        
        sequence = pattern.get('sequence', [])
        context = pattern.get('context_conditions', {})
        
        # シーケンスベースの選択
        if 'Question' in sequence and 'Hypothesis' in sequence:
            return 'clarity_adaptive'
        elif len(sequence) > 4:
            return 'depth_progression'
        elif context.get('avg_time_span_hours', 0) > 24:
            return 'temporal_adaptation'
        else:
            return 'user_preference_adaptation'
    
    def _generate_condition_function(self, template: Dict[str, Any], pattern: Dict[str, Any], context_conditions: Dict[str, Any]) -> callable:
        """条件関数を生成"""
        
        base_condition = template['base_condition']
        parameters = template.get('parameters', [])
        
        # パターンから最適なパラメータを学習
        learned_params = {}
        for param in parameters:
            if param in context_conditions:
                learned_params[param] = context_conditions[param]
            else:
                # デフォルト値を設定
                default_values = {
                    'clarity_threshold': 0.5,
                    'depth_threshold': 0.7,
                    'satisfaction_threshold': 0.4,
                    'frequency_threshold': 5,
                    'morning_threshold': 9,
                    'evening_threshold': 21
                }
                learned_params[param] = default_values.get(param, 0.5)
        
        def dynamic_condition(node: Node, context: Dict[str, Any]) -> bool:
            # 学習されたパラメータをコンテキストに追加
            enhanced_context = {**context, **learned_params}
            return base_condition(node, enhanced_context)
        
        return dynamic_condition
    
    def _generate_action_function(self, template: Dict[str, Any], pattern: Dict[str, Any]) -> callable:
        """アクション関数を生成"""
        
        base_action = template['base_action']
        sequence = pattern.get('sequence', [])
        
        # パターンから最適なアクションを学習
        def dynamic_action(node: Node, context: Dict[str, Any]) -> Dict[str, Any]:
            action = base_action.copy()
            
            # シーケンスに基づいてアクションを調整
            if 'Insight' in sequence:
                action['acts'] = [SpeechAct.REFLECT, SpeechAct.REFRAME]
            elif 'Method' in sequence:
                action['acts'] = [SpeechAct.ACT, SpeechAct.OUTLINE]
            
            # コンテキストに基づいてサポートタイプを調整
            user_satisfaction = context.get('user_satisfaction', 0.5)
            if user_satisfaction < 0.3:
                action['support_type'] = SupportType.REFRAMING
            
            action['next_node_type'] = NodeType.QUESTION  # デフォルト
            action['confidence'] = 0.7
            
            return action
        
        return dynamic_action
    
    def generate_rule_from_feedback(self, feedback: Dict[str, Any], user_id: str) -> Optional[DynamicRule]:
        """フィードバックから動的ルールを生成"""
        
        try:
            satisfaction = feedback.get('satisfaction', 0.5)
            effectiveness = feedback.get('effectiveness', 0.5)
            
            # 低満足度の場合、改善ルールを生成
            if satisfaction < 0.4 or effectiveness < 0.4:
                return self._generate_improvement_rule(feedback, user_id)
            
            # 高満足度の場合、成功パターンルールを生成
            elif satisfaction > 0.8 and effectiveness > 0.8:
                return self._generate_success_pattern_rule(feedback, user_id)
            
            return None
            
        except Exception as e:
            logger.error(f"❌ フィードバックルール生成エラー: {e}")
            return None
    
    def _generate_improvement_rule(self, feedback: Dict[str, Any], user_id: str) -> Optional[DynamicRule]:
        """改善ルールを生成"""
        
        rule_id = f"improvement_{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        problem_area = feedback.get('problem_area', 'general')
        suggested_improvement = feedback.get('suggested_improvement', 'reframe')
        
        def improvement_condition(node: Node, context: Dict[str, Any]) -> bool:
            # 問題のあった状況と類似の場合に発火
            return (
                context.get('user_id') == user_id and
                context.get('recent_satisfaction', 0.5) < 0.5
            )
        
        def improvement_action(node: Node, context: Dict[str, Any]) -> Dict[str, Any]:
            if suggested_improvement == 'reframe':
                return {
                    'support_type': SupportType.REFRAMING,
                    'acts': [SpeechAct.REFRAME, SpeechAct.REFLECT],
                    'reason': 'フィードバックベースの改善',
                    'next_node_type': NodeType.INSIGHT,
                    'confidence': 0.6
                }
            elif suggested_improvement == 'clarify':
                return {
                    'support_type': SupportType.UNDERSTANDING,
                    'acts': [SpeechAct.CLARIFY, SpeechAct.PROBE],
                    'reason': 'フィードバックベースの明確化',
                    'next_node_type': NodeType.QUESTION,
                    'confidence': 0.6
                }
            else:
                return {
                    'support_type': SupportType.PATHFINDING,
                    'acts': [SpeechAct.OUTLINE, SpeechAct.INFORM],
                    'reason': 'フィードバックベースの道筋提示',
                    'next_node_type': NodeType.METHOD,
                    'confidence': 0.6
                }
        
        improvement_rule = DynamicRule(
            rule_id=rule_id,
            name=f"改善ルール ({problem_area})",
            condition_function=improvement_condition,
            action_function=improvement_action,
            priority=7.0,
            confidence=0.6,
            generated_from="feedback",
            created_at=datetime.now()
        )
        
        self.dynamic_rules[rule_id] = improvement_rule
        self.performance_metrics['rules_generated'] += 1
        
        logger.info(f"🔧 改善ルール生成: {rule_id}")
        return improvement_rule
    
    def _generate_success_pattern_rule(self, feedback: Dict[str, Any], user_id: str) -> Optional[DynamicRule]:
        """成功パターンルールを生成"""
        
        rule_id = f"success_{user_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        successful_support_type = feedback.get('support_type', SupportType.PATHFINDING)
        successful_acts = feedback.get('acts', [SpeechAct.OUTLINE])
        
        def success_condition(node: Node, context: Dict[str, Any]) -> bool:
            # 成功した状況と類似の場合に発火
            return (
                context.get('user_id') == user_id and
                context.get('node_type') == feedback.get('node_type', '') and
                context.get('clarity_range') == feedback.get('clarity_range', 'medium')
            )
        
        def success_action(node: Node, context: Dict[str, Any]) -> Dict[str, Any]:
            return {
                'support_type': successful_support_type,
                'acts': successful_acts,
                'reason': 'フィードバックベースの成功パターン',
                'next_node_type': NodeType.HYPOTHESIS,
                'confidence': 0.8
            }
        
        success_rule = DynamicRule(
            rule_id=rule_id,
            name=f"成功パターンルール",
            condition_function=success_condition,
            action_function=success_action,
            priority=8.0,
            confidence=0.8,
            generated_from="feedback",
            created_at=datetime.now()
        )
        
        self.dynamic_rules[rule_id] = success_rule
        self.performance_metrics['rules_generated'] += 1
        
        logger.info(f"✨ 成功パターンルール生成: {rule_id}")
        return success_rule
    
    def record_interaction(self, interaction_data: Dict[str, Any]):
        """対話データを記録"""
        
        interaction_data['timestamp'] = datetime.now().isoformat()
        self.interaction_buffer.append(interaction_data)
        
        # 学習コンテキストを更新
        user_id = interaction_data.get('user_id', '')
        if user_id:
            if user_id not in self.learning_contexts:
                self.learning_contexts[user_id] = LearningContext(
                    user_id=user_id,
                    session_id=interaction_data.get('session_id', '')
                )
            
            context = self.learning_contexts[user_id]
            context.interaction_sequence.append(interaction_data)
            
            # シーケンスサイズ制限
            if len(context.interaction_sequence) > 100:
                context.interaction_sequence = context.interaction_sequence[-50:]
    
    def record_feedback(self, feedback_data: Dict[str, Any]):
        """フィードバックデータを記録"""
        
        feedback_data['timestamp'] = datetime.now().isoformat()
        self.feedback_buffer.append(feedback_data)
        
        # 関連ルールを更新
        rule_id = feedback_data.get('rule_id')
        if rule_id and rule_id in self.dynamic_rules:
            rule = self.dynamic_rules[rule_id]
            success = feedback_data.get('success', False)
            satisfaction = feedback_data.get('satisfaction', 0.5)
            rule.update_from_feedback(success, satisfaction)
    
    def _perform_learning_cycle(self):
        """学習サイクルを実行"""
        
        try:
            logger.info("🧠 動的ルール学習サイクル開始")
            
            # 新しいパターンを発見
            self._discover_new_patterns()
            
            # フィードバックから学習
            self._learn_from_feedback()
            
            # ルールを最適化
            self._optimize_rules()
            
            # モデルを保存
            self._save_models()
            
            self.performance_metrics['learning_cycles'] += 1
            logger.info("✅ 動的ルール学習サイクル完了")
            
        except Exception as e:
            logger.error(f"❌ 学習サイクルエラー: {e}")
    
    def _discover_new_patterns(self):
        """新しいパターンを発見"""
        
        # 最近の対話データから頻出パターンを抽出
        recent_interactions = list(self.interaction_buffer)[-500:]  # 最新500件
        
        # ユーザー別にグループ化
        user_interactions = defaultdict(list)
        for interaction in recent_interactions:
            user_id = interaction.get('user_id', '')
            if user_id:
                user_interactions[user_id].append(interaction)
        
        # 各ユーザーのパターンを分析
        for user_id, interactions in user_interactions.items():
            if len(interactions) >= 10:  # 最低10回の対話
                patterns = self._extract_interaction_patterns(interactions)
                
                for pattern in patterns:
                    if pattern['frequency'] >= 3 and pattern['effectiveness'] > 0.6:
                        self.generate_rule_from_pattern(pattern, user_id)
    
    def _extract_interaction_patterns(self, interactions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """対話パターンを抽出"""
        
        patterns = []
        
        # 支援タイプのシーケンスパターン
        support_sequences = []
        for i in range(len(interactions) - 2):
            sequence = [
                interactions[i].get('support_type', ''),
                interactions[i+1].get('support_type', ''),
                interactions[i+2].get('support_type', '')
            ]
            support_sequences.append(sequence)
        
        # 頻出シーケンスを検出
        sequence_counts = defaultdict(int)
        for seq in support_sequences:
            if all(seq):  # 空文字列でない
                sequence_counts[tuple(seq)] += 1
        
        # パターンとして記録
        for sequence, frequency in sequence_counts.items():
            if frequency >= 2:
                # 効果を推定（簡易版）
                effectiveness = min(1.0, frequency / len(support_sequences) * 2)
                
                patterns.append({
                    'type': 'support_sequence',
                    'sequence': list(sequence),
                    'frequency': frequency,
                    'effectiveness': effectiveness,
                    'context_conditions': {}
                })
        
        return patterns
    
    def _learn_from_feedback(self):
        """フィードバックから学習"""
        
        recent_feedback = list(self.feedback_buffer)[-200:]  # 最新200件
        
        # 低満足度のフィードバックを分析
        low_satisfaction_feedback = [
            fb for fb in recent_feedback
            if fb.get('satisfaction', 0.5) < 0.4
        ]
        
        # ユーザー別に改善ルールを生成
        user_feedback = defaultdict(list)
        for fb in low_satisfaction_feedback:
            user_id = fb.get('user_id', '')
            if user_id:
                user_feedback[user_id].append(fb)
        
        for user_id, feedback_list in user_feedback.items():
            if len(feedback_list) >= 2:  # 複数回の低満足度
                # 改善ルールを生成
                combined_feedback = self._combine_feedback(feedback_list)
                self.generate_rule_from_feedback(combined_feedback, user_id)
    
    def _combine_feedback(self, feedback_list: List[Dict[str, Any]]) -> Dict[str, Any]:
        """複数のフィードバックを統合"""
        
        avg_satisfaction = np.mean([fb.get('satisfaction', 0.5) for fb in feedback_list])
        avg_effectiveness = np.mean([fb.get('effectiveness', 0.5) for fb in feedback_list])
        
        # 共通の問題領域を特定
        problem_areas = [fb.get('problem_area', 'general') for fb in feedback_list]
        most_common_problem = max(set(problem_areas), key=problem_areas.count)
        
        # 改善提案を統合
        improvements = [fb.get('suggested_improvement', 'reframe') for fb in feedback_list]
        most_suggested_improvement = max(set(improvements), key=improvements.count)
        
        return {
            'satisfaction': avg_satisfaction,
            'effectiveness': avg_effectiveness,
            'problem_area': most_common_problem,
            'suggested_improvement': most_suggested_improvement,
            'feedback_count': len(feedback_list)
        }
    
    def _optimize_rules(self):
        """ルールを最適化"""
        
        # 効果の低いルールを削除
        rules_to_remove = []
        for rule_id, rule in self.dynamic_rules.items():
            effectiveness = rule.calculate_effectiveness()
            
            if effectiveness < self.rule_pruning_threshold and rule.activation_count > 10:
                rules_to_remove.append(rule_id)
        
        for rule_id in rules_to_remove:
            del self.dynamic_rules[rule_id]
            self.performance_metrics['rules_pruned'] += 1
            logger.info(f"🗑️ 低効果ルール削除: {rule_id}")
        
        # ユーザー別ルール数制限
        user_rule_counts = defaultdict(int)
        user_rules = defaultdict(list)
        
        for rule_id, rule in self.dynamic_rules.items():
            if '_' in rule_id:
                parts = rule_id.split('_')
                if len(parts) >= 2:
                    user_id = parts[1]
                    user_rule_counts[user_id] += 1
                    user_rules[user_id].append((rule_id, rule))
        
        # 上限を超えるユーザーのルールを効果順で削除
        for user_id, count in user_rule_counts.items():
            if count > self.max_rules_per_user:
                rules = user_rules[user_id]
                rules.sort(key=lambda x: x[1].calculate_effectiveness())
                
                # 効果の低いルールから削除
                excess_count = count - self.max_rules_per_user
                for i in range(excess_count):
                    rule_id, _ = rules[i]
                    del self.dynamic_rules[rule_id]
                    self.performance_metrics['rules_pruned'] += 1
    
    def get_rule_statistics(self) -> Dict[str, Any]:
        """ルール統計を取得"""
        
        if not self.dynamic_rules:
            return {
                'total_rules': 0,
                'performance_metrics': self.performance_metrics
            }
        
        # 基本統計
        total_rules = len(self.dynamic_rules)
        avg_confidence = np.mean([rule.confidence for rule in self.dynamic_rules.values()])
        avg_effectiveness = np.mean([rule.calculate_effectiveness() for rule in self.dynamic_rules.values()])
        
        # 生成ソース別統計
        source_counts = defaultdict(int)
        for rule in self.dynamic_rules.values():
            source_counts[rule.generated_from] += 1
        
        # 最高効果ルール
        best_rules = sorted(
            self.dynamic_rules.values(),
            key=lambda r: r.calculate_effectiveness(),
            reverse=True
        )[:5]
        
        return {
            'total_rules': total_rules,
            'avg_confidence': avg_confidence,
            'avg_effectiveness': avg_effectiveness,
            'rules_by_source': dict(source_counts),
            'best_rules': [
                {
                    'rule_id': rule.rule_id,
                    'name': rule.name,
                    'effectiveness': rule.calculate_effectiveness(),
                    'confidence': rule.confidence,
                    'activation_count': rule.activation_count
                }
                for rule in best_rules
            ],
            'performance_metrics': self.performance_metrics,
            'learning_contexts_count': len(self.learning_contexts)
        }