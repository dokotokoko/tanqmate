import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { getProfile, refreshSession } = useAuthStore();

  console.log('[AuthCallbackPage] Mounted, URL:', window.location.href);
  console.log('[AuthCallbackPage] Hash:', window.location.hash);
  console.log('[AuthCallbackPage] Search:', window.location.search);

  useEffect(() => {
    const resolveDestination = async (userId: string, isRecovery: boolean) => {
      if (isRecovery) {
        navigate('/password-reset/new', { replace: true });
        return;
      }

      const profile = await getProfile();
      if (!profile?.name || (!profile?.school_id && !profile?.school_code_locked)) {
        navigate('/onboarding', { replace: true });
        return;
      }

      navigate(profile.role === 'teacher' ? '/teacher' : '/dashboard', { replace: true });
    };

    const handleCallback = async () => {
      console.log('[AuthCallbackPage] Starting callback handling...');
      try {
        const params = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const type = hashParams.get('type') || params.get('type');
        const code = params.get('code');
        const errorType = params.get('error');
        const errorDescription = params.get('error_description');
        
        console.log('[AuthCallbackPage] Parsed params:', {
          type,
          errorType,
          hashParams: Object.fromEntries(hashParams),
          queryParams: Object.fromEntries(params)
        });
        
        // エラーがある場合
        if (errorType) {
          setError(errorDescription || '認証エラーが発生しました');
          setTimeout(() => navigate('/signin'), 3000);
          return;
        }

        const isRecovery = type === 'recovery';
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (code) {
          const {
            data: { session },
            error,
          } = await supabase.auth.exchangeCodeForSession(code);

          if (error || !session) {
            throw error || new Error('認証セッションの確立に失敗しました');
          }

          await refreshSession();
          await resolveDestination(session.user.id, isRecovery);
          return;
        }

        if (access_token && refresh_token) {
          const {
            data: { session },
            error,
          } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (error || !session) {
            throw error || new Error('認証セッションの設定に失敗しました');
          }

          await refreshSession();
          await resolveDestination(session.user.id, isRecovery);
          return;
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          navigate('/signin', { replace: true });
          return;
        }

        await resolveDestination(session.user.id, isRecovery);
      } catch (err) {
        console.error('コールバック処理エラー:', err);
        setError('予期しないエラーが発生しました');
        setTimeout(() => navigate('/signin'), 3000);
      }
    };

    handleCallback();
  }, [navigate, getProfile, refreshSession, location]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : (
        <>
          <CircularProgress size={60} sx={{ color: 'white', mb: 3 }} />
          <Typography variant="h5" sx={{ color: 'white', mb: 1 }}>
            認証処理中...
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            しばらくお待ちください
          </Typography>
        </>
      )}
    </Box>
  );
};

export default AuthCallbackPage;
