# Requirements

探Qメイトのプロダクト要件・機能要件の正本です。

## Read Order

Before implementing feature behavior:

1. [000-overview.md](000-overview.md)
2. Relevant feature requirement under [features/](features/)
3. [010-non-functional.md](010-non-functional.md) when the change touches privacy, security, accessibility, performance, reliability, or AI behavior

## Core Documents

- [Overview](000-overview.md)
- [Non-functional Requirements](010-non-functional.md)

## Feature Requirements

- [認証](features/feature-auth.md)
- [日誌](features/feature-diary.md)
- [オンボーディング](features/feature-onboarding.md)
- [学校コンテキスト](features/feature-school-context.md)
- [VIBES TANQ](features/feature-vibes-tanq.md)

## Update Rules

- New feature requirements go under `features/`.
- If behavior changes, update the relevant feature requirement in the same change.
- Privacy, security, accessibility, performance, reliability, and AI behavior changes must also be reflected in `010-non-functional.md` when the general rule changes.
