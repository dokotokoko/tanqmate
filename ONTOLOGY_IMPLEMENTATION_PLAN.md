# オントロジーグラフ駆動システム実装計画

## 📋 概要
現在の線形5段階プロセスをオントロジー工学による知識グラフ駆動の循環プロセスに移行し、生徒一人一人の探究学習により柔軟に対応できるシステムを構築します。

## 🎯 目標
- **短期目標**: 既存システムの互換性を保ちながらグラフ駆動の推論を導入
- **長期目標**: 完全なグラフベースの探究支援システムへの移行

## 🏗️ アーキテクチャ設計

### 1. コアコンポーネント

#### 1.1 InquiryOntologyGraph (`ontology_graph.py`)
- **役割**: 探究プロセスの知識グラフ管理
- **主要機能**:
  - ノード（探究要素）とエッジ（関係）の管理
  - グラフトラバーサルと経路探索
  - 制約チェックとガード条件評価
  - 進捗計算とサイクル検出

#### 1.2 OntologyAdapter (`ontology_adapter.py`)
- **役割**: 既存システムとグラフシステムの橋渡し
- **主要機能**:
  - StateSnapshot ↔ グラフノード変換
  - 支援タイプの動的決定
  - 発話アクトの文脈依存選択
  - グラフ状態の永続化

#### 1.3 GraphInferenceEngine (新規実装予定)
- **役割**: グラフベースの推論エンジン
- **主要機能**:
  - パターンマッチング
  - 推論ルールの適用
  - 次ステップの予測
  - 学習パスの最適化

## 📊 データモデルマッピング

### 現在の5段階プロセス → グラフノード対応

| 現在のプロセス | グラフノードタイプ | 関係性 |
|--------------|-----------------|--------|
| 状態抽出 | Question, Goal | frames, aligned_with |
| 計画思考 | Hypothesis, Method | leads_to, is_tested_by |
| 支援タイプ判定 | （動的決定） | （現在位置による） |
| 発話アクト選択 | （動的決定） | （ノード状態による） |
| 応答生成 | Insight, Reflection | leads_to_insight, modifies |

### 支援タイプとグラフ状態の対応

| 支援タイプ | トリガー条件 | 推奨ノード遷移 |
|-----------|------------|--------------|
| 理解深化 | clarity < 0.5 | Question の明確化 |
| 道筋提示 | 次ノード不明 | Method の構築 |
| 視点転換 | ループ検出 | Insight → Hypothesis |
| 行動活性化 | Method 未実行 | Method → Data |
| 絞り込み | 選択肢過多 | Hypothesis の精緻化 |
| 意思決定 | Goal 不明確 | Goal の再定義 |

## 🚀 実装手順

### Phase 1: 基盤構築（完了）
- [x] オントロジーグラフクラスの実装
- [x] アダプタークラスの実装
- [x] データモデルマッピング定義

### Phase 2: 統合準備（進行中）
- [ ] GraphInferenceEngineの実装
- [ ] 既存ConversationOrchestratorの拡張
- [ ] グラフデータの永続化機構

### Phase 3: 段階的移行
- [ ] フィーチャーフラグによる切り替え機構
- [ ] A/Bテストの実装
- [ ] パフォーマンス測定

### Phase 4: 最適化
- [ ] グラフアルゴリズムの最適化
- [ ] キャッシング戦略
- [ ] スケーラビリティ対応

## 🔄 統合方法

### オプション1: ハイブリッドアプローチ（推奨）
```python
class OntologyOrchestrator(ConversationOrchestrator):
    def __init__(self, use_graph=True, **kwargs):
        super().__init__(**kwargs)
        if use_graph:
            self.ontology_adapter = OntologyAdapter()
    
    def process_turn(self, ...):
        # 1. 従来の状態抽出
        state = self._extract_state(...)
        
        # 2. グラフへの変換と推論
        if self.use_graph:
            graph_node = self.ontology_adapter.state_to_graph_node(state, user_id)
            self.ontology_adapter.graph.add_node(graph_node)
            
            # グラフベースの支援タイプ決定
            support_type, reason, confidence = self.ontology_adapter.decide_support_type_from_graph(graph_node)
            
            # グラフベースの発話アクト選択
            selected_acts, act_reason = self.ontology_adapter.select_acts_from_graph(graph_node, support_type)
        else:
            # 従来の処理
            support_type, reason, confidence = self._determine_support_type(state)
            selected_acts, act_reason = self._select_acts(state, support_type)
        
        # 3. 応答生成（共通）
        response = self._generate_response(...)
        
        # 4. グラフ更新
        if self.use_graph:
            self.ontology_adapter.update_graph_from_response(...)
        
        return response
```

### オプション2: 完全置換アプローチ
- 既存システムを段階的に置き換え
- リスクが高いが、最終的にクリーンな実装

## 📈 期待される効果

### 定量的効果
- **応答精度**: 文脈理解が向上し、より適切な支援を提供
- **学習効率**: 循環的な学習により理解の深化を促進
- **継続率**: 個別最適化により学習意欲を維持

### 定性的効果
- **柔軟性**: 生徒の多様な探究パスに対応
- **追跡性**: 学習プロセスの可視化
- **適応性**: 個々の学習スタイルに適応

## 🔍 検証方法

### 単体テスト
```python
def test_graph_node_conversion():
    adapter = OntologyAdapter()
    state = StateSnapshot(goal="研究テーマを決める", ...)
    node = adapter.state_to_graph_node(state, "user123")
    assert node.type == NodeType.GOAL
    assert node.clarity > 0

def test_support_type_decision():
    adapter = OntologyAdapter()
    node = Node(type=NodeType.QUESTION, clarity=0.3, ...)
    support_type, _, _ = adapter.decide_support_type_from_graph(node)
    assert support_type == SupportType.UNDERSTANDING
```

### 統合テスト
- エンドツーエンドの対話フロー
- グラフの一貫性チェック
- パフォーマンステスト

## ⚠️ 注意事項

### 互換性
- 既存APIの変更は最小限に
- データマイグレーション計画が必要

### パフォーマンス
- グラフサイズの制限（ノード数 < 10,000）
- インデックスの適切な使用

### セキュリティ
- ユーザー間のデータ分離
- グラフアクセス制御

## 📅 タイムライン

| 期間 | タスク | 成果物 |
|-----|--------|--------|
| Week 1 | 基盤実装 | グラフクラス、アダプター |
| Week 2 | 統合開発 | 推論エンジン、拡張Orchestrator |
| Week 3 | テスト | 単体・統合テスト |
| Week 4 | デプロイ準備 | ドキュメント、移行計画 |

## 🎯 成功指標

- グラフベースの推論が既存システムと同等以上の精度
- レスポンスタイム < 2秒を維持
- 学習者の満足度向上（NPS +10ポイント）
- システムエラー率 < 0.1%

## 📝 次のステップ

1. **GraphInferenceEngineの実装**
2. **ConversationOrchestratorの拡張**
3. **テストケースの作成**
4. **パフォーマンスベンチマーク**
5. **段階的ロールアウト計画**