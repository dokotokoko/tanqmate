# 日誌生成機能 UI/UX レビュー

## 対象

AIとの対話ログを元に、自分の興味の変化をメタ認知するための日誌生成機能。

レビュー観点は以下の2点です。

- 直観的に自分の感覚や感情を反映できる体験になっているか
- アプリ全体および日誌フロー内でUIが統一されているか

対象実装:

- [apps/frontend/src/pages/DiaryPage.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/pages/DiaryPage.tsx)
- [apps/frontend/src/components/Diary/DiaryFlowNew.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/DiaryFlowNew.tsx)
- [apps/frontend/src/components/Diary/EmotionSelector.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/EmotionSelector.tsx)
- [apps/frontend/src/components/Diary/MotivationFlameRive.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/MotivationFlameRive.tsx)
- [apps/frontend/src/components/Diary/DiaryModal.tsx](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/DiaryModal.tsx)
- [apps/frontend/src/styles/design-system.ts](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/design-system.ts)

## 総評

方向性としては、`感情を色と有機形状で選ぶ`、`熱量を炎のメタファーで表す` という設計はよく、数値評価よりも感覚記録に寄せようとする意図が見えます。

一方で現状は、以下の3つが分離して見えています。

- AIが先に提示する「要約確認フロー」
- 自分の感覚を入れる「感情・熱量入力フロー」
- 暖色で演出された「日誌専用の見た目」

この3つのトーンが十分に統合されておらず、結果として、

- 先にAIの解釈を読んでしまうことで、自分の生の感覚を入れにくい
- 見た目や言葉遣いの一貫性が弱く、フローとしてのまとまりが出にくい
- 感情入力UIが比喩的である一方、操作面はまだ直観的とは言い切れない

という状態です。

## 指摘事項

### 1. フロー順が、自己感覚の記録よりAI解釈を優先している

- 該当: [apps/frontend/src/components/Diary/DiaryFlowNew.tsx:120](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/DiaryFlowNew.tsx:120)
- 現状フロー: `生成された日誌を確認 → 気持ちを選ぶ → 炎で熱量を調整`
- 問題:
  - ユーザーは最初にAIが生成した文章を読みます
  - その後で気持ちを選ぶため、自分の感覚ではなくAIの解釈に引っ張られやすくなります
  - メタ認知のための記録としては、自己観察の純度が下がります
- 影響:
  - 感情入力が「思い出す作業」ではなく「AI文脈への同意/不同意」に変質しやすい
  - 日誌生成の中心が自己内省ではなくAI要約に見える

### 2. 感情選択UIの操作モデルが曖昧

- 該当: [apps/frontend/src/components/Diary/EmotionSelector.tsx:171](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/EmotionSelector.tsx:171)
- 問題:
  - 感情選択が `Box` への `onClick` で実装されている
  - `button` / `checkbox` / `radio` に相当する意味付けがない
  - キーボード操作やスクリーンリーダーへの配慮が不足している
- 影響:
  - 「触って選ぶ」体験の一貫性が弱い
  - 自分の感覚を選ぶ行為としての安心感が薄い
  - アクセシビリティ上も不十分

### 3. 感情選択上限時の挙動が不自然

- 該当: [apps/frontend/src/components/Diary/EmotionSelector.tsx:158](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/EmotionSelector.tsx:158)
- 現状:
  - 4件選択済みの状態で5件目を押すと、最も古い選択が無言で外れる
- 問題:
  - 感情は複数同居しやすく、選択が自動的に消えるのは体感的に不自然
  - ユーザーに「なぜ消えたか」が伝わらない
- 影響:
  - UIへの信頼感を下げる
  - 感情を丁寧に置く体験ではなく、制約付き選択ゲームに見えやすい

### 4. タイポグラフィと言葉遣いの人格が統一されていない

- 該当:
  - [apps/frontend/src/components/Diary/DiaryFlowNew.tsx:235](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/DiaryFlowNew.tsx:235)
  - [apps/frontend/src/components/Diary/EmotionSelector.tsx:91](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/EmotionSelector.tsx:91)
  - [apps/frontend/src/components/Diary/MotivationFlameRive.tsx:237](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/MotivationFlameRive.tsx:237)
- 問題:
  - 画面タイトルは標準MUIの見出し
  - 感情選択は小さなラベルベース
  - 炎UIには `Motivation Flame` のような英語見出しが混ざる
- 影響:
  - 同じフローなのに、別プロトタイプを繋いだ印象になる
  - 内省体験としての没入感が下がる

### 5. 日誌機能がアプリ全体のデザインシステムから浮いている

- 該当:
  - [apps/frontend/src/pages/DiaryPage.tsx:17](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/pages/DiaryPage.tsx:17)
  - [apps/frontend/src/components/Diary/DiaryFlowNew.tsx:53](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/DiaryFlowNew.tsx:53)
  - [apps/frontend/src/styles/design-system.ts:18](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/styles/design-system.ts:18)
- 問題:
  - アプリ全体のデザインシステムは青系プライマリが基準
  - 日誌UIは暖色系の紙面トーンで独自運用されている
  - しかも日誌内でも固定色の直書きが多く、再利用可能なトークン化がされていない
- 影響:
  - ページ間の一貫性が崩れる
  - 今後の改善時に統一感を維持しにくい

### 6. 炎UIが感覚記録より評価入力寄りに見える

- 該当:
  - [apps/frontend/src/components/Diary/MotivationFlameRive.tsx:204](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/MotivationFlameRive.tsx:204)
  - [apps/frontend/src/components/Diary/MotivationFlameRive.tsx:248](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/MotivationFlameRive.tsx:248)
- 問題:
  - 視覚演出は強いが、`熱量を感じて置く` より `値を調整する` 印象が強い
  - `0 / 100` 形式の数値表示が前面に出ている
- 影響:
  - 体験が自己評価的に見えやすい
  - 本来の「感覚を残す」目的から少し離れる

### 7. 感情入力後の表示が、解釈を深めるUIになっていない

- 該当: [apps/frontend/src/components/Diary/DiaryFlowNew.tsx:341](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/DiaryFlowNew.tsx:341)
- 現状:
  - 選んだ感情がChipで再表示されるだけ
- 問題:
  - 面積のわりに新しい理解や再考を促さない
  - 「なぜその感情か」「どれが一番近いか」といった深まりがない
- 影響:
  - 感情入力のあとに、内省が一段深まる設計になっていない

### 8. 日本語フロー内に英語文言が混ざっている

- 該当:
  - [apps/frontend/src/components/Diary/MotivationFlameRive.tsx:230](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/MotivationFlameRive.tsx:230)
  - [apps/frontend/src/components/Diary/MotivationFlameRive.tsx:238](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/MotivationFlameRive.tsx:238)
- 問題:
  - `Loading flame...`
  - `Motivation Flame`
- 影響:
  - 実装途中・試作感が出る
  - 感情入力体験の没入を阻害する

### 9. アイコンボタンや主要操作のアクセシビリティが不足

- 該当:
  - [apps/frontend/src/components/Diary/DiaryModal.tsx:40](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/DiaryModal.tsx:40)
  - [apps/frontend/src/components/Diary/MotivationFlameRive.tsx:257](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/MotivationFlameRive.tsx:257)
- 問題:
  - モーダルの閉じるボタンに `aria-label` がない
  - 炎スライダーにも明示的なアクセシブルネームがない
- 影響:
  - 操作の意味が補助技術に伝わりにくい
  - 基本品質として不足

### 10. モーション制御の思想が日誌体験に最適化されていない

- 該当: [apps/frontend/src/components/Diary/MotivationFlameRive.tsx:69](/abs/path/C:/Users/kouta/tanqmates/apps/frontend/src/components/Diary/MotivationFlameRive.tsx:69)
- 問題:
  - 火花や発光の演出がある一方で、コンポーネント単体でのモーション抑制方針が見えにくい
  - 感情入力は刺激が少ないほうがよい場面も多い
- 影響:
  - 一部ユーザーにとって落ち着かない体験になりうる

## 改善方針

### 方針1. フローを「自己感覚ファースト」に組み替える

推奨フロー:

1. 今日の気持ちを置く
2. 今日の熱量を置く
3. AIが対話ログから生成した日誌を確認する
4. 必要なら微修正して保存する

この順序にすることで、

- 最初に自分の生の感覚を記録できる
- その後にAIの整理を受け取る構造になる
- AIは自己理解を補助する役割として自然に位置づく

補足:

- AI日誌確認画面では、「あなたの感覚」と「AIの見立て」がどう重なるかを見せるとよい
- 例: `あなたが選んだ気持ち: モヤモヤ / おもしろい` を上部に残す

### 方針2. 感情入力を「選択UI」ではなく「感覚を置くUI」として磨く

改善案:

- 感情カードを `button` ベースにする
- `aria-pressed` あるいは複数選択可能な `checkbox` 相当の意味付けを持たせる
- 上限4件を超えたときは、古い選択を消さず、以下のどちらかにする
  - 5件目を選べない
  - 一時メッセージで「4つまで選べます」と伝える

体験上のポイント:

- 選択済み状態を色だけでなく輪郭、影、サイズ、ラベルでも示す
- ホバーよりも、タップ後の安心感を重視する
- 「どれも少し当てはまる」を許容する説明文にする

### 方針3. 感情入力後に、内省が一段深まる小さな橋渡しを入れる

現状のChip再掲は情報量が少ないため、以下のような設計に差し替える余地があります。

- `いちばん近い気持ちはどれ？`
- `この気持ちは、途中から変わった？`
- `言葉にしにくければ、そのままで大丈夫`

自由記述を必須にする必要はありませんが、

- 選んだ感情の中で主感情を1つだけ選ばせる
- あるいは「今日の気持ちに一番近い順」に並べ替えさせる

だけでも、メタ認知の解像度は上がります。

### 方針4. 炎UIを「評価」ではなく「体感の比喩」に寄せる

改善案:

- 数値 `0 / 100` は補助情報に下げる
- メイン表示は言葉にする
  - 例: `まだ火がつく前`
  - 例: `気になり始めている`
  - 例: `放課後まで持ち帰りたい熱量`
- スライダーの目盛りも、数値より段階ラベル中心にする

さらに、

- 炎の大きさ
- 光の広がり
- 余熱の表現

などを一貫した比喩として扱うと、数値評価感が薄れます。

### 方針5. 日誌機能専用のトークンを定義し、アプリ全体と接続する

現状は日誌画面だけ暖色の独自ルールで構成されています。

そのため、デザインシステムに少なくとも以下を追加するのが望ましいです。

- diary.background
- diary.surface
- diary.surfaceStrong
- diary.accentWarm
- diary.textPrimary
- diary.textSecondary
- diary.borderSoft

これにより、

- 日誌らしさは残す
- しかし実装上はアプリ全体の設計原則に乗る

という状態を作れます。

### 方針6. 文言の人格を統一する

推奨:

- フロー全体を日本語で統一する
- 説明文は `評価させる文体` より `感覚を受け止める文体` に寄せる

例:

- `今の気持ちを選んでください` より `今の気持ちに近いものを置いてみよう`
- `炎で熱量を調整` より `今日の探究心の温度を置いてみよう`

文言トーンの基本原則:

- 命令しすぎない
- 正解を求めない
- 曖昧さを許容する

### 方針7. モーションは「気持ちを邪魔しない」ことを優先する

改善案:

- `prefers-reduced-motion` 時は火花や発光を止める
- デフォルトでも点滅や過剰な揺れは避ける
- 触ったときの反応は、派手さより手応え重視にする

日誌はチャットやゲームより静かな画面であるべきです。

### 方針8. 基本アクセシビリティを整える

最低限の改善:

- アイコンボタンに `aria-label`
- 感情カードにキーボード操作
- 感情群に適切なグループラベル
- スライダーに明示ラベル
- ステッパー依存だけでなく、各ステップ見出しを明確化

これは単なる準拠対応ではなく、操作意味の明確化にも直結します。

## 優先度順アクション

### 優先度A

- フロー順を `感情 → 熱量 → AI日誌確認 → 保存` に変更
- 感情選択の上限挙動を修正
- 感情カードをセマンティックな操作部品に変更

### 優先度B

- 炎UIの文言と数値見せ方を再設計
- 英語文言を排除し、日本語トーンを統一
- 感情選択後の橋渡しUIを追加

### 優先度C

- 日誌専用デザイントークンを設計システムへ追加
- モーション抑制設計を追加
- 細かなアクセシビリティ改善を反映

## 実装メモ

実装時に特に意識したい点:

- 感情入力は「正しさ」より「近さ」を扱う
- AI生成文は主役ではなく、自己理解の補助に置く
- 日誌UIだけ特別に見せてもよいが、コード上は特別扱いしすぎない
- 視覚メタファーは強くてよいが、操作意味は明快であるべき

## 結論

この機能は、`AIが要約した日誌を見せる画面` として作るより、`自分の感覚を先に置き、その後にAIが整理を返してくれる画面` として再構成したほうが、本来の価値に近づきます。

そのための核は以下です。

- フロー順の見直し
- 感情入力UIの操作品質向上
- 炎UIの意味づけ整理
- 日誌UI専用トーンのデザインシステム化

この4点を押さえるだけでも、直観性と統一感はかなり改善できます。
