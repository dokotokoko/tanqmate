/**
 * useChatService Hook
 * ChatServiceをReactコンポーネントで使いやすくするためのカスタムフック
 * 
 * 設計原則:
 * - Separation of Concerns: UI層とビジネスロジック層の分離
 * - Facade Pattern: 複雑な処理を簡潔なインターフェースで提供
 */

import { useState, useCallback } from 'react';
import { chatService, ChatMessage, ChatResponse, QuestCard } from '../services/chatService';

interface UseChatServiceReturn {
  // 状態
  isLoading: boolean;
  error: string | null;
  lastResponse: ChatResponse | null;
  
  // メソッド
  sendMessage: (message: string, options?: ChatMessageOptions) => Promise<void>;
  clearError: () => void;
}

interface ChatMessageOptions {
  context?: string;
  responseStyle?: string;
  customInstruction?: string;
}

/**
 * ChatServiceをReactで使用するためのカスタムフック
 * 
 * @example
 * const { sendMessage, isLoading, lastResponse } = useChatService();
 * 
 * // メッセージ送信
 * await sendMessage('こんにちは', {
 *   responseStyle: 'organize',
 *   context: '現在のメモ内容'
 * });
 * 
 * // クエストカードの取得
 * if (lastResponse?.questCards) {
 *   console.log('Quest cards:', lastResponse.questCards);
 * }
 */
export function useChatService(): UseChatServiceReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<ChatResponse | null>(null);

  /**
   * メッセージ送信
   */
  const sendMessage = useCallback(async (
    message: string,
    options?: ChatMessageOptions
  ): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const chatMessage: ChatMessage = {
        message,
        context: options?.context,
        responseStyle: options?.responseStyle,
        customInstruction: options?.customInstruction,
      };

      const response = await chatService.sendMessage(chatMessage);
      setLastResponse(response);
      
      // クエストカードのログ（デバッグ用）
      if (response.questCards && response.questCards.length > 0) {
        console.log('🎯 Quest cards received:', response.questCards);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      console.error('Chat service error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * エラークリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isLoading,
    error,
    lastResponse,
    sendMessage,
    clearError,
  };
}

/**
 * 会話履歴を管理するフック
 */
export function useChatHistory(limit: number = 20) {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await chatService.getChatHistory(limit);
      setHistory(data);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  return {
    history,
    isLoading,
    loadHistory,
  };
}