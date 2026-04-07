# services/memo_service.py - メモ管理サービス

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import asyncio
from fastapi import HTTPException, status
from .base import BaseService, CacheableService

class MemoService(CacheableService):
    """メモ管理を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
    
    def get_service_name(self) -> str:
        return "MemoService"
    
    async def create_memo(
        self,
        user_id: int,
        project_id: int,
        title: Optional[str] = None,
        content: Optional[str] = None
    ) -> Dict[str, Any]:
        """メモ作成"""
        try:
            memo_data = {
                'user_id': user_id,
                'project_id': project_id,
                'title': title,
                'content': content,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.table('memos').insert(memo_data).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="メモの作成に失敗しました")
            
            # キャッシュクリア
            self._clear_user_memo_cache(user_id, project_id)
            
            memo = result.data[0]
            return {
                "id": memo['id'],
                "project_id": memo['project_id'],
                "title": memo.get('title'),
                "content": memo.get('content'),
                "created_at": memo.get('created_at'),
                "updated_at": memo.get('updated_at')
            }
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Create memo")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_user_memos(self, user_id: int) -> List[Dict[str, Any]]:
        """ユーザーの全メモ取得"""
        try:
            cache_key = f"user_memos_{user_id}"
            cached_memos = self.get_cached_result(cache_key)
            
            if cached_memos:
                return cached_memos['data']
            
            result = self.supabase.table("memos")\
                .select("id, title, content, project_id, created_at, updated_at")\
                .eq("user_id", user_id)\
                .order("updated_at", desc=True)\
                .execute()
            
            memos = [{
                "id": memo["id"],
                "project_id": memo.get("project_id"),
                "title": memo.get("title"),
                "content": memo.get("content"),
                "created_at": memo.get("created_at", datetime.now(timezone.utc).isoformat()),
                "updated_at": memo.get("updated_at", datetime.now(timezone.utc).isoformat())
            } for memo in result.data]
            
            self.set_cached_result(cache_key, memos, ttl=300)  # 5分
            
            return memos
            
        except Exception as e:
            error_result = self.handle_error(e, "Get user memos")
            self.logger.error(f"Failed to get memos for user {user_id}: {e}")
            return []
    
    def get_project_memos(self, user_id: int, project_id: int) -> List[Dict[str, Any]]:
        """プロジェクト内メモ一覧取得"""
        try:
            cache_key = f"project_memos_{project_id}_{user_id}"
            cached_memos = self.get_cached_result(cache_key)
            
            if cached_memos:
                return cached_memos['data']
            
            result = self.supabase.table('memos')\
                .select('id, title, content, project_id, created_at, updated_at')\
                .eq('project_id', project_id)\
                .eq('user_id', user_id)\
                .order('updated_at', desc=True)\
                .execute()
            
            memos = [{
                "id": memo['id'],
                "project_id": memo.get('project_id', project_id),
                "title": memo.get('title'),
                "content": memo.get('content'),
                "created_at": memo.get('created_at', datetime.now(timezone.utc).isoformat()),
                "updated_at": memo.get('updated_at', datetime.now(timezone.utc).isoformat())
            } for memo in result.data]
            
            self.set_cached_result(cache_key, memos, ttl=300)  # 5分
            
            return memos
            
        except Exception as e:
            error_result = self.handle_error(e, "Get project memos")
            self.logger.error(f"Failed to get memos for project {project_id}: {e}")
            return []
    
    def get_memo_by_id(self, memo_id: int, user_id: int) -> Dict[str, Any]:
        """特定メモ取得"""
        try:
            cache_key = f"memo_{memo_id}_{user_id}"
            cached_memo = self.get_cached_result(cache_key)
            
            if cached_memo:
                return cached_memo['data']
            
            self.logger.info(f"メモ取得開始: memo_id={memo_id}, user_id={user_id}")
            
            result = self.supabase.table('memos')\
                .select('id, title, content, project_id, created_at, updated_at')\
                .eq('id', memo_id)\
                .eq('user_id', user_id)\
                .execute()
            
            self.logger.info(f"データベースクエリ結果: count={result.count if result.count else 0}, data_length={len(result.data) if result.data else 0}")
            
            if not result.data:
                self.logger.warning(f"メモが見つかりません: memo_id={memo_id}, user_id={user_id}")
                raise HTTPException(status_code=404, detail="メモが見つかりません")
            
            memo = result.data[0]
            
            # フィールドの存在確認
            self.logger.info(f"メモデータ取得: keys={list(memo.keys())}")
            
            if 'id' not in memo:
                self.logger.error(f"メモIDが存在しません: {memo.keys()}")
                raise HTTPException(status_code=500, detail="メモデータの構造エラー")
            
            memo_data = {
                "id": memo['id'],
                "project_id": memo.get('project_id'),
                "title": memo.get('title'),
                "content": memo.get('content'),
                "created_at": memo.get('created_at', datetime.now(timezone.utc).isoformat()),
                "updated_at": memo.get('updated_at', datetime.now(timezone.utc).isoformat())
            }
            
            self.set_cached_result(cache_key, memo_data, ttl=600)  # 10分
            
            return memo_data
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Get memo by ID")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def update_memo(
        self,
        memo_id: int,
        user_id: int,
        title: Optional[str] = None,
        content: Optional[str] = None
    ) -> Dict[str, Any]:
        """メモ更新（最適化版）"""
        try:
            update_data = {}
            
            if title is not None:
                update_data['title'] = title
            if content is not None:
                update_data['content'] = content
            
            if not update_data:
                raise HTTPException(status_code=400, detail="更新するフィールドがありません")
            
            # タイムスタンプ追加
            update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
            
            # タイムアウト対策付きでの非同期更新
            try:
                result = await asyncio.wait_for(
                    asyncio.to_thread(
                        lambda: self.supabase.table('memos')\
                            .update(update_data)\
                            .eq('id', memo_id)\
                            .eq('user_id', user_id)\
                            .execute()
                    ),
                    timeout=30.0
                )
            except asyncio.TimeoutError:
                self.logger.error(f"メモ更新タイムアウト: memo_id={memo_id}, user_id={user_id}")
                raise HTTPException(status_code=504, detail="データベース更新がタイムアウトしました")
            
            if not result.data:
                raise HTTPException(status_code=404, detail="メモが見つかりません")
            
            # キャッシュクリア
            memo = self.get_memo_by_id(memo_id, user_id)  # 最新データ取得
            self._clear_memo_cache(memo_id, user_id, memo.get('project_id'))
            
            return memo
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Update memo")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def delete_memo(self, memo_id: int, user_id: int) -> Dict[str, str]:
        """メモ削除"""
        try:
            # 削除前にメモ情報を取得（キャッシュクリア用）
            memo_info = self.get_memo_by_id(memo_id, user_id)
            
            result = self.supabase.table('memos')\
                .delete()\
                .eq('id', memo_id)\
                .eq('user_id', user_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="メモが見つかりません")
            
            # キャッシュクリア
            self._clear_memo_cache(memo_id, user_id, memo_info.get('project_id'))
            
            return {"message": "メモが正常に削除されました"}
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Delete memo")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_memo_stats(self, user_id: int) -> Dict[str, Any]:
        """メモ統計情報取得"""
        try:
            # 総メモ数
            total_result = self.supabase.table('memos')\
                .select('id', count='exact')\
                .eq('user_id', user_id)\
                .execute()
            
            # プロジェクト別メモ数
            project_result = self.supabase.table('memos')\
                .select('project_id', count='exact')\
                .eq('user_id', user_id)\
                .not_.is_('project_id', 'null')\
                .execute()
            
            # 今月作成したメモ数
            from datetime import datetime, timezone
            current_month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            monthly_result = self.supabase.table('memos')\
                .select('id', count='exact')\
                .eq('user_id', user_id)\
                .gte('created_at', current_month_start.isoformat())\
                .execute()
            
            return {
                "total_memos": total_result.count or 0,
                "project_memos": project_result.count or 0,
                "standalone_memos": (total_result.count or 0) - (project_result.count or 0),
                "monthly_memos": monthly_result.count or 0
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get memo stats for user {user_id}: {e}")
            return {
                "total_memos": 0,
                "project_memos": 0,
                "standalone_memos": 0,
                "monthly_memos": 0
            }
    
    def _clear_memo_cache(self, memo_id: int, user_id: int, project_id: Optional[int] = None) -> None:
        """メモ関連キャッシュクリア"""
        cache_keys_to_clear = [
            f"memo_{memo_id}_{user_id}",
            f"user_memos_{user_id}"
        ]
        
        if project_id:
            cache_keys_to_clear.append(f"project_memos_{project_id}_{user_id}")
        
        for key in cache_keys_to_clear:
            if key in self._cache:
                del self._cache[key]
    
    def _clear_user_memo_cache(self, user_id: int, project_id: Optional[int] = None) -> None:
        """ユーザーのメモ関連キャッシュクリア"""
        cache_keys = [key for key in self._cache.keys() 
                     if f"user_{user_id}" in key or f"memos_{user_id}" in key]
        
        if project_id:
            cache_keys.extend([key for key in self._cache.keys() 
                              if f"project_memos_{project_id}" in key])
        
        for key in cache_keys:
            if key in self._cache:
                del self._cache[key]
    
    def search_memos(
        self,
        user_id: int,
        query: str,
        project_id: Optional[int] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """メモ検索"""
        try:
            search_query = self.supabase.table('memos')\
                .select('id, title, content, project_id, created_at, updated_at')\
                .eq('user_id', user_id)
            
            if project_id:
                search_query = search_query.eq('project_id', project_id)
            
            # タイトルまたはコンテンツで検索
            search_query = search_query.or_(f"title.ilike.%{query}%,content.ilike.%{query}%")
            
            result = search_query\
                .order('updated_at', desc=True)\
                .limit(limit)\
                .execute()
            
            return [{
                "id": memo['id'],
                "project_id": memo.get('project_id'),
                "title": memo.get('title'),
                "content": memo.get('content'),
                "created_at": memo.get('created_at'),
                "updated_at": memo.get('updated_at')
            } for memo in result.data]
            
        except Exception as e:
            error_result = self.handle_error(e, "Search memos")
            self.logger.error(f"Failed to search memos: {e}")
            return []