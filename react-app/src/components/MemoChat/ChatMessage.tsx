import React, { lazy, Suspense } from 'react';
import {
  ListItem,
  Avatar,
  Box,
  Typography,
} from '@mui/material';
import { motion } from 'framer-motion';

// Lazy load QuestCards for better performance with error handling
const QuestCards = lazy(() => import('./QuestCards').catch(err => {
  console.error('Failed to load QuestCards:', err);
  return { default: () => <div style={{ padding: '8px', color: '#9E9891', fontSize: '12px' }}>クエストカードの読み込みに失敗しました</div> };
}));

// Import types from shared types file
import type { QuestCard, Message, ChatMessageProps } from './types';

// Time formatting utility
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

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isLast,
  onQuestCardClick,
}) => {
  return (
    <>
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
              <Typography 
                variant="body1" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                }}
              >
                {message.content}
              </Typography>
              
              {/* クエストカード表示 */}
              {message.questCards && message.questCards.length > 0 && (
                <Suspense fallback={
                  <div style={{ 
                    padding: '12px 0', 
                    color: '#9E9891', 
                    fontSize: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px' 
                  }}>
                    <div style={{ 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #E5E7EB', 
                      borderTop: '2px solid #FF8C5A', 
                      borderRadius: '50%', 
                      animation: 'spin 1s linear infinite' 
                    }}></div>
                    カードを読み込み中...
                  </div>
                }>
                  <QuestCards
                    cards={message.questCards}
                    onCardClick={onQuestCardClick}
                  />
                </Suspense>
              )}
            </Box>
          </Box>
        </ListItem>
        
        {!isLast && (
          <Box sx={{ height: 24 }} />
        )}
      </motion.div>
    </>
  );
};

export default ChatMessage;