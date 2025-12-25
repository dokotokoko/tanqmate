/**
 * Supabase Auth対応のナビゲーションコンポーネント
 */
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseAuth } from '../../contexts/SupabaseAuthContext';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

const SupabaseNavigation: React.FC = () => {
  const { user, signOut } = useSupabaseAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="bg-white shadow-lg border-b border-orange-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* ロゴ・ブランド */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-amber-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Q</span>
              </div>
              <span className="text-xl font-bold text-gray-900">探Qメイト</span>
            </Link>
          </div>

          {/* デスクトップメニュー */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/dashboard"
              className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              ダッシュボード
            </Link>
            <Link
              to="/chat"
              className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              チャット
            </Link>
            <Link
              to="/projects"
              className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              プロジェクト
            </Link>

            {/* ユーザーメニュー */}
            {user && (
              <div className="relative group">
                <button className="flex items-center space-x-2 text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium transition-colors">
                  <PersonIcon className="h-5 w-5" />
                  <span>{user.user_metadata?.username || user.email}</span>
                </button>

                {/* ドロップダウンメニュー */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-900 border-b">
                      <div className="font-medium">{user.user_metadata?.username || 'ユーザー'}</div>
                      <div className="text-gray-500 text-xs">{user.email}</div>
                    </div>
                    
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <SettingsIcon className="h-4 w-4 mr-2" />
                      プロフィール設定
                    </Link>
                    
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogoutIcon className="h-4 w-4 mr-2" />
                      ログアウト
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* モバイルメニューボタン */}
          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-gray-700 hover:text-orange-600 p-2"
            >
              {isMenuOpen ? <CloseIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t">
              <Link
                to="/dashboard"
                className="block px-3 py-2 text-gray-700 hover:text-orange-600 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                ダッシュボード
              </Link>
              <Link
                to="/chat"
                className="block px-3 py-2 text-gray-700 hover:text-orange-600 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                チャット
              </Link>
              <Link
                to="/projects"
                className="block px-3 py-2 text-gray-700 hover:text-orange-600 rounded-md text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                プロジェクト
              </Link>

              {user && (
                <>
                  <div className="border-t pt-3 mt-3">
                    <div className="px-3 py-2 text-sm text-gray-900">
                      <div className="font-medium">{user.user_metadata?.username || 'ユーザー'}</div>
                      <div className="text-gray-500 text-xs">{user.email}</div>
                    </div>
                    
                    <Link
                      to="/profile"
                      className="block px-3 py-2 text-gray-700 hover:text-orange-600 rounded-md text-base font-medium"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      プロフィール設定
                    </Link>
                    
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 text-gray-700 hover:text-orange-600 rounded-md text-base font-medium"
                    >
                      ログアウト
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default SupabaseNavigation;