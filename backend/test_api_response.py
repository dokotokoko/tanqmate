#!/usr/bin/env python3
"""
APIレスポンステストスクリプト
実際のAPIエンドポイントにリクエストを送信してレスポンスを確認
"""

import requests
import json
import sys
import os
from datetime import datetime

# APIベースURL（環境変数から取得またはデフォルト）
API_BASE_URL = os.getenv("VITE_API_URL", "http://localhost:8000")

def test_chat_api():
    """チャットAPIのテスト"""
    print("=== チャットAPIテスト ===")
    print(f"API URL: {API_BASE_URL}/chat")
    print()
    
    # テスト用のトークン（実際のトークンに置き換える必要があります）
    # ローカルストレージから取得するか、環境変数から設定
    auth_token = os.getenv("AUTH_TOKEN", "")
    
    if not auth_token:
        print("警告: AUTH_TOKENが設定されていません。")
        print("環境変数 AUTH_TOKEN を設定するか、このスクリプトを編集してトークンを設定してください。")
        return
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    }
    
    # テストメッセージ
    test_messages = [
        {
            "message": "探究学習のテーマを決めたいのですが、どのようなアプローチがありますか？",
            "response_style": "organize"
        },
        {
            "message": "AIについて調べたいです",
            "response_style": "research"
        },
        {
            "message": "プロジェクトのアイデアを出してください",
            "response_style": "ideas"
        }
    ]
    
    for i, test_data in enumerate(test_messages, 1):
        print(f"\n--- テスト {i} ---")
        print(f"メッセージ: {test_data['message']}")
        print(f"応答スタイル: {test_data['response_style']}")
        
        payload = {
            "message": test_data["message"],
            "response_style": test_data["response_style"],
            "session_type": "general"
        }
        
        try:
            response = requests.post(
                f"{API_BASE_URL}/chat",
                headers=headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                
                print("\n✅ レスポンス成功:")
                print(f"  応答テキスト（最初の100文字）: {result.get('response', '')[:100]}...")
                
                # クエストカードをチェック
                quest_cards = result.get('quest_cards', [])
                print(f"\n  クエストカード数: {len(quest_cards)}")
                
                if quest_cards:
                    print("  クエストカード詳細:")
                    for j, card in enumerate(quest_cards, 1):
                        print(f"    {j}. ID: {card.get('id', 'N/A')}")
                        print(f"       ラベル: {card.get('label', 'N/A')}")
                        print(f"       絵文字: {card.get('emoji', 'N/A')}")
                        print(f"       色: {card.get('color', 'N/A')}")
                else:
                    print("  ⚠️ クエストカードが含まれていません")
                
                # メトリクス表示
                metrics = result.get('metrics', {})
                if metrics:
                    print(f"\n  メトリクス:")
                    print(f"    DB取得時間: {metrics.get('db_fetch_time', 0):.3f}秒")
                    print(f"    LLM応答時間: {metrics.get('llm_response_time', 0):.3f}秒")
                    print(f"    DB保存時間: {metrics.get('db_save_time', 0):.3f}秒")
                    print(f"    合計時間: {metrics.get('total_time', 0):.3f}秒")
                
            else:
                print(f"\n❌ エラー: ステータスコード {response.status_code}")
                print(f"  詳細: {response.text}")
                
        except requests.exceptions.Timeout:
            print("\n❌ タイムアウトエラー")
        except requests.exceptions.ConnectionError:
            print("\n❌ 接続エラー: APIサーバーが起動していることを確認してください")
        except Exception as e:
            print(f"\n❌ 予期しないエラー: {e}")
    
    print("\n" + "="*50)
    print("テスト完了")

def test_auth_and_get_token():
    """認証APIをテストしてトークンを取得"""
    print("=== 認証テスト（トークン取得） ===")
    
    # テスト用の認証情報（実際の値に置き換える必要があります）
    test_email = os.getenv("TEST_EMAIL", "test@example.com")
    test_password = os.getenv("TEST_PASSWORD", "password123")
    
    print(f"テストユーザー: {test_email}")
    
    try:
        # ログインリクエスト
        response = requests.post(
            f"{API_BASE_URL}/auth/login",
            json={
                "email": test_email,
                "password": test_password
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            token = result.get('access_token', '')
            print(f"✅ 認証成功")
            print(f"トークン（最初の20文字）: {token[:20]}...")
            return token
        else:
            print(f"❌ 認証失敗: {response.status_code}")
            print(f"詳細: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ エラー: {e}")
        return None

def main():
    """メイン実行"""
    print("APIレスポンステスト開始")
    print(f"現在時刻: {datetime.now().isoformat()}")
    print("="*50)
    
    # AUTH_TOKENが設定されていない場合は認証を試みる
    if not os.getenv("AUTH_TOKEN"):
        print("\nAUTH_TOKENが設定されていません。認証を試みます...")
        token = test_auth_and_get_token()
        if token:
            os.environ["AUTH_TOKEN"] = token
            print("\n認証トークンを取得しました。チャットAPIテストを続行します。")
        else:
            print("\n認証に失敗しました。")
            print("以下の環境変数を設定してください:")
            print("  - AUTH_TOKEN: 有効な認証トークン")
            print("  - TEST_EMAIL: テストユーザーのメールアドレス")
            print("  - TEST_PASSWORD: テストユーザーのパスワード")
            return 1
    
    print()
    test_chat_api()
    
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)