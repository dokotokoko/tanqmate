# backend/services/quest_card_integration.py - クエストカードと探Qマップの連携サービス

import logging
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timezone
import json
import uuid

from services.base import BaseService
from services.quest_map_ai import QuestMapAIService
from schemas.quest_map import (
    NodeResponse, QuestResponse, NodeType, NodeStatus, EdgeType, EdgeResponse,
    QuestCreateRequest, NodeGenerateRequest
)

logger = logging.getLogger(__name__)


class QuestCardIntegrationService(BaseService):
    """クエストカードと探Qマップの連携サービス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        self.ai_service = QuestMapAIService(supabase_client, user_id)
    
    def get_service_name(self) -> str:
        return "QuestCardIntegrationService"

    # ===== クエストカード → 探Qマップ変換 =====
    
    async def convert_quest_cards_to_quest_map(
        self,
        quest_cards: List[Dict[str, Any]],
        goal: str,
        current_situation: str = "",
        quest_title: Optional[str] = None
    ) -> QuestResponse:
        """
        クエストカードから探Qマップを生成
        
        Args:
            quest_cards: クエストカードのリスト
            goal: 全体の目標
            current_situation: 現在の状況
            quest_title: クエストタイトル（省略時は自動生成）
            
        Returns:
            QuestResponse: 作成されたクエスト
        """
        try:
            logger.info(f"🔄 クエストカード→探Qマップ変換開始: {len(quest_cards)}枚のカード")
            
            # クエストタイトルの生成
            if not quest_title:
                quest_title = self._generate_quest_title_from_cards(quest_cards, goal)
            
            # クエストの基本情報を作成
            quest_id = str(uuid.uuid4())
            quest = Quest(
                id=quest_id,
                title=quest_title,
                goal=goal,
                currentSituation=current_situation,
                userId=str(self.user_id),
                nodes=[],
                edges=[],
                createdAt=datetime.now(timezone.utc),
                updatedAt=datetime.now(timezone.utc),
                isPublic=False
            )
            
            # クエストカードからノードを生成
            nodes, edges = await self._convert_cards_to_nodes_and_edges(quest_cards, goal)
            quest.nodes = nodes
            quest.edges = edges
            
            # 現在地ノードを追加
            current_node = self._create_current_situation_node(current_situation)
            quest.nodes.insert(0, current_node)
            
            # 現在地ノードからの初期エッジを追加
            initial_edges = self._create_initial_edges_from_current(current_node.id, nodes)
            quest.edges.extend(initial_edges)
            
            # データベースに保存
            await self._save_quest_to_database(quest)
            
            logger.info(f"✅ クエストカード変換完了: {len(quest.nodes)}ノード, {len(quest.edges)}エッジ")
            
            return quest
            
        except Exception as e:
            logger.error(f"❌ クエストカード変換エラー: {e}")
            raise

    async def _convert_cards_to_nodes_and_edges(
        self,
        quest_cards: List[Dict[str, Any]],
        goal: str
    ) -> tuple[List[NodeResponse], List[EdgeResponse]]:
        """クエストカードをノードとエッジに変換"""
        nodes = []
        edges = []
        
        # カードを重要度やカテゴリでソート
        sorted_cards = self._sort_cards_by_priority(quest_cards)
        
        for i, card in enumerate(sorted_cards):
            # カードからノードを作成
            node = await self._create_node_from_card(card, i, goal)
            nodes.append(node)
            
            # 前のノードとのエッジを作成（シンプルな順次関係）
            if i > 0:
                edge = self._create_edge_between_nodes(nodes[i-1].id, node.id, EdgeType.SOLID)
                edges.append(edge)
        
        # 関連性の高いカード間のエッジを追加
        additional_edges = self._create_semantic_edges(nodes, quest_cards)
        edges.extend(additional_edges)
        
        return nodes, edges

    async def _create_node_from_card(
        self,
        card: Dict[str, Any],
        index: int,
        goal: str
    ) -> NodeResponse:
        """クエストカードからノードを作成"""
        # カードの内容から詳細を拡張
        card_label = card.get('label', f'アクション {index + 1}')
        card_emoji = card.get('emoji', '📋')
        card_color = card.get('color', 'teal')
        
        # AIを使ってカードの内容を詳細化
        try:
            expanded_content = await self._expand_card_content(card_label, goal)
            description = expanded_content.get('description', f'{card_label}に関する具体的なアクション')
            category = expanded_content.get('category', self._map_color_to_category(card_color))
            difficulty = expanded_content.get('difficulty', 3)
        except Exception as e:
            logger.warning(f"⚠️ カード内容の拡張に失敗: {e}")
            description = f'{card_label}に関する具体的なアクション'
            category = self._map_color_to_category(card_color)
            difficulty = 3
        
        # ノードタイプを決定
        node_type = self._determine_node_type_from_card(card_label, index, len([]))
        
        node = NodeResponse(
            id=str(uuid.uuid4()),
            title=f'{card_emoji} {card_label}',
            description=description,
            type=node_type,
            status=NodeStatus.NOT_STARTED,
            category=category,
            x=100 + (index % 5) * 200,  # グリッド配置
            y=200 + (index // 5) * 150,
            isRecommended=index < 3,  # 最初の3つは推奨
            createdAt=datetime.now(timezone.utc),
            updatedAt=datetime.now(timezone.utc),
            userNote=f'クエストカード「{card_label}」から生成'
        )
        
        return node

    async def _expand_card_content(
        self,
        card_label: str,
        goal: str
    ) -> Dict[str, Any]:
        """AIを使ってカードの内容を詳細化"""
        try:
            # シンプルなプロンプトでカード内容を拡張
            expansion_response = await self.ai_service.generate_action_nodes(
                quest_id=0,  # 一時的なID
                goal=goal,
                current_context=f"クエストカード「{card_label}」",
                node_count=1,
                focus_category="card_expansion"
            )
            
            if expansion_response.suggested_nodes:
                suggested_node = expansion_response.suggested_nodes[0]
                return {
                    'description': suggested_node.description,
                    'category': suggested_node.category,
                    'difficulty': suggested_node.difficulty
                }
        except Exception as e:
            logger.warning(f"⚠️ カード拡張エラー: {e}")
        
        # フォールバック
        return {
            'description': f'「{card_label}」に関する具体的なアクションを実行する',
            'category': 'general',
            'difficulty': 3
        }

    def _map_color_to_category(self, color: str) -> str:
        """カードの色をカテゴリにマッピング"""
        color_mapping = {
            'teal': 'planning',
            'yellow': 'learning',
            'purple': 'creative',
            'pink': 'communication',
            'green': 'action'
        }
        return color_mapping.get(color, 'general')

    def _determine_node_type_from_card(
        self,
        card_label: str,
        index: int,
        total_cards: int
    ) -> NodeType:
        """カードの内容からノードタイプを決定"""
        label_lower = card_label.lower()
        
        # キーワードベースの判定
        if any(keyword in label_lower for keyword in ['目標', 'ゴール', '完成', '達成']):
            return NodeType.GOAL
        elif any(keyword in label_lower for keyword in ['選択', '決定', '検討', '比較']):
            return NodeType.CHOICE
        elif any(keyword in label_lower for keyword in ['将来', '未来', '計画', '予定']):
            return NodeType.FUTURE
        else:
            return NodeType.CHOICE  # デフォルトは選択肢

    def _sort_cards_by_priority(
        self,
        quest_cards: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """カードを優先度でソート"""
        # 色による優先度
        color_priority = {
            'green': 1,   # アクション（高優先度）
            'teal': 2,    # プランニング
            'yellow': 3,  # 学習
            'purple': 4,  # 創造
            'pink': 5     # コミュニケーション
        }
        
        return sorted(
            quest_cards,
            key=lambda card: (
                color_priority.get(card.get('color', 'teal'), 6),
                card.get('label', '')
            )
        )

    def _create_edge_between_nodes(
        self,
        source_id: str,
        target_id: str,
        edge_type: EdgeType,
        weight: float = 1.0,
        label: str = ""
    ) -> EdgeResponse:
        """2つのノード間のエッジを作成"""
        return EdgeResponse(
            id=str(uuid.uuid4()),
            sourceId=source_id,
            targetId=target_id,
            type=edge_type,
            weight=weight,
            label=label
        )

    def _create_semantic_edges(
        self,
        nodes: List[NodeResponse],
        quest_cards: List[Dict[str, Any]]
    ) -> List[EdgeResponse]:
        """意味的関連性に基づくエッジを作成"""
        edges = []
        
        # シンプルな関連性判定（同じカテゴリ、似たキーワード等）
        for i, node1 in enumerate(nodes):
            for j, node2 in enumerate(nodes[i+1:], i+1):
                if self._are_nodes_semantically_related(node1, node2):
                    edge = self._create_edge_between_nodes(
                        node1.id,
                        node2.id,
                        EdgeType.DOTTED,  # 関連性は点線
                        0.5,
                        "関連"
                    )
                    edges.append(edge)
        
        return edges

    def _are_nodes_semantically_related(
        self,
        node1: NodeResponse,
        node2: NodeResponse
    ) -> bool:
        """2つのノードが意味的に関連しているかを判定"""
        # 同じカテゴリの場合
        if node1.category == node2.category:
            return True
        
        # タイトルに共通のキーワードがある場合
        title1_words = set(node1.title.lower().split())
        title2_words = set(node2.title.lower().split())
        common_words = title1_words.intersection(title2_words)
        
        # 意味のある単語（長さ3以上）が共通している場合
        meaningful_common = [word for word in common_words if len(word) >= 3]
        
        return len(meaningful_common) > 0

    def _create_current_situation_node(self, current_situation: str) -> NodeResponse:
        """現在地ノードを作成"""
        return NodeResponse(
            id=str(uuid.uuid4()),
            title="📍 現在地",
            description=current_situation or "スタート地点",
            type=NodeType.CURRENT,
            status=NodeStatus.COMPLETED,
            category="current",
            x=100,
            y=50,
            isRecommended=False,
            createdAt=datetime.now(timezone.utc),
            updatedAt=datetime.now(timezone.utc),
            userNote="クエストの開始点"
        )

    def _create_initial_edges_from_current(
        self,
        current_node_id: str,
        action_nodes: List[NodeResponse]
    ) -> List[EdgeResponse]:
        """現在地ノードから他のノードへの初期エッジを作成"""
        edges = []
        
        # 最初の数個のノードには現在地から実線エッジを作成
        for i, node in enumerate(action_nodes[:3]):
            edge = self._create_edge_between_nodes(
                current_node_id,
                node.id,
                EdgeType.SOLID,
                1.0,
                f"ステップ{i+1}"
            )
            edges.append(edge)
        
        return edges

    def _generate_quest_title_from_cards(
        self,
        quest_cards: List[Dict[str, Any]],
        goal: str
    ) -> str:
        """クエストカードと目標からタイトルを生成"""
        # カードのラベルからキーワードを抽出
        card_labels = [card.get('label', '') for card in quest_cards]
        
        # よく使われる語彙を抽出
        all_words = ' '.join(card_labels + [goal]).split()
        word_freq = {}
        for word in all_words:
            if len(word) >= 2:  # 2文字以上の単語のみ
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # 最も頻繁な語彙を使ってタイトル作成
        if word_freq:
            key_word = max(word_freq, key=word_freq.get)
            return f"🎯 {key_word}への道のり"
        else:
            return f"🎯 {goal}への探Qマップ"

    async def _save_quest_to_database(self, quest: QuestResponse):
        """クエストをデータベースに保存"""
        try:
            # Supabaseに保存する処理（実装詳細は既存のquest_map_service.pyに依存）
            logger.info(f"💾 クエスト保存: {quest.title}")
            # TODO: 実際のデータベース保存処理
        except Exception as e:
            logger.error(f"❌ クエスト保存エラー: {e}")
            raise

    # ===== 探Qマップ → クエストカード変換 =====

    def convert_quest_map_to_quest_cards(
        self,
        quest: QuestResponse,
        max_cards: int = 8
    ) -> List[Dict[str, Any]]:
        """
        探Qマップからクエストカードを生成
        
        Args:
            quest: 探Qマップのクエスト
            max_cards: 最大カード数
            
        Returns:
            List[Dict[str, Any]]: 生成されたクエストカード
        """
        try:
            logger.info(f"🔄 探Qマップ→クエストカード変換開始: {len(quest.nodes)}ノード")
            
            # 変換対象ノードを選択（現在地以外の重要なノード）
            target_nodes = self._select_nodes_for_cards(quest.nodes, max_cards)
            
            # 各ノードをカードに変換
            quest_cards = []
            for node in target_nodes:
                card = self._convert_node_to_card(node)
                quest_cards.append(card)
            
            logger.info(f"✅ クエストカード変換完了: {len(quest_cards)}枚")
            
            return quest_cards
            
        except Exception as e:
            logger.error(f"❌ クエストカード変換エラー: {e}")
            return []

    def _select_nodes_for_cards(
        self,
        nodes: List[NodeResponse],
        max_cards: int
    ) -> List[NodeResponse]:
        """カード変換用にノードを選択"""
        # 現在地ノードを除外
        action_nodes = [node for node in nodes if node.type != NodeType.CURRENT]
        
        # 重要度でソート（推奨フラグ、ステータス、カテゴリ等を考慮）
        sorted_nodes = sorted(
            action_nodes,
            key=lambda node: (
                not node.isRecommended,  # 推奨ノードを優先
                node.status == NodeStatus.COMPLETED,  # 未完了を優先
                node.category != 'action',  # アクションカテゴリを優先
                node.title
            )
        )
        
        return sorted_nodes[:max_cards]

    def _convert_node_to_card(self, node: NodeResponse) -> Dict[str, Any]:
        """ノードをクエストカードに変換"""
        # タイトルからEmojiを抽出または生成
        emoji = self._extract_emoji_from_title(node.title)
        clean_title = self._clean_title_from_emoji(node.title)
        
        # カテゴリから色を決定
        color = self._map_category_to_color(node.category)
        
        return {
            'id': node.id,
            'label': clean_title,
            'emoji': emoji,
            'color': color,
            'originalNode': {
                'id': node.id,
                'type': node.type,
                'status': node.status,
                'description': node.description,
                'category': node.category
            }
        }

    def _extract_emoji_from_title(self, title: str) -> str:
        """タイトルからEmojiを抽出"""
        import re
        emoji_pattern = re.compile(
            "[\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags (iOS)
            "]+", flags=re.UNICODE
        )
        
        emojis = emoji_pattern.findall(title)
        
        if emojis:
            return emojis[0]
        else:
            # カテゴリベースのデフォルトEmoji
            category_emojis = {
                'planning': '📋',
                'learning': '📚',
                'creative': '🎨',
                'communication': '💬',
                'action': '🎯',
                'analysis': '🔍',
                'general': '📌'
            }
            return category_emojis.get('general', '📌')

    def _clean_title_from_emoji(self, title: str) -> str:
        """タイトルからEmojiを除去"""
        import re
        emoji_pattern = re.compile(
            "[\U0001F600-\U0001F64F"  # emoticons
            "\U0001F300-\U0001F5FF"  # symbols & pictographs
            "\U0001F680-\U0001F6FF"  # transport & map symbols
            "\U0001F1E0-\U0001F1FF"  # flags (iOS)
            "]+", flags=re.UNICODE
        )
        
        clean_title = emoji_pattern.sub('', title).strip()
        return clean_title or title

    def _map_category_to_color(self, category: Optional[str]) -> str:
        """カテゴリを色にマッピング"""
        category_color_mapping = {
            'planning': 'teal',
            'learning': 'yellow', 
            'creative': 'purple',
            'communication': 'pink',
            'action': 'green',
            'analysis': 'teal',
            'general': 'teal'
        }
        return category_color_mapping.get(category or 'general', 'teal')

    # ===== 双方向同期機能 =====

    async def sync_quest_card_with_node_status(
        self,
        quest_id: str,
        node_id: str,
        new_status: NodeStatus
    ) -> Dict[str, Any]:
        """
        ノードのステータス変更をクエストカードに同期
        
        Args:
            quest_id: クエストID
            node_id: ノードID  
            new_status: 新しいステータス
            
        Returns:
            Dict[str, Any]: 同期結果
        """
        try:
            logger.info(f"🔄 ノード→カード同期: {node_id} -> {new_status}")
            
            # ここで実際の同期処理を実装
            # 1. ノードのステータスを更新
            # 2. 対応するクエストカードがあれば状態を更新  
            # 3. 関連する他のノード/カードの推奨状態を更新
            
            return {
                'success': True,
                'node_id': node_id,
                'new_status': new_status,
                'sync_timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ 同期エラー: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def get_integration_statistics(
        self,
        quest_ids: List[str]
    ) -> Dict[str, Any]:
        """
        連携機能の統計情報を取得
        
        Args:
            quest_ids: 対象クエストのIDリスト
            
        Returns:
            Dict[str, Any]: 統計情報
        """
        return {
            'total_quests': len(quest_ids),
            'conversion_stats': {
                'cards_to_map': 0,  # TODO: 実際の統計
                'map_to_cards': 0,
            },
            'sync_events': 0,
            'last_updated': datetime.now().isoformat()
        }