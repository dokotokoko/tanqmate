import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings,
  Badge,
  Lock,
  School,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';
import { borderRadius, colors, shadows } from '../styles/design-system';
import { getPostOnboardingRoute } from '../utils/onboardingGuards';

type TeacherResolveResponse = {
  success: boolean;
  email: string;
  school: {
    id: string;
    name: string;
    school_code: string;
  };
};

const TeacherSignInPage = () => {
  const navigate = useNavigate();
  const { signIn, signOut, getProfile, isLoading, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    schoolCode: '',
    loginId: '',
    password: '',
  });

  const handleChange = (field: 'schoolCode' | 'loginId' | 'password') =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === 'schoolCode' ? event.target.value.toUpperCase() : event.target.value;
      setFormData((prev: typeof formData) => ({ ...prev, [field]: value }));
      if (error) {
        setError('');
      }
    };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setError('');

    if (!formData.schoolCode.trim() || !formData.loginId.trim() || !formData.password) {
      setError('学校ID・ユーザーID・パスワードを入力してください。');
      return;
    }

    setIsResolving(true);

    try {
      const resolveResponse = await fetch(`${API_BASE_URL}/auth/teacher-login/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          school_code: formData.schoolCode.trim(),
          login_id: formData.loginId.trim(),
        }),
      });

      if (!resolveResponse.ok) {
        setError('学校IDまたはユーザーIDが正しくありません。');
        return;
      }

      const resolved = (await resolveResponse.json()) as TeacherResolveResponse;
      const result = await signIn(resolved.email, formData.password);

      if (!result.success) {
        setError('パスワードが正しくありません。');
        return;
      }

      const profile = await getProfile();
      if (!profile || profile.role !== 'teacher' || profile.school_id !== resolved.school.id) {
        await signOut();
        setError('先生アカウントとして認証できませんでした。運営者に発行情報をご確認ください。');
        return;
      }

      navigate(getPostOnboardingRoute(profile), { replace: true });
    } catch (submitError) {
      console.error('Teacher sign-in error:', submitError);
      setError('管理者ログインに失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs" sx={{ minHeight: '100vh' }}>
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3,
          backgroundColor: colors.background.default,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 4,
              backgroundColor: colors.background.paper,
              border: `1px solid ${colors.border.soft}`,
              borderRadius: borderRadius.xl,
              boxShadow: shadows.md,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: borderRadius.lg,
                  display: 'grid',
                  placeItems: 'center',
                  mb: 2,
                  backgroundColor: colors.text.primary,
                  color: colors.text.inverse,
                }}
              >
                <AdminPanelSettings />
              </Box>
              <Typography
                component="h1"
                variant="h4"
                sx={{
                  fontWeight: 'bold',
                  color: colors.text.primary,
                  mb: 1,
                }}
              >
                探Qメイト
              </Typography>
              <Typography variant="body2" color="text.secondary">
                管理者ログイン
              </Typography>
            </Box>

            <Paper
              elevation={0}
              sx={{
                mb: 3,
                p: 2,
                backgroundColor: colors.background.subtle,
                border: `1px solid ${colors.border.soft}`,
                borderRadius: borderRadius.lg,
              }}
            >
              <Stack spacing={0.75}>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: colors.text.primary }}>
                  学校ID・ユーザーID・パスワードで認証します
                </Typography>
                <Typography sx={{ fontSize: 13, color: colors.text.secondary, lineHeight: 1.7 }}>
                  生徒アカウントではログインできません。発行情報が不明な場合は学校向けの運営窓口へご確認ください。
                </Typography>
              </Stack>
            </Paper>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                label="学校ID"
                value={formData.schoolCode}
                onChange={handleChange('schoolCode')}
                inputProps={{ maxLength: 32 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <School color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="ユーザーID"
                value={formData.loginId}
                onChange={handleChange('loginId')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Badge color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                label="パスワード"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword((prev: boolean) => !prev)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={isLoading || isResolving}
                sx={{
                  mt: 3,
                  mb: 1,
                  backgroundColor: colors.accentWarm.main,
                  color: colors.text.inverse,
                  '&:hover': {
                    backgroundColor: colors.accentWarm.hover,
                    boxShadow: shadows.accent,
                  },
                }}
              >
                {isLoading || isResolving ? <CircularProgress size={24} color="inherit" /> : 'ログイン'}
              </Button>

              <Typography
                variant="body2"
                sx={{
                  mt: 2,
                  textAlign: 'center',
                  color: colors.text.secondary,
                  lineHeight: 1.7,
                }}
              >
                このタブを閉じると、元の通常ログイン画面に戻れます。
              </Typography>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default TeacherSignInPage;
