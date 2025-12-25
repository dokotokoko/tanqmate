/**
 * Supabase Auth対応ログインページ - モダンUI
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import { motion } from 'framer-motion';
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
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Psychology,
  AutoStories,
  GitHub as GitHubIcon,
  Google as GoogleIcon,
} from '@mui/icons-material';

const FeatureCard = ({ icon, title, description, delay }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
  >
    <Paper
      elevation={2}
      sx={{
        p: 3,
        textAlign: 'center',
        height: '100%',
        background: 'linear-gradient(145deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%)',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        },
      }}
    >
      <Box sx={{ color: 'primary.main', mb: 2 }}>{icon}</Box>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  </motion.div>
);

const SupabaseLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, signInWithProvider, user, error: authError } = useSupabaseAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ユーザーがログイン済みの場合はダッシュボードへリダイレクト
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // URLパラメータからメッセージを取得
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    if (message) {
      setSuccessMessage(decodeURIComponent(message));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { user, error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (user) {
        setSuccessMessage('ログインしました！');
        setTimeout(() => {
          navigate('/dashboard');
        }, 1000);
      }
    } catch (err: any) {
      setError('ログインに失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'github') => {
    setError(null);
    setIsLoading(true);

    try {
      const { url, error } = await signInWithProvider(provider);
      
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (url) {
        window.location.href = url;
      }
    } catch (err: any) {
      setError(`${provider}ログインに失敗しました。`);
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Psychology sx={{ fontSize: 48 }} />,
      title: 'AI対話サポート',
      description: 'AIアシスタントが探究学習の各ステップをサポートします',
    },
    {
      icon: <AutoStories sx={{ fontSize: 48 }} />,
      title: '学習記録',
      description: '対話履歴や学習計画を自動保存・管理',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={24}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <Box sx={{ display: 'flex', minHeight: '600px' }}>
              {/* 左側：機能紹介 */}
              <Box
                sx={{
                  flex: 1,
                  p: 6,
                  background: 'linear-gradient(145deg, #f3f0ff 0%, #e5dffe 100%)',
                  display: { xs: 'none', md: 'flex' },
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <Typography
                    variant="h3"
                    gutterBottom
                    fontWeight={700}
                    sx={{
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      backgroundClip: 'text',
                      textFillColor: 'transparent',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    探Qメイト
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                    AIを活用した探究学習支援アプリケーション
                  </Typography>
                </motion.div>

                <Box sx={{ display: 'grid', gap: 3 }}>
                  {features.map((feature, index) => (
                    <FeatureCard
                      key={feature.title}
                      {...feature}
                      delay={0.2 + index * 0.1}
                    />
                  ))}
                </Box>
              </Box>

              {/* 右側：ログインフォーム */}
              <Box sx={{ flex: 1, p: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 10px 40px rgba(102, 126, 234, 0.3)',
                      }}
                    >
                      <LockIcon sx={{ fontSize: 40, color: 'white' }} />
                    </Box>
                    <Typography variant="h4" gutterBottom fontWeight={700}>
                      おかえりなさい
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      アカウントにログインして続ける
                    </Typography>
                  </Box>

                  {(error || authError) && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error || authError?.message}
                    </Alert>
                  )}

                  {successMessage && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                      {successMessage}
                    </Alert>
                  )}

                  <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField
                      fullWidth
                      label="メールアドレス"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      required
                    />

                    <TextField
                      fullWidth
                      label="パスワード"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      required
                    />

                    <Box sx={{ textAlign: 'right' }}>
                      <Link
                        to="/auth/reset-password-test"
                        style={{ 
                          color: '#667eea', 
                          textDecoration: 'none',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}
                      >
                        パスワードをお忘れですか？
                      </Link>
                    </Box>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={isLoading}
                      sx={{
                        py: 1.8,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: 'linear-gradient(45deg, #667eea, #764ba2)',
                        boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #5a67d8, #6b5b95)',
                          boxShadow: '0 6px 20px rgba(102, 126, 234, 0.4)',
                        },
                      }}
                    >
                      {isLoading ? <CircularProgress size={24} color="inherit" /> : 'ログイン'}
                    </Button>

                    <Divider sx={{ my: 2 }}>または</Divider>

                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => handleSocialLogin('google')}
                        disabled={isLoading}
                        startIcon={<GoogleIcon />}
                        sx={{
                          borderColor: '#dadce0',
                          color: '#3c4043',
                          '&:hover': {
                            borderColor: '#4285f4',
                            background: 'rgba(66, 133, 244, 0.04)',
                          },
                        }}
                      >
                        Google
                      </Button>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => handleSocialLogin('github')}
                        disabled={isLoading}
                        startIcon={<GitHubIcon />}
                        sx={{
                          backgroundColor: '#24292e',
                          '&:hover': {
                            backgroundColor: '#2f363d',
                          },
                        }}
                      >
                        GitHub
                      </Button>
                    </Box>

                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        初めての方は{' '}
                        <Link
                          to="/auth/register-test"
                          style={{
                            color: '#667eea',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          新規登録
                        </Link>
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              </Box>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default SupabaseLoginPage;