import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';
import { EmotionIcon, EmotionType } from './EmotionIcon';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  background: theme.palette.background.paper,
  border: `0.5px solid ${theme.palette.divider}`,
  borderRadius: 12,
  cursor: 'pointer',
  transition: 'border-color 0.12s',
  '&:hover': {
    borderColor: theme.palette.primary.main
  }
}));

interface StudentCardProps {
  studentId: string;
  studentName: string;
  studentNumber: number;
  latestEmotion?: EmotionType;
  latestDiaryPreview?: string;
  lastUpdated?: string;
  totalEntries?: number;
  onClick?: () => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({
  studentId,
  studentName,
  studentNumber,
  latestEmotion,
  latestDiaryPreview,
  lastUpdated,
  totalEntries,
  onClick
}) => {
  const getTimeAgo = (dateString?: string): string => {
    if (!dateString) return '未記録';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) return '1時間以内';
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays === 1) return '昨日';
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  const getStudentInitial = (name: string): string => {
    // 名前から最初の文字を取得（姓は除く）
    const parts = name.split(' ');
    if (parts.length > 1) {
      return parts[1][0]; // 名前の最初の文字
    }
    return name[0];
  };

  return (
    <StyledCard onClick={onClick}>
      <CardContent sx={{ p: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          {latestEmotion && (
            <EmotionIcon
              emotion={latestEmotion}
              initial={getStudentInitial(studentName)}
              size={36}
              animate={true}
              delay={studentNumber * 0.13}
            />
          )}
          <Box>
            <Typography variant="subtitle2" fontWeight={500}>
              {studentName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {studentNumber}番 · {getTimeAgo(lastUpdated)}
            </Typography>
          </Box>
        </Box>
        
        {latestDiaryPreview && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              lineHeight: 1.6
            }}
          >
            {latestDiaryPreview}
          </Typography>
        )}
        
        {!latestDiaryPreview && (
          <Typography variant="caption" color="text.disabled">
            まだ日誌が投稿されていません
          </Typography>
        )}
      </CardContent>
    </StyledCard>
  );
};