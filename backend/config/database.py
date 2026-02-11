# config/database.py - データベース設定とSupabaseクライアント

import os
import logging
from typing import Optional
from supabase import Client, create_client
from dotenv import load_dotenv

# 環境変数読み込み
load_dotenv()

logger = logging.getLogger(__name__)

# グローバルクライアントインスタンス
_supabase_client: Optional[Client] = None

def get_supabase_client() -> Client:
    """
    Supabaseクライアントのシングルトンインスタンスを取得
    
    Returns:
        Client: Supabaseクライアント
        
    Raises:
        ValueError: 環境変数が設定されていない場合
        Exception: クライアント作成に失敗した場合
    """
    global _supabase_client
    
    if _supabase_client is None:
        supabase_url = os.environ.get("SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_ANON_KEY")
        
        if not supabase_url:
            raise ValueError("SUPABASE_URL環境変数が設定されていません")
        if not supabase_key:
            raise ValueError("SUPABASE_ANON_KEY環境変数が設定されていません")
        
        try:
            _supabase_client = create_client(supabase_url, supabase_key)
            logger.info("✅ Supabaseクライアント初期化完了")
        except Exception as e:
            logger.error(f"❌ Supabaseクライアント初期化失敗: {e}")
            raise
    
    return _supabase_client


def reset_supabase_client() -> None:
    """
    Supabaseクライアントをリセット（テスト用）
    """
    global _supabase_client
    _supabase_client = None


class DatabaseConfig:
    """データベース設定クラス"""
    
    def __init__(self):
        self.supabase_url = os.environ.get("SUPABASE_URL")
        self.supabase_key = os.environ.get("SUPABASE_ANON_KEY")
        self.supabase_service_key = os.environ.get("SUPABASE_SERVICE_KEY")  # 管理者操作用
    
    def validate(self) -> bool:
        """
        設定値の検証
        
        Returns:
            bool: 設定が有効かどうか
        """
        if not self.supabase_url:
            logger.error("❌ SUPABASE_URL環境変数が設定されていません")
            return False
        
        if not self.supabase_key:
            logger.error("❌ SUPABASE_ANON_KEY環境変数が設定されていません")
            return False
        
        return True
    
    def get_connection_info(self) -> dict:
        """
        接続情報を取得（ログ出力用）
        
        Returns:
            dict: 接続情報（センシティブ情報はマスク）
        """
        return {
            "supabase_url": self.supabase_url,
            "supabase_key": f"***{self.supabase_key[-4:]}" if self.supabase_key else None,
            "has_service_key": bool(self.supabase_service_key)
        }


# 設定インスタンス
db_config = DatabaseConfig()

# 初期化時の設定検証
if not db_config.validate():
    logger.warning("⚠️ データベース設定が不完全です。一部の機能が利用できない可能性があります。")
else:
    logger.info(f"✅ データベース設定確認完了: {db_config.get_connection_info()}")