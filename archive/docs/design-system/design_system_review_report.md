# デザインシステム レビュー & 改善方針レポート

## 対象

アプリ全体のデザインシステム。

特に以下の観点でレビューを行った。

- 現行の共通デザイントークンが、実際のUI体験と一致しているか
- 青色系プライマリカラーの設計が適切か
- AIチャット画面で成立している `柔らかさ` と `温かさ` を、全体の基準に昇華できるか

主な確認対象:

- [apps/frontend/src/styles/design-system.ts](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/design-system.ts)
- [apps/frontend/src/styles/global.css](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/global.css)
- [apps/frontend/src/components/common/Button.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/common/Button.tsx)
- [apps/frontend/src/components/common/Card.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/common/Card.tsx)
- [apps/frontend/src/components/Layout/Layout.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Layout/Layout.tsx)
- [apps/frontend/src/pages/ChatPage.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/pages/ChatPage.tsx)
- [apps/frontend/src/components/MemoChat/AIChat.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/AIChat.tsx)
- [apps/frontend/src/components/MemoChat/ChatMessage.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/ChatMessage.tsx)
- [apps/frontend/src/components/MemoChat/ChatInputArea.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/ChatInputArea.tsx)

## 総評

現状のアプリは、デザインシステム上では `鮮やかな青を主役にしたUI` として定義されている一方、実際に最も完成度が高く、感覚的にしっくり来るAIチャット画面は `柔らかい暖色を基調にしたUI` として成立している。

つまり今の状態は、

- 共通デザインシステムの思想
- 現場で実際に良い体験を出しているUI

が一致していない。

このズレがあるため、

- 共通部品を使うとUIが冷たくなりやすい
- 実装が進むほど固定色の直書きが増える
- 全体に統一感が出にくい

という構造になっている。

一方で、AIチャット画面にはすでに良い答えがある。

その画面では以下が成立している。

- 真っ白ではない、やわらかいバター系背景
- 赤みを少し含んだ暖色アクセント
- 黒ではなくウォームグレーの文字色
- 強すぎない境界線と、低刺激な面の重なり

結論として、今後の改善は `青を消す` ことではなく、`青の役割を再定義する` ことが中心になる。

## 現状の問題

### 1. 共通トークンの青が強すぎる

該当:

- [apps/frontend/src/styles/design-system.ts:12](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/design-system.ts:12)

現状のプライマリカラーは `#059BFF` を中心とした高彩度の青で構成されている。

問題:

- 情報量の多い学習支援UIには少し強すぎる
- `知的` より `UI部品の主張` が先に立ちやすい
- 柔らかさ、温かさ、安心感が出にくい

### 2. デザインシステムと実UIの正解が一致していない

該当:

- [apps/frontend/src/styles/design-system.ts:75](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/design-system.ts:75)
- [apps/frontend/src/components/MemoChat/AIChat.tsx:895](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/AIChat.tsx:895)
- [apps/frontend/src/components/MemoChat/ChatInputArea.tsx:67](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/ChatInputArea.tsx:67)

問題:

- デザインシステム上の背景トークンは限定的
- 実際のチャット画面では、暖色系の面や境界線が別実装で定義されている
- 良いUIが共通資産になっていない

### 3. AIチャット画面の良さがトークン化されていない

該当:

- [apps/frontend/src/components/MemoChat/ChatMessage.tsx:149](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/ChatMessage.tsx:149)
- [apps/frontend/src/components/MemoChat/ChatInputArea.tsx:175](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/ChatInputArea.tsx:175)

問題:

- `#FFFAED`, `#FFFDF7`, `#FFF6E8`, `#FF8C5A`, `#6B6560` などの色が個別に書かれている
- これらは体験上重要な色だが、デザインシステムの定義には存在しない
- 結果として再利用されず、画面ごとに分岐する

### 4. 共通ボタンが冷たい印象を作りやすい

該当:

- [apps/frontend/src/components/common/Button.tsx:29](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/common/Button.tsx:29)

問題:

- `primary`, `outline`, `ghost` がすべて青前提
- CTAの印象が cold-tech に寄る
- チャット画面で感じられる対話的な暖かさが再現できない

### 5. CSS変数とMUIテーマが二重化している

該当:

- [apps/frontend/src/styles/global.css:28](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/global.css:28)

問題:

- `:root` 側にも旧青系トークンがある
- MUIテーマとCSS変数の間で色の責務が分かれていない
- hover色やフォーカス色の統一も崩れている

### 6. レイアウト背景ですでに暖色方向が採用されているのに、基盤と一致していない

該当:

- [apps/frontend/src/components/Layout/Layout.tsx:78](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Layout/Layout.tsx:78)
- [apps/frontend/src/pages/ChatPage.tsx:27](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/pages/ChatPage.tsx:27)

問題:

- 実装上は `#FFFAED` の背景が多用されている
- しかし design system の `background.default` は別色
- 画面設計の実態と基盤がズレている

### 7. フォーカス色と操作色の人格が揺れている

該当:

- [apps/frontend/src/styles/global.css:76](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/global.css:76)
- [apps/frontend/src/components/MemoChat/ChatInputArea.tsx:123](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/MemoChat/ChatInputArea.tsx:123)

問題:

- グローバルでは青フォーカス
- チャットの入力欄は暖色フォーカス
- 操作フィードバックの色がUIごとに変わっている

### 8. シャドウ設計がニュートラルすぎる

該当:

- [apps/frontend/src/styles/design-system.ts:245](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/design-system.ts:245)

問題:

- 影が一般的なグレー影中心
- チャット画面の `少し暖色を含んだやわらかい空気感` を再現しにくい

## AIチャット画面がしっくり来る理由

現行チャットUIが良く見える理由は、単にオレンジを使っているからではない。

以下のバランスが取れているためである。

### 1. 背景が白すぎない

- ベース面が `#FFFAED`
- カードや入力面が `#FFFDF7`
- 一段沈んだ面が `#FFF6E8`

この差によって、画面に圧迫感がなく、柔らかさが出ている。

### 2. 文字が黒すぎない

- 強文字が `#2D2A26`
- 通常文字が `#6B6560`
- 補助文字が `#9E9891`

黒ではなくウォームグレーを使っているため、情報は読めるが圧が低い。

### 3. アクセントが暖色で、感情的距離が近い

- 送信ボタン
- AIアバター
- 入力欄のフォーカス

これらに暖色が入っており、AIとの対話に温度感が出ている。

### 4. 境界線が主張しすぎない

- `#F0E8D8`
- `#FFE4C8`

など、暖色寄りのやわらかい境界線が使われているため、UIがパーツの集合体に見えにくい。

## 改善の基本方針

今後の改善方針は次の一文に集約できる。

> `Blue-First` ではなく、`Warm-Neutral First + Trust Blue Accent` に移行する。

つまり、

- ベースは暖色ニュートラル
- 体験の中心はやわらかく温かい
- 青は主役ではなく、信頼や情報整理の補助として使う

という設計に変える。

## 改善方針 詳細

### 方針1. 青の役割を再定義する

青は重要な色として残してよい。

ただし役割を変えるべきである。

#### 現状

- 青が主ボタン
- 青がリンク
- 青がフォーカス
- 青がブランドの中心

#### 今後

- 青は `信頼` と `整理` を担う補助色にする
- 暖色は `対話` と `行動` を担う主アクセントにする

青を使うべき場所:

- 情報ラベル
- 履歴やメタ情報
- 選択済みの静かな状態
- ナビゲーションや補助UI

青を使いすぎないほうがよい場所:

- 主CTA
- 入力欄の中心フォーカス
- 感情的なタッチポイント

### 方針2. 役割ベースのカラートークンへ移行する

現状の `primary/secondary` だけでは足りない。

最低限、以下のような役割トークンを持つべきである。

#### ベース系

- `canvas`
- `surface`
- `surfaceSubtle`
- `surfaceRaised`

#### 境界系

- `borderSoft`
- `borderDefault`
- `borderStrong`

#### テキスト系

- `textPrimary`
- `textSecondary`
- `textMuted`
- `textInverse`

#### アクセント系

- `accentWarm`
- `accentWarmHover`
- `accentWarmSoft`
- `accentCool`
- `accentCoolHover`

#### 状態系

- `success`
- `warning`
- `error`
- `info`

#### 補助系

- `focusRing`
- `selection`
- `shadowWarm`

### 方針3. チャット画面の配色を正式な基準に昇格する

チャット画面は現時点で最も良い色バランスを持っているため、例外実装として扱うべきではない。

今後は以下を標準にする。

#### 推奨ベースパレット案

- `canvas`: `#FFFAED`
- `surface`: `#FFFDF7`
- `surfaceSubtle`: `#FFF6E8`
- `surfaceRaised`: `#FFFFFF`
- `borderSoft`: `#F0E8D8`
- `borderWarm`: `#FFE4C8`
- `textPrimary`: `#2D2A26`
- `textSecondary`: `#6B6560`
- `textMuted`: `#9E9891`
- `accentWarm`: `#FF8C5A`
- `accentWarmHover`: `#FF7A42`
- `accentWarmActive`: `#FF6B35`
- `accentWarmSoft`: `#FFE4CC`
- `trustBlue`: `#7BA9C9`
- `trustBlueHover`: `#5F94B9`

### 方針4. 共通ボタン設計を暖色基準へ更新する

現状の共通ボタンは青中心で設計されているため、印象が硬い。

おすすめの variant 構成:

- `solid`
  - 主行動用
  - 暖色グラデーションまたは暖色単色
- `soft`
  - 補助行動用
  - 薄い暖色背景
- `outline`
  - 枠ボタン
  - ウォームグレー境界
- `ghost`
  - テキスト中心
  - 面を持たない
- `cool`
  - 補助青
  - 履歴や情報整理向け

方向性:

- 送信や保存などの主アクションは暖色
- 青はナビゲーションや補助文脈に限定

### 方針5. 背景階層を3層以上で設計する

現状の背景は単純すぎるため、柔らかいUIが作りにくい。

推奨階層:

- アプリ全体背景: `canvas`
- 基本面: `surface`
- 補助面: `surfaceSubtle`
- 浮いた面: `surfaceRaised`

重要な考え方:

- 白をデフォルトにしない
- 面の差で構造を見せる
- 境界線は補助に留める

### 方針6. フォーカス設計を統一する

フォーカスリングの色は、体験の人格をかなり左右する。

今後は以下を基本にする。

- 標準のフォーカスリング: 暖色
- 情報UIや管理UIでは補助的に青を許容

例:

- `focusRingWarm`: `rgba(255, 140, 90, 0.35)`
- `focusRingCool`: `rgba(123, 169, 201, 0.30)`

### 方針7. シャドウをウォーム化する

柔らかさは色だけでなく、影でも作られている。

推奨:

- `shadowSoft`: `0 4px 16px rgba(120, 92, 64, 0.08)`
- `shadowMedium`: `0 8px 24px rgba(120, 92, 64, 0.12)`
- `shadowAccent`: `0 8px 24px rgba(255, 140, 90, 0.18)`

方針:

- 影は深さを出すためではなく、空気感を出すために使う
- 暗いグレー影を多用しない

### 方針8. CSS変数とMUIテーマの責務を整理する

今後は二重管理を減らすべきである。

推奨ルール:

- 色トークンのSingle Source of Truthは `design-system.ts`
- `global.css` はテーマから参照される補助変数のみ定義
- 画面コンポーネントでの固定色直書きは段階的に削減

## 新しいブランド方向性

このアプリのUIトーンは、次のように定義するとぶれにくい。

### キーワード

- 知的だけど冷たくない
- やさしいが幼すぎない
- 手触りは紙、反応はデジタル
- 青は信頼、暖色は対話

### 避けたい方向

- 高彩度ブルー中心のSaaS感
- 真っ白背景ベースの無機質さ
- ボタンだけが強く目立つUI
- 情報パネルが箱として分断される見た目

## 優先順位つき改善アクション

### 優先度A

- `design-system.ts` をチャット画面基準の役割トークンへ再設計する
- `background.default` を実際の基準色に揃える
- 共通 `Button` の色設計を暖色中心に更新する

### 優先度B

- `global.css` の青系CSS変数を整理する
- `Card` の背景、境界線、影をウォーム基調に更新する
- フォーカスリングを全体で統一する

### 優先度C

- 各画面の固定色直書きを新トークンへ置き換える
- 日誌画面、ダッシュボード、設定画面をチャット基準のトーンへ寄せる
- 青の使いどころを情報レイヤー中心に整理する

## 実装時の注意

- いきなり全画面を変えず、まずトークンを正す
- その後に共通部品を変える
- 最後に画面個別の固定色を置き換える

順序を逆にすると、また色の分裂が起きやすい。

## 結論

現状のデザインシステムは、アプリが目指している体験よりもやや冷たく、強い青を中心に設計されている。

一方で、AIチャット画面にはすでに、

- 柔らかさ
- 温かさ
- 読みやすさ
- 心理的な近さ

がうまく共存した答えがある。

したがって改善の中心は、

- 青を消すことではなく、役割を変えること
- 暖色ニュートラルを基盤にすること
- チャット画面の良さを例外ではなく標準にすること

である。

今後は `Warm-Neutral First + Trust Blue Accent` を全体方針として進めるのが最も自然である。
