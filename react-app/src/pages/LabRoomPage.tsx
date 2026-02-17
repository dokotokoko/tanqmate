// pages/LabRoomPage.tsx - 探Q LAB アイソメトリック3Dルーム
// あつまれ動物の森の俯瞰カメラ視点を忠実に再現

import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useLabData } from '../components/Lab/useLabData';
import ProgressMapDisplay from '../components/Lab/ProgressMapDisplay';
import EffortTimelinePanel from '../components/Lab/EffortTimelinePanel';
import PersonalityPanel from '../components/Lab/PersonalityPanel';

// ═══════════════════════════════════════════════════════
// 定数 - 部屋ジオメトリ (SVG viewBox: 0 0 1000 700)
// ═══════════════════════════════════════════════════════
const VB = { w: 1000, h: 700 };

// 各面のポリゴン座標
const BACK_WALL  = '150,20 850,20 850,300 150,300';
const LEFT_WALL  = '0,90 150,20 150,300 0,390';
const RIGHT_WALL = '850,20 1000,90 1000,390 850,300';
const FLOOR_PTS  = '0,390 150,300 850,300 1000,390 1000,700 0,700';
const CEILING    = '0,0 1000,0 1000,90 850,20 150,20 0,90';

// 壁と床の接合ライン
const BASEBOARD = '0,390 150,300 850,300 1000,390';

// 床ポリゴン（当たり判定用）
const FLOOR_POLY: [number, number][] = [
  [0, 390], [150, 300], [850, 300], [1000, 390], [1000, 700], [0, 700],
];

// カーペット（床中央、パース付き台形）
const RUG = '280,420 720,420 760,600 240,600';

// カラーパレット（あつ森風ナチュラル暖色系）
const C = {
  backWall: '#DDD2C0',
  backWallBrick: '#D4C9B8',
  leftWall: '#CCC1AF',
  rightWall: '#D0C5B3',
  floor: '#C4A878',
  floorDark: '#B89B6A',
  ceiling: '#A09080',
  baseboard: '#8B7755',
  rug1: '#B8A870',
  rug2: '#9BA060',
  rugBorder: '#887850',
  wood: '#B08850',
  woodDark: '#8B6B38',
  green: '#5A8040',
  greenLight: '#7AAA55',
};

// ═══════════════════════════════════════════════════════
// ヘルパー関数
// ═══════════════════════════════════════════════════════

/** 点がポリゴン内にあるか判定（Ray Casting） */
function ptInPoly(x: number, y: number, poly: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** 床上のY座標に応じたパース縮尺 (奥=小, 手前=大) */
function pScale(y: number): number {
  const t = Math.max(0, Math.min(1, (y - 300) / 400));
  return 0.45 + t * 0.55;
}

/** SVGクリック座標をviewBox座標に変換 */
function clientToSvg(
  e: React.MouseEvent,
  svgEl: SVGSVGElement | null,
): { x: number; y: number } | null {
  if (!svgEl) return null;
  const rect = svgEl.getBoundingClientRect();
  const scaleX = VB.w / rect.width;
  const scaleY = VB.h / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

// ═══════════════════════════════════════════════════════
// メインコンポーネント
// ═══════════════════════════════════════════════════════
const LabRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stats, progress, personality, loading, error, refetch } = useLabData();

  const svgRef = useRef<SVGSVGElement>(null);

  // アバター位置（SVG座標）
  const [avatarPos, setAvatarPos] = useState({ x: 500, y: 500 });
  const [isWalking, setIsWalking] = useState(false);
  const walkTimer = useRef<number | null>(null);

  // モーダル状態
  const [openModal, setOpenModal] = useState<string | null>(null);

  // 操作ガイド表示
  const [showGuide, setShowGuide] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowGuide(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // ──── 床クリックでアバター移動 ────
  const handleFloorClick = useCallback(
    (e: React.MouseEvent) => {
      const pt = clientToSvg(e, svgRef.current);
      if (!pt) return;
      if (!ptInPoly(pt.x, pt.y, FLOOR_POLY)) return;
      setShowGuide(false);
      setAvatarPos({ x: pt.x, y: pt.y });
      setIsWalking(true);
      if (walkTimer.current) clearTimeout(walkTimer.current);
      walkTimer.current = window.setTimeout(() => setIsWalking(false), 800);
    },
    [],
  );

  // ──── 矢印キーで移動 ────
  useEffect(() => {
    const speed = 15;
    const handleKey = (e: KeyboardEvent) => {
      if (openModal) return;
      let { x, y } = avatarPos;
      switch (e.key) {
        case 'ArrowLeft':  x -= speed; break;
        case 'ArrowRight': x += speed; break;
        case 'ArrowUp':    y -= speed; break;
        case 'ArrowDown':  y += speed; break;
        default: return;
      }
      e.preventDefault();
      if (ptInPoly(x, y, FLOOR_POLY)) {
        setAvatarPos({ x, y });
        setIsWalking(true);
        if (walkTimer.current) clearTimeout(walkTimer.current);
        walkTimer.current = window.setTimeout(() => setIsWalking(false), 300);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [avatarPos, openModal]);

  // ──── サマリーテキスト生成 ────
  const progressPct = progress.length > 0 ? progress[0].completion_rate : 0;
  const progressTitle = progress.length > 0
    ? (progress[0].title.length > 8 ? progress[0].title.slice(0, 8) + '…' : progress[0].title)
    : '';
  const typeCode = personality?.type_code || '----';
  const streakDays = stats?.streak_days ?? 0;
  const totalChats = stats?.total_chats ?? 0;

  // ──── ローディング/エラー ────
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          bgcolor: '#E8DCC8',
        }}
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{ fontSize: 48 }}
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
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        bgcolor: '#6B8B5C',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* ──── ヘッダーHUD ──── */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 0.8,
          bgcolor: 'rgba(0,0,0,0.25)',
          backdropFilter: 'blur(8px)',
          zIndex: 20,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '1.2rem' }}>🔬</Typography>
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem', letterSpacing: 1 }}>
            探Q LAB
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', ml: 1 }}>
            {user?.username}の研究室
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="更新">
            <IconButton size="small" onClick={refetch} sx={{ color: 'rgba(255,255,255,0.6)' }}>
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

      {/* ──── SVGルーム本体 ──── */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB.w} ${VB.h}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
          onClick={handleFloorClick}
        >
          <defs>
            {/* レンガパターン */}
            <pattern id="brickPat" width="60" height="30" patternUnits="userSpaceOnUse">
              <rect width="60" height="30" fill={C.backWall} />
              <rect x="1" y="1" width="28" height="13" rx="1" fill={C.backWallBrick} />
              <rect x="31" y="1" width="28" height="13" rx="1" fill={C.backWallBrick} />
              <rect x="16" y="16" width="28" height="13" rx="1" fill={C.backWallBrick} />
            </pattern>

            {/* 左壁用レンガ（暗め） */}
            <pattern id="brickLeft" width="50" height="30" patternUnits="userSpaceOnUse">
              <rect width="50" height="30" fill={C.leftWall} />
              <rect x="1" y="1" width="23" height="13" rx="1" fill="#C0B5A3" />
              <rect x="26" y="1" width="23" height="13" rx="1" fill="#C0B5A3" />
              <rect x="13" y="16" width="23" height="13" rx="1" fill="#C0B5A3" />
            </pattern>

            {/* 床クリッピング */}
            <clipPath id="floorClip">
              <polygon points={FLOOR_PTS} />
            </clipPath>

            {/* カーペットパターン */}
            <pattern id="rugPat" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill={C.rug1} />
              <rect x="0" y="0" width="20" height="20" fill={C.rug2} opacity="0.3" />
              <rect x="20" y="20" width="20" height="20" fill={C.rug2} opacity="0.3" />
              <circle cx="20" cy="20" r="6" fill={C.rugBorder} opacity="0.2" />
            </pattern>

            {/* グロー効果 */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="shadow">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* ═══ 天井（暗い） ═══ */}
          <polygon points={CEILING} fill="#7A6E60" />

          {/* ═══ 背面壁（レンガ） ═══ */}
          <polygon points={BACK_WALL} fill="url(#brickPat)" />
          {/* 壁の上部影 */}
          <line x1="150" y1="20" x2="850" y2="20" stroke="rgba(0,0,0,0.15)" strokeWidth="3" />

          {/* ═══ 左壁 ═══ */}
          <polygon points={LEFT_WALL} fill="url(#brickLeft)" />
          {/* 左壁の角の影 */}
          <line x1="150" y1="20" x2="150" y2="300" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />

          {/* ═══ 右壁 ═══ */}
          <polygon points={RIGHT_WALL} fill="url(#brickLeft)" />
          <line x1="850" y1="20" x2="850" y2="300" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />

          {/* ═══ 床（木目） ═══ */}
          <polygon points={FLOOR_PTS} fill={C.floor} />
          {/* 床の木目ライン（パース） */}
          <g clipPath="url(#floorClip)" opacity="0.15">
            {Array.from({ length: 12 }).map((_, i) => {
              const y = 310 + i * 35;
              return (
                <line
                  key={i}
                  x1="0"
                  y1={y + i * 2}
                  x2="1000"
                  y2={y + i * 2}
                  stroke="#8B7755"
                  strokeWidth={0.8 + i * 0.1}
                />
              );
            })}
            {/* 縦のプランクライン */}
            {[150, 300, 450, 550, 700, 850].map((x, i) => (
              <line key={`v${i}`} x1={x} y1="300" x2={x} y2="700" stroke="#8B7755" strokeWidth="0.5" />
            ))}
          </g>

          {/* ═══ 巾木（壁と床の接合部） ═══ */}
          <polyline
            points={BASEBOARD}
            fill="none"
            stroke={C.baseboard}
            strokeWidth="4"
          />

          {/* ═══ カーペット ═══ */}
          <polygon
            points={RUG}
            fill="url(#rugPat)"
            stroke={C.rugBorder}
            strokeWidth="3"
          />
          {/* カーペット内側ボーダー */}
          <polygon
            points="310,440 690,440 720,580 280,580"
            fill="none"
            stroke={C.rug2}
            strokeWidth="2"
            opacity="0.4"
          />

          {/* ═══════════════════════════════════ */}
          {/* 壁面インタラクティブアイテム        */}
          {/* ═══════════════════════════════════ */}

          {/* ── 背面壁: 大型モニター（進捗マップ） ── */}
          <g
            onClick={(e) => { e.stopPropagation(); setOpenModal('progress'); }}
            style={{ cursor: 'pointer' }}
          >
            {/* モニター枠 */}
            <rect x="350" y="60" width="300" height="200" rx="6" fill="#222" stroke="#555" strokeWidth="3" />
            {/* 画面 */}
            <rect x="358" y="68" width="284" height="168" rx="3" fill="#1a2a1a" />
            {/* スタンド */}
            <rect x="475" y="260" width="50" height="20" rx="2" fill="#444" />
            <rect x="450" y="275" width="100" height="6" rx="3" fill="#555" />
            {/* 画面内コンテンツ（サマリー） */}
            <text x="500" y="110" textAnchor="middle" fill="#66BB6A" fontSize="14" fontWeight="700" fontFamily="sans-serif">
              プロジェクト進捗
            </text>
            {progressTitle && (
              <text x="500" y="135" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11" fontFamily="sans-serif">
                {progressTitle}
              </text>
            )}
            {/* プログレスバー */}
            <rect x="400" y="152" width="200" height="12" rx="6" fill="rgba(255,255,255,0.1)" />
            <rect x="400" y="152" width={Math.max(4, progressPct * 2)} height="12" rx="6" fill="#4CAF50" />
            <text x="500" y="162" textAnchor="middle" fill="#fff" fontSize="9" fontFamily="sans-serif" dominantBaseline="middle">
              {progressPct}%
            </text>
            {/* ステップドット */}
            {progress.length > 0 && progress[0].steps.map((step, i) => (
              <circle
                key={step.id}
                cx={410 + i * 24}
                cy="190"
                r="6"
                fill={step.status === 'completed' ? '#4CAF50' : step.status === 'in_progress' ? '#FF9800' : '#555'}
              />
            ))}
            <text x="500" y="215" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="sans-serif">
              クリックで詳細
            </text>
            {/* ホバーグロー */}
            <rect
              x="348" y="58" width="304" height="204" rx="8" fill="transparent"
              stroke="rgba(76,175,80,0.3)" strokeWidth="2" opacity="0"
            >
              <animate attributeName="opacity" values="0;0.6;0" dur="2s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* ── 背面壁: コルクボード（パーソナリティ） ── */}
          <g
            onClick={(e) => { e.stopPropagation(); setOpenModal('personality'); }}
            style={{ cursor: 'pointer' }}
          >
            {/* ボード */}
            <rect x="690" y="80" width="120" height="100" rx="3" fill="#C4A060" stroke="#A08040" strokeWidth="2" />
            {/* ピン */}
            <circle cx="710" cy="90" r="3" fill="#E53935" />
            <circle cx="790" cy="90" r="3" fill="#43A047" />
            <circle cx="750" cy="170" r="3" fill="#1E88E5" />
            {/* タイプコード（メモ紙風） */}
            <rect x="710" y="100" width="80" height="55" rx="1" fill="#FFFDE7" transform="rotate(-3 750 127)" />
            <text x="750" y="122" textAnchor="middle" fill="#E65100" fontSize="18" fontWeight="900" fontFamily="monospace">
              {typeCode}
            </text>
            <text x="750" y="140" textAnchor="middle" fill="#8B6B38" fontSize="8" fontFamily="sans-serif">
              {personality?.type_name || '分析中'}
            </text>
            <text x="750" y="192" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="sans-serif">
              クリックで詳細
            </text>
            {/* ホバーグロー */}
            <rect
              x="688" y="78" width="124" height="104" rx="5" fill="transparent"
              stroke="rgba(255,122,0,0.3)" strokeWidth="2" opacity="0"
            >
              <animate attributeName="opacity" values="0;0.5;0" dur="2.5s" repeatCount="indefinite" />
            </rect>
          </g>

          {/* ── 背面壁: 時計 ── */}
          <g>
            <circle cx="260" cy="100" r="30" fill="#FFFDE7" stroke={C.wood} strokeWidth="3" />
            <circle cx="260" cy="100" r="2" fill="#333" />
            {/* 短針 */}
            <line x1="260" y1="100" x2="260" y2="80" stroke="#333" strokeWidth="2.5" strokeLinecap="round" />
            {/* 長針 */}
            <line x1="260" y1="100" x2="275" y2="95" stroke="#333" strokeWidth="1.5" strokeLinecap="round" />
            {/* 目盛り */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 - 90) * (Math.PI / 180);
              return (
                <line
                  key={i}
                  x1={260 + 24 * Math.cos(angle)}
                  y1={100 + 24 * Math.sin(angle)}
                  x2={260 + 27 * Math.cos(angle)}
                  y2={100 + 27 * Math.sin(angle)}
                  stroke="#888"
                  strokeWidth="1"
                />
              );
            })}
          </g>

          {/* ── 背面壁: 壁掛け工具ラック ── */}
          <g>
            <rect x="170" y="140" width="70" height="8" rx="2" fill={C.wood} />
            {/* ペン/道具 */}
            <rect x="178" y="120" width="4" height="20" rx="1" fill="#E53935" />
            <rect x="190" y="125" width="4" height="15" rx="1" fill="#43A047" />
            <rect x="202" y="118" width="4" height="22" rx="1" fill="#1E88E5" />
            <rect x="214" y="122" width="4" height="18" rx="1" fill="#FF9800" />
          </g>

          {/* ── 左壁: 統計フレーム（努力の軌跡） ── */}
          <g
            onClick={(e) => { e.stopPropagation(); setOpenModal('effort'); }}
            style={{ cursor: 'pointer' }}
          >
            {/* 額縁 */}
            <polygon
              points="20,160 130,125 130,260 20,300"
              fill="#FFFDE7"
              stroke={C.wood}
              strokeWidth="3"
            />
            {/* 内側 */}
            <polygon
              points="30,170 122,137 122,248 30,286"
              fill="#2a3530"
            />
            {/* サマリーテキスト */}
            <text x="76" y="175" textAnchor="middle" fill="#FF7A00" fontSize="11" fontWeight="700" fontFamily="sans-serif">
              📊 努力の軌跡
            </text>
            <text x="76" y="200" textAnchor="middle" fill="#FFB74D" fontSize="16" fontWeight="900" fontFamily="sans-serif">
              {totalChats}回
            </text>
            <text x="76" y="218" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="9" fontFamily="sans-serif">
              質問
            </text>
            <text x="76" y="245" textAnchor="middle" fill="#FF5722" fontSize="14" fontWeight="700" fontFamily="sans-serif">
              🔥 {streakDays}日
            </text>
            <text x="76" y="265" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="7" fontFamily="sans-serif">
              連続活動
            </text>
            {/* ホバーグロー */}
            <polygon
              points="18,158 132,123 132,262 18,302"
              fill="transparent"
              stroke="rgba(66,165,245,0.3)" strokeWidth="2" opacity="0"
            >
              <animate attributeName="opacity" values="0;0.5;0" dur="2.2s" repeatCount="indefinite" />
            </polygon>
          </g>

          {/* ── 左壁: 吊り下げ植物 ── */}
          <g>
            <line x1="70" y1="90" x2="70" y2="130" stroke="#8B7755" strokeWidth="1.5" />
            <ellipse cx="70" cy="138" rx="18" ry="12" fill={C.green} />
            <ellipse cx="65" cy="132" rx="8" ry="5" fill={C.greenLight} />
            <ellipse cx="78" cy="135" rx="6" ry="4" fill={C.greenLight} />
          </g>

          {/* ── 右壁: 窓 ── */}
          <g>
            <polygon
              points="870,80 980,110 980,230 870,200"
              fill="#B8D4E8"
              stroke="#A08060"
              strokeWidth="3"
            />
            {/* 窓枠 */}
            <line x1="925" y1="95" x2="925" y2="215" stroke="#A08060" strokeWidth="2" />
            <line x1="870" y1="143" x2="980" y2="173" stroke="#A08060" strokeWidth="2" />
            {/* カーテン左 */}
            <polygon points="872,82 900,82 895,200 872,200" fill="#E8F5E9" opacity="0.7" />
          </g>

          {/* ═══════════════════════════════════ */}
          {/* 床上の家具アイテム                   */}
          {/* ═══════════════════════════════════ */}

          {/* ── デスク（右奥） ── */}
          <g filter="url(#shadow)">
            {/* デスク天板 */}
            <polygon points="600,380 800,380 820,430 580,430" fill={C.wood} />
            <polygon points="600,380 800,380 820,430 580,430" fill="rgba(0,0,0,0.05)" />
            {/* 天板の上面ハイライト */}
            <polygon points="605,382 795,382 812,425 585,425" fill="rgba(255,255,255,0.08)" />
            {/* 脚 */}
            <line x1="600" y1="430" x2="595" y2="460" stroke={C.woodDark} strokeWidth="4" />
            <line x1="810" y1="430" x2="815" y2="460" stroke={C.woodDark} strokeWidth="4" />
            {/* デスク上のアイテム */}
            <rect x="650" y="390" width="30" height="20" rx="2" fill="#333" /> {/* ノートPC */}
            <rect x="652" y="392" width="26" height="14" rx="1" fill="#1a3a2a" /> {/* 画面 */}
            <rect x="700" y="395" width="15" height="20" rx="1" fill="#E8E0D0" /> {/* メモ帳 */}
            <circle cx="740" cy="405" r="8" fill="#8B4513" opacity="0.7" /> {/* コーヒー */}
            <circle cx="740" cy="405" r="5" fill="#3E2723" />
          </g>

          {/* ── 椅子（デスク手前） ── */}
          <g filter="url(#shadow)">
            {/* 座面 */}
            <ellipse cx="700" cy="480" rx="25" ry="12" fill={C.green} />
            {/* 背もたれ */}
            <rect x="685" y="455" width="30" height="25" rx="3" fill={C.green} />
            <rect x="688" y="458" width="24" height="18" rx="2" fill={C.greenLight} opacity="0.3" />
          </g>

          {/* ── 本棚（左手前） ── */}
          <g filter="url(#shadow)">
            {/* 棚本体 */}
            <rect x="140" y="410" width="80" height="80" rx="3" fill={C.wood} />
            <rect x="142" y="412" width="76" height="76" rx="2" fill={C.woodDark} />
            {/* 棚板 */}
            <line x1="145" y1="440" x2="215" y2="440" stroke={C.wood} strokeWidth="3" />
            <line x1="145" y1="465" x2="215" y2="465" stroke={C.wood} strokeWidth="3" />
            {/* 本 */}
            <rect x="150" y="415" width="8" height="22" rx="1" fill="#E53935" />
            <rect x="160" y="418" width="7" height="19" rx="1" fill="#1E88E5" />
            <rect x="169" y="416" width="9" height="21" rx="1" fill="#43A047" />
            <rect x="180" y="419" width="6" height="18" rx="1" fill="#FF9800" />
            <rect x="190" y="415" width="8" height="22" rx="1" fill="#7B1FA2" />
            <rect x="150" y="443" width="10" height="19" rx="1" fill="#00897B" />
            <rect x="162" y="445" width="8" height="17" rx="1" fill="#F4511E" />
            <rect x="172" y="442" width="7" height="20" rx="1" fill="#3949AB" />
            {/* 下段: 植木鉢 */}
            <rect x="155" y="472" width="15" height="15" rx="2" fill="#A08060" />
            <ellipse cx="163" cy="470" rx="12" ry="8" fill={C.green} />
          </g>

          {/* ── 小テーブル + 植物（左中央） ── */}
          <g filter="url(#shadow)">
            <ellipse cx="300" cy="520" rx="28" ry="14" fill={C.wood} />
            <line x1="300" y1="534" x2="300" y2="556" stroke={C.woodDark} strokeWidth="5" />
            {/* 植木鉢 */}
            <rect x="288" y="505" width="24" height="18" rx="4" fill="#8D6E63" />
            <ellipse cx="300" cy="502" rx="14" ry="10" fill={C.green} />
            <ellipse cx="295" cy="498" rx="6" ry="4" fill={C.greenLight} />
          </g>

          {/* ── 丸太スツール ── */}
          <g filter="url(#shadow)">
            <ellipse cx="420" cy="560" rx="20" ry="10" fill="#C4A060" />
            <rect x="404" y="560" width="32" height="15" rx="2" fill="#B08850" />
            <ellipse cx="420" cy="575" rx="16" ry="5" fill={C.woodDark} />
          </g>

          {/* ═══════════════════════════════════ */}
          {/* アバター                            */}
          {/* ═══════════════════════════════════ */}
          <g
            style={{
              transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
            transform={`translate(${avatarPos.x}, ${avatarPos.y})`}
          >
            {/* 影 */}
            <ellipse
              cx="0" cy="22"
              rx={14 * pScale(avatarPos.y)}
              ry={5 * pScale(avatarPos.y)}
              fill="rgba(0,0,0,0.25)"
            />
            {/* 本体スケール */}
            <g transform={`scale(${pScale(avatarPos.y)})`}>
              {/* 体 */}
              <rect x="-14" y="-10" width="28" height="30" rx="8" fill="#80D8FF" />
              {/* ストライプ */}
              <rect x="-14" y="-2" width="28" height="4" rx="2" fill="#4FC3F7" />
              <rect x="-14" y="6" width="28" height="4" rx="2" fill="#4FC3F7" />
              {/* 頭 */}
              <circle cx="0" cy="-24" r="18" fill="#FFCC80" />
              {/* 髪 */}
              <ellipse cx="0" cy="-35" rx="16" ry="10" fill="#5D4037" />
              <ellipse cx="-10" cy="-28" rx="6" ry="8" fill="#5D4037" />
              <ellipse cx="10" cy="-28" rx="6" ry="8" fill="#5D4037" />
              {/* お団子 */}
              <circle cx="2" cy="-44" r="7" fill="#5D4037" />
              {/* 目 */}
              <circle cx="-6" cy="-22" r="2.5" fill="#333" />
              <circle cx="6" cy="-22" r="2.5" fill="#333" />
              {/* ほっぺ */}
              <ellipse cx="-10" cy="-17" rx="4" ry="2.5" fill="#FFAB91" opacity="0.6" />
              <ellipse cx="10" cy="-17" rx="4" ry="2.5" fill="#FFAB91" opacity="0.6" />
              {/* 口 */}
              <path d="M-3,-15 Q0,-12 3,-15" stroke="#333" strokeWidth="1" fill="none" />
              {/* 名前タグ */}
              <rect x="-24" y="25" width="48" height="16" rx="8" fill="rgba(0,0,0,0.5)" />
              <text x="0" y="36" textAnchor="middle" fill="#FFB74D" fontSize="9" fontWeight="600" fontFamily="sans-serif">
                {user?.username || ''}
              </text>
              {/* 歩行アニメーション（足のバウンス） */}
              {isWalking && (
                <>
                  <rect x="-10" y="20" width="8" height="5" rx="2" fill="#90A4AE">
                    <animate attributeName="y" values="20;18;20" dur="0.3s" repeatCount="indefinite" />
                  </rect>
                  <rect x="2" y="20" width="8" height="5" rx="2" fill="#90A4AE">
                    <animate attributeName="y" values="18;20;18" dur="0.3s" repeatCount="indefinite" />
                  </rect>
                </>
              )}
            </g>
          </g>

          {/* ── 右壁手前の植木鉢 ── */}
          <g filter="url(#shadow)">
            <rect x="840" y="410" width="30" height="30" rx="6" fill="#8D6E63" />
            <ellipse cx="855" cy="405" rx="20" ry="15" fill={C.green} />
            <ellipse cx="848" cy="398" rx="8" ry="5" fill={C.greenLight} />
            <ellipse cx="862" cy="400" rx="6" ry="4" fill={C.greenLight} />
          </g>
        </svg>

        {/* ──── 操作ガイドオーバーレイ ──── */}
        <AnimatePresence>
          {showGuide && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: 'absolute',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 15,
              }}
            >
              <Box
                sx={{
                  px: 3,
                  py: 1.2,
                  borderRadius: 10,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  textAlign: 'center',
                }}
                onClick={() => setShowGuide(false)}
              >
                <Typography sx={{ color: '#fff', fontSize: '0.8rem', fontWeight: 500 }}>
                  🏠 床をクリックして歩き回ろう！壁のアイテムをクリックで詳細が見れるよ
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', mt: 0.3 }}>
                  矢印キー↑↓←→でも移動できます
                </Typography>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>

      {/* ═══════════════════════════════════ */}
      {/* 詳細モーダル                        */}
      {/* ═══════════════════════════════════ */}
      <Dialog
        open={openModal !== null}
        onClose={() => setOpenModal(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'rgba(30,28,25,0.98)',
            border: '2px solid rgba(255,122,0,0.2)',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            maxHeight: '85vh',
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
            py: 1.5,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem' }}>
            {openModal === 'progress' && '🖥️ プロジェクト進捗マップ'}
            {openModal === 'personality' && '🧬 学習タイプ詳細'}
            {openModal === 'effort' && '📊 努力の軌跡'}
          </Typography>
          <IconButton onClick={() => setOpenModal(null)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
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
