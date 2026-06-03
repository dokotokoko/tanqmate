import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Slider } from '@mui/material';
import { styled } from '@mui/material/styles';

const MOTIVATIONS = [
  { min: 0, max: 8, text: 'もう疲れた。' },
  { min: 8, max: 20, text: 'うーん、ちょっと立ち止まってきたかも。' },
  { min: 20, max: 35, text: 'なんか気になってきた。' },
  { min: 35, max: 50, text: '楽しくなってきた！' },
  { min: 50, max: 65, text: 'もっとやりたい！' },
  { min: 65, max: 80, text: 'まだまだやりたい！' },
  { min: 80, max: 101, text: 'まだまだやりたい！放課後もやりたい！' }
];

const Card = styled(Box)(({ theme }) => ({
  width: '100%',
  maxWidth: '400px',
  background: 'white',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: '6px',
  overflow: 'hidden'
}));

const CardHeader = styled(Box)(({ theme }) => ({
  padding: '18px 24px 14px',
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
}));

const HeaderNumber = styled(Box)(({ theme }) => ({
  width: '20px',
  height: '20px',
  background: theme.palette.text.primary,
  color: 'white',
  borderRadius: '50%',
  fontSize: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
}));

const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontSize: '11px',
  letterSpacing: '0.14em',
  color: theme.palette.text.secondary,
  fontWeight: 500
}));

const FlameArea = styled(Box)({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '220px',
  background: '#FDFAF6',
  cursor: 'ns-resize',
  userSelect: 'none',
  WebkitUserSelect: 'none'
});

const FlameSVG = styled('svg')<{ intensity: number }>(({ intensity }) => ({
  width: '160px',
  height: '200px',
  filter: `drop-shadow(0 0 ${20 + intensity * 0.3}px rgba(255, ${100 - intensity * 0.5}, 0, ${0.3 + intensity * 0.007}))`
}));

const MotivationWrap = styled(Box)({
  minHeight: '52px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 24px 0'
});

const MotivationText = styled(Typography)<{ idle?: boolean }>(({ theme, idle }) => ({
  fontFamily: idle ? "'Noto Sans JP', sans-serif" : "'Noto Serif JP', serif",
  fontSize: idle ? '12px' : '17px',
  color: idle ? theme.palette.text.disabled : theme.palette.text.primary,
  textAlign: 'center',
  lineHeight: 1.6,
  transition: 'color 0.2s, opacity 0.15s',
  minHeight: '28px',
  letterSpacing: idle ? '0.06em' : 'normal'
}));

const ScoreRow = styled(Box)({
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'center',
  gap: '3px',
  padding: '6px 24px 0'
});

const ScoreNum = styled(Typography)<{ value: number }>(({ value }) => {
  const hue = Math.round(25 - value * 0.2);
  const sat = Math.round(value * 0.8);
  const lit = Math.round(42 - value * 0.1);
  return {
    fontFamily: "'Noto Serif JP', serif",
    fontSize: '28px',
    fontWeight: 600,
    color: value > 5 ? `hsl(${hue},${sat}%,${lit}%)` : 'var(--ink)',
    minWidth: '44px',
    textAlign: 'right' as const,
    transition: 'color 0.2s',
    lineHeight: 1
  };
});

const ScoreUnit = styled(Typography)(({ theme }) => ({
  fontSize: '11px',
  color: theme.palette.text.disabled,
  letterSpacing: '0.06em',
  alignSelf: 'flex-end',
  paddingBottom: '2px'
}));

const TrackSection = styled(Box)({
  padding: '16px 24px 28px'
});

const TickRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px'
});

const Tick = styled(Typography)<{ active?: boolean }>(({ theme, active }) => ({
  fontSize: '9px',
  color: active ? '#CC3300' : theme.palette.text.disabled,
  letterSpacing: '0.04em',
  textAlign: 'center',
  flex: 1,
  lineHeight: 1.4,
  transition: 'color 0.2s, font-weight 0.15s',
  fontWeight: active ? 500 : 400
}));

const StyledSlider = styled(Slider)({
  color: '#FF5500',
  height: 5,
  '& .MuiSlider-track': {
    border: 'none',
    background: 'linear-gradient(to right, #FFAA44, #FF4400)'
  },
  '& .MuiSlider-rail': {
    opacity: 1,
    backgroundColor: '#D8D2C8'
  },
  '& .MuiSlider-thumb': {
    height: 20,
    width: 20,
    backgroundColor: '#fff',
    border: '2.5px solid #FF5500',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: '0 0 0 5px rgba(255, 80, 0, 0.15)'
    }
  }
});

interface MotivationFlameProps {
  value: number;
  onChange: (value: number) => void;
}

export const MotivationFlame: React.FC<MotivationFlameProps> = ({ value, onChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragStartValue, setDragStartValue] = useState<number>(value);
  const flameAreaRef = useRef<HTMLDivElement>(null);

  const getMotivation = (v: number) => {
    return MOTIVATIONS.find(m => v >= m.min && v < m.max) || MOTIVATIONS[MOTIVATIONS.length - 1];
  };

  const handleFlameAreaDrag = (e: React.PointerEvent) => {
    if (e.type === 'pointerdown') {
      setIsDragging(true);
      setDragStartY(e.clientY);
      setDragStartValue(value);
      flameAreaRef.current?.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else if (e.type === 'pointermove' && isDragging && dragStartY !== null) {
      const dy = dragStartY - e.clientY;
      const delta = (dy / 160) * 100;
      const newValue = Math.max(0, Math.min(100, dragStartValue + delta));
      onChange(Math.round(newValue));
    } else if (e.type === 'pointerup') {
      setIsDragging(false);
      setDragStartY(null);
    }
  };

  const motivation = getMotivation(value);
  const tickIndex = value < 25 ? 0 : value < 50 ? 1 : value < 75 ? 2 : 3;

  // 炎のパスを動的に生成（valueに応じて変形）
  const flameHeight = 60 + value * 0.8;
  const flameWidth = 40 + value * 0.3;
  const flickerOffset = Math.sin(Date.now() * 0.001) * 2;

  return (
    <Card>
      <CardHeader>
        <HeaderNumber>4</HeaderNumber>
        <HeaderTitle>今日の探究心の温度</HeaderTitle>
      </CardHeader>

      <FlameArea
        ref={flameAreaRef}
        onPointerDown={handleFlameAreaDrag}
        onPointerMove={handleFlameAreaDrag}
        onPointerUp={handleFlameAreaDrag}
        intensity={value}
      >
        <FlameSVG
          intensity={value}
          viewBox="0 0 160 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="flameGradient" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#FF6600" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#FF9900" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#FFCC00" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <path
            d={`M 80,${180 - flameHeight} 
                C ${80 - flameWidth},${180 - flameHeight * 0.8} 
                  ${80 - flameWidth * 0.8},${180 - flameHeight * 0.4} 
                  ${80 - flameWidth * 0.5},180 
                L ${80 + flameWidth * 0.5},180 
                C ${80 + flameWidth * 0.8},${180 - flameHeight * 0.4} 
                  ${80 + flameWidth},${180 - flameHeight * 0.8} 
                  80,${180 - flameHeight} Z`}
            fill="url(#flameGradient)"
            opacity={0.3 + value * 0.007}
            transform={`translate(${flickerOffset}, 0)`}
          />
          {value > 30 && (
            <path
              d={`M 80,${180 - flameHeight * 0.7} 
                  C ${80 - flameWidth * 0.6},${180 - flameHeight * 0.5} 
                    ${80 - flameWidth * 0.4},${180 - flameHeight * 0.2} 
                    80,180`}
              fill="#FFAA00"
              opacity={0.4 + value * 0.004}
            />
          )}
        </FlameSVG>
      </FlameArea>

      <MotivationWrap>
        <MotivationText idle={value === 0}>
          {value === 0 ? 'スライダーを動かしてみよう' : motivation.text}
        </MotivationText>
      </MotivationWrap>

      <ScoreRow>
        <ScoreNum value={value}>{value === 0 ? '—' : value}</ScoreNum>
        <ScoreUnit>/ 100</ScoreUnit>
      </ScoreRow>

      <TrackSection>
        <TickRow>
          <Tick active={tickIndex === 0}>消えそう</Tick>
          <Tick active={tickIndex === 1}>弱火</Tick>
          <Tick active={tickIndex === 2}>中火</Tick>
          <Tick active={tickIndex === 3}>強火</Tick>
        </TickRow>
        <StyledSlider
          value={value}
          onChange={(_, newValue) => onChange(newValue as number)}
          min={0}
          max={100}
          marks={[
            { value: 25 },
            { value: 50 },
            { value: 75 }
          ]}
        />
      </TrackSection>
    </Card>
  );
};