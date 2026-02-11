import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Fade,
  Popper,
  useTheme,
  alpha,
  IconButton,
  Divider,
  Chip,
  Button,
} from '@mui/material';
import {
  Info as InfoIcon,
  Close as CloseIcon,
  KeyboardArrowUp as ArrowUpIcon,
  KeyboardArrowDown as ArrowDownIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import type { QuestNode, NodeType, NodeStatus } from '../../types/questMap';

interface TooltipContent {
  title: string;
  description: string;
  shortcuts?: string[];
  tips?: string[];
  type?: 'info' | 'warning' | 'success' | 'error';
}

interface QuestMapTooltipProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  node?: QuestNode;
  content?: TooltipContent;
  onClose: () => void;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  interactive?: boolean;
  showArrow?: boolean;
}

// ノードタイプ別の説明
const NODE_TYPE_DESCRIPTIONS = {
  [NodeType.CURRENT]: {
    title: '現在のクエスト',
    description: 'あなたが現在取り組んでいるクエストです。',
    icon: '📍',
    color: '#2E7D32',
  },
  [NodeType.CHOICE]: {
    title: '選択肢',
    description: '複数の選択肢から選べる分岐点です。',
    icon: '🤔',
    color: '#1976D2',
  },
  [NodeType.FUTURE]: {
    title: '将来のクエスト',
    description: '今後取り組む可能性のあるクエストです。',
    icon: '🔮',
    color: '#F57C00',
  },
  [NodeType.GOAL]: {
    title: 'ゴール',
    description: '最終的に到達したい目標です。',
    icon: '🎯',
    color: '#C62828',
  },
};

// ステータス別の説明
const STATUS_DESCRIPTIONS = {
  [NodeStatus.NOT_STARTED]: {
    title: '未開始',
    description: 'まだ開始していないクエストです。',
    color: '#757575',
  },
  [NodeStatus.IN_PROGRESS]: {
    title: '進行中',
    description: '現在進行中のクエストです。',
    color: '#FF9800',
  },
  [NodeStatus.COMPLETED]: {
    title: '完了',
    description: '完了したクエストです。',
    color: '#4CAF50',
  },
};

// 基本的なヘルプコンテンツ
const HELP_CONTENTS = {
  canvas: {
    title: 'クエストマップ',
    description: 'あなたの学習や目標達成の道筋を視覚化します。ノードとエッジで構成されており、ドラッグして位置を調整できます。',
    shortcuts: ['マウスドラッグ: ノード移動', 'マウスホイール: ズーム', 'クリック: ノード選択'],
    tips: ['右クリックでコンテキストメニューを表示', 'ズームアウトして全体像を把握しましょう'],
  },
  navigation: {
    title: 'ナビゲーション',
    description: 'マップ上での移動や操作方法について説明します。',
    shortcuts: ['Arrow Keys: ノード間移動', 'Enter: ノード選択', 'Escape: 選択解除'],
  },
  nodeTypes: {
    title: 'ノードの種類',
    description: '4つの異なるノードタイプがあり、それぞれ異なる目的を持ちます。',
  },
};

const QuestMapTooltip: React.FC<QuestMapTooltipProps> = ({
  open,
  anchorEl,
  node,
  content,
  onClose,
  placement = 'top',
  interactive = true,
  showArrow = true,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // ESCキーでツールチップを閉じる
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onClose]);

  // ツールチップの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current && 
        !tooltipRef.current.contains(event.target as Node) &&
        anchorEl &&
        !anchorEl.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    if (open && interactive) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, interactive, anchorEl, onClose]);

  // ノード情報からコンテンツを生成
  const getNodeContent = (): TooltipContent | null => {
    if (!node) return null;

    const typeInfo = NODE_TYPE_DESCRIPTIONS[node.type];
    const statusInfo = STATUS_DESCRIPTIONS[node.status];

    return {
      title: node.title,
      description: node.description || typeInfo.description,
      shortcuts: [],
      tips: [
        `ノードタイプ: ${typeInfo.title}`,
        `ステータス: ${statusInfo.title}`,
        ...(node.isRecommended ? ['🌟 AI推奨のクエストです'] : []),
        ...(node.difficulty ? [`難易度: ${'★'.repeat(node.difficulty)}${'☆'.repeat(5 - node.difficulty)}`] : []),
      ],
      type: node.status === NodeStatus.COMPLETED ? 'success' : 
            node.status === NodeStatus.IN_PROGRESS ? 'warning' : 'info',
    };
  };

  const tooltipContent = node ? getNodeContent() : content;

  if (!tooltipContent) return null;

  const getTypeColor = () => {
    switch (tooltipContent.type) {
      case 'success': return theme.palette.success.main;
      case 'warning': return theme.palette.warning.main;
      case 'error': return theme.palette.error.main;
      default: return theme.palette.info.main;
    }
  };

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement={placement}
      disablePortal={false}
      modifiers={[
        {
          name: 'flip',
          enabled: true,
          options: {
            altBoundary: true,
            rootBoundary: 'document',
            padding: 8,
          },
        },
        {
          name: 'preventOverflow',
          enabled: true,
          options: {
            altAxis: true,
            altBoundary: true,
            tether: true,
            rootBoundary: 'document',
            padding: 8,
          },
        },
      ]}
      style={{ zIndex: theme.zIndex.tooltip }}
    >
      <Fade in={open} timeout={200}>
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <Paper
            elevation={8}
            sx={{
              maxWidth: 360,
              minWidth: 280,
              backgroundColor: alpha(theme.palette.background.paper, 0.98),
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha(getTypeColor(), 0.2)}`,
              borderRadius: 2,
              overflow: 'hidden',
            }}
          >
            {/* アロー表示 */}
            {showArrow && (
              <Box
                sx={{
                  position: 'absolute',
                  top: placement === 'bottom' ? -8 : undefined,
                  bottom: placement === 'top' ? -8 : undefined,
                  left: placement === 'right' ? -8 : undefined,
                  right: placement === 'left' ? -8 : undefined,
                  width: 16,
                  height: 16,
                  transform: 'rotate(45deg)',
                  backgroundColor: theme.palette.background.paper,
                  border: `1px solid ${alpha(getTypeColor(), 0.2)}`,
                  zIndex: -1,
                }}
              />
            )}

            {/* ヘッダー */}
            <Box
              sx={{
                p: 2,
                pb: 1,
                backgroundColor: alpha(getTypeColor(), 0.1),
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Box sx={{ flex: 1, mr: 1 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: theme.palette.text.primary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <InfoIcon sx={{ fontSize: '1.2rem', color: getTypeColor() }} />
                    {tooltipContent.title}
                  </Typography>
                  {node && (
                    <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={NODE_TYPE_DESCRIPTIONS[node.type].icon + ' ' + NODE_TYPE_DESCRIPTIONS[node.type].title}
                        size="small"
                        sx={{
                          fontSize: '0.75rem',
                          backgroundColor: alpha(NODE_TYPE_DESCRIPTIONS[node.type].color, 0.1),
                          color: NODE_TYPE_DESCRIPTIONS[node.type].color,
                        }}
                      />
                      <Chip
                        label={STATUS_DESCRIPTIONS[node.status].title}
                        size="small"
                        sx={{
                          fontSize: '0.75rem',
                          backgroundColor: alpha(STATUS_DESCRIPTIONS[node.status].color, 0.1),
                          color: STATUS_DESCRIPTIONS[node.status].color,
                        }}
                      />
                    </Box>
                  )}
                </Box>
                {interactive && (
                  <IconButton
                    onClick={onClose}
                    size="small"
                    sx={{
                      color: theme.palette.text.secondary,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.action.hover, 0.1),
                      },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                )}
              </Box>
            </Box>

            {/* コンテンツ */}
            <Box sx={{ p: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  lineHeight: 1.5,
                  mb: tooltipContent.tips || tooltipContent.shortcuts ? 1.5 : 0,
                }}
              >
                {tooltipContent.description}
              </Typography>

              {/* ヒント */}
              {tooltipContent.tips && tooltipContent.tips.length > 0 && (
                <Box sx={{ mb: tooltipContent.shortcuts ? 1.5 : 0 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                    💡 ヒント
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    {tooltipContent.tips.map((tip, index) => (
                      <Typography
                        key={index}
                        variant="caption"
                        sx={{
                          display: 'block',
                          color: theme.palette.text.secondary,
                          pl: 1,
                          '&:before': {
                            content: '"•"',
                            color: getTypeColor(),
                            fontWeight: 'bold',
                            width: '1em',
                            ml: -1,
                            mr: 0.5,
                            display: 'inline-block',
                          },
                        }}
                      >
                        {tip}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              {/* ショートカット */}
              {tooltipContent.shortcuts && tooltipContent.shortcuts.length > 0 && (
                <Box>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                      ⌨️ ショートカット
                    </Typography>
                    {tooltipContent.shortcuts.length > 3 && (
                      <IconButton
                        size="small"
                        onClick={() => setExpanded(!expanded)}
                        sx={{ p: 0.25 }}
                      >
                        {expanded ? <ArrowUpIcon fontSize="small" /> : <ArrowDownIcon fontSize="small" />}
                      </IconButton>
                    )}
                  </Box>
                  
                  <AnimatePresence>
                    <motion.div
                      initial={false}
                      animate={{ 
                        height: expanded || tooltipContent.shortcuts.length <= 3 ? 'auto' : 0,
                        opacity: expanded || tooltipContent.shortcuts.length <= 3 ? 1 : 0,
                      }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      style={{ overflow: 'hidden' }}
                    >
                      <Box sx={{ mt: 0.5 }}>
                        {tooltipContent.shortcuts
                          .slice(0, expanded ? undefined : 3)
                          .map((shortcut, index) => (
                          <Typography
                            key={index}
                            variant="caption"
                            sx={{
                              display: 'block',
                              color: theme.palette.text.secondary,
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              backgroundColor: alpha(theme.palette.action.hover, 0.1),
                              px: 0.5,
                              py: 0.25,
                              mb: 0.5,
                              borderRadius: 0.5,
                            }}
                          >
                            {shortcut}
                          </Typography>
                        ))}
                      </Box>
                    </motion.div>
                  </AnimatePresence>
                </Box>
              )}
            </Box>

            {/* フッター（ノードの場合のみ） */}
            {node && (
              <Box sx={{ p: 1, backgroundColor: alpha(theme.palette.action.hover, 0.05) }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.disabled,
                    textAlign: 'center',
                    display: 'block',
                  }}
                >
                  右クリックでメニューを表示
                </Typography>
              </Box>
            )}
          </Paper>
        </motion.div>
      </Fade>
    </Popper>
  );
};

export default QuestMapTooltip;