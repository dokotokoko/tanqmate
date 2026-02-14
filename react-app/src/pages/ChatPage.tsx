import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { AIChat, type ChatAPIRequest, type ChatAPIResponse } from '../components/MemoChat';
import { useChatStore } from '../stores/chatStore';
import { AI_INITIAL_MESSAGE } from '../constants/aiMessages';
import { tokenManager } from '../utils/tokenManager';

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
      width: '100%', // 全幅を明示的に指定
      display: 'flex', 
      flexDirection: 'column',
      background: '#FFFAED', // Soft butter background from mockup
      position: 'relative',
      overflow: 'hidden', // ChatPage自体はオーバーフローを隠す
    }}>
      {/* Chat Content - 全幅で配置 */}
      <AIChat
        persistentMode={true}
        loadHistoryFromDB={true}
        // onMessageSend を削除して、AIChatコンポーネント内蔵のAPI処理を使用
        // これによりクエストカード機能が有効になる
        initialMessage={AI_INITIAL_MESSAGE}
        // Remove title to hide the header completely
      />
    </Box>
  );
};

export default ChatPage;