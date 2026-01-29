import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { tokenManager } from '../../utils/tokenManager';
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
import { AnimatePresence, motion } from 'framer-motion';
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
const QuestCards = lazy(() => import('./QuestCards').catch(err => {
  console.error('Failed to load QuestCards:', err);
  return { default: () => <div>クエストカードの読み込みに失敗しました</div> };
}));

// Import types from shared types file
import type { 
  QuestCard,
  ResponseStyle, 
  AIChatProps,
  LoadingFallbackProps 
} from './types';

// Time formatting utility
const formatTime = (timestamp: Date | string | undefined | null) => {
  try {
    if (!timestamp) {
      return new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }

    let date: Date;
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date();
    }
    
    if (isNaN(date.getTime())) {
      date = new Date();
    }
    
    return date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '時刻不明';
  }
};

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef(false);
  
  // Custom hooks for side effects
  const scrollBehavior = useScrollBehavior({ messageListRef });
  const timerManager = useTimerManager();

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

  // Initialize event manager after handleNewChat is defined
  const eventManager = useEventManager({
    onNewChat: handleNewChat,
    onHistoryOpen: () => setHistoryOpen(true),
  });

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
    
    // リロード時は新規チャットを表示
    if (isPageReload) {
      // 既存のメッセージをクリア
      clearMessages();
      // 初期メッセージを設定
      const initialMsg: Message = {
        id: `initial-${Date.now()}`,
        role: 'assistant',
        content: getDefaultInitialMessage(),
        timestamp: new Date(),
        questCards: getDefaultQuestCards(),
      };
      setMessages([initialMsg]);
      setHistoryLoaded(true);
      
      // 新しい会話を作成
      const newConversationId = await createNewConversation();
      if (newConversationId) {
        setConversationId(newConversationId);
        console.log('🆕 リロード時に新しい会話を作成:', newConversationId);
      }
      return;
    }
    
    if (!loadHistoryFromDB || historyLoaded) return;

    try {
      // 認証トークンを取得
      const token = tokenManager.getAccessToken();
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
      
      const token = tokenManager.getAccessToken();
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
    console.log('📢 handleSendMessage called'); // デバッグログ
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
        const token = tokenManager.getAccessToken();
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
            console.log('🔍 API Response:', result); // デバッグログ追加
            console.log('🎯 Quest Cards:', result.quest_cards); // クエストカードのデバッグログ
            console.log('📊 Quest Cards Count:', result.quest_cards?.length || 0); // カード数
            
            // デバッグ用: クエストカードが存在する場合、アラート表示
            if (result.quest_cards && result.quest_cards.length > 0) {
              console.warn('🎉 Quest cards found!', result.quest_cards);
              // アラート表示（本番環境では削除）
              // alert(`Quest cards received: ${result.quest_cards.length} cards`);
            }
            
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
                questCards: result.quest_cards || [],
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
              // quest_cardsも保存
              const questCards = result.quest_cards || [];
              
              // デバッグ: questCardsの内容を確認
              console.log('📦 Quest cards before creating message:', questCards);
              console.log('📦 Quest cards type:', typeof questCards);
              console.log('📦 Is Array:', Array.isArray(questCards));
              
              const assistantMessage: Message = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
                questCards: questCards,
              };
              
              console.log('💬 Assistant message with quest cards:', assistantMessage);

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
          
          setIsLoading(false);
          isSendingRef.current = false;
          inputRef.current?.focus();
          return; // 早期リターン
        }
      }
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
      <Box 
        ref={messageListRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: '32px 24px',
          paddingBottom: '140px', // フローティング入力島のためのスペース
          // スクロールバーを非表示
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          msOverflowStyle: 'none',
          scrollbarWidth: 'none',
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
                    py: 0,
                    px: 0,
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                  }}
                >
                  <Avatar
                    sx={{
                      background: message.role === 'assistant' 
                        ? 'linear-gradient(135deg, #FF8C5A, #FFD166)' 
                        : '#D8D4CE',
                      width: 36,
                      height: 36,
                      boxShadow: message.role === 'assistant' 
                        ? '0 2px 8px rgba(255, 140, 90, 0.3)'
                        : 'none',
                      borderRadius: '12px',
                      fontSize: '16px',
                    }}
                  >
                    {message.role === 'assistant' ? '🔥' : '👤'}
                  </Avatar>
                  
                  <Box sx={{ 
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: message.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ 
                        mb: 0.5,
                        textAlign: message.role === 'user' ? 'right' : 'left',
                        fontSize: '11px',
                        color: '#9E9891',
                      }}
                    >
                      {message.role === 'assistant' ? '探Qメイト' : 'あなた'} • {(() => {
                        try {
                          return formatTime(message.timestamp);
                        } catch (error) {
                          console.error('Timestamp formatting error:', error, 'message:', message);
                          return '時刻不明';
                        }
                      })()}
                    </Typography>
                    
                    <Box
                      sx={{
                        p: '16px 20px',
                        background: message.role === 'assistant' 
                          ? 'linear-gradient(135deg, #FFFBF5, #FFF6E8)' 
                          : '#FFFDF7',
                        border: message.role === 'assistant'
                          ? '1px solid #FFE4C8'
                          : '1px solid #F0E8D8',
                        color: message.role === 'assistant' 
                          ? '#2D2A26' 
                          : '#6B6560',
                        borderRadius: '16px',
                        borderBottomLeftRadius: message.role === 'assistant' ? '8px' : '16px',
                        borderBottomRightRadius: message.role === 'user' ? '8px' : '16px',
                        boxShadow: message.role === 'assistant' 
                          ? '0 4px 16px rgba(255, 140, 90, 0.12)'
                          : '0 2px 8px rgba(0, 0, 0, 0.04)',
                        maxWidth: '600px',
                        fontSize: '14px',
                        lineHeight: 1.7,
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
                      ) : (
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
                      
                      {/* クエストカード表示 */}
                      {message.questCards && message.questCards.length > 0 && (
                        <Suspense fallback={
                          <Box sx={{ p: 1 }}>
                            <CircularProgress size={20} />
                          </Box>
                        }>
                          {console.log('🎨 Rendering quest cards for message:', message.id, message.questCards)}
                          <QuestCards
                            cards={message.questCards}
                            onCardClick={handleQuestCardClick}
                          />
                        </Suspense>
                      )}
                    </Box>
                  </Box>
                </ListItem>
                
                {message !== messages[messages.length - 1] && (
                  <Box sx={{ height: 24 }} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* ローディング表示 */}
          {conversation.isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ListItem sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 0, px: 0 }}>
                <Avatar sx={{ 
                  background: 'linear-gradient(135deg, #FF8C5A, #FFD166)', 
                  width: 36, 
                  height: 36,
                  boxShadow: '0 2px 8px rgba(255, 140, 90, 0.3)',
                  borderRadius: '12px',
                  fontSize: '16px',
                }}>
                  🔥
                </Avatar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} sx={{ color: '#FF8C5A' }} />
                  <Typography variant="body2" sx={{ color: '#6B6560' }}>
                    AI が考えています...
                  </Typography>
                </Box>
              </ListItem>
            </motion.div>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

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