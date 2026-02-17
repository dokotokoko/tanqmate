# 探Q LAB 実装引継資料

## 概要

「探Qメイトサービス空間のLAB化」として、あつまれ動物の森・アメーバピグの世界観を融合した「探Q LAB」（研究室）ページを新規実装しました。ユーザーが自身の探究活動の進捗・成果・学習スタイルを直感的に把握できるゲーム風の空間です。

---

## 実装内容

### 1. バックエンド（FastAPI）

#### 新規ファイル

| ファイル | 役割 |
|---|---|
| `backend/services/lab_service.py` | LABデータ分析サービス（統計・進捗・パーソナリティ） |
| `backend/routers/lab_router.py` | LAB用APIエンドポイント定義 |

#### 修正ファイル

| ファイル | 変更内容 |
|---|---|
| `backend/main_refactored.py` | `lab_router`のインポートと`app.include_router(lab_router)`の追加 |

#### APIエンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET | `/lab/stats` | ユーザーの全体統計（チャット数、メモ数、プレイ時間、活動ヒートマップ、連続日数など） |
| GET | `/lab/progress` | 全プロジェクトの進捗状況（8ステップの完了判定マップ） |
| GET | `/lab/personality` | 学習パーソナリティ分析（MBTI風4次元 + レーダーチャート + 応答スタイル使用傾向） |

#### 探究レポート進捗の8ステップ

1. テーマ設定 → プロジェクトの`theme`フィールド有無で判定
2. 問いの設定 → `question`フィールド有無で判定
3. 仮説の構築 → `hypothesis`フィールドまたはメモ内キーワードで判定
4. 情報収集 → メモ内の調査関連キーワード + メモ数で判定
5. 分析・考察 → メモ内の分析関連キーワード + メモ数で判定
6. 結論の導出 → メモ内の結論関連キーワードで判定
7. レポート作成 → メモ内のレポート関連キーワードで判定
8. 発表準備 → メモ内の発表関連キーワードで判定

#### 学習パーソナリティ（MBTI風4次元）

| 次元 | Pole A | Pole B | 判定基準 |
|---|---|---|---|
| 探索/専門 | 探索型 (E) | 専門型 (S) | プロジェクト数、質問の多様性 |
| 理論/実践 | 理論型 (T) | 実践型 (P) | メッセージ内キーワード、応答スタイル使用頻度 |
| 独立/対話 | 独立型 (I) | 対話型 (C) | 平均メッセージ長、対話パターン |
| 創造/分析 | 創造型 (R) | 分析型 (A) | メッセージ内キーワード、ideas/deepen スタイル使用比率 |

16種のタイプ名マッピング済み（例: ETIR = ビジョナリー研究者、SPCA = マイスター）

### 2. フロントエンド（React + MUI）

#### 新規ファイル

| ファイル | 役割 |
|---|---|
| `react-app/src/pages/LabRoomPage.tsx` | メインページ（部屋デザイン・レイアウト・アバター・装飾） |
| `react-app/src/components/Lab/useLabData.ts` | API呼び出しカスタムフック（3エンドポイント並列取得） |
| `react-app/src/components/Lab/ProgressMapDisplay.tsx` | 壁面大ディスプレイ：プロジェクト進捗マップ |
| `react-app/src/components/Lab/EffortTimelinePanel.tsx` | 壁面パネル：努力の軌跡（ヒートマップ・統計カード） |
| `react-app/src/components/Lab/PersonalityPanel.tsx` | 壁面パネル：学習パーソナリティ（MBTI表示・レーダーチャート） |

#### 修正ファイル

| ファイル | 変更内容 |
|---|---|
| `react-app/src/App.tsx` | `LabRoomPage`の遅延インポートと`/lab`ルート追加 |
| `react-app/src/components/Layout/Layout.tsx` | サイドバーに「探Q LAB」ナビゲーション項目追加 |

#### デザインコンセプト

- **部屋の背景**: レンガ壁（上部55%） + 木目の床（下部45%）をCSSグラデーションで再現
- **壁面パネル**: 額縁風のダークガラスデザイン、グロー効果付き
- **浮遊パーティクル**: 12個の光の粒が浮遊するアニメーション（探究の光）
- **アバター**: ユーザー頭文字をオレンジグラデーションの円で表示、上下浮遊アニメーション
- **装飾アイテム**: 絵文字で研究室の雰囲気を演出（植物、本、コーヒー、実験器具など）
- **レスポンシブ**: モバイルでは1カラムレイアウト、装飾アイテム・アバター非表示

---

## 今後の課題・改善案

### 優先度: 高

1. **ステップ完了判定の精度向上**
   - 現在はキーワードマッチングによる簡易判定
   - LLMを使った自然言語解析で精度を大幅改善可能
   - ユーザーが手動でステップを完了マークする機能の追加

2. **パーソナリティ分析の改善**
   - 現在は`context_data`内の`response_style`を参照しているが、全チャットログに`response_style`が記録されていない可能性がある
   - `chat_logs`テーブルに`response_style_used`カラムを追加して確実に記録する
   - LLMによる質問傾向の詳細分析を組み込む

3. **参照URL一覧の表示**
   - メモやチャットログからURL（http/https）を正規表現で抽出して一覧表示する機能
   - 壁面に「参考文献ボード」として追加予定

### 優先度: 中

4. **部屋のカスタマイズ機能**
   - ユーザーが壁紙、床、家具（装飾アイテム）を選べるようにする
   - あつ森のようなインテリアコーディネート要素
   - `user_lab_config`テーブル新設（wallpaper, floor, items JSONなど）

5. **アチーブメントバッジシステム**
   - 「初めてのメモ」「10回の質問」「3日連続ログイン」などのバッジ
   - 壁面の「トロフィー棚」パネルとして表示
   - 既存のクエストシステム(`quests`, `user_quests`テーブル)と連携可能

6. **アバターのカスタマイズ**
   - 現在は頭文字のみ → 用意されたパーツ（髪型、服、アクセサリー）を選べるように
   - SVGまたはCanvas2Dでドット絵風アバターを描画

7. **プレイ時間の正確な計測**
   - 現在は`チャット数 × 3分 + メモ数 × 5分`の推定値
   - フロントエンドでアクティビティ計測（Page Visibility API）を導入
   - `user_activity_sessions`テーブルを新設

### 優先度: 低

8. **BGMとサウンドエフェクト**
   - Web Audio APIで環境音（鳥のさえずり、ページめくり音など）
   - ユーザー設定で音量調整・ミュート対応

9. **他ユーザーの部屋を訪問する機能**
   - プライバシー設定付きで公開可能な部屋
   - 友達のパーソナリティタイプ比較

10. **季節イベント連動**
    - 季節に応じて部屋の装飾が変化（桜、紅葉、雪など）
    - イベント限定アチーブメント

---

## 技術的な注意事項

### バックエンド

- `LabService`は`BaseService`を継承（`services/base.py`のパターンに準拠）
- Supabaseクエリは`auth_router.py`の`get_supabase_client()`を再利用
- 認証は既存の`get_current_user`依存関数を使用（JWT Bearer認証）
- チャットログが少ない場合（10件未満）、パーソナリティ分析の`confidence`が低くなり、フロントエンドで「もう少し対話すると分析できます」と表示

### フロントエンド

- レーダーチャートはCanvas2Dで直接描画（chart.jsは不使用、軽量化のため）
- 3つのAPIエンドポイントを`Promise.all`で並列取得
- 遅延ローディング（`lazy()` + `Suspense`）でバンドルサイズ最適化
- Framer Motionアニメーションは`will-change`を暗黙的に設定するためパフォーマンスに注意
- モバイル表示時はアバターと装飾アイテムを非表示にしてパフォーマンス確保

### DB（追加テーブル不要）

- 既存の`chat_logs`, `projects`, `memos`, `chat_conversations`テーブルのデータのみで動作
- 新規テーブルは不要（将来のカスタマイズ機能で必要になる可能性あり）

---

## ファイル一覧

```
新規作成:
  backend/services/lab_service.py
  backend/routers/lab_router.py
  react-app/src/pages/LabRoomPage.tsx
  react-app/src/components/Lab/useLabData.ts
  react-app/src/components/Lab/ProgressMapDisplay.tsx
  react-app/src/components/Lab/EffortTimelinePanel.tsx
  react-app/src/components/Lab/PersonalityPanel.tsx

修正:
  backend/main_refactored.py          (ルーター登録追加)
  react-app/src/App.tsx                (ルート追加)
  react-app/src/components/Layout/Layout.tsx  (ナビ追加)
```

---

## 動作確認手順

1. Docker Compose でバックエンド・フロントエンドを起動
2. ログイン後、左サイドバーの「探Q LAB」をクリック
3. `/lab`ページが表示され、3つの壁面パネルにデータが表示されることを確認
4. パネルクリックで拡大ダイアログが開くことを確認
5. ブラウザ幅を縮めてモバイルレイアウトになることを確認
