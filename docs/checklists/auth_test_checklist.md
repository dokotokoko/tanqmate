# Frontend Auth Test Checklist

認証関連の不完全さを潰すための手動確認チェックリストです。  
対象は `apps/frontend` の Supabase Auth ベース認証フローです。

## 前提

- 登録済みアカウントでのサインイン確認は完了
- パスワードリセットの確認は完了
- ブラウザの DevTools Console を開いてログを確認できる状態で実施する

## 優先度ルール

- `P0`: リリース必須。認証、遷移、セッション維持、回復導線が壊れる可能性がある
- `P1`: 強く推奨。主要体験の品質や調査性に影響するが、即リリース停止ではない
- `P2`: 補助確認。ログ観測や追加の安全確認が中心

## 改善方針

- まず `P0` を全消化し、未解決ならリリースしない
- 次に OAuth / Sign Up / Password Reset の分岐で `P0` を埋める
- `P1` は同一ファイルの修正タイミングでまとめて解消する
- `P2` は不具合調査や運用観点で有用だが、単独ではリリース blocker にしない
- ログ確認項目は「ログが出ること」自体ではなく、「画面遷移と状態遷移が期待どおりか」を主判定にする
- コンソール warning は別枠で記録し、認証フロー破壊と混同しない

## 確認ログ

以下のログを観測点として利用する。

- `[AuthStore] initialize:start`
- `[AuthStore] initialize:session-loaded`
- `[AuthStore] onAuthStateChange`
- `[AuthStore] applySessionState:start`
- `[AuthStore] applySessionState:completed`
- `[AuthStore] applySessionState:cleared`
- `[AuthStore] signIn:start`
- `[AuthStore] signIn:completed`
- `[AuthStore] signIn:error`
- `[AuthStore] signUp:start`
- `[AuthStore] signUp:confirmation-required`
- `[AuthStore] signUp:completed-with-session`
- `[AuthStore] signUp:error`
- `[AuthStore] signInWithGoogle:start`
- `[AuthStore] signInWithGoogle:redirect-requested`
- `[AuthStore] signInWithGoogle:error`
- `[AuthStore] resetPassword:start`
- `[AuthStore] resetPassword:email-sent`
- `[AuthStore] resetPassword:error`
- `[AuthStore] updateUser:start`
- `[AuthStore] updateUser:completed`
- `[AuthStore] updateUser:error`
- `[AuthStore] refreshSession:start`
- `[AuthStore] refreshSession:completed`
- `[AuthStore] refreshSession:error`
- `[AuthStore] signOut:start`
- `[AuthStore] signOut:completed`
- `[ProtectedRoute] waiting`
- `[ProtectedRoute] redirecting-to-signin`
- `[ProtectedRoute] granted`
- `[PasswordResetNewPage] checkSession`
- `[PasswordResetNewPage] password-updated`
- `[AuthCallbackPage] ...`

## チェックリスト

### 1. Route Guard

- [x] `P0` 登録済みアカウントでサインインできる
- [x] `P0` パスワードリセットメール送信と再設定ができる
- [x] `P0` 未ログイン状態で `/app/dashboard` に直接アクセスすると `/signin` へリダイレクトされる
- [ ] `P0` 未ログイン状態で `/app/projects/:id` に直接アクセスすると `/signin` へリダイレクトされる→現状はルートへリダイレクトされる
- [x] `P0` 未ログイン状態で `/app/chat` に直接アクセスすると `/signin` へリダイレクトされる
- [x] `P0` ログイン済み状態で `/signin` にアクセスすると `/app/dashboard` に戻される
- [ ] `P2` `ProtectedRoute` で protected 画面遷移時に `[ProtectedRoute] granted` が出る

改善方針:
- `P0` の `/app/projects/:id` は route 定義と legacy redirect の競合を優先確認する
- `ProtectedRoute` のログ確認は補助扱いにし、実際の redirect 成否を主判定にする

### 2. Session Persistence

- [x] `P0` ログイン後にブラウザ再読み込みしてもセッションが維持される
- [ ] `P1` 再読み込み後に `initialize:start` → `initialize:session-loaded` → `applySessionState:completed` が確認できる
- [ ] `P0` ログイン後に `/app/dashboard` から `/app/projects/:id` などへ移動しても再ログイン不要
- [x] `P1` 複数タブで開いた状態で片方をログアウトすると、もう一方も auth state が追従する

改善方針:
- `P0` は実遷移を優先し、router 遷移中のセッション消失がないかを確認する
- `P1` のログ系列は `initialize` の二重実行や `skipped` の混入を許容しつつ、最終的に `applySessionState:completed` へ収束するかで判定する

### 3. Sign In / Sign Out

- [ ] `P0` teacher role ユーザーはサインイン後に `/teacher` に進む
- [x] `P0` student role ユーザーはサインイン後に `/app/dashboard` に進む
- [x] `P1` 誤ったメールアドレスまたはパスワードで `signIn:error` が出て、UI にエラーが表示される
- [x] `P0` ログアウト後に `/signin` へ戻る
- [ ] `P0` ログアウト後に protected route を再訪すると `/signin` にリダイレクトされる
- [ ] `P2` ログアウト時に `signOut:start` → `signOut:completed` → `applySessionState:cleared` の流れが確認できる

改善方針:
- teacher/student の post-login redirect は role 判定の信頼性確認として `P0`
- sign out 系は「戻るボタンや直 URL で保護画面に戻れないこと」を最優先で見る
- ログ系列確認は補助。実際に state が cleared されているかを画面遷移で担保する

### 4. Sign Up

- [ ] `P1` 新規登録で確認メール必須のケースは `/signup/complete` に進む
- [ ] `P2` その際に `signUp:confirmation-required` が出る
- [ ] `P0` 即 session が返るケースは `/onboarding` に進む
- [ ] `P2` その際に `signUp:completed-with-session` が出る
- [ ] `P1` 既存メールアドレスで登録すると重複登録エラーまたは既存アカウント案内が出る
- [ ] `P1` `signUp:error` の内容が UI 表示と一致する

改善方針:
- リリース前に最低限、session 付き登録の遷移先は確認する
- メール確認あり/なしの両分岐を仕様として固定し、チェックリスト上も分けて管理する
- UI エラー文言は backend / Supabase の raw message をそのまま出していないか確認する

### 5. OAuth Callback

- [ ] `P1` Google ログイン開始時に `signInWithGoogle:start` → `signInWithGoogle:redirect-requested` が出る
- [ ] `P0` callback 後、teacher は `/teacher` に進む
- [ ] `P0` callback 後、student は `/app/dashboard` に進む
- [x] `P0` onboarding 未完了ユーザーは `/onboarding` に進む
- [ ] `P0` recovery callback のとき `/password-reset/new` に進む
- [ ] `P0` 無効または期限切れ callback URL のとき `/signin` に戻る
- [ ] `P2` `AuthCallbackPage` のログから query/hash/type の値を確認できる

改善方針:
- OAuth は正常系と異常系の両方を `P0` で持つ
- callback URL 不正時の復帰先はセキュリティと UX の両面で必須確認
- ログは query/hash/type の解析補助として使うが、主判定は最終遷移先に置く

### 6. Password Reset

- [x] `P0` パスワードリセット送信ページでメール送信できる
- [x] `P0` パスワード再設定ページで新しいパスワードを設定できる
- [ ] `P0` `PasswordResetNewPage` で session なしのアクセス時に `/password-reset` に戻る
- [ ] `P2` `PasswordResetNewPage` 表示時に `[PasswordResetNewPage] checkSession` が出る
- [x] `P1` パスワード更新成功時に `[PasswordResetNewPage] password-updated` が出る
- [x] `P0` 更新後、その新しいパスワードでサインインできる

改善方針:
- recovery session なしで新規パスワード入力画面に残れると危険なので `P0`
- ログは session 確認分岐の補助として扱う

### 7. Session Refresh

- [ ] `P0` セッション期限切れに近い状態で操作しても `refreshSession:start` → `refreshSession:completed` が確認できる
- [ ] `P0` refresh 成功後も protected route に留まれる
- [ ] `P0` refresh 失敗時はエラー状態または `/signin` への復帰動作が確認できる

改善方針:
- ここは認証基盤の核なので全部 `P0`
- 長時間放置後の再操作、タブ復帰、通信回復後の 3 パターンで見る
- 失敗時に silent failure にならず、最終的に `/signin` へ戻せることを確認する

### 8. Profile / Onboarding

- [ ] `P0` サインイン直後に backend profile 取得または Supabase profile fallback が正常に動く
- [ ] `P0` `applySessionState:completed` の `role` が想定どおりである
- [ ] `P0` school/onboarding 未完了のユーザーだけ `/onboarding` に誘導される

改善方針:
- profile 取得失敗は role 判定崩れや誤遷移に直結するため `P0`
- student / teacher / onboarding 未完了の 3 ケースを最低限切り分けて確認する

## 推奨実施順

1. `P0` Route Guard
2. `P0` Sign In / Sign Out
3. `P0` Session Persistence
4. `P0` Session Refresh
5. `P0` Profile / Onboarding
6. `P0` OAuth Callback
7. `P0/P1` Password Reset
8. `P1` Sign Up

## リリース判定の目安

- `P0` に未確認または失敗が残る場合はリリースしない
- `P1` は可能な限り解消する。既知課題として持つ場合は影響範囲を明記する
- `P2` は不具合調査性の担保として扱い、単独ではリリース blocker にしない

## メモ欄

- 実施日:
- 実施者:
- 確認環境:
- 追加で見つかった不具合:
1.Googleでログイン時はオンボーディングへと飛ぶが、それ以外は飛ばない
2.プロジェクト作成時にエラーが発生する
3.このアプリにおける「プロジェクト」の概念が不明瞭になってきている。おそらくオンボーディングで登録して、その後はプロフィールでの管理になるのが良いと思われる。メモの体験はScrapboxみたいになると良いのか何なのか。

追加の改善メモ:
1. `initialize:start` の重複自体は開発時に起こりうるため、`initialize:skipped` が続いても即不具合扱いしない
2. `applySessionState` の重複実行は副作用増加の可能性があるため、将来的に整理候補として扱う
3. `Password field is not contained in a form` は認証 blocker ではないが修正推奨
4. `Using kebab-case for css properties in objects is not supported` は UI 実装修正対象として別チケット化推奨

未ログイン状態でのアクセスで、/signinに飛んだ時のコンソールログ
[vite] connecting...
chunk-67DEV5DB.js?v=58c2f796:21551 Download the React DevTools for a better development experience: https://reactjs.org/link/react-devtools
supabase.ts:10 [Supabase] Initializing with URL: https://wttynclovrmxlbbdxzcd.s...
supabase.ts:11 [Supabase] Publishable key: SET
api.ts:30 API Configuration: Object
App.tsx:90 [App] Auth state: Object
App.tsx:102 [App] Showing loading screen because isLoading: true
App.tsx:90 [App] Auth state: Object
App.tsx:102 [App] Showing loading screen because isLoading: true
2LoadingScreen.tsx:7 [LoadingScreen] Rendering loading screen
App.tsx:83 [App] Initializing auth...
authStore.ts:78 [AuthStore] initialize:start Object
App.tsx:83 [App] Initializing auth...
authStore.ts:78 [AuthStore] initialize:skipped Object
App.tsx:90 [App] Auth state: Object
App.tsx:102 [App] Showing loading screen because isLoading: true
App.tsx:90 [App] Auth state: Object
App.tsx:102 [App] Showing loading screen because isLoading: true
client:618 [vite] connected.
authStore.ts:78 [AuthStore] initialize:session-loaded Object
authStore.ts:78 [AuthStore] applySessionState:start Object
authStore.ts:78 [AuthStore] applySessionState:cleared Object
App.tsx:90 [App] Auth state: Object
App.tsx:90 [App] Auth state: Object
2LoadingScreen.tsx:7 [LoadingScreen] Rendering loading screen
react-router-dom.js?v=58c2f796:4436 ⚠️ React Router Future Flag Warning: React Router will begin wrapping state updates in `React.startTransition` in v7. You can use the `v7_startTransition` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_starttransition.
warnOnce @ react-router-dom.js?v=58c2f796:4436Understand this warning
react-router-dom.js?v=58c2f796:4436 ⚠️ React Router Future Flag Warning: Relative route resolution within Splat routes is changing in v7. You can use the `v7_relativeSplatPath` future flag to opt-in early. For more information, see https://reactrouter.com/v6/upgrading/future#v7_relativesplatpath.
warnOnce @ react-router-dom.js?v=58c2f796:4436Understand this warning
authStore.ts:78 [AuthStore] onAuthStateChange Object
authStore.ts:78 [AuthStore] applySessionState:start Object
authStore.ts:78 [AuthStore] applySessionState:cleared Object
App.tsx:90 [App] Auth state: Object
App.tsx:90 [App] Auth state: Object
2LoadingScreen.tsx:7 [LoadingScreen] Rendering loading screen


新規アカウント登録から、メールアドレスで登録した時のログ
[LoadingScreen] Rendering loading screen
App.tsx:90 [App] Auth state: {hasUser: false, isLoading: false, isInitialized: true, authLoading: false}
App.tsx:90 [App] Auth state: {hasUser: false, isLoading: false, isInitialized: true, authLoading: false}
[Violation] Forced reflow while executing JavaScript took 32ms
signup:1 [DOM] Password field is not contained in a form: (More info: https://goo.gl/9p2vKq) <input aria-invalid=​"false" autocomplete=​"new-password" id=​"password" name=​"password" required type=​"password" class=​"MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart MuiInputBase-inputAdornedEnd css-i3v0ip-MuiInputBase-input-MuiOutlinedInput-input" value>​
signup:1 [DOM] Password field is not contained in a form: (More info: https://goo.gl/9p2vKq) <input aria-invalid=​"false" autocomplete=​"new-password" id=​"confirmPassword" name=​"confirmPassword" required type=​"password" class=​"MuiInputBase-input MuiOutlinedInput-input MuiInputBase-inputAdornedStart css-15nkeyy-MuiInputBase-input-MuiOutlinedInput-input" value>​
authStore.ts:78 [AuthStore] signUp:start {email: 'koutakado.beau@gmail.com', metadataKeys: Array(0)}
App.tsx:90 [App] Auth state: {hasUser: false, isLoading: true, isInitialized: true, authLoading: true}
App.tsx:102 [App] Showing loading screen because isLoading: true
App.tsx:90 [App] Auth state: {hasUser: false, isLoading: true, isInitialized: true, authLoading: true}
App.tsx:102 [App] Showing loading screen because isLoading: true
LoadingScreen.tsx:7 [LoadingScreen] Rendering loading screen
LoadingScreen.tsx:7 [LoadingScreen] Rendering loading screen
[Violation] Forced reflow while executing JavaScript took 35ms
authStore.ts:78 [AuthStore] onAuthStateChange {event: 'SIGNED_IN', hasSession: true, userId: 'a7f54877-0328-41c2-a19d-fbfbffaff2a8'}
authStore.ts:78 [AuthStore] applySessionState:start {hasSession: true, userId: 'a7f54877-0328-41c2-a19d-fbfbffaff2a8', email: 'koutakado.beau@gmail.com'}
authStore.ts:78 [AuthStore] applySessionState:completed {userId: 'a7f54877-0328-41c2-a19d-fbfbffaff2a8', email: 'koutakado.beau@gmail.com', role: 'student'}
App.tsx:90 [App] Auth state: {hasUser: true, isLoading: false, isInitialized: true, authLoading: false}
App.tsx:90 [App] Auth state: {hasUser: true, isLoading: false, isInitialized: true, authLoading: false}
ProtectedRoute.tsx:31 [ProtectedRoute] granted {pathname: '/app/dashboard', userId: 'a7f54877-0328-41c2-a19d-fbfbffaff2a8', email: 'koutakado.beau@gmail.com'}
ProtectedRoute.tsx:31 [ProtectedRoute] granted {pathname: '/app/dashboard', userId: 'a7f54877-0328-41c2-a19d-fbfbffaff2a8', email: 'koutakado.beau@gmail.com'}
chunk-SFOCJKXU.js?v=58c2f796:4182 Using kebab-case for css properties in objects is not supported. Did you mean msOverflowStyle?
processStyleValue3 @ chunk-SFOCJKXU.js?v=58c2f796:4182
createStringFromObject @ chunk-SFOCJKXU.js?v=58c2f796:4042
handleInterpolation @ chunk-SFOCJKXU.js?v=58c2f796:3994
handleInterpolation @ chunk-SFOCJKXU.js?v=58c2f796:4001
serializeStyles @ chunk-SFOCJKXU.js?v=58c2f796:4085
(anonymous) @ chunk-SFOCJKXU.js?v=58c2f796:5099
(anonymous) @ chunk-SFOCJKXU.js?v=58c2f796:4239
renderWithHooks @ chunk-67DEV5DB.js?v=58c2f796:11548
updateForwardRef @ chunk-67DEV5DB.js?v=58c2f796:14325
beginWork @ chunk-67DEV5DB.js?v=58c2f796:15946
beginWork$1 @ chunk-67DEV5DB.js?v=58c2f796:19753
performUnitOfWork @ chunk-67DEV5DB.js?v=58c2f796:19198
workLoopSync @ chunk-67DEV5DB.js?v=58c2f796:19137
renderRootSync @ chunk-67DEV5DB.js?v=58c2f796:19116
performConcurrentWorkOnRoot @ chunk-67DEV5DB.js?v=58c2f796:18678
workLoop @ chunk-67DEV5DB.js?v=58c2f796:197
flushWork @ chunk-67DEV5DB.js?v=58c2f796:176
performWorkUntilDeadline @ chunk-67DEV5DB.js?v=58c2f796:384Understand this error
chunk-SFOCJKXU.js?v=58c2f796:4182 Using kebab-case for css properties in objects is not supported. Did you mean scrollbarWidth?
processStyleValue3 @ chunk-SFOCJKXU.js?v=58c2f796:4182
createStringFromObject @ chunk-SFOCJKXU.js?v=58c2f796:4042
handleInterpolation @ chunk-SFOCJKXU.js?v=58c2f796:3994
handleInterpolation @ chunk-SFOCJKXU.js?v=58c2f796:4001
serializeStyles @ chunk-SFOCJKXU.js?v=58c2f796:4085
(anonymous) @ chunk-SFOCJKXU.js?v=58c2f796:5099
(anonymous) @ chunk-SFOCJKXU.js?v=58c2f796:4239
renderWithHooks @ chunk-67DEV5DB.js?v=58c2f796:11548
updateForwardRef @ chunk-67DEV5DB.js?v=58c2f796:14325
beginWork @ chunk-67DEV5DB.js?v=58c2f796:15946
beginWork$1 @ chunk-67DEV5DB.js?v=58c2f796:19753
performUnitOfWork @ chunk-67DEV5DB.js?v=58c2f796:19198
workLoopSync @ chunk-67DEV5DB.js?v=58c2f796:19137
renderRootSync @ chunk-67DEV5DB.js?v=58c2f796:19116
performConcurrentWorkOnRoot @ chunk-67DEV5DB.js?v=58c2f796:18678
workLoop @ chunk-67DEV5DB.js?v=58c2f796:197
flushWork @ chunk-67DEV5DB.js?v=58c2f796:176
performWorkUntilDeadline @ chunk-67DEV5DB.js?v=58c2f796:384Understand this error
authStore.ts:78 [AuthStore] signUp:completed-with-session {userId: 'a7f54877-0328-41c2-a19d-fbfbffaff2a8', email: 'koutakado.beau@gmail.com'}
App.tsx:90 [App] Auth state: {hasUser: true, isLoading: false, isInitialized: true, authLoading: false}
App.tsx:90 [App] Auth state: {hasUser: true, isLoading: false, isInitialized: true, authLoading: false}
ProtectedRoute.tsx:31 [ProtectedRoute] granted {pathname: '/app/dashboard', userId: 'a7f54877-0328-41c2-a19d-fbfbffaff2a8', email: 'koutakado.beau@gmail.com'}
ProtectedRoute.tsx:31 [ProtectedRoute] granted {pathname: '/app/dashboard', userId: 'a7f54877-0328-41c2-a19d-fbfbffaff2a8', email: 'koutakado.beau@gmail.com'}

登録済みアカウントでログインした時のコンソールログ
[AuthStore] signIn:start {email: 'koutakado9@gmail.com'}
App.tsx:90 [App] Auth state: {hasUser: false, isLoading: true, isInitialized: true, authLoading: true}
App.tsx:102 [App] Showing loading screen because isLoading: true
App.tsx:90 [App] Auth state: {hasUser: false, isLoading: true, isInitialized: true, authLoading: true}
App.tsx:102 [App] Showing loading screen because isLoading: true
LoadingScreen.tsx:7 [LoadingScreen] Rendering loading screen
LoadingScreen.tsx:7 [LoadingScreen] Rendering loading screen
[Violation] Forced reflow while executing JavaScript took 31ms
authStore.ts:78 [AuthStore] onAuthStateChange {event: 'SIGNED_IN', hasSession: true, userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b'}
authStore.ts:78 [AuthStore] applySessionState:start {hasSession: true, userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b', email: 'koutakado9@gmail.com'}
authStore.ts:78 [AuthStore] applySessionState:completed {userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b', email: 'koutakado9@gmail.com', role: 'student'}
App.tsx:90 [App] Auth state: {hasUser: true, isLoading: false, isInitialized: true, authLoading: false}
App.tsx:90 [App] Auth state: {hasUser: true, isLoading: false, isInitialized: true, authLoading: false}
authStore.ts:78 [AuthStore] applySessionState:start {hasSession: true, userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b', email: 'koutakado9@gmail.com'}
ProtectedRoute.tsx:31 [ProtectedRoute] granted {pathname: '/app/dashboard', userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b', email: 'koutakado9@gmail.com'}
ProtectedRoute.tsx:31 [ProtectedRoute] granted {pathname: '/app/dashboard', userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b', email: 'koutakado9@gmail.com'}
authStore.ts:78 [AuthStore] applySessionState:completed {userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b', email: 'koutakado9@gmail.com', role: 'student'}
App.tsx:90 [App] Auth state: {hasUser: true, isLoading: false, isInitialized: true, authLoading: false}
App.tsx:90 [App] Auth state: {hasUser: true, isLoading: false, isInitialized: true, authLoading: false}
ProtectedRoute.tsx:31 [ProtectedRoute] granted {pathname: '/app/dashboard', userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b', email: 'koutakado9@gmail.com'}
ProtectedRoute.tsx:31 [ProtectedRoute] granted {pathname: '/app/dashboard', userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b', email: 'koutakado9@gmail.com'}
authStore.ts:78 [AuthStore] signIn:completed {email: 'koutakado9@gmail.com', userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b'}
App.tsx:90 [App] Auth state: {hasUser: true, isLoading: false, isInitialized: true, authLoading: false}
App.tsx:90 [App] Auth state: {hasUser: true, isLoading: false, isInitialized: true, authLoading: false}
ProtectedRoute.tsx:31 [ProtectedRoute] granted {pathname: '/app/dashboard', userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b', email: 'koutakado9@gmail.com'}
ProtectedRoute.tsx:31 [ProtectedRoute] granted {pathname: '/app/dashboard', userId: 'cbf2f7e4-4822-43d8-90d0-d382ab8c653b', email: 'koutakado9@gmail.com'}
