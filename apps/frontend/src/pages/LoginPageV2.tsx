import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Link,
  Divider,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Security,
  Speed,
  Cloud,
  Google,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStoreV2 } from '../stores/authStoreV2';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const LoginPageV2 = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showMigrationBanner, setShowMigrationBanner] = useState(true);
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  
  const { signIn, signUp, signInWithGoogle, resetPassword, isLoading, error, clearError } = useAuthStoreV2();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    clearError();
    setResetSent(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn(loginData.email, loginData.password);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerData.password !== registerData.confirmPassword) {
      return;
    }
    
    const result = await signUp(registerData.email, registerData.password);
    if (result.success) {
      // 新規登録後は学校登録ページへ
      navigate('/school-registration');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await resetPassword(resetEmail);
    if (result.success) {
      setResetSent(true);
    }
  };

  const handleGoogleLogin = async () => {
    const result = await signInWithGoogle();
    // Google認証の場合、リダイレクトされるのでここでは何もしない
  };

  const features = [
    {
      icon: <Security sx={{ fontSize: 32 }} />,
      title: 'エンタープライズグレードセキュリティ',
      description: 'Supabase Authによる強固な認証',
    },
    {
      icon: <Speed sx={{ fontSize: 32 }} />,
      title: '高速セッション管理',
      description: '自動リフレッシュとセキュアなトークン管理',
    },
    {
      icon: <Cloud sx={{ fontSize: 32 }} />,
      title: 'クラウドネイティブ',
      description: 'スケーラブルで信頼性の高い基盤',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        {/* 移行案内バナー */}
        {showMigrationBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Paper
              sx={{
                p: 2,
                mb: 3,
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 2,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Chip
                    label="新システム"
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                  <Typography variant="body1">
                    既存のアカウントをお持ちの方は、
                    <Link
                      component="button"
                      onClick={() => navigate('/migration-notice')}
                      sx={{ ml: 0.5, fontWeight: 600 }}
                    >
                      こちらから移行手続き
                    </Link>
                    を行ってください
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => setShowMigrationBanner(false)}>
                  ×
                </IconButton>
              </Box>
            </Paper>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={20}
            sx={{
              borderRadius: 3,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.98)',
            }}
          >
            <Box sx={{ display: 'flex', minHeight: '600px' }}>
              {/* 左側：機能紹介 */}
              <Box
                sx={{
                  flex: 1,
                  p: 6,
                  background: 'linear-gradient(145deg, #fff3e0 0%, #ffe0b2 100%)',
                  display: { xs: 'none', md: 'flex' },
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <Typography
                  variant="h3"
                  gutterBottom
                  fontWeight={700}
                  sx={{
                    background: 'linear-gradient(45deg, #FF9800, #F57C00)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  探Qメイト
                </Typography>
                <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                  新認証システムへようこそ
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {features.map((feature) => (
                    <Box key={feature.title} sx={{ display: 'flex', gap: 2 }}>
                      <Box sx={{ color: 'primary.main' }}>{feature.icon}</Box>
                      <Box>
                        <Typography variant="h6" gutterBottom>
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {feature.description}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* 右側：認証フォーム */}
              <Box sx={{ flex: 1, p: 6 }}>
                <Typography variant="h4" gutterBottom fontWeight={600} textAlign="center">
                  アカウント認証
                </Typography>
                
                <Tabs
                  value={tabValue}
                  onChange={handleTabChange}
                  centered
                  sx={{ mb: 3 }}
                >
                  <Tab label="ログイン" />
                  <Tab label="新規登録" />
                  <Tab label="パスワードリセット" />
                </Tabs>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error.message}
                  </Alert>
                )}

                <TabPanel value={tabValue} index={0}>
                  <Box component="form" onSubmit={handleLogin}>
                    <TextField
                      fullWidth
                      label="メールアドレス"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email color="action" />
                          </InputAdornment>
                        ),
                      }}
                      required
                      sx={{ mb: 3 }}
                    />
                    
                    <TextField
                      fullWidth
                      label="パスワード"
                      type={showPassword ? 'text' : 'password'}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      required
                      sx={{ mb: 3 }}
                    />
                    
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={isLoading}
                      sx={{
                        py: 1.5,
                        background: 'linear-gradient(45deg, #FF9800, #F57C00)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #FFB74D, #FF6F00)',
                        },
                      }}
                    >
                      {isLoading ? <CircularProgress size={24} color="inherit" /> : 'ログイン'}
                    </Button>

                    <Divider sx={{ my: 2 }}>または</Divider>

                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      startIcon={<Google />}
                      sx={{
                        py: 1.5,
                        borderColor: '#4285F4',
                        color: '#4285F4',
                        '&:hover': {
                          borderColor: '#1976d2',
                          backgroundColor: 'rgba(66, 133, 244, 0.04)',
                        },
                      }}
                    >
                      Googleでログイン
                    </Button>
                  </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                  <Box component="form" onSubmit={handleRegister}>
                    <TextField
                      fullWidth
                      label="メールアドレス"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Email color="action" />
                          </InputAdornment>
                        ),
                      }}
                      required
                      sx={{ mb: 3 }}
                    />
                    
                    <TextField
                      fullWidth
                      label="パスワード"
                      type={showPassword ? 'text' : 'password'}
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)}>
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      required
                      sx={{ mb: 3 }}
                    />
                    
                    <TextField
                      fullWidth
                      label="パスワード（確認）"
                      type="password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      disabled={isLoading}
                      error={registerData.confirmPassword !== '' && registerData.password !== registerData.confirmPassword}
                      helperText={
                        registerData.confirmPassword !== '' && registerData.password !== registerData.confirmPassword
                          ? 'パスワードが一致しません'
                          : ''
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" />
                          </InputAdornment>
                        ),
                      }}
                      required
                      sx={{ mb: 3 }}
                    />
                    
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={isLoading || registerData.password !== registerData.confirmPassword}
                      sx={{
                        py: 1.5,
                        background: 'linear-gradient(45deg, #FFB74D, #FF9800)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #FFCC80, #FFB74D)',
                        },
                      }}
                    >
                      {isLoading ? <CircularProgress size={24} color="inherit" /> : '新規登録'}
                    </Button>

                    <Divider sx={{ my: 2 }}>または</Divider>

                    <Button
                      fullWidth
                      variant="outlined"
                      size="large"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      startIcon={<Google />}
                      sx={{
                        py: 1.5,
                        borderColor: '#4285F4',
                        color: '#4285F4',
                        '&:hover': {
                          borderColor: '#1976d2',
                          backgroundColor: 'rgba(66, 133, 244, 0.04)',
                        },
                      }}
                    >
                      Googleで登録
                    </Button>
                  </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                  <Box component="form" onSubmit={handleResetPassword}>
                    {resetSent ? (
                      <Alert severity="success" sx={{ mb: 3 }}>
                        パスワードリセットメールを送信しました。メールをご確認ください。
                      </Alert>
                    ) : (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          登録したメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
                        </Typography>
                        <TextField
                          fullWidth
                          label="メールアドレス"
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          disabled={isLoading}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Email color="action" />
                              </InputAdornment>
                            ),
                          }}
                          required
                          sx={{ mb: 3 }}
                        />
                        <Button
                          type="submit"
                          fullWidth
                          variant="contained"
                          size="large"
                          disabled={isLoading}
                          sx={{
                            py: 1.5,
                            background: 'linear-gradient(45deg, #FF9800, #F57C00)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #FFB74D, #FF6F00)',
                            },
                          }}
                        >
                          {isLoading ? <CircularProgress size={24} color="inherit" /> : 'リセットメール送信'}
                        </Button>
                      </>
                    )}
                  </Box>
                </TabPanel>

                <Divider sx={{ my: 3 }} />
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    旧システムをご利用の方は
                    <Link
                      component="button"
                      onClick={() => navigate('/signin')}
                      sx={{ ml: 0.5 }}
                    >
                      こちら
                    </Link>
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default LoginPageV2;