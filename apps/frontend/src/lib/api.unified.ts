// Unified API Client using Supabase Auth
import { API_BASE_URL } from '../config/api';
import { supabase } from './supabase';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Type definitions (keeping existing ones)
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
  response_style?: string;
  custom_instruction?: string;
}

export interface ChatResponse {
  response: string;
  timestamp: string;
  questCards?: any[];
  metrics?: any;
}

export interface Memo {
  id: number;
  page_id?: string;
  project_id?: string;
  title?: string;
  content: string;
  order?: number;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

// Unified API Client using Supabase session management
class UnifiedApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get current Supabase session token
   */
  private async getSessionToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Make authenticated request with automatic token refresh
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      // Get fresh token from Supabase
      const token = await this.getSessionToken();
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // Add authorization header if we have a token
      if (token && endpoint !== '/auth/login' && endpoint !== '/auth/register') {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include', // Keep for cookie support if needed
      });

      // Handle 401 - try to refresh session
      if (response.status === 401 && endpoint !== '/auth/refresh') {
        console.log('Token expired, refreshing session...');
        const { data: { session }, error } = await supabase.auth.refreshSession();
        
        if (!error && session) {
          // Retry with new token
          headers['Authorization'] = `Bearer ${session.access_token}`;
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include',
          });
          
          const retryData = await retryResponse.json();
          
          if (!retryResponse.ok) {
            return { error: retryData.detail || 'API request failed' };
          }
          
          return { data: retryData };
        }
      }

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'API request failed' };
      }

      return { data };
    } catch (error) {
      console.error('API request error:', error);
      return { error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // ============= Auth endpoints (for legacy compatibility) =============
  
  async login(username: string, password: string): Promise<ApiResponse<any>> {
    // For backend compatibility, still call the endpoint
    // But actual auth is handled by Supabase
    const result = await this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    return result;
  }

  async register(username: string, password: string): Promise<ApiResponse<any>> {
    // For backend compatibility
    const result = await this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    return result;
  }

  // ============= Interest endpoints =============
  
  async createInterest(interest: string): Promise<ApiResponse<Interest>> {
    return this.request<Interest>('/interests', {
      method: 'POST',
      body: JSON.stringify({ interest }),
    });
  }

  async getInterests(): Promise<ApiResponse<Interest[]>> {
    return this.request<Interest[]>('/interests');
  }

  // ============= Goal endpoints =============
  
  async createGoal(interest: string, goal: string): Promise<ApiResponse<Goal>> {
    return this.request<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify({ interest, goal }),
    });
  }

  async getGoals(): Promise<ApiResponse<Goal[]>> {
    return this.request<Goal[]>('/goals');
  }

  // ============= Learning Plan endpoints =============
  
  async createLearningPlan(goal: string, nextStep: string): Promise<ApiResponse<LearningPlan>> {
    return this.request<LearningPlan>('/learning-plans', {
      method: 'POST',
      body: JSON.stringify({ goal, nextStep }),
    });
  }

  async getLearningPlans(): Promise<ApiResponse<LearningPlan[]>> {
    return this.request<LearningPlan[]>('/learning-plans');
  }

  // ============= Chat endpoints =============
  
  async sendChatMessage(message: ChatMessage): Promise<ApiResponse<ChatResponse>> {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  async getChatHistory(page?: string): Promise<ApiResponse<any[]>> {
    const endpoint = page ? `/chat/history?page=${page}` : '/chat/history';
    return this.request<any[]>(endpoint);
  }

  // ============= Memo endpoints =============
  
  async saveMemo(page_id: string, content: string): Promise<ApiResponse<Memo>> {
    return this.request<Memo>('/memos', {
      method: 'POST',
      body: JSON.stringify({ page_id, content }),
    });
  }

  async getMemo(page_id: string): Promise<ApiResponse<Memo>> {
    return this.request<Memo>(`/memos/${page_id}`);
  }

  async getAllMemos(): Promise<ApiResponse<Memo[]>> {
    return this.request<Memo[]>('/memos');
  }

  async deleteMemoByPageId(page_id: string): Promise<ApiResponse<{message: string, page_id: string}>> {
    return this.request(`/memos/${page_id}`, {
      method: 'DELETE',
    });
  }

  // ============= Project endpoints =============
  
  async createProject(name: string): Promise<ApiResponse<Project>> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getProjects(): Promise<ApiResponse<Project[]>> {
    return this.request<Project[]>('/projects');
  }

  async updateProject(id: string, name: string): Promise<ApiResponse<Project>> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<any>> {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // ============= Project-based Memo endpoints =============
  
  async createMemo(project_id: string, title: string, content: string = ''): Promise<ApiResponse<Memo>> {
    return this.request<Memo>('/memos', {
      method: 'POST',
      body: JSON.stringify({ project_id, title, content }),
    });
  }

  async getMemosByProject(project_id: string): Promise<ApiResponse<Memo[]>> {
    return this.request<Memo[]>(`/memos?project_id=${project_id}`);
  }

  async updateMemo(id: string, title: string, content: string, order: number): Promise<ApiResponse<Memo>> {
    return this.request<Memo>(`/memos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content, order }),
    });
  }

  async deleteMemo(id: string): Promise<ApiResponse<any>> {
    return this.request(`/memos/${id}`, {
      method: 'DELETE',
    });
  }

  // ============= Health check =============
  
  async healthCheck(): Promise<ApiResponse<{message: string, version: string}>> {
    return this.request('/');
  }
}

// Export singleton instance
export const apiClient = new UnifiedApiClient();

// React hook for using the API client
export const useApi = () => {
  return apiClient;
};

// Error handling helper
export const handleApiError = (error: string | undefined) => {
  if (error) {
    console.error('API Error:', error);
    // Add toast notification here if needed
  }
};

export default apiClient;

// ============= Quest System API (keeping existing implementation) =============

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
  getQuests: async (category?: string, difficulty?: number): Promise<Quest[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (difficulty) params.append('difficulty', difficulty.toString());
    
    const result = await apiClient.request<Quest[]>(`/quests?${params.toString()}`);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  getQuest: async (questId: number): Promise<Quest> => {
    const result = await apiClient.request<Quest>(`/quests/${questId}`);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  getUserQuests: async (status?: string): Promise<UserQuest[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    const result = await apiClient.request<UserQuest[]>(`/user-quests?${params.toString()}`);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  startQuest: async (questId: number): Promise<UserQuest> => {
    const result = await apiClient.request<UserQuest>('/user-quests/start', {
      method: 'POST',
      body: JSON.stringify({ quest_id: questId }),
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  submitQuest: async (userQuestId: number, submissionData: {
    description: string;
    file_url?: string;
    reflection_data?: any;
  }): Promise<QuestSubmission> => {
    const result = await apiClient.request<QuestSubmission>(`/user-quests/${userQuestId}/submit`, {
      method: 'POST',
      body: JSON.stringify(submissionData),
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  getQuestSubmission: async (userQuestId: number): Promise<QuestSubmission> => {
    const result = await apiClient.request<QuestSubmission>(`/user-quests/${userQuestId}/submission`);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },

  getQuestStats: async (): Promise<QuestStats> => {
    const result = await apiClient.request<QuestStats>('/quest-stats');
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },
};

// Theme Deep Dive API
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

export const themeDeepDiveApi = {
  generateSuggestions: async (request: ThemeDeepDiveRequest): Promise<ThemeDeepDiveResponse> => {
    const result = await apiClient.request<ThemeDeepDiveResponse>('/framework-games/theme-deep-dive/suggestions', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    return result.data!;
  },
  
  saveSelection: async (theme: string, path: string[]): Promise<void> => {
    const result = await apiClient.request<any>('/framework-games/theme-deep-dive/save-selection', {
      method: 'POST',
      body: JSON.stringify({ theme, path }),
    });
    
    if (result.error) {
      throw new Error(result.error);
    }
  },
};