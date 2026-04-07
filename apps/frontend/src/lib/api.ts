// FastAPI バックエンドと連携するためのAPIクライアント
import { API_BASE_URL } from '../config/api';
import { tokenManager } from '../utils/tokenManager';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// 型定義
export interface User {
  id: number;
  username: string;
  message: string;
}

export interface Interest {
  id: number;
  interest: string;
  created_at: string;
}

export interface Goal {
  id: number;
  goal: string;
  interest_id: number;
  created_at: string;
}

export interface LearningPlan {
  id: number;
  nextStep: string;
  goal_id: number;
  created_at: string;
}

export interface ChatMessage {
  message: string;
  memo_content?: string;
  context?: string;
}

export interface ChatResponse {
  response: string;
  timestamp: string;
}

export interface Memo {
  id: number;
  page_id: string;
  content: string;
  updated_at: string;
}

// =============================================================================
// 探究テーマ深掘りツリー API
// =============================================================================

export interface ThemeDeepDiveRequest {
  theme: string;
  parent_theme: string;
  depth: number;
  path: string[];
  user_interests: string[];
}

export interface ThemeDeepDiveResponse {
  suggestions: string[];
  context_info: {
    depth: number;
    path_length: number;
    user_interests_count: number;
    suggestions_count: number;
  };
}

// API クライアント
class ApiClient {
  private token: string | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private failedQueue: Array<{
    resolve: (token: string | null) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    // tokenManagerから現在のアクセストークンを取得
    const tokens = tokenManager.getTokens();
    this.token = tokens?.access_token || null;
    this.setupTokenManager();
  }

  /**
   * トークンマネージャーのセットアップ
   */
  private setupTokenManager() {
    tokenManager.setEventHandlers({
      onTokenRefresh: (newTokens) => {
        this.token = newTokens.access_token;
      },
      onTokenExpired: () => {
        this.handleTokenExpired();
      },
      onError: (error) => {
        console.error('Token manager error:', error);
      },
    });
  }

  /**
   * トークン期限切れ処理
   */
  private handleTokenExpired() {
    this.token = null;
    // 失敗したリクエストキューをクリア
    this.processQueue(null, new Error('Token expired'));
    
    // 必要に応じてログアウト処理を呼び出し
    if (typeof window !== 'undefined' && window.location) {
      // ログインページへリダイレクト
      window.location.href = '/login';
    }
  }

  /**
   * 失敗したリクエストキューを処理
   */
  private processQueue(token: string | null, error: any = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  /**
   * トークンを更新（バッチング対応）
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (this.isRefreshing) {
      // 既にリフレッシュ中の場合は同じPromiseを返す
      return this.refreshPromise!;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const success = await this.refreshPromise;
      this.processQueue(this.token, null);
      return success;
    } catch (error) {
      this.processQueue(null, error);
      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * 実際のトークンリフレッシュ処理（ローテーション対応）
   */
  private async performTokenRefresh(): Promise<boolean> {
    try {
      const newTokens = await tokenManager.refreshToken();
      if (newTokens) {
        this.token = newTokens.access_token;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // リフレッシュ失敗時はトークンをクリア
      this.token = null;
      tokenManager.clearTokens();
      return false;
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // 認証が必要なエンドポイントの場合はトークンを追加
      if (this.token && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
        console.log('Sending token:', this.token.substring(0, 20) + '...'); // デバッグログ
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // 401エラーの処理
      if (response.status === 401 && !isRetry && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
        try {
          // トークンリフレッシュを試行
          const refreshSuccess = await this.refreshAccessToken();
          if (refreshSuccess) {
            // リフレッシュ成功時はリクエストを再試行
            return this.request<T>(endpoint, options, true);
          }
        } catch (refreshError) {
          console.error('Token refresh failed during request:', refreshError);
          // リフレッシュ失敗時は元のエラーレスポンスを返す
        }
      }

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'API request failed' };
      }

      return { data };
    } catch (error) {
      console.error('API request error:', error);
      return { error: 'Network error' };
    }
  }

  /**
   * 認証が必要なリクエスト用のヘルパー
   */
  async authenticatedRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // リフレッシュ中の場合は待機
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({
          resolve: (token) => {
            if (token) {
              this.request<T>(endpoint, options).then(resolve).catch(reject);
            } else {
              reject(new Error('Token refresh failed'));
            }
          },
          reject,
        });
      });
    }

    return this.request<T>(endpoint, options);
  }

  // 認証関連
  async login(username: string, access_code: string): Promise<ApiResponse<any>> {
    const result = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password: access_code }), // passwordフィールドに変更
    });

    if (result.data) {
      console.log('Login response:', result.data); // デバッグログ
      
      // ログイン成功時にトークン情報を保存
      if (result.data.access_token && result.data.refresh_token) {
        // expires_inからexpires_atを計算（サーバーは秒単位で返す）
        const expiresAt = Date.now() + (result.data.expires_in || 900) * 1000; // デフォルト15分
        
        console.log('Saving tokens:', { // デバッグログ
          access_token: result.data.access_token.substring(0, 20) + '...',
          refresh_token: result.data.refresh_token.substring(0, 20) + '...',
          expires_at: new Date(expiresAt).toISOString()
        });
        
        tokenManager.saveTokens({
          access_token: result.data.access_token,
          refresh_token: result.data.refresh_token,
          expires_at: expiresAt,
          token_type: result.data.token_type || 'Bearer',
        });
        this.token = result.data.access_token;
        
        // 旧形式のトークンをクリア
        localStorage.removeItem('auth-token');
      } else {
        console.warn('No tokens in login response, using legacy format'); // デバッグログ
      }
    }

    return result;
  }

  logout() {
    this.token = null;
    tokenManager.clearTokens();
    // 旧形式のトークンもクリア
    localStorage.removeItem('auth-token');
  }

  // 興味関心関連
  async createInterest(interest: string): Promise<ApiResponse<Interest>> {
    return this.authenticatedRequest<Interest>('/interests', {
      method: 'POST',
      body: JSON.stringify({ interest }),
    });
  }

  async getInterests(): Promise<ApiResponse<Interest[]>> {
    return this.authenticatedRequest<Interest[]>('/interests');
  }

  // 学習目標関連
  async createGoal(interest: string, goal: string): Promise<ApiResponse<Goal>> {
    return this.authenticatedRequest<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify({ interest, goal }),
    });
  }

  async getGoals(): Promise<ApiResponse<Goal[]>> {
    return this.authenticatedRequest<Goal[]>('/goals');
  }

  // 学習計画関連
  async createLearningPlan(goal: string, nextStep: string): Promise<ApiResponse<LearningPlan>> {
    return this.authenticatedRequest<LearningPlan>('/learning-plans', {
      method: 'POST',
      body: JSON.stringify({ goal, nextStep }),
    });
  }

  async getLearningPlans(): Promise<ApiResponse<LearningPlan[]>> {
    return this.authenticatedRequest<LearningPlan[]>('/learning-plans');
  }

  // チャット関連
  async sendChatMessage(message: ChatMessage): Promise<ApiResponse<ChatResponse>> {
    return this.authenticatedRequest<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  // メモ関連
  async saveMemo(page_id: string, content: string): Promise<ApiResponse<Memo>> {
    return this.authenticatedRequest<Memo>('/memos', {
      method: 'POST',
      body: JSON.stringify({ page_id, content }),
    });
  }

  async getMemo(page_id: string): Promise<ApiResponse<Memo>> {
    return this.authenticatedRequest<Memo>(`/memos/${page_id}`);
  }

  async getAllMemos(): Promise<ApiResponse<Memo[]>> {
    return this.authenticatedRequest<Memo[]>('/memos');
  }

  async deleteMemoByPageId(page_id: string): Promise<ApiResponse<{message: string, page_id: string}>> {
    return this.authenticatedRequest(`/memos/${page_id}`, {
      method: 'DELETE',
    });
  }

  // Project関連
  async createProject(name: string): Promise<ApiResponse<any>> {
    return this.authenticatedRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getProjects(): Promise<ApiResponse<any[]>> {
    return this.authenticatedRequest('/projects');
  }

  async updateProject(id: string, name: string): Promise<ApiResponse<any>> {
    return this.authenticatedRequest(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<any>> {
    return this.authenticatedRequest(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Memo関連 (Project-based)
  async createMemo(project_id: string, title: string, content: string = ''): Promise<ApiResponse<any>> {
    return this.authenticatedRequest('/memos', {
      method: 'POST',
      body: JSON.stringify({ project_id, title, content }),
    });
  }

  async getMemosByProject(project_id: string): Promise<ApiResponse<any[]>> {
    return this.authenticatedRequest(`/memos?project_id=${project_id}`);
  }

  async updateMemo(id: string, title: string, content: string, order: number): Promise<ApiResponse<any>> {
    return this.authenticatedRequest(`/memos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content, order }),
    });
  }

  async deleteMemo(id: string): Promise<ApiResponse<any>> {
    return this.authenticatedRequest(`/memos/${id}`, {
      method: 'DELETE',
    });
  }

  // ヘルスチェック
  async healthCheck(): Promise<ApiResponse<{message: string, version: string}>> {
    return this.request('/');
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();

// React Query用のカスタムフック
export const useApi = () => {
  return apiClient;
};

// エラーハンドリング用のヘルパー
export const handleApiError = (error: string | undefined) => {
  if (error) {
    console.error('API Error:', error);
    // 必要に応じてトースト通知やエラー表示を行う
  }
};

export default apiClient;

// =============================================================================
// クエストシステム API
// =============================================================================

export interface Quest {
  id: number;
  title: string;
  description: string;
  category: 'creative' | 'research' | 'experiment' | 'communication';
  difficulty: 1 | 2 | 3;
  points: number;
  required_evidence: string;
  icon_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserQuest {
  id: number;
  user_id: number;
  quest_id: number;
  status: 'available' | 'in_progress' | 'completed';
  progress: number;
  quest: Quest;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QuestSubmission {
  id: number;
  user_quest_id: number;
  quest_id: number;
  description: string;
  file_url?: string;
  reflection_data?: any;
  status: string;
  points_awarded: number;
  submitted_at: string;
}

export interface QuestStats {
  total_quests: number;
  available_quests: number;
  completed_quests: number;
  in_progress_quests: number;
  total_points: number;
}

export const questApi = {
  // クエスト一覧取得
  getQuests: async (category?: string, difficulty?: number): Promise<Quest[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (difficulty) params.append('difficulty', difficulty.toString());
    
    const result = await apiClient.authenticatedRequest<Quest[]>(`/quests?${params.toString()}`);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  // 特定クエスト取得
  getQuest: async (questId: number): Promise<Quest> => {
    const result = await apiClient.authenticatedRequest<Quest>(`/quests/${questId}`);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  // ユーザークエスト一覧取得
  getUserQuests: async (status?: string): Promise<UserQuest[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    const result = await apiClient.authenticatedRequest<UserQuest[]>(`/user-quests?${params.toString()}`);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  // クエスト開始
  startQuest: async (questId: number): Promise<UserQuest> => {
    const result = await apiClient.authenticatedRequest<UserQuest>('/user-quests/start', {
      method: 'POST',
      body: JSON.stringify({ quest_id: questId }),
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  // クエスト提出
  submitQuest: async (userQuestId: number, submissionData: {
    description: string;
    file_url?: string;
    reflection_data?: any;
  }): Promise<QuestSubmission> => {
    const result = await apiClient.authenticatedRequest<QuestSubmission>(`/user-quests/${userQuestId}/submit`, {
      method: 'POST',
      body: JSON.stringify(submissionData),
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  // 提出内容取得
  getQuestSubmission: async (userQuestId: number): Promise<QuestSubmission> => {
    const result = await apiClient.authenticatedRequest<QuestSubmission>(`/user-quests/${userQuestId}/submission`);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  // クエスト統計取得
  getQuestStats: async (): Promise<QuestStats> => {
    const result = await apiClient.authenticatedRequest<QuestStats>('/quest-stats');
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },
};

export const themeDeepDiveApi = {
  generateSuggestions: async (request: ThemeDeepDiveRequest): Promise<ThemeDeepDiveResponse> => {
    const result = await apiClient.authenticatedRequest<ThemeDeepDiveResponse>('/framework-games/theme-deep-dive/suggestions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },
  
  saveSelection: async (theme: string, path: string[]): Promise<void> => {
    const result = await apiClient.authenticatedRequest<any>('/framework-games/theme-deep-dive/save-selection', {
      method: 'POST',
      body: JSON.stringify({ theme, path }),
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
  },
}; 