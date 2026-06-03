# Development Workflow

このドキュメントは、探Qメイトにおける開発作業の進め方を定義します。`AGENTS.md` には入口となるルールだけを置き、詳細なワークフローはこのドキュメントに置きます。

## 1. 基本フロー

```text
Requirement definition
  ↓
Design
  ↓
Implementation plan
  ↓
Issue creation
  ↓
Implementation
  ↓
Testing and quality checks
  ↓
Draft PR
  ↓
Requester report
```

日本語では次の流れです。

```text
要件定義
  ↓
設計
  ↓
実装計画
  ↓
issue 作成
  ↓
実装
  ↓
テスト・品質確認
  ↓
Draft PR 作成
  ↓
依頼者への報告
```

## 2. 仕様駆動開発が必要な場合

以下では、完全な仕様駆動開発ワークフローを使用します。

- 新機能
- 大きな挙動変更
- UI / UX フロー変更
- API 契約の変更
- DB スキーマまたはデータモデルの変更
- AI / LLM の応答挙動変更
- 認証、認可、プライバシー、セキュリティに関わる変更
- 生徒向けまたは教員向けに表示される情報へ影響する変更
- 複数ファイルまたは複数レイヤーにまたがる変更

## 3. 軽量フロー

以下では、完全なワークフローを省略してもかまいません。

- 誤字修正
- 小さなドキュメント編集
- フォーマットのみの変更
- 既存仕様を変えない明らかなバグ修正
- 小さなテスト修正
- 挙動変更のない小さなリファクタ

軽量フローでも、`AGENTS.md`、`DESIGN.md`、`docs/requirements/`、プライバシールール、関連するテスト / ビルドチェックには従ってください。

## 4. 仕様作業スペース

作業中の仕様は一時的なものであり、以下に置きます。

```text
.codex/specs/{spec_name}/
```

各 spec ディレクトリには、以下を含めます。

```text
.codex/specs/{spec_name}/
├── requirements.md
├── design.md
└── implementations.md
```

`.codex/specs/` は現在の正本ではありません。実装後、永続的に必要な内容は `docs/requirements/`、`docs/architecture/`、`DESIGN.md`、または `docs/adr/` に反映してください。

## 5. 要件定義フェーズ

作成先:

```text
.codex/specs/{spec_name}/requirements.md
```

含める内容:

```md
# Requirements

## Background
## Goal
## Non-goals
## Users
## Current behavior
## Desired behavior
## Functional requirements
## Non-functional requirements
## Acceptance criteria
## Related documents
## Open questions
```

このフェーズの完了後、以下を確認します。

```text
要件定義フェーズが完了しました。設計フェーズに進んでよろしいですか？
```

依頼者が直接実装を明示的に求め、かつその変更が軽量フローに該当する場合を除き、依頼者の承認があるまで次へ進まないでください。

## 6. 設計フェーズ

作成先:

```text
.codex/specs/{spec_name}/design.md
```

含める内容:

```md
# Design

## Overview
## User flow
## UI design
## API design
## Data model
## AI behavior
## Privacy and security
## Error handling
## Accessibility
## Test strategy
## Documentation updates
## Risks
## Alternatives considered
```

UI 設計は `DESIGN.md` に従う必要があります。

このフェーズの完了後、以下を確認します。

```text
設計フェーズが完了しました。実装計画フェーズに進んでよろしいですか？
```

## 7. 実装計画フェーズ

作成先:

```text
.codex/specs/{spec_name}/implementations.md
```

含める内容:

```md
# Implementation Plan

## Summary
## Tasks
## Files to change
## Frontend changes
## Backend changes
## Database changes
## AI / prompt changes
## Tests
## Documentation updates
## Migration or rollout
## Done definition
```

このフェーズの完了後、以下を確認します。

```text
実装計画フェーズが完了しました。issue作成フェーズに進んでよろしいですか？
```

## 8. issue 作成フェーズ

実装計画が承認された後、依頼者が issue ベースの管理を希望する場合は GitHub issue を作成します。

issue 本文:

```md
## Summary
## Background
## Requirements
## Design
## Implementation plan
## Acceptance criteria
## Tasks
## Test plan
## Documentation
```

issue 作成後、以下を確認します。

```text
issue作成フェーズが完了しました。実行フェーズに進んでよろしいですか？
```

## 9. 実装フェーズ

実装中は以下を守ってください。

- `requirements.md`、`design.md`、`implementations.md` に従う
- `DESIGN.md` に従う
- 現在の `docs/requirements/` に従う
- `docs/architecture/` に従う
- 計画外の大きな変更を避ける
- プロダクト、プライバシー、データマイグレーションに関する判断が不明確な場合は確認する
- 無関係なユーザー変更を巻き戻さない

## 10. テストと品質確認

変更に関連するチェックを実行します。リポジトリで実際に定義されているコマンドを優先してください。

フロントエンド:

```bash
cd apps/frontend
npm run build
```

バックエンド:

```bash
cd apps/backend
python -m pytest
```

必要に応じて、プロジェクト設定も確認します。

```text
package.json
package-lock.json
requirements.txt
pyproject.toml
Makefile
CI workflow files
```

チェックを実行できない場合は、その理由を明記してください。実行していないテストを「通った」と言ってはいけません。

## 11. Draft PR フェーズ

依頼者が別途指示しない限り、PR は Draft PR として作成します。

タイトル:

```text
[探Qメイト] <title>
```

本文:

```md
## Summary
## Related issue
## Referenced specs
## Changes
## Test results
## Documentation updates
## Notes
```

## 12. レビュワーコメント対応

レビュワーコメントが来た場合、広範な変更を自動的に行ってはいけません。求められている対応が曖昧、またはスコープを変える場合は、依頼者に対応方針を確認してください。

```text
レビュワーからコメントがありました。対応方針を確認したいため、指示をお願いします。
```

## 13. 完了報告

実装後または Draft PR 作成後、以下を報告します。

```md
- 変更ファイル:
- 関連 issue / PR:
- 参照した仕様:
- 実行したテスト:
- ドキュメント更新:
- 残存リスク:
```

## 14. 正本文書への反映

実装後、一時的な作業仕様から永続的な知識を移してください。

- 機能の挙動: `docs/requirements/features/`
- 非機能要件: `docs/requirements/010-non-functional.md`
- API、DB、システム構造: `docs/architecture/`
- UI デザインシステム変更: `DESIGN.md`
- 長期的に重要な意思決定: `docs/adr/`

一時的な作業仕様を現在のドキュメントとして保持し続けないでください。
