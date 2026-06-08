# 先生用UX 学校間分離テスト結果

実施日: 2026-06-04  
作業ブランチ: `codex/teacher-ux-release-test`  
対象: 先生用UXリリース前テスト仕様・学校間データ分離

## 実施内容

- 先生用UX 学校間分離テストチェックリストを追加
- 本番Supabase向けの検証データseed/cleanupスクリプトを追加
- `/diary/teacher/student/{student_id}` の認可を修正
- 学校間分離のサービス単体テストを追加

## テスト結果

### 追加テスト

コマンド:

```powershell
python -m pytest apps\backend\tests\test_teacher_school_isolation.py
```

結果:

```text
4 passed
```

確認内容:

- A校先生の先生ダッシュボードにA校生徒だけが返る
- A校先生がB校生徒の日誌詳細へアクセスすると拒否される
- 先生向け日誌詳細レスポンスから `ai_draft`, `student_note`, `diff_added`, `diff_removed` が除外される
- 生徒ユーザーが先生用日誌詳細取得を使うと拒否される

### 関連既存テスト

コマンド:

```powershell
python -m pytest apps\backend\tests\test_its_mvp.py apps\backend\tests\test_teacher_school_isolation.py
```

結果:

```text
11 passed
```

### スクリプト構文チェック

コマンド:

```powershell
python -m py_compile apps\backend\scripts\seed_teacher_ux_release_test_data.py apps\backend\scripts\cleanup_teacher_ux_release_test_data.py apps\backend\scripts\teacher_ux_release_test_data.py
```

結果:

```text
passed
```

### Backend全体テスト

コマンド:

```powershell
python -m pytest apps\backend\tests
```

結果:

```text
23 passed, 6 failed
```

失敗は `apps/backend/tests/test_phase1.py` の既存会話エージェント系テストで発生。今回追加した学校間分離テストは成功している。

主な失敗内容:

- `StateExtractor` の期待値と現行実装の `goal` / `affect.interest` が不一致
- `PolicyEngine` のアクト選択期待値が現行実装と不一致
- `ConversationOrchestrator` が `StateExtractor.extract_from_history(minimal_mode=...)` を呼び、現行シグネチャと不一致

## Frontendビルド

コマンド:

```powershell
npm run build
```

結果:

```text
failed
```

失敗理由:

```text
Cannot read directory "../../..": Access is denied.
Could not resolve "C:\Users\kouta\tanqmates\apps\frontend\vite.config.ts"
```

サンドボックス制限の可能性が高いため権限昇格で再実行をリクエストしたが、ユーザーにより拒否された。したがって、frontend buildは未確認。

## 未実施

- 本番Supabaseへのseed実行
- 先生A/Bでの実ログイン確認
- `/teacher` 画面の手動UX確認
- cleanupスクリプトによる本番Supabase検証データ削除
- Docker Compose経由のbackend/frontend確認

## リリース判定

現時点では `No-Go`。

理由:

- 学校間分離の自動テストは通過したが、本番Supabase上の実データ作成・先生ログイン・画面確認が未実施
- frontend buildが未確認
- backend全体テストに既存失敗が残っている

## 次アクション

1. `test_phase1.py` の既存失敗を別タスクとして整理する
2. frontend buildを権限の通る環境またはDocker Composeで再実行する
3. 本番Supabaseにseedを実行し、チェックリストに沿って先生A/Bの画面確認を行う
4. 確認後、cleanupを実行して本番検証データを削除する
