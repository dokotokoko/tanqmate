import React, { useEffect, useState } from 'react';
import { Box, Chip, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  EmojiEvents,
  LocalFireDepartment,
  Star,
  Celebration,
} from '@mui/icons-material';

interface ProgressTrackerProps {
  stepCount: number;
  onReset?: () => void;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  stepCount,
  onReset,
}) => {
  const [showBonus, setShowBonus] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);

  // ボーナス演出の判定
  useEffect(() => {
    if (stepCount > previousCount && stepCount > 0) {
      // 5の倍数でボーナス演出
      if (stepCount % 5 === 0) {
        setShowBonus(true);
        setTimeout(() => setShowBonus(false), 3000);
      }
      setPreviousCount(stepCount);
    }
  }, [stepCount, previousCount]);

  // ステップ数に応じたメッセージとアイコンを決定
  const getProgressInfo = () => {
    if (stepCount === 0) {
      return {
        message: '探究をスタート！',
        icon: <Star />,
        color: 'default' as const,
      };
    } else if (stepCount < 3) {
      return {
        message: `${stepCount}ステップ達成！`,
        icon: <CheckCircle />,
        color: 'primary' as const,
      };
    } else if (stepCount < 5) {
      return {
        message: `${stepCount}ステップ！いい感じ！`,
        icon: <LocalFireDepartment />,
        color: 'warning' as const,
      };
    } else if (stepCount < 10) {
      return {
        message: `${stepCount}ステップ！すごい！`,
        icon: <EmojiEvents />,
        color: 'success' as const,
      };
    } else {
      return {
        message: `${stepCount}ステップ！神！`,
        icon: <Celebration />,
        color: 'error' as const,
      };
    }
  };

  const progressInfo = getProgressInfo();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: { xs: 70, sm: 80 },
        right: { xs: 8, sm: 16 },
        zIndex: 1200,
      }}
    >
      <AnimatePresence mode="wait">
        {stepCount > 0 && (
          <motion.div
            key={`progress-${stepCount}`}
            initial={{ scale: 0, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: -20 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
            }}
          >
            <Chip
              icon={progressInfo.icon}
              label={progressInfo.message}
              color={progressInfo.color}
              sx={{
                fontSize: { xs: '0.85rem', sm: '1rem' },
                fontWeight: 'bold',
                py: { xs: 2, sm: 2.5 },
                px: { xs: 1, sm: 1.5 },
                height: 'auto',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                '& .MuiChip-icon': {
                  fontSize: { xs: '18px', sm: '20px' },
                },
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ボーナス演出 */}
      <AnimatePresence>
        {showBonus && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 15,
            }}
            style={{
              position: 'absolute',
              top: -60,
              left: '50%',
              transform: 'translateX(-50%)',
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                color: '#333',
                padding: { xs: '8px 16px', sm: '10px 20px' },
                borderRadius: 3,
                boxShadow: '0 8px 24px rgba(255, 215, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <EmojiEvents sx={{ fontSize: { xs: '20px', sm: '24px' } }} />
              <Typography
                variant="body1"
                sx={{
                  fontWeight: 'bold',
                  fontSize: { xs: '0.9rem', sm: '1.1rem' },
                }}
              >
                ボーナス！{stepCount}ステップ達成！
              </Typography>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 連続達成の炎エフェクト */}
      {stepCount >= 3 && (
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          style={{
            position: 'absolute',
            top: -10,
            right: -10,
          }}
        >
          <LocalFireDepartment
            sx={{
              color: '#ff6b6b',
              fontSize: { xs: '20px', sm: '24px' },
              filter: 'drop-shadow(0 0 8px rgba(255, 107, 107, 0.6))',
            }}
          />
        </motion.div>
      )}
    </Box>
  );
};
