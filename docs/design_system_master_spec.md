# 探Qメイト デザインシステム マスター仕様

## 目的

この文書は、探Qメイトのフロントエンド全体で使うデザインシステムの正本である。

目的は以下の3つ。

- AIチャット画面で成立している `柔らかさ` `温かさ` `読みやすさ` を全画面へ広げる
- 今後の画面追加や改修で、色・余白・部品の判断がぶれないようにする
- `レビュー文書` と `実装` の間にある抽象度の差を埋め、すぐ運用できる基準にする

この仕様は、以下を統合したマスター文書として扱う。

- [docs/design_system_review_report.md](/abs/path/C:/Users/kouta/tanqmates/docs/design_system_review_report.md)
- [docs/design_system_foundation_spec.md](/abs/path/C:/Users/kouta/tanqmates/docs/design_system_foundation_spec.md)
- [docs/design_system_governance_spec.md](/abs/path/C:/Users/kouta/tanqmates/docs/design_system_governance_spec.md)

## 正本と責務

### 正本

- デザイン方針の正本: この文書
- トークン実装の正本: `apps/frontend/src/styles/design-system.ts`
- グローバル変数の補助実装: `apps/frontend/src/styles/global.css`
- 共通UI部品の正本:
  - `apps/frontend/src/components/common/Button.tsx`
  - `apps/frontend/src/components/common/Card.tsx`
  - `apps/frontend/src/components/common/Input.tsx`
  - `apps/frontend/src/components/common/Badge.tsx`
  - `apps/frontend/src/components/common/Typography.tsx`

### 責務分離

- `design-system.ts` はトークンだけを定義する
- `common/*` はトークンを使って共通部品を実装する
- 画面コンポーネントはトークンや固定色を直接持たず、共通部品かセマンティックな色参照を使う
- `global.css` はテーマで参照する補助変数と最低限の全体設定のみを持つ

## システムの中心方針

探Qメイトのデザインシステムは、次の一文で定義する。

> `Warm-Neutral First + Trust Blue Accent`

意味:

- ベースは暖色ニュートラル
- 行動と対話は暖色アクセント
- 青は信頼、情報、整理の補助
- 全画面はチャット画面の空気感を基準に揃える

## ブランドトーン

### 目指す印象

- 知的だけど冷たくない
- やさしいが幼すぎない
- 手触りは紙、反応はデジタル
- 支援的で、圧が低い
- 内省や対話に向いている

### 避ける印象

- 高彩度ブルー中心のSaaS感
- 真っ白背景の無機質さ
- 箱が並ぶだけの管理画面感
- ページごとに人格が変わる色設計
- 感情系UIなのに情報設計だけが強い状態

## 参照実装

視覚的な参照実装は `AIチャット画面` とする。

対象:

- [apps/frontend/src/pages/ChatPage.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/pages/ChatPage.tsx)
- [apps/frontend/src/components/MemoChat/AIChat.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/AIChat.tsx)
- [apps/frontend/src/components/MemoChat/ChatMessage.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/ChatMessage.tsx)
- [apps/frontend/src/components/MemoChat/ChatInputArea.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/ChatInputArea.tsx)

理由:

- 白すぎない背景
- 暖色の主アクセント
- ウォームグレーの文字
- 低刺激な境界線
- 面の重なりで構造を見せる設計

## デザイントークン

### 1. 色トークン

#### ベース面

| Token | Value | 用途 |
|---|---|---|
| `canvas` | `#FFFAED` | アプリ全体背景 |
| `surface` | `#FFFDF7` | 標準カード、標準パネル、標準入力面 |
| `surfaceSubtle` | `#FFF6E8` | 補助面、入力背景、やわらかい区切り |
| `surfaceRaised` | `#FFFFFF` | ダイアログ、ポップオーバー、最上位面 |

#### 境界線

| Token | Value | 用途 |
|---|---|---|
| `borderSoft` | `#F0E8D8` | 標準区切り線、カード枠 |
| `borderWarm` | `#FFE4C8` | 暖色アクセント枠、アクティブな入力周辺 |
| `borderStrong` | `#D8CDB8` | 例外的に構造を強調したいときのみ |

#### 文字

| Token | Value | 用途 |
|---|---|---|
| `textPrimary` | `#2D2A26` | 見出し、本文、主要ラベル |
| `textSecondary` | `#6B6560` | 補足本文、説明文、時刻、メタ情報 |
| `textMuted` | `#9E9891` | プレースホルダ、無効状態、低優先情報 |
| `textInverse` | `#FFFFFF` | 暖色塗りボタン上など |

#### 暖色アクセント

| Token | Value | 用途 |
|---|---|---|
| `accentWarm` | `#FF8C5A` | 主CTA、送信、保存、次へ |
| `accentWarmHover` | `#FF7A42` | hover |
| `accentWarmActive` | `#FF6B35` | active/pressed |
| `accentWarmSoft` | `#FFE4CC` | 薄い暖色面、タグ、補助アクション |

#### 青アクセント

| Token | Value | 用途 |
|---|---|---|
| `trustBlue` | `#7BA9C9` | 情報、履歴、整理された選択状態 |
| `trustBlueHover` | `#5F94B9` | hover |
| `trustBlueSoft` | `#DCEAF3` | 情報ボックス、静かな選択面 |

#### 状態色

状態色は現行より低彩度でウォーム寄りに再調整する。

| Token | Value | 用途 |
|---|---|---|
| `success` | `#6FA67A` | 成功 |
| `warning` | `#D89A43` | 注意 |
| `error` | `#D46A5F` | エラー |
| `info` | `#6F98B8` | 情報 |

### 2. フォーカス

| Token | Value | 用途 |
|---|---|---|
| `focusWarm` | `rgba(255, 140, 90, 0.35)` | 入力、主ボタン、感情入力、日誌 |
| `focusWarmStrong` | `rgba(255, 122, 66, 0.45)` | 重要操作の強いフォーカス |
| `focusBlue` | `rgba(123, 169, 201, 0.30)` | 履歴、情報、ナビゲーション |

ルール:

- 標準フォーカスは暖色
- 情報UIに限って青フォーカスを許可
- 同一コンポーネント群で暖色と青を混在させない

### 3. シャドウ

| Token | Value | 用途 |
|---|---|---|
| `shadowSoft` | `0 4px 16px rgba(120, 92, 64, 0.08)` | 標準カード、入力シェル |
| `shadowMedium` | `0 8px 24px rgba(120, 92, 64, 0.12)` | 浮いたパネル、ダイアログ |
| `shadowAccent` | `0 8px 24px rgba(255, 140, 90, 0.18)` | 主CTA周辺、限定的な強調 |

ルール:

- 暗いグレー影を主役にしない
- 影はドラマではなく空気感のために使う
- 画面全体に重い影を多用しない

### 4. スペーシング

基準は8pxグリッド。

| Token | Value |
|---|---|
| `xs` | `4px` |
| `sm` | `8px` |
| `md` | `12px` |
| `lg` | `16px` |
| `xl` | `24px` |
| `2xl` | `32px` |
| `3xl` | `48px` |
| `4xl` | `64px` |

運用基準:

- ページガター: `24px`
- セクション間: `32-48px`
- カード内余白: `24px`
- 入力内余白: `12-16px`
- チップ内余白: `6-12px`

### 5. 角丸

| Token | Value | 主用途 |
|---|---|---|
| `xs` | `4px` | 補助UI |
| `sm` | `8px` | 小型要素 |
| `md` | `12px` | 入力 |
| `lg` | `16px` | カード |
| `xl` | `20px` | ダイアログ、入力島 |
| `pill` | `9999px` | チップ、タグ |

ルール:

- 1画面内で角丸の人格を増やしすぎない
- コンテナより操作部品のほうを少しだけ柔らかくする

### 6. タイポグラフィ

フォント:

- `"Noto Sans JP", "Roboto", "Helvetica", "Arial", sans-serif`

階層:

| Role | Size | Weight |
|---|---|---|
| Page Title | `28-32px` | `700` |
| Section Title | `20-24px` | `600` |
| Body | `16px` | `400` |
| Support | `14px` | `400-500` |
| Caption / Meta | `12-13px` | `500` |

ルール:

- 本文は黒ではなくウォームグレー寄り
- 見出しだけを強くして、補助情報は静かにする
- ページごとに別のフォント人格を作らない

## 色の役割ルール

### 暖色を使う場所

- 主CTA
- 送信
- 保存
- 次へ
- 対話中の現在アクション
- 感情入力、日誌、内省フロー
- AIの近接的な支援表現

### 青を使う場所

- 履歴
- 情報ラベル
- 状態説明
- ナビゲーション補助
- 冷静さを保ちたい選択状態
- ダッシュボードの整理された情報構造

### 禁止

- 青を全体の主CTA色として使わない
- 同一画面で `暖色主CTA` と `青主CTA` を競合させない
- 感情に寄る画面で青を主役にしない
- 暖色を情報ダッシュボード全体に広げすぎない

## コンポーネント仕様

### Button

推奨variant:

- `solid`
- `soft`
- `outline`
- `ghost`
- `danger`
- `cool`

基準:

- `solid`: 暖色主ボタン
- `soft`: 薄い暖色背景の補助ボタン
- `outline`: ウォームグレー枠
- `ghost`: 面を持たない操作
- `cool`: 青系補助操作

禁止:

- 青を既定 primary として全体で使い続けること
- 画面ごとに variant 名と意味を変えること

### Card

推奨variant:

- `default`
- `elevated`
- `outlined`
- `tinted`
- `interactive`

基準:

- `default`: `surface + borderSoft + shadowSoft`
- `elevated`: `surfaceRaised + shadowMedium`
- `outlined`: `surface + borderSoft`
- `tinted`: `surfaceSubtle` ベース
- `interactive`: hover を持つが、色より面の変化で示す

### Input

推奨variant:

- `outlined`
- `filled`
- `surface`

基準:

- 入力の標準背景は `surface` または `surfaceSubtle`
- フォーカスは暖色
- 補助テキストとエラーは入力近傍に置く
- placeholder は `textMuted`

### Badge / Chip

分類:

- `status`
- `filter`
- `action`
- `emotion`

ルール:

- 選択チップは高彩度ベタ塗りにしない
- 感情チップは柔らかい色面を使う
- 情報チップは青の soft variant を許容

### Typography

ルール:

- gradient を標準機能として使わない
- 強調は色よりウェイトと余白で作る
- 重要度の低い情報は `textSecondary` と `textMuted` に逃がす

## レイアウトシェル

### ChatShell

役割:

- プロダクトの基準体験

特徴:

- 全面 warm canvas
- 固定入力島
- メッセージ面の重なりで構造を見せる
- chrome は最小限

### DiaryShell

役割:

- 内省、自己観察

特徴:

- ChatShellより余白多め
- 暖色寄り
- 段階的で圧の低いUI

### DashboardShell

役割:

- 情報の俯瞰

特徴:

- 暖色ベースは維持
- 青を情報整理に少し多めに使う
- カード群で構造を見せる

### FormShell

役割:

- サインイン、サインアップ、設定、入力

特徴:

- 最も抑制的
- 1画面1主行動
- 装飾を足しすぎない

## 画面ファミリー別ルール

### Chat

- 基準画面
- 送信、保存、行動は暖色
- 情報は青
- UIを派手にしない

### Diary

- 自己感覚が主役
- 数値や青の情報整理感を出しすぎない
- 感情入力は暖色と柔らかい面で構成

### Dashboard

- 暖色ベースのまま整理感を上げる
- 青を使ってもよいが、主行動色にしない
- ウィジェットごとの色人格を作らない

### Forms

- 最も静かなUI
- 1つの主CTAに集約
- バリデーションは近くに出す

## 実装ルール

### 必須

- 固定色の直書きを新規追加しない
- まず `design-system.ts` にトークンを置く
- 共通部品に寄せられるものは必ず寄せる
- 新variantは複数画面の利用意図がない限り増やさない

### 原則禁止

- ページ単位で独自 palette を作る
- `primary/secondary` の意味を画面ごとに変える
- グラデーションを標準UIに使う
- 画面ごとに異なる余白スケールを使う
- focus 色をその場で決める

## ガバナンス

### 変更ルール

新しいトークン、variant、レイアウト規則を追加する場合は、最低限以下を記録する。

- 何を追加するか
- どの画面で必要か
- 既存トークンで代替できない理由
- 使う場所
- 使わない場所

### レビュー観点

UI変更時は次を確認する。

- token が使われているか
- 画面ファミリーに合ったシェルになっているか
- 主CTA色が正しいか
- 暖色と青の役割が競合していないか
- 余白と角丸が既存ルールに沿っているか

### ドリフト防止

- 例外色は仮設で終わらせない
- 良い例外はトークンに昇格する
- 悪い例外は削除する
- `チャットだけ特別` な状態を放置しない

## 移行順序

1. `design-system.ts` をこの仕様に合わせて更新
2. `global.css` の旧青系変数を整理
3. `Button`, `Card`, `Input`, `Badge`, `Typography` を更新
4. Chat を参照実装としてトークン化
5. Diary をチャット基準へ寄せる
6. Dashboard / Forms / その他画面へ展開
7. 残存する固定色を除去

## 完了条件

以下を満たしたら、デザインシステムの具体化は完了とみなす。

- アプリ背景が全体で warm-neutral に揃う
- 主CTAは暖色に統一される
- 青は情報と信頼の補助色になる
- Chat / Diary / Dashboard / Forms が同じプロダクトに見える
- 固定色の新規追加が止まり、token運用へ移る

## 実装メモ

今後の実装では、`青をやめる` のではなく、`青を正しい役割に戻す` ことを徹底する。

探Qメイトの正しい視覚言語は、

- 暖色ニュートラルが土台
- 暖色が対話と行動
- 青が信頼と整理

である。
