import React from 'react';
import { Chip } from '@mui/material';

interface ResponseStyleBadgeProps {
  styleUsed?: string;
}

// 応答スタイルの日本語ラベルマッピング
const styleLabels: Record<string, string> = {
  'organize': '整理',
  'expand': '発展',
  'ideas': 'アイデア',
  'research': '研究',
  'deepen': '深掘り',
  'clarification': '明確化',
  'select': 'サクサク',
  'auto': '自動',
  'custom': 'カスタム',
};

export const ResponseStyleBadge: React.FC<ResponseStyleBadgeProps> = ({ styleUsed }) => {
  if (!styleUsed) return null;

  const label = styleLabels[styleUsed] || styleUsed;

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: '18px',
        fontSize: '0.65rem',
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        color: 'text.secondary',
        ml: 1,
        '& .MuiChip-label': {
          px: 1,
        }
      }}
    />
  );
};
