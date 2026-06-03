# 非機能要件

## Privacy

- 生徒の私的な内省、raw 対話ログ、AI 下書き、編集差分は、許可されていないユーザーへ表示しない
- 先生に共有する情報は、生徒確認済みの summary と支援判断に必要な最小限の情報を基本とする
- ログやテレメトリに個人情報、学校情報、私的記述を不用意に出さない
- API キー、secret、token、`.env` はコミットしない

## Security

- 認証必須 API は Supabase Auth と既存の user scope を前提にする
- 認証トークンの保存、更新、ローテーションは Supabase Auth に委譲し、独自ストレージへ access token / refresh token を複製保存しない
- 権限チェックを弱めない
- 公開 API を追加する場合は、公開してよい情報だけを返す
- CORS、認証除外パス、管理者 API の変更は慎重に扱う

## Accessibility

- キーボード操作を壊さない
- フォーカス状態を視認できるようにする
- 色だけで状態を伝えない
- 生徒の内省を妨げる過剰なモーションを避ける
- 主要フォーム、ボタン、アイコンには適切なラベルを付ける

## Performance

- 生徒が授業中に使う前提で、主要画面は軽く保つ
- LLM 呼び出しや検索処理では loading / error / retry を用意する
- 不要な大規模依存やページ単位の重い処理を避ける
- フロントエンド変更では `docker compose -f infra/docker-compose.dev.yml run --rm frontend npm run build` を基本確認とする

## Reliability

- 主要画面には empty / loading / error 状態を用意する
- 保存失敗時は再試行または手動復旧の導線を用意する
- API エラーはユーザーに扱いやすい形で返す
- 重要なデータ変更では既存データ移行とロールバック観点を確認する

## AI Behavior

- AI は最終回答者ではなく、伴走者として振る舞う
- 生徒の agency を奪う断定、評価、決定を避ける
- 出典が必要な情報では sources を扱う
- AI 出力は suggestion / draft / perspective として表現する
- プロンプトやモデル挙動を変更する場合は、要件とテスト観点を更新する

## Documentation

- Feature behavior changes update `docs/requirements/features/`
- UI rule changes update `DESIGN.md`
- API or data model changes update `docs/architecture/`
- Important decisions update `docs/adr/`
