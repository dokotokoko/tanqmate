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
  Link,
} from '@mui/material';
import {
  Email,
  ArrowBack,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuthStoreV2 } from '../stores/authStoreV2';

const PasswordResetPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  
  const { resetPassword, isLoading, error, clearError } = useAuthStoreV2();

  const validateEmail = () => {
    if (!email) {
      setEmailError('メールアドレスを入力してください');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('有効なメールアドレスを入力してください');
      return false;
    }
    setEmailError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateEmail()) {
      return;
    }

    const result = await resetPassword(email);
    if (result.success) {
      setEmailSent(true);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (emailError) {
      setEmailError('');
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 3,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Paper elevation={3} sx={{ p: 4 }}>
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
                  background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                パスワードリセット
              </Typography>
              {!emailSent && (
                <Typography variant="body2" color="text.secondary" align="center">
                  登録したメールアドレスを入力してください。<br />
                  パスワード再設定用のリンクをお送りします。
                </Typography>
              )}
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error.message}
              </Alert>
            )}

            {emailSent ? (
              <Box>
                <Alert severity="success" sx={{ mb: 3 }}>
                  パスワード再設定用のメールを送信しました。
                  メールをご確認ください。
                </Alert>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  メールが届かない場合は、迷惑メールフォルダをご確認ください。
                </Typography>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/signin')}
                >
                  ログインページへ戻る
                </Button>
              </Box>
            ) : (
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
                  value={email}
                  onChange={handleInputChange}
                  error={!!emailError}
                  helperText={emailError}
                  InputProps={{
                    startAdornment: <Email color="action" sx={{ mr: 1 }} />,
                  }}
                />
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{
                    mt: 3,
                    mb: 2,
                    background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                    },
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? <CircularProgress size={24} /> : '送信'}
                </Button>
                <Box sx={{ textAlign: 'center' }}>
                  <Link
                    component={RouterLink}
                    to="/signin"
                    variant="body2"
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <ArrowBack sx={{ mr: 0.5, fontSize: 20 }} />
                    ログインページへ戻る
                  </Link>
                </Box>
              </Box>
            )}
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default PasswordResetPage;