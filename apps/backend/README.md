# 探Qメイト Backend

`apps/backend` は、探Qメイトの FastAPI バックエンドです。React フロントエンドに認証、探究学習、AI チャット、日誌、クエスト、管理機能の API を提供します。

現行構成の正本はリポジトリルートの [README.md](../../README.md)、[AGENTS.md](../../AGENTS.md)、[DESIGN.md](../../DESIGN.md) です。バックエンド実装はこの `apps/backend` を正とします。

## 技術スタック

- FastAPI / Uvicorn
- Pydantic
- Supabase / PostgreSQL
- Supabase Auth
- OpenAI Responses API
- Docker / Nginx 経由のローカル HTTPS 開発環境

## セットアップ

バックエンドの起動・テストは Docker Compose 経由を標準とします。環境変数はリポジトリルートの `.env.example` と `apps/backend/.env.example` を参考に設定します。Supabase の secret key や OpenAI API key はコードや README に書かないでください。

## 起動

リポジトリルートから実行します。

```bash
docker compose -f infra/docker-compose.dev.yml up --build
```

主な確認先:

- Web/API: `https://dev.tanqmates.local.test`
- API: `https://dev.tanqmates.local.test/api`
- Swagger UI: `https://dev.tanqmates.local.test/api/docs`
- ReDoc: `https://dev.tanqmates.local.test/api/redoc`

バックエンドだけのログ確認:

```bash
docker compose -f infra/docker-compose.dev.yml logs -f backend
```

Nginx 経由の Web/API は `https://dev.tanqmates.local.test` で確認します。hosts と証明書の設定は [docs/DEVELOPMENT_SETUP.md](../../docs/DEVELOPMENT_SETUP.md) を参照してください。

## テスト

```bash
docker compose -f infra/docker-compose.dev.yml run --rm backend python -m pytest
```

ローカル Python 環境で直接実行する手順は補助的な切り分け用途です。通常の確認結果は Docker 経由のコマンドを基準にします。

## 主要 API 領域

実際の router 登録状態は [main.py](main.py) を正とします。主な領域は次の通りです。

- 認証: `routers/auth_router.py`
- AI チャット: `routers/chat_router.py`
- 会話管理: `routers/conversations_router.py`
- 探究学習 API: `inquiry_api.py`
- テーマ探究: `routers/theme_router.py`
- クエスト: `routers/quest_router.py`, `routers/user_quest_router.py`
- 日誌: `routers/diary_router.py`
- 管理者向け: `routers/admin_router.py`
- メトリクス / デバッグ / 移行: `routers/metrics_router.py`, `routers/debug_router.py`, `routers/migration_router.py`

## 主要ディレクトリ

```text
apps/backend/
├── main.py                  # FastAPI アプリ初期化、middleware、router 登録
├── routers/                 # HTTP API の入出力
├── services/                # ビジネスロジック、Supabase 操作、外部 API 連携
├── middleware/              # Supabase Auth などの middleware
├── utils/                   # 認証、ユーザー識別、Supabase 設定などの横断処理
├── module/                  # LLM クライアントなど
├── models/                  # Pydantic モデル
├── schemas/                 # 共有スキーマ
├── schema/                  # DB スキーマ、移行用 SQL
├── prompt/                  # プロンプト定義
├── tests/                   # pytest テスト
└── requirements.txt
```

## 実装メモ

- ルーターは薄く保ち、主要処理は `services` に置きます。
- 認証必須 API は Supabase Auth middleware と user scope を前提にします。
- Supabase user id と legacy user id の両対応が必要な箇所は [utils/user_identity.py](utils/user_identity.py) を確認します。
- LLM 呼び出しは [module/llm_api.py](module/llm_api.py) や既存 service を経由します。
- スキーマ変更時は SQL ファイル、移行手順、関連ドキュメントを合わせて更新します。

## 関連ドキュメント

- [ルート README](../../README.md)
- [設計入口](../../DESIGN.md)
- [開発環境セットアップ](../../docs/DEVELOPMENT_SETUP.md)
- [デザインシステム正本](../../DESIGN.md)
- [チャット応答生成アーキテクチャ](../../docs/chat_response_architecture.mmd)
