import React from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
} from '@mui/material';
import {
  CheckCircleOutline,
  Login,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const PasswordResetCompletePage = () => {
  const navigate = useNavigate();

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
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <CheckCircleOutline
                sx={{
                  fontSize: 80,
                  color: 'success.main',
                  mb: 2,
                }}
              />
            </motion.div>

            <Typography
              component="h1"
              variant="h5"
              sx={{
                fontWeight: 'bold',
                mb: 2,
              }}
            >
              パスワードの再設定が<br />完了しました
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              新しいパスワードでログインしてください
            </Typography>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Login />}
              onClick={() => navigate('/signin')}
              sx={{
                background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                },
              }}
            >
              ログインページへ戻る
            </Button>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default PasswordResetCompletePage;