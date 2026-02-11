# Vibes 探Q 新機能実装ガイド

## 概要

Vibes 探Qは高校生の探究学習を支援する新機能です。UXデザインのモックアップと要件定義書に基づき、以下の機能を実装しました。

## 実装内容

### 1. フロントエンド画面

#### ユーザー登録フロー（3画面）
- **ファイル**: `src/pages/VibesTanqOnboarding.tsx`
- **機能**: 
  - 探究テーマの入力（自由記述）
  - 興味タグの選択（テクノロジー・社会課題から最大3つ）
  - やっていて楽しいことの選択（複数選択可能）

#### メインダッシュボード
- **ファイル**: `src/pages/VibesTanqDashboard.tsx`  
- **機能**:
  - パーソナライズされたクエスト表示（最大3件）
  - 関連タイムライン表示（ニュース・事例・トレンド）
  - ユーザーコンテキストの表示
  - クエストの開始・完了アクション

### 2. バックエンドAPI

#### APIルーター
- **ファイル**: `backend/routers/vibes_tanq_router.py`
- **エンドポイント**:
  - `POST /api/vibes-tanq/register` - ユーザーコンテキスト登録
  - `GET /api/vibes-tanq/context` - ユーザーコンテキスト取得
  - `GET /api/vibes-tanq/quests/recommendations` - クエスト推薦
  - `GET /api/vibes-tanq/timeline` - タイムライン取得
  - `POST /api/vibes-tanq/quests/action` - クエストアクション
  - `POST /api/vibes-tanq/log-event` - イベントログ記録

#### サービス層
- **ファイル**: `backend/services/vibes_tanq_service.py`
- **機能**:
  - LLMを活用したクエスト生成
  - パーソナライズされたタイムライン生成  
  - ユーザー行動ログ記録
  - 分析データの生成

### 3. データベーススキーマ

#### テーブル構成
- **ファイル**: `backend/schema/vibes_tanq_schema.sql`
- **テーブル**:
  - `vibes_tanq_contexts` - ユーザーコンテキスト
  - `vibes_tanq_logs` - 行動ログ
  - `vibes_tanq_quest_actions` - クエストアクション
  - `vibes_tanq_quest_templates` - クエストテンプレート
  - `vibes_tanq_timeline_cache` - タイムラインキャッシュ
  - `vibes_tanq_user_feedback` - ユーザーフィードバック

## アクセス方法

### 開発環境での起動

1. **バックエンド起動**
```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. **フロントエンド起動**
```bash
cd react-app
npm run dev
```

3. **アクセスURL**
- ユーザー登録: `http://localhost:5173/vibes-tanq/onboarding`
- ダッシュボード: `http://localhost:5173/vibes-tanq/dashboard`

### データベース初期設定

```sql
-- PostgreSQLでスキーマを実行
\i backend/schema/vibes_tanq_schema.sql
```

## 主要機能の動作フロー

### 1. ユーザー登録フロー

```
ステップ1: 探究テーマ入力
    ↓
ステップ2: 興味タグ選択
    ↓  
ステップ3: 楽しい活動選択
    ↓
完了: コンテキスト保存 → ダッシュボードへ遷移
```

### 2. クエスト推薦システム

```
ユーザーコンテキスト取得
    ↓
LLMによるクエスト生成
    ↓
パーソナライゼーション
    ↓
UI表示（3件まで）
```

### 3. タイムライン生成

```
興味タグ・テーマ分析
    ↓
関連コンテンツ検索
    ↓
LLMによるコンテンツ生成
    ↓
キャッシュ・表示
```

## カスタマイズ方法

### クエストテンプレートの追加

```sql
INSERT INTO vibes_tanq_quest_templates (
    title, description, category, difficulty, 
    estimated_time, points, required_tags, template_prompt
) VALUES (
    'カスタムクエスト',
    '説明文',
    'カテゴリ',
    'medium',
    '30分',
    25,
    '{"タグ1", "タグ2"}',
    'LLMプロンプト'
);
```

### 新しい興味タグの追加

`VibesTanqOnboarding.tsx`の以下の配列を編集：

```typescript
const technologyTags = [
  '新しいタグ', // 追加
  'AI・機械学習',
  // ...
];
```

## パフォーマンス考慮事項

### フロントエンド
- 遅延ローディングによるバンドルサイズ最適化
- React.memoによるコンポーネント最適化
- 適切なuseEffectの依存配列設定

### バックエンド
- データベースインデックスの最適化
- LLM呼び出しの非同期処理
- キャッシュ機能による応答速度向上

### データベース
- GINインデックスによるタグ検索最適化
- 分析用ビューによるクエリ高速化
- 自動クリーンアップによるデータ管理

## セキュリティ

- 認証トークンによるAPI保護
- SQL インジェクション対策
- XSS対策（MUI コンポーネント使用）
- CORS設定による適切なアクセス制御

## トラブルシューティング

### よくある問題

1. **API接続エラー**
   - バックエンドサーバーが起動しているか確認
   - CORS設定を確認

2. **データベースエラー**  
   - PostgreSQL接続設定を確認
   - スキーマが正しく適用されているか確認

3. **LLM生成エラー**
   - フォールバックデータが表示されているか確認
   - LLMクライアントの設定を確認

## 今後の拡張予定

- リアルタイム通知機能
- ソーシャル機能（他の生徒との交流）
- 詳細な分析ダッシュボード
- モバイルアプリ対応
- 教師用管理画面

## 技術スタック

### フロントエンド
- React 18
- TypeScript
- Material-UI (MUI)
- React Router
- Framer Motion

### バックエンド  
- FastAPI
- Python 3.8+
- PostgreSQL
- Supabase
- OpenAI/LLM Integration

### 開発ツール
- Vite
- ESLint
- uvicorn
- Docker（オプション）

## 貢献方法

1. フィーチャーブランチを作成
2. 変更をコミット  
3. テストを実行
4. プルリクエストを作成

## ライセンス

本プロジェクトは教育目的のため開発されたものです。商用利用については別途ご相談ください。