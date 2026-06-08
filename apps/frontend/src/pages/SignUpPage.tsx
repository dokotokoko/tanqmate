import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Email,
  Google,
  Lock,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import AuthMigrationNotice from '../components/Auth/AuthMigrationNotice';
import AuthShell from '../components/Auth/AuthShell';
import PrivacySummary from '../components/Auth/PrivacySummary';
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
    await signInWithGoogle();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSignUp();
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (emailExists && name === 'email') {
      setEmailExists(false);
    }
  };

  return (
    <AuthShell
      title="新しく登録する"
      subtitle="探究の相談を始めるために、まずアカウントを作ります。"
      sideContent={<PrivacySummary />}
    >
      <AuthMigrationNotice showAction={false} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>
      )}

      {emailExists && (
        <Alert severity="info" sx={{ mb: 2 }}>
          このメールアドレスは既に登録されています。
          <Link component={RouterLink} to="/signin" sx={{ ml: 1 }}>
            ログインへ
          </Link>
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
            label="パスワード（8文字以上）"
            type={showPassword ? 'text' : 'password'}
            id="password"
            autoComplete="new-password"
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
            error={Boolean(formErrors.confirmPassword)}
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
              p: 1.75,
              borderRadius: borderRadius.lg,
              border: `1px solid ${colors.border.soft}`,
              backgroundColor: colors.background.subtle,
            }}
          >
            <Stack spacing={0.5}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={termsAccepted}
                    onChange={(event) => setTermsAccepted(event.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>
                    <Link component={RouterLink} to="/terms" target="_blank" rel="noreferrer" sx={{ fontWeight: 700 }}>
                      利用規約
                    </Link>
                    に同意します
                  </Typography>
                }
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={privacyAccepted}
                    onChange={(event) => setPrivacyAccepted(event.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ color: colors.text.primary }}>
                    <Link component={RouterLink} to="/privacy" target="_blank" rel="noreferrer" sx={{ fontWeight: 700 }}>
                      プライバシーポリシー
                    </Link>
                    に同意します
                  </Typography>
                }
              />
              <Typography variant="caption" sx={{ color: colors.text.secondary, lineHeight: 1.6 }}>
                同意する前に、上のリンクから内容を確認できます。
              </Typography>
            </Stack>
          </Box>

          <Button
            fullWidth
            type="submit"
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
            disabled={isLoading || !canProceed || emailExists}
          >
            {isLoading ? <CircularProgress size={24} /> : '登録して設定へ進む'}
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ my: 3.5 }}>または</Divider>

      <Button
        fullWidth
        variant="outlined"
        onClick={handleGoogleSignUp}
        disabled={isLoading || !canProceed}
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
        Googleで登録
      </Button>

      <Box sx={{ mt: 5, pt: 3, borderTop: `1px solid ${colors.border.soft}`, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: colors.text.secondary }}>
          既にアカウントをお持ちの方は{' '}
          <Link component={RouterLink} to="/signin" sx={{ fontWeight: 800 }}>
            ログイン
          </Link>
        </Typography>
      </Box>
    </AuthShell>
  );
};

export default SignUpPage;
