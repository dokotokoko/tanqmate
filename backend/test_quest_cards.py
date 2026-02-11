#!/usr/bin/env python3
"""
クエストカード機能のテストスクリプト

このスクリプトは、LLMとクエストカード機能の連携をテストします。
"""

import json
import re
import sys
import os

# プロジェクトルートディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.chat_service import ChatService


def test_quest_card_extraction():
    """クエストカード抽出機能をテスト"""
    print("=== クエストカード抽出機能テスト ===")
    
    # ChatServiceインスタンスを作成（ダミー）
    chat_service = ChatService(None, 1)
    
    # テスト用の応答文（LLMが生成するであろうフォーマット）
    test_response = """
あなたの質問について詳しく説明しますね。

この問題については、いくつかのアプローチが考えられます。
まず、基本的な概念を理解することが重要です。

次のステップとして、以下のアクションをお勧めします：

```json
{
  "quest_cards": [
    {
      "id": "organize_1",
      "label": "情報を整理する",
      "emoji": "💭",
      "color": "teal"
    },
    {
      "id": "research_1",
      "label": "さらに調査する",
      "emoji": "🔍",
      "color": "purple"
    },
    {
      "id": "practice_1",
      "label": "実際にやってみる",
      "emoji": "✅",
      "color": "green"
    }
  ]
}
```

何か他にご質問がありましたら、お気軽にお聞かせください。
    """.strip()
    
    # 抽出テスト実行
    clean_response, quest_cards = chat_service._extract_quest_cards(test_response)
    
    print("元の応答:")
    print(f"文字数: {len(test_response)}")
    print(test_response[:100] + "...")
    print()
    
    print("抽出されたクリーンな応答:")
    print(f"文字数: {len(clean_response)}")
    print(clean_response)
    print()
    
    print("抽出されたクエストカード:")
    print(f"カード数: {len(quest_cards)}")
    for i, card in enumerate(quest_cards, 1):
        print(f"  {i}. ID: {card['id']}")
        print(f"     ラベル: {card['label']}")
        print(f"     色: {card['color']}")
        print()
    
    # 検証
    assert len(quest_cards) == 3, f"期待するカード数は3つ、実際は{len(quest_cards)}つ"
    assert quest_cards[0]['label'] == "情報を整理する", "最初のカードのラベルが正しくありません"
    assert quest_cards[1]['color'] == "purple", "2番目のカードの色が正しくありません"
    assert "```json" not in clean_response, "JSONブロックがクリーンな応答に残っています"
    
    print("抽出機能テスト完了")


def test_invalid_json():
    """無効なJSONの処理テスト"""
    print("=== 無効なJSON処理テスト ===")
    
    chat_service = ChatService(None, 1)
    
    # 無効なJSONを含む応答
    invalid_response = """
応答内容です。

```json
{
  "quest_cards": [
    {
      "id": "test_1",
      "label": "テスト",
      "emoji": "*",
      "color": "invalid_color"  // 無効な色
    },
    {
      // 不完全なオブジェクト
      "id": "test_2"
    }
  ]
}
```

残りの内容です。
    """.strip()
    
    clean_response, quest_cards = chat_service._extract_quest_cards(invalid_response)
    
    print("無効なJSONテスト結果:")
    print(f"クリーンな応答文字数: {len(clean_response)}")
    print(f"抽出されたカード数: {len(quest_cards)}")
    
    # 無効なデータは除外されているはず
    assert len(quest_cards) == 0, "無効なカードが除外されていません"
    
    print("無効なJSON処理テスト完了")


def test_no_cards():
    """カードなしの応答テスト"""
    print("=== カードなし応答テスト ===")
    
    chat_service = ChatService(None, 1)
    
    # カードなしの通常応答
    normal_response = "これは通常の応答です。カードは含まれていません。"
    
    clean_response, quest_cards = chat_service._extract_quest_cards(normal_response)
    
    print("カードなし応答テスト結果:")
    print(f"元の応答: {normal_response}")
    print(f"クリーンな応答: {clean_response}")
    print(f"カード数: {len(quest_cards)}")
    
    assert clean_response == normal_response, "応答が変更されています"
    assert len(quest_cards) == 0, "カードが誤って抽出されています"
    
    print("カードなし応答テスト完了")


def test_max_cards_limit():
    """最大カード数制限テスト"""
    print("=== 最大カード数制限テスト ===")
    
    chat_service = ChatService(None, 1)
    
    # 6つのカードを含む応答（最大5つまでに制限されるはず）
    max_cards_response = """
応答内容です。

```json
{
  "quest_cards": [
    {"id": "1", "label": "カード1", "emoji": "1", "color": "teal"},
    {"id": "2", "label": "カード2", "emoji": "2", "color": "yellow"},
    {"id": "3", "label": "カード3", "emoji": "3", "color": "purple"},
    {"id": "4", "label": "カード4", "emoji": "4", "color": "pink"},
    {"id": "5", "label": "カード5", "emoji": "5", "color": "green"},
    {"id": "6", "label": "カード6", "emoji": "6", "color": "teal"}
  ]
}
```
    """.strip()
    
    clean_response, quest_cards = chat_service._extract_quest_cards(max_cards_response)
    
    print("最大カード数制限テスト結果:")
    print(f"抽出されたカード数: {len(quest_cards)}")
    for i, card in enumerate(quest_cards, 1):
        print(f"  {i}. {card['label']}")
    
    assert len(quest_cards) == 5, f"カード数は5つまでに制限されるべきです。実際: {len(quest_cards)}"
    
    print("最大カード数制限テスト完了")


def main():
    """メインテスト実行"""
    print("クエストカード機能テスト開始")
    print("=" * 50)
    
    try:
        test_quest_card_extraction()
        print()
        test_invalid_json()
        print()
        test_no_cards()
        print()
        test_max_cards_limit()
        print()
        print("=" * 50)
        print("全テスト完了！動的カード生成機能は正常に動作しています。")
        
    except Exception as e:
        print(f"テストでエラーが発生しました: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)