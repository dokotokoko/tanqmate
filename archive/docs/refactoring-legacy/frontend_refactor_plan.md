# Frontend Refactor Plan

## ステータス

- 更新日: 2026-04-08
- 進捗: Phase 1 完了、Phase 2 一部完了、Phase 3 一部完了
- 今回反映した実装:
  1. `src/lib/api.ts` に service 層向けの共通入口 `requestJson()` と `ApiRequestError` を追加
  2. `chatService.ts` と `messageService.ts` を共通 API クライアント経由へ移行
  3. `DashboardPage.tsx` の project CRUD を `src/services/dashboard/projectService.ts` へ切り出し
  4. `ProjectPage.tsx` の project/memo 通信を `src/services/project-page/projectPageService.ts` へ切り出し
  5. `authStore.ts` の import 副作用初期化を廃止し、`App.tsx` 起点の初期化へ集約
- 今回未対応:
  1. `DashboardSidebar` / `AIChat` の通信分離
  2. `MemoPage` / `OnboardingPage` など他画面の service 化
  3. `react-query` の実運用導入
  4. `ProtectedRoute` の追加整理
  5. `localStorage.getItem('auth-token')` 残存箇所の置換完了
- 検証状況:
  1. 対象画面の direct `fetch` 除去はコード上で確認済み
  2. `npm run build` は `vite` 未導入のため失敗
  3. frontend 実行環境の復旧は引き続き別タスク

## 目的

現在のフロントエンドは、画面構成自体は整理されている一方で、認証、API 通信、状態管理、UI コンポーネント責務が分散しています。  
この計画では、既存機能を壊さずに段階的に構成を整理し、保守性・変更容易性・検証可能性を改善します。

## 現状の主要課題

1. 認証トークン取得経路が複数存在する
2. API ベース URL の参照方法が統一されていない
3. `pages` と大型 UI コンポーネントに `fetch` が散在している
4. `DashboardSidebar` と `AIChat` に責務が集中している
5. 認証初期化が `App.tsx` と `authStore.ts` の両方にある
6. `react-query` が導入されているが、ほぼ活用されていない
7. `lint` / `build` / test の品質ゲートが不十分

## ゴール

- 認証と HTTP 通信の入口を 1 系統に統一する
- `pages` は画面制御に集中し、通信処理は service/query 層へ移す
- 大型コンポーネントを責務ごとに分割する
- リファクタ中でも既存機能を維持できる検証基盤を整える
- 以後の機能追加で同じ設計崩れを起こしにくくする

## 非ゴール

- UI デザインの全面刷新
- 状態管理ライブラリの全面置き換え
- ルーティング構成の全面再設計
- 一括リライト

## 実施方針

- 既存挙動を保ちながら、責務を外側から内側へ寄せる
- まず共通基盤を作り、その上で画面ごとの通信を移す
- 大型ファイル分割は、通信整理の後に行う
- 各段階で完了条件を明確にし、途中で止めても意味がある状態を作る
- Docker / lint / build / test 環境整備はこの計画の対象外とし、別タスクで扱う

## フェーズ構成

### Phase 1: API と認証の共通基盤を一本化する

#### 進捗

- 完了

#### 目的

通信処理のばらつきを止める。今後の移行先となる正規ルートを確立する。

#### 作業

1. `API_BASE_URL` の参照を `src/config/api.ts` に統一する
   実施状況: 今回の対象実装では `DashboardPage` / `ProjectPage` / `chatService` / `messageService` の直参照を整理済み
2. Bearer token の取得元を `authStore` / `tokenManager` に統一する
   実施状況: 今回の対象実装では `localStorage.getItem('auth-token')` を使わない経路へ移行済み
3. 共通 HTTP クライアントを 1 つに定義する
   実施状況: `src/lib/api.ts` を正規クライアントとして採用済み
4. 401 時の再試行、エラー正規化、JSON 処理をクライアントへ集約する
   実施状況: `requestJson()` と `ApiRequestError` を追加済み
5. `localStorage.getItem('auth-token')` の利用箇所を棚卸しして置換方針を決める
   実施状況: 棚卸し済み。残存箇所は `AIChat.tsx`, `StepPage.tsx`, `MultiMemoManager.tsx`, `ChatHistory_old.tsx` など

#### 推奨の着地点

- `src/lib/api.ts` を正規クライアントとして採用する
- `chatService.ts` や `messageService.ts` の独自通信実装は順次このクライアントへ寄せる

#### 対象

- `apps/frontend/src/config/api.ts`
- `apps/frontend/src/lib/api.ts`
- `apps/frontend/src/stores/authStore.ts`
- `apps/frontend/src/utils/tokenManager.ts`
- `apps/frontend/src/services/chatService.ts`
- `apps/frontend/src/services/messageService.ts`

#### 完了条件

- 新規コードで直接 `localStorage.getItem('auth-token')` を使わない
- 新規コードで `import.meta.env.VITE_API_URL || 'http://localhost:8000'` を使わない
- API 通信の共通入口が定義されている

#### 判定

- 達成
  1. 今回追加・更新したコードでは上記ルールを満たしている
  2. 既存の未移行コードは残っているため、リポジトリ全体では継続対応が必要

#### リスク

- 認証移行途中の画面で一時的に通信失敗が起きる可能性がある

---

### Phase 2: 機能単位の service/query 層へ移す

#### 進捗

- 一部完了

#### 目的

`pages` と UI コンポーネントから通信責務を切り離す。

#### 作業

1. `projects` API を共通 service に切り出す
   実施状況: `src/services/dashboard/projectService.ts` と `src/services/project-page/projectPageService.ts` を追加
2. `memos` API を共通 service に切り出す
   実施状況: `ProjectPage` が使う project 配下 memo 一覧取得 / 作成 / 削除は service 化済み
3. `chat` / `conversations` API を共通 service に切り出す
   実施状況: `chatService.ts` / `messageService.ts` を共通 API クライアント経由に移行済み
4. `auth/profile/onboarding` を auth service に寄せる
   実施状況: 未着手
5. 各 page/component の `fetch` を service 呼び出しへ置換する
   実施状況: `DashboardPage.tsx` と `ProjectPage.tsx` は完了。その他は未着手

#### 推奨ディレクトリ

```text
src/services/
  auth/
  projects/
  memos/
  chat/
src/queries/
  projects/
  memos/
  chat/
```

#### 対象候補

- `apps/frontend/src/pages/DashboardPage.tsx`
- `apps/frontend/src/pages/ProjectPage.tsx`
- `apps/frontend/src/pages/MemoPage.tsx`
- `apps/frontend/src/pages/OnboardingPage.tsx`
- `apps/frontend/src/components/Layout/DashboardSidebar.tsx`
- `apps/frontend/src/components/MemoChat/AIChat.tsx`
- `apps/frontend/src/components/MemoChat/ChatHistory.tsx`

#### 完了条件

- 主要ページから直接 `fetch` が大幅に減る
- 通信エラー処理が画面ごとに重複しない
- API 変更時の修正箇所が service 層中心になる

#### 判定

- 部分達成
  1. `DashboardPage.tsx` と `ProjectPage.tsx` から direct `fetch` を除去済み
  2. `MemoPage.tsx`, `OnboardingPage.tsx`, `DashboardSidebar.tsx`, `AIChat.tsx` などは次段階

#### リスク

- 既存 UI が通信レスポンス形状に強く依存しているため、置換時に型ずれが出やすい

---

### Phase 3: 認証初期化とアプリ起動責務を整理する

#### 進捗

- 一部完了

#### 目的

起動時の認証処理を明確にし、二重初期化を解消する。

#### 作業

1. `authStore.ts` の import 副作用初期化を廃止する
   実施状況: 完了
2. `App.tsx` または専用 provider で初期化責務を一本化する
   実施状況: `App.tsx` 起点へ集約済み
3. `ProtectedRoute` の責務を「認証済み判定」に限定する
   実施状況: 既存実装は大きくは外れていないが、追加整理は未実施
4. 初期ローディングと認証ローディングの表示基準を整理する
   実施状況: 現時点では `App.tsx` / `ProtectedRoute.tsx` の既存基準を維持

#### 対象

- `apps/frontend/src/App.tsx`
- `apps/frontend/src/stores/authStore.ts`
- `apps/frontend/src/components/ProtectedRoute.tsx`
- 必要なら `src/providers/` 新設

#### 完了条件

- 認証初期化呼び出しが 1 箇所に定義される
- StrictMode でも二重初期化依存がなくなる
- 起動時ローディングの条件が明確になる

#### 判定

- 部分達成
  1. 初期化呼び出しは `App.tsx` に一本化済み
  2. ローディング基準の再設計までは未完了

#### リスク

- 認証コールバックやセッション復元まわりでリグレッションが起こりやすい

---

### Phase 4: 大型コンポーネントを分割する

#### 目的

保守性の低いファイルを責務ごとに分解し、変更影響を局所化する。

#### 作業

1. `DashboardSidebar` を以下の単位で分割する
2. `AIChat` を以下の単位で分割する
3. view logic と async logic を hooks に逃がす
4. 型定義を `types.ts` に寄せる

#### 分割案: DashboardSidebar

- `ProjectList`
- `MemoList`
- `SidebarHeader`
- `ProjectActions`
- `MemoActions`
- `useDashboardSidebarData`
- `useDashboardSidebarActions`

#### 分割案: AIChat

- `useConversationBootstrap`
- `useChatSubmit`
- `useChatStreamingState`
- `ChatComposer`
- `ChatTimeline`
- `ConversationHeader`

#### 対象

- `apps/frontend/src/components/Layout/DashboardSidebar.tsx`
- `apps/frontend/src/components/MemoChat/AIChat.tsx`
- `apps/frontend/src/components/MemoChat/*`

#### 完了条件

- 単一ファイルに UI、通信、永続化、ナビゲーションが同居しない
- 個別部品が props と hook でつながる形になる
- 各ファイルの責務が説明可能になる

#### リスク

- 分割だけしてロジックが散ると逆に追いづらくなるため、命名と配置の統一が必要

---

### Phase 5: `react-query` 活用か撤去かを決める

#### 目的

中途半端な依存関係を整理し、データ取得戦略を固定する。

#### 選択肢 A: 活用する

1. `projects`, `memos`, `conversations` の read 系を query 化する
2. create/update/delete を mutation 化する
3. invalidate 方針を定義する

#### 選択肢 B: 撤去する

1. `QueryClientProvider` を削除する
2. 独自 hook + zustand で管理する

#### 推奨

- 今のコード量と API 数を考えると、read/write が多いため活用する方が整理しやすい

#### 完了条件

- `react-query` が実際に使われるか、依存関係から削除される
- データ取得方針をチームで説明できる

---

## 保留項目

以下は重要ですが、今回の実施対象からは外します。

1. Docker 前提の実行環境整理
2. `eslint` / `vite` 実行環境の復旧
3. test 基盤導入
4. CI 整備
5. 設計ルールの自動検知

## 実施順序

1. Phase 1 完了
2. Phase 2 継続
3. Phase 3 継続
4. Phase 4
5. Phase 5

## 最小実行単位

一気に進めず、以下の単位で区切るのが安全です。

1. 共通 API クライアント確定
   実施状況: 完了
2. `DashboardPage` を service 化
   実施状況: 完了
3. `ProjectPage` を service 化
   実施状況: 完了
4. `DashboardSidebar` の通信分離
5. `AIChat` の通信分離
6. 認証初期化一本化
   実施状況: 完了
7. query 層導入
8. 大型コンポーネント分割

## 成功指標

- 認証トークンの取得方式が 1 つだけになる
- API ベース URL の参照方法が 1 つだけになる
- 主要ページが直接 `fetch` しなくなる
- `DashboardSidebar` と `AIChat` の責務が説明可能になる
- 認証初期化が 1 箇所にまとまる

## 直近の着手推奨

初手としていた次の 3 点は完了しました。

1. 共通 API クライアントを正規ルートとして固定する
2. `DashboardPage` と `ProjectPage` の直接 `fetch` を外へ出す
3. `auth.initialize()` の責務を 1 箇所に寄せる

次に着手すべきなのは以下です。

1. `DashboardSidebar` の通信を service / hooks に分離する
2. `AIChat` の `fetch` / token 直参照を service / hooks に分離する
3. `MemoPage` と `OnboardingPage` の通信を service 化する
4. `localStorage.getItem('auth-token')` の残存箇所を置換する
5. `react-query` を read 系から導入するか、撤去するかを決める

この状態まで来ると、Phase 4 の大型コンポーネント分割に着手しやすくなります。
