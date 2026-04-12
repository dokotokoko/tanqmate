# Project / Memo 機能の大規模削除・修正・移行計画

## 目的

MVPから `project` と `memo` を主要機能として外し、以下の構造へ移行する。

- AIに渡す生徒コンテキストは `project` ではなく `onboarding` と `profile` で管理する
- `project` / `memo` は将来の拡張機能としてプールし、現行MVP導線からは撤去する
- 削除は一括破壊ではなく、UI停止 -> API停止 -> コンテキスト移行 -> 後方整理の順で段階実施する

この計画の狙いは、MVPの中心を「生徒プロフィールに基づくAI伴走」に絞り、保守コストと概念負荷を下げることにある。

---

## 結論

現状の `project` / `memo` は以下の性質を持つ。

- `project` はダッシュボードと主要ルーティングの中心だが、MVP価値の最短経路ではない
- `memo` は複数実装が並立しており、概念とデータモデルが分裂している
- AIコンテキストの受け皿として `project` が設計されているが、実際のフロントでは十分に接続されていない

そのため、以下の判断を採用する。

- `project` / `memo` のユーザー向け機能はMVPから外す
- `theme` / `question` / `hypothesis` は `profiles` 系に移管する
- `project` / `memo` の完全削除は急がず、将来復活可能な形でモジュール隔離する

---

## 現状整理

### 1. `project` の現在の役割

`project` は現状、以下の3つの役割を持っている。

1. UI導線の中心
2. メモ分類の親概念
3. AIコンテキストの格納先

代表的な実装箇所:

- フロントの主要ルート
  - `apps/frontend/src/App.tsx`
  - `/app/projects/:projectId`
  - `/app/projects/:projectId/memos/:memoId`
- ダッシュボード
  - `apps/frontend/src/pages/DashboardPage.tsx`
- プロジェクト詳細
  - `apps/frontend/src/pages/ProjectPage.tsx`
- バックエンドAPI
  - `apps/backend/routers/project_router.py`
  - `apps/backend/services/project_service.py`

### 2. `memo` の現在の役割

`memo` は現状、少なくとも次の3系統が存在する。

1. `projects` 配下の `memos`
2. `MultiMemoPage` / `MultiMemoManager` 系の多機能メモ
3. `GeneralInquiryPage` の `user_memos` ベース相談メモ

この時点で、MVP機能としては複雑すぎる。

### 3. 既存実装の問題

#### 3-1. コンセプトが重い

- 生徒が複数探究テーマを同時に管理する前提になっている
- MVPで必要なのは「まず1人の生徒がAIと探究を始められること」であり、複数テーマ管理は必須ではない

#### 3-2. 実装が分裂している

- `memos`
- `multi_memos`
- `user_memos`

が並存しており、1つの概念として閉じていない。

#### 3-3. AIコンテキストとの接続が不完全

バックエンドは `project_id` からコンテキストを構築する設計だが、フロントの `AIChat` は `/chat` 呼び出し時に `project_id` を常に送っていない。

このため、設計上の重要度に対して、実運用での実効性が低い。

#### 3-4. すでに不整合がある

現状コードには以下のような不整合がある。

- `project_router` で `memo_service.get_project_memos()` の引数順が逆
- `memo_router` が `tags` を返そうとしているが、レスポンスモデルとサービス定義が一致していない
- `ProjectService` が `multi_memos` を参照している一方、`MemoService` は `memos` を使っている

これは「今のうちに縮小する」判断を後押しする材料である。

---

## 目標アーキテクチャ

### MVPで残すもの

- 認証
- onboarding
- profile
- AIチャット
- diary

### MVPから外すもの

- 複数プロジェクト管理
- プロジェクト配下メモ管理
- メモ一覧 / 検索 / タグ / 並び替え / DnD

### 新しいコンテキスト管理方針

AIに渡す生徒コンテキストは `profiles` または `profiles` に紐づく補助テーブルで管理する。

最低限必要な項目:

- `inquiry_theme`
- `inquiry_question`
- `inquiry_hypothesis`

任意で追加候補:

- `interest_tags`
- `motivation`
- `learning_goal`
- `preferred_support_style`

---

## 推奨データ設計

## 案A: `profiles` に直接追加

### 追加カラム

- `inquiry_theme text null`
- `inquiry_question text null`
- `inquiry_hypothesis text null`
- `interest_tags text[] default '{}'`
- `profile_completion_version integer default 1`

### メリット

- 実装が最短
- onboarding/profile APIの拡張だけで済む
- MVPには十分

### デメリット

- 将来的にプロフィール責務がやや肥大化する

## 案B: `student_contexts` テーブル新設

### 想定カラム

- `user_id uuid primary key references profiles(id)`
- `inquiry_theme text`
- `inquiry_question text`
- `inquiry_hypothesis text`
- `interest_tags text[]`
- `created_at timestamptz`
- `updated_at timestamptz`

### メリット

- 責務分離が明確
- 将来拡張しやすい

### デメリット

- MVPに対しては実装コストが少し上がる

## 推奨

MVP優先なら **案A** を推奨する。

理由:

- すでに `onboarding` / `profile` のAPIと画面がある
- 追加UIと追加フィールドで早く移行できる
- 将来必要なら `student_contexts` に再分離できる

---

## 影響範囲

## 1. フロントエンド

### 削除または非表示対象

- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/ProjectPage.tsx`
- `apps/frontend/src/pages/MemoPage.tsx`
- `apps/frontend/src/pages/MultiMemoPage.tsx`
- `apps/frontend/src/components/Project/*`
- `apps/frontend/src/components/MultiMemo/*`
- `apps/frontend/src/services/dashboard/projectService.ts`
- `apps/frontend/src/services/project-page/projectPageService.ts`

### 修正対象

- `apps/frontend/src/App.tsx`
  - `projects` / `memos` ルート削除
  - 既存リダイレクト整理
- `apps/frontend/src/pages/OnboardingPage.tsx`
  - 探究テーマ / 問い / 仮説の入力追加
- `apps/frontend/src/pages/ProfilePage.tsx`
  - 生徒コンテキスト編集UI追加
- `apps/frontend/src/stores/authStore.ts`
  - `ProfileData` の型拡張
- `apps/frontend/src/components/MemoChat/AIChat.tsx`
  - `project` 依存文脈の送出をやめ、`profile` ベースの文脈取得に統一
- `apps/frontend/src/stores/chatStore.ts`
  - `currentProjectId` / `currentMemoId` / `chatPageId=project-*` 依存を縮小

## 2. バックエンド

### 削除候補

- `apps/backend/routers/project_router.py`
- `apps/backend/routers/memo_router.py`
- `apps/backend/services/project_service.py`
- `apps/backend/services/memo_service.py`

### 修正対象

- `apps/backend/main.py`
  - `project_router` / `memo_router` の登録解除
- `apps/backend/routers/auth_router.py`
  - onboarding/profile のリクエストモデル拡張
- `apps/backend/services/chat_service.py`
  - `project_id` ベースの文脈解決を `profile` ベースへ変更
- `apps/backend/async_helpers.py`
  - `AsyncProjectContextBuilder` を削除または `AsyncStudentContextBuilder` へ置換
- `apps/backend/services/conversation_agent_service.py`
  - `_get_project_context()` を `get_student_context()` に置換

## 3. スキーマ / データ

### 新規または変更

- `profiles` に学習コンテキスト列追加

### 将来削除候補

- `projects`
- `memos`
- `multi_memos`
- `user_memos`

ただし、即削除は非推奨。まずは未使用化し、一定期間の観測後に削除する。

---

## 段階的実施計画

## Phase 0. 方針固定

### 目的

- MVPでは `project` / `memo` を公開しないことを明確化
- 代わりに `profile` ベースのAIコンテキストを正規ルートにする

### 完了条件

- この計画書の合意
- 新コンテキスト項目の確定

---

## Phase 1. データ移行先の追加

### 実施内容

1. `profiles` に以下を追加
   - `inquiry_theme`
   - `inquiry_question`
   - `inquiry_hypothesis`
   - 任意で `interest_tags`
2. `auth_router` の `OnboardingRequest` / `UpdateProfileRequest` を拡張
3. `GET /auth/profile` のレスポンスに新項目を含める
4. `authStore.ProfileData` を更新

### 目的

- `project` を使わずにAIコンテキストを保持できる状態を作る

### 完了条件

- 新規ユーザーが onboarding でテーマ・問い・仮説を登録できる
- profile で後編集できる

---

## Phase 2. onboarding / profile UI への移管

### Onboarding

追加項目:

- 探究テーマ
- 今気になっている問い
- 現時点の仮説

入力UX方針:

- すべて任意でもよいが、最低でも `inquiry_theme` は推奨入力
- 空でも進めるが、AI初回対話で補完してもよい

### Profile

追加セクション:

- 探究コンテキスト
  - 探究テーマ
  - 問い
  - 仮説

### 完了条件

- `project` を作らなくても生徒コンテキストが成立する

---

## Phase 3. AIコンテキスト取得の置換

### 実施内容

1. `chat_service.py` の `project_context` 生成ロジックを撤去
2. `async_helpers.py` の `AsyncProjectContextBuilder` を廃止
3. `profiles` から `student_context` を組み立てる処理に置換
4. `conversation_agent_service.py` の `project` 依存を置換
5. フロントの `AIChat` から `project_id` 前提を除去

### 新しいコンテキスト例

```text
生徒プロフィール:
- 名前: 山田花子
- 学年: 2年

探究コンテキスト:
- テーマ: 地域の食品ロス
- 問い: 学校と地域で食品ロスを減らすには何ができるか
- 仮説: 給食・家庭・商店をつなぐ仕組みが必要
```

### 完了条件

- `project` を1件も持たないユーザーでも、AI応答品質が維持される

---

## Phase 4. UI導線の停止

### 実施内容

1. `App.tsx` から以下ルートを削除
   - `/app/projects/:projectId`
   - `/app/projects/:projectId/memos/:memoId`
   - `/app/memos`
2. ダッシュボードの役割を見直す
   - `DashboardPage` を廃止する。デフォルトを/chatルートへと修正。
3. `ProjectPage` / `MemoPage` / `MultiMemoPage` を公開導線から外す
4. サイドバーやナビゲーションにプロジェクト/メモ項目があれば除去

### 推奨

MVPのホームは以下のどちらかに寄せる。

- `AI相談`→採用
- `日誌`

### 完了条件

- 一般ユーザーが `project` / `memo` 画面へ到達しない

---

## Phase 5. APIの停止

### 実施内容

1. `main.py` から以下の router 登録を外す
   - `project_router`
   - `memo_router`
2. 互換性が必要なら短期間だけ `410 Gone` または `501` を返す
3. 内部参照が残っていないことを確認する

### 推奨運用

即削除ではなく、1段階だけ「無効化期間」を置く。

例:

- `project` / `memo` APIは2週間 `410 Gone`
- 監視でアクセスゼロを確認後、コード削除

---

## Phase 6. コード整理

### 実施内容

1. 参照されなくなったフロントファイルを/archiveディレクトリに機能ごとにフォルダを作成して補完
2. `ProjectService` / `MemoService` を/archiveディレクトリに保管
3. `project` / `memo` 前提のテスト削除または更新
4. ドキュメント更新

### 注意

この段階で初めて大きめの物理整理を行う。

---

## Phase 7. DBの後始末

### 実施内容

1. 利用実績を確認
2. 必要ならデータエクスポート
3. 以下の順で削除判断
   - `user_memos`
   - `multi_memos`
   - `memos`
   - `projects`

### 非推奨

- UI停止と同時にテーブルを削除すること

理由:

- ロールバックが難しい
- 調査ログが失われる
- 想定外の参照が残っている可能性がある

---

## `project` / `memo` のプール方針

「将来復活させる機能」として扱うなら、削除後の保管方法を決める必要がある。

## 推奨方針

### 1. 完全放置ではなく隔離する

- `archive/` に丸ごと退避するより、`feature/project-memo/` のように隔離した方が再利用しやすい

### 2. 契約を残す

最低限、以下を Markdown で残す。

- どの画面があったか
- API一覧
- テーブル構造
- 再導入時の依存

### 3. 再導入条件を明文化する

復活条件の例:

- 生徒が複数テーマを長期管理したい需要が出た
- 日誌だけでは作業記録が不足した
- 学校導入時に探究ポートフォリオ管理の要望が出た

---

## リスク

## 1. AI文脈が薄くなる

### 内容

`project` から `theme/question/hypothesis` を外すと、移行前後でAIの文脈密度が下がる可能性がある。

### 対策

- onboarding で最低限のテーマ入力を促す
- profile でいつでも編集可能にする
- 未設定時はAIが対話で補完する

## 2. hidden dependency の取りこぼし

### 内容

古い `project` / `memo` 前提コードが残る可能性が高い。

### 対策

- `rg -n "project|memo"` で横断確認
- router を外す前に参照一覧を固定
- 段階停止で問題をあぶり出す

## 3. ダッシュボードの空洞化

### 内容

現状ダッシュボードは `project` 一覧中心なので、そのまま削るとホーム画面の役割が消える。

### 対策

- ダッシュボードをAI相談 / 日誌 / プロフィール導線に再編する
- もしくはMVPでは `/app/dashboard` を `/app/chat` に寄せる → 採用

## 4. 復活コストの増大

### 内容

雑に削除すると、将来戻す時にコストが跳ねる。

### 対策

- すぐにDB削除しない
- API契約とデータモデルの文書を残す
- feature単位で隔離する

---

## ロールバック方針

ロールバックはフェーズごとに可能な形にする。

### Phase 1-3 まで

- 新フィールドは残したまま `project` ベースへ戻せる

### Phase 4-5

- UIルートとrouter登録を戻せば復旧可能

### Phase 7 後

- テーブル削除後の復旧は重い
- そのため、DB物理削除は最後に行う

---

## 受け入れ条件

以下を満たしたら移行完了とする。

- 新規ユーザーが onboarding で探究テーマ系情報を登録できる
- profile で後から編集できる
- AIチャットが `project` なしで安定動作する
- `project` / `memo` 画面への公開導線が存在しない
- `project_router` / `memo_router` が本番公開されていない
- `project` / `memo` を使わなくてもMVPの主要体験が完結する

---

## 実装順の推奨

実務上は以下の順が安全。

1. `profiles` に学習コンテキスト列追加
2. onboarding / profile UI拡張
3. AIコンテキスト取得を `profile` ベースへ変更
4. ダッシュボード再設計
5. `project` / `memo` UI停止
6. `project` / `memo` API停止
7. 不要コード削除
8. DB整理

---

## 最終判断

今回の方針は合理的である。

- `project` は「将来の複数テーマ管理」
- `memo` は「探究の作業空間」
- MVPで本当に必要なのは「生徒固有の探究コンテキスト」と「AI伴走」

したがって、今やるべきことは `project` / `memo` を磨くことではなく、そこから **生徒コンテキストだけを抽出して onboarding / profile に統合すること** である。

その上で、`project` / `memo` は削除ではなく「機能プール」として保留するのが最も現実的である。
