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
  Checkbox,
  FormControlLabel,
  Stack,
} from '@mui/material';
import {
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

const SignUpPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [formErrors, setFormErrors] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [emailExists, setEmailExists] = useState(false);

  const { signUp, signInWithGoogle, isLoading, error, clearError } = useAuthStore();

  const canProceed = termsAccepted && privacyAccepted;

  const validateForm = () => {
    const errors = {
      email: '',
      password: '',
      confirmPassword: '',
    };

    if (!formData.email) {
      errors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }

    if (!formData.password) {
      errors.password = 'パスワードを入力してください';
    } else if (formData.password.length < 8) {
      errors.password = 'パスワードは8文字以上で設定してください';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'パスワードを再入力してください';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'パスワードが一致しません';
    }

    setFormErrors(errors);
    return !errors.email && !errors.password && !errors.confirmPassword;
  };

  const handleSignUp = async () => {
    clearError();
    if (!canProceed) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    const result = await signUp(formData.email, formData.password);
    if (result.success) {
      navigate(result.requiresEmailConfirmation ? '/signup/complete' : '/onboarding');
    } else if (result.error?.message?.toLowerCase().includes('already') || result.error?.message?.includes('registered')) {
      setEmailExists(true);
    }
  };

  const handleGoogleSignUp = async () => {
    clearError();
    if (!canProceed) {
      return;
    }
    const result = await signInWithGoogle();
    if (result.success) {
      // Google認証後のコールバックはAuthCallbackPageで処理
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await handleSignUp();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (emailExists && name === 'email') {
      setEmailExists(false);
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
                新規登録
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error.message}
              </Alert>
            )}

            {emailExists && (
              <Alert severity="info" sx={{ mb: 2 }}>
                このメールアドレスは既に登録されています。
                <Link component={RouterLink} to="/signin" sx={{ ml: 1 }}>
                  ログインページへ
                </Link>
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} noValidate>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Stack spacing={2}>
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
                    required
                    fullWidth
                    name="password"
                    label="パスワード（8文字以上）"
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="new-password"
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

                  <TextField
                    required
                    fullWidth
                    name="confirmPassword"
                    label="パスワード（確認）"
                    type={showPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    error={!!formErrors.confirmPassword}
                    helperText={formErrors.confirmPassword}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  <Box
                    sx={{
                      p: 2,
                      borderRadius: borderRadius.lg,
                      border: `1px solid ${colors.border.soft}`,
                      backgroundColor: colors.background.default,
                    }}
                  >
                    <Stack spacing={1}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                          />
                        }
                        label="利用規約に同意します"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={privacyAccepted}
                            onChange={(e) => setPrivacyAccepted(e.target.checked)}
                          />
                        }
                        label="プライバシーポリシーに同意します"
                      />
                      <Typography variant="caption" color="text.secondary">
                        2つの同意が必要です。
                      </Typography>
                    </Stack>
                  </Box>

                  <Button
                    fullWidth
                    type="submit"
                    variant="contained"
                    sx={{
                      backgroundColor: colors.accentWarm.main,
                      color: colors.text.inverse,
                      '&:hover': {
                        backgroundColor: colors.accentWarm.hover,
                        boxShadow: shadows.accent,
                      },
                    }}
                    disabled={isLoading || !canProceed || emailExists}
                  >
                    {isLoading ? <CircularProgress size={24} /> : '登録'}
                  </Button>
                </Stack>
              </motion.div>
            </Box>

            <Divider sx={{ my: 2 }}>または</Divider>

            <Button
              fullWidth
              variant="outlined"
              onClick={handleGoogleSignUp}
              disabled={isLoading || !canProceed}
              startIcon={<Google />}
              sx={{ mb: 2, borderColor: colors.border.soft, color: colors.text.secondary, '&:hover': { borderColor: colors.secondary[300], backgroundColor: colors.trustBlue.soft } }}
            >
              Googleで登録
            </Button>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                既にアカウントをお持ちの方は{' '}
                <Link component={RouterLink} to="/signin">
                  ログイン
                </Link>
              </Typography>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default SignUpPage;
