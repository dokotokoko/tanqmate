# 開発環境セットアップ手順

探Qメイトの現行開発環境は `apps/backend`、`apps/frontend`、`infra` を正とします。古い `backend/` や `react-app/` は通常参照しません。

## 前提条件

- Git
- Docker Desktop
- Node.js 18 以上（Docker 外で補助的に実行する場合）
- Python 3.10 以上（Docker 外で補助的に実行する場合）
- mkcert（ローカル HTTPS を使う場合）

## リポジトリ取得

```bash
git clone https://github.com/your-username/tanqmates.git
cd tanqmates
```

## 環境変数

ルートの `.env.example` と `apps/backend/.env.example` を参考に、必要な値を設定します。API キーや Supabase secret key は README やコードに書かないでください。

### ルート `.env`

```bash
cp .env.example .env
```

主な値:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

### フロントエンド `.env`

```bash
cd apps/frontend
New-Item -ItemType File -Force .env
```

Docker / Nginx 経由:

```env
VITE_API_URL=https://dev.tanqmates.local.test/api
```

Docker を使わずに補助的に直接起動する場合:

```env
VITE_API_URL=http://localhost:8000
```

## ローカル HTTPS

Docker 開発環境では `https://dev.tanqmates.local.test` を使います。

### 証明書

```bash
mkcert -install
cd nginx/certs
mkcert dev.tanqmates.local.test
mv dev.tanqmates.local.test.pem cert.pem
mv dev.tanqmates.local.test-key.pem key.pem
cd ../..
```

### hosts

Windows では管理者権限で `C:\Windows\System32\drivers\etc\hosts` を編集します。Mac / Linux では `/etc/hosts` を編集します。

```text
127.0.0.1 dev.tanqmates.local.test
```

## Docker で起動

開発・ビルド・テストは Docker 環境を標準とします。コマンドはリポジトリルートから実行します。

```bash
docker compose -f infra/docker-compose.dev.yml up --build
```

バックグラウンド起動:

```bash
docker compose -f infra/docker-compose.dev.yml up -d --build
```

停止:

```bash
docker compose -f infra/docker-compose.dev.yml down
```

ログ:

```bash
docker compose -f infra/docker-compose.dev.yml logs -f backend
docker compose -f infra/docker-compose.dev.yml logs -f frontend
docker compose -f infra/docker-compose.dev.yml logs -f nginx
```

アクセス先:

- Web: `https://dev.tanqmates.local.test`
- API: `https://dev.tanqmates.local.test/api`

## ビルド / テスト

### フロントエンドビルド

```bash
docker compose -f infra/docker-compose.dev.yml run --rm frontend npm run build
```

### バックエンドテスト

```bash
docker compose -f infra/docker-compose.dev.yml run --rm backend python -m pytest
```

### 本番 compose の起動確認

本番 compose の構成確認や起動確認が必要な場合:

```bash
docker compose -f infra/docker-compose.yml up --build -d
```

```bash
docker compose -f infra/docker-compose.yml down
```

## 補助的な直接起動

通常は使いません。Docker の問題切り分けなどで必要な場合だけ、各アプリの README を参照してください。

- [バックエンド README](../apps/backend/README.md)
- [フロントエンド README](../apps/frontend/README.md)

## トラブルシューティング

### 証明書の警告が出る

1. `mkcert -install` を実行済みか確認する
2. ブラウザを完全に再起動する
3. `nginx/certs/cert.pem` と `nginx/certs/key.pem` を再生成する

### API にアクセスできない

```bash
docker compose -f infra/docker-compose.dev.yml logs backend
docker compose -f infra/docker-compose.dev.yml logs nginx
```

Docker 環境では frontend service の `VITE_API_URL=/api` が使われます。環境変数を上書きしている場合は `.env` を確認してください。

### ポートが競合する

Windows:

```bash
netstat -an | findstr :8000
netstat -an | findstr :5173
netstat -an | findstr :443
```

Mac / Linux:

```bash
lsof -i :8000
lsof -i :5173
lsof -i :443
```

### フロントエンドのビルドエラー

```bash
docker compose -f infra/docker-compose.dev.yml down
docker compose -f infra/docker-compose.dev.yml build --no-cache frontend
docker compose -f infra/docker-compose.dev.yml run --rm frontend npm run build
```

### バックエンドテストのエラー

```bash
docker compose -f infra/docker-compose.dev.yml build --no-cache backend
docker compose -f infra/docker-compose.dev.yml run --rm backend python -m pytest
```

## 関連ドキュメント

- [ルート README](../README.md)
- [設計入口](../DESIGN.md)
- [バックエンド README](../apps/backend/README.md)
- [フロントエンド README](../apps/frontend/README.md)
- [チェックリスト](checklists/README.md)
