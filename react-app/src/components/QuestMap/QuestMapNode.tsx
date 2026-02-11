import React from 'react';
import { Box, Chip, Tooltip, Typography, useTheme, alpha } from '@mui/material';
import { 
  Place as PlaceIcon,
  EmojiObjects as ChoiceIcon,
  AutoAwesome as FutureIcon,
  EmojiEvents as GoalIcon,
  Star as RecommendedIcon
} from '@mui/icons-material';
import { NodeType, NodeStatus } from '../../types/questMap';
import type { QuestNode,  } from '../../types/questMap';

interface QuestMapNodeProps {
  node: QuestNode;
  isSelected?: boolean;
  onClick?: (node: QuestNode) => void;
  onDoubleClick?: (node: QuestNode) => void;
  onContextMenu?: (event: React.MouseEvent, node: QuestNode) => void;
}

// ノードタイプに応じたアイコンとスタイル設定
export const NODE_CONFIG = {
  [NodeType.CURRENT]: {
    icon: PlaceIcon,
    color: '#2E7D32', // 緑
    emoji: '📍',
    label: '現在地',
    size: 'large' as const,
  },
  [NodeType.CHOICE]: {
    icon: ChoiceIcon,
    color: '#1976D2', // 青
    emoji: '🤔',
    label: '選択肢',
    size: 'medium' as const,
  },
  [NodeType.FUTURE]: {
    icon: FutureIcon,
    color: '#F57C00', // オレンジ
    emoji: '🔮',
    label: '未来',
    size: 'medium' as const,
  },
  [NodeType.GOAL]: {
    icon: GoalIcon,
    color: '#C62828', // 赤
    emoji: '🎯',
    label: 'ゴール',
    size: 'large' as const,
  },
};

export const STATUS_CONFIG = {
  [NodeStatus.NOT_STARTED]: {
    label: '未着手',
    color: '#757575',
    opacity: 1,
  },
  [NodeStatus.IN_PROGRESS]: {
    label: '進行中',
    color: '#FF9800',
    opacity: 0.8,
  },
  [NodeStatus.COMPLETED]: {
    label: '完了',
    color: '#4CAF50',
    opacity: 0.6,
  },
};

// ノードサイズの定義
export const NODE_SIZES = {
  small: { width: 60, height: 60, fontSize: 10 },
  medium: { width: 80, height: 80, fontSize: 12 },
  large: { width: 100, height: 100, fontSize: 14 },
};

/**
 * QuestMapNode - ノード表示用のReactコンポーネント
 * 実際のマップではD3.jsを使用するため、これはプレビューや詳細表示用
 */
const QuestMapNode: React.FC<QuestMapNodeProps> = ({
  node,
  isSelected = false,
  onClick,
  onDoubleClick,
  onContextMenu,
}) => {
  const theme = useTheme();
  const config = NODE_CONFIG[node.type];
  const statusConfig = STATUS_CONFIG[node.status];
  const size = NODE_SIZES[config.size];

  const IconComponent = config.icon;

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onClick?.(node);
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDoubleClick?.(node);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onContextMenu?.(event, node);
  };

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {node.title}
          </Typography>
          {node.description && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              {node.description}
            </Typography>
          )}
          <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
            <Chip 
              label={config.label} 
              size="small" 
              sx={{ fontSize: '10px', height: 20 }}
            />
            <Chip 
              label={statusConfig.label} 
              size="small" 
              color={node.status === NodeStatus.COMPLETED ? 'success' : 'default'}
              sx={{ fontSize: '10px', height: 20 }}
            />
          </Box>
          {node.aiComment && (
            <Typography variant="caption" sx={{ 
              display: 'block', 
              mt: 1, 
              fontStyle: 'italic',
              color: theme.palette.primary.main
            }}>
              💡 {node.aiComment}
            </Typography>
          )}
        </Box>
      }
      placement="top"
      arrow
    >
      <Box
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        sx={{
          width: size.width,
          height: size.height,
          borderRadius: '50%',
          backgroundColor: alpha(config.color, statusConfig.opacity),
          border: `3px solid ${isSelected ? theme.palette.primary.main : config.color}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.3s ease',
          boxShadow: node.isRecommended 
            ? `0 0 20px ${alpha('#FFD700', 0.6)}`
            : theme.shadows[2],
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: theme.shadows[6],
            backgroundColor: alpha(config.color, Math.min(statusConfig.opacity + 0.2, 1)),
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        {/* アイコン */}
        <IconComponent 
          sx={{ 
            fontSize: size.fontSize * 2,
            color: 'white',
            mb: 0.5,
          }} 
        />
        
        {/* タイトル */}
        <Typography
          variant="caption"
          sx={{
            color: 'white',
            fontWeight: 'bold',
            fontSize: size.fontSize,
            textAlign: 'center',
            lineHeight: 1,
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            maxWidth: '90%',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.title}
        </Typography>

        {/* 推奨バッジ */}
        {node.isRecommended && (
          <Box
            sx={{
              position: 'absolute',
              top: -8,
              right: -8,
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: '#FFD700',
              border: '2px solid #FFA000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': {
                  transform: 'scale(1)',
                  boxShadow: '0 0 0 0 rgba(255, 215, 0, 0.7)',
                },
                '70%': {
                  transform: 'scale(1.1)',
                  boxShadow: '0 0 0 10px rgba(255, 215, 0, 0)',
                },
                '100%': {
                  transform: 'scale(1)',
                  boxShadow: '0 0 0 0 rgba(255, 215, 0, 0)',
                },
              },
            }}
          >
            <RecommendedIcon sx={{ fontSize: 14, color: 'white' }} />
          </Box>
        )}

        {/* ステータスインジケーター */}
        <Box
          sx={{
            position: 'absolute',
            bottom: -4,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 16,
            height: 16,
            borderRadius: '50%',
            backgroundColor: statusConfig.color,
            border: '2px solid white',
            boxShadow: theme.shadows[2],
          }}
        />
      </Box>
    </Tooltip>
  );
};

// D3.js用のユーティリティ関数
export const getNodeRadius = (nodeType: NodeType): number => {
  const config = NODE_CONFIG[nodeType];
  const size = NODE_SIZES[config.size];
  return size.width / 2;
};

export const getNodeColor = (nodeType: NodeType, status: NodeStatus): string => {
  const config = NODE_CONFIG[nodeType];
  const statusConfig = STATUS_CONFIG[status];
  
  if (status === NodeStatus.COMPLETED) {
    return statusConfig.color;
  }
  
  return config.color;
};

export const getNodeOpacity = (status: NodeStatus): number => {
  return STATUS_CONFIG[status].opacity;
};

export const getNodeStrokeWidth = (isSelected: boolean, status: NodeStatus): number => {
  if (isSelected) return 4;
  if (status === NodeStatus.IN_PROGRESS) return 3;
  return 2;
};

export const getNodeStrokeColor = (
  nodeType: NodeType, 
  status: NodeStatus, 
  isSelected: boolean, 
  primaryColor: string
): string => {
  if (isSelected) return primaryColor;
  
  if (status === NodeStatus.IN_PROGRESS) {
    return STATUS_CONFIG[NodeStatus.IN_PROGRESS].color;
  }
  
  if (status === NodeStatus.COMPLETED) {
    return STATUS_CONFIG[NodeStatus.COMPLETED].color;
  }
  
  return NODE_CONFIG[nodeType].color;
};

// ノードラベルのフォーマット
export const formatNodeLabel = (title: string, maxLength: number = 15): string => {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + '...';
};

// カテゴリ別の色設定
export const CATEGORY_COLORS = [
  '#E3F2FD', '#F3E5F5', '#E8F5E8', '#FFF3E0', '#FCE4EC',
  '#E0F2F1', '#F1F8E9', '#FFF8E1', '#FFEBEE', '#E8EAF6',
];

export const getCategoryColor = (category: string): string => {
  if (!category) return CATEGORY_COLORS[0];
  
  // カテゴリ名のハッシュ値から色を選択
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = ((hash << 5) - hash) + category.charCodeAt(i);
    hash = hash & hash;
  }
  
  const index = Math.abs(hash) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[index];
};

export default React.memo(QuestMapNode);