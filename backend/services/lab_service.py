# services/lab_service.py - 探Q LAB サービス（ユーザー統計・進捗・学習パーソナリティ分析）

from services.base import BaseService
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta, timezone
from collections import Counter
import logging

logger = logging.getLogger(__name__)

# 探究レポート完成に必要なステップ定義
INQUIRY_STEPS = [
    {"id": "theme", "label": "テーマ設定", "description": "探究テーマを決める", "icon": "🎯"},
    {"id": "question", "label": "問いの設定", "description": "リサーチクエスチョンを立てる", "icon": "❓"},
    {"id": "hypothesis", "label": "仮説の構築", "description": "仮説を立てて整理する", "icon": "💡"},
    {"id": "research", "label": "情報収集", "description": "文献やデータを集める", "icon": "📚"},
    {"id": "analysis", "label": "分析・考察", "description": "集めた情報を分析する", "icon": "🔬"},
    {"id": "conclusion", "label": "結論の導出", "description": "結論をまとめる", "icon": "📝"},
    {"id": "report", "label": "レポート作成", "description": "最終レポートを執筆する", "icon": "📄"},
    {"id": "presentation", "label": "発表準備", "description": "プレゼン資料を作成する", "icon": "🎤"},
]

# 学習パーソナリティ次元定義（MBTI風 4次元）
PERSONALITY_DIMENSIONS = {
    "exploration": {
        "pole_a": {"code": "E", "label": "探索型", "description": "広く多様なテーマを探る"},
        "pole_b": {"code": "S", "label": "専門型", "description": "一つのテーマを深く掘り下げる"},
    },
    "thinking": {
        "pole_a": {"code": "T", "label": "理論型", "description": "理論や概念から考える"},
        "pole_b": {"code": "P", "label": "実践型", "description": "実験や実例から学ぶ"},
    },
    "interaction": {
        "pole_a": {"code": "I", "label": "独立型", "description": "自分のペースで思考する"},
        "pole_b": {"code": "C", "label": "対話型", "description": "AIとの対話で思考を深める"},
    },
    "approach": {
        "pole_a": {"code": "R", "label": "創造型", "description": "新しいアイデアを生み出す"},
        "pole_b": {"code": "A", "label": "分析型", "description": "論理的に情報を整理する"},
    },
}

# パーソナリティタイプ名マッピング
PERSONALITY_TYPE_NAMES = {
    "ETIR": "ビジョナリー研究者",
    "ETIA": "戦略的アナリスト",
    "ETCR": "イノベーター",
    "ETCA": "理論家",
    "EPIR": "発明家",
    "EPIA": "データサイエンティスト",
    "EPCR": "クリエイティブリーダー",
    "EPCA": "実験家",
    "STIR": "先駆者",
    "STIA": "学術研究者",
    "STCR": "思想家",
    "STCA": "哲学者",
    "SPIR": "職人",
    "SPIA": "エンジニア",
    "SPCR": "アーティスト",
    "SPCA": "マイスター",
}


class LabService(BaseService):
    """探Q LAB サービス - ユーザーの学習活動を分析・可視化"""

    def get_service_name(self) -> str:
        return "LabService"

    # ─────────── 統計データ取得 ───────────
    def get_user_stats(self, user_id: int) -> Dict[str, Any]:
        """ユーザーの全体統計を取得"""
        try:
            # チャットログ件数
            chat_result = (
                self.supabase.table("chat_logs")
                .select("id, created_at, sender")
                .eq("user_id", user_id)
                .execute()
            )
            chat_logs = chat_result.data or []
            total_chats = len([c for c in chat_logs if c.get("sender") == "user"])
            total_ai_responses = len([c for c in chat_logs if c.get("sender") == "ai"])

            # プロジェクト件数
            project_result = (
                self.supabase.table("projects")
                .select("id, theme, question, hypothesis, created_at")
                .eq("user_id", user_id)
                .execute()
            )
            projects = project_result.data or []

            # メモ件数
            memo_result = (
                self.supabase.table("memos")
                .select("id, created_at, content")
                .eq("user_id", user_id)
                .execute()
            )
            memos = memo_result.data or []

            # 会話セッション数
            conv_result = (
                self.supabase.table("chat_conversations")
                .select("id, created_at")
                .eq("user_id", user_id)
                .execute()
            )
            conversations = conv_result.data or []

            # アクティビティ日数（チャットログの日付をユニークカウント）
            activity_dates = set()
            for log in chat_logs:
                if log.get("created_at"):
                    date_str = log["created_at"][:10]  # YYYY-MM-DD
                    activity_dates.add(date_str)

            # 推定プレイ時間（チャット数 × 平均3分 + メモ数 × 平均5分）
            estimated_minutes = total_chats * 3 + len(memos) * 5

            # メモの合計文字数
            total_memo_chars = sum(len(m.get("content", "")) for m in memos)

            # 直近7日のアクティビティ（ヒートマップ用）
            now = datetime.now(timezone.utc)
            weekly_activity = {}
            for i in range(28):  # 過去28日分
                date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
                weekly_activity[date] = 0

            for log in chat_logs:
                if log.get("created_at"):
                    date_str = log["created_at"][:10]
                    if date_str in weekly_activity:
                        weekly_activity[date_str] += 1

            # 日付順にソート
            sorted_activity = sorted(weekly_activity.items())

            return {
                "total_chats": total_chats,
                "total_ai_responses": total_ai_responses,
                "total_projects": len(projects),
                "total_memos": len(memos),
                "total_conversations": len(conversations),
                "activity_days": len(activity_dates),
                "estimated_play_minutes": estimated_minutes,
                "total_memo_chars": total_memo_chars,
                "activity_heatmap": [
                    {"date": date, "count": count} for date, count in sorted_activity
                ],
                "streak_days": self._calculate_streak(activity_dates),
            }

        except Exception as e:
            logger.error(f"ユーザー統計取得エラー: {e}")
            return {
                "total_chats": 0,
                "total_ai_responses": 0,
                "total_projects": 0,
                "total_memos": 0,
                "total_conversations": 0,
                "activity_days": 0,
                "estimated_play_minutes": 0,
                "total_memo_chars": 0,
                "activity_heatmap": [],
                "streak_days": 0,
            }

    def _calculate_streak(self, activity_dates: set) -> int:
        """連続活動日数を計算"""
        if not activity_dates:
            return 0

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        streak = 0
        current_date = datetime.now(timezone.utc)

        for i in range(365):
            date_str = (current_date - timedelta(days=i)).strftime("%Y-%m-%d")
            if date_str in activity_dates:
                streak += 1
            else:
                if i == 0:
                    continue  # 今日まだ活動してなくても昨日からカウント
                break

        return streak

    # ─────────── プロジェクト進捗データ ───────────
    def get_project_progress(self, user_id: int) -> List[Dict[str, Any]]:
        """全プロジェクトの進捗状況を取得"""
        try:
            # プロジェクト取得
            project_result = (
                self.supabase.table("projects")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            projects = project_result.data or []

            progress_list = []
            for project in projects:
                project_id = project["id"]

                # そのプロジェクトのメモ数
                memo_result = (
                    self.supabase.table("memos")
                    .select("id, title, content, created_at")
                    .eq("project_id", project_id)
                    .eq("user_id", user_id)
                    .execute()
                )
                memos = memo_result.data or []

                # そのプロジェクト関連のチャット数
                chat_result = (
                    self.supabase.table("chat_logs")
                    .select("id, context_data, created_at")
                    .eq("user_id", user_id)
                    .execute()
                )
                chats = chat_result.data or []
                project_chats = [
                    c for c in chats
                    if c.get("page_id") == str(project_id)
                ]

                # ステップ完了状況を推定
                steps = self._estimate_project_steps(project, memos, project_chats)

                completed_steps = len([s for s in steps if s["status"] == "completed"])
                total_steps = len(steps)

                progress_list.append({
                    "project_id": project_id,
                    "title": project.get("title") or project.get("theme", "無題のプロジェクト"),
                    "theme": project.get("theme", ""),
                    "created_at": project.get("created_at", ""),
                    "memo_count": len(memos),
                    "chat_count": len(project_chats),
                    "steps": steps,
                    "completion_rate": round(completed_steps / total_steps * 100) if total_steps > 0 else 0,
                })

            return progress_list

        except Exception as e:
            logger.error(f"プロジェクト進捗取得エラー: {e}")
            return []

    def _estimate_project_steps(
        self, project: Dict, memos: List[Dict], chats: List[Dict]
    ) -> List[Dict[str, Any]]:
        """プロジェクトのステップ完了状況を推定"""
        steps = []
        memo_texts = " ".join(m.get("content", "") + " " + m.get("title", "") for m in memos)
        chat_count = len(chats)
        memo_count = len(memos)

        for step_def in INQUIRY_STEPS:
            step = {
                "id": step_def["id"],
                "label": step_def["label"],
                "description": step_def["description"],
                "icon": step_def["icon"],
                "status": "pending",  # pending | in_progress | completed
            }

            # 各ステップの完了判定ロジック
            if step_def["id"] == "theme":
                if project.get("theme"):
                    step["status"] = "completed"

            elif step_def["id"] == "question":
                if project.get("question"):
                    step["status"] = "completed"
                elif chat_count >= 2:
                    step["status"] = "in_progress"

            elif step_def["id"] == "hypothesis":
                if project.get("hypothesis"):
                    step["status"] = "completed"
                elif any(kw in memo_texts for kw in ["仮説", "予想", "考え"]):
                    step["status"] = "in_progress"

            elif step_def["id"] == "research":
                if any(kw in memo_texts for kw in ["調査", "文献", "参考", "引用", "URL", "http"]):
                    if memo_count >= 3:
                        step["status"] = "completed"
                    else:
                        step["status"] = "in_progress"

            elif step_def["id"] == "analysis":
                if any(kw in memo_texts for kw in ["分析", "考察", "結果", "データ", "比較"]):
                    if memo_count >= 4:
                        step["status"] = "completed"
                    else:
                        step["status"] = "in_progress"

            elif step_def["id"] == "conclusion":
                if any(kw in memo_texts for kw in ["結論", "まとめ", "わかった", "明らかに"]):
                    step["status"] = "completed"
                elif memo_count >= 5:
                    step["status"] = "in_progress"

            elif step_def["id"] == "report":
                if any(kw in memo_texts for kw in ["レポート", "論文", "報告書"]):
                    step["status"] = "completed"
                elif memo_count >= 6:
                    step["status"] = "in_progress"

            elif step_def["id"] == "presentation":
                if any(kw in memo_texts for kw in ["発表", "プレゼン", "スライド"]):
                    step["status"] = "completed"

            steps.append(step)

        return steps

    # ─────────── 学習パーソナリティ分析 ───────────
    def get_learning_personality(self, user_id: int) -> Dict[str, Any]:
        """ユーザーの学習パーソナリティを分析（MBTI風4次元）"""
        try:
            # チャットログ取得（応答スタイル情報含む）
            chat_result = (
                self.supabase.table("chat_logs")
                .select("id, message, sender, context_data, created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(200)
                .execute()
            )
            chat_logs = chat_result.data or []

            user_messages = [c for c in chat_logs if c.get("sender") == "user"]
            all_messages_text = " ".join(c.get("message", "") for c in user_messages)

            # プロジェクト情報
            project_result = (
                self.supabase.table("projects")
                .select("id, theme, question, hypothesis")
                .eq("user_id", user_id)
                .execute()
            )
            projects = project_result.data or []

            # 応答スタイル使用頻度分析
            style_counter = Counter()
            for log in chat_logs:
                ctx = log.get("context_data") or {}
                if isinstance(ctx, dict):
                    style = ctx.get("response_style")
                    if style:
                        style_counter[style] += 1

            # 各次元のスコア計算（0-100, 50が中間）
            dimensions = {}

            # 次元1: 探索型(E) vs 専門型(S)
            exploration_score = self._calc_exploration_score(projects, user_messages, all_messages_text)
            dimensions["exploration"] = {
                "score": exploration_score,
                "pole": "E" if exploration_score >= 50 else "S",
                "label": PERSONALITY_DIMENSIONS["exploration"]["pole_a"]["label"]
                if exploration_score >= 50
                else PERSONALITY_DIMENSIONS["exploration"]["pole_b"]["label"],
            }

            # 次元2: 理論型(T) vs 実践型(P)
            thinking_score = self._calc_thinking_score(user_messages, all_messages_text, style_counter)
            dimensions["thinking"] = {
                "score": thinking_score,
                "pole": "T" if thinking_score >= 50 else "P",
                "label": PERSONALITY_DIMENSIONS["thinking"]["pole_a"]["label"]
                if thinking_score >= 50
                else PERSONALITY_DIMENSIONS["thinking"]["pole_b"]["label"],
            }

            # 次元3: 独立型(I) vs 対話型(C)
            interaction_score = self._calc_interaction_score(user_messages, chat_logs)
            dimensions["interaction"] = {
                "score": interaction_score,
                "pole": "I" if interaction_score >= 50 else "C",
                "label": PERSONALITY_DIMENSIONS["interaction"]["pole_a"]["label"]
                if interaction_score >= 50
                else PERSONALITY_DIMENSIONS["interaction"]["pole_b"]["label"],
            }

            # 次元4: 創造型(R) vs 分析型(A)
            approach_score = self._calc_approach_score(user_messages, all_messages_text, style_counter)
            dimensions["approach"] = {
                "score": approach_score,
                "pole": "R" if approach_score >= 50 else "A",
                "label": PERSONALITY_DIMENSIONS["approach"]["pole_a"]["label"]
                if approach_score >= 50
                else PERSONALITY_DIMENSIONS["approach"]["pole_b"]["label"],
            }

            # タイプコード生成
            type_code = (
                dimensions["exploration"]["pole"]
                + dimensions["thinking"]["pole"]
                + dimensions["interaction"]["pole"]
                + dimensions["approach"]["pole"]
            )

            type_name = PERSONALITY_TYPE_NAMES.get(type_code, "探究学習者")

            # レーダーチャート用スコア
            radar_scores = {
                "好奇心": min(100, len(user_messages) * 2 + len(projects) * 15),
                "論理力": self._keyword_score(all_messages_text, ["なぜ", "理由", "根拠", "論理", "because"]),
                "創造力": self._keyword_score(all_messages_text, ["アイデア", "新しい", "もし", "想像", "可能性"]),
                "持続力": min(100, self._calculate_streak(self._get_activity_dates(chat_logs)) * 10),
                "表現力": min(100, sum(len(m.get("message", "")) for m in user_messages) // max(len(user_messages), 1)),
                "探究力": min(100, style_counter.get("research", 0) * 5 + style_counter.get("deepen", 0) * 5),
            }

            return {
                "type_code": type_code,
                "type_name": type_name,
                "dimensions": dimensions,
                "radar_scores": radar_scores,
                "style_usage": dict(style_counter),
                "total_messages_analyzed": len(user_messages),
                "confidence": min(100, len(user_messages) * 2),  # 分析信頼度
            }

        except Exception as e:
            logger.error(f"学習パーソナリティ分析エラー: {e}")
            return {
                "type_code": "----",
                "type_name": "分析中...",
                "dimensions": {},
                "radar_scores": {},
                "style_usage": {},
                "total_messages_analyzed": 0,
                "confidence": 0,
            }

    def _calc_exploration_score(self, projects, user_messages, all_text) -> int:
        """探索型 vs 専門型スコア（高い=探索型）"""
        score = 50
        # 複数プロジェクト → 探索型
        score += min(20, len(projects) * 8)
        # 質問の多様性
        diverse_keywords = ["他に", "違う", "別の", "新しい", "他にも", "もっと", "さまざま"]
        score += sum(3 for kw in diverse_keywords if kw in all_text)
        # 集中キーワード → 専門型
        focus_keywords = ["詳しく", "もっと深く", "具体的に", "特に", "この部分"]
        score -= sum(3 for kw in focus_keywords if kw in all_text)
        return max(0, min(100, score))

    def _calc_thinking_score(self, user_messages, all_text, style_counter) -> int:
        """理論型 vs 実践型スコア（高い=理論型）"""
        score = 50
        theory_keywords = ["理論", "概念", "定義", "原理", "法則", "モデル", "フレームワーク"]
        practice_keywords = ["実験", "試す", "やってみ", "実際", "具体例", "事例", "データ"]
        score += sum(4 for kw in theory_keywords if kw in all_text)
        score -= sum(4 for kw in practice_keywords if kw in all_text)
        # organize スタイル → 理論型、research スタイル → 実践型
        score += style_counter.get("organize", 0) * 2
        score -= style_counter.get("research", 0) * 2
        return max(0, min(100, score))

    def _calc_interaction_score(self, user_messages, all_logs) -> int:
        """独立型 vs 対話型スコア（高い=独立型）"""
        score = 50
        if not user_messages:
            return score
        # 平均メッセージ長が長い → 独立型（自分で考えてから質問）
        avg_len = sum(len(m.get("message", "")) for m in user_messages) / len(user_messages)
        if avg_len > 100:
            score += 15
        elif avg_len < 30:
            score -= 15
        # 短時間に連続質問 → 対話型
        return max(0, min(100, score))

    def _calc_approach_score(self, user_messages, all_text, style_counter) -> int:
        """創造型 vs 分析型スコア（高い=創造型）"""
        score = 50
        creative_keywords = ["アイデア", "想像", "もし", "面白い", "新しい", "ユニーク", "クリエイティブ"]
        analytical_keywords = ["分析", "比較", "データ", "統計", "論理", "根拠", "証拠"]
        score += sum(4 for kw in creative_keywords if kw in all_text)
        score -= sum(4 for kw in analytical_keywords if kw in all_text)
        # ideas スタイル → 創造型
        score += style_counter.get("ideas", 0) * 3
        score += style_counter.get("expand", 0) * 2
        # deepen スタイル → 分析型
        score -= style_counter.get("deepen", 0) * 3
        return max(0, min(100, score))

    def _keyword_score(self, text: str, keywords: List[str]) -> int:
        """キーワード出現頻度からスコアを算出（0-100）"""
        count = sum(text.count(kw) for kw in keywords)
        return min(100, count * 8)

    def _get_activity_dates(self, chat_logs: List[Dict]) -> set:
        """チャットログからアクティビティ日付セットを取得"""
        dates = set()
        for log in chat_logs:
            if log.get("created_at"):
                dates.add(log["created_at"][:10])
        return dates
