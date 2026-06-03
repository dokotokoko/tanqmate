import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircleOutline,
  Explore,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { borderRadius, colors, shadows } from '../styles/design-system';
import { useAuthStore } from '../stores/authStore';
import { getPostOnboardingRoute } from '../utils/onboardingGuards';

const SignUpCompletePage = () => {
  const navigate = useNavigate();
  const profile = useAuthStore((state) => state.profile);
  const getProfile = useAuthStore((state) => state.getProfile);
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    setIsLoading(true);
    const latestProfile = await getProfile();
    setIsLoading(false);
    navigate(getPostOnboardingRoute(latestProfile || profile));
  };

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
              onClick={handleStart}
              disabled={isLoading}
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
              {isLoading ? <CircularProgress size={24} color="inherit" /> : '探Qメイトをはじめる'}
            </Button>
          </Paper>
        </motion.div>
      </Box>
    </Container>
  );
};

export default SignUpCompletePage;
