# バックエンド軽量化リファクタリング方針レポート

## 概要
`OSError: [Errno 12] Cannot allocate memory` エラーが発生しており、バックエンドアプリケーションもメモリ不足の問題を抱えています。

## 現状の問題点

### 1. メモリリークの原因

#### 1.1 無制限のEmbeddingキャッシュ（最重要）
```python
# embedding_utils.py
class EmbeddingClient:
    def __init__(self):
        self.cache = {}  # 制限なしで無限に成長
```
- **問題**: エンベディングベクトル（1536-4096次元）が無制限にキャッシュされる
- **影響**: 時間経過とともにメモリが枯渇

#### 1.2 サービスマネージャーのシングルトンパターン
```python
# services/base.py
class ServiceManager:
    self._services = {}  # サービスインスタンスが永続化
    
class CacheableService:
    self._cache = {}  # 各サービスが独自のキャッシュを保持
```
- **問題**: 複数サービスのキャッシュが累積
- **影響**: メモリの段階的な増加

#### 1.3 認証ミドルウェアのキャッシュ
```python
# middleware/supabase_auth.py
self.user_cache = {}  # ユーザー認証キャッシュ（30分TTL）
self.rate_limit_cache = {}  # レート制限キャッシュ
```
- **問題**: 1000エントリ制限はあるが、アクティブユーザーが多いと累積

### 2. Docker設定の問題
- **ベースイメージ**: `python:3.11-slim`は軽量だが、追加の最適化余地あり
- **並行性制限**: `--limit-concurrency 100` は高すぎる可能性
- **メモリ制限なし**: docker-compose.ymlでバックエンドのメモリ制限が未設定

### 3. 依存関係の最適化余地
- **重複するHTTPクライアント**: `httpx`と`aiohttp`の両方を使用
- **データベースドライバー**: `mysql-connector-python`と`psycopg2-binary`の両方（実際にはSupabaseのみ使用）

## 軽量化リファクタリング方針

### フェーズ1: 即効性のある改善（1-2日）

#### 1.1 Embeddingキャッシュの制限実装
```python
# embedding_utils.py の改善案
from functools import lru_cache
from collections import OrderedDict

class EmbeddingClient:
    def __init__(self, max_cache_size=1000):
        self.cache = OrderedDict()
        self.max_cache_size = max_cache_size
    
    def _add_to_cache(self, key, value):
        if len(self.cache) >= self.max_cache_size:
            self.cache.popitem(last=False)  # FIFOで削除
        self.cache[key] = value
```
**効果**: メモリ使用量の上限設定、予測可能なメモリ使用

#### 1.2 Docker設定の最適化
```yaml
# docker-compose.yml に追加
backend:
  deploy:
    resources:
      limits:
        memory: 1G  # メモリ制限を設定
      reservations:
        memory: 512M
```

```dockerfile
# Dockerfile の最適化
FROM python:3.11-alpine  # alpineベースで更に軽量化
# マルチステージビルドの導入
```
**効果**: コンテナサイズ30-40%削減、メモリ使用量制限

#### 1.3 並行性の調整
```bash
# Dockerfile CMD を修正
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", 
     "--workers", "2",  # ワーカー数を制限
     "--limit-concurrency", "50"]  # 100 → 50に削減
```
**効果**: 同時リクエスト処理によるメモリスパイクの抑制

#### 1.4 不要な依存関係の削除
```txt
# requirements.txt から削除
- mysql-connector-python  # Supabase使用のため不要
- httpx  # aiohttpで統一可能
```
**効果**: インストールサイズとメモリフットプリント削減

### フェーズ2: 中期的な改善（1-2週間）

#### 2.1 キャッシュ管理の統一
```python
# 統一キャッシュマネージャーの実装
class CacheManager:
    def __init__(self, max_total_size_mb=100):
        self.caches = {}
        self.max_size = max_total_size_mb * 1024 * 1024
        
    def get_cache(self, name: str, max_items: int = 100):
        if name not in self.caches:
            self.caches[name] = LRUCache(max_items)
        return self.caches[name]
    
    def clear_all(self):
        for cache in self.caches.values():
            cache.clear()
```
**効果**: 全体的なメモリ使用量の管理と可視化

#### 2.2 データベース接続プーリング
```python
# Supabase接続の最適化
from asyncpg import create_pool

class DatabasePool:
    def __init__(self):
        self.pool = None
    
    async def init(self):
        self.pool = await create_pool(
            dsn=DATABASE_URL,
            min_size=2,
            max_size=10,  # 接続数制限
            command_timeout=60
        )
```
**効果**: データベース接続によるメモリ使用の最適化

#### 2.3 メッセージ履歴のページネーション
```python
# chat_service.py の改善
async def get_conversation_history(
    conversation_id: str,
    limit: int = 20,  # 50 → 20に削減
    offset: int = 0
):
    # ページネーション実装
```
**効果**: 長い会話でのメモリ使用量削減

### フェーズ3: 長期的な最適化（1-2ヶ月）

#### 3.1 Redis導入によるキャッシュ外部化
- メモリキャッシュをRedisに移行
- セッション管理の外部化
- 分散キャッシュの実装

#### 3.2 非同期処理の最適化
- Celeryによるバックグラウンドタスク処理
- 重い処理（エンベディング生成等）の非同期化

#### 3.3 マイクロサービス化
- エンベディングサービスの分離
- 認証サービスの独立化
- API Gatewayパターンの導入

## 実装優先順位と期待効果

| 優先度 | 施策 | 実装コスト | 期待効果 |
|--------|------|-----------|----------|
| 1 | Embeddingキャッシュ制限 | 低（数時間） | メモリリーク解消 |
| 2 | Docker設定最適化 | 低（1時間） | メモリ使用量50%削減 |
| 3 | 並行性調整 | 低（30分） | メモリスパイク抑制 |
| 4 | 依存関係削除 | 低（1時間） | コンテナサイズ20%削減 |
| 5 | キャッシュ統一管理 | 中（3日） | メモリ管理の改善 |

## 監視とメトリクス

### 導入推奨ツール
```python
# メモリ使用量監視の実装例
import psutil
import asyncio

async def monitor_memory():
    process = psutil.Process()
    while True:
        memory_info = process.memory_info()
        memory_percent = process.memory_percent()
        
        if memory_percent > 80:
            # アラート送信 & キャッシュクリア
            await clear_caches()
        
        await asyncio.sleep(60)
```

### 成功指標
- **メモリ使用量**: 1GB以下で安定稼働
- **エラー発生率**: `OSError: [Errno 12]`の完全解消
- **レスポンスタイム**: 95パーセンタイルで500ms以下
- **同時接続数**: 50接続で安定処理

## エラー対策の即時実施項目

### 1. 緊急対応スクリプト
```python
# clear_cache.py - 定期実行用
import gc
import asyncio
from embedding_utils import embedding_client

async def emergency_cleanup():
    # キャッシュクリア
    if hasattr(embedding_client, 'cache'):
        embedding_client.cache.clear()
    
    # ガベージコレクション強制実行
    gc.collect()
    
    print(f"Memory cleaned: {gc.get_count()}")

# cronで1時間ごとに実行
```

### 2. ヘルスチェックの強化
```python
# main.py に追加
@app.get("/health/memory")
async def memory_health():
    import psutil
    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024
    
    status = "healthy" if memory_mb < 800 else "unhealthy"
    return {
        "status": status,
        "memory_mb": memory_mb,
        "threshold_mb": 800
    }
```

## まとめ

バックエンドのメモリ不足は主に以下が原因：

1. **無制限のEmbeddingキャッシュ**（最重要）
2. **サービスの永続化とキャッシュ累積**
3. **高い並行性設定**
4. **メモリ制限の未設定**

即効性のある対策：
- Embeddingキャッシュに上限設定（1000エントリ）
- Dockerメモリ制限（1GB）
- 並行性削減（100→50）

これらの対策により、`OSError: [Errno 12]`エラーを解消し、安定稼働を実現できます。