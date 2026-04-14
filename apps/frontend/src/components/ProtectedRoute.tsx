// react-app/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LoadingScreen from './LoadingScreen';
import { isOnboardingComplete } from '../utils/onboardingGuards';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowIncompleteOnboarding?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowIncompleteOnboarding = false,
}) => {
  const location = useLocation();
  const { user, profile, isLoading, isInitialized } = useAuthStore();

  if (isLoading || !isInitialized) {
    console.info('[ProtectedRoute] waiting', {
      pathname: location.pathname,
      isLoading,
      isInitialized,
    });
    return <LoadingScreen />;
  }

  if (!user) {
    console.warn('[ProtectedRoute] redirecting-to-signin', {
      pathname: location.pathname,
    });
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  if (!allowIncompleteOnboarding && !isOnboardingComplete(profile)) {
    console.warn('[ProtectedRoute] redirecting-to-onboarding', {
      pathname: location.pathname,
      userId: user.id,
    });
    return <Navigate to="/onboarding" state={{ from: location }} replace />;
  }

  console.info('[ProtectedRoute] granted', {
    pathname: location.pathname,
    userId: user.id,
    email: user.email || null,
  });
  return <>{children}</>;
};

export default ProtectedRoute;
