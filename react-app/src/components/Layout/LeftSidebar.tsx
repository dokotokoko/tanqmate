import React from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import {
  Chat as ChatIcon,
  Folder as FolderIcon,
  Timeline as TimelineIcon,
  Settings as SettingsIcon,
  Add as AddIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

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
        gap: '8px',
        borderRight: '1px solid #F0E8D8', // --border-light from mockup
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
  );
};

export default LeftSidebar;