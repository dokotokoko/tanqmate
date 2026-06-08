import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { AutoAwesome, LockOutlined, SchoolOutlined, ScienceOutlined } from '@mui/icons-material';
import { colors, shadows } from '../../styles/design-system';

const summaryItems = [
  {
    icon: <AutoAwesome />,
    title: 'AI支援に使う情報',
    body: '興味、テーマ、問いなどは、AIが探究の入口を一緒に整理するために使います。',
  },
  {
    icon: <SchoolOutlined />,
    title: '先生に見える範囲',
    body: '先生に共有される内容は、支援に必要な最小限の情報を基本にします。',
  },
  {
    icon: <LockOutlined />,
    title: '内省の扱い',
    body: 'raw対話ログや入力途中の内省を、不用意に先生へ見せる設計にはしません。',
  },
  {
    icon: <ScienceOutlined />,
    title: '研究・改善での利用',
    body: '研究や改善に使う場合は、個人が特定されない形にしたうえで扱います。',
  },
];

const PrivacySummary: React.FC = () => {
  return (
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        borderRadius: '22px',
        border: `1px solid ${colors.border.soft}`,
        backgroundColor: colors.background.paper,
        boxShadow: shadows.sm,
      }}
    >
      <Typography component="h2" variant="h6" sx={{ color: colors.text.primary, fontWeight: 800, mb: 0.75 }}>
        同意の前に知っておいてほしいこと
      </Typography>
      <Typography variant="body2" sx={{ color: colors.text.secondary, lineHeight: 1.75, mb: 2 }}>
        正式な内容はプライバシーポリシー本文が正本です。ここでは、探Qメイトで特に大切な点だけを短くまとめています。
      </Typography>
      <Stack spacing={1.5}>
        {summaryItems.map((item) => (
          <Stack key={item.title} direction="row" spacing={1.25} alignItems="flex-start">
            <Box
              aria-hidden
              sx={{
                width: 32,
                height: 32,
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                color: colors.accentWarm.active,
                backgroundColor: colors.accentWarm.soft,
                flexShrink: 0,
                '& svg': { fontSize: 19 },
              }}
            >
              {item.icon}
            </Box>
            <Box>
              <Typography variant="body2" sx={{ color: colors.text.primary, fontWeight: 800 }}>
                {item.title}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', color: colors.text.secondary, lineHeight: 1.65 }}>
                {item.body}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
};

export default PrivacySummary;
