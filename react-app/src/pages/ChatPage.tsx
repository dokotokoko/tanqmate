import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import AIChat from '../components/MemoChat/AIChat';
import { useChatStore } from '../stores/chatStore';
import { AI_INITIAL_MESSAGE } from '../constants/aiMessages';

const ChatPage: React.FC = () => {
  const { clearCurrentMemo } = useChatStore();

  useEffect(() => {
    // チャットページ初期化時にメモ情報をクリア
    clearCurrentMemo();
  }, [clearCurrentMemo]);

  // AI応答の処理 - AIChatコンポーネントに内蔵のAPI処理を使用させるため削除
  // const handleAIMessage = async (message: string, memoContent: string): Promise<string> => {
  //   ... この関数は削除
  // };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#FFFAED', // Soft butter background from mockup
    }}>
      {/* Chat Header - Simplified */}
      <Box sx={{ 
        textAlign: 'center',
        p: 4,
      }}>
        <Typography variant="h5" fontWeight={600} sx={{ color: '#2D2A26', fontSize: '20px' }}>
          探Qメイト
        </Typography>
        <Typography variant="body2" sx={{ color: '#6B6560', fontSize: '14px', mt: 0.5 }}>
          あなたの探究学習をサポートします
        </Typography>
      </Box>

      {/* Chat Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <AIChat
          title="探Qメイト"
          persistentMode={true}
          loadHistoryFromDB={true}
          // onMessageSend を削除して、AIChatコンポーネント内蔵のAPI処理を使用
          // これによりクエストカード機能が有効になる
          initialMessage={AI_INITIAL_MESSAGE}
        />
      </Box>
    </Box>
  );
};

export default ChatPage;