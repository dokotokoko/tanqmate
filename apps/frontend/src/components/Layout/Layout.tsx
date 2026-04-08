// react-app/src/components/Layout/Layout.tsx
import React, { useState, useCallback, useEffect, memo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Box,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(!isMobile); // モバイルではデフォルトで非表示
  const [dashboardSidebarWidth, setDashboardSidebarWidth] = useState(defaultDashboardSidebarWidth);

  const handleDashboardSidebarToggle = useCallback(() => {
    setDashboardSidebarOpen(prev => !prev);
  }, []);

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
                navigate('/app/chat');
                // URLパラメータでnewChatフラグを設定
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('newChatRequest'));
                }, 100);
              }}
              onHistoryOpen={() => {
                navigate('/app/chat');
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
            // maxWidth制限を削除して全幅使用
            // margin: '0 auto'も削除
            paddingLeft: 0,
            paddingRight: 0,
            position: 'relative', // スクロール領域のための位置指定
            overflow: 'hidden', // 子要素でスクロールを管理
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
      </Box>
    </LayoutContext.Provider>
  );
};

export default memo(Layout);
