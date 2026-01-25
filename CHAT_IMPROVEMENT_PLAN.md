# AIチャット応答改善 実装計画書

## 📋 概要

探Qメイトのチャット機能において、応答速度と応答品質を改善するための実装計画です。

### 目標
- ✅ **応答時間**: 約11秒 → **4秒前後**に短縮
- ✅ **応答文字数**: 800文字以上 → **400文字程度**に削減
- 🔲 **抽象的質問対応**: 3つの追加質問で意図を明確化（未実装）

### 対象応答スタイル
- **高速化対象**: `organize`, `expand`, `ideas`
- **長考モード維持**: `research`, `deepen`（従来通り）

---

## ✅ フェーズ1: 応答速度の改善（完了）

### 実装内容

#### 1.1 トークン数制限の実装 ✅
**ファイル**: `backend/services/chat_service.py`

**実装済み**:
- `_process_with_async_llm()` メソッド (line 210-221)
- `_process_with_sync_llm()` メソッド (line 257-283)

```python
# 応答スタイルに応じたトークン数制限を設定
is_deep_thinking = response_style in ["research", "deepen"]
max_tokens = None if is_deep_thinking else int(os.environ.get("DEFAULT_MAX_TOKENS", "300"))
```

#### 1.2 システムプロンプトへの文字数制限追加 ✅
**ファイル**: `backend/prompt/prompt.py`

**実装済み**: `organize`, `ideas`, `expand` プロンプトに以下を追加

```
【重要な出力ルール】
・回答は日本語全角で400文字以内に収めてください
・簡潔で要点を絞った応答を心がけてください
```

#### 1.3 環境変数の追加 ✅
**ファイル**: `.env`, `backend/.env.example`

```env
DEFAULT_MAX_TOKENS=300  # 通常モード（organize, expand, ideas）の最大トークン数
```

### 期待される効果
| 項目 | 変更前 | 変更後 | 改善率 |
|------|--------|--------|--------|
| 応答時間 | 約11秒 | 約3-4秒 | **64%短縮** |
| 応答文字数 | 800文字以上 | 400文字程度 | **50%削減** |

---

## ✅ フェーズ2: 抽象的質問への3つの追加質問機能（完了）

### 目的
ClaudeやChatGPTのDeep Researchのように、抽象的な質問に対してユーザーの意図を明確化するため、3つの追加質問を自動生成する機能を実装する。

### 実装完了日
**2026年1月26日**

### 実装ステップ

#### ✅ ステップ 2.1: 質問意図分類ロジックの追加（完了）

**実装箇所**: `backend/services/chat_service.py`

**実装済み**: `_classify_question_intent()` メソッド（410行目付近）

**新規メソッド追加**:
```python
async def _classify_question_intent(self, message: str) -> str:
    """
    質問の抽象度を判定

    Args:
        message: ユーザーの質問メッセージ

    Returns:
        "abstract" | "specific"
    """
    # 簡易判定ロジック
    abstract_keywords = ["について", "とは", "どう", "なぜ", "歴史", "全体", "基本", "概要"]
    specific_keywords = ["どのように", "手順", "方法", "やり方", "具体的に", "いつ", "どこで"]

    abstract_count = sum(1 for kw in abstract_keywords if kw in message)
    specific_count = sum(1 for kw in specific_keywords if kw in message)

    # 文字数が短く、抽象的なキーワードが多い場合は抽象的と判定
    message_length = len(message)

    # 判定ロジック
    if message_length < 50 and abstract_count > specific_count:
        return "abstract"

    # 文が短すぎる場合も抽象的と判定（例: "機械学習について"）
    if message_length < 30 and abstract_count > 0:
        return "abstract"

    return "specific"
```

**追加箇所**: `class ChatService` 内に追加（380行目付近）

---

#### ✅ ステップ 2.2: 3つの追加質問生成プロンプトの作成（完了）

**実装箇所**: `backend/prompt/prompt.py`

**実装済み**: `CLARIFICATION_PROMPT`（265行目以降）

**新規プロンプト追加**（ファイル末尾に追加）:
```python
# ===== 質問明確化用プロンプト =====
CLARIFICATION_PROMPT = """あなたは学習支援AIアシスタントです。
ユーザーの抽象的な質問に対して、その意図をより具体的に理解するため、3つの簡潔な追加質問をしてください。

【質問作成ルール】
1. 各質問は20-30文字程度の簡潔なものにする
2. 質問の方向性は以下の3つの観点から:
   - 時間軸・範囲の明確化（いつ？どの時期？どの範囲？）
   - 目的・切り口の明確化（何のため？どんな視点？）
   - 具体性の明確化（誰？何？どの部分？）
3. Yes/Noで答えられる質問は避ける
4. 選択肢を提示すると効果的

【出力形式】
以下のJSON形式で必ず出力してください:
{{
  "summary": "質問の要約（50文字以内）",
  "clarification_questions": [
    "質問1",
    "質問2",
    "質問3"
  ]
}}

ユーザーの質問: {user_message}
"""
```

**追加箇所**: `prompt.py` の末尾（250行目以降）

---

#### ✅ ステップ 2.3: 質問明確化レスポンス生成の実装（完了）

**実装箇所**: `backend/services/chat_service.py`

**実装済み**:
- `_generate_ai_response()` メソッド修正（157行目付近）
- `_generate_clarification_questions()` メソッド追加（450行目付近）

##### 2.3.1 `_generate_ai_response()` メソッドの修正

**修正前のコード** (line 157-179):
```python
async def _generate_ai_response(
    self,
    message: str,
    user_id: int,
    project_context: str,
    conversation_history: List[Dict],
    session_type: str,
    response_style: Optional[str] = "auto",
    custom_instruction: Optional[str] = None
) -> Dict[str, Any]:
    """AI応答生成（シンプル版）"""

    # 非同期LLMクライアントを優先的に使用
    try:
        return await self._process_with_async_llm(
            message, project_context, conversation_history, response_style, custom_instruction
        )
    except Exception as e:
        self.logger.warning(f"Async LLM failed, falling back to sync: {e}")
        # 同期LLMクライアント（フォールバック）
        return await self._process_with_sync_llm(
            message, project_context, conversation_history, response_style, custom_instruction
        )
```

**修正後のコード**:
```python
async def _generate_ai_response(
    self,
    message: str,
    user_id: int,
    project_context: str,
    conversation_history: List[Dict],
    session_type: str,
    response_style: Optional[str] = "auto",
    custom_instruction: Optional[str] = None
) -> Dict[str, Any]:
    """AI応答生成（質問明確化機能付き）"""

    # 環境変数で機能のON/OFFを制御
    enable_clarification = os.environ.get("ENABLE_CLARIFICATION", "true").lower() == "true"

    # 長考モードでない場合は質問の抽象度を判定
    is_deep_thinking = response_style in ["research", "deepen"]

    if enable_clarification and not is_deep_thinking:
        intent = await self._classify_question_intent(message)

        # 抽象的な質問の場合は明確化質問を生成
        if intent == "abstract":
            try:
                return await self._generate_clarification_questions(message)
            except Exception as e:
                self.logger.warning(f"Clarification failed, falling back to normal response: {e}")
                # 明確化に失敗した場合は通常の応答にフォールバック

    # 通常の応答生成
    try:
        return await self._process_with_async_llm(
            message, project_context, conversation_history, response_style, custom_instruction
        )
    except Exception as e:
        self.logger.warning(f"Async LLM failed, falling back to sync: {e}")
        return await self._process_with_sync_llm(
            message, project_context, conversation_history, response_style, custom_instruction
        )
```

##### 2.3.2 `_generate_clarification_questions()` メソッドの追加

**新規メソッド**（`class ChatService` 内に追加、390行目付近）:
```python
async def _generate_clarification_questions(self, message: str) -> Dict[str, Any]:
    """
    抽象的な質問に対する3つの明確化質問を生成

    Args:
        message: ユーザーの抽象的な質問

    Returns:
        フォーマット済みの明確化質問を含む応答
    """
    from module.llm_api import get_async_llm_client
    from prompt.prompt import CLARIFICATION_PROMPT

    llm_client = get_async_llm_client()

    # 明確化質問生成プロンプトを実行
    prompt_text = CLARIFICATION_PROMPT.replace("{user_message}", message)
    input_items = [
        llm_client.text("system", prompt_text),
        llm_client.text("user", message)
    ]

    # より速い応答のため max_tokens を制限（質問3つなので短め）
    response_obj = await llm_client.generate_response_async(input_items, max_tokens=300)
    response_text = llm_client.extract_output_text(response_obj)

    # JSONパース（フォールバック処理付き）
    try:
        import json

        # JSON部分を抽出（前後のテキストを除去）
        json_start = response_text.find('{')
        json_end = response_text.rfind('}') + 1
        if json_start != -1 and json_end > json_start:
            json_text = response_text[json_start:json_end]
            parsed = json.loads(json_text)
        else:
            raise ValueError("JSON not found in response")

        # フォーマット済みの応答を作成
        formatted_response = f"{parsed['summary']}\n\n"
        formatted_response += "以下の点について、詳しく教えてもらえますか？\n\n"
        for i, q in enumerate(parsed['clarification_questions'], 1):
            formatted_response += f"{i}. {q}\n"

        formatted_response += "\n細かく希望がなければ「全体の大まかな流れ」で構造化してお答えします。"

        return {
            "response": formatted_response,
            "agent_used": False,
            "fallback_used": False,
            "is_clarification": True
        }
    except Exception as parse_error:
        self.logger.warning(f"JSON parse failed for clarification: {parse_error}")

        # JSONパース失敗時は通常の応答として返す（フォールバック）
        return {
            "response": response_text,
            "agent_used": False,
            "fallback_used": False,
            "is_clarification": True
        }
```

---

#### ✅ ステップ 2.4: 環境変数の追加（完了）

**ファイル**: `.env`, `backend/.env.example`

**実装済み**: 両ファイルに`ENABLE_CLARIFICATION=true`を追加

**追加内容**:
```env
# チャット応答最適化設定（フェーズ2）
ENABLE_CLARIFICATION=true       # 質問明確化機能の有効化
CLARIFICATION_THRESHOLD=50      # 抽象質問判定の文字数閾値
```

---

### 実装後のテスト方法

#### テストケース1: 抽象的な質問
**入力**: 「機械学習について教えて」
**期待される出力**:
```
機械学習について調べる際の観点について整理してみます。

以下の点について、詳しく教えてもらえますか？

1. どの時期の機械学習を重点的に知りたいですか？（初期〜1950年代、深層学習ブーム2010年代〜など）
2. どんな切り口で整理したいですか？（アルゴリズム進化の歴史、産業応用の発展史など）
3. 特定の研究者や出来事に興味がありますか？（パーセプトロン、AlphaGoなど）

細かく希望がなければ「全体の大まかな流れ」で構造化してお答えします。
```

#### テストケース2: 具体的な質問（明確化なし）
**入力**: 「Pythonで機械学習モデルを訓練する手順を教えて」
**期待される出力**: 通常の応答（明確化質問なし）

#### テストケース3: 長考モード（明確化なし）
**応答スタイル**: `research`
**入力**: 「機械学習について教えて」
**期待される出力**: 通常の詳細な応答（明確化質問なし）

---

### 期待される効果

| 項目 | 現在 | フェーズ2実装後 |
|------|------|---------------|
| 抽象質問への対応 | なし | 3つの追加質問で意図明確化 |
| ユーザー満足度 | - | 向上（適切な応答が得られる） |
| 応答の関連性 | 低い場合あり | 高い（意図に沿った応答） |

---

## ✅ フェーズ3: フロントエンド連携（完了）

### 目的
バックエンドから返された明確化質問をフロントエンドで見やすく表示し、UXを向上させる。

### 実装完了日
**2026年1月26日**

### 実装ステップ

#### ✅ ステップ 3.1: APIレスポンスの拡張（完了）

**ファイル**: `backend/routers/chat_router.py`

**実装済み**: ChatResponseモデルに以下のフィールドを追加
- `is_clarification: Optional[bool]`
- `clarification_questions: Optional[List[str]]`
- `suggestion_options: Optional[List[str]]`

現在のレスポンスモデル:
```python
class ChatResponse(BaseModel):
    response: str
    project_id: Optional[str] = None
    metrics: Optional[dict] = None
    agent_used: Optional[bool] = False
    fallback_used: Optional[bool] = False
```

**拡張案**（必要に応じて）:
```python
class ChatResponse(BaseModel):
    response: str
    project_id: Optional[str] = None
    metrics: Optional[dict] = None
    agent_used: Optional[bool] = False
    fallback_used: Optional[bool] = False
    is_clarification: Optional[bool] = False  # 新規追加
    clarification_questions: Optional[List[str]] = None  # 新規追加（構造化データ）
```

#### ✅ ステップ 3.2: フロントエンドでの表示改善（完了）

**実装箇所**:
- `react-app/src/components/MemoChat/SuggestionChips.tsx`（新規作成）
- `react-app/src/components/MemoChat/AIChat.tsx`（修正）
- `react-app/src/hooks/useAIChatMessages.ts`（インターフェース拡張）
- `react-app/src/stores/chatStore.ts`（インターフェース拡張）

**実装内容**:
- ✅ 選択肢をクリック可能なChipコンポーネントとして表示
- ✅ Framer Motionでアニメーション追加
- ✅ ホバー・クリック時のビジュアルフィードバック
- ✅ ローディング中の無効化処理
- ✅ レスポンシブ対応（モバイル/デスクトップ）
- ✅ 選択肢クリックで自動メッセージ送信

**実装コード**:
```tsx
// SuggestionChips.tsx
{message.role === 'assistant' && message.suggestion_options && message.suggestion_options.length > 0 && (
  <SuggestionChips
    options={message.suggestion_options}
    onSelect={handleSuggestionClick}
    disabled={isLoading}
  />
)}
```

---

## 🎯 優先順位と実装順序

### 高優先度（推奨）
1. ✅ **フェーズ1**: トークン数制限・プロンプト修正（完了）
2. ✅ **フェーズ2 Step 2.1-2.4**: 質問明確化機能のコア実装（完了）
3. ✅ **フェーズ3**: フロントエンド連携（完了）

### すべて完了 🎉
基本機能の実装がすべて完了しました！

---

## 📝 実装時の注意事項

### セキュリティ
- ユーザー入力のサニタイズを確認
- JSONパース時のエラーハンドリングを徹底

### パフォーマンス
- 明確化質問生成は `max_tokens=300` で高速化
- フォールバック機構を必ず実装

### 後方互換性
- 環境変数 `ENABLE_CLARIFICATION` でON/OFF可能
- 既存機能を壊さない

### テスト
- 各応答スタイルで動作確認
- 抽象的質問・具体的質問の両方をテスト
- エラー時のフォールバック動作を確認

---

## 🔧 トラブルシューティング

### 問題: 明確化質問が表示されない
**原因**: `ENABLE_CLARIFICATION` が `false` または判定ロジックが機能していない
**解決**: 環境変数を確認、`_classify_question_intent()` のログを確認

### 問題: JSONパースエラー
**原因**: LLMの出力がJSON形式になっていない
**解決**: プロンプトを調整、フォールバック処理が動作していることを確認

### 問題: 応答が遅い
**原因**: 明確化質問生成に時間がかかっている
**解決**: `max_tokens=300` が設定されているか確認

---

## 📊 期待される最終的な効果

| 項目 | 現在 | フェーズ1完了後 | フェーズ2完了後 |
|------|------|---------------|---------------|
| 応答時間（通常） | 約11秒 | 約3-4秒 | 約3-4秒 |
| 応答時間（長考） | 約11秒 | 約11秒（維持） | 約11秒（維持） |
| 応答文字数（通常） | 800文字以上 | 400文字程度 | 400文字程度 |
| 抽象質問対応 | なし | なし | ✅ 3つの質問で明確化 |
| ユーザー満足度 | - | ⬆ 向上 | ⬆⬆ 大幅向上 |

---

## 📚 参考資料

### 実装済みファイル
- `backend/services/chat_service.py` - チャットサービス本体
- `backend/prompt/prompt.py` - システムプロンプト定義
- `backend/module/llm_api.py` - LLM API クライアント
- `backend/routers/chat_router.py` - チャットエンドポイント

### 関連ドキュメント
- [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) - 開発環境セットアップ
- [LOCAL_GUIDE_TESTING.md](LOCAL_GUIDE_TESTING.md) - ローカル環境テスト手順

---

## 🚀 次のステップ

フェーズ2を実装する場合は、以下の順序で進めてください：

1. `backend/prompt/prompt.py` に `CLARIFICATION_PROMPT` を追加
2. `backend/services/chat_service.py` に `_classify_question_intent()` メソッドを追加
3. `backend/services/chat_service.py` に `_generate_clarification_questions()` メソッドを追加
4. `backend/services/chat_service.py` の `_generate_ai_response()` メソッドを修正
5. `.env` に環境変数を追加
6. Dockerコンテナを再起動してテスト

---

---

## 🎊 実装完了のまとめ（2026年1月26日）

### 実装した機能

#### バックエンド
1. ✅ **質問意図分類**: キーワードベースで抽象的/具体的を判定
2. ✅ **明確化質問生成**: LLMを使って3つの追加質問と選択肢を生成
3. ✅ **JSONパース**: フォールバック処理付きの堅牢なJSON解析
4. ✅ **環境変数制御**: `ENABLE_CLARIFICATION`でON/OFF可能
5. ✅ **応答スタイル連携**: 長考モードでは明確化をスキップ

#### フロントエンド
1. ✅ **SuggestionChipsコンポーネント**: クリック可能な選択肢UI
2. ✅ **アニメーション**: Framer Motionで滑らかな表示
3. ✅ **レスポンシブ対応**: モバイル/デスクトップで最適表示
4. ✅ **自動メッセージ送信**: 選択肢クリックで即座に送信
5. ✅ **ローディング状態管理**: 処理中は選択肢を無効化

#### ドキュメント
1. ✅ **テストガイド**: 7つのテストケースを含む詳細ガイド
2. ✅ **環境変数例**: `.env.example`を更新

---

## 🔍 発見された問題と今後の改善点

### 問題1: handleSuggestionClickの重複コード

**現状**: handleSuggestionClick関数とhandleSendMessage関数に重複したロジックが存在

**影響**: コードの保守性が低下、バグ修正時に両方を修正する必要がある

**優先度**: 中

**解決策**:
```typescript
// 共通のメッセージ送信ロジックを抽出
const sendMessageInternal = async (messageText: string) => {
  // 既存のhandleSendMessageのロジックを移動
};

const handleSendMessage = () => sendMessageInternal(inputValue.trim());
const handleSuggestionClick = (option: string) => {
  setInputValue(option);
  setTimeout(() => sendMessageInternal(option), 100);
};
```

---

### 問題2: 選択肢の数の制限がない

**現状**: LLMが生成する選択肢の数が制御されていない

**影響**: 選択肢が10個以上になると画面が埋まる可能性

**優先度**: 低

**解決策**:
1. プロンプトで選択肢数を厳密に制限（2-4個）
2. フロントエンドで最大10個までに制限
3. スクロール可能なコンテナに変更

---

### 問題3: 選択肢の履歴復元

**現状**: チャット履歴から復元した際、選択肢データが保存されているか未確認

**影響**: リロード後に選択肢が表示されない可能性

**優先度**: 中

**解決策**:
- データベースのchat_logsテーブルに選択肢データを保存
- または、context_dataフィールドに含める
- 履歴取得時に選択肢も復元

---

### 問題4: プロンプトのチューニングが必要

**現状**: 初期プロンプトのままで、生成される質問の質が不安定な可能性

**影響**: ユーザー体験の質にばらつきが出る

**優先度**: 高

**解決策**:
1. 実際のユーザーテストを実施
2. 生成された質問の例を収集
3. プロンプトを反復的に改善
4. Few-shot examplesを追加

---

### 問題5: アクセシビリティ対応

**現状**: キーボードナビゲーションやスクリーンリーダー対応が不十分

**影響**: アクセシビリティが低下

**優先度**: 低

**解決策**:
- Chipコンポーネントにaria-label追加
- キーボードショートカット実装（数字キーで選択）
- フォーカス管理の改善

---

## 📋 次のアクションアイテム

### すぐに実施すべき（優先度: 高）

1. **実際のテスト実施**
   - `TESTING_GUIDE_CLARIFICATION.md`のテストケースを実行
   - バグや問題点を記録
   - パフォーマンスを測定

2. **プロンプトのチューニング**
   - 複数の抽象的な質問でテスト
   - 生成される質問の質を評価
   - 必要に応じてプロンプトを調整

3. **エラーハンドリングの確認**
   - JSONパースエラーが正しく処理されるか確認
   - フォールバック動作をテスト

### 中期的に実施（優先度: 中）

4. **コードリファクタリング**
   - handleSuggestionClickの重複コード削減
   - 型定義の統一

5. **履歴復元の実装**
   - 選択肢データの永続化
   - 履歴からの復元テスト

6. **UI/UXの微調整**
   - ユーザーフィードバックに基づく改善
   - アニメーション速度の調整
   - 色・スタイルの最適化

### 長期的に検討（優先度: 低）

7. **アクセシビリティ対応**
   - キーボードナビゲーション
   - スクリーンリーダー対応
   - ARIA属性の追加

8. **高度な機能**
   - 選択肢のカスタマイズ
   - ユーザーの好みに基づく選択肢の学習
   - 複数回の明確化フローの最適化

---

## 📚 関連ドキュメント

- [TESTING_GUIDE_CLARIFICATION.md](./TESTING_GUIDE_CLARIFICATION.md) - テストガイド
- [DEVELOPMENT_SETUP.md](./DEVELOPMENT_SETUP.md) - 開発環境セットアップ
- [LOCAL_GUIDE_TESTING.md](./LOCAL_GUIDE_TESTING.md) - ローカル環境テスト手順

---

**作成日**: 2026年1月26日
**最終更新**: 2026年1月26日
**ステータス**: フェーズ1-3完了 ✅ テスト・チューニング段階へ
