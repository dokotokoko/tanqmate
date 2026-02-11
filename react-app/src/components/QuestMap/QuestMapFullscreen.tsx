import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Fab,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface QuestMapFullscreenProps {
  children: React.ReactNode;
  isFullscreen: boolean;
  onToggleFullscreen: (isFullscreen: boolean) => void;
  showControls?: boolean;
  hideControlsDelay?: number;
}

interface FullscreenAPI {
  requestFullscreen?: () => Promise<void>;
  exitFullscreen?: () => Promise<void>;
  fullscreenElement?: Element | null;
  webkitRequestFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
  mozRequestFullScreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  mozFullScreenElement?: Element | null;
  msRequestFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  msFullscreenElement?: Element | null;
}

// Fullscreen API のブラウザ差分を統一するためのヘルパー
class FullscreenManager {
  private element: HTMLElement;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  // フルスクリーンリクエスト
  async requestFullscreen(): Promise<boolean> {
    const doc = this.element as any as FullscreenAPI;
    
    try {
      if (doc.requestFullscreen) {
        await doc.requestFullscreen();
      } else if (doc.webkitRequestFullscreen) {
        await doc.webkitRequestFullscreen();
      } else if (doc.mozRequestFullScreen) {
        await doc.mozRequestFullScreen();
      } else if (doc.msRequestFullscreen) {
        await doc.msRequestFullscreen();
      } else {
        return false;
      }
      return true;
    } catch (error) {
      console.warn('フルスクリーンの有効化に失敗:', error);
      return false;
    }
  }

  // フルスクリーン終了
  async exitFullscreen(): Promise<boolean> {
    const doc = document as any as FullscreenAPI;
    
    try {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen();
      } else if (doc.webkitExitFullscreen) {
        await doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        await doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        await doc.msExitFullscreen();
      } else {
        return false;
      }
      return true;
    } catch (error) {
      console.warn('フルスクリーンの終了に失敗:', error);
      return false;
    }
  }

  // フルスクリーン状態を取得
  isFullscreen(): boolean {
    const doc = document as any as FullscreenAPI;
    return !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
  }

  // フルスクリーン対応の確認
  isSupported(): boolean {
    const doc = document as any as FullscreenAPI;
    return !!(
      doc.requestFullscreen ||
      doc.webkitRequestFullscreen ||
      doc.mozRequestFullScreen ||
      doc.msRequestFullscreen
    );
  }
}

const QuestMapFullscreen: React.FC<QuestMapFullscreenProps> = ({
  children,
  isFullscreen,
  onToggleFullscreen,
  showControls = true,
  hideControlsDelay = 3000,
}) => {
  const theme = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenManagerRef = useRef<FullscreenManager | null>(null);
  const [showFloatingControls, setShowFloatingControls] = useState(true);
  const [mouseIdleTimer, setMouseIdleTimer] = useState<NodeJS.Timeout | null>(null);
  const [isApiFullscreen, setIsApiFullscreen] = useState(false);

  // Fullscreen Manager の初期化
  useEffect(() => {
    if (containerRef.current) {
      fullscreenManagerRef.current = new FullscreenManager(containerRef.current);
    }
  }, []);

  // フルスクリーン状態変更の監視
  useEffect(() => {
    const handleFullscreenChange = () => {
      const manager = fullscreenManagerRef.current;
      if (manager) {
        const isApiFs = manager.isFullscreen();
        setIsApiFullscreen(isApiFs);
        
        // API状態と props の状態が異なる場合は同期
        if (isApiFs !== isFullscreen) {
          onToggleFullscreen(isApiFs);
        }
      }
    };

    // 各ブラウザのフルスクリーン変更イベントをリスン
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen, onToggleFullscreen]);

  // マウスアイドル状態の管理
  const resetMouseIdleTimer = useCallback(() => {
    if (mouseIdleTimer) {
      clearTimeout(mouseIdleTimer);
    }

    setShowFloatingControls(true);

    if (isFullscreen && hideControlsDelay > 0) {
      const timer = setTimeout(() => {
        setShowFloatingControls(false);
      }, hideControlsDelay);
      setMouseIdleTimer(timer);
    }
  }, [isFullscreen, hideControlsDelay, mouseIdleTimer]);

  // フルスクリーン時のマウス移動監視
  useEffect(() => {
    if (isFullscreen) {
      resetMouseIdleTimer();
      
      const handleMouseMove = () => resetMouseIdleTimer();
      const handleKeyDown = () => resetMouseIdleTimer();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('keydown', handleKeyDown);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('keydown', handleKeyDown);
        if (mouseIdleTimer) {
          clearTimeout(mouseIdleTimer);
        }
      };
    } else {
      setShowFloatingControls(true);
      if (mouseIdleTimer) {
        clearTimeout(mouseIdleTimer);
        setMouseIdleTimer(null);
      }
    }
  }, [isFullscreen, resetMouseIdleTimer, mouseIdleTimer]);

  // フルスクリーン切り替え
  const handleToggleFullscreen = useCallback(async () => {
    const manager = fullscreenManagerRef.current;
    if (!manager) return;

    if (isFullscreen || isApiFullscreen) {
      // フルスクリーン終了
      const success = await manager.exitFullscreen();
      if (success) {
        onToggleFullscreen(false);
      }
    } else {
      // フルスクリーン開始
      const success = await manager.requestFullscreen();
      if (success) {
        onToggleFullscreen(true);
      }
    }
  }, [isFullscreen, isApiFullscreen, onToggleFullscreen]);

  // ESCキーでフルスクリーン終了
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        handleToggleFullscreen();
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isFullscreen, handleToggleFullscreen]);

  return (
    <Box
      ref={containerRef}
      sx={{
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : 'auto',
        left: isFullscreen ? 0 : 'auto',
        width: isFullscreen ? '100vw' : '100%',
        height: isFullscreen ? '100vh' : '100%',
        zIndex: isFullscreen ? theme.zIndex.modal + 1 : 'auto',
        backgroundColor: isFullscreen ? theme.palette.background.default : 'transparent',
        overflow: 'hidden',
      }}
    >
      {children}

      {/* 通常のフルスクリーンボタン（非フルスクリーン時） */}
      {!isFullscreen && showControls && fullscreenManagerRef.current?.isSupported() && (
        <Tooltip title="フルスクリーン表示">
          <Fab
            size="small"
            onClick={handleToggleFullscreen}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              zIndex: 10,
              backgroundColor: alpha(theme.palette.background.paper, 0.9),
              backdropFilter: 'blur(10px)',
            }}
          >
            <FullscreenIcon />
          </Fab>
        </Tooltip>
      )}

      {/* フルスクリーン時のフローティングコントロール */}
      <AnimatePresence>
        {isFullscreen && showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: showFloatingControls ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 20,
              pointerEvents: showFloatingControls ? 'auto' : 'none',
            }}
          >
            {/* トップバー */}
            <Box
              sx={{
                background: `linear-gradient(to bottom, ${alpha(theme.palette.background.paper, 0.9)}, transparent)`,
                backdropFilter: 'blur(10px)',
                p: 2,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <Tooltip title="フルスクリーン終了 (ESC)">
                <IconButton
                  onClick={handleToggleFullscreen}
                  sx={{
                    backgroundColor: alpha(theme.palette.background.paper, 0.8),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.background.paper, 1),
                    },
                  }}
                >
                  <FullscreenExitIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* フルスクリーン時のヘルプオーバーレイ */}
      <AnimatePresence>
        {isFullscreen && showFloatingControls && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, delay: 0.5 }}
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                backdropFilter: 'blur(10px)',
                px: 2,
                py: 1,
                borderRadius: 1,
                color: theme.palette.text.secondary,
                fontSize: '0.875rem',
                textAlign: 'center',
                border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
              }}
            >
              ESCキーまたは右上のボタンでフルスクリーンを終了 • マウスを動かすとコントロールが表示されます
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {/* フルスクリーン非対応時の警告 */}
      {isFullscreen && !fullscreenManagerRef.current?.isSupported() && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            backgroundColor: alpha(theme.palette.warning.main, 0.9),
            color: theme.palette.warning.contrastText,
            px: 2,
            py: 1,
            borderRadius: 1,
            fontSize: '0.875rem',
          }}
        >
          お使いのブラウザはフルスクリーン機能に対応していません
        </Box>
      )}
    </Box>
  );
};

export default QuestMapFullscreen;

// フルスクリーン状態を管理するカスタムフック
export const useFullscreen = (element?: HTMLElement) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const managerRef = useRef<FullscreenManager | null>(null);

  useEffect(() => {
    const targetElement = element || document.documentElement;
    managerRef.current = new FullscreenManager(targetElement as HTMLElement);

    const handleFullscreenChange = () => {
      const manager = managerRef.current;
      if (manager) {
        setIsFullscreen(manager.isFullscreen());
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, [element]);

  const requestFullscreen = useCallback(async (): Promise<boolean> => {
    const manager = managerRef.current;
    return manager ? await manager.requestFullscreen() : false;
  }, []);

  const exitFullscreen = useCallback(async (): Promise<boolean> => {
    const manager = managerRef.current;
    return manager ? await manager.exitFullscreen() : false;
  }, []);

  const toggleFullscreen = useCallback(async (): Promise<boolean> => {
    const manager = managerRef.current;
    if (!manager) return false;

    if (manager.isFullscreen()) {
      return await manager.exitFullscreen();
    } else {
      return await manager.requestFullscreen();
    }
  }, []);

  const isSupported = useCallback((): boolean => {
    const manager = managerRef.current;
    return manager ? manager.isSupported() : false;
  }, []);

  return {
    isFullscreen,
    requestFullscreen,
    exitFullscreen,
    toggleFullscreen,
    isSupported,
  };
};