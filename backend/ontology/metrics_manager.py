"""
メトリクス管理クラス
会話、学習、グラフに関する包括的なメトリクス追跡と分析
"""

import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from conversation_agent.schema import ConversationMetrics

logger = logging.getLogger(__name__)


class MetricsManager:
    """包括的メトリクス管理エンジン"""
    
    def __init__(self, enable_detailed_tracking: bool = True):
        """
        初期化
        
        Args:
            enable_detailed_tracking: 詳細なトラッキングを有効にするか
        """
        self.enable_detailed_tracking = enable_detailed_tracking
        self.metrics = ConversationMetrics()
        self.detailed_metrics = {}
        self.session_metrics = {}
        self.graph_metrics = {}
        self.inference_metrics = {}
        self.learning_progression_data = []
        
        if self.enable_detailed_tracking:
            self._initialize_detailed_metrics()
    
    def _initialize_detailed_metrics(self):
        """詳細メトリクスを初期化"""
        
        self.detailed_metrics = {
            # 会話品質メトリクス
            'conversation_quality': {
                'coherence_score': 0.5,
                'relevance_score': 0.5,
                'helpfulness_score': 0.5,
                'engagement_level': 0.5
            },
            
            # 応答パフォーマンス
            'response_performance': {
                'avg_response_length': 0.0,
                'avg_followup_count': 0.0,
                'context_utilization_rate': 0.0,
                'personalization_score': 0.0
            },
            
            # 学習効果測定
            'learning_effectiveness': {
                'knowledge_retention_estimate': 0.5,
                'skill_development_rate': 0.0,
                'conceptual_understanding': 0.5,
                'practical_application': 0.5
            },
            
            # ユーザーエンゲージメント
            'user_engagement': {
                'interaction_frequency': 0.0,
                'session_duration_avg': 0.0,
                'return_rate': 0.0,
                'topic_exploration_breadth': 0.0
            }
        }
        
        self.graph_metrics = {
            'node_creation_rate': 0.0,
            'edge_formation_rate': 0.0,
            'graph_connectivity': 0.0,
            'cycle_completion_rate': 0.0,
            'structural_completeness': 0.0,
            'graph_depth_progression': 0.0,
            'node_type_distribution': {},
            'relation_type_distribution': {}
        }
        
        self.inference_metrics = {
            'avg_confidence': 0.5,
            'rule_application_success_rate': 0.0,
            'pattern_recognition_accuracy': 0.0,
            'adaptive_learning_rate': 0.0,
            'prediction_accuracy': 0.0,
            'inference_source_distribution': {},
            'support_type_effectiveness': {}
        }
    
    def update_basic_metrics(self, 
                           state: 'StateSnapshot',
                           support_type: str,
                           selected_acts: List[str],
                           confidence: float = 0.5):
        """基本メトリクスを更新"""
        
        # ターン数をインクリメント
        self.metrics.turns_count += 1
        
        # 前進感の推定
        momentum_delta = self._calculate_momentum_delta(state)
        self.metrics.momentum_delta = momentum_delta
        
        # 推論品質
        self.metrics.inference_quality = confidence
        
        # アクション実行の追跡
        if state.progress_signal and state.progress_signal.actions_in_last_7_days > 0:
            self.metrics.action_taken = True
        
        # レンズ効果測定（支援タイプ別）
        if support_type not in self.metrics.lens_effectiveness:
            self.metrics.lens_effectiveness[support_type] = 0.5
        
        # 支援タイプの効果を更新（簡易的）
        current_effectiveness = self.metrics.lens_effectiveness[support_type]
        new_effectiveness = (current_effectiveness + confidence) / 2
        self.metrics.lens_effectiveness[support_type] = new_effectiveness
        
        logger.debug(f"基本メトリクス更新: turns={self.metrics.turns_count}, momentum={momentum_delta:.2f}")
    
    def update_graph_metrics(self, 
                           node: 'Node',
                           inference_result: Dict[str, Any],
                           graph_context: Dict[str, Any]):
        """グラフ関連メトリクスを更新"""
        
        if not self.enable_detailed_tracking:
            return
        
        # ノード作成率の更新
        self._update_node_creation_rate()
        
        # グラフ接続性の計算
        self.graph_metrics['graph_connectivity'] = self._calculate_graph_connectivity(graph_context)
        
        # 構造的完成度
        structural_gaps = graph_context.get('structural_gaps', [])
        completeness = graph_context.get('ontology_completeness', {}).get('score', 0.5)
        self.graph_metrics['structural_completeness'] = completeness
        
        # サイクル完成率
        cycles_completed = graph_context.get('cycles_completed', 0)
        self.graph_metrics['cycle_completion_rate'] = min(1.0, cycles_completed / 3.0)  # 3サイクルを基準
        
        # ノードタイプ分布
        node_type = node.type.value
        if node_type not in self.graph_metrics['node_type_distribution']:
            self.graph_metrics['node_type_distribution'][node_type] = 0
        self.graph_metrics['node_type_distribution'][node_type] += 1
        
        # 深度進行の追跡
        self._track_depth_progression(node.depth)
        
        logger.debug(f"グラフメトリクス更新: completeness={completeness:.2f}, connectivity={self.graph_metrics['graph_connectivity']:.2f}")
    
    def update_inference_metrics(self, 
                                inference_result: Dict[str, Any],
                                prediction_accuracy: Optional[float] = None):
        """推論関連メトリクスを更新"""
        
        if not self.enable_detailed_tracking:
            return
        
        confidence = inference_result.get('confidence', 0.5)
        support_type = inference_result.get('support_type')
        source = inference_result.get('inference_source', 'unknown')
        
        # 平均信頼度の更新
        current_avg = self.inference_metrics['avg_confidence']
        self.inference_metrics['avg_confidence'] = (current_avg + confidence) / 2
        
        # 推論ソース分布
        if source not in self.inference_metrics['inference_source_distribution']:
            self.inference_metrics['inference_source_distribution'][source] = 0
        self.inference_metrics['inference_source_distribution'][source] += 1
        
        # 支援タイプ効果測定
        if support_type:
            if support_type not in self.inference_metrics['support_type_effectiveness']:
                self.inference_metrics['support_type_effectiveness'][support_type] = []
            
            self.inference_metrics['support_type_effectiveness'][support_type].append({
                'confidence': confidence,
                'timestamp': datetime.now().isoformat(),
                'source': source
            })
            
            # 最新10件の平均を保持
            effectiveness_data = self.inference_metrics['support_type_effectiveness'][support_type]
            if len(effectiveness_data) > 10:
                self.inference_metrics['support_type_effectiveness'][support_type] = effectiveness_data[-10:]
        
        # 予測精度の更新
        if prediction_accuracy is not None:
            current_accuracy = self.inference_metrics['prediction_accuracy']
            self.inference_metrics['prediction_accuracy'] = (current_accuracy + prediction_accuracy) / 2
        
        logger.debug(f"推論メトリクス更新: confidence={confidence:.2f}, source={source}")
    
    def update_response_metrics(self, 
                               response_package: 'TurnPackage',
                               context_usage: Optional[Dict[str, Any]] = None):
        """応答関連メトリクスを更新"""
        
        if not self.enable_detailed_tracking:
            return
        
        response_length = len(response_package.natural_reply)
        followup_count = len(response_package.followups)
        
        # 応答長の平均を更新
        current_avg_length = self.detailed_metrics['response_performance']['avg_response_length']
        self.detailed_metrics['response_performance']['avg_response_length'] = \
            (current_avg_length + response_length) / 2
        
        # フォローアップ数の平均を更新
        current_avg_followup = self.detailed_metrics['response_performance']['avg_followup_count']
        self.detailed_metrics['response_performance']['avg_followup_count'] = \
            (current_avg_followup + followup_count) / 2
        
        # コンテキスト利用率
        if context_usage:
            utilization_rate = context_usage.get('utilization_rate', 0.5)
            self.detailed_metrics['response_performance']['context_utilization_rate'] = utilization_rate
        
        # 個人化スコア（メタデータから）
        if response_package.metadata:
            if response_package.metadata.get('context_enhanced'):
                current_personalization = self.detailed_metrics['response_performance']['personalization_score']
                self.detailed_metrics['response_performance']['personalization_score'] = \
                    min(1.0, current_personalization + 0.1)
        
        logger.debug(f"応答メトリクス更新: length={response_length}, followups={followup_count}")
    
    def update_session_metrics(self, 
                              session_info: Dict[str, Any],
                              user_id: str):
        """セッション関連メトリクスを更新"""
        
        session_id = session_info.get('session_id')
        if not session_id:
            return
        
        # セッション別メトリクス
        if session_id not in self.session_metrics:
            self.session_metrics[session_id] = {
                'start_time': datetime.now(),
                'interaction_count': 0,
                'total_response_time': 0.0,
                'user_satisfaction_signals': [],
                'learning_progression': []
            }
        
        session_data = self.session_metrics[session_id]
        session_data['interaction_count'] += 1
        
        # セッション時間の計算
        if 'created_at' in session_info:
            try:
                start_time = datetime.fromisoformat(session_info['created_at'])
                session_duration = (datetime.now() - start_time).total_seconds() / 3600.0
                
                # ユーザーエンゲージメントメトリクスの更新
                if self.enable_detailed_tracking:
                    current_avg_duration = self.detailed_metrics['user_engagement']['session_duration_avg']
                    self.detailed_metrics['user_engagement']['session_duration_avg'] = \
                        (current_avg_duration + session_duration) / 2
                
            except ValueError:
                logger.warning(f"Invalid timestamp format: {session_info['created_at']}")
        
        # 学習軌跡の分析
        trajectory = session_info.get('learning_trajectory', [])
        if trajectory:
            self._analyze_learning_trajectory(trajectory, user_id)
        
        logger.debug(f"セッションメトリクス更新: session={session_id}, interactions={session_data['interaction_count']}")
    
    def update_learning_effectiveness(self, 
                                    learning_data: Dict[str, Any],
                                    user_feedback: Optional[Dict[str, Any]] = None):
        """学習効果メトリクスを更新"""
        
        if not self.enable_detailed_tracking:
            return
        
        # 学習進行データを記録
        progress_point = {
            'timestamp': datetime.now().isoformat(),
            'node_features': learning_data.get('node_features', {}),
            'inference_features': learning_data.get('inference_features', {}),
            'user_feedback': user_feedback
        }
        
        self.learning_progression_data.append(progress_point)
        
        # メモリ使用量を制限
        if len(self.learning_progression_data) > 500:
            self.learning_progression_data = self.learning_progression_data[-250:]
        
        # 学習効果の推定
        if len(self.learning_progression_data) >= 5:
            self._estimate_learning_effectiveness()
        
        # ユーザーフィードバックがある場合
        if user_feedback:
            satisfaction = user_feedback.get('satisfaction_score')
            if satisfaction:
                self.metrics.satisfaction_score = satisfaction
            
            helpfulness = user_feedback.get('helpfulness', 0.5)
            current_helpfulness = self.detailed_metrics['conversation_quality']['helpfulness_score']
            self.detailed_metrics['conversation_quality']['helpfulness_score'] = \
                (current_helpfulness + helpfulness) / 2
        
        logger.debug("学習効果メトリクス更新完了")
    
    def _calculate_momentum_delta(self, state: 'StateSnapshot') -> float:
        """前進感の変化を計算"""
        
        momentum = 0.0
        
        # 行動実行による前進感
        if state.progress_signal:
            actions = state.progress_signal.actions_in_last_7_days
            if actions > 3:
                momentum += 0.5
            elif actions > 0:
                momentum += 0.2
            
            # ループシグナルによる減少
            if state.progress_signal.looping_signals:
                momentum -= 0.3 * len(state.progress_signal.looping_signals)
            
            # 新規性による増加
            if state.progress_signal.novelty_ratio > 0.7:
                momentum += 0.3
        
        # ブロッカーと不確実性の影響
        if len(state.blockers) > 2:
            momentum -= 0.2
        
        if len(state.uncertainties) > 3:
            momentum -= 0.1
        
        # 目標明確性による影響
        if state.goal and len(state.goal) > 20:
            momentum += 0.1
        
        return max(-1.0, min(1.0, momentum))
    
    def _update_node_creation_rate(self):
        """ノード作成率を更新"""
        
        # 簡易的な実装：ターン数ベース
        if self.metrics.turns_count > 0:
            # 仮定：平均的に3ターンに1ノード作成
            estimated_nodes = self.metrics.turns_count / 3.0
            self.graph_metrics['node_creation_rate'] = estimated_nodes / max(1, self.metrics.turns_count)
    
    def _calculate_graph_connectivity(self, graph_context: Dict[str, Any]) -> float:
        """グラフ接続性を計算"""
        
        graph_size = graph_context.get('graph_size', 1)
        if graph_size <= 1:
            return 0.0
        
        # 簡易的な接続性計算（実際の実装では隣接行列を使用）
        # ここでは進捗情報から推定
        progress = graph_context.get('progress', {})
        cycles_completed = progress.get('cycles_completed', 0)
        
        # サイクル完成度を接続性の指標として使用
        max_possible_cycles = max(1, graph_size // 4)  # 4ノードで1サイクルと仮定
        connectivity = min(1.0, cycles_completed / max_possible_cycles)
        
        return connectivity
    
    def _track_depth_progression(self, current_depth: float):
        """深度進行を追跡"""
        
        # 過去の深度データと比較
        if hasattr(self, '_depth_history'):
            self._depth_history.append(current_depth)
            if len(self._depth_history) > 20:
                self._depth_history = self._depth_history[-10:]
        else:
            self._depth_history = [current_depth]
        
        # 進行率を計算
        if len(self._depth_history) >= 2:
            progression = self._depth_history[-1] - self._depth_history[0]
            self.graph_metrics['graph_depth_progression'] = progression / len(self._depth_history)
    
    def _analyze_learning_trajectory(self, trajectory: List[Dict[str, Any]], user_id: str):
        """学習軌跡を分析"""
        
        if len(trajectory) < 2:
            return
        
        # 最近の軌跡を分析
        recent_trajectory = trajectory[-10:]
        
        # 支援タイプの多様性
        support_types = [item.get('support_type') for item in recent_trajectory if item.get('support_type')]
        diversity = len(set(support_types)) / max(1, len(support_types))
        
        # 深度の進行
        depths = [item.get('depth', 0.5) for item in recent_trajectory if 'depth' in item]
        if depths:
            depth_trend = (depths[-1] - depths[0]) / len(depths) if len(depths) > 1 else 0
            
            # 学習効果メトリクスに反映
            if self.enable_detailed_tracking:
                current_rate = self.detailed_metrics['learning_effectiveness']['skill_development_rate']
                self.detailed_metrics['learning_effectiveness']['skill_development_rate'] = \
                    (current_rate + depth_trend) / 2
        
        # インタラクション頻度
        if len(trajectory) >= 5:
            timestamps = [item.get('timestamp') for item in trajectory[-5:] if item.get('timestamp')]
            if len(timestamps) >= 2:
                try:
                    time_diffs = []
                    for i in range(1, len(timestamps)):
                        prev_time = datetime.fromisoformat(timestamps[i-1])
                        curr_time = datetime.fromisoformat(timestamps[i])
                        time_diffs.append((curr_time - prev_time).total_seconds() / 3600.0)
                    
                    avg_interval = sum(time_diffs) / len(time_diffs)
                    frequency = 1.0 / max(0.1, avg_interval)  # interactions per hour
                    
                    if self.enable_detailed_tracking:
                        self.detailed_metrics['user_engagement']['interaction_frequency'] = frequency
                        
                except ValueError:
                    logger.warning("Invalid timestamp format in trajectory")
    
    def _estimate_learning_effectiveness(self):
        """学習効果を推定"""
        
        if len(self.learning_progression_data) < 5:
            return
        
        # 最近のデータを分析
        recent_data = self.learning_progression_data[-10:]
        
        # 深度の向上率
        depths = [
            item.get('node_features', {}).get('depth', 0.5)
            for item in recent_data
        ]
        
        if len(depths) >= 2:
            depth_improvement = (depths[-1] - depths[0]) / len(depths)
            
            # 知識定着推定（深度の安定性から）
            depth_variance = sum((d - sum(depths)/len(depths))**2 for d in depths) / len(depths)
            retention_estimate = max(0.0, 1.0 - depth_variance * 2)  # 分散が小さいほど定着
            
            self.detailed_metrics['learning_effectiveness']['knowledge_retention_estimate'] = retention_estimate
            self.detailed_metrics['learning_effectiveness']['skill_development_rate'] = depth_improvement
        
        # 概念理解の推定（明確性の向上から）
        clarities = [
            item.get('node_features', {}).get('clarity', 0.5)
            for item in recent_data
        ]
        
        if clarities:
            avg_clarity = sum(clarities) / len(clarities)
            self.detailed_metrics['learning_effectiveness']['conceptual_understanding'] = avg_clarity
    
    def get_comprehensive_metrics(self) -> Dict[str, Any]:
        """包括的なメトリクス情報を取得"""
        
        result = {
            'basic_metrics': self.metrics.dict(),
            'timestamp': datetime.now().isoformat(),
            'collection_period': 'current_session'
        }
        
        if self.enable_detailed_tracking:
            result.update({
                'detailed_metrics': self.detailed_metrics,
                'graph_metrics': self.graph_metrics,
                'inference_metrics': self.inference_metrics,
                'session_count': len(self.session_metrics),
                'learning_data_points': len(self.learning_progression_data)
            })
        
        return result
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """パフォーマンス要約を取得"""
        
        summary = {
            'overall_score': self._calculate_overall_score(),
            'turns_completed': self.metrics.turns_count,
            'avg_confidence': self.metrics.inference_quality,
            'momentum': self.metrics.momentum_delta,
            'user_satisfaction': self.metrics.satisfaction_score
        }
        
        if self.enable_detailed_tracking:
            summary.update({
                'learning_effectiveness': self._calculate_learning_effectiveness_score(),
                'engagement_level': self._calculate_engagement_score(),
                'graph_completeness': self.graph_metrics.get('structural_completeness', 0.5),
                'inference_quality': self.inference_metrics.get('avg_confidence', 0.5)
            })
        
        return summary
    
    def _calculate_overall_score(self) -> float:
        """総合スコアを計算"""
        
        components = [
            self.metrics.inference_quality * 0.3,
            (self.metrics.momentum_delta + 1.0) / 2.0 * 0.2,  # -1~1を0~1に正規化
            (self.metrics.satisfaction_score or 3.0) / 5.0 * 0.2,  # 1~5を0~1に正規化
            min(1.0, self.metrics.turns_count / 10.0) * 0.1  # アクティビティボーナス
        ]
        
        if self.enable_detailed_tracking:
            components.extend([
                self.detailed_metrics['learning_effectiveness']['conceptual_understanding'] * 0.1,
                self.detailed_metrics['user_engagement']['engagement_level'] * 0.1
            ])
        
        return sum(components)
    
    def _calculate_learning_effectiveness_score(self) -> float:
        """学習効果スコアを計算"""
        
        effectiveness_data = self.detailed_metrics['learning_effectiveness']
        
        components = [
            effectiveness_data['knowledge_retention_estimate'],
            (effectiveness_data['skill_development_rate'] + 1.0) / 2.0,  # 正規化
            effectiveness_data['conceptual_understanding'],
            effectiveness_data['practical_application']
        ]
        
        return sum(components) / len(components)
    
    def _calculate_engagement_score(self) -> float:
        """エンゲージメントスコアを計算"""
        
        engagement_data = self.detailed_metrics['user_engagement']
        
        # 正規化された各コンポーネント
        frequency_score = min(1.0, engagement_data['interaction_frequency'] / 2.0)  # 2回/時間を最大とする
        duration_score = min(1.0, engagement_data['session_duration_avg'] / 2.0)  # 2時間を最大とする
        return_score = engagement_data['return_rate']
        breadth_score = min(1.0, engagement_data['topic_exploration_breadth'] / 5.0)  # 5トピックを最大とする
        
        components = [frequency_score, duration_score, return_score, breadth_score]
        
        return sum(components) / len(components)
    
    def reset_session_metrics(self):
        """セッションメトリクスをリセット"""
        
        self.metrics = ConversationMetrics()
        if self.enable_detailed_tracking:
            self._initialize_detailed_metrics()
        
        logger.info("メトリクス情報をリセットしました")
    
    def export_metrics(self, include_raw_data: bool = False) -> Dict[str, Any]:
        """メトリクスをエクスポート"""
        
        export_data = self.get_comprehensive_metrics()
        
        if include_raw_data:
            export_data['raw_learning_data'] = self.learning_progression_data
            export_data['session_details'] = self.session_metrics
        
        export_data['export_timestamp'] = datetime.now().isoformat()
        
        return export_data