import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { createMuiTheme } from './styles/design-system';

// 重要なページは静的インポート（初期ロードに必要）
import MigrationNoticePage from './pages/MigrationNoticePage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import ChatPage from './pages/ChatPage';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import { getPostOnboardingRoute } from './utils/onboardingGuards';

// 新しい認証ページ
const SignInPage = lazy(() => import('./pages/SignInPage'));
const SignUpPage = lazy(() => import('./pages/SignUpPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));
const SignUpCompletePage = lazy(() => import('./pages/SignUpCompletePage'));
const PasswordResetPage = lazy(() => import('./pages/PasswordResetPage'));
const PasswordResetNewPage = lazy(() => import('./pages/PasswordResetNewPage'));
const PasswordResetCompletePage = lazy(() => import('./pages/PasswordResetCompletePage'));

// role別ダッシュボード
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const TeacherSignInPage = lazy(() => import('./pages/TeacherSignInPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));

// その他のページは遅延ローディング
const GuidePage = lazy(() => import('./pages/GuidePage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage'));
const ExternalServicesPage = lazy(() => import('./pages/ExternalServicesPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const SchoolRegistrationPage = lazy(() => import('./pages/SchoolRegistrationPage'));
const GeneralInquiryPage = lazy(() => import('./pages/GeneralInquiryPage'));
const DiaryPage = lazy(() => import('./pages/DiaryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
// 不要なコンポーネントを削除（メモリ削減のため）
// const NotificationDemoPage = lazy(() => import('./pages/NotificationDemoPage'));
// const ThemeDeepDiveGame = lazy(() => import('./components/FrameworkGames/ThemeDeepDiveGame'));
// const ConversationAgentTestPage = lazy(() => import('./pages/ConversationAgentTestPage'));
// const InquiryExplorer = lazy(() => import('./components/InquiryExplorer/InquiryExplorer'));
// const VibesTanqOnboarding = lazy(() => import('./pages/VibesTanqOnboarding'));
// const VibesTanqDashboard = lazy(() => import('./pages/VibesTanqDashboard'));
// const StepPage = lazy(() => import('./pages/StepPage'));
// import QuestBoardPage from './pages/QuestBoardPage'; // 一時的に非表示

import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 遅延ローディング用のラッパーコンポーネント
const LazyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingScreen />}>
    {children}
  </Suspense>
);

const LegacyProjectRedirect: React.FC = () => {
  return <Navigate to="/chat" replace />;
};

const LegacyMemoRedirect: React.FC = () => {
  return <Navigate to="/chat" replace />;
};

const getAuthenticatedRedirectPath = getPostOnboardingRoute;

const AuthenticatedRedirect: React.FC = () => {
  const profile = useAuthStore((state) => state.profile);
  return <Navigate to={getAuthenticatedRedirectPath(profile)} replace />;
};

function App() {
  const auth = useAuthStore();
  const { isDarkMode } = useThemeStore();
  const initializeAuth = useAuthStore((state) => state.initialize);
  
  React.useEffect(() => {
    console.log('[App] Initializing auth...');
    void initializeAuth();
  }, [initializeAuth]);
  
  const user = auth.user;
  const profile = auth.profile;
  const isLoading = auth.isLoading || !auth.isInitialized;
  
  console.log('[App] Auth state:', {
    hasUser: !!user,
    isLoading,
    isInitialized: auth.isInitialized,
    authLoading: auth.isLoading
  });

  // デザインシステムからテーマを生成
  const themeConfig = createMuiTheme(isDarkMode);
  const theme = createTheme(themeConfig);

  if (isLoading) {
    console.log('[App] Showing loading screen because isLoading:', isLoading);
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AnimatePresence mode="wait">
            <Routes>
              {/* 使い方ページ（認証不要） */}
              <Route 
                path="/" 
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <LazyWrapper><GuidePage /></LazyWrapper>
                  </motion.div>
                } 
              />
              
              {/* 法的文書ページ（認証不要） */}
              <Route
                path="/privacy"
                element={<LazyWrapper><PrivacyPolicyPage /></LazyWrapper>}
              />
              <Route
                path="/terms"
                element={<LazyWrapper><TermsOfServicePage /></LazyWrapper>}
              />
              <Route
                path="/external-services"
                element={<LazyWrapper><ExternalServicesPage /></LazyWrapper>}
              />

              {/* 新ログインページ */}
              <Route
                path="/signin"
                element={
                  user ? <Navigate to={getAuthenticatedRedirectPath(profile)} replace /> :
                  <LazyWrapper><SignInPage /></LazyWrapper>
                }
              />

              <Route
                path="/teacher/signin"
                element={
                  user ? <Navigate to={getAuthenticatedRedirectPath(profile)} replace /> :
                  <LazyWrapper><TeacherSignInPage /></LazyWrapper>
                }
              />
              
              {/* 新規登録ページ */}
              <Route
                path="/signup"
                element={
                  user ? <Navigate to={getAuthenticatedRedirectPath(profile)} replace /> :
                  <LazyWrapper><SignUpPage /></LazyWrapper>
                }
              />
              
              {/* Onboardingページ */}
              <Route 
                path="/onboarding" 
                element={
                  <ProtectedRoute allowIncompleteOnboarding>
                    <LazyWrapper><OnboardingPage /></LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* 登録完了ページ */}
              <Route 
                path="/signup/complete" 
                element={
                  <ProtectedRoute allowIncompleteOnboarding>
                    <LazyWrapper><SignUpCompletePage /></LazyWrapper>
                  </ProtectedRoute>
                } 
              />
              
              {/* パスワードリセット関連 */}
              <Route 
                path="/password-reset" 
                element={
                  <LazyWrapper><PasswordResetPage /></LazyWrapper>
                } 
              />
              <Route 
                path="/password-reset/new" 
                element={
                  <LazyWrapper><PasswordResetNewPage /></LazyWrapper>
                } 
              />
              <Route 
                path="/password-reset/complete" 
                element={
                  <LazyWrapper><PasswordResetCompletePage /></LazyWrapper>
                } 
              />
              
              {/* 旧ログインページは/signinへリダイレクト */}
              <Route 
                path="/login" 
                element={<Navigate to="/signin" replace />}
              />
              
              {/* 旧認証パスはsigninへリダイレクト */}
              <Route 
                path="/auth-v2" 
                element={<Navigate to="/signin" replace />}
              />
              
              {/* 移行案内ページ */}
              <Route 
                path="/migration-notice" 
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MigrationNoticePage />
                  </motion.div>
                } 
              />
              
              {/* 学校登録ページ */}
              <Route 
                path="/school-registration" 
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <LazyWrapper><SchoolRegistrationPage /></LazyWrapper>
                  </motion.div>
                } 
              />
              
              {/* OAuth認証コールバックページ */}
              <Route 
                path="/auth/callback" 
                element={
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <AuthCallbackPage />
                  </motion.div>
                } 
              />
              
              {/* アプリケーション本体（認証必要） */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/chat" element={<ChatPage />} />
                <Route path="/home" element={<LazyWrapper><HomePage /></LazyWrapper>} />
                <Route path="/inquiry" element={<LazyWrapper><GeneralInquiryPage /></LazyWrapper>} />
                <Route path="/diary" element={<LazyWrapper><DiaryPage /></LazyWrapper>} />
                <Route path="/profile" element={<LazyWrapper><ProfilePage /></LazyWrapper>} />
              </Route>

              {/* 旧 /app 配下の互換ルート */}
              <Route path="/app" element={<AuthenticatedRedirect />} />
              <Route path="/app/chat" element={<Navigate to="/chat" replace />} />
              <Route path="/app/home" element={<Navigate to="/home" replace />} />
              <Route path="/app/inquiry" element={<Navigate to="/inquiry" replace />} />
              <Route path="/app/diary" element={<Navigate to="/diary" replace />} />
              <Route path="/app/profile" element={<Navigate to="/profile" replace />} />
              <Route path="/app/dashboard" element={<AuthenticatedRedirect />} />
              <Route path="/app/projects/:projectId" element={<Navigate to="/chat" replace />} />
              <Route path="/app/projects/:projectId/memos/:memoId" element={<Navigate to="/chat" replace />} />
              <Route path="/app/memos" element={<Navigate to="/chat" replace />} />
              
              {/* InquiryExplorer - 一時的に無効化（メモリ削減のため） */}

              {/* 先生用ダッシュボード */}
              <Route 
                path="/teacher" 
                element={
                  <ProtectedRoute requiredRole="teacher">
                    <LazyWrapper><TeacherDashboard /></LazyWrapper>
                  </ProtectedRoute>
                } 
              />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <LazyWrapper><AdminDashboardPage /></LazyWrapper>
                  </ProtectedRoute>
                }
              />
              
              {/* ダッシュボード旧導線 */}
              <Route path="/dashboard" element={<AuthenticatedRedirect />} />
              
              {/* /studentは/dashboardへリダイレクト */}
              <Route path="/student" element={<AuthenticatedRedirect />} />
              <Route path="/projects/:projectId" element={<LegacyProjectRedirect />} />
              <Route path="/projects/:projectId/memos/:memoId" element={<LegacyMemoRedirect />} />
              <Route path="/memos" element={<Navigate to="/chat" replace />} />
              
              {/* 未定義ルートのフォールバック */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 
