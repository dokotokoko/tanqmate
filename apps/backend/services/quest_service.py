# services/quest_service.py - クエストシステム管理サービス

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from fastapi import HTTPException, status
from .base import BaseService, CacheableService

class QuestService(CacheableService):
    """クエストシステムを担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
    
    def get_service_name(self) -> str:
        return "QuestService"
    
    def get_available_quests(
        self,
        category: Optional[str] = None,
        difficulty: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """利用可能なクエスト一覧を取得"""
        try:
            cache_key = f"quests_{category or 'all'}_{difficulty or 'all'}"
            cached_quests = self.get_cached_result(cache_key)
            
            if cached_quests:
                return cached_quests['data']
            
            query = self.supabase.table("quests").select("*").eq("is_active", True)
            
            if category:
                query = query.eq("category", category)
            if difficulty:
                query = query.eq("difficulty", difficulty)
            
            result = query.order("difficulty", desc=False).order("points", desc=False).execute()
            
            quests = [{
                "id": quest["id"],
                "title": quest["title"],
                "description": quest["description"],
                "category": quest["category"],
                "difficulty": quest["difficulty"],
                "points": quest["points"],
                "required_evidence": quest["required_evidence"],
                "icon_name": quest.get("icon_name"),
                "is_active": quest["is_active"],
                "created_at": quest["created_at"],
                "updated_at": quest["updated_at"]
            } for quest in result.data]
            
            self.set_cached_result(cache_key, quests, ttl=600)  # 10分
            
            return quests
            
        except Exception as e:
            error_result = self.handle_error(e, "Get available quests")
            self.logger.error(f"Failed to get quests: {e}")
            return []
    
    def get_quest_by_id(self, quest_id: int) -> Dict[str, Any]:
        """特定のクエスト詳細を取得"""
        try:
            cache_key = f"quest_{quest_id}"
            cached_quest = self.get_cached_result(cache_key)
            
            if cached_quest:
                return cached_quest['data']
            
            result = self.supabase.table("quests")\
                .select("*")\
                .eq("id", quest_id)\
                .eq("is_active", True)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="クエストが見つかりません")
            
            quest = result.data[0]
            quest_data = {
                "id": quest["id"],
                "title": quest["title"],
                "description": quest["description"],
                "category": quest["category"],
                "difficulty": quest["difficulty"],
                "points": quest["points"],
                "required_evidence": quest["required_evidence"],
                "icon_name": quest.get("icon_name"),
                "is_active": quest["is_active"],
                "created_at": quest["created_at"],
                "updated_at": quest["updated_at"]
            }
            
            self.set_cached_result(cache_key, quest_data, ttl=600)  # 10分
            
            return quest_data
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Get quest by ID")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_user_quests(
        self,
        user_id: int,
        status: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """ユーザーのクエスト進捗を取得"""
        try:
            cache_key = f"user_quests_{user_id}_{status or 'all'}"
            cached_quests = self.get_cached_result(cache_key)
            
            if cached_quests:
                return cached_quests['data']
            
            query = self.supabase.table("user_quests").select("""
                id, user_id, quest_id, status, progress, started_at, completed_at, created_at, updated_at,
                quests!user_quests_quest_id_fkey (
                    id, title, description, category, difficulty, points, required_evidence, icon_name, is_active, created_at, updated_at
                )
            """).eq("user_id", user_id)
            
            if status:
                query = query.eq("status", status)
            
            result = query.order("updated_at", desc=True).execute()
            
            user_quests = [{
                "id": uq["id"],
                "user_id": uq["user_id"],
                "quest_id": uq["quest_id"],
                "status": uq["status"],
                "progress": uq["progress"] or 0,
                "quest": {
                    "id": uq["quests"]["id"],
                    "title": uq["quests"]["title"],
                    "description": uq["quests"]["description"],
                    "category": uq["quests"]["category"],
                    "difficulty": uq["quests"]["difficulty"],
                    "points": uq["quests"]["points"],
                    "required_evidence": uq["quests"]["required_evidence"],
                    "icon_name": uq["quests"].get("icon_name"),
                    "is_active": uq["quests"]["is_active"],
                    "created_at": uq["quests"]["created_at"],
                    "updated_at": uq["quests"]["updated_at"]
                },
                "started_at": uq.get("started_at"),
                "completed_at": uq.get("completed_at"),
                "created_at": uq["created_at"],
                "updated_at": uq["updated_at"]
            } for uq in result.data]
            
            self.set_cached_result(cache_key, user_quests, ttl=300)  # 5分
            
            return user_quests
            
        except Exception as e:
            error_result = self.handle_error(e, "Get user quests")
            self.logger.error(f"Failed to get user quests for {user_id}: {e}")
            return []
    
    async def start_quest(self, user_id: int, quest_id: int) -> Dict[str, Any]:
        """クエストを開始"""
        try:
            # クエストが存在し、アクティブかチェック
            quest = self.get_quest_by_id(quest_id)
            
            # 既に開始済みかチェック
            existing_result = self.supabase.table("user_quests")\
                .select("id, status")\
                .eq("user_id", user_id)\
                .eq("quest_id", quest_id)\
                .execute()
            
            if existing_result.data:
                existing_quest = existing_result.data[0]
                if existing_quest["status"] == "completed":
                    raise HTTPException(status_code=400, detail="このクエストは既に完了しています")
                elif existing_quest["status"] == "in_progress":
                    raise HTTPException(status_code=400, detail="このクエストは既に進行中です")
                else:
                    # ステータスを更新
                    update_result = self.supabase.table("user_quests").update({
                        "status": "in_progress",
                        "started_at": datetime.now(timezone.utc).isoformat(),
                        "progress": 0,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }).eq("id", existing_quest["id"]).execute()
            else:
                # 新規作成
                update_result = self.supabase.table("user_quests").insert({
                    "user_id": user_id,
                    "quest_id": quest_id,
                    "status": "in_progress",
                    "started_at": datetime.now(timezone.utc).isoformat(),
                    "progress": 0,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }).execute()
            
            if not update_result.data:
                raise HTTPException(status_code=500, detail="クエストの開始に失敗しました")
            
            # キャッシュクリア
            self._clear_user_quest_cache(user_id)
            
            # 更新されたユーザークエストを取得
            result = self.supabase.table("user_quests").select("""
                id, user_id, quest_id, status, progress, started_at, completed_at, created_at, updated_at,
                quests!user_quests_quest_id_fkey (
                    id, title, description, category, difficulty, points, required_evidence, icon_name, is_active, created_at, updated_at
                )
            """).eq("id", update_result.data[0]["id"]).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="開始したクエストの取得に失敗しました")
            
            uq = result.data[0]
            return {
                "id": uq["id"],
                "user_id": uq["user_id"],
                "quest_id": uq["quest_id"],
                "status": uq["status"],
                "progress": uq["progress"] or 0,
                "quest": {
                    "id": uq["quests"]["id"],
                    "title": uq["quests"]["title"],
                    "description": uq["quests"]["description"],
                    "category": uq["quests"]["category"],
                    "difficulty": uq["quests"]["difficulty"],
                    "points": uq["quests"]["points"],
                    "required_evidence": uq["quests"]["required_evidence"],
                    "icon_name": uq["quests"].get("icon_name"),
                    "is_active": uq["quests"]["is_active"],
                    "created_at": uq["quests"]["created_at"],
                    "updated_at": uq["quests"]["updated_at"]
                },
                "started_at": uq.get("started_at"),
                "completed_at": uq.get("completed_at"),
                "created_at": uq["created_at"],
                "updated_at": uq["updated_at"]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Start quest")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    async def submit_quest(
        self,
        user_quest_id: int,
        user_id: int,
        description: str,
        file_url: Optional[str] = None,
        reflection_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """クエストの成果物を提出"""
        try:
            # ユーザークエストの存在確認
            uq_result = self.supabase.table("user_quests")\
                .select("id, user_id, quest_id, status")\
                .eq("id", user_quest_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not uq_result.data:
                raise HTTPException(status_code=404, detail="クエストが見つかりません")
            
            user_quest = uq_result.data[0]
            if user_quest["status"] != "in_progress":
                raise HTTPException(status_code=400, detail="進行中のクエストのみ提出可能です")
            
            # 既に提出済みかチェック
            existing_submission = self.supabase.table("quest_submissions")\
                .select("id")\
                .eq("user_quest_id", user_quest_id)\
                .execute()
            
            if existing_submission.data:
                raise HTTPException(status_code=400, detail="このクエストは既に提出済みです")
            
            # クエスト情報取得
            quest = self.get_quest_by_id(user_quest["quest_id"])
            
            # 提出記録作成
            submission_data = {
                "user_id": user_id,
                "user_quest_id": user_quest_id,
                "quest_id": user_quest["quest_id"],
                "description": description,
                "file_url": file_url,
                "reflection_data": reflection_data,
                "status": "submitted",
                "points_awarded": quest["points"],  # 基本ポイント付与
                "submitted_at": datetime.now(timezone.utc).isoformat()
            }
            
            submission_result = self.supabase.table("quest_submissions")\
                .insert(submission_data)\
                .execute()
            
            if not submission_result.data:
                raise HTTPException(status_code=500, detail="提出の記録に失敗しました")
            
            # ユーザークエストを完了状態に更新
            self.supabase.table("user_quests").update({
                "status": "completed",
                "progress": 100,
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }).eq("id", user_quest_id).execute()
            
            # キャッシュクリア
            self._clear_user_quest_cache(user_id)
            
            submission = submission_result.data[0]
            return {
                "id": submission["id"],
                "user_quest_id": submission["user_quest_id"],
                "quest_id": submission["quest_id"],
                "description": submission["description"],
                "file_url": submission.get("file_url"),
                "reflection_data": submission.get("reflection_data"),
                "status": submission["status"],
                "points_awarded": submission["points_awarded"],
                "submitted_at": submission["submitted_at"]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Submit quest")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_quest_submission(self, user_quest_id: int, user_id: int) -> Dict[str, Any]:
        """クエスト提出内容を取得"""
        try:
            cache_key = f"quest_submission_{user_quest_id}_{user_id}"
            cached_submission = self.get_cached_result(cache_key)
            
            if cached_submission:
                return cached_submission['data']
            
            result = self.supabase.table("quest_submissions")\
                .select("*")\
                .eq("user_quest_id", user_quest_id)\
                .eq("user_id", user_id)\
                .execute()
            
            if not result.data:
                raise HTTPException(status_code=404, detail="提出データが見つかりません")
            
            submission = result.data[0]
            submission_data = {
                "id": submission["id"],
                "user_quest_id": submission["user_quest_id"],
                "quest_id": submission["quest_id"],
                "description": submission["description"],
                "file_url": submission.get("file_url"),
                "reflection_data": submission.get("reflection_data"),
                "status": submission["status"],
                "points_awarded": submission["points_awarded"],
                "submitted_at": submission["submitted_at"]
            }
            
            self.set_cached_result(cache_key, submission_data, ttl=600)  # 10分
            
            return submission_data
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Get quest submission")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_quest_stats(self, user_id: int) -> Dict[str, Any]:
        """クエスト統計情報を取得"""
        try:
            cache_key = f"quest_stats_{user_id}"
            cached_stats = self.get_cached_result(cache_key)
            
            if cached_stats:
                return cached_stats['data']
            
            # ユーザーのクエスト統計
            user_quests = self.supabase.table("user_quests")\
                .select("status, quests!user_quests_quest_id_fkey(points)")\
                .eq("user_id", user_id)\
                .execute()
            
            total_quests = len(user_quests.data)
            completed_quests = len([uq for uq in user_quests.data if uq["status"] == "completed"])
            in_progress_quests = len([uq for uq in user_quests.data if uq["status"] == "in_progress"])
            
            available_quests_count = self.supabase.table("quests")\
                .select("id", count="exact")\
                .eq("is_active", True)\
                .execute().count or 0
            
            total_points = sum(
                uq["quests"]["points"] 
                for uq in user_quests.data 
                if uq["status"] == "completed" and uq.get("quests", {}).get("points")
            )
            
            stats = {
                "total_quests": total_quests,
                "available_quests": available_quests_count - total_quests,
                "completed_quests": completed_quests,
                "in_progress_quests": in_progress_quests,
                "total_points": total_points,
                "completion_rate": (completed_quests / total_quests * 100) if total_quests > 0 else 0
            }
            
            self.set_cached_result(cache_key, stats, ttl=300)  # 5分
            
            return stats
            
        except Exception as e:
            error_result = self.handle_error(e, "Get quest stats")
            self.logger.error(f"Failed to get quest stats for user {user_id}: {e}")
            return {
                "total_quests": 0,
                "available_quests": 0,
                "completed_quests": 0,
                "in_progress_quests": 0,
                "total_points": 0,
                "completion_rate": 0
            }
    
    def check_quest_tables(self) -> Dict[str, Any]:
        """クエスト関連テーブルの存在確認（デバッグ用）"""
        try:
            result = {}
            
            # questsテーブル確認
            try:
                quests_count = self.supabase.table("quests")\
                    .select("id", count="exact")\
                    .execute().count or 0
                result["quests"] = {"exists": True, "count": quests_count}
            except Exception as e:
                result["quests"] = {"exists": False, "error": str(e)}
            
            # user_questsテーブル確認
            try:
                user_quests_count = self.supabase.table("user_quests")\
                    .select("id", count="exact")\
                    .execute().count or 0
                result["user_quests"] = {"exists": True, "count": user_quests_count}
            except Exception as e:
                result["user_quests"] = {"exists": False, "error": str(e)}
            
            # quest_submissionsテーブル確認
            try:
                submissions_count = self.supabase.table("quest_submissions")\
                    .select("id", count="exact")\
                    .execute().count or 0
                result["quest_submissions"] = {"exists": True, "count": submissions_count}
            except Exception as e:
                result["quest_submissions"] = {"exists": False, "error": str(e)}
            
            return result
            
        except Exception as e:
            return {"error": f"Table check failed: {str(e)}"}
    
    def get_quest_recommendations(self, user_id: int, limit: int = 5) -> List[Dict[str, Any]]:
        """クエスト推薦取得"""
        try:
            # ユーザーの完了済みクエストを取得
            completed_quests = self.supabase.table("user_quests")\
                .select("quest_id")\
                .eq("user_id", user_id)\
                .eq("status", "completed")\
                .execute()
            
            completed_ids = [q["quest_id"] for q in completed_quests.data]
            
            # 未完了のアクティブクエストを取得
            query = self.supabase.table("quests")\
                .select("*")\
                .eq("is_active", True)
            
            if completed_ids:
                query = query.not_in("id", completed_ids)
            
            result = query.order("difficulty").order("points", desc=True).limit(limit).execute()
            
            return [{
                "id": quest["id"],
                "title": quest["title"],
                "description": quest["description"],
                "category": quest["category"],
                "difficulty": quest["difficulty"],
                "points": quest["points"],
                "recommendation_score": self._calculate_recommendation_score(quest, user_id)
            } for quest in result.data]
            
        except Exception as e:
            error_result = self.handle_error(e, "Get quest recommendations")
            self.logger.error(f"Failed to get recommendations for user {user_id}: {e}")
            return []
    
    def _calculate_recommendation_score(self, quest: Dict[str, Any], user_id: int) -> float:
        """推薦スコア計算（簡易版）"""
        # 難易度に基づく基本スコア
        base_score = 1.0 - (quest.get("difficulty", 3) / 10.0)
        
        # ポイントによるボーナス
        point_bonus = min(quest.get("points", 0) / 1000.0, 0.3)
        
        return min(base_score + point_bonus, 1.0)
    
    async def generate_quest(
        self,
        theme: str,
        difficulty: int = 3,
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """新しいクエスト生成（管理者用）"""
        try:
            quest_data = {
                "title": f"{theme}の探究",
                "description": f"{theme}について深く探究し、理解を深めましょう",
                "category": category or "exploration",
                "difficulty": min(max(difficulty, 1), 5),
                "points": difficulty * 100,
                "required_evidence": "探究成果のレポートまたはプレゼンテーション",
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            result = self.supabase.table("quests").insert(quest_data).execute()
            
            if not result.data:
                raise HTTPException(status_code=500, detail="クエスト生成に失敗しました")
            
            return result.data[0]
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Generate quest")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def _clear_user_quest_cache(self, user_id: int) -> None:
        """ユーザーのクエスト関連キャッシュクリア"""
        cache_keys = [key for key in self._cache.keys() 
                     if f"user_quests_{user_id}" in key or f"quest_stats_{user_id}" in key]
        
        for key in cache_keys:
            if key in self._cache:
                del self._cache[key]