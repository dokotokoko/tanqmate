# 探Qメイト デザインシステム案内

このファイルは、フロントエンド実装者向けの入口ドキュメントである。

## 正本

デザインシステムの正本は以下。

- マスター仕様: [docs/design_system_master_spec.md](/abs/path/C:/Users/kouta/tanqmates/docs/design_system_master_spec.md)
- レビュー背景: [docs/design_system_review_report.md](/abs/path/C:/Users/kouta/tanqmates/docs/design_system_review_report.md)
- 基礎仕様: [docs/design_system_foundation_spec.md](/abs/path/C:/Users/kouta/tanqmates/docs/design_system_foundation_spec.md)
- ガバナンス仕様: [docs/design_system_governance_spec.md](/abs/path/C:/Users/kouta/tanqmates/docs/design_system_governance_spec.md)

## 実装の正本

- トークン実装: [design-system.ts](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/design-system.ts)
- グローバル補助: [global.css](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/global.css)
- 共通部品:
  - [Button.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/common/Button.tsx)
  - [Card.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/common/Card.tsx)
  - [Input.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/common/Input.tsx)
  - [Badge.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/common/Badge.tsx)
  - [Typography.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/common/Typography.tsx)

## システム方針

探Qメイトのデザインシステムは `Warm-Neutral First + Trust Blue Accent` を基本方針とする。

- ベースは暖色ニュートラル
- 主行動は暖色アクセント
- 青は信頼、情報、整理の補助
- AIチャット画面を参照実装とする

## 実装ルール

- 新しい固定色の直書きを追加しない
- まずトークンを `design-system.ts` に追加する
- 画面側で色を決めず、共通部品またはトークンを使う
- Chat / Diary / Dashboard / Forms の4系統で一貫性を確認する

## 次にやること

1. `design-system.ts` をマスター仕様に合わせて更新
2. `global.css` の旧青系変数を整理
3. 共通部品を暖色基準に再設計
4. 画面個別の固定色を段階的に除去
