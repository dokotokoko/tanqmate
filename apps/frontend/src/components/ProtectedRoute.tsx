// react-app/src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, type ProfileData } from '../stores/authStore';
import LoadingScreen from './LoadingScreen';
import { getPostOnboardingRoute, isOnboardingComplete } from '../utils/onboardingGuards';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowIncompleteOnboarding?: boolean;
  requiredRole?: ProfileData['role'];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowIncompleteOnboarding = false,
  requiredRole,
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

  if (requiredRole && profile?.role !== requiredRole) {
    console.warn('[ProtectedRoute] redirecting-for-role-mismatch', {
      pathname: location.pathname,
      userId: user.id,
      requiredRole,
      actualRole: profile?.role || null,
    });
    return <Navigate to={getPostOnboardingRoute(profile)} state={{ from: location }} replace />;
  }

  console.info('[ProtectedRoute] granted', {
    pathname: location.pathname,
    userId: user.id,
    email: user.email || null,
    role: profile?.role || null,
  });
  return <>{children}</>;
};

export default ProtectedRoute;
