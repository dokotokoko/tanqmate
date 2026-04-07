import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  NoteAdd as MemoIcon,
  History as HistoryIcon,
  Add as AddIcon,
} from '@mui/icons-material';

// Import types from shared types file
import type { ChatHeaderProps } from './types';

const ChatHeader: React.FC<ChatHeaderProps> = ({
  title,
  onClose,
  onOpenMemo,
  onNewChat,
  onOpenHistory,
  showMemoButton = false,
  hideMemoButton = false,
  showCloseButton = false,
  showHistoryButton = true,
  showNewChatButton = true,
}) => {
  if (!title && !showCloseButton && !showMemoButton && !showHistoryButton && !showNewChatButton) {
    return null; // ヘッダーが不要な場合は何も表示しない
  }

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      p: 2,
      borderBottom: '1px solid #F0E8D8',
      backgroundColor: '#FFFAED',
    }}>
      {/* タイトル部分 */}
      <Box sx={{ flex: 1 }}>
        {title && (
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600, 
              color: '#2D2A26',
              fontSize: '18px'
            }}
          >
            {title}
          </Typography>
        )}
      </Box>

      {/* アクションボタン群 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        {/* メモ帳ボタン */}
        {showMemoButton && !hideMemoButton && onOpenMemo && (
          <Tooltip title="メモ帳を開く">
            <IconButton
              onClick={onOpenMemo}
              size="small"
              sx={{
                color: '#FF8C5A',
                '&:hover': {
                  backgroundColor: 'rgba(255, 140, 90, 0.1)',
                },
              }}
            >
              <MemoIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* 履歴ボタン */}
        {showHistoryButton && onOpenHistory && (
          <Tooltip title="対話履歴">
            <IconButton
              onClick={onOpenHistory}
              size="small"
              sx={{
                color: '#6B6560',
                '&:hover': {
                  backgroundColor: 'rgba(107, 101, 96, 0.1)',
                },
              }}
            >
              <HistoryIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* 新しいチャットボタン */}
        {showNewChatButton && onNewChat && (
          <Tooltip title="新しいチャット">
            <IconButton
              onClick={onNewChat}
              size="small"
              sx={{
                color: '#6B6560',
                '&:hover': {
                  backgroundColor: 'rgba(107, 101, 96, 0.1)',
                },
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        )}

        {/* 閉じるボタン */}
        {showCloseButton && onClose && (
          <Tooltip title="閉じる">
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: '#6B6560',
                '&:hover': {
                  backgroundColor: 'rgba(107, 101, 96, 0.1)',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};

export default ChatHeader;