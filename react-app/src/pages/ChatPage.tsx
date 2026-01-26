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

  // 注意: onMessageSendを削除しました
  // AIChat.tsx内の直接APIコールを使用することで、response_styleが正しく送信されます
  // (フェーズ9.1修正: 2026-01-26)

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default',
    }}>
      {/* Chat Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        <Typography variant="h5" fontWeight={600}>
          AIアシスタント
        </Typography>
        <Typography variant="body2" color="text.secondary">
          あなたの探究学習をサポートします
        </Typography>
      </Box>

      {/* Chat Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <AIChat
          title="AIアシスタント"
          persistentMode={true}
          loadHistoryFromDB={true}
          initialMessage={AI_INITIAL_MESSAGE}
        />
      </Box>
    </Box>
  );
};

export default ChatPage;