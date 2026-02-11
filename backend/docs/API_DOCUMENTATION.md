# 📚 探Qメイト API ドキュメント

## 概要

探Qメイト バックエンドAPIの完全なリファレンスドキュメントです。
すべてのエンドポイントは `https://api.tanqmates.com` または開発環境では `http://localhost:8000` でアクセスできます。

## 🔐 認証

### 認証方式
現在はJWTトークンベースの認証を使用しています。

```http
Authorization: Bearer <token>
```

## 📡 API エンドポイント

### 🔑 認証 (Auth)

#### ログイン
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "ユーザー名"
  }
}
```

#### トークンリフレッシュ
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJ..."
}
```

### 💬 チャット (Chat)

#### AIとのチャット
```http
POST /chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "質問内容",
  "page_id": "conversation-agent-test",
  "memo_content": "メモの内容",
  "project_id": 123,
  "conversation_id": "conv_123"
}
```

**Response:**
```json
{
  "response": "AIからの応答",
  "timestamp": "2025-01-25T10:00:00Z",
  "token_usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  },
  "support_type": "理解深化",
  "selected_acts": ["Probe", "Acknowledge"],
  "context_metadata": {
    "project_context_used": true,
    "memo_context_used": true
  }
}
```

### 📝 メモ (Memo)

#### メモの作成
```http
POST /memos
Authorization: Bearer <token>
Content-Type: application/json

{
  "page_id": "step-1",
  "content": "メモの内容",
  "project_id": 123,
  "tags": ["探究", "AI"]
}
```

#### メモの取得
```http
GET /memos/{page_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 456,
  "page_id": "step-1",
  "content": "メモの内容",
  "project_id": 123,
  "tags": ["探究", "AI"],
  "created_at": "2025-01-25T10:00:00Z",
  "updated_at": "2025-01-25T10:00:00Z"
}
```

#### メモ一覧の取得
```http
GET /memos
Authorization: Bearer <token>

Query Parameters:
- project_id (optional): プロジェクトID
- limit (optional): 取得件数 (default: 20)
- offset (optional): オフセット (default: 0)
```

#### メモの更新
```http
PUT /memos/{page_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "更新後の内容",
  "tags": ["更新", "タグ"]
}
```

#### メモの削除
```http
DELETE /memos/{page_id}
Authorization: Bearer <token>
```

### 📂 プロジェクト (Project)

#### プロジェクトの作成
```http
POST /projects
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "AI探究プロジェクト",
  "description": "AIの学習効果について研究",
  "theme": "AI教育",
  "research_question": "AIは学習をどう改善できるか？"
}
```

#### プロジェクト一覧の取得
```http
GET /projects
Authorization: Bearer <token>

Query Parameters:
- status (optional): active | completed | archived
- sort (optional): created_at | updated_at | name
```

**Response:**
```json
{
  "projects": [
    {
      "id": 123,
      "name": "AI探究プロジェクト",
      "description": "説明",
      "theme": "AI教育",
      "status": "active",
      "progress": 45,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 10,
  "offset": 0,
  "limit": 20
}
```

#### プロジェクトの詳細取得
```http
GET /projects/{project_id}
Authorization: Bearer <token>
```

#### プロジェクトの更新
```http
PUT /projects/{project_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "更新後の名前",
  "status": "completed",
  "progress": 100
}
```

### 🎯 クエスト (Quest)

#### クエスト一覧の取得
```http
GET /quests
Authorization: Bearer <token>

Query Parameters:
- category (optional): research | writing | presentation
- status (optional): available | in_progress | completed
- difficulty (optional): easy | medium | hard
```

#### クエストの開始
```http
POST /quests/{quest_id}/start
Authorization: Bearer <token>
```

#### クエストの完了
```http
POST /quests/{quest_id}/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "submission": {
    "answer": "提出内容",
    "reflection": "振り返り"
  }
}
```

**Response:**
```json
{
  "success": true,
  "points_earned": 50,
  "achievement_unlocked": {
    "name": "初めての探究",
    "description": "最初のクエストを完了"
  }
}
```

### 🗣️ 対話エージェント (Conversation Agent)

#### エージェントとのチャット
```http
POST /conversation-agent/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "プロジェクトの進め方について",
  "page_id": "conversation-agent-test",
  "project_id": 123,
  "include_history": true,
  "history_limit": 20,
  "debug_mode": false
}
```

**Response:**
```json
{
  "response": "エージェントからの応答",
  "support_type": "道筋提示",
  "selected_acts": ["Guide", "Focus"],
  "state_snapshot": {
    "goal": "実験計画の作成",
    "purpose": "仮説の検証",
    "blockers": ["実験方法が不明"],
    "uncertainties": ["データ収集方法"]
  },
  "project_plan": {
    "north_star": "実験完了と分析",
    "next_actions": [
      {
        "action": "実験手順の文書化",
        "urgency": 4,
        "importance": 5
      }
    ]
  }
}
```

#### エージェントステータス
```http
GET /conversation-agent/status
Authorization: Bearer <token>
```

### 📊 メトリクス (Metrics)

#### ユーザーメトリクスの取得
```http
GET /metrics/user
Authorization: Bearer <token>

Query Parameters:
- period (optional): daily | weekly | monthly
- from_date (optional): YYYY-MM-DD
- to_date (optional): YYYY-MM-DD
```

**Response:**
```json
{
  "total_sessions": 45,
  "total_messages": 320,
  "total_projects": 5,
  "total_quests_completed": 12,
  "total_points": 850,
  "learning_time_minutes": 1250,
  "streak_days": 7,
  "most_active_time": "14:00-16:00",
  "favorite_topics": ["AI", "データサイエンス"]
}
```

### 🎨 テーマ (Theme)

#### テーマ設定の取得
```http
GET /theme
Authorization: Bearer <token>
```

#### テーマ設定の更新
```http
PUT /theme
Authorization: Bearer <token>
Content-Type: application/json

{
  "theme": "dark",
  "primary_color": "#1976d2",
  "font_size": "medium"
}
```

### 🎓 Vibes 探Q (特別機能)

#### ユーザーコンテキスト登録
```http
POST /vibes-tanq/register
Authorization: Bearer <token>
Content-Type: application/json

{
  "exploration_theme": "AIと社会",
  "interest_tags": ["AI", "倫理", "未来"],
  "fun_activities": ["プログラミング", "議論"]
}
```

#### パーソナライズドクエスト取得
```http
GET /vibes-tanq/quests/recommendations
Authorization: Bearer <token>
```

#### タイムライン取得
```http
GET /vibes-tanq/timeline
Authorization: Bearer <token>

Query Parameters:
- category (optional): news | trends | research
- limit (optional): 10
```

## 🔥 エラーハンドリング

### エラーレスポンス形式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": {
      "field": "詳細情報"
    }
  }
}
```

### 一般的なエラーコード

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `UNAUTHORIZED` | 401 | 認証が必要 |
| `FORBIDDEN` | 403 | アクセス権限なし |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `VALIDATION_ERROR` | 400 | バリデーションエラー |
| `RATE_LIMIT_EXCEEDED` | 429 | レート制限超過 |
| `INTERNAL_ERROR` | 500 | サーバー内部エラー |

## 📈 レート制限

| エンドポイント | 制限 |
|--------------|------|
| `/chat` | 60回/分 |
| `/auth/*` | 10回/分 |
| その他 | 100回/分 |

レート制限情報はレスポンスヘッダーに含まれます：
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1640995200
```

## 🧪 開発用エンドポイント

### ヘルスチェック
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2025-01-25T10:00:00Z"
}
```

### API ドキュメント (Swagger)
```
GET /docs
```

### API ドキュメント (ReDoc)
```
GET /redoc
```

## 📦 WebSocket エンドポイント

### リアルタイムチャット
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/chat');

// 接続時
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'authenticate',
    token: 'Bearer <token>'
  }));
};

// メッセージ送信
ws.send(JSON.stringify({
  type: 'message',
  content: 'こんにちは'
}));

// メッセージ受信
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data);
};
```

## 🔄 バージョニング

APIバージョンはURLパスに含めることができます：
- 現行版: `/api/v1/*`
- 次期版: `/api/v2/*` (開発中)

## 📝 SDKとツール

### Python SDK
```python
from tanqmates import Client

client = Client(api_key="your_api_key")
response = client.chat.send_message("質問内容")
```

### JavaScript/TypeScript SDK
```typescript
import { TanqmatesClient } from '@tanqmates/sdk';

const client = new TanqmatesClient({ apiKey: 'your_api_key' });
const response = await client.chat.sendMessage('質問内容');
```

### Postman Collection
[Postman Collection をダウンロード](https://api.tanqmates.com/postman-collection.json)

## 🚀 今後の追加予定

- GraphQL エンドポイント
- Webhook 通知
- バッチ処理API
- ファイルアップロード対応
- リアルタイム共同編集

## 📞 サポート

API に関する質問や問題報告：
- GitHub Issues: [Issues](https://github.com/your-username/tanqmates/issues)
- Email: api-support@tanqmates.com

---

最終更新: 2025年1月25日