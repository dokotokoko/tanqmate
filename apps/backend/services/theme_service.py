# services/theme_service.py - テーマ探究ツール管理サービス

from typing import Dict, Any, List, Optional
import re
import logging
from fastapi import HTTPException, status
from .base import BaseService

logger = logging.getLogger(__name__)

class ThemeService(BaseService):
    """テーマ探究ツールを担当するサービスクラス"""
    
    def __init__(self, supabase_client, user_id: Optional[int] = None):
        super().__init__(supabase_client, user_id)
        self._check_llm_client()
    
    def get_service_name(self) -> str:
        return "ThemeService"
    
    def _check_llm_client(self) -> None:
        """LLMクライアント利用可能性チェック"""
        try:
            from module.llm_api import llm_client
            self.llm_client = llm_client
        except ImportError:
            self.llm_client = None
            self.logger.warning("LLM client not available")
    
    async def generate_theme_suggestions(
        self,
        theme: str,
        parent_theme: str,
        depth: int,
        path: List[str],
        user_interests: List[str] = None
    ) -> Dict[str, Any]:
        """探究テーマの深掘り提案を生成"""
        try:
            if self.llm_client is None:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="LLMクライアントが初期化されていません"
                )
            
            # プロンプト構築
            system_prompt_theme = """あなたは探究学習の専門家です。
生徒が持っているテーマに対して、より具体的で興味深い方向性を提案する役割があります。
提案は探究可能で高校生にとって理解可能で実行可能なものにしてください。"""
            
            # 深度に応じたガイダンス
            depth_guidance = (
                "より具体的な探究の切り口を示してください。" if depth >= 2 
                else "具体的な領域や側面に分けてください。"
            )
            
            # ユーザー興味の文脈
            interest_context = ""
            if user_interests:
                interest_context = f"\n生徒の興味関心: {', '.join(user_interests)}"
            
            # メインプロンプト
            user_prompt = f"""探究テーマ「{theme}」について、次のレベルの具体的な探究の方向性を5〜7個提案してください。

{depth_guidance}
{interest_context}

以下の形式で提案してください：
1. [提案内容]
2. [提案内容]
...

各提案は30文字以内で、生徒が興味を持ちやすい表現にしてください。"""
            
            # LLMへのリクエスト
            input_items = [
                self.llm_client.text("system", system_prompt_theme),
                self.llm_client.text("user", user_prompt)
            ]
            
            response = self.llm_client.generate_response(input_items)
            
            # 応答のパース
            suggestions = self._parse_suggestions(response)
            
            # 提案数の調整
            suggestions = self._adjust_suggestions_count(suggestions, theme)
            
            context_info = {
                "depth": depth,
                "suggestions_count": len(suggestions),
                "theme": theme,
                "parent_theme": parent_theme,
                "path": path
            }
            
            return {
                "suggestions": suggestions,
                "context_info": context_info
            }
            
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Generate theme suggestions")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def _parse_suggestions(self, response: str) -> List[str]:
        """LLM応答から提案を抽出"""
        suggestions = []
        
        for line in response.strip().split('\n'):
            match = re.match(r'^\d+\.\s*(.+)$', line.strip())
            if match:
                suggestion = match.group(1).strip()
                if suggestion and len(suggestion) <= 50:
                    suggestions.append(suggestion)
        
        return suggestions
    
    def _adjust_suggestions_count(self, suggestions: List[str], theme: str) -> List[str]:
        """提案数を5-7個に調整"""
        # 最低5個に満たない場合は補完
        if len(suggestions) < 5:
            default_suggestions = [
                f"{theme}の社会的影響",
                f"{theme}の技術的側面",
                f"{theme}と環境の関係",
                f"{theme}の歴史的背景",
                f"{theme}の未来予測"
            ]
            
            for ds in default_suggestions:
                if len(suggestions) >= 7:
                    break
                if ds not in suggestions:
                    suggestions.append(ds)
        
        # 最大7個に制限
        elif len(suggestions) > 7:
            suggestions = suggestions[:7]
        
        return suggestions
    
    async def save_theme_selection(
        self,
        user_id: int,
        theme: str,
        path: List[str] = None,
        parent_theme: str = None,
        depth: int = None,
        user_interests: List[str] = None
    ) -> Dict[str, Any]:
        """テーマ選択の保存"""
        try:
            if not theme:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="テーマが指定されていません"
                )
            
            # テーマ選択履歴をDBに保存
            selection_data = {
                "user_id": user_id,
                "theme": theme,
                "path": path or [],
                "parent_theme": parent_theme,
                "depth": depth or 1,
                "user_interests": user_interests or [],
                "selected_at": self._get_current_timestamp(),
                "created_at": self._get_current_timestamp()
            }
            
            # theme_selectionsテーブルに保存（存在する場合）
            try:
                result = self.supabase.table("theme_selections")\
                    .insert(selection_data)\
                    .execute()
                
                self.logger.info(f"Theme selection saved to database for user {user_id}: {theme}")
                
                return {
                    "message": "選択が保存されました",
                    "theme": theme,
                    "path": path or [],
                    "saved_to_db": True,
                    "selection_id": result.data[0]["id"] if result.data else None
                }
                
            except Exception as db_error:
                # DBに保存できない場合でもログは記録
                self.logger.info(f"User {user_id} selected theme: {theme}, path: {path}")
                self.logger.warning(f"Failed to save to database: {db_error}")
                
                return {
                    "message": "選択が記録されました",
                    "theme": theme,
                    "path": path or [],
                    "saved_to_db": False,
                    "note": "データベースへの保存は失敗しましたが、ログに記録されました"
                }
                
        except HTTPException:
            raise
        except Exception as e:
            error_result = self.handle_error(e, "Save theme selection")
            raise HTTPException(status_code=500, detail=error_result["error"])
    
    def get_theme_selection_history(
        self,
        user_id: int,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """ユーザーのテーマ選択履歴取得"""
        try:
            result = self.supabase.table("theme_selections")\
                .select("*")\
                .eq("user_id", user_id)\
                .order("selected_at", desc=True)\
                .limit(limit)\
                .execute()
            
            return [{
                "id": selection["id"],
                "theme": selection["theme"],
                "path": selection.get("path", []),
                "parent_theme": selection.get("parent_theme"),
                "depth": selection.get("depth", 1),
                "user_interests": selection.get("user_interests", []),
                "selected_at": selection["selected_at"],
                "created_at": selection["created_at"]
            } for selection in result.data]
            
        except Exception as e:
            self.logger.error(f"Failed to get theme history for user {user_id}: {e}")
            return []
    
    def get_popular_themes(self, limit: int = 10) -> List[Dict[str, Any]]:
        """人気テーマの統計取得"""
        try:
            # テーマ選択の集計
            result = self.supabase.table("theme_selections")\
                .select("theme")\
                .execute()
            
            # テーマ別のカウント
            theme_counts = {}
            for selection in result.data:
                theme = selection["theme"]
                theme_counts[theme] = theme_counts.get(theme, 0) + 1
            
            # 人気順にソート
            popular_themes = sorted(
                theme_counts.items(),
                key=lambda x: x[1],
                reverse=True
            )[:limit]
            
            return [{
                "theme": theme,
                "count": count,
                "rank": idx + 1
            } for idx, (theme, count) in enumerate(popular_themes)]
            
        except Exception as e:
            self.logger.error(f"Failed to get popular themes: {e}")
            return []
    
    def suggest_related_themes(self, theme: str, user_id: int = None) -> List[str]:
        """関連テーマの提案"""
        try:
            related_themes = []
            
            # 同じユーザーの過去選択から関連テーマを探す
            if user_id:
                user_history = self.get_theme_selection_history(user_id, limit=50)
                for selection in user_history:
                    if selection["theme"] != theme and selection["theme"] not in related_themes:
                        related_themes.append(selection["theme"])
            
            # 人気テーマから関連性の高そうなものを選ぶ
            popular_themes = self.get_popular_themes(20)
            for popular in popular_themes:
                if (popular["theme"] != theme and 
                    popular["theme"] not in related_themes and 
                    len(related_themes) < 10):
                    related_themes.append(popular["theme"])
            
            return related_themes[:10]
            
        except Exception as e:
            self.logger.error(f"Failed to suggest related themes: {e}")
            return []
    
    def get_theme_statistics(self, user_id: int = None) -> Dict[str, Any]:
        """テーマ選択統計"""
        try:
            stats = {
                "total_selections": 0,
                "unique_themes": 0,
                "average_depth": 0,
                "most_explored_theme": None
            }
            
            # 全体統計
            if user_id:
                # 特定ユーザーの統計
                result = self.supabase.table("theme_selections")\
                    .select("*")\
                    .eq("user_id", user_id)\
                    .execute()
            else:
                # 全体統計
                result = self.supabase.table("theme_selections")\
                    .select("*")\
                    .execute()
            
            if result.data:
                stats["total_selections"] = len(result.data)
                
                themes = [s["theme"] for s in result.data]
                stats["unique_themes"] = len(set(themes))
                
                depths = [s.get("depth", 1) for s in result.data if s.get("depth")]
                if depths:
                    stats["average_depth"] = sum(depths) / len(depths)
                
                # 最も探究されたテーマ
                if themes:
                    from collections import Counter
                    most_common = Counter(themes).most_common(1)
                    if most_common:
                        stats["most_explored_theme"] = {
                            "theme": most_common[0][0],
                            "count": most_common[0][1]
                        }
            
            return stats
            
        except Exception as e:
            self.logger.error(f"Failed to get theme statistics: {e}")
            return {
                "total_selections": 0,
                "unique_themes": 0,
                "average_depth": 0,
                "most_explored_theme": None,
                "error": str(e)
            }
    
    def _get_current_timestamp(self) -> str:
        """現在のタイムスタンプ取得"""
        from datetime import datetime, timezone
        return datetime.now(timezone.utc).isoformat()