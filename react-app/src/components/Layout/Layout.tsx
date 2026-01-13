// react-app/src/components/Layout/Layout.tsx
import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Logout,
  ExpandMore,
} from '@mui/icons-material';
import { motion} from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useTutorialStore } from '../../stores/tutorialStore';
import DashboardSidebar from './DashboardSidebar';
import LeftSidebar from './LeftSidebar';

const leftSidebarWidth = 64; // Fixed width for new simple sidebar
const defaultDashboardSidebarWidth = 350;
const minDashboardSidebarWidth = 300;
const minMainContentWidth = 600; // メインコンテンツ（中央のチャット）の最小幅

interface LayoutContextType {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}

export const LayoutContext = React.createContext<LayoutContextType>({
  sidebarOpen: true,
  onSidebarToggle: () => {},
});

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  const { user, logout } = useAuthStore();
  const { 
    chatPageId, 
  } = useChatStore();

  // 現在のページに基づくチャットページIDを生成
  const getEffectiveChatPageId = () => {
    if (chatPageId) return chatPageId;
    
    // プロジェクトページの場合
    const projectMatch = location.pathname.match(/\/projects\/(\d+)/);
    if (projectMatch) {
      return `project-${projectMatch[1]}`;
    }
    
    // ダッシュボードやその他のページの場合
    return `general-${location.pathname.replace(/\//g, '-')}`;
  };
  const { startTutorialManually } = useTutorialStore();
  
  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(!isMobile); // モバイルではデフォルトで非表示
  const [dashboardSidebarWidth, setDashboardSidebarWidth] = useState(defaultDashboardSidebarWidth);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleDashboardSidebarToggle = useCallback(() => {
    setDashboardSidebarOpen(prev => !prev);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setUserMenuAnchor(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  // ウィンドウリサイズ時のダッシュボードサイドバー幅調整
  useEffect(() => {
    const handleWindowResize = () => {
      if (!dashboardSidebarOpen) return;
      
      const dynamicMaxWidth = window.innerWidth - leftSidebarWidth - minMainContentWidth;
      
      // ダッシュボード幅が新しい最大幅を超えている場合は調整
      if (dashboardSidebarWidth > dynamicMaxWidth) {
        setDashboardSidebarWidth(Math.max(minDashboardSidebarWidth, dynamicMaxWidth));
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [dashboardSidebarOpen, dashboardSidebarWidth]);

  // 画面サイズが変わった時のダッシュボードサイドバー状態管理
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      return;
    }
    // モバイルからデスクトップに変わった場合、ダッシュボードサイドバーを開く
    if (!isMobile) {
      setDashboardSidebarOpen(true);
    }
    // デスクトップからモバイルに変わった場合、ダッシュボードサイドバーを閉じる
    else {
      setDashboardSidebarOpen(false);
    }
  }, [isMobile, hasInitialized]);


  return (
    <LayoutContext.Provider value={{ sidebarOpen: true, onSidebarToggle: handleDashboardSidebarToggle }}>
      <Box sx={{ display: 'flex', minHeight: '100vh', background: '#FFFAED' }}>
        {/* New Left Sidebar */}
        {!isMobile && (
          <LeftSidebar 
            onDashboardToggle={handleDashboardSidebarToggle}
            onNewChat={() => {
              navigate('/chat');
              // URLパラメータでnewChatフラグを設定
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('newChatRequest'));
              }, 100);
            }}
            onHistoryOpen={() => {
              navigate('/chat');
              // URLパラメータでhistoryOpenフラグを設定
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('historyOpenRequest'));
              }, 100);
            }}
          />
        )}

        {/* Main content - 中央のチャットエリア */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { 
              xs: '100%',
              sm: `calc(100% - ${leftSidebarWidth}px - ${dashboardSidebarOpen ? dashboardSidebarWidth : 0}px)`
            },
            minHeight: '100vh',
            transition: 'width 0.3s ease',
            maxWidth: '900px',
            margin: '0 auto',
            paddingLeft: isMobile ? 0 : 0,
            paddingRight: isMobile ? 0 : 0,
          }}
        >
          {/* モバイル用のメニューボタン */}
          {isMobile && (
            <Box sx={{ 
              position: 'fixed', 
              top: 16, 
              left: 16, 
              zIndex: 1000,
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '12px',
              backdropFilter: 'blur(10px)'
            }}>
              <IconButton
                onClick={handleDashboardSidebarToggle}
                sx={{ 
                  color: '#FF8C5A',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 140, 90, 0.1)',
                  }
                }}
              >
                <MenuIcon />
              </IconButton>
            </Box>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%' }}
          >
            <Outlet />
          </motion.div>
        </Box>

        {/* Right Dashboard Sidebar */}
        <DashboardSidebar
          isOpen={dashboardSidebarOpen}
          onToggle={handleDashboardSidebarToggle}
          width={isMobile ? window.innerWidth * 0.85 : dashboardSidebarWidth}
          isMobile={isMobile}
        />

        {/* ユーザーメニューは一旦削除 - 必要に応じて後で追加 */}
      </Box>
    </LayoutContext.Provider>
  );
};

export default memo(Layout);