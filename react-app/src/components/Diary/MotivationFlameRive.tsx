import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import Rive from '@rive-app/react-canvas';

const MOTIVATIONS = [
  { min: 0, max: 8, text: 'もう疲れた。' },
  { min: 8, max: 20, text: 'うーん、ちょっと立ち止まってきたかも。' },
  { min: 20, max: 35, text: 'なんか気になってきた。' },
  { min: 35, max: 50, text: '楽しくなってきた！' },
  { min: 50, max: 65, text: 'もっとやりたい！' },
  { min: 65, max: 80, text: 'まだまだやりたい！' },
  { min: 80, max: 101, text: 'まだまだやりたい！放課後もやりたい！' }
];

const Card = styled(Box)({
  width: '100%',
  maxWidth: '400px',
  background: 'white',
  border: '1px solid #D8D2C8',
  borderRadius: '6px',
  overflow: 'hidden'
});

const CardHeader = styled(Box)({
  padding: '18px 24px 14px',
  borderBottom: '1px solid #D8D2C8',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
});

const HeaderNum = styled(Box)({
  width: '20px',
  height: '20px',
  background: '#1C1A16',
  color: 'white',
  borderRadius: '50%',
  fontSize: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
});

const HeaderTitle = styled(Typography)({
  fontSize: '11px',
  letterSpacing: '0.14em',
  color: '#6B6558',
  fontWeight: 500
});

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

const RiveCanvas = styled('canvas')({
  display: 'block',
  width: '160px',
  height: '200px',
  pointerEvents: 'none'
});

const FlamePlaceholder = styled(Box)({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  pointerEvents: 'none'
});

const PlaceholderIcon = styled(Box)<{ intensity: number }>(({ intensity }) => ({
  fontSize: `${40 + intensity * 0.5}px`,
  lineHeight: 1,
  transition: 'transform 0.15s, filter 0.15s',
  filter: intensity > 5 ? 'grayscale(0)' : 'grayscale(0.8)'
}));

const PlaceholderHint = styled(Typography)({
  fontSize: '10px',
  color: '#B8B0A2',
  letterSpacing: '0.08em'
});

const MotivationWrap = styled(Box)({
  minHeight: '52px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '12px 24px 0'
});

const MotivationText = styled(Typography)<{ idle?: boolean }>(({ idle }) => ({
  fontFamily: idle ? "'Noto Sans JP', sans-serif" : "'Noto Serif JP', serif",
  fontSize: idle ? '12px' : '17px',
  color: idle ? '#B8B0A2' : '#1C1A16',
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
    color: value > 5 ? `hsl(${hue},${sat}%,${lit}%)` : '#1C1A16',
    minWidth: '44px',
    textAlign: 'right' as const,
    transition: 'color 0.2s',
    lineHeight: 1
  };
});

const ScoreUnit = styled(Typography)({
  fontSize: '11px',
  color: '#B8B0A2',
  letterSpacing: '0.06em',
  alignSelf: 'flex-end',
  paddingBottom: '2px'
});

const TrackSection = styled(Box)({
  padding: '16px 24px 28px'
});

const TickRow = styled(Box)({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: '8px'
});

const Tick = styled(Typography)<{ active?: boolean }>(({ active }) => ({
  fontSize: '9px',
  color: active ? '#CC3300' : '#B8B0A2',
  letterSpacing: '0.04em',
  textAlign: 'center',
  flex: 1,
  lineHeight: 1.4,
  transition: 'color 0.2s, font-weight 0.15s',
  fontWeight: active ? 500 : 400
}));

const Track = styled(Box)({
  position: 'relative',
  height: '5px',
  background: '#D8D2C8',
  borderRadius: '3px',
  cursor: 'pointer',
  touchAction: 'none',
  '&::before, &::after': {
    content: '""',
    position: 'absolute',
    top: '-3px',
    bottom: '-3px',
    width: '1px',
    background: 'white',
    zIndex: 2
  },
  '&::before': { left: '25%' },
  '&::after': { left: '50%' }
});

const Notch = styled(Box)({
  position: 'absolute',
  top: '-3px',
  bottom: '-3px',
  left: '75%',
  width: '1px',
  background: 'white',
  zIndex: 2
});

const TrackFill = styled(Box)<{ width: number }>(({ width }) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  borderRadius: '3px',
  background: 'linear-gradient(to right, #FFAA44, #FF4400)',
  width: `${width}%`,
  transition: 'width 0.04s',
  pointerEvents: 'none'
}));

const Thumb = styled(Box)<{ position: number }>(({ position }) => ({
  position: 'absolute',
  top: '50%',
  left: `${position}%`,
  transform: 'translate(-50%, -50%)',
  width: '20px',
  height: '20px',
  borderRadius: '50%',
  background: 'white',
  border: '2.5px solid #FF5500',
  boxShadow: '0 1px 5px rgba(0,0,0,0.16)',
  cursor: 'grab',
  transition: 'box-shadow 0.1s, transform 0.06s',
  touchAction: 'none',
  zIndex: 3,
  '&:active': {
    cursor: 'grabbing',
    transform: 'translate(-50%, -50%) scale(1.2)',
    boxShadow: '0 0 0 5px rgba(255,80,0,0.15), 0 1px 5px rgba(0,0,0,0.16)'
  }
}));

interface MotivationFlameRiveProps {
  value: number;
  onChange: (value: number) => void;
}

export const MotivationFlameRive: React.FC<MotivationFlameRiveProps> = ({ value, onChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riveRef = useRef<any>(null);
  const heatInputRef = useRef<any>(null);
  const [riveLoaded, setRiveLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragStartValue, setDragStartValue] = useState<number>(value);
  const trackRef = useRef<HTMLDivElement>(null);
  const flameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      // Riveファイルをpublicフォルダに配置する必要があります
      riveRef.current = new Rive({
        src: '/flame.riv', // publicフォルダにflame.rivを配置
        canvas: canvasRef.current,
        autoplay: true,
        stateMachines: 'FlameControl',
        onLoad: () => {
          const inputs = riveRef.current.stateMachineInputs('FlameControl');
          heatInputRef.current = inputs?.find((i: any) => i.name === 'heat');
          if (heatInputRef.current) {
            setRiveLoaded(true);
            heatInputRef.current.value = value;
          }
        },
        onLoadError: () => {
          console.info('[探Qメイト] flame.riv が見つかりません。placeholderで動作します。');
        }
      });
    } catch (e) {
      console.info('[探Qメイト] Rive初期化スキップ:', e);
    }

    return () => {
      if (riveRef.current) {
        riveRef.current.cleanup();
      }
    };
  }, []);

  useEffect(() => {
    if (heatInputRef.current) {
      heatInputRef.current.value = value;
    }
  }, [value]);

  const getMotivation = (v: number) => {
    return MOTIVATIONS.find(m => v >= m.min && v < m.max) || MOTIVATIONS[MOTIVATIONS.length - 1];
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const newValue = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    onChange(Math.max(0, Math.min(100, newValue)));
  };

  const handleTrackDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerdown') {
      setDragging(true);
      trackRef.current?.setPointerCapture(e.pointerId);
      handleTrackClick(e as any);
    } else if (e.type === 'pointermove' && dragging && trackRef.current) {
      const rect = trackRef.current.getBoundingClientRect();
      const newValue = Math.round(((e.clientX - rect.left) / rect.width) * 100);
      onChange(Math.max(0, Math.min(100, newValue)));
    } else if (e.type === 'pointerup') {
      setDragging(false);
    }
  };

  const handleFlameAreaDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerdown') {
      setDragStartY(e.clientY);
      setDragStartValue(value);
      flameAreaRef.current?.setPointerCapture(e.pointerId);
      e.preventDefault();
    } else if (e.type === 'pointermove' && dragStartY !== null) {
      const dy = dragStartY - e.clientY;
      const delta = (dy / 160) * 100;
      const newValue = Math.round(dragStartValue + delta);
      onChange(Math.max(0, Math.min(100, newValue)));
    } else if (e.type === 'pointerup') {
      setDragStartY(null);
    }
  };

  const motivation = getMotivation(value);
  const tickIndex = value < 25 ? 0 : value < 50 ? 1 : value < 75 ? 2 : 3;

  return (
    <Card>
      <CardHeader>
        <HeaderNum>4</HeaderNum>
        <HeaderTitle>今日の探究心の温度</HeaderTitle>
      </CardHeader>

      <FlameArea
        ref={flameAreaRef}
        onPointerDown={handleFlameAreaDrag}
        onPointerMove={handleFlameAreaDrag}
        onPointerUp={handleFlameAreaDrag}
      >
        <RiveCanvas ref={canvasRef} />
        {!riveLoaded && (
          <FlamePlaceholder>
            <PlaceholderHint>炎のアニメーションを読み込み中...</PlaceholderHint>
          </FlamePlaceholder>
        )}
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
        <Track
          ref={trackRef}
          onPointerDown={handleTrackDrag}
          onPointerMove={handleTrackDrag}
          onPointerUp={handleTrackDrag}
        >
          <Notch />
          <TrackFill width={value} />
          <Thumb position={value} />
        </Track>
      </TrackSection>
    </Card>
  );
};