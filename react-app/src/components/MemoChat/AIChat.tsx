import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  Avatar,
  Stack,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  NoteAdd as MemoIcon,
  History as HistoryIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import ChatHistory from './ChatHistory';
import SmartNotificationManager, { SmartNotificationManagerRef } from '../SmartNotificationManager';
import { useChatStore } from '../../stores/chatStore';
import { AI_INITIAL_MESSAGE } from '../../constants/aiMessages';
import { useAIChatMessages } from '../../hooks/useAIChatMessages';
import ResponseStyleSelector, { ResponseStyle } from './ResponseStyleSelector';
import { SuggestionChips } from './SuggestionChips';
import { ResponseStyleBadge } from './ResponseStyleBadge';
import { ProgressTracker } from './ProgressTracker';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string | undefined | null;
  // 分割表示用フィールド
  chunks?: string[];
  isSplit?: boolean;
  originalLength?: number;
  // 質問明確化機能用フィールド
  is_clarification?: boolean;
  clarification_questions?: string[];
  suggestion_options?: string[];
  // 応答スタイル表示用フィールド
  response_style_used?: string;
}

interface AIChatProps {
  isDashboard?: boolean;  // ダッシュボードかどうかのフラグ
  title: string;
  initialMessage?: string;
  initialAIResponse?: string;
  memoContent?: string; // 使用しないが、既存コンポーネントとの互換性のため残す
  currentMemoContent?: string; // 現在のメモコンテンツ（動的更新用）
  currentMemoTitle?: string; // 現在のメモタイトル（動的更新用）
  onMessageSend?: (message: string, memoContent: string) => Promise<string>;
  onClose?: () => void;
  autoStart?: boolean; // 自動開始フラグ
  onOpenMemo?: () => void; // メモ帳を開く（Step2用）
  showMemoButton?: boolean; // メモ帳ボタンを表示するか
  hideMemoButton?: boolean; // メモ帳ボタンを隠すか（メモ帳が開いているときなど）
  forceRefresh?: boolean; // 強制的にメッセージをクリアして再初期化
  loadHistoryFromDB?: boolean; // データベースから履歴を読み込むか
  isInitializing?: boolean; // 初期化中かどうか（外部から制御）
  enableSmartNotifications?: boolean; // スマート通知機能を有効にするか
  onActivityRecord?: (message: string, sender: 'user' | 'ai') => void; // 学習活動記録
  persistentMode?: boolean; // 継続モード（メモ切り替えでリセットしない）
}

const AIChat: React.FC<AIChatProps> = ({
  isDashboard = false,
  initialMessage,
  initialAIResponse,
  memoContent = '',
  currentMemoContent = '',
  currentMemoTitle = '',
  onMessageSend,
  onClose,
  autoStart = false,
  onOpenMemo,
  showMemoButton = false,
  hideMemoButton = false,
  forceRefresh = false,
  loadHistoryFromDB = true,
  isInitializing = false,
  enableSmartNotifications = true,
  onActivityRecord,
  persistentMode = false,
}) => {
  // 統一されたメッセージ管理フックを使用
  const { messages, addMessage, setMessages, clearMessages } = useAIChatMessages();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // 会話管理機能
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  
  // 応答スタイルの状態
  const [responseStyle, setResponseStyle] = useState<ResponseStyle | null>(null);
  // responseStyleの最新値を保持するref（クロージャ問題対策）
  const responseStyleRef = useRef<ResponseStyle | null>(null);

  // ストリーミング用の状態
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);

  // responseStyleが変更されたらrefも更新
  useEffect(() => {
    responseStyleRef.current = responseStyle;
    console.log('📝 responseStyleRef更新:', responseStyle?.id);
  }, [responseStyle]);

  // 通知システムのref
  const notificationManagerRef = useRef<SmartNotificationManagerRef>(null);

  // ゲーミフィケーション: ステップカウンター
  const [stepCount, setStepCount] = useState(0);

  // 初期化管理用のref
  const initializationKeyRef = useRef('initialized');

  // デバッグ: responseStyleの状態変更を監視
  useEffect(() => {
    console.log('🎯 AIChat: responseStyle changed:', responseStyle?.id || 'null', responseStyle);
  }, [responseStyle]);

  // タイマー管理用
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  // デフォルトの初期メッセージを返す関数
  const getDefaultInitialMessage = (): string => {
    return AI_INITIAL_MESSAGE;
  };

  // スクロール位置の監視
  const checkScrollPosition = () => {
    const container = messageListRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // スクロール位置が90%以上の場合は最下部近くと判定
    setShouldAutoScroll(scrollPercentage > 0.9);
  };

  // スクロールイベントハンドラ（イベント駆動）
  const scrollTimeoutRef = useRef<number>();

  const setupScrollHandling = useCallback(() => {
    const container = messageListRef.current;
    if (!container) return null;

    const handleScroll = () => {
      setIsUserScrolling(true);
      checkScrollPosition();
      
      // スクロール停止後、少し待ってからユーザースクロールフラグをリセット
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsUserScrolling(false);
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // メッセージクリア関数（イベント駆動）
  const clearMessagesIfNeeded = useCallback(() => {
    if (forceRefresh) {
      clearMessages();
      setHistoryLoaded(false);
      setShouldAutoScroll(true);
      setIsUserScrolling(false);
      initializationKeyRef.current = 'initialized';
      return true; // クリアが実行されたことを示す
    }
    return false;
  }, [forceRefresh, clearMessages]);

  // ストア同期関数（カスタムフックで管理されるため不要）
  const syncMessagesFromStore = useCallback(() => {
    // カスタムフックが自動的に同期するため、ここでは何もしない
  }, []);

  // タイマー管理ヘルパー
  const setManagedTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  // 対話履歴読み込み関数（イベント駆動）
  const loadChatHistory = useCallback(async () => {
    // ページリロードの検出
    // performance.navigation.type === 1 はリロード
    // performance.getEntriesByType('navigation')でも判定可能
    const isPageReload = performance.navigation?.type === 1 || 
                        (performance.getEntriesByType?.('navigation')[0] as any)?.type === 'reload';
    
    // リロード時は履歴読み込みフラグをリセットして最新データを取得
    if (isPageReload && historyLoaded) {
      setHistoryLoaded(false);
      // リロード時は既存のメッセージをクリアして最新を取得
      clearMessages();
      return; // 次のレンダリングサイクルで再度呼ばれる
    }
    
    if (!loadHistoryFromDB || historyLoaded) return;

    try {
      // 認証トークンを取得
      const token = localStorage.getItem('auth-token');
      if (!token) return;

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      // グローバルチャット履歴を取得
      const historyUrl = `${apiBaseUrl}/chat/history`;
      const response = await fetch(historyUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const history = await response.json();
        const historyMessages: Message[] = history.map((item: any, index: number) => ({
          id: item.id ? item.id.toString() : `history-${index}-${Date.now()}`,
          role: item.sender === 'user' ? 'user' : 'assistant',
          content: item.message || '',
          timestamp: item.created_at ? new Date(item.created_at) : new Date(),
        }));

        // ダッシュボードの場合は空の履歴
        if (isDashboard) {
          // ダッシュボードは初期メッセージのみ表示
          const initialMessage: Message = {
            id: `initial-${Date.now()}`,
            role: 'assistant',
            content: getDefaultInitialMessage(),
            timestamp: new Date(),
          };
          setMessages([initialMessage]);
        } else {
          // その他は全てグローバル履歴を表示
          setMessages(historyMessages);
        }
        
        setHistoryLoaded(true);
        
        // 履歴読み込み後に最下部にスクロール
        setManagedTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
      }
    } catch (error) {
      console.error('対話履歴の読み込みエラー:', error);
      setHistoryLoaded(true); // エラーでも処理を続行
    }
  }, [isDashboard, loadHistoryFromDB, historyLoaded, clearMessages, setMessages]);

  // 初期メッセージ設定関数（イベント駆動）
  const loadInitialMessages = useCallback(async () => {
    // 履歴読み込みが有効で、ダッシュボードの場合は履歴読み込み処理に任せる
    if (loadHistoryFromDB && isDashboard) {
      return;
    }
    
    // 既にメッセージがある場合はスキップ
    if (messages.length > 0) return;
    
    // 履歴読み込み中の場合はスキップ
    if (loadHistoryFromDB && !historyLoaded) return;
    
    const initialMessages: Message[] = [];
    
    // autoStartの場合、初期AI応答を設定
    if (autoStart && initialAIResponse) {
      initialMessages.push({
        id: `initial-response-${Date.now()}`,
        role: 'assistant',
        content: initialAIResponse,
        timestamp: new Date(),
      });
    } else {
      // デフォルトの初期メッセージを表示
      initialMessages.push({
        id: `initial-${Date.now()}`,
        role: 'assistant',
        content: getDefaultInitialMessage(),
        timestamp: new Date(),
      });
    }
    
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
      // 初期化完了を記録
      initializationKeyRef.current = 'initialized';
    }
  }, [initialMessage, initialAIResponse, isDashboard, loadHistoryFromDB, historyLoaded, messages.length, autoStart]);

  // 自動スクロール処理（イベント駆動）
  const previousMessageCountRef = useRef(0);
  
  const scrollToBottomIfNeeded = useCallback(() => {
    // メッセージが新しく追加された場合かつ、ユーザーがスクロール中でない、かつ自動スクロールが有効な場合のみ実行
    if (messages.length > previousMessageCountRef.current && !isUserScrolling && shouldAutoScroll) {
      setManagedTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    previousMessageCountRef.current = messages.length;
  }, [messages, isUserScrolling, shouldAutoScroll, setManagedTimeout]);



  // 選択肢クリック時のハンドラー
  const handleSuggestionClick = async (option: string) => {
    if (isLoading || isSendingRef.current) return;

    // デバッグログ: handleSuggestionClick開始時のresponseStyle確認
    console.log('🎯 handleSuggestionClick開始時のresponseStyle:', responseStyle?.id, responseStyle);

    // ゲーミフィケーション: ステップカウンターをインクリメント
    setStepCount(prev => prev + 1);

    // ハプティックフィードバック（モバイル対応）
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // 選択肢をinputValueにセットしてからメッセージ送信
    setInputValue(option);

    // わずかに遅延させてから送信（UIフィードバックのため）
    setTimeout(async () => {
      // handleSendMessageと同じロジックを実行
      if (!option.trim() || isLoading || isSendingRef.current) return;

      // 二重送信防止フラグ
      isSendingRef.current = true;

      // 会話IDが存在しない場合は新しい会話を作成
      let conversationId = currentConversationId;
      if (!conversationId) {
        conversationId = await createNewConversation();
        if (conversationId) {
          setCurrentConversationId(conversationId);
          console.log('🆕 メッセージ送信前に新しい会話を作成:', conversationId);
        }
      }

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: option,
        timestamp: new Date(),
      };

      // 統一されたフックでメッセージ追加
      addMessage(userMessage);
      setInputValue('');
      setIsLoading(true);

      // 学習活動記録
      if (onActivityRecord) {
        onActivityRecord(userMessage.content, 'user');
      }
      // 通知システムにも記録
      notificationManagerRef.current?.recordActivity(userMessage.content, 'user');

      // メッセージ送信時は条件付きで最下部にスクロール
      scrollToBottomIfNeeded();

      try {
        let aiResponse = '';

        if (onMessageSend) {
          // 継続モードの場合は現在のメモコンテンツを使用、そうでなければ従来通り
          const contextContent = persistentMode ? currentMemoContent : memoContent;
          // 応答スタイルをAPIに渡す
          const messageWithStyle = responseStyle ?
            `[応答スタイル: ${responseStyle.label}]\n${userMessage.content}` :
            userMessage.content;
          aiResponse = await onMessageSend(messageWithStyle, contextContent);
        } else {
          // データベース対応のチャットAPIを使用
          const token = localStorage.getItem('auth-token');
          if (token) {
            const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
            // デバッグログ: handleSuggestionClick内のfetch直前のresponseStyle確認（refを使用）
            const currentResponseStyle = responseStyleRef.current;
            console.log('📤 handleSuggestionClick fetch直前のresponseStyle (ref):', currentResponseStyle?.id, currentResponseStyle);
            const response = await fetch(`${apiBaseUrl}/chat`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              credentials: 'include',
              body: JSON.stringify({
                message: userMessage.content,
                context: persistentMode ? `現在のメモ: ${currentMemoTitle}\n\n${currentMemoContent}` : undefined,
                response_style: currentResponseStyle?.id || 'auto',
                custom_instruction: currentResponseStyle?.customInstruction || undefined,
              }),
            });

            if (response.ok) {
              const result = await response.json();

              // 質問明確化機能用フィールドを保存
              const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: result.response,
                timestamp: new Date(),
                is_clarification: result.is_clarification || false,
                clarification_questions: result.clarification_questions || [],
                suggestion_options: result.suggestion_options || [],
                response_style_used: result.response_style_used,
              };
              addMessage(assistantMessage);

              // 学習活動記録（AI応答）
              if (onActivityRecord) {
                onActivityRecord(assistantMessage.content, 'ai');
              }
              // 通知システムにも記録
              notificationManagerRef.current?.recordActivity(assistantMessage.content, 'ai');

              // AI応答完了時も条件付きで最下部にスクロール
              setManagedTimeout(() => scrollToBottomIfNeeded(), 200);

              setIsLoading(false);
              isSendingRef.current = false;
              inputRef.current?.focus();
              return; // 早期リターン
            } else {
              throw new Error('API応答エラー');
            }
          } else {
            // フォールバック処理
            await new Promise(resolve => setTimeout(resolve, 1000));
            aiResponse = `「${userMessage.content}」について理解しました。さらに詳しく教えてください。`;
          }
        }

        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        };

        // 統一されたフックでAI応答を追加
        addMessage(assistantMessage);

        // 学習活動記録（AI応答）
        if (onActivityRecord) {
          onActivityRecord(assistantMessage.content, 'ai');
        }
        // 通知システムにも記録
        notificationManagerRef.current?.recordActivity(assistantMessage.content, 'ai');

        // AI応答完了時も条件付きで最下部にスクロール
        setManagedTimeout(() => scrollToBottomIfNeeded(), 200);
      } catch (error) {
        console.error('AI応答エラー:', error);
        const errorMessage: Message = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: '申し訳ございません。応答の生成中にエラーが発生しました。もう一度お試しください。',
          timestamp: new Date(),
        };
        // 統一されたフックでエラーメッセージを追加
        addMessage(errorMessage);
      } finally {
        setIsLoading(false);
        isSendingRef.current = false;
        inputRef.current?.focus();
      }
    }, 100);
  };

  // ストリーミングフェッチ関数
  const streamingFetch = async (
    message: string,
    responseStyleId: string | null,
    customInstruction: string | undefined
  ): Promise<{ response: string; response_style_used?: string; suggestion_options?: string[] }> => {
    const token = localStorage.getItem('auth-token');
    if (!token) {
      throw new Error('認証トークンが見つかりません');
    }

    const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiBaseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        message: message,
        context: persistentMode ? `現在のメモ: ${currentMemoTitle}\n\n${currentMemoContent}` : undefined,
        response_style: responseStyleId || 'auto',
        custom_instruction: customInstruction,
      }),
    });

    if (!response.ok) {
      throw new Error(`API応答エラー: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('ストリームの読み取りに失敗しました');
    }

    const decoder = new TextDecoder();
    let fullResponse = '';
    let responseStyleUsed: string | undefined;
    let suggestionOptions: string[] | undefined;
    let parsedMessage: string | undefined;

    setIsStreaming(true);
    setStreamingContent('');

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));

        for (const line of lines) {
          try {
            const jsonStr = line.slice(6); // "data: " を削除
            const data = JSON.parse(jsonStr);

            if (data.chunk) {
              fullResponse += data.chunk;
              setStreamingContent(fullResponse);
            } else if (data.done) {
              responseStyleUsed = data.response_style_used;
              // selectスタイルの場合、パース済みデータを取得
              if (data.suggestion_options) {
                suggestionOptions = data.suggestion_options;
              }
              if (data.parsed_message) {
                parsedMessage = data.parsed_message;
              }
            } else if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseError) {
            // JSON パースエラーは無視（不完全なチャンクの場合）
            console.debug('SSEパースエラー（無視）:', parseError);
          }
        }
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }

    return {
      response: parsedMessage || fullResponse,
      response_style_used: responseStyleUsed,
      suggestion_options: suggestionOptions,
    };
  };

  // メッセージ送信処理（二重送信防止付き）
  const isSendingRef = useRef(false);
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isSendingRef.current) return;

    // デバッグログ: 送信時のresponseStyle確認
    console.log('🚀 handleSendMessage開始時のresponseStyle:', responseStyle?.id, responseStyle);

    // 二重送信防止フラグ
    isSendingRef.current = true;

    // 会話IDが存在しない場合は新しい会話を作成
    let conversationId = currentConversationId;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (conversationId) {
        setCurrentConversationId(conversationId);
        console.log('🆕 メッセージ送信前に新しい会話を作成:', conversationId);
      }
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // 統一されたフックでメッセージ追加
    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);
    
    // 学習活動記録
    if (onActivityRecord) {
      onActivityRecord(userMessage.content, 'user');
    }
    // 通知システムにも記録
    notificationManagerRef.current?.recordActivity(userMessage.content, 'user');
    
    // メッセージ送信時は条件付きで最下部にスクロール
    scrollToBottomIfNeeded();

    try {
      let aiResponse = '';
      
      if (onMessageSend) {
        // 継続モードの場合は現在のメモコンテンツを使用、そうでなければ従来通り
        const contextContent = persistentMode ? currentMemoContent : memoContent;
        // 応答スタイルをAPIに渡す
        const messageWithStyle = responseStyle ? 
          `[応答スタイル: ${responseStyle.label}]\n${userMessage.content}` : 
          userMessage.content;
        aiResponse = await onMessageSend(messageWithStyle, contextContent);
      } else {
        // データベース対応のチャットAPIを使用（ストリーミング優先）
        const token = localStorage.getItem('auth-token');
        if (token) {
          const currentResponseStyle = responseStyleRef.current;
          console.log('📤 fetch直前のresponseStyle (ref):', currentResponseStyle?.id, currentResponseStyle);

          // ストリーミングAPIを優先使用
          try {
            console.log('🌊 ストリーミングモードで送信開始');
            const streamResult = await streamingFetch(
              userMessage.content,
              currentResponseStyle?.id || null,
              currentResponseStyle?.customInstruction
            );

            // ストリーミング完了後、メッセージを追加
            const assistantMessage: Message = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: streamResult.response,
              timestamp: new Date(),
              response_style_used: streamResult.response_style_used,
              suggestion_options: streamResult.suggestion_options || [],
            };

            addMessage(assistantMessage);

            // 学習活動記録（AI応答）
            if (onActivityRecord) {
              onActivityRecord(assistantMessage.content, 'ai');
            }
            notificationManagerRef.current?.recordActivity(assistantMessage.content, 'ai');

            setManagedTimeout(() => scrollToBottomIfNeeded(), 200);

            setIsLoading(false);
            isSendingRef.current = false;
            inputRef.current?.focus();
            return; // 早期リターン

          } catch (streamError) {
            console.warn('⚠️ ストリーミング失敗、通常APIにフォールバック:', streamError);
            // フォールバック: 通常のAPIを使用
          }

          // フォールバック: 従来の非ストリーミングAPI
          const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiBaseUrl}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              message: userMessage.content,
              context: persistentMode ? `現在のメモ: ${currentMemoTitle}\n\n${currentMemoContent}` : undefined,
              response_style: currentResponseStyle?.id || 'auto',
              custom_instruction: currentResponseStyle?.customInstruction || undefined,
            }),
          });

          if (response.ok) {
            const result = await response.json();

            // 分割情報がある場合は対応
            if (result.is_split && result.response_chunks) {
              // 分割されたレスポンスを保存
              const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: result.response, // 最初のチャンク
                chunks: result.response_chunks,
                isSplit: true,
                originalLength: result.original_length,
                timestamp: new Date(),
                // 質問明確化機能用フィールド
                is_clarification: result.is_clarification || false,
                clarification_questions: result.clarification_questions || [],
                suggestion_options: result.suggestion_options || [],
                response_style_used: result.response_style_used,
              };

              // 統一されたフックでAI応答を追加
              addMessage(assistantMessage);

              // 学習活動記録（AI応答）
              if (onActivityRecord) {
                onActivityRecord(result.response_chunks.join(''), 'ai');
              }
              // 通知システムにも記録
              notificationManagerRef.current?.recordActivity(result.response_chunks.join(''), 'ai');

              // AI応答完了時も条件付きで最下部にスクロール
              setManagedTimeout(() => scrollToBottomIfNeeded(), 200);

              setIsLoading(false);
              isSendingRef.current = false;
              inputRef.current?.focus();
              return; // 早期リターン
            } else {
              aiResponse = result.response;
              // 質問明確化機能用フィールドを保存（通常応答の場合）
              const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
                is_clarification: result.is_clarification || false,
                clarification_questions: result.clarification_questions || [],
                suggestion_options: result.suggestion_options || [],
                response_style_used: result.response_style_used,
              };
              addMessage(assistantMessage);

              // 学習活動記録（AI応答）
              if (onActivityRecord) {
                onActivityRecord(assistantMessage.content, 'ai');
              }
              // 通知システムにも記録
              notificationManagerRef.current?.recordActivity(assistantMessage.content, 'ai');

              // AI応答完了時も条件付きで最下部にスクロール
              setManagedTimeout(() => scrollToBottomIfNeeded(), 200);

              setIsLoading(false);
              isSendingRef.current = false;
              inputRef.current?.focus();
              return; // 早期リターン
            }
          } else {
            throw new Error('API応答エラー');
          }
        } else {
          // フォールバック処理
          await new Promise(resolve => setTimeout(resolve, 1000));
          aiResponse = `「${userMessage.content}」について理解しました。さらに詳しく教えてください。`;
        }
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),  
      };

      // 統一されたフックでAI応答を追加
      addMessage(assistantMessage);
      
      // 学習活動記録（AI応答）
      if (onActivityRecord) {
        onActivityRecord(assistantMessage.content, 'ai');
      }
      // 通知システムにも記録
      notificationManagerRef.current?.recordActivity(assistantMessage.content, 'ai');
      
      // AI応答完了時も条件付きで最下部にスクロール
      setManagedTimeout(() => scrollToBottomIfNeeded(), 200);
    } catch (error) {
      console.error('AI応答エラー:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '申し訳ございません。応答の生成中にエラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      };
      // 統一されたフックでエラーメッセージを追加
      addMessage(errorMessage);
      
      // エラーメッセージ表示時も条件付きで最下部にスクロール
      setManagedTimeout(() => scrollToBottomIfNeeded(), 200);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false; // 二重送信防止フラグをリセット
      inputRef.current?.focus();
    }
  };

  // Enterキーでメッセージ送信
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: Date | string | undefined | null) => {
    try {
      // timestampがnullまたはundefinedの場合は現在時刻を使用
      if (!timestamp) {
        return new Date().toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      // 文字列の場合はDateオブジェクトに変換
      let date: Date;
      if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        // その他の型の場合は現在時刻を使用
        date = new Date();
      }
      
      // 無効な日付の場合は現在時刻を使用
      if (isNaN(date.getTime())) {
        date = new Date();
      }
      
      return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('formatTime error:', error, 'timestamp:', timestamp);
      // エラーが発生した場合は現在時刻を返す
      return new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // 履歴セッション選択時の処理
  const handleSessionSelect = (session: any) => {
    const historyMessages: Message[] = session.messages.map((item: any) => ({
      id: item.id.toString(),
      role: item.sender === 'user' ? 'user' : 'assistant',
      content: item.message,
      timestamp: item.created_at ? new Date(item.created_at) : new Date(),
    }));
    
    // 会話IDを設定（sessionに含まれている場合）
    if (session.conversation_id) {
      setCurrentConversationId(session.conversation_id);
      console.log('📋 会話を切り替えました:', session.conversation_id);
    }
    
    setMessages(historyMessages);
    setIsHistoryOpen(false);
    setShouldAutoScroll(true);
    
    // 最下部にスクロール
    setManagedTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 新しい会話を作成
  const createNewConversation = async (): Promise<string | null> => {
    try {
      setConversationLoading(true);
      
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.error('認証トークンが見つかりません');
        return null;
      }
      
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: '', // 空文字列に変更（バックエンドで自動生成）
          metadata: {
            source: 'new_chat_button',
            created_via: 'ai_chat_component'
          }
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        return result.id;
      } else {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        console.error('新しい会話の作成に失敗:', {
          status: response.status,
          error: errorData,
          detail: errorData.detail || errorData
        });
        return null;
      }
    } catch (error) {
      console.error('新しい会話の作成エラー:', error);
      return null;
    } finally {
      setConversationLoading(false);
    }
  };

  // 新しいチャット開始
  const handleNewChat = async () => {
    clearMessages();
    setIsHistoryOpen(false);
    setShouldAutoScroll(true);
    
    // 新しい会話を作成
    const newConversationId = await createNewConversation();
    if (newConversationId) {
      setCurrentConversationId(newConversationId);
      console.log('🆕 新しい会話を作成しました:', newConversationId);
    }
    
    // 初期メッセージがある場合は設定、なければデフォルトメッセージを使用
    const messageContent = initialMessage || getDefaultInitialMessage();
    const initialMsg: Message = {
      id: `initial-${Date.now()}`,
      role: 'assistant',
      content: messageContent,
      timestamp: new Date(),
    };
    addMessage(initialMsg);
  };

  // コンポーネントマウント時のリセット処理
  useEffect(() => {
    // コンポーネントが新規マウントされた場合（リロード含む）
    // historyLoadedフラグをリセットして最新データの取得を可能にする
    const isFirstMount = !historyLoaded && messages.length === 0;
    if (isFirstMount && loadHistoryFromDB) {
      // 初回マウント時は履歴読み込みフラグをリセット
      setHistoryLoaded(false);
    }
  }, []); // 空の依存配列で初回マウント時のみ実行

  // 初期化とクリーンアップ
  useEffect(() => {
    const wasCleared = clearMessagesIfNeeded();
    if (!wasCleared) {
      syncMessagesFromStore();
      if (!historyLoaded && loadHistoryFromDB) {
        loadChatHistory();
      } else if (!loadHistoryFromDB || historyLoaded) {
        loadInitialMessages();
      }
    }
  }, [forceRefresh, clearMessagesIfNeeded, syncMessagesFromStore, loadChatHistory, loadInitialMessages, loadHistoryFromDB, historyLoaded]);

  // スクロール処理の設定
  useEffect(() => {
    const cleanup = setupScrollHandling();
    return cleanup;
  }, [setupScrollHandling]);
  
  // メッセージ変更時のスクロール
  useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      scrollToBottomIfNeeded();
      previousMessageCountRef.current = messages.length;
    }
  }, [messages, scrollToBottomIfNeeded]);

  // ストリーミング中のスクロール（リアルタイム更新時）
  useEffect(() => {
    if (isStreaming && streamingContent && shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [streamingContent, isStreaming, shouldAutoScroll]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      // 全タイマーのクリア
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
      
      // 非同期処理のキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'background.default',
    }}>
      {/* ヘッダー */}
      <Box sx={{ 
        p: 1, 
        backgroundColor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={() => setIsHistoryOpen(true)} 
            size="small" 
            title="対話履歴を表示"
            sx={{ color: 'primary.main' }}
          >
            <HistoryIcon />
          </IconButton>
          <IconButton 
            onClick={handleNewChat} 
            size="small" 
            title="新しいチャットを開始"
            sx={{ color: 'primary.main' }}
          >
            <AddIcon />
          </IconButton>
          {persistentMode && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showMemoButton && !hideMemoButton && onOpenMemo && (
            <IconButton onClick={onOpenMemo} size="small" title="メモ帳を開く">
              <MemoIcon />
            </IconButton>
          )}
          {onClose && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* メッセージリスト */}
      <Box 
        ref={messageListRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 1,
        }}
      >
        <List sx={{ py: 0 }}>
          {/* 初期化中の特別なローディング表示 */}
          {isInitializing && messages.length === 0 && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '300px',
              p: 3
            }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                ・・・・・
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                あなたの探究テーマを前に進めるための一歩を、<br/>
                AIが一緒に考えています。
              </Typography>
            </Box>
          )}
          
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ListItem
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    py: 2,
                    px: 1,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: message.role === 'assistant' ? 'primary.main' : 'secondary.main',
                      width: 36,
                      height: 36,
                    }}
                  >
                    {message.role === 'assistant' ? <AIIcon /> : <PersonIcon />}
                  </Avatar>
                  
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                      >
                        {message.role === 'assistant' ? 'AI アシスタント' : 'あなた'} • {(() => {
                          try {
                            return formatTime(message.timestamp);
                          } catch (error) {
                            console.error('Timestamp formatting error:', error, 'message:', message);
                            return '時刻不明';
                          }
                        })()}
                      </Typography>
                      {message.role === 'assistant' && message.response_style_used && (
                        <ResponseStyleBadge styleUsed={message.response_style_used} />
                      )}
                    </Box>
                    
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: message.role === 'assistant' 
                          ? 'background.paper' 
                          : 'primary.light',
                        color: message.role === 'assistant' 
                          ? 'text.primary' 
                          : 'primary.contrastText',
                        borderRadius: 1.4,
                      }}
                    >
                      {message.isSplit && message.chunks ? (
                        <Box>
                          {message.chunks.map((chunk, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ 
                                delay: index * 0.5,
                                duration: 0.3 
                              }}
                            >
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  whiteSpace: 'pre-wrap',
                                  lineHeight: 1.6,
                                  mb: index < message.chunks!.length - 1 ? 2 : 0,
                                  pb: index < message.chunks!.length - 1 ? 2 : 0,
                                  borderBottom: index < message.chunks!.length - 1 
                                    ? '1px solid rgba(0,0,0,0.1)' 
                                    : 'none',
                                }}
                              >
                                {chunk}
                              </Typography>
                            </motion.div>
                          ))}
                          {message.originalLength && message.originalLength > 300 && (
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                mt: 1,
                                color: 'text.secondary',
                                fontStyle: 'italic',
                              }}
                            >
                              （元の文字数: {message.originalLength}文字）
                            </Typography>
                          )}
                        </Box>
                      ) : message.role === 'assistant' ? (
                        // AIメッセージはマークダウンレンダリング
                        <Box
                          sx={{
                            lineHeight: 1.6,
                            '& p': { margin: '0.5em 0' },
                            '& p:first-of-type': { marginTop: 0 },
                            '& p:last-of-type': { marginBottom: 0 },
                            '& a': {
                              color: 'primary.main',
                              textDecoration: 'underline',
                              '&:hover': { textDecoration: 'none' },
                            },
                            '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' },
                            '& li': { marginBottom: '0.25em' },
                            '& code': {
                              backgroundColor: 'rgba(0, 0, 0, 0.05)',
                              padding: '0.1em 0.3em',
                              borderRadius: '4px',
                              fontFamily: 'monospace',
                              fontSize: '0.9em',
                            },
                            '& pre': {
                              backgroundColor: 'rgba(0, 0, 0, 0.05)',
                              padding: '0.5em',
                              borderRadius: '4px',
                              overflow: 'auto',
                              '& code': {
                                backgroundColor: 'transparent',
                                padding: 0,
                              },
                            },
                            '& h1, & h2, & h3, & h4, & h5, & h6': {
                              marginTop: '0.5em',
                              marginBottom: '0.25em',
                              fontWeight: 600,
                            },
                            '& blockquote': {
                              borderLeft: '3px solid',
                              borderColor: 'primary.main',
                              paddingLeft: '1em',
                              margin: '0.5em 0',
                              fontStyle: 'italic',
                            },
                          }}
                        >
                          <ReactMarkdown
                            components={{
                              // リンクは新しいタブで開く
                              a: ({ href, children }) => (
                                <a
                                  href={href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  {children}
                                </a>
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </Box>
                      ) : (
                        // ユーザーメッセージはプレーンテキスト
                        <Typography
                          variant="body1"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.6,
                          }}
                        >
                          {message.content}
                        </Typography>
                      )}

                      {/* 選択肢チップの表示（AIメッセージかつsuggestion_optionsがある場合） */}
                      {message.role === 'assistant' && message.suggestion_options && message.suggestion_options.length > 0 && (
                        <SuggestionChips
                          options={message.suggestion_options}
                          onSelect={handleSuggestionClick}
                          disabled={isLoading}
                        />
                      )}
                    </Box>
                  </Box>
                </ListItem>
                
                {message !== messages[messages.length - 1] && (
                  <Box sx={{ height: 16 }} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* ストリーミング中のリアルタイム表示 */}
          {isStreaming && streamingContent && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ListItem
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  py: 2,
                  px: 1,
                }}
              >
                <Avatar
                  sx={{
                    bgcolor: 'primary.main',
                    width: 36,
                    height: 36,
                  }}
                >
                  <AIIcon />
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      AI アシスタント • 応答中...
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      p: 2,
                      backgroundColor: 'background.paper',
                      borderRadius: 1.4,
                      lineHeight: 1.6,
                      '& p': { margin: '0.5em 0' },
                      '& p:first-of-type': { marginTop: 0 },
                      '& p:last-of-type': { marginBottom: 0 },
                      '& a': {
                        color: 'primary.main',
                        textDecoration: 'underline',
                      },
                      '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' },
                      '& li': { marginBottom: '0.25em' },
                      '& code': {
                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                        padding: '0.1em 0.3em',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '0.9em',
                      },
                    }}
                  >
                    <ReactMarkdown
                      components={{
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                        ),
                      }}
                    >
                      {streamingContent}
                    </ReactMarkdown>
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        width: '8px',
                        height: '16px',
                        backgroundColor: 'primary.main',
                        ml: 0.5,
                        animation: 'blink 1s infinite',
                        '@keyframes blink': {
                          '0%, 50%': { opacity: 1 },
                          '51%, 100%': { opacity: 0 },
                        },
                      }}
                    />
                  </Box>
                </Box>
              </ListItem>
            </motion.div>
          )}

          {/* ローディング表示（ストリーミング中でない場合のみ） */}
          {isLoading && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ListItem sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                  <AIIcon />
                </Avatar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    AI が考えています...
                  </Typography>
                </Box>
              </ListItem>
            </motion.div>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* 入力エリア */}
      <Box sx={{ 
        p: 2, 
        backgroundColor: 'background.default',
        borderTop: 1,
        borderColor: 'divider',
      }}>
        {/* 応答スタイルセレクター */}
        <Box sx={{ mb: 1.5 }}>
          <ResponseStyleSelector
            selectedStyle={responseStyle}
            onStyleChange={setResponseStyle}
          />
        </Box>
        
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            ref={inputRef}
            multiline
            maxRows={3}
            fullWidth
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力してください..."
            variant="outlined"
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.4,
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            sx={{ 
              minWidth: 'auto',
              px: 2,
              py: 1.5,
              borderRadius: 1.4,
            }}
          >
            <SendIcon />
          </Button>
        </Stack>
      </Box>

      {/* チャット履歴パネル */}
      <AnimatePresence>
        {isHistoryOpen && (
          <ChatHistory
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            onSessionSelect={handleSessionSelect}
            currentPageId="general"
          />
        )}
      </AnimatePresence>

      {/* スマート通知システム */}
      {enableSmartNotifications && (
        <SmartNotificationManager
          ref={notificationManagerRef}
          pageId="general"
        />
      )}

      {/* 進捗トラッカー（ゲーミフィケーション） */}
      <ProgressTracker
        stepCount={stepCount}
        onReset={() => setStepCount(0)}
      />
    </Box>
  );
};

export default AIChat;