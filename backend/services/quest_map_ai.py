# services/quest_map_ai.py - 探Qマップ機能のAI連携サービス

import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timezone
import json
import re
import hashlib
from functools import wraps
import time

from services.base import BaseService
from module.xai_llm_adapter import XAILLMAdapter
from schemas.quest_map import (
    NodeType, NodeStatus, EdgeType,
    GeneratedNodeOption, NodeGenerationResponse,
    BreakdownNodeOption, NodeBreakdownResponse,
    AlternativeNodeOption, NodeExpansionResponse,
    NodeRecommendation, RecommendationResponse
)
from prompts.quest_map_prompts import (
    QuestMapPrompts,
    PromptCategory,
    PersonaType
)

logger = logging.getLogger(__name__)


# ===== パフォーマンス最適化デコレータ =====

def cache_result(cache_duration_minutes: int = 30):
    """AIレスポンスをキャッシュするデコレータ"""
    def decorator(func):
        cache = {}
        
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # キャッシュキーの生成
            cache_key = _generate_cache_key(args, kwargs)
            current_time = time.time()
            
            # キャッシュヒットチェック
            if cache_key in cache:
                cached_data, timestamp = cache[cache_key]
                if current_time - timestamp < cache_duration_minutes * 60:
                    logger.info(f"💾 キャッシュヒット: {func.__name__}")
                    return cached_data
            
            # 実際の関数を実行
            result = await func(*args, **kwargs)
            
            # キャッシュに保存
            cache[cache_key] = (result, current_time)
            
            # 古いキャッシュエントリをクリーンアップ
            _cleanup_cache(cache, cache_duration_minutes)
            
            return result
        
        return wrapper
    return decorator


def retry_on_failure(max_retries: int = 3, delay_seconds: int = 1):
    """失敗時にリトライするデコレータ"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        logger.warning(f"⚠️ {func.__name__} 失敗 (試行 {attempt + 1}/{max_retries}): {e}")
                        await asyncio.sleep(delay_seconds * (attempt + 1))  # 指数バックオフ
                    else:
                        logger.error(f"❌ {func.__name__} 最終的に失敗: {e}")
            
            raise last_exception
        
        return wrapper
    return decorator


def _generate_cache_key(args: tuple, kwargs: dict) -> str:
    """キャッシュキーを生成"""
    content = str(args) + str(sorted(kwargs.items()))
    return hashlib.md5(content.encode()).hexdigest()


def _cleanup_cache(cache: dict, cache_duration_minutes: int):
    """古いキャッシュエントリをクリーンアップ"""
    current_time = time.time()
    expired_keys = [
        key for key, (_, timestamp) in cache.items()
        if current_time - timestamp >= cache_duration_minutes * 60
    ]
    
    for key in expired_keys:
        del cache[key]
    
    if expired_keys:
        logger.info(f"🧹 {len(expired_keys)}個の期限切れキャッシュをクリーンアップしました")


# ===== エラーリカバリークラス =====

class AIErrorRecovery:
    """AI生成失敗時のリカバリーメカニズム"""
    
    @staticmethod
    def get_fallback_generation_response(quest_id: int, goal: str) -> NodeGenerationResponse:
        """選択肢生成失敗時のフォールバック"""
        fallback_nodes = [
            GeneratedNodeOption(
                title="目標の詳細分析",
                description=f"「{goal}」について、具体的な要素と達成条件を詳しく分析しましょう",
                type=NodeType.ACTION,
                category="analysis",
                priority=5,
                difficulty=2,
                estimated_duration="30分",
                prerequisites=[],
                expected_outcome="目標の明確化と具体化"
            ),
            GeneratedNodeOption(
                title="現状の把握と整理",
                description="現在の状況、持っているリソース、制約条件を整理して把握しましょう",
                type=NodeType.ACTION,
                category="preparation",
                priority=4,
                difficulty=1,
                estimated_duration="20分",
                prerequisites=[],
                expected_outcome="現状の明確な理解"
            ),
            GeneratedNodeOption(
                title="小さな第一歩の計画",
                description="目標に向かって今すぐ始められる小さなアクションを計画しましょう",
                type=NodeType.ACTION,
                category="action",
                priority=3,
                difficulty=1,
                estimated_duration="15分",
                prerequisites=["現状の把握"],
                expected_outcome="具体的な行動計画"
            )
        ]
        
        return NodeGenerationResponse(
            quest_id=quest_id,
            suggested_nodes=fallback_nodes,
            reasoning="AI生成に失敗したため、基本的なアプローチを提案しています。これらのステップから始めて、より具体的な計画を立てることができます。",
            next_steps_advice="まず目標の詳細分析から始めて、段階的に具体的なアクションを計画していきましょう。"
        )
    
    @staticmethod
    def get_fallback_breakdown_response(node_id: int, title: str, description: str) -> NodeBreakdownResponse:
        """分解失敗時のフォールバック"""
        fallback_subtasks = [
            BreakdownNodeOption(
                title=f"{title} - 計画立案",
                description=f"「{description}」を実行するための詳細な計画を立てる",
                order=1,
                type=NodeType.ACTION,
                estimated_duration="計画内容により変動",
                dependencies=[]
            ),
            BreakdownNodeOption(
                title=f"{title} - 準備・リソース確保",
                description="必要な資料、ツール、情報を集めて準備する",
                order=2,
                type=NodeType.ACTION,
                estimated_duration="準備内容により変動",
                dependencies=[1]
            ),
            BreakdownNodeOption(
                title=f"{title} - 実行",
                description="準備した計画に基づいて実際の作業を実行する",
                order=3,
                type=NodeType.ACTION,
                estimated_duration="作業内容により変動",
                dependencies=[2]
            ),
            BreakdownNodeOption(
                title=f"{title} - 確認・調整",
                description="実行結果を確認し、必要に応じて調整・改善する",
                order=4,
                type=NodeType.ACTION,
                estimated_duration="確認内容により変動",
                dependencies=[3]
            )
        ]
        
        return NodeBreakdownResponse(
            original_node_id=node_id,
            subtasks=fallback_subtasks,
            reasoning="AI分解に失敗したため、一般的な4段階（計画→準備→実行→確認）に分割しています。",
            completion_criteria="全ての段階が完了し、期待された成果が得られていること"
        )
    
    @staticmethod
    def get_fallback_expansion_response(node_id: int, title: str, description: str) -> NodeExpansionResponse:
        """拡散失敗時のフォールバック"""
        fallback_alternatives = [
            AlternativeNodeOption(
                title=f"{title}（段階的アプローチ）",
                description=f"「{description}」を小さなステップに分けて段階的に進める方法",
                approach="リスクを最小化し、確実性を重視した段階的実行",
                pros=["リスクが低い", "進捗が見えやすい", "修正しやすい"],
                cons=["時間がかかる場合がある", "スピードが遅い"],
                difficulty=2,
                risk_level=1
            ),
            AlternativeNodeOption(
                title=f"{title}（集中アプローチ）",
                description=f"「{description}」に集中的に取り組み、短期間で完成させる方法",
                approach="効率性とスピードを重視した集中的実行",
                pros=["短期間で完成", "集中効果が高い", "モチベーション維持しやすい"],
                cons=["負担が大きい", "他の作業に影響する可能性"],
                difficulty=4,
                risk_level=3
            ),
            AlternativeNodeOption(
                title=f"{title}（協働アプローチ）",
                description=f"「{description}」を他者と協力して進める方法",
                approach="他者との協力・協働による実行",
                pros=["負担分散", "多様な視点", "学習効果が高い"],
                cons=["調整が必要", "スケジュール調整が複雑"],
                difficulty=3,
                risk_level=2
            )
        ]
        
        return NodeExpansionResponse(
            original_node_id=node_id,
            alternatives=fallback_alternatives,
            reasoning="AI拡散に失敗したため、一般的な3つのアプローチを提案しています。",
            recommendation="状況と個人の特性に応じて、段階的アプローチから始めることをおすすめします。"
        )


class QuestMapAIService(BaseService):
    """探Qマップ機能のAI連携サービス（xAI Grok使用）"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        try:
            self.llm_client = XAILLMAdapter(model="grok-4-1-fast-reasoning", pool_size=5)
            self.prompt_builder = QuestMapPrompts()
            logger.info("✅ QuestMapAIService: xAI Grokクライアント初期化完了")
        except Exception as e:
            logger.error(f"❌ QuestMapAIService: xAI Grokクライアント初期化失敗: {e}")
            raise
    
    def get_service_name(self) -> str:
        return "QuestMapAIService"
    
    def _detect_user_persona(self, user_context: Optional[Dict[str, Any]] = None) -> PersonaType:
        """ユーザーのペルソナを推定"""
        if not user_context:
            return PersonaType.INTERMEDIATE
        
        # 簡単なペルソナ推定ロジック
        experience_level = user_context.get("experience_level", "medium")
        learning_style = user_context.get("learning_style", "balanced")
        
        if experience_level == "beginner":
            return PersonaType.BEGINNER
        elif experience_level == "expert":
            return PersonaType.ADVANCED
        elif learning_style == "creative":
            return PersonaType.CREATIVE
        elif learning_style == "analytical":
            return PersonaType.ANALYTICAL
        elif learning_style == "practical":
            return PersonaType.PRACTICAL
        else:
            return PersonaType.INTERMEDIATE
    
    @retry_on_failure(max_retries=3, delay_seconds=2)
    @cache_result(cache_duration_minutes=15)
    async def generate_action_nodes(
        self,
        quest_id: int,
        goal: str,
        current_context: Optional[str] = None,
        node_count: int = 5,
        focus_category: Optional[str] = None,
        user_context: Optional[Dict[str, Any]] = None,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> NodeGenerationResponse:
        """
        ゴールと現状から選択肢を生成
        
        Args:
            quest_id: クエストID
            goal: 達成したい目標
            current_context: 現在の状況・背景情報
            node_count: 生成する選択肢の数
            focus_category: 特に焦点を当てるカテゴリ
            user_context: ユーザーのコンテキスト情報
            user_preferences: ユーザーの設定・好み
            
        Returns:
            NodeGenerationResponse: 生成された選択肢
        """
        try:
            # ペルソナ推定
            persona = self._detect_user_persona(user_context)
            
            # プロンプト構築
            system_prompt = self.prompt_builder.build_system_prompt(
                PromptCategory.GENERATION,
                persona,
                user_context
            )
            user_prompt = self.prompt_builder.build_generation_prompt(
                goal, current_context, node_count, focus_category,
                persona, user_preferences
            )
            
            input_items = [
                self.llm_client.text("system", system_prompt),
                self.llm_client.text("user", user_prompt)
            ]
            
            logger.info(f"🔍 AIノード生成開始: quest_id={quest_id}, goal='{goal[:50]}...'")
            
            # AI応答を取得（タイムアウト処理追加）
            try:
                response_text = await asyncio.wait_for(
                    self.llm_client.generate_text(input_items, max_tokens=2000),
                    timeout=55.0  # 55秒のタイムアウト（HTTPタイムアウトより少し短く）
                )
                # xAI Grok用: プロンプト最適化を適用
                if hasattr(self.llm_client, 'optimize_prompt_for_grok'):
                    logger.debug("📝 xAI Grok用プロンプト最適化を実行")
            except asyncio.TimeoutError:
                logger.error(f"⏰ AIノード生成タイムアウト: quest_id={quest_id}")
                # タイムアウト時は簡易的な応答を返す
                return AIErrorRecovery.get_fallback_generation_response(quest_id, goal)
            
            # 応答をパース
            parsed_response = self._parse_generation_response(response_text, quest_id)
            
            logger.info(f"✅ AIノード生成完了: {len(parsed_response.suggested_nodes)}個の選択肢を生成")
            
            return parsed_response
            
        except Exception as e:
            error_msg = f"選択肢生成に失敗しました: {str(e)}"
            logger.error(f"❌ {error_msg}")
            
            # エラーリカバリー
            return AIErrorRecovery.get_fallback_generation_response(quest_id, goal)
    
    async def breakdown_node(
        self,
        node_id: int,
        node_title: str,
        node_description: str,
        detail_level: int = 3,
        context: Optional[str] = None
    ) -> NodeBreakdownResponse:
        """
        ノードを細分化
        
        Args:
            node_id: ノードID
            node_title: ノードタイトル
            node_description: ノード説明
            detail_level: 詳細レベル（2-5）
            context: 追加のコンテキスト
            
        Returns:
            NodeBreakdownResponse: 分解された子タスク
        """
        try:
            system_prompt = self._build_breakdown_system_prompt(detail_level)
            user_prompt = self._build_breakdown_user_prompt(
                node_title, node_description, context, detail_level
            )
            
            input_items = [
                self.llm_client.text("system", system_prompt),
                self.llm_client.text("user", user_prompt)
            ]
            
            logger.info(f"🔍 AIノード分解開始: node_id={node_id}, title='{node_title}'")
            
            response_text = await self.llm_client.generate_text(input_items, max_tokens=1500)
            parsed_response = self._parse_breakdown_response(response_text, node_id)
            
            logger.info(f"✅ AIノード分解完了: {len(parsed_response.subtasks)}個のサブタスクを生成")
            
            return parsed_response
            
        except Exception as e:
            error_msg = f"ノード分解に失敗しました: {str(e)}"
            logger.error(f"❌ {error_msg}")
            
            # フォールバック応答
            return NodeBreakdownResponse(
                original_node_id=node_id,
                subtasks=[
                    BreakdownNodeOption(
                        title=f"{node_title} - 準備段階",
                        description="必要な資料や情報を集めて準備する",
                        order=1,
                        type=NodeType.ACTION
                    ),
                    BreakdownNodeOption(
                        title=f"{node_title} - 実行段階",
                        description="具体的な作業を実行する",
                        order=2,
                        type=NodeType.ACTION
                    ),
                    BreakdownNodeOption(
                        title=f"{node_title} - 確認段階",
                        description="結果を確認し、必要に応じて調整する",
                        order=3,
                        type=NodeType.ACTION
                    )
                ],
                reasoning="AI分解に失敗したため、一般的な3段階に分割しています。"
            )
    
    async def expand_node(
        self,
        node_id: int,
        node_title: str,
        node_description: str,
        alternative_count: int = 3,
        context: Optional[str] = None
    ) -> NodeExpansionResponse:
        """
        同階層に代替選択肢を追加
        
        Args:
            node_id: ノードID
            node_title: ノードタイトル
            node_description: ノード説明
            alternative_count: 代替案の数
            context: 追加のコンテキスト
            
        Returns:
            NodeExpansionResponse: 代替選択肢
        """
        try:
            system_prompt = self._build_expansion_system_prompt()
            user_prompt = self._build_expansion_user_prompt(
                node_title, node_description, alternative_count, context
            )
            
            input_items = [
                self.llm_client.text("system", system_prompt),
                self.llm_client.text("user", user_prompt)
            ]
            
            logger.info(f"🔍 AIノード拡散開始: node_id={node_id}, alternatives={alternative_count}")
            
            response_text = await self.llm_client.generate_text(input_items, max_tokens=1500)
            parsed_response = self._parse_expansion_response(response_text, node_id)
            
            logger.info(f"✅ AIノード拡散完了: {len(parsed_response.alternatives)}個の代替案を生成")
            
            return parsed_response
            
        except Exception as e:
            error_msg = f"ノード拡散に失敗しました: {str(e)}"
            logger.error(f"❌ {error_msg}")
            
            # フォールバック応答
            return NodeExpansionResponse(
                original_node_id=node_id,
                alternatives=[
                    AlternativeNodeOption(
                        title=f"{node_title}（計画重視）",
                        description="慎重に計画を立ててから実行するアプローチ",
                        approach="計画重視",
                        pros=["リスクが低い", "確実性が高い"],
                        cons=["時間がかかる", "柔軟性が低い"],
                        difficulty=2,
                        risk_level=1
                    )
                ],
                reasoning="AI拡散に失敗したため、基本的な代替案を提案しています。"
            )
    
    async def recommend_next_nodes(
        self,
        quest_id: int,
        completed_nodes: List[Dict[str, Any]],
        pending_nodes: List[Dict[str, Any]],
        current_context: Optional[str] = None
    ) -> RecommendationResponse:
        """
        推奨ノードを判定
        
        Args:
            quest_id: クエストID
            completed_nodes: 完了済みノードのリスト
            pending_nodes: 未完了ノードのリスト
            current_context: 現在のコンテキスト
            
        Returns:
            RecommendationResponse: 推奨ノード
        """
        try:
            system_prompt = self._build_recommendation_system_prompt()
            user_prompt = self._build_recommendation_user_prompt(
                completed_nodes, pending_nodes, current_context
            )
            
            input_items = [
                self.llm_client.text("system", system_prompt),
                self.llm_client.text("user", user_prompt)
            ]
            
            logger.info(f"🔍 AI推奨ノード分析開始: quest_id={quest_id}")
            
            response_text = await self.llm_client.generate_text(input_items, max_tokens=1000)
            parsed_response = self._parse_recommendation_response(response_text, quest_id, pending_nodes)
            
            logger.info(f"✅ AI推奨ノード分析完了: {len(parsed_response.recommendations)}個の推奨")
            
            return parsed_response
            
        except Exception as e:
            error_msg = f"推奨ノード分析に失敗しました: {str(e)}"
            logger.error(f"❌ {error_msg}")
            
            # フォールバック応答
            recommendations = []
            if pending_nodes:
                # 最初の未完了ノードを推奨
                first_node = pending_nodes[0]
                recommendations.append(
                    NodeRecommendation(
                        node_id=first_node["id"],
                        reason="最初の未完了タスクから開始することを推奨します",
                        priority_score=0.8,
                        category="basic"
                    )
                )
            
            return RecommendationResponse(
                quest_id=quest_id,
                recommendations=recommendations,
                overall_advice="AI分析に失敗したため、基本的な推奨を行っています。"
            )
    
    # ===== プロンプト構築メソッド =====
    
    def _build_generation_system_prompt(self) -> str:
        """選択肢生成用システムプロンプト（探究学習版）"""
        # プロンプトファイルから取得
        return self.prompt_builder.BASE_SYSTEM_PROMPTS[PromptCategory.GENERATION]
    
    def _build_generation_user_prompt(
        self,
        goal: str,
        current_context: Optional[str],
        node_count: int,
        focus_category: Optional[str]
    ) -> str:
        """選択肢生成用ユーザープロンプト（探究学習版）"""
        # 探究学習用フォーマット
        prompt = f"""探究テーマ: {goal}
ゴール: {goal}
今困っていること: {current_context or "テーマは気になるけれど、何から始めてよいのかわからない"}

{node_count}枚のアクションカードを生成してください。"""
        
        if focus_category:
            prompt += f"\n特に「{focus_category}」の視点を重視してください。"
        
        return prompt
    
    def _build_breakdown_system_prompt(self, detail_level: int) -> str:
        """分解用システムプロンプト（探究学習版）"""
        # プロンプトファイルから取得
        base_prompt = self.prompt_builder.BASE_SYSTEM_PROMPTS[PromptCategory.BREAKDOWN]
        
        # ステップ数の指定を追加
        detail_desc = {
            2: "2-3個",
            3: "3-5個",
            4: "5-7個",
            5: "7-10個"
        }
        
        return base_prompt + f"\n\nステップ数: {detail_desc.get(detail_level, '3-5個')}のステップに分解してください。"  
    
    def _build_breakdown_user_prompt(
        self,
        node_title: str,
        node_description: str,
        context: Optional[str],
        detail_level: int
    ) -> str:
        """分解用ユーザープロンプト（探究学習版）"""
        return f"""探究アクション: {node_title}
詳細: {node_description}

現在の状況:
{context or "特に記載なし"}

このアクションを高校生が段階的に進められるステップに分解してください。"""
    
    def _build_expansion_system_prompt(self) -> str:
        """拡散用システムプロンプト（探究学習版）"""
        # プロンプトファイルから取得
        return self.prompt_builder.BASE_SYSTEM_PROMPTS[PromptCategory.EXPANSION]  
    
    def _build_expansion_user_prompt(
        self,
        node_title: str,
        node_description: str,
        alternative_count: int,
        context: Optional[str]
    ) -> str:
        """拡散用ユーザープロンプト（探究学習版）"""
        return f"""探究アクション: {node_title}
詳細: {node_description}

現在の状況:
{context or "特に記載なし"}

{alternative_count}個の異なる切り口・アプローチを提案してください。
高校生が「そんな見方もあるんだ！」と興味を持てるような視点を含めてください。"""
    
    def _build_recommendation_system_prompt(self) -> str:
        """推奨用システムプロンプト（xAI Grok最適化版）"""
        return """あなたは学習進捗管理の専門家です。完了済みタスクと未完了タスクの状況を分析し、次に取り組むべきタスクを推奨してください。

必ず以下の完全に有効なJSON形式のみで応答してください（他の説明やコメントは一切含めないでください）：
{
  "recommendations": [
    {
      "node_id": ノードID,
      "reason": "推奨する理由",
      "priority_score": 0.0-1.0の優先度スコア,
      "category": "推奨カテゴリ"
    }
  ],
  "overall_advice": "全体的なアドバイス"
}

推奨基準:
- 完了済みタスクから得られた学習・経験
- 依存関係や前提条件
- 学習効果やモチベーション
- バランスの取れた進捗
- リスク管理"""
    
    def _build_recommendation_user_prompt(
        self,
        completed_nodes: List[Dict[str, Any]],
        pending_nodes: List[Dict[str, Any]],
        current_context: Optional[str]
    ) -> str:
        """推奨用ユーザープロンプト"""
        completed_summary = "\n".join([
            f"- {node.get('title', 'タイトルなし')}: {node.get('description', '')}"
            for node in completed_nodes[:5]  # 最新5件
        ]) if completed_nodes else "なし"
        
        pending_summary = "\n".join([
            f"- ID:{node.get('id')}, {node.get('title', 'タイトルなし')}: {node.get('description', '')}"
            for node in pending_nodes[:10]  # 最大10件
        ]) if pending_nodes else "なし"
        
        return f"""完了済みタスク:
{completed_summary}

未完了タスク:
{pending_summary}

現在のコンテキスト:
{current_context or "特に記載なし"}

この状況を分析し、次に取り組むべきタスクを推奨してください。"""
    
    # ===== レスポンスパース メソッド =====
    
    def _parse_generation_response(self, response_text: str, quest_id: int) -> NodeGenerationResponse:
        """選択肢生成応答をパース（xAI Grok対応）"""
        try:
            # xAIアダプターのparse_json_responseメソッドを使用
            if hasattr(self.llm_client, 'parse_json_response'):
                data = self.llm_client.parse_json_response(response_text)
            else:
                # フォールバック: 直接JSONパース
                json_text = response_text.strip()
                # コードブロックの除去
                if "```json" in json_text:
                    json_text = json_text.split("```json")[1].split("```")[0]
                elif "```" in json_text:
                    json_text = json_text.split("```")[1].split("```")[0]
                data = json.loads(json_text)
            
            suggested_nodes = []
            for node_data in data.get("suggested_nodes", []):
                try:
                    node = GeneratedNodeOption(
                        title=node_data["title"],
                        description=node_data["description"],
                        type=NodeType(node_data.get("type", "action")),
                        category=node_data.get("category"),
                        priority=node_data.get("priority", 3),
                        difficulty=node_data.get("difficulty", 3),
                        estimated_duration=node_data.get("estimated_duration"),
                        prerequisites=node_data.get("prerequisites"),
                        expected_outcome=node_data.get("expected_outcome")
                    )
                    suggested_nodes.append(node)
                except Exception as node_error:
                    logger.warning(f"⚠️ ノードデータパースエラー: {node_error}")
                    continue
            
            return NodeGenerationResponse(
                quest_id=quest_id,
                suggested_nodes=suggested_nodes,
                reasoning=data.get("reasoning", "AI生成による選択肢です"),
                next_steps_advice=data.get("next_steps_advice")
            )
            
        except Exception as e:
            logger.error(f"❌ 選択肢生成応答パースエラー: {e}")
            # フォールバック: 基本的な選択肢を返す
            return NodeGenerationResponse(
                quest_id=quest_id,
                suggested_nodes=[],
                reasoning=f"応答のパースに失敗しました: {str(e)}"
            )
    
    def _parse_breakdown_response(self, response_text: str, node_id: int) -> NodeBreakdownResponse:
        """分解応答をパース（xAI Grok対応）"""
        try:
            # xAIアダプターのparse_json_responseメソッドを使用
            if hasattr(self.llm_client, 'parse_json_response'):
                data = self.llm_client.parse_json_response(response_text)
            else:
                # フォールバック: 直接JSONパース
                json_text = response_text.strip()
                if "```json" in json_text:
                    json_text = json_text.split("```json")[1].split("```")[0]
                elif "```" in json_text:
                    json_text = json_text.split("```")[1].split("```")[0]
                data = json.loads(json_text)
            
            subtasks = []
            for task_data in data.get("subtasks", []):
                try:
                    task = BreakdownNodeOption(
                        title=task_data["title"],
                        description=task_data["description"],
                        order=task_data["order"],
                        type=NodeType(task_data.get("type", "action")),
                        estimated_duration=task_data.get("estimated_duration"),
                        dependencies=task_data.get("dependencies")
                    )
                    subtasks.append(task)
                except Exception as task_error:
                    logger.warning(f"⚠️ サブタスクデータパースエラー: {task_error}")
                    continue
            
            return NodeBreakdownResponse(
                original_node_id=node_id,
                subtasks=subtasks,
                reasoning=data.get("reasoning", "AI分解による結果です"),
                completion_criteria=data.get("completion_criteria")
            )
            
        except Exception as e:
            logger.error(f"❌ 分解応答パースエラー: {e}")
            return NodeBreakdownResponse(
                original_node_id=node_id,
                subtasks=[],
                reasoning=f"応答のパースに失敗しました: {str(e)}"
            )
    
    def _parse_expansion_response(self, response_text: str, node_id: int) -> NodeExpansionResponse:
        """拡散応答をパース（xAI Grok対応）"""
        try:
            # xAIアダプターのparse_json_responseメソッドを使用
            if hasattr(self.llm_client, 'parse_json_response'):
                data = self.llm_client.parse_json_response(response_text)
            else:
                # フォールバック: 直接JSONパース
                json_text = response_text.strip()
                if "```json" in json_text:
                    json_text = json_text.split("```json")[1].split("```")[0]
                elif "```" in json_text:
                    json_text = json_text.split("```")[1].split("```")[0]
                data = json.loads(json_text)
            
            alternatives = []
            for alt_data in data.get("alternatives", []):
                try:
                    alternative = AlternativeNodeOption(
                        title=alt_data["title"],
                        description=alt_data["description"],
                        approach=alt_data["approach"],
                        pros=alt_data.get("pros", []),
                        cons=alt_data.get("cons", []),
                        difficulty=alt_data.get("difficulty", 3),
                        risk_level=alt_data.get("risk_level", 3)
                    )
                    alternatives.append(alternative)
                except Exception as alt_error:
                    logger.warning(f"⚠️ 代替案データパースエラー: {alt_error}")
                    continue
            
            return NodeExpansionResponse(
                original_node_id=node_id,
                alternatives=alternatives,
                reasoning=data.get("reasoning", "AI拡散による結果です"),
                recommendation=data.get("recommendation")
            )
            
        except Exception as e:
            logger.error(f"❌ 拡散応答パースエラー: {e}")
            return NodeExpansionResponse(
                original_node_id=node_id,
                alternatives=[],
                reasoning=f"応答のパースに失敗しました: {str(e)}"
            )
    
    def _parse_recommendation_response(
        self,
        response_text: str,
        quest_id: int,
        pending_nodes: List[Dict[str, Any]]
    ) -> RecommendationResponse:
        """推奨応答をパース（xAI Grok対応）"""
        try:
            # xAIアダプターのparse_json_responseメソッドを使用
            if hasattr(self.llm_client, 'parse_json_response'):
                data = self.llm_client.parse_json_response(response_text)
            else:
                # フォールバック: 直接JSONパース
                json_text = response_text.strip()
                if "```json" in json_text:
                    json_text = json_text.split("```json")[1].split("```")[0]
                elif "```" in json_text:
                    json_text = json_text.split("```")[1].split("```")[0]
                data = json.loads(json_text)
            
            # 有効なノードIDのセットを作成
            valid_node_ids = {node["id"] for node in pending_nodes}
            
            recommendations = []
            for rec_data in data.get("recommendations", []):
                try:
                    node_id = rec_data["node_id"]
                    if node_id in valid_node_ids:
                        recommendation = NodeRecommendation(
                            node_id=node_id,
                            reason=rec_data["reason"],
                            priority_score=rec_data.get("priority_score", 0.5),
                            category=rec_data.get("category", "general")
                        )
                        recommendations.append(recommendation)
                except Exception as rec_error:
                    logger.warning(f"⚠️ 推奨データパースエラー: {rec_error}")
                    continue
            
            return RecommendationResponse(
                quest_id=quest_id,
                recommendations=recommendations,
                overall_advice=data.get("overall_advice", "AI分析による推奨です")
            )
            
        except Exception as e:
            logger.error(f"❌ 推奨応答パースエラー: {e}")
            return RecommendationResponse(
                quest_id=quest_id,
                recommendations=[],
                overall_advice=f"応答のパースに失敗しました: {str(e)}"
            )

    # ===== 新しいAIチャット相談機能 =====
    
    @retry_on_failure(max_retries=2, delay_seconds=1)
    async def consult_ai_for_node(
        self,
        question: str,
        quest_context: Optional[Dict[str, Any]] = None,
        node_context: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
        user_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        ノード固有のAI相談機能
        
        Args:
            question: ユーザーの質問
            quest_context: クエストのコンテキスト
            node_context: ノードのコンテキスト
            chat_history: チャット履歴
            user_context: ユーザーコンテキスト
            
        Returns:
            str: AIからのアドバイス
        """
        try:
            # ペルソナ推定
            persona = self._detect_user_persona(user_context)
            
            # プロンプト構築
            system_prompt = self.prompt_builder.build_system_prompt(
                PromptCategory.CONSULTATION,
                persona,
                {"quest": quest_context, "node": node_context}
            )
            user_prompt = self.prompt_builder.build_consultation_prompt(
                question, quest_context, node_context, chat_history, persona
            )
            
            input_items = [
                self.llm_client.text("system", system_prompt),
                self.llm_client.text("user", user_prompt)
            ]
            
            logger.info(f"🔍 AIチャット相談開始: '{question[:50]}...'")
            
            # AI応答を取得
            response_text = await self.llm_client.generate_text(input_items, max_tokens=1500)
            
            # 応答をクリーンアップ
            cleaned_response = self._clean_consultation_response(response_text)
            
            logger.info(f"✅ AIチャット相談完了")
            
            return cleaned_response
            
        except Exception as e:
            error_msg = f"AI相談に失敗しました: {str(e)}"
            logger.error(f"❌ {error_msg}")
            
            # フォールバック応答
            return self._get_fallback_consultation_response(question, node_context)
    
    async def generate_streaming_consultation(
        self,
        question: str,
        quest_context: Optional[Dict[str, Any]] = None,
        node_context: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
        user_context: Optional[Dict[str, Any]] = None
    ):
        """
        ストリーミング対応のAI相談機能（将来の実装用）
        
        Args:
            question: ユーザーの質問
            quest_context: クエストのコンテキスト
            node_context: ノードのコンテキスト
            chat_history: チャット履歴
            user_context: ユーザーコンテキスト
            
        Yields:
            str: ストリーミングされるレスポンスのチャンク
        """
        # 現在は通常の応答を分割してストリーミング風に返す
        full_response = await self.consult_ai_for_node(
            question, quest_context, node_context, chat_history, user_context
        )
        
        # 単語ごとに分割してストリーミング風に
        words = full_response.split(' ')
        for i in range(len(words)):
            chunk = ' '.join(words[:i+1])
            yield chunk
            await asyncio.sleep(0.1)  # 100ms delay for streaming effect
    
    def _clean_consultation_response(self, response: str) -> str:
        """相談応答をクリーンアップ"""
        # JSONブロックがある場合は除去
        cleaned = re.sub(r'```json.*?```', '', response, flags=re.DOTALL)
        cleaned = re.sub(r'```.*?```', '', cleaned, flags=re.DOTALL)
        
        # 余分な空行を削除
        cleaned = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned)
        
        # 前後の空白を削除
        cleaned = cleaned.strip()
        
        return cleaned
    
    def _get_fallback_consultation_response(
        self,
        question: str,
        node_context: Optional[Dict[str, Any]] = None
    ) -> str:
        """相談機能の失敗時フォールバック"""
        if node_context:
            node_title = node_context.get('title', '選択されたノード')
            return f"""申し訳ございません。一時的な問題が発生しました。

「{question}」についてのご質問ですが、「{node_title}」に関して以下のような観点から考えてみることをおすすめします：

1. **目標の明確化**: 何を達成したいかを具体的に整理する
2. **現状の把握**: 今どこにいるか、何が利用できるかを確認する  
3. **具体的な行動**: 小さな一歩から始められることを見つける
4. **リソースの活用**: 利用できる情報やツール、人脈を整理する

もう一度お試しいただくか、質問を少し変えてお聞かせください。"""
        else:
            return f"""申し訳ございません。一時的な問題が発生しました。

「{question}」についてのご質問ですが、以下のような基本的なアプローチをご検討ください：

1. **問題の整理**: 何が課題なのかを明確にする
2. **情報収集**: 関連する情報を集める
3. **選択肢の検討**: 可能な解決策を考える
4. **行動計画**: 具体的なステップを決める

もう一度お試しいただくか、より具体的にご質問ください。"""

    # ===== 学習レベル・傾向分析機能 =====
    
    def analyze_user_learning_pattern(
        self,
        completed_nodes: List[Dict[str, Any]],
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        ユーザーの学習パターンを分析
        
        Args:
            completed_nodes: 完了済みノードのリスト
            user_preferences: ユーザー設定
            
        Returns:
            Dict[str, Any]: 学習パターン分析結果
        """
        if not completed_nodes:
            return {
                "learning_style": "unknown",
                "preferred_difficulty": "medium",
                "completion_pattern": "regular",
                "recommended_persona": PersonaType.INTERMEDIATE
            }
        
        # 難易度パターンの分析
        difficulties = [node.get('difficulty', 3) for node in completed_nodes]
        avg_difficulty = sum(difficulties) / len(difficulties) if difficulties else 3
        
        # 完了時間パターンの分析  
        completion_times = []
        for i in range(1, len(completed_nodes)):
            prev_time = datetime.fromisoformat(completed_nodes[i-1].get('completed_at', ''))
            curr_time = datetime.fromisoformat(completed_nodes[i].get('completed_at', ''))
            time_diff = (curr_time - prev_time).total_seconds() / 3600  # hours
            completion_times.append(time_diff)
        
        avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 24
        
        # カテゴリ傾向の分析
        categories = [node.get('category', 'general') for node in completed_nodes]
        category_counts = {}
        for cat in categories:
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        preferred_category = max(category_counts, key=category_counts.get) if category_counts else 'general'
        
        # 学習スタイルの推定
        learning_style = "practical"  # デフォルト
        if avg_difficulty >= 4:
            learning_style = "analytical"
        elif preferred_category in ["creative", "design"]:
            learning_style = "creative"
        elif avg_completion_time < 8:  # 8時間以内の高頻度完了
            learning_style = "intensive"
        
        # ペルソナ推奨
        recommended_persona = PersonaType.PRACTICAL
        if avg_difficulty >= 4:
            recommended_persona = PersonaType.ADVANCED
        elif avg_difficulty <= 2:
            recommended_persona = PersonaType.BEGINNER
        elif learning_style == "creative":
            recommended_persona = PersonaType.CREATIVE
        elif learning_style == "analytical":
            recommended_persona = PersonaType.ANALYTICAL
        
        return {
            "learning_style": learning_style,
            "preferred_difficulty": "high" if avg_difficulty >= 4 else "low" if avg_difficulty <= 2 else "medium",
            "completion_pattern": "intensive" if avg_completion_time < 8 else "regular",
            "preferred_category": preferred_category,
            "average_difficulty": avg_difficulty,
            "average_completion_time_hours": avg_completion_time,
            "recommended_persona": recommended_persona,
            "total_completed": len(completed_nodes),
            "analysis_date": datetime.now().isoformat()
        }

    # ===== 批量处理和优化功能 =====
    
    async def batch_generate_nodes(
        self,
        requests: List[Dict[str, Any]]
    ) -> List[NodeGenerationResponse]:
        """
        複数のノード生成リクエストをバッチ処理
        
        Args:
            requests: 生成リクエストのリスト
            
        Returns:
            List[NodeGenerationResponse]: 生成結果のリスト
        """
        logger.info(f"🚀 バッチノード生成開始: {len(requests)}件")
        
        # 並行処理でノード生成を実行
        tasks = []
        for req in requests:
            task = self.generate_action_nodes(**req)
            tasks.append(task)
        
        # 結果を待機
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # エラーハンドリング
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"❌ バッチ処理{i+1}番目でエラー: {result}")
                # フォールバック応答を生成
                fallback = AIErrorRecovery.get_fallback_generation_response(
                    requests[i].get('quest_id', 0),
                    requests[i].get('goal', '目標不明')
                )
                processed_results.append(fallback)
            else:
                processed_results.append(result)
        
        logger.info(f"✅ バッチノード生成完了: {len(processed_results)}件")
        return processed_results