import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  Stack,
  Paper,
  Container,
  Stepper,
  Step,
  StepLabel,
  IconButton,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motion, AnimatePresence } from 'framer-motion';

const steps = ['探究テーマを入力', '興味を選択', 'やっていて楽しいことを選択'];

const technologyTags = [
  'AI・機械学習', 'ロボティクス', 'バイオテクノロジー', 
  'エネルギー技術', '宇宙開発', 'IoT・スマートシティ'
];

const socialIssueTags = [
  '環境問題', '教育格差', '少子高齢化', 
  '食糧問題', 'ジェンダー平等', '地域活性化'
];

const vibesActions = [
  { id: 'compete', label: '勝負に勝つ', icon: '🏆' },
  { id: 'move', label: '体を動かす', icon: '🏃' },
  { id: 'listen', label: '人の話を聞く', icon: '👂' },
  { id: 'music', label: '音楽を聞く', icon: '🎵' },
  { id: 'read', label: '読書', icon: '📚' },
  { id: 'study', label: '勉強', icon: '📝' },
];

interface OnboardingData {
  theme: string;
  technologyTags: string[];
  socialIssueTags: string[];
  vibesActions: string[];
}

export default function VibesTanqOnboarding() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    theme: '',
    technologyTags: [],
    socialIssueTags: [],
    vibesActions: [],
  });

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      // 最後のステップの場合、データを保存してダッシュボードへ遷移
      handleSubmit();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('auth-token');
      if (!token) {
        console.error('認証トークンが見つかりません');
        return;
      }
      // APIに登録データを送信
      const response = await fetch(`${apiBaseUrl}/vibes-tanq/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          theme_text: data.theme,
          interest_tags: [...data.technologyTags, ...data.socialIssueTags],
          vibes_actions: data.vibesActions,
        }),
      });

      if (response.ok) {
        navigate('/vibes-tanq/dashboard');
      } else {
        console.error('Registration failed:', response.statusText);
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleTagToggle = (tag: string, category: 'technologyTags' | 'socialIssueTags') => {
    setData((prev) => {
      const currentTags = prev[category];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter((t) => t !== tag)
        : [...currentTags, tag];
      
      return {
        ...prev,
        [category]: newTags.slice(0, 3), // 最大3つまで
      };
    });
  };

  const handleVibesToggle = (actionId: string) => {
    setData((prev) => {
      const currentActions = prev.vibesActions;
      const newActions = currentActions.includes(actionId)
        ? currentActions.filter((a) => a !== actionId)
        : [...currentActions, actionId];
      
      return {
        ...prev,
        vibesActions: newActions,
      };
    });
  };

  const isStepValid = () => {
    switch (activeStep) {
      case 0:
        return data.theme.trim().length > 0;
      case 1:
        return data.technologyTags.length > 0 || data.socialIssueTags.length > 0;
      case 2:
        return data.vibesActions.length > 0;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
              1. あなたが探究したいと思っているテーマを教えてね
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={4}
              placeholder="疑問形の文章で書いてみよう ex. なぜ〜だろう？、〜とは？、〜してみたらどうか？"
              value={data.theme}
              onChange={(e) => setData({ ...data, theme: e.target.value })}
              sx={{
                backgroundColor: 'white',
                borderRadius: 2,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        );

      case 1:
        return (
          <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              2. あなたが興味を持っていることを教えてね
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                テクノロジー
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {technologyTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onClick={() => handleTagToggle(tag, 'technologyTags')}
                    color={data.technologyTags.includes(tag) ? 'primary' : 'default'}
                    variant={data.technologyTags.includes(tag) ? 'filled' : 'outlined'}
                    sx={{
                      fontSize: '1rem',
                      padding: '8px',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                社会課題
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {socialIssueTags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onClick={() => handleTagToggle(tag, 'socialIssueTags')}
                    color={data.socialIssueTags.includes(tag) ? 'primary' : 'default'}
                    variant={data.socialIssueTags.includes(tag) ? 'filled' : 'outlined'}
                    sx={{
                      fontSize: '1rem',
                      padding: '8px',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'scale(1.05)',
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
            <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
              3. 何をやることが楽しい/好きですか？
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
              {vibesActions.map((action) => (
                <motion.div
                  key={action.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Paper
                    elevation={data.vibesActions.includes(action.id) ? 4 : 1}
                    onClick={() => handleVibesToggle(action.id)}
                    sx={{
                      p: 3,
                      cursor: 'pointer',
                      backgroundColor: data.vibesActions.includes(action.id) 
                        ? 'primary.light' 
                        : 'grey.100',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: data.vibesActions.includes(action.id) 
                          ? 'primary.main' 
                          : 'grey.200',
                      },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <Typography variant="h3" sx={{ mb: 1 }}>{action.icon}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {action.label}
                      </Typography>
                    </Box>
                  </Paper>
                </motion.div>
              ))}
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ width: '100%' }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel
                StepIconProps={{
                  sx: {
                    color: index === activeStep ? 'primary.main' : 'grey.400',
                    '&.Mui-completed': {
                      color: 'success.main',
                    },
                  },
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={handleBack}
            disabled={activeStep === 0}
            startIcon={<ArrowBackIcon />}
            sx={{ visibility: activeStep === 0 ? 'hidden' : 'visible' }}
          >
            戻る
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isStepValid()}
            endIcon={activeStep === steps.length - 1 ? <CheckCircleIcon /> : <ArrowForwardIcon />}
          >
            {activeStep === steps.length - 1 ? '完了' : '次へ'}
          </Button>
        </Box>
      </Box>
    </Container>
  );
}