import {create} from 'zustand';
import { User, getCurrentUser, signOut as appSignOut, signIn as appSignIn, signUp as appSignUp, confirmSignUp as appConfirmSignUp, forgotPassword as appForgotPassword, confirmPassword as appConfirmPassword } from '../../application/authService';
import * as cognitoTypes from '../../infrastructure/auth/cognitoAuthService'; // SignInParams, SignUpParams など

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  isAuthenticated: boolean; // 認証済みかどうかを明確に示すフラグ

  checkAuthState: () => Promise<void>;
  signIn: (params: cognitoTypes.SignInParams) => Promise<void>;
  signUp: (params: cognitoTypes.SignUpParams) => Promise<any>; // ISignUpResultを返すようにする
  confirmSignUp: (params: cognitoTypes.ConfirmSignUpParams) => Promise<string>;
  signOut: () => void;
  forgotPassword: (email: string) => Promise<any>;
  confirmPassword: (email: string, code: string, newPassword_old: string) => Promise<string>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true, // 初期表示時は認証状態を確認するためtrue
  error: null,
  isAuthenticated: false,

  checkAuthState: async () => {
    set({ isLoading: true, error: null });
    try {
      const currentUser = await getCurrentUser();
      set({ user: currentUser, isAuthenticated: !!currentUser, isLoading: false });
    } catch (err: any) {
      // `getCurrentUser`内でエラーはキャッチされnullが返る想定だが念のため
      set({ user: null, isAuthenticated: false, isLoading: false, error: err });
    }
  },

  signIn: async (params: cognitoTypes.SignInParams) => {
    set({ isLoading: true, error: null });
    try {
      const { user } = await appSignIn(params); // appSignInは整形されたUserオブジェクトを返す
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (err: any) {
      set({ user: null, isAuthenticated: false, isLoading: false, error: err });
      throw err; //呼び出し元でエラーハンドリングできるように再スロー
    }
  },

  signUp: async (params: cognitoTypes.SignUpParams) => {
    set({ isLoading: true, error: null });
    try {
      const result = await appSignUp(params);
      // サインアップ成功時はまだ認証済みではない (確認が必要な場合)
      // userオブジェクトにはcognitoUserが含まれるが、ここではまだセットしない
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
      // 確認成功後、自動的にログインさせるか、ログインページにリダイレクトするかは要件による
      // ここでは、ログインは別途行うフローを想定
      return result;
    } catch (err: any) {
      set({ isLoading: false, error: err });
      throw err;
    }
  },

  signOut: () => {
    set({ isLoading: true });
    appSignOut();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
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
