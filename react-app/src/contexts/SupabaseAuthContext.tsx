/**
 * Supabase Auth Context Provider
 * 新しい認証システムのコンテキスト
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabaseAuthApi } from '../lib/supabaseAuthApi';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: AuthError | null;
  signUp: (email: string, password: string, username?: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>;
  signInWithProvider: (provider: 'google' | 'github') => Promise<{ url: string | null; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
};

interface SupabaseAuthProviderProps {
  children: ReactNode;
}

export const SupabaseAuthProvider: React.FC<SupabaseAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // セッションの初期化と復元
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // ローカルストレージからセッションを復元
        const storedSession = localStorage.getItem('supabase_session');
        if (storedSession) {
          const sessionData = JSON.parse(storedSession);
          
          // トークンの有効期限をチェック
          const expiresAt = sessionData.expires_at || sessionData.expires_in + Date.now() / 1000;
          if (expiresAt > Date.now() / 1000) {
            setSession(sessionData);
            
            // ユーザー情報を取得
            const { data: userData, error } = await supabaseAuthApi.getCurrentUser(sessionData.access_token);
            if (!error && userData) {
              setUser(userData);
            }
          } else {
            // トークンが期限切れの場合、リフレッシュを試みる
            await refreshSession();
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // セッションを保存
  const saveSession = (session: Session | null) => {
    if (session) {
      localStorage.setItem('supabase_session', JSON.stringify(session));
      localStorage.setItem('supabase_access_token', session.access_token);
    } else {
      localStorage.removeItem('supabase_session');
      localStorage.removeItem('supabase_access_token');
    }
  };

  // サインアップ
  const signUp = async (email: string, password: string, username?: string) => {
    setError(null);
    try {
      const { data, error } = await supabaseAuthApi.signUp(email, password, username);
      
      if (error) {
        setError(error);
        return { user: null, error };
      }

      if (data) {
        setUser(data.user);
        setSession(data.session);
        saveSession(data.session);
        return { user: data.user, error: null };
      }

      return { user: null, error: null };
    } catch (err: any) {
      const authError: AuthError = {
        message: err.message || 'サインアップに失敗しました',
        status: err.status || 500,
        name: 'AuthError'
      };
      setError(authError);
      return { user: null, error: authError };
    }
  };

  // サインイン
  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error } = await supabaseAuthApi.signIn(email, password);
      
      if (error) {
        setError(error);
        return { user: null, error };
      }

      if (data) {
        setUser(data.user);
        setSession(data.session);
        saveSession(data.session);
        return { user: data.user, error: null };
      }

      return { user: null, error: null };
    } catch (err: any) {
      const authError: AuthError = {
        message: err.message || 'サインインに失敗しました',
        status: err.status || 500,
        name: 'AuthError'
      };
      setError(authError);
      return { user: null, error: authError };
    }
  };

  // ソーシャルプロバイダーでサインイン
  const signInWithProvider = async (provider: 'google' | 'github') => {
    setError(null);
    try {
      const { data, error } = await supabaseAuthApi.signInWithProvider(provider);
      
      if (error) {
        setError(error);
        return { url: null, error };
      }

      return { url: data?.url || null, error: null };
    } catch (err: any) {
      const authError: AuthError = {
        message: err.message || 'プロバイダー認証に失敗しました',
        status: err.status || 500,
        name: 'AuthError'
      };
      setError(authError);
      return { url: null, error: authError };
    }
  };

  // サインアウト
  const signOut = async () => {
    setError(null);
    try {
      const { error } = await supabaseAuthApi.signOut();
      
      if (error) {
        setError(error);
        return { error };
      }

      setUser(null);
      setSession(null);
      saveSession(null);
      return { error: null };
    } catch (err: any) {
      const authError: AuthError = {
        message: err.message || 'サインアウトに失敗しました',
        status: err.status || 500,
        name: 'AuthError'
      };
      setError(authError);
      return { error: authError };
    }
  };

  // パスワードリセット
  const resetPassword = async (email: string) => {
    setError(null);
    try {
      const { error } = await supabaseAuthApi.resetPassword(email);
      
      if (error) {
        setError(error);
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      const authError: AuthError = {
        message: err.message || 'パスワードリセットに失敗しました',
        status: err.status || 500,
        name: 'AuthError'
      };
      setError(authError);
      return { error: authError };
    }
  };

  // パスワード更新
  const updatePassword = async (newPassword: string) => {
    setError(null);
    try {
      const { error } = await supabaseAuthApi.updatePassword(newPassword);
      
      if (error) {
        setError(error);
        return { error };
      }

      return { error: null };
    } catch (err: any) {
      const authError: AuthError = {
        message: err.message || 'パスワード更新に失敗しました',
        status: err.status || 500,
        name: 'AuthError'
      };
      setError(authError);
      return { error: authError };
    }
  };

  // セッションのリフレッシュ
  const refreshSession = async () => {
    if (!session?.refresh_token) return;

    try {
      const { data, error } = await supabaseAuthApi.refreshToken(session.refresh_token);
      
      if (!error && data) {
        setSession(data.session);
        setUser(data.user);
        saveSession(data.session);
      }
    } catch (err) {
      console.error('Session refresh error:', err);
      // リフレッシュに失敗した場合はサインアウト
      await signOut();
    }
  };

  // トークンの自動リフレッシュ
  useEffect(() => {
    if (!session) return;

    // トークンの有効期限の5分前にリフレッシュ
    const expiresAt = (session.expires_at || session.expires_in + Date.now() / 1000) * 1000;
    const refreshTime = expiresAt - Date.now() - 5 * 60 * 1000;

    if (refreshTime > 0) {
      const timer = setTimeout(() => {
        refreshSession();
      }, refreshTime);

      return () => clearTimeout(timer);
    }
  }, [session]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};