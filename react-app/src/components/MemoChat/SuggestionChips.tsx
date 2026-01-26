import React, { useState } from 'react';
import { Box, Chip, keyframes } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { PlayArrow, CheckCircle } from '@mui/icons-material';

interface SuggestionChipsProps {
  options: string[];
  onSelect: (option: string) => void;
  disabled?: boolean;
}

// パルスアニメーション定義
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.85;
    transform: scale(1.02);
  }
`;

// 輝きアニメーション定義
const shimmer = keyframes`
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
`;

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({
  options,
  onSelect,
  disabled = false
}) => {
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set());
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);

  const handleClick = (option: string, index: number) => {
    if (disabled || completedIndices.has(index)) return;

    // クリックされたチップを完了状態にする
    setClickedIndex(index);
    setCompletedIndices(prev => new Set(prev).add(index));

    // 親コンポーネントのonSelectを呼び出す
    onSelect(option);

    // 少し遅延してからclickedIndexをリセット
    setTimeout(() => {
      setClickedIndex(null);
    }, 500);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: { xs: 1, sm: 1.5 },
        mt: 2,
        mb: 1
      }}
    >
      {options.map((option, index) => {
        const isCompleted = completedIndices.has(index);
        const isJustClicked = clickedIndex === index;

        return (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 20, scale: 0.8 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            ...(isJustClicked && {
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0],
            }),
          }}
          transition={{
            delay: index * 0.08,
            duration: 0.4,
            type: 'spring',
            stiffness: 260,
            damping: 20
          }}
          whileHover={{ scale: disabled || isCompleted ? 1 : 1.05 }}
          whileTap={{ scale: disabled || isCompleted ? 1 : 0.95 }}
        >
          <Box sx={{ position: 'relative' }}>
            <Chip
              icon={
                isCompleted ? (
                  <CheckCircle sx={{ fontSize: { xs: '16px', sm: '18px' } }} />
                ) : (
                  <PlayArrow sx={{ fontSize: { xs: '16px', sm: '18px' } }} />
                )
              }
              label={isCompleted ? '✓ 完了！' : option}
              onClick={() => handleClick(option, index)}
              disabled={disabled || isCompleted}
            sx={{
              fontSize: { xs: '0.95rem', sm: '1.05rem' },
              fontWeight: 600,
              py: { xs: 2.5, sm: 3 },
              px: { xs: 1.5, sm: 2 },
              height: 'auto',
              borderRadius: 3,
              border: 'none',
              background: isCompleted
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : disabled
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundSize: '200% 100%',
              color: 'white',
              cursor: disabled || isCompleted ? 'not-allowed' : 'pointer',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: isCompleted
                ? '0 4px 15px rgba(16, 185, 129, 0.5)'
                : disabled
                ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                : '0 4px 15px rgba(102, 126, 234, 0.5)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: disabled || isCompleted ? 'none' : `${pulse} 2s ease-in-out infinite`,

              // アイコンのスタイル
              '& .MuiChip-icon': {
                color: 'white',
                marginLeft: '8px',
              },

              // ホバー時の効果
              '&:hover': {
                background: isCompleted
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : disabled
                  ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                  : 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                boxShadow: isCompleted
                  ? '0 4px 15px rgba(16, 185, 129, 0.5)'
                  : disabled
                  ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                  : '0 6px 25px rgba(102, 126, 234, 0.7)',
                transform: disabled || isCompleted ? 'none' : 'translateY(-4px)',
              },

              // アクティブ時の効果
              '&:active': {
                transform: disabled || isCompleted ? 'none' : 'translateY(-2px)',
                boxShadow: isCompleted
                  ? '0 4px 15px rgba(16, 185, 129, 0.5)'
                  : disabled
                  ? '0 2px 8px rgba(0, 0, 0, 0.2)'
                  : '0 3px 12px rgba(102, 126, 234, 0.6)',
              },

              // 輝きエフェクト（疑似要素）
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: disabled || isCompleted
                  ? 'none'
                  : 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
                animation: disabled || isCompleted ? 'none' : `${shimmer} 3s infinite`,
              },
            }}
          />

          {/* 完了時の爆発エフェクト */}
          <AnimatePresence>
            {isJustClicked && (
              <motion.div
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '100%',
                  height: '100%',
                  borderRadius: '24px',
                  border: '3px solid rgba(16, 185, 129, 0.6)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </AnimatePresence>
        </Box>
        </motion.div>
      )})}
    </Box>
  );
};
