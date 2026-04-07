// react-app/src/components/ProtectedRouteV2.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStoreV2 } from '../stores/authStoreV2';
import LoadingScreen from './LoadingScreen';

interface ProtectedRouteV2Props {
  children: React.ReactNode;
}

const ProtectedRouteV2: React.FC<ProtectedRouteV2Props> = ({ 
  children
}) => {
  const location = useLocation();
  const auth = useAuthStoreV2();

  // 認証状態を確認
  const isAuthenticated = auth.user !== null;
  const isLoading = auth.isLoading || !auth.isInitialized;
  
  console.log('[ProtectedRouteV2] State:', {
    path: location.pathname,
    isAuthenticated,
    isLoading,
    isInitialized: auth.isInitialized,
    authLoading: auth.isLoading
  });

  // ローディング中の処理
  if (isLoading) {
    console.log('[ProtectedRouteV2] Still loading...');
    return <LoadingScreen />;
  }

  // 未認証の処理
  if (!isAuthenticated) {
    console.log('[ProtectedRouteV2] Not authenticated, redirecting to /signin');
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRouteV2;