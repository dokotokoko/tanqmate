# services/base.py - 基底サービスクラスと共通インターフェース

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from supabase import Client
import logging
import time

logger = logging.getLogger(__name__)

class BaseService(ABC):
    """全サービスクラスの基底クラス"""
    
    def __init__(self, supabase_client: Client, user_id: Optional[int] = None):
        self.supabase = supabase_client
        self.user_id = user_id
        self.logger = logger.getChild(self.__class__.__name__)
    
    def handle_error(self, error: Exception, operation: str) -> Dict[str, Any]:
        """共通エラーハンドリング"""
        error_message = f"{operation} failed: {str(error)}"
        self.logger.error(error_message)
        
        if "PGRST116" in str(error):
            return {"error": "The result contains 0 rows"}
        elif "duplicate key" in str(error).lower():
            return {"error": "Record already exists"}
        else:
            return {"error": error_message}
    
    @abstractmethod
    def get_service_name(self) -> str:
        """サービス名を取得"""
        pass

class DatabaseService(BaseService):
    """データベース操作専用サービス"""
    
    def execute_query(self, table: str, operation: str, data: Dict[str, Any] = None) -> Any:
        """安全なクエリ実行"""
        try:
            if operation == "select":
                return self.supabase.table(table).select("*").execute()
            elif operation == "insert" and data:
                return self.supabase.table(table).insert(data).execute()
            elif operation == "update" and data:
                return self.supabase.table(table).update(data).execute()
            elif operation == "delete":
                return self.supabase.table(table).delete().execute()
            else:
                raise ValueError(f"Unsupported operation: {operation}")
                
        except Exception as e:
            return self.handle_error(e, f"{operation} on {table}")

class CacheableService(BaseService):
    """キャッシュ機能を持つサービス"""
    
    def __init__(self, supabase_client: Client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        self._cache = {}
    
    def get_cached_result(self, cache_key: str) -> Optional[Any]:
        """キャッシュから結果を取得"""
        return self._cache.get(cache_key)
    
    def set_cached_result(self, cache_key: str, result: Any, ttl: int = 300) -> None:
        """結果をキャッシュに保存"""
        self._cache[cache_key] = {
            'data': result,
            'expires_at': time.time() + ttl
        }
    
    def clear_cache(self) -> None:
        """キャッシュをクリア"""
        self._cache.clear()

class ServiceManager:
    """サービスクラスの管理・依存注入"""
    
    def __init__(self, supabase_client: Client):
        self.supabase_client = supabase_client
        self._services = {}
    
    def get_service(self, service_class: type, user_id: Optional[int] = None) -> BaseService:
        """サービスインスタンスを取得（シングルトンパターン）"""
        service_key = f"{service_class.__name__}_{user_id or 'global'}"
        
        if service_key not in self._services:
            self._services[service_key] = service_class(self.supabase_client, user_id)
        
        return self._services[service_key]
    
    def clear_services(self) -> None:
        """全サービスインスタンスをクリア"""
        self._services.clear()