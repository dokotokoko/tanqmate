"""
パフォーマンス最適化とキャッシングシステム
レスポンス時間短縮と計算効率向上のための最適化機能
"""

import logging
import json
import pickle
import hashlib
import time
from typing import List, Dict, Optional, Any, Tuple, Callable
from datetime import datetime, timedelta
from collections import defaultdict, deque, LRU
from dataclasses import dataclass, field
from pathlib import Path
import threading
import weakref
from functools import wraps, lru_cache
import gzip
import asyncio

from .ontology_graph import Node, Edge, NodeType, RelationType

logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """キャッシュエントリ"""
    key: str
    value: Any
    created_at: datetime
    last_accessed: datetime
    access_count: int = 0
    expiry_time: Optional[datetime] = None
    size_bytes: int = 0
    compression_enabled: bool = False
    
    def is_expired(self) -> bool:
        """エントリが期限切れかチェック"""
        if self.expiry_time:
            return datetime.now() > self.expiry_time
        return False
    
    def access(self):
        """アクセス時の統計更新"""
        self.last_accessed = datetime.now()
        self.access_count += 1


@dataclass
class PerformanceMetrics:
    """パフォーマンスメトリクス"""
    cache_hits: int = 0
    cache_misses: int = 0
    total_requests: int = 0
    avg_response_time: float = 0.0
    inference_time_total: float = 0.0
    graph_traversal_time_total: float = 0.0
    rule_evaluation_time_total: float = 0.0
    
    # レスポンス時間履歴
    response_times: deque = field(default_factory=lambda: deque(maxlen=1000))
    
    # メモリ使用量
    cache_memory_usage: int = 0
    graph_memory_usage: int = 0
    
    def add_response_time(self, response_time: float):
        """レスポンス時間を追加"""
        self.response_times.append(response_time)
        self.avg_response_time = sum(self.response_times) / len(self.response_times)
    
    def get_cache_hit_rate(self) -> float:
        """キャッシュヒット率を取得"""
        total = self.cache_hits + self.cache_misses
        return self.cache_hits / total if total > 0 else 0.0


class MultiLevelCache:
    """多層キャッシュシステム"""
    
    def __init__(self, 
                 l1_size: int = 1000,      # L1: メモリキャッシュ（高速）
                 l2_size: int = 10000,     # L2: 圧縮メモリキャッシュ
                 l3_enabled: bool = True,   # L3: ディスクキャッシュ
                 cache_dir: str = "cache"):
        
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        
        # L1キャッシュ: 高速メモリキャッシュ
        self.l1_cache: Dict[str, CacheEntry] = {}
        self.l1_max_size = l1_size
        self.l1_access_order = deque()
        
        # L2キャッシュ: 圧縮メモリキャッシュ
        self.l2_cache: Dict[str, CacheEntry] = {}
        self.l2_max_size = l2_size
        self.l2_access_order = deque()
        
        # L3キャッシュ: ディスクキャッシュ
        self.l3_enabled = l3_enabled
        
        # キャッシュ管理
        self.lock = threading.RLock()
        self.metrics = PerformanceMetrics()
        
        # 自動クリーンアップ
        self.cleanup_thread = None
        self.cleanup_active = True
        self._start_cleanup_thread()
    
    def _start_cleanup_thread(self):
        """クリーンアップスレッドを開始"""
        if self.cleanup_thread is None or not self.cleanup_thread.is_alive():
            self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
            self.cleanup_thread.start()
            logger.info("🧹 キャッシュクリーンアップスレッド開始")
    
    def _cleanup_loop(self):
        """クリーンアップループ"""
        while self.cleanup_active:
            try:
                time.sleep(300)  # 5分ごと
                self._cleanup_expired()
                self._optimize_cache_distribution()
            except Exception as e:
                logger.error(f"❌ キャッシュクリーンアップエラー: {e}")
    
    def get(self, key: str) -> Optional[Any]:
        """キャッシュから値を取得"""
        with self.lock:
            start_time = time.time()
            
            # L1キャッシュをチェック
            if key in self.l1_cache:
                entry = self.l1_cache[key]
                if not entry.is_expired():
                    entry.access()
                    self._update_access_order(key, 1)
                    self.metrics.cache_hits += 1
                    logger.debug(f"L1キャッシュヒット: {key}")
                    return entry.value
                else:
                    del self.l1_cache[key]
            
            # L2キャッシュをチェック
            if key in self.l2_cache:
                entry = self.l2_cache[key]
                if not entry.is_expired():
                    entry.access()
                    value = self._decompress_value(entry.value) if entry.compression_enabled else entry.value
                    
                    # L1に昇格
                    self._promote_to_l1(key, value, entry)
                    self.metrics.cache_hits += 1
                    logger.debug(f"L2キャッシュヒット（L1昇格): {key}")
                    return value
                else:
                    del self.l2_cache[key]
            
            # L3キャッシュをチェック
            if self.l3_enabled:
                l3_value = self._get_from_l3(key)
                if l3_value is not None:
                    # L2に読み込み
                    self._set_l2(key, l3_value, ttl=3600)
                    self.metrics.cache_hits += 1
                    logger.debug(f"L3キャッシュヒット（L2昇格): {key}")
                    return l3_value
            
            self.metrics.cache_misses += 1
            self.metrics.total_requests += 1
            
            elapsed = time.time() - start_time
            if elapsed > 0.01:  # 10ms以上の場合ログ出力
                logger.debug(f"キャッシュミス（{elapsed:.3f}s): {key}")
            
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """キャッシュに値を設定"""
        with self.lock:
            try:
                expiry_time = datetime.now() + timedelta(seconds=ttl) if ttl else None
                size_bytes = self._estimate_size(value)
                
                # サイズが大きい場合は圧縮を検討
                if size_bytes > 10240:  # 10KB以上
                    return self._set_l2(key, value, ttl, compress=True)
                else:
                    return self._set_l1(key, value, ttl)
                    
            except Exception as e:
                logger.error(f"❌ キャッシュ設定エラー ({key}): {e}")
                return False
    
    def _set_l1(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """L1キャッシュに設定"""
        expiry_time = datetime.now() + timedelta(seconds=ttl) if ttl else None
        size_bytes = self._estimate_size(value)
        
        entry = CacheEntry(
            key=key,
            value=value,
            created_at=datetime.now(),
            last_accessed=datetime.now(),
            expiry_time=expiry_time,
            size_bytes=size_bytes
        )
        
        # 容量チェック
        if len(self.l1_cache) >= self.l1_max_size:
            self._evict_l1()
        
        self.l1_cache[key] = entry
        self._update_access_order(key, 1)
        return True
    
    def _set_l2(self, key: str, value: Any, ttl: Optional[int] = None, compress: bool = False) -> bool:
        """L2キャッシュに設定"""
        expiry_time = datetime.now() + timedelta(seconds=ttl) if ttl else None
        
        # 圧縮
        if compress:
            compressed_value = self._compress_value(value)
            size_bytes = self._estimate_size(compressed_value)
        else:
            compressed_value = value
            size_bytes = self._estimate_size(value)
        
        entry = CacheEntry(
            key=key,
            value=compressed_value,
            created_at=datetime.now(),
            last_accessed=datetime.now(),
            expiry_time=expiry_time,
            size_bytes=size_bytes,
            compression_enabled=compress
        )
        
        # 容量チェック
        if len(self.l2_cache) >= self.l2_max_size:
            self._evict_l2()
        
        self.l2_cache[key] = entry
        self._update_access_order(key, 2)
        return True
    
    def _promote_to_l1(self, key: str, value: Any, l2_entry: CacheEntry):
        """L2からL1に昇格"""
        if len(self.l1_cache) >= self.l1_max_size:
            self._evict_l1()
        
        l1_entry = CacheEntry(
            key=key,
            value=value,
            created_at=l2_entry.created_at,
            last_accessed=datetime.now(),
            access_count=l2_entry.access_count + 1,
            expiry_time=l2_entry.expiry_time,
            size_bytes=self._estimate_size(value)
        )
        
        self.l1_cache[key] = l1_entry
        self._update_access_order(key, 1)
    
    def _evict_l1(self):
        """L1キャッシュから削除（LRU）"""
        if self.l1_access_order:
            lru_key = self.l1_access_order.popleft()
            if lru_key in self.l1_cache:
                entry = self.l1_cache[lru_key]
                
                # アクセス頻度が高い場合はL2に降格
                if entry.access_count > 3:
                    self._set_l2(lru_key, entry.value, ttl=1800)  # 30分
                
                del self.l1_cache[lru_key]
    
    def _evict_l2(self):
        """L2キャッシュから削除（LRU）"""
        if self.l2_access_order:
            lru_key = self.l2_access_order.popleft()
            if lru_key in self.l2_cache:
                entry = self.l2_cache[lru_key]
                
                # 重要なデータはL3に保存
                if entry.access_count > 5 and self.l3_enabled:
                    self._set_l3(lru_key, entry.value)
                
                del self.l2_cache[lru_key]
    
    def _update_access_order(self, key: str, level: int):
        """アクセス順序を更新"""
        if level == 1:
            if key in self.l1_access_order:
                self.l1_access_order.remove(key)
            self.l1_access_order.append(key)
        elif level == 2:
            if key in self.l2_access_order:
                self.l2_access_order.remove(key)
            self.l2_access_order.append(key)
    
    def _get_from_l3(self, key: str) -> Optional[Any]:
        """L3キャッシュから取得"""
        try:
            cache_file = self.cache_dir / f"{key}.cache"
            if cache_file.exists():
                with gzip.open(cache_file, 'rb') as f:
                    data = pickle.load(f)
                    
                # 期限チェック
                if 'expiry' in data and datetime.now() > data['expiry']:
                    cache_file.unlink()
                    return None
                
                return data['value']
        except Exception as e:
            logger.error(f"❌ L3キャッシュ読み込みエラー ({key}): {e}")
        
        return None
    
    def _set_l3(self, key: str, value: Any, ttl: int = 86400):
        """L3キャッシュに設定"""
        try:
            cache_file = self.cache_dir / f"{key}.cache"
            expiry = datetime.now() + timedelta(seconds=ttl)
            
            data = {
                'value': value,
                'created_at': datetime.now(),
                'expiry': expiry
            }
            
            with gzip.open(cache_file, 'wb') as f:
                pickle.dump(data, f, protocol=pickle.HIGHEST_PROTOCOL)
                
        except Exception as e:
            logger.error(f"❌ L3キャッシュ書き込みエラー ({key}): {e}")
    
    def _compress_value(self, value: Any) -> bytes:
        """値を圧縮"""
        pickled = pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
        return gzip.compress(pickled)
    
    def _decompress_value(self, compressed_value: bytes) -> Any:
        """値を展開"""
        decompressed = gzip.decompress(compressed_value)
        return pickle.loads(decompressed)
    
    def _estimate_size(self, value: Any) -> int:
        """値のサイズを推定"""
        try:
            return len(pickle.dumps(value))
        except:
            return 1024  # デフォルト1KB
    
    def _cleanup_expired(self):
        """期限切れエントリをクリーンアップ"""
        with self.lock:
            # L1クリーンアップ
            expired_l1 = [k for k, v in self.l1_cache.items() if v.is_expired()]
            for key in expired_l1:
                del self.l1_cache[key]
                if key in self.l1_access_order:
                    self.l1_access_order.remove(key)
            
            # L2クリーンアップ
            expired_l2 = [k for k, v in self.l2_cache.items() if v.is_expired()]
            for key in expired_l2:
                del self.l2_cache[key]
                if key in self.l2_access_order:
                    self.l2_access_order.remove(key)
            
            if expired_l1 or expired_l2:
                logger.info(f"🧹 期限切れキャッシュクリーンアップ: L1={len(expired_l1)}, L2={len(expired_l2)}")
    
    def _optimize_cache_distribution(self):
        """キャッシュ分散を最適化"""
        with self.lock:
            # L2からL1への昇格候補を検討
            promotion_candidates = []
            for key, entry in self.l2_cache.items():
                if entry.access_count > 5 and not entry.compression_enabled:
                    promotion_candidates.append((key, entry))
            
            # アクセス頻度順でソート
            promotion_candidates.sort(key=lambda x: x[1].access_count, reverse=True)
            
            # L1に空きがあれば昇格
            available_l1_slots = self.l1_max_size - len(self.l1_cache)
            for i in range(min(available_l1_slots, len(promotion_candidates))):
                key, entry = promotion_candidates[i]
                value = entry.value
                self._promote_to_l1(key, value, entry)
                del self.l2_cache[key]
                if key in self.l2_access_order:
                    self.l2_access_order.remove(key)
    
    def clear(self):
        """キャッシュをクリア"""
        with self.lock:
            self.l1_cache.clear()
            self.l2_cache.clear()
            self.l1_access_order.clear()
            self.l2_access_order.clear()
            
            if self.l3_enabled:
                for cache_file in self.cache_dir.glob("*.cache"):
                    try:
                        cache_file.unlink()
                    except:
                        pass
    
    def get_statistics(self) -> Dict[str, Any]:
        """キャッシュ統計を取得"""
        with self.lock:
            return {
                'l1_size': len(self.l1_cache),
                'l2_size': len(self.l2_cache),
                'l1_max_size': self.l1_max_size,
                'l2_max_size': self.l2_max_size,
                'hit_rate': self.metrics.get_cache_hit_rate(),
                'total_hits': self.metrics.cache_hits,
                'total_misses': self.metrics.cache_misses,
                'memory_usage_estimate': sum(e.size_bytes for e in self.l1_cache.values()) + 
                                        sum(e.size_bytes for e in self.l2_cache.values())
            }


class PerformanceOptimizer:
    """パフォーマンス最適化メインクラス"""
    
    def __init__(self, cache_dir: str = "performance_cache"):
        self.cache = MultiLevelCache(cache_dir=cache_dir)
        self.metrics = PerformanceMetrics()
        
        # 計算結果キャッシュ
        self.inference_cache = {}
        self.graph_traversal_cache = {}
        self.pattern_cache = {}
        
        # 非同期処理プール
        self.executor = None
        
        # 最適化設定
        self.optimization_settings = {
            'enable_caching': True,
            'enable_async': True,
            'enable_lazy_loading': True,
            'enable_parallel_inference': True,
            'cache_ttl_default': 3600,  # 1時間
            'cache_ttl_inference': 1800,  # 30分
            'cache_ttl_graph': 7200,     # 2時間
        }
    
    def cache_key(self, *args, **kwargs) -> str:
        """キャッシュキーを生成"""
        key_data = str(args) + str(sorted(kwargs.items()))
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def cached_inference(self, ttl: int = None):
        """推論結果キャッシュデコレータ"""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                if not self.optimization_settings['enable_caching']:
                    return func(*args, **kwargs)
                
                cache_key = f"inference_{self.cache_key(*args, **kwargs)}"
                
                # キャッシュから取得試行
                cached_result = self.cache.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # 計算実行
                start_time = time.time()
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # メトリクス更新
                self.metrics.inference_time_total += execution_time
                
                # キャッシュに保存
                cache_ttl = ttl or self.optimization_settings['cache_ttl_inference']
                self.cache.set(cache_key, result, ttl=cache_ttl)
                
                return result
            return wrapper
        return decorator
    
    def cached_graph_operation(self, ttl: int = None):
        """グラフ操作キャッシュデコレータ"""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                if not self.optimization_settings['enable_caching']:
                    return func(*args, **kwargs)
                
                cache_key = f"graph_{self.cache_key(*args, **kwargs)}"
                
                # キャッシュから取得試行
                cached_result = self.cache.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # 計算実行
                start_time = time.time()
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # メトリクス更新
                self.metrics.graph_traversal_time_total += execution_time
                
                # キャッシュに保存
                cache_ttl = ttl or self.optimization_settings['cache_ttl_graph']
                self.cache.set(cache_key, result, ttl=cache_ttl)
                
                return result
            return wrapper
        return decorator
    
    def cached_pattern_matching(self, ttl: int = None):
        """パターンマッチングキャッシュデコレータ"""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                if not self.optimization_settings['enable_caching']:
                    return func(*args, **kwargs)
                
                cache_key = f"pattern_{self.cache_key(*args, **kwargs)}"
                
                # キャッシュから取得試行
                cached_result = self.cache.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                # 計算実行
                start_time = time.time()
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # キャッシュに保存
                cache_ttl = ttl or self.optimization_settings['cache_ttl_default']
                self.cache.set(cache_key, result, ttl=cache_ttl)
                
                return result
            return wrapper
        return decorator
    
    def measure_performance(self, operation_name: str = "operation"):
        """パフォーマンス測定デコレータ"""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                try:
                    result = func(*args, **kwargs)
                    return result
                finally:
                    execution_time = time.time() - start_time
                    self.metrics.add_response_time(execution_time)
                    self.metrics.total_requests += 1
                    
                    if execution_time > 1.0:  # 1秒以上の場合は警告
                        logger.warning(f"⚠️ 低速操作検出 ({operation_name}): {execution_time:.3f}s")
                    elif execution_time > 0.1:  # 100ms以上の場合は情報
                        logger.info(f"📊 操作完了 ({operation_name}): {execution_time:.3f}s")
            return wrapper
        return decorator
    
    def batch_process(self, items: List[Any], batch_size: int = 10, parallel: bool = True):
        """バッチ処理最適化"""
        if not parallel or not self.optimization_settings['enable_parallel_inference']:
            return items
        
        # バッチサイズで分割
        batches = [items[i:i + batch_size] for i in range(0, len(items), batch_size)]
        
        if self.optimization_settings['enable_async']:
            return self._async_batch_process(batches)
        else:
            return self._sync_batch_process(batches)
    
    def _async_batch_process(self, batches: List[List[Any]]):
        """非同期バッチ処理"""
        async def process_batch(batch):
            return batch  # 実際の処理はここに実装
        
        async def run_all_batches():
            tasks = [process_batch(batch) for batch in batches]
            return await asyncio.gather(*tasks)
        
        try:
            loop = asyncio.get_event_loop()
            return loop.run_until_complete(run_all_batches())
        except RuntimeError:
            # イベントループが存在しない場合は同期処理にフォールバック
            return self._sync_batch_process(batches)
    
    def _sync_batch_process(self, batches: List[List[Any]]):
        """同期バッチ処理"""
        results = []
        for batch in batches:
            results.extend(batch)
        return results
    
    def optimize_graph_structure(self, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """グラフ構造の最適化"""
        optimized = graph_data.copy()
        
        # ノードインデックスの最適化
        if 'nodes' in optimized:
            nodes = optimized['nodes']
            
            # 頻繁にアクセスされるノードを前に配置
            if isinstance(nodes, list):
                nodes.sort(key=lambda n: n.get('access_count', 0), reverse=True)
            
            # ノードのメタデータを圧縮
            for node in nodes:
                if 'metadata' in node and isinstance(node['metadata'], dict):
                    # 使用されていないメタデータを削除
                    node['metadata'] = {k: v for k, v in node['metadata'].items() 
                                      if k in ['learning_data', 'session_id', 'interaction_count']}
        
        # エッジの最適化
        if 'edges' in optimized:
            edges = optimized['edges']
            
            # 信頼度の低いエッジを削除
            if isinstance(edges, list):
                optimized['edges'] = [e for e in edges if e.get('confidence', 0) > 0.1]
        
        return optimized
    
    def lazy_load_graph_data(self, user_id: str, limit: int = 100) -> Dict[str, Any]:
        """遅延ロードによるグラフデータ取得"""
        cache_key = f"lazy_graph_{user_id}_{limit}"
        
        cached_data = self.cache.get(cache_key)
        if cached_data is not None:
            return cached_data
        
        # 必要最小限のデータのみ読み込み
        graph_data = {
            'user_id': user_id,
            'nodes': [],  # 実際の実装では最新のノードのみ
            'edges': [],  # 実際の実装では関連エッジのみ
            'metadata': {
                'loaded_at': datetime.now().isoformat(),
                'limit': limit,
                'lazy_loaded': True
            }
        }
        
        # キャッシュに保存
        self.cache.set(cache_key, graph_data, ttl=self.optimization_settings['cache_ttl_graph'])
        
        return graph_data
    
    def preload_frequent_patterns(self, user_ids: List[str]):
        """頻繁に使用されるパターンの事前ロード"""
        if not self.optimization_settings['enable_caching']:
            return
        
        for user_id in user_ids:
            # よく使用されるパターンを事前キャッシュ
            patterns = [
                f"user_profile_{user_id}",
                f"recent_interactions_{user_id}",
                f"learning_patterns_{user_id}"
            ]
            
            for pattern in patterns:
                cache_key = f"preload_{pattern}"
                if self.cache.get(cache_key) is None:
                    # 実際の実装では適切なデータを設定
                    placeholder_data = {
                        'pattern': pattern,
                        'preloaded_at': datetime.now().isoformat()
                    }
                    self.cache.set(cache_key, placeholder_data, ttl=1800)  # 30分
    
    def optimize_inference_pipeline(self, pipeline_steps: List[Callable]) -> List[Callable]:
        """推論パイプラインの最適化"""
        optimized_steps = []
        
        for i, step in enumerate(pipeline_steps):
            # ステップにキャッシングを追加
            cached_step = self.cached_inference()(step)
            
            # パフォーマンス測定を追加
            measured_step = self.measure_performance(f"pipeline_step_{i}")(cached_step)
            
            optimized_steps.append(measured_step)
        
        return optimized_steps
    
    def get_performance_report(self) -> Dict[str, Any]:
        """パフォーマンスレポートを取得"""
        cache_stats = self.cache.get_statistics()
        
        # レスポンス時間統計
        response_times = list(self.metrics.response_times)
        if response_times:
            percentiles = {
                'p50': float(np.percentile(response_times, 50)),
                'p90': float(np.percentile(response_times, 90)),
                'p95': float(np.percentile(response_times, 95)),
                'p99': float(np.percentile(response_times, 99))
            }
        else:
            percentiles = {'p50': 0, 'p90': 0, 'p95': 0, 'p99': 0}
        
        return {
            'cache_statistics': cache_stats,
            'response_time_metrics': {
                'avg_response_time': self.metrics.avg_response_time,
                'total_requests': self.metrics.total_requests,
                'percentiles': percentiles
            },
            'operation_metrics': {
                'inference_time_total': self.metrics.inference_time_total,
                'graph_traversal_time_total': self.metrics.graph_traversal_time_total,
                'rule_evaluation_time_total': self.metrics.rule_evaluation_time_total
            },
            'optimization_settings': self.optimization_settings,
            'recommendations': self._generate_optimization_recommendations()
        }
    
    def _generate_optimization_recommendations(self) -> List[str]:
        """最適化推奨事項を生成"""
        recommendations = []
        
        # キャッシュヒット率が低い場合
        hit_rate = self.metrics.get_cache_hit_rate()
        if hit_rate < 0.5:
            recommendations.append("キャッシュヒット率が低いです。TTL設定を調整してください。")
        
        # 平均応答時間が長い場合
        if self.metrics.avg_response_time > 2.0:
            recommendations.append("平均応答時間が長いです。並列処理や事前計算を検討してください。")
        
        # メモリ使用量が多い場合
        cache_stats = self.cache.get_statistics()
        if cache_stats.get('memory_usage_estimate', 0) > 100 * 1024 * 1024:  # 100MB
            recommendations.append("キャッシュメモリ使用量が多いです。圧縮や容量制限を調整してください。")
        
        if not recommendations:
            recommendations.append("パフォーマンスは良好です。")
        
        return recommendations
    
    def clear_cache(self):
        """キャッシュをクリア"""
        self.cache.clear()
        logger.info("🧹 全キャッシュクリア完了")
    
    def shutdown(self):
        """最適化システムをシャットダウン"""
        self.cache.cleanup_active = False
        if self.cache.cleanup_thread:
            self.cache.cleanup_thread.join(timeout=5)
        
        if self.executor:
            self.executor.shutdown(wait=True)
        
        logger.info("⏹️ パフォーマンス最適化システムシャットダウン完了")


# NumPy互換の簡易実装（実際の環境でnumpyが利用できない場合）
class np:
    @staticmethod
    def percentile(data, percentile):
        """パーセンタイル計算"""
        if not data:
            return 0
        sorted_data = sorted(data)
        index = (percentile / 100.0) * (len(sorted_data) - 1)
        if index.is_integer():
            return sorted_data[int(index)]
        else:
            lower = sorted_data[int(index)]
            upper = sorted_data[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))
    
    @staticmethod
    def mean(data):
        """平均計算"""
        return sum(data) / len(data) if data else 0


# LRUキャッシュの簡易実装（Python標準ライブラリを使用しない場合）
class LRU:
    def __init__(self, maxsize=128):
        self.maxsize = maxsize
        self.cache = {}
        self.access_order = deque()
    
    def get(self, key, default=None):
        if key in self.cache:
            self.access_order.remove(key)
            self.access_order.append(key)
            return self.cache[key]
        return default
    
    def put(self, key, value):
        if key in self.cache:
            self.access_order.remove(key)
        elif len(self.cache) >= self.maxsize:
            oldest = self.access_order.popleft()
            del self.cache[oldest]
        
        self.cache[key] = value
        self.access_order.append(key)