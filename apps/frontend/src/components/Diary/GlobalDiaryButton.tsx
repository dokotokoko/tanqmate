import React from 'react';
import { Button } from '@mui/material';
import { Book as BookIcon } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { colors, shadows, zIndex } from '../../styles/design-system';

interface GlobalDiaryButtonProps {
  hidden?: boolean;
}

export const GlobalDiaryButton: React.FC<GlobalDiaryButtonProps> = ({ hidden = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (hidden || location.pathname === '/diary') return null;

  const label = '今日の探究を記録する';

  const handleClick = () => {
    navigate('/diary?autostart=1');
  };

  return (
    <Button
      variant="contained"
      startIcon={<BookIcon />}
      onClick={handleClick}
      aria-label={label}
      sx={{
        position: 'fixed',
        top: { xs: 12, sm: 18 },
        right: { xs: 12, sm: 24 },
        zIndex: zIndex.fixed,
        minHeight: 40,
        px: { xs: 1.5, sm: 2 },
        borderRadius: '12px',
        backgroundColor: colors.accentWarm.main,
        color: colors.text.inverse,
        boxShadow: shadows.accent,
        fontSize: { xs: '13px', sm: '14px' },
        '&:hover': {
          backgroundColor: colors.accentWarm.hover,
          boxShadow: shadows.accent,
        },
      }}
    >
      {label}
    </Button>
  );
};
