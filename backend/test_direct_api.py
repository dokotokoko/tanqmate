#!/usr/bin/env python3
"""
LLM APIとクエストカード抽出の直接テスト
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timezone

# プロジェクトルートディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.chat_service import ChatService
from module.llm_api import get_async_llm_client
from prompt.prompt import RESPONSE_STYLE_PROMPTS

async def test_llm_response():
    """LLMレスポンスを直接テスト"""
    print("=== LLM応答とクエストカード抽出テスト ===\n")
    
    # LLMクライアント初期化
    llm_client = get_async_llm_client(pool_size=1)
    
    # テスト用のシステムプロンプト（organize スタイル）
    system_prompt = RESPONSE_STYLE_PROMPTS["organize"]
    
    # テストメッセージ
    test_message = "探究学習のテーマを決めたいのですが、どのようなアプローチがありますか？"
    
    print(f"システムプロンプト（最初の200文字）:\n{system_prompt[:200]}...\n")
    print(f"ユーザーメッセージ: {test_message}\n")
    
    # LLMに送信
    input_items = [
        llm_client.text("system", system_prompt),
        llm_client.text("user", test_message)
    ]
    
    print("LLMに送信中...\n")
    response_obj = await llm_client.generate_response_async(input_items)
    
    # レスポンス内容を詳しく確認
    print("=== Response Object 詳細 ===")
    print(f"Type: {type(response_obj)}")
    print(f"Has output_text: {hasattr(response_obj, 'output_text')}")
    
    if hasattr(response_obj, 'output'):
        print(f"Output items count: {len(response_obj.output)}")
        for i, item in enumerate(response_obj.output):
            print(f"\nItem {i}:")
            print(f"  Type: {getattr(item, 'type', 'unknown')}")
            if hasattr(item, 'content'):
                for j, content in enumerate(item.content):
                    print(f"  Content {j}:")
                    print(f"    Type: {getattr(content, 'type', 'unknown')}")
                    if hasattr(content, 'text'):
                        text_preview = content.text[:100] if len(content.text) > 100 else content.text
                        print(f"    Text preview: {text_preview}...")
    
    # テキスト抽出
    response_text = llm_client.extract_output_text(response_obj)
    print(f"\n=== 抽出されたテキスト ===")
    print(f"文字数: {len(response_text)}")
    print(f"最初の500文字:\n{response_text[:500]}...\n")
    
    # JSONブロックの確認
    if "```json" in response_text:
        print("✅ JSONブロックが含まれています")
        json_start = response_text.find("```json")
        json_end = response_text.find("```", json_start + 7)
        if json_end > json_start:
            json_content = response_text[json_start:json_end+3]
            print(f"JSONブロック:\n{json_content}\n")
    else:
        print("❌ JSONブロックが見つかりません\n")
    
    # クエストカード抽出テスト
    print("=== クエストカード抽出 ===")
    chat_service = ChatService(None, 1)
    clean_response, quest_cards = chat_service._extract_quest_cards(response_text)
    
    print(f"クリーンな応答文字数: {len(clean_response)}")
    print(f"抽出されたカード数: {len(quest_cards)}")
    
    if quest_cards:
        print("\nカード詳細:")
        for i, card in enumerate(quest_cards, 1):
            print(f"{i}. ID: {card['id']}")
            print(f"   ラベル: {card['label']}")
            print(f"   絵文字: {card['emoji']}")
            print(f"   色: {card['color']}")
    else:
        print("⚠️ カードが抽出されませんでした")
    
    return response_text, quest_cards

async def main():
    """メインエントリーポイント"""
    print("テスト開始:", datetime.now().isoformat())
    print("="*60 + "\n")
    
    try:
        response_text, quest_cards = await test_llm_response()
        
        print("\n" + "="*60)
        print("テスト完了")
        
        if quest_cards:
            print("✅ クエストカードが正常に生成・抽出されました")
        else:
            print("⚠️ クエストカードの生成または抽出に問題があります")
            
    except Exception as e:
        print(f"\n❌ エラー発生: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)