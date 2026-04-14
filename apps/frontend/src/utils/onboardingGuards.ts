import type { ProfileData } from '../stores/authStore';

export const isOnboardingComplete = (profile: ProfileData | null) =>
  Boolean(profile?.name && (profile.school_id || profile.school_code_locked));

export const getPostOnboardingRoute = (profile: ProfileData | null) => {
  if (!isOnboardingComplete(profile)) {
    return '/onboarding';
  }

  return profile.role === 'teacher' ? '/teacher' : '/chat';
};
