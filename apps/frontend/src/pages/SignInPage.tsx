import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  AdminPanelSettings,
  Email,
  Google,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import AuthMigrationNotice from '../components/Auth/AuthMigrationNotice';
import AuthShell from '../components/Auth/AuthShell';
import { useAuthStore } from '../stores/authStore';
import { colors, shadows } from '../styles/design-system';
import { getPostOnboardingRoute } from '../utils/onboardingGuards';

const SignInPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
  });

  const { signIn, signInWithGoogle, isLoading, error, clearError, getProfile } = useAuthStore();

  const validateForm = () => {
    const errors = {
      email: '',
      password: '',
    };

    if (!formData.email) {
      errors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }

    if (!formData.password) {
      errors.password = 'パスワードを入力してください';
    }

    setFormErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    const result = await signIn(formData.email, formData.password);
    if (result.success) {
      const profile = await getProfile();
      if (!profile) {
        navigate('/signin', { replace: true });
        return;
      }
      navigate(getPostOnboardingRoute(profile));
    }
  };

  const handleGoogleSignIn = async () => {
    clearError();
    await signInWithGoogle();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <AuthShell
      title="おかえりなさい"
      subtitle="探究の続きへ進みます。昨年度から使っていた人は、お知らせも確認してください。"
    >
      <AuthMigrationNotice />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message === 'Invalid login credentials'
            ? 'メールアドレスまたはパスワードが正しくありません。以前の認証情報ではログインできない場合があります。'
            : error.message}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.75}>
          <TextField
            required
            fullWidth
            id="email"
            label="メールアドレス"
            name="email"
            autoComplete="email"
            autoFocus
            value={formData.email}
            onChange={handleInputChange}
            error={Boolean(formErrors.email)}
            helperText={formErrors.email}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="action" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            required
            fullWidth
            name="password"
            label="パスワード"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleInputChange}
            error={Boolean(formErrors.password)}
            helperText={formErrors.password}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'パスワードを非表示にする' : 'パスワードを表示する'}
                    onClick={() => setShowPassword((current) => !current)}
                    edge="end"
                  >
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
            sx={{
              py: 1.25,
              backgroundColor: colors.accentWarm.main,
              color: colors.text.inverse,
              '&:hover': {
                backgroundColor: colors.accentWarm.hover,
                boxShadow: shadows.accent,
              },
            }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'AIとの探究を始める'}
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ my: 3.5 }}>または</Divider>

      <Button
        fullWidth
        variant="outlined"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
        startIcon={<Google />}
        sx={{
          borderColor: colors.border.soft,
          color: colors.text.secondary,
          '&:hover': {
            borderColor: colors.trustBlue.main,
            backgroundColor: colors.trustBlue.soft,
          },
        }}
      >
        Googleでログイン
      </Button>

      <Box sx={{ mt: 5, pt: 3, borderTop: `1px solid ${colors.border.soft}`, textAlign: 'center' }}>
        <Link
          component={RouterLink}
          to="/teacher/signin"
          variant="body2"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: colors.text.secondary,
            fontWeight: 600,
          }}
        >
          <AdminPanelSettings fontSize="small" />
          先生・管理者の方はこちら
        </Link>
      </Box>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Link component={RouterLink} to="/password-reset" variant="body2" sx={{ display: 'block', mb: 1.5 }}>
          パスワードをお忘れの方
        </Link>
        <Typography variant="body2" sx={{ color: colors.text.secondary }}>
          はじめて使う方・再登録が必要な方は{' '}
          <Link component={RouterLink} to="/signup" sx={{ fontWeight: 800 }}>
            新規登録
          </Link>
        </Typography>
      </Box>
    </AuthShell>
  );
};

export default SignInPage;
