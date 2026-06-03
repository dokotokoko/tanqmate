import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, styled, alpha, Slider } from '@mui/material';

// モチベーションテキスト仕様（要件定義に基づく）
const motivationTexts = [
  { min: 0, max: 7, text: '面倒くさい。やる気ない', emoji: '💤' },
  { min: 8, max: 19, text: 'うーん、ちょっと立ち止まってきたかも。', emoji: '😶' },
  { min: 20, max: 34, text: 'なんか気になってきた。', emoji: '👀' },
  { min: 35, max: 49, text: '楽しくなってきた！', emoji: '😊' },
  { min: 50, max: 64, text: 'まだまだやりたい！', emoji: '😄' },
  { min: 65, max: 79, text: '次の探究の授業が待ち遠しい！', emoji: '🔥' },
  { min: 80, max: 100, text: '放課後もやる！', emoji: '🔥🔥' },
];

// 炎エリア
const FlameArea = styled(Box)({
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: '240px',
  background: 'linear-gradient(180deg, #FFF8F1 0%, #FFEAA7 100%)',
  borderRadius: '12px',
  cursor: 'ns-resize',
  userSelect: 'none',
  marginBottom: '24px',
  overflow: 'hidden',
});

// 炎のプレースホルダー（Rive未実装時の代替）
const FlamePlaceholder = styled(Box)<{ intensity: number }>(({ intensity }) => ({
  fontSize: `${48 + intensity * 0.8}px`,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  filter: intensity > 20 ? 'grayscale(0)' : 'grayscale(0.8)',
  animation: intensity > 50 ? 'flame-dance 1s ease-in-out infinite' : 'none',
  '@keyframes flame-dance': {
    '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
    '25%': { transform: 'scale(1.1) rotate(-2deg)' },
    '50%': { transform: 'scale(1.05) rotate(2deg)' },
    '75%': { transform: 'scale(1.08) rotate(-1deg)' },
  },
}));

// モチベーションテキスト
const MotivationText = styled(Typography)<{ intensity: number }>(({ intensity }) => {
  const hue = Math.round(25 - intensity * 0.2);
  const sat = Math.round(intensity * 0.8);
  const lit = Math.round(42 - intensity * 0.1);
  
  return {
    fontSize: '18px',
    fontWeight: 600,
    textAlign: 'center',
    color: intensity > 5 ? `hsl(${hue},${sat}%,${lit}%)` : '#666',
    transition: 'all 0.3s ease',
    minHeight: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
});

// スコア表示
const ScoreDisplay = styled(Box)<{ intensity: number }>(({ intensity }) => {
  const hue = Math.round(25 - intensity * 0.2);
  const sat = Math.round(intensity * 0.8);
  const lit = Math.round(42 - intensity * 0.1);
  
  return {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: '4px',
    marginTop: '12px',
    marginBottom: '24px',
    '& .score-num': {
      fontSize: '36px',
      fontWeight: 700,
      color: intensity > 5 ? `hsl(${hue},${sat}%,${lit}%)` : '#333',
      transition: 'color 0.3s ease',
      minWidth: '60px',
      textAlign: 'right',
    },
    '& .score-unit': {
      fontSize: '14px',
      color: alpha('#666', 0.6),
    },
  };
});

// カスタムスライダー
const HeatSlider = styled(Slider)(({ theme }) => ({
  color: '#FF6B35',
  height: 8,
  '& .MuiSlider-track': {
    border: 'none',
    background: 'linear-gradient(to right, #FFAA44, #FF4400)',
  },
  '& .MuiSlider-rail': {
    opacity: 0.3,
    backgroundColor: '#E0E0E0',
  },
  '& .MuiSlider-thumb': {
    height: 24,
    width: 24,
    backgroundColor: '#fff',
    border: '3px solid #FF5500',
    boxShadow: '0 2px 8px rgba(255, 85, 0, 0.25)',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: '0 0 0 8px rgba(255, 85, 0, 0.16)',
    },
    '&::before': {
      display: 'none',
    },
  },
  '& .MuiSlider-mark': {
    backgroundColor: '#fff',
    height: 12,
    width: 2,
    '&.MuiSlider-markActive': {
      opacity: 1,
      backgroundColor: '#FF5500',
    },
  },
  '& .MuiSlider-markLabel': {
    fontSize: '11px',
    color: alpha('#666', 0.7),
    '&.MuiSlider-markLabelActive': {
      color: '#FF5500',
      fontWeight: 600,
    },
  },
}));

interface MotivationStepProps {
  heatScore: number;
  onHeatChange: (value: number) => void;
}

const MotivationStep: React.FC<MotivationStepProps> = ({ heatScore, onHeatChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragStartValue, setDragStartValue] = useState<number>(heatScore);
  const flameAreaRef = useRef<HTMLDivElement>(null);

  const getMotivationText = (value: number) => {
    return motivationTexts.find(m => value >= m.min && value <= m.max) || motivationTexts[0];
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartValue(heatScore);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || dragStartY === null) return;
    
    const deltaY = dragStartY - e.clientY; // 上方向が正
    const deltaValue = (deltaY / 160) * 100; // 160px = 100ポイント
    const newValue = Math.max(0, Math.min(100, dragStartValue + deltaValue));
    onHeatChange(Math.round(newValue));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStartY(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStartY, dragStartValue]);

  const motivation = getMotivationText(heatScore);
  
  const marks = [
    { value: 0, label: '消えそう' },
    { value: 25, label: '弱火' },
    { value: 50, label: '中火' },
    { value: 75, label: '強火' },
    { value: 100, label: '' },
  ];

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
        今の探究心はどのくらい燃えている？
      </Typography>
      <Typography 
        variant="body2" 
        sx={{ 
          color: alpha('#546E7A', 0.8),
          textAlign: 'center',
          mb: 3,
        }}
      >
        炎をドラッグするか、スライダーを動かして温度を調整しよう
      </Typography>

      <FlameArea 
        ref={flameAreaRef}
        onMouseDown={handleMouseDown}
        sx={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <FlamePlaceholder intensity={heatScore}>
          {motivation.emoji}
        </FlamePlaceholder>
        
        {/* Rive Canvas placeholder */}
        <canvas 
          id="rive-canvas" 
          style={{ 
            position: 'absolute',
            width: '200px',
            height: '200px',
            pointerEvents: 'none',
            display: 'none', // Rive実装時に表示
          }}
        />
      </FlameArea>

      <MotivationText intensity={heatScore}>
        {motivation.text}
      </MotivationText>

      <ScoreDisplay intensity={heatScore}>
        <span className="score-num">{heatScore}</span>
        <span className="score-unit">/ 100</span>
      </ScoreDisplay>

      <Box sx={{ px: 3 }}>
        <HeatSlider
          value={heatScore}
          onChange={(_, value) => onHeatChange(value as number)}
          min={0}
          max={100}
          marks={marks}
          valueLabelDisplay="auto"
          aria-label="探究心の温度"
        />
      </Box>

      <Typography 
        variant="caption" 
        sx={{ 
          display: 'block',
          textAlign: 'center',
          color: alpha('#666', 0.6),
          mt: 2,
        }}
      >
        ※ Riveアニメーションは後日実装予定
      </Typography>
    </Box>
  );
};

export default MotivationStep;