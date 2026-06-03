# ITS MVP Verification Checklist

このチェックリストは、ITS MVP がチャットと日誌生成で想定どおり動作しているかを確認するためのものです。  
対象は内部ITS制御、支援プロセスログ、観測型プロファイル、集約型プロファイルです。

## 0. 事前確認

- [ ] `apps/backend/schema/its_mvp_schema.sql` がDBに適用されている
- [ ] `its_chat_turn_logs` が存在する
- [ ] `its_observation_records` が存在する
- [ ] `its_observation_profiles` が存在する
- [ ] バックエンドログで `ITS context built` が確認できる設定になっている
- [ ] `ENABLE_ITS_LLM_JUDGEMENT` の値を把握している

DB確認SQL:

```sql
select table_name
from information_schema.tables
where table_name in (
  'its_chat_turn_logs',
  'its_observation_records',
  'its_observation_profiles'
);
```

## 1. チャットITSワークフロー

### 1.1 正常な内部フロー

テスト入力例:

```text
環境問題について調べたいけど、広すぎてよくわからない。
```

確認項目:

- [ ] チャット本文が通常どおり返る
- [ ] クエストカードが従来どおり必要に応じて返る
- [ ] 生徒UIに `support_type`, `speech_acts`, `disclosure_level`, `learner_model` などが表示されない
- [ ] `its_chat_turn_logs` に1件追加される
- [ ] `support_type` が入力意図に近い値になる
- [ ] `speech_acts` が空ではない
- [ ] `disclosure_level` が `0..5` の範囲にある
- [ ] `question_budget` が `0..1` の範囲にある
- [ ] `action_pressure` が `0..3` の範囲にある
- [ ] `learner_model`, `teaching_model`, `task_model`, `observation_model` が空でない
- [ ] `pre_state_snapshot` と `post_state_snapshot` が保存されている
- [ ] `educational_validation.question_budget_ok` が確認できる
- [ ] `its_chat_turn_logs` に raw message 本文が保存されていない

DB確認SQL:

```sql
select
  id,
  student_user_id,
  conversation_id,
  support_type,
  speech_acts,
  disclosure_level,
  question_budget,
  action_pressure,
  decision_source,
  llm_judgement_used,
  educational_validation,
  learner_model,
  teaching_model,
  task_model,
  observation_model,
  created_at
from its_chat_turn_logs
where student_user_id = '<STUDENT_UUID>'
order by created_at desc
limit 5;
```

ログ確認キーワード:

```text
ITS context built
ITS tutor decision
ITS chat turn log persisted
ITS educational validation
```

### 1.2 質問過多を避けるケース

テスト入力例:

```text
質問ばっかりでだるい。
```

確認項目:

- [ ] `support_type` が `感情・迷いの受け止め` に近い
- [ ] `question_budget = 0`
- [ ] `action_pressure = 0`
- [ ] `intervention_reason_codes` に `不満・困り感が高い` または `保留・違和感の尊重` が含まれる
- [ ] AI応答が質問を増やさず、受け止め・整理・例示を優先している

DB確認SQL:

```sql
select support_type, question_budget, action_pressure, intervention_reason_codes, educational_validation
from its_chat_turn_logs
where student_user_id = '<STUDENT_UUID>'
order by created_at desc
limit 1;
```

### 1.3 丸投げリスクを抑えるケース

テスト入力例:

```text
この発表原稿を全部考えて、そのまま書いて。
```

確認項目:

- [ ] `intervention_reason_codes` に `丸投げリスク` が含まれる
- [ ] `disclosure_level` が高すぎない
- [ ] AI応答が完成版をそのまま渡さず、例・型・選択肢で支える
- [ ] `educational_validation.disclosure_level_ok = true`

### 1.4 難ケースのみLLM判定を使う

テスト入力例:

```text
なんかテーマが微妙でもやもやする。
```

確認項目:

- [ ] `decision_source` が `hybrid` になる、またはLLM失敗時は `rule` にフォールバックする
- [ ] `llm_judgement_used` が期待どおりになる
- [ ] LLM失敗時もチャット応答が落ちない
- [ ] `rule_result.llm_error` がある場合、ログにwarningが残る

DB確認SQL:

```sql
select decision_source, llm_judgement_used, decision_confidence, rule_result
from its_chat_turn_logs
where student_user_id = '<STUDENT_UUID>'
order by created_at desc
limit 5;
```

## 2. 4モデル確認

確認項目:

- [ ] `learner_model.grade_band` がプロフィール情報から推定されている
- [ ] `learner_model.interests` にテーマや発話由来の関心が入る
- [ ] `learner_model.confusion_signs` に迷い・困り感が入る
- [ ] `teaching_model.default_question_budget` が質問過多ケースで下がる
- [ ] `teaching_model.preferred_support_types` が課題状態に応じて入る
- [ ] `task_model.phase` がテーマ探索、問いづくり、調査設計などに推定される
- [ ] `task_model.theme`, `inquiry_question`, `hypothesis` が既存プロフィール/プロジェクト文脈から入る
- [ ] `observation_model.aggregate_summary` が既存集約プロファイルから入る
- [ ] `observation_model.caveats` にAI見立てを事実扱いしない注意が入る

DB確認SQL:

```sql
select
  learner_model ->> 'grade_band' as grade_band,
  learner_model -> 'interests' as interests,
  learner_model -> 'confusion_signs' as confusion_signs,
  teaching_model ->> 'default_question_budget' as default_question_budget,
  teaching_model -> 'preferred_support_types' as preferred_support_types,
  task_model ->> 'phase' as phase,
  task_model ->> 'theme' as theme,
  observation_model ->> 'aggregate_summary' as aggregate_summary
from its_chat_turn_logs
where student_user_id = '<STUDENT_UUID>'
order by created_at desc
limit 5;
```

## 3. 日誌生成と観測プロファイル

テスト手順:

1. 対象生徒でチャットを数ターン行う
2. 既存の日誌生成フローを実行する
3. 日誌下書きが従来どおり表示されることを確認する
4. 観測型プロファイルと集約型プロファイルが更新されることを確認する

確認項目:

- [ ] 既存の日誌生成UI/公開APIレスポンスが変わっていない
- [ ] `its_observation_records` に1件追加される
- [ ] `source_type = diary_ai_draft`
- [ ] `ai_draft` が保存される
- [ ] `observation.ai_view_text` が保存される
- [ ] `referenced_context.conversation_count` が当日チャット数と整合する
- [ ] `referenced_context.has_previous_diary` が前回日誌の有無と整合する
- [ ] `its_observation_profiles` がinsertまたはupdateされる
- [ ] `aggregate_summary` が空でない
- [ ] `aggregate_observations` に直近観測が入る
- [ ] 先生向けダッシュボードにAI見立て・観測プロファイルが出ない

DB確認SQL:

```sql
select
  id,
  student_user_id,
  target_date,
  source_type,
  observation ->> 'ai_view_text' as ai_view_text,
  referenced_context,
  created_at
from its_observation_records
where student_user_id = '<STUDENT_UUID>'
order by created_at desc
limit 5;
```

```sql
select
  id,
  student_user_id,
  aggregate_summary,
  aggregate_observations,
  source_record_ids,
  updated_at
from its_observation_profiles
where student_user_id = '<STUDENT_UUID>';
```

ログ確認キーワード:

```text
ITS diary observation persisted
ITS aggregate profile refreshed
ITS diary observation hook completed
```

## 4. 先生向け表示の境界

確認項目:

- [ ] 先生ダッシュボードに raw chat log が表示されない
- [ ] 先生ダッシュボードに `ai_draft` が表示されない
- [ ] 先生ダッシュボードに `its_observation_records` の内容が表示されない
- [ ] 先生ダッシュボードに `its_observation_profiles` の内容が表示されない
- [ ] 先生が見られるのは既存の日誌共有情報、提出状況、共有summaryなどに限られる

APIレスポンス確認観点:

```text
GET /diary/teacher/dashboard
GET /diary/teacher/student/{student_id}
```

レスポンスに含まれてはいけないキー:

```text
ai_draft
diff_added
diff_removed
its_observation_records
its_observation_profiles
aggregate_summary
learner_model
teaching_model
task_model
observation_model
raw_chat_log
```

## 5. 品質ゲート

リリース前に最低限確認するゴールデンケース:

- [ ] 広すぎるテーマを、例・選択肢で支える
- [ ] 質問過多への不満を受け止め、質問を増やさない
- [ ] 丸投げ依頼に完成案を返しすぎない
- [ ] 調査設計では安全・プライバシー注意を入れる
- [ ] 迷い・保留を低評価として扱わない
- [ ] 観測プロファイルが現在発話を上書きしない
- [ ] 日誌生成後に観測型/集約型プロファイルが更新される
- [ ] 生徒UIと先生UIにITS内部メタデータが漏れない

失敗時の主な調整箇所:

- 方略選択がずれる: `apps/backend/services/tutor_orchestrator.py`
- 4モデルの推定がずれる: `apps/backend/services/its_models.py`
- 保存内容が不足する: `apps/backend/services/its_observation_service.py`
- 日誌観測が更新されない: `apps/backend/services/diary_service.py`
- チャット応答への反映が弱い: `apps/backend/services/chat_service.py`
