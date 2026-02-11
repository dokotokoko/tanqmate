# tests/conftest.py - 共通テストフィクスチャ設定
import os
import pytest
import asyncio
from typing import AsyncGenerator, Dict, Any
from httpx import AsyncClient
from unittest.mock import Mock, patch
import json
from datetime import datetime, timezone
from contextlib import asynccontextmanager

# テスト用環境変数設定
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test_tanqmates")
os.environ.setdefault("OPENAI_API_KEY", "test-api-key")
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "test-key")

@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def mock_db():
    """モックデータベース接続"""
    mock_conn = Mock()
    mock_cursor = Mock()
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    return mock_conn, mock_cursor

@pytest.fixture
async def mock_openai():
    """OpenAI APIのモック"""
    with patch('module.llm_api.openai_client') as mock_client:
        mock_response = Mock()
        mock_response.choices = [Mock()]
        mock_response.choices[0].message.content = "テストレスポンス"
        mock_client.chat.completions.create.return_value = mock_response
        yield mock_client

@pytest.fixture
def sample_quest_data():
    """サンプルクエストデータ"""
    return {
        "id": 1,
        "user_id": 123,
        "goal": "プログラミングスキルを身につける",
        "current_status": "in_progress",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

@pytest.fixture
def sample_node_data():
    """サンプルノードデータ"""
    return {
        "id": 1,
        "quest_id": 1,
        "type": "goal",
        "title": "プログラミングマスター",
        "description": "プログラミングの基礎から応用まで習得する",
        "category": "programming",
        "status": "pending",
        "position_x": 0,
        "position_y": 0,
        "parent_id": None,
        "metadata": "{}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

@pytest.fixture
def sample_edge_data():
    """サンプルエッジデータ"""
    return {
        "id": 1,
        "quest_id": 1,
        "source_id": 1,
        "target_id": 2,
        "type": "next",
        "weight": 1,
        "metadata": "{}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

@pytest.fixture
def sample_user_data():
    """サンプルユーザーデータ"""
    return {
        "id": 123,
        "email": "test@example.com",
        "username": "testuser"
    }

@pytest.fixture
async def test_client():
    """FastAPIテストクライアント"""
    from main import app
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def mock_supabase():
    """Supabase クライアントのモック"""
    with patch('module.llm_api.supabase_client') as mock_client:
        mock_response = Mock()
        mock_response.data = []
        mock_response.error = None
        mock_client.table.return_value.select.return_value.execute.return_value = mock_response
        mock_client.table.return_value.insert.return_value.execute.return_value = mock_response
        mock_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_response
        mock_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = mock_response
        yield mock_client

class DatabaseTestMixin:
    """データベーステスト用のミックスイン"""
    
    @staticmethod
    def create_mock_db_response(data: Any, affected_rows: int = 1):
        """モックDB応答を作成"""
        mock_cursor = Mock()
        mock_cursor.fetchall.return_value = data if isinstance(data, list) else [data]
        mock_cursor.fetchone.return_value = data if not isinstance(data, list) else (data[0] if data else None)
        mock_cursor.rowcount = affected_rows
        return mock_cursor

    @staticmethod
    def create_quest_db_response(quest_data: Dict[str, Any]):
        """クエストデータのDB応答を作成"""
        return DatabaseTestMixin.create_mock_db_response(quest_data)

    @staticmethod
    def create_nodes_db_response(nodes_data: list):
        """ノードデータのDB応答を作成"""
        return DatabaseTestMixin.create_mock_db_response(nodes_data)

    @staticmethod
    def create_edges_db_response(edges_data: list):
        """エッジデータのDB応答を作成"""
        return DatabaseTestMixin.create_mock_db_response(edges_data)

@pytest.fixture
def db_test_helper():
    """データベーステストヘルパー"""
    return DatabaseTestMixin

# カスタムマッチャー
def assert_quest_structure(quest_data: Dict[str, Any]):
    """クエストデータの構造を検証"""
    required_fields = ["id", "user_id", "goal", "current_status", "created_at", "updated_at"]
    for field in required_fields:
        assert field in quest_data, f"Missing required field: {field}"

def assert_node_structure(node_data: Dict[str, Any]):
    """ノードデータの構造を検証"""
    required_fields = ["id", "quest_id", "type", "title", "status", "position", "created_at", "updated_at"]
    for field in required_fields:
        if field == "position":
            assert field in node_data and "x" in node_data[field] and "y" in node_data[field], f"Invalid position field"
        else:
            assert field in node_data, f"Missing required field: {field}"

def assert_edge_structure(edge_data: Dict[str, Any]):
    """エッジデータの構造を検証"""
    required_fields = ["id", "quest_id", "source_id", "target_id", "type", "created_at"]
    for field in required_fields:
        assert field in edge_data, f"Missing required field: {field}"

# グローバル設定
pytest_plugins = ["pytest_asyncio"]