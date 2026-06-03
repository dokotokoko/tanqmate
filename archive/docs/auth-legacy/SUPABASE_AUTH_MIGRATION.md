# Supabase Auth完全移行ガイド

## 概要
このドキュメントは、カスタム認証システムからSupabase Authへの完全移行手順を説明します。

## 実装済みの内容

### 1. フロントエンド

#### 新規作成ファイル
- `apps/frontend/src/stores/authStore.unified.ts` - 統一認証ストア
- `apps/frontend/src/lib/api.unified.ts` - Supabaseセッション対応APIクライアント
- `apps/frontend/src/services/chatService.unified.ts` - Supabaseセッション対応チャットサービス

#### 主な変更点
- **トークン管理**: Supabaseが内部的に管理（localStorage不要）
- **セッション管理**: 自動更新、有効期限管理をSupabaseが担当
- **認証フロー**: PKCE対応、OAuth統合可能

### 2. バックエンド

#### 新規作成ファイル
- `apps/backend/utils/supabase_auth.py` - Supabaseトークン検証ユーティリティ
- `apps/backend/middleware/supabase_auth.py` - 認証ミドルウェア

#### 主な機能
- JWT検証（高速）
- Supabase API検証（確実）
- ロールベースアクセス制御
- レガシー互換性

### 3. データベース

#### スキーマファイル
- `schema/supabase_profiles.sql` - profilesテーブル定義とRLSポリシー

## 移行手順

### ステップ1: 環境変数の設定

**.env.example**
```env
# Supabase設定
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJ... # Anon Key (フロントエンド用)
SUPABASE_SECRET_KEY=eyJ... # Service Role Key (バックエンド用)
SUPABASE_JWT_SECRET=your-jwt-secret # JWT検証用

# フロントエンド用（Vite）
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... # Anon Key
```

### ステップ2: データベースマイグレーション

1. Supabaseダッシュボードでprofilesテーブルを作成：
```bash
# SQLエディタで実行
cat schema/supabase_profiles.sql
```

2. 既存ユーザーデータの移行（必要な場合）：
```sql
-- 既存のusersテーブルからprofilesテーブルへ移行
INSERT INTO public.profiles (email, username, legacy_user_id, created_at)
SELECT 
  CASE 
    WHEN email IS NOT NULL THEN email
    ELSE LOWER(username) || '@tanqmate.local'
  END as email,
  username,
  id as legacy_user_id,
  created_at
FROM public.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.legacy_user_id = users.id
);
```

### ステップ3: フロントエンドの更新

1. **パッケージインストール**：
```bash
cd apps/frontend
npm install @supabase/supabase-js
```

2. **コンポーネントの更新**：

各コンポーネントで以下の変更を実施：

```typescript
// 旧
import { useAuthStore } from '../stores/authStore';
import apiClient from '../lib/api';

// 新
import { useAuthStore } from '../stores/authStore.unified';
import apiClient from '../lib/api.unified';
```

3. **認証フローの更新**：

```typescript
// 旧: ユーザー名でログイン
const { login } = useAuthStore();
await login(username, password);

// 新: メールアドレスでログイン
const { signIn } = useAuthStore();
await signIn(email, password);
```

### ステップ4: バックエンドの更新

1. **パッケージインストール**：
```bash
cd apps/backend
pip install supabase pyjwt
```

2. **main.pyの更新**：

```python
from middleware.supabase_auth import SupabaseAuthMiddleware

# ミドルウェアを追加
if service_manager:
    app.add_middleware(SupabaseAuthMiddleware)
```

3. **ルーターの更新**：

各ルーターでSupabase認証を使用：

```python
from utils.supabase_auth import get_current_user
from fastapi import Depends

@router.get("/protected")
async def protected_route(user: dict = Depends(get_current_user)):
    return {"user": user}
```

### ステップ5: テスト

1. **ローカルテスト**：
```bash
# バックエンド起動
cd apps/backend
python main.py

# フロントエンド起動
cd apps/frontend
npm run dev
```

2. **認証フローテスト**：
- 新規登録
- ログイン
- セッション更新
- ログアウト

## 注意事項

### 破壊的変更
1. **メールアドレス必須**: Supabase Authはメールアドレスベース
2. **トークン形式**: JWTトークンの構造が変更
3. **セッション期間**: デフォルト1時間（設定変更可能）

### 互換性維持
- `legacy_user_id`フィールドで旧システムとの紐付け維持
- 旧エンドポイントは段階的に廃止

### セキュリティ
- Service Role Keyは**絶対に**フロントエンドに露出させない
- RLSポリシーを適切に設定
- CORS設定を確認

## トラブルシューティング

### 問題: ログインできない
- 環境変数が正しく設定されているか確認
- Supabaseプロジェクトの認証設定を確認
- ネットワーク接続を確認

### 問題: 401 Unauthorized
- トークンの有効期限を確認
- Authorizationヘッダーの形式を確認（`Bearer {token}`）
- バックエンドのトークン検証ログを確認

### 問題: プロファイルが作成されない
- トリガーが正しく設定されているか確認
- RLSポリシーを確認
- Service Role Keyの権限を確認

## 完了チェックリスト

- [ ] 環境変数設定完了
- [ ] データベースマイグレーション完了
- [ ] フロントエンドコンポーネント更新完了
- [ ] バックエンドAPI更新完了
- [ ] 認証フローテスト完了
- [ ] 本番環境デプロイ完了

## サポート

問題が発生した場合は、以下を確認してください：
1. Supabaseダッシュボードのログ
2. ブラウザの開発者コンソール
3. バックエンドのログ出力

## 次のステップ

1. **リアルタイム機能**: Supabase Realtimeを活用
2. **ストレージ統合**: Supabase Storageでファイル管理
3. **Edge Functions**: サーバーレス関数の活用