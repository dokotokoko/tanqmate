# エージェント用ドキュメント整備 仕様書

## 1. 概要

本仕様は、探Qメイトにおける AI コーディングエージェント向けドキュメント整備の方針を定義する。

対象となる主要ドキュメントは以下の3つである。

```txt
AGENTS.md
DESIGN.md
docs/workflows/DEVELOPMENT_WORKFLOW.md
```

本整備の目的は、AI エージェントが開発・実装・レビュー補助を行う際に、必要な情報へ迷わずアクセスできる状態を作り、実装精度・設計一貫性・安全性を向上させることである。
つまり、AIエージェントにとってのハーネスエンジニアリングの基本となるドキュメント整備です。

---

## 2. ゴール

このドキュメント整備のゴールは、以下である。

1. AI エージェントが最初に読むべき入口として `AGENTS.md` を整備する
2. UI 実装時の正本として `DESIGN.md` を整備する
3. 開発の進め方、仕様駆動開発、PR ルールを `docs/workflows/DEVELOPMENT_WORKFLOW.md` に分離する
4. `AGENTS.md` の文章量を抑え、詳細は適切な参照先に分離する
5. エージェントが古い仕様や誤ったドキュメントを参照しにくい構造にする
6. 要件、デザイン、開発手順、実装ルールの責務を明確に分ける
7. 探Qメイトの教育方針、デザイン方針、個人情報保護方針を AI エージェントが守れる状態にする

---

## 3. 非ゴール

本仕様では、以下は対象外とする。

- 個別機能の詳細要件を `AGENTS.md` に書くこと
- API 仕様や DB スキーマを `AGENTS.md` に書くこと
- すべての開発ルールを `AGENTS.md` に集約すること
- `DESIGN.md` にプロダクト要件や API 仕様を含めること
- 開発ワークフローを README に混在させること
- 古い仕様書を現在仕様として扱い続けること

---

## 4. ドキュメント全体方針

探Qメイトでは、エージェント向けドキュメントを次の役割で分離する。

```txt
AGENTS.md
  → AI エージェントが最初に読む入口。AIエージェント用のREADME
     最小限の原則、参照先、禁止事項、完了チェックを書く。

DESIGN.md
  → UI デザインシステムの正本。
     色、文字、余白、角丸、コンポーネント、UXトーン、このプロジェクトの世界観（散文的）を書く。

docs/workflows/DEVELOPMENT_WORKFLOW.md
  → 開発の進め方の正本。
     仕様駆動開発、フェーズ確認、issue、PR、テスト、完了報告を書く。

docs/requirements/
  → プロダクト要件・機能要件の正本。
     全体要件、非機能要件、機能ごとの要件を管理する。

docs/architecture/
  → 技術仕様の正本。
     API、DB、認証、システム構成、デプロイ方針を管理する。

docs/adr/
  → 重要な意思決定の履歴。
     なぜその判断をしたかを残す。
```

本仕様で新規整備する中心文書は、`AGENTS.md`、`DESIGN.md`、`docs/workflows/DEVELOPMENT_WORKFLOW.md` の3つである。

---

## 5. 推奨ディレクトリ構成

```txt
/
├── AGENTS.md
├── DESIGN.md
├── README.md
├── docs/
│   ├── workflows/
│   │   └── DEVELOPMENT_WORKFLOW.md
│   ├── requirements/
│   │   ├── README.md
│   │   ├── 000-overview.md
│   │   ├── 010-non-functional.md
│   │   ├── features/
│   │   └── archive/
│   ├── architecture/
│   │   ├── system.md
│   │   ├── api.md
│   │   └── data-model.md
│   └── adr/
│       ├── 2026-xx-xx-separate-requirements-from-agents.md
│       ├── 2026-xx-xx-use-design-md-as-design-system.md
│       └── 2026-xx-xx-use-spec-driven-development.md
├── frontend/
│   ├── README.md
├── backend/
│   ├── README.md
└── .codex/
    └── specs/
```         

---

# 6. AGENTS.md 仕様

## 6.1 目的

`AGENTS.md` は、AI コーディングエージェントが探Qメイトで作業を始めるときに最初に読む入口文書である
`AGENTS.md` は、要件定義書ではない。  
`AGENTS.md` は、詳細な開発ワークフローでもない。  
`AGENTS.md` は、デザインシステムでもない。

役割は、AI エージェントに対して以下を伝えることである。

- プロジェクト概要
- このプロジェクトで守るべき最重要原則
- どの文書を正本として読むべきか
- どの作業では仕様駆動開発が必要か
- UI 実装時に `DESIGN.md` を参照すること
- 要件実装時に `docs/requirements/` を参照すること
- 詳細な開発手順は `docs/workflows/DEVELOPMENT_WORKFLOW.md` に従うこと
- 個人情報や教育データを慎重に扱うこと
- テスト、Lint、ドキュメント更新を怠らないこと

---

## 6.2 AGENTS.md の基本方針

`AGENTS.md` は軽量に保つ。

目安として、以下を避ける。

- 機能ごとの要件を長く書く
- 仕様駆動開発のフェーズ詳細をすべて書く
- API や DB の詳細仕様を書く
- UI デザイントークンを直接書く
- 古い仕様や一時メモを含める
- README と同じ説明を重複させる

`AGENTS.md` には、参照先と最小限の行動ルールを書く。

**AGENTS.mdは“行動ガイド＋テスト/ビルド/規約の要点＋要件リンク”**に限定し、本文はdocs/requirements/配下へ。

---

## 6.3 AGENTS.md に含める項目

`AGENTS.md` には以下のセクションを置く。

```md
# AGENTS.md

## 1. Project overview

## 2. Core principles

## 3. Source of truth documents

## 4. Required workflow

## 5. Requirements workflow

## 6. Design system rules

## 7. Coding rules

## 8. AI / LLM feature rules

## 9. Privacy and security

## 10. Test and quality commands

## 11. Documentation update rules

## 12. Completion checklist

## 13. Agent behavior
```

---

## 6.4 AGENTS.md に含めるべき内容

### Project overview

探Qメイトの目的を短く書く。

```md
探Qメイト is an educational product that supports inquiry-based learning.
The goal is not to give students final answers, but to help them clarify questions, plan next actions, reflect on learning, and let teachers notice where support may be needed.
```

---

### Core principles

AI エージェントが常に守る原則を書く。

```md
1. Support inquiry, not answer substitution.
2. Preserve student agency.
3. Keep the UI calm, readable, and non-judgmental.
4. Protect student privacy and school-related data.
5. Make small, focused changes.
6. Prefer existing project patterns over introducing new ones.
7. Keep UI implementation aligned with `DESIGN.md`.
8. Keep feature behavior aligned with `docs/requirements/`.
```

---

### Source of truth documents

各ドキュメントの役割を明示する。

```md
- `README.md`: Human-facing project overview and setup notes.
- `AGENTS.md`: AI-agent-facing development instructions.
- `DESIGN.md`: Visual design system and UI tone.
- `docs/INDEX.md`: Documentation map.
- `docs/workflows/DEVELOPMENT_WORKFLOW.md`: Development workflow and spec-driven development.
- `docs/requirements/`: Product and feature requirements.
- `docs/architecture/`: System, API, and data model documentation.
- `docs/adr/`: Important decision records.
```

---

### Required workflow

詳細手順は書かず、参照だけ置く。

```md
For new features, large changes, UI/UX flow changes, API changes, database changes, AI behavior changes, or privacy/security-related changes, follow:

`docs/workflows/DEVELOPMENT_WORKFLOW.md`
```

---

### Requirements workflow

要件 docs の読み方を書く。

```md
Before implementing feature behavior:

1. Read `docs/requirements/README.md`.
2. Read `docs/requirements/000-overview.md`.
3. Read the relevant file under `docs/requirements/features/`.
4. Read `docs/requirements/010-non-functional.md` when the change touches privacy, security, accessibility, performance, reliability, or AI behavior.
5. Implement the smallest change that satisfies the relevant requirements.
6. Update requirements docs if the implemented behavior changes the current specification.
```

---

### Design system rules

UI 実装時に `DESIGN.md` を参照するルールを書く。

```md
`DESIGN.md` is the source of truth for visual design.

When editing UI:

- Use colors, typography, spacing, rounded corners, and component patterns defined in `DESIGN.md`.
- Do not introduce new visual tokens unless `DESIGN.md` is updated.
- Keep student-facing UI calm, clear, and supportive.
- Keep teacher-facing UI scannable and careful with judgmental signals.
- Do not make AI output look like a final answer.
```

---

### Privacy and security

教育データを扱う上での必須ルールを書く。

```md
- Never commit secrets, API keys, tokens, credentials, or `.env` files.
- Do not log student names, private reflections, class information, or other personal data unless explicitly required and safe.
- Do not expose private student reflections to users who should not see them.
- Do not hard-code IP addresses, hostnames, or environment-specific URLs.
- Do not weaken authentication, authorization, or data access checks.
```

---

## 6.5 AGENTS.md に書かないもの

以下は `AGENTS.md` に書かない。

| 内容 | 置き場所 |
|---|---|
| 全体要件 | `docs/requirements/000-overview.md` |
| 非機能要件 | `docs/requirements/010-non-functional.md` |
| 機能ごとの詳細要件 | `docs/requirements/features/*.md` |
| UI デザイントークン | `DESIGN.md` |
| 仕様駆動開発の詳細手順 | `docs/workflows/DEVELOPMENT_WORKFLOW.md` |
| API 仕様 | `docs/architecture/api.md` |
| DB 設計 | `docs/architecture/data-model.md` |
| 重要な判断理由 | `docs/adr/*.md` |

---

## 6.6 AGENTS.md の完了条件

`AGENTS.md` は以下を満たすこと。

- [ ] AI エージェントが最初に読む入口になっている
- [ ] 探Qメイトの目的が簡潔に、明瞭に書かれている
- [ ] 参照すべき正本文書が明確である
- [ ] 開発ワークフロー詳細を別文書へ委譲している
- [ ] 要件詳細を `docs/requirements/` へ委譲している
- [ ] デザイン詳細を `DESIGN.md` へ委譲している
- [ ] セキュリティ・個人情報保護ルールがある
- [ ] AI / LLM 機能の教育的ガードレールがある
- [ ] テスト・品質確認の基本ルールがある
- [ ] ドキュメント更新ルールがある
- [ ] 文章量が過剰でない

---

# 7. DESIGN.md 仕様

## 7.1 目的

`DESIGN.md` は、探Qメイトの UI デザインシステムの正本である。

AI エージェントが UI を実装するとき、色、文字、余白、角丸、コンポーネント、UX トーンを一貫して扱えるようにするために作成する。

`DESIGN.md` は、単なるデザインメモではなく、AI エージェントが実装時に参照する機械可読・人間可読のデザイン仕様である。

---

## 7.2 DESIGN.md の基本方針

`DESIGN.md` は以下を含む。

- ブランド方針
- UI の感情設計
- 色トークン
- タイポグラフィ
- 余白
- 角丸
- コンポーネント方針
- 画面レイアウト方針
- 生徒向け / 教員向けの UX トーン
- Do / Don’t
- アクセシビリティ方針

`DESIGN.md` には、以下を含めない。

- API 仕様
- DB 設計
- 実装タスク一覧
- 機能ごとの詳細要件
- 開発ワークフロー
- issue / PR ルール

---

## 7.3 DESIGN.md の形式

`DESIGN.md` は、上部に YAML front matter を置き、その下に Markdown 本文を置く。

```md
---
version: alpha
name: "探Qメイト"
description: "A calm, supportive design system for inquiry-based learning."

colors:
  primary: "#2563EB"
  on-primary: "#FFFFFF"

typography:
  body-md:
    fontFamily: "Noto Sans JP"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.75

spacing:
  unit: 8px
  md: 16px

rounded:
  md: 12px
---

## Brand & Style

## Colors

## Typography

## Layout & Spacing

## Elevation & Depth

## Shapes

## Components

## Do's and Don'ts
```

---

## 7.4 DESIGN.md の推奨セクション

```md
# DESIGN.md

## Brand & Style

## Colors

## Typography

## Layout & Spacing

## Elevation & Depth

## Shapes

## Components

### App Shell

### Cards

### Inquiry Card

### Reflection Card

### Teacher Alert Card

### Buttons

### Inputs

### Chips

### AI Suggestion Block

## UX Writing

## Accessibility

## Do's and Don'ts
```

---

## 7.5 DESIGN.md に含める設計原則

探Qメイトの UI は、以下の原則に従う。

```txt
答えを与えるより、問いを育てる
管理ではなく、伴走する
評価ではなく、前進を支援する
生徒に安心感を与える
教員が支援判断をしやすい
個人情報や内省内容を不用意に露出しない
```

---

## 7.6 色の方針

現在のデザインシステム（オレンジを基調とした温かみのあるスタイル）を使用
青を基調としたデザインシステムは旧型なので採用しない
---

## 7.7 UX ライティング方針

生徒向け文言は、やさしく、具体的で、次の行動につながるものにする。
AIはあくまで1つの視点や考え方を提案するモノであり、AIは決定・判断をしてはいけない。

使う表現:

```txt
次に試してみること
問いを少し具体的にしてみましょう
今わかっていること
まだわからないこと
まず一つ選んでみましょう
```

避ける表現:

```txt
間違っています
正解は
あなたの考えは不十分です
問題のある生徒
AIが決めます
```

---

## 7.8 DESIGN.md の更新タイミング

以下の場合、`DESIGN.md` を更新する。

- 新しい色を追加した
- 新しい文字スタイルを追加した
- 余白、角丸、影のルールを変更した
- 新しい共通コンポーネントを追加した
- 生徒向け / 教員向けの UI トーンを変更した
- AI 出力の表示方法を変更した
- アクセシビリティ方針を変更した

---

## 7.9 DESIGN.md の完了条件

`DESIGN.md` は以下を満たすこと。

- [ ] YAML front matter に主要デザイントークンが定義されている
- [ ] 色、文字、余白、角丸、コンポーネントの方針がある
- [ ] 探Qメイトの教育的 UX 方針が書かれている
- [ ] 生徒向け / 教員向けのトーンが分かれている
- [ ] Do / Don’t が具体的である
- [ ] UI 実装時に AI エージェントが参照しやすい
- [ ] `AGENTS.md` から参照されている

---

# 8. 開発ワークフロードキュメント仕様

## 8.1 ファイル名

開発ワークフローは以下に作成する。

```txt
docs/workflows/DEVELOPMENT_WORKFLOW.md
```

---

## 8.2 目的

`docs/workflows/DEVELOPMENT_WORKFLOW.md` は、探Qメイトにおける開発の進め方を定義する文書である。

`AGENTS.md` には概要と参照だけを書き、詳細な作業手順はこの文書に集約する。

---

## 8.3 対象範囲

この文書には、以下を含める。

- 開発ワークフロー全体
- 仕様駆動開発の手順
- 要件定義フェーズ
- 設計フェーズ
- 実装計画フェーズ
- issue 作成フェーズ
- 実行フェーズ
- テスト・品質確認フェーズ
- Draft PR 作成フェーズ
- レビュワーコメント対応ルール
- 完了報告ルール
- `.cursor_workflow/specs/` の使い方
- `docs/requirements/` への反映ルール

---

## 8.4 開発ワークフローの基本形

```txt
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

日本語では以下の流れとする。

```txt
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

---

## 8.5 仕様駆動開発を必須とする作業

以下の作業では、仕様駆動開発を必須とする。

- 新機能の追加
- 既存機能の大きな変更
- UI / UX フローの変更
- API 仕様の変更
- DB スキーマやデータモデルの変更
- AI / LLM 応答挙動の変更
- 認証・権限・個人情報に関わる変更
- 生徒向け / 教員向けの表示内容に影響する変更
- 複数ファイル・複数レイヤーにまたがる変更

---

## 8.6 軽量フローでよい作業

以下は仕様駆動開発を省略できる。

- 誤字修正
- 小さなドキュメント修正
- フォーマット修正
- 明らかなバグ修正で既存仕様が変わらないもの
- テストの軽微な修正
- 小さなリファクタ

ただし、軽量フローでも以下は守る。

- `AGENTS.md` のルール
- `DESIGN.md` の UI 方針
- `docs/requirements/` の現在仕様
- 個人情報保護ルール
- テスト・Lint の実行または未実行理由の明記

---

## 8.7 作業ディレクトリ

仕様駆動開発の作業用ドキュメントは、以下に作成する。

```txt
.codex/specs/{spec_name}/
```

各 spec ディレクトリには以下を置く。

```txt
.codex/specs/{spec_name}/
├── requirements.md
├── design.md
└── implementations.md
```

---

## 8.8 要件定義フェーズ

作成先:

```txt
.codex/specs/{spec_name}/requirements.md
```

含める項目:

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

完了後、依頼者に確認する。

```txt
要件定義フェーズが完了しました。設計フェーズに進んでよろしいですか？
```

承認があるまで、設計フェーズへ進まない。

---

## 8.9 設計フェーズ

作成先:

```txt
.codex/specs/{spec_name}/design.md
```

含める項目:

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

UI 設計は必ず `DESIGN.md` に従う。

完了後、依頼者に確認する。

```txt
設計フェーズが完了しました。実装計画フェーズに進んでよろしいですか？
```

承認があるまで、実装計画フェーズへ進まない。

---

## 8.10 実装計画フェーズ

作成先:

```txt
.codex/specs/{spec_name}/implementations.md
```

含める項目:

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

完了後、依頼者に確認する。

```txt
実装計画フェーズが完了しました。issue作成フェーズに進んでよろしいですか？
```

承認があるまで、issue 作成フェーズへ進まない。

---

## 8.11 issue 作成フェーズ

実装計画の承認後、GitHub issue を作成する。

issue に含める項目:

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

issue 作成後、依頼者に確認する。

```txt
issue作成フェーズが完了しました。実行フェーズに進んでよろしいですか？
```

承認があるまで、実装に進まない。

---

## 8.12 実装フェーズ

実装時は以下を守る。

- `requirements.md` に従う
- `design.md` に従う
- `implementations.md` に従う
- `DESIGN.md` に従う
- `docs/requirements/` の現在仕様に従う
- `docs/architecture/` の技術仕様に従う
- 予定外の大きな変更をしない
- 矛盾や不明点があれば依頼者に確認する

---

## 8.13 テスト・品質確認フェーズ

関連するチェックを実行する。

フロントエンド例:

```bash
pnpm lint
pnpm test
pnpm build
```

バックエンド例:

```bash
pytest
ruff check .
mypy .
```

実際のコマンドはリポジトリ内の設定を優先する。

確認対象:

```txt
package.json
pnpm-lock.yaml
pyproject.toml
requirements.txt
Makefile
README.md
CI workflow files
```

実行できなかった場合は理由を明記する。  
実行していないテストを「通った」と書いてはならない。

---

## 8.14 PR 作成フェーズ

PR は必ず Draft PR として作成する。

タイトル形式:

```txt
[<project_name>] <title>
```

探Qメイトでは以下とする。

```txt
[探Qメイト] <title>
```

PR 本文には以下を含める。

```md
## Summary

## Related issue

## Referenced specs

## Changes

## Test results

## Documentation updates

## Notes
```

---

## 8.15 レビュワーコメント対応

レビュワーからコメントがあった場合、AI エージェントは勝手に修正しない。

依頼者に確認する。

```txt
レビュワーからコメントがありました。対応方針を確認したいため、指示をお願いします。
```

依頼者から明示的な指示があった場合のみ、修正作業を再開する。

---

## 8.16 完了報告

Draft PR 作成後、依頼者へ報告する。

報告形式:

```md
Pull Request を Draft PR として作成しました。

- PR:
- 関連 issue:
- 参照した仕様:
- 実行したテスト:
- 更新した docs:
- 確認してほしい点:
```

---

## 8.17 正本文書への反映

`.codex/specs/` は作業用の一時仕様である。

実装後、必要な内容は正本文書へ反映する。

```txt
docs/requirements/
docs/architecture/
DESIGN.md
docs/adr/
```

反映ルール:

- 現在の機能要件は `docs/requirements/features/` に反映する
- 非機能要件は `docs/requirements/010-non-functional.md` に反映する
- API、DB、システム構成は `docs/architecture/` に反映する
- UI デザインシステム変更は `DESIGN.md` に反映する
- 長期的に重要な判断は `docs/adr/` に残す
- `.cursor_workflow/specs/` を現在仕様として扱い続けない

---

## 8.18 開発ワークフロードキュメントの完了条件

`docs/workflows/DEVELOPMENT_WORKFLOW.md` は以下を満たすこと。

- [ ] 仕様駆動開発の流れが明確である
- [ ] 仕様駆動開発を使う条件が明確である
- [ ] 軽量フローでよい作業が明確である
- [ ] 各フェーズの作成物が明確である
- [ ] 各フェーズ後の依頼者確認が明記されている
- [ ] `.cursor_workflow/specs/` の使い方が明確である
- [ ] issue 作成ルールがある
- [ ] Draft PR ルールがある
- [ ] レビュワーコメント対応ルールがある
- [ ] テスト・品質確認ルールがある
- [ ] 正本文書への反映ルールがある
- [ ] `AGENTS.md` から参照されている

---

# 9. 3文書の関係

3つの文書の関係は以下の通りである。

```txt
AGENTS.md
  ↓ 参照
DESIGN.md

AGENTS.md
  ↓ 参照
docs/workflows/DEVELOPMENT_WORKFLOW.md

docs/workflows/DEVELOPMENT_WORKFLOW.md
  ↓ 参照
docs/requirements/
docs/architecture/
DESIGN.md
docs/adr/
```

`AGENTS.md` は入口であり、詳細を抱え込まない。  
`DESIGN.md` は UI の正本である。  
`DEVELOPMENT_WORKFLOW.md` は開発手順の正本である。

---

# 10. ドキュメント更新ルール

## 10.1 AGENTS.md を更新する場合

以下の場合に更新する。

- AI エージェントが最初に読むべき参照先が変わった
- 開発コマンドの基本方針が変わった
- セキュリティ・個人情報保護の基本ルールが変わった
- `DESIGN.md` や workflow 文書の扱いが変わった
- サブディレクトリごとの `AGENTS.md` を追加することになった

---

## 10.2 DESIGN.md を更新する場合

以下の場合に更新する。

- UI デザイントークンを変更した
- 新しい共通コンポーネントを追加した
- 生徒向け / 教員向けの UX トーンを変更した
- AI 出力の表示方針を変更した
- アクセシビリティ方針を変更した

---

## 10.3 DEVELOPMENT_WORKFLOW.md を更新する場合

以下の場合に更新する。

- 仕様駆動開発のフェーズを変更した
- issue 作成ルールを変更した
- PR ルールを変更した
- テスト・Lint・ビルドの基本方針を変更した
- `.cursor_workflow/specs/` の運用を変更した
- 要件 docs への反映ルールを変更した

---

# 11. 受入条件

本ドキュメント整備は、以下を満たしたら完了とする。

- [ ] `AGENTS.md` が作成されている
- [ ] `AGENTS.md` が軽量な入口文書になっている
- [ ] `AGENTS.md` から `DESIGN.md` を参照している
- [ ] `AGENTS.md` から `docs/workflows/DEVELOPMENT_WORKFLOW.md` を参照している
- [ ] `AGENTS.md` から `docs/requirements/` を参照している
- [ ] `DESIGN.md` が作成されている
- [ ] `DESIGN.md` にデザイントークンと UI 方針が定義されている
- [ ] `DESIGN.md` に探Qメイトの教育的 UX 方針が含まれている
- [ ] `docs/workflows/DEVELOPMENT_WORKFLOW.md` が作成されている
- [ ] 開発ワークフローに仕様駆動開発の流れが定義されている
- [ ] 各フェーズの成果物と確認タイミングが明記されている
- [ ] Draft PR ルールが定義されている
- [ ] レビュワーコメント対応ルールが定義されている
- [ ] 3文書の責務が重複していない
- [ ] AI エージェントがどの文書を読めばよいか迷わない
- [ ] 古い仕様を現在仕様として読ませない方針がある

---

# 12. 最終方針

探Qメイトでは、エージェント向けドキュメントを次の思想で整備する。

```txt
AGENTS.md は軽くする。
DESIGN.md は UI の正本にする。
開発ワークフローは別文書にする。
要件定義は docs/requirements/ に置く。
仕様駆動開発の作業文書は .cursor_workflow/specs/ に置く。
重要な判断理由は docs/adr/ に残す。
```

この構成により、AI エージェントは以下を実現できる。

- 作業開始時に読むべき文書が明確になる
- UI 実装の一貫性が上がる
- 要件と実装のズレが減る
- 仕様確認なしの思い込み実装を防げる
- 個人情報や教育 UX の扱いを誤りにくくなる
- 実装後のドキュメント更新漏れを減らせる
- 将来の人間・AI 双方が判断経緯を追いやすくなる
