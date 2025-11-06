"""
オントロジーグラフシステム 推論詳細ログ機能
推論プロセスを詳細に記録し、可視化用データを提供
"""

import json
import logging
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid

logger = logging.getLogger(__name__)


class InferenceStepType(Enum):
    """推論ステップのタイプ"""
    STATE_EXTRACTION = "state_extraction"
    GUARD_CHECK = "guard_check"
    SUPPORT_TYPE_DECISION = "support_type_decision"
    ACT_SELECTION = "act_selection"
    GRAPH_TRAVERSAL = "graph_traversal"
    NODE_CREATION = "node_creation"
    EDGE_CREATION = "edge_creation"
    CONSTRAINT_VALIDATION = "constraint_validation"
    PROGRESS_CALCULATION = "progress_calculation"
    SUGGESTION_GENERATION = "suggestion_generation"


@dataclass
class InferenceStep:
    """個別の推論ステップ"""
    step_id: str
    step_type: InferenceStepType
    timestamp: datetime
    input_data: Dict[str, Any]
    output_data: Dict[str, Any]
    reasoning: str
    confidence: float
    processing_time_ms: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        return {
            "step_id": self.step_id,
            "step_type": self.step_type.value,
            "timestamp": self.timestamp.isoformat(),
            "input_data": self.input_data,
            "output_data": self.output_data,
            "reasoning": self.reasoning,
            "confidence": self.confidence,
            "processing_time_ms": self.processing_time_ms,
            "metadata": self.metadata
        }


@dataclass
class InferenceTrace:
    """推論トレース（一連の推論ステップ）"""
    trace_id: str
    user_id: str
    conversation_id: str
    user_message: str
    start_time: datetime
    end_time: Optional[datetime] = None
    steps: List[InferenceStep] = field(default_factory=list)
    final_response: str = ""
    total_processing_time_ms: int = 0
    graph_state_before: Dict[str, Any] = field(default_factory=dict)
    graph_state_after: Dict[str, Any] = field(default_factory=dict)
    success: bool = True
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        return {
            "trace_id": self.trace_id,
            "user_id": self.user_id,
            "conversation_id": self.conversation_id,
            "user_message": self.user_message,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "steps": [step.to_dict() for step in self.steps],
            "final_response": self.final_response,
            "total_processing_time_ms": self.total_processing_time_ms,
            "graph_state_before": self.graph_state_before,
            "graph_state_after": self.graph_state_after,
            "success": self.success,
            "error_message": self.error_message
        }


class OntologyInferenceLogger:
    """オントロジー推論の詳細ログ管理"""
    
    def __init__(self, max_traces: int = 100):
        self.traces: Dict[str, InferenceTrace] = {}
        self.max_traces = max_traces
        self.current_trace: Optional[InferenceTrace] = None
        
    def start_inference_trace(self, user_id: str, conversation_id: str, user_message: str) -> str:
        """推論トレースを開始"""
        trace_id = f"trace_{uuid.uuid4().hex[:8]}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        self.current_trace = InferenceTrace(
            trace_id=trace_id,
            user_id=user_id,
            conversation_id=conversation_id,
            user_message=user_message,
            start_time=datetime.now(timezone.utc)
        )
        
        logger.info(f"🔍 推論トレース開始: {trace_id}")
        return trace_id
    
    def log_step(self, 
                 step_type: InferenceStepType,
                 input_data: Dict[str, Any],
                 output_data: Dict[str, Any],
                 reasoning: str,
                 confidence: float = 1.0,
                 processing_time_ms: int = 0,
                 metadata: Optional[Dict[str, Any]] = None) -> str:
        """推論ステップをログに記録"""
        
        if not self.current_trace:
            logger.warning("推論トレースが開始されていません")
            return ""
        
        step_id = f"step_{len(self.current_trace.steps) + 1:03d}_{step_type.value}"
        
        step = InferenceStep(
            step_id=step_id,
            step_type=step_type,
            timestamp=datetime.now(timezone.utc),
            input_data=input_data,
            output_data=output_data,
            reasoning=reasoning,
            confidence=confidence,
            processing_time_ms=processing_time_ms,
            metadata=metadata or {}
        )
        
        self.current_trace.steps.append(step)
        
        logger.debug(f"📝 推論ステップ記録: {step_id} - {reasoning}")
        return step_id
    
    def complete_inference_trace(self, 
                                final_response: str,
                                graph_state_before: Dict[str, Any],
                                graph_state_after: Dict[str, Any],
                                success: bool = True,
                                error_message: Optional[str] = None):
        """推論トレースを完了"""
        
        if not self.current_trace:
            logger.warning("推論トレースが開始されていません")
            return
        
        self.current_trace.end_time = datetime.now(timezone.utc)
        self.current_trace.final_response = final_response
        self.current_trace.graph_state_before = graph_state_before
        self.current_trace.graph_state_after = graph_state_after
        self.current_trace.success = success
        self.current_trace.error_message = error_message
        
        # 総処理時間を計算
        if self.current_trace.end_time and self.current_trace.start_time:
            total_time = (self.current_trace.end_time - self.current_trace.start_time).total_seconds() * 1000
            self.current_trace.total_processing_time_ms = int(total_time)
        
        # トレースを保存
        self.traces[self.current_trace.trace_id] = self.current_trace
        
        # 古いトレースを削除（メモリ管理）
        if len(self.traces) > self.max_traces:
            oldest_trace_id = min(self.traces.keys(), 
                                key=lambda tid: self.traces[tid].start_time)
            del self.traces[oldest_trace_id]
        
        logger.info(f"✅ 推論トレース完了: {self.current_trace.trace_id} "
                   f"({len(self.current_trace.steps)}ステップ, "
                   f"{self.current_trace.total_processing_time_ms}ms)")
        
        self.current_trace = None
    
    def get_trace(self, trace_id: str) -> Optional[InferenceTrace]:
        """指定された推論トレースを取得"""
        return self.traces.get(trace_id)
    
    def get_user_traces(self, user_id: str, limit: int = 10) -> List[InferenceTrace]:
        """ユーザーの推論トレース一覧を取得"""
        user_traces = [trace for trace in self.traces.values() 
                      if trace.user_id == user_id]
        
        # 開始時間でソート（新しい順）
        user_traces.sort(key=lambda t: t.start_time, reverse=True)
        
        return user_traces[:limit]
    
    def get_trace_visualization_data(self, trace_id: str) -> Optional[Dict[str, Any]]:
        """可視化用データを生成"""
        trace = self.get_trace(trace_id)
        if not trace:
            return None
        
        # ステップ間の関係を構築
        step_flow = []
        for i, step in enumerate(trace.steps):
            next_step_id = trace.steps[i + 1].step_id if i + 1 < len(trace.steps) else None
            step_flow.append({
                "step_id": step.step_id,
                "step_type": step.step_type.value,
                "reasoning": step.reasoning,
                "confidence": step.confidence,
                "processing_time_ms": step.processing_time_ms,
                "next_step": next_step_id,
                "timestamp": step.timestamp.isoformat()
            })
        
        # グラフ状態の変化を計算
        graph_changes = self._calculate_graph_changes(
            trace.graph_state_before, 
            trace.graph_state_after
        )
        
        # パフォーマンス統計
        performance_stats = {
            "total_steps": len(trace.steps),
            "total_time_ms": trace.total_processing_time_ms,
            "avg_step_time_ms": trace.total_processing_time_ms / len(trace.steps) if trace.steps else 0,
            "slowest_step": max(trace.steps, key=lambda s: s.processing_time_ms) if trace.steps else None,
            "step_type_distribution": self._get_step_type_distribution(trace.steps)
        }
        
        return {
            "trace_info": {
                "trace_id": trace.trace_id,
                "user_id": trace.user_id,
                "user_message": trace.user_message,
                "final_response": trace.final_response,
                "success": trace.success,
                "error_message": trace.error_message,
                "start_time": trace.start_time.isoformat(),
                "end_time": trace.end_time.isoformat() if trace.end_time else None
            },
            "step_flow": step_flow,
            "graph_changes": graph_changes,
            "performance_stats": performance_stats,
            "confidence_scores": [step.confidence for step in trace.steps]
        }
    
    def _calculate_graph_changes(self, before: Dict[str, Any], after: Dict[str, Any]) -> Dict[str, Any]:
        """グラフ状態の変化を計算"""
        changes = {
            "nodes_added": [],
            "nodes_removed": [],
            "nodes_modified": [],
            "edges_added": [],
            "edges_removed": []
        }
        
        # ノードの変化を検出
        before_nodes = set(before.get("nodes", {}).keys())
        after_nodes = set(after.get("nodes", {}).keys())
        
        changes["nodes_added"] = list(after_nodes - before_nodes)
        changes["nodes_removed"] = list(before_nodes - after_nodes)
        
        # エッジの変化を検出（簡略化）
        before_edge_count = len(before.get("edges", []))
        after_edge_count = len(after.get("edges", []))
        changes["edge_count_change"] = after_edge_count - before_edge_count
        
        return changes
    
    def _get_step_type_distribution(self, steps: List[InferenceStep]) -> Dict[str, int]:
        """ステップタイプの分布を計算"""
        distribution = {}
        for step in steps:
            step_type = step.step_type.value
            distribution[step_type] = distribution.get(step_type, 0) + 1
        return distribution
    
    def export_traces_to_json(self, user_id: Optional[str] = None, 
                            limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """トレースをJSON形式でエクスポート"""
        if user_id:
            traces_to_export = self.get_user_traces(user_id, limit or 10)
        else:
            all_traces = list(self.traces.values())
            all_traces.sort(key=lambda t: t.start_time, reverse=True)
            traces_to_export = all_traces[:limit] if limit else all_traces
        
        return [trace.to_dict() for trace in traces_to_export]
    
    def get_system_statistics(self) -> Dict[str, Any]:
        """システム統計を取得"""
        total_traces = len(self.traces)
        successful_traces = sum(1 for trace in self.traces.values() if trace.success)
        
        if total_traces == 0:
            return {
                "total_traces": 0,
                "success_rate": 0,
                "avg_processing_time_ms": 0,
                "popular_step_types": []
            }
        
        avg_time = sum(trace.total_processing_time_ms for trace in self.traces.values()) / total_traces
        
        # 人気のステップタイプ
        all_steps = []
        for trace in self.traces.values():
            all_steps.extend(trace.steps)
        
        step_type_counts = {}
        for step in all_steps:
            step_type = step.step_type.value
            step_type_counts[step_type] = step_type_counts.get(step_type, 0) + 1
        
        popular_step_types = sorted(step_type_counts.items(), 
                                  key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_traces": total_traces,
            "success_rate": successful_traces / total_traces,
            "avg_processing_time_ms": int(avg_time),
            "popular_step_types": popular_step_types,
            "active_users": len(set(trace.user_id for trace in self.traces.values())),
            "avg_steps_per_trace": sum(len(trace.steps) for trace in self.traces.values()) / total_traces
        }


# グローバルインスタンス
inference_logger = OntologyInferenceLogger()


def get_inference_logger() -> OntologyInferenceLogger:
    """推論ログインスタンスを取得"""
    return inference_logger