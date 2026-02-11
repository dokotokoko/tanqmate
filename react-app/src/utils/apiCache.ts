// src/utils/apiCache.ts - APIレスポンスキャッシュシステム
import { LRUCache } from 'lru-cache'

// キャッシュエントリの型定義
interface CacheEntry<T = any> {
  data: T
  timestamp: number
  etag?: string
  maxAge: number
}

// キャッシュ戦略の種類
type CacheStrategy = 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB'

// キャッシュ設定
interface CacheConfig {
  strategy: CacheStrategy
  maxSize: number // メモリキャッシュの最大サイズ（MB）
  maxAge: number // デフォルトの有効期限（ミリ秒）
  enableEtag: boolean // ETagサポート
  enableCompression: boolean // データ圧縮
}

// デフォルト設定
const DEFAULT_CONFIG: CacheConfig = {
  strategy: 'memory',
  maxSize: 50, // 50MB
  maxAge: 5 * 60 * 1000, // 5分
  enableEtag: true,
  enableCompression: true
}

// データ圧縮/展開ユーティリティ
class CompressionUtils {
  static async compress(data: string): Promise<string> {
    if (!('CompressionStream' in window)) {
      return data // ブラウザが対応していない場合はそのまま返す
    }

    const stream = new CompressionStream('gzip')
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()

    writer.write(new TextEncoder().encode(data))
    writer.close()

    const chunks: Uint8Array[] = []
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) chunks.push(value)
    }

    const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      compressed.set(chunk, offset)
      offset += chunk.length
    }

    return btoa(String.fromCharCode(...compressed))
  }

  static async decompress(compressedData: string): Promise<string> {
    if (!('DecompressionStream' in window)) {
      return compressedData
    }

    const bytes = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0))
    const stream = new DecompressionStream('gzip')
    const writer = stream.writable.getWriter()
    const reader = stream.readable.getReader()

    writer.write(bytes)
    writer.close()

    const chunks: Uint8Array[] = []
    let done = false

    while (!done) {
      const { value, done: readerDone } = await reader.read()
      done = readerDone
      if (value) chunks.push(value)
    }

    const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
    let offset = 0
    for (const chunk of chunks) {
      decompressed.set(chunk, offset)
      offset += chunk.length
    }

    return new TextDecoder().decode(decompressed)
  }
}

// メモリキャッシュ実装
class MemoryCache {
  private cache: LRUCache<string, CacheEntry>
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
    this.cache = new LRUCache({
      max: Math.floor(config.maxSize * 1024 * 1024 / 1000), // 概算でアイテム数を計算
      ttl: config.maxAge,
      updateAgeOnGet: true,
      allowStale: false
    })
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    if (!entry) return null

    if (Date.now() - entry.timestamp > entry.maxAge) {
      this.cache.delete(key)
      return null
    }

    if (this.config.enableCompression && typeof entry.data === 'string') {
      try {
        const decompressed = await CompressionUtils.decompress(entry.data)
        return JSON.parse(decompressed)
      } catch {
        return entry.data as T
      }
    }

    return entry.data as T
  }

  async set<T>(key: string, data: T, maxAge?: number): Promise<void> {
    let processedData = data

    if (this.config.enableCompression) {
      try {
        const jsonString = JSON.stringify(data)
        processedData = await CompressionUtils.compress(jsonString) as T
      } catch {
        // 圧縮に失敗した場合はそのまま保存
      }
    }

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: Date.now(),
      maxAge: maxAge || this.config.maxAge
    }

    this.cache.set(key, entry)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// LocalStorage キャッシュ実装
class LocalStorageCache {
  private prefix = 'questmap_cache_'
  private config: CacheConfig

  constructor(config: CacheConfig) {
    this.config = config
    this.cleanup() // 初期化時に期限切れデータをクリーンアップ
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(this.prefix + key)
      if (!item) return null

      const entry: CacheEntry<T> = JSON.parse(item)
      
      if (Date.now() - entry.timestamp > entry.maxAge) {
        localStorage.removeItem(this.prefix + key)
        return null
      }

      if (this.config.enableCompression && typeof entry.data === 'string') {
        try {
          const decompressed = await CompressionUtils.decompress(entry.data)
          return JSON.parse(decompressed)
        } catch {
          return entry.data
        }
      }

      return entry.data
    } catch {
      return null
    }
  }

  async set<T>(key: string, data: T, maxAge?: number): Promise<void> {
    try {
      let processedData = data

      if (this.config.enableCompression) {
        try {
          const jsonString = JSON.stringify(data)
          processedData = await CompressionUtils.compress(jsonString) as T
        } catch {
          // 圧縮失敗時はそのまま
        }
      }

      const entry: CacheEntry<T> = {
        data: processedData,
        timestamp: Date.now(),
        maxAge: maxAge || this.config.maxAge
      }

      localStorage.setItem(this.prefix + key, JSON.stringify(entry))
    } catch (error) {
      // LocalStorage容量不足の場合は古いアイテムを削除
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.cleanup()
        try {
          const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
            maxAge: maxAge || this.config.maxAge
          }
          localStorage.setItem(this.prefix + key, JSON.stringify(entry))
        } catch {
          // それでも失敗した場合は諦める
        }
      }
    }
  }

  delete(key: string): boolean {
    localStorage.removeItem(this.prefix + key)
    return true
  }

  clear(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix))
    keys.forEach(key => localStorage.removeItem(key))
  }

  private cleanup(): void {
    const keys = Object.keys(localStorage).filter(key => key.startsWith(this.prefix))
    const now = Date.now()

    keys.forEach(key => {
      try {
        const item = localStorage.getItem(key)
        if (item) {
          const entry: CacheEntry = JSON.parse(item)
          if (now - entry.timestamp > entry.maxAge) {
            localStorage.removeItem(key)
          }
        }
      } catch {
        localStorage.removeItem(key)
      }
    })
  }

  size(): number {
    return Object.keys(localStorage).filter(key => key.startsWith(this.prefix)).length
  }
}

// APIキャッシュマネージャー
export class ApiCacheManager {
  private cache: MemoryCache | LocalStorageCache
  private config: CacheConfig

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    switch (this.config.strategy) {
      case 'localStorage':
        this.cache = new LocalStorageCache(this.config)
        break
      case 'memory':
      default:
        this.cache = new MemoryCache(this.config)
        break
    }
  }

  // キャッシュ付きfetch
  async fetchWithCache<T>(
    url: string,
    options: RequestInit = {},
    cacheOptions: {
      key?: string
      maxAge?: number
      bypassCache?: boolean
      enableEtag?: boolean
    } = {}
  ): Promise<T> {
    const {
      key = this.generateKey(url, options),
      maxAge = this.config.maxAge,
      bypassCache = false,
      enableEtag = this.config.enableEtag
    } = cacheOptions

    // キャッシュバイパス時は直接fetch
    if (bypassCache) {
      return this.fetchDirect<T>(url, options)
    }

    // キャッシュから取得を試行
    const cachedData = await this.cache.get<T>(key)
    if (cachedData) {
      return cachedData
    }

    // ETag対応
    if (enableEtag) {
      const cachedEtag = await this.getEtag(key)
      if (cachedEtag) {
        options.headers = {
          ...options.headers,
          'If-None-Match': cachedEtag
        }
      }
    }

    // APIを呼び出し
    const response = await fetch(url, options)

    // 304 Not Modified の場合はキャッシュを返す
    if (response.status === 304 && cachedData) {
      return cachedData
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()

    // キャッシュに保存
    await this.cache.set(key, data, maxAge)

    // ETagを保存
    if (enableEtag && response.headers.has('etag')) {
      await this.setEtag(key, response.headers.get('etag')!)
    }

    return data
  }

  // 直接fetch（キャッシュなし）
  private async fetchDirect<T>(url: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  // キャッシュキー生成
  private generateKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET'
    const body = options.body ? JSON.stringify(options.body) : ''
    const headers = options.headers ? JSON.stringify(options.headers) : ''
    
    return btoa(`${method}:${url}:${body}:${headers}`)
  }

  // ETag 関連メソッド
  private async getEtag(key: string): Promise<string | null> {
    return this.cache.get<string>(`etag_${key}`)
  }

  private async setEtag(key: string, etag: string): Promise<void> {
    await this.cache.set(`etag_${key}`, etag)
  }

  // キャッシュ操作メソッド
  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key)
  }

  async set<T>(key: string, data: T, maxAge?: number): Promise<void> {
    await this.cache.set(key, data, maxAge)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // 統計情報
  getStats() {
    return {
      size: this.cache.size(),
      strategy: this.config.strategy,
      maxAge: this.config.maxAge,
      enableCompression: this.config.enableCompression,
      enableEtag: this.config.enableEtag
    }
  }

  // プリウォーミング（よく使うデータを事前にキャッシュ）
  async preWarm(urls: Array<{ url: string; options?: RequestInit }>): Promise<void> {
    const promises = urls.map(({ url, options }) =>
      this.fetchWithCache(url, options).catch(() => null) // エラーは無視
    )
    
    await Promise.allSettled(promises)
  }

  // 無効化
  invalidate(pattern: string): void {
    // パターンマッチングでキャッシュを無効化
    // 実装は strategy によって異なるため、基本的な実装のみ
    if (pattern === '*') {
      this.clear()
    }
  }
}

// グローバルインスタンス
export const apiCache = new ApiCacheManager({
  strategy: 'memory',
  maxSize: 50,
  maxAge: 5 * 60 * 1000,
  enableEtag: true,
  enableCompression: true
})

// QuestMap 専用のキャッシュヘルパー
export class QuestMapCache {
  private cache: ApiCacheManager

  constructor() {
    this.cache = new ApiCacheManager({
      strategy: 'localStorage', // QuestMapは永続化が重要
      maxSize: 20,
      maxAge: 10 * 60 * 1000, // 10分
      enableCompression: true
    })
  }

  // クエストデータ取得
  async getQuest(questId: number): Promise<any> {
    return this.cache.fetchWithCache(
      `/api/quest-map/quests/${questId}`,
      {},
      { 
        key: `quest_${questId}`,
        maxAge: 15 * 60 * 1000 // 15分
      }
    )
  }

  // クエストグラフデータ取得
  async getQuestGraph(questId: number): Promise<any> {
    return this.cache.fetchWithCache(
      `/api/quest-map/quests/${questId}/graph`,
      {},
      {
        key: `quest_graph_${questId}`,
        maxAge: 5 * 60 * 1000 // 5分（頻繁に更新される）
      }
    )
  }

  // AI生成結果キャッシュ
  async cacheAIGeneration(
    questId: number, 
    context: string, 
    result: any
  ): Promise<void> {
    const key = `ai_generation_${questId}_${btoa(context)}`
    await this.cache.set(key, result, 30 * 60 * 1000) // 30分
  }

  async getAIGeneration(questId: number, context: string): Promise<any> {
    const key = `ai_generation_${questId}_${btoa(context)}`
    return this.cache.get(key)
  }

  // クエスト更新時のキャッシュ無効化
  invalidateQuest(questId: number): void {
    this.cache.delete(`quest_${questId}`)
    this.cache.delete(`quest_graph_${questId}`)
  }

  // 統計情報
  getStats() {
    return this.cache.getStats()
  }
}

export const questMapCache = new QuestMapCache()