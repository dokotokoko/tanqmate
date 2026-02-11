import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CompleteIcon,
  Schedule as ScheduleIcon,
  Psychology as PsychologyIcon,
  EmojiObjects as IdeaIcon,
  TipsAndUpdates as TipIcon,
} from '@mui/icons-material';
import { NodeStatus, NodeType } from '../../types/questMap';
import type { QuestNode } from '../../types/questMap';

interface QuestMapNodeDetailProps {
  node: QuestNode | null;
  open: boolean;
  onClose: () => void;
  onComplete?: (nodeId: number) => void;
}

// カテゴリ設定
const CATEGORY_CONFIG: Record<string, { label: string; icon: string; bgColor: string; color: string }> = {
  search: { label: "調べる", icon: "🔍", bgColor: "#E8F6F5", color: "#0D7377" },
  think:  { label: "考える", icon: "💭", bgColor: "#FFF9E6", color: "#8B6914" },
  listen: { label: "聞く",   icon: "🎤", bgColor: "#F3EEFF", color: "#5B21B6" },
  create: { label: "作る",   icon: "📝", bgColor: "#FDF2F8", color: "#9D174D" },
  data:   { label: "データ", icon: "📊", bgColor: "#ECFDF5", color: "#047857" },
  action: { label: "アクション", icon: "⚡", bgColor: "#FFF7ED", color: "#EA580C" },
  analysis: { label: "分析", icon: "📈", bgColor: "#EBF5FF", color: "#1E40AF" },
  preparation: { label: "準備", icon: "🎯", bgColor: "#FEF3C7", color: "#92400E" },
};

const QuestMapNodeDetail: React.FC<QuestMapNodeDetailProps> = ({
  node,
  open,
  onClose,
  onComplete,
}) => {
  if (!node) return null;

  const category = CATEGORY_CONFIG[node.category || 'action'] || CATEGORY_CONFIG.action;
  const isCompleted = node.status === NodeStatus.COMPLETED;
  const canComplete = node.type === NodeType.CHOICE && !isCompleted;

  const handleComplete = () => {
    if (onComplete && node) {
      onComplete(node.id);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxHeight: '85vh',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        justifyContent: 'space-between',
        pb: 1,
      }}>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                backgroundColor: category.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
              }}
            >
              {category.icon}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                {node.title}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip
                  label={category.label}
                  size="small"
                  sx={{
                    backgroundColor: category.bgColor,
                    color: category.color,
                    fontWeight: 600,
                  }}
                />
                {isCompleted && (
                  <Chip
                    icon={<CheckCircle />}
                    label="完了"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                )}
                {node.isRecommended && (
                  <Chip
                    label="おすすめ"
                    size="small"
                    sx={{
                      backgroundColor: '#FFF4ED',
                      color: '#EA580C',
                      fontWeight: 600,
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ mt: -1, mr: -1 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 3 }}>
        {/* メイン説明 */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <PsychologyIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
            <Typography variant="subtitle2" color="text.secondary">
              やること
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ lineHeight: 1.8, pl: 3.5 }}>
            {node.description || 'このアクションの詳細な説明はまだありません。'}
          </Typography>
        </Box>

        {/* 期待される成果 */}
        {node.expectedOutcome && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <IdeaIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary">
                これで見えてくること
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ lineHeight: 1.8, pl: 3.5 }}>
              {node.expectedOutcome}
            </Typography>
          </Box>
        )}

        {/* 所要時間 */}
        {node.estimatedDuration && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ScheduleIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
              <Typography variant="subtitle2" color="text.secondary">
                所要時間
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ pl: 3.5 }}>
              {node.estimatedDuration}
            </Typography>
          </Box>
        )}

        {/* AIからのヒント */}
        {node.aiComment && (
          <Box 
            sx={{ 
              mt: 4,
              p: 2.5,
              borderRadius: 2,
              backgroundColor: '#FFF9E6',
              border: '1px solid #FFE082',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TipIcon sx={{ fontSize: 20, color: '#F9A825' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#F57C00' }}>
                探Qメイトからのヒント
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ lineHeight: 1.6, color: '#8D6E63' }}>
              {node.aiComment}
            </Typography>
          </Box>
        )}

        {/* 難易度と優先度 */}
        <Box sx={{ mt: 4, display: 'flex', gap: 3 }}>
          {node.difficulty !== undefined && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                難易度
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                {[1, 2, 3].map((level) => (
                  <Box
                    key={level}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: level <= (node.difficulty || 0) ? '#FF9800' : '#E0E0E0',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
          {node.priority !== undefined && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                優先度
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <Box
                    key={level}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: level <= (node.priority || 0) ? '#2196F3' : '#E0E0E0',
                    }}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          閉じる
        </Button>
        {canComplete && (
          <Button
            onClick={handleComplete}
            variant="contained"
            startIcon={<CompleteIcon />}
            sx={{
              backgroundColor: '#10B981',
              '&:hover': {
                backgroundColor: '#059669',
              },
            }}
          >
            完了にする
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default QuestMapNodeDetail;