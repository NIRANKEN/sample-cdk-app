import {create} from 'zustand';
import { User, getCurrentUser, signOut as appSignOut, signIn as appSignIn, signUp as appSignUp, confirmSignUp as appConfirmSignUp, forgotPassword as appForgotPassword, confirmPassword as appConfirmPassword, getSessionTokens } from '../../application/authService';
import * as cognitoTypes from '../../infrastructure/auth/cognitoAuthService'; // SignInParams, SignUpParams など
import { setAuthCookie, removeAuthCookie } from '../../infrastructure/auth/cognitoAuthService'; // Cookie helpers

interface AuthState {
  user: User | null;
  idToken: string | null; // Added idToken to state
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean;

  checkAuthState: () => Promise<void>;
  signIn: (params: cognitoTypes.SignInParams) => Promise<void>;
  signUp: (params: cognitoTypes.SignUpParams) => Promise<any>;
  confirmSignUp: (params: cognitoTypes.ConfirmSignUpParams) => Promise<string>;
  signOut: () => void;
  forgotPassword: (email: string) => Promise<any>;
  confirmPassword: (email: string, code: string, newPassword_old: string) => Promise<string>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  idToken: null, // Initialize idToken
  isLoading: true,
  error: null,
  isAuthenticated: false,

  checkAuthState: async () => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        const tokens = getSessionTokens(); // Get tokens from localStorage (managed by cognitoAuthService)
        if (tokens.idToken) {
          setAuthCookie(tokens.idToken, 'id_token'); // Ensure cookie is set/updated
          // Consider setting accessToken as well if needed by middleware/server components for other purposes
          // if (tokens.accessToken) setAuthCookie(tokens.accessToken, 'access_token');
        }
        set({ user: currentUser, idToken: tokens.idToken, isAuthenticated: true, isLoading: false });
      } else {
        removeAuthCookie('id_token');
        // removeAuthCookie('access_token');
        set({ user: null, idToken: null, isAuthenticated: false, isLoading: false });
      }
    } catch (err: any) {
      removeAuthCookie('id_token');
      // removeAuthCookie('access_token');
      set({ user: null, idToken: null, isAuthenticated: false, isLoading: false, error: err });
    }
  },

  signIn: async (params: cognitoTypes.SignInParams) => {
    set({ isLoading: true, error: null });
    try {
      // appSignIn now returns { user, idToken, accessToken, refreshToken }
      const { user, idToken } = await appSignIn(params);
      setAuthCookie(idToken, 'id_token');
      // if (accessToken) setAuthCookie(accessToken, 'access_token');
      set({ user, idToken, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: any) {
      removeAuthCookie('id_token');
      // removeAuthCookie('access_token');
      set({ user: null, idToken: null, isAuthenticated: false, isLoading: false, error: err });
      throw err;
    }
  },

  signUp: async (params: cognitoTypes.SignUpParams) => {
    set({ isLoading: true, error: null });
    try {
      const result = await appSignUp(params);
      set({ isLoading: false });
      return result;
    } catch (err: any) {
      set({ isLoading: false, error: err });
      throw err;
    }
  },

  confirmSignUp: async (params: cognitoTypes.ConfirmSignUpParams) => {
    set({ isLoading: true, error: null });
    try {
      const result = await appConfirmSignUp(params);
      set({ isLoading: false });
      return result;
    } catch (err: any) {
      set({ isLoading: false, error: err });
      throw err;
    }
  },

  signOut: () => {
    set({ isLoading: true });
    appSignOut(); // This should clear tokens from localStorage via cognitoAuthService
    removeAuthCookie('id_token');
    // removeAuthCookie('access_token');
    set({ user: null, idToken: null, isAuthenticated: false, isLoading: false, error: null });
  },

  forgotPassword: async (email: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await appForgotPassword(email);
      set({ isLoading: false });
      return result;
    } catch (err: any) {
      set({ isLoading: false, error: err });
      throw err;
    }
  },

  confirmPassword: async (email: string, code: string, newPassword_old: string) => {
    set({ isLoading: true, error: null });
    try {
      const result = await appConfirmPassword(email, code, newPassword_old);
      set({ isLoading: false });
      // パスワード変更成功後、ログインページにリダイレクトするなどの処理が考えられる
      return result;
    } catch (err: any) {
      set({ isLoading: false, error: err });
      throw err;
    }
  },

  clearError: () => {
    set({ error: null });
  }
}));

// アプリケーションの初期化時に認証状態を確認する
// この呼び出しは、App.tsxなどのエントリーポイントに近い場所で行うのが一般的
// useAuthStore.getState().checkAuthState();
// ただし、Reactのライフサイクル外でzustandの`set`を直接呼び出すのは推奨されない場合があるため注意。
// useEffect内で呼び出すのが安全。
export const initializeAuth = () => {
  useAuthStore.getState().checkAuthState();
};
