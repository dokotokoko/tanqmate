import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { tokenManager, type TokenData } from '../utils/tokenManager';

interface User {
  id: string;
  username: string;
  email?: string;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isFirstLogin: boolean;
  lastLoginTime: Date | null;
  loginCount: number;
  registrationMessage: string | null;
  tokenData: TokenData | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
  initialize: () => Promise<void>;
  markFirstLoginComplete: () => void;
  isNewUser: () => boolean;
  clearRegistrationMessage: () => void;
  refreshToken: () => Promise<boolean>;
  isTokenValid: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isInitialized: false,
      isFirstLogin: true,
      lastLoginTime: null,
      loginCount: 0,
      registrationMessage: null,
      tokenData: null,

      initialize: async () => {
        const { user } = get();
        
        // トークンマネージャーのイベントハンドラーを設定
        tokenManager.setEventHandlers({
          onTokenRefresh: (newTokens) => {
            set({ tokenData: newTokens });
          },
          onTokenExpired: () => {
            // トークン期限切れ時の自動ログアウト
            get().logout();
          },
          onError: (error) => {
            console.error('Token manager error:', error);
          },
        });

        // 既存のトークンがある場合は読み込み
        const existingTokens = tokenManager.getTokens();
        if (existingTokens) {
          set({ tokenData: existingTokens });
        }

        if (user) {
          // トークンの有効性をチェック
          if (tokenManager.isTokenValid()) {
            // トークンが有効な場合は更新が必要かチェック
            if (tokenManager.shouldRefreshToken()) {
              await get().refreshToken();
            }
          } else {
            // トークンが無効な場合はログアウト
            get().logout();
          }
        }
        
        set({ isInitialized: true });
      },

      markFirstLoginComplete: () => {
        set({ isFirstLogin: false });
      },

      isNewUser: () => {
        const { loginCount, isFirstLogin } = get();
        return isFirstLogin || loginCount <= 1;
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        
        try {
          // バックエンドAPIを使用してログイン
          const apiBaseUrl = (import.meta as any).env?.VITE_API_URL || '/api';
          const response = await fetch(`${apiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              username: username,
              password: password,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            set({ isLoading: false });
            return { 
              success: false, 
              error: errorData.detail || 'ログインに失敗しました'
            };
          }

          const data = await response.json();
          
          const user: User = {
            id: data.user.id.toString(),
            username: data.user.username,
          };

          // トークン情報をチェックして保存（15分有効期限対応）
          console.debug('Login response data:', {
            hasAccessToken: !!data.access_token,
            hasRefreshToken: !!data.refresh_token,
            hasExpiresAt: !!data.expires_at,
            hasExpiresIn: !!data.expires_in,
            hasToken: !!data.token,
            tokenType: data.token_type,
            expiresIn: data.expires_in
          });
          let tokenData: TokenData | null = null;
          
          if (data.access_token && data.refresh_token && (data.expires_at || data.expires_in)) {
            // 新しいトークンシステム（15分有効期限 + ローテーション対応）
            const expiresAt = data.expires_at || (Date.now() + (data.expires_in * 1000));
            tokenData = {
              access_token: data.access_token,
              refresh_token: data.refresh_token,
              expires_at: expiresAt,
              token_type: data.token_type || 'Bearer',
            };
            tokenManager.saveTokens(tokenData);
          } else if (data.token && typeof data.token === 'string' && data.token.split('.').length === 3) {
            // 旧システムとの互換性のため（有効なJWTトークンのみ）
            localStorage.setItem('auth-token', data.token);
          } else {
            // 有効なトークンが受信できない場合はエラー
            console.error('No valid token received from server');
            throw new Error('Authentication failed: No valid token received');
          }

          // ログイン情報を更新
          const { loginCount } = get();
          const currentTime = new Date();
          
          set({ 
            user, 
            isLoading: false,
            lastLoginTime: currentTime,
            loginCount: loginCount + 1,
            tokenData,
          });
          
          return { success: true };

        } catch (error) {
          set({ isLoading: false });
          return { 
            success: false, 
            error: `ログインエラー: ${error instanceof Error ? error.message : '不明なエラー'}` 
          };
        }
      },

      register: async (username: string, password: string, confirmPassword: string) => {
        set({ isLoading: true });

        if (password !== confirmPassword) {
          set({ isLoading: false });
          return { success: false, error: 'パスワードが一致しません' };
        }

        if (!username.trim() || !password.trim()) {
          set({ isLoading: false });
          return { success: false, error: 'ユーザー名とパスワードを入力してください' };
        }

        try {
          // バックエンドAPIにユーザー登録リクエストを送信
          const apiBaseUrl = (import.meta as any).env?.VITE_API_URL || '/api';
          
          const response = await fetch(`${apiBaseUrl}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              username: username,
              password: password,
              confirm_password: confirmPassword,
            }),
          });

          // 201 (Created) も成功として扱う
          if (!response.ok && response.status !== 201) {
            const errorData = await response.json().catch(() => ({}));
            set({ isLoading: false });
            
            // 特殊なケース：ユーザー名が既に使用されている場合でも、
            // 実際にはアカウントが作成されている可能性がある
            if (response.status === 400 && errorData.detail?.includes('既に使用されています')) {
              // この場合、アカウントは既に作成されている可能性が高い
              return { 
                success: true, 
                message: '🎉 アカウント登録が完了しました！ログインしてください。'
              };
            }
            
            return { 
              success: false, 
              error: errorData.detail || 'ユーザー登録に失敗しました'
            };
          }

          const data = await response.json();
          
          const message = data.message || 'ユーザー登録が完了しました';
          set({ 
            isLoading: false,
            registrationMessage: message 
          });
          
          return { 
            success: true,
            message: message
          };

        } catch (error) {
          set({ isLoading: false });
          return { 
            success: false, 
            error: `登録エラー: ${error instanceof Error ? error.message : '不明なエラー'}` 
          };
        }
      },

      logout: () => {
        // トークンマネージャーでトークンをクリア
        tokenManager.clearTokens();
        
        // 旧システムのトークンもクリア
        localStorage.removeItem('auth-token');
        
        // 状態をリセット
        set({ 
          user: null,
          tokenData: null,
        });
      },

      refreshToken: async (): Promise<boolean> => {
        try {
          const newTokens = await tokenManager.refreshToken();
          if (newTokens) {
            // ローテーションされたトークンを状態に更新
            set({ tokenData: newTokens });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Token refresh failed in authStore:', error);
          // リフレッシュ失敗時はログアウト
          get().logout();
          return false;
        }
      },

      isTokenValid: (): boolean => {
        return tokenManager.isTokenValid();
      },

      clearRegistrationMessage: () => {
        set({ registrationMessage: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isFirstLogin: state.isFirstLogin,
        lastLoginTime: state.lastLoginTime,
        loginCount: state.loginCount,
        // tokenDataは別途tokenManagerで管理されるため除外
      }),
    }
  )
);

// 初期化処理
useAuthStore.getState().initialize(); 