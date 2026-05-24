# 開発環境セットアップ手順

探Qメイトの現行開発環境は `apps/backend`、`apps/frontend`、`infra` を正とします。古い `backend/` や `react-app/` は通常参照しません。

## 前提条件

- Git
- Docker Desktop
- Node.js 18 以上
- Python 3.10 以上
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

フロントエンド単体起動:

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

リポジトリルートから実行します。

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
```

アクセス先:

- Web: `https://dev.tanqmates.local.test`
- API: `https://dev.tanqmates.local.test/api`

## 直接起動

### バックエンド

```bash
cd apps/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Mac / Linux:

```bash
cd apps/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API ドキュメント:

- `http://localhost:8000/docs`
- `http://localhost:8000/redoc`

### フロントエンド

```bash
cd apps/frontend
npm install
npm run dev
```

アクセス先:

- `http://localhost:5173`

## 検証

### フロントエンド

```bash
cd apps/frontend
npm run build
```

### バックエンド

```bash
cd apps/backend
python -m pytest
```

`pytest` やテスト依存が不足している場合は、依存を整えるか Docker 環境で確認してください。

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

直接起動時は `VITE_API_URL=http://localhost:8000` になっているか確認してください。

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
cd apps/frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm run build
```

Mac / Linux:

```bash
cd apps/frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 関連ドキュメント

- [ルート README](../README.md)
- [設計入口](../DESIGN.md)
- [バックエンド README](../apps/backend/README.md)
- [フロントエンド README](../apps/frontend/README.md)
- [チェックリスト](checklists/README.md)
