import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export type EmotionType = 
  | 'wakuwaku' 
  | 'tanoshii' 
  | 'omoshiroi' 
  | 'sukkiri' 
  | 'moyamoya' 
  | 'fuan' 
  | 'muzukashii' 
  | 'ikizumari';

interface EmotionConfig {
  fill: string;
  stroke: string;
  text: string;
  dur: number;
  s0: number;
  s1: number;
  p0: string;
  p1: string;
}

const emotionConfigs: Record<EmotionType, EmotionConfig> = {
  wakuwaku: {
    fill: '#FAEEDA',
    stroke: '#EF9F27',
    text: '#854F0B',
    dur: 1.8,
    s0: 0.93,
    s1: 1.07,
    p0: 'M50,12 C68,10 88,22 90,40 C93,58 82,75 68,82 C54,90 32,90 20,78 C8,66 7,46 16,30 C24,15 32,14 50,12 Z',
    p1: 'M50,10 C70,8 92,20 93,42 C94,62 80,78 62,85 C44,92 24,88 14,72 C4,56 6,34 18,20 C28,8 32,12 50,10 Z'
  },
  tanoshii: {
    fill: '#FAECE7',
    stroke: '#D85A30',
    text: '#993C1D',
    dur: 1.6,
    s0: 0.92,
    s1: 1.08,
    p0: 'M50,8 C68,4 90,18 92,38 C94,56 80,76 62,84 C44,92 22,90 10,76 C-2,62 2,38 14,22 C24,8 34,12 50,8 Z',
    p1: 'M50,6 C70,2 92,16 94,38 C96,58 80,78 60,86 C40,94 20,92 8,78 C-4,64 0,38 12,22 C22,8 32,10 50,6 Z'
  },
  omoshiroi: {
    fill: '#EAF3DE',
    stroke: '#639922',
    text: '#3B6D11',
    dur: 2.0,
    s0: 0.92,
    s1: 1.08,
    p0: 'M50,10 C66,6 86,16 90,34 C94,52 82,72 64,82 C46,92 24,90 12,76 C0,62 4,38 16,24 C26,10 34,14 50,10 Z',
    p1: 'M50,8 C68,4 90,16 94,36 C98,56 82,76 62,86 C42,96 22,92 10,78 C-2,64 2,38 14,24 C24,10 34,12 50,8 Z'
  },
  sukkiri: {
    fill: '#E1F5EE',
    stroke: '#1D9E75',
    text: '#0F6E56',
    dur: 3.2,
    s0: 0.97,
    s1: 1.03,
    p0: 'M50,10 C65,8 82,20 86,38 C90,55 80,74 64,82 C48,90 28,86 16,72 C4,58 6,36 18,22 C28,10 36,12 50,10 Z',
    p1: 'M50,12 C63,10 80,22 84,40 C88,57 78,76 62,84 C46,92 26,88 14,74 C2,60 4,38 16,24 C26,12 36,14 50,12 Z'
  },
  moyamoya: {
    fill: '#EEEDFE',
    stroke: '#7F77DD',
    text: '#534AB7',
    dur: 4.5,
    s0: 0.94,
    s1: 1.06,
    p0: 'M48,14 C62,8 84,18 88,36 C92,52 80,72 64,82 C48,90 26,88 14,74 C2,60 6,38 18,24 C28,12 36,18 48,14 Z',
    p1: 'M52,10 C68,6 88,20 90,40 C92,56 78,76 60,86 C42,94 22,86 12,70 C2,54 8,32 22,20 C34,8 38,14 52,10 Z'
  },
  fuan: {
    fill: '#E6F1FB',
    stroke: '#378ADD',
    text: '#185FA5',
    dur: 2.4,
    s0: 0.94,
    s1: 1.04,
    p0: 'M50,16 C66,10 86,24 88,42 C90,58 78,76 62,84 C46,92 24,88 14,74 C4,60 8,38 20,26 C30,14 36,20 50,16 Z',
    p1: 'M50,14 C68,8 90,22 90,44 C90,62 76,78 58,86 C40,94 20,88 12,72 C4,56 8,34 20,22 C30,10 34,18 50,14 Z'
  },
  muzukashii: {
    fill: '#FBEAF0',
    stroke: '#D4537E',
    text: '#993556',
    dur: 3.8,
    s0: 0.95,
    s1: 1.05,
    p0: 'M50,14 C64,10 82,22 86,40 C90,56 80,74 64,84 C48,92 28,88 16,74 C4,60 6,40 16,26 C26,12 36,18 50,14 Z',
    p1: 'M50,12 C66,8 84,24 86,42 C88,58 76,76 60,86 C44,94 26,90 14,76 C2,62 4,42 14,28 C24,14 36,16 50,12 Z'
  },
  ikizumari: {
    fill: '#FCEBEB',
    stroke: '#E24B4A',
    text: '#A32D2D',
    dur: 6.0,
    s0: 0.98,
    s1: 1.02,
    p0: 'M50,18 C64,14 80,26 84,44 C88,60 76,76 60,84 C44,92 24,86 14,70 C4,54 10,34 24,22 C34,12 38,22 50,18 Z',
    p1: 'M50,20 C62,16 78,28 82,46 C86,62 74,78 58,86 C42,94 22,88 12,72 C2,56 8,36 22,24 C32,14 38,24 50,20 Z'
  }
};

interface EmotionIconProps {
  emotion: EmotionType;
  initial?: string;
  size?: number;
  animate?: boolean;
  delay?: number;
}

export const EmotionIcon: React.FC<EmotionIconProps> = ({
  emotion,
  initial = '',
  size = 36,
  animate = true,
  delay = 0
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const config = emotionConfigs[emotion];

  useEffect(() => {
    if (!animate || !pathRef.current || !svgRef.current) return;

    // パスのアニメーション
    gsap.to(pathRef.current, {
      duration: config.dur,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      attr: { d: config.p1 },
      delay: delay
    });

    // スケールのアニメーション
    gsap.fromTo(svgRef.current,
      { scale: config.s0, transformOrigin: '50% 50%' },
      {
        scale: config.s1,
        transformOrigin: '50% 50%',
        duration: config.dur,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: delay
      }
    );
  }, [animate, config, delay]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path
        ref={pathRef}
        d={config.p0}
        fill={config.fill}
        stroke={config.stroke}
        strokeWidth="2"
      />
      {initial && (
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fontSize="38"
          fontFamily="sans-serif"
          fill={config.text}
          fontWeight="500"
        >
          {initial}
        </text>
      )}
    </svg>
  );
};

export const getEmotionLabel = (emotion: EmotionType): string => {
  const labels: Record<EmotionType, string> = {
    wakuwaku: 'わくわく',
    tanoshii: '楽しい',
    omoshiroi: '面白い',
    sukkiri: 'すっきり',
    moyamoya: 'もやもや',
    fuan: '不安',
    muzukashii: '難しい',
    ikizumari: '行き詰まり'
  };
  return labels[emotion] || emotion;
};