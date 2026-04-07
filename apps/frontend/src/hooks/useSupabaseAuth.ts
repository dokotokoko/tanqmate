import { useEffect, useRef } from 'react';
import { useAuthStoreV2 } from '../stores/authStoreV2';

/**
 * Supabase認証状態を管理するカスタムフック
 * 
 * 機能:
 * - 認証状態の監視
 * - セッションの自動更新
 * - エラーハンドリング
 * - アクセストークンの管理
 */
export const useSupabaseAuth = () => {
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    user,
    session,
    isLoading,
    isInitialized,
    error,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshSession,
    initialize,
    clearError,
    isAuthenticated,
    getAccessToken,
  } = useAuthStoreV2();

  // セッションの自動更新を設定
  useEffect(() => {
    if (!isAuthenticated()) {
      return;
    }

    const setupSessionRefresh = () => {
      // 既存のタイマーをクリア
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }

      // 50分ごとにセッションを更新（Supabaseのデフォルトは1時間）
      refreshIntervalRef.current = setInterval(async () => {
        if (isAuthenticated()) {
          console.log('セッション自動更新を実行中...');
          const success = await refreshSession();
          if (!success) {
            console.warn('セッション更新に失敗しました。再ログインが必要です。');
            // 必要に応じてログアウト処理を実行
            await signOut();
          }
        }
      }, 50 * 60 * 1000); // 50分
    };

    // 初期設定
    setupSessionRefresh();

    // セッション変更時に再設定
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, refreshSession, signOut]);

  // ページの可視性変更時にセッション状態を確認
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isAuthenticated()) {
        // ページが再び表示されたときにセッション状態を確認
        const success = await refreshSession();
        if (!success) {
          console.warn('セッションが無効になっています');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, refreshSession]);

  // ネットワーク接続回復時にセッション状態を確認
  useEffect(() => {
    const handleOnline = async () => {
      if (isAuthenticated()) {
        console.log('ネットワーク接続が回復しました。セッション状態を確認中...');
        await refreshSession();
      }
    };

    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated, refreshSession]);

  // 認証が必要なAPIリクエスト用のヘルパー
  const getAuthHeaders = () => {
    const token = getAccessToken();
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    } : {
      'Content-Type': 'application/json',
    };
  };

  // メールとパスワードによるサインイン（バリデーション付き）
  const signInWithEmailPassword = async (email: string, password: string) => {
    if (!email.trim() || !password.trim()) {
      return {
        success: false,
        error: 'メールアドレスとパスワードを入力してください',
      };
    }

    if (!email.includes('@')) {
      return {
        success: false,
        error: '正しいメールアドレスを入力してください',
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'パスワードは6文字以上で入力してください',
      };
    }

    return await signIn(email, password);
  };

  // メールとパスワードによるサインアップ（バリデーション付き）
  const signUpWithEmailPassword = async (email: string, password: string, confirmPassword: string, username?: string) => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      return {
        success: false,
        error: 'すべての項目を入力してください',
      };
    }

    if (!email.includes('@')) {
      return {
        success: false,
        error: '正しいメールアドレスを入力してください',
      };
    }

    if (password.length < 6) {
      return {
        success: false,
        error: 'パスワードは6文字以上で入力してください',
      };
    }

    if (password !== confirmPassword) {
      return {
        success: false,
        error: 'パスワードが一致しません',
      };
    }

    if (username && username.trim().length < 2) {
      return {
        success: false,
        error: 'ユーザー名は2文字以上で入力してください',
      };
    }

    return await signUp(email, password, username);
  };

  // パスワードリセット（バリデーション付き）
  const resetPasswordForEmail = async (email: string) => {
    if (!email.trim()) {
      return {
        success: false,
        error: 'メールアドレスを入力してください',
      };
    }

    if (!email.includes('@')) {
      return {
        success: false,
        error: '正しいメールアドレスを入力してください',
      };
    }

    return await resetPassword(email);
  };

  // ユーザー情報取得ヘルパー
  const getUserInfo = () => {
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email || '',
      username: user.user_metadata?.username || user.email?.split('@')[0] || '',
      fullName: user.user_metadata?.full_name || '',
      emailConfirmed: !!user.email_confirmed_at,
      createdAt: user.created_at ? new Date(user.created_at) : null,
      legacyUserId: user.app_metadata?.legacy_user_id || null,
    };
  };

  // 初期化の強制実行（リトライ機能付き）
  const retryInitialize = async (maxRetries = 3) => {
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        await initialize();
        if (isInitialized) {
          return true;
        }
      } catch (error) {
        console.error(`認証初期化エラー (試行 ${retryCount + 1}/${maxRetries}):`, error);
      }
      
      retryCount++;
      
      if (retryCount < maxRetries) {
        // 指数バックオフで再試行
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }
    
    return false;
  };

  return {
    // 状態
    user: getUserInfo(),
    session,
    isLoading,
    isInitialized,
    error,
    isAuthenticated: isAuthenticated(),
    
    // アクション（バリデーション付き）
    signIn: signInWithEmailPassword,
    signUp: signUpWithEmailPassword,
    signOut,
    resetPassword: resetPasswordForEmail,
    
    // ユーティリティ
    clearError,
    refreshSession,
    getAuthHeaders,
    getAccessToken,
    retryInitialize,
    
    // 元のアクション（バリデーションなし）
    originalActions: {
      signIn: signIn,
      signUp: signUp,
      resetPassword: resetPassword,
    },
  };
};

export default useSupabaseAuth;