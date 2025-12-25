"""
既存ユーザーをSupabase Authに移行するスクリプト
既存のusersテーブルからSupabase Authシステムへユーザーを移行
"""
import os
import sys
import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
import hashlib
import secrets

# 環境変数の読み込み
load_dotenv()

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Supabase設定
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

def get_supabase_admin_client() -> Client:
    """管理者権限のSupabaseクライアントを取得"""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise ValueError("SUPABASE_URLとSUPABASE_SERVICE_KEYの設定が必要です")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

class UserMigration:
    """ユーザー移行管理クラス"""
    
    def __init__(self):
        self.supabase = get_supabase_admin_client()
        self.migration_results = {
            "success": [],
            "failed": [],
            "skipped": []
        }
    
    async def get_existing_users(self) -> List[Dict[str, Any]]:
        """既存のusersテーブルからユーザーを取得"""
        try:
            logger.info("既存ユーザーの取得を開始...")
            result = self.supabase.table("users").select("*").execute()
            users = result.data if result.data else []
            logger.info(f"取得したユーザー数: {len(users)}")
            return users
        except Exception as e:
            logger.error(f"ユーザー取得エラー: {e}")
            return []
    
    async def check_auth_user_exists(self, email: str) -> bool:
        """Supabase Authに既にユーザーが存在するかチェック"""
        try:
            # 管理者APIでユーザーをメールで検索
            result = self.supabase.auth.admin.list_users()
            for user in result.users:
                if user.email == email:
                    return True
            return False
        except Exception as e:
            logger.error(f"Auth確認エラー: {e}")
            return False
    
    async def migrate_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """単一ユーザーをSupabase Authに移行"""
        username = user_data.get("username", "")
        user_id = user_data.get("id")
        
        # メールアドレスの生成（既存データにメールがない場合）
        email = user_data.get("email")
        if not email:
            # ユーザー名からメールアドレスを生成（仮のドメインを使用）
            email = f"{username}@tanqmate.local"
        
        try:
            # 既にAuth側に存在するかチェック
            if await self.check_auth_user_exists(email):
                logger.info(f"ユーザー {username} は既にAuth側に存在します（スキップ）")
                self.migration_results["skipped"].append({
                    "username": username,
                    "email": email,
                    "reason": "既に存在"
                })
                return {"status": "skipped", "username": username}
            
            # パスワードの処理
            # 既存のパスワードが平文の場合、一時的なランダムパスワードを生成
            temp_password = user_data.get("password")
            if not temp_password or len(temp_password) < 6:
                # セキュアなランダムパスワードを生成
                temp_password = secrets.token_urlsafe(16)
            
            # Supabase AuthでユーザーをAdmin APIで作成
            auth_user = self.supabase.auth.admin.create_user({
                "email": email,
                "password": temp_password,
                "email_confirm": True,  # メール確認をスキップ
                "user_metadata": {
                    "username": username,
                    "migrated_from": "legacy_system",
                    "original_id": user_id,
                    "migrated_at": datetime.utcnow().isoformat()
                },
                "app_metadata": {
                    "role": "user",  # デフォルトロール
                    "legacy_user": True
                }
            })
            
            if auth_user.user:
                logger.info(f"✅ ユーザー {username} の移行が完了しました")
                
                # 移行記録を保存
                self.migration_results["success"].append({
                    "username": username,
                    "email": email,
                    "auth_id": auth_user.user.id,
                    "temp_password": temp_password if user_data.get("password") != temp_password else None
                })
                
                # オプション: 元のusersテーブルにauth_idを記録
                self.supabase.table("users").update({
                    "auth_id": auth_user.user.id,
                    "migrated_at": datetime.utcnow().isoformat()
                }).eq("id", user_id).execute()
                
                return {
                    "status": "success",
                    "username": username,
                    "auth_id": auth_user.user.id
                }
            
        except Exception as e:
            logger.error(f"❌ ユーザー {username} の移行に失敗: {e}")
            self.migration_results["failed"].append({
                "username": username,
                "email": email,
                "error": str(e)
            })
            return {"status": "failed", "username": username, "error": str(e)}
    
    async def run_migration(self, dry_run: bool = False):
        """移行処理を実行"""
        logger.info("=" * 60)
        logger.info("Supabase Auth ユーザー移行を開始します")
        logger.info(f"モード: {'ドライラン' if dry_run else '本番実行'}")
        logger.info("=" * 60)
        
        # 既存ユーザーを取得
        users = await self.get_existing_users()
        
        if not users:
            logger.warning("移行対象のユーザーが見つかりません")
            return
        
        logger.info(f"移行対象ユーザー数: {len(users)}")
        
        if dry_run:
            logger.info("ドライランモード - 実際の移行は行いません")
            for user in users:
                logger.info(f"  - {user.get('username')} (ID: {user.get('id')})")
            return
        
        # 確認プロンプト
        print("\n" + "⚠️  警告 " + "⚠️" * 10)
        print("これから既存ユーザーをSupabase Authに移行します。")
        print("この操作は元に戻せません。")
        print(f"移行対象: {len(users)} ユーザー")
        print("-" * 50)
        
        confirmation = input("続行しますか？ (yes/no): ")
        if confirmation.lower() != "yes":
            logger.info("移行をキャンセルしました")
            return
        
        # 各ユーザーを移行
        for i, user in enumerate(users, 1):
            logger.info(f"\n[{i}/{len(users)}] 処理中: {user.get('username')}")
            await self.migrate_user(user)
            
            # レート制限対策（必要に応じて調整）
            await asyncio.sleep(0.5)
        
        # 結果サマリー
        self.print_summary()
    
    def print_summary(self):
        """移行結果のサマリーを表示"""
        print("\n" + "=" * 60)
        print("移行結果サマリー")
        print("=" * 60)
        
        print(f"✅ 成功: {len(self.migration_results['success'])} 件")
        if self.migration_results['success']:
            print("\n  移行成功ユーザー:")
            for user in self.migration_results['success'][:5]:
                print(f"    - {user['username']} ({user['email']})")
                if user.get('temp_password'):
                    print(f"      ⚠️  一時パスワード: {user['temp_password']}")
            if len(self.migration_results['success']) > 5:
                print(f"    ... 他 {len(self.migration_results['success']) - 5} 件")
        
        print(f"\n⏭️  スキップ: {len(self.migration_results['skipped'])} 件")
        if self.migration_results['skipped']:
            for user in self.migration_results['skipped'][:3]:
                print(f"    - {user['username']}: {user['reason']}")
        
        print(f"\n❌ 失敗: {len(self.migration_results['failed'])} 件")
        if self.migration_results['failed']:
            for user in self.migration_results['failed']:
                print(f"    - {user['username']}: {user['error']}")
        
        # 重要な注意事項
        if self.migration_results['success']:
            print("\n" + "⚠️  重要 " + "⚠️" * 10)
            print("以下の対応が必要です:")
            print("1. 一時パスワードが生成されたユーザーには、パスワードリセットを案内してください")
            print("2. メールアドレスが仮のもの（@tanqmate.local）の場合は、実際のメールアドレスに更新が必要です")
            print("3. フロントエンドの認証フローをSupabase Auth対応に更新してください")

async def main():
    """メイン実行関数"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Supabase Authへのユーザー移行")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="ドライランモード（実際の移行を行わない）"
    )
    args = parser.parse_args()
    
    migration = UserMigration()
    await migration.run_migration(dry_run=args.dry_run)

if __name__ == "__main__":
    asyncio.run(main())