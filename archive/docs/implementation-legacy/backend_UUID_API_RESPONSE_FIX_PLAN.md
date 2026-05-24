# UUID API Response Fix Plan

## 概要

Supabase Auth への移行後、`get_current_user()` は正準のユーザーIDとして `Supabase UUID` を返すようになった。一方で、バックエンドの一部 API は以下の旧前提を残している。

- レスポンスモデルが `user_id: str` を必須にしているが、実データは `user_id = NULL` / `supabase_user_id = UUID`
- ルーターやサービスが `current_user_id: int` を前提にしている
- DB クエリが `eq("user_id", user_id)` のみで、`supabase_user_id` を見ていない

この不整合により、新規ユーザーや移行途中ユーザーで 500 エラーや空レスポンス偽装が発生する余地がある。

## 調査結果

### 1. 即時修正が必要な箇所

#### `conversation_router.py`

対象:

- [apps/backend/routers/conversation_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\conversation_router.py:36)
- [apps/backend/routers/conversation_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\conversation_router.py:88)
- [apps/backend/routers/conversation_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\conversation_router.py:120)
- [apps/backend/routers/conversation_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\conversation_router.py:154)
- [apps/backend/routers/conversation_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\conversation_router.py:193)

問題:

- `ConversationResponse.user_id` は `str` 必須
- しかしレスポンス生成時に `conversation["user_id"]` をそのまま返している
- 新規ユーザーの会話は `user_id = NULL`, `supabase_user_id = UUID` になり得るため、今回と同じ `None -> str` の Pydantic バリデーションエラーが再発する

備考:

- [apps/backend/conversation_api.py](C:\Users\kouta\tanqmates\apps\backend\conversation_api.py:77) には既に `supabase_user_id` 優先の正規化ロジックが入っている
- `conversation_router.py` 側が未追従

### 2. 高優先で UUID 対応が必要な箇所

#### `quest_router.py` / `quest_service.py`

対象:

- [apps/backend/routers/quest_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\quest_router.py:40)
- [apps/backend/routers/quest_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\quest_router.py:72)
- [apps/backend/routers/quest_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\quest_router.py:139)
- [apps/backend/routers/quest_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\quest_router.py:175)
- [apps/backend/services/quest_service.py](C:\Users\kouta\tanqmates\apps\backend\services\quest_service.py:11)
- [apps/backend/services/quest_service.py](C:\Users\kouta\tanqmates\apps\backend\services\quest_service.py:123)
- [apps/backend/services/quest_service.py](C:\Users\kouta\tanqmates\apps\backend\services\quest_service.py:173)
- [apps/backend/services/quest_service.py](C:\Users\kouta\tanqmates\apps\backend\services\quest_service.py:266)

問題:

- `current_user_id: int = Depends(get_current_user)` のまま
- `UserQuestResponse.user_id` も `int`
- `user_quests`, `quest_submissions` を旧 `user_id` カラムだけで検索・保存している

影響:

- こちらはレスポンス不整合より前に、UUID を `int` として扱う層で壊れる
- 新規ユーザーが quest 系 API を叩くと、クエリ失敗または保存失敗になる可能性が高い

### 3. 同系統の未移行ルーター

対象:

- [apps/backend/routers/theme_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\theme_router.py:60)
- [apps/backend/routers/vibes_tanq_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\vibes_tanq_router.py:65)
- [apps/backend/routers/conversation_agent_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\conversation_agent_router.py:50)
- [apps/backend/routers/metrics_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\metrics_router.py:43)
- [apps/backend/routers/admin_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\admin_router.py:46)

問題:

- いずれも `current_user_id: int` 前提が残っている
- 新規ユーザーに対して `Supabase UUID` をそのまま渡す現在の認証仕様と整合していない

### 4. 現時点で比較的安全な箇所

#### `diary_router.py` / `diary_service.py`

対象:

- [apps/backend/routers/diary_router.py](C:\Users\kouta\tanqmates\apps\backend\routers\diary_router.py:57)
- [apps/backend/services/diary_service.py](C:\Users\kouta\tanqmates\apps\backend\services\diary_service.py)

評価:

- `student_id: str` 前提
- `supabase_student_id` 優先で返す正規化が既に入っている
- 今回の `conversation` 系と同じ `None -> str` の穴は見えていない

## 修正方針

### 方針 1: API が返す ID は「正準の UUID 文字列」に統一する

返却ルール:

- `supabase_user_id` があればそれを返す
- 無ければ移行期間中のみ legacy `user_id` を文字列化して返す
- 両方無ければ 500 ではなく、サービス境界で明示エラーにする

このルールをルーターごとに重複実装しない。

### 方針 2: 正規化はサービス層か共通ヘルパーに寄せる

推奨:

- `BaseService` または `utils/user_identity.py` に共通関数を置く
- 例:
  - `resolve_response_user_id(row) -> str`
  - `apply_dual_user_scope(query, user_id)`
  - `attach_user_identity(payload, user_id)`

こうすると、ルーター側は `conv["user_id"]` のような生値アクセスをやめられる。

### 方針 3: `current_user_id: int` の API を段階的に撤去する

優先順位:

1. `conversation_router.py`
2. `quest_router.py` / `quest_service.py`
3. `theme_router.py`
4. `vibes_tanq_router.py`
5. `conversation_agent_router.py`
6. `metrics_router.py` / `admin_router.py`

## 具体的な修正計画

### Phase 1: 再発防止の即時対応

対象:

- `conversation_router.py`

内容:

- `ConversationResponse` の `user_id` 生成に共通 resolver を使う
- `conversation["user_id"]` / `conv["user_id"]` の直参照を全廃する
- `ConversationService` 側でも返却前に `response_user_id` を補完するか、専用 serializer を追加する

完了条件:

- 新規ユーザーの `GET /conversations`
- `POST /conversations`
- `GET /conversations/{id}`
- `PUT /conversations/{id}`

で `user_id` が必ず UUID 文字列で返る

### Phase 2: quest 系の UUID 対応

対象:

- `quest_router.py`
- `quest_service.py`
- `user_quests`
- `quest_submissions`

内容:

- `current_user_id: int` を `str` に変更
- 必要なら `supabase_user_id UUID` カラムを追加
- 読み取りは `supabase_user_id` 優先、移行期間だけ legacy `user_id` を併用
- `UserQuestResponse.user_id` は `str` に変更

完了条件:

- 新規ユーザーで quest 一覧、開始、提出、提出取得が動く
- 旧ユーザーは mapping 経由で従来データも見える

### Phase 3: 未移行ルーターの棚卸しと一括修正

対象:

- `theme_router.py`
- `vibes_tanq_router.py`
- `conversation_agent_router.py`
- `metrics_router.py`
- `admin_router.py`

内容:

- `Depends(get_current_user)` を受ける全 API を棚卸し
- `int` 前提の型注釈、Pydantic モデル、DB クエリを UUID/二重管理へ統一
- レスポンスモデルに legacy 前提の `int user_id` が残っていないか確認

完了条件:

- `rg` で `current_user_id: int = Depends(get_current_user)` がゼロ
- `user_id: int` なレスポンスモデルが、移行専用 API を除いてゼロ

## 実装ルール

### レスポンス整形ルール

- API レスポンスで返す `user_id` / `student_id` / `teacher_id` は文字列に統一
- UUID が存在するエンティティは、必ず UUID を返す
- legacy `int8` を返すのは移行専用エンドポイントのみ

### クエリルール

- 新規書き込みは `supabase_user_id` を必須で埋める
- 既存ユーザーに限り、移行期間中だけ legacy `user_id` も併記する
- 読み取りは `supabase_user_id` 優先で、必要に応じて `user_id` を OR 条件で併用する

### バリデーションルール

- Pydantic の必須フィールドに、生値の nullable カラムをそのまま入れない
- レスポンス生成前に serializer / resolver を通す

## テスト計画

### 単体確認

1. 新規ユーザーで会話作成
2. 新規ユーザーで会話一覧取得
3. 新規ユーザーで会話更新
4. 新規ユーザーで日誌生成
5. 新規ユーザーで quest API 叩き始め

### 回帰確認

1. `user_id_mapping` がある既存ユーザーで旧会話が見える
2. 既存ユーザーの `projects`, `chat_logs`, `diary_entries` が壊れない
3. `None` を含む legacy 行で Pydantic バリデーションエラーが出ない

### 静的確認

実施コマンド例:

```powershell
rg -n "current_user_id: int = Depends\\(get_current_user\\)" apps/backend/routers -g "*.py"
rg -n "user_id: int|student_id: int|teacher_id: int" apps/backend/routers -g "*.py"
rg -n "\\[\"user_id\"\\]|\\[\"student_id\"\\]|\\[\"teacher_id\"\\]" apps/backend/routers -g "*.py"
```

## 推奨する次アクション

1. `conversation_router.py` を `conversation_api.py` と同じ resolver ベースへ揃える
2. `quest` 系の DB スキーマと API を UUID/二重管理へ移行する
3. `theme` / `vibes_tanq` / `conversation_agent` を順に棚卸しして、`int` 依存を除去する

## 補足

今回の `/conversations` 障害は、個別バグではなく「UUID 移行後もレスポンスやサービスが legacy `user_id` を正本扱いしている」ことの症状だった。  
今後は、レスポンス定義の修正だけでなく、`認証 -> サービス -> DB -> レスポンス` の全境界で UUID を正準IDとして扱う前提に揃える必要がある。
