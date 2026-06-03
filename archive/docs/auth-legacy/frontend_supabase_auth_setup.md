# Supabase Auth 設定解説
## 探Qメイト・認証基盤構築（2025年3月18日）

---

## Phase 1：Email Provider + URL Configuration

### Email Providerの設定

Supabaseが持つ認証機能の「メール認証」を有効化しました。

**Confirm emailをOFFにした理由**は、ONにするとサインアップ時にメールアドレスへの確認リンク送信が必須になるからです。学校環境では生徒が確認メールを見られないケースが多く、登録で詰まる生徒が出ます。代わりに**学校コード**でなりすましを防ぐ設計にしました。

**Secure email changeをONにした理由**は、メアドを変更するとき新旧両方のアドレスに確認メールを送る設定で、アカウント乗っ取りのリスクを下げるためです。

### URL Configurationの設定

```
Site URL:      https://tanqmate.com
Redirect URLs: https://tanqmate.com/**
               http://localhost:5173/**
```

SupabaseのOAuth（Google認証など）は、認証後にユーザーを**Redirect URLs**に記載されたURLにしか返せません。本番と開発環境の両方を登録することで、どちらの環境でも認証フローが完結します。`**`のワイルドカードは全パスを許可します。

---

## Phase 2：Google OAuth設定

Google Cloud ConsoleでOAuthクライアントを作成し、Supabaseに連携しました。

**なぜGoogle Cloud Console側の設定が先なのか**というと、GoogleはOAuth認証のリダイレクト先を事前に登録したURLしか許可しないからです。

```
承認済みリダイレクトURI:
https://wttynclovrmxlbbdxzcd.supabase.co/auth/v1/callback
```

このURLはSupabaseが受け口になっていて、「GoogleからSupabaseに認証結果を返す → SupabaseからアプリのRedirect URLに返す」という2段階のリダイレクトになっています。

コード側は1行でGoogle認証が呼べます：

```typescript
await supabase.auth.signInWithOAuth({ provider: 'google' })
```

---

## Phase 3：SQLでのテーブル・Function設計

### なぜ3つのSQLが必要だったか

Supabase Authの`auth.users`テーブルはSupabase内部で管理されており、**直接カラムを追加できません**。メール・パスワード・UIDしか持てない制約があります。そのため探Qメイト固有の情報（roleとschool_id）を持つための仕組みを自前で作りました。

---

### ① schoolsテーブル

```sql
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  school_code text not null unique,
  created_at timestamptz default now()
);
```

**役割**：学校そのものの情報を管理します。

`school_code`に`unique`制約をつけたのは、同じコードが2つ存在すると生徒がどの学校に紐付くか判定できなくなるからです。生徒がサインアップ時にこのコードを入力することで、`schools`テーブルから`school_id`を取得してprofilesに保存する流れになります。

**RLSポリシー**：

```sql
create policy "認証済みユーザーは学校を参照可"
  on public.schools for select
  to authenticated using (true);
```

ログインしているユーザーなら誰でも学校名・学校コードを参照できます。サインアップ時に学校コードの存在確認が必要なので`authenticated`ではなく`anon`にすることも選択肢ですが、βフェーズでは認証後に入力する設計のためこれでOKです。

---

### ② profilesテーブル + Trigger

```sql
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  role text not null default 'student' check (role in ('student', 'teacher')),
  school_id uuid references public.schools(id),
  created_at timestamptz default now()
);
```

**役割**：ユーザー1人ひとりの「アプリ内での属性」を管理します。

設計の重要ポイントが3つあります。

`id`を`auth.users(id)`に外部キーで紐付けたことで、auth.usersのレコードが消えたとき`on delete cascade`によってprofilesも自動で消えます。孤立したレコードが残らないための設計です。

`role`に`check`制約をつけたことで、`student`と`teacher`以外の値は物理的に入れられません。アプリ側のバグで想定外のroleが入ることを防ぎます。

`school_id`はNULLを許容しています。サインアップ直後はまだ学校コードを入力していない状態なので、まずNULLでレコードを作り、学校コード入力後に更新する2ステップの設計です。

**Triggerの仕組み**：

```sql
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

`auth.users`に新しいレコードが`insert`されるたびに、自動で`profiles`にもレコードを作ります。これがないと、サインアップしてもprofilesが空のままになります。`security definer`をつけることでTrigger関数がRLSをバイパスして実行できるようにしています。

**RLSポリシー**：

```sql
create policy "自分のprofileを参照"
  on public.profiles for select
  using (auth.uid() = id);
```

自分のprofileしか見えません。他の生徒のroleやschool_idは参照不可です。

---

### ③ Custom Access Token Hook

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql as $$
declare
  claims jsonb;
  user_role text;
  user_school_id uuid;
begin
  select role, school_id
    into user_role, user_school_id
    from public.profiles
   where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{role}', to_jsonb(coalesce(user_role, 'student')));
  claims := jsonb_set(claims, '{school_id}', to_jsonb(coalesce(user_school_id::text, '')));

  return jsonb_set(event, '{claims}', claims);
end;
$$;
```

**役割**：ログインのたびにJWT（アクセストークン）に`role`と`school_id`を自動で埋め込みます。

**なぜJWTに入れるのか**というと、フロントエンドがAPIを叩くたびにprofilesテーブルを毎回参照するのは非効率だからです。JWTにroleが入っていれば、トークンを見るだけで「この人は先生か生徒か」が即座にわかります。RLSポリシーの中でも`auth.jwt()->'role'`として参照できます。

`coalesce`を使っているのは、profilesにレコードがない場合のフォールバックで、roleが取れなければ`student`、school_idが取れなければ空文字を返します。

**権限設定**：

```sql
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;
```

このFunctionはSupabaseの認証システムだけが呼べるように制限しています。一般ユーザーが直接呼び出してroleを書き換えられないための設計です。

---

## 全体のデータフロー

```
① 生徒がサインアップ
        ↓
② auth.usersにレコード作成（Supabase管理）
        ↓
③ Triggerが発火 → profilesにレコード自動作成
   （role: 'student', school_id: null）
        ↓
④ 学校コードを入力 → schoolsテーブルで検索
   → profilesのschool_idを更新
        ↓
⑤ ログイン
        ↓
⑥ Custom Access Token Hookが発火
   → profilesからrole・school_idを取得
   → JWTに埋め込んでフロントに返す
        ↓
⑦ フロントはJWTを見て
   role = 'teacher' → /teacher へ
   role = 'student' → /student へ
```

---

## 次のステップ

動作確認としてテストユーザーを1人作成し、JWTに`role`と`school_id`が含まれているかを確認します。JWTの確認は [jwt.io](https://jwt.io) にアクセストークンを貼り付けるだけで確認できます。
