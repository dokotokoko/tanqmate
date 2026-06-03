import React from 'react';
import { Box } from '@mui/material';
import { DiaryFlowNew } from '../components/Diary/DiaryFlowNew';
import { useSearchParams } from 'react-router-dom';
import { colors, diary } from '../styles/design-system';

const DiaryPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: diary.page.background,
        backgroundImage: `${diary.atmosphere.topGlow}, ${diary.atmosphere.bottomGlow}, ${diary.atmosphere.wash}`,
        px: diary.layout.shellPaddingX,
        py: diary.layout.shellPaddingY,
      }}
    >
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          maxWidth: diary.layout.maxWidth,
          mx: 'auto',
          p: diary.layout.panelPadding,
          borderRadius: diary.layout.radius,
          backgroundColor: colors.background.paper,
          border: `1px solid ${diary.page.border}`,
          boxShadow: diary.page.shadow,
          backdropFilter: 'blur(12px)',
        }}
      >
        <DiaryFlowNew autoStart={searchParams.get('autostart') === '1'} />
      </Box>
    </Box>
  );
};

export default DiaryPage;
