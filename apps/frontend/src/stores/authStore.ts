import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, supabaseConfigError } from '../lib/supabase';
import { API_BASE_URL } from '../config/api';
import { tokenManager, type TokenData } from '../utils/tokenManager';

export interface ProfileData {
  id: string;
  username?: string;
  name?: string;
  grade?: string;
  class_name?: string;
  attendance_number?: number;
  role: 'student' | 'teacher';
  school_id: string | null;
  school_code_locked?: boolean;
  email?: string;
  schools?: {
    id: string;
    name: string;
  };
  created_at?: string;
  updated_at?: string;
  legacy_user_id?: number;
}

type AuthenticatedUser = User & { username?: string };

interface AuthResult {
  success: boolean;
  error?: AuthError;
  message?: string;
  requiresEmailConfirmation?: boolean;
}

interface AuthState {
  user: AuthenticatedUser | null;
  session: Session | null;
  profile: ProfileData | null;
  userRole: 'student' | 'teacher' | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: AuthError | null;
  migrationStatus: 'none' | 'pending' | 'completed';
  registrationMessage: string | null;

  isAuthenticated: () => boolean;
  getAccessToken: () => string | null;
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithGoogle: () => Promise<AuthResult>;
  signOut: () => Promise<void>;
  logout: () => void;
  resetPassword: (email: string) => Promise<AuthResult>;
  updateUser: (updates: { email?: string; password?: string; data?: Record<string, any> }) => Promise<AuthResult>;
  refreshSession: () => Promise<boolean>;
  getProfile: () => Promise<ProfileData | null>;
  fetchProfile: () => Promise<ProfileData | null>;
  setMigrationStatus: (status: 'none' | 'pending' | 'completed') => void;
  clearError: () => void;
  clearRegistrationMessage: () => void;

  // Legacy compatibility for older UI.
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (username: string, password: string, confirmPassword: string) => Promise<AuthResult>;
}

const createAuthError = (message: string): AuthError => ({ message } as AuthError);

const buildRedirectUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${window.location.origin}${normalizedPath}`;
};

const getTokenDataFromSession = (session: Session): TokenData => ({
  access_token: session.access_token,
  refresh_token: session.refresh_token,
  expires_at: session.expires_at ? session.expires_at * 1000 : Date.now() + (session.expires_in || 3600) * 1000,
  token_type: session.token_type,
});

const logAuthEvent = (event: string, payload?: Record<string, unknown>) => {
  console.info(`[AuthStore] ${event}`, payload || {});
};

const enrichUser = (user: User, profile?: Partial<ProfileData> | null): AuthenticatedUser => ({
  ...user,
  username: profile?.username || user.user_metadata?.username || user.email?.split('@')[0] || user.id,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      let authSubscription: { unsubscribe: () => void } | null = null;

      const syncTokenState = (session: Session | null) => {
        if (session) {
          tokenManager.saveTokens(getTokenDataFromSession(session));
        } else {
          tokenManager.clearTokens();
        }
      };

      const fetchProfileViaBackend = async (accessToken: string): Promise<ProfileData | null> => {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          if (!response.ok) {
            return null;
          }

          const payload = await response.json();
          return payload.profile as ProfileData;
        } catch (error) {
          console.error('[Auth] Backend profile fetch failed:', error);
          return null;
        }
      };

      const fetchProfileForUser = async (user: User): Promise<ProfileData | null> => {
        try {
          const session = get().session || (await supabase.auth.getSession()).data.session;
          const accessToken = session?.access_token;
          if (accessToken) {
            const backendProfile = await fetchProfileViaBackend(accessToken);
            if (backendProfile) {
              return backendProfile;
            }
          }

          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (data) {
            return data as ProfileData;
          }

          const newProfile: ProfileData = {
            id: user.id,
            email: user.email || '',
            username: user.user_metadata?.username || user.email?.split('@')[0] || user.id,
            role: 'student',
            school_id: null,
          };

          const { data: createdProfile, error: createError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          return createdProfile as ProfileData;
        } catch (error) {
          console.error('[Auth] Failed to fetch profile:', error);
          return {
            id: user.id,
            email: user.email || '',
            username: user.user_metadata?.username || user.email?.split('@')[0] || user.id,
            role: 'student',
            school_id: null,
            school_code_locked: false,
          };
        }
      };

      const applySessionState = async (session: Session | null) => {
        logAuthEvent('applySessionState:start', {
          hasSession: Boolean(session),
          userId: session?.user?.id || null,
          email: session?.user?.email || null,
        });
        if (!session) {
          syncTokenState(null);
          set({
            user: null,
            session: null,
            profile: null,
            userRole: null,
            isLoading: false,
            isInitialized: true,
            error: null,
            migrationStatus: 'none',
          });
          logAuthEvent('applySessionState:cleared');
          return;
        }

        const profile = await fetchProfileForUser(session.user);
        syncTokenState(session);
        set({
          user: enrichUser(session.user, profile),
          session,
          profile,
          userRole: profile?.role || 'student',
          isLoading: false,
          isInitialized: true,
          error: null,
        });
        logAuthEvent('applySessionState:completed', {
          userId: session.user.id,
          email: session.user.email || null,
          role: profile?.role || 'student',
        });
      };

      return {
        user: null,
        session: null,
        profile: null,
        userRole: null,
        isLoading: false,
        isInitialized: false,
        error: null,
        migrationStatus: 'none',
        registrationMessage: null,

        isAuthenticated: () => Boolean(get().user && get().session),

        getAccessToken: () => {
          const session = get().session;
          return session?.access_token || tokenManager.getAccessToken();
        },

        initialize: async () => {
          const state = get();
          if (state.isInitialized || state.isLoading) {
            logAuthEvent('initialize:skipped', {
              isInitialized: state.isInitialized,
              isLoading: state.isLoading,
            });
            return;
          }

          if (!isSupabaseConfigured) {
            logAuthEvent('initialize:missing-config', {
              error: supabaseConfigError || 'Supabase is not configured',
            });
            set({
              error: createAuthError(supabaseConfigError || 'Supabase is not configured'),
              isInitialized: true,
              isLoading: false,
            });
            return;
          }

          set({ isLoading: true, error: null });
          logAuthEvent('initialize:start');

          try {
            const {
              data: { session },
              error,
            } = await supabase.auth.getSession();

            if (error) {
              throw error;
            }

            logAuthEvent('initialize:session-loaded', {
              hasSession: Boolean(session),
              userId: session?.user?.id || null,
            });
            await applySessionState(session);

            if (!authSubscription) {
              const {
                data: { subscription },
              } = supabase.auth.onAuthStateChange(async (_event: string, nextSession: Session | null) => {
                logAuthEvent('onAuthStateChange', {
                  event: _event,
                  hasSession: Boolean(nextSession),
                  userId: nextSession?.user?.id || null,
                });
                await applySessionState(nextSession);
              });

              authSubscription = subscription;
              window.__supabaseAuthSubscription = subscription;
            }
          } catch (error) {
            console.error('[Auth] Initialization error:', error);
            logAuthEvent('initialize:error', {
              message: (error as AuthError)?.message || String(error),
            });
            set({
              error: error as AuthError,
              isInitialized: true,
              isLoading: false,
            });
          }
        },

        signUp: async (email, password, metadata = {}) => {
          set({ isLoading: true, error: null, registrationMessage: null });
          logAuthEvent('signUp:start', {
            email,
            metadataKeys: Object.keys(metadata),
          });

          try {
            const username = metadata.username || email.split('@')[0];
            const { data, error } = await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  username,
                  ...metadata,
                },
              },
            });

            if (error) {
              throw error;
            }

            if (data.user) {
              const profile = await fetchProfileForUser(data.user);
              if (data.session) {
                syncTokenState(data.session);
                set({
                  user: enrichUser(data.user, profile),
                  session: data.session,
                  profile,
                  userRole: profile?.role || 'student',
                  isLoading: false,
                  error: null,
                  registrationMessage: null,
                });
                logAuthEvent('signUp:completed-with-session', {
                  userId: data.user.id,
                  email: data.user.email || email,
                });
                return { success: true, requiresEmailConfirmation: false };
              }
            }

            const message = '確認メールを送信しました。メールのリンクから登録を完了してください。';
            set({
              isLoading: false,
              registrationMessage: message,
            });
            logAuthEvent('signUp:confirmation-required', {
              userId: data.user?.id || null,
              email,
            });
            return {
              success: true,
              message,
              requiresEmailConfirmation: true,
            };
          } catch (error) {
            const authError = error as AuthError;
            logAuthEvent('signUp:error', {
              email,
              message: authError.message,
            });
            set({ isLoading: false, error: authError });
            return { success: false, error: authError };
          }
        },

        signIn: async (email, password) => {
          set({ isLoading: true, error: null });
          logAuthEvent('signIn:start', { email });

          try {
            const { data, error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });

            if (error) {
              throw error;
            }

            await applySessionState(data.session);
            logAuthEvent('signIn:completed', {
              email,
              userId: data.user?.id || data.session?.user?.id || null,
            });
            return { success: true };
          } catch (error) {
            const authError = error as AuthError;
            logAuthEvent('signIn:error', {
              email,
              message: authError.message,
            });
            set({ isLoading: false, error: authError });
            return { success: false, error: authError };
          }
        },

        signInWithGoogle: async () => {
          set({ isLoading: true, error: null });
          logAuthEvent('signInWithGoogle:start');

          try {
            const { error } = await supabase.auth.signInWithOAuth({
              provider: 'google',
              options: {
                redirectTo: buildRedirectUrl('/auth/callback'),
                queryParams: {
                  access_type: 'offline',
                  prompt: 'consent',
                },
              },
            });

            if (error) {
              throw error;
            }

            logAuthEvent('signInWithGoogle:redirect-requested');
            return { success: true };
          } catch (error) {
            const authError = error as AuthError;
            logAuthEvent('signInWithGoogle:error', {
              message: authError.message,
            });
            set({ isLoading: false, error: authError });
            return { success: false, error: authError };
          }
        },

        signOut: async () => {
          set({ isLoading: true, error: null });
          logAuthEvent('signOut:start');

          try {
            const { error } = await supabase.auth.signOut();
            if (error) {
              throw error;
            }
          } catch (error) {
            logAuthEvent('signOut:error', {
              message: (error as AuthError).message,
            });
            set({ error: error as AuthError });
          } finally {
            syncTokenState(null);
            set({
              user: null,
              session: null,
              profile: null,
              userRole: null,
              isLoading: false,
              isInitialized: true,
              migrationStatus: 'none',
              registrationMessage: null,
            });
            logAuthEvent('signOut:completed');
          }
        },

        logout: () => {
          void get().signOut();
        },

        resetPassword: async (email) => {
          set({ isLoading: true, error: null });
          logAuthEvent('resetPassword:start', { email });

          try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: buildRedirectUrl('/auth/callback?type=recovery'),
            });

            if (error) {
              throw error;
            }

            set({ isLoading: false });
            logAuthEvent('resetPassword:email-sent', { email });
            return { success: true };
          } catch (error) {
            const authError = error as AuthError;
            logAuthEvent('resetPassword:error', {
              email,
              message: authError.message,
            });
            set({ isLoading: false, error: authError });
            return { success: false, error: authError };
          }
        },

        updateUser: async (updates) => {
          set({ isLoading: true, error: null });
          logAuthEvent('updateUser:start', {
            hasEmail: Boolean(updates.email),
            hasPassword: Boolean(updates.password),
            dataKeys: updates.data ? Object.keys(updates.data) : [],
          });

          try {
            const { data, error } = await supabase.auth.updateUser(updates);
            if (error) {
              throw error;
            }

            if (data.user) {
              const profile = await fetchProfileForUser(data.user);
              set({
                user: enrichUser(data.user, profile),
                profile,
                userRole: profile?.role || 'student',
                isLoading: false,
              });
            } else {
              set({ isLoading: false });
            }

            logAuthEvent('updateUser:completed', {
              userId: data.user?.id || null,
              email: data.user?.email || null,
            });
            return { success: true };
          } catch (error) {
            const authError = error as AuthError;
            logAuthEvent('updateUser:error', {
              message: authError.message,
            });
            set({ isLoading: false, error: authError });
            return { success: false, error: authError };
          }
        },

        refreshSession: async () => {
          logAuthEvent('refreshSession:start');
          try {
            const {
              data: { session },
              error,
            } = await supabase.auth.refreshSession();

            if (error) {
              throw error;
            }

            await applySessionState(session);
            logAuthEvent('refreshSession:completed', {
              hasSession: Boolean(session),
              userId: session?.user?.id || null,
            });
            return Boolean(session);
          } catch (error) {
            logAuthEvent('refreshSession:error', {
              message: (error as AuthError).message,
            });
            set({ error: error as AuthError });
            return false;
          }
        },

        getProfile: async () => {
          const currentUser = get().user;
          if (!currentUser) {
            return null;
          }

          const profile = await fetchProfileForUser(currentUser);
          set({
            profile,
            user: enrichUser(currentUser, profile),
            userRole: profile?.role || 'student',
          });
          return profile;
        },

        fetchProfile: async () => get().getProfile(),

        setMigrationStatus: (migrationStatus) => {
          set({ migrationStatus });
        },

        clearError: () => {
          set({ error: null });
        },

        clearRegistrationMessage: () => {
          set({ registrationMessage: null });
        },

        login: async (username, password) => {
          if (username.includes('@')) {
            return get().signIn(username, password);
          }

          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('email')
              .eq('username', username)
              .maybeSingle();

            if (error || !data?.email) {
              const authError = createAuthError('メールアドレスまたはユーザー名が見つかりません');
              set({ error: authError });
              return { success: false, error: authError };
            }

            return get().signIn(data.email, password);
          } catch (error) {
            const authError = error as AuthError;
            set({ error: authError });
            return { success: false, error: authError };
          }
        },

        register: async (username, password, confirmPassword) => {
          if (password !== confirmPassword) {
            const authError = createAuthError('パスワードが一致しません');
            set({ error: authError });
            return { success: false, error: authError };
          }

          if (!username.includes('@')) {
            const authError = createAuthError('新規登録にはメールアドレスを入力してください');
            set({ error: authError });
            return { success: false, error: authError };
          }

          return get().signUp(username, password);
        },
      };
    },
    {
      name: 'auth-storage',
      partialize: (state) => ({
        migrationStatus: state.migrationStatus,
        registrationMessage: state.registrationMessage,
      }),
    }
  )
);

declare global {
  interface Window {
    __supabaseAuthSubscription?: { unsubscribe: () => void };
  }
}
