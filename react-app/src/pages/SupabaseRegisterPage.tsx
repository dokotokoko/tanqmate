/**
 * Supabase Auth対応登録ページ - モダンUI（差別化済み）
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
  LinearProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  RocketLaunch as RocketIcon,
  Celebration,
  AutoAwesome,
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
        background: 'linear-gradient(145deg, rgba(255,107,107,0.05) 0%, rgba(255,230,109,0.05) 100%)',
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

const SupabaseRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUp, user } = useSupabaseAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // パスワード強度チェック
  const [passwordStrength, setPasswordStrength] = useState({
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false
  });

  // ユーザーがログイン済みの場合はダッシュボードへリダイレクト
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // パスワード強度の評価
  useEffect(() => {
    const password = formData.password;
    setPasswordStrength({
      hasMinLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    });
  }, [formData.password]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      setError('すべての必須項目を入力してください');
      return false;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('有効なメールアドレスを入力してください');
      return false;
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で設定してください');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { user, error } = await signUp(
        formData.email,
        formData.password,
        formData.username || undefined
      );
      
      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      if (user) {
        setSuccessMessage('🎉 アカウントが作成されました！確認メールをご確認ください');
        
        // 3秒後にログインページへリダイレクト
        setTimeout(() => {
          navigate('/auth/login-test', { 
            state: { message: 'アカウントが作成されました。ログインしてください。' }
          });
        }, 3000);
      }
    } catch (err: any) {
      setError('登録に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthScore = () => {
    const score = Object.values(passwordStrength).filter(Boolean).length;
    if (score === 0) return 0;
    return (score / 5) * 100;
  };

  const getPasswordStrengthColor = () => {
    const score = Object.values(passwordStrength).filter(Boolean).length;
    if (score <= 2) return 'error';
    if (score <= 3) return 'warning';
    return 'success';
  };

  const getPasswordStrengthText = () => {
    const score = Object.values(passwordStrength).filter(Boolean).length;
    if (score === 0) return '';
    if (score <= 2) return '弱い';
    if (score <= 3) return '普通';
    if (score <= 4) return '強い';
    return '非常に強い';
  };

  const features = [
    {
      icon: <RocketIcon sx={{ fontSize: 48, color: '#FF6B6B' }} />,
      title: '簡単スタート',
      description: '30秒で登録完了、すぐに使い始められます',
    },
    {
      icon: <AutoAwesome sx={{ fontSize: 48, color: '#FFE66D' }} />,
      title: '無料で充実',
      description: 'すべての基本機能が無料で利用可能',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装飾 */}
      <Box
        sx={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
          animation: 'float 6s ease-in-out infinite',
          '@keyframes float': {
            '0%, 100%': { transform: 'translateY(0px)' },
            '50%': { transform: 'translateY(-20px)' },
          },
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%)',
          animation: 'float 8s ease-in-out infinite',
        }}
      />
      
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
            <Box sx={{ display: 'flex', minHeight: '700px' }}>
              {/* 左側：機能紹介 */}
              <Box
                sx={{
                  flex: 1,
                  p: 6,
                  background: 'linear-gradient(145deg, #fff5f5 0%, #ffe9d5 100%)',
                  display: { xs: 'none', md: 'flex' },
                  flexDirection: 'column',
                  justifyContent: 'center',
                  position: 'relative',
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
                        rotate: [0, 10, -10, 10, 0],
                        scale: [1, 1.1, 1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 5, 
                        repeat: Infinity,
                        repeatDelay: 2
                      }}
                      style={{ display: 'inline-block' }}
                    >
                      <Celebration sx={{ fontSize: 60, color: '#FF6B6B' }} />
                    </motion.div>
                  </Box>
                  <Typography
                    variant="h3"
                    gutterBottom
                    fontWeight={700}
                    sx={{
                      background: 'linear-gradient(45deg, #FF6B6B, #FFE66D)',
                      backgroundClip: 'text',
                      textFillColor: 'transparent',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    冒険を始めよう！
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                    新しい学びの世界があなたを待っています
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

              {/* 右側：登録フォーム */}
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
                          background: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 16px',
                          boxShadow: '0 10px 40px rgba(255, 107, 107, 0.3)',
                          position: 'relative',
                        }}
                      >
                        <RocketIcon sx={{ fontSize: 40, color: 'white' }} />
                        <Box
                          sx={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            background: '#4CAF50',
                            borderRadius: '50%',
                            width: 24,
                            height: 24,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <AutoAwesome sx={{ fontSize: 14, color: 'white' }} />
                        </Box>
                      </Box>
                    </motion.div>
                    <Typography variant="h4" gutterBottom fontWeight={700}>
                      アカウントを作成
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      無料で始められます
                    </Typography>
                  </Box>

                  {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                      {error}
                    </Alert>
                  )}

                  {successMessage && (
                    <Alert 
                      severity="success" 
                      sx={{ 
                        mb: 2,
                        fontSize: '1rem',
                        fontWeight: 500
                      }}
                    >
                      {successMessage}
                    </Alert>
                  )}

                  <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <TextField
                      fullWidth
                      label="メールアドレス"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
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
                      label="ユーザー名（オプション）"
                      name="username"
                      value={formData.username}
                      onChange={handleChange}
                      disabled={isLoading}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Box>
                      <TextField
                        fullWidth
                        label="パスワード"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={handleChange}
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
                      
                      {formData.password && (
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={getPasswordStrengthScore()} 
                              color={getPasswordStrengthColor() as any}
                              sx={{ flex: 1, height: 6, borderRadius: 3 }}
                            />
                            {getPasswordStrengthText() && (
                              <Typography variant="caption" fontWeight={500}>
                                {getPasswordStrengthText()}
                              </Typography>
                            )}
                          </Box>
                          
                          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5, mt: 1 }}>
                            {[
                              { check: passwordStrength.hasMinLength, text: '8文字以上' },
                              { check: passwordStrength.hasUpperCase, text: '大文字' },
                              { check: passwordStrength.hasNumber, text: '数字' },
                              { check: passwordStrength.hasSpecialChar, text: '特殊文字' }
                            ].map((item, index) => (
                              <Box
                                key={index}
                                sx={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: 0.5,
                                  color: item.check ? 'success.main' : 'text.secondary',
                                  fontSize: '0.75rem',
                                }}
                              >
                                {item.check ? (
                                  <CheckIcon sx={{ fontSize: 14 }} />
                                ) : (
                                  <CloseIcon sx={{ fontSize: 14 }} />
                                )}
                                <Typography variant="caption">{item.text}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>

                    <TextField
                      fullWidth
                      label="パスワード（確認）"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={isLoading}
                      error={formData.confirmPassword !== '' && formData.password !== formData.confirmPassword}
                      helperText={
                        formData.confirmPassword !== '' && formData.password !== formData.confirmPassword
                          ? 'パスワードが一致しません'
                          : formData.confirmPassword !== '' && formData.password === formData.confirmPassword
                          ? 'パスワードが一致しました'
                          : ''
                      }
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      required
                    />

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={isLoading || successMessage !== null}
                      sx={{
                        mt: 2,
                        py: 1.8,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        background: 'linear-gradient(45deg, #FF6B6B, #FFE66D)',
                        boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #FF5252, #FFD93D)',
                          boxShadow: '0 6px 20px rgba(255, 107, 107, 0.4)',
                          transform: 'translateY(-2px)',
                        },
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isLoading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                          <RocketIcon />
                          今すぐ始める
                        </Box>
                      )}
                    </Button>

                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        すでにアカウントをお持ちの方は{' '}
                        <Link
                          to="/auth/login-test"
                          style={{
                            color: '#FF6B6B',
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          ログイン
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

export default SupabaseRegisterPage;