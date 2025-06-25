import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

interface ProtectedRouteProps {
  // children?: React.ReactNode; // Outlet を使うので children は不要
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = () => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  // useEffect(() => {
  //   // このコンポーネントがマウントされたときに認証状態をチェック
  //   // ただし、checkAuthStateはApp.tsxの初期化で呼び出す方が一般的
  //   // checkAuthState();
  // }, [checkAuthState]);

  if (isLoading) {
    // 認証状態を確認中の表示 (オプション)
    // 全画面ローディングインジケーターなどを表示しても良い
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading authentication status...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // ユーザーが認証されていない場合、ログインページにリダイレクト
    // リダイレクト後、ログイン成功したら元のページに戻れるように state に現在のロケーションを渡す
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ユーザーが認証されていれば、要求されたコンポーネント (Outlet経由で子ルート) をレンダリング
  return <Outlet />;
};

export default ProtectedRoute;
