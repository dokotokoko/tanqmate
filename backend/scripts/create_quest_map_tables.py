#!/usr/bin/env python3
"""
探Qマップ機能のデータベーステーブルを作成するスクリプト
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config.database import get_supabase_client
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_tables():
    """探Qマップ機能のテーブルを作成"""
    client = get_supabase_client()
    
    # SQLファイルを読み込み
    schema_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'schema', 'quest_map_schema.sql')
    
    if not os.path.exists(schema_file):
        logger.error(f"スキーマファイルが見つかりません: {schema_file}")
        return False
    
    with open(schema_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # SQLを個別のステートメントに分割
    statements = []
    current_statement = []
    
    for line in sql_content.split('\n'):
        # コメント行をスキップ
        if line.strip().startswith('--') or not line.strip():
            continue
        
        current_statement.append(line)
        
        # セミコロンで終わる場合、ステートメント完了
        if line.rstrip().endswith(';'):
            statements.append('\n'.join(current_statement))
            current_statement = []
    
    # 各ステートメントを実行
    success_count = 0
    error_count = 0
    
    for i, statement in enumerate(statements, 1):
        try:
            # Supabaseでは直接SQLを実行できないため、RPC関数を使用するか
            # Supabase Dashboardから実行する必要があります
            logger.info(f"ステートメント {i}/{len(statements)} を処理中...")
            
            # ここでは表示のみ
            if i <= 3:  # 最初の3つのステートメントを表示
                logger.info(f"SQL: {statement[:100]}...")
            
            success_count += 1
            
        except Exception as e:
            logger.error(f"ステートメント {i} の実行に失敗: {e}")
            error_count += 1
    
    logger.info(f"完了: 成功 {success_count}, エラー {error_count}")
    
    # テーブルの存在確認
    try:
        # quest_map_questsテーブルの確認
        result = client.table('quest_map_quests').select('id').limit(1).execute()
        logger.info("✅ quest_map_questsテーブルが存在します")
    except Exception as e:
        logger.error(f"❌ quest_map_questsテーブルが存在しません: {e}")
        logger.info("\n以下のSQLをSupabase Dashboardで実行してください:")
        logger.info("-" * 60)
        with open(schema_file, 'r', encoding='utf-8') as f:
            print(f.read())
        logger.info("-" * 60)
        return False
    
    return True

if __name__ == "__main__":
    logger.info("探Qマップのテーブル作成を開始します...")
    
    if create_tables():
        logger.info("✅ テーブル作成処理が完了しました")
    else:
        logger.error("❌ テーブル作成に失敗しました")
        logger.info("\nSupabase Dashboardから手動でSQLを実行してください:")
        logger.info("1. https://app.supabase.com にアクセス")
        logger.info("2. プロジェクトを選択")
        logger.info("3. SQL Editorを開く")
        logger.info("4. backend/schema/quest_map_schema.sql の内容を貼り付けて実行")
        sys.exit(1)