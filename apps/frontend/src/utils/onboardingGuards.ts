import type { ProfileData } from '../stores/authStore';

export const FIRST_AI_TUTORIAL_ROUTE = '/chat?tutorial=first-ai';
export const FIRST_AI_TUTORIAL_PARAM = 'first-ai';

export const isOnboardingComplete = (profile: ProfileData | null) =>
  profile?.role === 'admin' ? true : Boolean(profile?.name?.trim());

export const isFirstAiTutorialRequired = (profile: ProfileData | null) =>
  Boolean(
    profile &&
      profile.role === 'student' &&
      isOnboardingComplete(profile) &&
      !profile.first_ai_tutorial_completed
  );

export const isFirstAiTutorialRoute = (pathname: string, search: string) =>
  pathname === '/chat' && new URLSearchParams(search).get('tutorial') === FIRST_AI_TUTORIAL_PARAM;

export const getPostOnboardingRoute = (profile: ProfileData | null) => {
  if (!profile || !isOnboardingComplete(profile)) {
    return '/onboarding';
  }

  if (profile.role === 'admin') {
    return '/admin';
  }

  if (profile.role === 'teacher') {
    return '/teacher';
  }

  if (isFirstAiTutorialRequired(profile)) {
    return FIRST_AI_TUTORIAL_ROUTE;
  }

  return '/chat';
};
