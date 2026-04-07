import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

interface ProfileData {
  id: string;
  username?: string;
  role: 'student' | 'teacher';
  school_id: string | null;
  email: string;
  created_at?: string;
  legacy_user_id?: number;
}

interface UnifiedAuthState {
  // State
  user: User | null;
  session: Session | null;
  profile: ProfileData | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  
  // Computed
  isAuthenticated: () => boolean;
  getAccessToken: () => string | null;
  
  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, username?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  refreshSession: () => Promise<boolean>;
  fetchProfile: () => Promise<ProfileData | null>;
  updateProfile: (updates: Partial<ProfileData>) => Promise<boolean>;
  clearError: () => void;
  
  // Legacy compatibility (will be removed after migration)
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
}

export const useAuthStore = create<UnifiedAuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      session: null,
      profile: null,
      isLoading: false,
      isInitialized: false,
      error: null,
      
      // Computed
      isAuthenticated: () => {
        const state = get();
        return !!state.session && !!state.user;
      },
      
      getAccessToken: () => {
        const state = get();
        return state.session?.access_token || null;
      },
      
      // Initialize auth state and set up listeners
      initialize: async () => {
        const state = get();
        
        // Prevent duplicate initialization
        if (state.isInitialized || state.isLoading) {
          console.log('[Auth] Already initialized or loading');
          return;
        }
        
        console.log('[Auth] Initializing...');
        set({ isLoading: true, error: null });
        
        try {
          // Get current session from Supabase
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('[Auth] Session error:', error);
            throw error;
          }
          
          if (session) {
            console.log('[Auth] Session found for:', session.user.email);
            
            // Fetch user profile
            const profile = await get().fetchProfile();
            
            set({ 
              user: session.user,
              session,
              profile,
              isInitialized: true,
              isLoading: false,
              error: null
            });
          } else {
            console.log('[Auth] No active session');
            set({ 
              isInitialized: true,
              isLoading: false 
            });
          }
        } catch (error) {
          console.error('[Auth] Initialize error:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Failed to initialize auth',
            isInitialized: true,
            isLoading: false 
          });
        }
        
        // Set up auth state change listener (only once)
        if (!window.__supabaseAuthListener) {
          console.log('[Auth] Setting up auth listener');
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('[Auth] Auth state changed:', event);
              
              switch (event) {
                case 'SIGNED_IN':
                case 'TOKEN_REFRESHED':
                  if (session) {
                    const profile = await get().fetchProfile();
                    set({ 
                      user: session.user,
                      session,
                      profile,
                      error: null 
                    });
                  }
                  break;
                  
                case 'SIGNED_OUT':
                  set({ 
                    user: null,
                    session: null,
                    profile: null,
                    error: null 
                  });
                  break;
                  
                case 'USER_UPDATED':
                  if (session) {
                    set({ 
                      user: session.user,
                      session,
                      error: null 
                    });
                  }
                  break;
              }
            }
          );
          
          window.__supabaseAuthListener = subscription;
        }
      },
      
      // Sign up with email and password
      signUp: async (email, password, username) => {
        set({ isLoading: true, error: null });
        
        try {
          // Check if username is already taken (if provided)
          if (username) {
            const { data: existingUser } = await supabase
              .from('profiles')
              .select('id')
              .eq('username', username)
              .single();
              
            if (existingUser) {
              set({ isLoading: false });
              return { 
                success: false, 
                error: 'このユーザー名は既に使用されています' 
              };
            }
          }
          
          // Sign up with Supabase Auth
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username: username || email.split('@')[0],
              }
            }
          });
          
          if (error) throw error;
          
          if (data.user) {
            // Create profile record
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                email: data.user.email,
                username: username || email.split('@')[0],
                role: 'student',
              });
              
            if (profileError) {
              console.error('[Auth] Profile creation error:', profileError);
            }
            
            set({ isLoading: false });
            return { 
              success: true,
              message: '🎉 アカウント登録が完了しました！メールを確認してください。'
            };
          }
          
          set({ isLoading: false });
          return { success: false, error: 'Registration failed' };
          
        } catch (error) {
          console.error('[Auth] Sign up error:', error);
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Sign up failed'
          });
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Sign up failed'
          };
        }
      },
      
      // Sign in with email and password
      signIn: async (email, password) => {
        set({ isLoading: true, error: null });
        
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          
          if (error) throw error;
          
          if (data.user && data.session) {
            const profile = await get().fetchProfile();
            
            set({ 
              user: data.user,
              session: data.session,
              profile,
              isLoading: false,
              error: null
            });
            
            return { success: true };
          }
          
          set({ isLoading: false });
          return { success: false, error: 'Sign in failed' };
          
        } catch (error) {
          console.error('[Auth] Sign in error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
          set({ 
            isLoading: false,
            error: errorMessage
          });
          return { success: false, error: errorMessage };
        }
      },
      
      // Sign in with Google
      signInWithGoogle: async () => {
        set({ isLoading: true, error: null });
        
        try {
          const redirectTo = window.location.hostname === 'localhost' 
            ? 'http://localhost:5173/auth/callback'
            : `${window.location.origin}/auth/callback`;
            
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
          
          if (error) throw error;
          
          // OAuth redirects, so just return success
          return { success: true };
          
        } catch (error) {
          console.error('[Auth] Google sign in error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Google sign in failed';
          set({ 
            isLoading: false,
            error: errorMessage
          });
          return { success: false, error: errorMessage };
        }
      },
      
      // Sign out
      signOut: async () => {
        set({ isLoading: true });
        
        try {
          const { error } = await supabase.auth.signOut();
          
          if (error) throw error;
          
          set({ 
            user: null,
            session: null,
            profile: null,
            isLoading: false,
            error: null
          });
          
        } catch (error) {
          console.error('[Auth] Sign out error:', error);
          set({ 
            isLoading: false,
            error: error instanceof Error ? error.message : 'Sign out failed'
          });
        }
      },
      
      // Reset password
      resetPassword: async (email) => {
        set({ isLoading: true, error: null });
        
        try {
          const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
          });
          
          if (error) throw error;
          
          set({ isLoading: false });
          return { success: true };
          
        } catch (error) {
          console.error('[Auth] Reset password error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Reset password failed';
          set({ 
            isLoading: false,
            error: errorMessage
          });
          return { success: false, error: errorMessage };
        }
      },
      
      // Refresh session
      refreshSession: async () => {
        try {
          const { data: { session }, error } = await supabase.auth.refreshSession();
          
          if (error) throw error;
          
          if (session) {
            set({ 
              session,
              user: session.user,
              error: null 
            });
            return true;
          }
          
          return false;
          
        } catch (error) {
          console.error('[Auth] Refresh session error:', error);
          set({ 
            error: error instanceof Error ? error.message : 'Refresh session failed'
          });
          return false;
        }
      },
      
      // Fetch user profile
      fetchProfile: async () => {
        const { user } = get();
        if (!user) return null;
        
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
          if (error) {
            // Profile might not exist yet, create it
            if (error.code === 'PGRST116') {
              const newProfile: ProfileData = {
                id: user.id,
                email: user.email || '',
                username: user.user_metadata?.username || user.email?.split('@')[0] || '',
                role: 'student',
                school_id: null,
              };
              
              const { data: createdProfile, error: createError } = await supabase
                .from('profiles')
                .insert(newProfile)
                .select()
                .single();
                
              if (createError) throw createError;
              
              set({ profile: createdProfile });
              return createdProfile;
            }
            throw error;
          }
          
          set({ profile: data });
          return data;
          
        } catch (error) {
          console.error('[Auth] Fetch profile error:', error);
          return null;
        }
      },
      
      // Update user profile
      updateProfile: async (updates) => {
        const { user } = get();
        if (!user) return false;
        
        try {
          const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id);
            
          if (error) throw error;
          
          // Refresh profile
          await get().fetchProfile();
          return true;
          
        } catch (error) {
          console.error('[Auth] Update profile error:', error);
          return false;
        }
      },
      
      // Clear error
      clearError: () => {
        set({ error: null });
      },
      
      // Legacy compatibility methods
      login: async (username, password) => {
        // Try to login with username as email first
        let result = await get().signIn(username, password);
        
        // If failed and username doesn't contain @, try to find email by username
        if (!result.success && !username.includes('@')) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', username)
            .single();
            
          if (profile?.email) {
            result = await get().signIn(profile.email, password);
          }
        }
        
        return result;
      },
      
      register: async (username, password, confirmPassword) => {
        if (password !== confirmPassword) {
          return { success: false, error: 'パスワードが一致しません' };
        }
        
        // For legacy compatibility, use username as email if it contains @
        const email = username.includes('@') ? username : `${username}@example.com`;
        const actualUsername = username.includes('@') ? username.split('@')[0] : username;
        
        return await get().signUp(email, password, actualUsername);
      },
      
      logout: () => {
        get().signOut();
      },
    }),
    {
      name: 'unified-auth-storage',
      partialize: (state) => ({
        // Only persist minimal data, Supabase handles the rest
        profile: state.profile,
      }),
    }
  )
);

// TypeScript global declarations
declare global {
  interface Window {
    __supabaseAuthListener?: any;
  }
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
  // Use setTimeout to avoid initialization race conditions
  setTimeout(() => {
    useAuthStore.getState().initialize();
  }, 0);
}

export default useAuthStore;