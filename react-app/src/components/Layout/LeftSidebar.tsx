import React, { useState } from 'react';
import { Box, Typography, IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import {
  Chat as ChatIcon,
  Folder as FolderIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  History as HistoryIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface LeftSidebarProps {
  onDashboardToggle: () => void;
  onNewChat?: () => void;
  onHistoryOpen?: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  onDashboardToggle,
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
    navigate('/login');
  };

  const menuItems = [
    {
      icon: <ChatIcon />,
      label: 'チャット',
      path: '/chat',
      action: () => navigate('/chat')
    },
    {
      icon: <FolderIcon />,
      label: 'プロジェクト',
      path: '#',
      action: onDashboardToggle
    },
    {
      icon: <TimelineIcon />,
      label: 'タイムライン',
      path: '/timeline',
      action: () => {} // 未実装
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
    }
  ];

  return (
    <Box
      sx={{
        width: '64px',
        height: '100vh',
        background: '#FFFDF7', // --bg-secondary from mockup
        padding: '16px 12px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        borderRight: '1px solid #F0E8D8', // --border-light from mockup
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
            background: 'linear-gradient(135deg, #FF8C5A, #FFD166)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
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
                borderRadius: '12px',
                color: '#9E9891',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: '#FFF6E0',
                  color: '#6B6560',
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
            backgroundColor: '#F0E8D8',
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
                borderRadius: '12px',
                color: '#9E9891', // --text-tertiary from mockup
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: '#FFF6E0', // --bg-tertiary from mockup
                  color: '#6B6560', // --text-secondary from mockup
                },
                ...(location.pathname === item.path && item.path !== '#' && {
                  backgroundColor: '#FFF4EE', // --accent-orange-light from mockup
                  color: '#FF8C5A', // --accent-orange from mockup
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
                borderRadius: '12px',
                color: '#9E9891',
                transition: 'all 0.2s',
                '&:hover': {
                  backgroundColor: '#FFF6E0',
                  color: '#6B6560',
                },
                ...(isMenuOpen && {
                  backgroundColor: '#FFF4EE',
                  color: '#FF8C5A',
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
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                ml: 2,
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
              <PersonIcon sx={{ mr: 1, color: '#9E9891' }} />
              <Typography variant="body2" sx={{ color: '#6B6560' }}>
                {user.username}
              </Typography>
            </MenuItem>

            {/* Profile Settings - Optional/未実装 */}
            <MenuItem
              onClick={() => {
                // TODO: プロフィール設定ページへのナビゲーション
                console.log('プロフィール設定（未実装）');
              }}
              disabled
              sx={{ opacity: 0.5 }}
            >
              <SettingsIcon sx={{ mr: 1 }} />
              プロフィール設定
            </MenuItem>

            {/* Logout */}
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, color: '#FF6B6B' }} />
              <Typography variant="body2" sx={{ color: '#FF6B6B' }}>
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