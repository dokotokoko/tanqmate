import React, { useRef, useCallback, useEffect, forwardRef, lazy, Suspense, memo } from 'react';
import {
  Box,
  List,
  Typography,
  CircularProgress,
  Avatar,
  ListItem,
} from '@mui/material';
import { AnimatePresence, motion } from 'framer-motion';
import { selectMessages, selectConversation, useChatStore } from '../../stores/chatStore';
import { shallow } from 'zustand/shallow';

// Lazy load ChatMessage for better performance with error handling
const ChatMessage = lazy(() => import('./ChatMessage').catch(err => {
  console.error('Failed to load ChatMessage:', err);
  return { 
    default: ({ message }: any) => (
      <ListItem sx={{ py: 2, px: 0 }}>
        <Box sx={{ 
          p: 2, 
          backgroundColor: '#FFF6E0', 
          borderRadius: '8px', 
          border: '1px solid #F0E8D8',
          color: '#9E9891',
          fontSize: '12px'
        }}>
          メッセージの読み込みに失敗しました: {message.content.substring(0, 50)}...
        </Box>
      </ListItem>
    )
  };
}));

// Import types from shared types file
import type { Message, ChatMessageListProps } from './types';

// Memoized loading component to prevent unnecessary re-renders
const LoadingIndicator = memo(() => {
  const { isLoading } = useChatStore(
    (state) => ({ isLoading: state.conversation.isLoading }),
    shallow
  );

  if (!isLoading) return null;

  return (
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
  );
});

LoadingIndicator.displayName = 'LoadingIndicator';

// Memoized message item to prevent unnecessary re-renders
const MessageItem = memo(({ message, isLast, onQuestCardClick }: {
  message: Message;
  isLast: boolean;
  onQuestCardClick: (cardId: string, cardLabel: string) => void;
}) => {
  return (
    <Suspense 
      fallback={
        <ListItem sx={{ py: 2, justifyContent: 'center' }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            p: 2,
            backgroundColor: 'rgba(255, 250, 237, 0.5)',
            borderRadius: '8px',
            border: '1px solid rgba(240, 232, 216, 0.5)'
          }}>
            <CircularProgress size={16} sx={{ color: '#FF8C5A' }} />
            <span style={{ color: '#6B6560', fontSize: '12px' }}>メッセージを読み込み中...</span>
          </Box>
        </ListItem>
      }
    >
      <ChatMessage
        message={message}
        isLast={isLast}
        onQuestCardClick={onQuestCardClick}
      />
    </Suspense>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.onQuestCardClick === nextProps.onQuestCardClick
  );
});

MessageItem.displayName = 'MessageItem';

// Optimized ChatMessageList using Zustand selectors  
const ChatMessageList: React.FC<{
  isInitializing?: boolean;
  onQuestCardClick: (cardId: string, cardLabel: string) => void;
}> = ({ 
    isInitializing = false,
    onQuestCardClick
  }) => {
    // Use Zustand selectors for optimal re-render behavior
    const messages = selectMessages();

    return (
      <Box sx={{
        width: '100%',
        minHeight: 'calc(100vh - 180px)',
        display: 'flex',
        justifyContent: 'center', // 中央揃え
      }}>
        <List 
          sx={{ 
            padding: '32px 24px',
            paddingBottom: '40px',
            margin: 0,
            width: '100%',
            maxWidth: '900px', // コンテンツの最大幅を制限
            boxSizing: 'border-box', // paddingを含めたwidth計算
          }}
        >
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
            {messages.map((message, index) => (
              <MessageItem
                key={message.id}
                message={message}
                isLast={index === messages.length - 1}
                onQuestCardClick={onQuestCardClick}
              />
            ))}
          </AnimatePresence>
          
          {/* Optimized loading indicator */}
          <LoadingIndicator />
        </List>
      </Box>
    );
};

ChatMessageList.displayName = 'ChatMessageList';

export default ChatMessageList;