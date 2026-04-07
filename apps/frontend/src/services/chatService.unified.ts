/**
 * Unified Chat Service using Supabase Auth
 * チャット機能のビジネスロジックとAPI通信を担当
 */

import { API_BASE_URL } from '../config/api';
import { supabase } from '../lib/supabase';

// Type definitions
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

export interface ChatLog {
  id?: string;
  user_id: string;
  page: string;
  sender: 'user' | 'ai';
  message: string;
  created_at: string;
}

/**
 * Unified ChatService using Supabase Auth
 */
export class UnifiedChatService {
  private apiBaseUrl: string;
  
  constructor(apiBaseUrl: string = API_BASE_URL) {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Get current Supabase session token
   */
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Build request headers with Supabase token
   */
  private async buildHeaders(): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  /**
   * Send chat message
   */
  async sendMessage(message: ChatMessage): Promise<ChatResponse> {
    const token = await this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    try {
      const headers = await this.buildHeaders();
      const response = await fetch(`${this.apiBaseUrl}/chat`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          message: message.message,
          context: message.context,
          response_style: message.responseStyle || 'auto',
          custom_instruction: message.customInstruction,
        }),
      });

      if (response.status === 401) {
        // Try to refresh session
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session) {
          // Retry with new token
          const retryResponse = await fetch(`${this.apiBaseUrl}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              message: message.message,
              context: message.context,
              response_style: message.responseStyle || 'auto',
              custom_instruction: message.customInstruction,
            }),
          });

          if (!retryResponse.ok) {
            throw new Error(`HTTP error! status: ${retryResponse.status}`);
          }

          return await retryResponse.json();
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Chat service error:', error);
      throw error;
    }
  }

  /**
   * Get chat history for a specific page
   */
  async getChatHistory(page: string): Promise<ChatLog[]> {
    try {
      const headers = await this.buildHeaders();
      const response = await fetch(`${this.apiBaseUrl}/chat/history?page=${encodeURIComponent(page)}`, {
        headers,
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('Failed to fetch chat history:', response.status);
        return [];
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }

  /**
   * Save chat log
   */
  async saveChatLog(log: Omit<ChatLog, 'id' | 'created_at'>): Promise<void> {
    try {
      const headers = await this.buildHeaders();
      await fetch(`${this.apiBaseUrl}/chat/log`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(log),
      });
    } catch (error) {
      console.error('Error saving chat log:', error);
    }
  }

  /**
   * Get conversation suggestions
   */
  async getSuggestions(context?: string): Promise<string[]> {
    try {
      const headers = await this.buildHeaders();
      const response = await fetch(`${this.apiBaseUrl}/chat/suggestions`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ context }),
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Error getting suggestions:', error);
      return [];
    }
  }

  /**
   * Save chat to Supabase directly (optional - for real-time features)
   */
  async saveToSupabase(page: string, sender: 'user' | 'ai', message: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('chat_logs')
        .insert({
          user_id: user.id,
          page,
          sender,
          message,
        });

      if (error) {
        console.error('Error saving to Supabase:', error);
      }
    } catch (error) {
      console.error('Error in saveToSupabase:', error);
    }
  }

  /**
   * Get chat history from Supabase directly (optional - for real-time features)
   */
  async getFromSupabase(page: string, limit: number = 50): Promise<ChatLog[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('chat_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('page', page)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('Error fetching from Supabase:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getFromSupabase:', error);
      return [];
    }
  }

  /**
   * Stream chat response (if backend supports it)
   */
  async *streamMessage(message: ChatMessage): AsyncGenerator<string, void, unknown> {
    const token = await this.getAuthToken();
    
    if (!token) {
      throw new Error('Authentication required. Please login.');
    }

    try {
      const headers = await this.buildHeaders();
      const response = await fetch(`${this.apiBaseUrl}/chat/stream`, {
        method: 'POST',
        headers,
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

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                yield parsed.content;
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream service error:', error);
      throw error;
    }
  }
}

// Singleton instance
export const chatService = new UnifiedChatService();

// React hook for using the chat service
export const useChatService = () => {
  return chatService;
};

export default chatService;