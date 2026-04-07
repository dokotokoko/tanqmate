import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { supabase } from '../lib/supabase';
import { useAuthStoreV2 } from '../stores/authStoreV2';

const AuthCallbackPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const { getProfile, refreshSession } = useAuthStoreV2();

  console.log('[AuthCallbackPage] Mounted, URL:', window.location.href);
  console.log('[AuthCallbackPage] Hash:', window.location.hash);
  console.log('[AuthCallbackPage] Search:', window.location.search);

  useEffect(() => {
    const handleCallback = async () => {
      console.log('[AuthCallbackPage] Starting callback handling...');
      try {
        // URLパラメータとハッシュフラグメントから情報を取得
        const params = new URLSearchParams(location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        // typeはハッシュフラグメントまたはクエリパラメータから取得
        const type = hashParams.get('type') || params.get('type');
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
        
        // パスワードリセットの場合
        if (type === 'recovery') {
          console.log('[AuthCallbackPage] Recovery type detected');
          
          // URLハッシュからトークンまたはOTPコードを取得
          const access_token = hashParams.get('access_token');
          const refresh_token = hashParams.get('refresh_token');
          const token = hashParams.get('token'); // OTPトークンの可能性
          
          console.log('[AuthCallbackPage] Recovery params:', {
            access_token: access_token ? `${access_token.substring(0, 20)}...` : null,
            refresh_token: refresh_token ? `${refresh_token.substring(0, 20)}...` : null,
            token: token
          });
          
          // OTP方式の場合（6桁のコード）
          if (token && token.length === 6 && /^\d+$/.test(token)) {
            console.log('[AuthCallbackPage] OTP code detected, redirecting to password reset with code');
            // OTPコードを使用してパスワードリセットページへ
            navigate('/password-reset/new', { state: { otp: token, email: hashParams.get('email') || '' } });
            return;
          }
          
          // Magic Link方式の場合（JWTトークン）
          if (access_token && access_token.startsWith('eyJ')) {
            try {
              // セッションを設定してパスワード変更ページへ
              const { data, error } = await supabase.auth.setSession({
                access_token,
                refresh_token: refresh_token || ''
              });
              
              if (error) {
                console.error('[AuthCallbackPage] Failed to set session:', error);
                setError(`セッションの設定に失敗しました: ${error.message}`);
                setTimeout(() => navigate('/signin'), 3000);
                return;
              }
              
              console.log('[AuthCallbackPage] Session set successfully, navigating to password reset page');
              navigate('/password-reset/new');
              return;
            } catch (err) {
              console.error('[AuthCallbackPage] Error setting session:', err);
              setError('セッションの設定中にエラーが発生しました');
              setTimeout(() => navigate('/signin'), 3000);
              return;
            }
          }
          
          // トークンが見つからない、または認識できない形式
          console.error('[AuthCallbackPage] No valid token found in recovery URL');
          setError('有効なリカバリートークンが見つかりません');
          setTimeout(() => navigate('/signin'), 3000);
          return;
        }
        
        // 通常の認証コールバック（OAuth、マジックリンクなど）
        // hashParamsは既に上で定義済みなので、recovery以外の場合のトークンを取得
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        
        if (access_token && refresh_token) {
          // セッションを設定
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          
          if (error) {
            console.error('認証エラー:', error);
            setError('認証に失敗しました。もう一度お試しください。');
            setTimeout(() => navigate('/signin'), 3000);
            return;
          }
          
          if (session) {
            // セッションをリフレッシュ
            await refreshSession();
            
            // プロフィールのチェック
            const { data: profile } = await supabase
              .from('profiles')
              .select('school_id, school_code_locked, name, role')
              .eq('id', session.user.id)
              .single();
            
            // 名前が未設定の場合はonboardingへ
            if (!profile?.name) {
              navigate('/onboarding');
            } 
            // 学校コードが未設定かつロックされていない場合もonboardingへ  
            else if (!profile?.school_id && !profile?.school_code_locked) {
              navigate('/onboarding');
            } else {
              // roleに基づいて適切なダッシュボードへリダイレクト
              if (profile?.role === 'teacher') {
                navigate('/teacher');
              } else {
                navigate('/student');
              }
            }
          }
        } else {
          // URLからセッションを取得できない場合は、既存のセッションをチェック
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (session) {
            // 既存セッションがある場合、roleを確認
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();
            
            if (profile?.role === 'teacher') {
              navigate('/teacher');
            } else {
              navigate('/student');
            }
          } else {
            // セッションがない場合はログインページへ
            navigate('/signin');
          }
        }
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