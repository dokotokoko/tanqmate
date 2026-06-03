import React, { useEffect, useId, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';
import { EmotionType } from './EmotionIcon';

interface EmotionOption {
  id: EmotionType;
  label: string;
  sub: string;
  fill: string;
  stroke: string;
  text: string;
  path: string;
}

export const emotionOptions: EmotionOption[] = [
  {
    id: 'wakuwaku',
    label: 'ワクワク',
    sub: '興味が湧いてる',
    fill: '#FAEEDA',
    stroke: '#EF9F27',
    text: '#854F0B',
    path: 'M50,12 C68,10 88,22 90,40 C93,58 82,75 68,82 C54,90 32,90 20,78 C8,66 7,46 16,30 C24,15 32,14 50,12 Z'
  },
  {
    id: 'sukkiri',
    label: 'すっきり',
    sub: '整理できた',
    fill: '#E1F5EE',
    stroke: '#1D9E75',
    text: '#0F6E56',
    path: 'M50,10 C65,8 82,20 86,38 C90,55 80,74 64,82 C48,90 28,86 16,72 C4,58 6,36 18,22 C28,10 36,12 50,10 Z'
  },
  {
    id: 'moyamoya',
    label: 'モヤモヤ',
    sub: 'まだ見えない',
    fill: '#EEEDFE',
    stroke: '#7F77DD',
    text: '#534AB7',
    path: 'M48,14 C62,8 84,18 88,36 C92,52 80,72 64,82 C48,90 26,88 14,74 C2,60 6,38 18,24 C28,12 36,18 48,14 Z'
  },
  {
    id: 'fuan',
    label: '不安',
    sub: '進めるか心配',
    fill: '#E6F1FB',
    stroke: '#378ADD',
    text: '#185FA5',
    path: 'M50,16 C66,10 86,24 88,42 C90,58 78,76 62,84 C46,92 24,88 14,74 C4,60 8,38 20,26 C30,14 36,20 50,16 Z'
  },
  {
    id: 'ikizumari',
    label: '行き詰まり',
    sub: '動けない',
    fill: '#FCEBEB',
    stroke: '#E24B4A',
    text: '#A32D2D',
    path: 'M50,18 C64,14 80,26 84,44 C88,60 76,76 60,84 C44,92 24,86 14,70 C4,54 10,34 24,22 C34,12 38,22 50,18 Z'
  },
  {
    id: 'omoshiroi',
    label: 'おもしろい',
    sub: '発見がある',
    fill: '#EAF3DE',
    stroke: '#639922',
    text: '#3B6D11',
    path: 'M50,10 C66,6 86,16 90,34 C94,52 82,72 64,82 C46,92 24,90 12,76 C0,62 4,38 16,24 C26,10 34,14 50,10 Z'
  },
  {
    id: 'muzukashii',
    label: 'むずかしい',
    sub: '考えてる途中',
    fill: '#FBEAF0',
    stroke: '#D4537E',
    text: '#993556',
    path: 'M50,14 C64,10 82,22 86,40 C90,56 80,74 64,84 C48,92 28,88 16,74 C4,60 6,40 16,26 C26,12 36,18 50,14 Z'
  },
  {
    id: 'tanoshii',
    label: 'たのしい',
    sub: 'のってる',
    fill: '#FAECE7',
    stroke: '#D85A30',
    text: '#993C1D',
    path: 'M50,8 C68,4 90,18 92,38 C94,56 80,76 62,84 C44,92 22,90 10,76 C-2,62 2,38 14,22 C24,8 34,12 50,8 Z'
  }
];

const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: '11px',
  fontWeight: 500,
  color: theme.palette.text.secondary,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  marginBottom: '14px'
}));

const EmotionGrid = styled(Box)({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
  gap: '12px',
  marginBottom: '32px'
});

const EmotionLabel = styled(Typography)({
  fontSize: '12px',
  fontWeight: 500,
  textAlign: 'center'
});

const EmotionSub = styled(Typography)(({ theme }) => ({
  fontSize: '10px',
  color: theme.palette.text.secondary,
  textAlign: 'center'
}));

interface EmotionSelectorProps {
  value?: EmotionType[];
  onChange: (emotions: EmotionType[]) => void;
  title?: string;
  helperText?: string;
  maxSelections?: number;
}

export const EmotionSelector: React.FC<EmotionSelectorProps> = ({
  value = [],
  onChange,
  title = '今の気持ちを選んでください',
  helperText = '複数選べます',
  maxSelections = 4,
}) => {
  const titleId = useId();
  const helperId = useId();
  const noticeId = useId();
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!limitNotice) return;

    const timer = window.setTimeout(() => {
      setLimitNotice(null);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [limitNotice]);

  const toggleEmotion = (emotion: EmotionType) => {
    const selected = value.includes(emotion);
    if (selected) {
      onChange(value.filter((item) => item !== emotion));
      setLimitNotice(null);
      return;
    }

    if (value.length >= maxSelections) {
      setLimitNotice(`最大${maxSelections}つまでです。いま選んでいる気持ちを1つ外すと、別の気持ちを選べます。`);
      return;
    }

    onChange([...value, emotion]);
    setLimitNotice(null);
  };

  const describedBy = limitNotice ? `${helperId} ${noticeId}` : helperId;

  return (
    <Box>
      <SectionLabel id={titleId}>{title}</SectionLabel>
      <EmotionGrid role="group" aria-labelledby={titleId} aria-describedby={describedBy}>
        {emotionOptions.map((emotion) => (
          <Box
            key={emotion.id}
            component="button"
            type="button"
            aria-pressed={value.includes(emotion.id)}
            aria-disabled={!value.includes(emotion.id) && value.length >= maxSelections}
            aria-label={`${emotion.label}、${emotion.sub}${value.includes(emotion.id) ? '、選択中' : ''}`}
            onClick={() => toggleEmotion(emotion.id)}
            sx={{
              appearance: 'none',
              WebkitAppearance: 'none',
              font: 'inherit',
              margin: 0,
              textAlign: 'inherit',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '14px 8px',
              borderRadius: '12px',
              border: `1.5px solid ${value.includes(emotion.id) ? emotion.stroke : alpha(emotion.stroke, 0.24)}`,
              backgroundColor: value.includes(emotion.id) ? alpha(emotion.fill, 0.92) : 'transparent',
              color: 'inherit',
              cursor: !value.includes(emotion.id) && value.length >= maxSelections ? 'not-allowed' : 'pointer',
              boxShadow: value.includes(emotion.id)
                ? `0 0 0 1px ${alpha(emotion.stroke, 0.18)}, 0 10px 20px ${alpha(emotion.stroke, 0.12)}`
                : 'none',
              transform: value.includes(emotion.id) ? 'translateY(-1px)' : 'translateY(0)',
              transition: 'border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease, opacity 0.16s ease',
              opacity: !value.includes(emotion.id) && value.length >= maxSelections ? 0.78 : 1,
              outline: 'none',
              '&:hover': {
                borderColor: emotion.stroke,
                backgroundColor: value.includes(emotion.id)
                  ? alpha(emotion.fill, 0.98)
                  : alpha(emotion.fill, 0.22),
                boxShadow: value.includes(emotion.id)
                  ? `0 0 0 1px ${alpha(emotion.stroke, 0.22)}, 0 12px 22px ${alpha(emotion.stroke, 0.16)}`
                  : `0 8px 18px ${alpha(emotion.stroke, 0.08)}`
              },
              '&:focus-visible': {
                outline: `3px solid ${alpha(emotion.stroke, 0.45)}`,
                outlineOffset: 2
              },
              '&:active': {
                transform: 'translateY(0) scale(0.99)'
              }
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d={emotion.path}
                fill={emotion.fill}
                stroke={emotion.stroke}
                strokeWidth="2"
              />
              <text
                x="50"
                y="56"
                textAnchor="middle"
                fontSize="28"
                fontFamily="sans-serif"
                fill={emotion.text}
                fontWeight="500"
              >
                {emotion.label[0]}
              </text>
            </svg>
            <EmotionLabel>{emotion.label}</EmotionLabel>
            <EmotionSub>{emotion.sub}</EmotionSub>
          </Box>
        ))}
      </EmotionGrid>
      <Typography id={helperId} variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {helperText}
      </Typography>
      <Typography
        id={noticeId}
        role="status"
        aria-live="polite"
        variant="body2"
        sx={{
          minHeight: '1.5em',
          mb: 1,
          color: 'warning.main',
          fontWeight: 500
        }}
      >
        {limitNotice ?? ' '}
      </Typography>
    </Box>
  );
};
