/**
 * Supabase Auth session adapter.
 *
 * This file intentionally does not persist tokens. Supabase Auth owns session
 * storage, refresh, and rotation; this adapter only keeps a short-lived
 * in-memory copy for older call sites while they are being migrated.
 */

import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  expires_at: number;
  token_type?: string;
}

export interface TokenEventHandlers {
  onTokenRefresh?: (newTokens: TokenData) => void;
  onTokenExpired?: () => void;
  onError?: (error: Error) => void;
}

const LEGACY_STORAGE_KEY = 'auth_tokens';

const toTokenData = (session: Session): TokenData => ({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_at: session.expires_at
    ? session.expires_at * 1000
    : Date.now() + (session.expires_in || 3600) * 1000,
  token_type: session.token_type,
});

class TokenManager {
  private tokens: TokenData | null = null;
  private eventHandlers: TokenEventHandlers = {};

  constructor() {
    this.removeLegacyPersistedTokens();
    void this.syncFromSupabase();

    supabase.auth.onAuthStateChange((_event, session) => {
      this.setSession(session);
    });
  }

  setEventHandlers(handlers: TokenEventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  setSession(session: Session | null): void {
    this.tokens = session ? toTokenData(session) : null;
    if (this.tokens) {
      this.eventHandlers.onTokenRefresh?.(this.tokens);
    }
  }

  async syncFromSupabase(): Promise<TokenData | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      this.setSession(session);
      return this.tokens;
    } catch (error) {
      this.tokens = null;
      this.eventHandlers.onError?.(error as Error);
      return null;
    }
  }

  getTokens(): TokenData | null {
    return this.tokens;
  }

  getAccessToken(): string | null {
    return this.tokens?.access_token || null;
  }

  async getAccessTokenAsync(): Promise<string | null> {
    const currentToken = this.getAccessToken();
    if (currentToken && !this.isTokenExpired()) {
      return currentToken;
    }

    const tokens = await this.syncFromSupabase();
    return tokens?.access_token || null;
  }

  clearTokens(): void {
    this.tokens = null;
    this.removeLegacyPersistedTokens();
  }

  async refreshToken(): Promise<TokenData | null> {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        throw error;
      }

      this.setSession(session);
      return this.tokens;
    } catch (error) {
      this.tokens = null;
      this.eventHandlers.onError?.(error as Error);
      throw error;
    }
  }

  async forceRefresh(): Promise<TokenData | null> {
    return this.refreshToken();
  }

  isTokenValid(): boolean {
    return this.tokens !== null && !this.isTokenExpired();
  }

  shouldRefreshToken(): boolean {
    return false;
  }

  getDebugInfo() {
    if (!this.tokens) {
      return { hasTokens: false, storage: 'supabase-auth' };
    }

    return {
      hasTokens: true,
      storage: 'supabase-auth',
      expiresAt: new Date(this.tokens.expires_at).toISOString(),
      isExpired: this.isTokenExpired(),
    };
  }

  private isTokenExpired(): boolean {
    return !this.tokens || Date.now() >= this.tokens.expires_at;
  }

  private removeLegacyPersistedTokens(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (error) {
      this.eventHandlers.onError?.(error as Error);
    }
  }
}

export const tokenManager = new TokenManager();

export default tokenManager;
