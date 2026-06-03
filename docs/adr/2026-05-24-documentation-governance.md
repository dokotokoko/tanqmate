# ADR: Markdown ドキュメント管理方針

## Status

Accepted

## Date

2026-05-24

## Context

リポジトリ内に、現行仕様、過去の実装メモ、移行ガイド、完了レポート、レビュー、チェックリスト、モック由来の要件が混在していた。

特に以下の問題があった。

- `backend/` や `react-app/` など旧構成を前提にした文書が残っていた
- 完了済みの実装レポートや移行メモが、現行仕様と同じ場所に置かれていた
- 要件、デザインシステム、レビュー、チェックリスト、設計判断の置き場所が分かれていなかった
- AI エージェントや開発者が、過去資料を現行仕様として参照するリスクがあった

今後は、ルートの `AGENTS.md` と `DESIGN.md` を入口にし、開発ワークフロー、要件、技術仕様、設計判断を `docs` 配下で管理する。

## Decision

Markdown ドキュメントを次の方針で管理する。

### ルートに残す文書

- `README.md`: プロジェクト概要、主要機能、開発入口
- `AGENTS.md`: AI エージェントと開発者向け作業ルール
- `DESIGN.md`: UI デザインシステムと UX トーンの正本

### `docs` 配下に残す現行文書

- `docs/requirements/`: 機能要件
- `docs/architecture/`: 技術仕様
- `docs/workflows/`: 開発手順と仕様駆動開発
- `docs/adr/`: 重要な設計判断
- `docs/checklists/`: 本番リリースや公開前確認に必要なチェックリスト
- `docs/reviews/`: UI/UX、公開前確認などのレビューレポート
- `docs/design_system_master_spec.md`: デザインシステム背景・詳細補助
- `docs/DEVELOPMENT_SETUP.md`: 開発環境セットアップ
- `docs/release_plan.md`: リリース計画
- `docs/chat_response_architecture.mmd`: チャット応答生成アーキテクチャ図

### `archive` の扱い

`archive` は過去の遺物を退避する場所とする。通常の実装、設計判断、要件確認では参照しない。

必要な情報が `archive` にしかない場合は、該当内容を現行文書へ移し、現在の構成や実装に合わせて更新してから参照する。

### README の扱い

`apps/backend/README.md` と `apps/frontend/README.md` は、それぞれのアプリケーション実装者向け入口として残す。

これらは現行構成だけを説明し、旧構成、完了済み移行、過去のモック実装、廃止済み認証方式は記載しない。

## Consequences

### Positive

- 現行仕様と過去資料の境界が明確になる
- AI エージェントが古い実装メモを正本として参照するリスクが下がる
- 要件、設計判断、レビュー、チェックリストを用途別に探せる
- ルートの文書が入口として機能しやすくなる

### Negative

- 過去資料を直接探したい場合は `archive` を明示的に確認する必要がある
- 既存リンクを移動後の配置へ更新する運用が必要になる
- 退避した文書の中に有用な断片が残っていても、現行文書へ移すまでは参照対象にしない

## Operating Rules

- 仕様変更を伴う作業では、該当する `docs/requirements`、`docs/adr`、`DESIGN.md` のいずれかを更新する
- 重要な設計判断は `docs/adr/YYYY-MM-DD-topic.md` として追加する
- 本番リリースに必要な確認項目だけを `docs/checklists` に残す
- レビュー結果は `docs/reviews` に残し、実装方針へ昇格する内容は要件または ADR に移す
- デザインシステムの判断は `DESIGN.md` を正本にする
- 完了レポート、移行ログ、古い実装ガイド、モック由来の詳細メモは `archive` へ退避する
- `archive` の内容を現行文書から直接リンクしない

## Current Structure

```text
docs/
  requirements/
    README.md
    000-overview.md
    010-non-functional.md
    features/
      feature-auth.md
      feature-diary.md
      feature-onboarding.md
      feature-school-context.md
      feature-vibes-tanq.md
  adr/
    README.md
    2026-05-24-conversation-id-management.md
    2026-05-24-documentation-governance.md
  architecture/
    system.md
    api.md
    data-model.md
  workflows/
    DEVELOPMENT_WORKFLOW.md
  checklists/
    README.md
    auth_test_checklist.md
    release_execution_checklist.md
  reviews/
    README.md
    diary_uiux_review_report.md
    webapp_pre_release_check_report_2026-04-13.md
  design_system_master_spec.md
  DEVELOPMENT_SETUP.md
  release_plan.md
  chat_response_architecture.mmd
```
