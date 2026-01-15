import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  Box,
  CircularProgress,
} from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import { 
  useChatStore,
  selectMessages,
  selectMessageActions,
  selectConversation,
  selectConversationActions,
  selectUIActions,
  type Message
} from '../../stores/chatStore';
import { AI_INITIAL_MESSAGE } from '../../constants/aiMessages';
import { useScrollBehavior } from '../../hooks/useScrollBehavior';
import { useTimerManager } from '../../hooks/useTimerManager';
import { useEventManager } from '../../hooks/useEventManager';

// Lazy load components for better performance with error boundaries
const ChatHeader = lazy(() => import('./ChatHeader').catch(err => {
  console.error('Failed to load ChatHeader:', err);
  return { default: () => <div>ヘッダーの読み込みに失敗しました</div> };
}));
const ChatMessageList = lazy(() => import('./ChatMessageList').catch(err => {
  console.error('Failed to load ChatMessageList:', err);
  return { default: () => <div>メッセージリストの読み込みに失敗しました</div> };
}));
const ChatInputArea = lazy(() => import('./ChatInputArea').catch(err => {
  console.error('Failed to load ChatInputArea:', err);
  return { default: () => <div>入力エリアの読み込みに失敗しました</div> };
}));
const ChatHistory = lazy(() => import('./ChatHistory').catch(err => {
  console.error('Failed to load ChatHistory:', err);
  return { default: () => <div>履歴パネルの読み込みに失敗しました</div> };
}));

// Import types from shared types file
import type { 
  QuestCard,
  ResponseStyle, 
  AIChatProps,
  LoadingFallbackProps 
} from './types';

const AIChat: React.FC<AIChatProps> = ({
  isDashboard = false,
  title,
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
  persistentMode = false,
}) => {
  // Zustand store selectors and actions
  const messages = selectMessages();
  const { addMessage, setMessages, clearMessages } = selectMessageActions();
  const conversation = selectConversation();
  const { setConversationId, setLoading, setProcessingStatus, setFallbackInfo } = selectConversationActions();
  const { setHistoryOpen } = selectUIActions();
  const isHistoryOpen = useChatStore((state) => state.isHistoryOpen);
  
  // Local UI state
  const [inputValue, setInputValue] = useState('');
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [responseStyle, setResponseStyle] = useState<ResponseStyle | null>(null);
  const initializationKeyRef = useRef('initialized');
  
  // Refs
  const messageListRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  
  // Custom hooks for side effects
  const scrollBehavior = useScrollBehavior({ messageListRef });
  const timerManager = useTimerManager();
  const eventManager = useEventManager({
    onNewChat: handleNewChat,
    onHistoryOpen: () => setHistoryOpen(true),
  });

  // デフォルトの初期メッセージを返す関数
  const getDefaultInitialMessage = (): string => {
    return AI_INITIAL_MESSAGE;
  };

  // デフォルトのクエストカードを返す関数
  const getDefaultQuestCards = (): QuestCard[] => {
    return [
      {
        id: 'organize-thoughts',
        label: '自分の考えを整理する',
        emoji: '💭',
        color: 'yellow',
      },
      {
        id: 'research-info',
        label: '情報を調べる',
        emoji: '🔍',
        color: 'teal',
      },
      {
        id: 'ask-people',
        label: '人に聞いてみる',
        emoji: '🎤',
        color: 'purple',
      },
      {
        id: 'make-hypothesis',
        label: '仮説を立ててみる',
        emoji: '📝',
        color: 'pink',
      },
      {
        id: 'find-data',
        label: 'データを探す',
        emoji: '📊',
        color: 'green',
      },
    ];
  };

  // Define handleNewChat before using it in eventManager
  const handleNewChat = useCallback(async () => {
    clearMessages();
    setHistoryOpen(false);
    
    // Create new conversation
    const newConversationId = await createNewConversation();
    if (newConversationId) {
      setConversationId(newConversationId);
      console.log('🆕 新しい会話を作成しました:', newConversationId);
    }
    
    // Set initial message
    const messageContent = initialMessage || getDefaultInitialMessage();
    const initialMsg: Message = {
      id: `initial-${Date.now()}`,
      role: 'assistant',
      content: messageContent,
      timestamp: new Date(),
      questCards: getDefaultQuestCards(),
    };
    addMessage(initialMsg);
  }, [clearMessages, setHistoryOpen, setConversationId, addMessage, initialMessage]);

  // メッセージクリア関数（イベント駆動）
  const clearMessagesIfNeeded = useCallback(() => {
    if (forceRefresh) {
      clearMessages();
      setHistoryLoaded(false);
      initializationKeyRef.current = 'initialized';
      return true; // クリアが実行されたことを示す
    }
    return false;
  }, [forceRefresh, clearMessages]);


  // 対話履歴読み込み関数（イベント駆動）
  const loadChatHistory = useCallback(async () => {
    // ページリロードの検出
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
            questCards: getDefaultQuestCards(),
          };
          setMessages([initialMessage]);
        } else {
          // その他は全てグローバル履歴を表示
          setMessages(historyMessages);
        }
        
        setHistoryLoaded(true);
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
        questCards: getDefaultQuestCards(),
      });
    }
    
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
      // 初期化完了を記録
      initializationKeyRef.current = 'initialized';
    }
  }, [initialMessage, initialAIResponse, isDashboard, loadHistoryFromDB, historyLoaded, messages.length, autoStart, setMessages]);

  // 新しい会話を作成
  const createNewConversation = async (): Promise<string | null> => {
    try {
      setLoading(true);
      
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
      setLoading(false);
    }
  };


  // 履歴を開く
  const handleOpenHistory = () => {
    setHistoryOpen(true);
  };

  // クエストカードクリック処理
  const handleQuestCardClick = (cardId: string, cardLabel: string) => {
    setInputValue(cardLabel);
    // 自動送信は行わず、ユーザーが送信ボタンを押すかEnterキーを押すまで待機
  };

  // メッセージ送信処理（二重送信防止付き）
  const handleSendMessage = async () => {
    if (!inputValue.trim() || conversation.isLoading || isSendingRef.current) return;
    
    // 二重送信防止フラグ
    isSendingRef.current = true;

    // 会話IDが存在しない場合は新しい会話を作成
    let conversationId = conversation.conversationId;
    if (!conversationId) {
      conversationId = await createNewConversation();
      if (conversationId) {
        setConversationId(conversationId);
        console.log('🆕 メッセージ送信前に新しい会話を作成:', conversationId);
      }
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // メッセージ追加
    addMessage(userMessage);
    setInputValue('');
    setLoading(true);
    setProcessingStatus('AI処理を開始しています...');

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
          setProcessingStatus('AIが考え中です...');
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
              response_style: responseStyle?.id || 'auto',
              custom_instruction: responseStyle?.customInstruction || undefined,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            aiResponse = result.response;
            
            // フォールバック情報を確認
            if (result.fallback_used && result.fallback_model) {
              setFallbackInfo(true, result.fallback_model);
              setProcessingStatus(`軽量モード (${result.fallback_model}) で処理中...`);
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

      // AI応答を追加
      addMessage(assistantMessage);
    } catch (error) {
      console.error('AI応答エラー:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '申し訳ございません。応答の生成中にエラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      };
      // エラーメッセージを追加
      addMessage(errorMessage);
    } finally {
      setLoading(false);
      setProcessingStatus(null);
      setFallbackInfo(false, null);
      isSendingRef.current = false; // 二重送信防止フラグをリセット
    }
  };

  // Enterキーでメッセージ送信
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
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
      setConversationId(session.conversation_id);
      console.log('📋 会話を切り替えました:', session.conversation_id);
    }
    
    setMessages(historyMessages);
    setHistoryOpen(false);
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
      if (!historyLoaded && loadHistoryFromDB) {
        loadChatHistory();
      } else if (!loadHistoryFromDB || historyLoaded) {
        loadInitialMessages();
      }
    }
  }, [forceRefresh, clearMessagesIfNeeded, loadChatHistory, loadInitialMessages, loadHistoryFromDB, historyLoaded]);
  
  // Event listeners are managed by useEventManager hook

  // Cleanup is managed by custom hooks

  // Enhanced loading fallback component with better UX
  const LoadingFallback: React.FC<LoadingFallbackProps> = ({ text = "読み込み中...", height = 'auto' }) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      p: 2,
      gap: 1,
      height,
      minHeight: height === 'auto' ? '60px' : height,
      backgroundColor: 'rgba(255, 250, 237, 0.5)',
      borderRadius: '8px',
      border: '1px solid rgba(240, 232, 216, 0.5)'
    }}>
      <CircularProgress size={20} sx={{ color: '#FF8C5A' }} />
      <span style={{ color: '#6B6560', fontSize: '14px' }}>{text}</span>
    </Box>
  );

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#FFFAED', // Soft butter background from mockup
    }}>
      {/* Chat Header - Optional */}
      {(title || onClose || showMemoButton || !hideMemoButton) && (
        <Suspense fallback={<LoadingFallback text="ヘッダーを読み込み中..." height="60px" />}>
          <ChatHeader
            title={title}
            onClose={onClose}
            onOpenMemo={onOpenMemo}
            onNewChat={handleNewChat}
            onOpenHistory={handleOpenHistory}
            showMemoButton={showMemoButton}
            hideMemoButton={hideMemoButton}
            showCloseButton={!!onClose}
            showHistoryButton={!isDashboard}
            showNewChatButton={!isDashboard}
          />
        </Suspense>
      )}

      {/* メッセージリスト */}
      <Suspense fallback={<LoadingFallback text="メッセージリストを読み込み中..." height="200px" />}>
        <ChatMessageList
          ref={messageListRef}
          messages={messages}
          isLoading={conversation.isLoading}
          isInitializing={isInitializing}
          isUserScrolling={scrollBehavior.isUserScrolling}
          shouldAutoScroll={scrollBehavior.shouldAutoScroll}
          onQuestCardClick={handleQuestCardClick}
          onScroll={scrollBehavior.handleScroll}
        />
      </Suspense>

      {/* フローティング入力島 */}
      <Suspense fallback={<LoadingFallback text="入力エリアを読み込み中..." height="120px" />}>
        <ChatInputArea
          inputValue={inputValue}
          isLoading={conversation.isLoading}
          responseStyle={responseStyle}
          processingStatus={conversation.processingStatus}
          fallbackUsed={conversation.fallbackUsed}
          fallbackModel={conversation.fallbackModel}
          onInputChange={setInputValue}
          onSendMessage={handleSendMessage}
          onKeyPress={handleKeyPress}
          onStyleChange={setResponseStyle}
        />
      </Suspense>

      {/* チャット履歴パネル */}
      <AnimatePresence>
        {isHistoryOpen && (
          <Suspense fallback={<LoadingFallback text="チャット履歴を読み込み中..." height="300px" />}>
            <ChatHistory
              isOpen={isHistoryOpen}
              onClose={() => setHistoryOpen(false)}
              onSessionSelect={handleSessionSelect}
              currentPageId="general"
            />
          </Suspense>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default AIChat;