"""
結果パッケージングクラス
対話ターンの結果を包括的にパッケージング
"""

import logging
from typing import List, Dict, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class ResultPackager:
    """対話結果パッケージングエンジン"""
    
    def __init__(self, include_debug_info: bool = False):
        """
        初期化
        
        Args:
            include_debug_info: デバッグ情報を含めるか
        """
        self.include_debug_info = include_debug_info
        self.packaging_history = []
    
    def package_enhanced_result(self, 
                               response_package: 'TurnPackage',
                               support_type: str,
                               selected_acts: List[str],
                               state: 'StateSnapshot',
                               project_plan: Optional['ProjectPlan'],
                               reason: str,
                               confidence: float,
                               inference_result: Dict[str, Any],
                               session_info: Dict[str, Any],
                               graph_context: Optional[Dict[str, Any]] = None,
                               metrics: Optional[Dict[str, Any]] = None,
                               learning_data: Optional[Dict[str, Any]] = None,
                               mode: str = "enhanced") -> Dict[str, Any]:
        """拡張結果パッケージング"""
        
        packaging_start = datetime.now()
        
        # 基本結果構造
        result = self._build_base_result(
            response_package, support_type, selected_acts, 
            state, project_plan, reason, confidence, mode
        )
        
        # 推論情報の追加
        result.update(self._package_inference_information(inference_result))
        
        # セッション情報の追加
        result.update(self._package_session_information(session_info))
        
        # グラフ情報の追加
        if graph_context:
            result.update(self._package_graph_information(graph_context))
        
        # メトリクス情報の追加
        if metrics:
            result["metrics"] = metrics
        
        # 学習データの追加
        if learning_data:
            result["learning_data"] = learning_data
        
        # メタデータとタイムスタンプ
        result.update(self._add_packaging_metadata(packaging_start))
        
        # デバッグ情報
        if self.include_debug_info:
            result["debug_info"] = self._collect_debug_information(
                state, inference_result, session_info
            )
        
        # 履歴に記録
        self._record_packaging_history(result)
        
        logger.debug(f"結果パッケージング完了: mode={mode}, timestamp={result['metadata']['timestamp']}")
        
        return result
    
    def package_standard_result(self, 
                               response_package: 'TurnPackage',
                               support_type: str,
                               selected_acts: List[str],
                               state: 'StateSnapshot',
                               project_plan: Optional['ProjectPlan'],
                               reason: str,
                               confidence: float,
                               metrics: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """標準結果パッケージング（従来互換）"""
        
        result = self._build_base_result(
            response_package, support_type, selected_acts,
            state, project_plan, reason, confidence, "standard"
        )
        
        # 決定メタデータ
        result["decision_metadata"] = {
            "support_reason": reason,
            "support_confidence": confidence,
            "timestamp": datetime.now().isoformat(),
            "mode": "standard"
        }
        
        if metrics:
            result["metrics"] = metrics
        
        return result
    
    def _build_base_result(self, 
                          response_package: 'TurnPackage',
                          support_type: str,
                          selected_acts: List[str],
                          state: 'StateSnapshot',
                          project_plan: Optional['ProjectPlan'],
                          reason: str,
                          confidence: float,
                          mode: str) -> Dict[str, Any]:
        """基本結果構造を構築"""
        
        return {
            "response": response_package.natural_reply,
            "natural_reply": response_package.natural_reply,  # 互換性のため
            "followups": response_package.followups,
            "support_type": support_type,
            "selected_acts": selected_acts,
            "state_snapshot": self._sanitize_state_snapshot(state),
            "project_plan": project_plan.dict() if project_plan else None,
            "decision_metadata": {
                "support_reason": reason,
                "support_confidence": confidence,
                "timestamp": datetime.now().isoformat(),
                "mode": mode
            }
        }
    
    def _sanitize_state_snapshot(self, state: 'StateSnapshot') -> Dict[str, Any]:
        """状態スナップショットをサニタイズ"""
        
        try:
            # 機密情報を除外
            excluded_fields = {'user_id', 'conversation_id', 'turn_index'}
            state_dict = state.dict(exclude=excluded_fields)
            
            # 長すぎる文字列を切り詰め
            if 'goal' in state_dict and state_dict['goal']:
                if len(state_dict['goal']) > 500:
                    state_dict['goal'] = state_dict['goal'][:500] + "..."
            
            if 'purpose' in state_dict and state_dict['purpose']:
                if len(state_dict['purpose']) > 500:
                    state_dict['purpose'] = state_dict['purpose'][:500] + "..."
            
            # 配列のサイズ制限
            for field in ['blockers', 'uncertainties', 'options_considered']:
                if field in state_dict and isinstance(state_dict[field], list):
                    if len(state_dict[field]) > 10:
                        state_dict[field] = state_dict[field][:10]
            
            return state_dict
            
        except Exception as e:
            logger.warning(f"状態スナップショットのサニタイズでエラー: {e}")
            return {"error": "状態情報の処理中にエラーが発生しました"}
    
    def _package_inference_information(self, inference_result: Dict[str, Any]) -> Dict[str, Any]:
        """推論情報をパッケージング"""
        
        inference_info = {}
        
        # 基本推論情報
        if inference_result:
            inference_info["inference"] = {
                "source": inference_result.get('inference_source', 'unknown'),
                "confidence": inference_result.get('confidence', 0.5),
                "applied_rule": inference_result.get('applied_rule'),
                "rule_type": self._classify_rule_type(inference_result.get('inference_source', ''))
            }
            
            # 予測情報
            predictions = inference_result.get('predictions', [])
            if predictions:
                inference_info["predictions"] = self._format_predictions(predictions)
            
            # 候補情報
            candidates = inference_result.get('all_candidates', [])
            if candidates:
                inference_info["alternative_candidates"] = self._format_candidates(candidates)
            
            # 推論履歴
            if 'inference_history' in inference_result:
                inference_info["inference_history"] = inference_result['inference_history']
        
        return inference_info
    
    def _package_session_information(self, session_info: Dict[str, Any]) -> Dict[str, Any]:
        """セッション情報をパッケージング"""
        
        session_package = {
            "session_info": {
                "session_id": session_info.get('session_id'),
                "interaction_count": session_info.get('interaction_count', 0),
                "session_duration_hours": self._calculate_session_duration(session_info),
                "user_preferences": self._sanitize_user_preferences(session_info.get('user_preferences', {})),
                "learning_trajectory_length": len(session_info.get('learning_trajectory', []))
            }
        }
        
        # 学習軌跡のサマリー
        trajectory = session_info.get('learning_trajectory', [])
        if trajectory:
            session_package["learning_trajectory_summary"] = self._summarize_learning_trajectory(trajectory)
        
        # コンテキスト履歴のサマリー
        context_history = session_info.get('context_history', [])
        if context_history:
            session_package["context_summary"] = self._summarize_context_history(context_history)
        
        return session_package
    
    def _package_graph_information(self, graph_context: Dict[str, Any]) -> Dict[str, Any]:
        """グラフ情報をパッケージング"""
        
        graph_package = {
            "graph_context": {
                "current_node": graph_context.get('current_node'),
                "progress": graph_context.get('progress', {}),
                "suggestions": graph_context.get('suggestions', []),
                "graph_size": graph_context.get('graph_size', 0),
                "cycles_completed": graph_context.get('cycles_completed', 0)
            }
        }
        
        # 構造的欠損情報
        structural_gaps = graph_context.get('structural_gaps', [])
        if structural_gaps:
            graph_package["structural_analysis"] = {
                "gaps_detected": len(structural_gaps),
                "high_priority_gaps": len([gap for gap in structural_gaps if gap.get('priority') == 'high']),
                "gap_types": list(set(gap.get('type', 'unknown') for gap in structural_gaps))
            }
        
        # オントロジー完成度
        ontology_completeness = graph_context.get('ontology_completeness', {})
        if ontology_completeness:
            graph_package["ontology_status"] = {
                "completeness_score": ontology_completeness.get('score', 0.0),
                "present_elements": ontology_completeness.get('present_elements', []),
                "missing_elements": ontology_completeness.get('missing_elements', [])
            }
        
        return graph_package
    
    def _add_packaging_metadata(self, packaging_start: datetime) -> Dict[str, Any]:
        """パッケージングメタデータを追加"""
        
        packaging_end = datetime.now()
        processing_time = (packaging_end - packaging_start).total_seconds()
        
        return {
            "metadata": {
                "timestamp": packaging_end.isoformat(),
                "processing_time_ms": processing_time * 1000,
                "packaging_version": "2.0",
                "includes_debug": self.include_debug_info
            }
        }
    
    def _collect_debug_information(self, 
                                  state: 'StateSnapshot',
                                  inference_result: Dict[str, Any],
                                  session_info: Dict[str, Any]) -> Dict[str, Any]:
        """デバッグ情報を収集"""
        
        debug_info = {
            "state_debug": {
                "has_goal": bool(state.goal),
                "has_purpose": bool(state.purpose),
                "blocker_count": len(state.blockers),
                "uncertainty_count": len(state.uncertainties),
                "has_project_context": bool(state.project_context)
            },
            "inference_debug": {
                "has_predictions": bool(inference_result.get('predictions')),
                "has_candidates": bool(inference_result.get('all_candidates')),
                "inference_source_type": self._classify_rule_type(inference_result.get('inference_source', ''))
            },
            "session_debug": {
                "session_age_hours": self._calculate_session_duration(session_info),
                "has_user_prefs": bool(session_info.get('user_preferences')),
                "trajectory_points": len(session_info.get('learning_trajectory', []))
            }
        }
        
        return debug_info
    
    def _classify_rule_type(self, inference_source: str) -> str:
        """推論ソースの種類を分類"""
        
        if 'pattern:' in inference_source:
            return 'pattern_based'
        elif 'adaptive_rule:' in inference_source:
            return 'adaptive'
        elif 'structural_gap:' in inference_source:
            return 'gap_filling'
        elif 'guard:' in inference_source:
            return 'guard_triggered'
        elif inference_source == 'default':
            return 'default'
        else:
            return 'unknown'
    
    def _format_predictions(self, predictions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """予測情報をフォーマット"""
        
        formatted = []
        for pred in predictions[:5]:  # 最大5件
            formatted_pred = {
                "node_type": pred.get('node_type', {}).get('value', 'unknown') if pred.get('node_type') else 'unknown',
                "confidence": pred.get('confidence', 0.5),
                "estimated_time": pred.get('estimated_time', 'unknown'),
                "description": pred.get('description', '')
            }
            formatted.append(formatted_pred)
        
        return formatted
    
    def _format_candidates(self, candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """候補情報をフォーマット"""
        
        formatted = []
        for candidate in candidates[:3]:  # 最大3件
            formatted_candidate = {
                "support_type": candidate.get('support_type', 'unknown'),
                "confidence": candidate.get('confidence', 0.5),
                "reasoning": candidate.get('reasoning', ''),
                "selected": candidate.get('selected', False)
            }
            formatted.append(formatted_candidate)
        
        return formatted
    
    def _calculate_session_duration(self, session_info: Dict[str, Any]) -> float:
        """セッション継続時間を計算（時間）"""
        
        try:
            created_at = session_info.get('created_at')
            if created_at:
                start_time = datetime.fromisoformat(created_at)
                return (datetime.now() - start_time).total_seconds() / 3600.0
        except (ValueError, TypeError):
            pass
        
        return 0.0
    
    def _sanitize_user_preferences(self, preferences: Dict[str, Any]) -> Dict[str, Any]:
        """ユーザープリファレンスをサニタイズ"""
        
        sanitized = {}
        
        # 許可されたプリファレンスキーのみ保持
        allowed_keys = [
            'communication_style', 'learning_style', 'preferred_support_type',
            'feedback_frequency', 'detail_level'
        ]
        
        for key in allowed_keys:
            if key in preferences:
                sanitized[key] = preferences[key]
        
        return sanitized
    
    def _summarize_learning_trajectory(self, trajectory: List[Dict[str, Any]]) -> Dict[str, Any]:
        """学習軌跡をサマリー"""
        
        if not trajectory:
            return {}
        
        # 最近の軌跡を分析
        recent_trajectory = trajectory[-10:]
        
        support_types = [item.get('support_type') for item in recent_trajectory if item.get('support_type')]
        
        summary = {
            "recent_interactions": len(recent_trajectory),
            "support_type_diversity": len(set(support_types)) if support_types else 0,
            "most_common_support": max(set(support_types), key=support_types.count) if support_types else None,
            "has_depth_progression": any('depth' in item for item in recent_trajectory)
        }
        
        # 深度の変化
        depths = [item.get('depth', 0.5) for item in recent_trajectory if 'depth' in item]
        if len(depths) >= 2:
            summary["depth_change"] = depths[-1] - depths[0]
            summary["depth_trend"] = "increasing" if depths[-1] > depths[0] else "stable" if depths[-1] == depths[0] else "decreasing"
        
        return summary
    
    def _summarize_context_history(self, context_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """コンテキスト履歴をサマリー"""
        
        if not context_history:
            return {}
        
        recent_context = context_history[-5:]
        
        support_types = [ctx.get('support_type') for ctx in recent_context if ctx.get('support_type')]
        confidences = [ctx.get('confidence', 0.5) for ctx in recent_context]
        
        return {
            "recent_context_points": len(recent_context),
            "avg_confidence": sum(confidences) / len(confidences) if confidences else 0.5,
            "support_type_sequence": support_types[-3:],  # 最新3件
            "context_stability": len(set(support_types)) <= 2 if support_types else True
        }
    
    def _record_packaging_history(self, result: Dict[str, Any]):
        """パッケージング履歴を記録"""
        
        history_entry = {
            "timestamp": result.get("metadata", {}).get("timestamp"),
            "mode": result.get("decision_metadata", {}).get("mode"),
            "support_type": result.get("support_type"),
            "confidence": result.get("decision_metadata", {}).get("support_confidence"),
            "processing_time_ms": result.get("metadata", {}).get("processing_time_ms")
        }
        
        self.packaging_history.append(history_entry)
        
        # 履歴サイズを制限
        if len(self.packaging_history) > 100:
            self.packaging_history = self.packaging_history[-50:]
    
    def package_error_result(self, 
                           error: Exception,
                           context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """エラー結果をパッケージング"""
        
        error_result = {
            "success": False,
            "error": {
                "type": type(error).__name__,
                "message": str(error),
                "timestamp": datetime.now().isoformat()
            },
            "fallback_response": {
                "response": "申し訳ございませんが、処理中にエラーが発生しました。もう一度お試しください。",
                "natural_reply": "申し訳ございませんが、処理中にエラーが発生しました。もう一度お試しください。",
                "followups": ["別の方法で質問してみてください。", "少し時間をおいてからお試しください。"],
                "support_type": "ERROR_RECOVERY",
                "selected_acts": ["INFORM"]
            },
            "metadata": {
                "timestamp": datetime.now().isoformat(),
                "packaging_version": "2.0",
                "error_handling": True
            }
        }
        
        # コンテキスト情報があれば追加
        if context:
            error_result["error_context"] = context
        
        # デバッグ情報
        if self.include_debug_info:
            error_result["debug_info"] = {
                "error_details": str(error),
                "context_available": bool(context)
            }
        
        return error_result
    
    def get_packaging_statistics(self) -> Dict[str, Any]:
        """パッケージング統計を取得"""
        
        if not self.packaging_history:
            return {"total_packages": 0}
        
        # 処理時間の統計
        processing_times = [
            entry.get("processing_time_ms", 0) 
            for entry in self.packaging_history 
            if entry.get("processing_time_ms")
        ]
        
        # 信頼度の統計
        confidences = [
            entry.get("confidence", 0.5) 
            for entry in self.packaging_history 
            if entry.get("confidence")
        ]
        
        # 支援タイプの分布
        support_types = [
            entry.get("support_type") 
            for entry in self.packaging_history 
            if entry.get("support_type")
        ]
        
        support_distribution = {}
        for st in support_types:
            support_distribution[st] = support_distribution.get(st, 0) + 1
        
        return {
            "total_packages": len(self.packaging_history),
            "avg_processing_time_ms": sum(processing_times) / len(processing_times) if processing_times else 0,
            "avg_confidence": sum(confidences) / len(confidences) if confidences else 0.5,
            "support_type_distribution": support_distribution,
            "recent_activity": len([
                entry for entry in self.packaging_history[-10:] 
                if entry.get("timestamp")
            ])
        }
    
    def reset_history(self):
        """履歴をリセット"""
        
        self.packaging_history = []
        logger.info("パッケージング履歴をリセットしました")