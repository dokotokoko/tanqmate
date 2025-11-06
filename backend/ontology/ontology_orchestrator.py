"""
探究オントロジーを用いた対話フローを統括するクラス
"""

import json
import logging
import os
from typing import List, Dict, Optional, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path

from conversation_agent.orchestrator import ConversationOrchestrator
from .advanced_inference_engine import AdvancedInferenceEngine
from .ontology_adapter import OntologyAdapter
from .ontology_graph import Node, NodeType, Edge, RelationType
from .graph_inference_engine import GraphInferenceEngine
from .session_manager import SessionManager
from .context_aware_response_generator import ContextAwareResponseGenerator
from .learning_data_collector import LearningDataCollector
from .metrics_manager import MetricsManager
from .result_packager import ResultPackager
from conversation_agent.state_extractor import StateExtractor
from conversation_agent.project_planner import ProjectPlanner
from conversation_agent.schema import (
    StateSnapshot, TurnPackage, SupportType, SpeechAct, ProjectPlan, 
    NextAction, Milestone
)

logger = logging.getLogger(__name__)


class OntologyOrchestrator(ConversationOrchestrator):
    """高度な学習・適応機能を持つ対話オーケストレーター（統合版）"""
    
    def __init__(self, 
                 llm_client=None,
                 use_mock: bool = False,
                 use_graph: bool = True,
                 use_advanced_inference: bool = True,
                 ontology_path: str = "ontology.yaml",
                 constraints_path: str = "constraints.yaml",
                 model_dir: str = "inference_models"):
        """
        初期化
        
        Args:
            use_advanced_inference: 高度な推論エンジンを使用するか
            model_dir: 学習モデルの保存ディレクトリ
        """
        # 親クラスの初期化
        super().__init__(llm_client, use_mock)
        
        self.use_graph = use_graph
        self.use_advanced_inference = use_advanced_inference
        self.model_dir = Path(model_dir)
        self.ontology_path = ontology_path
        self.constraints_path = constraints_path
        
        # 高度な推論システムの初期化
        if self.use_graph:
            self._initialize_advanced_systems()
        
        # フィードバック学習機能
        self.feedback_enabled = True
        self.auto_learning_enabled = True
        
        # 新しいコンポーネントクラスの初期化
        self._initialize_component_classes()
        
        logger.info(f"🌟 OntologyOrchestrator初期化完了 (advanced={use_advanced_inference})")
    
    def _initialize_advanced_systems(self):
        """高度なシステムを初期化"""
        try:
            # オントロジーアダプターを初期化
            self.ontology_adapter = OntologyAdapter(
                self.ontology_path,
                self.constraints_path
            )
            
            # 高度な推論エンジンを初期化
            if self.use_advanced_inference:
                self.advanced_inference_engine = AdvancedInferenceEngine(
                    self.ontology_adapter.graph,
                    str(self.model_dir)
                )
                logger.info("✅ 高度な推論エンジン初期化完了")
            else:
                # 標準推論エンジンにフォールバック
                self.inference_engine = GraphInferenceEngine(self.ontology_adapter.graph)
                logger.info("✅ 標準推論エンジン初期化完了")
            
            # グラフデータを読み込み
            self._load_graph_data()
            
        except Exception as e:
            logger.error(f"❌ 高度システム初期化エラー: {e}")
            self.use_graph = False
            self.use_advanced_inference = False
    
    def _initialize_component_classes(self):
        """新しいコンポーネントクラスを初期化"""
        
        # セッション管理
        self.session_manager = SessionManager(
            session_timeout_minutes=24*60,  # 24時間
            persist_sessions=True
        )
        
        # 状態抽出器（グラフ対応拡張版）
        self.state_extractor = StateExtractor(
            llm_client=self.llm_client,
            graph_enabled=self.use_graph
        )
        
        # プロジェクト計画器（グラフ対応拡張版）
        self.project_planner = ProjectPlanner(
            llm_client=self.llm_client,
            graph_enabled=self.use_graph
        )
        
        # コンテキスト認識応答生成器
        self.response_generator = ContextAwareResponseGenerator(
            llm_client=self.llm_client,
            base_response_generator=self._generate_llm_response
        )
        
        # 学習データ収集器
        self.learning_data_collector = LearningDataCollector(
            data_directory="learning_data",
            persist_data=True
        )
        
        # メトリクス管理
        self.metrics_manager = MetricsManager(
            enable_detailed_tracking=True
        )
        
        # 結果パッケージング
        self.result_packager = ResultPackager(
            include_debug_info=False  # 本番環境では無効
        )
        
        # 従来のメトリクスオブジェクトを新しいマネージャーに統合
        if hasattr(self, 'metrics'):
            self.metrics_manager.metrics = self.metrics
        else:
            self.metrics = self.metrics_manager.metrics
        
        logger.info("✅ 全コンポーネントクラス初期化完了")
    
    def _load_graph_data(self):
        """グラフデータを読み込み（V1から統合）"""
        nodes_file = Path("nodes.jsonl")
        edges_file = Path("edges.jsonl")
        
        if nodes_file.exists() and edges_file.exists():
            try:
                self.ontology_adapter.graph.import_from_jsonl(
                    str(nodes_file), 
                    str(edges_file)
                )
                logger.info(f"✅ グラフデータ読み込み完了: {len(self.ontology_adapter.graph.nodes)} nodes")
            except Exception as e:
                logger.error(f"❌ グラフデータ読み込みエラー: {e}")
    
    def _save_graph_data(self):
        """グラフデータを保存（V1から統合）"""
        if not self.use_graph:
            return
        
        try:
            nodes_file = Path("nodes.jsonl")
            edges_file = Path("edges.jsonl")
            
            self.ontology_adapter.graph.export_to_jsonl(
                str(nodes_file),
                str(edges_file)
            )
            logger.info("💾 グラフデータ保存完了")
        except Exception as e:
            logger.error(f"❌ グラフデータ保存エラー: {e}")
    
    def process_turn(self,
                    user_message: str,
                    conversation_history: List[Dict[str, str]],
                    project_context: Optional[Dict[str, Any]] = None,
                    user_id: Optional[int] = None,
                    conversation_id: Optional[str] = None,
                    session_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        高度な対話処理（リファクタリング版：各責務を専門クラスに委譲）
        """
        
        logger.info("🚀 OntologyOrchestrator処理開始（統合版）")
        logger.info(f"   - グラフモード: {self.use_graph}")
        logger.info(f"   - 高度推論: {self.use_advanced_inference}")
        
        try:
            # 1. セッション管理（SessionManager）
            session_id = f"{user_id}_{conversation_id}" if user_id and conversation_id else str(user_id)
            session_info = self.session_manager.get_or_create_session(session_id, session_context)
            logger.info(f"📋 Step 1: セッション管理完了 (ID: {session_id})")
            
            # 2. 状態抽出（StateExtractor - 拡張版）
            logger.info("📊 Step 2: 拡張状態抽出開始")
            state = self.state_extractor.extract_enhanced_state(
                conversation_history, project_context, user_id, conversation_id, session_info
            )
            logger.info(f"✅ Step 2完了: 目標={state.goal or '未設定'}")
            
            # 3. グラフノード管理（OntologyAdapter）
            graph_node = None
            graph_context = None
            if self.use_graph and user_id:
                logger.info("🔄 Step 3: グラフノード作成・管理開始")
                graph_node = self.ontology_adapter.create_enhanced_graph_node(
                    state, user_message, str(user_id), session_info
                )
                graph_context = self.ontology_adapter.get_graph_context(str(user_id))
                logger.info(f"✅ Step 3完了: ノード作成 (ID: {graph_node.id})")
            
            # 4. 推論実行（GraphInferenceEngine or AdvancedInferenceEngine）
            logger.info("🧠 Step 4: 推論実行開始")
            if self.use_graph and graph_node:
                if self.use_advanced_inference and hasattr(self, 'advanced_inference_engine'):
                    inference_result = self.advanced_inference_engine.infer_next_step_advanced(
                        graph_node, session_context
                    )
                else:
                    inference_result = self.inference_engine.infer_next_step(graph_node)
                
                # 推論結果でノードを更新
                self.ontology_adapter.update_node_with_inference_result(graph_node, inference_result)
            else:
                # 従来の推論
                support_type, reason, confidence = self._determine_support_type(state)
                selected_acts, act_reason = self._select_acts(state, support_type)
                inference_result = {
                    "support_type": support_type,
                    "acts": selected_acts,
                    "reason": f"{reason} / {act_reason}",
                    "confidence": confidence
                }
            
            support_type = inference_result["support_type"]
            selected_acts = inference_result["acts"]
            reason = inference_result["reason"]
            confidence = inference_result["confidence"]
            
            logger.info(f"✅ Step 4完了: {support_type} (確信度: {confidence:.2f})")
            
            # 5. プロジェクト計画生成（ProjectPlanner）
            logger.info("📋 Step 5: プロジェクト計画生成開始")
            if self.use_graph and graph_node:
                predictions = inference_result.get('predictions', [])
                project_plan = self.project_planner.generate_graph_based_plan(
                    graph_node, state, inference_result, predictions
                )
            else:
                project_plan = self.project_planner.generate_project_plan(
                    state, conversation_history
                )
            logger.info(f"✅ Step 5完了: 計画生成")
            
            # 6. 応答生成（ContextAwareResponseGenerator）
            logger.info("📝 Step 6: コンテキスト認識応答生成開始")
            response_package = self.response_generator.generate_context_aware_response(
                state, support_type, selected_acts, user_message, 
                session_info, inference_result, graph_node
            )
            logger.info(f"✅ Step 6完了: 応答文字数={len(response_package.natural_reply)}")
            
            # 7. 学習データ収集（LearningDataCollector）
            if graph_node:
                logger.info("📈 Step 7: 学習データ収集開始")
                learning_data = self.learning_data_collector.collect_learning_data(
                    graph_node, inference_result, response_package, session_info, state
                )
                logger.info(f"✅ Step 7完了: データ収集")
            
            # 8. メトリクス更新（MetricsManager）
            logger.info("📊 Step 8: メトリクス更新開始")
            self.metrics_manager.update_basic_metrics(state, support_type, selected_acts, confidence)
            if graph_node:
                self.metrics_manager.update_graph_metrics(graph_node, inference_result, graph_context)
            self.metrics_manager.update_inference_metrics(inference_result)
            self.metrics_manager.update_response_metrics(response_package)
            self.metrics_manager.update_session_metrics(session_info, str(user_id))
            if 'learning_data' in locals():
                self.metrics_manager.update_learning_effectiveness(learning_data)
            logger.info(f"✅ Step 8完了: メトリクス更新")
            
            # 9. セッション情報更新（SessionManager）
            self.session_manager.add_to_learning_trajectory(session_id, {
                'support_type': support_type,
                'acts': selected_acts,
                'confidence': confidence,
                'depth': graph_node.depth if graph_node else 0.5
            })
            
            # 10. グラフ更新とデータ保存
            if self.use_graph and graph_node:
                logger.info("🔄 Step 10: グラフ更新・保存開始")
                # 応答に基づいてグラフを更新
                response_type = self._classify_response_type(response_package.natural_reply)
                if response_type:
                    self.ontology_adapter.create_graph_edge_from_response(
                        graph_node, response_package.natural_reply, response_type
                    )
                self._save_graph_data()
                logger.info(f"✅ Step 10完了: グラフ更新・保存")
            
            # 11. 履歴更新（従来機能）
            self._update_history(support_type, selected_acts, response_package)
            
            # 12. 結果パッケージング（ResultPackager）
            logger.info("📦 Step 12: 結果パッケージング開始")
            result = self.result_packager.package_enhanced_result(
                response_package=response_package,
                support_type=support_type,
                selected_acts=selected_acts,
                state=state,
                project_plan=project_plan,
                reason=reason,
                confidence=confidence,
                inference_result=inference_result,
                session_info=session_info,
                graph_context=graph_context,
                metrics=self.metrics_manager.get_comprehensive_metrics(),
                learning_data=learning_data if 'learning_data' in locals() else None,
                mode="enhanced_unified"
            )
            logger.info(f"✅ Step 12完了: パッケージング")
            
            logger.info("🎉 OntologyOrchestrator処理完了（統合版）")
            return result
            
        except Exception as e:
            import traceback
            logger.error(f"❌ 対話処理エラー: {e}")
            logger.error(f"❌ トレースバック:\n{traceback.format_exc()}")
            
            # エラー結果もResultPackagerでパッケージング
            return self.result_packager.package_error_result(
                error=e,
                context={"user_id": user_id, "session_id": session_id if 'session_id' in locals() else None}
            )
    
    def _classify_response_type(self, response_text: str) -> Optional[str]:
        """応答テキストから応答タイプを分類"""
        
        if "？" in response_text or "?" in response_text:
            return "question"
        elif any(word in response_text for word in ["してみましょう", "試して", "実験", "実行"]):
            return "method"
        elif any(word in response_text for word in ["まとめると", "つまり", "整理すると", "振り返る"]):
            return "reflection"
        elif any(word in response_text for word in ["仮説", "推測", "考えられる"]):
            return "hypothesis"
        elif any(word in response_text for word in ["洞察", "気づき", "発見", "理解"]):
            return "insight"
        else:
            return None
    
    def _get_or_create_session(self, session_id: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """セッション情報を取得または作成（DEPRECATED: SessionManagerを使用）"""
        
        # 新しいSessionManagerクラスに委譲
        return self.session_manager.get_or_create_session(session_id, context)
    
    def _extract_enhanced_state(self, 
                               conversation_history: List[Dict[str, str]],
                               project_context: Optional[Dict[str, Any]],
                               user_id: Optional[int],
                               conversation_id: Optional[str],
                               session_info: Dict[str, Any]) -> StateSnapshot:
        """拡張状態抽出（DEPRECATED: StateExtractorを使用）"""
        
        # 新しいStateExtractorクラスに委譲
        return self.state_extractor.extract_enhanced_state(
            conversation_history, project_context, user_id, conversation_id, session_info
        )
    
    def _get_conversation_context(self, state) -> Dict[str, Any]:
        """安全にconversation_contextを取得する"""
        try:
            return getattr(state, 'conversation_context', {}) or {}
        except AttributeError:
            return {}
    
    def _set_conversation_context(self, state, context: Dict[str, Any]) -> None:
        """安全にconversation_contextを設定する"""
        try:
            state.conversation_context = context
        except AttributeError:
            logger.warning("StateSnapshotにconversation_contextフィールドが存在しません。動的に追加します。")
            setattr(state, 'conversation_context', context)

    def _extract_conversation_context(self, conversation_history: List[Dict[str, str]]) -> Dict[str, Any]:
        """会話履歴から文脈情報を汎用的に抽出"""
        import re
        
        context = {
            'topics': [],
            'current_topic': None,
            'mentioned_entities': [],
            'key_phrases': [],
            'context_chain': [],
            'user_interests': [],
            'discussion_subjects': []
        }
        
        if not conversation_history:
            return context
        
        # 最近の会話から重要な要素を抽出
        recent_messages = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history
        
        # 直前の会話内容を重視
        previous_assistant_response = None
        
        for msg in recent_messages:
            if msg.get('role') == 'user':
                user_text = msg.get('content', '')
                
                # 名詞句を抽出（簡易的な方法）
                # 「〜について」「〜に関して」「〜を」などのパターンで主題を検出
                topic_patterns = [
                    r'(.+?)について',
                    r'(.+?)に関して',
                    r'(.+?)に興味',
                    r'(.+?)を(.+?)したい',
                    r'(.+?)が(.+?)です',
                    r'(.+?)で(.+?)を'
                ]
                
                for pattern in topic_patterns:
                    matches = re.findall(pattern, user_text)
                    if matches:
                        if isinstance(matches[0], tuple):
                            # タプルの場合、最初の要素を取得
                            topic = matches[0][0].strip()
                        else:
                            topic = matches[0].strip()
                        
                        # 短すぎる場合はスキップ
                        if len(topic) > 1 and topic not in ['それ', 'これ', 'あれ', '何']:
                            if topic not in context['mentioned_entities']:
                                context['mentioned_entities'].append(topic)
                            context['current_topic'] = topic
                
                # ユーザーの回答から興味・関心を抽出
                # 短い回答（単語や短文）も文脈として保持
                if len(user_text) < 20 and not any(punct in user_text for punct in ['？', '?', '。']):
                    # 短い回答は興味の表明として扱う
                    context['user_interests'].append(user_text.strip())
                    if not context['current_topic']:
                        context['current_topic'] = user_text.strip()
                
                # アクション関連の動詞を検出
                action_words = ['作る', '作り', '開発', '構築', '実装', '設計', 'つくる', '制作',
                              '学ぶ', '学習', '勉強', '研究', '調べる', '知る', '理解',
                              '始める', 'やる', '試す', '使う', '活用', '応用']
                
                for word in action_words:
                    if word in user_text:
                        if context['current_topic']:
                            phrase = f"{context['current_topic']}を{word}"
                        else:
                            phrase = f"{word}こと"
                        context['key_phrases'].append(phrase)
            
            elif msg.get('role') == 'assistant':
                # アシスタントの質問から文脈を抽出
                assistant_text = msg.get('content', '')
                previous_assistant_response = assistant_text
                
                # 「何に興味がありますか？」のような質問から文脈を抽出
                question_patterns = [
                    r'何に(.+?)ますか',
                    r'(.+?)の何に',
                    r'(.+?)について',
                    r'どんな(.+?)を'
                ]
                
                for pattern in question_patterns:
                    matches = re.findall(pattern, assistant_text)
                    if matches:
                        # アシスタントが聞いているトピックも文脈として保持
                        for match in matches:
                            if isinstance(match, str) and len(match) > 1:
                                context['discussion_subjects'].append(match)
        
        # トピックチェーンを構築
        all_topics = context['mentioned_entities'] + context['user_interests']
        if all_topics:
            context['topics'] = all_topics[:5]  # 最大5つのトピック
            context['context_chain'] = all_topics[-3:]  # 最近の3つ
        
        # 文脈の継続性を確保
        if not context['current_topic'] and context['user_interests']:
            # 現在のトピックが不明な場合、最新の興味を使用
            context['current_topic'] = context['user_interests'][-1]
        
        return context
    
    def _find_common_elements(self, element_lists: List[List[str]]) -> List[str]:
        """複数のリストから共通要素を見つける"""
        if not element_lists:
            return []
        
        # 要素の出現回数をカウント
        element_counts = {}
        for elements in element_lists:
            for element in elements:
                element_counts[element] = element_counts.get(element, 0) + 1
        
        # 半数以上で出現する要素を共通要素とする
        threshold = len(element_lists) // 2 + 1
        return [element for element, count in element_counts.items() if count >= threshold]
    
    def _create_graph_node(self, state: StateSnapshot, user_message: str, user_id: str) -> Node:
        """状態からグラフノードを作成（V1から統合）"""
        
        # 既存のノードを取得または新規作成
        current_position = self.ontology_adapter.graph.get_current_position(user_id)
        
        if current_position:
            # 前のノードから情報を引き継ぐ
            new_node = self.ontology_adapter.state_to_graph_node(state, user_id)
            new_node.depth = current_position.depth + 0.1
            new_node.alignment_goal = current_position.alignment_goal * 0.95
        else:
            # 新規ノード
            new_node = self.ontology_adapter.state_to_graph_node(state, user_id)
        
        # ユーザーメッセージを反映
        new_node.text = user_message[:200] if user_message else new_node.text
        
        # グラフに追加
        self.ontology_adapter.graph.add_node(new_node)
        
        # 前のノードとの関係を作成
        if current_position:
            rel_type = self._infer_relation_type(current_position, new_node)
            if rel_type:
                edge = Edge(
                    src=current_position.id,
                    rel=rel_type,
                    dst=new_node.id,
                    confidence=0.7
                )
                self.ontology_adapter.graph.add_edge(edge)
        
        return new_node
    
    def _infer_relation_type(self, src_node: Node, dst_node: Node) -> Optional[RelationType]:
        """ノード間の関係を推論"""
        return self.ontology_adapter._determine_relation_type(src_node.type, dst_node.type)
    
    def _generate_graph_based_plan(self, node: Node, state: StateSnapshot) -> Optional[Any]:
        """グラフベースのプロジェクト計画を生成（V1から統合）"""
        
        # グラフの現在位置から計画を生成
        from conversation_agent.schema import ProjectPlan, NextAction, Milestone
        
        # 次のステップ予測
        predictions = self.inference_engine.predict_next_nodes(node, depth=5)
        
        # マイルストーン生成
        milestones = []
        for i, pred in enumerate(predictions[:3]):
            milestones.append(Milestone(
                title=f"{pred['node_type'].value}の達成",
                description=f"探究プロセスの第{i+1}段階",
                target_date=f"{i+1}週間後",
                success_criteria=[f"{pred['node_type'].value}が明確になる"],
                order=i+1
            ))
        
        # 次のアクション生成
        next_actions = []
        suggestions = self.ontology_adapter.graph.suggest_next_step(node)
        
        for i, suggestion in enumerate(suggestions[:3]):
            next_actions.append(NextAction(
                action=suggestion["action"],
                urgency=5 if suggestion["priority"] == "high" else 3,
                importance=4,
                reason=suggestion["reason"],
                expected_outcome=f"{suggestion['action']}の完了"
            ))
        
        # 代替パスの検討
        alternatives = self.inference_engine.suggest_alternative_paths(
            node, 
            NodeType.INSIGHT
        )
        
        strategic_approach = "グラフベースの探究プロセス"
        if alternatives:
            best_alt = alternatives[0]
            strategic_approach = best_alt["description"]
        
        return ProjectPlan(
            north_star="探究の深化と循環的な学び",
            north_star_metric="グラフのサイクル完成数",
            milestones=milestones,
            next_actions=next_actions,
            strategic_approach=strategic_approach,
            risk_factors=["ループに陥る可能性", "明確性の低下"],
            created_at=datetime.now().isoformat(),
            confidence=0.7
        )
    
    def _update_graph_with_response(self, 
                                   current_node: Node,
                                   response_package: TurnPackage,
                                   next_node_type: NodeType):
        """応答に基づいてグラフを更新（V1から統合）"""
        
        # 応答の内容から新しいノードを作成するか判断
        response_text = response_package.natural_reply
        
        # 質問が含まれている場合
        if "？" in response_text or "?" in response_text:
            response_type = "question"
        # 提案が含まれている場合
        elif any(word in response_text for word in ["してみましょう", "試して", "実験"]):
            response_type = "method"
        # 振り返りが含まれている場合
        elif any(word in response_text for word in ["まとめると", "つまり", "整理すると"]):
            response_type = "reflection"
        else:
            response_type = None
        
        if response_type:
            self.ontology_adapter.update_graph_from_response(
                current_node,
                response_type,
                response_text,
                confidence=0.6
            )
    
    def get_graph_insights(self, user_id: str) -> Dict[str, Any]:
        """ユーザーのグラフから洞察を取得（V1から統合）"""
        
        if not self.use_graph:
            return {"error": "グラフモードが無効です"}
        
        # パターン発見
        patterns = self.inference_engine.find_patterns(user_id, pattern_length=3)
        
        # 進捗情報
        progress = self.ontology_adapter.graph.calculate_progress(user_id)
        
        # 現在位置
        current_position = self.ontology_adapter.graph.get_current_position(user_id)
        
        return {
            "current_position": current_position.to_dict() if current_position else None,
            "progress": progress,
            "patterns": patterns,
            "total_nodes": len([n for n in self.ontology_adapter.graph.nodes.values() 
                              if n.student_id == user_id]),
            "graph_mode": "enabled"
        }
    
    def switch_mode(self, use_graph: bool):
        """動作モードを切り替え（V1から統合）"""
        
        old_mode = "graph" if self.use_graph else "linear"
        new_mode = "graph" if use_graph else "linear"
        
        if old_mode == new_mode:
            logger.info(f"モード変更なし: {old_mode}")
            return
        
        self.use_graph = use_graph
        
        if use_graph and not hasattr(self, 'ontology_adapter'):
            # グラフシステムを遅延初期化
            self.ontology_adapter = OntologyAdapter()
            self.inference_engine = GraphInferenceEngine(self.ontology_adapter.graph)
            self._load_graph_data()
        
        logger.info(f"✅ モード切り替え完了: {old_mode} → {new_mode}")
    
    def _create_enhanced_graph_node(self, 
                                   state: StateSnapshot, 
                                   user_message: str, 
                                   user_id: str,
                                   session_info: Dict[str, Any]) -> Node:
        """拡張グラフノード作成（セッション情報と会話文脈の統合）"""
        
        # 基本ノード作成
        node = self._create_graph_node(state, user_message, user_id)
        
        # セッション情報でノードを強化
        node.metadata = node.metadata or {}
        node.metadata['session_id'] = session_info['session_id']
        node.metadata['interaction_count'] = session_info['interaction_count']
        
        # ★重要: 会話文脈を保存
        conversation_context = self._get_conversation_context(state)
        if conversation_context:
            node.metadata['conversation_context'] = conversation_context
        
        # 前のノードから文脈を引き継ぐ
        current_position = self.ontology_adapter.graph.get_current_position(user_id)
        if current_position and current_position.metadata.get('conversation_context'):
            # 前のノードの文脈を引き継いで拡張
            prev_context = current_position.metadata['conversation_context']
            if 'conversation_context' in node.metadata:
                # 文脈をマージ
                node.metadata['conversation_context'] = {
                    **prev_context,
                    **node.metadata['conversation_context'],
                    'previous_topic': prev_context.get('current_topic'),
                    'context_chain': prev_context.get('context_chain', []) + [prev_context.get('current_topic')]
                }
            else:
                node.metadata['conversation_context'] = prev_context
        
        # 学習軌跡から深さを調整
        if session_info['learning_trajectory']:
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
            if style.get('analytical', 0.5) > 0.7:
                node.clarity *= 1.1
            # 探索的学習者は多少の曖昧さを許容
            elif style.get('exploratory', 0.5) > 0.7:
                node.clarity *= 0.9
        
        return node
    
    def _generate_adaptive_plan(self, 
                               node: Node, 
                               state: StateSnapshot, 
                               inference_result: Dict[str, Any]) -> Optional[ProjectPlan]:
        """適応的プロジェクト計画生成"""
        
        if not self.use_advanced_inference or not hasattr(self, 'advanced_inference_engine'):
            return self._generate_graph_based_plan(node, state)
        
        # 高度推論結果から計画を生成
        predictions = inference_result.get('predictions', [])
        inference_source = inference_result.get('inference_source', '')
        
        # 北極星の設定（推論ソースに応じて調整）
        if 'pattern:' in inference_source:
            north_star = "学習パターンに基づく最適化された探究プロセス"
        elif 'adaptive_rule:' in inference_source:
            north_star = "個人適応型の探究学習"
        else:
            north_star = "グラフ駆動の体系的探究"
        
        # マイルストーン生成（予測ベース）
        milestones = []
        for i, pred in enumerate(predictions[:4]):
            milestone = Milestone(
                title=f"段階{i+1}: {pred['node_type'].value}の達成",
                description=f"探究プロセスの第{i+1}段階（信頼度: {pred['confidence']:.2f}）",
                target_date=f"{i+1}週間後",
                success_criteria=[
                    f"{pred['node_type'].value}の明確な定義",
                    f"次段階への準備完了"
                ],
                order=i+1
            )
            milestones.append(milestone)
        
        # 次のアクション生成（推論結果ベース）
        next_actions = []
        
        # 推論結果からの主要アクション
        main_action = NextAction(
            action=f"{inference_result['support_type']}を通じた{inference_result.get('next_node_type', NodeType.QUESTION).value}の発展",
            urgency=5,
            importance=5,
            reason=inference_result['reason'],
            expected_outcome=f"探究の{inference_result.get('next_node_type', NodeType.QUESTION).value}段階への進展"
        )
        next_actions.append(main_action)
        
        # 学習ベースの補助アクション
        if hasattr(self, 'advanced_inference_engine'):
            user_profile = self.advanced_inference_engine._get_or_create_user_profile(node.student_id)
            
            # ユーザーの学習スタイルに基づくアクション
            for style, score in user_profile.learning_style.items():
                if score > 0.7:
                    style_action = self._generate_style_based_action(style, node)
                    if style_action:
                        next_actions.append(style_action)
        
        # 戦略的アプローチ
        strategic_approach = self._generate_strategic_approach(inference_result, node)
        
        # リスク要因
        risk_factors = self._identify_risk_factors(node, inference_result)
        
        return ProjectPlan(
            north_star=north_star,
            north_star_metric="探究プロセスの完成度と学習者の満足度",
            milestones=milestones,
            next_actions=next_actions,
            strategic_approach=strategic_approach,
            risk_factors=risk_factors,
            created_at=datetime.now().isoformat(),
            confidence=inference_result.get('confidence', 0.7)
        )
    
    def _generate_style_based_action(self, style: str, node: Node) -> Optional[NextAction]:
        """学習スタイルに基づくアクション生成"""
        
        style_actions = {
            'analytical': NextAction(
                action="データと論理的根拠の収集・分析",
                urgency=3,
                importance=4,
                reason="分析的思考スタイルに適合",
                expected_outcome="論理的で体系的な理解の構築"
            ),
            'creative': NextAction(
                action="創造的なアイデア発想とブレインストーミング",
                urgency=3,
                importance=4,
                reason="創造的思考スタイルに適合",
                expected_outcome="新しい視点とアイデアの創出"
            ),
            'structured': NextAction(
                action="段階的なプロセス計画と実行手順の確立",
                urgency=4,
                importance=4,
                reason="構造化思考スタイルに適合",
                expected_outcome="明確で実行可能な行動計画"
            ),
            'exploratory': NextAction(
                action="多角的な視点での探索と試行錯誤",
                urgency=2,
                importance=3,
                reason="探索的思考スタイルに適合",
                expected_outcome="幅広い理解と新たな発見"
            )
        }
        
        return style_actions.get(style)
    
    def _generate_strategic_approach(self, inference_result: Dict[str, Any], node: Node) -> str:
        """戦略的アプローチ生成"""
        
        base_approach = "個人適応型グラフベース探究学習"
        
        inference_source = inference_result.get('inference_source', '')
        confidence = inference_result.get('confidence', 0.5)
        
        if confidence > 0.8:
            confidence_desc = "高信頼度"
        elif confidence > 0.6:
            confidence_desc = "中信頼度"
        else:
            confidence_desc = "探索的"
        
        if 'pattern:' in inference_source:
            return f"{base_approach} - 学習パターンベース（{confidence_desc}）"
        elif 'adaptive_rule:' in inference_source:
            return f"{base_approach} - 適応ルールベース（{confidence_desc}）"
        else:
            return f"{base_approach} - 基本ルールベース（{confidence_desc}）"
    
    def _identify_risk_factors(self, node: Node, inference_result: Dict[str, Any]) -> List[str]:
        """リスク要因の特定"""
        
        risks = []
        
        # 明確性に基づくリスク
        if node.clarity < 0.4:
            risks.append("概念の明確性不足による混乱のリスク")
        
        # 深さに基づくリスク
        if node.depth > 0.8:
            risks.append("過度な深掘りによる本質を見失うリスク")
        elif node.depth < 0.3:
            risks.append("表面的な理解に留まるリスク")
        
        # 信頼度に基づくリスク
        confidence = inference_result.get('confidence', 0.5)
        if confidence < 0.5:
            risks.append("推論の不確実性による方向性の迷いのリスク")
        
        # メタデータからのリスク
        if node.metadata:
            looping_signals = node.metadata.get('looping_signals', [])
            if looping_signals:
                risks.append("同じパターンの繰り返しによる停滞のリスク")
        
        return risks
    
    def _build_context_enhanced_message(self, user_message: str, conversation_context: Dict[str, Any]) -> str:
        """会話文脈を含めた強化メッセージを構築"""
        
        # 文脈情報を含めたメッセージを構築
        enhanced_message = user_message
        
        # 現在のトピックがある場合
        if conversation_context.get('current_topic'):
            topic = conversation_context['current_topic']
            # ユーザーメッセージに文脈を追加
            enhanced_message = f"[文脈: {topic}について話しています] {user_message}"
        
        # 文脈チェーンがある場合
        if conversation_context.get('context_chain'):
            chain = ' → '.join(conversation_context['context_chain'][-3:])  # 最近3つ
            enhanced_message = f"[話題の流れ: {chain}] {enhanced_message}"
        
        return enhanced_message
    
    def _generate_context_aware_response(self, 
                                        state: StateSnapshot,
                                        support_type: str,
                                        selected_acts: List[str],
                                        user_message: str,
                                        session_info: Dict[str, Any],
                                        inference_result: Dict[str, Any]) -> TurnPackage:
        """コンテキスト強化応答生成（会話文脈を考慮）"""
        
        # ★重要: 会話文脈を応答生成に渡す
        conversation_context = self._get_conversation_context(state)
        if conversation_context:
            # 文脈情報を含めて応答生成
            context_enhanced_message = self._build_context_enhanced_message(user_message, conversation_context)
            base_response = self._generate_llm_response(state, support_type, selected_acts, context_enhanced_message)
        else:
            # 基本応答生成
            base_response = self._generate_llm_response(state, support_type, selected_acts, user_message)
        
        # セッション情報で応答を強化
        enhanced_response = base_response.natural_reply
        enhanced_followups = list(base_response.followups)
        
        # ★会話文脈に基づく応答の調整
        conv_context = self._get_conversation_context(state)
        if conv_context:
            current_topic = conv_context.get('current_topic')
            
            # トピックが明確な場合、それを参照する応答に調整
            if current_topic and current_topic not in enhanced_response:
                # 代名詞を具体的なトピックに置換
                enhanced_response = enhanced_response.replace('それ', current_topic)
                enhanced_response = enhanced_response.replace('これ', current_topic)
                enhanced_response = enhanced_response.replace('あれ', current_topic)
                
                # 文脈に応じた質問の具体化
                # 「何に興味がありますか」→「[トピック]の何に興味がありますか」
                if '何に' in enhanced_response and '興味' in enhanced_response:
                    enhanced_response = enhanced_response.replace('何に興味', f'{current_topic}の何に興味')
                
                # 「何を」→「[トピック]で/を使って何を」
                if '何を' in enhanced_response:
                    # アクションフレーズがある場合
                    if conv_context.get('key_phrases'):
                        last_phrase = conv_context['key_phrases'][-1]
                        if '作る' in last_phrase or '開発' in last_phrase or '構築' in last_phrase:
                            enhanced_response = enhanced_response.replace('何を作', f'{current_topic}で何を作')
                            enhanced_response = enhanced_response.replace('何を開発', f'{current_topic}を使って何を開発')
                        elif '学ぶ' in last_phrase or '学習' in last_phrase:
                            enhanced_response = enhanced_response.replace('何を学', f'{current_topic}の何を学')
                    else:
                        # デフォルトは「〜について何を」
                        enhanced_response = enhanced_response.replace('何を', f'{current_topic}について何を')
                
                # 「どう」「どのように」の具体化
                if 'どう' in enhanced_response or 'どのように' in enhanced_response:
                    enhanced_response = enhanced_response.replace('どうですか', f'{current_topic}についてはどうですか')
                    enhanced_response = enhanced_response.replace('どのように', f'{current_topic}をどのように')
        
        # 学習軌跡に基づく調整
        if session_info['learning_trajectory']:
            trajectory = session_info['learning_trajectory']
            recent_support_types = [item.get('support_type') for item in trajectory[-3:]]
            
            # 同じ支援タイプが続いている場合は変化を提案
            if len(set(recent_support_types)) == 1 and len(recent_support_types) >= 2:
                enhanced_followups.append("別のアプローチを試してみませんか？")
        
        # 推論ソースに基づく説明追加
        if self.use_advanced_inference and inference_result:
            source = inference_result.get('inference_source', '')
            confidence = inference_result.get('confidence', 0.5)
            
            if 'pattern:' in source and confidence > 0.7:
                enhanced_followups.append("これまでの学習パターンを活用しています")
            elif 'adaptive_rule:' in source and confidence > 0.7:
                enhanced_followups.append("あなたに最適化された支援を提供しています")
        
        # ユーザープリファレンスに基づく調整
        user_prefs = session_info.get('user_preferences', {})
        if 'communication_style' in user_prefs:
            style = user_prefs['communication_style']
            if style == 'concise':
                enhanced_response = self._make_response_concise(enhanced_response)
            elif style == 'detailed':
                enhanced_response = self._make_response_detailed(enhanced_response, inference_result)
        
        return TurnPackage(
            natural_reply=enhanced_response,
            followups=enhanced_followups[:3],  # 最大3個
            metadata={
                **base_response.metadata,
                'session_enhanced': True,
                'inference_source': inference_result.get('inference_source', 'unknown'),
                'confidence': inference_result.get('confidence', 0.5)
            }
        )
    
    def _make_response_concise(self, response: str) -> str:
        """応答を簡潔にする"""
        sentences = response.split('。')
        if len(sentences) > 2:
            return '。'.join(sentences[:2]) + '。'
        return response
    
    def _make_response_detailed(self, response: str, inference_result: Dict[str, Any]) -> str:
        """応答を詳細にする"""
        additional_info = []
        
        if 'applied_rule' in inference_result:
            additional_info.append(f"（推論根拠: {inference_result['applied_rule']}）")
        
        if 'predictions' in inference_result:
            pred_count = len(inference_result['predictions'])
            additional_info.append(f"次の{pred_count}ステップを予測して提案しています。")
        
        if additional_info:
            return response + ' ' + ' '.join(additional_info)
        
        return response
    
    def _update_session(self, session_id: str, update_data: Dict[str, Any]):
        """セッション情報を更新"""
        
        if session_id in self.active_sessions:
            session = self.active_sessions[session_id]
            session['interaction_count'] += 1
            
            # コンテキスト履歴に追加
            context_entry = {
                'timestamp': datetime.now().isoformat(),
                'support_type': update_data.get('support_type'),
                'acts': update_data.get('acts', []),
                'confidence': update_data.get('confidence', 0.5)
            }
            session['context_history'].append(context_entry)
            
            # 履歴サイズ制限
            if len(session['context_history']) > 50:
                session['context_history'] = session['context_history'][-25:]
            
            session.update(update_data)
    
    def _collect_learning_data(self, 
                              node: Node, 
                              inference_result: Dict[str, Any], 
                              response_package: TurnPackage,
                              session_info: Dict[str, Any]) -> Dict[str, Any]:
        """学習データを収集"""
        
        return {
            'node_features': {
                'type': node.type.value,
                'clarity': node.clarity,
                'depth': node.depth,
                'confidence': node.confidence
            },
            'inference_features': {
                'support_type': inference_result.get('support_type'),
                'acts': inference_result.get('acts', []),
                'confidence': inference_result.get('confidence', 0.5),
                'source': inference_result.get('inference_source', 'unknown')
            },
            'response_features': {
                'length': len(response_package.natural_reply),
                'followup_count': len(response_package.followups)
            },
            'session_features': {
                'interaction_count': session_info['interaction_count'],
                'session_duration': self._calculate_session_duration(session_info)
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def _calculate_session_duration(self, session_info: Dict[str, Any]) -> float:
        """セッション継続時間を計算（時間）"""
        created_at = datetime.fromisoformat(session_info['created_at'])
        now = datetime.now()
        return (now - created_at).total_seconds() / 3600
    
    def _update_graph_enhanced(self, 
                              current_node: Node,
                              response_package: TurnPackage,
                              inference_result: Dict[str, Any],
                              session_info: Dict[str, Any]):
        """グラフ更新（強化版）"""
        
        # 基本的なグラフ更新
        self._update_graph_with_response(
            current_node, 
            response_package,
            inference_result.get("next_node_type", NodeType.QUESTION)
        )
        
        # セッション情報をノードメタデータに追加
        current_node.metadata = current_node.metadata or {}
        current_node.metadata['last_session_update'] = datetime.now().isoformat()
        current_node.metadata['interaction_count'] = session_info['interaction_count']
        
        # 学習データをメタデータに保存
        if 'learning_data' in session_info:
            current_node.metadata['learning_data'] = session_info['learning_data']
        
        # 推論履歴をノードに関連付け
        if self.use_advanced_inference and hasattr(self, 'advanced_inference_engine'):
            current_node.metadata['inference_history'] = inference_result.get('inference_source', 'unknown')
    
    def _update_enhanced_metrics(self, 
                                state: StateSnapshot, 
                                support_type: str, 
                                selected_acts: List[str], 
                                confidence: float,
                                inference_result: Dict[str, Any]):
        """拡張メトリクス更新"""
        
        # 基本メトリクス更新
        self._update_metrics(state, support_type, selected_acts)
        
        # 推論品質メトリクス
        self.metrics.inference_quality = confidence
        
        # 学習システムメトリクス
        if self.use_advanced_inference and hasattr(self, 'advanced_inference_engine'):
            learning_stats = self.advanced_inference_engine.get_learning_statistics()
            self.metrics.learned_patterns_count = learning_stats['learned_patterns_count']
            self.metrics.adaptive_rules_count = learning_stats['adaptive_rules_count']
    
    def _package_enhanced_result(self, 
                                response_package: TurnPackage,
                                support_type: str,
                                selected_acts: List[str],
                                state: StateSnapshot,
                                project_plan: Optional[ProjectPlan],
                                reason: str,
                                confidence: float,
                                inference_result: Dict[str, Any],
                                session_info: Dict[str, Any]) -> Dict[str, Any]:
        """拡張結果パッケージング"""
        
        # 基本結果
        result = {
            "response": response_package.natural_reply,
            "natural_reply": response_package.natural_reply,  # 互換性のため両方のキーを提供
            "followups": response_package.followups,
            "support_type": support_type,
            "selected_acts": selected_acts,
            "state_snapshot": state.dict(exclude={'user_id', 'conversation_id', 'turn_index'}),
            "project_plan": project_plan.dict() if project_plan else None,
            "decision_metadata": {
                "support_reason": reason,
                "support_confidence": confidence,
                "timestamp": datetime.now().isoformat(),
                "mode": "graph_enhanced" if self.use_graph else "linear",
                "advanced_inference": self.use_advanced_inference
            },
            "metrics": self.metrics.dict()
        }
        
        # グラフコンテキスト（拡張版）
        if self.use_graph and hasattr(self, 'ontology_adapter'):
            graph_context = self.ontology_adapter.get_graph_context(state.user_id or "unknown")
            result["graph_context"] = graph_context
        
        # 高度推論情報
        if self.use_advanced_inference and inference_result:
            result["advanced_inference"] = {
                "source": inference_result.get('inference_source', 'unknown'),
                "confidence": inference_result.get('confidence', 0.5),
                "all_candidates": inference_result.get('all_candidates', []),
                "predictions": inference_result.get('predictions', [])
            }
            
            # 学習統計
            if hasattr(self, 'advanced_inference_engine'):
                result["learning_statistics"] = self.advanced_inference_engine.get_learning_statistics()
        
        # セッション情報
        result["session_info"] = {
            "session_id": session_info['session_id'],
            "interaction_count": session_info['interaction_count'],
            "session_duration_hours": self._calculate_session_duration(session_info)
        }
        
        return result
    
    def provide_feedback(self, 
                        inference_id: str, 
                        user_id: str, 
                        feedback: Dict[str, Any]) -> Dict[str, Any]:
        """フィードバック提供インターフェース"""
        
        if not self.feedback_enabled:
            return {"success": False, "message": "フィードバック機能が無効です"}
        
        if not self.use_advanced_inference or not hasattr(self, 'advanced_inference_engine'):
            return {"success": False, "message": "高度推論エンジンが無効です"}
        
        try:
            # フィードバック学習を実行
            self.advanced_inference_engine.learn_from_feedback(inference_id, user_id, feedback)
            
            # セッション更新
            session_id = f"{user_id}_{inference_id}"
            if session_id in self.active_sessions:
                session = self.active_sessions[session_id]
                session['user_preferences'] = session.get('user_preferences', {})
                
                # フィードバックから好みを学習
                if feedback.get('satisfaction', 0) > 0.7:
                    if 'support_type' in feedback:
                        session['user_preferences']['preferred_support_type'] = feedback['support_type']
                
                if 'communication_style' in feedback:
                    session['user_preferences']['communication_style'] = feedback['communication_style']
            
            return {
                "success": True, 
                "message": "フィードバックから学習しました",
                "learning_enabled": True
            }
            
        except Exception as e:
            logger.error(f"❌ フィードバック学習エラー: {e}")
            return {"success": False, "message": f"学習エラー: {e}"}
    
    def auto_discover_patterns(self, user_id: str) -> Dict[str, Any]:
        """パターン自動発見"""
        
        if not self.auto_learning_enabled or not hasattr(self, 'advanced_inference_engine'):
            return {"success": False, "message": "自動学習機能が無効です"}
        
        try:
            new_patterns = self.advanced_inference_engine.discover_new_patterns(user_id)
            
            return {
                "success": True,
                "new_patterns_count": len(new_patterns),
                "patterns": [
                    {
                        "pattern_id": p.pattern_id,
                        "sequence": [nt.value for nt in p.sequence],
                        "effectiveness_score": p.effectiveness_score
                    }
                    for p in new_patterns
                ]
            }
            
        except Exception as e:
            logger.error(f"❌ パターン発見エラー: {e}")
            return {"success": False, "message": f"パターン発見エラー: {e}"}
    
    def get_enhanced_insights(self, user_id: str) -> Dict[str, Any]:
        """拡張洞察取得"""
        
        base_insights = self.get_graph_insights(user_id) if self.use_graph else {}
        
        # セッション洞察を追加
        session_insights = {}
        user_sessions = [s for s in self.active_sessions.values() if s['session_id'].startswith(str(user_id))]
        
        if user_sessions:
            latest_session = max(user_sessions, key=lambda s: s['last_activity'])
            session_insights = {
                "active_sessions": len(user_sessions),
                "latest_interaction_count": latest_session['interaction_count'],
                "preferred_support_types": latest_session.get('user_preferences', {}).get('preferred_support_type'),
                "learning_trajectory_length": len(latest_session.get('learning_trajectory', []))
            }
        
        # 学習統計を追加
        learning_insights = {}
        if self.use_advanced_inference and hasattr(self, 'advanced_inference_engine'):
            learning_stats = self.advanced_inference_engine.get_learning_statistics()
            user_summary = learning_stats.get('user_learning_summary', {}).get(user_id, {})
            learning_insights = {
                "learning_style": user_summary.get('learning_style', {}),
                "adaptation_count": user_summary.get('adaptation_count', 0),
                "patterns_discovered": len([p for p in self.advanced_inference_engine.learned_patterns.values() 
                                          if user_id in p.pattern_id])
            }
        
        return {
            **base_insights,
            "session_insights": session_insights,
            "learning_insights": learning_insights,
            "system_version": "enhanced_unified"
        }