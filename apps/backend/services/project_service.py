# services/project_service.py - プロジェクト管理サービス

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException
from .base import BaseService, CacheableService

class ProjectService(CacheableService):
    """プロジェクト管理を担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
    
    def get_service_name(self) -> str:
        return "ProjectService"
    
    async def create_project(
        self,
        user_id: int,
        theme: str,
        question: Optional[str] = None,
        hypothesis: Optional[str] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[str] = None
    ) -> Dict[str, Any]:
        """プロジェクト作成"""
        try:
            project_data = {
                "user_id": user_id,
                "theme": theme,
                "question": question,
                "hypothesis": hypothesis,
                "title": title,
                "description": description,
                "tags": tags,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.table("projects").insert(project_data).execute()
            
            if not result.data:
                raise HTTPException(status_code=400, detail="Project creation failed")
            
            # キャッシュクリア
            self.clear_user_project_cache(user_id)
            
            return {
                "id": result.data[0]["id"],
                "theme": result.data[0]["theme"],
                "question": result.data[0]["question"],
                "hypothesis": result.data[0]["hypothesis"],
                "title": result.data[0]["title"],
                "description": result.data[0]["description"],
                "tags": result.data[0]["tags"],
                "created_at": result.data[0]["created_at"],
                "updated_at": result.data[0]["updated_at"]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Create project")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_user_projects(self, user_id: int) -> List[Dict[str, Any]]:
        """ユーザーのプロジェクト一覧取得"""
        try:
            cache_key = f"user_projects_{user_id}"
            cached_projects = self.get_cached_result(cache_key)
            
            if cached_projects:
                return cached_projects['data']
            
            result = self.supabase.table("projects")\
                .select("id, theme, question, hypothesis, title, description, tags, created_at, updated_at")\
                .eq("user_id", user_id)\
                .order("updated_at", desc=True)\
                .execute()
            
            projects = [{
                "id": project["id"],
                "theme": project["theme"],
                "question": project["question"],
                "hypothesis": project["hypothesis"],
                "title": project["title"],
                "description": project["description"],
                "tags": project["tags"],
                "created_at": project["created_at"],
                "updated_at": project["updated_at"]
            } for project in result.data]
            
            self.set_cached_result(cache_key, projects, ttl=300)  # 5分
            
            return projects
            
        except Exception as e:
            error_result = self.handle_error(e, "Get user projects")
            self.logger.error(f"Failed to get projects for user {user_id}: {e}")
            return []
    
    def get_project_by_id(self, project_id: int, user_id: int) -> Dict[str, Any]:
        """プロジェクト詳細取得"""
        try:
            cache_key = f"project_{project_id}_{user_id}"
            cached_project = self.get_cached_result(cache_key)
            
            if cached_project:
                return cached_project['data']
            
            result = self.supabase.table("projects")\
                .select("id, theme, question, hypothesis, title, description, tags, created_at, updated_at")\
                .eq("id", project_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="Project not found")
            
            project = result.data[0]
            project_data = {
                "id": project["id"],
                "theme": project["theme"],
                "question": project["question"],
                "hypothesis": project["hypothesis"],
                "title": project["title"],
                "description": project["description"],
                "tags": project["tags"],
                "created_at": project["created_at"],
                "updated_at": project["updated_at"]
            }
            
            self.set_cached_result(cache_key, project_data, ttl=600)  # 10分
            
            return project_data
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Get project")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def update_project(
        self,
        project_id: int,
        user_id: int,
        theme: Optional[str] = None,
        question: Optional[str] = None,
        hypothesis: Optional[str] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
        tags: Optional[str] = None
    ) -> Dict[str, Any]:
        """プロジェクト更新"""
        try:
            # プロジェクトの存在と所有者確認
            existing_project = self.get_project_by_id(project_id, user_id)
            
            # 更新データ構築
            update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
            
            if theme is not None:
                update_data["theme"] = theme
            if question is not None:
                update_data["question"] = question
            if hypothesis is not None:
                update_data["hypothesis"] = hypothesis
            if title is not None:
                update_data["title"] = title
            if description is not None:
                update_data["description"] = description
            if tags is not None:
                update_data["tags"] = tags
            
            result = self.supabase.table("projects")\
                .update(update_data)\
                .eq("id", project_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="Project not found or update failed")
            
            # キャッシュクリア
            self.clear_project_cache(project_id, user_id)
            
            return {
                "id": result.data[0]["id"],
                "theme": result.data[0]["theme"],
                "question": result.data[0]["question"],
                "hypothesis": result.data[0]["hypothesis"],
                "title": result.data[0]["title"],
                "description": result.data[0]["description"],
                "tags": result.data[0]["tags"],
                "created_at": result.data[0]["created_at"],
                "updated_at": result.data[0]["updated_at"]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Update project")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def delete_project(self, project_id: int, user_id: int) -> Dict[str, str]:
        """プロジェクト削除"""
        try:
            # プロジェクト存在確認
            self.get_project_by_id(project_id, user_id)
            
            # 関連データ削除
            await self._delete_project_related_data(project_id)
            
            # プロジェクト削除
            result = self.supabase.table("projects")\
                .delete()\
                .eq("id", project_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="Project not found or delete failed")
            
            # キャッシュクリア
            self.clear_project_cache(project_id, user_id)
            
            return {"message": "Project deleted successfully"}
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Delete project")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_project_context(self, project_id: int, user_id: int) -> str:
        """プロジェクトコンテキスト取得（AI用）"""
        try:
            cache_key = f"project_context_{project_id}_{user_id}"
            cached_context = self.get_cached_result(cache_key)
            
            if cached_context:
                return cached_context['data']
            
            # プロジェクト基本情報
            project = self.get_project_by_id(project_id, user_id)
            
            # プロジェクト関連メモ取得
            memos_result = self.supabase.table("multi_memos")\
                .select("title, content")\
                .eq("project_id", project_id)\
                .order("created_at", desc=True)\
                .limit(10)\
                .execute()
            
            # コンテキスト構築
            context_parts = [
                f"テーマ: {project['theme']}"
            ]
            
            if project.get('question'):
                context_parts.append(f"問い: {project['question']}")
            if project.get('hypothesis'):
                context_parts.append(f"仮説: {project['hypothesis']}")
            if project.get('title'):
                context_parts.append(f"タイトル: {project['title']}")
            if project.get('description'):
                context_parts.append(f"説明: {project['description']}")
            if project.get('tags'):
                context_parts.append(f"タグ: {project['tags']}")
            
            if memos_result.data:
                memo_texts = [f"- {memo['title']}: {memo['content'][:100]}..." 
                             for memo in memos_result.data]
                context_parts.append(f"関連メモ:\n" + "\n".join(memo_texts))
            
            context = "\n".join(context_parts)
            
            self.set_cached_result(cache_key, context, ttl=600)  # 10分
            
            return context
            
        except Exception as e:
            self.logger.error(f"Failed to get project context: {e}")
            return f"テーマ: {project_id} (詳細情報の取得に失敗)"
    
    async def _delete_project_related_data(self, project_id: int) -> None:
        """プロジェクト関連データ削除"""
        try:
            # メモ削除
            self.supabase.table("multi_memos")\
                .delete()\
                .eq("project_id", project_id)\
                .execute()
            
            # その他の関連データも必要に応じて削除
            # (チャットログ、ファイルなど)
            
        except Exception as e:
            self.logger.warning(f"Failed to delete related data for project {project_id}: {e}")
    
    def clear_project_cache(self, project_id: int, user_id: int) -> None:
        """プロジェクト関連キャッシュクリア"""
        cache_keys_to_clear = [
            f"project_{project_id}_{user_id}",
            f"project_context_{project_id}_{user_id}",
            f"user_projects_{user_id}"
        ]
        
        for key in cache_keys_to_clear:
            if key in self._cache:
                del self._cache[key]
    
    def clear_user_project_cache(self, user_id: int) -> None:
        """ユーザーのプロジェクト関連キャッシュクリア"""
        cache_keys = [key for key in self._cache.keys() 
                     if f"user_{user_id}" in key or f"projects_{user_id}" in key]
        
        for key in cache_keys:
            del self._cache[key]