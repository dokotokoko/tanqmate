/**
 * Supabaseセッション互換のトークンマネージャー
 */

import { supabase } from '../lib/supabase';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp in milliseconds
  token_type?: string;
}

export interface TokenEventHandlers {
  onTokenRefresh?: (newTokens: TokenData) => void;
  onTokenExpired?: () => void;
  onError?: (error: Error) => void;
}

class TokenManager {
  private static readonly STORAGE_KEY = 'auth_tokens';
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5分前に更新（15分トークンに対応）
  private static readonly CHECK_INTERVAL = 30 * 1000; // 30秒間隔でチェック（15分トークンに対応）
  
  private tokens: TokenData | null = null;
  private eventHandlers: TokenEventHandlers = {};
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<TokenData | null> | null = null;

  constructor() {
    this.loadTokensFromStorage();
    this.startPeriodicCheck();
    this.setupVisibilityChangeHandler();
  }

  /**
   * イベントハンドラーを設定
   */
  setEventHandlers(handlers: TokenEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * ストレージからトークンを読み込み
   */
  private loadTokensFromStorage(): void {
    try {
      const stored = localStorage.getItem(TokenManager.STORAGE_KEY);
      if (stored) {
        this.tokens = JSON.parse(stored);
        
        // 既に期限切れの場合は削除
        if (this.tokens && this.isTokenExpired()) {
          this.clearTokens();
        }
      }

      if (!this.tokens) {
        const supabaseStorageKey = Object.keys(localStorage).find((key) => key.startsWith('sb-') && key.endsWith('-auth-token'));
        if (supabaseStorageKey) {
          const rawSession = localStorage.getItem(supabaseStorageKey);
          if (rawSession) {
            const parsed = JSON.parse(rawSession);
            const session = parsed?.currentSession;
            if (session?.access_token) {
              this.tokens = {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at ? session.expires_at * 1000 : Date.now() + (session.expires_in || 3600) * 1000,
                token_type: session.token_type,
              };
              this.saveTokensToStorage();
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to load tokens from storage:', error);
      this.clearTokens();
    }
  }

  /**
   * トークンをストレージに保存
   */
  private saveTokensToStorage(): void {
    try {
      if (this.tokens) {
        localStorage.setItem(TokenManager.STORAGE_KEY, JSON.stringify(this.tokens));
      } else {
        localStorage.removeItem(TokenManager.STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to save tokens to storage:', error);
      this.eventHandlers.onError?.(new Error('Failed to save tokens'));
    }
  }

  /**
   * 定期チェックを開始
   */
  private startPeriodicCheck(): void {
    this.stopPeriodicCheck();
    
    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, TokenManager.CHECK_INTERVAL);
  }

  /**
   * 定期チェックを停止
   */
  private stopPeriodicCheck(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * ページの可視性変更を監視（バックグラウンドタブでのチェック停止）
   */
  private setupVisibilityChangeHandler(): void {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stopPeriodicCheck();
        } else {
          this.startPeriodicCheck();
          // 復帰時に即座にチェック
          this.checkAndRefreshToken();
        }
      });
    }
  }

  /**
   * トークンの有効性をチェックして必要に応じてリフレッシュ
   */
  private async checkAndRefreshToken(): Promise<void> {
    if (!this.tokens) {
      return;
    }

    // 期限切れチェック
    if (this.isTokenExpired()) {
      this.handleTokenExpired();
      return;
    }

    // リフレッシュが必要かチェック
    if (this.shouldRefreshToken()) {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error('Auto refresh failed:', error);
        this.eventHandlers.onError?.(error as Error);
      }
    }
  }

  /**
   * トークンが期限切れかチェック
   */
  private isTokenExpired(): boolean {
    if (!this.tokens) {
      return true;
    }

    const now = Date.now();
    return now >= this.tokens.expires_at;
  }

  /**
   * トークンのリフレッシュが必要かチェック
   */
  shouldRefreshToken(): boolean {
    if (!this.tokens) {
      return false;
    }

    const now = Date.now();
    const timeToExpiry = this.tokens.expires_at - now;
    
    // 5分前になったらリフレッシュ
    return timeToExpiry <= TokenManager.REFRESH_THRESHOLD;
  }

  /**
   * トークンが有効かチェック（公開メソッド）
   */
  isTokenValid(): boolean {
    return this.tokens !== null && !this.isTokenExpired();
  }

  /**
   * 現在のトークンを取得
   */
  getTokens(): TokenData | null {
    return this.tokens;
  }

  /**
   * アクセストークンを取得
   */
  getAccessToken(): string | null {
    return this.tokens?.access_token || null;
  }

  /**
   * トークンを保存
   */
  saveTokens(tokens: TokenData): void {
    this.tokens = tokens;
    this.saveTokensToStorage();
    
    // イベントハンドラーに通知
    this.eventHandlers.onTokenRefresh?.(tokens);
  }

  /**
   * トークンをクリア
   */
  clearTokens(): void {
    this.tokens = null;
    this.saveTokensToStorage();
    this.startPeriodicCheck();
  }

  /**
   * トークンリフレッシュ（バッチング対応）
   */
  async refreshToken(): Promise<TokenData | null> {
    // 既にリフレッシュ中の場合は同じPromiseを返す
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newTokens = await this.refreshPromise;
      return newTokens;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * 実際のトークンリフレッシュ処理
   */
  private async performTokenRefresh(): Promise<TokenData | null> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        throw error || new Error('Token refresh failed');
      }

      const expiresAt = data.session.expires_at
        ? data.session.expires_at * 1000
        : Date.now() + (data.session.expires_in || 3600) * 1000;

      const newTokens: TokenData = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: expiresAt,
        token_type: data.session.token_type || 'Bearer',
      };

      this.saveTokens(newTokens);
      return newTokens;
    } catch (error) {
      console.error('Token refresh request failed:', error);
      this.handleTokenExpired();
      throw error;
    }
  }

  /**
   * トークン期限切れ処理
   */
  private handleTokenExpired(): void {
    this.clearTokens();
    this.eventHandlers.onTokenExpired?.();
  }

  /**
   * 強制リフレッシュ（テスト用）
   */
  async forceRefresh(): Promise<TokenData | null> {
    if (!this.tokens) {
      throw new Error('No tokens available');
    }
    
    return this.refreshToken();
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo() {
    if (!this.tokens) {
      return { hasTokens: false };
    }

    const now = Date.now();
    const timeToExpiry = this.tokens.expires_at - now;
    const shouldRefresh = this.shouldRefreshToken();

    return {
      hasTokens: true,
      expiresAt: new Date(this.tokens.expires_at).toISOString(),
      timeToExpiryMs: timeToExpiry,
      timeToExpiryMin: Math.round(timeToExpiry / (1000 * 60)),
      shouldRefresh,
      isRefreshing: this.isRefreshing,
      isExpired: this.isTokenExpired(),
    };
  }
}

// シングルトンインスタンス
export const tokenManager = new TokenManager();

export default tokenManager;
