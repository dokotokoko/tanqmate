import React, { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import {
  School,
  Logout,
  People,
  Assignment,
  TrendingUp,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole, signOut, getAccessToken } = useAuthStore();
  const [profile, setProfile] = useState<any>(null);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);

  useEffect(() => {
    fetchProfileAndSchool();
  }, [user]);

  const fetchProfileAndSchool = async () => {
    if (!user) return;

    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const payload = await response.json();
      const profileData = payload.profile;

      setProfile(profileData);
      if (profileData?.schools) {
        setSchoolInfo(profileData.schools);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/signin');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* ヘッダー */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              先生用ダッシュボード
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Chip
                icon={<AdminPanelSettings />}
                label="Teacher"
                color="primary"
                variant="filled"
              />
              {schoolInfo && (
                <Chip
                  icon={<School />}
                  label={schoolInfo.name}
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Logout />}
            onClick={handleLogout}
          >
            ログアウト
          </Button>
        </Box>
      </Paper>

      {/* ユーザー情報 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            アカウント情報
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                メールアドレス
              </Typography>
              <Typography variant="body1">
                {user?.email || '未設定'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                名前
              </Typography>
              <Typography variant="body1">
                {profile?.name || '未設定'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                ロール
              </Typography>
              <Typography variant="body1">
                {userRole || 'teacher'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                学校
              </Typography>
              <Typography variant="body1">
                {schoolInfo?.name || '未設定'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 機能カード（モック） */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <People sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">生徒管理</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                クラスの生徒一覧を確認し、学習進捗を管理できます。
              </Typography>
              <Button variant="text" sx={{ mt: 2 }} disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assignment sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">課題管理</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                探究課題の作成・配布・採点ができます。
              </Typography>
              <Button variant="text" sx={{ mt: 2 }} disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">分析レポート</Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                クラス全体の学習状況を可視化します。
              </Typography>
              <Button variant="text" sx={{ mt: 2 }} disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* デバッグ情報 */}
      <Box sx={{ mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          Debug Info: User ID: {user?.id}, Role: {userRole}, School ID: {profile?.school_id}
        </Typography>
      </Box>
    </Container>
  );
};

export default TeacherDashboard;
