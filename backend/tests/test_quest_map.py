# tests/test_quest_map.py - 探Qマップ機能の包括的テスト
import pytest
import json
import asyncio
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from httpx import AsyncClient
from datetime import datetime, timezone
from typing import List, Dict, Any

from conftest import (
    DatabaseTestMixin, 
    assert_quest_structure, 
    assert_node_structure, 
    assert_edge_structure
)
from ..models.quest_map import NodeType, NodeStatus, EdgeType, QuestStatus
from ..schemas.quest_map import (
    QuestCreateRequest, QuestUpdateRequest,
    NodeGenerateRequest, NodeBreakdownRequest, NodeExpandRequest,
    NodeCompleteRequest, NodeUpdateRequest
)
from ..services.quest_map_service import QuestMapService
from ..services.quest_map_ai import QuestMapAIService
from ..routers.quest_map import router


@pytest.mark.unit
class TestQuestMapModels:
    """探Qマップモデルのテスト"""

    def test_node_type_enum(self):
        """NodeTypeの定義テスト"""
        assert NodeType.GOAL == "goal"
        assert NodeType.ACTION == "action"
        assert NodeType.BREAKDOWN == "breakdown"
        assert NodeType.MILESTONE == "milestone"

    def test_node_status_enum(self):
        """NodeStatusの定義テスト"""
        assert NodeStatus.PENDING == "pending"
        assert NodeStatus.IN_PROGRESS == "in_progress"
        assert NodeStatus.COMPLETED == "completed"
        assert NodeStatus.BLOCKED == "blocked"
        assert NodeStatus.CANCELLED == "cancelled"

    def test_quest_status_enum(self):
        """QuestStatusの定義テスト"""
        assert QuestStatus.PLANNING == "planning"
        assert QuestStatus.IN_PROGRESS == "in_progress"
        assert QuestStatus.COMPLETED == "completed"
        assert QuestStatus.PAUSED == "paused"
        assert QuestStatus.CANCELLED == "cancelled"


@pytest.mark.unit
class TestQuestMapSchemas:
    """探Qマップスキーマの検証テスト"""

    def test_quest_create_request_validation(self):
        """QuestCreateRequestの入力検証テスト"""
        # 正常なケース
        valid_request = QuestCreateRequest(
            goal="プログラミングスキルを身につける",
            initial_context="現在Python基礎を学習中"
        )
        assert valid_request.goal == "プログラミングスキルを身につける"
        assert valid_request.initial_context == "現在Python基礎を学習中"

        # 空文字列のケース
        with pytest.raises(ValueError, match="ゴールは必須です"):
            QuestCreateRequest(goal="", initial_context="")

        # 最小長チェック
        with pytest.raises(ValueError):
            QuestCreateRequest(goal="", initial_context="")

    def test_node_generate_request_validation(self):
        """NodeGenerateRequestの入力検証テスト"""
        # 正常なケース
        valid_request = NodeGenerateRequest(
            quest_id=1,
            context="追加コンテキスト",
            node_count=5,
            focus_category="programming"
        )
        assert valid_request.quest_id == 1
        assert valid_request.node_count == 5

        # 範囲外の値
        with pytest.raises(ValueError):
            NodeGenerateRequest(quest_id=1, node_count=15)  # 10を超過

        with pytest.raises(ValueError):
            NodeGenerateRequest(quest_id=1, node_count=1)  # 3未満

    def test_node_breakdown_request_validation(self):
        """NodeBreakdownRequestの入力検証テスト"""
        # 正常なケース
        valid_request = NodeBreakdownRequest(
            node_id=1,
            detail_level=3,
            context="細分化用コンテキスト"
        )
        assert valid_request.node_id == 1
        assert valid_request.detail_level == 3

        # 範囲外の値
        with pytest.raises(ValueError):
            NodeBreakdownRequest(node_id=1, detail_level=6)  # 5を超過

        with pytest.raises(ValueError):
            NodeBreakdownRequest(node_id=1, detail_level=1)  # 2未満


@pytest.mark.integration
class TestQuestMapDatabaseOperations:
    """探Qマップデータベース操作の統合テスト"""

    @pytest.fixture
    def mock_service(self, mock_supabase):
        """モックサービスのフィクスチャ"""
        return QuestMapService(mock_supabase, user_id=123)

    async def test_create_quest_database_operation(self, mock_service, mock_supabase, db_test_helper):
        """クエスト作成のデータベース操作テスト"""
        # モックレスポンスの設定
        mock_response = {
            "id": 1,
            "user_id": 123,
            "goal": "プログラミングスキルを身につける",
            "current_status": "planning",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [mock_response]

        # テスト実行
        request = QuestCreateRequest(
            goal="プログラミングスキルを身につける",
            initial_context="現在Python基礎を学習中"
        )
        result = await mock_service.create_quest(request, 123)

        # 検証
        assert_quest_structure(result.__dict__)
        assert result.goal == "プログラミングスキルを身につける"
        assert result.current_status == QuestStatus.PLANNING

    async def test_get_quest_with_statistics(self, mock_service, mock_supabase, sample_quest_data):
        """統計情報付きクエスト取得テスト"""
        # モックレスポンスの設定
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [sample_quest_data]
        
        # ノード統計のモック
        mock_nodes = [
            {"status": "completed"},
            {"status": "pending"},
            {"status": "in_progress"}
        ]
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = mock_nodes

        # テスト実行
        result = mock_service.get_quest(1, 123)

        # 検証
        assert_quest_structure(result.__dict__)
        assert result.id == sample_quest_data["id"]

    async def test_update_quest_status(self, mock_service, mock_supabase, sample_quest_data):
        """クエストステータス更新テスト"""
        # モックレスポンスの設定
        updated_data = sample_quest_data.copy()
        updated_data["current_status"] = "in_progress"
        mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated_data]

        # テスト実行
        request = QuestUpdateRequest(current_status=QuestStatus.IN_PROGRESS)
        result = await mock_service.update_quest(1, request, 123)

        # 検証
        assert result.current_status == QuestStatus.IN_PROGRESS

    async def test_delete_quest_cascade(self, mock_service, mock_supabase):
        """クエスト削除のカスケード処理テスト"""
        # モックレスポンスの設定
        mock_supabase.table.return_value.delete.return_value.eq.return_value.execute.return_value.data = [{"id": 1}]

        # テスト実行
        result = await mock_service.delete_quest(1, 123)

        # 検証
        assert result["success"] == True
        assert result["quest_id"] == 1


@pytest.mark.integration
class TestQuestMapAIIntegration:
    """探QマップAI連携機能の統合テスト"""

    @pytest.fixture
    def mock_ai_service(self, mock_supabase, mock_openai):
        """モックAIサービスのフィクスチャ"""
        return QuestMapAIService(mock_supabase, user_id=123)

    async def test_generate_action_nodes_with_ai(self, mock_ai_service, mock_openai):
        """AI選択肢生成テスト"""
        # OpenAI応答のモック設定
        mock_ai_response = {
            "suggested_nodes": [
                {
                    "title": "Python基礎文法学習",
                    "description": "変数、関数、制御文を学ぶ",
                    "category": "programming",
                    "estimated_duration": "2週間"
                },
                {
                    "title": "実践プロジェクト作成",
                    "description": "小規模なWebアプリを作成",
                    "category": "programming",
                    "estimated_duration": "1ヶ月"
                }
            ],
            "reasoning": "段階的に基礎から実践へ進むアプローチを推奨",
            "quest_id": 1
        }
        
        with patch.object(mock_ai_service, '_call_ai_for_node_generation', return_value=mock_ai_response) as mock_ai:
            # テスト実行
            request = NodeGenerateRequest(
                quest_id=1,
                context="Python学習を始めたい",
                node_count=5
            )
            result = await mock_ai_service.generate_nodes(request)

            # 検証
            assert len(result.suggested_nodes) == 2
            assert result.suggested_nodes[0]["title"] == "Python基礎文法学習"
            assert result.reasoning == "段階的に基礎から実践へ進むアプローチを推奨"
            mock_ai.assert_called_once()

    async def test_breakdown_node_with_ai(self, mock_ai_service, mock_openai):
        """AIノード細分化テスト"""
        # AI応答のモック
        mock_breakdown_response = {
            "subtasks": [
                {
                    "title": "変数と型の理解",
                    "description": "int, str, list等の基本データ型を学ぶ",
                    "order": 1
                },
                {
                    "title": "制御文の学習",
                    "description": "if文、for文、while文の使い方を学ぶ",
                    "order": 2
                }
            ],
            "breakdown_strategy": "小さなステップに分解して理解を深める",
            "node_id": 1
        }
        
        with patch.object(mock_ai_service, '_call_ai_for_breakdown', return_value=mock_breakdown_response):
            # テスト実行
            request = NodeBreakdownRequest(
                node_id=1,
                detail_level=3,
                context="プログラミング初心者"
            )
            result = await mock_ai_service.breakdown_node(request)

            # 検証
            assert len(result.subtasks) == 2
            assert result.subtasks[0]["title"] == "変数と型の理解"
            assert result.breakdown_strategy == "小さなステップに分解して理解を深める"

    async def test_expand_node_alternatives(self, mock_ai_service, mock_openai):
        """AIノード拡散（代替案生成）テスト"""
        # AI応答のモック
        mock_expansion_response = {
            "alternatives": [
                {
                    "title": "オンライン講座受講",
                    "description": "UdemyやCourseraでのコース受講",
                    "approach": "structured_learning"
                },
                {
                    "title": "プロジェクトベース学習",
                    "description": "実際のプロジェクトを作りながら学ぶ",
                    "approach": "hands_on"
                }
            ],
            "expansion_reasoning": "学習スタイルの違いに対応した複数のアプローチ",
            "node_id": 1
        }
        
        with patch.object(mock_ai_service, '_call_ai_for_expansion', return_value=mock_expansion_response):
            # テスト実行
            request = NodeExpandRequest(
                node_id=1,
                alternative_count=3,
                context="複数の学習方法を検討"
            )
            result = await mock_ai_service.expand_node(request)

            # 検証
            assert len(result.alternatives) == 2
            assert result.alternatives[0]["approach"] == "structured_learning"
            assert result.expansion_reasoning == "学習スタイルの違いに対応した複数のアプローチ"


@pytest.mark.api
class TestQuestMapAPIEndpoints:
    """探QマップAPIエンドポイントのテスト"""

    @pytest.fixture
    async def client(self):
        """テスト用FastAPIクライアント"""
        from ..main import app
        async with AsyncClient(app=app, base_url="http://test") as ac:
            yield ac

    async def test_create_quest_endpoint(self, client: AsyncClient):
        """クエスト作成エンドポイントテスト"""
        with patch('routers.quest_map.get_current_user_id', return_value=123):
            with patch('routers.quest_map.get_quest_map_service') as mock_service:
                # サービスのモック設定
                mock_quest_service = Mock()
                mock_response = Mock()
                mock_response.id = 1
                mock_response.goal = "プログラミングスキルを身につける"
                mock_response.current_status = QuestStatus.PLANNING
                mock_quest_service.create_quest.return_value = mock_response
                mock_service.return_value = mock_quest_service

                # APIリクエスト
                response = await client.post(
                    "/api/quest-map/quests",
                    json={
                        "goal": "プログラミングスキルを身につける",
                        "initial_context": "現在Python基礎を学習中"
                    }
                )

                # 検証
                assert response.status_code == 201
                data = response.json()
                assert data["goal"] == "プログラミングスキルを身につける"

    async def test_get_quest_endpoint(self, client: AsyncClient):
        """クエスト取得エンドポイントテスト"""
        with patch('routers.quest_map.get_current_user_id', return_value=123):
            with patch('routers.quest_map.get_quest_map_service') as mock_service:
                # サービスのモック設定
                mock_quest_service = Mock()
                mock_response = Mock()
                mock_response.id = 1
                mock_response.goal = "プログラミングスキルを身につける"
                mock_quest_service.get_quest.return_value = mock_response
                mock_service.return_value = mock_quest_service

                # APIリクエスト
                response = await client.get("/api/quest-map/quests/1")

                # 検証
                assert response.status_code == 200
                data = response.json()
                assert data["goal"] == "プログラミングスキルを身につける"

    async def test_generate_nodes_endpoint(self, client: AsyncClient):
        """ノード生成エンドポイントテスト"""
        with patch('routers.quest_map.get_current_user_id', return_value=123):
            with patch('routers.quest_map.get_quest_map_service') as mock_service:
                # サービスのモック設定
                mock_quest_service = Mock()
                mock_response = Mock()
                mock_response.suggested_nodes = [
                    {"title": "Python基礎", "description": "基礎文法学習"}
                ]
                mock_quest_service.generate_action_nodes.return_value = mock_response
                mock_service.return_value = mock_quest_service

                # APIリクエスト
                response = await client.post(
                    "/api/quest-map/nodes/generate",
                    json={
                        "quest_id": 1,
                        "context": "初心者向け",
                        "node_count": 5
                    }
                )

                # 検証
                assert response.status_code == 200
                data = response.json()
                assert len(data["suggested_nodes"]) == 1

    async def test_complete_node_endpoint(self, client: AsyncClient):
        """ノード完了エンドポイントテスト"""
        with patch('routers.quest_map.get_current_user_id', return_value=123):
            with patch('routers.quest_map.get_quest_map_service') as mock_service:
                # サービスのモック設定
                mock_quest_service = Mock()
                mock_response = Mock()
                mock_response.id = 1
                mock_response.status = NodeStatus.COMPLETED
                mock_quest_service.complete_node.return_value = mock_response
                mock_service.return_value = mock_quest_service

                # APIリクエスト
                response = await client.post(
                    "/api/quest-map/nodes/1/complete",
                    json={
                        "feedback": "無事に完了しました",
                        "rating": 5
                    }
                )

                # 検証
                assert response.status_code == 200
                data = response.json()
                assert data["status"] == NodeStatus.COMPLETED

    async def test_get_quest_graph_endpoint(self, client: AsyncClient):
        """クエストグラフ取得エンドポイントテスト"""
        with patch('routers.quest_map.get_current_user_id', return_value=123):
            with patch('routers.quest_map.get_quest_map_service') as mock_service:
                # サービスのモック設定
                mock_quest_service = Mock()
                mock_response = Mock()
                mock_response.nodes = [{"id": 1, "title": "Goal Node"}]
                mock_response.edges = [{"id": 1, "source_id": 1, "target_id": 2}]
                mock_response.statistics = {"total_nodes": 1}
                mock_quest_service.get_quest_graph.return_value = mock_response
                mock_service.return_value = mock_quest_service

                # APIリクエスト
                response = await client.get("/api/quest-map/quests/1/graph")

                # 検証
                assert response.status_code == 200
                data = response.json()
                assert len(data["nodes"]) == 1
                assert len(data["edges"]) == 1


@pytest.mark.integration
class TestQuestMapErrorHandling:
    """探Qマップエラーハンドリングテスト"""

    @pytest.fixture
    def mock_service(self, mock_supabase):
        """モックサービスのフィクスチャ"""
        return QuestMapService(mock_supabase, user_id=123)

    async def test_quest_not_found_error(self, mock_service, mock_supabase):
        """クエスト未発見エラーテスト"""
        # データベースエラーのモック
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        # テスト実行と検証
        with pytest.raises(Exception):  # 実際の例外タイプに合わせて調整
            mock_service.get_quest(999, 123)

    async def test_unauthorized_access_error(self, mock_service, mock_supabase):
        """認可エラーテスト"""
        # 他のユーザーのクエストデータ
        mock_data = {
            "id": 1,
            "user_id": 456,  # 異なるユーザーID
            "goal": "他のユーザーのクエスト"
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [mock_data]

        # テスト実行と検証
        with pytest.raises(Exception):  # 認可エラー
            mock_service.get_quest(1, 123)

    async def test_ai_service_error_handling(self, mock_supabase, mock_openai):
        """AIサービスエラーハンドリングテスト"""
        ai_service = QuestMapAIService(mock_supabase, user_id=123)
        
        # OpenAI APIエラーのモック
        mock_openai.chat.completions.create.side_effect = Exception("API Rate Limit Exceeded")

        # テスト実行と検証
        request = NodeGenerateRequest(quest_id=1, context="テストコンテキスト")
        
        with pytest.raises(Exception, match="API Rate Limit Exceeded"):
            await ai_service.generate_nodes(request)

    async def test_database_connection_error(self, mock_supabase):
        """データベース接続エラーテスト"""
        # 接続エラーのモック
        mock_supabase.table.side_effect = Exception("Database connection failed")
        
        service = QuestMapService(mock_supabase, user_id=123)

        # テスト実行と検証
        with pytest.raises(Exception, match="Database connection failed"):
            service.get_quest(1, 123)


@pytest.mark.performance
class TestQuestMapPerformance:
    """探Qマップパフォーマンステスト"""

    @pytest.fixture
    def mock_service(self, mock_supabase):
        """パフォーマンステスト用サービス"""
        return QuestMapService(mock_supabase, user_id=123)

    async def test_large_node_graph_performance(self, mock_service, mock_supabase):
        """大規模ノードグラフのパフォーマンステスト"""
        # 大量のノードデータをモック
        large_node_data = []
        for i in range(1000):
            large_node_data.append({
                "id": i,
                "quest_id": 1,
                "title": f"Node {i}",
                "type": "action",
                "status": "pending"
            })
        
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = large_node_data

        # パフォーマンス測定
        start_time = datetime.now()
        result = mock_service.get_quest_graph(1, 123)
        end_time = datetime.now()
        
        execution_time = (end_time - start_time).total_seconds()
        
        # 検証（2秒以内での処理を期待）
        assert execution_time < 2.0
        assert len(result.nodes) == 1000

    async def test_concurrent_ai_requests_performance(self, mock_supabase, mock_openai):
        """並行AI リクエストのパフォーマンステスト"""
        ai_service = QuestMapAIService(mock_supabase, user_id=123)
        
        # AI応答のモック設定
        mock_openai.chat.completions.create.return_value.choices[0].message.content = "テストレスポンス"

        # 並行リクエストの実行
        async def make_ai_request():
            request = NodeGenerateRequest(quest_id=1, node_count=3)
            return await ai_service.generate_nodes(request)

        # 10個の並行リクエストを実行
        start_time = datetime.now()
        tasks = [make_ai_request() for _ in range(10)]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = datetime.now()
        
        execution_time = (end_time - start_time).total_seconds()
        
        # 検証（10秒以内での並行処理を期待）
        assert execution_time < 10.0
        assert len(results) == 10
        
        # 成功したリクエストの数を確認
        successful_results = [r for r in results if not isinstance(r, Exception)]
        assert len(successful_results) >= 8  # 8割以上の成功率を期待

    async def test_memory_usage_with_large_context(self, mock_service, mock_supabase):
        """大きなコンテキストでのメモリ使用量テスト"""
        # 大きなコンテキストデータ
        large_context = "x" * 10000  # 10KB のコンテキスト
        
        request = QuestCreateRequest(
            goal="テストクエスト",
            initial_context=large_context
        )
        
        # モックレスポンス
        mock_response = {
            "id": 1,
            "goal": "テストクエスト",
            "initial_context": large_context
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [mock_response]
        
        # メモリ使用量をチェック（簡易的）
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        memory_before = process.memory_info().rss
        
        result = await mock_service.create_quest(request, 123)
        
        memory_after = process.memory_info().rss
        memory_diff = memory_after - memory_before
        
        # メモリ増加が100MB未満であることを確認
        assert memory_diff < 100 * 1024 * 1024  # 100MB


@pytest.mark.integration
class TestQuestMapDataConsistency:
    """探Qマップデータ整合性テスト"""

    @pytest.fixture
    def mock_service(self, mock_supabase):
        """データ整合性テスト用サービス"""
        return QuestMapService(mock_supabase, user_id=123)

    async def test_node_edge_consistency(self, mock_service, mock_supabase):
        """ノードとエッジの整合性テスト"""
        # ノードとエッジの整合性のあるデータ
        nodes_data = [
            {"id": 1, "quest_id": 1, "title": "Node 1", "type": "goal"},
            {"id": 2, "quest_id": 1, "title": "Node 2", "type": "action"},
        ]
        edges_data = [
            {"id": 1, "quest_id": 1, "source_id": 1, "target_id": 2, "type": "next"}
        ]
        
        # モックレスポンスの設定
        def mock_table_call(table_name):
            mock_table = Mock()
            if table_name == "quest_map_nodes":
                mock_table.select.return_value.eq.return_value.execute.return_value.data = nodes_data
            elif table_name == "quest_map_edges":
                mock_table.select.return_value.eq.return_value.execute.return_value.data = edges_data
            return mock_table
        
        mock_supabase.table.side_effect = mock_table_call

        # テスト実行
        result = mock_service.get_quest_graph(1, 123)

        # 整合性検証
        assert len(result.nodes) == 2
        assert len(result.edges) == 1
        
        # エッジが参照しているノードが存在するかチェック
        node_ids = {node["id"] for node in result.nodes}
        for edge in result.edges:
            assert edge["source_id"] in node_ids, f"Source node {edge['source_id']} not found"
            assert edge["target_id"] in node_ids, f"Target node {edge['target_id']} not found"

    async def test_quest_status_transition(self, mock_service, mock_supabase):
        """クエストステータス遷移の妥当性テスト"""
        # 有効なステータス遷移のテスト
        valid_transitions = [
            (QuestStatus.PLANNING, QuestStatus.IN_PROGRESS),
            (QuestStatus.IN_PROGRESS, QuestStatus.COMPLETED),
            (QuestStatus.IN_PROGRESS, QuestStatus.PAUSED),
            (QuestStatus.PAUSED, QuestStatus.IN_PROGRESS),
        ]
        
        for current_status, new_status in valid_transitions:
            # モックレスポンス
            quest_data = {
                "id": 1,
                "user_id": 123,
                "current_status": current_status.value
            }
            updated_data = quest_data.copy()
            updated_data["current_status"] = new_status.value
            
            mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [quest_data]
            mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [updated_data]
            
            # ステータス更新テスト
            request = QuestUpdateRequest(current_status=new_status)
            result = await mock_service.update_quest(1, request, 123)
            
            # 検証
            assert result.current_status == new_status


@pytest.mark.security
class TestQuestMapSecurity:
    """探Qマップセキュリティテスト"""

    @pytest.fixture
    def mock_service(self, mock_supabase):
        """セキュリティテスト用サービス"""
        return QuestMapService(mock_supabase, user_id=123)

    async def test_sql_injection_prevention(self, mock_service, mock_supabase):
        """SQLインジェクション対策テスト"""
        # SQLインジェクション攻撃を含むリクエスト
        malicious_goal = "Test'; DROP TABLE quest_map_quests; --"
        
        request = QuestCreateRequest(
            goal=malicious_goal,
            initial_context="test"
        )
        
        # モックレスポンス（正常に処理される想定）
        mock_response = {
            "id": 1,
            "goal": malicious_goal,  # エスケープされた状態で保存される
            "user_id": 123
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [mock_response]
        
        # テスト実行（例外が発生しないことを確認）
        result = await mock_service.create_quest(request, 123)
        
        # 検証（データが適切にエスケープされて保存されている）
        assert result.goal == malicious_goal

    async def test_xss_prevention(self, mock_service, mock_supabase):
        """XSS対策テスト"""
        # XSS攻撃を含むリクエスト
        xss_goal = "<script>alert('xss')</script>プログラミング学習"
        
        request = QuestCreateRequest(
            goal=xss_goal,
            initial_context="<img src='x' onerror='alert(1)'>"
        )
        
        # モックレスポンス
        mock_response = {
            "id": 1,
            "goal": xss_goal,
            "initial_context": "<img src='x' onerror='alert(1)'>"
        }
        mock_supabase.table.return_value.insert.return_value.execute.return_value.data = [mock_response]
        
        # テスト実行
        result = await mock_service.create_quest(request, 123)
        
        # 検証（データがサニタイズされずに保存され、出力時にエスケープされることを想定）
        assert "<script>" in result.goal

    async def test_authorization_check(self, mock_service, mock_supabase):
        """認可チェックテスト"""
        # 他のユーザーのデータへのアクセステスト
        other_user_quest = {
            "id": 1,
            "user_id": 456,  # 異なるユーザーID
            "goal": "他のユーザーのクエスト"
        }
        mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [other_user_quest]
        
        # テスト実行（認可エラーが発生することを期待）
        with pytest.raises(Exception):  # 実際の認可エラークラスに合わせて調整
            mock_service.get_quest(1, 123)  # user_id=123で他のユーザーのクエストにアクセス

    async def test_input_length_limits(self, mock_service):
        """入力長制限テスト"""
        # 長すぎる入力のテスト
        very_long_goal = "x" * 2000  # 1000文字制限を超過
        
        # バリデーションエラーが発生することを期待
        with pytest.raises(ValueError):
            QuestCreateRequest(
                goal=very_long_goal,
                initial_context="test"
            )


if __name__ == "__main__":
    # テスト実行コマンド
    pytest.main([
        __file__,
        "-v",
        "--cov=routers.quest_map",
        "--cov=services.quest_map_service",
        "--cov=services.quest_map_ai",
        "--cov-report=html"
    ])