import React, { memo, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import {
  AutoAwesome as AutoAwesomeIcon,
  Book as BookIcon,
  Chat as ChatIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { borderRadius, colors, shadows } from '../styles/design-system';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, fetchProfile } = useAuthStore();

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const inquiryContext = [
    { label: '探究テーマ', value: profile?.theme },
    { label: '問い', value: profile?.question },
    { label: '仮説', value: profile?.hypothesis },
  ];

  const missingInquiryContextCount = inquiryContext.filter((item) => !item.value).length;

  const quickActions = [
    {
      title: 'AIと話す',
      description: '今の探究テーマや問いを前提に、そのまま相談を始めます。',
      icon: <ChatIcon />,
      actionLabel: 'チャットを開く',
      onClick: () => navigate('/app/chat'),
    },
    {
      title: '日誌を書く',
      description: '今日の気づきや迷いを残して、探究の流れを可視化します。',
      icon: <BookIcon />,
      actionLabel: '日誌に進む',
      onClick: () => navigate('/app/diary?autostart=1'),
    },
    {
      title: 'プロフィールを整える',
      description: '探究テーマ・問い・仮説を更新して、AIに渡す文脈を管理します。',
      icon: <PersonIcon />,
      actionLabel: 'プロフィール編集',
      onClick: () => navigate('/app/profile'),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: '32px',
            backgroundColor: colors.background.paper,
            border: `1px solid ${colors.border.warm}`,
            boxShadow: shadows.md,
          }}
        >
          <Typography variant="overline" sx={{ letterSpacing: '0.18em', color: colors.text.secondary }}>
            Student Context Home
          </Typography>
          <Typography variant="h3" sx={{ mt: 1, fontWeight: 700, color: colors.text.primary }}>
            探究の基本設定
          </Typography>
          <Typography variant="body1" sx={{ mt: 1.5, maxWidth: 760, color: colors.text.secondary }}>
            MVP ではプロジェクト管理ではなく、生徒プロフィールに紐づく探究コンテキストを中心に進めます。AI はここで管理するテーマ・問い・仮説を参照します。
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap', useFlexGap: true }}>
            <Chip
              label={profile?.role === 'teacher' ? 'Teacher' : 'Student'}
              sx={{
                backgroundColor: colors.background.elevated,
                color: colors.text.secondary,
                border: `1px solid ${colors.border.soft}`,
              }}
            />
            <Chip
              label={missingInquiryContextCount === 0 ? '探究コンテキスト設定済み' : `未設定 ${missingInquiryContextCount} 項目`}
              sx={{
                backgroundColor: missingInquiryContextCount === 0 ? colors.accentWarm.soft : colors.background.subtle,
                color: missingInquiryContextCount === 0 ? colors.accentWarm.active : colors.text.secondary,
                border: `1px solid ${colors.border.warm}`,
              }}
            />
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
            <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => navigate('/app/chat')}>
              AIと話し始める
            </Button>
            <Button variant="outlined" onClick={() => navigate('/app/profile')}>
              プロフィールを確認
            </Button>
          </Stack>
        </Box>

        <Grid container spacing={3} sx={{ mt: 1 }}>
          {quickActions.map((action) => (
            <Grid item xs={12} md={4} key={action.title}>
              <Card
                sx={{
                  height: '100%',
                  borderRadius: '24px',
                  border: `1px solid ${colors.border.soft}`,
                  boxShadow: shadows.sm,
                  backgroundColor: colors.background.paper,
                }}
              >
                <CardContent sx={{ p: 3.5 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: borderRadius.lg,
                      display: 'grid',
                      placeItems: 'center',
                      backgroundColor: colors.accentWarm.soft,
                      color: colors.accentWarm.active,
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Typography variant="h5" sx={{ mt: 2.5, fontWeight: 700, color: colors.text.primary }}>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 1.2, minHeight: 48, color: colors.text.secondary }}>
                    {action.description}
                  </Typography>
                  <Button variant="outlined" onClick={action.onClick} sx={{ mt: 3 }}>
                    {action.actionLabel}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Card
          sx={{
            mt: 3,
            borderRadius: '28px',
            border: `1px solid ${colors.border.soft}`,
            boxShadow: shadows.sm,
            backgroundColor: colors.background.paper,
          }}
        >
          <CardContent sx={{ p: 3.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: colors.text.primary }}>
              AI に渡す探究コンテキスト
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: colors.text.secondary }}>
              旧 `project` に入っていた情報は、ここで一元管理します。複数テーマ管理は Phase6 以降まで保留です。
            </Typography>

            <Grid container spacing={2} sx={{ mt: 1 }}>
              {inquiryContext.map((item) => (
                <Grid item xs={12} md={4} key={item.label}>
                  <Box
                    sx={{
                      p: 2.5,
                      height: '100%',
                      borderRadius: '20px',
                      backgroundColor: colors.background.subtle,
                      border: `1px solid ${colors.border.soft}`,
                    }}
                  >
                    <Typography variant="caption" sx={{ color: colors.text.secondary, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body1" sx={{ mt: 1.2, color: colors.text.primary, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                      {item.value || '未設定'}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default memo(DashboardPage);
