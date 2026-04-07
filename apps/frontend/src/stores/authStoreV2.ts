import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

interface ProfileData {
  role: 'student' | 'teacher';
  school_id: string | null;
}

interface AuthStateV2 {
  user: User | null;
  session: Session | null;
  profile: ProfileData | null;
  userRole: 'student' | 'teacher' | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: AuthError | null;
  migrationStatus: 'none' | 'pending' | 'completed';
  
  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ success: boolean; error?: AuthError }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: AuthError }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: AuthError }>;
  updateUser: (updates: { email?: string; password?: string; data?: Record<string, any> }) => Promise<{ success: boolean; error?: AuthError }>;
  refreshSession: () => Promise<void>;
  setMigrationStatus: (status: 'none' | 'pending' | 'completed') => void;
  clearError: () => void;
  getProfile: () => Promise<ProfileData | null>;
}

export const useAuthStoreV2 = create<AuthStateV2>()(
  persist(
    (set, get) => {
      console.log('[AuthV2] Store creating...');
      return {
      user: null,
      session: null,
      profile: null,
      userRole: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      migrationStatus: 'none',

      initialize: async () => {
        const state = get();
        console.log('[AuthV2] Initialize called, current state:', {
          isInitialized: state.isInitialized,
          isLoading: state.isLoading,
          hasUser: !!state.user
        });
        
        if (state.isInitialized || state.isLoading) {
          console.log('[AuthV2] Already initialized or loading, skipping');
          return;
        }
        
        console.log('[AuthV2] Starting initialization...');
        set({ isLoading: true });
        
        try {
          // セッションの取得
          console.log('[AuthV2] Getting session from Supabase...');
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('[AuthV2] Session initialization error:', error);
            set({ error, isInitialized: true, isLoading: false });
            return;
          } 
          
          if (session) {
            console.log('[AuthV2] Session found, user:', session.user.email);
            set({ 
              user: session.user,
              session,
              isInitialized: true,
              isLoading: false
            });
            console.log('[AuthV2] State after setting session:', get());
          } else {
            console.log('[AuthV2] No session found');
            set({ isInitialized: true, isLoading: false });
            console.log('[AuthV2] State after no session:', get());
          }

        } catch (error) {
          console.error('[AuthV2] Initialize error:', error);
          set({ 
            error: error as AuthError, 
            isInitialized: true, 
            isLoading: false 
          });
        }

        // 認証状態変更の監視 (try-catchの外で実行)
        console.log('[AuthV2] Setting up auth state change listener...');
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('[AuthV2] Auth state changed:', event, 'session:', !!session);
              
              switch (event) {
                case 'SIGNED_IN':
                  set({ 
                    user: session?.user || null, 
                    session,
                    error: null 
                  });
                  break;
                case 'SIGNED_OUT':
                  set({ 
                    user: null, 
                    session: null,
                    migrationStatus: 'none',
                    error: null 
                  });
                  break;
                case 'TOKEN_REFRESHED':
                  set({ 
                    session,
                    error: null 
                  });
                  break;
                case 'USER_UPDATED':
                  set({ 
                    user: session?.user || null,
                    session,
                    error: null 
                  });
                  break;
              }
            }
          );

        // クリーンアップ関数を保存
        (window as any).__supabaseAuthSubscription = subscription;
      },

      signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: metadata
            }
          });

          if (error) {
            set({ error });
            return { success: false, error };
          }

          if (data.user && data.session) {
            set({ 
              user: data.user,
              session: data.session,
              error: null
            });
          }

          return { success: true };
        } catch (error) {
          const authError = error as AuthError;
          set({ error: authError });
          return { success: false, error: authError };
        } finally {
          set({ isLoading: false });
        }
      },

      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });

          if (error) {
            set({ error });
            return { success: false, error };
          }

          if (data.user && data.session) {
            set({ 
              user: data.user,
              session: data.session,
              error: null
            });
          }

          return { success: true };
        } catch (error) {
          const authError = error as AuthError;
          set({ error: authError });
          return { success: false, error: authError };
        } finally {
          set({ isLoading: false });
        }
      },

      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });
        
        try {
          // リダイレクト先のURLを設定
          const redirectTo = window.location.hostname === 'localhost' 
            ? 'http://localhost:5173/auth/callback'
            : 'https://tanqmate.com/auth/callback';

          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo,
              queryParams: {
                access_type: 'offline',
                prompt: 'consent',
              }
            }
          });

          if (error) {
            set({ error });
            return { success: false, error };
          }

          // OAuthの場合、リダイレクトされるので成功を返す
          return { success: true };
        } catch (error) {
          const authError = error as AuthError;
          set({ error: authError });
          return { success: false, error: authError };
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        set({ isLoading: true });
        
        try {
          const { error } = await supabase.auth.signOut();
          
          if (error) {
            console.error('Sign out error:', error);
            set({ error });
          } else {
            set({ 
              user: null,
              session: null,
              profile: null,
              userRole: null,
              isInitialized: false,
              migrationStatus: 'none',
              error: null
            });
          }
        } catch (error) {
          console.error('Sign out error:', error);
          set({ error: error as AuthError });
        } finally {
          set({ isLoading: false });
        }
      },

      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
          });

          if (error) {
            set({ error });
            return { success: false, error };
          }

          return { success: true };
        } catch (error) {
          const authError = error as AuthError;
          set({ error: authError });
          return { success: false, error: authError };
        } finally {
          set({ isLoading: false });
        }
      },

      updateUser: async (updates) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase.auth.updateUser(updates);

          if (error) {
            set({ error });
            return { success: false, error };
          }

          if (data.user) {
            set({ 
              user: data.user,
              error: null
            });
          }

          return { success: true };
        } catch (error) {
          const authError = error as AuthError;
          set({ error: authError });
          return { success: false, error: authError };
        } finally {
          set({ isLoading: false });
        }
      },

      refreshSession: async () => {
        try {
          const { data: { session }, error } = await supabase.auth.refreshSession();
          
          if (error) {
            console.error('Session refresh error:', error);
            set({ error });
          } else if (session) {
            set({ 
              session,
              user: session.user,
              error: null
            });
          }
        } catch (error) {
          console.error('Session refresh error:', error);
          set({ error: error as AuthError });
        }
      },

      setMigrationStatus: (status) => {
        set({ migrationStatus: status });
      },

      clearError: () => {
        set({ error: null });
      },

      getProfile: async (): Promise<ProfileData | null> => {
        const { user } = get();
        if (!user) return null;
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role, school_id')
            .eq('id', user.id)
            .single();
          
          if (error) {
            console.error('Profile fetch error:', error);
            return null;
          }
          
          const profile: ProfileData = {
            role: data.role || 'student',
            school_id: data.school_id
          };
          
          set({ 
            profile,
            userRole: data.role || 'student'
          });
          return profile;
        } catch (error) {
          console.error('Profile fetch error:', error);
          return null;
        }
      }
    }},
    {
      name: 'auth-storage-v2',
      partialize: (state) => ({
        migrationStatus: state.migrationStatus
      })
    }
  )
);

// 初期化
if (typeof window !== 'undefined') {
  useAuthStoreV2.getState().initialize();
}