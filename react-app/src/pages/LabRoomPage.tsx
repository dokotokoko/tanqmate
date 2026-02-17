// pages/LabRoomPage.tsx - 探Q LAB メインルームページ
// あつまれ動物の森 × アメーバピグ風の研究室デザイン

import React, { useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  Fade,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  Refresh,
  Close,
  Chat as ChatIcon,
  Science,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLabData } from '../components/Lab/useLabData';
import ProgressMapDisplay from '../components/Lab/ProgressMapDisplay';
import EffortTimelinePanel from '../components/Lab/EffortTimelinePanel';
import PersonalityPanel from '../components/Lab/PersonalityPanel';

// ─────────── 装飾コンポーネント ───────────

// 浮遊するパーティクル（探究の光）
const FloatingParticles: React.FC = () => (
  <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
    {Array.from({ length: 12 }).map((_, i) => (
      <motion.div
        key={i}
        animate={{
          y: [0, -30, 0],
          x: [0, Math.sin(i) * 15, 0],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{
          duration: 4 + i * 0.5,
          repeat: Infinity,
          delay: i * 0.4,
        }}
        style={{
          position: 'absolute',
          left: `${8 + (i * 7.5) % 85}%`,
          top: `${20 + (i * 13) % 60}%`,
          width: 4 + (i % 3) * 2,
          height: 4 + (i % 3) * 2,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(255,${180 + i * 5},0,0.6), transparent)`,
        }}
      />
    ))}
  </Box>
);

// 部屋の装飾アイテム
const RoomDecoration: React.FC<{
  emoji: string;
  label: string;
  x: string;
  y: string;
  size?: number;
  delay?: number;
}> = ({ emoji, label, x, y, size = 28, delay = 0 }) => (
  <Tooltip title={label} placement="top">
    <motion.div
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.2, rotate: [0, -5, 5, 0] }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        fontSize: size,
        cursor: 'default',
        zIndex: 2,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
      }}
    >
      {emoji}
    </motion.div>
  </Tooltip>
);

// ─────────── 壁パネルコンポーネント（額縁風） ───────────
const WallFrame: React.FC<{
  title: string;
  icon: string;
  children: React.ReactNode;
  gridArea: string;
  onClick?: () => void;
  glowColor?: string;
}> = ({ title, icon, children, gridArea, onClick, glowColor = 'rgba(255,122,0,0.15)' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6 }}
    style={{ gridArea, position: 'relative' }}
  >
    <Box
      onClick={onClick}
      sx={{
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        // 額縁のような外枠
        border: '3px solid rgba(255,255,255,0.08)',
        background: `
          linear-gradient(145deg,
            rgba(40,35,30,0.95) 0%,
            rgba(30,28,25,0.98) 50%,
            rgba(25,22,20,0.95) 100%
          )
        `,
        boxShadow: `
          inset 0 1px 0 rgba(255,255,255,0.05),
          0 8px 32px rgba(0,0,0,0.4),
          0 0 60px ${glowColor}
        `,
        transition: 'all 0.3s ease',
        '&:hover': {
          border: '3px solid rgba(255,122,0,0.2)',
          boxShadow: `
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 12px 40px rgba(0,0,0,0.5),
            0 0 80px ${glowColor}
          `,
          transform: onClick ? 'translateY(-2px)' : 'none',
        },
      }}
    >
      {/* パネルヘッダー */}
      <Box
        sx={{
          px: 2,
          py: 1,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(90deg, rgba(255,122,0,0.08), transparent)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography sx={{ fontSize: '1rem' }}>{icon}</Typography>
        <Typography
          variant="subtitle2"
          sx={{
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 700,
            fontSize: '0.78rem',
            letterSpacing: 1,
          }}
        >
          {title}
        </Typography>
      </Box>

      {/* パネルコンテンツ */}
      <Box sx={{ p: 2, overflow: 'auto', maxHeight: 'calc(100% - 40px)' }}>
        {children}
      </Box>
    </Box>
  </motion.div>
);

// ─────────── アバターコンポーネント ───────────
const LabAvatar: React.FC<{ username: string }> = ({ username }) => {
  const initial = username?.charAt(0).toUpperCase() || '?';

  return (
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      style={{
        position: 'absolute',
        bottom: '15%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 5,
      }}
    >
      <Box sx={{ textAlign: 'center' }}>
        {/* キャラクター本体 */}
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF7A00 0%, #FF6B35 50%, #FF8F00 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 900,
            fontSize: '1.4rem',
            boxShadow: `
              0 4px 20px rgba(255,122,0,0.4),
              0 0 40px rgba(255,122,0,0.2),
              inset 0 -3px 6px rgba(0,0,0,0.2)
            `,
            border: '3px solid rgba(255,255,255,0.3)',
            position: 'relative',
          }}
        >
          {initial}
          {/* 光の輪 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: '2px dashed rgba(255,122,0,0.2)',
            }}
          />
        </Box>
        {/* 名前タグ */}
        <Box
          sx={{
            mt: 1,
            px: 1.5,
            py: 0.3,
            borderRadius: 10,
            bgcolor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: '#FFB74D', fontWeight: 600, fontSize: '0.65rem' }}
          >
            {username}
          </Typography>
        </Box>
        {/* 影 */}
        <Box
          sx={{
            width: 40,
            height: 8,
            borderRadius: '50%',
            bgcolor: 'rgba(0,0,0,0.3)',
            mx: 'auto',
            mt: 0.5,
            filter: 'blur(3px)',
          }}
        />
      </Box>
    </motion.div>
  );
};

// ─────────── メインコンポーネント ───────────
const LabRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuthStore();
  const { stats, progress, personality, loading, error, refetch } = useLabData();

  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(180deg, #1a1510 0%, #2d2520 50%, #1a1510 100%)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <Science sx={{ fontSize: 48, color: '#FF7A00' }} />
        </motion.div>
        <Typography sx={{ color: '#FFB74D', mt: 2, fontWeight: 600 }}>
          探Q LABを準備中...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: 'center', p: 4, color: '#FF5722' }}>
        <Typography>エラーが発生しました: {error}</Typography>
        <IconButton onClick={refetch} sx={{ color: '#FF7A00', mt: 2 }}>
          <Refresh />
        </IconButton>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        // 部屋の背景（あつ森風のレンガ壁 + 木の床）
        background: `
          linear-gradient(180deg,
            #2a2318 0%,
            #332b20 12%,
            #3a3125 25%,
            #3a3125 55%,
            #4a3d2e 56%,
            #5c4d3a 58%,
            #6b5a44 70%,
            #7a6850 100%
          )
        `,
      }}
    >
      {/* 壁のテクスチャパターン（レンガ風） */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '56%',
          opacity: 0.04,
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 24px,
              rgba(255,255,255,0.5) 24px,
              rgba(255,255,255,0.5) 25px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 48px,
              rgba(255,255,255,0.3) 48px,
              rgba(255,255,255,0.3) 49px
            )
          `,
          zIndex: 0,
        }}
      />

      {/* 床のテクスチャ（木目パターン） */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '44%',
          opacity: 0.06,
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 80px,
              rgba(255,255,255,0.3) 80px,
              rgba(255,255,255,0.3) 81px
            )
          `,
          zIndex: 0,
        }}
      />

      {/* 天井ライト効果 */}
      <Box
        sx={{
          position: 'absolute',
          top: -50,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 300,
          height: 200,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255,200,100,0.08) 0%, transparent 70%)',
          zIndex: 1,
        }}
      />

      {/* 浮遊パーティクル */}
      <FloatingParticles />

      {/* ヘッダー */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 10,
          px: { xs: 2, md: 3 },
          pt: { xs: 2, md: 2.5 },
          pb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <Typography sx={{ fontSize: '1.5rem' }}>🔬</Typography>
          </motion.div>
          <Box>
            <Typography
              variant="h5"
              sx={{
                color: '#FFB74D',
                fontWeight: 800,
                fontSize: { xs: '1.1rem', md: '1.3rem' },
                textShadow: '0 2px 8px rgba(255,122,0,0.3)',
                letterSpacing: 2,
              }}
            >
              探Q LAB
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem' }}
            >
              {user?.username}の研究室
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="データを更新">
            <IconButton onClick={refetch} size="small" sx={{ color: 'rgba(255,255,255,0.4)' }}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="AIチャットへ">
            <IconButton
              onClick={() => navigate('/chat')}
              size="small"
              sx={{
                color: '#FF7A00',
                bgcolor: 'rgba(255,122,0,0.1)',
                '&:hover': { bgcolor: 'rgba(255,122,0,0.2)' },
              }}
            >
              <ChatIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* メインルームエリア */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 3,
          px: { xs: 1.5, md: 3 },
          pb: 3,
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1.6fr 1fr',
          gridTemplateRows: isMobile ? 'auto auto auto' : 'auto auto',
          gridTemplateAreas: isMobile
            ? `
              "progress"
              "effort"
              "personality"
            `
            : `
              "personality progress effort"
            `,
          gap: { xs: 2, md: 2.5 },
          minHeight: isMobile ? 'auto' : 'calc(100vh - 80px)',
          alignItems: 'start',
        }}
      >
        {/* 左壁: パーソナリティパネル */}
        {personality && (
          <WallFrame
            title="学習タイプ"
            icon="🧬"
            gridArea="personality"
            onClick={() => setExpandedPanel('personality')}
            glowColor="rgba(171,71,188,0.15)"
          >
            <PersonalityPanel personality={personality} />
          </WallFrame>
        )}

        {/* 正面壁: プロジェクト進捗マップ（大ディスプレイ） */}
        <WallFrame
          title="プロジェクト進捗マップ"
          icon="🖥️"
          gridArea="progress"
          glowColor="rgba(76,175,80,0.15)"
        >
          <ProgressMapDisplay projects={progress} />
        </WallFrame>

        {/* 右壁: 努力の軌跡 */}
        {stats && (
          <WallFrame
            title="努力の軌跡"
            icon="📊"
            gridArea="effort"
            onClick={() => setExpandedPanel('effort')}
            glowColor="rgba(66,165,245,0.15)"
          >
            <EffortTimelinePanel stats={stats} />
          </WallFrame>
        )}
      </Box>

      {/* 部屋の装飾アイテム */}
      {!isMobile && (
        <>
          <RoomDecoration emoji="🌿" label="観葉植物" x="5%" y="35%" size={24} delay={0.3} />
          <RoomDecoration emoji="📚" label="参考文献の山" x="10%" y="82%" size={26} delay={0.5} />
          <RoomDecoration emoji="☕" label="コーヒー" x="88%" y="78%" size={22} delay={0.7} />
          <RoomDecoration emoji="🗺️" label="探究マップ" x="92%" y="30%" size={22} delay={0.4} />
          <RoomDecoration emoji="💡" label="ひらめきランプ" x="48%" y="5%" size={20} delay={0.6} />
          <RoomDecoration emoji="🧪" label="実験器具" x="78%" y="85%" size={22} delay={0.8} />
          <RoomDecoration emoji="📎" label="メモクリップ" x="18%" y="70%" size={18} delay={0.9} />
          <RoomDecoration emoji="🎯" label="目標ボード" x="3%" y="55%" size={20} delay={1.0} />
        </>
      )}

      {/* アバター */}
      {!isMobile && user && <LabAvatar username={user.username} />}

      {/* 拡大ダイアログ */}
      <Dialog
        open={expandedPanel !== null}
        onClose={() => setExpandedPanel(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(30,28,25,0.98)',
            border: '2px solid rgba(255,122,0,0.2)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#FFB74D',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {expandedPanel === 'personality' ? '🧬 学習タイプ詳細' : '📊 努力の軌跡 詳細'}
          </Typography>
          <IconButton onClick={() => setExpandedPanel(null)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {expandedPanel === 'personality' && personality && (
            <PersonalityPanel personality={personality} />
          )}
          {expandedPanel === 'effort' && stats && (
            <EffortTimelinePanel stats={stats} />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LabRoomPage;
