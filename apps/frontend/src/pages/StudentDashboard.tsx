import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStoreV2 } from '../stores/authStoreV2';
import DashboardPage from './DashboardPage';

// 既存のDashboardPageを生徒用として使用
const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuthStoreV2();

  useEffect(() => {
    // 先生が生徒ダッシュボードにアクセスした場合は許可
    // 未ログインの場合はProtectedRouteV2が処理
  }, [user, userRole, navigate]);

  return <DashboardPage />;
};

export default StudentDashboard;