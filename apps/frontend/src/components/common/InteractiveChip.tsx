import React from 'react';
import { Chip, ChipProps } from '@mui/material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';

interface InteractiveChipProps extends Omit<ChipProps, 'component'> {
  interactive?: boolean;
}

const StyledChip = styled(Chip)(({ theme }) => ({
  position: 'relative',
  transition: 'transform 60ms ease-out, box-shadow 80ms ease-out',
  cursor: 'pointer',
  
  // ホバー時の背景変化
  '&:hover': {
    transform: 'scale(1.03)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
  },
  
  // クリック時
  '&:active': {
    transform: 'scale(0.96)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0ms, box-shadow 0ms',
  },
  
  // フォーカス時のリング
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: theme.palette.primary.main,
    outlineOffset: '2px',
  },
  
  // 非インタラクティブ時
  '&.non-interactive': {
    cursor: 'default',
    
    '&:hover': {
      transform: 'none',
      boxShadow: 'none',
    },
    
    '&:active': {
      transform: 'none',
      boxShadow: 'none',
    },
  },
}));

const InteractiveChip: React.FC<InteractiveChipProps> = ({
  interactive = true,
  ...props
}) => {
  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        duration: 0.2,
        type: 'spring',
        stiffness: 500,
        damping: 30,
      }}
      style={{ display: 'inline-block' }}
    >
      <StyledChip
        className={!interactive ? 'non-interactive' : ''}
        {...props}
      />
    </motion.div>
  );
};

export default InteractiveChip;