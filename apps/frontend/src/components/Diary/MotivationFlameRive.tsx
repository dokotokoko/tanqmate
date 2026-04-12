import React, { useId, useMemo, useRef } from 'react';
import { Box, Slider, Typography, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';

interface MotivationFlameRiveProps {
  value: number;
  onChange: (value: number) => void;
}

type StageCopy = {
  min: number;
  max: number;
  label: string;
  description: string;
};

const MOTIVATION_STAGES: StageCopy[] = [
  { min: 0, max: 8, label: '火がつく前', description: '少し休んでからでも大丈夫です。' },
  { min: 8, max: 20, label: '火種が見え始めた', description: '気になるところをひとつ拾いましょう。' },
  { min: 20, max: 35, label: 'あたたまってきた', description: '少しずつ手が動きそうです。' },
  { min: 35, max: 50, label: '集中がのってきた', description: 'このまま続けられそうです。' },
  { min: 50, max: 65, label: 'かなりのっている', description: '考えが広がっている状態です。' },
  { min: 65, max: 80, label: '熱が高い', description: '深く掘りたくなっている状態です。' },
  { min: 80, max: 101, label: '火力が高い', description: '勢いのまま進められます。' },
];

const getStage = (value: number) =>
  MOTIVATION_STAGES.find((item) => value >= item.min && value < item.max) ?? MOTIVATION_STAGES[MOTIVATION_STAGES.length - 1];

const Card = styled(Box)({
  width: '100%',
  maxWidth: '720px',
  borderRadius: '32px',
  overflow: 'hidden',
  background:
    'radial-gradient(circle at top, rgba(255,224,177,0.88), rgba(255,248,236,0.94) 42%, rgba(255,255,255,0.98) 100%)',
  border: '1px solid rgba(217, 186, 144, 0.45)',
  boxShadow: '0 24px 60px rgba(84, 49, 19, 0.12)',
});

const FlameStage = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'intensity' && prop !== 'reduceMotion',
})<{ intensity: number; reduceMotion: boolean }>(({ intensity, reduceMotion }) => ({
  position: 'relative',
  height: '380px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  cursor: reduceMotion ? 'default' : 'ns-resize',
  userSelect: 'none',
  touchAction: 'none',
  background: `radial-gradient(circle at 50% 72%, rgba(255, 130, 38, ${0.16 + intensity / 500}), rgba(255,255,255,0) 36%), linear-gradient(180deg, rgba(255,251,244,0.95) 0%, rgba(255,243,220,0.82) 48%, rgba(255,248,236,0.98) 100%)`,
  outline: 'none',
  '&:focus-visible': {
    boxShadow: 'inset 0 0 0 3px rgba(248, 90, 24, 0.35)',
  },
}));

const Glow = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'size' && prop !== 'opacity' && prop !== 'color' && prop !== 'reduceMotion',
})<{ size: number; opacity: number; color: string; reduceMotion: boolean }>(({ size, opacity, color, reduceMotion }) => ({
  position: 'absolute',
  width: `${size}px`,
  height: `${size}px`,
  borderRadius: '50%',
  background: color,
  opacity,
  filter: reduceMotion ? 'blur(20px)' : 'blur(26px)',
  pointerEvents: 'none',
}));

const FlameWrap = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'intensity' && prop !== 'reduceMotion',
})<{ intensity: number; reduceMotion: boolean }>(({ intensity, reduceMotion }) => ({
  position: 'relative',
  width: '250px',
  height: '250px',
  transform: `translateY(${10 - intensity / 8}px) scale(${0.86 + intensity / 180})`,
  transition: reduceMotion ? 'none' : 'transform 180ms ease, filter 180ms ease',
  filter: `saturate(${0.92 + intensity / 180}) brightness(${0.9 + intensity / 220})`,
}));

const FlameSvg = styled('svg')({
  width: '100%',
  height: '100%',
  display: 'block',
});

const Spark = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'left' && prop !== 'delay' && prop !== 'duration' && prop !== 'reduceMotion',
})<{ left: string; delay: string; duration: string; reduceMotion: boolean }>(({ left, delay, duration, reduceMotion }) => ({
  position: 'absolute',
  left,
  bottom: '92px',
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  background: 'linear-gradient(180deg, rgba(255,245,214,0.95), rgba(255,160,54,0.7))',
  boxShadow: '0 0 12px rgba(255, 153, 0, 0.42)',
  animation: reduceMotion ? 'none' : `flameSpark ${duration} ease-in infinite`,
  animationDelay: delay,
  pointerEvents: 'none',
  '@keyframes flameSpark': {
    '0%': { transform: 'translateY(0) scale(0.6)', opacity: 0 },
    '12%': { opacity: 0.95 },
    '100%': { transform: 'translateY(-150px) translateX(18px) scale(1.15)', opacity: 0 },
  },
}));

const Content = styled(Box)({
  padding: '28px 28px 30px',
  display: 'grid',
  gap: '18px',
});

const StagePanel = styled(Box)({
  display: 'grid',
  gap: '10px',
  justifyItems: 'center',
  textAlign: 'center',
});

const StageBadge = styled(Box)({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '8px 14px',
  borderRadius: '999px',
  background: 'rgba(255, 236, 213, 0.95)',
  border: '1px solid rgba(217, 186, 144, 0.45)',
  color: '#8b5b2f',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.12em',
});

const StageTitle = styled(Typography)({
  fontWeight: 700,
  color: '#382110',
});

const StageDescription = styled(Typography)({
  color: '#77624d',
  maxWidth: '36em',
});

const HelperText = styled(Typography)({
  color: '#8f7757',
  textAlign: 'center',
});

const StyledSlider = styled(Slider)({
  color: '#f85a18',
  height: 8,
  '& .MuiSlider-track': {
    border: 'none',
    background: 'linear-gradient(90deg, #ffce73 0%, #ff8e30 52%, #ef4d16 100%)',
  },
  '& .MuiSlider-rail': {
    background: 'rgba(134, 97, 57, 0.16)',
    opacity: 1,
  },
  '& .MuiSlider-thumb': {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    border: '3px solid #ef4d16',
    boxShadow: '0 10px 24px rgba(239, 77, 22, 0.24)',
    '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
      boxShadow: '0 0 0 10px rgba(248, 90, 24, 0.14)',
    },
  },
  '& .MuiSlider-markLabel': {
    color: '#8f7757',
    fontSize: '11px',
  },
  '& .MuiSlider-markLabelActive': {
    color: '#d94a13',
    fontWeight: 700,
  },
});

const clampValue = (nextValue: number) => Math.max(0, Math.min(100, nextValue));

const stepMarks = [
  { value: 0, label: '火がつく前' },
  { value: 25, label: '火種' },
  { value: 50, label: '集中' },
  { value: 75, label: '高まり' },
  { value: 100, label: '燃える' },
];

export const MotivationFlameRive: React.FC<MotivationFlameRiveProps> = ({ value, onChange }) => {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragStartValueRef = useRef<number>(value);
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)', { noSsr: true });
  const stage = useMemo(() => getStage(value), [value]);
  const helperId = useId();

  const outerHeight = 170 + value * 0.7;
  const innerHeight = 110 + value * 0.56;
  const coreHeight = 66 + value * 0.34;

  const updateValue = (nextValue: number) => {
    onChange(clampValue(Math.round(nextValue)));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStartYRef.current = event.clientY;
    dragStartValueRef.current = value;
    stageRef.current?.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartYRef.current === null) return;
    const delta = ((dragStartYRef.current - event.clientY) / 220) * 100;
    updateValue(dragStartValueRef.current + delta);
  };

  const handlePointerUp = () => {
    dragStartYRef.current = null;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;

    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowRight':
        event.preventDefault();
        updateValue(value + step);
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        event.preventDefault();
        updateValue(value - step);
        break;
      case 'PageUp':
        event.preventDefault();
        updateValue(value + 10);
        break;
      case 'PageDown':
        event.preventDefault();
        updateValue(value - 10);
        break;
      case 'Home':
        event.preventDefault();
        updateValue(0);
        break;
      case 'End':
        event.preventDefault();
        updateValue(100);
        break;
      default:
        break;
    }
  };

  const ariaValueText = `${stage.label}。${stage.description}`;

  return (
    <Card>
      <FlameStage
        ref={stageRef}
        intensity={value}
        reduceMotion={reduceMotion}
        role="slider"
        tabIndex={0}
        aria-label="探究の火の強さ"
        aria-orientation="vertical"
        aria-describedby={helperId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={ariaValueText}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleKeyDown}
      >
        {!reduceMotion && (
          <>
            <Glow size={300 + value * 0.6} opacity={0.08 + value / 900} color="rgba(255, 174, 66, 0.9)" reduceMotion={reduceMotion} />
            <Glow size={180 + value * 0.9} opacity={0.1 + value / 600} color="rgba(255, 94, 0, 0.66)" reduceMotion={reduceMotion} />
            <Spark left="36%" delay="0.1s" duration="2.2s" reduceMotion={reduceMotion} />
            <Spark left="48%" delay="0.6s" duration="2.8s" reduceMotion={reduceMotion} />
            <Spark left="58%" delay="1.1s" duration="2.4s" reduceMotion={reduceMotion} />
          </>
        )}
        <FlameWrap intensity={value} reduceMotion={reduceMotion}>
          <FlameSvg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <linearGradient id="outerFlameGradient" x1="50%" y1="100%" x2="50%" y2="0%">
                <stop offset="0%" stopColor="#ff5a12" />
                <stop offset="48%" stopColor="#ff9b24" />
                <stop offset="100%" stopColor="#ffe28a" />
              </linearGradient>
              <linearGradient id="innerFlameGradient" x1="50%" y1="100%" x2="50%" y2="0%">
                <stop offset="0%" stopColor="#ff6c10" />
                <stop offset="52%" stopColor="#ffcb45" />
                <stop offset="100%" stopColor="#fff0bb" />
              </linearGradient>
              <linearGradient id="coreFlameGradient" x1="50%" y1="100%" x2="50%" y2="0%">
                <stop offset="0%" stopColor="#fff0a1" />
                <stop offset="100%" stopColor="#fffdf1" />
              </linearGradient>
            </defs>

            <path
              d={`M120 ${210 - outerHeight}
                  C ${48 - value * 0.12} ${190 - outerHeight * 0.78}, ${54 - value * 0.1} ${140 - outerHeight * 0.34}, ${104 - value * 0.08} 208
                  C 110 186, 88 ${172 - value * 0.22}, 96 ${136 - value * 0.35}
                  C 102 ${116 - value * 0.32}, 118 ${86 - value * 0.45}, 120 ${64 - value * 0.42}
                  C 122 ${86 - value * 0.46}, 142 ${120 - value * 0.32}, 152 ${144 - value * 0.25}
                  C 164 ${118 - value * 0.24}, 190 ${112 - value * 0.1}, 188 208
                  C ${174 + value * 0.08} ${188 - outerHeight * 0.12}, ${188 + value * 0.07} ${162 - outerHeight * 0.34}, 120 ${210 - outerHeight} Z`}
              fill="url(#outerFlameGradient)"
              opacity={0.95}
            />
            <path
              d={`M120 ${218 - innerHeight}
                  C ${70 - value * 0.08} ${194 - innerHeight * 0.66}, ${90 - value * 0.06} ${154 - innerHeight * 0.18}, 112 208
                  C 116 182, 104 ${156 - value * 0.2}, 112 ${126 - value * 0.22}
                  C 116 ${104 - value * 0.24}, 122 ${92 - value * 0.28}, 124 ${78 - value * 0.22}
                  C 128 ${100 - value * 0.24}, 142 ${126 - value * 0.18}, 150 ${152 - value * 0.12}
                  C 160 ${134 - value * 0.2}, ${170 + value * 0.04} ${156 - value * 0.06}, 156 208
                  C ${148 + value * 0.05} ${198 - innerHeight * 0.06}, ${160 + value * 0.04} ${170 - innerHeight * 0.2}, 120 ${218 - innerHeight} Z`}
              fill="url(#innerFlameGradient)"
              opacity={0.92}
            />
            <path
              d={`M120 ${220 - coreHeight}
                  C ${96 - value * 0.04} ${204 - coreHeight * 0.48}, ${108 - value * 0.03} ${174 - coreHeight * 0.08}, 118 208
                  C 120 190, 116 ${170 - value * 0.12}, 120 ${150 - value * 0.12}
                  C 124 ${170 - value * 0.1}, 138 ${180 - value * 0.08}, 136 208
                  C ${132 + value * 0.03} ${200 - coreHeight * 0.04}, ${140 + value * 0.02} ${184 - coreHeight * 0.08}, 120 ${220 - coreHeight} Z`}
              fill="url(#coreFlameGradient)"
              opacity={0.86}
            />
          </FlameSvg>
        </FlameWrap>
      </FlameStage>

      <Content>
        <StagePanel>
          <Typography variant="overline" sx={{ color: '#8f7757', letterSpacing: '0.16em' }}>
            探究の熱量
          </Typography>
          <StageTitle variant="h5" aria-live="polite">
            {stage.label}
          </StageTitle>
          <StageBadge>{stage.label}</StageBadge>
          <StageDescription variant="body2">
            {stage.description}
          </StageDescription>
          <HelperText id={helperId} variant="body2">
            炎を上下にドラッグするか、スライダーや矢印キーで調整してください。
          </HelperText>
        </StagePanel>

        <StyledSlider
          value={value}
          min={0}
          max={100}
          step={1}
          onChange={(_, nextValue) => updateValue(nextValue as number)}
          marks={stepMarks}
          aria-label="探究の火の強さを調整するスライダー"
          aria-describedby={helperId}
          getAriaValueText={(nextValue) => {
            const numericValue = Array.isArray(nextValue) ? nextValue[0] : nextValue;
            const currentStage = getStage(numericValue);
            return `${currentStage.label}、${currentStage.description}`;
          }}
        />
      </Content>
    </Card>
  );
};

export default MotivationFlameRive;
