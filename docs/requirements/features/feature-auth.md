# 認証要件定義 v2
## 探Qメイト（2026年3月22日更新）

---

## 1. 概要

### 認証方式
- メールアドレス + パスワード認証（Supabase Auth）
- Google OAuth認証（Supabase Auth経由）

### ユーザーロール
| ロール | 説明 | 発行方法 |
|--------|------|----------|
| `student` | 生徒（デフォルト） | 自己登録 |
| `teacher` | 先生 | 管理者による招待リンク方式 |

### 利用モード
| モード | 条件 | 先生から見える |
|--------|------|----------------|
| 学校利用 | school_idが設定済み | ✅ 見える |
| 個人利用 | school_id = NULL | ❌ 見えない |

### 設計思想
- 一度学校コードを入力してschool_idが紐付いたら**変更不可**
- 個人利用と学校利用は同一アカウントで実現する（アカウントを分けない）

---

## 2. データ設計

### テーブル構成

```
auth.users（Supabase管理）
    ↓ 1対1（Triggerで自動作成）
public.profiles
    ↓ 多対1
public.schools
```

### `schools`テーブル

| カラム | 型 | 制約 | 説明 |
|--------|----|------|------|
| id | uuid | PK | 学校ID |
| name | text | NOT NULL | 学校名 |
| school_code | text | NOT NULL / UNIQUE | 運営が発行して、生徒が入力するコード |
| created_at | timestamptz | DEFAULT now() | 作成日時 |

### `profiles`テーブル

| カラム | 型 | 制約 | 説明 |
|--------|----|------|------|
| id | uuid | PK / FK(auth.users) | ユーザーID |
| role | text | NOT NULL / DEFAULT 'student' | student or teacher |
| school_id | uuid | FK(schools) / NULL許容 | 所属学校ID（一度設定したら変更不可） |
| name | text | | 氏名 |
| grade | text | | 学年（例：1年 / 2年 / 3年） |
| class_name | text | | クラス（例：1組 / A組） |
| attendance_number | integer | | 出席番号 |
| school_code_locked | boolean | DEFAULT false | school_id変更禁止フラグ |
| created_at | timestamptz | DEFAULT now() | 作成日時 |

**ユニーク制約の考え方**：`school_id × class_name × attendance_number`の組み合わせで実質ユニーク。DB制約は設けない（入力ミスへの先生による修正を許容するため）。

### `invitation_tokens`テーブル（先生招待用）

| カラム | 型 | 制約 | 説明 |
|--------|----|------|------|
| id | uuid | PK | トークンID |
| school_id | uuid | FK(schools) | 招待する学校ID |
| token | text | NOT NULL / UNIQUE | ランダムトークン |
| expires_at | timestamptz | NOT NULL | 有効期限 |
| used_at | timestamptz | NULL許容 | 使用済み日時 |
| created_at | timestamptz | DEFAULT now() | 作成日時 |

---

## 3. ページ構成

```
/signin
/signup
/onboarding               ← 名前・学校コード入力（学校コード入力で学年・クラス・出席番号欄が展開）
/signup/complete
/teacher/setup            ← 招待リンクを踏んだ先生が名前・学校を設定
/password-reset
/password-reset/new
/password-reset/complete
/admin                    ← 管理者（こうさん）専用
```

---

## 4. 各ページの要件

### `/signin`（ログイン）

**表示要素**
- メールアドレス入力
- パスワード入力
- ログインボタン
- Googleでログインボタン
- 「新規登録はこちら」リンク → `/signup`
- 「パスワードをお忘れの方はこちら」リンク → `/password-reset`

**処理**
- ログイン成功後、Supabase Auth session を確立し、`profiles.role`を参照してリダイレクト
  - `student` → `/student`
  - `teacher` → `/teacher`
- `school_id`が未設定かつ`school_code_locked = false` → `/onboarding`へリダイレクト

**エラー**
- 認証失敗：「メールアドレスまたはパスワードが正しくありません」
- 既登録メール：「このメールアドレスは既に登録されています。ログインページへ」

---

### `/signup`（新規登録）

**ステップ1：メール入力**
- メールアドレス入力
- 「次へ」ボタン
- 既登録メール → 「このメールアドレスは既に登録されています」ではじく

**ステップ2：パスワード設定**
- パスワード入力（8文字以上）
- パスワード（確認）入力
- 「登録」ボタン
- パスワード不一致、文字数不足はその場でバリデーション

**処理**
- 登録成功 → `/onboarding`へ遷移

**Googleで登録する場合**
- 登録後 → `/onboarding`へ遷移

---

### `/onboarding`（プロフィール + 学校コード入力）

**表示要素**
- 名前入力（必須）
- 学校コード入力（任意）
- 「登録する」ボタン

**学校コード入力時のUI挙動**
- 学校コードを入力して確定した瞬間に`schools`テーブルを参照
- 一致した場合：同一画面内に以下の入力欄がアニメーションで展開される
  - 学年（必須）：セレクトボックス（1年 / 2年 / 3年）
  - クラス（必須）：テキスト入力（1組 / 2組 / A組 等）
  - 出席番号（必須）：数字入力
- 不一致の場合：「学校コードが正しくありません」をインラインで表示
- ページ遷移は発生しない

**処理（学校コードあり）**
- `profiles.school_id`を更新・`school_code_locked = true`に設定
- `grade` / `class_name` / `attendance_number`を保存
- → `/signup/complete`へ遷移

**処理（学校コードなし）**
- 名前のみ保存
- → `/signup/complete`へ遷移

**フロントの実装イメージ**
```typescript
const [schoolId, setSchoolId] = useState<string | null>(null)

const handleSchoolCode = async (code: string) => {
  const { data } = await supabase
    .from('schools')
    .select('id')
    .eq('school_code', code)
    .single()

  if (data) setSchoolId(data.id) // 一致したら入力欄を展開
}

{schoolId && (
  <div className="animate-fadeIn">
    <GradeSelect />
    <ClassInput />
    <AttendanceNumberInput />
  </div>
)}
```

**備考**
- 一度`school_code_locked = true`になったら学校コードの変更不可
- ログイン後に`school_id`が未設定の場合もここにリダイレクト

---

### `/signup/complete`（登録完了）

**表示要素**
- 「登録が完了しました！」メッセージ
- 「探Qメイトをはじめる」ボタン → `/dashboard`

---

### `/teacher/setup`（先生：初回セットアップ）

招待メール内のリンクを踏んだ先生が到達するページ。

**表示要素**
- パスワード設定（8文字以上）
- パスワード（確認）入力
- 名前入力（必須）
- 「セットアップ完了」ボタン

**処理**
- `profiles`の`role = 'teacher'` / `name` / `school_id`を設定
  （`school_id`は招待時の`user_metadata`から取得）
- → `/teacher`ダッシュボードへ遷移

---

### `/admin`（管理者専用）

こうさんのみアクセス可能。

**機能**
- 先生招待：メールアドレス + 学校選択 → 招待メール送信
- 学校管理：学校の追加・school_codeの発行

**招待処理**
```typescript
await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
  redirectTo: 'https://tanqmate.com/teacher/setup',
  data: { role: 'teacher', school_id: schoolId }
})
```

---

### `/password-reset`（パスワードリセット申請）

**表示要素**
- メールアドレス入力
- 「送信」ボタン
- 「ログインページへ戻る」リンク → `/signin`

**処理**
- 送信後：「パスワード再設定用のメールを送信しました。」
- 未登録メールでも同じメッセージを表示（セキュリティ上の理由）

---

### `/password-reset/new`（新パスワード設定）

**表示要素**
- パスワード入力（8文字以上）
- パスワード（確認）入力
- 「再設定」ボタン

**処理**
- セッションが無効の場合 → `/password-reset`へリダイレクト
- 再設定成功 → `/password-reset/complete`へ遷移

---

### `/password-reset/complete`（パスワードリセット完了）

**表示要素**
- 「パスワードの再設定が完了しました。」メッセージ
- 「ログインページへ戻る」ボタン → `/signin`

---

## 5. 既存ユーザーの移行

### 対象
2025年3月31日以前に旧認証方式で登録したユーザー

### 案内UI
- ホーム画面に「重要」お知らせカードを表示
- 期限：2025年4月6日まで
- カードはログインするたびに表示し続ける

### 移行フロー

```
お知らせカードをタップ
    ↓
案内モーダルを展開（手順説明）
    ↓
「再登録をはじめる」→ /signup へ
    ↓
「これまでのデータを引き継ぐ」トグル（デフォルトON）
    ↓
ON の場合：メールアドレス一致で旧データ
（マップ・チャット・日記）を新UIDに紐付け
OFF の場合：新規スタート
    ↓
/onboarding → （学校コードあれば）/onboarding/class-info
    ↓
/signup/complete
```

### 旧テーブルの廃止
- 移行期限後（2025年4月6日以降）に`users`テーブルを廃止

---

## 6. 先生によるクラス情報の修正

生徒が誤入力した場合に備えて、先生がダッシュボードから修正できる。

**修正可能な項目**
- クラス（class_name）
- 出席番号（attendance_number）
- 学年（grade）

**RLSポリシー**
```sql
create policy "先生は同校の生徒プロフィールを更新可"
  on public.profiles for update
  using (
    exists (
      select 1
      from public.profiles teacher_profile
      where teacher_profile.id = auth.uid()
        and teacher_profile.role = 'teacher'
    )
    and school_id = (
      select school_id from public.profiles
      where id = auth.uid()
    )
  );
```

---

## 7. セキュリティ要件

| 項目 | 設定 |
|------|------|
| Confirm email | OFF（学校環境への配慮） |
| Secure email change | ON |
| Secure password change | ON |
| 最小パスワード長 | 8文字 |
| RLS | 全テーブルで有効 |
| 認証トークン管理 | Supabase Auth session / token refresh に委譲する |
| 認可属性の正本 | `profiles.role` / `profiles.school_id` をDB正本として扱う |
| SMTPサーバー | Resend（月3,000通・無料） |
| school_id | 一度設定したら変更不可（school_code_locked） |

### RLSポリシー一覧

| テーブル | 操作 | ポリシー |
|----------|------|----------|
| `schools` | SELECT | 認証済みユーザーは全校を参照可 |
| `profiles` | SELECT | 自分のprofileのみ参照可 |
| `profiles` | SELECT | 先生は同校の生徒profileを参照可 |
| `profiles` | UPDATE | 先生は同校の生徒のクラス情報を更新可 |
| `profiles` | INSERT | Triggerのみ（supabase_auth_admin経由） |

---

## 8. 未対応・今後の検討事項

- メール確認（Confirm email）の将来的な有効化
- 招待リンクのトークン有効期限・使い捨て管理（`invitation_tokens`テーブル活用）
- セッション有効期限の設定
- Multi-Factor Authentication（MFA）の導入
- 個人利用向けの申し込みフォーム・専用school_code発行フロー
- 卒業・進級時のschool_id引き継ぎ方針
