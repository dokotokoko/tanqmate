# School Context Design Plan

## 結論

このアプリを `toC` と `学校導入` の両輪で進めるなら、設計の中心は次の方針にするのが安全です。

- 個人ユーザーは `Supabase UUID` を正準IDとして、学校未所属でも完全に使える
- 学校・クラス・所属は後から追加できる別レイヤーとして管理する
- ただし、現状のまま `school` 関連テーブルを追加するだけでは不十分
- 最低限、`profile/onboarding/auth` の一部 API と UI は「学校所属を必須前提にしない」方向へ修正が必要

つまり、**追加だけで済むのではなく、既存の一部データ設計・API・UI の前提を外す必要がある**。

## 現状整理

### 1. ユーザー正準ID

現在は、正準ユーザーIDを `Supabase UUID` に寄せる方向で進んでいる。

関連:

- [schema/add_supabase_user_id_columns.sql](C:\Users\kouta\tanqmates\schema\add_supabase_user_id_columns.sql)
- [apps/backend/utils/user_identity.py](C:\Users\kouta\tanqmates\apps\backend\utils\user_identity.py)
- [apps/backend/services/base.py](C:\Users\kouta\tanqmates\apps\backend\services\base.py)

この方針自体は、後から学校文脈を付ける前提と相性がよい。

### 2. 現在の学校情報の持ち方

現状は `profiles` に学校情報を直接持たせている。

関連:

- [schema/supabase_profiles.sql](C:\Users\kouta\tanqmates\schema\supabase_profiles.sql:9)
- [schema/supabase_profiles.sql](C:\Users\kouta\tanqmates\schema\supabase_profiles.sql:10)
- [schema/supabase_profiles.sql](C:\Users\kouta\tanqmates\schema\supabase_profiles.sql:11)

現在の `profiles` には少なくとも以下がある。

- `role`
- `school_id`
- `school_code_locked`

これは初期実装としては簡単だが、将来の要件に対しては弱い。

問題:

- 1ユーザー1学校の固定前提になる
- 所属履歴を持てない
- クラス所属や教員の複数担当に自然に拡張できない
- toCユーザーが後から学校所属するケースで、`profile` が組織所属の正本になってしまう

### 3. 現在の API / UI は一部で学校所属を前提にしている

関連 API:

- [apps/backend/routers/auth_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\auth_router.py:182)
- [apps/backend/routers/auth_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\auth_router.py:237)
- [apps/backend/routers/auth_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\auth_router.py:405)

関連 UI:

- [apps/frontend/src/pages/AuthCallbackPage.tsx](C:\Users\kouta\tanqmates\apps\frontend\src\pages\AuthCallbackPage.tsx:25)
- [apps/frontend/src/pages/OnboardingPage.tsx](C:\Users\kouta\tanqmates\apps\frontend\src\pages\OnboardingPage.tsx:174)
- [apps/frontend/src/pages/SchoolRegistrationPage.tsx](C:\Users\kouta\tanqmates\apps\frontend\src\pages\SchoolRegistrationPage.tsx:60)
- [apps/frontend/src/stores/authStore.ts](C:\Users\kouta\tanqmates\apps\frontend\src\stores\authStore.ts:19)

特に以下の前提が入っている。

- `school_code` による学校設定
- `profile.school_id` が未設定かどうかで遷移や onboarding 完了判定を行う
- `school_code_locked` で学校変更を抑止する

このため、学校文脈を後付け可能にしたいなら、`school_id` をユーザーの固定属性として扱う前提を弱める必要がある。

### 4. 教師機能はまだ本設計に乗っていない

関連:

- [apps/backend/routers/teacher_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\teacher_router.py)
- [apps/backend/services/teacher_service.py](C:\Users\kouta\tanqmates\apps\backend\services\teacher_service.py)
- [apps/frontend/src/pages/TeacherDashboard.tsx](C:\Users\kouta\tanqmates\apps\frontend\src\pages\TeacherDashboard.tsx)

`teacher_service.py` は独自の SQLite 風デモ構造を持っており、現在の `profiles/schools/diaries` の正規モデルとは別系統で動いている。  
つまり学校導入の本番運用を考えると、教師機能は今後データモデルを揃える必要がある。

## 追加だけで済むか

### 結論

**完全には済まない。**

ただし、全体を大きく壊す全面改修は不要で、次のように整理できる。

### 追加だけで済む部分

- 学校・クラス・所属テーブルの新設
- 既存の個人データテーブルに `school_id`, `class_id` を nullable で追加
- 学校導入後の紐づけ・閲覧権限制御のための membership 設計

### 修正が必要な部分

- `profiles.school_id` を唯一の所属正本として扱う API/UI 前提
- onboarding 完了判定で `school_id` を見ている箇所
- 役割や学校文脈を `profile` 単体で決めている設計
- 教師機能のダミー/仮実装

## 推奨データ設計

## 1. 個人と学校所属を分離する

### 正準ユーザー

`profiles`

- `id uuid pk`
- `email`
- `name`
- `username`
- `global_role` または `product_role`
- 個人設定

ここには「個人としての属性」だけを置く。  
`school_id` を正本として使わない。

### 学校

`schools`

- `id uuid pk`
- `name`
- `school_code`
- `status`
- `created_at`

### 学校所属

`school_memberships`

- `id uuid pk`
- `user_id uuid not null`
- `school_id uuid not null`
- `role text not null`
- `status text not null`
- `joined_at`
- `left_at nullable`
- `is_primary boolean`

これが「どのユーザーがどの学校にどんな立場で所属しているか」の正本になる。

### クラス

`classes`

- `id uuid pk`
- `school_id uuid not null`
- `academic_year int not null`
- `grade int nullable`
- `name text not null`
- `homeroom_teacher_membership_id uuid nullable`

### クラス所属

`class_enrollments`

- `id uuid pk`
- `class_id uuid not null`
- `user_id uuid not null`
- `school_membership_id uuid nullable`
- `role text not null`
- `student_number int nullable`
- `joined_at`
- `left_at nullable`

## 2. 既存の業務データは個人所有を維持する

対象:

- `projects`
- `memos`
- `chat_conversations`
- `chat_logs`
- `diary_entries`

基本方針:

- 所有者は `user_id uuid` 系を正本とする
- 学校文脈は `nullable` で追加する

推奨追加カラム:

- `school_id uuid null`
- `class_id uuid null`

Diary は名称を合わせて次の方がよい。

- `student_user_id uuid`
- `school_id uuid null`
- `class_id uuid null`

ただし現状は `supabase_student_id` / `student_id` があるため、すぐのリネームより段階移行が安全。

## 3. 学校文脈は「作成時固定」ではなく「後付け可能」にする

重要なのは、toCユーザーの既存データを学校導入後にどう扱うか。

推奨ルール:

- 個人利用中のデータは `school_id = null`, `class_id = null` で保存
- 学校所属後、新規データには現在の学校文脈を保存
- 過去データは、必要に応じてユーザー確認または管理者操作で学校文脈へ紐づける

この方式なら、toC 利用の履歴を壊さずに学校導入へ移行できる。

## API 設計方針

## 1. `auth/profile` は個人情報と所属情報を分けて返す

現状は `profile.school_id` ベースで UI が分岐している。  
今後は次のように分けるべき。

例:

```json
{
  "profile": {
    "id": "...",
    "name": "...",
    "role": "student"
  },
  "memberships": [
    {
      "school_id": "...",
      "school_name": "...",
      "role": "student",
      "status": "active",
      "is_primary": true
    }
  ],
  "active_school_context": {
    "school_id": "...",
    "class_id": "...",
    "role": "student"
  }
}
```

`profile.school_id` に直接依存する UI は段階的に減らす。

## 2. 学校登録 API は `profiles` 更新ではなく membership 作成中心にする

現状:

- 学校コード検証
- `profiles.school_id` 更新
- `school_code_locked` を立てる

今後:

- 学校コード検証
- `school_memberships` を作成
- 必要なら `active_school_context` を切り替える

`school_code_locked` は短期互換には使ってよいが、長期の正本にしない。

## 3. 教師 API は class / membership 前提に組み直す

`teacher_router` / `teacher_service` は今のままだと本番設計に乗らない。

必要な前提:

- 先生がどの学校に所属しているか
- 先生がどのクラスを担当しているか
- 生徒がどのクラスに所属しているか
- その権限で diary / progress を見られるか

よって、教師ダッシュボード API は今後 `school_memberships` / `class_enrollments` ベースへ寄せる必要がある。

## UI 設計方針

## 1. 学校未所属でも通常利用可能にする

必要な修正箇所:

- [apps/frontend/src/pages/AuthCallbackPage.tsx](C:\Users\kouta\tanqmates\apps\frontend\src\pages\AuthCallbackPage.tsx:25)
- [apps/frontend/src/pages/OnboardingPage.tsx](C:\Users\kouta\tanqmates\apps\frontend\src\pages\OnboardingPage.tsx:174)
- [apps/frontend/src/pages/SchoolRegistrationPage.tsx](C:\Users\kouta\tanqmates\apps\frontend\src\pages\SchoolRegistrationPage.tsx:60)

原則:

- 学校コードは onboarding の必須項目にしない
- 後から profile/settings から学校参加できる
- 学校未所属でも `dashboard`, `chat`, `diary`, `profile` は利用可能

## 2. Profile で所属管理を扱えるようにする

`ProfilePage` に今後必要な機能:

- 現在の学校所属一覧
- 現在のアクティブ学校/クラス表示
- 学校コードによる参加
- 所属解除申請または切り替え

## 3. Teacher 画面は所属データに基づいて出し分ける

今は `role === teacher` で `/teacher` へ誘導している箇所がある。

関連:

- [apps/frontend/src/pages/SignInPage.tsx](C:\Users\kouta\tanqmates\apps\frontend\src\pages\SignInPage.tsx:74)
- [apps/frontend/src/pages/AuthCallbackPage.tsx](C:\Users\kouta\tanqmates\apps\frontend\src\pages\AuthCallbackPage.tsx:30)

今後は単純な `profile.role` だけではなく、

- 有効な teacher membership があるか
- 担当クラスがあるか

で画面可否を判断する方が安全。

## リリース優先での実装計画

## Phase 1: 先に入れるべき最小追加

### DB

- `school_memberships`
- `classes`
- `class_enrollments`

### API

- `GET /auth/profile` に membership 情報を追加
- `POST /auth/join-school` のような membership 作成 API を追加
- `GET /schools/me/context` のような現在所属取得 API を追加

### UI

- 学校未所属でも主要機能が使えることを担保
- school registration を後付け導線にする

この段階では、既存 `profiles.school_id` は互換目的で残してよい。

## Phase 2: 既存前提の切り離し

### API/UI 修正

- onboarding 完了判定から `school_id` 前提を外す
- `school_code_locked` の依存を縮小
- `profile.role` 単独ではなく membership ベースの表示へ寄せる

### データ

- `profiles.school_id` は「互換用キャッシュ」か「primary school の denormalized mirror」へ格下げする
- 正本は `school_memberships` に移す

## Phase 3: 教師機能の本設計化

- `teacher_service.py` の仮ストレージを廃止
- class / enrollment / diary を結ぶ本番 API に置き換える
- `TeacherDashboard` を membership / class ベースの実データへ接続する

## 変更要否の結論

## 変更不要なもの

- ユーザー正準IDを UUID にする方針
- 個人データ中心の `projects`, `memos`, `chat`, `diary` の基本構造
- 学校文脈を nullable で追加する方向

## 追加だけでは足りないもの

- `profiles.school_id` を学校所属の正本とみなす設計
- onboarding/auth callback の学校前提フロー
- teacher 機能の仮実装

## 実務上の推奨判断

リリース優先なら、次の割り切りが最も安全。

1. 個人利用は今の UUID ベースで先に安定化する
2. 学校導入に備えて membership/class テーブルを先に追加する
3. ただし同時に、`school_id 必須前提` の UI/API だけは外す
4. 教師機能は本導入が決まり次第、class/membership ベースへ再実装する

この順なら、toC を先に出しつつ、後から学校導入してもデータ移行コストと設計負債を抑えられる。

## 推奨次アクション

1. `school_memberships`, `classes`, `class_enrollments` の SQL を作成
2. `auth/profile` のレスポンス拡張案を決める
3. `AuthCallbackPage`, `OnboardingPage`, `SchoolRegistrationPage` の学校前提判定を見直す
4. `TeacherDashboard` を将来どの API に乗せるかを別途設計する
