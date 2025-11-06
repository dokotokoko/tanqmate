"""
コンテキスト認識応答生成クラス
グラフ状態、推論結果、会話文脈を考慮した応答生成を担当
"""

import logging
from typing import List, Dict, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)


class ContextAwareResponseGenerator:
    """コンテキスト認識応答生成エンジン"""
    
    def __init__(self, llm_client=None, base_response_generator=None):
        """
        初期化
        
        Args:
            llm_client: LLMクライアント
            base_response_generator: 基本応答生成器（従来の応答生成機能）
        """
        self.llm_client = llm_client
        self.base_response_generator = base_response_generator
    
    def generate_context_aware_response(self, 
                                       state: 'StateSnapshot',
                                       support_type: str,
                                       selected_acts: List[str],
                                       user_message: str,
                                       session_info: Dict[str, Any],
                                       inference_result: Dict[str, Any],
                                       graph_node: Optional['Node'] = None) -> 'TurnPackage':
        """コンテキスト強化応答生成（会話文脈を考慮）"""
        
        # 会話文脈を取得
        conversation_context = self._get_conversation_context(state)
        
        # 基本応答を生成
        if conversation_context:
            # 文脈情報を含めて応答生成
            context_enhanced_message = self._build_context_enhanced_message(user_message, conversation_context)
            base_response = self._generate_base_response(state, support_type, selected_acts, context_enhanced_message)
        else:
            # 基本応答生成
            base_response = self._generate_base_response(state, support_type, selected_acts, user_message)
        
        # 応答を強化
        enhanced_response = self._enhance_response_with_context(
            base_response, 
            conversation_context, 
            session_info, 
            inference_result,
            graph_node
        )
        
        return enhanced_response
    
    def _get_conversation_context(self, state: 'StateSnapshot') -> Dict[str, Any]:
        """安全にconversation_contextを取得する"""
        try:
            return getattr(state, 'conversation_context', {}) or {}
        except AttributeError:
            return {}
    
    def _build_context_enhanced_message(self, user_message: str, context: Dict[str, Any]) -> str:
        """文脈情報でユーザーメッセージを強化"""
        
        enhanced_message = user_message
        
        # 現在のトピックを追加
        current_topic = context.get('current_topic')
        if current_topic:
            enhanced_message = f"[トピック: {current_topic}] {user_message}"
        
        # 重要なフレーズを追加
        key_phrases = context.get('key_phrases', [])
        if key_phrases:
            recent_phrases = key_phrases[-2:]  # 最新2つ
            enhanced_message += f" [関連フレーズ: {', '.join(recent_phrases)}]"
        
        # 文脈チェーンを追加
        context_chain = context.get('context_chain', [])
        if context_chain:
            enhanced_message += f" [文脈の流れ: {' → '.join(context_chain[-3:])}]"
        
        return enhanced_message
    
    def _generate_base_response(self, 
                               state: 'StateSnapshot',
                               support_type: str,
                               selected_acts: List[str],
                               message: str) -> 'TurnPackage':
        """基本応答を生成"""
        
        if self.base_response_generator:
            # 既存の応答生成器を使用
            return self.base_response_generator(state, support_type, selected_acts, message)
        else:
            # フォールバック: 簡単な応答を生成
            from conversation_agent.schema import TurnPackage
            return TurnPackage(
                natural_reply="ご質問ありがとうございます。",
                followups=["詳しく教えてください。", "他にも何かありますか？"],
                metadata={"source": "fallback"}
            )
    
    def _enhance_response_with_context(self, 
                                      base_response: 'TurnPackage',
                                      conversation_context: Dict[str, Any],
                                      session_info: Dict[str, Any],
                                      inference_result: Dict[str, Any],
                                      graph_node: Optional['Node'] = None) -> 'TurnPackage':
        """コンテキストで応答を強化"""
        
        # 応答とフォローアップをコピー
        enhanced_response = base_response.natural_reply
        enhanced_followups = list(base_response.followups)
        
        # 会話文脈に基づく応答の調整
        enhanced_response = self._adjust_response_with_conversation_context(
            enhanced_response, conversation_context
        )
        
        # セッション履歴に基づく調整
        enhanced_followups = self._adjust_followups_with_session_history(
            enhanced_followups, session_info
        )
        
        # 推論結果に基づく説明追加
        enhanced_followups = self._add_inference_explanations(
            enhanced_followups, inference_result
        )
        
        # ユーザープリファレンスに基づく調整
        enhanced_response = self._adjust_response_with_user_preferences(
            enhanced_response, session_info, inference_result
        )
        
        # グラフノード情報に基づく調整
        if graph_node:
            enhanced_response = self._adjust_response_with_graph_node(
                enhanced_response, graph_node
            )
        
        from conversation_agent.schema import TurnPackage
        return TurnPackage(
            natural_reply=enhanced_response,
            followups=enhanced_followups[:3],  # 最大3個
            metadata={
                **base_response.metadata,
                'context_enhanced': True,
                'inference_source': inference_result.get('inference_source', 'unknown'),
                'confidence': inference_result.get('confidence', 0.5),
                'enhancement_timestamp': datetime.now().isoformat()
            }
        )
    
    def _adjust_response_with_conversation_context(self, 
                                                  response: str, 
                                                  context: Dict[str, Any]) -> str:
        """会話文脈に基づいて応答を調整"""
        
        if not context:
            return response
        
        current_topic = context.get('current_topic')
        if not current_topic:
            return response
        
        # 代名詞を具体的なトピックに置換
        enhanced_response = response
        enhanced_response = enhanced_response.replace('それ', current_topic)
        enhanced_response = enhanced_response.replace('これ', current_topic)
        enhanced_response = enhanced_response.replace('あれ', current_topic)
        
        # 文脈に応じた質問の具体化
        enhanced_response = self._contextualize_questions(enhanced_response, context)
        
        return enhanced_response
    
    def _contextualize_questions(self, response: str, context: Dict[str, Any]) -> str:
        """質問を文脈に応じて具体化"""
        
        current_topic = context.get('current_topic', '')
        key_phrases = context.get('key_phrases', [])
        
        # 「何に興味がありますか」→「[トピック]の何に興味がありますか」
        if '何に' in response and '興味' in response:
            response = response.replace('何に興味', f'{current_topic}の何に興味')
        
        # 「何を」の具体化
        if '何を' in response and key_phrases:
            last_phrase = key_phrases[-1] if key_phrases else ''
            
            if '作る' in last_phrase or '開発' in last_phrase or '構築' in last_phrase:
                response = response.replace('何を作', f'{current_topic}で何を作')
                response = response.replace('何を開発', f'{current_topic}を使って何を開発')
                response = response.replace('何を構築', f'{current_topic}で何を構築')
            elif '学ぶ' in last_phrase or '学習' in last_phrase:
                response = response.replace('何を学', f'{current_topic}の何を学')
            else:
                # デフォルトは「〜について何を」
                response = response.replace('何を', f'{current_topic}について何を')
        
        # 「どう」「どのように」の具体化
        if 'どう' in response or 'どのように' in response:
            response = response.replace('どうですか', f'{current_topic}についてはどうですか')
            response = response.replace('どのように', f'{current_topic}をどのように')
        
        return response
    
    def _adjust_followups_with_session_history(self, 
                                              followups: List[str], 
                                              session_info: Dict[str, Any]) -> List[str]:
        """セッション履歴に基づいてフォローアップを調整"""
        
        enhanced_followups = list(followups)
        
        # 学習軌跡に基づく調整
        if session_info.get('learning_trajectory'):
            trajectory = session_info['learning_trajectory']
            if len(trajectory) >= 3:
                recent_support_types = [item.get('support_type') for item in trajectory[-3:]]
                
                # 同じ支援タイプが続いている場合は変化を提案
                if len(set(recent_support_types)) == 1 and len(recent_support_types) >= 2:
                    enhanced_followups.append("別のアプローチを試してみませんか？")
        
        # 長時間のセッションの場合は休憩を提案
        if session_info.get('interaction_count', 0) > 10:
            enhanced_followups.append("少し休憩を取ってから続けませんか？")
        
        return enhanced_followups
    
    def _add_inference_explanations(self, 
                                   followups: List[str], 
                                   inference_result: Dict[str, Any]) -> List[str]:
        """推論結果に基づく説明を追加"""
        
        enhanced_followups = list(followups)
        
        source = inference_result.get('inference_source', '')
        confidence = inference_result.get('confidence', 0.5)
        
        if confidence > 0.7:
            if 'pattern:' in source:
                enhanced_followups.append("これまでの学習パターンを活用しています")
            elif 'adaptive_rule:' in source:
                enhanced_followups.append("あなたに最適化された支援を提供しています")
            elif 'structural_gap:' in source:
                enhanced_followups.append("学習の構造的な補完を重視しています")
        
        return enhanced_followups
    
    def _adjust_response_with_user_preferences(self, 
                                              response: str, 
                                              session_info: Dict[str, Any], 
                                              inference_result: Dict[str, Any]) -> str:
        """ユーザープリファレンスに基づいて応答を調整"""
        
        user_prefs = session_info.get('user_preferences', {})
        if not user_prefs:
            return response
        
        # コミュニケーションスタイルに基づく調整
        communication_style = user_prefs.get('communication_style')
        if communication_style == 'concise':
            return self._make_response_concise(response)
        elif communication_style == 'detailed':
            return self._make_response_detailed(response, inference_result)
        
        # 学習スタイルに基づく調整
        learning_style = user_prefs.get('learning_style', {})
        if isinstance(learning_style, dict):
            if learning_style.get('visual', 0.5) > 0.7:
                response += " 図表や視覚的な資料があると理解が深まりそうですね。"
            elif learning_style.get('practical', 0.5) > 0.7:
                response += " 実際に手を動かしながら学習することをお勧めします。"
        
        return response
    
    def _adjust_response_with_graph_node(self, response: str, node: 'Node') -> str:
        """グラフノード情報に基づいて応答を調整"""
        
        # ノードの明確性が低い場合
        if node.clarity < 0.5:
            response += " もう少し具体的に教えていただけると、より適切な支援ができます。"
        
        # ノードの深度が高い場合
        if node.depth > 0.8:
            response += " 深い探究をされていますね。"
        
        # ノードタイプに基づく調整
        from ontology.ontology_graph import NodeType
        if node.type == NodeType.QUESTION:
            response += " この問いをさらに掘り下げることで新たな発見があるかもしれません。"
        elif node.type == NodeType.HYPOTHESIS:
            response += " この仮説を検証する方法を一緒に考えてみましょう。"
        elif node.type == NodeType.INSIGHT:
            response += " 素晴らしい洞察ですね。これを次の段階にどう活かしましょうか。"
        
        return response
    
    def _make_response_concise(self, response: str) -> str:
        """応答を簡潔にする"""
        sentences = response.split('。')
        if len(sentences) > 2:
            return '。'.join(sentences[:2]) + '。'
        return response
    
    def _make_response_detailed(self, response: str, inference_result: Dict[str, Any]) -> str:
        """応答を詳細にする"""
        additional_info = []
        
        applied_rule = inference_result.get('applied_rule')
        if applied_rule:
            additional_info.append(f"（推論根拠: {applied_rule}）")
        
        predictions = inference_result.get('predictions')
        if predictions:
            pred_count = len(predictions)
            additional_info.append(f"次の{pred_count}ステップを予測して提案しています。")
        
        confidence = inference_result.get('confidence', 0.5)
        if confidence > 0.8:
            additional_info.append("高い確信度で推奨しています。")
        elif confidence < 0.5:
            additional_info.append("探索的な提案として考えてください。")
        
        if additional_info:
            return response + ' ' + ' '.join(additional_info)
        
        return response
    
    def generate_adaptive_response(self, 
                                  state: 'StateSnapshot',
                                  inference_result: Dict[str, Any],
                                  user_message: str,
                                  session_info: Dict[str, Any]) -> 'TurnPackage':
        """適応的応答生成（高度推論結果に基づく）"""
        
        support_type = inference_result.get('support_type', 'PATHFINDING')
        acts = inference_result.get('acts', ['OUTLINE'])
        
        # 推論ソースに基づく応答スタイルの決定
        inference_source = inference_result.get('inference_source', '')
        response_style = self._determine_response_style(inference_source)
        
        # 基本応答生成
        base_response = self._generate_base_response(state, support_type, acts, user_message)
        
        # 推論結果に基づく強化
        enhanced_response = self._enhance_response_with_inference(
            base_response, inference_result, response_style
        )
        
        return enhanced_response
    
    def _determine_response_style(self, inference_source: str) -> str:
        """推論ソースから応答スタイルを決定"""
        
        if 'pattern:' in inference_source:
            return 'pattern-based'
        elif 'adaptive_rule:' in inference_source:
            return 'adaptive'
        elif 'structural_gap:' in inference_source:
            return 'gap-filling'
        else:
            return 'standard'
    
    def _enhance_response_with_inference(self, 
                                        base_response: 'TurnPackage',
                                        inference_result: Dict[str, Any],
                                        style: str) -> 'TurnPackage':
        """推論結果に基づいて応答を強化"""
        
        enhanced_response = base_response.natural_reply
        enhanced_followups = list(base_response.followups)
        
        # スタイル別の強化
        if style == 'pattern-based':
            enhanced_response = "学習パターンに基づいて、" + enhanced_response
            enhanced_followups.append("このパターンを活用してさらに進めてみませんか？")
        elif style == 'adaptive':
            enhanced_response = "あなたに合わせて、" + enhanced_response
            enhanced_followups.append("このアプローチはいかがですか？")
        elif style == 'gap-filling':
            enhanced_response = "学習の完成度を高めるため、" + enhanced_response
            enhanced_followups.append("この部分を補完することで理解が深まります。")
        
        from conversation_agent.schema import TurnPackage
        return TurnPackage(
            natural_reply=enhanced_response,
            followups=enhanced_followups[:3],
            metadata={
                **base_response.metadata,
                'adaptive_enhanced': True,
                'response_style': style,
                'inference_confidence': inference_result.get('confidence', 0.5)
            }
        )