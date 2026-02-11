import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, useTheme } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

// 既存のコンポーネント
import QuestMapCanvas from './QuestMapCanvas';
import QuestMapHelp from './QuestMapHelp';
import QuestMapTooltip from './QuestMapTooltip';
import QuestMapAccessibility from './QuestMapAccessibility';
import QuestMapAnnouncer, { useAnnouncer, announceToUser } from './QuestMapAnnouncer';
import QuestMapResponsive from './QuestMapResponsive';
import QuestMapPerformance, { QuestMapLoadingIndicator, usePerformanceMonitor, useLoadingState } from './QuestMapPerformance';
import QuestMapViews from './QuestMapViews';
import QuestMapFullscreen, { useFullscreen } from './QuestMapFullscreen';
import QuestMapVisualFeedback, { useVisualFeedback, type FeedbackType } from './QuestMapVisualFeedback';

// テーマ関連
import { 
  createQuestMapTheme, 
  applyCustomization, 
  defaultCustomization,
  type QuestMapCustomization 
} from '../../theme/questMap';

// 型定義
import type { QuestNode, QuestEdge, NodeType, NodeStatus } from '../../types/questMap';

export interface QuestMapEnhancedProps {
  // データ
  nodes: QuestNode[];
  edges: QuestEdge[];
  
  // 状態
  selectedNodeId?: string | null;
  isLoading?: boolean;
  error?: string | null;
  
  // イベントハンドラ
  onNodeSelect?: (nodeId: string | null) => void;
  onNodeActivate?: (nodeId: string) => void;
  onNodeMenuOpen?: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeUpdate?: (nodeId: string, updates: Partial<QuestNode>) => void;
  onNodeDelete?: (nodeId: string) => void;
  onNodeCreate?: (node: Omit<QuestNode, 'id'>) => void;
  onEdgeCreate?: (edge: Omit<QuestEdge, 'id'>) => void;
  onEdgeDelete?: (edgeId: string) => void;
  onZoom?: (direction: 'in' | 'out' | 'fit') => void;
  onCenter?: () => void;
  onRetry?: () => void;
  
  // 設定
  customization?: QuestMapCustomization;
  onCustomizationChange?: (customization: QuestMapCustomization) => void;
  enableAccessibility?: boolean;
  enablePerformanceMonitor?: boolean;
  enableVisualFeedback?: boolean;
  enableTutorial?: boolean;
  initialViewMode?: 'map' | 'list' | 'grid';
  
  // レイアウト
  width?: number;
  height?: number;
  showMinimap?: boolean;
  showHelp?: boolean;
}

const QuestMapEnhanced: React.FC<QuestMapEnhancedProps> = ({
  nodes = [],
  edges = [],
  selectedNodeId = null,
  isLoading = false,
  error = null,
  onNodeSelect,
  onNodeActivate,
  onNodeMenuOpen,
  onNodeUpdate,
  onNodeDelete,
  onNodeCreate,
  onEdgeCreate,
  onEdgeDelete,
  onZoom,
  onCenter,
  onRetry,
  customization = defaultCustomization,
  onCustomizationChange,
  enableAccessibility = true,
  enablePerformanceMonitor = false,
  enableVisualFeedback = true,
  enableTutorial = true,
  initialViewMode = 'map',
  width = 1200,
  height = 800,
  showMinimap = true,
  showHelp = true,
}) => {
  const theme = useTheme();
  
  // 状態管理
  const [viewMode, setViewMode] = useState<'map' | 'list' | 'grid'>(initialViewMode);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tooltipState, setTooltipState] = useState<{
    open: boolean;
    anchorEl: HTMLElement | null;
    node?: QuestNode;
  }>({ open: false, anchorEl: null });
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Hooks
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { announce, clear: clearAnnouncements } = useAnnouncer();
  const { feedbacks, addFeedback, removeFeedback } = useVisualFeedback();
  const { loadingState, startLoading, updateProgress, completeLoading, errorLoading } = useLoadingState();

  // テーマの適用
  const { questMapTheme, fontSettings } = useMemo(() => {
    return applyCustomization(customization, theme.palette.mode === 'dark');
  }, [customization, theme.palette.mode]);

  // パフォーマンス最適化
  const optimizedNodes = useMemo(() => {
    return nodes.filter(node => node != null);
  }, [nodes]);

  const optimizedEdges = useMemo(() => {
    return edges.filter(edge => edge != null && 
      optimizedNodes.some(n => n.id === edge.sourceId) && 
      optimizedNodes.some(n => n.id === edge.targetId)
    );
  }, [edges, optimizedNodes]);

  // 初回チュートリアル
  useEffect(() => {
    if (enableTutorial && nodes.length > 0 && !localStorage.getItem('questmap-tutorial-completed')) {
      setTutorialOpen(true);
    }
  }, [enableTutorial, nodes.length]);

  // ローディング状態の管理
  useEffect(() => {
    if (isLoading) {
      startLoading('クエストマップを読み込み中...', 3000);
    } else if (error) {
      errorLoading(error);
    } else if (loadingState.isLoading) {
      completeLoading();
    }
  }, [isLoading, error, startLoading, errorLoading, completeLoading, loadingState.isLoading]);

  // イベントハンドラー
  const handleNodeSelect = useCallback((nodeId: string | null) => {
    onNodeSelect?.(nodeId);
    
    if (enableVisualFeedback && nodeId) {
      const node = optimizedNodes.find(n => n.id === nodeId);
      if (node?.position) {
        addFeedback({
          type: 'select',
          x: node.position.x,
          y: node.position.y,
          duration: 1000,
        });
      }
    }
    
    if (enableAccessibility) {
      const node = optimizedNodes.find(n => n.id === nodeId);
      if (node) {
        announce(`${node.title}を選択しました`, 'medium');
      } else {
        announce('選択を解除しました', 'low');
      }
    }
  }, [onNodeSelect, enableVisualFeedback, enableAccessibility, optimizedNodes, addFeedback, announce]);

  const handleNodeActivate = useCallback((nodeId: string) => {
    onNodeActivate?.(nodeId);
    
    if (enableVisualFeedback) {
      const node = optimizedNodes.find(n => n.id === nodeId);
      if (node?.position) {
        addFeedback({
          type: 'action-success',
          x: node.position.x,
          y: node.position.y,
          data: { message: 'クエストを開始！' },
          duration: 2000,
        });
      }
    }
  }, [onNodeActivate, enableVisualFeedback, optimizedNodes, addFeedback]);

  const handleNodeMenuOpen = useCallback((nodeId: string, position: { x: number; y: number }) => {
    onNodeMenuOpen?.(nodeId, position);
    
    if (enableAccessibility) {
      const node = optimizedNodes.find(n => n.id === nodeId);
      if (node) {
        announce(`${node.title}のメニューを開きました`, 'medium');
      }
    }
  }, [onNodeMenuOpen, enableAccessibility, optimizedNodes, announce]);

  const handleZoom = useCallback((direction: 'in' | 'out' | 'fit') => {
    onZoom?.(direction);
    
    if (enableAccessibility) {
      const message = direction === 'in' ? 'ズームインしました' : 
                     direction === 'out' ? 'ズームアウトしました' : 
                     'マップ全体を表示しました';
      announce(message, 'low');
    }
  }, [onZoom, enableAccessibility, announce]);

  const handleCenter = useCallback(() => {
    onCenter?.();
    
    if (enableAccessibility) {
      announce('マップを中央に配置しました', 'low');
    }
  }, [onCenter, enableAccessibility, announce]);

  const handleViewModeChange = useCallback((mode: 'map' | 'list' | 'grid') => {
    setViewMode(mode);
    
    if (enableAccessibility) {
      const modeNames = { map: 'マップ表示', list: 'リスト表示', grid: 'グリッド表示' };
      announce(`${modeNames[mode]}に切り替えました`, 'medium');
    }
  }, [enableAccessibility, announce]);

  const handleTutorialStart = useCallback(() => {
    setTutorialOpen(true);
    setHelpOpen(false);
  }, []);

  const handleTutorialComplete = useCallback(() => {
    setTutorialOpen(false);
    localStorage.setItem('questmap-tutorial-completed', 'true');
    
    if (enableAccessibility) {
      announce('チュートリアルが完了しました。探Qマップをお楽しみください！', 'high');
    }
  }, [enableAccessibility, announce]);

  const handleSettingsOpen = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleOptimize = useCallback(() => {
    // パフォーマンス最適化の実行
    if (enableAccessibility) {
      announce('パフォーマンスを最適化しました', 'medium');
    }
  }, [enableAccessibility, announce]);

  const handleTooltipOpen = useCallback((anchorEl: HTMLElement, node: QuestNode) => {
    setTooltipState({ open: true, anchorEl, node });
  }, []);

  const handleTooltipClose = useCallback(() => {
    setTooltipState({ open: false, anchorEl: null });
  }, []);

  // アンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      clearAnnouncements();
    };
  }, [clearAnnouncements]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '--questmap-theme': questMapTheme,
        '--questmap-font': fontSettings,
      }}
    >
      {/* フルスクリーンコンテナ */}
      <QuestMapFullscreen
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      >
        {/* メインコンテンツ */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%', height: '100%' }}
        >
          {/* レスポンシブレイアウト */}
          <QuestMapResponsive
            nodes={optimizedNodes}
            edges={optimizedEdges}
            onViewModeChange={handleViewModeChange}
            onZoom={handleZoom}
            onCenter={handleCenter}
            onFullscreenToggle={toggleFullscreen}
            onSettingsOpen={handleSettingsOpen}
            viewMode={viewMode}
            isFullscreen={isFullscreen}
          >
            {/* 表示モードによる条件分岐 */}
            {viewMode === 'map' ? (
              <QuestMapCanvas
                width={width}
                height={height}
                key="canvas"
              />
            ) : (
              <QuestMapViews
                nodes={optimizedNodes}
                edges={optimizedEdges}
                selectedNodeId={selectedNodeId}
                onNodeSelect={handleNodeSelect}
                onNodeAction={(nodeId, action) => {
                  switch (action) {
                    case 'view':
                    case 'start':
                      handleNodeActivate(nodeId);
                      break;
                    case 'edit':
                      onNodeUpdate?.(nodeId, {});
                      break;
                    case 'delete':
                      onNodeDelete?.(nodeId);
                      break;
                    case 'complete':
                      onNodeUpdate?.(nodeId, { status: NodeStatus.COMPLETED });
                      break;
                  }
                }}
                viewMode={viewMode}
                showMinimap={showMinimap && viewMode !== 'map'}
                onMinimapNodeClick={handleNodeSelect}
                key="views"
              />
            )}
          </QuestMapResponsive>
        </motion.div>
      </QuestMapFullscreen>

      {/* アクセシビリティ機能 */}
      {enableAccessibility && (
        <QuestMapAccessibility
          nodes={optimizedNodes}
          edges={optimizedEdges}
          selectedNodeId={selectedNodeId}
          onNodeSelect={handleNodeSelect}
          onNodeActivate={handleNodeActivate}
          onMenuOpen={handleNodeMenuOpen}
          onZoom={handleZoom}
          onCenter={handleCenter}
          onAnnounce={announce}
          reduceMotion={customization.accessibility.reducedMotion}
        />
      )}

      {/* 視覚フィードバック */}
      {enableVisualFeedback && (
        <QuestMapVisualFeedback
          feedbacks={feedbacks}
          onFeedbackComplete={removeFeedback}
        />
      )}

      {/* パフォーマンスモニター */}
      {enablePerformanceMonitor && (
        <QuestMapPerformance
          onRetry={onRetry}
          onOptimize={handleOptimize}
          showDetailedMetrics={process.env.NODE_ENV === 'development'}
        />
      )}

      {/* ヘルプシステム */}
      {showHelp && (
        <QuestMapHelp
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          showTutorial={tutorialOpen}
          onStartTutorial={handleTutorialStart}
          isFirstTime={nodes.length > 0 && !localStorage.getItem('questmap-tutorial-completed')}
        />
      )}

      {/* ツールチップ */}
      <QuestMapTooltip
        open={tooltipState.open}
        anchorEl={tooltipState.anchorEl}
        node={tooltipState.node}
        onClose={handleTooltipClose}
      />

      {/* ローディングインジケーター */}
      <QuestMapLoadingIndicator loadingState={loadingState} />

      {/* アナウンサー（スクリーンリーダー対応） */}
      <QuestMapAnnouncer />

      {/* エラー表示 */}
      <AnimatePresence>
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            style={{
              position: 'absolute',
              top: 16,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: theme.zIndex.snackbar,
              backgroundColor: theme.palette.error.main,
              color: theme.palette.error.contrastText,
              padding: '12px 24px',
              borderRadius: 8,
              boxShadow: theme.shadows[8],
            }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
};

export default QuestMapEnhanced;