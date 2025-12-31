# OpenAI Responses API Web検索機能 テストプログラム

要件定義書（temp_layout.md）に基づく正式なWeb検索機能テストプログラムです。

## 🎯 テスト対象

### 1. Web検索の実行
- ✅ **基本検索**: Web検索ツールの正常動作確認
- ✅ **コンテキストサイズ制御**: `search_context_size` (low/medium/high) の検証
- ✅ **ロケーション指定**: 地域別検索結果の確認
- ✅ **強制ツール使用**: `tool_choice`による検索強制実行

### 2. 引用情報（annotations）の抽出
- ✅ **出力構造検証**: `response.output`の構造確認
- ✅ **annotation検証**: `url_citation`の詳細フィールド確認
- ✅ **引用テキスト対応**: `start_index`/`end_index`による箇所特定

## 🚀 実行方法

### 前提条件

```bash
# OpenAI ライブラリの最新版インストール
pip install -U openai

# 環境変数設定
export OPENAI_API_KEY="your-api-key"
```

### テスト実行

```bash
python test_web_search_spec.py
```

### 出力例

```
================================================================================
OpenAI Responses API Web検索機能 テスト開始
================================================================================

🔍 Web検索実行テスト
----------------------------------------

実行中: 基本検索...
結果: PASS

実行中: コンテキストサイズ...
結果: PASS

実行中: ロケーション指定...
結果: PASS

実行中: 強制ツール使用...
結果: PASS

📚 引用情報抽出テスト
----------------------------------------

実行中: 出力構造検証...
結果: PASS

実行中: annotation検証...
結果: PASS

実行中: 引用テキスト対応...
結果: PASS

================================================================================
OpenAI Responses API Web検索機能 テストレポート
================================================================================

📊 テスト結果サマリー:
  総テスト数: 7
  成功: 7
  失敗: 0
  成功率: 100.0%
```

## 📋 テスト項目詳細

### Web検索実行テスト

#### 1. basic_web_search
```python
# 最新のAI技術ニュースを検索
tools = [{"type": "web_search_preview"}]
response = client.responses.create(
    model="gpt-5.2",
    input="最新のAI技術ニュース",
    tools=tools
)

# 確認項目:
# ✅ response.output に web_search_call が含まれる
# ✅ status が "completed" である
# ✅ 検索結果が output_text に反映されている
```

#### 2. search_context_size
```python
# 3つの設定で比較テスト
for size in ["low", "medium", "high"]:
    tools = [{"type": "web_search_preview", "search_context_size": size}]
    # 実行時間と応答の詳細度を比較
```

#### 3. user_location
```python
# 日本ロケーション指定
user_location = {
    "type": "approximate",
    "country": "JP",
    "city": "Tokyo",
    "region": "Tokyo"
}
tools = [{"type": "web_search_preview", "user_location": user_location}]
# 日本語コンテンツの割合を確認
```

#### 4. forced_tool_use
```python
# 検索不要な質問でも強制実行
tool_choice = {"type": "web_search_preview"}
response = client.responses.create(
    model="gpt-5.2",
    input="1 + 1 = ?",
    tools=tools,
    tool_choice=tool_choice
)
```

### 引用情報抽出テスト

#### 1. output_structure
```python
# response.output の構造分析
for item in response.output:
    if item.type == "web_search_call":
        # 検索実行情報
    elif item.type == "message":
        # メッセージ本体（annotations含む）
```

#### 2. annotation_fields
```python
# annotations配列から引用情報抽出
for annotation in content.annotations:
    if annotation.type == "url_citation":
        citation = {
            "url": annotation.url,          # 出典URL
            "title": annotation.title,      # 出典タイトル
            "start_index": annotation.start_index,  # 開始位置
            "end_index": annotation.end_index        # 終了位置
        }
```

#### 3. citation_text_mapping
```python
# 引用箇所のテキスト抽出
def get_cited_text(text: str, citation: Dict) -> str:
    start_idx = citation['start_index']
    end_idx = citation['end_index']
    return text[start_idx:end_idx]
```

## 📊 成功基準

### Web検索の実行
- [x] APIリクエストが正常完了（HTTPステータス200）
- [x] `response.output` に `web_search_call` が含まれる
- [x] `web_search_call` の `status` が `"completed"`
- [x] `response.output_text` に検索結果が反映

### 引用情報の取り出し
- [x] `annotations` 配列が取得できる
- [x] 各annotationに `url`, `title`, `start_index`, `end_index` が含まれる
- [x] URLが有効な形式（https://で始まる）
- [x] `start_index` < `end_index`
- [x] インデックスがテキスト長の範囲内

## 🔧 カスタマイズ

### モデル変更
```python
# test_web_search_spec.py の WebSearchTestClient クラス内
self.model = "gpt-4o"  # または gpt-4o-mini
```

### ツールタイプ変更
```python
# web_search_preview → web_search (正式版)
tool_type = "web_search"
```

### 追加テストシナリオ
```python
# カスタムテスト追加例
def test_custom_scenario(self) -> TestResult:
    tools = [self.client.create_web_search_tool()]
    response = self.client.execute_web_search("カスタムクエリ", tools)
    # 独自の検証ロジック
```

## 🐛 トラブルシューティング

### よくあるエラー

#### 1. ModuleNotFoundError: No module named 'openai'
```bash
pip install -U openai
```

#### 2. AuthenticationError
```bash
# OpenAI API キーを確認
echo $OPENAI_API_KEY

# 環境変数を再設定
export OPENAI_API_KEY="your-api-key"
```

#### 3. Model 'gpt-5.2' does not exist
```python
# 利用可能なモデルに変更
self.model = "gpt-4o"
```

#### 4. 引用情報が取得できない
```python
# デバッグ用: レスポンス構造の確認
print(json.dumps(response.output, indent=2, default=str))
```

## 📈 パフォーマンス指標

### 実行時間の目安
- **基本検索**: 3-8秒
- **high コンテキスト**: 8-15秒
- **low コンテキスト**: 2-5秒

### 引用数の目安
- **ニュース検索**: 3-10個の引用
- **学術検索**: 5-15個の引用
- **一般質問**: 1-5個の引用

## 📚 参考資料

- [OpenAI公式ドキュメント - Web Search](https://platform.openai.com/docs/guides/tools-web-search)
- [OpenAI Cookbook - Responses API Example](https://cookbook.openai.com/examples/responses_api/responses_example)
- [要件定義書](temp_layout.md)

## 🤝 貢献

テストケースの追加や改善提案は歓迎します。

1. 新しいテストシナリオの追加
2. パフォーマンス最適化
3. エラーハンドリングの改善
4. ドキュメントの改善

---

**注意**: このテストプログラムはOpenAI Responses APIの最新仕様（2024年12月時点）に基づいています。API仕様の変更に応じて更新が必要な場合があります。