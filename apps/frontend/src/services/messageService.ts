/**
 * メッセージ管理サービス
 * Single Source of Truth (SSOT) の実装
 * データフロー: DB → API → Normalizer → Store → UI
 */

import { ApiRequestError, apiClient } from '../lib/api';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  questCards?: any[];
  conversation_id?: string;
  db_id?: string | number;
  sources?: any[];
}

interface APIMessage {
  id?: string | number;
  message_id?: string | number;
  role?: string;
  sender?: string;
  content?: string;
  message?: string;
  timestamp?: string;
  created_at?: string;
  conversation_id?: string;
  questCards?: any[];
  quest_cards?: any[];
  sources?: any[];
}

export class MessageService {
  private static instance: MessageService;

  private constructor() {
  }

  static getInstance(): MessageService {
    if (!MessageService.instance) {
      MessageService.instance = new MessageService();
    }
    return MessageService.instance;
  }

  /**
   * APIメッセージを正規化された形式に変換
   * Single Source of Truth: DBからのデータを統一形式に変換
   */
  private normalizeMessage(apiMessage: APIMessage): Message {
    // ID の決定（優先順位: id > message_id > 生成）
    const id = apiMessage.id || apiMessage.message_id || `msg-${Date.now()}-${Math.random()}`;
    const dbId = apiMessage.message_id || apiMessage.id;

    // Role の決定（sender フィールドをroleに変換）
    let role: 'user' | 'assistant';
    if (apiMessage.role) {
      role = apiMessage.role as 'user' | 'assistant';
    } else if (apiMessage.sender === 'user') {
      role = 'user';
    } else if (apiMessage.sender === 'ai' || apiMessage.sender === 'assistant') {
      role = 'assistant';
    } else {
      role = 'assistant'; // デフォルト
    }

    // Content の決定（優先順位: content > message > 空文字）
    const content = apiMessage.content || apiMessage.message || '';

    // Timestamp の決定と正規化
    let timestamp: Date;
    const timestampSource = apiMessage.timestamp || apiMessage.created_at;
    
    if (!timestampSource) {
      timestamp = new Date();
    } else {
      timestamp = new Date(timestampSource);
      // 無効な日付の場合は現在時刻
      if (isNaN(timestamp.getTime())) {
        timestamp = new Date();
      }
    }

    // Quest Cards の正規化（quest_cards -> questCards）
    const questCards = apiMessage.questCards || apiMessage.quest_cards;

    return {
      id: String(id),
      db_id: dbId,
      role,
      content,
      timestamp,
      conversation_id: apiMessage.conversation_id,
      questCards,
      sources: apiMessage.sources,
    };
  }

  /**
   * メッセージリストの正規化と重複除去
   */
  private normalizeMessages(apiMessages: APIMessage[]): Message[] {
    const normalized = apiMessages.map(msg => this.normalizeMessage(msg));
    
    // 重複除去（DB IDベースで判定）
    const uniqueMessages = normalized.reduce((acc: Message[], msg) => {
      const isDuplicate = acc.some(existing => {
        if (msg.db_id && existing.db_id) {
          return msg.db_id === existing.db_id;
        }
        return existing.id === msg.id;
      });
      
      if (!isDuplicate) {
        acc.push(msg);
      }
      return acc;
    }, []);

    // タイムスタンプでソート（古い順）
    return uniqueMessages.sort((a, b) => {
      const timeA = a.timestamp.getTime();
      const timeB = b.timestamp.getTime();
      return timeA - timeB;
    });
  }

  /**
   * DBから会話履歴を取得
   * 唯一の信頼できるデータソース
   * @param limit 取得件数の上限
   * @param conversationId 会話ID（オプション）。指定しない場合は最新のアクティブな会話を取得
   */
  async fetchChatHistory(limit: number = 50, conversationId?: string): Promise<Message[]> {
    try {
      // URLパラメータ構築
      const params = new URLSearchParams({
        limit: limit.toString(),
      });
      
      if (conversationId) {
        params.append('conversation_id', conversationId);
      }

      const apiMessages = await apiClient.requestJson<APIMessage[]>(`/chat/history?${params.toString()}`);
      console.log('📊 Fetched messages from DB:', apiMessages.length);

      // 正規化して返す
      return this.normalizeMessages(apiMessages);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        console.error('Failed to fetch chat history:', error.status, error.message);
      }
      console.error('Error fetching chat history:', error);
      return [];
    }
  }

  /**
   * 会話IDから履歴を取得
   */
  async fetchConversationMessages(conversationId: string): Promise<Message[]> {
    try {
      const apiMessages = await apiClient.requestJson<APIMessage[]>(
        `/conversations/${conversationId}/messages`
      );
      console.log(`📊 Fetched messages for conversation ${conversationId}:`, apiMessages.length);

      // 正規化して返す
      return this.normalizeMessages(apiMessages);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        console.error('Failed to fetch conversation messages:', error.status, error.message);
      }
      console.error('Error fetching conversation messages:', error);
      return [];
    }
  }

  /**
   * メッセージ送信（レスポンスも正規化）
   */
  async sendMessage(
    message: string,
    conversationId?: string,
    responseStyle?: string,
    customInstruction?: string,
    context?: string
  ): Promise<{ userMessage: Message; assistantMessage: Message; conversationId: string }> {
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date(),
      conversation_id: conversationId,
    };

    const result = await apiClient.requestJson<any>('/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId,
        response_style: responseStyle || 'auto',
        custom_instruction: customInstruction,
        context,
      }),
    });

    // AI応答を正規化
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: result.response,
      timestamp: new Date(),
      conversation_id: result.conversation_id || conversationId,
      questCards: result.questCards || result.quest_cards,
      sources: result.sources,
    };

    return {
      userMessage,
      assistantMessage,
      conversationId: result.conversation_id || conversationId || '',
    };
  }
}

// シングルトンインスタンスをエクスポート
export const messageService = MessageService.getInstance();
