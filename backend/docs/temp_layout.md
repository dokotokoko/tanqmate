# OpenAI Responses API Web検索機能 テストプログラム要件定義書

## 1. 概要

### 1.1 目的
本ドキュメントは、OpenAI Responses APIのWeb検索機能（`web_search`ツール）を検証するためのテストプログラムの要件を定義する。

### 1.2 検証対象
1. **Web検索の実行** - APIを通じてWeb検索が正常に実行されることを確認
2. **出典（引用）の取り出し** - 検索結果に含まれる引用情報（annotations）を正しく抽出できることを確認

### 1.3 参考資料
- [OpenAI公式ドキュメント - Web Search](https://platform.openai.com/docs/guides/tools-web-search)
- [OpenAI Cookbook - Responses API Example](https://cookbook.openai.com/examples/responses_api/responses_example)
- [npaka氏の解説記事](https://note.com/npaka/n/n0410c8e3f31e)

---

## 2. システム要件

### 2.1 実行環境
| 項目 | 要件 |
|------|------|
| Python | 3.8以上 |
| openai パッケージ | 最新版（1.0以上） |
| 実行環境 | Google Colab / ローカル環境 |

### 2.2 必要なAPI設定
| 項目 | 詳細 |
|------|------|
| APIキー | OpenAI API Key（環境変数 `OPENAI_API_KEY`） |
| 対応モデル | `gpt-4o`, `gpt-4o-mini`, `gpt-5` |
| ツールタイプ | `web_search`（正式版）または `web_search_preview`（プレビュー版） |

---

## 3. 機能要件

### 3.1 検証項目①：Web検索の実行

#### 3.1.1 基本的なWeb検索
**目的**: Web検索ツールが正常に呼び出され、検索結果を含む応答が返却されること

**テストケース**:
```
入力: 時事的な質問（例：「今日のAI関連のニュースは？」）
期待結果:
  - response.output に web_search_call タイプの項目が含まれる
  - response.output_text に検索結果を反映した回答が含まれる
```

**検証ポイント**:
- `response.output` 内に `type: "web_search_call"` のオブジェクトが存在すること
- `status: "completed"` であること

#### 3.1.2 検索コンテキストサイズの制御
**目的**: `search_context_size` パラメータにより検索結果の詳細度を制御できること

**パラメータ値**:
| 値 | 説明 |
|----|------|
| `low` | 低品質・低コスト・最速応答 |
| `medium` | バランス（デフォルト） |
| `high` | 高品質・最高コスト・低速応答 |

**検証ポイント**:
- 各設定で応答が正常に返却されること
- `high` 設定時により詳細な情報が含まれること

#### 3.1.3 ユーザーロケーションの指定
**目的**: 地域に基づいた検索結果のフィルタリングが機能すること

**パラメータ構造**:
```python
user_location = {
    "type": "approximate",
    "country": "JP",      # ISO国コード（2文字）
    "city": "Tokyo",      # 都市名（フリーテキスト）
    "region": "Tokyo"     # 地域名（フリーテキスト）
}
```

**検証ポイント**:
- 日本のロケーション指定時に日本語または日本関連の結果が優先されること

#### 3.1.4 ツール使用の強制
**目的**: `tool_choice` パラメータによりWeb検索の使用を強制できること

**設定方法**:
```python
tool_choice = {"type": "web_search_preview"}
```

**検証ポイント**:
- 検索不要な質問でも必ずWeb検索が実行されること

### 3.2 検証項目②：出典の取り出し

#### 3.2.1 出力構造の確認
**目的**: API応答の構造を正しく理解し、必要な情報を抽出できること

**応答構造**:
```
response.output
├── ResponseFunctionWebSearch（検索呼び出し情報）
│   ├── id: 検索ID
│   ├── status: "completed"
│   └── type: "web_search_call"
│
└── ResponseOutputMessage（メッセージ本体）
    ├── id: メッセージID
    ├── role: "assistant"
    ├── type: "message"
    └── content[]
        └── ResponseOutputText
            ├── text: 出力テキスト
            ├── type: "output_text"
            └── annotations[]  ← 引用情報
```

#### 3.2.2 引用情報（annotations）の抽出
**目的**: 各引用の詳細情報を正しく取得できること

**AnnotationURLCitation の構造**:
| フィールド | 型 | 説明 |
|------------|-----|------|
| `type` | string | 常に `"url_citation"` |
| `url` | string | 出典のURL |
| `title` | string | 出典のタイトル |
| `start_index` | int | テキスト内の引用開始位置 |
| `end_index` | int | テキスト内の引用終了位置 |

**検証ポイント**:
- `annotations` が空でないこと
- 各annotationに `url`, `title` が含まれること
- `start_index` と `end_index` が適切な範囲であること

#### 3.2.3 引用とテキストの対応付け
**目的**: テキスト内のどの部分がどの出典に基づいているかを特定できること

**検証ポイント**:
- `start_index` と `end_index` を使用してテキストの該当箇所を抽出できること
- 抽出した箇所と引用URLの内容に関連性があること

---

## 4. テストプログラム設計

### 4.1 テストクラス構成

```
TestWebSearch
├── test_basic_web_search()           # 基本検索テスト
├── test_search_context_size()        # コンテキストサイズテスト
├── test_user_location()              # ロケーション指定テスト
├── test_forced_tool_use()            # ツール強制使用テスト
│
TestCitationExtraction
├── test_output_structure()           # 出力構造検証
├── test_annotation_fields()          # annotationフィールド検証
├── test_citation_text_mapping()      # 引用テキスト対応検証
└── test_multiple_citations()         # 複数引用の処理検証
```

### 4.2 共通ヘルパー関数

| 関数名 | 説明 |
|--------|------|
| `create_client()` | OpenAIクライアントの初期化 |
| `execute_web_search(query, **options)` | Web検索の実行 |
| `extract_citations(response)` | 引用情報の抽出 |
| `validate_citation(citation)` | 引用データの検証 |
| `get_cited_text(text, citation)` | 引用箇所のテキスト取得 |

### 4.3 出力フォーマット

テスト結果は以下の情報を含む構造化されたレポートとして出力する：

```
{
  "test_name": "テスト名",
  "status": "PASS" | "FAIL",
  "details": {
    "search_executed": true/false,
    "citations_found": 数値,
    "citations": [
      {
        "title": "出典タイトル",
        "url": "出典URL",
        "cited_text": "引用されたテキスト"
      }
    ]
  },
  "errors": []
}
```

---

## 5. 実装仕様

### 5.1 基本的なAPI呼び出し

```python
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-4o",
    tools=[{"type": "web_search_preview"}],
    input="検索クエリ"
)
```

### 5.2 出典抽出のサンプル実装

```python
def extract_citations(response):
    """レスポンスから引用情報を抽出する"""
    citations = []
    
    for item in response.output:
        if item.type == "message":
            for content in item.content:
                if hasattr(content, 'annotations'):
                    for annotation in content.annotations:
                        if annotation.type == "url_citation":
                            citations.append({
                                "url": annotation.url,
                                "title": annotation.title,
                                "start_index": annotation.start_index,
                                "end_index": annotation.end_index
                            })
    return citations
```

### 5.3 オプション設定

```python
# 検索コンテキストサイズの設定
tools = [{
    "type": "web_search_preview",
    "search_context_size": "high"  # low, medium, high
}]

# ユーザーロケーションの設定
tools = [{
    "type": "web_search_preview",
    "user_location": {
        "type": "approximate",
        "country": "JP",
        "city": "Tokyo",
        "region": "Tokyo"
    }
}]
```

---

## 6. テストシナリオ

### 6.1 正常系テスト

| No. | シナリオ | 入力 | 期待結果 |
|-----|----------|------|----------|
| 1 | 基本検索 | 「最新のAIニュースは？」 | 検索実行、引用付き回答 |
| 2 | 日本語検索 | 「今月の日本の経済ニュース」 | 日本語ソースの引用 |
| 3 | 地域指定検索 | 「近くのラーメン店」+ JP location | 日本の店舗情報 |
| 4 | 高詳細検索 | context_size=high | 詳細な情報と複数引用 |

### 6.2 異常系テスト

| No. | シナリオ | 入力 | 期待結果 |
|-----|----------|------|----------|
| 1 | 検索不要な質問 | 「1+1は？」 | 検索なし or 最小限の検索 |
| 2 | 不明確なクエリ | 「あれについて教えて」 | エラーなく処理 |
| 3 | 存在しない情報 | 架空の固有名詞 | 適切なエラーハンドリング |

---

## 7. 成功基準

### 7.1 Web検索の実行
- [ ] APIリクエストが正常に完了すること（HTTPステータス200）
- [ ] `response.output` に `web_search_call` が含まれること
- [ ] `web_search_call` の `status` が `"completed"` であること
- [ ] `response.output_text` に検索結果を反映した回答が含まれること

### 7.2 出典の取り出し
- [ ] `annotations` 配列が取得できること
- [ ] 各annotationに `url`, `title`, `start_index`, `end_index` が含まれること
- [ ] URLが有効な形式であること（https://で始まる）
- [ ] `start_index` < `end_index` であること
- [ ] インデックスがテキスト長の範囲内であること

---

## 8. 制限事項・注意点

### 8.1 API制限
- Web検索ツールは `zero data retention` や `data residency` をサポートしていない
- Chat Completionsで使用する `gpt-4o-search-preview` は一部パラメータのみサポート
- 段階的なレート制限が適用される

### 8.2 ツールタイプの選択
| ツールタイプ | 用途 |
|-------------|------|
| `web_search_preview` | プレビュー版（npaka記事で使用） |
| `web_search` | 正式版（最新ドキュメント推奨） |

### 8.3 モデル互換性
最新のドキュメントでは `gpt-5` が使用されているが、`gpt-4o` でも動作確認済み。

---

## 9. 付録

### 9.1 環境構築手順

```bash
# パッケージインストール
pip install -U openai

# 環境変数設定
export OPENAI_API_KEY="your-api-key"
```

### 9.2 Google Colab での設定

```python
import os
from google.colab import userdata

os.environ["OPENAI_API_KEY"] = userdata.get("OPENAI_API_KEY")
```

---

## 改訂履歴

| 版 | 日付 | 変更内容 |
|----|------|----------|
| 1.0 | 2025-12-26 | 初版作成 |