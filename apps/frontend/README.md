# 探Qメイト Frontend

`apps/frontend` は、探Qメイトの Vite + React フロントエンドです。生徒の探究チャット、メモ、日誌、クエスト、教師・管理者向け画面を提供し、FastAPI バックエンドと Supabase Auth に接続します。

現行構成の正本はリポジトリルートの [README.md](../../README.md)、[AGENTS.md](../../AGENTS.md)、[DESIGN.md](../../DESIGN.md) です。フロントエンド実装はこの `apps/frontend` を正とします。

## 技術スタック

- Vite
- React 18
- TypeScript
- Material UI v5
- Zustand
- React Query
- React Router
- Supabase Auth
- Framer Motion

## セットアップ

フロントエンドの起動・ビルドは Docker Compose 経由を標準とします。環境変数はリポジトリルートの `.env.example` を参考に設定します。Docker 開発環境では `VITE_API_URL=/api` が使われます。

## 起動

リポジトリルートから実行します。

```bash
docker compose -f infra/docker-compose.dev.yml up --build
```

バックグラウンド起動:

```bash
docker compose -f infra/docker-compose.dev.yml up -d --build
```

フロントエンドのログ確認:

```bash
docker compose -f infra/docker-compose.dev.yml logs -f frontend
```

Nginx 経由の Web/API は `https://dev.tanqmates.local.test` で確認します。hosts と証明書の設定は [docs/DEVELOPMENT_SETUP.md](../../docs/DEVELOPMENT_SETUP.md) を参照してください。

## ビルド / 検証

```bash
docker compose -f infra/docker-compose.dev.yml run --rm frontend npm run build
```

追加の静的検査を行う場合も Docker 経由で実行します。現時点ではビルド成功と対象画面の手動確認を基本の確認基準にします。

## 主要ディレクトリ

```text
apps/frontend/
├── src/
│   ├── components/          # 画面内 UI と再利用部品
│   ├── components/common/   # 共通 UI 部品
│   ├── pages/               # ルーティング単位の画面
│   ├── services/            # API クライアントと機能別通信処理
│   ├── stores/              # Zustand によるアプリ状態
│   ├── hooks/               # 画面横断の振る舞い
│   ├── lib/                 # 共通ライブラリ
│   ├── styles/              # design-system token とグローバル CSS
│   └── utils/               # 汎用ユーティリティ
├── public/
├── package.json
├── vite.config.ts
├── vite.config.docker.ts
└── Dockerfile
```

## 実装メモ

- API 呼び出しは `src/services` または `src/lib/api.ts` の既存方針に合わせます。
- 認証状態は `src/stores/authStore.ts` と Supabase 関連 hook / lib の責務を尊重します。
- 共通 UI は `src/components/common` を優先します。
- 色、余白、角丸、影、タイポグラフィは `src/styles/design-system.ts` のトークンに寄せます。
- 固定色の直書きや画面単位の独自パレットは避けます。
- 画面の雰囲気は [DESIGN.md](../../DESIGN.md) を正本にします。詳細背景が必要な場合は [docs/design_system_master_spec.md](../../docs/design_system_master_spec.md) も参照します。

## 関連ドキュメント

- [ルート README](../../README.md)
- [設計入口](../../DESIGN.md)
- [開発環境セットアップ](../../docs/DEVELOPMENT_SETUP.md)
- [デザインシステム正本](../../DESIGN.md)
- [チャット応答生成アーキテクチャ](../../docs/chat_response_architecture.mmd)
