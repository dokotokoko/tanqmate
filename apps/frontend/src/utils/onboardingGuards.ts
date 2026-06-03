import type { ProfileData } from '../stores/authStore';

export const isOnboardingComplete = (profile: ProfileData | null) =>
  profile?.role === 'admin' ? true : Boolean(profile?.name?.trim());

export const getPostOnboardingRoute = (profile: ProfileData | null) => {
  if (!profile || !isOnboardingComplete(profile)) {
    return '/onboarding';
  }

  if (profile.role === 'admin') {
    return '/admin';
  }

  return profile.role === 'teacher' ? '/teacher' : '/chat';
};
