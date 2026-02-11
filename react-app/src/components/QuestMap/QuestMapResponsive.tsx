import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  useMediaQuery,
  useTheme,
  Breakpoint,
  IconButton,
  Drawer,
  Fab,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  Tooltip,
} from '@mui/material';
import {
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  ViewList as ViewListIcon,
  Map as MapIcon,
  Tune as TuneIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import type { QuestNode, QuestEdge } from '../../types/questMap';

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  large: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large';
  orientation: 'portrait' | 'landscape';
  isTouch: boolean;
  pixelRatio: number;
}

export interface ResponsiveLayout {
  containerPadding: number;
  nodeSize: {
    small: number;
    medium: number;
    large: number;
  };
  fontSize: {
    small: number;
    medium: number;
    large: number;
  };
  spacing: {
    nodes: number;
    edges: number;
  };
  controls: {
    size: number;
    position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  };
}

interface QuestMapResponsiveProps {
  nodes: QuestNode[];
  edges: QuestEdge[];
  children: React.ReactNode;
  onViewModeChange: (mode: 'map' | 'list' | 'grid') => void;
  onZoom: (direction: 'in' | 'out' | 'fit') => void;
  onCenter: () => void;
  onFullscreenToggle: () => void;
  onSettingsOpen: () => void;
  viewMode: 'map' | 'list' | 'grid';
  isFullscreen: boolean;
}

// レスポンシブブレークポイント
const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
  large: 1920,
};

// デバイス判定用のユーティリティ
const getViewportInfo = (): ViewportInfo => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  let breakpoint: ViewportInfo['breakpoint'] = 'mobile';
  if (width >= RESPONSIVE_BREAKPOINTS.large) {
    breakpoint = 'large';
  } else if (width >= RESPONSIVE_BREAKPOINTS.desktop) {
    breakpoint = 'desktop';
  } else if (width >= RESPONSIVE_BREAKPOINTS.tablet) {
    breakpoint = 'tablet';
  }

  const orientation = width > height ? 'landscape' : 'portrait';
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const pixelRatio = window.devicePixelRatio || 1;

  return {
    width,
    height,
    breakpoint,
    orientation,
    isTouch,
    pixelRatio,
  };
};

// レスポンシブレイアウト設定
const getResponsiveLayout = (viewport: ViewportInfo): ResponsiveLayout => {
  const { breakpoint, isTouch } = viewport;

  const layouts: Record<ViewportInfo['breakpoint'], ResponsiveLayout> = {
    mobile: {
      containerPadding: 8,
      nodeSize: { small: 16, medium: 20, large: 28 },
      fontSize: { small: 10, medium: 12, large: 14 },
      spacing: { nodes: 80, edges: 2 },
      controls: { size: 40, position: 'bottom-right' },
    },
    tablet: {
      containerPadding: 12,
      nodeSize: { small: 20, medium: 24, large: 32 },
      fontSize: { small: 11, medium: 13, large: 16 },
      spacing: { nodes: 120, edges: 2.5 },
      controls: { size: 44, position: 'bottom-right' },
    },
    desktop: {
      containerPadding: 16,
      nodeSize: { small: 24, medium: 28, large: 36 },
      fontSize: { small: 12, medium: 14, large: 18 },
      spacing: { nodes: 150, edges: 3 },
      controls: { size: 48, position: 'top-right' },
    },
    large: {
      containerPadding: 20,
      nodeSize: { small: 28, medium: 32, large: 40 },
      fontSize: { small: 13, medium: 16, large: 20 },
      spacing: { nodes: 180, edges: 3.5 },
      controls: { size: 52, position: 'top-right' },
    },
  };

  const layout = layouts[breakpoint];
  
  // タッチデバイスでは少し大きめのサイズに調整
  if (isTouch) {
    layout.nodeSize.small += 4;
    layout.nodeSize.medium += 4;
    layout.nodeSize.large += 4;
    layout.controls.size += 8;
  }

  return layout;
};

const QuestMapResponsive: React.FC<QuestMapResponsiveProps> = ({
  nodes,
  edges,
  children,
  onViewModeChange,
  onZoom,
  onCenter,
  onFullscreenToggle,
  onSettingsOpen,
  viewMode,
  isFullscreen,
}) => {
  const theme = useTheme();
  const [viewport, setViewport] = useState<ViewportInfo>(getViewportInfo());
  const [layout, setLayout] = useState<ResponsiveLayout>(getResponsiveLayout(viewport));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [speedDialOpen, setSpeedDialOpen] = useState(false);

  // メディアクエリ
  const isMobile = useMediaQuery(`(max-width:${RESPONSIVE_BREAKPOINTS.mobile}px)`);
  const isTablet = useMediaQuery(`(max-width:${RESPONSIVE_BREAKPOINTS.tablet}px)`);
  const isDesktop = useMediaQuery(`(min-width:${RESPONSIVE_BREAKPOINTS.desktop}px)`);

  // ビューポート情報の更新
  const updateViewport = useCallback(() => {
    const newViewport = getViewportInfo();
    const newLayout = getResponsiveLayout(newViewport);
    
    setViewport(newViewport);
    setLayout(newLayout);
  }, []);

  // リサイズイベントのハンドリング
  useEffect(() => {
    const handleResize = () => {
      updateViewport();
    };

    const handleOrientationChange = () => {
      // オリエンテーション変更後に少し遅延してアップデート
      setTimeout(updateViewport, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [updateViewport]);

  // モバイル用のアクション
  const mobileActions = [
    {
      icon: <ViewListIcon />,
      name: 'リスト表示',
      action: () => onViewModeChange('list'),
      active: viewMode === 'list',
    },
    {
      icon: <MapIcon />,
      name: 'マップ表示',
      action: () => onViewModeChange('map'),
      active: viewMode === 'map',
    },
    {
      icon: <ZoomInIcon />,
      name: 'ズームイン',
      action: () => onZoom('in'),
      active: false,
    },
    {
      icon: <ZoomOutIcon />,
      name: 'ズームアウト',
      action: () => onZoom('out'),
      active: false,
    },
    {
      icon: <CenterIcon />,
      name: '中央表示',
      action: onCenter,
      active: false,
    },
    {
      icon: isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />,
      name: isFullscreen ? 'フルスクリーン終了' : 'フルスクリーン',
      action: onFullscreenToggle,
      active: false,
    },
    {
      icon: <TuneIcon />,
      name: '設定',
      action: onSettingsOpen,
      active: false,
    },
  ];

  // CSS変数の設定
  const cssVariables = {
    '--node-size-small': `${layout.nodeSize.small}px`,
    '--node-size-medium': `${layout.nodeSize.medium}px`,
    '--node-size-large': `${layout.nodeSize.large}px`,
    '--font-size-small': `${layout.fontSize.small}px`,
    '--font-size-medium': `${layout.fontSize.medium}px`,
    '--font-size-large': `${layout.fontSize.large}px`,
    '--node-spacing': `${layout.spacing.nodes}px`,
    '--edge-width': `${layout.spacing.edges}px`,
    '--container-padding': `${layout.containerPadding}px`,
    '--control-size': `${layout.controls.size}px`,
  };

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        position: 'relative',
        ...cssVariables,
        // レスポンシブスタイリング
        '& .quest-node': {
          fontSize: isMobile ? layout.fontSize.small : 
                   isTablet ? layout.fontSize.medium : 
                   layout.fontSize.large,
        },
        '& .quest-node-circle': {
          r: isMobile ? layout.nodeSize.small : 
             isTablet ? layout.nodeSize.medium : 
             layout.nodeSize.large,
        },
        '& .quest-edge': {
          strokeWidth: layout.spacing.edges,
        },
      }}
    >
      {children}

      {/* デスクトップ用コントロール */}
      {!isMobile && (
        <Box
          sx={{
            position: 'absolute',
            top: layout.controls.position.includes('top') ? 16 : 'auto',
            bottom: layout.controls.position.includes('bottom') ? 16 : 'auto',
            left: layout.controls.position.includes('left') ? 16 : 'auto',
            right: layout.controls.position.includes('right') ? 16 : 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            zIndex: theme.zIndex.speedDial,
          }}
        >
          {/* 表示モード切り替え */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Tooltip title="マップ表示">
              <IconButton
                onClick={() => onViewModeChange('map')}
                color={viewMode === 'map' ? 'primary' : 'default'}
                size="small"
                sx={{
                  width: layout.controls.size,
                  height: layout.controls.size,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[2],
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <MapIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="リスト表示">
              <IconButton
                onClick={() => onViewModeChange('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
                size="small"
                sx={{
                  width: layout.controls.size,
                  height: layout.controls.size,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[2],
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                <ViewListIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* ズームコントロール */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Tooltip title="ズームイン">
              <IconButton
                onClick={() => onZoom('in')}
                size="small"
                sx={{
                  width: layout.controls.size,
                  height: layout.controls.size,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[2],
                }}
              >
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="ズームアウト">
              <IconButton
                onClick={() => onZoom('out')}
                size="small"
                sx={{
                  width: layout.controls.size,
                  height: layout.controls.size,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[2],
                }}
              >
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="中央表示">
              <IconButton
                onClick={onCenter}
                size="small"
                sx={{
                  width: layout.controls.size,
                  height: layout.controls.size,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[2],
                }}
              >
                <CenterIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* その他のコントロール */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Tooltip title={isFullscreen ? 'フルスクリーン終了' : 'フルスクリーン'}>
              <IconButton
                onClick={onFullscreenToggle}
                size="small"
                sx={{
                  width: layout.controls.size,
                  height: layout.controls.size,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[2],
                }}
              >
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="設定">
              <IconButton
                onClick={onSettingsOpen}
                size="small"
                sx={{
                  width: layout.controls.size,
                  height: layout.controls.size,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[2],
                }}
              >
                <TuneIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      )}

      {/* モバイル用SpeedDial */}
      {isMobile && (
        <SpeedDial
          ariaLabel="クエストマップ操作"
          sx={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            zIndex: theme.zIndex.speedDial,
          }}
          icon={<SpeedDialIcon icon={<MenuIcon />} />}
          open={speedDialOpen}
          onOpen={() => setSpeedDialOpen(true)}
          onClose={() => setSpeedDialOpen(false)}
          direction="up"
        >
          {mobileActions.map((action) => (
            <SpeedDialAction
              key={action.name}
              icon={action.icon}
              tooltipTitle={action.name}
              onClick={() => {
                action.action();
                setSpeedDialOpen(false);
              }}
              sx={{
                backgroundColor: action.active ? theme.palette.primary.main : undefined,
                color: action.active ? theme.palette.primary.contrastText : undefined,
                '&:hover': {
                  backgroundColor: action.active 
                    ? theme.palette.primary.dark 
                    : theme.palette.action.hover,
                },
              }}
            />
          ))}
        </SpeedDial>
      )}

      {/* デバッグ情報（開発時のみ） */}
      {process.env.NODE_ENV === 'development' && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            backgroundColor: theme.palette.background.paper,
            padding: 1,
            borderRadius: 1,
            fontSize: '0.75rem',
            opacity: 0.7,
            zIndex: theme.zIndex.tooltip,
          }}
        >
          <div>Breakpoint: {viewport.breakpoint}</div>
          <div>Size: {viewport.width} x {viewport.height}</div>
          <div>Orientation: {viewport.orientation}</div>
          <div>Touch: {viewport.isTouch ? 'Yes' : 'No'}</div>
          <div>Pixel Ratio: {viewport.pixelRatio}</div>
          <div>Nodes: {nodes.length}</div>
        </Box>
      )}
    </Box>
  );
};

export default QuestMapResponsive;

// レスポンシブユーティリティのエクスポート
export { getViewportInfo, getResponsiveLayout, RESPONSIVE_BREAKPOINTS };
export type { ViewportInfo, ResponsiveLayout };