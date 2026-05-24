# 探Qメイト デザインシステム案内

このファイルは、フロントエンド実装者向けの入口ドキュメントである。
UI 方針や運用ルールの正本は [DESIGN.md](../../../../DESIGN.md) を参照する。
詳細背景が必要な場合は [docs/design_system_master_spec.md](../../../../docs/design_system_master_spec.md) も参照する。

## 実装の正本

- トークン実装: [design-system.ts](./design-system.ts)
- グローバル補助: [global.css](./global.css)
- 共通部品:
  - [Button.tsx](../components/common/Button.tsx)
  - [Card.tsx](../components/common/Card.tsx)
  - [Input.tsx](../components/common/Input.tsx)
  - [Badge.tsx](../components/common/Badge.tsx)
  - [Typography.tsx](../components/common/Typography.tsx)

## 実装ルール

- 新しい固定色の直書きを追加しない
- まずトークンを `design-system.ts` に追加する
- 画面側で色を決めず、共通部品またはトークンを使う
- Chat / Diary / Dashboard / Forms の4系統で一貫性を確認する
