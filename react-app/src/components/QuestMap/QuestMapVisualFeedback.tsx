import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Box, useTheme, alpha } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

// 視覚フィードバックの種類
export type FeedbackType = 
  | 'hover'
  | 'select' 
  | 'drag-start'
  | 'drag-over'
  | 'drop-success'
  | 'drop-error'
  | 'connection-preview'
  | 'connection-success'
  | 'delete-preview'
  | 'action-success'
  | 'action-error';

export interface VisualFeedback {
  id: string;
  type: FeedbackType;
  x: number;
  y: number;
  data?: any;
  duration?: number;
  autoRemove?: boolean;
}

export interface QuestMapVisualFeedbackProps {
  feedbacks: VisualFeedback[];
  onFeedbackComplete?: (id: string) => void;
}

// ドラッグ＆ドロップ用のヘルパークラス
export class DragDropVisualizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // ドラッグライン（プレビュー線）の描画
  drawDragLine(startX: number, startY: number, endX: number, endY: number, color: string = '#1976D2') {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(endX, endY);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.lineDashOffset = Date.now() * 0.01;
    this.ctx.setLineDash([10, 5]);
    this.ctx.stroke();
  }

  // ドロップゾーンのハイライト
  drawDropZone(x: number, y: number, radius: number, color: string = '#4CAF50') {
    if (!this.ctx) return;

    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fillStyle = `${color}20`; // アルファ付き
    this.ctx.fill();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  // キャンバスをクリア
  clear() {
    if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // アニメーション停止
  stopAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}

// パーティクルエフェクト
const ParticleEffect: React.FC<{
  x: number;
  y: number;
  color: string;
  count: number;
  onComplete: () => void;
}> = ({ x, y, color, count, onComplete }) => {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (i / count) * Math.PI * 2,
    velocity: Math.random() * 3 + 1,
    size: Math.random() * 4 + 2,
  }));

  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
          }}
          animate={{
            x: Math.cos(particle.angle) * particle.velocity * 50,
            y: Math.sin(particle.angle) * particle.velocity * 50,
            opacity: 0,
            scale: 0,
          }}
          transition={{
            duration: 1,
            ease: 'easeOut',
          }}
          style={{
            position: 'absolute',
            width: particle.size,
            height: particle.size,
            backgroundColor: color,
            borderRadius: '50%',
          }}
        />
      ))}
    </Box>
  );
};

// 波紋エフェクト
const RippleEffect: React.FC<{
  x: number;
  y: number;
  color: string;
  maxRadius: number;
  onComplete: () => void;
}> = ({ x, y, color, maxRadius, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: x - maxRadius,
        top: y - maxRadius,
        pointerEvents: 'none',
        zIndex: 999,
      }}
    >
      <motion.div
        initial={{
          width: 0,
          height: 0,
          opacity: 0.8,
        }}
        animate={{
          width: maxRadius * 2,
          height: maxRadius * 2,
          opacity: 0,
        }}
        transition={{
          duration: 0.8,
          ease: 'easeOut',
        }}
        style={{
          borderRadius: '50%',
          border: `2px solid ${color}`,
          position: 'absolute',
          left: maxRadius,
          top: maxRadius,
          transform: 'translate(-50%, -50%)',
        }}
      />
    </Box>
  );
};

// フローティングテキスト
const FloatingText: React.FC<{
  x: number;
  y: number;
  text: string;
  color: string;
  onComplete: () => void;
}> = ({ x, y, text, color, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <Box
      sx={{
        position: 'absolute',
        left: x,
        top: y,
        pointerEvents: 'none',
        zIndex: 1001,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <motion.div
        initial={{
          y: 0,
          opacity: 1,
          scale: 0.8,
        }}
        animate={{
          y: -50,
          opacity: 0,
          scale: 1.2,
        }}
        transition={{
          duration: 2,
          ease: 'easeOut',
        }}
        style={{
          color: color,
          fontWeight: 'bold',
          fontSize: '14px',
          textShadow: '0 1px 3px rgba(0,0,0,0.5)',
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '4px 8px',
          borderRadius: '4px',
        }}
      >
        {text}
      </motion.div>
    </Box>
  );
};

// ホバーハイライト
const HoverHighlight: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
}> = ({ x, y, size, color }) => (
  <Box
    sx={{
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      pointerEvents: 'none',
      zIndex: 998,
    }}
  >
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 0.3 }}
      exit={{ scale: 1.2, opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        backgroundColor: color,
        filter: 'blur(4px)',
      }}
    />
  </Box>
);

// セレクションリング
const SelectionRing: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
}> = ({ x, y, size, color }) => (
  <Box
    sx={{
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      pointerEvents: 'none',
      zIndex: 997,
    }}
  >
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        rotate: 360,
      }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{
        scale: { duration: 0.2 },
        opacity: { duration: 0.2 },
        rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
      }}
      style={{
        width: '100%',
        height: '100%',
        border: `3px solid ${color}`,
        borderRadius: '50%',
        borderStyle: 'dashed',
      }}
    />
  </Box>
);

const QuestMapVisualFeedback: React.FC<QuestMapVisualFeedbackProps> = ({
  feedbacks,
  onFeedbackComplete,
}) => {
  const theme = useTheme();

  const handleComplete = useCallback((id: string) => {
    onFeedbackComplete?.(id);
  }, [onFeedbackComplete]);

  const getFeedbackColor = (type: FeedbackType): string => {
    switch (type) {
      case 'hover':
        return theme.palette.primary.main;
      case 'select':
        return theme.palette.primary.main;
      case 'drag-start':
        return theme.palette.warning.main;
      case 'drag-over':
        return theme.palette.info.main;
      case 'drop-success':
        return theme.palette.success.main;
      case 'drop-error':
        return theme.palette.error.main;
      case 'connection-preview':
        return theme.palette.info.main;
      case 'connection-success':
        return theme.palette.success.main;
      case 'delete-preview':
        return theme.palette.error.main;
      case 'action-success':
        return theme.palette.success.main;
      case 'action-error':
        return theme.palette.error.main;
      default:
        return theme.palette.primary.main;
    }
  };

  return (
    <Box
      sx={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <AnimatePresence>
        {feedbacks.map((feedback) => {
          const color = getFeedbackColor(feedback.type);

          switch (feedback.type) {
            case 'hover':
              return (
                <HoverHighlight
                  key={feedback.id}
                  x={feedback.x}
                  y={feedback.y}
                  size={60}
                  color={color}
                />
              );

            case 'select':
              return (
                <SelectionRing
                  key={feedback.id}
                  x={feedback.x}
                  y={feedback.y}
                  size={70}
                  color={color}
                />
              );

            case 'drop-success':
              return (
                <React.Fragment key={feedback.id}>
                  <RippleEffect
                    x={feedback.x}
                    y={feedback.y}
                    color={color}
                    maxRadius={50}
                    onComplete={() => {}}
                  />
                  <ParticleEffect
                    x={feedback.x}
                    y={feedback.y}
                    color={color}
                    count={12}
                    onComplete={() => handleComplete(feedback.id)}
                  />
                  <FloatingText
                    x={feedback.x}
                    y={feedback.y - 30}
                    text="接続完了！"
                    color={color}
                    onComplete={() => {}}
                  />
                </React.Fragment>
              );

            case 'drop-error':
              return (
                <React.Fragment key={feedback.id}>
                  <RippleEffect
                    x={feedback.x}
                    y={feedback.y}
                    color={color}
                    maxRadius={40}
                    onComplete={() => {}}
                  />
                  <FloatingText
                    x={feedback.x}
                    y={feedback.y - 30}
                    text="接続できません"
                    color={color}
                    onComplete={() => handleComplete(feedback.id)}
                  />
                </React.Fragment>
              );

            case 'connection-success':
              return (
                <React.Fragment key={feedback.id}>
                  <ParticleEffect
                    x={feedback.x}
                    y={feedback.y}
                    color={color}
                    count={8}
                    onComplete={() => handleComplete(feedback.id)}
                  />
                  <FloatingText
                    x={feedback.x}
                    y={feedback.y - 20}
                    text="✓"
                    color={color}
                    onComplete={() => {}}
                  />
                </React.Fragment>
              );

            case 'action-success':
              return (
                <React.Fragment key={feedback.id}>
                  <RippleEffect
                    x={feedback.x}
                    y={feedback.y}
                    color={color}
                    maxRadius={30}
                    onComplete={() => handleComplete(feedback.id)}
                  />
                  <FloatingText
                    x={feedback.x}
                    y={feedback.y - 20}
                    text={feedback.data?.message || '成功！'}
                    color={color}
                    onComplete={() => {}}
                  />
                </React.Fragment>
              );

            case 'action-error':
              return (
                <FloatingText
                  key={feedback.id}
                  x={feedback.x}
                  y={feedback.y - 20}
                  text={feedback.data?.message || 'エラーが発生しました'}
                  color={color}
                  onComplete={() => handleComplete(feedback.id)}
                />
              );

            case 'delete-preview':
              return (
                <Box
                  key={feedback.id}
                  sx={{
                    position: 'absolute',
                    left: feedback.x - 40,
                    top: feedback.y - 40,
                    width: 80,
                    height: 80,
                    pointerEvents: 'none',
                    zIndex: 999,
                  }}
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: alpha(color, 0.2),
                      border: `2px dashed ${color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }}
                  >
                    🗑️
                  </motion.div>
                </Box>
              );

            case 'drag-over':
              return (
                <Box
                  key={feedback.id}
                  sx={{
                    position: 'absolute',
                    left: feedback.x - 30,
                    top: feedback.y - 30,
                    width: 60,
                    height: 60,
                    pointerEvents: 'none',
                    zIndex: 996,
                  }}
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      backgroundColor: alpha(color, 0.3),
                      border: `2px solid ${color}`,
                    }}
                  />
                </Box>
              );

            default:
              return null;
          }
        })}
      </AnimatePresence>
    </Box>
  );
};

export default QuestMapVisualFeedback;

// 視覚フィードバック管理用のHook
export const useVisualFeedback = () => {
  const [feedbacks, setFeedbacks] = useState<VisualFeedback[]>([]);

  const addFeedback = useCallback((feedback: Omit<VisualFeedback, 'id'>) => {
    const id = `feedback-${Date.now()}-${Math.random()}`;
    const newFeedback: VisualFeedback = {
      ...feedback,
      id,
      autoRemove: feedback.autoRemove !== false,
    };

    setFeedbacks(prev => [...prev, newFeedback]);

    // 自動削除が有効な場合
    if (newFeedback.autoRemove) {
      const duration = feedback.duration || 3000;
      setTimeout(() => {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
      }, duration);
    }

    return id;
  }, []);

  const removeFeedback = useCallback((id: string) => {
    setFeedbacks(prev => prev.filter(f => f.id !== id));
  }, []);

  const clearFeedbacks = useCallback(() => {
    setFeedbacks([]);
  }, []);

  return {
    feedbacks,
    addFeedback,
    removeFeedback,
    clearFeedbacks,
  };
};