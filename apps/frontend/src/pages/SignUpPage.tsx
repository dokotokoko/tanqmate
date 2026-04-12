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
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Google,
  ArrowBack,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { borderRadius, colors, shadows } from '../styles/design-system';

const SignUpPage = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
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
  const [emailExists, setEmailExists] = useState(false);

  const { signUp, signInWithGoogle, isLoading, error, clearError } = useAuthStore();

  const steps = ['メールアドレス入力', 'パスワード設定'];

  const validateEmail = async () => {
    const errors = { email: '' };

    if (!formData.email) {
      errors.email = 'メールアドレスを入力してください';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = '有効なメールアドレスを入力してください';
    }

    setFormErrors(prev => ({ ...prev, email: errors.email }));
    return !errors.email;
  };

  const validatePassword = () => {
    const errors = {
      password: '',
      confirmPassword: '',
    };

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

    setFormErrors(prev => ({ ...prev, ...errors }));
    return !errors.password && !errors.confirmPassword;
  };

  const handleNext = async () => {
    clearError();

    if (activeStep === 0) {
      const isValid = await validateEmail();
      if (isValid) {
        setActiveStep(1);
      }
    } else if (activeStep === 1) {
      const isValid = validatePassword();
      if (isValid) {
        handleSignUp();
      }
    }
  };

  const handleBack = () => {
    setActiveStep(activeStep - 1);
    clearError();
    setEmailExists(false);
  };

  const handleSignUp = async () => {
    const result = await signUp(formData.email, formData.password);
    if (result.success) {
      navigate(result.requiresEmailConfirmation ? '/signup/complete' : '/onboarding');
    } else if (result.error?.message?.toLowerCase().includes('already') || result.error?.message?.includes('registered')) {
      setEmailExists(true);
    }
  };

  const handleGoogleSignUp = async () => {
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

            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

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

            <Box>
              {activeStep === 0 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
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
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleNext}
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
                    disabled={isLoading || emailExists}
                  >
                    {isLoading ? <CircularProgress size={24} /> : '次へ'}
                  </Button>
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <TextField
                    margin="normal"
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
                    margin="normal"
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
                  <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button
                      variant="outlined"
                      onClick={handleBack}
                      startIcon={<ArrowBack />}
                      sx={{ flex: 1 }}
                    >
                      戻る
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleNext}
                      sx={{
                        flex: 1,
                        backgroundColor: colors.accentWarm.main,
                        color: colors.text.inverse,
                        '&:hover': {
                          backgroundColor: colors.accentWarm.hover,
                          boxShadow: shadows.accent,
                        },
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? <CircularProgress size={24} /> : '登録'}
                    </Button>
                  </Box>
                </motion.div>
              )}

              <Divider sx={{ my: 2 }}>または</Divider>

              <Button
                fullWidth
                variant="outlined"
                onClick={handleGoogleSignUp}
                disabled={isLoading}
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
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default SignUpPage;
