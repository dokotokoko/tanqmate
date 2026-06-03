/**
 * Chat Service
 * チャット機能のビジネスロジックとAPI通信を担当
 * 
 * OOP設計原則:
 * - Single Responsibility: チャット関連の処理のみを担当
 * - Dependency Inversion: インターフェースを通じて依存関係を管理
 */

import { ApiRequestError, apiClient } from '../lib/api';

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
  /**
   * チャットメッセージの送信
   * 
   * @param message - 送信するメッセージ内容
   * @returns ChatResponse - AI応答とクエストカード
   */
  async sendMessage(message: ChatMessage): Promise<ChatResponse> {
    try {
      const data = await apiClient.requestJson<any>('/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: message.message,
          context: message.context,
          response_style: message.responseStyle || 'auto',
          custom_instruction: message.customInstruction,
        }),
      });
      
      // レスポンスの正規化
      return this.normalizeResponse(data);
    } catch (error) {
      console.error('Chat API error:', error);
      if (error instanceof ApiRequestError) {
        throw new Error(error.message);
      }
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
    try {
      return await apiClient.requestJson<any[]>(`/chat/history?limit=${limit}`);
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
      return [];
    }
  }

  /**
   * 新しい会話セッションの作成
   */
  async createConversation(sessionType: string = 'general'): Promise<string | null> {
    try {
      const result = await apiClient.requestJson<{ id: string }>('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          title: '',
          metadata: {
            source: 'chat_service',
            created_via: 'ai_chat_component',
            session_type: sessionType,
          },
        }),
      });
      return result.id;
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
