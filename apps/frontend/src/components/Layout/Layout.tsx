// react-app/src/components/Layout/Layout.tsx
import React, { memo } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import { motion } from 'framer-motion';
import LeftSidebar from './LeftSidebar';
import { GlobalDiaryButton } from '../Diary/GlobalDiaryButton';
import { useAuthStore } from '../../stores/authStore';
import { isFirstAiTutorialRequired } from '../../utils/onboardingGuards';

const leftSidebarWidth = 64; // Fixed width for new simple sidebar

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
  const profile = useAuthStore((state) => state.profile);
  const showDiaryButton = profile?.role !== 'teacher' && profile?.role !== 'admin';
  const isFirstAiTutorialLocked = isFirstAiTutorialRequired(profile);

  return (
    <LayoutContext.Provider value={{ sidebarOpen: false, onSidebarToggle: () => {} }}>
      <Box sx={{ display: 'flex', minHeight: '100vh', background: '#FFFAED' }}>
        {/* New Left Sidebar */}
        {!isMobile && (
            <LeftSidebar
              disabled={isFirstAiTutorialLocked}
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
              sm: `calc(100% - ${leftSidebarWidth}px)`
            },
            minHeight: '100vh',
            transition: 'width 0.2s ease',
            // maxWidth制限を削除して全幅使用
            // margin: '0 auto'も削除
            paddingLeft: 0,
            paddingRight: 0,
            position: 'relative', // スクロール領域のための位置指定
            overflow: 'hidden', // 子要素でスクロールを管理
          }}
        >
          <GlobalDiaryButton hidden={!showDiaryButton || isFirstAiTutorialLocked} disabled={isFirstAiTutorialLocked} />
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
      </Box>
    </LayoutContext.Provider>
  );
};

export default memo(Layout);
