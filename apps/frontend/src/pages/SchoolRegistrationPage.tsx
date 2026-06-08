import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  School,
  CheckCircle,
  Person,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';

const SchoolRegistrationPage = () => {
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [schoolCode, setSchoolCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [schoolInfo, setSchoolInfo] = useState<{ id: string; name: string } | null>(null);
  const [existingInterests, setExistingInterests] = useState<string[]>([]);
  useEffect(() => {
    // プロフィール情報を確認
    void checkProfile();
  }, [user]);

  const checkProfile = async () => {
    if (!user) return;
    
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const data = payload.profile;
      if (data) {
        setExistingInterests(Array.isArray(data.interests) ? data.interests : []);
        // 既に学校が設定されている場合はダッシュボードへ
        if (data.school_id) {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error('Profile check error:', err);
    }
  };

  const verifySchoolCode = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/auth/verify-school-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ school_code: schoolCode }),
      });

      if (!response.ok) {
        setError('学校コードが見つかりませんでした。正しいコードを入力してください。');
        setIsLoading(false);
        return;
      }

      const payload = await response.json();
      
      setSchoolInfo(payload.school);
      setActiveStep(1);
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async () => {
    if (!user || !schoolInfo) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          interests: existingInterests,
          school_code: schoolCode,
        }),
      });

      if (!response.ok) {
        setError('プロフィールの更新に失敗しました。');
        setIsLoading(false);
        return;
      }
      
      setActiveStep(2);
      
      // 3秒後にダッシュボードへリダイレクト
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      
    } catch (err) {
      setError('エラーが発生しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    {
      label: '学校コード入力',
      content: (
        <Box>
          <Typography variant="body1" sx={{ mb: 3 }}>
            学校から提供された登録コードを入力してください。
          </Typography>
          
          <TextField
            fullWidth
            label="学校コード"
            value={schoolCode}
            onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
            placeholder="例: TANQ2025"
            disabled={isLoading}
            sx={{ mb: 3 }}
            inputProps={{ style: { textTransform: 'uppercase' } }}
          />
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          
          <Button
            variant="contained"
            onClick={verifySchoolCode}
            disabled={isLoading || !schoolCode}
            startIcon={isLoading ? <CircularProgress size={20} /> : <School />}
            sx={{
              background: 'linear-gradient(45deg, #FF9800, #F57C00)',
              '&:hover': {
                background: 'linear-gradient(45deg, #FFB74D, #FF6F00)',
              },
            }}
          >
            確認
          </Button>
        </Box>
      ),
    },
    {
      label: '学校情報確認',
      content: (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            学校コードが確認されました！
          </Alert>
          
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                登録する学校
              </Typography>
              <Typography variant="body1" color="primary">
                {schoolInfo?.name}
              </Typography>
            </CardContent>
          </Card>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            この学校に生徒として登録されます。
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              onClick={() => {
                setActiveStep(0);
                setSchoolInfo(null);
                setError('');
              }}
            >
              戻る
            </Button>
            <Button
              variant="contained"
              onClick={updateProfile}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : <Person />}
              sx={{
                background: 'linear-gradient(45deg, #FF9800, #F57C00)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #FFB74D, #FF6F00)',
                },
              }}
            >
              登録を完了
            </Button>
          </Box>
        </Box>
      ),
    },
    {
      label: '登録完了',
      content: (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 3 }} />
          </motion.div>
          
          <Typography variant="h4" gutterBottom>
            登録が完了しました！
          </Typography>
          
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            探Qメイトへようこそ！
          </Typography>
          
          <Typography variant="body2" color="text.secondary">
            3秒後に自動的にダッシュボードへ移動します...
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <CircularProgress />
          </Box>
        </Box>
      ),
    },
  ];

  // ログインしていない場合はログインページへ
  if (!user) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Alert severity="warning">
            ログインが必要です。
          <Button onClick={() => navigate('/signin')}>
            ログインページへ
          </Button>
        </Alert>
      </Box>
    );
  }

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
      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={10}
            sx={{
              p: 4,
              borderRadius: 3,
              background: 'rgba(255,255,255,0.98)',
            }}
          >
            <Typography variant="h4" gutterBottom fontWeight={600} textAlign="center" sx={{ mb: 4 }}>
              🏫 学校登録
            </Typography>
            
            <Stepper activeStep={activeStep} orientation="vertical">
              {steps.map((step) => (
                <Step key={step.label}>
                  <StepLabel>{step.label}</StepLabel>
                  <StepContent>
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      {step.content}
                    </motion.div>
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default SchoolRegistrationPage;
