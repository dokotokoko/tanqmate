/**
 * ソーシャルログイン後のコールバック処理ページ
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingScreen from '../components/LoadingScreen';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('認証情報を確認中...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URLパラメータからコードを取得
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setStatus('error');
          setMessage(errorDescription || '認証に失敗しました');
          setTimeout(() => navigate('/auth/login'), 3000);
          return;
        }

        if (!code) {
          setStatus('error');
          setMessage('認証コードが見つかりません');
          setTimeout(() => navigate('/auth/login'), 3000);
          return;
        }

        // 認証コードをトークンと交換
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError || !data.session) {
          setStatus('error');
          setMessage('認証に失敗しました');
          setTimeout(() => navigate('/auth/login'), 3000);
          return;
        }

        // セッションを保存
        localStorage.setItem('supabase_session', JSON.stringify(data.session));
        localStorage.setItem('supabase_access_token', data.session.access_token);

        setStatus('success');
        setMessage('ログインに成功しました！');

        // ダッシュボードへリダイレクト
        setTimeout(() => navigate('/dashboard'), 1500);

      } catch (err: any) {
        console.error('Auth callback error:', err);
        setStatus('error');
        setMessage('認証処理中にエラーが発生しました');
        setTimeout(() => navigate('/auth/login'), 3000);
      }
    };

    handleAuthCallback();
  }, [searchParams, navigate]);

  if (status === 'loading') {
    return <LoadingScreen message={message} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
        {status === 'success' ? (
          <>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">認証完了</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="animate-pulse text-sm text-gray-500">
              ダッシュボードへ移動中...
            </div>
          </>
        ) : (
          <>
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <ErrorIcon className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">認証エラー</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="animate-pulse text-sm text-gray-500">
              ログインページへ戻ります...
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallbackPage;