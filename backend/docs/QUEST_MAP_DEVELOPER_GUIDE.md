# 探Qマップ機能 開発者ガイド

## 目次
1. [概要](#概要)
2. [アーキテクチャ](#アーキテクチャ)
3. [開発環境セットアップ](#開発環境セットアップ)
4. [API仕様](#api仕様)
5. [フロントエンド実装](#フロントエンド実装)
6. [テスト](#テスト)
7. [デプロイメント](#デプロイメント)
8. [パフォーマンス](#パフォーマンス)
9. [セキュリティ](#セキュリティ)
10. [トラブルシューティング](#トラブルシューティング)

## 概要

探Qマップは、目標達成のためのインタラクティブな課題分解・進捗管理システムです。ユーザーが設定した目標を視覚的なマップ上で管理し、AIによる支援機能を提供します。

### 主な機能
- 🎯 **クエスト管理**: 目標設定と進捗追跡
- 🗂️ **ノード操作**: タスクの作成・編集・完了管理
- 🤖 **AI支援**: 自動ノード生成・分解・拡散
- 📊 **視覚化**: D3.jsによるインタラクティブなマップ
- ⚡ **リアルタイム更新**: WebSocketによる同時編集
- 🔗 **統合機能**: クエストカードとの連携

## アーキテクチャ

### 全体アーキテクチャ
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   FastAPI       │    │   Database      │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (PostgreSQL)  │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • QuestMap UI   │    │ • REST API      │    │ • Quest Maps    │
│ • D3.js Canvas  │    │ • AI Integration│    │ • Nodes/Edges   │
│ • Zustand Store │    │ • WebSocket     │    │ • User Data     │
│ • Error Handler │    │ • Cache Layer   │    │ • History       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   AI Services   │
                    │   (OpenAI)      │
                    └─────────────────┘
```

### バックエンドアーキテクチャ
```
backend/
├── routers/
│   └── quest_map.py          # APIルーティング
├── services/
│   ├── quest_map_service.py  # ビジネスロジック
│   ├── quest_map_ai.py       # AI統合
│   └── quest_map_realtime.py # リアルタイム機能
├── models/
│   └── quest_map.py          # データモデル
├── schemas/
│   └── quest_map.py          # Pydanticスキーマ
└── tests/
    └── test_quest_map.py     # テストコード
```

### フロントエンドアーキテクチャ
```
src/components/QuestMap/
├── QuestMapEnhanced.tsx      # メインコンポーネント
├── QuestMapCanvas.tsx        # D3.js描画
├── QuestMapNode.tsx          # ノード表示
├── QuestMapOptimized.tsx     # パフォーマンス最適化版
├── QuestMapLazy.tsx          # Lazy loading
├── __tests__/               # テストファイル
└── animations/              # アニメーション
```

### データベース設計
```sql
-- クエストメイン
quest_map_quests (
  id: BIGSERIAL PRIMARY KEY,
  user_id: BIGINT NOT NULL,
  goal: TEXT NOT NULL,
  current_status: VARCHAR(50),
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)

-- ノード
quest_map_nodes (
  id: BIGSERIAL PRIMARY KEY,
  quest_id: BIGINT NOT NULL,
  type: VARCHAR(50) NOT NULL,
  title: VARCHAR(500) NOT NULL,
  description: TEXT,
  status: VARCHAR(50),
  position_x: INTEGER,
  position_y: INTEGER,
  parent_id: BIGINT,
  metadata: JSONB,
  created_at: TIMESTAMP,
  updated_at: TIMESTAMP
)

-- エッジ（関連性）
quest_map_edges (
  id: BIGSERIAL PRIMARY KEY,
  quest_id: BIGINT NOT NULL,
  source_id: BIGINT NOT NULL,
  target_id: BIGINT NOT NULL,
  type: VARCHAR(50) NOT NULL,
  weight: INTEGER,
  metadata: JSONB,
  created_at: TIMESTAMP
)

-- 操作履歴
quest_map_history (
  id: BIGSERIAL PRIMARY KEY,
  quest_id: BIGINT NOT NULL,
  node_id: BIGINT,
  action_type: VARCHAR(100) NOT NULL,
  feedback: TEXT,
  metadata: JSONB,
  completed_at: TIMESTAMP,
  created_at: TIMESTAMP
)
```

## 開発環境セットアップ

### 前提条件
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Redis 7+ (キャッシュ用)

### バックエンドセットアップ
```bash
# Python仮想環境作成
python -m venv venv
source venv/bin/activate  # Windowsの場合: venv\Scripts\activate

# 依存関係インストール
pip install -r requirements.txt

# 環境変数設定
cp .env.example .env
# .envファイルを編集してデータベース接続情報等を設定

# データベースマイグレーション
python -c "
from models.quest_map import QuestMapModel
sql_statements = QuestMapModel.create_all_tables_sql()
print('\n'.join(sql_statements))
" | psql -d your_database

# サーバー起動
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### フロントエンドセットアップ
```bash
# 依存関係インストール
cd react-app
npm install

# 開発サーバー起動
npm run dev

# テスト実行
npm run test

# E2Eテスト実行
npm run test:e2e
```

### Docker セットアップ
```bash
# Docker Compose で全体起動
docker-compose up -d

# 特定サービスのみ起動
docker-compose up -d backend
docker-compose up -d frontend
```

## API仕様

### 認証
すべてのAPIエンドポイントはBearer Token認証が必要です。

```javascript
const response = await fetch('/api/quest-map/quests', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

### 主要エンドポイント

#### 1. クエスト作成
```http
POST /api/quest-map/quests
Content-Type: application/json

{
  "goal": "プログラミングスキルを身につける",
  "initial_context": "現在Python基礎を学習中"
}
```

#### 2. クエストグラフ取得
```http
GET /api/quest-map/quests/1/graph

Response:
{
  "quest": {...},
  "nodes": [...],
  "edges": [...],
  "statistics": {...}
}
```

#### 3. AI ノード生成
```http
POST /api/quest-map/nodes/generate
Content-Type: application/json

{
  "quest_id": 1,
  "context": "Python学習の具体的ステップ",
  "node_count": 5
}
```

詳細なAPI仕様は [OpenAPI仕様書](./backend/docs/quest_map_api.yaml) を参照してください。

## フロントエンド実装

### 状態管理 (Zustand)
```typescript
// stores/questMapStore.ts
interface QuestMapState {
  currentQuest: Quest | null
  nodes: QuestNode[]
  edges: QuestEdge[]
  selectedNode: QuestNode | null
  isLoading: boolean
  error: string | null
  
  // Actions
  createQuest: (data: QuestCreateRequest) => Promise<void>
  loadQuestGraph: (questId: number) => Promise<void>
  selectNode: (node: QuestNode) => void
  updateNode: (node: QuestNode) => void
  // ...
}

const useQuestMapStore = create<QuestMapState>((set, get) => ({
  // 実装...
}))
```

### コンポーネント使用例
```tsx
// QuestMapページでの使用
import { QuestMapLazy } from '@/components/QuestMap'

const QuestMapPage = () => {
  const questId = useParams().questId

  return (
    <QuestMapLazy
      questId={Number(questId)}
      activeTab="map"
      enablePreload={true}
    />
  )
}
```

### D3.js統合
```typescript
// D3.jsを使った描画例
const drawNodes = (svg: d3.Selection, nodes: QuestNode[]) => {
  const nodeGroup = svg.selectAll('.node')
    .data(nodes, d => d.id)

  nodeGroup.enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', d => `translate(${d.position.x},${d.position.y})`)
    .call(drag()) // ドラッグ機能追加
    .on('click', handleNodeClick)
    .on('dblclick', handleNodeComplete)

  // ノードの描画更新
  nodeGroup
    .select('circle')
    .attr('r', d => getNodeRadius(d.type))
    .attr('fill', d => getNodeColor(d.status))
}
```

### パフォーマンス最適化
```tsx
// React.memoを使った最適化
const OptimizedQuestMapNode = memo<NodeProps>(({
  node,
  isSelected,
  onSelect,
  onUpdate,
  scale
}) => {
  return (
    <QuestMapNode
      node={node}
      isSelected={isSelected}
      onSelect={onSelect}
      onUpdate={onUpdate}
      scale={scale}
    />
  )
}, (prevProps, nextProps) => {
  // カスタム比較関数
  return (
    prevProps.node.id === nextProps.node.id &&
    prevProps.node.status === nextProps.node.status &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.scale === nextProps.scale
  )
})
```

## テスト

### バックエンドテスト
```bash
# 単体テスト実行
cd backend
pytest tests/test_quest_map.py -v

# カバレッジ計測
pytest tests/ --cov=. --cov-report=html

# 特定のテストのみ実行
pytest tests/test_quest_map.py::TestQuestMapAPI::test_create_quest -v
```

### フロントエンドテスト
```bash
# 単体・統合テスト
npm run test

# カバレッジ計測
npm run test:coverage

# UI テスト
npm run test:ui

# E2Eテスト
npm run test:e2e

# 特定のテストのみ実行
npm run test -- QuestMapCanvas.test.tsx
```

### テストデータセットアップ
```python
# conftest.py でテストデータ準備
@pytest.fixture
def sample_quest_data():
    return {
        "goal": "プログラミングスキルを身につける",
        "initial_context": "Python基礎学習中"
    }

@pytest.fixture
def sample_nodes():
    return [
        {
            "type": "goal",
            "title": "プログラミングマスター",
            "position": {"x": 0, "y": 0}
        },
        # ...
    ]
```

## デプロイメント

### 環境設定
```bash
# 本番環境変数例
export DATABASE_URL="postgresql://user:pass@db:5432/tanqmates"
export REDIS_URL="redis://redis:6379/0"
export OPENAI_API_KEY="sk-..."
export ENVIRONMENT="production"
export SECRET_KEY="your-secret-key"
```

### Docker デプロイ
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    ports:
      - "8000:8000"
    depends_on:
      - db
      - redis

  frontend:
    build:
      context: ./react-app
      dockerfile: Dockerfile
    ports:
      - "80:80"
    depends_on:
      - backend

  db:
    image: postgres:14
    environment:
      POSTGRES_DB: tanqmates
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### CI/CD パイプライン
```yaml
# .github/workflows/deploy.yml
name: Deploy Quest Map
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # バックエンドテスト
      - name: Backend Tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest tests/ -v
      
      # フロントエンドテスト
      - name: Frontend Tests
        run: |
          cd react-app
          npm ci
          npm run test:coverage
          npm run test:e2e
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: |
          docker-compose -f docker-compose.prod.yml up -d --build
```

## パフォーマンス

### 最適化ポイント

#### 1. フロントエンド最適化
- **React.memo**: 不要な再レンダリング防止
- **useMemo/useCallback**: 計算結果・関数のメモ化
- **仮想スクロール**: 大量ノードの効率的表示
- **コード分割**: Lazy loading による初期ロード時間短縮

#### 2. API最適化
- **キャッシュ戦略**: Redis + ブラウザキャッシュ
- **データベース最適化**: インデックス・クエリチューニング
- **圧縮**: gzip レスポンス圧縮

#### 3. D3.js最適化
```typescript
// 効率的なD3.js更新
const updateNodes = (nodes: QuestNode[]) => {
  // enter/update/exitパターンの使用
  const nodeUpdate = svg.selectAll('.node')
    .data(nodes, d => d.id)

  // 新規要素
  const nodeEnter = nodeUpdate.enter()
    .append('g')
    .attr('class', 'node')

  // 既存要素の更新
  nodeUpdate.merge(nodeEnter)
    .transition()
    .duration(300)
    .attr('transform', d => `translate(${d.position.x},${d.position.y})`)

  // 削除要素
  nodeUpdate.exit()
    .transition()
    .duration(300)
    .style('opacity', 0)
    .remove()
}
```

### パフォーマンス計測
```typescript
// パフォーマンス監視
const measurePerformance = (operation: string, fn: () => void) => {
  const start = performance.now()
  fn()
  const end = performance.now()
  console.log(`${operation}: ${end - start}ms`)
}

// 使用例
measurePerformance('Node Rendering', () => {
  renderNodes(visibleNodes)
})
```

## セキュリティ

### 1. 認証・認可
```python
# JWT認証の実装例
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=['HS256'])
        user_id = payload.get('user_id')
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        return user_id
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired"
        )
```

### 2. 入力検証
```python
# Pydanticによるバリデーション
from pydantic import BaseModel, validator

class QuestCreateRequest(BaseModel):
    goal: str
    initial_context: Optional[str] = None
    
    @validator('goal')
    def validate_goal(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError('Goal is required')
        if len(v) > 1000:
            raise ValueError('Goal too long')
        return v.strip()
```

### 3. SQLインジェクション対策
```python
# パラメータ化クエリの使用
async def get_quest(quest_id: int, user_id: int):
    query = """
        SELECT * FROM quest_map_quests 
        WHERE id = %s AND user_id = %s
    """
    result = await database.fetch_one(query, [quest_id, user_id])
    return result
```

### 4. レート制限
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/api/quest-map/nodes/generate")
@limiter.limit("10/minute")  # AI機能は制限を厳しく
async def generate_nodes(request: Request, ...):
    # 実装
```

### 5. CORS設定
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tanqmates.com"],  # 本番環境では具体的なドメインを指定
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. D3.js描画が表示されない
**症状**: QuestMapコンポーネントが空白で表示される
**原因**: SVG要素のサイズが正しく設定されていない

```typescript
// 解決方法
useEffect(() => {
  if (containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect()
    setSvgDimensions({ width: rect.width, height: rect.height })
  }
}, [])
```

#### 2. APIエラー: 401 Unauthorized
**症状**: すべてのAPI呼び出しが認証エラーになる
**原因**: トークンの期限切れまたは不正なトークン

```typescript
// 解決方法: トークンリフレッシュ
const handleApiCall = async () => {
  try {
    return await apiCall()
  } catch (error) {
    if (error.status === 401) {
      await refreshToken()
      return await apiCall() // 再試行
    }
    throw error
  }
}
```

#### 3. パフォーマンス問題: 大量ノードで重い
**症状**: 100個以上のノードで描画が遅い
**解決方法**: 仮想化とフィルタリングの実装

```typescript
// 表示領域のノードのみ描画
const visibleNodes = useMemo(() => {
  return nodes.filter(node => {
    const { x, y } = node.position
    return (
      x >= viewport.x - margin &&
      x <= viewport.x + viewport.width + margin &&
      y >= viewport.y - margin &&
      y <= viewport.y + viewport.height + margin
    )
  })
}, [nodes, viewport])
```

#### 4. WebSocket接続エラー
**症状**: リアルタイム更新が動作しない
**原因**: WebSocket接続の設定やプロキシの問題

```typescript
// 解決方法: 接続の再試行ロジック
const connectWebSocket = () => {
  const ws = new WebSocket(wsUrl)
  
  ws.onopen = () => {
    console.log('WebSocket connected')
    setConnectionStatus('connected')
    retryCount = 0
  }
  
  ws.onclose = () => {
    console.log('WebSocket disconnected')
    setConnectionStatus('disconnected')
    
    // 自動再接続（指数バックオフ）
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        connectWebSocket()
        retryCount++
      }, Math.pow(2, retryCount) * 1000)
    }
  }
  
  return ws
}
```

#### 5. メモリリーク
**症状**: 長時間使用でブラウザの動作が重くなる
**原因**: イベントリスナーやタイマーの適切な清理不足

```typescript
// 解決方法: useEffectのクリーンアップ
useEffect(() => {
  const timer = setInterval(updateData, 1000)
  
  return () => {
    clearInterval(timer) // 忘れずにクリーンアップ
  }
}, [])

useEffect(() => {
  const handleResize = () => updateViewport()
  window.addEventListener('resize', handleResize)
  
  return () => {
    window.removeEventListener('resize', handleResize)
  }
}, [])
```

### デバッグツール

#### 1. 開発ツール
```typescript
// 開発環境でのデバッグ情報表示
if (process.env.NODE_ENV === 'development') {
  console.log('Quest Map Debug Info:', {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    selectedNode: selectedNode?.id,
    renderTime: performance.now() - startTime
  })
}
```

#### 2. エラー監視
```typescript
// Sentryなどのエラー監視サービス統合
import * as Sentry from '@sentry/react'

Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  environment: process.env.NODE_ENV,
})

// エラー境界でのエラー送信
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  Sentry.captureException(error, {
    contexts: {
      react: {
        componentStack: errorInfo.componentStack,
      },
    },
  })
}
```

### ログ設定
```python
# バックエンドのログ設定
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('quest_map.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# 使用例
@router.post("/quests")
async def create_quest(request: QuestCreateRequest):
    logger.info(f"Creating quest: {request.goal}")
    try:
        result = await service.create_quest(request)
        logger.info(f"Quest created successfully: {result.id}")
        return result
    except Exception as e:
        logger.error(f"Failed to create quest: {e}")
        raise
```

---

このガイドは探Qマップ機能の開発・運用に関する包括的な情報を提供しています。
質問や問題が発生した場合は、GitHub Issues またはSlack の #quest-map チャンネルでお知らせください。