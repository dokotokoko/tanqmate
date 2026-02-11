# services/vibes_tanq_service.py - Vibes 探Q機能サービス

import json
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from services.base import BaseService

class VibesTanqService(BaseService):
    """Vibes 探Q機能のビジネスロジック"""

    def __init__(self, supabase_client, user_id: int):
        super().__init__(supabase_client, user_id)

    def get_service_name(self) -> str:
        return "VibesTanqService"

    async def register_user_context(
        self, 
        user_id: int, 
        theme_text: str, 
        interest_tags: List[str], 
        vibes_actions: List[str]
    ) -> Dict[str, Any]:
        """ユーザーコンテキストの初期登録"""
        
        context_data = {
            "user_id": user_id,
            "theme_text": theme_text,
            "interest_tags": interest_tags,
            "vibes_actions": vibes_actions,
            "progress_stage": "初期設定完了",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # データベースに保存
        result = self.supabase.table("vibes_tanq_contexts").upsert(context_data).execute()
        
        # 初期ログを記録
        await self.log_user_event(
            user_id=user_id,
            event_type="register",
            target_type="context",
            target_id=str(user_id),
            context_snapshot=context_data
        )
        
        return result.data[0] if result.data else context_data

    def get_user_context(self, user_id: int) -> Dict[str, Any]:
        """ユーザーコンテキストの取得"""
        
        result = self.supabase.table("vibes_tanq_contexts")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()
        
        if not result.data:
            raise Exception("User context not found")
        
        return result.data[0]

    async def update_user_context(
        self, 
        user_id: int, 
        update_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """ユーザーコンテキストの更新"""
        
        update_data["updated_at"] = datetime.now().isoformat()
        
        result = self.supabase.table("vibes_tanq_contexts")\
            .update(update_data)\
            .eq("user_id", user_id)\
            .execute()
        
        return result.data[0] if result.data else {}

    async def generate_personalized_quests(
        self, 
        user_id: int, 
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """パーソナライズされたクエスト生成"""
        
        try:
            # ユーザーコンテキストを取得
            context = self.get_user_context(user_id)
            
            # LLMを使用してクエストを生成
            prompt = self._create_quest_generation_prompt(context)
            llm_response = await self._generate_llm_response(prompt)
            
            # 生成されたクエストを解析
            quests = self._parse_quest_response(llm_response)
            
            # デモ用のフォールバックデータ
            if not quests:
                quests = self._get_fallback_quests(context)
            
            return quests[:limit]
            
        except Exception as e:
            print(f"Quest generation error: {e}")
            # エラー時はフォールバックデータを返す
            context = {"theme_text": "探究学習", "interest_tags": ["一般"]}
            return self._get_fallback_quests(context)[:limit]

    async def generate_personalized_timeline(
        self, 
        user_id: int, 
        limit: int = 3
    ) -> List[Dict[str, Any]]:
        """パーソナライズされたタイムライン生成"""
        
        try:
            # ユーザーコンテキストを取得
            context = self.get_user_context(user_id)
            
            # LLMを使用してタイムライン情報を生成
            prompt = self._create_timeline_generation_prompt(context)
            llm_response = await self._generate_llm_response(prompt)
            
            # 生成されたタイムライン項目を解析
            timeline_items = self._parse_timeline_response(llm_response)
            
            # デモ用のフォールバックデータ
            if not timeline_items:
                timeline_items = self._get_fallback_timeline(context)
            
            return timeline_items[:limit]
            
        except Exception as e:
            print(f"Timeline generation error: {e}")
            # エラー時はフォールバックデータを返す
            context = {"theme_text": "探究学習", "interest_tags": ["一般"]}
            return self._get_fallback_timeline(context)[:limit]

    async def perform_quest_action(
        self, 
        user_id: int, 
        quest_id: str, 
        action: str,
        reflection: Optional[str] = None
    ) -> Dict[str, Any]:
        """クエストアクション実行"""
        
        # アクションログを記録
        action_data = {
            "user_id": user_id,
            "quest_id": quest_id,
            "action": action,
            "reflection": reflection,
            "timestamp": datetime.now().isoformat()
        }
        
        result = self.supabase.table("vibes_tanq_quest_actions").insert(action_data).execute()
        
        # ユーザーコンテキストを更新（アクションに応じて進捗段階を更新）
        if action == "complete":
            await self._update_progress_stage(user_id, quest_id)
        
        # ログイベントを記録
        await self.log_user_event(
            user_id=user_id,
            event_type=action,
            target_type="quest",
            target_id=quest_id,
            context_snapshot={"reflection": reflection}
        )
        
        return result.data[0] if result.data else action_data

    async def log_user_event(
        self, 
        user_id: int, 
        event_type: str, 
        target_type: str, 
        target_id: str,
        context_snapshot: Dict[str, Any] = None
    ):
        """ユーザーイベントログの記録"""
        
        log_data = {
            "user_id": user_id,
            "event_type": event_type,
            "target_type": target_type,
            "target_id": target_id,
            "context_snapshot": context_snapshot or {},
            "timestamp": datetime.now().isoformat()
        }
        
        self.supabase.table("vibes_tanq_logs").insert(log_data).execute()

    def get_user_analytics(self, user_id: int) -> Dict[str, Any]:
        """ユーザー分析データ取得"""
        
        # 基本統計
        context = self.get_user_context(user_id)
        
        # 過去30日のアクティビティ
        thirty_days_ago = (datetime.now() - timedelta(days=30)).isoformat()
        
        logs_result = self.supabase.table("vibes_tanq_logs")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("timestamp", thirty_days_ago)\
            .execute()
        
        quest_actions_result = self.supabase.table("vibes_tanq_quest_actions")\
            .select("*")\
            .eq("user_id", user_id)\
            .gte("timestamp", thirty_days_ago)\
            .execute()
        
        # 統計計算
        total_events = len(logs_result.data) if logs_result.data else 0
        completed_quests = len([a for a in quest_actions_result.data if a["action"] == "complete"]) if quest_actions_result.data else 0
        
        return {
            "user_context": context,
            "activity_stats": {
                "total_events": total_events,
                "completed_quests": completed_quests,
                "analysis_period": "30日間"
            },
            "engagement_score": min(100, (total_events * 5) + (completed_quests * 20))
        }

    # プライベートメソッド

    async def _generate_llm_response(self, prompt: str) -> str:
        """LLM応答生成"""
        try:
            # 非同期LLMクライアントを優先的に使用
            from module.llm_api import get_async_llm_client
            
            pool_size = int(os.environ.get("LLM_POOL_SIZE", "5"))
            llm_client = get_async_llm_client(pool_size=pool_size)
            
            if not llm_client:
                raise Exception("Async LLM client not available")
            
            # LLMにリクエストを送信
            input_items = [
                llm_client.text("user", prompt)
            ]
            response_obj = await llm_client.generate_response_async(input_items)
            
            # Response APIのoutput_textを取得
            response = llm_client.extract_output_text(response_obj)
            return response
            
        except Exception as e:
            # フォールバック: 同期LLMクライアント
            try:
                from module.llm_api import learning_plannner
                import asyncio
                
                llm_instance = learning_plannner()
                input_items = [
                    llm_instance.text("user", prompt)
                ]
                
                response_obj = await asyncio.get_event_loop().run_in_executor(
                    None,
                    llm_instance.generate_response,
                    input_items
                )
                
                response = llm_instance.extract_output_text(response_obj)
                return response
                
            except Exception as fallback_e:
                print(f"LLM generation error (async: {e}, sync: {fallback_e})")
                raise Exception("All LLM processing methods failed")

    def _create_quest_generation_prompt(self, context: Dict[str, Any]) -> str:
        """クエスト生成用プロンプト作成"""
        
        theme = context.get("theme_text", "")
        tags = ", ".join(context.get("interest_tags", []))
        vibes = ", ".join(context.get("vibes_actions", []))
        
        return f"""
高校生向けの探究学習支援クエストを生成してください。

ユーザー情報:
- 探究テーマ: {theme}
- 興味タグ: {tags}
- 好きな活動: {vibes}

以下の条件でクエストを3つ生成してください:
1. 15-30分で完了できる小さなタスク
2. 高校生が「面白そう」と感じる内容
3. 探究テーマに関連している
4. 段階的に難しくなる構成

JSON形式で以下の形式で回答してください:
{{"quests": [{{"id": "1", "title": "タイトル", "description": "説明", "estimated_time": "15分", "difficulty": "easy", "category": "カテゴリ", "points": 10}}]}}
"""

    def _create_timeline_generation_prompt(self, context: Dict[str, Any]) -> str:
        """タイムライン生成用プロンプト作成"""
        
        theme = context.get("theme_text", "")
        tags = ", ".join(context.get("interest_tags", []))
        
        return f"""
高校生の探究学習に関連するタイムライン情報を生成してください。

ユーザー情報:
- 探究テーマ: {theme}
- 興味タグ: {tags}

以下の条件でタイムライン項目を3つ生成してください:
1. 最新のニュースや事例
2. 高校生にとって参考になる内容
3. 探究テーマに関連している
4. 多様な情報源（ニュース、事例研究、トレンド）

JSON形式で以下の形式で回答してください:
{{"timeline": [{{"id": "1", "type": "news", "title": "タイトル", "summary": "要約", "source": "情報源", "published_at": "2024-01-05", "tags": ["タグ1", "タグ2"]}}]}}
"""

    def _parse_quest_response(self, llm_response: str) -> List[Dict[str, Any]]:
        """LLM応答からクエストを解析"""
        
        try:
            response_json = json.loads(llm_response)
            return response_json.get("quests", [])
        except:
            return []

    def _parse_timeline_response(self, llm_response: str) -> List[Dict[str, Any]]:
        """LLM応答からタイムライン項目を解析"""
        
        try:
            response_json = json.loads(llm_response)
            return response_json.get("timeline", [])
        except:
            return []

    def _get_fallback_quests(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """フォールバッククエストデータ"""
        
        theme = context.get("theme_text", "探究テーマ")
        
        return [
            {
                "id": "fallback_1",
                "title": f"{theme}について、1番「なんとかしたい」と思ったことを1つ選ぶ",
                "description": "自分の中で最も解決したいと感じる具体的な問題を明確にしてみましょう。",
                "estimated_time": "15分",
                "difficulty": "easy",
                "category": "問題の焦点化",
                "points": 10,
                "status": "not_started"
            },
            {
                "id": "fallback_2",
                "title": "身近な人3人にテーマについてインタビューしてみる",
                "description": "家族や友人に、あなたの探究テーマについてどう思うか聞いてみましょう。",
                "estimated_time": "30分",
                "difficulty": "medium",
                "category": "情報収集",
                "points": 20,
                "status": "not_started"
            },
            {
                "id": "fallback_3",
                "title": "テーマに関連する現地調査を計画する",
                "description": "実際の現場を見学したり、関係者にインタビューする計画を立てましょう。",
                "estimated_time": "45分",
                "difficulty": "hard",
                "category": "現地調査",
                "points": 30,
                "status": "not_started"
            }
        ]

    def _get_fallback_timeline(self, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """フォールバックタイムラインデータ"""
        
        theme = context.get("theme_text", "探究テーマ")
        tags = context.get("interest_tags", ["一般"])
        
        return [
            {
                "id": "timeline_1",
                "type": "news",
                "title": f"{theme}に関連する最新の取り組み",
                "summary": "最近の社会課題解決に向けた新しいアプローチが注目されています。",
                "source": "探究ニュース",
                "published_at": "2024-01-05",
                "tags": tags[:2],
                "url": "#"
            },
            {
                "id": "timeline_2",
                "type": "case_study",
                "title": "高校生による課題解決事例",
                "summary": "全国の高校生が取り組んでいる探究プロジェクトの成功事例を紹介します。",
                "source": "探究学習事例集",
                "published_at": "2024-01-04",
                "tags": ["高校生", "事例研究"],
                "url": "#"
            },
            {
                "id": "timeline_3",
                "type": "trending",
                "title": "探究学習で身につく21世紀型スキル",
                "summary": "探究学習を通じて開発される重要なスキルと将来への活かし方について。",
                "source": "教育研究所",
                "published_at": "2024-01-03",
                "tags": ["スキル開発", "将来設計"],
                "url": "#"
            }
        ]

    async def _update_progress_stage(self, user_id: int, quest_id: str):
        """クエスト完了に応じて進捗段階を更新"""
        
        # クエストカテゴリに応じて進捗段階を推定
        # 実際のシステムでは、より詳細な分析を行う
        
        await self.update_user_context(user_id, {
            "progress_stage": "活動中",
            "last_quest_completed": quest_id,
            "last_activity": datetime.now().isoformat()
        })