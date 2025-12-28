# 対話エージェント機能 - 実験移行記録

**作成日**: 2025-12-28  
**対象機能**: AI対話エージェント機能 (ConversationAgent)  
**移行理由**: 実験的機能の本番環境からの分離とクリーンアップ  

## 概要

対話エージェント機能は高度な学習支援システムでしたが、以下の問題により実験フォルダに移行しました：

### 移行理由
- **複雑すぎる設計**: 5つのエンジンクラスが密結合、464行の巨大Orchestratorクラス
- **本番環境混入**: main.pyとchat_service.pyに実験コードが混在
- **コード重複**: LLM呼び出し・エラーハンドリング・JSON解析が重複
- **過度なモジュール分割**: 15個のPydanticモデル、複雑な依存関係

## 移行内容

### 移動したファイル
```
experiment/conversation_agent/
├── backend/                    # コア機能 (8ファイル)
│   ├── __init__.py            # モジュール初期化
│   ├── schema.py              # データモデル定義 
│   ├── orchestrator.py        # メイン制御エンジン (464行)
│   ├── state_extractor.py     # 状態抽出 (316行)
│   ├── support_typer.py       # 支援タイプ判定 (211行)
│   ├── policies.py            # 発話アクト選択 (324行)
│   ├── project_planner.py     # プロジェクト計画
│   ├── optimized_conversation_agent.py  # 最適化エンドポイント (368行)
│   ├── README.md              # 詳細ドキュメント (340行)
│   └── CONVERSATION_AGENT_API.md
├── test/
│   └── test_conversation_agent.py     # APIテストスクリプト
└── frontend/
    └── ConversationAgentTestPage.tsx  # 実験用テストページ
```

### 修正したファイル

#### 1. experiment/ 内のimport修正
- **backend/orchestrator.py:26** - プロジェクトルートへのパス修正 (`'..', '..', '..'`)
- **backend/state_extractor.py:15** - プロジェクトルートへのパス修正
- **backend/support_typer.py:13** - プロジェクトルートへのパス修正
- **backend/optimized_conversation_agent.py:15-18** - async_helpers等のパス修正
- **frontend/ConversationAgentTestPage.tsx:32-33** - React app コンポーネントへのパス修正

#### 2. 本体プロジェクトのクリーンアップ
- **backend/main.py:92-94** - 対話エージェント初期化コードを無効化
- **backend/main.py:2255-2267** - `/conversation-agent/chat` エンドポイントを501エラー応答に変更
- **backend/main.py:2522-2526** - `/conversation-agent/status` エンドポイントを無効化メッセージに変更
- **backend/services/chat_service.py:23** - `conversation_agent_available = False` に変更

## 現在の状態

### 完了済み
- ファイル移動とディレクトリ分離
- Import パスの修正
- 本体からの機能無効化
- エンドポイントの無効化

### 未完了（今後必要な作業）

#### A. API完全削除（推奨）
```python
# backend/main.py - 完全削除対象
@app.post("/conversation-agent/chat")           # Line 2254-2267
@app.get("/conversation-agent/status")          # Line 2512-2526  
@app.post("/conversation-agent/initialize")    # Line 2573-2600+

# 関連する関数・クラス
async def process_with_conversation_agent()     # Line 671-700+
class ConversationAgentRequest(BaseModel)      # 未特定位置
class ConversationAgentResponse(BaseModel)     # 未特定位置
```

#### B. サービス層クリーンアップ
```python
# backend/services/chat_service.py - 削除対象
def _process_with_conversation_agent()          # Line 179-209
def _check_conversation_agent()                 # Line 410-416
def _extract_agent_payload()                   # Line 390-397
def _build_ai_context_data()                   # Line 378-388
```

#### C. ドキュメント移行
移動推奨ファイル:
- `backend/REFACTORING_MIGRATION_PLAN.md` → `experiment/docs/`
- `backend/CLEANUP_REPORT.md` → `experiment/docs/`
- `backend/PHASE2_COMPLETION_REPORT.md` → `experiment/docs/`
- `backend/REFACTORING_NOTES.md` → `experiment/docs/`
- `backend/INTEGRATION_GUIDE.md` → `experiment/docs/`

## 将来の再設計案

### 現在のアーキテクチャの問題点
```
【複雑】ConversationOrchestrator (464行)
├── StateExtractor (316行)
├── SupportTyper (211行) 
├── PolicyEngine (324行)
├── ProjectPlanner (未測定)
└── 15個のPydanticモデル
```

### 推奨する新アーキテクチャ
```
【シンプル】ConversationEngine (150行目標)
├── LLMIntegration (共通LLM処理)
├── plugins/
│   ├── StateAnalyzer (プラグイン化)
│   ├── ResponseGenerator (プラグイン化)
│   └── MetricsCollector (プラグイン化)
└── 5個の簡素化モデル
```

### 再設計のメリット
- **統合された設計**: 1つのエンジンクラスで完結
- **プラグイン化**: 機能の独立性向上
- **設定一元管理**: config/ ディレクトリに集約
- **本番分離**: 完全独立モジュール

## チーム向けガイド

### やってはいけないこと
- experiment/ フォルダの機能を本体に組み込まない
- 本体の `/conversation-agent/` エンドポイントを復活させない
- main.py に対話エージェントimportを追加しない

### やるべきこと（機能が必要になった場合）
1. **experiment/conversation_agent/** で独立開発
2. **新アーキテクチャ** で再設計 (上記参照)
3. **完全分離** したAPIエンドポイント作成
4. **本体への影響ゼロ** で実装

### 参考情報
- **元の機能説明**: `experiment/conversation_agent/backend/README.md`
- **API仕様**: `experiment/conversation_agent/backend/CONVERSATION_AGENT_API.md`
- **テスト方法**: `experiment/conversation_agent/test/test_conversation_agent.py`

## 技術詳細

### import修正の仕組み
```python
# Before: experiment/conversation_agent/backend/ から
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))  # 2階層上

# After: 実験フォルダから本体へ
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', '..'))  # 3階層上
```

### 無効化の仕組み
```python
# フラグによる無効化（chat_service.py）
self.conversation_agent_available = False  # 実行されない

# エンドポイント無効化（main.py）
raise HTTPException(status_code=501, detail="機能無効化")
```

## 影響範囲

### 本番環境
- **影響なし**: 機能は既に無効化済み
- **API**: 501エラーで適切に応答
- **パフォーマンス**: 改善（不要なimport削除）

### 開発環境  
- **実験継続可能**: experiment/ フォルダで独立開発
- **テスト実行可能**: 独立したテストスイート
- **ドキュメント保持**: 全ての設計情報を保持

---

**最終更新**: 2025-12-28  
**次回レビュー推奨**: 2025-01-28（必要に応じて完全削除実施）