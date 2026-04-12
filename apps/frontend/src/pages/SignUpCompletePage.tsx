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
import { borderRadius, colors, shadows } from '../styles/design-system';

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
          backgroundColor: colors.background.default,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Paper elevation={0} sx={{ p: 5, textAlign: 'center', backgroundColor: colors.background.paper, border: `1px solid ${colors.border.soft}`, borderRadius: borderRadius.card, boxShadow: shadows.card.default }}>
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
                backgroundColor: colors.accentWarm.main,
                color: colors.text.inverse,
                '&:hover': {
                  backgroundColor: colors.accentWarm.hover,
                  boxShadow: shadows.accent,
                },
                borderRadius: borderRadius.button,
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
