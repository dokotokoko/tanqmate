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
  Explore,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const SignUpCompletePage = () => {
  const navigate = useNavigate();

  return (
    <Container component="main" maxWidth="sm">
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
          <Paper elevation={3} sx={{ p: 5, textAlign: 'center' }}>
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
              variant="h4"
              sx={{
                fontWeight: 'bold',
                mb: 2,
              }}
            >
              登録が完了しました！
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              探Qメイトへようこそ！<br />
              さっそく探究学習を始めましょう
            </Typography>

            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Explore />}
              onClick={() => navigate('/student')}
              sx={{
                background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(135deg, #F57C00 0%, #E65100 100%)',
                },
              }}
            >
              探Qメイトをはじめる
            </Button>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default SignUpCompletePage;