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
import { borderRadius, colors, shadows } from '../styles/design-system';

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
          backgroundColor: colors.background.default,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', backgroundColor: colors.background.paper, border: `1px solid ${colors.border.soft}`, borderRadius: borderRadius.card, boxShadow: shadows.card.default }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <CheckCircleOutline
              sx={{
                fontSize: 80,
                color: colors.success.main,
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
                backgroundColor: colors.accentWarm.main,
                color: colors.text.inverse,
                '&:hover': {
                  backgroundColor: colors.accentWarm.hover,
                  boxShadow: shadows.accent,
                },
                borderRadius: borderRadius.button,
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
