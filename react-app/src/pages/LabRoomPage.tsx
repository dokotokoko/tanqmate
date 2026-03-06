// pages/LabRoomPage.tsx - 探Q LAB v5 (Three.js / React Three Fiber)

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Dialog,
  DialogContent,
  DialogTitle,
  Tooltip,
} from '@mui/material';
import { Close, Refresh, Chat as ChatIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useAuthStore } from '../stores/authStore';
import { useLabData } from '../components/Lab/useLabData';
import ProgressMapDisplay from '../components/Lab/ProgressMapDisplay';
import EffortTimelinePanel from '../components/Lab/EffortTimelinePanel';
import PersonalityPanel from '../components/Lab/PersonalityPanel';
import { LabRoom3DCanvas } from '../components/Lab/LabRoom3D';

const LabRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stats, progress, personality, loading, error, refetch } = useLabData();

  // Avatar state
  const [avatarPos, setAvatarPos] = useState<[number, number, number]>([0, 0, 1]);
  const [isWalking, setIsWalking] = useState(false);
  const walkTimerRef = React.useRef<number | null>(null);

  // Modal state
  const [openModal, setOpenModal] = useState<string | null>(null);

  // Floor click handler - convert 3D point to avatar position
  const handleFloorClick = useCallback((point: THREE.Vector3) => {
    // Clamp to room bounds (half room width/depth with padding)
    const x = Math.max(-3.5, Math.min(3.5, point.x));
    const z = Math.max(-3.5, Math.min(3.5, point.z));
    setAvatarPos([x, 0, z]);
    setIsWalking(true);
    if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
    walkTimerRef.current = window.setTimeout(() => setIsWalking(false), 800);
  }, []);

  // Summary data
  const progressPct = progress.length > 0 ? progress[0].completion_rate : 0;
  const progressTitle = progress.length > 0
    ? (progress[0].title.length > 8 ? progress[0].title.slice(0, 8) + '...' : progress[0].title)
    : '';
  const typeCode = personality?.type_code || '----';
  const typeName = personality?.type_name || '分析中';
  const streakDays = stats?.streak_days ?? 0;
  const totalChats = stats?.total_chats ?? 0;

  if (loading) {
    return (
      <Box sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh',
        background: 'linear-gradient(135deg, #E8DCC8 0%, #D4C8B0 100%)',
      }}>
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ fontSize: 40 }}
        >
          🔬
        </motion.div>
        <Typography sx={{ color: '#8B7755', mt: 2, fontWeight: 600 }}>
          探Q LABを準備中...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', p: 4 }}>
        <Typography color="error">エラー: {error}</Typography>
        <IconButton onClick={refetch} sx={{ mt: 1 }}><Refresh /></IconButton>
      </Box>
    );
  }

  return (
    <Box sx={{
      width: '100%', height: '100vh',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      bgcolor: '#5C7A4A',
    }}>
      {/* HUD Header */}
      <Box sx={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        px: 2.5, py: 0.8,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 100%)',
        backdropFilter: 'blur(10px)', zIndex: 20, flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '1.1rem' }}>🔬</Typography>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', letterSpacing: 1 }}>
            探Q LAB
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', ml: 1 }}>
            {user?.username}の研究室
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="更新">
            <IconButton size="small" onClick={refetch} sx={{ color: 'rgba(255,255,255,0.5)' }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="AIチャット">
            <IconButton size="small" onClick={() => navigate('/chat')} sx={{ color: '#FFB74D' }}>
              <ChatIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 3D Room */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <LabRoom3DCanvas
          username={user?.username || ''}
          avatarPos={avatarPos}
          isWalking={isWalking}
          onFloorClick={handleFloorClick}
          onMonitorClick={() => setOpenModal('progress')}
          onCorkboardClick={() => setOpenModal('personality')}
          onFrameClick={() => setOpenModal('effort')}
          progressPct={progressPct}
          progressTitle={progressTitle}
          typeCode={typeCode}
          typeName={typeName}
          totalChats={totalChats}
          streakDays={streakDays}
        />

        {/* Guide overlay */}
        <Box sx={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          px: 3, py: 1, borderRadius: '16px',
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center',
          pointerEvents: 'none', zIndex: 10,
        }}>
          <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 500 }}>
            🏠 床をクリックして歩き回ろう！壁のアイテムをクリックで詳細が見れるよ
          </Typography>
        </Box>
      </Box>

      {/* Detail Modals */}
      <Dialog
        open={openModal !== null}
        onClose={() => setOpenModal(null)}
        maxWidth="sm" fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(28,25,22,0.97)',
            border: '1px solid rgba(255,183,77,0.15)',
            borderRadius: 3, backdropFilter: 'blur(20px)',
            maxHeight: '85vh',
          },
        }}
      >
        <DialogTitle sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: '#FFB74D', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1.5,
        }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            {openModal === 'progress' && '🖥️ プロジェクト進捗マップ'}
            {openModal === 'personality' && '🧬 学習タイプ詳細'}
            {openModal === 'effort' && '📊 努力の軌跡'}
          </Typography>
          <IconButton onClick={() => setOpenModal(null)} sx={{ color: 'rgba(255,255,255,0.4)' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {openModal === 'progress' && <ProgressMapDisplay projects={progress} />}
          {openModal === 'personality' && personality && <PersonalityPanel personality={personality} />}
          {openModal === 'effort' && stats && <EffortTimelinePanel stats={stats} />}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LabRoomPage;
