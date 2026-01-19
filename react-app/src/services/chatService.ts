/**
 * Chat Service
 * チャット機能のビジネスロジックとAPI通信を担当
 * 
 * OOP設計原則:
 * - Single Responsibility: チャット関連の処理のみを担当
 * - Dependency Inversion: インターフェースを通じて依存関係を管理
 */

import { API_BASE_URL } from '../config/api';

// 型定義（インターフェース）
export interface QuestCard {
  id: string;
  label: string;
  emoji: string;
  color: 'teal' | 'yellow' | 'purple' | 'pink' | 'green';
}

export interface ChatMessage {
  message: string;
  context?: string;
  responseStyle?: string;
  customInstruction?: string;
}

export interface ChatResponse {
  response: string;
  questCards?: QuestCard[];
  metrics?: {
    db_fetch_time: number;
    llm_response_time: number;
    db_save_time: number;
    total_time: number;
  };
  isSplit?: boolean;
  responseChunks?: string[];
  originalLength?: number;
}

/**
 * ChatService クラス
 * チャット機能の中核となるサービス層
 */
export class ChatService {
  private apiBaseUrl: string;
  
  constructor(apiBaseUrl: string = API_BASE_URL) {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * 認証トークンの取得
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth-token');
  }

  /**
   * APIリクエストヘッダーの構築
   */
  private buildHeaders(): HeadersInit {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  /**
   * チャットメッセージの送信
   * 
   * @param message - 送信するメッセージ内容
   * @returns ChatResponse - AI応答とクエストカード
   */
  async sendMessage(message: ChatMessage): Promise<ChatResponse> {
    const token = this.getAuthToken();
    
    // 認証チェック
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/chat`, {
        method: 'POST',
        headers: this.buildHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          message: message.message,
          context: message.context,
          response_style: message.responseStyle || 'auto',
          custom_instruction: message.customInstruction,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // レスポンスの正規化
      return this.normalizeResponse(data);
    } catch (error) {
      console.error('Chat API error:', error);
      throw error;
    }
  }

  /**
   * レスポンスの正規化
   * バックエンドのレスポンス形式を統一されたChatResponse型に変換
   */
  private normalizeResponse(data: any): ChatResponse {
    return {
      response: data.response || '',
      questCards: data.quest_cards || [],
      metrics: data.metrics,
      isSplit: data.is_split || false,
      responseChunks: data.response_chunks,
      originalLength: data.original_length,
    };
  }

  /**
   * 会話履歴の取得
   */
  async getChatHistory(limit: number = 20): Promise<any[]> {
    const token = this.getAuthToken();
    
    if (!token) {
      return [];
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/chat/history?limit=${limit}`, {
        headers: this.buildHeaders(),
        credentials: 'include',
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      return [];
    }
  }

  /**
   * 新しい会話セッションの作成
   */
  async createConversation(sessionType: string = 'general'): Promise<string | null> {
    const token = this.getAuthToken();
    
    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/conversations`, {
        method: 'POST',
        headers: this.buildHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          title: '',
          metadata: {
            source: 'chat_service',
            created_via: 'ai_chat_component',
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return result.id;
      }
      return null;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      return null;
    }
  }
}

// シングルトンインスタンスのエクスポート
export const chatService = new ChatService();

// デフォルトエクスポート
export default ChatService;