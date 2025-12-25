/**
 * Supabase Auth対応の保護されたルートコンポーネント
 */
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSupabaseAuth } from '../contexts/SupabaseAuthContext';
import LoadingScreen from './LoadingScreen';

interface SupabaseProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallbackPath?: string;
}

const SupabaseProtectedRoute: React.FC<SupabaseProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  fallbackPath = '/auth/login'
}) => {
  const { user, loading } = useSupabaseAuth();
  const location = useLocation();

  // ローディング中はスピナーを表示
  if (loading) {
    return <LoadingScreen />;
  }

  // 未認証の場合はログインページへリダイレクト
  if (!user) {
    return (
      <Navigate 
        to={fallbackPath} 
        state={{ from: location.pathname }}
        replace 
      />
    );
  }

  // 管理者権限が必要な場合のチェック
  if (requireAdmin) {
    const isAdmin = user.app_metadata?.role === 'admin';
    if (!isAdmin) {
      return (
        <Navigate 
          to="/dashboard" 
          state={{ error: '管理者権限が必要です' }}
          replace 
        />
      );
    }
  }

  // 認証済み - 子コンポーネントを表示
  return <>{children}</>;
};

export default SupabaseProtectedRoute;