# Quest Map 504 Timeout エラー修正

## 問題
Quest Map のノード生成時に504 Gateway Timeoutエラーが発生していました。

## 原因
AI処理（OpenAI API）の応答生成に時間がかかる場合があり、デフォルトのタイムアウト設定では処理が完了前にタイムアウトしていました。

## 実施した修正

### 1. バックエンド側の修正

#### OpenAI APIクライアントのタイムアウト延長
- **ファイル**: `backend/module/llm_api.py`
- **変更内容**: AsyncOpenAIのタイムアウトを30秒から60秒に延長

```python
self.async_client = AsyncOpenAI(
    api_key=self.api_key,
    timeout=60.0,  # タイムアウトを60秒に設定（クエストマップ生成対応）
    max_retries=2   # リトライを2回に制限
)
```

#### AI処理のタイムアウトハンドリング追加
- **ファイル**: `backend/services/quest_map_ai.py`
- **変更内容**: asyncio.wait_forを使用してタイムアウト処理を追加

```python
try:
    response_text = await asyncio.wait_for(
        self.llm_client.generate_text(input_items, max_tokens=2000),
        timeout=55.0  # 55秒のタイムアウト（HTTPタイムアウトより少し短く）
    )
except asyncio.TimeoutError:
    logger.error(f"⏰ AIノード生成タイムアウト: quest_id={quest_id}")
    return AIErrorRecovery.get_fallback_generation_response(quest_id, goal)
```

#### Uvicornサーバーのタイムアウト設定
- **ファイル**: `backend/main.py`
- **変更内容**: Keep-aliveタイムアウトを75秒に設定

```python
uvicorn.run(
    app,
    host="0.0.0.0",
    port=8000,
    reload=True,
    log_level="info",
    timeout_keep_alive=75  # Keep-aliveタイムアウトを75秒に設定
)
```

### 2. フロントエンド側の修正

#### Fetchのタイムアウト設定とエラーハンドリング
- **ファイル**: `react-app/src/api/questMap.ts`
- **変更内容**: 
  - AbortSignal.timeoutを使用して60秒のタイムアウトを設定
  - タイムアウトエラーの適切なハンドリング

```typescript
const config: RequestInit = {
  ...options,
  headers,
  credentials: 'include',
  signal: AbortSignal.timeout(60000), // 60秒のタイムアウト設定
};

const response = await fetch(url, config).catch((error) => {
  if (error.name === 'AbortError') {
    console.error('⏰ Request timeout after 60 seconds');
    throw new QuestMapAPIError(
      'リクエストがタイムアウトしました。AIの応答生成に時間がかかっています。もう一度お試しください。',
      'TIMEOUT_ERROR',
      408
    );
  }
  throw error;
});
```

### 3. Nginx設定の修正

#### プロキシタイムアウト設定の延長
- **ファイル**: `nginx/nginx.conf`
- **変更内容**: プロキシタイムアウトを90秒に設定

```nginx
# タイムアウト設定（AI処理に対応）
proxy_connect_timeout 90s;
proxy_send_timeout 90s;
proxy_read_timeout 90s;
```

## テスト方法

1. Dockerコンテナを再起動
```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml up --build
```

2. ブラウザで https://dev.tanqmates.local.test にアクセス

3. Quest Mapページでマップ作成を実行

4. 以下を確認:
   - 504エラーが発生しないこと
   - タイムアウトした場合は適切なエラーメッセージが表示されること
   - 正常に処理が完了した場合はクエストノードが生成されること

## 追加の推奨事項

1. **バッチ処理の実装**: 大量のノード生成時はバッチ処理を使用
2. **プログレス表示**: 長時間の処理にはプログレスバーを表示
3. **キャッシング**: 同じリクエストのキャッシュを活用
4. **非同期処理の最適化**: ストリーミングレスポンスの実装を検討

## 監視ポイント

- `/api/api/quest-map/nodes/generate` エンドポイントのレスポンス時間
- OpenAI APIの応答時間
- Nginxのエラーログ（504エラーの発生状況）