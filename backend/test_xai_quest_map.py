"""
xAI Grokを使用した探Qマップ機能のテストスクリプト
APIエンドポイントを直接呼び出してxAI統合の動作を確認
"""

import asyncio
import json
import logging
from typing import Dict, Any
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# プロジェクト内モジュールのインポート
from module.xai_llm_adapter import XAILLMAdapter
from services.quest_map_ai import QuestMapAIService
from schemas.quest_map import NodeGenerateRequest


async def test_xai_adapter():
    """xAIアダプターの基本動作テスト"""
    print("\n" + "="*60)
    print("1. xAIアダプター基本動作テスト")
    print("="*60)
    
    try:
        # アダプターの初期化
        adapter = XAILLMAdapter(model="grok-4-1-fast-reasoning")
        
        # テストメッセージ
        messages = [
            adapter.text("system", "あなたは優秀な学習支援アシスタントです。簡潔に答えてください。"),
            adapter.text("user", "効果的な学習方法を1つ教えてください。")
        ]
        
        # 非同期生成のテスト
        print("\n📤 リクエスト送信中...")
        response = await adapter.generate_text(messages, max_tokens=300)
        print(f"✅ 応答受信成功:")
        print(f"   {response[:200]}...")
        
        # メトリクス表示
        metrics = adapter.get_metrics()
        print(f"\n📊 メトリクス:")
        print(f"   - プロバイダー: {metrics['provider']}")
        print(f"   - モデル: {metrics['model']}")
        print(f"   - 平均応答時間: {metrics['average_response_time']:.2f}秒")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ xAIアダプターテストエラー: {e}")
        return False


async def test_quest_node_generation():
    """探Qマップのノード生成テスト"""
    print("\n" + "="*60)
    print("2. 探Qマップ ノード生成テスト（xAI Grok使用）")
    print("="*60)
    
    try:
        # ダミーのSupabaseクライアント（テスト用）
        class DummySupabase:
            def table(self, name):
                return self
            def select(self, *args, **kwargs):
                return self
            def eq(self, *args, **kwargs):
                return self
            def execute(self):
                return type('obj', (object,), {'data': []})()
        
        # AIサービスの初期化
        ai_service = QuestMapAIService(DummySupabase(), user_id=1)
        
        # テスト用のゴール
        test_goal = "Pythonで機械学習の基礎を習得する"
        test_context = "プログラミング経験はあるが、機械学習は初めて。週10時間程度学習時間を確保できる。"
        
        print(f"\n🎯 テストゴール: {test_goal}")
        print(f"📝 コンテキスト: {test_context}")
        print("\n📤 AI生成リクエスト送信中...")
        
        # ノード生成
        result = await ai_service.generate_action_nodes(
            quest_id=1,
            goal=test_goal,
            current_context=test_context,
            node_count=3,
            focus_category=None,
            user_context={"user_id": 1},
            user_preferences={}
        )
        
        print(f"\n✅ ノード生成成功: {len(result.suggested_nodes)}個の選択肢")
        print(f"\n📋 生成された選択肢:")
        
        for i, node in enumerate(result.suggested_nodes, 1):
            print(f"\n  {i}. {node.title}")
            print(f"     説明: {node.description[:100]}...")
            print(f"     難易度: {node.difficulty}/5")
            print(f"     推定時間: {node.estimated_duration}")
            print(f"     カテゴリ: {node.category}")
        
        if result.reasoning:
            print(f"\n💡 AI分析: {result.reasoning[:200]}...")
        
        if result.next_steps_advice:
            print(f"\n➡️ 次のステップ: {result.next_steps_advice[:200]}...")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ ノード生成テストエラー: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_node_breakdown():
    """ノード分解機能のテスト"""
    print("\n" + "="*60)
    print("3. ノード分解テスト（xAI Grok使用）")
    print("="*60)
    
    try:
        # ダミーのSupabaseクライアント
        class DummySupabase:
            def table(self, name):
                return self
            def select(self, *args, **kwargs):
                return self
            def eq(self, *args, **kwargs):
                return self
            def execute(self):
                return type('obj', (object,), {'data': []})()
        
        # AIサービスの初期化
        ai_service = QuestMapAIService(DummySupabase(), user_id=1)
        
        # テスト用のノード
        test_node_title = "scikit-learnで基本的な分類モデルを実装"
        test_node_description = "アイリスデータセットを使って、決定木、ランダムフォレスト、SVMなどの基本的な分類アルゴリズムを実装し、性能を比較する"
        
        print(f"\n🎯 分解対象: {test_node_title}")
        print(f"📝 説明: {test_node_description}")
        print("\n📤 分解リクエスト送信中...")
        
        # ノード分解
        result = await ai_service.breakdown_node(
            node_id=1,
            node_title=test_node_title,
            node_description=test_node_description,
            detail_level=3,
            context="初心者向けに段階的に進められるように"
        )
        
        print(f"\n✅ 分解成功: {len(result.subtasks)}個のサブタスク")
        print(f"\n📋 サブタスク一覧:")
        
        for task in result.subtasks:
            print(f"\n  {task.order}. {task.title}")
            print(f"     説明: {task.description[:100]}...")
            print(f"     推定時間: {task.estimated_duration}")
            if task.dependencies:
                print(f"     依存: {task.dependencies}")
        
        if result.reasoning:
            print(f"\n💡 分解の理由: {result.reasoning[:200]}...")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ ノード分解テストエラー: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_node_expansion():
    """ノード拡散機能のテスト"""
    print("\n" + "="*60)
    print("4. ノード拡散テスト（xAI Grok使用）")
    print("="*60)
    
    try:
        # ダミーのSupabaseクライアント
        class DummySupabase:
            def table(self, name):
                return self
            def select(self, *args, **kwargs):
                return self
            def eq(self, *args, **kwargs):
                return self
            def execute(self):
                return type('obj', (object,), {'data': []})()
        
        # AIサービスの初期化
        ai_service = QuestMapAIService(DummySupabase(), user_id=1)
        
        # テスト用のノード
        test_node_title = "機械学習の数学的基礎を学ぶ"
        test_node_description = "線形代数、微分積分、確率統計の基礎を機械学習の文脈で理解する"
        
        print(f"\n🎯 拡散対象: {test_node_title}")
        print(f"📝 説明: {test_node_description}")
        print("\n📤 拡散リクエスト送信中...")
        
        # ノード拡散
        result = await ai_service.expand_node(
            node_id=1,
            node_title=test_node_title,
            node_description=test_node_description,
            alternative_count=3,
            context="時間効率と理解の深さのバランスを考慮"
        )
        
        print(f"\n✅ 拡散成功: {len(result.alternatives)}個の代替案")
        print(f"\n📋 代替アプローチ一覧:")
        
        for i, alt in enumerate(result.alternatives, 1):
            print(f"\n  {i}. {alt.title}")
            print(f"     アプローチ: {alt.approach}")
            print(f"     メリット: {', '.join(alt.pros[:3])}")
            print(f"     デメリット: {', '.join(alt.cons[:3])}")
            print(f"     難易度: {alt.difficulty}/5, リスク: {alt.risk_level}/5")
        
        if result.reasoning:
            print(f"\n💡 提案の理由: {result.reasoning[:200]}...")
        
        if result.recommendation:
            print(f"\n⭐ 推奨: {result.recommendation[:200]}...")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ ノード拡散テストエラー: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """メインテスト実行"""
    print("\n" + "="*60)
    print(" xAI Grok 探Qマップ統合テスト ")
    print("="*60)
    
    results = []
    
    # 1. xAIアダプターテスト
    results.append(("xAIアダプター基本動作", await test_xai_adapter()))
    
    # 2. ノード生成テスト
    results.append(("ノード生成", await test_quest_node_generation()))
    
    # 3. ノード分解テスト
    results.append(("ノード分解", await test_node_breakdown()))
    
    # 4. ノード拡散テスト
    results.append(("ノード拡散", await test_node_expansion()))
    
    # 結果サマリー
    print("\n" + "="*60)
    print(" テスト結果サマリー ")
    print("="*60)
    
    for test_name, success in results:
        status = "✅ 成功" if success else "❌ 失敗"
        print(f"{test_name}: {status}")
    
    total_success = sum(1 for _, s in results if s)
    print(f"\n合計: {total_success}/{len(results)} テスト成功")
    
    if total_success == len(results):
        print("\n🎉 すべてのテストが成功しました！")
        print("xAI Grokは探Qマップ機能で正常に動作しています。")
    else:
        print("\n⚠️ 一部のテストが失敗しました。")
        print("エラーログを確認してください。")


if __name__ == "__main__":
    asyncio.run(main())