/**
 * 短命アクセストークン（15分）対応のトークンマネージャー
 * - アクセストークン: 15分有効
 * - リフレッシュ間隔: 5分前に事前更新（15-5=10分）
 * - ローテーション対応: 新しいrefresh_tokenも受け取り保存
 * - チェック間隔: 30秒（15分トークンに対応）
 */

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
  private refreshTimer: NodeJS.Timeout | null = null;
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
    this.stopPeriodicCheck();
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
    if (!this.tokens?.refresh_token) {
      throw new Error('No refresh token available');
    }

    try {
      const apiBaseUrl = (import.meta as any).env?.VITE_API_URL || '/api';
      
      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          refresh_token: this.tokens.refresh_token,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Token refresh failed');
      }

      const data = await response.json();

      // 新しいトークン形式に対応（ローテーション対応）
      // expires_inからexpires_atを計算（サーバーは秒単位で返す）
      const expiresAt = Date.now() + (data.expires_in || 900) * 1000; // デフォルト15分
      
      const newTokens: TokenData = {
        access_token: data.access_token,
        refresh_token: data.refresh_token || this.tokens.refresh_token, // ローテーションされた場合は新しいtoken、されない場合は既存を維持
        expires_at: expiresAt,
        token_type: data.token_type || 'Bearer',
      };

      // トークンを保存してイベント通知
      this.saveTokens(newTokens);
      
      return newTokens;

    } catch (error) {
      console.error('Token refresh request failed:', error);
      
      // リフレッシュに失敗した場合はトークンを無効化
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