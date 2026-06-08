# 先生用UX 学校間分離テストチェックリスト

このチェックリストは、本番Supabase上のリリース検証用データを使い、先生画面で他校生徒の情報が混ざらないことを確認するためのものです。

## 前提

- 対象環境: 本番Supabase
- 作業ブランチ: `codex/teacher-ux-release-test`
- テストデータ作成: `apps/backend/scripts/seed_teacher_ux_release_test_data.py`
- テストデータ削除: `apps/backend/scripts/cleanup_teacher_ux_release_test_data.py`
- P0に失敗または未確認がある場合はリリース不可

## テストアカウント一覧

| 種別 | 学校 | 名前 | メール / ログイン | school_code |
|---|---|---|---|---|
| 先生 | A | 検証先生 A | `koutakado2+tanq-teacher-a@gmail.com` | `TQREL-A-202606` |
| 先生 | B | 検証先生 B | `koutakado2+tanq-teacher-b@gmail.com` | `TQREL-B-202606` |
| 生徒 | A | 検証生徒 A1 | `koutakado2+tanq-student-a1@gmail.com` | `TQREL-A-202606` |
| 生徒 | A | 検証生徒 A2 | `koutakado2+tanq-student-a2@gmail.com` | `TQREL-A-202606` |
| 生徒 | B | 検証生徒 B1 | `koutakado2+tanq-student-b1@gmail.com` | `TQREL-B-202606` |
| 生徒 | B | 検証生徒 B2 | `koutakado2+tanq-student-b2@gmail.com` | `TQREL-B-202606` |

## 実施記録

- 実施日:
- 実施者:
- 確認環境URL:
- seed実行時刻:
- cleanup実行時刻:
- 証跡URL / スクリーンショット:
- 追加で見つかった不具合:

## 学校間分離シナリオ

- [ ] `P0` A校先生でログインすると、A校生徒2名だけが先生ダッシュボードに表示される
- [ ] `P0` A校先生画面にB校生徒名、B校メール、B校summary、B校感情情報が表示されない
- [ ] `P0` B校先生でログインすると、B校生徒2名だけが先生ダッシュボードに表示される
- [ ] `P0` B校先生画面にA校生徒名、A校メール、A校summary、A校感情情報が表示されない
- [ ] `P0` A校先生ログイン中にB校生徒IDの先生用詳細APIを呼ぶと拒否される
- [ ] `P0` B校先生ログイン中にA校生徒IDの先生用詳細APIを呼ぶと拒否される
- [ ] `P1` A校先生ログイン中にA校生徒IDの先生用詳細APIを呼ぶと、共有済み日誌だけが返る
- [ ] `P1` B校先生ログイン中にB校生徒IDの先生用詳細APIを呼ぶと、共有済み日誌だけが返る

## 先生UX確認

- [ ] `P0` 先生ログイン後に `/teacher` へ到達できる
- [ ] `P0` 未提出生徒と提出済み生徒の表示が区別できる
- [ ] `P0` 先生向け画面で raw対話ログ、AI下書き、私的記述、編集差分が表示されない
- [ ] `P1` 要フォロー表示が、該当校の生徒だけに紐づいている
- [ ] `P1` ログアウト後、別学校の先生でログインしても前学校の表示が残らない

## API確認

- [ ] `P0` `/diary/teacher/dashboard?include_inactive=true&limit=200` が同校生徒だけを返す
- [ ] `P0` `/diary/teacher/student/{student_id}` は他校生徒IDに対して `403` または `404` を返す
- [ ] `P0` 先生用日誌詳細レスポンスに `ai_draft`, `student_note`, `diff_added`, `diff_removed` が含まれない
- [ ] `P1` 存在しない生徒IDへのアクセスで、他校/存在有無を推測できる詳細情報を返さない

## 削除手順

1. `apps/backend/scripts/cleanup_teacher_ux_release_test_data.py` を `--confirm` なしで実行し、削除対象件数を確認する
2. 対象が検証校A/Bとplus aliasアカウントだけであることを確認する
3. `--confirm` を付けて削除する
4. 管理画面またはSQLで、検証校・検証ユーザー・検証日誌が残っていないことを確認する

## Go / No-Go判定

- `Go`: すべてのP0が成功し、テストデータ削除が完了している
- `No-Go`: P0に失敗または未確認がある
- `保留`: P1以下のみ未確認で、リリース判定者が既知リスクとして承認した場合
