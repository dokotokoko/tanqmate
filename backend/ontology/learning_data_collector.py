"""
学習データ収集クラス
グラフノード、推論結果、応答、セッション情報から学習データを収集・整理
"""

import logging
import json
from typing import List, Dict, Optional, Any
from datetime import datetime, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)


class LearningDataCollector:
    """学習データ収集・管理エンジン"""
    
    def __init__(self, data_directory: str = "learning_data", persist_data: bool = True):
        """
        初期化
        
        Args:
            data_directory: データ保存ディレクトリ
            persist_data: データをファイルに永続化するか
        """
        self.data_directory = Path(data_directory)
        self.persist_data = persist_data
        self.collected_data = []
        
        if self.persist_data:
            self.data_directory.mkdir(exist_ok=True)
    
    def collect_learning_data(self, 
                             node: 'Node', 
                             inference_result: Dict[str, Any], 
                             response_package: 'TurnPackage',
                             session_info: Dict[str, Any],
                             state: Optional['StateSnapshot'] = None) -> Dict[str, Any]:
        """学習データを収集"""
        
        # 基本データポイントを作成
        data_point = {
            'timestamp': datetime.now().isoformat(),
            'user_id': node.student_id,
            'session_id': session_info.get('session_id'),
            'node_features': self._extract_node_features(node),
            'inference_features': self._extract_inference_features(inference_result),
            'response_features': self._extract_response_features(response_package),
            'session_features': self._extract_session_features(session_info),
            'interaction_context': self._extract_interaction_context(state, session_info)
        }
        
        # データを内部リストに追加
        self.collected_data.append(data_point)
        
        # 永続化
        if self.persist_data:
            self._persist_data_point(data_point)
        
        # メモリ使用量を制限
        if len(self.collected_data) > 1000:
            self.collected_data = self.collected_data[-500:]  # 最新500件を保持
        
        logger.debug(f"学習データ収集完了: {data_point['timestamp']}")
        
        return data_point
    
    def _extract_node_features(self, node: 'Node') -> Dict[str, Any]:
        """ノードから特徴量を抽出"""
        
        features = {
            'node_id': node.id,
            'type': node.type.value,
            'clarity': node.clarity,
            'depth': node.depth,
            'confidence': node.confidence,
            'alignment_goal': node.alignment_goal,
            'state': node.state,
            'text_length': len(node.text) if node.text else 0,
            'tag_count': len(node.tags) if node.tags else 0
        }
        
        # メタデータから追加特徴量
        if node.metadata:
            metadata = node.metadata
            
            # 会話コンテキスト特徴量
            if 'conversation_context' in metadata:
                conv_context = metadata['conversation_context']
                features.update({
                    'has_current_topic': bool(conv_context.get('current_topic')),
                    'topic_count': len(conv_context.get('topics', [])),
                    'entity_count': len(conv_context.get('mentioned_entities', [])),
                    'phrase_count': len(conv_context.get('key_phrases', [])),
                    'context_chain_length': len(conv_context.get('context_chain', []))
                })
            
            # セッション特徴量
            if 'session_id' in metadata:
                features['session_id'] = metadata['session_id']
            
            if 'interaction_count' in metadata:
                features['interaction_count'] = metadata['interaction_count']
        
        return features
    
    def _extract_inference_features(self, inference_result: Dict[str, Any]) -> Dict[str, Any]:
        """推論結果から特徴量を抽出"""
        
        features = {
            'support_type': inference_result.get('support_type'),
            'acts': inference_result.get('acts', []),
            'act_count': len(inference_result.get('acts', [])),
            'confidence': inference_result.get('confidence', 0.5),
            'inference_source': inference_result.get('inference_source', 'unknown'),
            'applied_rule': inference_result.get('applied_rule'),
            'has_predictions': bool(inference_result.get('predictions')),
            'prediction_count': len(inference_result.get('predictions', []))
        }
        
        # 推論ソースの分類
        source = inference_result.get('inference_source', '')
        features.update({
            'is_pattern_based': 'pattern:' in source,
            'is_adaptive_rule': 'adaptive_rule:' in source,
            'is_structural_gap': 'structural_gap:' in source,
            'is_guard_triggered': 'guard:' in source
        })
        
        # 予測に関する詳細特徴量
        predictions = inference_result.get('predictions', [])
        if predictions:
            features.update({
                'avg_prediction_confidence': sum(p.get('confidence', 0.5) for p in predictions) / len(predictions),
                'prediction_types': [p.get('node_type', {}).get('value', 'unknown') for p in predictions]
            })
        
        return features
    
    def _extract_response_features(self, response_package: 'TurnPackage') -> Dict[str, Any]:
        """応答パッケージから特徴量を抽出"""
        
        features = {
            'response_length': len(response_package.natural_reply),
            'followup_count': len(response_package.followups),
            'has_metadata': bool(response_package.metadata)
        }
        
        # 応答の内容分析
        response_text = response_package.natural_reply
        features.update({
            'has_question': '？' in response_text or '?' in response_text,
            'has_suggestion': 'てみましょう' in response_text or '提案' in response_text,
            'has_explanation': 'なぜなら' in response_text or 'ため' in response_text,
            'sentence_count': len([s for s in response_text.split('。') if s.strip()])
        })
        
        # フォローアップの分析
        if response_package.followups:
            followup_text = ' '.join(response_package.followups)
            features.update({
                'followup_has_question': '？' in followup_text or '?' in followup_text,
                'followup_total_length': len(followup_text)
            })
        
        # メタデータの分析
        if response_package.metadata:
            metadata = response_package.metadata
            features.update({
                'context_enhanced': metadata.get('context_enhanced', False),
                'adaptive_enhanced': metadata.get('adaptive_enhanced', False),
                'response_style': metadata.get('response_style'),
                'enhancement_confidence': metadata.get('inference_confidence', 0.5)
            })
        
        return features
    
    def _extract_session_features(self, session_info: Dict[str, Any]) -> Dict[str, Any]:
        """セッション情報から特徴量を抽出"""
        
        features = {
            'session_id': session_info.get('session_id'),
            'interaction_count': session_info.get('interaction_count', 0),
            'session_duration': self._calculate_session_duration(session_info),
            'has_user_preferences': bool(session_info.get('user_preferences')),
            'trajectory_length': len(session_info.get('learning_trajectory', []))
        }
        
        # 学習軌跡の分析
        trajectory = session_info.get('learning_trajectory', [])
        if trajectory:
            recent_trajectory = trajectory[-5:]  # 最近5件
            
            # 支援タイプの分布
            support_types = [item.get('support_type') for item in recent_trajectory if item.get('support_type')]
            features.update({
                'recent_support_diversity': len(set(support_types)),
                'most_recent_support': support_types[-1] if support_types else None,
                'support_type_distribution': {stype: support_types.count(stype) for stype in set(support_types)}
            })
            
            # 深度の進行
            depths = [item.get('depth', 0.5) for item in recent_trajectory if 'depth' in item]
            if depths:
                features.update({
                    'avg_recent_depth': sum(depths) / len(depths),
                    'depth_trend': depths[-1] - depths[0] if len(depths) > 1 else 0,
                    'depth_variance': self._calculate_variance(depths)
                })
        
        # ユーザープリファレンスの分析
        user_prefs = session_info.get('user_preferences', {})
        if user_prefs:
            features.update({
                'preferred_communication_style': user_prefs.get('communication_style'),
                'has_learning_style_prefs': bool(user_prefs.get('learning_style')),
                'preferred_support_type': user_prefs.get('preferred_support_type')
            })
        
        return features
    
    def _extract_interaction_context(self, 
                                   state: Optional['StateSnapshot'], 
                                   session_info: Dict[str, Any]) -> Dict[str, Any]:
        """インタラクション文脈を抽出"""
        
        context = {
            'has_state': state is not None,
            'session_age_hours': self._calculate_session_duration(session_info)
        }
        
        if state:
            context.update({
                'has_goal': bool(state.goal),
                'goal_length': len(state.goal) if state.goal else 0,
                'has_purpose': bool(state.purpose),
                'blocker_count': len(state.blockers),
                'uncertainty_count': len(state.uncertainties),
                'option_count': len(state.options_considered),
                'has_project_context': bool(state.project_context),
                'affect_interest': state.affect.interest if state.affect else 0,
                'affect_anxiety': state.affect.anxiety if state.affect else 0,
                'affect_excitement': state.affect.excitement if state.affect else 0
            })
            
            # プロジェクト文脈の分析
            if state.project_context:
                proj_context = state.project_context
                context.update({
                    'has_theme': bool(proj_context.get('theme')),
                    'has_question': bool(proj_context.get('question')),
                    'has_hypothesis': bool(proj_context.get('hypothesis')),
                    'project_completeness': sum([
                        bool(proj_context.get('theme')),
                        bool(proj_context.get('question')),
                        bool(proj_context.get('hypothesis'))
                    ]) / 3.0
                })
        
        return context
    
    def _calculate_session_duration(self, session_info: Dict[str, Any]) -> float:
        """セッション継続時間を計算（時間）"""
        try:
            created_at = datetime.fromisoformat(session_info['created_at'])
            now = datetime.now()
            return (now - created_at).total_seconds() / 3600.0
        except (KeyError, ValueError):
            return 0.0
    
    def _calculate_variance(self, values: List[float]) -> float:
        """分散を計算"""
        if len(values) < 2:
            return 0.0
        
        mean = sum(values) / len(values)
        return sum((x - mean) ** 2 for x in values) / len(values)
    
    def _persist_data_point(self, data_point: Dict[str, Any]):
        """データポイントを永続化"""
        
        try:
            # 日付別ファイルに保存
            date_str = datetime.now().strftime('%Y-%m-%d')
            file_path = self.data_directory / f"learning_data_{date_str}.jsonl"
            
            with open(file_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps(data_point, ensure_ascii=False) + '\n')
                
        except Exception as e:
            logger.error(f"学習データ永続化エラー: {e}")
    
    def get_aggregated_data(self, 
                           user_id: Optional[str] = None, 
                           time_window_hours: Optional[int] = None) -> Dict[str, Any]:
        """集約された学習データを取得"""
        
        # フィルタリング
        filtered_data = self.collected_data
        
        if user_id:
            filtered_data = [d for d in filtered_data if d.get('user_id') == user_id]
        
        if time_window_hours:
            cutoff_time = datetime.now() - timedelta(hours=time_window_hours)
            filtered_data = [
                d for d in filtered_data 
                if datetime.fromisoformat(d['timestamp']) > cutoff_time
            ]
        
        if not filtered_data:
            return {'total_interactions': 0}
        
        # 集約統計
        aggregated = {
            'total_interactions': len(filtered_data),
            'unique_users': len(set(d.get('user_id') for d in filtered_data if d.get('user_id'))),
            'time_span_hours': self._calculate_time_span(filtered_data),
            'avg_confidence': self._calculate_avg_confidence(filtered_data),
            'support_type_distribution': self._calculate_support_type_distribution(filtered_data),
            'node_type_distribution': self._calculate_node_type_distribution(filtered_data),
            'inference_source_distribution': self._calculate_inference_source_distribution(filtered_data),
            'avg_response_length': self._calculate_avg_response_length(filtered_data),
            'learning_progression': self._analyze_learning_progression(filtered_data)
        }
        
        return aggregated
    
    def _calculate_time_span(self, data: List[Dict[str, Any]]) -> float:
        """データの時間範囲を計算"""
        if len(data) < 2:
            return 0.0
        
        timestamps = [datetime.fromisoformat(d['timestamp']) for d in data]
        return (max(timestamps) - min(timestamps)).total_seconds() / 3600.0
    
    def _calculate_avg_confidence(self, data: List[Dict[str, Any]]) -> float:
        """平均信頼度を計算"""
        confidences = [
            d.get('inference_features', {}).get('confidence', 0.5) 
            for d in data
        ]
        return sum(confidences) / len(confidences) if confidences else 0.0
    
    def _calculate_support_type_distribution(self, data: List[Dict[str, Any]]) -> Dict[str, int]:
        """支援タイプの分布を計算"""
        support_types = [
            d.get('inference_features', {}).get('support_type')
            for d in data
        ]
        support_types = [st for st in support_types if st]
        
        distribution = {}
        for st in support_types:
            distribution[st] = distribution.get(st, 0) + 1
        
        return distribution
    
    def _calculate_node_type_distribution(self, data: List[Dict[str, Any]]) -> Dict[str, int]:
        """ノードタイプの分布を計算"""
        node_types = [
            d.get('node_features', {}).get('type')
            for d in data
        ]
        node_types = [nt for nt in node_types if nt]
        
        distribution = {}
        for nt in node_types:
            distribution[nt] = distribution.get(nt, 0) + 1
        
        return distribution
    
    def _calculate_inference_source_distribution(self, data: List[Dict[str, Any]]) -> Dict[str, int]:
        """推論ソースの分布を計算"""
        sources = [
            d.get('inference_features', {}).get('inference_source', 'unknown')
            for d in data
        ]
        
        # ソースをカテゴリ別に分類
        categorized = {
            'pattern_based': 0,
            'adaptive_rule': 0,
            'structural_gap': 0,
            'guard_triggered': 0,
            'default': 0,
            'unknown': 0
        }
        
        for source in sources:
            if 'pattern:' in source:
                categorized['pattern_based'] += 1
            elif 'adaptive_rule:' in source:
                categorized['adaptive_rule'] += 1
            elif 'structural_gap:' in source:
                categorized['structural_gap'] += 1
            elif 'guard:' in source:
                categorized['guard_triggered'] += 1
            elif source == 'default':
                categorized['default'] += 1
            else:
                categorized['unknown'] += 1
        
        return categorized
    
    def _calculate_avg_response_length(self, data: List[Dict[str, Any]]) -> float:
        """平均応答長を計算"""
        lengths = [
            d.get('response_features', {}).get('response_length', 0)
            for d in data
        ]
        return sum(lengths) / len(lengths) if lengths else 0.0
    
    def _analyze_learning_progression(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """学習進行の分析"""
        
        if len(data) < 2:
            return {'progression': 'insufficient_data'}
        
        # 時系列でソート
        sorted_data = sorted(data, key=lambda x: x['timestamp'])
        
        # 深度の変化
        depths = [
            d.get('node_features', {}).get('depth', 0.5)
            for d in sorted_data
        ]
        
        # 明確性の変化
        clarities = [
            d.get('node_features', {}).get('clarity', 0.5)
            for d in sorted_data
        ]
        
        # 信頼度の変化
        confidences = [
            d.get('inference_features', {}).get('confidence', 0.5)
            for d in sorted_data
        ]
        
        progression = {
            'depth_trend': depths[-1] - depths[0] if len(depths) > 1 else 0,
            'clarity_trend': clarities[-1] - clarities[0] if len(clarities) > 1 else 0,
            'confidence_trend': confidences[-1] - confidences[0] if len(confidences) > 1 else 0,
            'avg_depth_improvement': sum(depths[i+1] - depths[i] for i in range(len(depths)-1)) / (len(depths)-1) if len(depths) > 1 else 0,
            'learning_velocity': self._calculate_learning_velocity(sorted_data)
        }
        
        return progression
    
    def _calculate_learning_velocity(self, sorted_data: List[Dict[str, Any]]) -> float:
        """学習速度を計算"""
        if len(sorted_data) < 2:
            return 0.0
        
        # 時間あたりの深度向上を計算
        first_timestamp = datetime.fromisoformat(sorted_data[0]['timestamp'])
        last_timestamp = datetime.fromisoformat(sorted_data[-1]['timestamp'])
        time_diff_hours = (last_timestamp - first_timestamp).total_seconds() / 3600.0
        
        if time_diff_hours == 0:
            return 0.0
        
        first_depth = sorted_data[0].get('node_features', {}).get('depth', 0.5)
        last_depth = sorted_data[-1].get('node_features', {}).get('depth', 0.5)
        depth_change = last_depth - first_depth
        
        return depth_change / time_diff_hours
    
    def export_data(self, 
                   output_path: str, 
                   user_id: Optional[str] = None, 
                   format: str = 'json') -> str:
        """データをエクスポート"""
        
        export_data = self.get_aggregated_data(user_id)
        export_data['raw_data'] = [
            d for d in self.collected_data 
            if not user_id or d.get('user_id') == user_id
        ]
        export_data['export_timestamp'] = datetime.now().isoformat()
        export_data['export_metadata'] = {
            'total_raw_points': len(export_data['raw_data']),
            'user_filter': user_id,
            'format': format
        }
        
        output_file = Path(output_path)
        
        if format == 'json':
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)
        else:
            raise ValueError(f"Unsupported format: {format}")
        
        logger.info(f"学習データエクスポート完了: {output_file}")
        return str(output_file)