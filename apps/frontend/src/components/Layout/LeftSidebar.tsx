import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import {
  Chat as ChatIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  History as HistoryIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Book as BookIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { borderRadius, colors, shadows } from '../../styles/design-system';

interface LeftSidebarProps {
  onNewChat?: () => void;
  onHistoryOpen?: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  onNewChat,
  onHistoryOpen
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(anchorEl);

  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAccountMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleAccountMenuClose();
    navigate('/signin');
  };

  const handleDiaryOpen = () => {
    navigate('/diary?autostart=1');
  };

  const handleProfileOpen = () => {
    handleAccountMenuClose();
    navigate('/profile');
  };

  const menuItems = [
    {
      icon: <ChatIcon />,
      label: 'チャット',
      path: '/chat',
      action: () => navigate('/chat')
    },
    {
      icon: <SettingsIcon />,
      label: 'プロフィール',
      path: '/profile',
      action: () => navigate('/profile')
    },
    {
      icon: <SettingsIcon />,
      label: '先生用ダッシュボード',
      path: '/teacher',
      action: () => navigate('/teacher')
    },
    {
      icon: <SettingsIcon />,
      label: '設定',
      path: '/settings',
      action: () => {} // 未実装
    },
  ];

  // チャット関連のボタン（上部に配置）
  const chatItems = [
    {
      icon: <AddIcon />,
      label: '新規チャット',
      action: onNewChat
    },
    {
      icon: <HistoryIcon />,
      label: '会話履歴',
      action: onHistoryOpen
    },
    {
      icon: <BookIcon />,
      label: '日誌を書く',
      action: handleDiaryOpen
    }
  ];

  return (
    <Box
      sx={{
        width: '64px',
        height: '100vh',
        backgroundColor: colors.background.paper,
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRight: `1px solid ${colors.border.soft}`,
      }}
    >
      {/* Main Content Area */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {/* Logo */}
        <Box
          sx={{
            width: '40px',
            height: '40px',
            backgroundColor: colors.accentWarm.main,
            boxShadow: shadows.accent,
            borderRadius: borderRadius.lg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.text.inverse,
            fontWeight: 700,
            fontSize: '14px',
            marginBottom: '16px',
          }}
        >
          探Q
        </Box>

        {/* Chat Items */}
        {chatItems.map((item) => (
          <Tooltip key={item.label} title={item.label} placement="right">
            <IconButton
              onClick={item.action}
              sx={{
                width: '40px',
                height: '40px',
                borderRadius: borderRadius.lg,
                color: colors.text.muted,
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: colors.background.subtle,
                  color: colors.text.secondary,
                },
              }}
            >
              {item.icon}
            </IconButton>
          </Tooltip>
        ))}
        
        {/* Divider */}
        <Box
          sx={{
            width: '32px',
            height: '1px',
            backgroundColor: colors.border.soft,
            margin: '8px 0',
          }}
        />

        {/* Menu Items */}
        {menuItems.map((item) => (
          <Tooltip key={item.label} title={item.label} placement="right">
            <IconButton
              onClick={item.action}
              sx={{
                width: '40px',
                height: '40px',
                borderRadius: borderRadius.lg,
                color: colors.text.muted,
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: colors.background.subtle,
                  color: colors.text.secondary,
                },
                ...(location.pathname === item.path && {
                  backgroundColor: colors.accentWarm.soft,
                  color: colors.accentWarm.main,
                }),
              }}
            >
              {item.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Box>

      {/* Spacer to push account button to bottom */}
      <Box sx={{ flexGrow: 1 }} />

      {/* Account Menu - Fixed at bottom */}
      {user && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Tooltip title="アカウント" placement="right">
            <IconButton
              onClick={handleAccountMenuOpen}
              sx={{
                width: '40px',
                height: '40px',
                borderRadius: borderRadius.lg,
                color: colors.text.muted,
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: colors.background.subtle,
                  color: colors.text.secondary,
                },
                ...(isMenuOpen && {
                  backgroundColor: colors.accentWarm.soft,
                  color: colors.accentWarm.main,
                }),
              }}
            >
              <AccountCircleIcon />
            </IconButton>
          </Tooltip>

          {/* Account Menu */}
          <Menu
            anchorEl={anchorEl}
            open={isMenuOpen}
            onClose={handleAccountMenuClose}
            onClick={handleAccountMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 6px 18px rgba(120, 92, 64, 0.18))',
                mt: 1.5,
                ml: 2,
                backgroundColor: colors.background.paper,
                border: `1px solid ${colors.border.soft}`,
                borderRadius: borderRadius.lg,
                '& .MuiAvatar-root': {
                  width: 32,
                  height: 32,
                  ml: -0.5,
                  mr: 1,
                },
                '&::before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  left: 14,
                  width: 10,
                  height: 10,
                  bgcolor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
          >
            {/* User Info */}
            <MenuItem disabled sx={{ opacity: 1, cursor: 'default' }}>
              <PersonIcon sx={{ mr: 1, color: colors.text.muted }} />
              <Typography variant="body2" sx={{ color: colors.text.secondary }}>
                {user.username || user.email || 'ユーザー'}
              </Typography>
            </MenuItem>

            {/* Profile Settings */}
            <MenuItem
              onClick={handleProfileOpen}
            >
              <SettingsIcon sx={{ mr: 1 }} />
              プロフィール設定
            </MenuItem>

            {/* Logout */}
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, color: colors.error.main }} />
              <Typography variant="body2" sx={{ color: colors.error.main }}>
                ログアウト
              </Typography>
            </MenuItem>
          </Menu>
        </Box>
      )}
    </Box>
  );
};

export default LeftSidebar;
