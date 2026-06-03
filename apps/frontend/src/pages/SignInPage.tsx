import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Divider,
} from '@mui/material';
import {
  AdminPanelSettings,
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Google,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { borderRadius, colors, shadows } from '../styles/design-system';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const result = await signInWithGoogle();
    if (result.success) {
      // Google認証後のコールバックはAuthCallbackPageで処理
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
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
          <Paper elevation={0} sx={{ p: 4, backgroundColor: colors.background.paper, border: `1px solid ${colors.border.soft}`, borderRadius: borderRadius.xl, boxShadow: shadows.md }}>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                mb: 3,
              }}
            >
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
                ログイン
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error.message === 'Invalid login credentials' 
                  ? 'メールアドレスまたはパスワードが正しくありません'
                  : error.message}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                id="email"
                label="メールアドレス"
                name="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleInputChange}
                error={!!formErrors.email}
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
                margin="normal"
                required
                fullWidth
                name="password"
                label="パスワード"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleInputChange}
                error={!!formErrors.password}
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
                        aria-label="toggle password visibility"
                        onClick={() => setShowPassword(!showPassword)}
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
                  mt: 3,
                  mb: 2,
                  backgroundColor: colors.accentWarm.main,
                  color: colors.text.inverse,
                  '&:hover': {
                    backgroundColor: colors.accentWarm.hover,
                    boxShadow: shadows.accent,
                  },
                }}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'ログイン'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                component="a"
                href="/teacher/signin"
                target="_blank"
                rel="noopener noreferrer"
                startIcon={<AdminPanelSettings />}
                sx={{
                  mb: 2,
                  borderColor: colors.border.soft,
                  color: colors.text.secondary,
                  '&:hover': {
                    borderColor: colors.secondary[300],
                    backgroundColor: colors.background.subtle,
                  },
                }}
              >
                管理者ログイン
              </Button>

              <Divider sx={{ my: 2 }}>または</Divider>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                  startIcon={<Google />}
                  sx={{ mb: 2, borderColor: colors.border.soft, color: colors.text.secondary, '&:hover': { borderColor: colors.secondary[300], backgroundColor: colors.trustBlue.soft } }}
                >
                  Googleでログイン
                </Button>

              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Link
                  component={RouterLink}
                  to="/password-reset"
                  variant="body2"
                  sx={{ display: 'block', mb: 1 }}
                >
                  パスワードをお忘れの方はこちら
                </Link>
                <Typography variant="body2" color="text.secondary">
                  アカウントをお持ちでない方は{' '}
                  <Link component={RouterLink} to="/signup">
                    新規登録
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default SignInPage;
