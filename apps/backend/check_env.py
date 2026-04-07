#!/usr/bin/env python3
"""
環境変数の設定状況を確認するスクリプト
"""

import os
from dotenv import load_dotenv

# .envファイルを読み込み
load_dotenv()

print("=== Supabase環境変数の確認 ===\n")

# 必要な環境変数のリスト
env_vars = {
    "SUPABASE_URL": "SupabaseプロジェクトのURL",
    "SUPABASE_SECRET_KEY": "バックエンド用のSecret Key（Service Role Key）", 
    "SUPABASE_PUBLISHABLE_KEY": "フロントエンド用のPublishable Key（Anon Key）",
    "VITE_SUPABASE_URL": "フロントエンド用のSupabase URL",
    "VITE_SUPABASE_PUBLISHABLE_KEY": "フロントエンド用のPublishable Key"
}

# 旧形式の環境変数（移行確認用）
old_env_vars = {
    "SUPABASE_ANON_KEY": "旧: Anon Key（SUPABASE_PUBLISHABLE_KEYに移行）",
    "SUPABASE_SERVICE_ROLE_KEY": "旧: Service Role Key（SUPABASE_SECRET_KEYに移行）",
    "VITE_SUPABASE_ANON_KEY": "旧: Vite用Anon Key（VITE_SUPABASE_PUBLISHABLE_KEYに移行）"
}

print("【新形式の環境変数】")
for key, desc in env_vars.items():
    value = os.environ.get(key)
    if value:
        # キーの一部を隠して表示
        if "KEY" in key:
            display_value = value[:10] + "..." + value[-10:] if len(value) > 20 else value
        else:
            display_value = value[:30] + "..." if len(value) > 30 else value
        print(f"  ✓ {key}: {display_value}")
    else:
        print(f"  ✗ {key}: 未設定 ({desc})")

print("\n【旧形式の環境変数の確認】")
for key, desc in old_env_vars.items():
    value = os.environ.get(key)
    if value:
        display_value = value[:10] + "..." + value[-10:] if len(value) > 20 else value
        print(f"  ⚠ {key}: まだ設定されています - {desc}")

print("\n【Supabaseクライアント初期化テスト】")
try:
    from supabase import create_client
    
    url = os.environ.get("SUPABASE_URL")
    secret_key = os.environ.get("SUPABASE_SECRET_KEY")
    
    if url and secret_key:
        print(f"  URL: {url}")
        print(f"  Secret Key: {secret_key[:10]}...{secret_key[-10:] if len(secret_key) > 20 else ''}")
        
        try:
            client = create_client(url, secret_key)
            print("  ✓ Supabaseクライアントの初期化に成功しました")
        except Exception as e:
            print(f"  ✗ Supabaseクライアントの初期化に失敗: {e}")
    else:
        print("  ✗ SUPABASE_URLまたはSUPABASE_SECRET_KEYが設定されていません")
        
except ImportError:
    print("  ✗ supabaseパッケージがインストールされていません")

print("\n【推奨事項】")
print("1. .envファイルに新形式の環境変数を設定してください")
print("2. 旧形式の環境変数は削除してください")
print("3. Secret Keyはバックエンド用、Publishable Keyはフロントエンド用です")
print("4. docker-compose.ymlも新形式の環境変数名を使用してください")