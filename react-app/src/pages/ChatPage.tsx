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

  // AI応答の処理
  const handleAIMessage = async (message: string, memoContent: string): Promise<string> => {
    try {
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        throw new Error('認証トークンが見つかりません。再ログインしてください。');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          message: message,
          memo_content: memoContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('AI応答の取得に失敗しました:', error);
      throw error;
    }
  };

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
          onMessageSend={handleAIMessage}
          initialMessage={AI_INITIAL_MESSAGE}
        />
      </Box>
    </Box>
  );
};

export default ChatPage;