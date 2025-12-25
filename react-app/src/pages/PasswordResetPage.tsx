/**
 * パスワードリセットページ - モダンUI
 */
import React, { useState } from 'react';
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
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  Lock as LockIcon,
  Restore as RestoreIcon,
  Psychology,
  Security,
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
        background: 'linear-gradient(145deg, rgba(76,175,80,0.05) 0%, rgba(139,195,74,0.05) 100%)',
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

const PasswordResetPage: React.FC = () => {
  const navigate = useNavigate();
  const { resetPassword } = useSupabaseAuth();
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email) {
      setError('メールアドレスを入力してください');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('有効なメールアドレスを入力してください');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await resetPassword(email);
      
      if (error) {
        setError(error.message);
      } else {
        setIsSuccess(true);
      }
    } catch (err: any) {
      setError('パスワードリセットの処理に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Security sx={{ fontSize: 48, color: '#4CAF50' }} />,
      title: '安全なリセット',
      description: 'セキュアな認証システムで安心',
    },
    {
      icon: <Psychology sx={{ fontSize: 48, color: '#8BC34A' }} />,
      title: '簡単操作',
      description: 'わずか数ステップで完了',
    },
  ];

  if (isSuccess) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
          display: 'flex',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Container maxWidth="sm">
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
                p: 6,
                textAlign: 'center',
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: 0.2
                }}
              >
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    boxShadow: '0 10px 40px rgba(76, 175, 80, 0.3)',
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 40, color: 'white' }} />
                </Box>
              </motion.div>

              <Typography variant="h4" gutterBottom fontWeight={700} color="success.main">
                メールを送信しました
              </Typography>
              
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                パスワードリセット用のリンクを
              </Typography>
              <Typography variant="body1" fontWeight={600} color="primary.main" sx={{ mb: 2 }}>
                {email}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                に送信しました。
              </Typography>
              
              <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
                メールが届かない場合は、迷惑メールフォルダをご確認ください。
              </Alert>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  component={Link}
                  to="/auth/login-test"
                  variant="contained"
                  size="large"
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #45a049, #7cb342)',
                    },
                  }}
                >
                  ログインページへ戻る
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => {
                    setIsSuccess(false);
                    setEmail('');
                  }}
                  sx={{
                    py: 1.5,
                    borderColor: '#4CAF50',
                    color: '#4CAF50',
                    '&:hover': {
                      borderColor: '#45a049',
                      backgroundColor: 'rgba(76, 175, 80, 0.04)',
                    },
                  }}
                >
                  別のメールアドレスで再送信
                </Button>
              </Box>
            </Paper>
          </motion.div>
        </Container>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
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
                  background: 'linear-gradient(145deg, #f1f8e9 0%, #e8f5e8 100%)',
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
                  <Box sx={{ mb: 3 }}>
                    <motion.div
                      animate={{ 
                        rotate: [0, -10, 10, -5, 0],
                        scale: [1, 1.05, 1, 1.05, 1]
                      }}
                      transition={{ 
                        duration: 4, 
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                      style={{ display: 'inline-block' }}
                    >
                      <RestoreIcon sx={{ fontSize: 60, color: '#4CAF50' }} />
                    </motion.div>
                  </Box>
                  <Typography
                    variant="h3"
                    gutterBottom
                    fontWeight={700}
                    sx={{
                      background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                      backgroundClip: 'text',
                      textFillColor: 'transparent',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    パスワードリセット
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                    安心・安全にアカウントを復旧
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

              {/* 右側：リセットフォーム */}
              <Box sx={{ flex: 1, p: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ 
                        type: "spring",
                        stiffness: 260,
                        damping: 20,
                        delay: 0.3
                      }}
                    >
                      <Box
                        sx={{
                          width: 80,
                          height: 80,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #4CAF50 0%, #8BC34A 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px',
                          boxShadow: '0 10px 40px rgba(76, 175, 80, 0.3)',
                        }}
                      >
                        <LockIcon sx={{ fontSize: 40, color: 'white' }} />
                      </Box>
                    </motion.div>
                    <Typography variant="h4" gutterBottom fontWeight={700}>
                      パスワードをリセット
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      登録済みのメールアドレスを入力してください
                    </Typography>
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                      {error}
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
                      helperText="パスワードリセット用のリンクをメールで送信します"
                      required
                    />

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
                        background: 'linear-gradient(45deg, #4CAF50, #8BC34A)',
                        boxShadow: '0 4px 15px rgba(76, 175, 80, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #45a049, #7cb342)',
                          boxShadow: '0 6px 20px rgba(76, 175, 80, 0.4)',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isLoading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={24} color="inherit" />
                          送信中...
                        </Box>
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <RestoreIcon />
                          リセットリンクを送信
                        </Box>
                      )}
                    </Button>

                    <Box sx={{ textAlign: 'center', mt: 2 }}>
                      <Button
                        component={Link}
                        to="/auth/login-test"
                        variant="text"
                        startIcon={<ArrowBackIcon />}
                        sx={{
                          color: '#4CAF50',
                          fontWeight: 500,
                          '&:hover': {
                            backgroundColor: 'rgba(76, 175, 80, 0.04)',
                          },
                        }}
                      >
                        ログインページに戻る
                      </Button>
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

export default PasswordResetPage;