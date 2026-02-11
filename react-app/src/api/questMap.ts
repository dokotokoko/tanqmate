// 探Qマップ API クライアント

import { API_BASE_URL } from '../config/api';
import { tokenManager } from '../utils/tokenManager';
import type {
  CreateQuestRequest,
  CreateQuestResponse,
  GenerateNodesRequest,
  GenerateNodesResponse,
  BreakdownNodeRequest,
  BreakdownNodeResponse,
  ExpandNodeRequest,
  ExpandNodeResponse,
  CompleteNodeRequest,
  CompleteNodeResponse,
  ConsultAIRequest,
  ConsultAIResponse,
  Quest,
  QuestMapError
} from '../types/questMap';

class QuestMapAPIError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'QuestMapAPIError';
  }
}

class QuestMapAPI {
  constructor() {
    // API_BASE_URLは config/api.ts から取得（AIチャットと同じ方法）
    if (import.meta.env.DEV) {
      console.log('QuestMapAPI using API_BASE_URL:', API_BASE_URL);
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // デバッグ情報の詳細出力
    console.group('🔍 Quest Map API Request Details');
    console.log('📍 Endpoint:', endpoint);
    console.log('🌐 API_BASE_URL:', API_BASE_URL);
    console.log('🔗 Full URL will be:', `${API_BASE_URL}${endpoint}`);
    console.log('📋 Method:', options.method || 'GET');
    if (options.body) {
      console.log('📦 Request Body:', JSON.parse(options.body as string));
    }
    console.log('🌍 Current Location:', window.location.href);
    console.log('🏠 Origin:', window.location.origin);
    console.groupEnd();

    // AIチャットと同じ方法でURLを構築
    const url = `${API_BASE_URL}${endpoint}`;
    
    // 認証ヘッダーを設定
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    // 新しいトークンシステムを優先的に使用
    const tokenData = tokenManager.getTokens();
    if (tokenData?.access_token) {
      headers['Authorization'] = `${tokenData.token_type || 'Bearer'} ${tokenData.access_token}`;
    } else {
      // 旧システムのフォールバック
      const token = localStorage.getItem('auth-token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
      signal: AbortSignal.timeout(60000), // 60秒のタイムアウト設定
    };

    try {
      console.log('🚀 Sending request to:', url);
      console.log('🔑 Headers:', headers);
      
      const response = await fetch(url, config).catch((error) => {
        // タイムアウトエラーの場合
        if (error.name === 'AbortError') {
          console.error('⏰ Request timeout after 60 seconds');
          throw new QuestMapAPIError(
            'リクエストがタイムアウトしました。AIの応答生成に時間がかかっています。もう一度お試しください。',
            'TIMEOUT_ERROR',
            408
          );
        }
        throw error;
      });
      
      if (!response) {
        throw new QuestMapAPIError(
          'サーバーからの応答がありません',
          'NO_RESPONSE',
          503
        );
      }
      
      console.group('📨 Quest Map API Response');
      console.log('📊 Status:', response.status, response.statusText);
      console.log('✅ OK:', response.ok);
      console.log('🔗 Response URL:', response.url);
      console.groupEnd();

      if (response.status === 401) {
        // 認証エラーの場合、トークンをリフレッシュして再試行
        const refreshed = await tokenManager.refreshToken();
        if (refreshed) {
          const newTokenData = tokenManager.getTokens();
          if (newTokenData?.access_token) {
            headers['Authorization'] = `${newTokenData.token_type || 'Bearer'} ${newTokenData.access_token}`;
            config.headers = headers;
            const retryResponse = await fetch(url, config);
            if (!retryResponse.ok) {
              throw new QuestMapAPIError(
                `HTTP ${retryResponse.status}: ${retryResponse.statusText}`,
                'HTTP_ERROR',
                retryResponse.status
              );
            }
            return await retryResponse.json();
          }
        }
        
        // リフレッシュに失敗した場合
        throw new QuestMapAPIError(
          '認証が必要です',
          'AUTHENTICATION_REQUIRED',
          401
        );
      }

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('❌ Failed to parse error response:', e);
          errorData = { message: response.statusText };
        }

        console.error('❌ Quest Map API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorData,
          requestUrl: url,
          endpoint,
          method: options.method || 'GET'
        });

        throw new QuestMapAPIError(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          errorData.code || 'HTTP_ERROR',
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof QuestMapAPIError) {
        throw error;
      }

      // ネットワークエラーなど
      throw new QuestMapAPIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'NETWORK_ERROR',
        undefined,
        error
      );
    }
  }

  // クエスト作成
  async createQuest(request: CreateQuestRequest): Promise<any> {
    return this.makeRequest<CreateQuestResponse>('/api/quest-map/quests', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // クエスト取得
  async getQuest(questId: string): Promise<Quest> {
    return this.makeRequest<Quest>(`/api/quest-map/quests/${questId}`);
  }

  // ユーザーのクエスト一覧取得
  async getQuests(): Promise<Quest[]> {
    return this.makeRequest<Quest[]>('/api/quest-map/quests');
  }

  // ノード生成
  async generateNodes(request: any): Promise<any> {
    return this.makeRequest<GenerateNodesResponse>('/api/quest-map/nodes/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // ノード細分化
  async breakdownNode(request: BreakdownNodeRequest): Promise<BreakdownNodeResponse> {
    const nodeId = request.nodeId;
    const requestBody = { ...request };
    delete requestBody.nodeId;
    return this.makeRequest<BreakdownNodeResponse>(`/api/quest-map/nodes/${nodeId}/breakdown`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  // ノード拡散
  async expandNode(request: ExpandNodeRequest): Promise<ExpandNodeResponse> {
    const nodeId = request.nodeId;
    const requestBody = { ...request };
    delete requestBody.nodeId;
    return this.makeRequest<ExpandNodeResponse>(`/api/quest-map/nodes/${nodeId}/expand`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  // ノード完了
  async completeNode(request: CompleteNodeRequest): Promise<CompleteNodeResponse> {
    const nodeId = request.nodeId;
    const requestBody = { ...request };
    delete requestBody.nodeId;
    return this.makeRequest<CompleteNodeResponse>(`/api/quest-map/nodes/${nodeId}/complete`, {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  // AIに相談
  async consultAI(request: ConsultAIRequest): Promise<ConsultAIResponse> {
    return this.makeRequest<ConsultAIResponse>('/api/quest-map/ai/consult', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // ノード位置更新
  async updateNodePosition(
    questId: string,
    nodeId: string,
    position: { x: number; y: number }
  ): Promise<void> {
    return this.makeRequest<void>(`/quest-map/quests/${questId}/nodes/${nodeId}/position`, {
      method: 'PUT',
      body: JSON.stringify(position),
    });
  }

  // ノード更新
  async updateNode(
    questId: string,
    nodeId: string,
    updates: Partial<{
      title: string;
      description: string;
      userNote: string;
      status: string;
    }>
  ): Promise<void> {
    return this.makeRequest<void>(`/quest-map/quests/${questId}/nodes/${nodeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // クエスト削除
  async deleteQuest(questId: string): Promise<void> {
    return this.makeRequest<void>(`/quest-map/quests/${questId}`, {
      method: 'DELETE',
    });
  }

  // ノード削除
  async deleteNode(questId: string, nodeId: string): Promise<void> {
    return this.makeRequest<void>(`/quest-map/quests/${questId}/nodes/${nodeId}`, {
      method: 'DELETE',
    });
  }
}

// シングルトンインスタンス
export const questMapAPI = new QuestMapAPI();

// エラークラスをエクスポート
export { QuestMapAPIError };

// ヘルパー関数
export const isQuestMapAPIError = (error: any): error is QuestMapAPIError => {
  return error instanceof QuestMapAPIError;
};

export const handleQuestMapError = (error: unknown): QuestMapError => {
  if (isQuestMapAPIError(error)) {
    return {
      code: error.code,
      message: error.message,
      details: error.details,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unknown error occurred',
  };
};