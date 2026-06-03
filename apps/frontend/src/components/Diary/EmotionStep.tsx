import React from 'react';
import { Box, Typography, styled, alpha } from '@mui/material';

// 感情選択肢（要件定義に基づく）
const emotions = [
  { id: 'wakuwaku', label: 'ワクワク', sub: '興味が湧いてる', color: '#EF9F27', bgColor: '#FAEEDA', emoji: '✨' },
  { id: 'sukkiri', label: 'すっきり', sub: '整理できた', color: '#1D9E75', bgColor: '#E1F5EE', emoji: '💡' },
  { id: 'moyamoya', label: 'モヤモヤ', sub: 'まだ見えない', color: '#7F77DD', bgColor: '#EEEDFE', emoji: '🌫️' },
  { id: 'fuan', label: '不安', sub: '進めるか心配', color: '#378ADD', bgColor: '#E6F1FB', emoji: '😟' },
  { id: 'ikizumari', label: '行き詰まり', sub: '動けない', color: '#E24B4A', bgColor: '#FCEBEB', emoji: '🚧' },
  { id: 'omoshiroi', label: 'おもしろい', sub: '発見がある', color: '#639922', bgColor: '#EAF3DE', emoji: '🎯' },
  { id: 'muzukashii', label: 'むずかしい', sub: '考えてる途中', color: '#D4537E', bgColor: '#FBEAF0', emoji: '🤔' },
  { id: 'tanoshii', label: 'たのしい', sub: 'のってる', color: '#D85A30', bgColor: '#FAECE7', emoji: '😄' },
];

// 感情カード（有機的なフォルム）
const EmotionCard = styled(Box)<{ selected?: boolean; color: string; bgColor: string }>(
  ({ selected, color, bgColor }) => ({
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 12px',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    backgroundColor: selected ? bgColor : 'white',
    border: `2px solid ${selected ? color : alpha('#E0E0E0', 0.6)}`,
    '&:hover': {
      transform: 'translateY(-4px) scale(1.02)',
      boxShadow: `0 8px 24px ${alpha(color, 0.15)}`,
      borderColor: color,
    },
    '&:active': {
      transform: 'translateY(-2px) scale(1.01)',
    },
  })
);

const EmotionEmoji = styled(Box)({
  fontSize: '32px',
  lineHeight: 1,
  marginBottom: '4px',
});

const EmotionLabel = styled(Typography)({
  fontSize: '14px',
  fontWeight: 600,
  lineHeight: 1.2,
});

const EmotionSub = styled(Typography)({
  fontSize: '11px',
  opacity: 0.7,
  lineHeight: 1.2,
});

interface EmotionStepProps {
  selectedEmotions: string[];
  onEmotionToggle: (emotionId: string) => void;
}

const EmotionStep: React.FC<EmotionStepProps> = ({ selectedEmotions, onEmotionToggle }) => {
  return (
    <Box>
      <Typography 
        variant="h6" 
        sx={{ 
          fontWeight: 600, 
          color: '#1A237E',
          textAlign: 'center',
          mb: 1,
        }}
      >
        今の感情は？
      </Typography>
      <Typography 
        variant="body2" 
        sx={{ 
          color: alpha('#546E7A', 0.8),
          textAlign: 'center',
          mb: 4,
        }}
      >
        今日の探究でどんな気持ちになりましたか？（複数選択可）
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 2,
          maxWidth: '600px',
          mx: 'auto',
        }}
      >
        {emotions.map((emotion) => (
          <EmotionCard
            key={emotion.id}
            selected={selectedEmotions.includes(emotion.id)}
            color={emotion.color}
            bgColor={emotion.bgColor}
            onClick={() => onEmotionToggle(emotion.id)}
          >
            <EmotionEmoji>{emotion.emoji}</EmotionEmoji>
            <EmotionLabel sx={{ color: emotion.color }}>
              {emotion.label}
            </EmotionLabel>
            <EmotionSub sx={{ color: alpha(emotion.color, 0.8) }}>
              {emotion.sub}
            </EmotionSub>
          </EmotionCard>
        ))}
      </Box>
    </Box>
  );
};

export default EmotionStep;