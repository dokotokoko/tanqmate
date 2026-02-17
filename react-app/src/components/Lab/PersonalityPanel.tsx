// components/Lab/PersonalityPanel.tsx - 壁面パネル: 学習パーソナリティ（MBTI風）

import React, { useRef, useEffect } from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { motion } from 'framer-motion';
import type { LearningPersonality } from './useLabData';

interface Props {
  personality: LearningPersonality;
}

// 次元の表示情報
const DIMENSION_META: Record<string, { poleA: string; poleB: string; colorA: string; colorB: string }> = {
  exploration: { poleA: '探索型 (E)', poleB: '専門型 (S)', colorA: '#42A5F5', colorB: '#AB47BC' },
  thinking: { poleA: '理論型 (T)', poleB: '実践型 (P)', colorA: '#66BB6A', colorB: '#FF7043' },
  interaction: { poleA: '独立型 (I)', poleB: '対話型 (C)', colorA: '#78909C', colorB: '#FF7A00' },
  approach: { poleA: '創造型 (R)', poleB: '分析型 (A)', colorA: '#EC407A', colorB: '#26C6DA' },
};

// レーダーチャートをCanvas描画
const RadarChart: React.FC<{ scores: Record<string, number> }> = ({ scores }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 70;
    const labels = Object.keys(scores);
    const values = Object.values(scores);
    const n = labels.length;

    if (n === 0) return;

    ctx.clearRect(0, 0, size, size);

    // 背景の同心円グリッド
    for (let ring = 1; ring <= 4; ring++) {
      const r = (radius * ring) / 4;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 軸線
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // データ領域
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
      const val = values[idx] / 100;
      const x = cx + radius * val * Math.cos(angle);
      const y = cy + radius * val * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();

    // グラデーション塗り
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    gradient.addColorStop(0, 'rgba(255, 122, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 122, 0, 0.05)');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 122, 0, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // データポイント
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const val = values[i] / 100;
      const x = cx + radius * val * Math.cos(angle);
      const y = cy + radius * val * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FF7A00';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // ラベル
    ctx.font = '10px "Noto Sans JP", sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const labelRadius = radius + 18;
      const x = cx + labelRadius * Math.cos(angle);
      const y = cy + labelRadius * Math.sin(angle);
      ctx.fillText(labels[i], x, y);
    }
  }, [scores]);

  return <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />;
};

const PersonalityPanel: React.FC<Props> = ({ personality }) => {
  if (personality.confidence < 10) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography sx={{ fontSize: '2.5rem', mb: 1 }}>🔮</Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          もう少しAIと対話すると
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
          あなたの学習タイプがわかるよ
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* タイプコード表示 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography
            variant="h4"
            sx={{
              color: '#FF7A00',
              fontWeight: 900,
              letterSpacing: 6,
              fontFamily: 'monospace',
              textShadow: '0 0 20px rgba(255,122,0,0.4)',
              fontSize: '1.8rem',
            }}
          >
            {personality.type_code}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#FFB74D',
              fontWeight: 600,
              mt: 0.5,
              fontSize: '0.9rem',
            }}
          >
            {personality.type_name}
          </Typography>
          <Chip
            label={`信頼度 ${personality.confidence}%`}
            size="small"
            sx={{
              mt: 0.5,
              bgcolor: personality.confidence >= 60 ? 'rgba(76,175,80,0.2)' : 'rgba(255,152,0,0.2)',
              color: personality.confidence >= 60 ? '#81C784' : '#FFB74D',
              fontSize: '0.65rem',
              height: 20,
            }}
          />
        </Box>
      </motion.div>

      {/* 4次元バー */}
      <Box sx={{ mb: 2 }}>
        {Object.entries(personality.dimensions).map(([key, dim], idx) => {
          const meta = DIMENSION_META[key];
          if (!meta) return null;

          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Box sx={{ mb: 1.2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.3 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: dim.score >= 50 ? meta.colorA : 'rgba(255,255,255,0.4)',
                      fontWeight: dim.score >= 50 ? 700 : 400,
                      fontSize: '0.65rem',
                    }}
                  >
                    {meta.poleA}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: dim.score < 50 ? meta.colorB : 'rgba(255,255,255,0.4)',
                      fontWeight: dim.score < 50 ? 700 : 400,
                      fontSize: '0.65rem',
                    }}
                  >
                    {meta.poleB}
                  </Typography>
                </Box>
                <Box sx={{ position: 'relative', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      bgcolor: 'rgba(255,255,255,0.06)',
                      borderRadius: 4,
                    }}
                  />
                  <motion.div
                    initial={{ width: '50%' }}
                    animate={{ width: `${dim.score}%` }}
                    transition={{ duration: 1, delay: idx * 0.15 }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      height: '100%',
                      borderRadius: 4,
                      background: `linear-gradient(90deg, ${meta.colorA}, ${meta.colorB})`,
                    }}
                  />
                  {/* インジケーター */}
                  <motion.div
                    initial={{ left: '50%' }}
                    animate={{ left: `${dim.score}%` }}
                    transition={{ duration: 1, delay: idx * 0.15 }}
                    style={{
                      position: 'absolute',
                      top: -2,
                      transform: 'translateX(-50%)',
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                    }}
                  />
                </Box>
              </Box>
            </motion.div>
          );
        })}
      </Box>

      {/* レーダーチャート */}
      {Object.keys(personality.radar_scores).length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.5)', mb: 0.5, display: 'block', textAlign: 'center', fontSize: '0.65rem' }}
          >
            学習能力レーダー
          </Typography>
          <RadarChart scores={personality.radar_scores} />
        </Box>
      )}

      {/* 応答スタイル使用状況 */}
      {Object.keys(personality.style_usage).length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.4)', mb: 0.5, display: 'block', fontSize: '0.6rem' }}
          >
            よく使う対話スタイル
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            {Object.entries(personality.style_usage)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 4)
              .map(([style, count]) => {
                const styleLabels: Record<string, string> = {
                  organize: '整理',
                  research: '調査',
                  ideas: 'アイデア',
                  deepen: '深掘り',
                  expand: '拡張',
                  select: 'サクサク',
                  custom: 'カスタム',
                  auto: '自動',
                };
                return (
                  <Tooltip key={style} title={`${count}回使用`}>
                    <Chip
                      label={styleLabels[style] || style}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,122,0,0.15)',
                        color: '#FFB74D',
                        fontSize: '0.6rem',
                        height: 20,
                      }}
                    />
                  </Tooltip>
                );
              })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PersonalityPanel;
