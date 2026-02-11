import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  LinearProgress,
  CircularProgress,
  Typography,
  Paper,
  Fade,
  Alert,
  AlertTitle,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  nodeCount: number;
  edgeCount: number;
  memoryUsage?: number;
  networkLatency?: number;
  aiProcessingTime?: number;
  lastUpdateTime: number;
}

interface LoadingState {
  isLoading: boolean;
  stage: 'idle' | 'fetching' | 'processing' | 'rendering' | 'complete' | 'error';
  progress: number;
  message: string;
  estimatedTime?: number;
  startTime?: number;
}

interface QuestMapPerformanceProps {
  onRetry?: () => void;
  onOptimize?: () => void;
  showDetailedMetrics?: boolean;
  autoHide?: boolean;
  hideAfterMs?: number;
}

// パフォーマンス監視クラス
class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = performance.now();
  private frameRate = 0;
  private renderTimes: number[] = [];
  private isMonitoring = false;
  private callbacks: Set<(metrics: PerformanceMetrics) => void> = new Set();

  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.measure();
  }

  stop() {
    this.isMonitoring = false;
  }

  private measure() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    this.frameCount++;

    // 1秒ごとにFPSを計算
    if (now - this.lastTime >= 1000) {
      this.frameRate = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;

      // メトリクスをコールバックに送信
      this.notifySubscribers();
    }

    if (this.isMonitoring) {
      requestAnimationFrame(() => this.measure());
    }
  }

  addRenderTime(time: number) {
    this.renderTimes.push(time);
    // 最新50回分のみ保持
    if (this.renderTimes.length > 50) {
      this.renderTimes.shift();
    }
  }

  getAverageRenderTime(): number {
    if (this.renderTimes.length === 0) return 0;
    return this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
  }

  subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  private notifySubscribers() {
    const metrics: PerformanceMetrics = {
      fps: this.frameRate,
      renderTime: this.getAverageRenderTime(),
      nodeCount: 0, // 外部から設定
      edgeCount: 0, // 外部から設定
      memoryUsage: this.getMemoryUsage(),
      lastUpdateTime: Date.now(),
    };

    this.callbacks.forEach(callback => callback(metrics));
  }

  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return undefined;
  }
}

// グローバルインスタンス
const globalMonitor = new PerformanceMonitor();

// React Hook
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    globalMonitor.start();
    const unsubscribe = globalMonitor.subscribe(setMetrics);
    
    return () => {
      unsubscribe();
      globalMonitor.stop();
    };
  }, []);

  const addRenderTime = useCallback((time: number) => {
    globalMonitor.addRenderTime(time);
  }, []);

  return { metrics, addRenderTime };
};

// ローディング管理フック
export const useLoadingState = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    stage: 'idle',
    progress: 0,
    message: '',
  });

  const startLoading = useCallback((message: string, estimatedTime?: number) => {
    setLoadingState({
      isLoading: true,
      stage: 'fetching',
      progress: 0,
      message,
      estimatedTime,
      startTime: Date.now(),
    });
  }, []);

  const updateProgress = useCallback((progress: number, stage: LoadingState['stage'], message?: string) => {
    setLoadingState(prev => ({
      ...prev,
      progress: Math.min(100, Math.max(0, progress)),
      stage,
      ...(message && { message }),
    }));
  }, []);

  const completeLoading = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      stage: 'complete',
      progress: 100,
    }));
  }, []);

  const errorLoading = useCallback((message: string) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      stage: 'error',
      message,
    }));
  }, []);

  return {
    loadingState,
    startLoading,
    updateProgress,
    completeLoading,
    errorLoading,
  };
};

const QuestMapPerformance: React.FC<QuestMapPerformanceProps> = ({
  onRetry,
  onOptimize,
  showDetailedMetrics = false,
  autoHide = true,
  hideAfterMs = 3000,
}) => {
  const theme = useTheme();
  const { metrics } = usePerformanceMonitor();
  const [visible, setVisible] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout>();

  // 自動非表示の管理
  useEffect(() => {
    if (autoHide && metrics) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      // パフォーマンスが良好な場合は非表示にする
      if (metrics.fps > 30 && metrics.renderTime < 50) {
        hideTimeoutRef.current = setTimeout(() => {
          setVisible(false);
        }, hideAfterMs);
      } else {
        setVisible(true);
      }
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [metrics, autoHide, hideAfterMs]);

  // パフォーマンス状態の判定
  const getPerformanceStatus = (metrics: PerformanceMetrics) => {
    if (metrics.fps < 15 || metrics.renderTime > 100) {
      return { level: 'error', message: 'パフォーマンスが低下しています' };
    } else if (metrics.fps < 30 || metrics.renderTime > 50) {
      return { level: 'warning', message: 'パフォーマンスに注意が必要です' };
    } else {
      return { level: 'success', message: 'パフォーマンスは良好です' };
    }
  };

  const getStatusIcon = (level: string) => {
    switch (level) {
      case 'error': return <ErrorIcon color="error" />;
      case 'warning': return <WarningIcon color="warning" />;
      case 'success': return <CheckCircleIcon color="success" />;
      default: return <SpeedIcon />;
    }
  };

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'error': return theme.palette.error.main;
      case 'warning': return theme.palette.warning.main;
      case 'success': return theme.palette.success.main;
      default: return theme.palette.info.main;
    }
  };

  if (!metrics || (!visible && autoHide)) {
    return null;
  }

  const status = getPerformanceStatus(metrics);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <Paper
            elevation={4}
            sx={{
              position: 'fixed',
              bottom: 16,
              left: 16,
              p: 2,
              minWidth: 280,
              maxWidth: 400,
              zIndex: theme.zIndex.speedDial - 1,
              backgroundColor: alpha(theme.palette.background.paper, 0.95),
              backdropFilter: 'blur(10px)',
              border: `2px solid ${alpha(getStatusColor(status.level), 0.3)}`,
            }}
          >
            {/* ヘッダー */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getStatusIcon(status.level)}
              <Typography variant="subtitle2" sx={{ ml: 1, flex: 1 }}>
                パフォーマンス監視
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: getStatusColor(status.level),
                  fontWeight: 'bold',
                }}
              >
                {status.message}
              </Typography>
            </Box>

            {/* メトリクス表示 */}
            <Box sx={{ mb: showDetailedMetrics ? 2 : 1 }}>
              {/* FPS */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  FPS: {metrics.fps}
                </Typography>
                <Box sx={{ width: 100, ml: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (metrics.fps / 60) * 100)}
                    color={metrics.fps > 30 ? 'success' : metrics.fps > 15 ? 'warning' : 'error'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Box>

              {/* レンダー時間 */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  レンダー: {metrics.renderTime.toFixed(1)}ms
                </Typography>
                <Box sx={{ width: 100, ml: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, 100 - (metrics.renderTime / 100) * 100)}
                    color={metrics.renderTime < 16 ? 'success' : metrics.renderTime < 33 ? 'warning' : 'error'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Box>

              {/* ノード/エッジ数 */}
              <Typography variant="body2" color="text.secondary">
                ノード: {metrics.nodeCount} / エッジ: {metrics.edgeCount}
              </Typography>
            </Box>

            {/* 詳細メトリクス */}
            {showDetailedMetrics && (
              <Fade in={showDetailedMetrics}>
                <Box sx={{ mb: 1 }}>
                  {metrics.memoryUsage && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      メモリ使用量: {metrics.memoryUsage.toFixed(1)} MB
                    </Typography>
                  )}
                  {metrics.networkLatency && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      ネットワーク遅延: {metrics.networkLatency}ms
                    </Typography>
                  )}
                  {metrics.aiProcessingTime && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      AI処理時間: {metrics.aiProcessingTime}ms
                    </Typography>
                  )}
                  <Typography variant="caption" display="block" color="text.secondary">
                    最終更新: {new Date(metrics.lastUpdateTime).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Fade>
            )}

            {/* アクションボタン */}
            {(onRetry || onOptimize) && status.level !== 'success' && (
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                {onRetry && (
                  <Button
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={onRetry}
                    variant="outlined"
                  >
                    再試行
                  </Button>
                )}
                {onOptimize && (
                  <Button
                    size="small"
                    startIcon={<SpeedIcon />}
                    onClick={onOptimize}
                    variant="contained"
                    color="primary"
                  >
                    最適化
                  </Button>
                )}
              </Box>
            )}
          </Paper>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ローディングインジケーターコンポーネント
export const QuestMapLoadingIndicator: React.FC<{
  loadingState: LoadingState;
  onCancel?: () => void;
}> = ({ loadingState, onCancel }) => {
  const theme = useTheme();

  if (!loadingState.isLoading && loadingState.stage !== 'error') {
    return null;
  }

  const getStageMessage = (stage: LoadingState['stage']) => {
    switch (stage) {
      case 'fetching': return 'データを取得中...';
      case 'processing': return 'データを処理中...';
      case 'rendering': return 'マップを描画中...';
      case 'complete': return '完了しました！';
      case 'error': return 'エラーが発生しました';
      default: return '読み込み中...';
    }
  };

  const getEstimatedTimeRemaining = () => {
    if (!loadingState.startTime || !loadingState.estimatedTime) return null;
    
    const elapsed = Date.now() - loadingState.startTime;
    const progress = loadingState.progress / 100;
    const estimated = loadingState.estimatedTime;
    
    if (progress > 0) {
      const totalTime = elapsed / progress;
      const remaining = Math.max(0, totalTime - elapsed);
      return Math.round(remaining / 1000);
    }
    
    return Math.round((estimated - elapsed) / 1000);
  };

  const estimatedSeconds = getEstimatedTimeRemaining();

  return (
    <Box
      sx={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: theme.zIndex.modal,
        minWidth: 300,
        textAlign: 'center',
      }}
    >
      <Paper
        elevation={8}
        sx={{
          p: 3,
          backgroundColor: alpha(theme.palette.background.paper, 0.95),
          backdropFilter: 'blur(10px)',
        }}
      >
        {loadingState.stage === 'error' ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>エラー</AlertTitle>
            {loadingState.message}
          </Alert>
        ) : (
          <>
            <CircularProgress
              size={60}
              variant={loadingState.progress > 0 ? 'determinate' : 'indeterminate'}
              value={loadingState.progress}
              sx={{ mb: 2 }}
            />
            
            <Typography variant="h6" gutterBottom>
              {getStageMessage(loadingState.stage)}
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {loadingState.message}
            </Typography>
            
            {loadingState.progress > 0 && (
              <LinearProgress
                variant="determinate"
                value={loadingState.progress}
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
              />
            )}
            
            {estimatedSeconds !== null && estimatedSeconds > 0 && (
              <Typography variant="caption" color="text.secondary">
                推定残り時間: {estimatedSeconds}秒
              </Typography>
            )}
          </>
        )}
        
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="outlined"
            sx={{ mt: 2 }}
          >
            キャンセル
          </Button>
        )}
      </Paper>
    </Box>
  );
};

export default QuestMapPerformance;