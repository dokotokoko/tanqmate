import React, { useRef, lazy, Suspense } from 'react';
import {
  Box,
  TextField,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material';
import { 
  Send as SendIcon,
} from '@mui/icons-material';

// Lazy load ResponseStyleSelector for better performance with error handling
const ResponseStyleSelector = lazy(() => import('./ResponseStyleSelector').catch(err => {
  console.error('Failed to load ResponseStyleSelector:', err);
  return { 
    default: () => (
      <div style={{ 
        padding: '12px', 
        color: '#9E9891', 
        fontSize: '12px', 
        border: '1px solid #F0E8D8', 
        borderRadius: '8px', 
        backgroundColor: '#FFF6E0' 
      }}>
        スタイルセレクターの読み込みに失敗しました
      </div>
    )
  };
}));

// Import types from shared types file
import type { ResponseStyle, ChatInputAreaProps } from './types';

// Re-export for backward compatibility
export type { ResponseStyle };

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  inputValue,
  isLoading,
  isMessageInputDisabled = false,
  responseStyle,
  processingStatus,
  fallbackUsed,
  fallbackModel,
  onInputChange,
  onSendMessage,
  onKeyPress,
  onStyleChange,
  dataTutorialId,
  inputDataTutorialId,
  sendButtonDataTutorialId,
  tutorialGuide,
  responseStyleSelectorDataTutorialId,
  forceResponseStyleSelectorOpen,
  highlightResponseStyleSelector,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Box sx={{ 
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 'calc(100% - 48px)',
      maxWidth: '652px', // アイコンの外側の線に合わせる
      zIndex: 100,
    }}
    data-tutorial={dataTutorialId}>
      {tutorialGuide && (
        <Box sx={{ mb: 1.25 }}>
          {tutorialGuide}
        </Box>
      )}
      <Box sx={{
        background: '#FFFDF7',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(45, 42, 38, 0.08)',
        padding: '16px',
        border: '1px solid #F0E8D8',
      }}>
        {/* 応答スタイルセレクター */}
        <Box sx={{ 
          mb: 1.5,
          pb: 1.5, 
          borderBottom: '1px solid #F0E8D8'
        }}>
          <Suspense fallback={
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1, 
              p: 2, 
              backgroundColor: '#FFF6E0', 
              borderRadius: '8px',
              border: '1px solid #F0E8D8'
            }}>
              <CircularProgress size={16} sx={{ color: '#FF8C5A' }} />
              <span style={{ color: '#6B6560', fontSize: '12px' }}>スタイルセレクターを読み込み中...</span>
            </Box>
          }>
            <ResponseStyleSelector
              selectedStyle={responseStyle}
              onStyleChange={onStyleChange}
              dataTutorialId={responseStyleSelectorDataTutorialId}
              forceOpen={forceResponseStyleSelectorOpen}
              highlighted={highlightResponseStyleSelector}
            />
          </Suspense>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <TextField
            ref={inputRef}
            multiline
            maxRows={3}
            fullWidth
            value={inputValue}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyPress={onKeyPress}
            placeholder="メッセージを入力してください..."
            variant="outlined"
            disabled={isLoading || isMessageInputDisabled}
            inputProps={{ 'data-tutorial': inputDataTutorialId }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '12px',
                backgroundColor: '#FFF6E0',
                border: 'none',
                fontSize: '14px',
                '&:hover': {
                  backgroundColor: '#FFFDF7',
                },
                '&.Mui-focused': {
                  backgroundColor: '#FFFDF7',
                  boxShadow: '0 0 0 2px #FF8C5A',
                },
              },
              '& .MuiOutlinedInput-notchedOutline': {
                border: 'none',
              },
              '& .MuiInputBase-input::placeholder': {
                color: '#9E9891',
              },
            }}
          />
          
          <Button
            variant="contained"
            onClick={onSendMessage}
            disabled={!inputValue.trim() || isLoading || isMessageInputDisabled}
            data-tutorial={sendButtonDataTutorialId}
            sx={{ 
              minWidth: 'auto',
              width: 44,
              height: 44,
              background: 'linear-gradient(135deg, #FF8C5A, #FF7A42)',
              color: 'white',
              borderRadius: '12px',
              '&:hover': {
                background: 'linear-gradient(135deg, #FF7A42, #FF6B35)',
                transform: 'translateY(-2px) scale(1.05)',
                boxShadow: '0 6px 16px rgba(255, 140, 90, 0.4)',
              },
              '&:active': {
                transform: 'translateY(0) scale(0.98)',
              },
              '&:disabled': {
                background: '#E5E7EB',
                color: '#9CA3AF',
                transform: 'none',
              },
              transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <SendIcon />
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default ChatInputArea;
