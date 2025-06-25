import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import LoginPage from './presentation/pages/LoginPage';
import TodoPage from './presentation/pages/TodoPage';
import { useAuthStore, initializeAuth } from './presentation/store/authStore';
import ProtectedRoute from './presentation/router/ProtectedRoute'; // ProtectedRouteをインポート

// アプリケーション起動時に一度だけ認証状態を確認
// initializeAuth(); // これはReactコンポーネント外なので、useEffect内で実行する方が安全

function App() {
  const { checkAuthState, isLoading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // アプリケーションの初期化時に認証状態を確認
    // storeのinitializeAuthを使っても良いが、メインコンポーネントで直接呼ぶのが一般的
    checkAuthState();
  }, [checkAuthState]); // checkAuthStateが変更されることは通常ないが、依存配列に含める

  // 認証状態の確認が完了するまでローディング表示 (オプション)
  // ProtectedRoute内でもisLoadingをチェックしているので、重複するかもしれないが、
  // Appレベルでのローディング表示は、全体のUI構造が固まる前に表示できる利点がある。
  // if (isLoading) {
  //   return (
  //     <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
  //       <p>Loading Application...</p>
  //     </div>
  //   );
  // }


  return (
    // Routerコンポーネントはindex.tsxに移動する方が、よりクリーンな場合もある
    // ここではApp.tsxに含める
    // <Router> // BrowserRouterはindex.tsxでラップするためここでは不要
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* 保護されたルート */}
      <Route element={<ProtectedRoute />}>
        <Route path="/todos" element={<TodoPage />} />
        {/* 他の保護されたルートもここに追加可能 */}
      </Route>

      {/* / へのアクセスは /todos へリダイレクト (認証済みの場合)
          未認証の場合は /login へリダイレクト (ProtectedRoute内で処理) */}
      <Route
        path="/"
        element={
          // isLoadingがfalseになった後、isAuthenticatedの状態に基づいてリダイレクト
          // このロジックはProtectedRouteと重複する部分があるため、よりシンプルな方法も検討可
          // 例えば、デフォルトルートを常に<ProtectedRoute>内の<TodoPage>に向けるなど
          isLoading ? <div>Loading...</div> : isAuthenticated ? <Navigate to="/todos" replace /> : <Navigate to="/login" replace />
        }
      />

      {/* 未定義のパスへのフォールバック (オプション) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    // </Router>
  );
}

export default App;
