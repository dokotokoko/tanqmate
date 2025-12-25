/**
 * Supabase Auth API Client
 * バックエンドの新しい認証エンドポイントとの通信
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    created_at: string;
    user_metadata?: Record<string, any>;
  };
}

export interface AuthError {
  message: string;
  status?: number;
  name: string;
}

class SupabaseAuthApi {
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('supabase_access_token');
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }

  async signUp(email: string, password: string, username?: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, username }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: data.detail || 'サインアップに失敗しました',
            status: response.status,
            name: 'AuthError'
          } as AuthError
        };
      }

      return {
        data: {
          user: data.user,
          session: {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
            expires_at: Date.now() / 1000 + data.expires_in
          }
        },
        error: null
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          message: error.message || 'ネットワークエラー',
          status: 500,
          name: 'NetworkError'
        } as AuthError
      };
    }
  }

  async signIn(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: data.detail || 'サインインに失敗しました',
            status: response.status,
            name: 'AuthError'
          } as AuthError
        };
      }

      return {
        data: {
          user: data.user,
          session: {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
            expires_at: Date.now() / 1000 + data.expires_in
          }
        },
        error: null
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          message: error.message || 'ネットワークエラー',
          status: 500,
          name: 'NetworkError'
        } as AuthError
      };
    }
  }

  async signInWithProvider(provider: 'google' | 'github') {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin/provider`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          provider,
          redirect_to: `${window.location.origin}/auth/callback`
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: data.detail || 'プロバイダー認証に失敗しました',
            status: response.status,
            name: 'AuthError'
          } as AuthError
        };
      }

      return {
        data: { url: data.url },
        error: null
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          message: error.message || 'ネットワークエラー',
          status: 500,
          name: 'NetworkError'
        } as AuthError
      };
    }
  }

  async signOut() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signout`, {
        method: 'POST',
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          error: {
            message: data.detail || 'サインアウトに失敗しました',
            status: response.status,
            name: 'AuthError'
          } as AuthError
        };
      }

      return { error: null };
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'ネットワークエラー',
          status: 500,
          name: 'NetworkError'
        } as AuthError
      };
    }
  }

  async resetPassword(email: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          error: {
            message: data.detail || 'パスワードリセットに失敗しました',
            status: response.status,
            name: 'AuthError'
          } as AuthError
        };
      }

      return { error: null };
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'ネットワークエラー',
          status: 500,
          name: 'NetworkError'
        } as AuthError
      };
    }
  }

  async updatePassword(newPassword: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/update-password`, {
        method: 'PUT',
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_password: newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          error: {
            message: data.detail || 'パスワード更新に失敗しました',
            status: response.status,
            name: 'AuthError'
          } as AuthError
        };
      }

      return { error: null };
    } catch (error: any) {
      return {
        error: {
          message: error.message || 'ネットワークエラー',
          status: 500,
          name: 'NetworkError'
        } as AuthError
      };
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: data.detail || 'トークンのリフレッシュに失敗しました',
            status: response.status,
            name: 'AuthError'
          } as AuthError
        };
      }

      return {
        data: {
          user: data.user,
          session: {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
            expires_at: Date.now() / 1000 + data.expires_in
          }
        },
        error: null
      };
    } catch (error: any) {
      return {
        data: null,
        error: {
          message: error.message || 'ネットワークエラー',
          status: 500,
          name: 'NetworkError'
        } as AuthError
      };
    }
  }

  async getCurrentUser(accessToken?: string) {
    try {
      const token = accessToken || localStorage.getItem('supabase_access_token');
      if (!token) {
        return {
          data: null,
          error: {
            message: '認証トークンが見つかりません',
            status: 401,
            name: 'AuthError'
          } as AuthError
        };
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          data: null,
          error: {
            message: data.detail || 'ユーザー情報の取得に失敗しました',
            status: response.status,
            name: 'AuthError'
          } as AuthError
        };
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error: any) {
      return {
        data: null,
        error: {
          message: error.message || 'ネットワークエラー',
          status: 500,
          name: 'NetworkError'
        } as AuthError
      };
    }
  }
}

export const supabaseAuthApi = new SupabaseAuthApi();