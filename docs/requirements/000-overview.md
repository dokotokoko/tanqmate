# 探Qメイト 全体要件

## Purpose

探Qメイトは、高校生の探究学習を支援する AI 伴走型プロダクトです。

目的は、AI が答えを代替することではなく、生徒が問いを育て、考えを整理し、次の行動を選び、振り返りを継続できるように支援することです。

## Product Principles

- 生徒の興味や違和感を起点にする
- AI は最終判断者ではなく、問い返し、整理、視点提示、次の一歩の支援を行う
- 生徒自身の言葉、感情、内省を尊重する
- 先生には raw data ではなく、生徒確認済みの共有情報を届ける
- 学習支援と個人情報保護を両立する
- UI は評価・管理よりも伴走・内省・前進を支える

## Main User Groups

- 生徒: 探究テーマ、問い、調査、記録、振り返りを進める
- 教員: 生徒の状況を把握し、必要な声かけや支援を行う
- 管理者: 学校、ユーザー、運用状態を管理する

## Current Feature Areas

- AI チャット
- 日誌 / 振り返り
- 認証 / オンボーディング
- 学校コンテキスト
- クエスト / 次の一歩支援
- 先生向けビュー
- Vibes Tanq

## Source Documents

Feature details live under `docs/requirements/features/`.

- [認証](features/feature-auth.md)
- [日誌](features/feature-diary.md)
- [オンボーディング](features/feature-onboarding.md)
- [学校コンテキスト](features/feature-school-context.md)
- [VIBES TANQ](features/feature-vibes-tanq.md)

Non-functional requirements live in [010-non-functional.md](010-non-functional.md).
