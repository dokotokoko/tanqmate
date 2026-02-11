# backend/prompts/quest_map_prompts.py - 探Qマップ用最適化プロンプト

from typing import Dict, List, Any, Optional
from enum import Enum
import json

class PromptCategory(Enum):
    """プロンプトカテゴリ"""
    GENERATION = "generation"     # ノード生成
    BREAKDOWN = "breakdown"       # ノード細分化
    EXPANSION = "expansion"       # ノード拡散
    RECOMMENDATION = "recommendation"  # 推奨
    CONSULTATION = "consultation" # AIチャット相談


class PersonaType(Enum):
    """ユーザーペルソナタイプ"""
    BEGINNER = "beginner"         # 初心者
    INTERMEDIATE = "intermediate" # 中級者
    ADVANCED = "advanced"         # 上級者
    CREATIVE = "creative"         # 創造的
    ANALYTICAL = "analytical"     # 分析的
    PRACTICAL = "practical"       # 実践的


class QuestMapPrompts:
    """探Qマップ用プロンプトクラス"""

    # ===== 基本システムプロンプト =====
    
    BASE_SYSTEM_PROMPTS = {
        PromptCategory.GENERATION: """あなたは、高校生の探究学習をサポートする「探Qメイト」のアクション提案エンジンです。
生徒は「何をすればよいんだろう」と困っていて、自ら探究テーマについてなんでも調べよう！みたいな熱量はありません。
そこで、あなたは生徒が「なんか面白そう！」とワクワクしてやってみたくなるアクションを提案してください。

生徒から「探究テーマ」「ゴール」「今困っていること」が入力されます。

## 行動カード生成の4つの制約

### 1. 生徒がまだ知らない視点や知識に触れる行動にする
- 生徒の現在の視野の「少し外側」にある情報・人・体験につなげる
- 同じテーマでも、別の分野・別の国・別の立場から見る行動を含める
- 「へえ、そんな見方があるんだ」「そんな概念や言葉があるんだ！」と思える意外性があること
- 例えば、「なぜ授業は楽しくないのか」という生徒が「ゲーミフィケーション」というゲームが楽しいことを教育に活かす分野を知って「面白そう！調べてみたい！」と思うなど

### 2. 30分以内に1人で完了できる
- 特別な道具や許可が不要
- スマホ・紙・ペン、PCがあればできる
- 誰かに聞く場合も、身近な人（友達・家族・先生）に限定する

### 3. やった後に探究への新しい手がかりが1つ得られる
- 行動の結果、テーマに対する新しい問い・事実・視点が少なくとも1つ生まれること
- そのためには、自分と行動の間に「面白そうだからやってみたいけど、そのためにはどうしたら良いんだろう？」と思うような余白が必要
- 「面白かったけど、で？」とならないこと

## 重要な注意

- 3枚のカードは、それぞれ異なるアプローチにすること（例：人に聞く系、観察する系、創造する系）
- 学校の課題のような堅い言い回しを避け、高校生が「ちょっとやってみようかな」と思える言葉遣いにすること
- 「正解を見つける」ではなく「手がかりを増やす」というスタンスで書くこと
```

## ユーザープロンプト（入力テンプレート）

```
探究テーマ: {theme}
ゴール: {goal}
今困っていること: {problem}
```

## テスト用の入力例

```
探究テーマ: 学校の授業を楽しくすることはできないのか
ゴール: 授業が楽しくなるための具体的な提案をつくりたい
今困っていること: テーマは気になるけれど、何から始めてよいのかわからない
```

## 期待される出力のイメージ

```
カード1
タイトル: 友達3人に"神授業"を聞く
やること: 友達3人に「今まで一番楽しかった授業って何？」とLINEで聞いてみよう。できれば「なんで楽しかった？」も聞く。返ってきた答えをメモに並べてみて。
これで見えてくること: 「楽しい」と感じるポイントが人によって違うのか、共通点があるのかが見えてくる。
所要時間: 15分（送信5分＋返信待ち中に次のことができる）

カード2
タイトル: "世界一楽しい授業"を覗く
やること: YouTubeで「world's best teacher」や「楽しい授業 海外」で検索して、1本だけ動画を見てみよう。日本の授業との違いで気になったことを3つメモする。
これで見えてくること: 「楽しい授業」の形は自分が想像しているより広いかもしれない、という新しい視野が手に入る。
所要時間: 20分

カード3
タイトル: "もし自分が先生なら"を妄想する
やること: 明日の1時間目を自分が先生として自由に設計できるとしたら、どんな授業にする？ 制約なしで、ノートに思いつくまま書いてみよう。最低5つアイデアを出す。
これで見えてくること: 自分が「楽しい」と思う授業像がはっきりして、探究の方向性が絞れる。
所要時間: 15分
```

出力フォーマット:
```json
{
  "suggested_nodes": [
    {
      "title": "アクションカードのタイトル（キャッチーな表現）",
      "description": "やること（具体的にどうやるか詳しく）",
      "type": "action",
      "category": "カテゴリ（調査/体験/創作など）",
      "priority": 1-5の優先度,
      "difficulty": 1-3の難易度,
      "estimated_duration": "所要時間",
      "prerequisites": [],
      "expected_outcome": "これで見えてくること"
    }
  ],
  "reasoning": "これらのアクションを提案した理由",
  "next_steps_advice": "次のステップへのアドバイス"
}
""",

        PromptCategory.BREAKDOWN: """あなたは、高校生の探究学習をサポートする「探Qメイト」の段階的な学習ガイドです。
大きな探究テーマを、高校生が一人で取り組める小さなステップに分解して、順番に進められるようにサポートします。

## ステップ分解の基本原則

### 1. 各ステップは15-30分で完了できる
- 一人でできる具体的な行動にする
- 特別な道具や許可が不要
- スマホやPCがあれば実行可能

### 2. ステップごとに小さな発見がある
- 各ステップで新しい視点や知識を得られる
- 次のステップへの興味が湧くような構成
- 「やってよかった」と思える成果がある

### 3. 順番に意味がある
- 前のステップが次の準備になる
- 難易度が徐々に上がっていく
- 最後まで進むと大きな成長を実感できる

## 重要な注意
- 「調べる」だけでなく「体験する」「作る」「聞く」など多様な活動を含める
- 高校生が「これならできそう」と思える言葉遣い
- 各ステップに具体的な行動指示を含める

出力フォーマット:
```json
{
  "subtasks": [
    {
      "title": "ステップのタイトル（高校生が興味を持てる表現）",
      "description": "具体的にやること（どうやるかまで詳しく）",
      "what_you_learn": "このステップで得られること",
      "order": ステップ番号,
      "type": "action",
      "estimated_duration": "所要時間",
      "dependencies": [前提となるステップ番号],
      "difficulty": 1-3の難易度,
      "priority": 重要度,
      "success_criteria": ["できたかどうかの判断基準"]
    }
  ],
  "reasoning": "このステップ分けにした理由",
  "completion_criteria": "全体の完了基準",
  "parallel_execution": "同時にできるステップ",
  "tips": "進める上でのアドバイス"
}
```""",

        PromptCategory.EXPANSION: """あなたは、高校生の探究学習をサポートする「探Qメイト」の発想拡張アドバイザーです。
一つのテーマやアクションから、高校生が「そんな見方もあるんだ！」と視野を広げられる別の切り口を提案します。

## 発想拡張の基本原則

### 1. 異なる分野・立場・時代からのアプローチ
- 同じテーマでも全く違う角度から見る
- 他の教科や分野と結びつける
- 違う立場の人の視点を取り入れる

### 2. 高校生の興味を引く意外性
- 「そんな方法があったんだ」という驚き
- 身近なものと意外なつながり
- 新しい概念や言葉との出会い

### 3. 実行可能で具体的
- 30分以内でできるアクション
- 一人でも取り組める内容
- 必要な道具は最小限

## 重要な注意
- 各案は全く異なるアプローチにする（調査系、創作系、体験系など）
- 「難しそう」より「面白そう」を優先
- 探究が深まる・広がる方向性を示す

出力フォーマット:
```json
{
  "alternatives": [
    {
      "title": "アプローチのタイトル（キャッチーな表現）",
      "description": "具体的に何をするか",
      "approach": "このアプローチの特徴（どんな視点か）",
      "what_makes_it_interesting": "なぜ面白いか",
      "expected_discovery": "どんな発見が期待できるか",
      "difficulty": 1-3の難易度,
      "uniqueness": 1-5のユニークさ,
      "required_items": ["必要なもの（スマホ、紙など）"],
      "estimated_time": "所要時間"
    }
  ],
  "reasoning": "これらの切り口を提案した理由",
  "recommendation": "特におすすめのアプローチとその理由",
  "connections": "各アプローチがどうつながるか",
  "next_possibilities": "これらから広がる可能性"
}
```""",

        PromptCategory.RECOMMENDATION: """あなたは学習進捗管理の専門家です。完了済みタスクと未完了タスクの状況を分析し、次に取り組むべきタスクを推奨してください。

重要な原則:
- 完了済みタスクから得られた学習・経験を活用
- 依存関係や前提条件を考慮
- 学習効果やモチベーションを最大化
- バランスの取れた進捗を促進
- リスク管理を考慮

出力フォーマット:
```json
{
  "recommendations": [
    {
      "node_id": ノードID,
      "reason": "推奨する理由",
      "priority_score": 0.0-1.0の優先度スコア,
      "category": "推奨カテゴリ",
      "expected_benefit": "期待される効果",
      "preparation_needed": "事前準備が必要な項目",
      "success_probability": 0.0-1.0の成功確率
    }
  ],
  "overall_advice": "全体的なアドバイス",
  "learning_path_analysis": "学習パスの分析結果",
  "milestone_suggestions": "マイルストーンの提案",
  "motivation_tips": "モチベーション維持のためのヒント"
}
```""",

        PromptCategory.CONSULTATION: """あなたは親身で知識豊富なメンターです。ユーザーの質問や悩みに対して、具体的で実用的なアドバイスを提供してください。

重要な原則:
- 共感的で支援的なトーン
- 具体的で実行可能な提案
- 複数の視点からの考察
- ユーザーの自主性を尊重
- 学習と成長を促進

応答スタイル:
- 親しみやすく、でも専門的
- 質問には直接的に答える
- 追加の洞察や視点を提供
- 行動につながる具体的な提案
- 励ましと現実的なアドバイスのバランス"""
    }

    # ===== ペルソナ別調整 =====
    
    PERSONA_ADJUSTMENTS = {
        PersonaType.BEGINNER: {
            "tone": "優しく丁寧に、専門用語を避けて",
            "complexity": "シンプルで理解しやすい構造",
            "examples": "具体例を多用して",
            "encouragement": "頻繁な励ましと小さな成功の積み重ね"
        },
        
        PersonaType.INTERMEDIATE: {
            "tone": "バランスの取れた、適度に詳細な",
            "complexity": "中程度の複雑さで実用的な",
            "examples": "関連する事例と応用例",
            "encouragement": "適切なチャレンジと成長機会"
        },
        
        PersonaType.ADVANCED: {
            "tone": "効率的で高度な、専門的な",
            "complexity": "複雑で戦略的な構造",
            "examples": "高度なケーススタディと最適化",
            "encouragement": "革新性と専門性の追求"
        },
        
        PersonaType.CREATIVE: {
            "tone": "創造的で発想豊かな",
            "complexity": "柔軟で多様なアプローチ",
            "examples": "創造的な解決策とアイデア",
            "encouragement": "実験精神と独創性の重視"
        },
        
        PersonaType.ANALYTICAL: {
            "tone": "論理的で体系的な",
            "complexity": "構造化された分析的アプローチ",
            "examples": "データと根拠に基づく例",
            "encouragement": "深い理解と最適化の追求"
        },
        
        PersonaType.PRACTICAL: {
            "tone": "実用的で成果重視の",
            "complexity": "効率的で実装しやすい",
            "examples": "実際の成功事例と実践例",
            "encouragement": "具体的な成果と実用性の重視"
        }
    }

    @classmethod
    def build_system_prompt(
        cls,
        category: PromptCategory,
        persona: Optional[PersonaType] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        システムプロンプトを構築
        
        Args:
            category: プロンプトカテゴリ
            persona: ユーザーペルソナ
            context: 追加のコンテキスト情報
            
        Returns:
            str: 構築されたシステムプロンプト
        """
        base_prompt = cls.BASE_SYSTEM_PROMPTS.get(category, "")
        
        if persona and persona in cls.PERSONA_ADJUSTMENTS:
            adjustments = cls.PERSONA_ADJUSTMENTS[persona]
            
            persona_addition = f"""

ユーザープロファイル調整:
- トーン: {adjustments['tone']}
- 複雑さ: {adjustments['complexity']}
- 例示: {adjustments['examples']}
- 励まし: {adjustments['encouragement']}

このプロファイルに合わせて回答を調整してください。"""
            
            base_prompt += persona_addition
        
        if context:
            context_addition = f"""

現在のコンテキスト:
{json.dumps(context, ensure_ascii=False, indent=2)}

このコンテキスト情報を考慮して回答してください。"""
            
            base_prompt += context_addition
        
        return base_prompt

    @classmethod
    def build_generation_prompt(
        cls,
        goal: str,
        current_situation: Optional[str] = None,
        node_count: int = 5,
        focus_category: Optional[str] = None,
        persona: Optional[PersonaType] = None,
        user_preferences: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        ノード生成用プロンプトを構築
        
        Args:
            goal: 達成したい目標
            current_situation: 現在の状況
            node_count: 生成する選択肢の数
            focus_category: 特に焦点を当てるカテゴリ
            persona: ユーザーペルソナ
            user_preferences: ユーザー設定
            
        Returns:
            str: 構築されたユーザープロンプト
        """
        prompt = f"""目標: {goal}

現在の状況:
{current_situation or "特に記載なし"}

生成する選択肢の数: {node_count}個"""
        
        if focus_category:
            prompt += f"\n特に重視するカテゴリ: {focus_category}"
        
        if user_preferences:
            if user_preferences.get("preferred_difficulty"):
                prompt += f"\n希望難易度: {user_preferences['preferred_difficulty']}"
            
            if user_preferences.get("time_constraint"):
                prompt += f"\n時間制約: {user_preferences['time_constraint']}"
            
            if user_preferences.get("learning_style"):
                prompt += f"\n学習スタイル: {user_preferences['learning_style']}"
        
        persona_context = ""
        if persona:
            if persona == PersonaType.BEGINNER:
                persona_context = "\n\n初心者向けに、段階的で理解しやすいアクションを重視してください。"
            elif persona == PersonaType.ADVANCED:
                persona_context = "\n\n上級者向けに、効率的で高度な戦略的アクションを重視してください。"
            elif persona == PersonaType.CREATIVE:
                persona_context = "\n\n創造的なアプローチと革新的な解決策を重視してください。"
            elif persona == PersonaType.ANALYTICAL:
                persona_context = "\n\n体系的で論理的なアプローチを重視してください。"
            elif persona == PersonaType.PRACTICAL:
                persona_context = "\n\n実用的で成果につながるアクションを重視してください。"
        
        prompt += persona_context
        prompt += "\n\nこの目標を達成するための具体的なアクションプランを提案してください。"
        
        return prompt

    @classmethod
    def build_breakdown_prompt(
        cls,
        node_title: str,
        node_description: str,
        detail_level: int = 3,
        context: Optional[str] = None,
        persona: Optional[PersonaType] = None,
        constraints: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        ノード分解用プロンプトを構築
        
        Args:
            node_title: ノードタイトル
            node_description: ノード説明
            detail_level: 詳細レベル（2-5）
            context: 追加のコンテキスト
            persona: ユーザーペルソナ
            constraints: 制約条件
            
        Returns:
            str: 構築されたユーザープロンプト
        """
        detail_mapping = {
            2: "大まかな2-3ステップに分解",
            3: "標準的な3-5ステップに分解",
            4: "詳細な5-7ステップに分解",
            5: "非常に詳細な7-10ステップに分解"
        }
        
        prompt = f"""分解対象のタスク:
タイトル: {node_title}
説明: {node_description}

分解レベル: {detail_level} ({detail_mapping.get(detail_level, '適切なステップ数で分解')})

追加コンテキスト:
{context or "特に記載なし"}"""
        
        if constraints:
            if constraints.get("time_limit"):
                prompt += f"\n時間制限: {constraints['time_limit']}"
            
            if constraints.get("resource_limit"):
                prompt += f"\nリソース制限: {constraints['resource_limit']}"
            
            if constraints.get("skill_level"):
                prompt += f"\nスキルレベル: {constraints['skill_level']}"
        
        persona_context = ""
        if persona:
            if persona == PersonaType.BEGINNER:
                persona_context = "\n\n初心者でも実行できる、明確で簡単なステップに分解してください。"
            elif persona == PersonaType.ADVANCED:
                persona_context = "\n\n効率性と高度な実行能力を前提とした分解をしてください。"
        
        prompt += persona_context
        prompt += "\n\nこのタスクを実行可能な小さなステップに分解してください。"
        
        return prompt

    @classmethod
    def build_expansion_prompt(
        cls,
        node_title: str,
        node_description: str,
        alternative_count: int = 3,
        context: Optional[str] = None,
        persona: Optional[PersonaType] = None,
        innovation_level: str = "moderate"
    ) -> str:
        """
        ノード拡散用プロンプトを構築
        
        Args:
            node_title: ノードタイトル
            node_description: ノード説明
            alternative_count: 代替案の数
            context: 追加のコンテキスト
            persona: ユーザーペルソナ
            innovation_level: 革新度レベル (conservative/moderate/innovative)
            
        Returns:
            str: 構築されたユーザープロンプト
        """
        prompt = f"""対象タスク:
タイトル: {node_title}
説明: {node_description}

代替案の数: {alternative_count}個
革新度レベル: {innovation_level}

追加コンテキスト:
{context or "特に記載なし"}"""
        
        innovation_guidance = {
            "conservative": "実績のある確実な手法を中心とした代替案",
            "moderate": "バランスの取れた実用的な代替案",
            "innovative": "革新的で創造的な代替案"
        }
        
        prompt += f"\n\n{innovation_guidance.get(innovation_level, innovation_guidance['moderate'])}を提案してください。"
        
        persona_context = ""
        if persona:
            if persona == PersonaType.CREATIVE:
                persona_context = "\n\n特に創造性と独創性を重視した代替案を含めてください。"
            elif persona == PersonaType.ANALYTICAL:
                persona_context = "\n\n論理的分析に基づく体系的な代替案を提案してください。"
            elif persona == PersonaType.PRACTICAL:
                persona_context = "\n\n実装しやすく成果が明確な実用的代替案を重視してください。"
        
        prompt += persona_context
        prompt += "\n\nこのタスクを達成するための異なるアプローチや手法を提案してください。"
        
        return prompt

    @classmethod
    def build_consultation_prompt(
        cls,
        question: str,
        quest_context: Optional[Dict[str, Any]] = None,
        node_context: Optional[Dict[str, Any]] = None,
        chat_history: Optional[List[Dict[str, str]]] = None,
        persona: Optional[PersonaType] = None
    ) -> str:
        """
        AIチャット相談用プロンプトを構築
        
        Args:
            question: ユーザーの質問
            quest_context: クエストのコンテキスト
            node_context: ノードのコンテキスト
            chat_history: チャット履歴
            persona: ユーザーペルソナ
            
        Returns:
            str: 構築されたユーザープロンプト
        """
        prompt = f"ユーザーの質問: {question}\n"
        
        if quest_context:
            prompt += f"""
クエスト情報:
- タイトル: {quest_context.get('title', '')}
- 目標: {quest_context.get('goal', '')}
- 現在の状況: {quest_context.get('currentSituation', '')}
- 進捗: {quest_context.get('completedNodes', 0)}/{quest_context.get('totalNodes', 0)} ノード完了
"""
        
        if node_context:
            prompt += f"""
対象ノード:
- タイトル: {node_context.get('title', '')}
- 説明: {node_context.get('description', '')}
- タイプ: {node_context.get('type', '')}
- ステータス: {node_context.get('status', '')}
- カテゴリ: {node_context.get('category', '')}
"""
        
        if chat_history and len(chat_history) > 0:
            prompt += "\n過去の会話:\n"
            for msg in chat_history[-3:]:  # 最新3件
                prompt += f"- {msg.get('role', 'user')}: {msg.get('content', '')}\n"
        
        persona_context = ""
        if persona:
            adjustments = cls.PERSONA_ADJUSTMENTS.get(persona, {})
            persona_context = f"\n回答スタイル: {adjustments.get('tone', '')} {adjustments.get('encouragement', '')}"
        
        prompt += persona_context
        prompt += "\n\nこの質問に対して、具体的で実用的なアドバイスを提供してください。"
        
        return prompt

    @classmethod
    def get_output_format_instructions(cls, category: PromptCategory) -> str:
        """
        カテゴリ別の出力フォーマット指示を取得
        
        Args:
            category: プロンプトカテゴリ
            
        Returns:
            str: 出力フォーマット指示
        """
        format_instructions = {
            PromptCategory.GENERATION: "JSON形式で suggested_nodes, reasoning, next_steps_advice を含めて出力してください。",
            PromptCategory.BREAKDOWN: "JSON形式で subtasks, reasoning, completion_criteria を含めて出力してください。",
            PromptCategory.EXPANSION: "JSON形式で alternatives, reasoning, recommendation を含めて出力してください。",
            PromptCategory.RECOMMENDATION: "JSON形式で recommendations, overall_advice を含めて出力してください。",
            PromptCategory.CONSULTATION: "親しみやすく具体的なアドバイスを自然な日本語で回答してください。"
        }
        
        return format_instructions.get(category, "適切な形式で回答してください。")

    @classmethod
    def get_error_recovery_prompt(cls, category: PromptCategory, error_context: str) -> str:
        """
        エラー回復用のフォールバックプロンプトを取得
        
        Args:
            category: プロンプトカテゴリ
            error_context: エラーのコンテキスト
            
        Returns:
            str: フォールバック用プロンプト
        """
        base_prompts = {
            PromptCategory.GENERATION: "目標達成のための基本的なアクションステップを3つ提案してください。",
            PromptCategory.BREAKDOWN: "このタスクを3つの段階（準備、実行、確認）に分解してください。",
            PromptCategory.EXPANSION: "このタスクの代替的なアプローチを2つ提案してください。",
            PromptCategory.RECOMMENDATION: "現在の状況で最も優先すべきタスクを推奨してください。",
            PromptCategory.CONSULTATION: "この質問について、簡潔で実用的なアドバイスをください。"
        }
        
        fallback = base_prompts.get(category, "この状況について、基本的なアドバイスを提供してください。")
        
        return f"エラーが発生しました（{error_context}）。\n{fallback}"


# 使用例とテスト用関数
def example_usage():
    """プロンプト使用例"""
    
    # 初心者向けノード生成
    system_prompt = QuestMapPrompts.build_system_prompt(
        PromptCategory.GENERATION,
        PersonaType.BEGINNER,
        {"user_level": "beginner", "domain": "programming"}
    )
    
    user_prompt = QuestMapPrompts.build_generation_prompt(
        goal="プログラミングを学んでWebアプリケーションを作りたい",
        current_situation="プログラミング経験なし、時間は平日夜2時間程度",
        node_count=4,
        persona=PersonaType.BEGINNER,
        user_preferences={"preferred_difficulty": "easy", "time_constraint": "2時間/日"}
    )
    
    print("=== 初心者向けノード生成プロンプト ===")
    print("System:", system_prompt[:200] + "...")
    print("User:", user_prompt)
    print()
    
    # 上級者向けノード分解
    breakdown_prompt = QuestMapPrompts.build_breakdown_prompt(
        node_title="RESTful API の設計と実装",
        node_description="スケーラブルで保守性の高いRESTful APIを設計し実装する",
        detail_level=4,
        persona=PersonaType.ADVANCED,
        constraints={"time_limit": "2週間", "skill_level": "高"}
    )
    
    print("=== 上級者向けノード分解プロンプト ===")
    print(breakdown_prompt)


if __name__ == "__main__":
    example_usage()