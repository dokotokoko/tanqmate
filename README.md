# 🎓 探Qメイト - AI-Powered Inquiry Learning Platform

[![React](https://img.shields.io/badge/React-18.2.0-blue.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-green.svg)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue.svg)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

> **探究学習を革新する AI 対話型学習支援プラットフォーム**

探Qメイトは、学生の探究学習を伴走するAIパートナーです。OpenAI GPT-4を活用し、個別最適化された学習支援を提供します。

## ✨ なぜ探Qメイトなのか？

### 🎯 解決する課題
- **探究学習の方向性に迷う学生**：何から始めればいいかわからない
- **個別指導の限界**：教師一人では全員を十分にサポートできない  
- **学習プロセスの可視化不足**：進捗や思考過程が見えにくい
- **継続的な振り返りの困難さ**：適切なタイミングでの内省支援が難しい

### 💡 私たちのソリューション
- **AI メンター**：24時間利用可能な対話型学習支援
- **プロジェクトベース学習**：複数のメモとプロジェクトの統合管理
- **可視化ツール**：思考フレームワークとマインドマップ
- **クエストシステム**：ゲーミフィケーションによる学習動機向上

## 🚀 主要機能

### 🤖 AI 対話機能
- **リアルタイム支援**：学習中の疑問を即座に解決
- **プロジェクト文脈理解**：メモとプロジェクト情報を考慮した対話
- **軽量化最適化**：高速レスポンスのための最適化実装

### 📝 統合メモシステム
- **プロジェクト連携**：メモを特定のプロジェクトに関連付け
- **マルチメモ管理**：複数のメモを同時に管理・編集
- **自動保存**：作業の中断を気にせず集中
- **Markdown 対応**：構造化された美しいノート

### 🎮 思考フレームワークツール
- **テーマ深掘りツール**：段階的にテーマを具体化
- **マインドマップ**：アイデアの視覚的整理  
- **インタラクティブ探索**：AIサポートによる思考の拡張

### 🏆 クエストシステム
- **学習クエスト**：段階的な学習目標の設定
- **実績システム**：成果の可視化とポイント獲得
- **振り返り機能**：学習プロセスの内省サポート


## 🚀 開発クイックスタート

セットアップ手順は [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) を参照してください。

## 🐳 Docker環境

### 開発環境
```bash
# 起動
docker-compose -f docker-compose.dev.yml up --build

# バックグラウンド実行
docker-compose -f docker-compose.dev.yml up -d --build

# 停止
docker-compose -f docker-compose.dev.yml down

# ログ確認
docker-compose -f docker-compose.dev.yml logs -f [backend|frontend|nginx]
```

### 本番環境
```bash
# 起動
docker-compose up --build -d

# 停止
docker-compose down
```

## 📚 プロジェクト構造

```
tanqmates/
├── backend/                  # FastAPI バックエンド
│   ├── main.py              # API サーバー
│   ├── routers/             # APIエンドポイント
│   │   ├── auth_router.py   # 認証
│   │   ├── chat_router.py   # チャット
│   │   ├── memo_router.py   # メモ管理
│   │   ├── project_router.py# プロジェクト管理
│   │   └── quest_router.py  # クエスト
│   ├── services/            # ビジネスロジック
│   ├── module/              # LLM API モジュール
│   ├── conversation_agent/  # AI対話エージェント
│   ├── prompt/              # プロンプトテンプレート
│   └── requirements.txt     # Python依存関係
├── react-app/               # React フロントエンド
│   ├── src/
│   │   ├── components/      # UIコンポーネント
│   │   │   ├── MemoChat/    # メモ・チャット統合UI
│   │   │   ├── Layout/      # レイアウト
│   │   │   └── Project/     # プロジェクト管理
│   │   ├── pages/          # ページコンポーネント
│   │   ├── hooks/          # カスタムフック
│   │   ├── stores/         # Zustand状態管理
│   │   ├── services/       # APIクライアント
│   │   └── styles/         # スタイルシート
│   ├── package.json        # Node.js依存関係
│   └── vite.config.ts      # Vite設定
├── nginx/                  # Nginx設定
│   ├── nginx.conf         # リバースプロキシ設定
│   └── certs/             # SSL証明書
├── docker-compose.yml      # 本番用Docker設定
├── docker-compose.dev.yml  # 開発用Docker設定
├── DEVELOPMENT_SETUP.md    # 開発環境セットアップ
├── CONTRIBUTING.md         # コントリビューションガイド（作成予定）
└── API_DOCUMENTATION.md    # API仕様書（作成予定）
```

## 🤝 コントリビューション

**探Qメイトはコミュニティによって発展するプロジェクトです！**

バグ報告、機能提案、コードの貢献など、あらゆる形の参加を歓迎します。

### 開発参加の流れ

1. このリポジトリをフォークします
2. 機能ブランチを作成します (`git checkout -b feature/amazing-feature`)
3. 変更をコミットします (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュします (`git push origin feature/amazing-feature`)
5. プルリクエストを作成します

### ブランチ戦略
- `main` - 本番環境用の安定版
- `develop` - 開発用ブランチ
- `feature/*` - 新機能開発
- `hotfix/*` - 緊急修正

## 🛠️ 技術スタック

### Frontend
- **React 18.2.0** + **TypeScript 5.3.3**
- **Vite 5.0.0** - 高速開発環境
- **Material-UI v5.14.20** - UIコンポーネントライブラリ
- **Zustand 4.4.7** - 状態管理
- **React Router v6.20.1** - ルーティング
- **React Markdown 9.0.1** - Markdownレンダリング
- **Framer Motion 10.16.16** - アニメーション
- **React Query 3.39.3** - データフェッチング

### Backend
- **FastAPI 0.115.6** - 高性能 Python Web フレームワーク
- **Uvicorn 0.34.0** - ASGIサーバー
- **Supabase 2.15.0** - BaaS (PostgreSQL)
- **OpenAI API 1.102.0** - AI対話機能（GPT-4）
- **Pydantic 2.10.6** - データバリデーション
- **PyJWT 2.10.1** - JWT認証
- **bcrypt 4.3.0** - パスワードハッシュ化

### DevOps & Infrastructure
- **Docker & Docker Compose** - コンテナ化
- **Nginx** - リバースプロキシ
- **mkcert** - ローカルSSL証明書
- **GitHub Actions** - CI/CD


## 🙏 謝辞

このプロジェクトは、多くの優れたオープンソースソフトウェアのおかげで成り立っています。

- [React](https://reactjs.org/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [OpenAI](https://openai.com/)
- [Material-UI](https://mui.com/)
- [Supabase](https://supabase.com/)
- [Docker](https://www.docker.com/)
- [Vite](https://vitejs.dev/)

## 📞 サポート

- **Issues**: [GitHub Issues](https://github.com/your-username/tanqmates/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/tanqmates/discussions)
- **Documentation**: [Wiki](https://github.com/your-username/tanqmates/wiki)
- **Email**: support@tanqmates.com

---

<div align="center">
  Made with ❤️ by the TanQMates Community
</div>